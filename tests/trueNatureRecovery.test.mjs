import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const briefing=JSON.parse(readFileSync(new URL('../seed/true-nature-store.json',import.meta.url),'utf8'));

test('True Nature recovery source retains its complete blueprint for editor import',()=>{
  assert.equal(briefing.brandName,'True Nature');
  assert.equal(briefing.pages.length,10);
  assert.equal(briefing.pages[0].name,'Home');
  assert.ok(briefing.pages[0].sections.length>=7);
  const homeTiles=briefing.pages[0].sections.flatMap(s=>s.tiles||[]);
  assert.ok(homeTiles.some(t=>t.imageCategory==='store_hero'));
  assert.ok(homeTiles.some(t=>t.type==='shoppable_image'));
  assert.ok(homeTiles.filter(t=>['image','image_text','shoppable_image'].includes(t.type)).every(t=>!t.uploadedImage));
});
test('all recovered pages retain sections, modules and required brand identity',()=>{
  assert.ok(briefing.pages.every(page=>page.name&&page.sections?.length));
  assert.ok(briefing.pages.every(page=>page.sections.every(section=>section.layoutId&&Array.isArray(section.tiles))));
  assert.ok(briefing.asins.length>0);
});
