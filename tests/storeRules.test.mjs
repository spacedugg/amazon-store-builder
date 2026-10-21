import test from 'node:test';
import assert from 'node:assert/strict';
import { pageCounts, pageLimitErrors, storeLimitErrors, introducedLimitErrors, collectionContentErrors } from '../src/storeRules.mjs';

const tile = type => ({ type, collectionTitle: 'Favoriten', asins: ['B012345678'], uploadedImage: 'desktop', uploadedImageMobile: 'mobile' });
const section = (...types) => ({ tiles: types.map(tile) });
const page = sections => ({ id: 'home', name: 'Homepage', sections });

test('20 total sections including the built-in header; the 20th content section is blocked', () => {
  const full = page(Array.from({ length: 19 }, () => section('image')));
  assert.deepEqual(pageLimitErrors(full), []);
  assert.match(pageLimitErrors(page([...full.sections, section('image')]))[0], /20 insgesamt/);
  assert.equal(introducedLimitErrors({ pages: [full] }, { pages: [page([...full.sections, section('image')])] }).length, 1);
});

test('counts all product tiles on the page, including multiple tiles within one section', () => {
  const crowded = page([section('product_grid', 'product_grid', 'best_sellers', 'best_sellers')]);
  assert.deepEqual(pageCounts(crowded), { sections: 1, product_grid: 2, best_sellers: 2, product_collection: 0 });
  assert.equal(pageLimitErrors(crowded).length, 2);
});

test('multiple collections are allowed up to five with 60 products each', () => {
  const five = page(Array.from({ length: 5 }, () => section('product_collection')));
  assert.deepEqual(storeLimitErrors({ pages: [five] }), []);
  assert.equal(pageLimitErrors(page([...five.sections, section('product_collection')])).length, 1);
  assert.equal(collectionContentErrors({ pages: [five] }).length, 0);
  const incomplete = page([section('product_collection')]);
  incomplete.sections[0].tiles[0] = { type: 'product_collection', asins: [] };
  assert.equal(collectionContentErrors({ pages: [incomplete] }).length, 4);
  incomplete.sections[0].tiles[0].asins = Array(61).fill('B012345678');
  assert.ok(collectionContentErrors({ pages: [incomplete] }).some(message => /60 ASINs/.test(message)));
});

test('older invalid pages remain editable while further violations are rejected', () => {
  const old = page([section('product_grid', 'product_grid')]);
  const repaired = page([section('product_grid', 'image')]);
  assert.deepEqual(introducedLimitErrors({ pages: [old] }, { pages: [repaired] }), []);
  const worse = page([section('product_grid', 'product_grid', 'product_grid')]);
  assert.equal(introducedLimitErrors({ pages: [old] }, { pages: [worse] }).length, 1);
});
