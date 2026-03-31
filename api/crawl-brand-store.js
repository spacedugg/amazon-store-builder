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

  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });
  if (!UNLOCKER_TOKEN) return res.status(500).json({ error: 'BRIGHTDATA_UNLOCKER_TOKEN not configured' });

  // Validate: must be an Amazon URL with a store page path
  if (url.indexOf('amazon.') < 0) {
    return res.status(400).json({ error: 'URL must be an Amazon page' });
  }
  // Must contain /stores/ or /stores/page/ pattern
  if (url.indexOf('/stores') < 0 && url.indexOf('/stores/page/') < 0) {
    return res.status(400).json({ error: 'URL must be an Amazon Brand Store page (containing /stores/)' });
  }

  // Clean tracking parameters
  try {
    var urlObj = new URL(url);
    ['lp_asin', 'lp_context_asin', 'lp_context_query', 'visitId', 'ref',
     'store_ref', 'ingress', 'byline_logo_guardrail_passed'].forEach(function(p) {
      urlObj.searchParams.delete(p);
    });
    url = urlObj.toString();
  } catch (e) { /* keep original if URL parsing fails */ }

  try {
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 55000); // 55s (Vercel max 60s)

    // Request with JavaScript rendering enabled.
    // Amazon Brand Stores lazy-load most content below the fold.
    // We need the browser to scroll down and wait for all widgets to render.
    var requestBody = {
      zone: UNLOCKER_ZONE,
      url: url,
      format: 'raw',
    };

    // If the zone supports JavaScript rendering instructions,
    // add scroll + wait to trigger lazy-loading of all store modules.
    // This works with Web Unlocker zones that have "Browser (JavaScript rendering)" enabled.
    requestBody.js_render = true;
    requestBody.js_instructions = [
      // Wait for initial page load
      { wait: 2000 },
      // Scroll to bottom to trigger lazy-loading of all modules
      { scroll_y: 2000 },
      { wait: 1500 },
      { scroll_y: 5000 },
      { wait: 1500 },
      { scroll_y: 10000 },
      { wait: 2000 },
      // Scroll back to top (ensures all content is in DOM)
      { scroll_y: 0 },
      { wait: 500 },
    ];

    var resp = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + UNLOCKER_TOKEN,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(resp.status).json({
        error: 'Web Unlocker error',
        status: resp.status,
        detail: errText.slice(0, 500),
      });
    }

    var html = await resp.text();

    if (!html || html.length < 1000) {
      return res.status(502).json({ error: 'Empty or too short response from Web Unlocker' });
    }

    return res.status(200).json({
      html: html,
      url: url,
      size: html.length,
    });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Web Unlocker request timed out after 55 seconds' });
    }
    return res.status(500).json({ error: err.message });
  }
};
