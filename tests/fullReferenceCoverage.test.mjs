import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const json = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const profiles = await json('data/store-knowledge/_reference_style_profiles.json');
const inventory = await json('data/store-knowledge/review-2026-11-21/navigation-inventory.json');
const directory = new URL('data/store-knowledge/reference-pages/', root);
const names = (await readdir(directory)).filter(name => /^part-\d\d\.json$/.test(name)).sort();
const chunks = await Promise.all(names.map(name => json('data/store-knowledge/reference-pages/' + name)));
const stores = chunks.flatMap(chunk => chunk.stores);
const pages = stores.flatMap(store => store.pages);
const uuid = url => url.match(/\/page\/([a-f\d-]{36})/i)?.[1].toUpperCase();

test('full reference evidence covers exactly the discovered 525 Store pages in twelve bounded files', () => {
  assert.equal(names.length, 12);
  assert.equal(profiles.schemaVersion, 3);
  assert.equal(profiles.fullPageAudit.coverageCompleted, true);
  assert.equal(profiles.fullPageAudit.unreviewedCapturedPages, 0);
  assert.equal(stores.length, 24);
  assert.equal(new Set(stores.map(store => store.storeId)).size, 24);
  assert.equal(pages.length, 525);
  for (const source of inventory.stores) {
    const saved = stores.find(store => store.storeId === source.id);
    assert.ok(saved, source.id);
    const expected = [...new Set(source.pages.map(page => uuid(page.url)))].sort();
    const actual = saved.pages.map(page => uuid(page.sourceUrl)).sort();
    assert.deepEqual(actual, expected, source.id);
    assert.equal(new Set(actual).size, actual.length, source.id);
    const profile = profiles.stores.find(store => store.id === source.id);
    assert.equal(profile.fullPageReviews.pageCount, actual.length);
    assert.ok(profile.fullPageReviews.file.endsWith('.json'));
    assert.ok(profile.crossPageAnalysis.observedStructureFamilies.length);
    assert.ok(profile.crossPageAnalysis.evidenceFile);
    for (const status of ['reviewed', 'partially_reviewed', 'unavailable']) assert.equal(profile.fullPageReviews[status], saved.pages.filter(page => page.status === status).length, source.id + ':' + status);
  }
  assert.equal(pages.filter(page => page.status === 'reviewed').length, 523);
  assert.equal(pages.filter(page => page.status === 'partially_reviewed').length, 1);
  assert.equal(pages.filter(page => page.status === 'unavailable').length, 1);
});

test('preserved curated Home and 54 subpage reviews remain distinguishable from source-only structure', () => {
  const curated = pages.filter(page => page.analysisBasis === 'curated_visual_review');
  assert.equal(curated.length, 78);
  assert.equal(profiles.subpageReview.visuallyReviewedPages, 54);
  assert.equal(profiles.stores.reduce((sum, store) => sum + store.subpagePatterns.length, 0), 54);
  for (const profile of profiles.stores) {
    const saved = stores.find(store => store.storeId === profile.id).pages;
    for (const original of [profile, ...profile.subpagePatterns]) {
      const page = saved.find(candidate => uuid(candidate.sourceUrl) === uuid(original.sourceUrl));
      assert.equal(page.analysisBasis, 'curated_visual_review');
      assert.deepEqual(page.observations, original.observations);
      assert.deepEqual(page.transferablePrinciples, original.transferablePrinciples);
      assert.deepEqual(page.evidence, original.evidence);
    }
  }
  assert.equal(pages.filter(page => page.analysisBasis === 'vision_and_dom').length, 92);
  assert.equal(pages.filter(page => page.analysisBasis === 'dom_structure').length, 354);
  for (const page of pages.filter(page => page.analysisBasis === 'vision_and_dom')) {
    assert.ok(page.originalVisionAnalysisKeys);
    assert.equal(page.visionProvenance.provider, 'OpenAI');
    assert.ok(page.modules.length);
    assert.deepEqual(page.originalVisionAnalysisKeys, ['pageRole', 'summary', 'macroStyle', 'modules', 'observations', 'transferablePrinciples', 'designerInstructions', 'limitations']);
    assert.ok(page.originalVisionAnalysisKeys.every(key => page[key] !== undefined));
    assert.ok(page.sourceRecordUrl.endsWith('.json'));
  }
});

test('every available page exposes concrete evidence and source scope without turning missing assets into style', () => {
  for (const page of pages) {
    assert.ok(page.reviewMethod);
    assert.ok(page.pageRole);
    if (page.status === 'unavailable') {
      assert.equal(page.pageName, 'Deals');
      assert.equal(uuid(page.sourceUrl), 'BFC6A7D3-E8C3-4CE3-AD57-99B3E841119A');
      assert.ok(page.reason);
      assert.equal(page.evidence, undefined);
      assert.deepEqual(page.observations, []);
      continue;
    }
    assert.ok(page.evidence.url.startsWith('https://'));
    assert.ok(page.evidence.width > 0 && page.evidence.height > 0);
    assert.ok(page.capturedAt && page.reviewedAt);
    for (const field of ['observations', 'transferablePrinciples', 'designerInstructions', 'modules', 'limitations']) assert.ok(page[field].length, page.pageName + ':' + field);
    if (page.status === 'partially_reviewed') {
      assert.equal(page.pageName, 'Sonderangebote');
      assert.equal(page.evidence.imagesComplete, false);
      assert.equal(page.quality.failedAssets, 35);
      assert.ok(page.captureLimitations.some(text => text.includes('Partial capture')));
    } else assert.equal(page.evidence.imagesComplete, true);
    if (page.analysisBasis === 'dom_structure') {
      assert.equal(page.originalVisionAnalysis, undefined);
      assert.match(page.reviewMethod, /source structure/);
      assert.ok(page.observations.some(text => text.includes('Source sequence:')));
      assert.ok(page.limitations.some(text => text.includes('No new visual claim')));
      for (const module of page.modules) {
        assert.ok(module.type && module.order > 0);
        assert.ok(Number.isFinite(module.height));
        assert.notEqual(module.type, 'store_header_navigation');
        assert.notEqual(module.type, 'utility_footer');
        assert.ok(Array.isArray(module.imageSamples) && Array.isArray(module.linkTargets));
        for (const image of module.imageSamples) if (image.sourceCropDimensions) {
          assert.ok(image.sourceCropDimensions.w > 0 && image.sourceCropDimensions.h > 0);
          assert.ok(Math.abs(image.sourceCropAspectRatio - image.sourceCropDimensions.w / image.sourceCropDimensions.h) < 0.001);
        }
      }
    }
  }
});
