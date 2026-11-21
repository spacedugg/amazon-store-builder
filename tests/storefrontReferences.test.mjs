import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/storefrontConceptPrompt.js', import.meta.url), 'utf8');
const { buildStorefrontConceptPrompt, validateStorefrontReferences, buildMacroStyleConceptPrompt, MACRO_STYLE_RULES, STOREFRONT_CONCEPT_PROMPT } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('empty optional references preserve the existing creation workflow', () => {
  assert.equal(buildStorefrontConceptPrompt([{ url: '', notes: '' }]), STOREFRONT_CONCEPT_PROMPT);
});
test('multiple store and subpage links with independent design preferences reach the copied assignment', () => {
  const references = [
    { url: ' https://www.amazon.de/stores/Outdoor/page/123 ', notes: ' Aufbau der Homepage und asymmetrische Kacheln ' },
    { url: 'https://www.amazon.co.uk/stores/page/456', notes: 'Wechsel von Lifestyle und Produkten auf der Unterseite' },
    { url: '', notes: '' },
  ];
  const prompt = buildStorefrontConceptPrompt(references);
  const json = prompt.split('Inspirations-Stores (keine eigenen Relaunch-Stores):\n')[1].split('\nÜbernimm')[0];
  assert.deepEqual(JSON.parse(json), references.slice(0, 2).map(r => ({ url: r.url.trim(), notes: r.notes.trim() })));
  assert.equal(references[0].url[0], ' ');
});
test('invalid links and orphaned notes cannot be silently omitted from the assignment', () => {
  for (const url of ['javascript:alert(1)', 'https://amazon.de.evil.com/stores/foo', 'https://www.amazon.de/dp/B012345678', 'kein Link']) {
    assert.match(validateStorefrontReferences([{ url }]), /vollständigen Amazon-Brand-Store-Link/);
    assert.throws(() => buildStorefrontConceptPrompt([{ url }]));
  }
  assert.match(validateStorefrontReferences([{ url: '', notes: 'Bildfolge übernehmen' }]), /Link ergänzen/);
  assert.equal(validateStorefrontReferences([{ url: 'https://www.amazon.com/stores/page/123' }]), '');
});

test('macro style assignment carries project references without copying brand identity or assortment counts', () => {
  const prompt = buildMacroStyleConceptPrompt([{url:' https://example.com/style ',notes:' Bildstark mit Tiefe '}]);
  assert.ok(prompt.includes('"url": "https://example.com/style"'));
  assert.ok(prompt.includes('"notes": "Bildstark mit Tiefe"'));
  for (const rule of ['Corporate Identity', 'keine Zielvorgabe', 'Homepage belegt keine Unterseitenstruktur', 'englischen brief', 'zwei sinnvoll unterschiedliche Architekturansätze']) assert.ok(MACRO_STYLE_RULES.includes(rule), rule);
  assert.equal(buildMacroStyleConceptPrompt([]), STOREFRONT_CONCEPT_PROMPT);
  for (const url of ['javascript:alert(1)', 'https://user:pass@example.com/style', 'kein Link', '']) assert.throws(() => buildMacroStyleConceptPrompt([{url,notes:'Tiefe'}]));
});
