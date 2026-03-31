// ─── REFERENCE STORE CRAWLING & ANALYSIS ORCHESTRATION ───
// Handles the complete flow: crawl pages → parse HTML → analyze images → AI analysis
// Used for both per-project references and knowledge base building.

import { crawlBrandStorePage, analyzeStoreImages } from './api';
import { parseBrandStoreHTML, combineStorePages } from './brandStoreParser';

var DELAY_BETWEEN_PAGES = 2000; // 2s between subpage crawls to avoid rate limiting
var MAX_SUBPAGES = 15; // Safety limit per store
var MAX_IMAGES_FOR_ANALYSIS = 20; // Max images to send to Gemini per store

function delay(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

// ─── CRAWL & PARSE A SINGLE BRAND STORE (ALL PAGES) ───
export async function crawlAndParseStore(storeUrl, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Step 1: Crawl the main page
  log('Crawling main page: ' + shortenUrl(storeUrl));
  var mainResult = await crawlBrandStorePage(storeUrl);
  var mainPage = parseBrandStoreHTML(mainResult.html, storeUrl);
  log('Found ' + mainPage.navigation.length + ' subpages, ' + mainPage.images.length + ' images, ' + mainPage.modules.length + ' modules');

  if (cancelRef && cancelRef.current) return combineStorePages([mainPage]);

  var allPages = [mainPage];

  // Step 2: Crawl subpages
  var subpages = mainPage.navigation.filter(function(nav) {
    // Skip the current page (homepage)
    return nav.pageId && nav.url !== storeUrl && nav.url.indexOf(extractPageId(storeUrl)) < 0;
  }).slice(0, MAX_SUBPAGES);

  for (var i = 0; i < subpages.length; i++) {
    if (cancelRef && cancelRef.current) break;

    var sub = subpages[i];
    log('Crawling subpage ' + (i + 1) + '/' + subpages.length + ': ' + (sub.name || sub.pageId.slice(0, 8)));

    try {
      await delay(DELAY_BETWEEN_PAGES);
      if (cancelRef && cancelRef.current) break;
      var subResult = await crawlBrandStorePage(sub.url);
      var subPage = parseBrandStoreHTML(subResult.html, sub.url);
      subPage.pageName = sub.name;
      allPages.push(subPage);
      log('  → ' + subPage.modules.length + ' modules, ' + subPage.images.length + ' images');
    } catch (err) {
      log('  → Failed: ' + err.message);
    }
  }

  // Step 3: Combine all pages
  var combined = combineStorePages(allPages);
  log('Store analysis complete: ' + combined.pageCount + ' pages, ' + combined.summary.totalImages + ' images, ' + combined.summary.totalModules + ' modules');

  return combined;
}

// ─── CRAWL MULTIPLE REFERENCE STORES ───
export async function crawlMultipleStores(urls, onProgress) {
  var log = onProgress || function() {};
  var stores = [];

  for (var i = 0; i < urls.length; i++) {
    log('');
    log('━━━ Reference Store ' + (i + 1) + '/' + urls.length + ' ━━━');
    try {
      var store = await crawlAndParseStore(urls[i], log);
      stores.push(store);
    } catch (err) {
      log('ERROR crawling store: ' + err.message);
      // Continue with other stores
    }
  }

  return stores;
}

// ─── ANALYZE STORE IMAGES WITH GEMINI ───
export async function analyzeStoreImagesWithGemini(store, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Select the most relevant images (only store-designed images with al- pattern)
  var images = store.allImages
    .filter(function(img) { return img.url && img.url.indexOf('/images/S/al-') >= 0; })
    .slice(0, MAX_IMAGES_FOR_ANALYSIS)
    .map(function(img) {
      return {
        url: img.url,
        context: 'Brand: ' + store.brandName + ', Page: ' + (img.page || 'homepage'),
      };
    });

  if (images.length === 0) {
    log('No store-designed images found for Gemini analysis');
    return [];
  }

  log('Analyzing ' + images.length + ' images with Gemini Vision...');

  // Send in batches of 5
  var batchSize = 5;
  var allResults = [];

  for (var i = 0; i < images.length; i += batchSize) {
    if (cancelRef && cancelRef.current) break;

    var batch = images.slice(i, i + batchSize);
    log('  Image batch ' + (Math.floor(i / batchSize) + 1) + '/' + Math.ceil(images.length / batchSize) + '...');

    try {
      var result = await analyzeStoreImages(batch);
      allResults = allResults.concat(result.analyses || []);
    } catch (err) {
      log('  → Batch failed: ' + err.message);
    }
  }

  log('Image analysis complete: ' + allResults.length + ' images analyzed');
  return allResults;
}

// ─── FORMAT REFERENCE DATA FOR AI PROMPTS ───
export function formatReferenceStoreContext(stores, imageAnalyses) {
  if (!stores || stores.length === 0) return '';

  var parts = [];
  parts.push('=== REFERENCE BRAND STORE ANALYSIS (from ' + stores.length + ' real Amazon Brand Stores) ===');
  parts.push('Use these as INSPIRATION for structure, flow, and visual approach. Do NOT copy — create an ORIGINAL concept.');
  parts.push('');

  for (var i = 0; i < stores.length; i++) {
    var store = stores[i];
    parts.push('--- Reference Store ' + (i + 1) + ': ' + store.brandName + ' ---');
    parts.push('Pages: ' + store.pageCount + ' | Images: ' + store.summary.totalImages + ' | Modules: ' + store.summary.totalModules);

    // Module patterns
    parts.push('Module types used: ' + JSON.stringify(store.summary.moduleTypes));
    parts.push('Layout patterns: ' + JSON.stringify(store.summary.layoutTypes));

    // Page structure
    for (var j = 0; j < store.pages.length && j < 5; j++) {
      var page = store.pages[j];
      var moduleTypes = page.modules.map(function(m) { return m.type; });
      parts.push('  Page "' + (page.brandName || 'Subpage ' + (j + 1)) + '": ' + moduleTypes.join(' → '));
    }

    // Key texts (first few headings)
    var headings = store.allTexts.filter(function(t) { return t.type === 'heading'; }).slice(0, 5);
    if (headings.length > 0) {
      parts.push('Key headings: ' + headings.map(function(t) { return '"' + t.text + '"'; }).join(' | '));
    }

    parts.push('');
  }

  // Image analysis summary
  if (imageAnalyses && imageAnalyses.length > 0) {
    parts.push('--- Visual Style Analysis (from Gemini Vision) ---');
    for (var k = 0; k < imageAnalyses.length && k < 10; k++) {
      var analysis = imageAnalyses[k];
      if (analysis.summary) {
        parts.push('• ' + analysis.summary);
      }
    }
    parts.push('');
  }

  parts.push('=== END REFERENCE STORE ANALYSIS ===');
  parts.push('');
  parts.push('INSTRUCTIONS: Use the patterns above as guidance for section flow, module variety, and visual approach.');
  parts.push('Adapt to the current brand\'s products, tone, and category — do not replicate.');
  parts.push('');

  return parts.join('\n');
}

// ─── KNOWLEDGE BASE: Save analyzed store for future use ───
export async function saveToKnowledgeBase(store, imageAnalyses, claudeAnalysis, category, qualityScore) {
  var resp = await fetch('/api/reference-stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: store.brandName,
      storeUrl: store.storeUrl,
      marketplace: extractMarketplace(store.storeUrl),
      category: category || 'generic',
      pageCount: store.pageCount,
      imageCount: store.summary.totalImages,
      parsedData: store,
      imageAnalyses: imageAnalyses || [],
      claudeAnalysis: claudeAnalysis || null,
      qualityScore: qualityScore || 3,
    }),
  });
  if (!resp.ok) throw new Error('Failed to save to knowledge base');
  return resp.json();
}

// ─── KNOWLEDGE BASE: Load reference data for a category ───
export async function loadKnowledgeBaseForCategory(category) {
  var resp = await fetch('/api/reference-stores?forCategory=' + encodeURIComponent(category || 'generic'));
  if (!resp.ok) return [];
  var data = await resp.json();
  return data.analyses || [];
}

// ─── KNOWLEDGE BASE: List all reference stores ───
export async function listKnowledgeBaseStores(category) {
  var url = '/api/reference-stores';
  if (category && category !== 'all') url += '?category=' + encodeURIComponent(category);
  var resp = await fetch(url);
  if (!resp.ok) return [];
  var data = await resp.json();
  return data.stores || [];
}

// ─── KNOWLEDGE BASE: Delete a reference store ───
export async function deleteFromKnowledgeBase(id) {
  var resp = await fetch('/api/reference-stores?id=' + encodeURIComponent(id), { method: 'DELETE' });
  return resp.ok;
}

// ─── FULL PIPELINE: Crawl, analyze, and save to knowledge base ───
export async function addStoreToKnowledgeBase(storeUrl, category, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Step 1: Crawl & parse
  log('Step 1/3: Crawling store...');
  var store = await crawlAndParseStore(storeUrl, log, cancelRef);
  if (cancelRef && cancelRef.current) return null;

  // Step 2: Gemini image analysis
  log('Step 2/3: Analyzing images...');
  var imageAnalyses = [];
  try {
    imageAnalyses = await analyzeStoreImagesWithGemini(store, log, cancelRef);
  } catch (e) { log('Image analysis skipped: ' + e.message); }
  if (cancelRef && cancelRef.current) return null;

  // Step 3: Save to database
  log('Step 3/3: Saving to knowledge base...');
  var result = await saveToKnowledgeBase(store, imageAnalyses, null, category, 3);
  log('Saved! ID: ' + result.id);

  return { id: result.id, store: store, imageAnalyses: imageAnalyses };
}

// ─── FORMAT KNOWLEDGE BASE DATA FOR AI PROMPTS ───
export function formatKnowledgeBaseContext(kbAnalyses) {
  if (!kbAnalyses || kbAnalyses.length === 0) return '';

  var parts = [];
  parts.push('=== KNOWLEDGE BASE: Best practices from ' + kbAnalyses.length + ' analyzed Brand Stores ===');

  for (var i = 0; i < kbAnalyses.length; i++) {
    var entry = kbAnalyses[i];
    if (entry.analysis) {
      parts.push('• ' + entry.brandName + ' (' + entry.category + '): ' + (typeof entry.analysis === 'string' ? entry.analysis : JSON.stringify(entry.analysis).slice(0, 500)));
    }
  }

  parts.push('=== END KNOWLEDGE BASE ===');
  parts.push('');
  return parts.join('\n');
}

// ─── HELPERS ───
function extractMarketplace(url) {
  if (!url) return 'de';
  if (url.indexOf('amazon.com') >= 0) return 'com';
  if (url.indexOf('amazon.co.uk') >= 0) return 'co.uk';
  if (url.indexOf('amazon.fr') >= 0) return 'fr';
  if (url.indexOf('amazon.de') >= 0) return 'de';
  return 'de';
}
function extractPageId(url) {
  var match = (url || '').match(/page\/([A-F0-9-]{36})/i);
  return match ? match[1] : '';
}

function shortenUrl(url) {
  try {
    var u = new URL(url);
    return u.hostname + u.pathname.slice(0, 60) + (u.pathname.length > 60 ? '...' : '');
  } catch (e) { return url.slice(0, 80); }
}
