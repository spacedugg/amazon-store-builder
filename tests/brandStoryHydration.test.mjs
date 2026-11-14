import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { newStory, newCard } from '../src/brandStoryModel.mjs';
let tmp, useProductImages;
before(async () => {
  tmp = await mkdtemp(resolve('.brandstory-hydration-'));
  const out = join(tmp, 'hook.mjs');
  await build({ entryPoints: [resolve('src/components/brand-story/useProductImages.js')], outfile: out, bundle: true, platform: 'node', format: 'esm', packages: 'external' });
  useProductImages = (await import(pathToFileURL(out))).default;
});
after(async () => rm(tmp, { recursive: true, force: true }));
const ASIN = 'B012345678', SECOND = 'B087654321';
function story(asin = ASIN) {
  const value = newStory('Same brand');
  value.cards = [newCard('grid')];
  value.cards[0].slots.forEach(slot => { slot.asin = asin; });
  return value;
}
const response = (asins) => ({ ok: true, json: async () => ({ products: asins.map(asin => ({ asin, image: `https://images.test/${asin}.jpg`, price: null })) }) });
async function mount(initial, run) {
  const dom = new JSDOM('<div id="root"></div>'), previous = {};
  const requests = [], dirty = [], messages = [];
  let current, change, loading;
  const globals = { window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true, fetch: (url, options) => new Promise(resolve => requests.push({ url, asins: JSON.parse(options.body).asins, resolve })) };
  for (const [key, value] of Object.entries(globals)) {
    previous[key] = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const markDirty = value => dirty.push(value), message = value => messages.push(value);
  function Harness() {
    const [value, setValue] = useState(initial);
    current = value; change = setValue;
    loading = useProductImages(value, true, setValue, markDirty, message);
    return null;
  }
  const root = createRoot(dom.window.document.getElementById('root'));
  try {
    await act(async () => root.render(React.createElement(Harness)));
    await run({ requests, dirty, messages, current: () => current, loading: () => loading, change: async value => act(async () => change(value)), finish: async (i, result = response(requests[i].asins)) => act(async () => requests[i].resolve(result)) });
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
}
test('import batches four duplicate targets into one request and hydrates every product slot', async () => mount(story(), async h => {
  assert.equal(h.requests.length, 1); assert.deepEqual(h.requests[0].asins, [ASIN]); assert.equal(h.loading(), true);
  await h.finish(0);
  assert(h.current().cards[0].slots.every(slot => slot.productImage.url.includes(ASIN)));
  assert.equal(h.loading(), false); assert.deepEqual(h.dirty, [true]);
}));
test('cached images hydrate a second project with the same ASIN without another fetch', async () => mount(story(), async h => {
  await h.finish(0); h.dirty.length = 0;
  await h.change(story());
  assert.equal(h.requests.length, 1);
  assert(h.current().cards[0].slots.every(slot => slot.productImage?.url.includes(ASIN)));
  assert.deepEqual(h.dirty, [true]);
}));
test('changed targets never receive an earlier request image or dirty notification', async () => mount(story(), async h => {
  await h.change(story(SECOND)); assert.equal(h.requests.length, 2);
  await h.finish(0);
  assert(h.current().cards[0].slots.every(slot => !slot.productImage)); assert.deepEqual(h.dirty, []);
  await h.finish(1);
  assert(h.current().cards[0].slots.every(slot => slot.productImage.url.includes(SECOND)));
}));
test('custom image mode stays untouched even when a pending product fetch completes', async () => mount(story(), async h => {
  const custom = story(); custom.cards[0].slots.forEach(slot => { slot.imageMode = 'custom'; slot.image = { url: 'https://images.test/custom.jpg' }; });
  await h.change(custom); await h.finish(0);
  assert(h.current().cards[0].slots.every(slot => !slot.productImage && slot.image.url.endsWith('custom.jpg')));
  assert.deepEqual(h.dirty, []);
}));
test('URL target takes precedence and failures do not cause automatic retry loops', async () => {
  const value = story(); value.cards[0].slots.forEach(slot => { slot.url = `https://www.amazon.de/dp/${SECOND}`; });
  await mount(value, async h => {
    assert.deepEqual(h.requests[0].asins, [SECOND]);
    await h.finish(0, { ok: false, json: async () => ({ error: 'offline' }) });
    await h.change(structuredClone(h.current()));
    assert.equal(h.requests.length, 1); assert.deepEqual(h.dirty, []); assert.equal(h.messages.length, 1);
  });
});
