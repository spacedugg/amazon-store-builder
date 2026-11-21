import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const skill = await readFile('.claude/skills/amazon-storefront-design/SKILL.md', 'utf8');
const examples = [...skill.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m => JSON.parse(m[1]));
let temp, importer, patcher;
before(async () => {
  temp = await mkdtemp(resolve('.skill-example-test-'));
  for (const [name, entry] of [['importer','src/briefingImport.js'], ['patcher','src/storePatch.js']]) {
    const outfile = join(temp, name + '.mjs');
    await build({entryPoints:[resolve(entry)], outfile, bundle:true, platform:'node', format:'esm'});
    if (name === 'importer') importer = await import(pathToFileURL(outfile));
    else patcher = await import(pathToFileURL(outfile));
  }
});
after(async () => { await rm(temp, { recursive:true, force:true }); });
function walk(value, fn) {
  if (!value || typeof value !== 'object') return;
  fn(value);
  Object.values(value).forEach(child => walk(child, fn));
}
test('documented image examples import with explicit desktop/mobile dimensions and plain final copy', () => {
  let images = 0;
  for (const example of examples) {
    walk(example, value => {
      for (const text of Object.values(value.textOverlay || {})) if (typeof text === 'string') assert(!text.includes('**'));
      if (!['image','shoppable_image'].includes(value.type)) return;
      images++;
      assert(value.imageCategory && value.imageCategory !== 'store_hero');
      for (const field of ['dimensions','mobileDimensions']) assert(value[field]?.w > 0 && value[field]?.h > 0);
      const tile = importer.importTileFromBriefing(value,'1',0,{});
      assert.deepEqual(tile.dimensions, value.dimensions);
      assert.deepEqual(tile.mobileDimensions, value.mobileDimensions);
    });
    if (example.pages) assert(importer.importBriefingToStore(example).pages.length > 0);
  }
  assert(images >= 4);
});
test('documented editing example applies with a current revision, retains assets and rejects a stale revision', () => {
  const example = examples.find(value => value.ops);
  assert(example?.baseRevision);
  const original = {brandName:'Test', headerBanner:'header.webp', pages:[{id:'p',name:'Home',sections:[{id:'s',layoutId:'1',tiles:[{id:'t',type:'image',uploadedImage:'original.webp',uploadedImageMobile:'mobile.webp',textOverlay:{heading:'Before',subheading:'Retain'}}]}]}]};
  const revision = patcher.makeClaudeContext(original).baseRevision;
  const result = patcher.applyStorePatch(original,{...example,baseRevision:revision}).store;
  const tile = result.pages[0].sections[0].tiles[0];
  assert.equal(tile.textOverlay.heading,example.ops[0].patch.textOverlay.heading);
  assert.equal(tile.textOverlay.subheading,'Retain');
  assert.equal(tile.uploadedImage,'original.webp');
  assert.equal(tile.uploadedImageMobile,'mobile.webp');
  assert.equal(result.headerBanner,'header.webp');
  assert.equal(tile.id,'t');
  assert.throws(() => patcher.applyStorePatch(result,{...example,baseRevision:revision}), /veraltet|geändert|Stand/);
});
