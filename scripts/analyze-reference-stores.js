#!/usr/bin/env node
// ─── PHASE 0: Complete Reference Store Analysis ───
//
// This script performs the full Phase 0 analysis of all 23 reference stores:
//   Step 0.1: Crawl ALL pages (not just homepage) via the enrich API
//   Step 0.2: Aggregate module/layout/tile statistics
//   Step 0.3: Analyze module relationships and sequences
//
// PREREQUISITES:
//   1. Dev server running: npm run dev  (or: npx vercel dev)
//   2. Environment variables set:
//      - GEMINI_API_KEY (for Gemini Vision image analysis)
//      - BRIGHTDATA_UNLOCKER_TOKEN (for crawling Amazon store pages)
//   3. Stable internet connection (crawls ~200+ pages)
//
// USAGE:
//   node scripts/analyze-reference-stores.js
//
// OPTIONS (env vars):
//   BASE_URL=http://localhost:3000   (default)
//   SKIP_CRAWL=1                     (skip crawling, only re-analyze existing data)
//   ONLY_STORE=snocks                (process only one store, by filename without .json)
//   MAX_STORES=5                     (process first N stores only)
//
// OUTPUT:
//   - Updates each data/reference-stores/{store}.json with full page data
//   - Creates data/reference-stores/_analysis.json with aggregated patterns
//   - Logs progress to console

var fs = require('fs');
var path = require('path');

var BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
var DATA_DIR = path.join(__dirname, '..', 'data', 'reference-stores');
var SKIP_CRAWL = process.env.SKIP_CRAWL === '1';
var ONLY_STORE = process.env.ONLY_STORE || '';
var MAX_STORES = parseInt(process.env.MAX_STORES, 10) || 999;

// ─── STORE DEFINITIONS ───
var STORES = [
  { file: 'snocks.json', url: 'https://www.amazon.de/stores/SNOCKS/page/C0392661-40E4-498F-992D-2FFEB9086ABB', brand: 'SNOCKS' },
  { file: 'the-north-face.json', url: 'https://www.amazon.de/stores/THENORTHFACE/page/91172724-C342-482B-A300-564D9EA5E09F', brand: 'The North Face' },
  { file: 'esn.json', url: 'https://www.amazon.de/stores/ESN/page/F5F8CAD5-7990-44CF-9F5B-61DFFF5E8581', brand: 'ESN' },
  { file: 'ag1.json', url: 'https://www.amazon.de/stores/AG1/page/E676C84A-8A86-4F92-B978-3343F367DD0C', brand: 'AG1' },
  { file: 'bears-with-benefits.json', url: 'https://www.amazon.de/stores/BearswithBenefits/page/AFC77FAF-F173-4A4E-A7DF-8779F7E16E97', brand: 'Bears with Benefits' },
  { file: 'more-nutrition.json', url: 'https://www.amazon.de/stores/page/7AD425C6-C3C5-402D-A69D-D6201F98F888', brand: 'MORE Nutrition' },
  { file: 'hansegruen.json', url: 'https://www.amazon.de/stores/page/BC9A9642-4612-460E-81B4-985E9AF6A7D2', brand: 'Hansegruen' },
  { file: 'nespresso.json', url: 'https://www.amazon.de/stores/page/2429E3F3-8BFA-466A-9185-35FB47867B06', brand: 'Nespresso' },
  { file: 'holy-energy.json', url: 'https://www.amazon.de/stores/HOLYEnergy/page/7913E121-CB43-4349-A8D2-9F0843B226E4', brand: 'HOLY Energy' },
  { file: 'kaercher.json', url: 'https://www.amazon.de/stores/Kärcher/page/EFE3653A-1163-432C-A85B-0486A31C0E3D', brand: 'Kaercher' },
  { file: 'blackroll.json', url: 'https://www.amazon.de/stores/page/870649DE-4F7E-421F-B141-C4C47864D539', brand: 'BLACKROLL' },
  { file: 'manscaped.json', url: 'https://www.amazon.de/stores/page/44908195-3880-47D6-9EC0-D2A1543EB718', brand: 'Manscaped' },
  { file: 'desktronic.json', url: 'https://www.amazon.de/stores/Desktronic/page/1A862649-6CEA-4E30-855F-0C27A1F99A6C', brand: 'Desktronic' },
  { file: 'cloudpillo.json', url: 'https://www.amazon.de/stores/Cloudpillo/page/741141B6-87D5-44F9-BE63-71B55CD51198', brand: 'Cloudpillo' },
  { file: 'twentythree.json', url: 'https://www.amazon.de/stores/twentythree/page/0E8D9A31-200C-4EC5-BC94-CBBC023B28A4', brand: 'twentythree' },
  { file: 'bedsure.json', url: 'https://www.amazon.de/stores/page/7DC5A9F8-2A3D-426B-B2F2-F819AE825B1F', brand: 'Bedsure' },
  { file: 'gritin.json', url: 'https://www.amazon.de/stores/page/1758941C-AE87-4628-AB45-62C0A2BDB75C', brand: 'Gritin' },
  { file: 'feandrea.json', url: 'https://www.amazon.de/stores/page/FB4FA857-CD07-4E92-A32C-CF0CD556ACF6', brand: 'Feandrea' },
  { file: 'trixie.json', url: 'https://www.amazon.de/stores/page/30552E59-AC22-47B1-BBBB-AEA9225BD614', brand: 'TRIXIE' },
  { file: 'nightcat.json', url: 'https://www.amazon.de/stores/page/CC609240-DCC5-47C5-A171-3B973268CD34', brand: 'Night Cat' },
  { file: 'nucompany.json', url: 'https://www.amazon.de/stores/thenucompany/page/A096FF51-79D5-440D-8789-6255E9DFE87D', brand: 'the nu company' },
  { file: 'klosterkitchen.json', url: 'https://www.amazon.de/stores/page/34D4A812-9A68-4602-A6A0-30565D399620', brand: 'Kloster Kitchen' },
  { file: 'masterchef.json', url: 'https://www.amazon.de/stores/page/4E8E4B73-1DA5-45E1-8EFA-5EB4A3A758F6', brand: 'MasterChef' },
];

// ─── STEP 0.1: CRAWL + ENRICH EACH STORE ───
async function enrichStore(store) {
  var filePath = path.join(DATA_DIR, store.file);
  var existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  console.log('  Crawling ' + store.brand + ' (' + store.url.slice(0, 60) + '...)');

  try {
    var resp = await fetch(BASE_URL + '/api/enrich-reference-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeUrl: store.url,
        brandName: store.brand,
        maxImagesPerPage: 30,
      }),
    });

    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error('API returned ' + resp.status + ': ' + errText.slice(0, 200));
    }

    var enrichment = await resp.json();

    // Merge enrichment into existing data
    existing.geminiVisionV3 = {
      analyzedAt: enrichment.analyzedAt,
      brandName: enrichment.brandName,
      storeUrl: enrichment.storeUrl,
      pagesAnalyzed: enrichment.pagesAnalyzed,
      subpagesFound: enrichment.subpagesFound,
      subpageNames: enrichment.subpageNames,
      storeTotals: enrichment.storeTotals,
      pages: enrichment.pages,
    };

    // Update page count
    existing.navigation = existing.navigation || {};
    existing.navigation.pagesAnalyzed = enrichment.pagesAnalyzed;

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    console.log('  ✓ ' + store.brand + ': ' + enrichment.pagesAnalyzed + ' pages, ' +
      enrichment.storeTotals.totalImages + ' images, ' +
      enrichment.storeTotals.totalSections + ' sections');

    return { brand: store.brand, status: 'ok', pages: enrichment.pagesAnalyzed, images: enrichment.storeTotals.totalImages };
  } catch (err) {
    console.log('  ✗ ' + store.brand + ': ' + err.message);
    return { brand: store.brand, status: 'error', error: err.message };
  }
}

// ─── STEP 0.2 + 0.3: AGGREGATE ANALYSIS ───
function aggregateAnalysis() {
  console.log('\n═══ STEP 0.2 + 0.3: Aggregating patterns across all stores ═══\n');

  var allModules = [];         // every module from every page of every store
  var layoutCounts = {};       // layout -> count
  var imageCatCounts = {};     // imageCategory -> count
  var tileSizeCounts = {};     // tileSize -> count
  var sectionTypeCounts = {};  // section type -> count
  var pageTypeCounts = { homepage: 0, category: 0, subpage: 0, other: 0 };
  var modulePairs = {};        // "layoutA -> layoutB" -> count
  var moduleTriples = {};      // "A -> B -> C" -> count
  var homepagePatterns = [];   // layout sequences for homepages
  var categoryPatterns = [];   // layout sequences for category pages
  var storeStats = [];

  var files = fs.readdirSync(DATA_DIR).filter(function(f) {
    return f.endsWith('.json') && !f.startsWith('_');
  });

  files.forEach(function(file) {
    var store = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    var storeStat = {
      brand: store.brandName,
      category: store.category,
      quality: store.qualityScore,
      pagesTotal: 0,
      modulesTotal: 0,
      tilesTotal: 0,
      layoutDistribution: {},
      imageCatDistribution: {},
    };

    // Use manually analyzed pages data
    var pages = store.pages || [];
    storeStat.pagesTotal = pages.length;

    pages.forEach(function(pg) {
      // Classify page type
      var pgName = (pg.name || '').toLowerCase();
      if (pgName === 'startseite' || pgName === 'homepage' || pgName === 'home') {
        pageTypeCounts.homepage++;
      } else if (pg.parent || pg.parentId) {
        pageTypeCounts.subpage++;
      } else {
        pageTypeCounts.category++;
      }

      var modules = pg.modules || [];
      storeStat.modulesTotal += modules.length;

      // Collect layout sequence for this page
      var layoutSequence = [];

      modules.forEach(function(mod, mi) {
        var lid = mod.layoutId || 'unknown';
        layoutCounts[lid] = (layoutCounts[lid] || 0) + 1;
        storeStat.layoutDistribution[lid] = (storeStat.layoutDistribution[lid] || 0) + 1;
        layoutSequence.push(lid);

        var sType = mod.type || 'unknown';
        sectionTypeCounts[sType] = (sectionTypeCounts[sType] || 0) + 1;

        // Module pairs (adjacent modules)
        if (mi > 0) {
          var prevLid = modules[mi - 1].layoutId || 'unknown';
          var pairKey = prevLid + ' → ' + lid;
          modulePairs[pairKey] = (modulePairs[pairKey] || 0) + 1;
        }

        // Module triples
        if (mi >= 2) {
          var ppLid = modules[mi - 2].layoutId || 'unknown';
          var pLid = modules[mi - 1].layoutId || 'unknown';
          var tripleKey = ppLid + ' → ' + pLid + ' → ' + lid;
          moduleTriples[tripleKey] = (moduleTriples[tripleKey] || 0) + 1;
        }

        // Tiles
        var tiles = mod.tiles || [];
        storeStat.tilesTotal += tiles.length;
        tiles.forEach(function(tile) {
          var cat = tile.imageCategory || 'unknown';
          imageCatCounts[cat] = (imageCatCounts[cat] || 0) + 1;
          storeStat.imageCatDistribution[cat] = (storeStat.imageCatDistribution[cat] || 0) + 1;

          var sz = tile.tileSize || 'unknown';
          tileSizeCounts[sz] = (tileSizeCounts[sz] || 0) + 1;
        });

        allModules.push({
          brand: store.brandName,
          quality: store.qualityScore,
          page: pg.name,
          position: mi,
          layoutId: lid,
          type: sType,
          tileCount: (mod.tiles || []).length,
          visualConnection: mod.visualConnection || '',
          designRationale: mod.designRationale || '',
          imageCategories: (mod.tiles || []).map(function(t) { return t.imageCategory || 'unknown'; }),
        });
      });

      // Store page-level patterns
      if (pgName === 'startseite' || pgName === 'homepage' || pgName === 'home') {
        homepagePatterns.push({ brand: store.brandName, quality: store.qualityScore, sequence: layoutSequence });
      } else {
        categoryPatterns.push({ brand: store.brandName, quality: store.qualityScore, page: pg.name, sequence: layoutSequence });
      }
    });

    storeStats.push(storeStat);
  });

  // Sort pairs and triples by frequency
  var topPairs = Object.entries(modulePairs)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 30)
    .map(function(e) { return { pair: e[0], count: e[1] }; });

  var topTriples = Object.entries(moduleTriples)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 20)
    .map(function(e) { return { sequence: e[0], count: e[1] }; });

  // Modules with designRationale (for learning)
  var modulesWithRationale = allModules.filter(function(m) { return m.designRationale; });

  var analysis = {
    analyzedAt: new Date().toISOString(),
    summary: {
      totalStores: files.length,
      totalPages: Object.values(pageTypeCounts).reduce(function(a, b) { return a + b; }, 0),
      totalModules: allModules.length,
      pageTypes: pageTypeCounts,
    },
    layoutDistribution: Object.entries(layoutCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(e) { return { layout: e[0], count: e[1], percent: Math.round(100 * e[1] / allModules.length) }; }),
    imageCategoryDistribution: Object.entries(imageCatCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(e) { return { category: e[0], count: e[1] }; }),
    tileSizeDistribution: Object.entries(tileSizeCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(e) { return { size: e[0], count: e[1] }; }),
    sectionTypeDistribution: Object.entries(sectionTypeCounts)
      .sort(function(a, b) { return b[1] - a[1]; })
      .map(function(e) { return { type: e[0], count: e[1] }; }),
    modulePairs: topPairs,
    moduleTriples: topTriples,
    homepagePatterns: homepagePatterns,
    categoryPagePatterns: categoryPatterns.slice(0, 50),
    modulesWithDesignRationale: modulesWithRationale.length,
    modulesWithVisualConnection: allModules.filter(function(m) { return m.visualConnection; }).length,
    storeStats: storeStats,
  };

  var outputPath = path.join(DATA_DIR, '_analysis.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
  console.log('Analysis written to: ' + outputPath);

  // Print summary
  console.log('\n═══ RESULTS ═══');
  console.log('Stores: ' + analysis.summary.totalStores);
  console.log('Pages: ' + analysis.summary.totalPages + ' (' + JSON.stringify(pageTypeCounts) + ')');
  console.log('Modules: ' + analysis.summary.totalModules);
  console.log('\nLayout Distribution:');
  analysis.layoutDistribution.forEach(function(l) {
    console.log('  ' + l.layout + ': ' + l.count + ' (' + l.percent + '%)');
  });
  console.log('\nTop Module Pairs (adjacent layouts):');
  topPairs.slice(0, 10).forEach(function(p) {
    console.log('  ' + p.pair + ': ' + p.count + 'x');
  });
  console.log('\nTop Module Triples:');
  topTriples.slice(0, 10).forEach(function(t) {
    console.log('  ' + t.sequence + ': ' + t.count + 'x');
  });
  console.log('\nModules with designRationale: ' + modulesWithRationale.length + '/' + allModules.length);
  console.log('Modules with visualConnection: ' + allModules.filter(function(m) { return m.visualConnection; }).length + '/' + allModules.length);

  return analysis;
}

// ─── MAIN ───
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Phase 0: Reference Store Analysis');
  console.log('  ' + STORES.length + ' stores to analyze');
  console.log('═══════════════════════════════════════════════════\n');

  // Filter stores
  var storesToProcess = STORES;
  if (ONLY_STORE) {
    storesToProcess = STORES.filter(function(s) { return s.file.replace('.json', '') === ONLY_STORE; });
    if (storesToProcess.length === 0) {
      console.log('Store not found: ' + ONLY_STORE);
      process.exit(1);
    }
  }
  storesToProcess = storesToProcess.slice(0, MAX_STORES);

  // ─── STEP 0.1: Crawl + Enrich ───
  if (!SKIP_CRAWL) {
    console.log('═══ STEP 0.1: Crawling all store pages via Gemini Vision ═══\n');
    console.log('Make sure your dev server is running at: ' + BASE_URL);
    console.log('Required env vars: GEMINI_API_KEY, BRIGHTDATA_UNLOCKER_TOKEN\n');

    var results = [];
    for (var i = 0; i < storesToProcess.length; i++) {
      console.log('[' + (i + 1) + '/' + storesToProcess.length + '] ' + storesToProcess[i].brand);
      var result = await enrichStore(storesToProcess[i]);
      results.push(result);

      // Wait between stores to avoid rate limiting
      if (i < storesToProcess.length - 1) {
        console.log('  (waiting 5s before next store...)\n');
        await new Promise(function(r) { setTimeout(r, 5000); });
      }
    }

    // Save crawl log
    var logPath = path.join(DATA_DIR, '_crawl-log.json');
    fs.writeFileSync(logPath, JSON.stringify({
      runAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      results: results,
    }, null, 2));
    console.log('\nCrawl log saved to: ' + logPath);

    var okCount = results.filter(function(r) { return r.status === 'ok'; }).length;
    var errCount = results.filter(function(r) { return r.status === 'error'; }).length;
    console.log('\nCrawl complete: ' + okCount + ' OK, ' + errCount + ' errors');
  } else {
    console.log('═══ SKIPPING CRAWL (SKIP_CRAWL=1) ═══\n');
  }

  // ─── STEP 0.2 + 0.3: Aggregate Analysis ───
  var analysis = aggregateAnalysis();

  console.log('\n═══ DONE ═══');
  console.log('Results saved to data/reference-stores/_analysis.json');
  console.log('\nNext steps:');
  console.log('1. Review _analysis.json for patterns');
  console.log('2. Check which stores failed crawling and retry individually');
  console.log('3. Use the patterns to improve generation prompts');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
