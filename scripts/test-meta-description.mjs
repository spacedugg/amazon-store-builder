// Prueft die Meta Description Regeln (src/metaDescription.js). Aufruf: node scripts/test-meta-description.mjs
import assert from 'node:assert/strict';
import { generateMetaDescription as g, metaDescriptionIssues as lint, META_MAX } from '../src/metaDescription.js';

const tile = (extra) => Object.assign({ asins: [], textOverlay: {}, hotspots: [] }, extra);
const pg = (id, name, tiles) => ({ id, name, sections: [{ id: id + 's', tiles: tiles || [tile()] }] });
const store = {
  brandName: 'Jowo Chemie', marketplace: 'de', brandTone: 'seit 1975 Qualität aus Deutschland',
  products: [{ asin: 'B0A', categories: ['Garten', 'Pflanzenpflege', 'Blumenerde'] }],
  pages: [],
};
store.pages = [
  pg('h', 'Home', [tile({ textOverlay: { heading: 'Gesunde Pflanzen' } })]),
  pg('a', 'Blumenerde', [tile({ asins: ['B0A'] })]),
  pg('c', 'Pflanzenschutz'),
  pg('d', 'Bestseller', [tile({ asins: ['B0A'] })]),
  pg('e', 'Über uns'),
  pg('f', 'Spezialprodukte', [tile({ textOverlay: { heading: 'BESTE QUALITÄT ZUM SUPERPREIS' } })]),
  pg('g', 'Rasen', [tile({ textOverlay: { heading: 'Jetzt 20% Rabatt auf alles!' } })]),
];

for (const mp of ['de', 'com', 'co.uk', 'fr', 'es']) {
  store.marketplace = mp;
  const seen = new Set();
  for (const p of store.pages) {
    const d = g(p, store);
    assert.ok(d.length <= META_MAX, `${mp}/${p.name}: zu lang (${d.length})`);
    assert.deepEqual(lint(d), [], `${mp}/${p.name}: ${d}`);
    assert.ok(/[.!?]$/.test(d), `${mp}/${p.name}: endet nicht sauber`);
    assert.ok(!seen.has(d), `${mp}/${p.name}: doppelter Text`);
    seen.add(d);
    assert.ok(d.includes('Jowo Chemie'), `${mp}/${p.name}: Marke fehlt`);
    assert.ok(!/\d+ (Produkte|products|produits)/i.test(d), `${mp}/${p.name}: Produktzaehler`);
  }
}

// Werbe- und Preisaussagen aus Ueberschriften landen nicht im Text
store.marketplace = 'de';
const rasen = g(store.pages.find((p) => p.id === 'g'), store);
assert.ok(!/rabatt|%/i.test(rasen), rasen);
const spezial = g(store.pages.find((p) => p.id === 'f'), store);
assert.ok(!/beste|superpreis/i.test(spezial), spezial);

// Sehr langer Markenname: nie ueber der Grenze, nie mit "..." abgeschnitten
store.brandName = 'Eine sehr lange Markenbezeichnung GmbH & Co. KG International Handelsgesellschaft';
for (const p of store.pages) {
  const d = g(p, store);
  assert.ok(d.length <= META_MAX && !/\.\.\./.test(d), d);
}

// Pruefung handgeschriebener Texte
assert.ok(lint('Jetzt 50% günstiger kaufen, bester Preis!').length > 0);
assert.deepEqual(lint('Jowo Chemie Blumenerde: Auswahl im offiziellen Amazon Store ansehen. Alle Produkte auf einen Blick.'), []);
console.log('ok');
