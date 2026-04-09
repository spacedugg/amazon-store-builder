// ─── CRAWL STORE NAVIGATION ───
// Crawls only the main page, extracts subpage URLs from navigation.
// Fast (~10s), no Gemini calls.
//
// POST /api/crawl-store-nav
// Body: { storeUrl, brandName }
// Returns: { brandName, storeUrl, pages: [{ url, name, pageId }] }

var UNLOCKER_TOKEN = process.env.BRIGHTDATA_UNLOCKER_TOKEN;
var UNLOCKER_ZONE = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  var storeUrl = body.storeUrl;
  var brandName = body.brandName || 'Unknown';

  if (!storeUrl) return res.status(400).json({ error: 'Missing storeUrl' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  try {
    var html = await crawlPage(storeUrl);
    if (!html || html.length < 500) {
      return res.status(502).json({ error: 'Empty response from crawler (' + (html ? html.length : 0) + ' chars)' });
    }

    var subpages = extractNavFromConfig(html, storeUrl);

    // Build page list: main page + all subpages
    var pages = [{ url: storeUrl, name: 'Startseite', pageId: 'main' }];
    for (var i = 0; i < subpages.length; i++) {
      pages.push({ url: subpages[i].url, name: subpages[i].name, pageId: subpages[i].pageId || ('sub-' + i) });
    }

    return res.status(200).json({ brandName: brandName, storeUrl: storeUrl, pages: pages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

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
      if (pageId === mainPageId || seen[pageId]) continue;
      var entry = nav[keys[j]];
      if (!entry || !entry.href) continue;
      seen[pageId] = true;
      var absUrl = entry.href.indexOf('http') === 0 ? entry.href : amazonOrigin + entry.href;
      try {
        var u = new URL(absUrl);
        ['lp_asin', 'lp_context_asin', 'visitId', 'ref', 'store_ref', 'ingress'].forEach(function(p) { u.searchParams.delete(p); });
        absUrl = u.toString();
      } catch (e) {}
      urls.push({ url: absUrl, name: entry.title || 'Subpage', pageId: pageId });
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
      urls.push({ url: match[0].split('?')[0], name: 'Subpage', pageId: pid });
    }
  }
  return urls;
}

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
      if (data.widgetType || data.sectionType || data.widgetId || data.content) configs.push(data);
    } catch (e) {}
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
