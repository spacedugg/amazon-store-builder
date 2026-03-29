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

  // Validate: must be an Amazon Brand Store URL
  if (url.indexOf('amazon.') < 0 || url.indexOf('/stores') < 0) {
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
