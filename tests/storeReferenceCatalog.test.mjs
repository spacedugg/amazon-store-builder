import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { referenceKey, mergeReferenceCatalog, appendReferenceChoices } from '../src/storeReferences.mjs';
const catalog = JSON.parse(await readFile(new URL('../src/data/storeReferenceCatalog.json', import.meta.url), 'utf8'));
const first = 'https://www.amazon.de/stores/page/5CB87A1C-536A-4D4A-A3C1-635F7F0CC092';
const hshop = 'https://www.amazon.de/stores/HSHOP-SPORT/page/8B640FD7-98E9-4C48-9BF0-422ED3F14A3A';

test('all new user links are represented and HSHOP tracking variants collapse to one store', () => {
  for (const id of ['5CB87A1C-536A-4D4A-A3C1-635F7F0CC092', 'C36736E3-EDE2-46C1-812C-9030BDA1EEEB', '8B640FD7-98E9-4C48-9BF0-422ED3F14A3A', '3EB222DB-B679-4317-BFB8-B3F87C7A3E9A', '77AE223F-04C0-420D-8A78-05A0A57D6258', 'B0CLDWHKCB']) {
    assert.equal(catalog.filter(r => r.storeUrl.includes(id)).length, 1, id);
  }
  assert.equal(referenceKey(hshop + '?lp_asin=B00G23LTXQ'), referenceKey(hshop + '?lp_asin=B08VKPD44D'));
  const product = catalog.find(r => r.storeUrl.includes('B0CLDWHKCB'));
  assert.equal(product.kind, 'product');
  assert.equal(catalog.find(r => r.storeUrl === first).nameVerified, false);
});

test('existing internal example links stay accessible, including alternative saved URLs', async () => {
  const admin = await readFile(new URL('../src/components/AdminAnalyze.jsx', import.meta.url), 'utf8');
  const urls = [...admin.matchAll(/url: '(https:[^']+)'/g)].map(m => referenceKey(m[1]));
  const included = new Set(catalog.flatMap(r => [r.storeUrl, ...(r.alternativeUrls || [])]).map(referenceKey));
  for (const key of urls) assert.ok(included.has(key), key);
  const rows = mergeReferenceCatalog(catalog);
  assert.equal(new Set(rows.map(r => r.id)).size, rows.length);
  for (const row of catalog.filter(r => r.images?.length)) {
    assert.equal(row.images[0].kind, 'archived-motif');
    assert.match(row.images[0].sourceUrl, /^https:\/\/m\.media-amazon\.com\/images\/S\//);
    assert.ok((await readFile(new URL('../public' + row.images[0].url, import.meta.url))).length > 1000);
  }
});

test('selecting examples preserves custom notes, deduplicates page aliases and excludes unresolved products', () => {
  const current = [{ url: hshop + '?ref=old', notes: 'Nur die Navigation' }, { url: '', notes: '' }];
  const choices = [{ storeUrl: hshop }, { storeUrl: first }, { storeUrl: 'https://www.amazon.de/dp/B0CLDWHKCB' }];
  assert.deepEqual(appendReferenceChoices(current, choices), [{ ...current[0] }, { url: first, notes: '' }]);
  assert.equal(current[1].url, '');
  assert.equal(referenceKey('https://evil.com/stores/page/5CB87A1C-536A-4D4A-A3C1-635F7F0CC092'), '');
});

test('saved examples extend the shared catalogue without duplicate tracking links', () => {
  const rows = mergeReferenceCatalog(catalog, [{ brandName: 'Duplicate', storeUrl: hshop + '?ref=duplicate' }, { brandName: 'Unsafe', storeUrl: 'javascript:alert(1)' }, { brandName: 'New', storeUrl: 'https://www.amazon.de/stores/page/11111111-2222-3333-4444-555555555555' }]);
  assert.equal(rows.length, catalog.length + 1);
  assert.equal(rows.filter(r => referenceKey(r.storeUrl) === referenceKey(hshop)).length, 1);
});
