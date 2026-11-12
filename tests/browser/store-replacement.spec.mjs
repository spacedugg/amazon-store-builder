import { test, expect } from '@playwright/test';
import { createClient } from '@libsql/client';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require=createRequire(import.meta.url);
const source=await readFile(new URL('../../api/stores.js',import.meta.url),'utf8');
const original={brandName:'Arensberger',marketplace:'de',asins:[],products:[],pages:[{id:'original',name:'Gestaltete Startseite',sections:[{id:'hero',layoutId:'1',tiles:[{type:'image',textOverlay:{heading:'Bestehende Gestaltung'},uploadedImage:'https://images.test/original.webp'}]}]}]};
const incoming={brandName:'Arensberger',pages:[{name:'Neue Startseite',sections:[{layoutId:'1',tiles:[{type:'image',brief:'New concept',textOverlay:{heading:'Neues Konzept'}}]}]}]};

async function setup(page) {
  const temp=await mkdtemp(resolve('.replacement-browser-'));
  const db=createClient({url:'file:'+join(temp,'store.db')});
  await db.execute(`CREATE TABLE stores(id TEXT PRIMARY KEY,brand_name TEXT,marketplace TEXT,data TEXT,share_token TEXT UNIQUE,page_count INTEGER,product_count INTEGER,created_at TEXT DEFAULT '2026-10-07 11:39:41',updated_at TEXT DEFAULT '2026-11-11 10:18:22')`);
  await db.execute('CREATE TABLE store_images(hash TEXT PRIMARY KEY,blob_url TEXT)');
  await db.execute({sql:'INSERT INTO stores(id,brand_name,marketplace,data,share_token,page_count,product_count) VALUES (?,?,?,?,?,?,?)',args:['arensberger','Arensberger','de',JSON.stringify(original),'original-link',1,0]});
  const context={module:{exports:{}},require:name=>name==='./_db'?{getClient:()=>db,migrate:async()=>{}}:require(name),console};
  vm.runInNewContext(source,context);
  const writes=[];
  await page.route('**/api/stores*',async route=>{
    const request=route.request(),url=new URL(request.url());
    const body=request.method()==='POST'?request.postDataJSON():{};
    if(request.method()==='POST')writes.push(body);
    let status=200,result;
    const response={setHeader(){},status(n){status=n;return this;},json(data){result=data;return this;},end(){return this;}};
    await context.module.exports({method:request.method(),body,query:Object.fromEntries(url.searchParams)},response);
    await route.fulfill({status,json:result});
  });
  await page.route('**/api/feedback*',route=>route.fulfill({json:{counts:{},neu:0,feedback:[]}}));
  await page.route('https://images.test/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="500" height="200"><rect width="500" height="200" fill="#2c5f8e"/></svg>'}));
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Arensberger öffnen',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'+ Neuer Store',exact:true}).click();
  await page.locator('textarea').fill(JSON.stringify(incoming));
  await page.getByRole('button',{name:'Importieren',exact:true}).click();
  return {db,writes,close:async()=>{await page.close();db.close();await rm(temp,{recursive:true,force:true});}};
}

for(const width of [1440,390]) {
  test(`same-brand replacement is a visible, cancellable in-app warning at ${width}px`,async({page},info)=>{
    await page.setViewportSize({width,height:800});
    const fixture=await setup(page);
    try{
      const dialog=page.getByRole('alertdialog',{name:'Bestehenden Store ersetzen?',exact:true});
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText('Arensberger');
      await expect(dialog.getByRole('button',{name:'Abbrechen',exact:true})).toBeFocused();
      await expect(dialog.getByRole('button',{name:'Bestehenden Store ersetzen',exact:true})).toBeVisible();
      const b=await dialog.boundingBox();expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width+1);
      await info.attach('replacement-warning',{path:await page.screenshot({path:info.outputPath('replacement-warning.png')}).then(()=>info.outputPath('replacement-warning.png')),contentType:'image/png'});
      await dialog.getByRole('button',{name:'Abbrechen',exact:true}).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator('textarea')).toHaveValue(JSON.stringify(incoming));
      expect(fixture.writes).toHaveLength(0);
      expect(JSON.parse((await fixture.db.execute("SELECT data FROM stores WHERE id='arensberger'")).rows[0].data)).toEqual(original);
    }finally{await fixture.close();}
  });
}

test('only explicit replacement publishes the new JSON and retains the original shared link',async({page})=>{
  const fixture=await setup(page);
  try{
    const saved=page.waitForResponse(response=>response.url().includes('/api/stores')&&response.request().method()==='POST'&&response.status()===200);
    await page.getByRole('alertdialog').getByRole('button',{name:'Bestehenden Store ersetzen',exact:true}).click();
    await saved;
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect.poll(()=>fixture.writes.length,{timeout:10000}).toBe(1);
    expect(fixture.writes[0].replaceExisting.revision).toMatch(/^[a-f0-9]{64}$/);
    const row=(await fixture.db.execute("SELECT * FROM stores WHERE id='arensberger'")).rows[0];
    expect(JSON.parse(row.data).pages[0].name).toBe('Neue Startseite');
    expect(row.share_token).toBe('original-link');
  }finally{await fixture.close();}
});
