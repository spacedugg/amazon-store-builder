// ─── ANALYZE A SINGLE STORE PAGE ───
// Crawls ONE page, extracts structure + images, analyzes with Gemini Vision.
// Fast (~20-40s per page).
//
// POST /api/analyze-store-page
// Body: { pageUrl, brandName, pageName, maxImages?: 20 }
// Returns: { pageName, pageUrl, structure, images, pageAnalysis }

var GEMINI_KEY = process.env.GEMINI_API_KEY;
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';
var UNLOCKER_TOKEN = process.env.BRIGHTDATA_UNLOCKER_TOKEN;
var UNLOCKER_ZONE = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  var pageUrl = body.pageUrl;
  var brandName = body.brandName || 'Unknown';
  var pageName = body.pageName || 'Page';
  var maxImages = parseInt(body.maxImages, 10) || 20;

  if (!pageUrl) return res.status(400).json({ error: 'Missing pageUrl' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  try {
    // Step 1: Crawl the page
    var html = await crawlPage(pageUrl);
    if (!html || html.length < 500) {
      return res.status(502).json({ error: 'Empty response (' + (html ? html.length : 0) + ' chars)' });
    }

    // Step 2: Extract structure
    var pageStructure = extractPageStructure(html);
    var sections = pageStructure.sections || [];

    // Step 3: Extract images
    var pageImages = extractAllImages(html);

    // Step 4: Analyze with Gemini
    var imagesToSend = pageImages.slice(0, maxImages);
    var pageAnalysis = null;
    if (imagesToSend.length > 0) {
      try {
        pageAnalysis = await analyzePageWithGemini(imagesToSend, brandName, pageName, sections);
      } catch (err) {
        pageAnalysis = { error: err.message };
      }
    }

    return res.status(200).json({
      pageName: pageName,
      pageUrl: pageUrl,
      structure: {
        sectionCount: sections.length,
        sections: sections,
        imageCount: pageImages.length,
      },
      images: imagesToSend.map(function(img) { return { url: img.url, alt: img.alt }; }),
      pageAnalysis: pageAnalysis,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── CRAWL ───
async function crawlPage(url) {
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 45000);
  try {
    var resp = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + UNLOCKER_TOKEN },
      body: JSON.stringify({ zone: UNLOCKER_ZONE, url: url, format: 'raw' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error('Crawler error ' + resp.status);
    return await resp.text();
  } catch (err) { clearTimeout(timeout); throw err; }
}

// ─── EXTRACT STRUCTURE ───
function extractPageStructure(html) {
  var configs = extractAllVarConfigs(html);
  var sections = [];
  for (var i = 0; i < configs.length; i++) {
    if (configs[i].isLazyLoaded) continue;
    if (configs[i].content && configs[i].content.nav && !configs[i].widgetType && !configs[i].sectionType) continue;
    var section = classifySection(configs[i]);
    if (section) sections.push(section);
  }
  return { sections: sections };
}

function classifySection(cfg) {
  var widgetType = cfg.widgetType || cfg.sectionType || '';
  var content = cfg.content || {};
  if (/^(Nav|Breadcrumb|Footer|Header|SearchBar)$/i.test(widgetType)) return null;

  var section = { widgetType: widgetType, type: mapWidgetToType(widgetType, cfg), tileCount: 0, imageCount: 0, videoUrls: [], asins: [], textContent: [] };
  var tiles = content.tiles || content.items || content.cards || [];
  if (Array.isArray(tiles)) section.tileCount = tiles.length;
  extractStructuredData(cfg, section, 0);

  if (section.type === 'unknown' && section.imageCount === 0 && section.tileCount === 0 && section.videoUrls.length === 0 && section.asins.length === 0 && section.textContent.length === 0) return null;

  var seenAsins = {};
  section.asins = section.asins.filter(function(a) { if (seenAsins[a]) return false; seenAsins[a] = true; return true; });
  section.textContent = section.textContent.slice(0, 5);
  return section;
}

function mapWidgetToType(widgetType, cfg) {
  var wt = (widgetType || '').toLowerCase();
  if (/hero/i.test(wt)) return 'hero';
  if (/video/i.test(wt)) return 'video';
  if (/product.*grid|productset|asin|product.*listing|shoppable/i.test(wt)) return 'product-grid';
  if (/image.*text|text.*image|split/i.test(wt)) return 'image-text';
  if (/gallery|carousel|slider/i.test(wt)) return 'gallery';
  if (/image.*tile|tile|imagemap|quadrant/i.test(wt)) return 'image-tiles';
  if (/banner|full.*image|marquee/i.test(wt)) return 'banner';
  if (/text|headline|copy|richtext/i.test(wt)) return 'text';
  if (/deal|bestsell|popular|featured/i.test(wt)) return 'deals';
  var content = cfg.content || {};
  if (content.videoUrl || content.videoId) return 'video';
  if (content.asin || content.asins || content.productList) return 'product-grid';
  if (content.heroContent) return 'hero';
  if (content.tiles && Array.isArray(content.tiles)) return 'image-tiles';
  return 'unknown';
}

function extractStructuredData(obj, section, depth) {
  if (!obj || typeof obj !== 'object' || depth > 8) return;
  if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) { if (typeof obj[i] === 'object') extractStructuredData(obj[i], section, depth + 1); } return; }
  if (obj.imageUrl || obj.imageKey || obj.backgroundImageUrl) section.imageCount++;
  if (obj.videoUrl && /\.(mp4|webm|m3u8)/i.test(obj.videoUrl)) section.videoUrls.push(obj.videoUrl);
  if (obj.asin && typeof obj.asin === 'string' && /^[A-Z0-9]{10}$/.test(obj.asin)) section.asins.push(obj.asin);
  if (obj.text && typeof obj.text === 'string' && obj.text.length > 3 && obj.text.length < 500 && section.textContent.length < 5) section.textContent.push(obj.text.slice(0, 200));
  if (obj.headline && typeof obj.headline === 'string' && section.textContent.length < 5) section.textContent.push(obj.headline.slice(0, 200));
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) { if (keys[k] !== 'nav' && typeof obj[keys[k]] === 'object' && obj[keys[k]] !== null) extractStructuredData(obj[keys[k]], section, depth + 1); }
}

// ─── EXTRACT IMAGES ───
function extractAllImages(html) {
  var images = [], seen = {};
  var configs = extractAllVarConfigs(html);
  for (var i = 0; i < configs.length; i++) { if (!configs[i].isLazyLoaded) extractConfigImages(configs[i], images, seen); }
  var imgRegex = /<img[^>]+(?:src|data-src)="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/g;
  var m; while ((m = imgRegex.exec(html)) !== null) { addImage(images, seen, m[1], ''); }
  return images;
}

function extractConfigImages(obj, images, seen) {
  if (!obj || typeof obj !== 'object') return;
  if (obj.imageUrl) { var url = obj.imageUrl; if (url.indexOf('http') !== 0) url = 'https://m.media-amazon.com/images/S/' + url; addImage(images, seen, url, obj.alt || obj.altText || ''); }
  if (obj.imageKey && !obj.imageUrl) addImage(images, seen, 'https://m.media-amazon.com/images/S/' + obj.imageKey, obj.altText || '');
  if (obj.backgroundImageUrl) { var bg = obj.backgroundImageUrl; if (bg.indexOf('http') !== 0) bg = 'https://m.media-amazon.com/images/S/' + bg; addImage(images, seen, bg, 'background'); }
  if (Array.isArray(obj)) { for (var i = 0; i < obj.length; i++) { if (typeof obj[i] === 'object') extractConfigImages(obj[i], images, seen); } }
  else { var keys = Object.keys(obj); for (var k = 0; k < keys.length; k++) { if (keys[k] !== 'nav' && typeof obj[keys[k]] === 'object' && obj[keys[k]] !== null) extractConfigImages(obj[keys[k]], images, seen); } }
}

function addImage(images, seen, url, alt) {
  if (!url || url.indexOf('data:') === 0 || url.indexOf('pixel') >= 0 || url.indexOf('beacon') >= 0) return;
  if (/\.(gif)$/i.test(url) && url.indexOf('transparent') >= 0) return;
  if (url.indexOf('/gno/sprites/') >= 0 || url.indexOf('social_share') >= 0) return;
  var key = url.replace(/\._[A-Z0-9,_]+_\./, '.').split('?')[0].toLowerCase();
  if (seen[key]) return;
  seen[key] = true;
  images.push({ url: url, alt: alt || '' });
}

// ─── GEMINI ANALYSIS ───
async function analyzePageWithGemini(pageImages, brandName, pageName, pageSections) {
  var structureDesc = 'PAGE STRUCTURE:\n';
  for (var si = 0; si < pageSections.length; si++) {
    var sec = pageSections[si];
    structureDesc += (si + 1) + '. ' + sec.type.toUpperCase() + ' (' + sec.widgetType + ')';
    if (sec.tileCount > 0) structureDesc += ' — ' + sec.tileCount + ' tiles';
    if (sec.imageCount > 0) structureDesc += ' — ' + sec.imageCount + ' images';
    if (sec.textContent.length > 0) structureDesc += ' — text: "' + sec.textContent[0].slice(0, 60) + '"';
    structureDesc += '\n';
  }

  var prompt = [
    'Analyze this Amazon Brand Store page for "' + brandName + '" (page: "' + pageName + '").',
    'I am sending ' + pageImages.length + ' images + extracted structure.',
    '', structureDesc, '',
    'Return ONLY valid JSON:',
    '{ "pageSummary": "3-4 sentences: layout from top to bottom",',
    '  "designConcept": "1-2 sentences: visual/marketing strategy",',
    '  "colorScheme": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex" },',
    '  "layoutPattern": "grid|hero-stack|editorial|catalog|storytelling|mixed",',
    '  "sectionFlow": ["section types top to bottom"],',
    '  "contentMix": { "heroImages": 0, "lifestyleImages": 0, "productImages": 0, "graphics": 0, "videos": 0, "textBanners": 0, "productGrids": 0 },',
    '  "imageDescriptions": [{ "index": 0, "summary": "short desc", "role": "hero|lifestyle|product|category|cta|brand|icon|banner" }],',
    '  "moduleRelationships": ["describe how adjacent modules relate visually/thematically (max 5)"],',
    '  "storeQualityScore": { "overall": 1-10, "strengths": ["max 3"], "weaknesses": ["max 3"] }',
    '}',
  ].join('\n');

  var parts = [{ text: prompt }];
  for (var i = 0; i < pageImages.length; i++) {
    try {
      if (/\.(mp4|webm)/i.test(pageImages[i].url)) { parts.push({ text: '[Image ' + i + ': VIDEO]' }); continue; }
      var imgResp = await fetch(pageImages[i].url);
      if (!imgResp.ok) { parts.push({ text: '[Image ' + i + ': FAILED]' }); continue; }
      var buffer = await imgResp.arrayBuffer();
      if (buffer.byteLength > 4 * 1024 * 1024) { parts.push({ text: '[Image ' + i + ': TOO LARGE]' }); continue; }
      var base64 = Buffer.from(buffer).toString('base64');
      var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
      if (mimeType.indexOf('image/') < 0) mimeType = 'image/jpeg';
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    } catch (e) { parts.push({ text: '[Image ' + i + ': ERROR]' }); }
  }

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 4000 } }),
  });
  if (!resp.ok) throw new Error('Gemini failed: ' + resp.status);

  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }
  var stripped = text.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '').replace(/\n?\s*```[\s\S]*$/, '');
  try { var s = stripped.indexOf('{'); var e = stripped.lastIndexOf('}'); if (s >= 0 && e > s) return JSON.parse(stripped.slice(s, e + 1)); } catch (err) {}
  return { pageSummary: stripped.slice(0, 500), parseError: true };
}

// ─── HELPERS ───
function extractAllVarConfigs(html) {
  var configs = [], searchPos = 0;
  while (true) {
    var idx = html.indexOf('var config', searchPos);
    if (idx < 0) break;
    searchPos = idx + 10;
    var eqIdx = html.indexOf('{', idx);
    if (eqIdx < 0 || eqIdx > idx + 30) continue;
    var jsonStr = extractBalancedJSON(html, eqIdx);
    if (!jsonStr) continue;
    try { var data = JSON.parse(jsonStr); if (data.widgetType || data.sectionType || data.widgetId || data.content) configs.push(data); } catch (e) {}
  }
  return configs;
}

function extractBalancedJSON(html, startPos) {
  var depth = 0, inString = false, escNext = false;
  for (var i = startPos; i < html.length && i < startPos + 500000; i++) {
    var ch = html[i];
    if (escNext) { escNext = false; continue; }
    if (ch === '\\' && inString) { escNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return html.slice(startPos, i + 1); }
  }
  return null;
}
