import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { unzipSync, strFromU8 } from 'fflate';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let temp, importer, exporter, direction;
before(async () => {
  temp = await mkdtemp(resolve('.designer-context-test-'));
  for (const [name, source] of [['importer', 'src/briefingImport.js'], ['exporter', 'src/exportBriefing.js'], ['direction', 'src/components/DesignDirection.jsx']]) {
    const outfile = join(temp, name + '.mjs');
    await build({ entryPoints: [resolve(source)], outfile, bundle: true, packages: 'external', platform: 'node', format: 'esm', jsx: 'automatic', loader: { '.css': 'empty' } });
    const module = await import(pathToFileURL(outfile));
    if (name === 'importer') importer = module;
    if (name === 'exporter') exporter = module;
    if (name === 'direction') direction = module;
  }
});
after(async () => { await rm(temp, { recursive: true, force: true }); });

function briefing() {
  return {
    brandName: 'Context test',
    manualCI: { notes: 'Use our green identity\nKeep original typeface', palette: { primary: '#003e2a' } },
    productCI: { designerNotes: 'Use supplied packshots\nKeep label artwork intact', imageSources: ['original.png'] },
    pages: [{ name: 'Home', sections: [] }],
  };
}

test('project-wide designer context survives JSON import without sharing mutable objects', () => {
  const input = briefing();
  const store = importer.importBriefingToStore(input);
  assert.deepEqual(store.manualCI, input.manualCI);
  assert.deepEqual(store.productCI, input.productCI);
  input.manualCI.palette.primary = '#ffffff';
  input.productCI.imageSources.push('other.png');
  assert.equal(store.manualCI.palette.primary, '#003e2a');
  assert.deepEqual(store.productCI.imageSources, ['original.png']);
  assert.deepEqual(importer.importBriefingToStore(JSON.stringify(briefing())).manualCI, briefing().manualCI);
  for (const value of [null, [], 'notes', 42, new Date()]) {
    const invalid = importer.importBriefingToStore({ ...briefing(), manualCI: value, productCI: value });
    assert.equal(invalid.manualCI, undefined);
    assert.equal(invalid.productCI, undefined);
  }
});

test('designer view shows general brand and product notes even without reference links', () => {
  const store = importer.importBriefingToStore(briefing());
  const html = renderToStaticMarkup(createElement(direction.DesignerDesignDirection, { store }));
  assert.match(html, /Brand-specific designer notes/);
  assert.match(html, /Product imagery notes/);
  assert.match(html, /Use our green identity/);
  assert.match(html, /Keep label artwork intact/);
  assert.match(html, /white-space:pre-wrap/);
  const empty = renderToStaticMarkup(createElement(direction.DesignerDesignDirection, { store: { manualCI: { notes: ' \n ' }, productCI: { designerNotes: 123 } } }));
  assert.equal(empty, '');
});

test('downloaded DOCX retains both sets of project instructions and their line breaks', async () => {
  const store = importer.importBriefingToStore(briefing());
  const blob = await exporter.generateBriefingDocx(store, 'en');
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const xml = strFromU8(files['word/document.xml']);
  for (const expected of ['Brand-specific designer notes', 'Product imagery notes', 'Use our green identity', 'Keep original typeface', 'Use supplied packshots', 'Keep label artwork intact']) assert.ok(xml.includes(expected), expected);
  assert.match(xml, /<w:br\/>/);
});
