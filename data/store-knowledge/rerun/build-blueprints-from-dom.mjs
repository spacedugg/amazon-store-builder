#!/usr/bin/env node
/**
 * build-blueprints-from-dom.mjs
 *
 * Workflow-Robustness-Rerun Probe für Natural Elements.
 * Erzeugt v2-konforme Blueprints (docs/BLUEPRINT_EXTRACTION_PROMPT.md)
 * aus DOM-Extrakten (rerun/dom/*.json).
 *
 * Erzeugt pro Seite genau die Felder die aus dem DOM ableitbar sind
 * und markiert alle Vision-Felder als screenshot_required in openQuestions.
 * Das ist bewusst so, damit der spätere Diff gegen den Gold-Blueprint
 * die exakte DOM-vs-Vision-Lücke zeigt.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOM_DIR = path.join(__dirname, 'dom');
const OUT_DIR = path.join(__dirname, 'blueprints');

// ---------- Heuristiken ---------- //

function classifyLayoutShape(row) {
  const { w, ic, pc } = row;
  if (w === 'ProductGrid' || pc >= 4) return 'product_grid_asin';
  if (w === 'Shoppable' || (row.sm && row.sm > 0)) return 'shoppable_interactive_image';
  if (ic === 1 && !row.hl?.length) return 'full_width_banner';
  if (ic === 2) return '2_tile_grid';
  if (ic === 3) return 'large_plus_2_stacked';
  if (ic === 4) return '4_tile_grid';
  if (ic === 6) return '6_tile_grid';
  if (ic === 8) return '8_tile_grid';
  if (ic >= 25 && row.vc > 0) return '6_tile_grid'; // ProductShowcase mit Video, viele Duplikate
  if (ic >= 20) return '6_tile_grid';
  return 'full_width_banner';
}

function classifyDesignIntent(row, idx, total) {
  const { w, pc, vc, sm, ic, hl } = row;
  if (sm > 0) return 'product_showcase';
  if (w === 'ProductGrid' || pc >= 4) return 'product_showcase';
  if (vc > 0) return 'editorial';
  if (idx === 1 && ic === 1) return 'immersive'; // Hero direkt nach Header
  if (idx === total - 1) return 'editorial'; // letztes Modul vor Share
  if (ic === 4 && pc === 0) return 'navigation_bridge';
  if (ic === 1 && !hl?.length) return 'visual_separator';
  if (hl?.length) return 'editorial';
  return 'editorial';
}

function moduleName(row, layoutShape, designIntent) {
  if (row.w === 'ProductGrid' || row.pc >= 4) return 'Produktgrid';
  if (row.sm > 0) return 'Shoppable Hero';
  if (row.vc > 0 && row.ic >= 20) return 'Produkt-Showcase mit Video';
  if (row.vc > 0) return 'Video-Modul';
  if (designIntent === 'immersive') return 'Hero-Banner';
  if (designIntent === 'navigation_bridge') return 'Kategorien-Grid';
  if (designIntent === 'visual_separator') return 'Trenn-Banner';
  if (layoutShape === 'full_width_banner') return 'Full-Width-Banner';
  if (layoutShape === '2_tile_grid') return '2-Tile-Grid';
  if (layoutShape === '4_tile_grid') return '4-Tile-Grid';
  return 'Editorial-Modul';
}

function isAmazonSystemRow(row, idx, total) {
  // Header (erster, enthält Brand + Nav)
  if (idx === 0 && row.w === null) return true;
  // Share-Footer
  if (idx === total - 1 && /Teilen/i.test(row.p)) return true;
  // Trenn-Rows mit h:1 und ohne Inhalt
  if (row.h === 1 && row.ic === 0 && !row.hl?.length) return true;
  // Inline-Script/CSS-Rows ohne sichtbare Fläche
  if (row.h === 0 && row.ic === 0) return true;
  return false;
}

function pageLevelFromSlug(slug) {
  if (/^01_/.test(slug)) return 0;
  if (/^04_/.test(slug)) return 2; // SoProtein ist Sub-Page der Neuheiten
  return 1;
}

function pageTypeFromSlug(slug) {
  if (/^01_/.test(slug)) return 'startseite';
  if (/ueber_uns|brand_story/.test(slug)) return 'about';
  if (/alle_produkte/.test(slug)) return 'product_lines';
  if (/neuheiten/.test(slug)) return 'new_arrivals';
  if (/bestseller|unsere_empfehlungen/.test(slug)) return 'bestsellers';
  if (/produktselektor/.test(slug)) return 'product_selector';
  if (/geschenk/.test(slug)) return 'product_lines';
  if (/soprotein|vegan/.test(slug)) return 'sub_category';
  if (/vitamine/.test(slug)) return 'sub_category';
  if (/immunsystem|sport|beauty|knochen|wohlbefinden|verdauung|gaming/.test(slug)) return 'hub_category';
  return 'hub_category';
}

function estimateScrollLength(sh) {
  if (sh < 2000) return 'short';
  if (sh < 5000) return 'medium';
  if (sh < 8000) return 'long';
  return 'very_long';
}

function slugToPageName(slug, label) {
  return label || slug.replace(/^\d+_/, '').replace(/_/g, ' ');
}

// ---------- Tile-Konstruktion ---------- //

function buildTiles(row, layoutShape) {
  const n = row.ic || 1;
  const tiles = [];
  for (let i = 0; i < n && i < 8; i++) {
    const img = row.im?.[i] || {};
    tiles.push({
      position: i + 1,
      imageCategory: 'screenshot_required',
      visualContent: img.alt ? `Bild (alt: ${img.alt.slice(0, 80)})` : 'DOM-Bild ohne Alt-Text',
      elementProportions: {},
      textOnImage: { headline: null, subline: null, cta: null, directionCues: null },
      ctaText: null,
      linksTo: null,
      backgroundStyle: 'screenshot_required',
      backgroundDetail: null,
      dominantColors: [],
      _imgSrc: img.src || null
    });
  }
  return tiles;
}

// ---------- Modul-Mapping ---------- //

function buildModule(row, position, total, pageSlug) {
  const layoutShape = classifyLayoutShape(row);
  const designIntent = classifyDesignIntent(row, row.i, total);
  const name = moduleName(row, layoutShape, designIntent);
  const padded = String(position).padStart(2, '0');
  const tiles = buildTiles(row, layoutShape);

  return {
    moduleId: `${pageSlug}_mod_${padded}`,
    position,
    moduleName: name,
    layoutShape,
    tileCount: tiles.length,
    designRationale: `DOM-abgeleitet aus Widget ${row.w || 'null'} auf Position ${row.i} (t=${row.t}px, h=${row.h}px, ic=${row.ic}, pc=${row.pc}, vc=${row.vc}).`,
    relationToNextModule: 'screenshot_required',
    structuralPattern: 'screenshot_required',
    designIntent,
    designIntentDetail: `Heuristik aus widgetClass=${row.w}, imgCount=${row.ic}, productCount=${row.pc}, videoCount=${row.vc}.`,
    tiles,
    _dom: {
      domIndex: row.i,
      topPx: row.t,
      heightPx: row.h,
      widgetClass: row.w,
      headingText: row.hl,
      previewChars: row.p?.length || 0,
      images: row.ic,
      videos: row.vc,
      products: row.pc,
      shoppable: row.sm
    }
  };
}

// ---------- Hauptlogik ---------- //

// Normalisiert beide Schemas (verbose long-keys aus 01/02, compact short-keys aus 03..10)
function normalizeDom(d) {
  if (d.m && typeof d.m === 'object') return d; // schon compact
  return {
    ...d,
    sh: d.scrollHeight,
    n: d.count,
    vp: d.viewport ? `${d.viewport.w}x${d.viewport.h}` : null,
    m: (d.modules || []).map(r => ({
      i: r.idx,
      t: r.top,
      h: r.height,
      w: r.widgetClass,
      hl: r.headlines || [],
      p: r.allTextPreview || '',
      ic: r.imageCount ?? r.imgCount ?? 0,
      tc: r.textChars ?? 0,
      pc: r.productCount ?? 0,
      vc: r.videoCount ?? 0,
      sm: r.shoppableModules ?? r.shoppable ?? 0,
      im: (r.images || r.im || []).map(i => ({ alt: (i.alt || '').slice(0, 80), src: i.src || '' }))
    }))
  };
}

function buildBlueprint(domFile) {
  const raw = fs.readFileSync(domFile, 'utf8');
  const dom = normalizeDom(JSON.parse(raw));
  const slug = dom.slug;
  const pageName = slugToPageName(slug, dom.label);
  const total = dom.n;

  // Logische Module = DOM-Rows minus Amazon-System-Rows
  const logicalRows = dom.m.filter((row, idx) => !isAmazonSystemRow(row, idx, total));
  const modules = logicalRows.map((row, i) => buildModule(row, i + 1, total, slug));

  const totalImages = logicalRows.reduce((s, r) => s + (r.ic || 0), 0);
  const totalVideos = logicalRows.reduce((s, r) => s + (r.vc || 0), 0);

  return {
    _schemaVersion: 'v2-dom-probe',
    _generatedBy: 'rerun/build-blueprints-from-dom.mjs',
    _sourceDom: path.basename(domFile),
    _note: 'DOM-derived Blueprint für Workflow-Robustness-Rerun. Vision-Felder sind als screenshot_required markiert und in openQuestions gesammelt.',
    pageUrl: dom.url,
    pageName,
    pageLevel: pageLevelFromSlug(slug),
    pageType: pageTypeFromSlug(slug),
    archetype: 'screenshot_required',
    contentStats: {
      domModules: total,
      logicalModules: modules.length,
      totalImages,
      totalVideos,
      estimatedScrollLength: estimateScrollLength(dom.sh)
    },
    modules,
    pageAnalysis: {
      dominantPalette: [],
      tonalityVisual: 'screenshot_required',
      ctaStrategies: 'screenshot_required',
      contentDepth: `DOM zeigt ${modules.length} logische Module, ${totalImages} Bilder, ${totalVideos} Videos, ${dom.sh}px Scroll-Höhe.`,
      useForArchetype: 'screenshot_required',
      moduleClusters: 'screenshot_required'
    },
    openQuestions: [
      'Vision-Felder pro Tile (imageCategory, backgroundStyle, elementProportions, dominantColors) sind aus DOM nicht ableitbar, Screenshot-Analyse nötig.',
      'textOnImage.headline/subline/cta für alle Banner-Module erfordert OCR/Vision.',
      'structuralPattern und relationToNextModule pro Modul sind Vision-Felder.',
      'archetype, tonalityVisual, ctaStrategies, useForArchetype und moduleClusters sind Page-Level-Vision-Felder.',
      'designIntent aus DOM ist Heuristik und kann bei Screenshot-Review revidiert werden.'
    ]
  };
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(DOM_DIR).filter(f => f.endsWith('.json')).sort();
  const summary = [];
  for (const f of files) {
    const bp = buildBlueprint(path.join(DOM_DIR, f));
    const outPath = path.join(OUT_DIR, f.replace(/\.json$/, '_blueprint.json'));
    fs.writeFileSync(outPath, JSON.stringify(bp, null, 2));
    summary.push({
      file: f,
      logicalModules: bp.contentStats.logicalModules,
      domModules: bp.contentStats.domModules,
      totalImages: bp.contentStats.totalImages,
      totalVideos: bp.contentStats.totalVideos,
      scroll: bp.contentStats.estimatedScrollLength
    });
    console.log(`OK ${outPath}`);
  }
  console.log('\nSummary:');
  console.table(summary);
}

main();
