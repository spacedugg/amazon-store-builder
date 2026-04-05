// Debug endpoint: crawl a brand store page and return raw HTML + parser diagnostics
// Usage: POST /api/debug-crawl with { url: "https://www.amazon.de/stores/page/..." }

var { getClient, migrate } = require('./_db');

var UNLOCKER_TOKEN = process.env.BRIGHTDATA_UNLOCKER_TOKEN;
var UNLOCKER_ZONE = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var url = body.url;

  if (!url) return res.status(400).json({ error: 'Missing url' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  try {
    // Crawl
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 55000);

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
      return res.status(resp.status).json({ error: 'Web Unlocker error', detail: errText.slice(0, 1000) });
    }

    var html = await resp.text();

    // Run diagnostics on the raw HTML (server-side, no DOMParser needed)
    var diag = {};
    diag.htmlSize = html.length;

    // Find var config blocks
    var configMatches = [];
    var configRegex = /var\s+config\s*=\s*\{/g;
    var m;
    while ((m = configRegex.exec(html)) !== null) {
      var context = html.slice(m.index, m.index + 200);
      configMatches.push({ pos: m.index, preview: context.replace(/\n/g, ' ').slice(0, 150) });
    }
    diag.varConfigBlocks = configMatches;

    // Find var slots blocks
    var slotsMatches = [];
    var slotsRegex = /var\s+slots\s*=\s*\[/g;
    while ((m = slotsRegex.exec(html)) !== null) {
      var ctx = html.slice(m.index, m.index + 200);
      slotsMatches.push({ pos: m.index, preview: ctx.replace(/\n/g, ' ').slice(0, 150) });
    }
    diag.varSlotsBlocks = slotsMatches;

    // Find widget containers
    var widgetContainers = [];
    var wcRegex = /id="([A-Z][A-Za-z]+-[a-zA-Z0-9]+)"/g;
    while ((m = wcRegex.exec(html)) !== null) {
      widgetContainers.push(m[1]);
    }
    diag.widgetContainers = widgetContainers;

    // Find nav items
    var navItems = (html.match(/data-testid="nav-item"/g) || []).length;
    diag.navItemCount = navItems;

    // Find store images
    var storeImgs = new Set();
    var imgRegex = /images\/S\/al-[a-f0-9-]+\/([a-f0-9-]+)/g;
    while ((m = imgRegex.exec(html)) !== null) {
      storeImgs.add(m[1]);
    }
    diag.uniqueStoreImages = storeImgs.size;
    diag.storeImageUUIDs = Array.from(storeImgs);

    // Find widgetType references
    var widgetTypes = [];
    var wtRegex = /"widgetType"\s*:\s*"([^"]+)"/g;
    while ((m = wtRegex.exec(html)) !== null) {
      widgetTypes.push(m[1]);
    }
    diag.widgetTypes = widgetTypes;

    // Find navigation links
    var navLinks = new Set();
    var nlRegex = /\/stores\/(?:[^"'\/]+\/)?page\/([A-F0-9-]{36})/gi;
    while ((m = nlRegex.exec(html)) !== null) {
      navLinks.add(m[1].toUpperCase());
    }
    diag.storePageLinks = navLinks.size;

    // Find hero image
    var heroMatch = html.match(/data-testid="hero-image"/);
    diag.hasHeroInDOM = !!heroMatch;
    var ogImg = html.match(/property="og:image"\s+content="([^"]+)"/);
    diag.ogImage = ogImg ? ogImg[1].slice(0, 80) : null;

    // Find title/brand
    var titleMatch = html.match(/<title>([^<]+)<\/title>/);
    diag.pageTitle = titleMatch ? titleMatch[1].trim() : null;

    // Save first 500 chars of each var config for inspection
    diag.configPreviews = [];
    var configFullRegex = /var\s+config\s*=\s*(\{)/g;
    while ((m = configFullRegex.exec(html)) !== null) {
      var braceStart = m.index + m[0].length - 1;
      var depth = 0;
      var end = braceStart;
      for (var i = braceStart; i < html.length && i < braceStart + 200000; i++) {
        if (html[i] === '{') depth++;
        if (html[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      var jsonStr = html.slice(braceStart, end + 1);
      try {
        var parsed = JSON.parse(jsonStr);
        diag.configPreviews.push({
          widgetType: parsed.widgetType,
          widgetId: parsed.widgetId,
          sectionType: parsed.sectionType,
          hasTiles: (parsed.tiles || []).length,
          hasNav: !!(parsed.content && parsed.content.nav),
          hasContent: !!parsed.content,
          contentKeys: parsed.content ? Object.keys(parsed.content).slice(0, 10) : [],
        });
      } catch (e) {
        diag.configPreviews.push({ error: e.message, preview: jsonStr.slice(0, 300) });
      }
    }

    return res.status(200).json({
      diagnostics: diag,
      // Include first 5000 chars of HTML for inspection
      htmlPreview: html.slice(0, 5000),
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
