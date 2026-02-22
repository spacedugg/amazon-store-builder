var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var DATASET_ID = 'gd_l7q7dkf244hwjntr0';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : req.query;
  var keyword = body.keyword;
  var domain = body.domain || 'https://www.amazon.de';
  var limit = parseInt(body.limit) || 50;
  var pages = parseInt(body.pages) || 5;

  if (!keyword) return res.status(400).json({ error: 'Missing keyword' });
  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  try {
    var url = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + DATASET_ID + '&include_errors=true&type=discover_new&discover_by=keyword&limit_per_input=' + limit;

    var resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keyword: keyword,
        url: domain,
        pages_to_search: pages,
      }]),
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
}
