// ─── GEMINI VISION ENRICHMENT FOR REFERENCE STORES ───
// Crawls a reference store, extracts images, analyzes with Gemini Vision,
// returns enriched image analysis data to be merged into the store JSON.
//
// POST /api/enrich-reference-store
// Body: { storeUrl: "https://...", brandName: "SNOCKS", maxImages: 15 }
// Returns: { brandName, imageCount, geminiAnalyses: [...] }

var GEMINI_KEY = process.env.GEMINI_API_KEY;
var GEMINI_MODEL = 'gemini-2.0-flash';
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
    // Step 1: Crawl the MAIN page to discover navigation/subpages
    var mainHtml = await crawlPage(storeUrl);
    if (!mainHtml || mainHtml.length < 1000) {
      return res.status(502).json({ error: 'Empty or too short response from crawler' });
    }

    // Step 2: Extract subpage URLs from navigation links
    var subpageUrls = extractSubpageUrls(mainHtml, storeUrl);
    var allHtmlPages = [{ url: storeUrl, html: mainHtml, pageName: 'Startseite' }];

    // Step 3: Crawl ALL subpages (up to 15)
    var maxSubpages = 15;
    for (var sp = 0; sp < Math.min(subpageUrls.length, maxSubpages); sp++) {
      try {
        await new Promise(function(r) { setTimeout(r, 1500); }); // delay between crawls
        var subHtml = await crawlPage(subpageUrls[sp].url);
        if (subHtml && subHtml.length > 500) {
          allHtmlPages.push({ url: subpageUrls[sp].url, html: subHtml, pageName: subpageUrls[sp].name });
        }
      } catch (e) { /* skip failed subpage */ }
    }

    // Step 4: Extract ALL unique store-design image URLs across ALL pages
    var allImageUrls = [];
    var seenImages = {};
    for (var pg = 0; pg < allHtmlPages.length; pg++) {
      var pageImages = extractStoreImageUrls(allHtmlPages[pg].html);
      for (var pi = 0; pi < pageImages.length; pi++) {
        var normalized = pageImages[pi].replace(/\._[A-Z0-9,%]+_\./, '.');
        if (!seenImages[normalized]) {
          seenImages[normalized] = true;
          allImageUrls.push({ url: pageImages[pi], page: allHtmlPages[pg].pageName });
        }
      }
    }

    var totalImagesFound = allImageUrls.length;

    if (totalImagesFound === 0) {
      return res.status(200).json({
        brandName: brandName,
        imageCount: 0,
        pagesAnalyzed: allHtmlPages.length,
        geminiAnalyses: [],
        note: 'No store-design images found across ' + allHtmlPages.length + ' pages',
      });
    }

    // Limit to maxImages for Gemini analysis
    var imagesToAnalyze = allImageUrls.slice(0, maxImages);

    // Step 5: Analyze each image with Gemini Vision
    var analyses = [];
    for (var i = 0; i < imagesToAnalyze.length; i++) {
      try {
        var analysis = await analyzeImageWithGemini(imagesToAnalyze[i].url, brandName);
        analysis.page = imagesToAnalyze[i].page;
        analyses.push(analysis);
      } catch (err) {
        analyses.push({
          url: imagesToAnalyze[i].url,
          page: imagesToAnalyze[i].page,
          error: err.message,
          summary: 'Analysis failed',
        });
      }
      // Small delay between Gemini requests
      if (i < imagesToAnalyze.length - 1) {
        await new Promise(function(r) { setTimeout(r, 300); });
      }
    }

    return res.status(200).json({
      brandName: brandName,
      storeUrl: storeUrl,
      pagesAnalyzed: allHtmlPages.length,
      subpagesFound: subpageUrls.length,
      imageCount: analyses.length,
      totalImagesFound: totalImagesFound,
      analyzedAt: new Date().toISOString(),
      geminiAnalyses: analyses,
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
      body: JSON.stringify({
        zone: UNLOCKER_ZONE,
        url: url,
        format: 'raw',
      }),
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

// ─── EXTRACT SUBPAGE URLS FROM NAVIGATION ───
function extractSubpageUrls(html, mainUrl) {
  var urls = [];
  var seen = {};

  // Extract Amazon Brand Store page links: /stores/.../page/UUID or /stores/page/UUID
  var regex = /https?:\/\/www\.amazon\.[a-z.]+\/stores\/[^"'\s<>]+page\/[A-F0-9-]{36}/gi;
  var matches = html.match(regex) || [];

  // Also look for relative page links
  var relRegex = /\/stores\/[^"'\s<>]*page\/([A-F0-9-]{36})/gi;
  var relMatches = html.match(relRegex) || [];

  // Extract page ID from main URL for filtering
  var mainPageId = '';
  var mainMatch = mainUrl.match(/page\/([A-F0-9-]{36})/i);
  if (mainMatch) mainPageId = mainMatch[1].toUpperCase();

  // Process absolute URLs
  for (var i = 0; i < matches.length; i++) {
    var url = matches[i].split('?')[0]; // strip query params
    var pageIdMatch = url.match(/page\/([A-F0-9-]{36})/i);
    if (!pageIdMatch) continue;
    var pageId = pageIdMatch[1].toUpperCase();
    if (pageId === mainPageId) continue; // skip main page
    if (seen[pageId]) continue;
    seen[pageId] = true;
    urls.push({ url: url, name: 'Subpage', pageId: pageId });
  }

  // Try to extract page names from nearby text
  // Look for patterns like: <a ...href="...page/UUID..."...>PageName</a>
  var linkRegex = /<a[^>]*href="[^"]*page\/([A-F0-9-]{36})[^"]*"[^>]*>([^<]+)</gi;
  var linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    var pid = linkMatch[1].toUpperCase();
    var name = linkMatch[2].trim();
    if (name && name.length < 50) {
      // Update existing entry with name
      for (var j = 0; j < urls.length; j++) {
        if (urls[j].pageId === pid && urls[j].name === 'Subpage') {
          urls[j].name = name;
          break;
        }
      }
    }
  }

  return urls;
}

// ─── EXTRACT STORE-DESIGN IMAGE URLS FROM HTML ───
// Store-designed images (hero, lifestyle, category tiles) use the /images/S/al- pattern
// Product images use /images/I/ and are excluded
function extractStoreImageUrls(html) {
  var regex = /https:\/\/m\.media-amazon\.com\/images\/S\/al-[^"'\s<>)]+/g;
  var matches = html.match(regex) || [];

  // Deduplicate and clean URLs
  var seen = {};
  var urls = [];
  for (var i = 0; i < matches.length; i++) {
    // Normalize: remove resize parameters for dedup, but keep original for analysis
    var normalized = matches[i].replace(/\._[A-Z0-9,%]+_\./, '.');
    if (!seen[normalized]) {
      seen[normalized] = true;
      urls.push(matches[i]);
    }
  }

  return urls;
}

// ─── ANALYZE SINGLE IMAGE WITH GEMINI VISION ───
async function analyzeImageWithGemini(imageUrl, brandName) {
  var prompt = [
    'Describe this Amazon Brand Store image for "' + brandName + '" in a designer briefing style.',
    'Focus ONLY on: what is shown, visible text, and the image function. Skip lighting, mood, atmosphere.',
    '',
    'Return ONLY valid JSON:',
    '{',
    '  "summary": "1 short sentence: subject + context, e.g. Mann in Boxershorts auf beigem Sofa",',
    '  "imageCategory": "store_hero|lifestyle|product_showcase|category_tile|benefit_graphic|social_proof|brand_story|icon_graphic|ugc|video_thumbnail",',
    '  "dominantColors": ["#hex1", "#hex2", "#hex3"],',
    '  "textOnImage": "exact visible text, or empty string",',
    '  "elements": ["person", "product", "logo", "cta_button", "icon", "illustration", "badge"],',
    '  "brandingElements": "logos, badges, seals — or empty string",',
    '  "designPatterns": ["e.g. text-on-dark, product-cutout, gradient-overlay, lifestyle-background"]',
    '}',
  ].join('\n');

  // Try with image URL first, fall back to download+base64
  var analysis;
  try {
    analysis = await callGeminiWithUrl(prompt, imageUrl);
  } catch (e) {
    analysis = await callGeminiWithDownload(prompt, imageUrl);
  }

  analysis.url = imageUrl;
  return analysis;
}

async function callGeminiWithUrl(prompt, imageUrl) {
  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { file_data: { mime_type: 'image/jpeg', file_uri: imageUrl } },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
  };

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) throw new Error('Gemini URL approach failed: ' + resp.status);

  return parseGeminiResponse(resp);
}

async function callGeminiWithDownload(prompt, imageUrl) {
  var imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error('Failed to download image');

  var buffer = await imgResp.arrayBuffer();
  var base64 = Buffer.from(buffer).toString('base64');
  var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';

  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 800 },
  };

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('Gemini download approach failed: ' + resp.status + ' ' + err.slice(0, 200));
  }

  return parseGeminiResponse(resp);
}

async function parseGeminiResponse(resp) {
  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  try {
    var s = text.indexOf('{');
    var e = text.lastIndexOf('}');
    if (s >= 0 && e > s) {
      return JSON.parse(text.slice(s, e + 1));
    }
  } catch (err) { /* fall through */ }

  return {
    summary: text.slice(0, 300),
    imageCategory: 'unknown',
    dominantColors: [],
    elements: [],
  };
}
