import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { unzipSync, strFromU8 } from 'fflate';

const input = JSON.parse(await readFile('tests/fixtures/reference-concepts/input.json', 'utf8'));
const concepts = await Promise.all(['bold', 'minimal', 'lifestyle'].map(async style => ({ style, data: JSON.parse(await readFile(`tests/fixtures/reference-concepts/${style}.json`, 'utf8')) })));
let temp, importer, exporter, validator;
before(async () => {
  temp = await mkdtemp(resolve('.reference-trial-'));
  for (const [name, source] of [['importer','src/briefingImport.js'], ['exporter','src/exportBriefing.js'], ['validator','src/constants.js']]) {
    const outfile = join(temp, name + '.mjs');
    await build({ entryPoints: [resolve(source)], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm' });
    const module = await import(pathToFileURL(outfile));
    if (name === 'importer') importer = module; else if (name === 'exporter') exporter = module; else validator = module;
  }
});
after(async () => { await rm(temp, { recursive: true, force: true }); });
const normalizeAsins = values => values.map(a => typeof a === 'string' ? a : a.asin).sort();

for (const { style, data } of concepts) {
  test(`${style} independent concept keeps the real scope, catalogue, CI and designer instructions`, () => {
    assert.deepEqual(data.pages.map(p => p.name), input.pageNames);
    assert.deepEqual(normalizeAsins(data.asins), normalizeAsins(input.asins));
    assert.deepEqual(data.manualCI, input.manualCI);
    assert.deepEqual(data.productCI, input.productCI);
    const store = importer.importBriefingToStore(data);
    assert.deepEqual(validator.validateStore(store), []);
    assert.deepEqual(store.manualCI, data.manualCI);
    assert.deepEqual(store.productCI, data.productCI);
    const known = new Set(input.asins.map(a => a.asin));
    for (const [pi, page] of data.pages.entries()) {
      assert(page.sections.length <= 19);
      assert.equal(store.pages[pi].heroBannerBrief, page.heroBannerBrief);
      let grids = 0;
      for (const [si, section] of page.sections.entries()) {
        for (const [ti, tile] of section.tiles.entries()) {
          const imported = store.pages[pi].sections[si].tiles[ti];
          assert.equal(imported.brief, tile.brief);
          assert.deepEqual(imported.textOverlay, { heading:'', subheading:'', body:'', bullets:[], cta:'', ...tile.textOverlay });
          if (['image','shoppable_image'].includes(tile.type)) {
            assert(tile.imageCategory && tile.brief);
            for (const key of ['dimensions','mobileDimensions']) {
              assert(tile[key]?.w > 0 && tile[key]?.h > 0);
              assert.deepEqual(imported[key], tile[key]);
            }
          }
          if (tile.type === 'product_grid') grids++;
          for (const asin of [...(tile.asins || []), ...(tile.linkAsin ? [tile.linkAsin] : []), ...(tile.hotspots || []).map(h => h.asin).filter(Boolean)]) assert(known.has(asin), `Foreign ASIN ${asin}`);
          if (tile.linkUrl?.startsWith('page:')) assert(input.pageNames.includes(tile.linkUrl.slice(5)), tile.linkUrl);
        }
      }
      assert(grids <= 1);
      if (['Schlaf','Energie'].includes(page.name)) {
        const used = page.sections.flatMap(s => s.tiles).flatMap(t => [...(t.asins || []), ...(t.linkAsin ? [t.linkAsin] : []), ...(t.hotspots || []).map(h => h.asin).filter(Boolean)]);
        const allowed = new Set(input.asins.filter(a => a.category === page.name).map(a => a.asin));
        assert(used.length > 0, `No category products in ${page.name}`);
        for (const asin of used) assert(allowed.has(asin), `${page.name}: foreign category ${asin}`);
      }
    }
  });
}
test('references lead to different page structures rather than only different labels', () => {
  const signatures = concepts.map(({ data }) => JSON.stringify(data.pages.map(p => p.sections.map(s => ({ layout: s.layoutId, types: s.tiles.map(t => t.type), imagery: s.tiles.map(t => t.imageCategory || '') })))));
  assert.equal(new Set(signatures).size, 3);
});
test('all three actual DOCX briefings retain the project instructions', async () => {
  for (const { data } of concepts) {
    const store = importer.importBriefingToStore(data);
    const blob = await exporter.generateBriefingDocx(store, 'en');
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(files['word/document.xml']);
    for (const text of [data.manualCI.notes, data.productCI.designerNotes]) assert(xml.includes(text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
  }
});
