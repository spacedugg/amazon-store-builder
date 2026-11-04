import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

let temp, components = {};
before(async () => {
  temp = await mkdtemp(resolve('.workflow-test-'));
  for (const name of ['StoreOverview', 'NewStoreModal', 'PatchImportModal', 'Topbar']) {
    const out = join(temp, name + '.mjs');
    await build({ entryPoints: [resolve('src/components/' + name + '.jsx')], outfile: out, bundle: true, platform: 'node', format: 'esm', jsx: 'automatic', packages: 'external' });
    components[name] = (await import(pathToFileURL(out))).default;
  }
});
after(async () => { await rm(temp, { recursive: true, force: true }); });

async function mount(name, props, run) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://builder.test/' });
  const original = {};
  for (const key of ['window', 'document', 'navigator', 'fetch', 'alert', 'IS_REACT_ACT_ENVIRONMENT', 'FileReader']) original[key] = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, navigator: { value: dom.window.navigator, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } });
  const copied = [], alerts = [], requests = [];
  Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async text => { copied.push(text); } }, configurable: true });
  globalThis.FileReader = dom.window.FileReader;
  globalThis.alert = text => alerts.push(text);
  globalThis.fetch = async url => { requests.push(url); return { ok: true, json: async () => ({ counts: { one: 3, two: 0 } }) }; };
  const root = createRoot(dom.window.document.getElementById('root'));
  const click = async button => { assert(button, 'Required control exists'); await act(async () => { button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })); }); };
  try {
    await act(async () => { root.render(React.createElement(components[name], props)); });
    await run({ dom, d: dom.window.document, copied, alerts, requests, click, root });
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of Object.entries(original)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
}
function button(d, text) { return [...d.querySelectorAll('button')].find(b => b.textContent === text); }

test('overview badges use one grouped request, zero stays hidden, refresh failures retain last count', async () => {
  await mount('StoreOverview', { stores: [{ id: 'one', brandName: 'Uficell' }, { id: 'two', brandName: 'Other' }], onOpen: async () => true }, async ({ d, requests }) => {
    const cards = d.querySelectorAll('.store-home-card');
    assert.equal(requests.filter(u => u === '/api/feedback?counts=1').length, 1);
    assert.equal(cards[0].querySelector('.store-home-feedback').textContent, '3');
    assert.match(cards[0].getAttribute('aria-label'), /3 neue Feedbacks/);
    assert.equal(cards[1].querySelector('.store-home-feedback'), null);
    globalThis.fetch = async () => { throw Error('offline'); };
    await act(async () => { d.dispatchEvent(new d.defaultView.Event('visibilitychange')); });
    assert.equal(cards[0].querySelector('.store-home-feedback').textContent, '3');
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ counts: {} }) });
    await act(async () => { d.dispatchEvent(new d.defaultView.Event('visibilitychange')); });
    assert.equal(cards[0].querySelector('.store-home-feedback'), null);
  });
});

test('new-store workflow starts with copyable storefront ASIN instructions before the concept', async () => {
  await mount('NewStoreModal', { onClose() {}, onImport() {}, onCreateEmpty() {} }, async ({ d, copied, click }) => {
    assert(d.body.textContent.indexOf('Schritt 1: ASIN-Liste') < d.body.textContent.indexOf('Schritt 2: Konzept'));
    await click(button(d, 'ASIN-Prompt kopieren'));
    assert.match(copied[0], /Parent ASIN;Titel;Hat Variationen/);
    assert.match(copied[0], /utf-8-sig/);
    assert.match(copied[0], /6 Seiten parallel/);
    assert.match(copied[0], /10.?12/);
    assert.match(copied[0], /120000/);
    assert.match(d.body.textContent, /Schritt 3: Briefing JSON importieren/);
  });
});

export { mount, button };

test('only one Claude editing entry remains in the menu', async () => {
  await mount('Topbar', { store: { brandName: 'Uficell', pages: [{}] }, onShowJsonExport() {}, onPatchImport() {} }, async ({ d, click }) => {
    await click([...d.querySelectorAll('button')].find(b => b.title === 'Weitere Funktionen'));
    assert.match(d.body.textContent, /Mit Claude bearbeiten/);
    assert.doesNotMatch(d.body.textContent, /JSON \/ Refactor|Snippet \(Patch\)/);
  });
});

test('Claude dialog copies current complete text and IDs with prompt, reads JSON file and preserves recoverable errors', async () => {
  const fixture = { brandName: 'Uficell', products: [{ huge: 'catalog' }], pages: [{ id: 'p', name: 'Home', sections: [{ id: 's', layoutId: '1', tiles: [{ id: 't', type: 'image', textOverlay: { heading: 'Manuell bearbeitet' }, uploadedImage: 'data:image/png;base64,AAAA' }] }] }] };
  let applied;
  await mount('PatchImportModal', { store: fixture, currentPageId: 'p', onClose() {}, onApply(data) { applied = data; return ['Geändert']; } }, async ({ dom, d, copied, click }) => {
    await click(button(d, 'Prompt und aktuellen Store kopieren'));
    assert.match(copied[0], /Manuell bearbeitet/);
    assert.match(copied[0], /"id": "s"/);
    assert.doesNotMatch(copied[0], /base64,AAAA|"huge"/);
    assert.match(copied[0], /Designer.*Englisch|Englisch.*Designer/);
    const input = d.querySelector('input[type=file]');
    assert(input, 'JSON file selection is available');
    const data = { baseRevision: copied[0].match(/"baseRevision": "([a-f0-9]+)"/)[1], ops: [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { brief: 'New' } }] };
    Object.defineProperty(input, 'files', { value: [new dom.window.File([JSON.stringify(data)], 'change.json', { type: 'application/json' })] });
    await act(async () => { input.dispatchEvent(new dom.window.Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 30)); });
    assert.equal(JSON.parse(d.querySelector('textarea').value).ops.length, 1);
    await click(button(d, 'Änderungen anwenden'));
    assert.deepEqual(applied, data);
    assert(d.querySelector('.workflow-modal'));
  });
});
