import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
let temp, applyPatchRaw, makeClaudeContext;
function applyStorePatch(current, data) { return applyPatchRaw(current, { baseRevision: makeClaudeContext(current).baseRevision, ...data }); }
before(async () => {
  temp = await mkdtemp(resolve('.patch-test-'));
  await build({ entryPoints: [resolve('src/storePatch.js')], outfile: join(temp, 'patch.mjs'), bundle: true, platform: 'node', format: 'esm' });
  ({ applyStorePatch: applyPatchRaw, makeClaudeContext } = await import(pathToFileURL(join(temp, 'patch.mjs'))));
});
after(async () => { await rm(temp, { recursive: true, force: true }); });
function fixture() { return { brandName: 'Uficell', headerBanner: 'banner.webp', products: [{ asin: 'B012345678' }], pages: [{ id: 'p', name: 'Home', sections: [{ id: 's', layoutId: '1', module: 'hero', tiles: [{ id: 't', type: 'image', uploadedImage: 'desktop.webp', uploadedImageMobile: 'mobile.webp', asins: ['B012345678'], hotspots: [{ x: 1 }], imageRef: 'unique-solo', textOverlay: { heading: 'Edited', subheading: 'Keep me' } }] }] }] }; }
test('targeted text edits preserve image assets, IDs, other text and untouched state', () => {
  const store = fixture(), before = JSON.stringify(store);
  const { store: next, summary } = applyStorePatch(store, { ops: [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { textOverlay: { heading: 'Changed' } } }] });
  assert.equal(next.pages[0].sections[0].tiles[0].textOverlay.subheading, 'Keep me');
  assert.equal(next.pages[0].sections[0].tiles[0].textOverlay.heading, 'Changed');
  for (const key of ['uploadedImage', 'uploadedImageMobile', 'id', 'asins', 'hotspots', 'imageRef']) assert.deepEqual(next.pages[0].sections[0].tiles[0][key], store.pages[0].sections[0].tiles[0][key]);
  assert.equal(JSON.stringify(store), before); assert.equal(summary.length, 1);
});
test('one bad target rejects the complete multi-operation change without mutating the source', () => {
  const store = fixture(), before = JSON.stringify(store);
  assert.throws(() => applyStorePatch(store, { ops: [{ op: 'modifyPage', pageId: 'p', patch: { name: 'Renamed' } }, { op: 'deleteTile', pageName: 'Renamed', sectionIdx: 0, tileIdx: -1 }] }), /Kachel|Index/);
  assert.equal(JSON.stringify(store), before);
});
test('new pages resolve forward links and hierarchy to real IDs', () => {
  const { store } = applyStorePatch(fixture(), { ops: [
    { op: 'addPage', page: { name: 'Child', parentName: 'Parent', sections: [{ layoutId: '1', tiles: [{ type: 'image', linkUrl: 'page:Parent' }] }] } },
    { op: 'addPage', page: { name: 'Parent', sections: [] } },
  ] });
  const child = store.pages.find(p => p.name === 'Child'), parent = store.pages.find(p => p.name === 'Parent');
  assert.equal(child.parentId, parent.id); assert.equal(child.sections[0].tiles[0].linkUrl, '/' + parent.id);
  assert(!child.parentId.startsWith('pending-'));
});
test('page and section moves keep stable IDs and images', () => {
  const initial = fixture(); initial.pages.push({ id: 'p2', name: 'Other', sections: [] });
  const { store } = applyStorePatch(initial, { ops: [{ op: 'moveSection', pageId: 'p', sectionIdx: 0, toPageId: 'p2', toIndex: 0 }, { op: 'movePage', pageId: 'p2', toIndex: 0 }] });
  assert.equal(store.pages[0].id, 'p2'); assert.equal(store.pages[0].sections[0].id, 's'); assert.equal(store.pages[0].sections[0].tiles[0].uploadedImage, 'desktop.webp');
});
test('invalid operations, asset placeholders and replacement JSON are rejected clearly', () => {
  for (const ops of [[], [{ op: 'unknown' }], [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { uploadedImage: '<image>' } }], [{ op: 'modifySection', pageId: 'p', sectionIdx: 0, patch: { tiles: [] } }]]) assert.throws(() => applyStorePatch(fixture(), { ops }));
  assert.throws(() => applyStorePatch(fixture(), fixture()), /ops|Änderungs/);
});
test('introduced section limits reject before committing', () => {
  const initial = fixture(); initial.pages[0].sections = Array.from({ length: 19 }, (_, i) => ({ id: 's' + i, layoutId: '1', tiles: [] }));
  assert.throws(() => applyStorePatch(initial, { ops: [{ op: 'addSection', pageId: 'p', section: { tiles: [] } }] }), /19/);
  assert.equal(initial.pages[0].sections.length, 19);
});
test('modified links can point to pages added later in the same change', () => {
  const { store } = applyStorePatch(fixture(), { ops: [
    { op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { linkUrl: 'page:New' } },
    { op: 'addPage', page: { name: 'New', sections: [] } },
  ] });
  assert.equal(store.pages[0].sections[0].tiles[0].linkUrl, '/' + store.pages[1].id);
});
test('page metadata edits reject non-string headings before editor rendering', () => {
  assert.throws(() => applyStorePatch(fixture(), { ops: [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { textOverlay: { heading: { broken: true } } } }] }), /heading|Text/);
});
test('context includes every current section and strips all uploaded assets without mutating live state', () => {
  const original = fixture(); original.pages[0].heroBanner = 'data:image/png;base64,HERO'; original.pages[0].sections[0].tiles[0].referenceImages = ['SECRET'];
  const context = makeClaudeContext(original);
  assert.equal(context.pages[0].sections[0].id, 's'); assert.equal(context.pages[0].sections[0].module, 'hero');
  assert.doesNotMatch(JSON.stringify(context), /SECRET|base64|desktop.webp|banner.webp|"products"/);
  assert.equal(original.pages[0].sections[0].tiles[0].uploadedImage, 'desktop.webp');
});
test('stale but in-range indices reject the entire patch after an intervening insertion', () => {
  const current = fixture(), exported = makeClaudeContext(current);
  current.pages[0].sections[0].tiles.unshift({ id: 'new', type: 'image', textOverlay: { heading: 'Inserted' } });
  const before = JSON.stringify(current);
  assert.throws(() => applyPatchRaw(current, { baseRevision: exported.baseRevision, ops: [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { brief: 'Wrong target' } }] }), /veraltet|geändert|Stand/);
  assert.equal(JSON.stringify(current), before);
  assert.throws(() => applyPatchRaw(current, { ops: [{ op: 'deleteSection', pageId: 'p', sectionIdx: 0 }] }), /Stand|baseRevision/);
});
test('malformed nested values reject additions and modifications without a partial successful edit', () => {
  const bad = [{ asins: [{ asin: 'B012345678' }] }, { hotspots: [null] }, { linkUrl: {} }, { dimensions: { w: 'oops', h: 10 } }, { productSelector: { questions: [null] } }];
  for (const patch of bad) for (const op of [
    { op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch },
    { op: 'addTile', pageId: 'p', sectionIdx: 0, tile: { type: 'image', ...patch } },
  ]) {
    const current = fixture(), before = JSON.stringify(current);
    assert.throws(() => applyStorePatch(current, { ops: [{ op: 'modifyPage', pageId: 'p', patch: { name: 'Renamed' } }, op] }));
    assert.equal(JSON.stringify(current), before);
  }
});
test('new internal links resolve against final renamed pages and missing targets reject atomically', () => {
  const current = fixture();
  const { store } = applyStorePatch(current, { ops: [{ op: 'modifyPage', pageId: 'p', patch: { name: 'Renamed' } }, { op: 'addTile', pageId: 'p', sectionIdx: 0, tile: { type: 'image', linkUrl: 'page:Renamed' } }] });
  assert.equal(store.pages[0].sections[0].tiles[1].linkUrl, '/p');
  assert.throws(() => applyStorePatch(current, { ops: [{ op: 'addTile', pageId: 'p', sectionIdx: 0, tile: { type: 'image', linkUrl: 'page:Missing' } }] }), /Seite/);
});
test('quiz image assets are omitted from context and retained across partial quiz edits', () => {
  const current = fixture();
  current.pages[0].sections[0].tiles[0].productSelector = { intro: { headline: 'Intro', image: 'data:image/png;base64,QUIZ' }, questions: [{ id: 'q1', questionText: 'Before', answers: [{ id: 'a1', text: 'Answer', image: 'answer.webp', asins: [] }] }] };
  assert.doesNotMatch(JSON.stringify(makeClaudeContext(current)), /base64,QUIZ|answer.webp/);
  const { store } = applyStorePatch(current, { ops: [{ op: 'modifyTile', pageId: 'p', sectionIdx: 0, tileIdx: 0, patch: { productSelector: { intro: { headline: 'Updated' }, questions: [{ id: 'q1', questionText: 'After', answers: [{ id: 'a1', text: 'New answer', asins: [] }] }] } } }] });
  const quiz = store.pages[0].sections[0].tiles[0].productSelector;
  assert.equal(quiz.intro.image, 'data:image/png;base64,QUIZ'); assert.equal(quiz.questions[0].answers[0].image, 'answer.webp');
});
