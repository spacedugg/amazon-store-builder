import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
let temp, buildStoreExports, REFACTOR_PROMPT, applyStorePatch;
before(async () => {
  temp = await mkdtemp(resolve('.export-test-'));
  await build({ entryPoints: [resolve('src/components/JsonExportModal.jsx'), resolve('src/storePatch.js')], outdir: temp, bundle: true, platform: 'node', format: 'esm', outExtension: { '.js': '.mjs' }, external: ['react'] });
  ({ buildStoreExports, REFACTOR_PROMPT } = await import(pathToFileURL(join(temp, 'components/JsonExportModal.mjs'))));
  ({ applyStorePatch } = await import(pathToFileURL(join(temp, 'storePatch.mjs'))));
});
after(async () => { await rm(temp, { recursive: true, force: true }); });
test('downloaded edit context applies a patch while full backup retains assets and product catalogue', () => {
  const store = { brandName: 'Example', manualCI: { notes: 'Keep our green identity.' }, designReferences: [{ url: 'https://www.amazon.de/stores/page/REFERENCE', notes: 'Bold layout' }], products: [{ asin: 'B012345678', title: 'Original' }], pages: [{ id: 'home', name: 'Home', sections: [{ id: 'section', layoutId: '1', tiles: [{ id: 'tile', type: 'image', uploadedImage: 'data:image/png;base64,DESKTOP', uploadedImageMobile: 'data:image/png;base64,MOBILE', asins: ['B012345678'], brief: 'Original composition', textOverlay: { heading: 'Vorher' } }] }] }] };
  const before = JSON.stringify(store);
  const output = buildStoreExports(store), backup = JSON.parse(output.fullJson), context = JSON.parse(output.contextJson);
  assert.deepEqual(backup, store);
  assert.equal(context.pages[0].id, 'home');
  assert.equal(typeof context.baseRevision, 'string');
  assert.deepEqual(context.designReferences, store.designReferences);
  assert.deepEqual(context.manualCI, store.manualCI);
  assert.doesNotMatch(output.contextJson, /data:image|<image>|"products"/);
  const result = applyStorePatch(store, { baseRevision: context.baseRevision, ops: [{ op: 'modifyTile', pageId: 'home', sectionIdx: 0, tileIdx: 0, patch: { textOverlay: { heading: 'Nachher' } } }] }).store;
  assert.equal(result.pages[0].sections[0].tiles[0].textOverlay.heading, 'Nachher');
  assert.equal(result.pages[0].sections[0].tiles[0].uploadedImage, store.pages[0].sections[0].tiles[0].uploadedImage);
  assert.deepEqual(result.products, store.products);
  assert.equal(JSON.stringify(store), before);
});
test('export instruction requests patch operations and project-specific CI rather than replacement JSON', () => {
  for (const required of ['baseRevision', 'ops', 'pageId', 'moveSection', 'designReferences', 'Corporate Identity', 'Englisch', 'Deutsch', 'Mit Claude bearbeiten']) assert(REFACTOR_PROMPT.includes(required), required);
  assert.match(REFACTOR_PROMPT, /keinen vollständigen Ersatz-Store/);
  assert.deepEqual(buildStoreExports(null), { fullJson: '', contextJson: '' });
});
