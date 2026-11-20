import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Load the browser's extensionless ES modules without adding a transpiler dependency.
const constantsSource = await readFile(new URL('../src/constants.js', import.meta.url), 'utf8');
const constantsUrl = 'data:text/javascript;base64,' + Buffer.from(constantsSource).toString('base64');
const constants = await import(constantsUrl);
const importerSource = (await readFile(new URL('../src/briefingImport.js', import.meta.url), 'utf8'))
  .replace("from './constants'", 'from ' + JSON.stringify(constantsUrl));
const { importTileFromBriefing } = await import('data:text/javascript;base64,' + Buffer.from(importerSource).toString('base64'));

test('all four desktop squares default to mobile squares before any manual editing', () => {
  for (let index = 0; index < 4; index++) {
    const tile = constants.emptyTileForLayout('vh-4square', index);
    assert.deepEqual(tile.dimensions, { w: 1500, h: 1500 });
    assert.deepEqual(tile.mobileDimensions, { w: 750, h: 750 });
    const imported = importTileFromBriefing({ dimensions: { w: 1500, h: 1500 } }, 'vh-4square', index);
    assert.deepEqual(imported.mobileDimensions, { w: 750, h: 750 });
  }
});

test('explicit mobile artwork dimensions survive full and patch tile normalization', () => {
  const source = { type: 'image', dimensions: { w: 1500, h: 1500 }, mobileDimensions: { w: 1000, h: 1200 }, uploadedImageMobile: 'existing-mobile.png' };
  const tile = importTileFromBriefing(source, 'vh-4square', 0);
  assert.deepEqual(tile.mobileDimensions, source.mobileDimensions);
  assert.equal(tile.uploadedImageMobile, source.uploadedImageMobile);
  assert.deepEqual(source.mobileDimensions, { w: 1000, h: 1200 });
});

test('square and portrait content banners import independently of landscape desktop art', () => {
  for (const type of ['image', 'shoppable_image']) {
    for (const h of [1680, 2100]) {
      const tile = importTileFromBriefing({ type, dimensions: { w: 3000, h: 800 }, mobileDimensions: { w: 1680, h } }, '1', 0);
      assert.deepEqual(tile.dimensions, { w: 3000, h: 800 });
      assert.deepEqual(tile.mobileDimensions, { w: 1680, h });
    }
  }
});

test('thin dividers and unrelated layouts retain their existing sizing behavior', () => {
  const divider = importTileFromBriefing({ dimensions: { w: 3000, h: 300 }, mobileDimensions: { w: 1680, h: 300 } }, '1', 0);
  assert.deepEqual(divider.mobileDimensions, { w: 1680, h: 300 });
  assert.deepEqual(constants.deriveMobileDims('vh-2equal', 3000, 1500), { w: 1500, h: 750 });
  assert.deepEqual(constants.deriveMobileDims('std-2equal', 1500, 1500), { w: 1500, h: 1500 });
  assert.deepEqual(constants.DIMENSION_PRESETS.headerBanner.mobile, { w: 1680, h: 900 });
});
