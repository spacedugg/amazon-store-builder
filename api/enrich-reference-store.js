// ─── GEMINI VISION ENRICHMENT V3: FULL STORE STRUCTURE ANALYSIS ───
// Crawls a reference store + all subpages, extracts the COMPLETE store
// structure (sections, widgets, tiles, videos, ASINs, images) from
// var config blocks, then sends images + structural context to Gemini.
//
// POST|GET /api/enrich-reference-store
// Body/Query: { storeUrl, brandName, maxImagesPerPage?: 20 }

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
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  var storeUrl = body.storeUrl;
  var brandName = body.brandName || 'Unknown';
  var maxImagesPerPage = parseInt(body.maxImagesPerPage, 10) || 25;

  if (!storeUrl) return res.status(400).json({ error: 'Missing storeUrl' });
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  try {
    // Step 1: Crawl main page
    var mainHtml = await crawlPage(storeUrl);
    if (!mainHtml || mainHtml.length < 1000) {
      return res.status(502).json({ error: 'Empty or too short response from crawler (' + (mainHtml ? mainHtml.length : 0) + ' chars)' });
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

    // Step 4: For EACH page, extract structure + images and analyze with Gemini
    var pageResults = [];
    var totalImages = 0;
    var totalSections = 0;
    var totalVideos = 0;
    var totalAsins = 0;

    for (var pg = 0; pg < allHtmlPages.length; pg++) {
      var page = allHtmlPages[pg];

      // NEW: Extract full page structure from var config blocks
      var pageStructure = extractPageStructure(page.html);

      // Extract all images (existing logic, improved)
      var pageImages = extractAllImages(page.html);
      totalImages += pageImages.length;

      // Collect page-level stats
      var pageSections = pageStructure.sections || [];
      var pageVideoCount = 0;
      var pageAsinList = [];
      var pageTileCount = 0;
      for (var si = 0; si < pageSections.length; si++) {
        var sec = pageSections[si];
        pageVideoCount += (sec.videoUrls || []).length;
        pageAsinList = pageAsinList.concat(sec.asins || []);
        pageTileCount += sec.tileCount || 0;
      }
      totalSections += pageSections.length;
      totalVideos += pageVideoCount;
      totalAsins += pageAsinList.length;

      // Limit images for Gemini
      var imagesToSend = pageImages.slice(0, maxImagesPerPage);

      var pageResult = {
        pageName: page.pageName,
        pageUrl: page.url,
        structure: {
          sectionCount: pageSections.length,
          sections: pageSections,
          tileCount: pageTileCount,
          videoCount: pageVideoCount,
          asinCount: pageAsinList.length,
          asins: pageAsinList.slice(0, 50),
        },
        images: {
          total: pageImages.length,
          analyzed: imagesToSend.length,
          list: imagesToSend.map(function(img) {
            return { url: img.url, alt: img.alt, source: img.source };
          }),
        },
        pageAnalysis: null,
      };

      // Step 5: Send images + structure context to Gemini
      if (imagesToSend.length > 0) {
        try {
          var analysis = await analyzePageWithGemini(imagesToSend, brandName, page.pageName, pageSections);
          pageResult.pageAnalysis = analysis;
        } catch (err) {
          pageResult.pageAnalysis = { error: err.message };
        }
      }

      pageResults.push(pageResult);

      if (pg < allHtmlPages.length - 1) {
        await new Promise(function(r) { setTimeout(r, 500); });
      }
    }

    // Build store-level summary
    var allSectionTypes = {};
    for (var pi = 0; pi < pageResults.length; pi++) {
      var secs = pageResults[pi].structure.sections;
      for (var sj = 0; sj < secs.length; sj++) {
        var t = secs[sj].type || 'unknown';
        allSectionTypes[t] = (allSectionTypes[t] || 0) + 1;
      }
    }

    return res.status(200).json({
      brandName: brandName,
      storeUrl: storeUrl,
      pagesAnalyzed: allHtmlPages.length,
      subpagesFound: subpageUrls.length,
      subpageNames: subpageUrls.map(function(s) { return s.name; }),
      storeTotals: {
        totalImages: totalImages,
        totalSections: totalSections,
        totalVideos: totalVideos,
        totalAsins: totalAsins,
        sectionTypeCounts: allSectionTypes,
      },
      analyzedAt: new Date().toISOString(),
      pages: pageResults,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── CRAWL PAGE VIA BRIGHTDATA ───
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

// ─── NEW: EXTRACT FULL PAGE STRUCTURE FROM VAR CONFIG BLOCKS ───
// Parses every var config block and classifies it as a store section
function extractPageStructure(html) {
  var configs = extractAllVarConfigs(html);
  var sections = [];

  for (var i = 0; i < configs.length; i++) {
    var cfg = configs[i];
    // Skip lazy-loaded placeholders
    if (cfg.isLazyLoaded) continue;
    // Skip navigation-only configs
    if (cfg.content && cfg.content.nav && !cfg.widgetType && !cfg.sectionType) continue;

    var section = classifySection(cfg);
    if (section) {
      sections.push(section);
    }
  }

  return { sections: sections };
}

// ─── CLASSIFY A CONFIG BLOCK INTO A STORE SECTION ───
function classifySection(cfg) {
  var widgetType = cfg.widgetType || cfg.sectionType || '';
  var content = cfg.content || {};

  // Skip pure navigation/chrome widgets
  if (/^(Nav|Breadcrumb|Footer|Header|SearchBar)$/i.test(widgetType)) return null;

  var section = {
    widgetType: widgetType,
    type: mapWidgetToType(widgetType, cfg),
    tileCount: 0,
    imageCount: 0,
    videoUrls: [],
    asins: [],
    hasText: false,
    textContent: [],
  };

  // Count tiles/items
  var tiles = content.tiles || content.items || content.cards || [];
  if (Array.isArray(tiles)) {
    section.tileCount = tiles.length;
  }

  // Recursively extract structured data
  extractStructuredData(cfg, section, 0);

  // Only return sections that have actual store content
  if (section.type === 'unknown' && section.imageCount === 0 &&
      section.tileCount === 0 && section.videoUrls.length === 0 &&
      section.asins.length === 0 && !section.hasText) {
    return null;
  }

  // Deduplicate ASINs
  var seenAsins = {};
  section.asins = section.asins.filter(function(a) {
    if (seenAsins[a]) return false;
    seenAsins[a] = true;
    return true;
  });

  // Limit text content to first 5 entries to save space
  section.textContent = section.textContent.slice(0, 5);

  return section;
}

// ─── MAP WIDGET TYPE TO SECTION CATEGORY ───
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
  if (/brand.*logo|logo|follow/i.test(wt)) return 'brand-element';
  if (/deal|bestsell|popular|featured/i.test(wt)) return 'deals';
  if (/navigation|nav|menu/i.test(wt)) return 'navigation';

  // Try to infer from content
  var content = cfg.content || {};
  if (content.videoUrl || content.videoId) return 'video';
  if (content.asin || content.asins || content.productList) return 'product-grid';
  if (content.heroContent) return 'hero';
  if (content.tiles && Array.isArray(content.tiles)) return 'image-tiles';

  return 'unknown';
}

// ─── RECURSIVELY EXTRACT STRUCTURED DATA (IMAGES, VIDEOS, ASINS, TEXT) ───
function extractStructuredData(obj, section, depth) {
  if (!obj || typeof obj !== 'object' || depth > 8) return;

  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object') extractStructuredData(obj[i], section, depth + 1);
    }
    return;
  }

  // Count images
  if (obj.imageUrl || obj.imageKey || obj.backgroundImageUrl) {
    section.imageCount++;
  }

  // Collect video URLs
  if (obj.videoUrl && /\.(mp4|webm|m3u8)/i.test(obj.videoUrl)) {
    section.videoUrls.push(obj.videoUrl);
  }
  if (obj.videoId) {
    section.videoUrls.push('video:' + obj.videoId);
  }

  // Collect ASINs
  if (obj.asin && typeof obj.asin === 'string' && /^[A-Z0-9]{10}$/.test(obj.asin)) {
    section.asins.push(obj.asin);
  }
  if (obj.asins && Array.isArray(obj.asins)) {
    for (var ai = 0; ai < obj.asins.length; ai++) {
      if (typeof obj.asins[ai] === 'string' && /^[A-Z0-9]{10}$/.test(obj.asins[ai])) {
        section.asins.push(obj.asins[ai]);
      }
    }
  }

  // Collect text content
  if (obj.text && typeof obj.text === 'string' && obj.text.length > 3 && obj.text.length < 500) {
    section.hasText = true;
    if (section.textContent.length < 5) {
      section.textContent.push(obj.text.slice(0, 200));
    }
  }
  if (obj.headline && typeof obj.headline === 'string') {
    section.hasText = true;
    if (section.textContent.length < 5) {
      section.textContent.push(obj.headline.slice(0, 200));
    }
  }
  if (obj.title && typeof obj.title === 'string' && obj.title.length > 3) {
    section.hasText = true;
  }

  // Recurse into nested objects
  var keys = Object.keys(obj);
  for (var k = 0; k < keys.length; k++) {
    var val = obj[keys[k]];
    if (typeof val === 'object' && val !== null) {
      extractStructuredData(val, section, depth + 1);
    }
  }
}

// ─── EXTRACT ALL IMAGES FROM HTML (NO FILTER!) ───
function extractAllImages(html) {
  var images = [];
  var seen = {};

  // Source 1: var config JSON blocks (highest quality — has alt text, context)
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

  // Source 3: Regex fallback for ALL media-amazon image URLs in /images/S/
  var allUrlRegex = /https:\/\/m\.media-amazon\.com\/images\/S\/[^"'\s<>)]+\.(jpg|jpeg|png|gif|webp|svg)/gi;
  var urlMatch;
  while ((urlMatch = allUrlRegex.exec(html)) !== null) {
    addImageUnfiltered(images, seen, urlMatch[0], '', 'regex');
  }

  // Source 4: Product images (images/I/)
  var productRegex = /https:\/\/m\.media-amazon\.com\/images\/I\/[^"'\s<>)]+\.(jpg|jpeg|png|gif|webp)/gi;
  var prodMatch;
  while ((prodMatch = productRegex.exec(html)) !== null) {
    if (/\._[A-Z]{2}\d{2,3}_\./.test(prodMatch[0])) continue;
    addImageUnfiltered(images, seen, prodMatch[0], '', 'product');
  }

  return images;
}

// ─── EXTRACT IMAGES FROM CONFIG BLOCK (DEEP RECURSIVE — NO KEY FILTER) ───
function extractConfigImages(obj, images, seen, source) {
  if (!obj || typeof obj !== 'object') return;

  if (obj.imageUrl) {
    var url = obj.imageUrl;
    if (url.indexOf('http') !== 0) url = 'https://m.media-amazon.com/images/S/' + url;
    addImageUnfiltered(images, seen, url, obj.alt || obj.altText || obj.a11yImageAltText || '', source);
  }

  if (obj.imageKey && !obj.imageUrl) {
    addImageUnfiltered(images, seen, 'https://m.media-amazon.com/images/S/' + obj.imageKey, obj.altText || '', source);
  }

  if (obj.backgroundImageUrl) {
    var bgUrl = obj.backgroundImageUrl;
    if (bgUrl.indexOf('http') !== 0) bgUrl = 'https://m.media-amazon.com/images/S/' + bgUrl;
    addImageUnfiltered(images, seen, bgUrl, 'background', source);
  }

  if (obj.videoUrl && /\.(mp4|webm)/.test(obj.videoUrl)) {
    addImageUnfiltered(images, seen, obj.videoUrl, 'video', 'video');
  }

  // DEEP recursive — recurse into ALL object properties (not just whitelisted keys)
  if (Array.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        extractConfigImages(obj[i], images, seen, source);
      }
    }
  } else {
    var objKeys = Object.keys(obj);
    for (var k = 0; k < objKeys.length; k++) {
      var val = obj[objKeys[k]];
      if (typeof val === 'object' && val !== null) {
        // Skip nav to avoid counting navigation icons as store content
        if (objKeys[k] === 'nav') continue;
        extractConfigImages(val, images, seen, source);
      }
    }
  }
}

// ─── ADD IMAGE WITHOUT FILTER ───
function addImageUnfiltered(images, seen, url, alt, source) {
  if (!url) return;
  if (url.indexOf('data:') === 0) return;
  if (url.indexOf('pixel') >= 0 || url.indexOf('beacon') >= 0) return;
  if (/\.(gif)$/i.test(url) && url.indexOf('transparent') >= 0) return;
  if (/\.VTT$/i.test(url)) return;
  // Skip Amazon platform images (nav sprites, social share logos, etc.)
  if (url.indexOf('/gno/sprites/') >= 0) return;
  if (url.indexOf('social_share') >= 0) return;

  var key = normalizeImageUrl(url);
  if (seen[key]) return;
  seen[key] = true;
  images.push({ url: url, alt: alt || '', source: source });
}

// ─── ANALYZE PAGE WITH GEMINI (IMAGES + STRUCTURE CONTEXT) ───
async function analyzePageWithGemini(pageImages, brandName, pageName, pageSections) {

  // Build structural context for Gemini
  var structureDesc = 'PAGE STRUCTURE (extracted from source code):\n';
  if (pageSections && pageSections.length > 0) {
    for (var si = 0; si < pageSections.length; si++) {
      var sec = pageSections[si];
      structureDesc += (si + 1) + '. ' + sec.type.toUpperCase() + ' (' + sec.widgetType + ')';
      if (sec.tileCount > 0) structureDesc += ' — ' + sec.tileCount + ' tiles';
      if (sec.imageCount > 0) structureDesc += ' — ' + sec.imageCount + ' images';
      if (sec.videoUrls.length > 0) structureDesc += ' — ' + sec.videoUrls.length + ' video(s)';
      if (sec.asins.length > 0) structureDesc += ' — ' + sec.asins.length + ' products';
      if (sec.hasText && sec.textContent.length > 0) structureDesc += ' — text: "' + sec.textContent[0].slice(0, 80) + '"';
      structureDesc += '\n';
    }
  } else {
    structureDesc += '(No structured sections found — analyze from images only)\n';
  }

  var prompt = [
    'You are analyzing an Amazon Brand Store page for "' + brandName + '" (page: "' + pageName + '").',
    'I am sending you ' + pageImages.length + ' images from this page, plus the extracted page structure.',
    '',
    structureDesc,
    '',
    'Analyze the COMPLETE page design holistically and return ONLY valid JSON:',
    '{',
    '  "pageSummary": "3-4 sentences describing the overall page layout, sections from top to bottom, and purpose",',
    '  "designConcept": "1-2 sentences: the core visual/marketing strategy of this page",',
    '  "colorScheme": { "primary": "#hex", "secondary": "#hex", "accent": "#hex or null", "background": "#hex" },',
    '  "layoutPattern": "grid|hero-stack|editorial|catalog|storytelling|mixed",',
    '  "visualHierarchy": ["what draws attention first", "second", "third"],',
    '  "sectionFlow": ["section type from top to bottom, e.g. hero -> product-grid -> video -> image-text -> ..."],',
    '  "contentMix": {',
    '    "heroImages": 0,',
    '    "lifestyleImages": 0,',
    '    "productImages": 0,',
    '    "graphicsOrIcons": 0,',
    '    "videos": 0,',
    '    "textBanners": 0,',
    '    "productGrids": 0,',
    '    "imageTiles": 0',
    '  },',
    '  "designPatterns": ["e.g. full-width-hero, split-panel, text-overlay, product-grid, benefit-icons, video-section"],',
    '  "brandingConsistency": "1-2 sentences: how consistently is the brand identity applied across all sections?",',
    '  "textOnImages": ["list key visible text from images (max 15)"],',
    '  "imageDescriptions": [',
    '    { "index": 0, "summary": "short description", "role": "hero|lifestyle|product|category|cta|brand|icon|banner|infographic" }',
    '  ],',
    '  "storeQualityScore": {',
    '    "overall": 1-10,',
    '    "designQuality": 1-10,',
    '    "contentRichness": 1-10,',
    '    "brandPresence": 1-10,',
    '    "productPresentation": 1-10,',
    '    "strengths": ["max 3"],',
    '    "weaknesses": ["max 3"]',
    '  }',
    '}',
    '',
    'For imageDescriptions, describe EVERY image briefly (1 sentence). Index matches image order.',
    'For storeQualityScore, rate the page objectively based on Amazon Brand Store best practices.',
  ].join('\n');

  var parts = [{ text: prompt }];

  // Download all images and add as inline_data
  for (var i = 0; i < pageImages.length; i++) {
    var imgUrl = pageImages[i].url;
    try {
      if (/\.(mp4|webm|m3u8)/i.test(imgUrl)) {
        parts.push({ text: '[Image ' + i + ': VIDEO — ' + imgUrl + ']' });
        continue;
      }

      var imgResp = await fetch(imgUrl);
      if (!imgResp.ok) {
        parts.push({ text: '[Image ' + i + ': FAILED TO LOAD — ' + imgUrl + ']' });
        continue;
      }

      var buffer = await imgResp.arrayBuffer();
      if (buffer.byteLength > 4 * 1024 * 1024) {
        parts.push({ text: '[Image ' + i + ': TOO LARGE (' + (buffer.byteLength / 1024 / 1024).toFixed(1) + 'MB) — ' + imgUrl + ']' });
        continue;
      }

      var base64 = Buffer.from(buffer).toString('base64');
      var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
      if (mimeType.indexOf('image/') < 0) mimeType = 'image/jpeg';

      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    } catch (e) {
      parts.push({ text: '[Image ' + i + ': ERROR — ' + e.message + ']' });
    }
  }

  var requestBody = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 6000 },
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

// ─── PARSE GEMINI RESPONSE ───
async function parseGeminiResponse(resp) {
  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  var stripped = text.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '').replace(/\n?\s*```[\s\S]*$/, '');
  if (!stripped || stripped.length < 5) stripped = text;

  try {
    var s = stripped.indexOf('{');
    var e = stripped.lastIndexOf('}');
    if (s >= 0 && e > s) {
      return JSON.parse(stripped.slice(s, e + 1));
    }
  } catch (err) { /* fall through */ }

  var result = { pageSummary: stripped.slice(0, 500), parseError: true };
  var summaryMatch = stripped.match(/"pageSummary"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (summaryMatch) result.pageSummary = summaryMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  var conceptMatch = stripped.match(/"designConcept"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (conceptMatch) result.designConcept = conceptMatch[1];
  var layoutMatch = stripped.match(/"layoutPattern"\s*:\s*"([^"]+)"/);
  if (layoutMatch) result.layoutPattern = layoutMatch[1];
  return result;
}

// ─── EXTRACT NAVIGATION FROM var config BLOCKS ───
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

// ─── EXTRACT ALL var config = {...} BLOCKS ───
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

// ─── BALANCED BRACE EXTRACTION ───
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

// ─── NORMALIZE IMAGE URL FOR DEDUP ───
function normalizeImageUrl(url) {
  return url.replace(/\._[A-Z0-9,%_]+_\./g, '.').replace(/\?.*$/, '');
}
