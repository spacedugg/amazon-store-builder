// ─── GEMINI VISION ENRICHMENT FOR REFERENCE STORES ───
// Crawls a reference store + all subpages, extracts images from var config blocks,
// analyzes with Gemini Vision, returns enriched image analysis data.
//
// POST /api/enrich-reference-store
// Body: { storeUrl: "https://...", brandName: "SNOCKS", maxImages: 50 }
// Returns: { brandName, imageCount, pagesAnalyzed, geminiAnalyses: [...] }

var GEMINI_KEY = process.env.GEMINI_API_KEY;
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
var UNLOCKER_TOKEN = process.env.BRIGHTDATA_UNLOCKER_TOKEN;
var UNLOCKER_ZONE = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var body = req.body || {};
  var storeUrl = body.storeUrl;
  var brandName = body.brandName || 'Unknown';
  var maxImages = body.maxImages || 50;
  if (!storeUrl) return res.status(400).json({ error: 'Missing storeUrl' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });
  try {
    var mainHtml = await crawlPage(storeUrl);
    if (!mainHtml || mainHtml.length < 1000) {
      return res.status(502).json({ error: 'Empty or too short response from crawler' });
    }
    var subpageUrls = extractNavFromConfig(mainHtml, storeUrl);
    var allHtmlPages = [{ url: storeUrl, html: mainHtml, pageName: 'Startseite' }];
    var maxSubpages = 20;
    for (var sp = 0; sp < Math.min(subpageUrls.length, maxSubpages); sp++) {
      try {
        await new Promise(function(r) { setTimeout(r, 1500); });
        var subHtml = await crawlPage(subpageUrls[sp].url);
        if (subHtml && subHtml.length > 500) {
          allHtmlPages.push({ url: subpageUrls[sp].url, html: subHtml, pageName: subpageUrls[sp].name });
        }
      } catch (e) {}
    }
    var allImageUrls = [];
    var seenImages = {};
    for (var pg = 0; pg < allHtmlPages.length; pg++) {
      var configImages = extractImagesFromConfigBlocks(allHtmlPages[pg].html);
      var regexImages = extractStoreImageUrls(allHtmlPages[pg].html);
      var combined = mergeImageArrays(configImages, regexImages);
      for (var pi = 0; pi < combined.length; pi++) {
        var normalized = normalizeImageUrl(combined[pi].url);
        if (!seenImages[normalized]) {
          seenImages[normalized] = true;
          allImageUrls.push({ url: combined[pi].url, page: allHtmlPages[pg].pageName, alt: combined[pi].alt || '' });
        }
      }
    }
    var totalImagesFound = allImageUrls.length;
    if (totalImagesFound === 0) {
      return res.status(200).json({
        brandName: brandName, imageCount: 0, pagesAnalyzed: allHtmlPages.length,
        subpagesFound: subpageUrls.length, geminiAnalyses: [],
        note: 'No store-design images found across ' + allHtmlPages.length + ' pages',
      });
    }
    var imagesToAnalyze = allImageUrls.slice(0, maxImages);
    var analyses = [];
    for (var i = 0; i < imagesToAnalyze.length; i++) {
      try {
        var analysis = await analyzeImageWithGemini(imagesToAnalyze[i].url, brandName);
        analysis.page = imagesToAnalyze[i].page;
        analyses.push(analysis);
      } catch (err) {
        analyses.push({ url: imagesToAnalyze[i].url, page: imagesToAnalyze[i].page, error: err.message, summary: 'Analysis failed' });
      }
      if (i < imagesToAnalyze.length - 1) { await new Promise(function(r) { setTimeout(r, 300); }); }
    }
    return res.status(200).json({
      brandName: brandName, storeUrl: storeUrl, pagesAnalyzed: allHtmlPages.length,
      subpagesFound: subpageUrls.length,
      subpageNames: subpageUrls.map(function(s) { return s.name; }),
      imageCount: analyses.length, totalImagesFound: totalImagesFound,
      analyzedAt: new Date().toISOString(), geminiAnalyses: analyses,
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
};

async function crawlPage(url) {
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 55000);
  try {
    var resp = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + UNLOCKER_TOKEN },
      body: JSON.stringify({ zone: UNLOCKER_ZONE, url: url, format: 'raw' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) { var errText = await resp.text(); throw new Error('Crawler error ' + resp.status + ': ' + errText.slice(0, 200)); }
    return await resp.text();
  } catch (err) { clearTimeout(timeout); throw err; }
}

function extractNavFromConfig(html, mainUrl) {
  var amazonOrigin = 'https://www.amazon.de';
  try { amazonOrigin = new URL(mainUrl).origin; } catch (e) {}
  var mainPageId = '';
  var mainMatch = (mainUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (mainMatch) mainPageId = mainMatch[1].toUpperCase();
  var configs = extractAllVarConfigs(html);
  var urls = [];
  var seen = {};
  for (var i = 0; i < configs.length; i++) {
    var nav = (configs[i].content || {}).nav;
    if (!nav || typeof nav !== 'object') continue;
    var keys = Object.keys(nav);
    for (var j = 0; j < keys.length; j++) {
      var pageId = keys[j].toUpperCase();
      if (pageId === mainPageId) continue;
      var entry = nav[keys[j]];
      if (!entry || !entry.href) continue;
      if (seen[pageId]) continue;
      seen[pageId] = true;
      var absUrl = entry.href.indexOf('http') === 0 ? entry.href : amazonOrigin + entry.href;
      try { var u = new URL(absUrl); ['lp_asin','lp_context_asin','visitId','ref','store_ref','ingress'].forEach(function(p){u.searchParams.delete(p);}); absUrl = u.toString(); } catch(e){}
      urls.push({ url: absUrl, name: entry.title || 'Subpage', pageId: pageId, level: entry.level || 0 });
    }
    if (urls.length > 0) break;
  }
  if (urls.length === 0) {
    var regex = /https?:\/\/www\.amazon\.[a-z.]+\/stores\/[^"'\s<>]+page\/([A-F0-9-]{36})/gi;
    var match;
    while ((match = regex.exec(html)) !== null) {
      var pid = match[1].toUpperCase();
      if (pid === mainPageId || seen[pid]) continue;
      seen[pid] = true;
      urls.push({ url: match[0].split('?')[0], name: 'Subpage', pageId: pid, level: 0 });
    }
  }
  return urls;
}

function extractAllVarConfigs(html) {
  var configs = []; var searchPos = 0;
  while (true) {
    var idx = html.indexOf('var config', searchPos);
    if (idx < 0) break; searchPos = idx + 10;
    var eqIdx = html.indexOf('{', idx);
    if (eqIdx < 0 || eqIdx > idx + 30) continue;
    var jsonStr = extractBalancedJSON(html, eqIdx);
    if (!jsonStr) continue;
    try { var data = JSON.parse(jsonStr); if (data.widgetType || data.sectionType || data.widgetId || data.content) { configs.push(data); } } catch(e){}
  }
  return configs;
}

function extractImagesFromConfigBlocks(html) {
  var configs = extractAllVarConfigs(html);
  var images = []; var seen = {};
  for (var i = 0; i < configs.length; i++) {
    var config = configs[i]; var content = config.content || {};
    if (config.isLazyLoaded) continue;
    if (content.imageUrl) { addImage(images, seen, content.imageUrl, content.alt || content.a11yImageAltText || 'Hero'); }
    var mobile = content.mobileContent || config.mobileContent || {};
    if (mobile.imageUrl) { addImage(images, seen, mobile.imageUrl, 'Mobile'); }
    var tiles = config.tiles || content.tiles || [];
    for (var j = 0; j < tiles.length; j++) {
      var tile = tiles[j]; var tc = tile.content || {};
      if (tc.imageUrl) { addImage(images, seen, tc.imageUrl, tc.altText || tc.a11yImageAltText || ''); }
      if (tc.imageKey && !tc.imageUrl) { addImage(images, seen, 'https://m.media-amazon.com/images/S/' + tc.imageKey, tc.altText || ''); }
      var mobileT = tc.mobileContent || tile.mobileContent || {};
      if (mobileT.imageUrl) { addImage(images, seen, mobileT.imageUrl, 'Mobile'); }
    }
  }
  return images;
}

function addImage(images, seen, url, alt) {
  if (!url) return;
  if (url.indexOf('http') !== 0) { url = 'https://m.media-amazon.com/images/S/' + url; }
  if (url.indexOf('/images/S/al-') < 0) return;
  var key = normalizeImageUrl(url);
  if (seen[key]) return; seen[key] = true;
  images.push({ url: url, alt: alt || '' });
}

function extractStoreImageUrls(html) {
  var regex = /https:\/\/m\.media-amazon\.com\/images\/S\/al-[^"'\s<>)]+/g;
  var matches = html.match(regex) || [];
  var seen = {}; var urls = [];
  for (var i = 0; i < matches.length; i++) {
    var normalized = normalizeImageUrl(matches[i]);
    if (!seen[normalized]) { seen[normalized] = true; urls.push({ url: matches[i], alt: '' }); }
  }
  return urls;
}

function normalizeImageUrl(url) { return url.replace(/\._[A-Z0-9,%_]+_\./g, '.').replace(/\?.*$/, ''); }

function mergeImageArrays(arr1, arr2) {
  var seen = {}; var result = [];
  for (var i = 0; i < arr1.length; i++) { var key = normalizeImageUrl(arr1[i].url); if (!seen[key]) { seen[key] = true; result.push(arr1[i]); } }
  for (var j = 0; j < arr2.length; j++) { var key2 = normalizeImageUrl(arr2[j].url); if (!seen[key2]) { seen[key2] = true; result.push(arr2[j]); } }
  return result;
}

function extractBalancedJSON(html, startPos) {
  var depth = 0; var inString = false; var escNext = false;
  for (var i = startPos; i < html.length && i < startPos + 500000; i++) {
    var ch = html[i];
    if (escNext) { escNext = false; continue; }
    if (ch === '\\' && inString) { escNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) { return html.slice(startPos, i + 1); } }
  }
  return null;
}

async function analyzeImageWithGemini(imageUrl, brandName) {
  var prompt = [
    'Describe this Amazon Brand Store image for "' + brandName + '" in a designer briefing style.',
    'Focus ONLY on: what is shown, visible text, and the image function. Skip lighting, mood, atmosphere.',
    '', 'Return ONLY valid JSON:',
    '{',
    '  "summary": "1 short sentence: subject + context",',
    '  "imageCategory": "store_hero|lifestyle|product_showcase|category_tile|benefit_graphic|social_proof|brand_story|icon_graphic|ugc|video_thumbnail",',
    '  "dominantColors": ["#hex1", "#hex2", "#hex3"],',
    '  "textOnImage": "exact visible text, or empty string",',
    '  "elements": ["person", "product", "logo", "cta_button", "icon", "illustration", "badge"],',
    '  "brandingElements": "logos, badges, seals or empty string",',
    '  "designPatterns": ["e.g. text-on-dark, product-cutout, gradient-overlay, lifestyle-background"]',
    '}',
  ].join('\n');
  var analysis;
  try { analysis = await callGeminiWithUrl(prompt, imageUrl); }
  catch (e) { analysis = await callGeminiWithDownload(prompt, imageUrl); }
  analysis.url = imageUrl;
  return analysis;
}

async function callGeminiWithUrl(prompt, imageUrl) {
  var requestBody = { contents: [{ parts: [{ text: prompt }, { file_data: { mime_type: 'image/jpeg', file_uri: imageUrl } }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 800 } };
  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
  if (!resp.ok) throw new Error('Gemini URL approach failed: ' + resp.status);
  return parseGeminiResponse(resp);
}

async function callGeminiWithDownload(prompt, imageUrl) {
  var imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error('Failed to download image');
  var buffer = await imgResp.arrayBuffer();
  var base64 = Buffer.from(buffer).toString('base64');
  var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
  var requestBody = { contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 800 } };
  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
  if (!resp.ok) { var err = await resp.text(); throw new Error('Gemini download failed: ' + resp.status + ' ' + err.slice(0, 200)); }
  return parseGeminiResponse(resp);
}

async function parseGeminiResponse(resp) {
  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }
  try { var s = text.indexOf('{'); var e = text.lastIndexOf('}'); if (s >= 0 && e > s) { return JSON.parse(text.slice(s, e + 1)); } } catch(err){}
  return { summary: text.slice(0, 300), imageCategory: 'unknown', dominantColors: [], elements: [] };
}

