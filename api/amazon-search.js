var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var DATASET_ID = 'gd_l7q7dkf244hwjntr0';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : {};
  var asins = body.asins;
  var domain = body.domain || 'https://www.amazon.de';

  if (!asins || !asins.length) return res.status(400).json({ error: 'Missing asins array' });
  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  try {
    var inputItems = asins.map(function(asin) {
      return { url: domain + '/dp/' + asin };
    });

    var url = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + DATASET_ID + '&notify=false&include_errors=true';

    // Timeout for Bright Data API: 4 minutes (large ASIN lists need more time)
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 240000);

    var resp;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: inputItems }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'Bright Data API timed out after 4 minutes. Please try again with fewer ASINs.' });
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(resp.status).json({ error: 'Bright Data error', detail: errText });
    }

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
      .filter(function(p) { return p && !p.error; })
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

    return res.status(200).json({ products: products, count: products.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
