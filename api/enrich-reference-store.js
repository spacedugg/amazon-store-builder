// âââ GEMINI VISION ENRICHMENT V2: FULL-PAGE ANALYSIS âââ
// Crawls a reference store + all subpages, extracts ALL images,
// sends ALL images per page to Gemini for holistic design analysis.
//
// POST /api/enrich-reference-store
// Body: { storeUrl, brandName, maxImagesPerPage?: 20 }
// Returns: { brandName, pages: [ { pageName, imageCount, pageAnalysis, images } ] }

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
  var maxImagesPerPage = body.maxImagesPerPage || 20;

  if (!storeUrl) return res.status(400).json({ error: 'Missing storeUrl' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  try {
    // Step 1: Crawl main page
    var mainHtml = await crawlPage(storeUrl);
    if (!mainHtml || mainHtml.length < 1000) {
      return res.status(502).json({ error: 'Empty or too short response from crawler' });
    }

    // Step 2: Extract subpage URLs from var config nav
    var subpageUrls = extractNavFromConfig(mainHtml, storeUrl);
    var allHtmlPages = [{ url: storeUrl, html: mainHtml, pageName: 'Startseite' }];

    // Step 3: Crawl ALL subpages (up to 25)
    var maxSubpages = 25;
    for (var sp = 0; sp < Math.min(subpageUrls.length, maxSubpages); sp++) {
      try {
        await new Promise(function(r) { setTimeout(r, 1200); });
        var subHtml = await crawlPage(subpageUrls[sp].url);
        if (subHtml && subHtml.length > 500) {
          allHtmlPages.push({ url: subpageUrls[sp].url, html: subHtml, pageName: subpageUrls[sp].name });
        }
      } catch (e) { /* skip failed subpage */ }
    }

    // Step 4: For EACH page, extract ALL images and analyze with Gemini
    var pageResults = [];
    var totalImages = 0;

    for (var pg = 0; pg < allHtmlPages.length; pg++) {
      var page = allHtmlPages[pg];
      var pageImages = extractAllImages(page.html);
      totalImages += pageImages.length;

      // Limit images per page for Gemini (keep the most relevant ones)
      var imagesToSend = pageImages.slice(0, maxImagesPerPage);

      var pageResult = {
        pageName: page.pageName,
        pageUrl: page.url,
        totalImagesFound: pageImages.length,
        imagesAnalyzed: imagesToSend.length,
        images: imagesToSend.map(function(img) {
          return { url: img.url, alt: img.alt, source: img.source };
        }),
        pageAnalysis: null,
      };

      // Step 5: Send ALL page images to Gemini in ONE request
      if (imagesToSend.length > 0) {
        try {
          var analysis = await analyzePageWithGemini(imagesToSend, brandName, page.pageName);
          pageResult.pageAnalysis = analysis;
        } catch (err) {
          pageResult.pageAnalysis = { error: err.message };
        }
      }

      pageResults.push(pageResult);

      // Delay between pages
      if (pg < allHtmlPages.length - 1) {
        await new Promise(function(r) { setTimeout(r, 500); });
      }
    }

    return res.status(200).json({
      brandName: brandName,
      storeUrl: storeUrl,
      pagesAnalyzed: allHtmlPages.length,
      subpagesFound: subpageUrls.length,
      subpageNames: subpageUrls.map(function(s) { return s.name; }),
      totalImagesFound: totalImages,
      analyzedAt: new Date().toISOString(),
      pages: pageResults,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// âââ CRAWL PAGE VIA BRIGHTDATA âââ
async function crawlPage(url) {
  var controller = new AbortController();
  var timeout = setTimeout(function() { controller.abort(); }, 55000);

  try {
    var resp = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + UNLOCKER_TOKEN,
      },
      body: JSON.stringify({ zone: UNLOCKER_ZONE, url: url, format: 'raw' }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) {
      var errText = await resp.text();
      throw new Error('Crawler error ' + resp.status + ': ' + errText.slice(0, 200));
    }
    return await resp.text();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// âââ EXTRACT ALL IMAGES FROM HTML (NO FILTER!) âââ
// Combines: var config blocks, <img> tags, regex for media-amazon URLs
function extractAllImages(html) {
  var images = [];
  var seen = {};

  // Source 1: var config JSON blocks (highest quality â has alt text, context)
  var configs = extractAllVarConfigs(html);
  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];
    if (config.isLazyLoaded) continue;
    extractConfigImages(config, images, seen, 'config');
  }

  // Source 2: <img> tags in HTML
  var imgRegex = /<img[^>]+(?:src|data-src)="(https:\/\/m\.media-amazon\.com\/images\/[^"]+)"/g;
  var imgMatch;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    addImageUnfiltered(images, seen, imgMatch[1], '', 'img-tag');
  }

  // Source 3: Regex fallback for ALL media-amazon image URLs
  var allUrlRegex = /https:\/\/m\.media-amazon\.com\/images\/S\/[^"'\s<>)]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  var urlMatch;
  while ((urlMatch = allUrlRegex.exec(html)) !== null) {
    addImageUnfiltered(images, seen, urlMatch[0], '', 'regex');
  }

  // Source 4: Product images (images/I/) â also part of the store design
  var productRegex = /https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\s<>)]+\.(jpg|jpeg|png|gif|webp)/gi;
  var prodMatch;
  while ((prodMatch = productRegex.exec(html)) !== null) {
    // Skip tiny thumbnails (they have small size suffixes like _SX38_, _SS40_)
    if (/\._[A-Z]{2}\d{2,3}_\./.test(prodMatch[0])) continue;
    addImageUnfiltered(images, seen, prodMatch[0], '', 'product');
  }

  return images;
}

// âââ EXTRACT IMAGES FROM A SINGLE CONFIG BLOCK (RECURSIVE) âââ
function extractConfigImages(obj, images, seen, source) {
  if (!obj || typeof obj !== 'object') return;

  // Direct imageUrl
  if (obj.imageUrl) {
    var url = obj.imageUrl;
    if (url.indexOf('http') !== 0) url = 'https://m.media-amazon.com/images/S/' + url;
    addImageUnfiltered(images, seen, url, obj.alt || obj.altText || obj.a11yImageAltText || '', source);
  }

  // imageKey (alternative format)
  if (obj.imageKey && !obj.imageUrl) {
    addImageUnfiltered(images, seen, 'https://m.media-amazon.com/images/S/' + obj.imageKey, obj.altText || '', source);
  }

  // backgroundImageUrl
  if (obj.backgroundImageUrl) {
    var bgUrl = obj.backgroundImageUrl;
    if (bgUrl.indexOf('http') !== 0) bgUrl = 'https://m.media-amazon.com/images/S/' + bgUrl;
    addImageUnfiltered(images, seen, bgUrl, 'background', source);
  }

  // videoUrl (for video thumbnails)
  if (obj.videoUrl && /\.(mp4|webm)/.test(obj.videoUrl)) {
    addImageUnfiltered(images, seen, obj.videoUrl, 'video', 'video');
  }

  // Recurse into nested objects
  var keys = Array.isArray(obj) ? obj : Object.keys(obj);
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object') extractConfigImages(obj[i], images, seen, source);
    }
  } else {
    var objKeys = Object.keys(obj);
    for (var k = 0; k < objKeys.length; k++) {
      var val = obj[objKeys[k]];
      if (typeof val === 'object' && val !== null) {
        // Only recurse into known nested structures (not into nav, ASIN lists, etc.)
        var key = objKeys[k];
        if (key === 'content' || key === 'mobileContent' || key === 'tiles' ||
            key === 'desktop' || key === 'mobile' || key === 'tablet' ||
            key === 'heroContent' || key === 'items' || key === 'sections' ||
            key === 'widgets' || key === 'media' || key === 'creative') {
          extractConfigImages(val, images, seen, source);
        }
      }
    }
  }
}

// âââ ADD IMAGE WITHOUT FILTER âââ
function addImageUnfiltered(images, seen, url, alt, source) {
  if (!url) return;
  // Skip data URIs, tracking pixels, tiny icons
  if (url.indexOf('data:') === 0) return;
  if (url.indexOf('pixel') >= 0 || url.indexOf('beacon') >= 0) return;
  if (/\.(gif)$/i.test(url) && url.indexOf('transparent') >= 0) return;
  // Skip VTT subtitle files
  if (/\.VTT$/i.test(url)) return;

  var key = normalizeImageUrl(url);
  if (seen[key]) return;
  seen[key] = true;
  images.push({ url: url, alt: alt || '', source: source });
}

// âââ ANALYZE ENTIRE PAGE WITH GEMINI (MULTI-IMAGE) âââ
async function analyzePageWithGemini(pageImages, brandName, pageName) {
  var prompt = [
    'You are analyzing an Amazon Brand Store page for "' + brandName + '" (page: "' + pageName + '").',
    'I am sending you ALL ' + pageImages.length + ' images from this page.',
    '',
    'Analyze the COMPLETE page design and return ONLY valid JSON:',
    '{',
    '  "pageSummary": "2-3 sentences describing the overall page layout, visual concept, and purpose",',
    '  "designConcept": "1 sentence: the core visual/marketing strategy of this page",',
    '  "colorScheme": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex" },',
    '  "layoutPattern": "grid|hero-stack|editorial|catalog|storytelling|mixed",',
    '  "visualHierarchy": ["what draws attention first", "second", "third"],',
    '  "contentMix": { "heroImages": 0, "lifestyleImages": 0, "productImages": 0, "graphicsOrIcons": 0, "videos": 0, "textBanners": 0 },',
    '  "designPatterns": ["e.g. full-width-hero, split-panel, text-overlay, product-grid, benefit-icons"],',
    '  "brandingConsistency": "1 sentence: how consistently is the brand identity applied?",',
    '  "textOnImages": ["list ALL visible text from all images"],',
    '  "imageDescriptions": [',
    '    { "index": 0, "summary": "short description", "role": "hero|lifestyle|product|category|cta|brand|icon" }',
    '  ]',
    '}',
    '',
    'For imageDescriptions, describe EVERY image briefly (1 sentence each). The index matches the image order.',
  ].join('\n');

  // Build multi-image request parts
  var parts = [{ text: prompt }];

  // Download all images and add as inline_data
  for (var i = 0; i < pageImages.length; i++) {
    var imgUrl = pageImages[i].url;
    try {
      // Skip videos â just note them
      if (/\.(mp4|webm|m3u8)/i.test(imgUrl)) {
        parts.push({ text: '[Image ' + i + ': VIDEO â ' + imgUrl + ']' });
        continue;
      }

      var imgResp = await fetch(imgUrl);
      if (!imgResp.ok) {
        parts.push({ text: '[Image ' + i + ': FAILED TO LOAD â ' + imgUrl + ']' });
        continue;
      }

      var buffer = await imgResp.arrayBuffer();
      // Skip if > 4MB (Gemini limit per image)
      if (buffer.byteLength > 4 * 1024 * 1024) {
        parts.push({ text: '[Image ' + i + ': TOO LARGE (' + (buffer.byteLength / 1024 / 1024).toFixed(1) + 'MB) â ' + imgUrl + ']' });
        continue;
      }

      var base64 = Buffer.from(buffer).toString('base64');
      var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
      // Fix mime types
      if (mimeType.indexOf('image/') < 0) mimeType = 'image/jpeg';

      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    } catch (e) {
      parts.push({ text: '[Image ' + i + ': ERROR â ' + e.message + ']' });
    }
  }

  var requestBody = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
  };

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('Gemini failed: ' + resp.status + ' ' + errText.slice(0, 300));
  }

  return parseGeminiResponse(resp);
}

// âââ PARSE GEMINI RESPONSE (with markdown stripping + partial extraction) âââ
async function parseGeminiResponse(resp) {
  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  // Strip markdown code block wrappers
  var stripped = text.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '').replace(/\n?\s*```[\s\S]*$/, '');
  if (!stripped || stripped.length < 5) stripped = text;

  try {
    var s = stripped.indexOf('{');
    var e = stripped.lastIndexOf('}');
    if (s >= 0 && e > s) {
      return JSON.parse(stripped.slice(s, e + 1));
    }
  } catch (err) { /* fall through */ }

  // Partial extraction
  var result = { pageSummary: stripped.slice(0, 500), parseError: true };

  var summaryMatch = stripped.match(/"pageSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (summaryMatch) result.pageSummary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');

  var conceptMatch = stripped.match(/"designConcept"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (conceptMatch) result.designConcept = conceptMatch[1];

  var layoutMatch = stripped.match(/"layoutPattern"\s*:\s*"([^"]+)"/);
  if (layoutMatch) result.layoutPattern = layoutMatch[1];

  return result;
}

// âââ EXTRACT NAVIGATION FROM var config BLOCKS âââ
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
      try {
        var u = new URL(absUrl);
        ['lp_asin', 'lp_context_asin', 'visitId', 'ref', 'store_ref', 'ingress'].forEach(function(p) { u.searchParams.delete(p); });
        absUrl = u.toString();
      } catch (e) {}

      urls.push({ url: absUrl, name: entry.title || 'Subpage', pageId: pageId, level: entry.level || 0 });
    }
    if (urls.length > 0) break;
  }

  // Regex fallback
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

// âââ EXTRACT ALL var config = {...} BLOCKS âââ
function extractAllVarConfigs(html) {
  var configs = [];
  var searchPos = 0;

  while (true) {
    var idx = html.indexOf('var config', searchPos);
    if (idx < 0) break;
    searchPos = idx + 10;

    var eqIdx = html.indexOf('{', idx);
    if (eqIdx < 0 || eqIdx > idx + 30) continue;

    var jsonStr = extractBalancedJSON(html, eqIdx);
    if (!jsonStr) continue;

    try {
      var data = JSON.parse(jsonStr);
      if (data.widgetType || data.sectionType || data.widgetId || data.content) {
        configs.push(data);
      }
    } catch (e) {}
  }

  return configs;
}

// âââ BALANCED BRACE EXTRACTION âââ
function extractBalancedJSON(html, startPos) {
  var depth = 0;
  var inString = false;
  var escNext = false;

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

// âââ NORMALIZE IMAGE URL FOR DEDUP âââ
function normalizeImageUrl(url) {
  return url.replace(/\._[A-Z0-9,%_]+_\./g, '.').replace(/\?.*$/, '');
}
