#!/usr/bin/env node
// ─── BATCH ENRICHMENT: Gemini Vision for all reference stores ───
//
// This script enriches all 23 reference store JSON files with Gemini Vision image analysis.
// It calls the /api/enrich-reference-store endpoint for each store, then merges the
// Gemini analyses into the existing JSON files.
//
// USAGE:
//   1. Make sure the dev server is running: npm run dev (or vercel dev)
//   2. Run: node scripts/enrich-all-stores.js
//
// The script will:
//   - Read each store JSON from data/reference-stores/
//   - Call the API to crawl the store and analyze images with Gemini
//   - Merge the Gemini analyses into the JSON file
//   - Save the updated JSON back to disk
//
// PREREQUISITES:
//   - GEMINI_API_KEY must be set in Vercel env variables (or .env for local dev)
//   - BRIGHTDATA_UNLOCKER_TOKEN must be set for store crawling
//   - Dev server running on localhost:3000 (or specify BASE_URL env var)

var fs = require('fs');
var path = require('path');

var BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
var DATA_DIR = path.join(__dirname, '..', 'data', 'reference-stores');

// Store definitions (from seedStores.js)
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

async function enrichStore(store) {
  console.log('  Calling API for ' + store.brand + '...');

  var resp = await fetch(BASE_URL + '/api/enrich-reference-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeUrl: store.url,
      brandName: store.brand,
      maxImages: 50,
    }),
  });

  if (!resp.ok) {
    var err = await resp.json().catch(function() { return { error: 'HTTP ' + resp.status }; });
    throw new Error(err.error || 'HTTP ' + resp.status);
  }

  return resp.json();
}

function mergeGeminiIntoJson(storeJson, geminiResult) {
  storeJson.geminiAnalyses = {
    analyzedAt: geminiResult.analyzedAt || new Date().toISOString(),
    imageCount: geminiResult.imageCount || 0,
    analyses: (geminiResult.geminiAnalyses || []).map(function(a) {
      return {
        url: a.url || '',
        summary: a.summary || '',
        imageCategory: a.imageCategory || 'unknown',
        dominantColors: a.dominantColors || [],
        textOnImage: a.textOnImage || '',
        elements: a.elements || [],
        brandingElements: a.brandingElements || '',
        designPatterns: a.designPatterns || [],
      };
    }),
  };

  // Aggregate data
  var allColors = [];
  var allPatterns = [];
  storeJson.geminiAnalyses.analyses.forEach(function(a) {
    (a.dominantColors || []).forEach(function(c) {
      if (allColors.indexOf(c) < 0) allColors.push(c);
    });
    (a.designPatterns || []).forEach(function(p) {
      if (allPatterns.indexOf(p) < 0) allPatterns.push(p);
    });
  });

  storeJson.geminiAnalyses.aggregated = {
    allDominantColors: allColors.slice(0, 10),
    allDesignPatterns: allPatterns,
  };

  return storeJson;
}

async function main() {
  console.log('=== GEMINI VISION ENRICHMENT FOR ALL REFERENCE STORES ===');
  console.log('API Base: ' + BASE_URL);
  console.log('Data Dir: ' + DATA_DIR);
  console.log('Stores: ' + STORES.length);
  console.log('');

  // Check if we can only process specific stores (via command line arg)
  var onlyStore = process.argv[2];
  var storesToProcess = onlyStore
    ? STORES.filter(function(s) { return s.file.indexOf(onlyStore) >= 0 || s.brand.toLowerCase().indexOf(onlyStore.toLowerCase()) >= 0; })
    : STORES;

  if (onlyStore) {
    console.log('Filtering to: ' + storesToProcess.map(function(s) { return s.brand; }).join(', '));
    console.log('');
  }

  var successCount = 0;
  var failCount = 0;

  for (var i = 0; i < storesToProcess.length; i++) {
    var store = storesToProcess[i];
    console.log('━━━ [' + (i + 1) + '/' + storesToProcess.length + '] ' + store.brand + ' ━━━');

    try {
      // Step 1: Call enrichment API
      var geminiResult = await enrichStore(store);
      console.log('  Images found: ' + geminiResult.totalImagesFound + ', analyzed: ' + geminiResult.imageCount);

      // Step 2: Read existing JSON
      var jsonPath = path.join(DATA_DIR, store.file);
      var storeJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

      // Step 3: Merge Gemini data
      storeJson = mergeGeminiIntoJson(storeJson, geminiResult);

      // Step 4: Save
      fs.writeFileSync(jsonPath, JSON.stringify(storeJson, null, 2) + '\n');
      console.log('  Saved to ' + store.file);
      successCount++;

    } catch (err) {
      console.log('  ERROR: ' + err.message);
      failCount++;
    }

    // Delay between stores
    if (i < storesToProcess.length - 1) {
      console.log('  Waiting 5s...');
      await new Promise(function(r) { setTimeout(r, 5000); });
    }

    console.log('');
  }

  console.log('=== DONE ===');
  console.log('Success: ' + successCount + '/' + storesToProcess.length);
  console.log('Failed: ' + failCount);
}

main().catch(function(err) {
  console.error('FATAL:', err);
  process.exit(1);
});
