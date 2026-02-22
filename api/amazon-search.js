// Vercel Serverless Function: /api/amazon-search
// Searches Amazon via Bright Data Web Scraper API (synchronous /scrape endpoint)

const BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
const DATASET_ID = 'gd_l7q7dkf244hwjntr0';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, limit } = req.method === 'POST' ? req.body : req.query;

  if (!keyword) return res.status(400).json({ error: 'Missing keyword' });
  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  const resultLimit = parseInt(limit) || 50;

  try {
    const url = `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${DATASET_ID}&include_errors=true&type=discover_new&discover_by=keyword&limit_per_input=${resultLimit}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keyword }]),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: 'Bright Data error', detail: errText });
    }

    const data = await resp.json();
    const products = (Array.isArray(data) ? data : []).map(p => ({
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
    }));

    return res.status(200).json({ products, count: products.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
