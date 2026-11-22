import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const reader = fileURLToPath(new URL('../scripts/read-reference-pages.py', import.meta.url));
const index = JSON.parse(readFileSync(new URL('../data/store-knowledge/_reference_style_profiles.json', import.meta.url), 'utf8'));
const read = (...args) => JSON.parse(execFileSync('python3', [reader, ...args], { cwd: root, encoding: 'utf8' }));

test('reference reader exposes a compact catalogue without loading every page into the response', () => {
  const rows = read('--catalog');
  assert.deepEqual(rows.map(row => row.id), index.stores.map(row => row.id));
  assert.equal(rows.length, 24);
  assert(rows.every(row => row.brandName && row.sourceUrl && !row.observations && !row.pages));
});

test('brand aliases and store URLs resolve to the canonical store before reading its chunk', () => {
  const store = index.stores.find(row => row.id === 'snocks');
  const byId = read('--store', store.id);
  assert.deepEqual(read('--store', store.brandName), byId);
  assert.deepEqual(read('--store', store.sourceUrl), byId);
  assert.equal(byId.length, store.fullPageReviews.pageCount);
  assert(byId.every(row => Object.keys(row).sort().join(',') === 'pageName,pageRole,sourceUrl,status'));
  assert.deepEqual(read('--store', store.brandName, '--profile'), store);
});

test('individual page reads work by exact name or UUID and a subpage URL identifies its store', () => {
  const store = index.stores.find(row => row.id === 'snocks');
  const pages = read('--store', store.id, '--all');
  const page = pages.find(row => row.status === 'reviewed' && row.sourceUrl !== store.sourceUrl);
  assert(page, 'the reference includes a reviewed subpage');
  const uuid = page.sourceUrl.match(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/i)[0];
  assert.deepEqual(read('--store', store.id, '--page', uuid), page);
  assert.deepEqual(read('--store', page.sourceUrl, '--page', page.sourceUrl), page);
  const sameName = pages.filter(row => row.pageName.toLowerCase() === page.pageName.toLowerCase());
  if (sameName.length === 1) assert.deepEqual(read('--store', store.id, '--page', page.pageName), page);
  assert(page.evidence?.url, 'a full page read preserves its evidence');
});

test('unknown reference selections fail clearly rather than returning unrelated evidence', () => {
  for (const args of [['--store', 'not-a-reference-store'], ['--store', 'snocks', '--page', 'not-a-reference-page']]) {
    const result = spawnSync('python3', [reader, ...args], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Reference reader:/);
    assert.doesNotMatch(result.stderr, /Traceback/);
  }
});
