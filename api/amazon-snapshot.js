// Vercel Serverless Function: /api/amazon-snapshot
// Polls Bright Data snapshot by ID — used if main search times out

const BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing snapshot id' });
  if (!BRIGHT_DATA_TOKEN) return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });

  try {
    const snapResp = await fetch(
      `https://api.brightdata.com/datasets/v3/snapshot/${id}?format=json`,
      { headers: { 'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}` } }
    );

    if (snapResp.status === 202) {
      return res.status(202).json({ status: 'processing' });
    }

    if (snapResp.status === 200) {
      const data = await snapResp.json();
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
        availability: p.availability || '',
      }));
      return res.status(200).json({ products, count: products.length });
    }

    return res.status(snapResp.status).json({ error: 'Snapshot error', status: snapResp.status });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
