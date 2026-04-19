// Skeleton Builder
//
// Erzeugt ein strukturelles Store-Gerüst für eine Zielseite, indem aus der
// Blueprint Grammar (public/data/blueprint-grammar.json) gesamplet wird.
// Ausgabe ist ein Array von Sections mit leeren Tiles, bereit zum Befüllen
// durch Content Generator und Slot Filler.
//
// Kein LLM-Aufruf in dieser Datei.

import { uid, LAYOUTS, LAYOUT_TILE_DIMS, emptyTile } from './constants.js';
import { classifyPageType } from './pageTypeClassifier.js';

// ─── Layout ID Normalisierung ───
// Blueprints enthalten freie Layout-Beschreibungen (z.B. "hero-full",
// "FWB_Primary", "Logo Bar"). Der Tool-Katalog kennt aber nur konkrete
// Layout-IDs aus LAYOUT_TILE_DIMS. Diese Tabelle übersetzt zwischen beiden.
const LAYOUT_ID_MAP = {
  // Tool-Katalog-IDs (identisch)
  '1': '1',
  'std-2equal': 'std-2equal',
  'lg-2stack': 'lg-2stack',
  '2stack-lg': '2stack-lg',
  'lg-w2s': 'lg-w2s',
  'w2s-lg': 'w2s-lg',
  '2x2wide': '2x2wide',
  'lg-4grid': 'lg-4grid',
  '4grid-lg': '4grid-lg',
  '2s-4grid': '2s-4grid',
  '4grid-2s': '4grid-2s',
  '4x2grid': '4x2grid',
  'vh-2equal': 'vh-2equal',
  'vh-w2s': 'vh-w2s',
  'vh-2sw': 'vh-2sw',
  'vh-4square': 'vh-4square',

  // Full-width Banner, Hero, Divider, Logo Bar → '1'
  'hero-full': '1',
  'header': '1',
  'divider': '1',
  'divider-narrow': '1',
  'divider-aesthetic': '1',
  'minimal': '1',
  'logo-primary': '1',
  'logo bar': '1',
  'fwb_primary': '1',
  'fwb_cat': '1',
  'full width banner': '1',
  'full-width category banner': '1',
  'full-width secondary banner': '1',
  'wide promo tile': '1',
  'promo-mothers-day': '1',
  'product-detail-video-heavy': '1',
  'product-detail-video-intensive': '1',

  // 2 side-by-side → std-2equal
  'lg-2grid-wide': 'std-2equal',
  'two-col': 'std-2equal',

  // 3-tile stacks → lg-2stack
  'product-showcase-primary': 'lg-2stack',
  'product-showcase-secondary': 'lg-2stack',

  // 4+ grid → lg-4grid
  'lg-4grid-narrow': 'lg-4grid',
  'lg-4grid-mixed': 'lg-4grid',
  'four-square grid': 'lg-4grid',
  'brand-values-section': 'lg-4grid',
  'value-propositions': 'lg-4grid',
  'category-nav-primary': 'lg-4grid',

  // 6-8 tile grid → 4x2grid
  'six-tile grid': '4x2grid',

  // Product Grid (ASIN) bleibt speziell; nicht in LAYOUT_TILE_DIMS, wird
  // separat behandelt.
  'grid_products': 'product_grid',
  'product grid (asin)': 'product_grid',
};

export function normalizeLayoutId(rawId) {
  if (!rawId) return '1';
  const key = String(rawId).toLowerCase().trim();
  if (LAYOUT_ID_MAP[key]) return LAYOUT_ID_MAP[key];
  // Exakt-Match gegen den Tool-Katalog
  if (LAYOUT_TILE_DIMS[rawId]) return rawId;
  return '1';
}

// ─── Seeded PRNG (mulberry32) ───
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Weighted random pick from a {key: count} histogram.
function pickWeighted(histogram, rng) {
  const entries = Object.entries(histogram);
  if (!entries.length) return null;
  const total = entries.reduce((s, [, c]) => s + c, 0);
  let r = rng() * total;
  for (const [k, c] of entries) {
    r -= c;
    if (r <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

// ─── Fallback-Kette ───
// Wenn ein Seitentyp zu wenig Stichproben hat, greift der Builder auf einen
// besser abgedeckten Typ zurück. Die Kette respektiert semantische Nähe.
const FALLBACK_CHAIN = {
  home: [],
  category: ['home'],
  bestsellers: ['category', 'home'],
  new_arrivals: ['category', 'home'],
  all_products: ['category', 'home'],
  product_selector: ['category', 'home'],
  product_lines: ['category', 'home'],
  about: ['home'],
  sustainability: ['about', 'home'],
  brand_story: ['about', 'home'],
};

function resolveGrammarForType(grammar, pageType) {
  const chain = [pageType, ...(FALLBACK_CHAIN[pageType] || ['home'])];
  for (const type of chain) {
    const bucket = grammar?.pageTypes?.[type];
    if (!bucket) continue;
    if (bucket.confidence === 'insufficient') continue;
    return { bucket, resolvedType: type, fallbackUsed: type !== pageType };
  }
  // Letzter Fallback: home auch wenn insufficient
  return { bucket: grammar?.pageTypes?.home, resolvedType: 'home', fallbackUsed: true };
}

// ─── Skeleton-Generierung ───
//
// Eingabe:
//   pageType   — kanonischer Typ aus PAGE_TYPES
//   grammar    — geladene Grammar-JSON
//   opts.seed  — string, deterministischer Seed (typisch: brand + datum)
//   opts.minModules — optionales Minimum (Default aus Grammatik)
//   opts.maxModules — optionales Maximum
//
// Ausgabe: { sections: [...], meta: { resolvedType, fallbackUsed, seed } }
export function buildSkeleton(pageType, grammar, opts = {}) {
  const seed = opts.seed || 'default';
  const rng = mulberry32(hashString(seed));
  const resolved = resolveGrammarForType(grammar, pageType);
  const bucket = resolved.bucket;

  if (!bucket || !bucket.moduleCount) {
    return { sections: [], meta: { resolvedType: null, fallbackUsed: true, seed, reason: 'no_grammar' } };
  }

  // Modulanzahl samplen: Median +/- 1 innerhalb [p25, p75]
  let moduleCount = bucket.moduleCount.median;
  const p25 = bucket.moduleCount.p25;
  const p75 = bucket.moduleCount.p75;
  if (p25 !== null && p75 !== null && p75 > p25) {
    moduleCount = p25 + Math.floor(rng() * (p75 - p25 + 1));
  }
  if (opts.minModules != null) moduleCount = Math.max(moduleCount, opts.minModules);
  if (opts.maxModules != null) moduleCount = Math.min(moduleCount, opts.maxModules);
  moduleCount = Math.max(1, moduleCount);

  const sections = [];
  const usedLayoutsInRun = [];

  for (let i = 0; i < moduleCount; i++) {
    const pos = i + 1;
    const posHist = bucket.layoutAtPosition?.[pos] || bucket.layoutAtPosition?.[1] || { '1': 1 };

    // Raw layout aus Histogramm ziehen
    let rawLayoutId = pickWeighted(posHist, rng);

    // Zwei gleiche Layouts in Folge vermeiden (Monotonie-Bruch)
    const lastNorm = usedLayoutsInRun[usedLayoutsInRun.length - 1];
    let normalizedLayoutId = normalizeLayoutId(rawLayoutId);
    if (normalizedLayoutId === lastNorm) {
      // Alternative ziehen: zweithäufigstes Layout für diese Position
      const entries = Object.entries(posHist).sort((a, b) => b[1] - a[1]);
      for (const [alt] of entries) {
        const altNorm = normalizeLayoutId(alt);
        if (altNorm !== lastNorm) { rawLayoutId = alt; normalizedLayoutId = altNorm; break; }
      }
    }

    usedLayoutsInRun.push(normalizedLayoutId);

    // Tile-Count aus Layout-Katalog (Produktgrid gesondert behandelt)
    const dims = LAYOUT_TILE_DIMS[normalizedLayoutId];
    const tileCount = dims ? dims.length : 1;
    const finalLayoutId = dims ? normalizedLayoutId : '1';

    // Bildkategorie-Hinweis pro Tile aus dem Mix ziehen
    const imgMix = bucket.imageCategoryMix || { creative: 1 };
    const tiles = [];
    for (let t = 0; t < tileCount; t++) {
      const hint = pickWeighted(imgMix, rng) || 'creative';
      tiles.push(Object.assign(emptyTile(), { brief: '[' + hint.toUpperCase() + '] ', imageCategory: hint }));
    }

    sections.push({
      id: uid(),
      layoutId: finalLayoutId,
      tiles,
      _blueprintSource: { rawLayoutId, position: pos },
    });
  }

  return {
    sections,
    meta: {
      pageType,
      resolvedType: resolved.resolvedType,
      fallbackUsed: resolved.fallbackUsed,
      seed,
      moduleCount,
      confidence: bucket.confidence,
    },
  };
}

// Convenience: Seitenname direkt zu Gerüst
export function buildSkeletonFromPageName(pageName, grammar, opts = {}) {
  const pageType = classifyPageType(pageName, opts.userIntent);
  return buildSkeleton(pageType, grammar, opts);
}
