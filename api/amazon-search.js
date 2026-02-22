// Vercel Serverless Function: /api/amazon-search
// Searches Amazon for products by brand keyword via Bright Data Web Scraper API
// Then polls for results and returns them

const BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
// Amazon Products scraper dataset ID
const DATASET_ID = 'gd_l7q7dkf244hwjntr0';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { keyword, domain, limit } = req.method === 'POST' ? req.body : req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing keyword parameter' });
  }
  if (!BRIGHT_DATA_TOKEN) {
    return res.status(500).json({ error: 'BRIGHT_DATA_API_KEY not configured' });
  }

  const amazonDomain = domain || 'https://www.amazon.de';
  const resultLimit = parseInt(limit) || 50;

  try {
    // Step 1: Trigger collection
    const triggerUrl = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET_ID}&type=discover_new&discover_by=keyword&limit_per_input=${resultLimit}`;

    const triggerResp = await fetch(triggerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ keyword, url: amazonDomain }]),
    });

    if (!triggerResp.ok) {
      const errText = await triggerResp.text();
      return res.status(triggerResp.status).json({ error: 'Bright Data trigger failed', detail: errText });
    }

    const triggerData = await triggerResp.json();
    const snapshotId = triggerData.snapshot_id;

    if (!snapshotId) {
      return res.status(500).json({ error: 'No snapshot_id returned', data: triggerData });
    }

    // Step 2: Poll for results (max 90 seconds)
    const snapshotUrl = `https://api.brightdata.com/datasets/v3/snapshot/${snapshotId}?format=json`;
    const maxAttempts = 30;
    const pollInterval = 3000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(r => setTimeout(r, pollInterval));

      const snapResp = await fetch(snapshotUrl, {
        headers: { 'Authorization': `Bearer ${BRIGHT_DATA_TOKEN}` },
      });

      if (snapResp.status === 200) {
        const data = await snapResp.json();
        // Normalize and return
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
        return res.status(200).json({ products, count: products.length, snapshotId });
      }

      if (snapResp.status !== 202) {
        // Not ready yet and not processing = error
        const errText = await snapResp.text();
        return res.status(500).json({ error: 'Snapshot failed', status: snapResp.status, detail: errText });
      }
      // 202 = still processing, continue polling
    }

    // Timeout — return snapshot ID so client can poll manually
    return res.status(202).json({ status: 'processing', snapshotId, message: 'Still processing. Poll /api/amazon-snapshot?id=' + snapshotId });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
