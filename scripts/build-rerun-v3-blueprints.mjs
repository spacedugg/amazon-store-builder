// Fuse Gold analysis.json + dedicated blueprint files + Phase 1 DOM into
// v3-Schema-Blueprints pro Seite plus aggregierte analysis.json ohne
// storeAnalysis-Block. Output geht nach data/store-knowledge/rerun-v3/.
//
// Quellen pro Seite:
//   1. data/store-knowledge/natural-elements_analysis.json           (autoritativ fuer Modulstruktur)
//   2. data/store-knowledge/natural-elements_<slug>_blueprint.json   (falls vorhanden, reichere Tiles)
//   3. data/store-knowledge/rerun-v3/raw-dom/natural-elements_<slug>_dom.json (Phase 1)
//
// Ausgabe:
//   data/store-knowledge/rerun-v3/blueprints/natural-elements_<slug>.json
//   data/store-knowledge/rerun-v3/natural-elements_analysis.json
//
// Run: node scripts/build-rerun-v3-blueprints.mjs

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KNOWLEDGE = path.join(ROOT, 'data/store-knowledge');
const V3_DIR = path.join(KNOWLEDGE, 'rerun-v3');
const V3_BP = path.join(V3_DIR, 'blueprints');
const V3_RAW_DOM = path.join(V3_DIR, 'raw-dom');

// Seitenname → Slug (deckungsgleich mit raw-dom Dateinamen)
const PAGE_SLUGS = {
  'Startseite': 'startseite',
  'Immunsystem': 'immunsystem',
  'Vitamine': 'vitamine',
  'SoProtein Vegan': 'soprotein_vegan',
  'Ueber uns': 'ueber_uns',
  'Alle Produkte': 'alle_produkte',
  'unsere Neuheiten': 'neuheiten',
  'Produktselektor': 'produktselektor',
  'Geschenk-Sets': 'geschenk_sets',
  'Unsere Bestseller Empfehlungen': 'unsere_empfehlungen',
};

// Seitenname → (pageType, pageLevel)
const PAGE_META = {
  'Startseite': { pageType: 'startseite', pageLevel: 0 },
  'Immunsystem': { pageType: 'hub_category', pageLevel: 1 },
  'Vitamine': { pageType: 'hub_category', pageLevel: 1 },
  'SoProtein Vegan': { pageType: 'product_lines', pageLevel: 1 },
  'Ueber uns': { pageType: 'about', pageLevel: 1 },
  'Alle Produkte': { pageType: 'all_products', pageLevel: 1 },
  'unsere Neuheiten': { pageType: 'new_arrivals', pageLevel: 1 },
  'Produktselektor': { pageType: 'product_selector', pageLevel: 1 },
  'Geschenk-Sets': { pageType: 'gift_sets', pageLevel: 1 },
  'Unsere Bestseller Empfehlungen': { pageType: 'bestsellers', pageLevel: 1 },
};

// Seitenname → Pfad eines dedizierten Gold-Blueprint-Files, falls vorhanden
const DEDICATED_BP = {
  'Startseite': 'natural-elements_startseite_blueprint.json',
  'Immunsystem': 'natural-elements_immunsystem_blueprint.json',
  'Vitamine': 'natural-elements_vitamine_blueprint.json',
  'SoProtein Vegan': 'natural-elements_soprotein_blueprint.json',
  'Ueber uns': 'natural-elements_ueberuns_blueprint.json',
};

// layoutType → layoutShape (Paragraf 4 v3-Prompt)
const LAYOUT_TYPE_TO_SHAPE = {
  amazon_nav_header: 'chrome_or_separator',
  amazon_share_footer: 'chrome_or_separator',
  separator_invisible: 'chrome_or_separator',
  filter_accordion_collapsed: 'chrome_or_separator',
  hero_banner: 'full_width_banner',
  hero_banner_compact: 'full_width_banner',
  hero_banner_tall: 'full_width_banner',
  hero_video: 'full_width_banner',
  hero_video_split: 'split_two',
  hero_video_tall: 'full_width_banner',
  editorial_banner: 'full_width_banner',
  editorial_banner_large: 'full_width_banner',
  editorial_banner_tall: 'full_width_banner',
  editorial_banner_solid_color: 'full_width_banner',
  editorial_section_intro: 'full_width_banner',
  editorial_tile_pair: 'split_two',
  editorial_tile_quad: 'grid_four',
  product_showcase_video: 'full_width_banner',
  product_grid_featured: 'grid_eight_plus',
  product_grid_category: 'grid_eight_plus',
  product_grid_line: 'grid_eight_plus',
  product_grid_full_catalog: 'grid_eight_plus',
  product_grid_new_arrivals: 'grid_eight_plus',
  product_grid_bestsellers: 'grid_eight_plus',
  product_grid_filter_results: 'grid_eight_plus',
  subcategory_tile: 'full_width_banner',
  shoppable_interactive_image: 'interactive_hotspot',
  shoppable_interactive_image_set: 'grid_four',
  filter_banner: 'full_width_banner',
};

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

// Em-/En-Dash-Scrubber fuer alle von uns erzeugten Strings
function scrubDashes(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\u2014/g, ',').replace(/\u2013/g, ',');
}

function deepScrub(v) {
  if (typeof v === 'string') return scrubDashes(v);
  if (Array.isArray(v)) return v.map(deepScrub);
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = deepScrub(v[k]);
    return out;
  }
  return v;
}

function twoDigit(n) {
  return String(n).padStart(2, '0');
}

// Tile in v3-Schema heben
function liftTileToV3(goldTile, richTile, moduleCtx) {
  // goldTile aus analysis.json (schlank), richTile optional aus dediziertem Blueprint
  const t = goldTile || {};
  const r = richTile || {};

  // textOnImage als Objekt (Paragraf 7)
  const goldTxt = (t.textOnImage ?? r.textOnImage ?? '').toString();
  const ctaText = t.ctaText || r.ctaText || null;
  const hasText = !!goldTxt && goldTxt !== '';
  const origin = r.textOnImageContext?.origin
    || (hasText ? (r.backgroundStyle === 'amazon_default' ? 'layered_text' : 'baked_in') : 'none');
  const textType = r.textOnImageContext?.textType
    || (!hasText ? 'none' : (ctaText ? 'headline_cta' : 'headline'));

  const textOnImage = {
    visibleText: hasText ? goldTxt : null,
    textType,
    origin,
    headline: hasText ? goldTxt : null,
    subline: r.textOnImageContext?.subline || null,
    cta: ctaText || null,
    directionCues: r.textOnImageContext?.directionCues || null,
  };

  // Farbnamen aus Gold uebernehmen
  const dominantColors = Array.isArray(r.dominantColors) && r.dominantColors.length > 0
    ? r.dominantColors
    : (moduleCtx.fallbackColors || ['screenshot_required']);

  // elementProportions: aus Rich uebernehmen, sonst Heuristik pro imageCategory
  let elementProportions = r.elementProportions;
  if (!elementProportions) {
    const cat = t.imageCategory || 'creative';
    if (cat === 'product') {
      elementProportions = { product_photo: 70, solid_background: 20, text: 10 };
    } else if (cat === 'lifestyle') {
      elementProportions = { lifestyle_photo: 85, text: 10, cta_button: 5 };
    } else if (cat === 'text_image') {
      elementProportions = { text: 70, solid_background: 25, graphic_elements: 5 };
    } else if (cat === 'benefit') {
      elementProportions = { text: 50, icons: 30, solid_background: 20 };
    } else {
      // creative / creative_lifestyle_hybrid
      elementProportions = { photographic_background: 50, text: 30, graphic_elements: 20 };
    }
  }

  return {
    position: t.position || r.position || r.tileIndex || 1,
    imageCategory: t.imageCategory || r.imageCategory || 'creative',
    visualContent: r.visualContent || 'screenshot_required',
    elementProportions,
    textOnImage,
    ctaText: ctaText,
    linksTo: t.linksTo || r.linksTo || null,
    backgroundStyle: r.backgroundStyle || moduleCtx.backgroundStyle || 'amazon_default',
    backgroundDetail: r.backgroundDetail || null,
    dominantColors,
    dominantColorsHex: r.dominantColorsHex || null,
  };
}

function liftModuleToV3(slug, goldMod, richMod, domRow) {
  const layoutType = goldMod.layoutType || 'editorial_banner';
  const layoutShape = LAYOUT_TYPE_TO_SHAPE[layoutType] || 'full_width_banner';

  const goldTxt = goldMod.textOnImage || {};
  const moduleTextOnImage = {
    visibleText: goldTxt.visibleText || null,
    textType: goldTxt.textType || 'none',
    origin: goldTxt.origin || 'none',
    headline: goldTxt.visibleText || null,
    subline: null,
    cta: null,
    directionCues: null,
  };

  const tiles = [];
  const richTiles = (richMod && Array.isArray(richMod.tiles)) ? richMod.tiles : [];
  for (let i = 0; i < (goldMod.tiles || []).length; i++) {
    const goldTile = goldMod.tiles[i];
    const richTile = richTiles[i];
    tiles.push(liftTileToV3(goldTile, richTile, {
      backgroundStyle: goldMod.backgroundStyle,
      fallbackColors: richMod?.pageAnalysis?.dominantColors
    }));
  }

  return {
    position: goldMod.position,
    moduleId: `${slug}_mod_${twoDigit(goldMod.position)}`,
    moduleName: goldMod.moduleName,
    layoutType,
    layoutShape,
    tileCount: goldMod.tileCount || tiles.length,
    designIntent: goldMod.designIntent || 'editorial',
    designIntentDetail: richMod?.designRationale || null,
    structuralPattern: goldMod.structuralPattern || null,
    backgroundStyle: goldMod.backgroundStyle || 'amazon_default',
    backgroundDetail: richMod?.backgroundDetail || null,
    textOnImage: moduleTextOnImage,
    tiles,
    dom: {
      widgetClass: domRow?.widgetClass || null,
      visibleHeadings: domRow?.headlines || [],
      ctaLabels: domRow?.ctas || [],
      imageUrls: (domRow?.imgSample || []).map(x => x.src).filter(Boolean),
      videoCount: domRow?.videoCount || 0,
      domHeight: domRow?.height ?? null,
      domTop: domRow?.top ?? null,
    },
  };
}

function buildPageBlueprint(pageName, gold, rich, dom) {
  const slug = PAGE_SLUGS[pageName];
  const { pageType, pageLevel } = PAGE_META[pageName];

  const modules = [];
  for (let i = 0; i < gold.modules.length; i++) {
    const goldMod = gold.modules[i];
    const domRow = dom.modules[i];
    // Rich-Modul matchen: erst per Position, dann per Name
    let richMod = null;
    if (rich && Array.isArray(rich.modules)) {
      richMod = rich.modules.find(m => m.position === goldMod.position)
        || rich.modules.find(m => m.moduleName === goldMod.moduleName)
        || null;
    }
    modules.push(liftModuleToV3(slug, goldMod, richMod, domRow));
  }

  const totalImages = modules.reduce((n, m) => n + (m.dom.imageUrls?.length || 0), 0);
  const totalVideos = modules.reduce((n, m) => n + (m.dom.videoCount || 0), 0);

  // openQuestions: aus Rich-Blueprint + generisch fuer alle Module mit screenshot_required
  const openQuestions = [];
  if (rich?.openQuestions) openQuestions.push(...rich.openQuestions);
  modules.forEach(m => {
    m.tiles.forEach(t => {
      if (t.visualContent === 'screenshot_required') {
        openQuestions.push(`${m.moduleId} position=${t.position}: visualContent unbelegt, Phase-2-Vision-Nachfassen noetig`);
      }
      if (Array.isArray(t.dominantColors) && t.dominantColors[0] === 'screenshot_required') {
        openQuestions.push(`${m.moduleId} position=${t.position}: dominantColors unbelegt, Phase-2-Vision-Nachfassen noetig`);
      }
    });
  });

  // Startseite-Hero-Drift (Vision-Beobachtung 2026-04-21)
  if (pageName === 'Startseite') {
    openQuestions.push(
      "Vision-Beobachtung 2026-04-21: Live-Store zeigt im Hero-Bereich den Claim 'Neue Produkte? OH YEAH!' mit CTA 'NEUHEITEN ENTDECKEN'. Gold fuehrt hier 'Nahrungsergaenzung neu gedacht:'. Inhaltlicher Drift seit Gold-Capture, Struktur (hero_video_split) unveraendert. textOnImage.visibleText im Modul position=2 sollte per Phase-2-Vision-Nachlauf aktualisiert werden."
    );
  }

  return {
    pageUrl: gold.url || `https://www.amazon.de/stores/page/${gold.pageId}`,
    pageName,
    pageId: gold.pageId,
    pageLevel,
    pageType,
    scrollHeight: dom.scrollHeight ?? gold.scrollHeight ?? null,
    contentStats: {
      domModules: dom.count ?? dom.modules.length,
      logicalModules: modules.length,
      totalImages,
      totalVideos,
    },
    heroBanner: gold.heroBanner || null,
    modules,
    pageAnalysis: rich?.pageAnalysis || {
      dominantPalette: [],
      tonalityVisual: 'screenshot_required',
      ctaStrategies: 'screenshot_required',
      contentDepth: 'screenshot_required',
      useForArchetype: 'screenshot_required',
      moduleClusters: [],
    },
    openQuestions,
  };
}

function main() {
  const goldAnalysis = readJson(path.join(KNOWLEDGE, 'natural-elements_analysis.json'));

  const aggregated = {
    storeMetadata: {
      storeName: goldAnalysis.storeMetadata?.storeName || 'natural elements',
      storeId: '3955CCD4-902C-4679-9265-DEC4FCBAA8C8',
      rootUrl: goldAnalysis.storeUrl || 'https://www.amazon.de/stores/page/3955CCD4-902C-4679-9265-DEC4FCBAA8C8',
      marketplace: 'amazon.de',
    },
    brandName: goldAnalysis.brandName || 'natural elements',
    storeUrl: goldAnalysis.storeUrl,
    analyzedAt: new Date().toISOString(),
    methodology: 'V4-v3-Blueprint-Phase-1-DOM-plus-Phase-2-Vision-Gold-fused',
    v3SchemaNote: 'Dreiphasig: Phase 1 DOM via scripts/extract-page-dom.js (aktuelle Captures 2026-04-21), Phase 2 Vision durch Gold-Blueprint-Fusion plus gezielte Vision-Nachpruefung fuer Startseite-Hero. Phase 3 storeAnalysis ist hier explizit weggelassen (separater Pass).',
    pages: [],
    openQuestions: [
      'Vision-Pass war in dieser Rerun-Session eine Gold-Fusion plus gezielte Live-Nachpruefung Startseite. Ein echter Full-Vision-Rerun jeder Seite bleibt Aufgabe fuer den 19-Store-Rollout.',
      'Screenshots konnten nicht archiviert werden, da das Chrome-MCP save_to_disk keinen benutzbaren Dateisystempfad zurueckgibt. Siehe NE_V3_RERUN_REPORT.md Abschnitt Workflow-Bruchstellen.'
    ],
  };

  for (const pageName of Object.keys(PAGE_SLUGS)) {
    const slug = PAGE_SLUGS[pageName];
    const gold = goldAnalysis.pages.find(p => p.pageName === pageName);
    if (!gold) {
      console.warn(`[skip] Keine Gold-Seite fuer ${pageName}`);
      continue;
    }
    const dom = readJson(path.join(V3_RAW_DOM, `natural-elements_${slug}_dom.json`));
    let rich = null;
    const richFile = DEDICATED_BP[pageName];
    if (richFile) {
      try {
        rich = readJson(path.join(KNOWLEDGE, richFile));
      } catch (e) {
        console.warn(`[warn] Dediziertes Blueprint fehlt fuer ${pageName}: ${richFile}`);
      }
    }
    const blueprint = buildPageBlueprint(pageName, gold, rich, dom);
    const scrubbed = deepScrub(blueprint);

    // Einzel-Blueprint schreiben
    writeJson(path.join(V3_BP, `natural-elements_${slug}.json`), scrubbed);

    // Aggregat aufnehmen (ohne heroBanner + pageAnalysis Verdopplung)
    aggregated.pages.push({
      pageName: scrubbed.pageName,
      pageId: scrubbed.pageId,
      pageLevel: scrubbed.pageLevel,
      pageType: scrubbed.pageType,
      pageUrl: scrubbed.pageUrl,
      scrollHeight: scrubbed.scrollHeight,
      contentStats: scrubbed.contentStats,
      heroBanner: scrubbed.heroBanner,
      modules: scrubbed.modules,
      pageAnalysis: scrubbed.pageAnalysis,
      openQuestions: scrubbed.openQuestions,
    });
    console.log(`[ok] ${pageName}  modules=${scrubbed.modules.length}  tiles=${scrubbed.modules.reduce((n,m)=>n+m.tiles.length,0)}`);
  }

  const aggScrubbed = deepScrub(aggregated);
  writeJson(path.join(V3_DIR, 'natural-elements_analysis.json'), aggScrubbed);
  console.log(`[ok] Aggregat geschrieben nach ${path.join(V3_DIR, 'natural-elements_analysis.json')}`);
}

main();
