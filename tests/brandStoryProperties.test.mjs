import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { newStory, newCard } from '../src/brandStoryModel.mjs';
let tmp, Properties;
before(async () => {
  tmp = await mkdtemp(resolve('.properties-test-'));
  const out = join(tmp, 'properties.mjs');
  await build({ entryPoints: [resolve('src/components/brand-story/StoryElements.jsx')], outfile: out, bundle: true, platform: 'node', format: 'esm', packages: 'external', loader: { '.css': 'empty' } });
  Properties = (await import(pathToFileURL(out))).StoryProperties;
});
after(async () => rm(tmp, { recursive: true, force: true }));
async function mount(run, { designer = false, mode = 'individual' } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://test.local' });
  dom.window.HTMLElement.prototype.attachEvent = () => {};
  dom.window.HTMLElement.prototype.detachEvent = () => {};
  const previous = {};
  const exampleGrid=prefix=>({type:'grid',slots:Array.from({length:4},(_,i)=>({image:{url:prefix+i+'.jpg'}}))});
  const examples={stories:[{brandName:'OmniRelexx',cards:[exampleGrid('https://example.com/omni-')]},{brandName:'Futum',cards:[...Array.from({length:7},()=>({type:'media'})),exampleGrid('https://brand-store-preview.temoa.de/brand-story-examples/futum-assets/garden-')]}]};
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, fetch: async()=>({ok:true,json:async()=>examples}), IS_REACT_ACT_ENVIRONMENT: true })) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  let story = newStory('Test'); const card = newCard('grid'); card.gridMode = mode;
  card.slots[0] = { ...card.slots[0], imageMode: 'custom', image: { url: 'https://test.local/custom.jpg' }, productImage: { url: 'https://test.local/product.jpg' } };
  story.cards = [card]; let selectedSlot = null;
  const root = createRoot(dom.window.document.getElementById('root'));
  const render = () => root.render(React.createElement(Properties, { story, selected: card.id, selectedSlot, onSlotSelect: i => { selectedSlot = i; render(); }, designer, change: fn => { story = fn(structuredClone(story)); render(); }, asset() {}, loadProduct() {}, reorder() {} }));
  const changeSelect = async (label, value) => act(async () => { if(label==='Aufbau des ASIN-Grids'){const el=dom.window.document.querySelector(`input[type="radio"][value="${value}"]`);assert(el);el.click();return;} const el = dom.window.document.querySelector(`[aria-label="${label}"]`); el.value = value; el.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  try { await act(async () => render()); await run(dom.window.document, () => story.cards[0], changeSelect, async i => act(async () => { selectedSlot = i; render(); })); }
  finally { await act(async () => root.unmount()); dom.window.close(); for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } }
}
test('individual grid exposes four distinct briefs and no editable internal names or paths', async () => mount(async d => {
  assert.equal(d.querySelectorAll('input[type="radio"]').length, 2);
  assert.equal(d.querySelectorAll('textarea[data-slot-brief]').length, 4);
  assert(!d.querySelector('[aria-label="Kartenname"]'));
  assert(!d.querySelector('[aria-label="Dateipfad · Platz 1"]'));
  assert(!d.querySelector('[aria-label="Inhalt und Motiv (English)"]'));
  assert(!d.body.textContent.includes('Karte entfernen'));
  assert(d.querySelector('[placeholder="Exact text to appear in the image (leave empty if none)."]'));
}));
test('switching modes shows only the relevant briefs without discarding previous content', async () => mount(async (d, card, select) => {
  await select('Aufbau des ASIN-Grids', 'composite');
  assert.equal(card().gridMode, 'composite');
  assert.equal(d.querySelectorAll('textarea[data-slot-brief]').length, 0);
  assert(d.querySelector('[aria-label="Inhalt und Motiv (English)"]'));
  await select('Aufbau des ASIN-Grids', 'individual');
  assert.equal(d.querySelectorAll('textarea[data-slot-brief]').length, 4);
}));
test('grid choices illustrate an OmniRelax mosaic and four separate Futum products without a duplicate dropdown',async()=>mount(async d=>{
  const pictures=[...d.querySelectorAll('.bs-grid-mode-preview img')];assert.equal(pictures.length,8);
  assert(pictures.slice(0,4).every(im=>im.getAttribute('src').startsWith('https://example.com/omni-')));
  assert(pictures.slice(4).every(im=>im.getAttribute('src').startsWith('/brand-story-examples/futum-assets/garden-')));
  assert(!d.querySelector('select[aria-label="Aufbau des ASIN-Grids"]'));
  assert(d.querySelector('input[aria-label="Vier einzelne Bilder"]').checked);
}));
test('product source explicitly overrides a saved custom image and supplies a default brief', async () => mount(async (d, card, select) => {
  await select('Bildquelle · Platz 1', 'product');
  assert.equal(card().slots[0].imageMode, 'product');
  assert.match(card().slots[0].brief, /^Use the (?:unchanged|original Amazon) product main image/);
  assert.equal(card().slots[0].image.url, 'https://test.local/custom.jpg');
  assert.equal(d.querySelector('.bs-slot .bs-slot-image img').getAttribute('src'), 'https://test.local/product.jpg');
}));
test('choosing custom artwork clears automatic product-image instructions so a real motif can be briefed',async()=>mount(async(d,card,select)=>{
  await select('Bildquelle · Platz 1','product');
  await select('Bildquelle · Platz 1','custom');
  assert.equal(card().slots[0].brief,'');
}));
test('preview slot selection focuses its corresponding product target and all four remain available', async () => mount(async (d, card, select, selectSlot) => {
  await selectSlot(2);
  assert.equal(d.activeElement.getAttribute('aria-label'), 'ASIN oder Produktlink · Platz 3');
  assert.equal(d.querySelectorAll('.bs-slot').length, 4);
}));
test('designer sees brief and filenames read-only with upload slots', async () => mount(async d => {
  assert.equal(d.querySelectorAll('textarea').length, 0);
  assert(d.querySelector('.bs-file-path'));
  assert(d.querySelector('input[type="file"]'));
  assert(d.body.textContent.includes('1328 × 1456'));
}, { designer: true }));

test('composite has one shared target, no main image choice and no field explanations',async()=>mount(async(d,card,select)=>{
 await select('Aufbau des ASIN-Grids','composite');
 assert(d.querySelector('[aria-label="ASIN oder Produktlink"]'));
 assert.equal(d.querySelectorAll('[aria-label^="ASIN oder Produktlink"]').length,1);
 assert.equal(d.querySelectorAll('select').length,0);
 assert.equal(d.querySelectorAll('.bs-field-help').length,0);
 assert.equal(d.querySelectorAll('.bs-properties p.bs-help').length,0);
 assert(card().slots.every(slot=>slot.imageMode==='custom'));
 assert(!d.querySelector('.bs-product-default'));
}));
