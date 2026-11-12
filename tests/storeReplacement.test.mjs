import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createClient } from '@libsql/client';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const source = await readFile(new URL('../api/stores.js', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);
async function fixture(run) {
  const temp = await mkdtemp(resolve('.store-replacement-'));
  const db = createClient({ url: 'file:'+join(temp,'stores.db') });
  await db.execute(`CREATE TABLE stores (id TEXT PRIMARY KEY, brand_name TEXT, marketplace TEXT, data TEXT,
    share_token TEXT UNIQUE, page_count INTEGER, product_count INTEGER,
    created_at TEXT DEFAULT '2026-10-07 11:39:41', updated_at TEXT DEFAULT '2026-11-11 10:18:22')`);
  const old = { brandName: 'Arensberger', pages: [{ id: 'original', sections: [{ tiles: [{ uploadedImage: 'https://images.test/original.webp' }] }] }] };
  await db.execute({ sql: 'INSERT INTO stores(id,brand_name,data,share_token,page_count,product_count) VALUES (?,?,?,?,?,?)', args: ['arensberger','Arensberger',JSON.stringify(old),'original-link',1,0] });
  const context = { module: { exports: {} }, require: name => name === './_db' ? { getClient: () => db, migrate: async () => {} } : require(name), console };
  vm.runInNewContext(source, context);
  async function request(method, body = {}, query = {}) {
    const response = { statusCode: 200, setHeader() {}, status(code) { this.statusCode=code; return this; }, json(body) { this.body=body; return this; }, end() { return this; } };
    await context.module.exports({method,body,query},response);
    return response;
  }
  const next = { brandName: 'Arensberger', pages: [{id:'new',sections:[]}] };
  try { await run({db,old,next,request}); } finally { db.close(); await rm(temp,{recursive:true,force:true}); }
}

test('new same-brand JSON cannot overwrite a stored store without explicit confirmation', async () => fixture(async ({db,old,next,request}) => {
  const response = await request('POST',{data:next});
  assert.equal(response.statusCode,409);
  assert.equal(response.body.code,'STORE_EXISTS');
  assert.equal(response.body.existingStore.brandName,'Arensberger');
  assert.deepEqual(JSON.parse((await db.execute('SELECT data FROM stores')).rows[0].data),old);
}));

test('confirmed replacement preserves the existing preview token and replaces only its data', async () => fixture(async ({db,next,request}) => {
  const check=await request('GET',{}, {checkBrand:'Arensberger'});
  assert.equal(check.statusCode,200);
  const response=await request('POST',{data:next,replaceExisting:check.body.existingStore});
  assert.equal(response.statusCode,200);
  assert.equal(response.body.id,'arensberger');
  assert.equal(response.body.shareToken,'original-link');
  const row=(await db.execute('SELECT * FROM stores')).rows[0];
  assert.deepEqual(JSON.parse(row.data),next);
  assert.equal(row.created_at,'2026-10-07 11:39:41');
  assert.equal(row.share_token,'original-link');
}));

test('a stale confirmation cannot replace newer designer edits even within the same timestamp', async () => fixture(async ({db,next,request}) => {
  const check=await request('GET',{}, {checkBrand:'Arensberger'});
  const newer=JSON.stringify({brandName:'Arensberger',pages:[{id:'designer-edits'}]});
  await db.execute({sql:'UPDATE stores SET data=?',args:[newer]});
  const response=await request('POST',{data:next,replaceExisting:check.body.existingStore});
  assert.equal(response.statusCode,409);
  assert.equal((await db.execute('SELECT data FROM stores')).rows[0].data,newer);
}));

test('ordinary edits of the already opened store do not require a replacement confirmation', async () => fixture(async ({next,request}) => {
  assert.equal((await request('POST',{id:'arensberger',data:next})).statusCode,200);
}));

test('case and punctuation variants collide, but a different brand can be created', async () => fixture(async ({db,next,request}) => {
  assert.equal((await request('POST',{data:{...next,brandName:'ARENSBERGER!'}})).statusCode,409);
  const created=await request('POST',{data:{...next,brandName:'Different Brand'}});
  assert.equal(created.statusCode,200);
  assert.equal((await db.execute('SELECT count(*) AS n FROM stores')).rows[0].n,2);
}));

test('legacy duplicate IDs are protected before any consolidation deletes a row', async () => fixture(async ({db,next,request}) => {
  await db.execute("INSERT INTO stores(id,brand_name,data,share_token) VALUES ('legacy-copy','Arensberger','{}','legacy-link')");
  assert.equal((await request('POST',{id:'arensberger',data:next})).statusCode,409);
  assert.equal((await db.execute('SELECT count(*) AS n FROM stores')).rows[0].n,2);
}));

test('explicit replacement consent is checked even when the browser already has the canonical ID', async () => fixture(async ({db,next,request}) => {
  const check=await request('GET',{}, {checkBrand:'Arensberger'});
  const newer=JSON.stringify({brandName:'Arensberger',pages:[{id:'newer-than-confirmation'}]});
  await db.execute({sql:'UPDATE stores SET data=?',args:[newer]});
  const response=await request('POST',{id:'arensberger',data:next,replaceExisting:check.body.existingStore});
  assert.equal(response.statusCode,409);
  assert.equal((await db.execute('SELECT data FROM stores')).rows[0].data,newer);
}));

test('a failed confirmed write rolls back legacy consolidation instead of deleting the old store', async () => fixture(async ({db,next,request}) => {
  await db.execute("UPDATE stores SET id='legacy-arensberger'");
  await db.execute("CREATE TRIGGER fail_replacement BEFORE INSERT ON stores BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END");
  const check=await request('GET',{}, {checkBrand:'Arensberger'});
  assert.equal((await request('POST',{data:next,replaceExisting:check.body.existingStore})).statusCode,500);
  assert.equal((await db.execute('SELECT id FROM stores')).rows[0].id,'legacy-arensberger');
}));
