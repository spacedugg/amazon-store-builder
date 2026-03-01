var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var GLOBAL_DATASET_ID = 'gd_lwhideng15g8jg63s7';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : {};
  var brandUrl = body.brandUrl;
  var snapshotId = body.snapshotId || req.query.snapshotId;

  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  // ─── POLL MODE: Check snapshot status and fetch results ───
  if (snapshotId) {
    try {
      // Check progress
      var progressResp = await fetch(
        'https://api.brightdata.com/datasets/v3/progress/' + snapshotId,
        { headers: { 'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN } }
      );

      if (progressResp.status === 200) {
        var progressData = await progressResp.json();
        var status = progressData.status;

        if (status === 'running' || status === 'pending') {
          return res.status(202).json({ status: 'running', snapshotId: snapshotId, message: 'Discovery in progress...' });
        }

        if (status === 'failed' || status === 'cancelled') {
          return res.status(500).json({ error: 'Discovery job ' + status, snapshotId: snapshotId });
        }
      }

      // Status is ready or we got a non-200 (might mean data is ready) — try fetching results
      var dataResp = await fetch(
        'https://api.brightdata.com/datasets/v3/snapshot/' + snapshotId + '?format=json',
        { headers: { 'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN } }
      );

      if (!dataResp.ok) {
        var errText = await dataResp.text();
        // If 404 or similar, job might still be processing
        if (dataResp.status === 404) {
          return res.status(202).json({ status: 'running', snapshotId: snapshotId, message: 'Waiting for results...' });
        }
        return res.status(dataResp.status).json({ error: 'Failed to fetch results', detail: errText });
      }

      var rawText = await dataResp.text();
      var products = parseProducts(rawText);

      return res.status(200).json({ status: 'complete', products: products, asins: products.map(function(p) { return p.asin; }), count: products.length });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── TRIGGER MODE: Start new discovery job ───
  if (!brandUrl) return res.status(400).json({ error: 'Missing brandUrl' });

  if (brandUrl.indexOf('amazon.') < 0) {
    return res.status(400).json({ error: 'URL must be an Amazon seller or brand page' });
  }

  try {
    // Trigger async discovery (do NOT wait for results)
    var triggerUrl = 'https://api.brightdata.com/datasets/v3/trigger?dataset_id=' + GLOBAL_DATASET_ID + '&include_errors=true&type=discover_new&discover_by=brand';

    var resp = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ url: brandUrl }]),
    });

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(resp.status).json({ error: 'Bright Data error', detail: errText });
    }

    var triggerResult = await resp.json();
    var newSnapshotId = triggerResult.snapshot_id;

    if (!newSnapshotId) {
      return res.status(500).json({ error: 'No snapshot_id returned from Bright Data', raw: triggerResult });
    }

    return res.status(202).json({ status: 'triggered', snapshotId: newSnapshotId, message: 'Brand discovery started. Poll with snapshotId to check progress.' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

function parseProducts(rawText) {
  var rawData;
  try {
    rawData = JSON.parse(rawText);
  } catch (e) {
    rawData = rawText
      .split('\n')
      .filter(function(line) { return line.trim().length > 0; })
      .map(function(line) {
        try { return JSON.parse(line); }
        catch (e2) { return null; }
      })
      .filter(function(item) { return item !== null; });
  }

  if (!Array.isArray(rawData)) rawData = [rawData];

  var products = rawData
    .filter(function(p) { return p && !p.error && p.asin; })
    .map(function(p) {
      return {
        asin: p.asin || '',
        name: p.title || p.name || '',
        brand: p.brand || '',
        description: p.description || p.product_overview || '',
        price: p.final_price || p.initial_price || 0,
        currency: p.currency || 'EUR',
        rating: p.rating || 0,
        reviews: p.reviews_count || 0,
        image: p.image || p.main_image || '',
        categories: p.categories || [],
        url: p.url || '',
      };
    });

  // Deduplicate
  var seen = {};
  return products.filter(function(p) {
    if (seen[p.asin]) return false;
    seen[p.asin] = true;
    return true;
  });
}
