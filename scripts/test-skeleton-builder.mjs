#!/usr/bin/env node
// Smoke-Test für den Skeleton Builder. Lädt die Grammar und generiert für
// mehrere Seitentypen und Brand-Seeds je ein Gerüst.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSkeleton, buildSkeletonFromPageName } from '../src/skeletonBuilder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const grammar = JSON.parse(readFileSync(join(__dirname, '../public/data/blueprint-grammar.json'), 'utf8'));

const cases = [
  { label: 'Homepage für "Acme" (Seed A)',      type: 'home',          seed: 'acme-2026-04-19' },
  { label: 'Homepage für "Acme" (Seed A wdh.)', type: 'home',          seed: 'acme-2026-04-19' },
  { label: 'Homepage für "Acme" (Seed B)',      type: 'home',          seed: 'acme-2026-04-20' },
  { label: 'Homepage für "Bravo"',               type: 'home',          seed: 'bravo-2026-04-19' },
  { label: 'Category',                           type: 'category',      seed: 'acme-cat-x' },
  { label: 'About',                              type: 'about',         seed: 'acme-about' },
  { label: 'Bestsellers (insufficient, fallback)', type: 'bestsellers', seed: 'acme-best' },
  { label: 'Sustainability (fehlt, fallback)',   type: 'sustainability', seed: 'acme-sus' },
];

console.log('Skeleton Builder Smoke Test');
console.log('='.repeat(70));
for (const c of cases) {
  const r = buildSkeleton(c.type, grammar, { seed: c.seed });
  console.log('\n' + c.label);
  console.log('  type=' + c.type + '  resolved=' + r.meta.resolvedType + (r.meta.fallbackUsed ? ' (fallback)' : '') + '  modules=' + r.sections.length + '  confidence=' + r.meta.confidence);
  r.sections.forEach((s, i) => {
    const raw = s._blueprintSource?.rawLayoutId;
    console.log('    ' + (i + 1) + '. layout=' + s.layoutId + '  tiles=' + s.tiles.length + '  (rawBP=' + raw + ')');
  });
}

// Test buildSkeletonFromPageName mit deutschen Namen
console.log('\n' + '='.repeat(70));
console.log('Klassifier-Test via buildSkeletonFromPageName');
['Startseite', 'Über uns', 'Bestseller', 'Proteine', 'Nachhaltigkeit'].forEach(name => {
  const r = buildSkeletonFromPageName(name, grammar, { seed: 'test-' + name });
  console.log('  "' + name + '" → type=' + r.meta.pageType + ', resolved=' + r.meta.resolvedType + ', modules=' + r.sections.length);
});
