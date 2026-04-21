#!/usr/bin/env node
/**
 * build-rerun-aggregate.mjs
 *
 * Erzeugt natural-elements_analysis.json im Probe-Schema
 * (storeMetadata + storeAnalysis + pages[]) für die Workflow-Robustness-Probe.
 *
 * Quellen:
 *   rerun/blueprints/*.json  (DOM-derived Blueprints v2)
 *   rerun/dom/*.json         (DOM-Rohdaten, für Statistiken)
 *
 * Kein Vision, keine Brand-Identity-Analyse hier. Vision-/Brand-Felder
 * sind als screenshot_required oder phase2_brand_identity_pass markiert,
 * damit der Diff gegen Gold die Pipeline-Lücken zeigt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BP_DIR = path.join(__dirname, 'blueprints');
const DOM_DIR = path.join(__dirname, 'dom');
const OUT = path.join(__dirname, 'natural-elements_analysis.json');

const STORE_KEY = 'natural-elements';
const STORE_BRAND = 'natural elements';
const STORE_HOME = 'https://www.amazon.de/stores/page/3955CCD4-902C-4679-9265-DEC4FCBAA8C8';
const MARKETPLACE = 'amazon.de';

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function listSorted(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
}

function buildPagesArray() {
  const bps = listSorted(BP_DIR);
  return bps.map(f => readJson(path.join(BP_DIR, f)));
}

function buildContentStats(pages) {
  return pages.reduce((acc, p) => ({
    totalDomModules: acc.totalDomModules + p.contentStats.domModules,
    totalLogicalModules: acc.totalLogicalModules + p.contentStats.logicalModules,
    totalImages: acc.totalImages + p.contentStats.totalImages,
    totalVideos: acc.totalVideos + p.contentStats.totalVideos
  }), { totalDomModules: 0, totalLogicalModules: 0, totalImages: 0, totalVideos: 0 });
}

function moduleClassDistribution(pages) {
  const dist = {};
  for (const p of pages) for (const m of p.modules) {
    const k = m.layoutShape || 'unknown';
    dist[k] = (dist[k] || 0) + 1;
  }
  return dist;
}

function designIntentDistribution(pages) {
  const dist = {};
  for (const p of pages) for (const m of p.modules) {
    const k = m.designIntent || 'unknown';
    dist[k] = (dist[k] || 0) + 1;
  }
  return dist;
}

function pageTypeMap(pages) {
  return pages.map(p => ({ slug: path.basename(p._sourceDom, '.json'), pageType: p.pageType, level: p.pageLevel, name: p.pageName }));
}

function build() {
  const pages = buildPagesArray();
  const stats = buildContentStats(pages);

  const aggregate = {
    _schemaVersion: 'v2-rerun-probe-dom-only',
    _generatedBy: 'rerun/build-rerun-aggregate.mjs',
    _generatedAt: new Date().toISOString(),
    _purpose: 'Workflow-Robustness-Rerun für natural-elements. Vergleichbar gegen data/store-knowledge/rerun/natural-elements_gold.json (Phase 2 Diff).',
    storeMetadata: {
      storeKey: STORE_KEY,
      brandName: STORE_BRAND,
      marketplace: MARKETPLACE,
      homepageUrl: STORE_HOME,
      pageCount: pages.length,
      scrapedAt: pages[0] ? null : null,
      scrapedRange: {
        from: pages[0]?._scrapedAt || '2026-04-20T00:10:35Z',
        to: '2026-04-20T00:27:21Z'
      },
      pages: pageTypeMap(pages)
    },
    storeAnalysis: {
      contentStats: stats,
      moduleLayoutShapeDistribution: moduleClassDistribution(pages),
      designIntentDistribution: designIntentDistribution(pages),
      brandIdentity: 'phase2_brand_identity_pass',
      voiceTonality: 'phase2_brand_identity_pass',
      uspCandidates: 'phase2_brand_identity_pass',
      colorSystem: 'screenshot_required',
      typographySystem: 'screenshot_required',
      heroPattern: 'screenshot_required',
      navigationStructure: pages.map(p => ({
        slug: path.basename(p._sourceDom, '.json'),
        pageType: p.pageType,
        level: p.pageLevel
      }))
    },
    pages,
    openQuestions: [
      'Brand-Identity (Tone, USPs, Brand-Story) ist nicht in diesem Rerun-Aggregat enthalten, gehört in Phase 2 (Gold-Vergleich) bzw. Brand-Identity-Pass.',
      'Vision-Felder pro Tile (imageCategory, backgroundStyle, dominantColors, elementProportions, textOnImage) sind aus DOM nicht ableitbar.',
      'Color- und Typographie-System der Marke erfordert Screenshot-Analyse.',
      'Cross-Page-Pattern (z.B. einheitliche Hero-Struktur, einheitliche Nav-Bridge) sind heuristisch markiert, brauchen Vision-Validierung.',
      'Page 04 (SoProtein Vegan) hat nur 4 DOM-Rows, davon 2 logische Module. Anomalie: Title kommt vom Hero-Image-Alt, nicht vom Pagetitel-Element.',
      'Page 08 (Produktselektor) ist eine dynamische Selektor-Seite. Echter Brand-Content ist auf 1 ProductGrid + 1 Hero reduziert. Rest sind Inline-Scripts/CSS.',
      'Page 10 ist im Tab-Titel "Unsere Empfehlungen", nicht "Bestseller" wie ursprünglich im Plan vermerkt.'
    ]
  };

  fs.writeFileSync(OUT, JSON.stringify(aggregate, null, 2));
  console.log(`OK ${OUT}`);
  console.log('Pages:', pages.length);
  console.log('Total logical modules:', stats.totalLogicalModules);
  console.log('Total DOM modules:', stats.totalDomModules);
  console.log('Total images:', stats.totalImages);
  console.log('Total videos:', stats.totalVideos);
}

build();
