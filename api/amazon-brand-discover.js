var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var GLOBAL_DATASET_ID = 'gd_lwhideng15g8jg63s7';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : {};
  var brandUrl = body.brandUrl;

  if (!brandUrl) return res.status(400).json({ error: 'Missing brandUrl' });
  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  // Validate URL format (should be an Amazon seller/brand page)
  if (brandUrl.indexOf('amazon.') < 0) {
    return res.status(400).json({ error: 'URL must be an Amazon seller or brand page' });
  }

  try {
    var url = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + GLOBAL_DATASET_ID + '&notify=false&include_errors=true&type=discover_new&discover_by=brand';

    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: [{ url: brandUrl }] }),
    });

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(resp.status).json({ error: 'Bright Data error', detail: errText });
    }

    // Handle both JSON array and NDJSON
    var rawText = await resp.text();
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

    // Deduplicate by ASIN
    var seen = {};
    products = products.filter(function(p) {
      if (seen[p.asin]) return false;
      seen[p.asin] = true;
      return true;
    });

    // Extract ASINs for convenience
    var asins = products.map(function(p) { return p.asin; });

    return res.status(200).json({ products: products, asins: asins, count: products.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
