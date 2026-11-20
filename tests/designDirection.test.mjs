import test from 'node:test';
import assert from 'node:assert/strict';
import { designDirectionData, designReferenceError } from '../src/designDirection.mjs';
import { mergeReferenceCatalog } from '../src/storeReferences.mjs';
test('custom design directions accept website links but reject executable URLs and credentials', () => {
  assert.equal(designReferenceError([{ url: 'https://example.com/style', notes: '' }]), '');
  for (const url of ['javascript:alert(1)', 'data:text/plain,test', 'https://user:password@example.com']) assert.ok(designReferenceError([{ url }]));
  assert.throws(() => designDirectionData([{ url: '' }], true));
  assert.deepEqual(designDirectionData([{ url: 'https://example.com', notes: ' Keep this ' }], true), { designDirectionReviewed: true, designReferences: [{ url: 'https://example.com', notes: 'Keep this' }] });
  assert.deepEqual(designDirectionData([{ url: 'https://example.com' }], false).designReferences, []);
});
test('removed North Face stays absent even when the stored capture API returns it', () => {
  const row = { storeUrl: 'https://www.amazon.de/stores/THENORTHFACE/page/91172724-C342-482B-A300-564D9EA5E09F', captureStatus: 'ready' };
  assert.deepEqual(mergeReferenceCatalog([row], [{ ...row, brandName: 'The North Face' }]), []);
});

test('project direction survives normalisation and later JSON patches independently of the concept', async () => {
  const { build } = await import('esbuild');
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { resolve, join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const temp = await mkdtemp(resolve('.direction-test-'));
  try {
    await build({ entryPoints: [resolve('src/briefingImport.js'), resolve('src/storePatch.js')], outdir: temp, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' } });
    const { importBriefingToStore } = await import(pathToFileURL(join(temp, 'briefingImport.mjs')));
    const { applyStorePatch, makeClaudeContext } = await import(pathToFileURL(join(temp, 'storePatch.mjs')));
    const direction = designDirectionData([{ url: 'https://example.com/style', notes: 'Warm colours' }], true);
    const store = importBriefingToStore({ ...direction, brandName: 'Example', pages: [{ name: 'Home', sections: [] }] });
    const patched = applyStorePatch(store, { baseRevision: makeClaudeContext(store).baseRevision, ops: [{ op: 'modifyPage', pageName: 'Home', patch: { name: 'Start' } }] }).store;
    assert.deepEqual(patched.designReferences, direction.designReferences);
    assert.equal(patched.designDirectionReviewed, true);
    assert.deepEqual(JSON.parse(JSON.stringify(patched)).designReferences, direction.designReferences);
  } finally { await rm(temp, { recursive: true, force: true }); }
});

test('all internal and designer example lists remove the retired reference', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const path of ['src/components/BriefingView.jsx', 'src/components/AdminAnalyze.jsx', 'src/data/storeReferenceCatalog.json']) {
    const source = await readFile(new URL('../' + path, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /THENORTHFACE|91172724-C342-482B-A300-564D9EA5E09F/);
  }
});
