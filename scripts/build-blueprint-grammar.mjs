#!/usr/bin/env node
// Extracts a datengetriebene structural grammar from the 20 reference-store
// blueprint JSONs under data/store-knowledge/*.json and writes the result to
// public/data/blueprint-grammar.json.
//
// Output is consumed by the Skeleton Builder (Welle 3) to generate store
// layouts that statistically match real brand stores instead of hardcoded
// templates.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INPUT_DIR = join(ROOT, 'data/store-knowledge');
const OUTPUT_DIR = join(ROOT, 'public/data');
const OUTPUT_FILE = join(OUTPUT_DIR, 'blueprint-grammar.json');

// Page type classifier: maps raw German pageName strings to canonical types.
// Order matters, first match wins.
const PAGE_TYPE_RULES = [
  { type: 'home', test: /^(startseite|home|homepage)$/ },
  { type: 'about', test: /^(über|ueber|about|unsere mission|mission)\b/ },
  { type: 'bestsellers', test: /(bestseller|bestselling)/ },
  { type: 'new_arrivals', test: /(neu(heiten|igkeiten)?|new|arrivals?)/ },
  { type: 'sustainability', test: /(nachhaltigkeit|sustainab|umwelt)/ },
  { type: 'product_lines', test: /(produktlinien?|productlines?|kollektion)/ },
  { type: 'product_selector', test: /(produktselektor|selektor|selector|finder)/ },
  { type: 'all_products', test: /^(alle produkte|all products|angebote|sale|offers?)$/ },
  { type: 'brand_story', test: /(geschichte|story|unsere geschichte|brandstory)/ },
];

function classifyPageType(pageName) {
  const n = (pageName || '').toLowerCase().trim();
  if (!n) return 'unknown';
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.test.test(n)) return rule.type;
  }
  return 'category';
}

function normImageCategory(raw) {
  if (!raw) return 'none';
  return String(raw).toLowerCase().split(/[\s-]+/)[0] || 'none';
}

function percentile(arr, p) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function distribution(values) {
  if (!values.length) return null;
  return {
    n: values.length,
    min: Math.min(...values),
    p25: percentile(values, 25),
    median: percentile(values, 50),
    p75: percentile(values, 75),
    max: Math.max(...values),
  };
}

function histogram(values) {
  const out = {};
  values.forEach(v => { out[v] = (out[v] || 0) + 1; });
  return out;
}

function normalize(obj) {
  const total = Object.values(obj).reduce((s, n) => s + n, 0) || 1;
  const out = {};
  Object.entries(obj).forEach(([k, v]) => { out[k] = Number((v / total).toFixed(4)); });
  return out;
}

// ─── Main ───

const files = readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
const blueprints = files.map(f => ({
  file: f,
  data: JSON.parse(readFileSync(join(INPUT_DIR, f), 'utf8')),
}));

const pageTypes = {};
let totalPages = 0;
let totalModules = 0;
let totalTiles = 0;

blueprints.forEach(({ file, data }) => {
  const brand = data.storeMetadata?.brandName || file.replace('_analysis.json', '');
  (data.pages || []).forEach(page => {
    totalPages++;
    const modules = page.modules || [];
    // Skip pages without structural data. Some blueprints only have metadata
    // for subpages (total=0 modules). They inflate page counts but carry no
    // grammar signal.
    if (modules.length === 0) return;
    const type = classifyPageType(page.pageName);
    if (!pageTypes[type]) {
      pageTypes[type] = {
        stores: new Set(),
        moduleCounts: [],
        layoutSequences: [],
        layoutAtPosition: {},
        moduleNameSamples: [],
        imageCategoryCounts: {},
        tileCounts: [],
      };
    }
    const bucket = pageTypes[type];
    bucket.stores.add(brand);
    bucket.moduleCounts.push(modules.length);
    const seq = modules.map(m => m.layoutId || m.layoutType || 'unknown');
    bucket.layoutSequences.push(seq);
    modules.forEach((m, i) => {
      totalModules++;
      const pos = i + 1;
      if (!bucket.layoutAtPosition[pos]) bucket.layoutAtPosition[pos] = {};
      const lid = m.layoutId || m.layoutType || 'unknown';
      bucket.layoutAtPosition[pos][lid] = (bucket.layoutAtPosition[pos][lid] || 0) + 1;
      if (m.moduleName) bucket.moduleNameSamples.push(m.moduleName);
      const tc = m.tileCount || (m.tiles ? m.tiles.length : 0);
      bucket.tileCounts.push(tc);
      (m.tiles || []).forEach(t => {
        totalTiles++;
        const cat = normImageCategory(t.imageCategory);
        bucket.imageCategoryCounts[cat] = (bucket.imageCategoryCounts[cat] || 0) + 1;
      });
    });
  });
});

const out = {
  meta: {
    generatedAt: new Date().toISOString(),
    blueprintCount: blueprints.length,
    blueprintFiles: files,
    totalPages,
    totalModules,
    totalTiles,
    pageTypeRules: PAGE_TYPE_RULES.map(r => ({ type: r.type, pattern: r.test.toString() })),
  },
  pageTypes: {},
};

// Confidence tier: the Skeleton Builder uses this to decide whether a page
// type has enough data to sample from, or whether it must fall back to a
// better-covered type (typically home or category).
function confidenceFor(sampleSize) {
  if (sampleSize >= 10) return 'high';
  if (sampleSize >= 5) return 'medium';
  if (sampleSize >= 2) return 'low';
  return 'insufficient';
}

Object.keys(pageTypes).sort().forEach(type => {
  const b = pageTypes[type];
  // Dedupe moduleNameSamples, keep top 50
  const nameFreq = {};
  b.moduleNameSamples.forEach(n => { nameFreq[n] = (nameFreq[n] || 0) + 1; });
  const topNames = Object.entries(nameFreq).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([n, c]) => ({ name: n, count: c }));

  out.pageTypes[type] = {
    sampleSize: b.stores.size,
    pageInstances: b.moduleCounts.length,
    confidence: confidenceFor(b.stores.size),
    stores: [...b.stores].sort(),
    moduleCount: distribution(b.moduleCounts),
    layoutAtPosition: b.layoutAtPosition,
    layoutSequences: b.layoutSequences,
    tileCountPerModule: {
      distribution: distribution(b.tileCounts),
      histogram: histogram(b.tileCounts),
    },
    imageCategoryMix: normalize(b.imageCategoryCounts),
    imageCategoryCounts: b.imageCategoryCounts,
    moduleNameTop: topNames,
  };
});

if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2) + '\n');

// Console summary
console.log('Blueprint Grammar extrahiert:');
console.log('  Blueprints:      ' + blueprints.length);
console.log('  Pages total:     ' + totalPages);
console.log('  Modules total:   ' + totalModules);
console.log('  Tiles total:     ' + totalTiles);
console.log('  Output:          ' + OUTPUT_FILE.replace(ROOT + '/', ''));
console.log('');
console.log('Page types found:');
Object.entries(out.pageTypes).forEach(([type, info]) => {
  const mc = info.moduleCount;
  const mcStr = mc ? `median ${mc.median}, range ${mc.min}..${mc.max}, n=${mc.n}` : 'n=0';
  console.log(`  ${type.padEnd(20)} stores=${String(info.sampleSize).padStart(2)}  confidence=${info.confidence.padEnd(12)}  modules: ${mcStr}`);
});
