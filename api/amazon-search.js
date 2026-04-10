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

    // DEBUG MODE: Return raw BrightData response to see all available fields
    if (body.debug) {
      return res.status(200).json({
        debug: true,
        rawFieldNames: rawData[0] ? Object.keys(rawData[0]) : [],
        rawSample: rawData[0] || null,
        totalItems: rawData.length,
      });
    }

    var products = rawData
      .filter(function(p) { return p && !p.error; })
      .map(function(p) {
        // All 7 product images (MAIN + PT01-PT06)
        var images = [];
        if (p.images && Array.isArray(p.images)) {
          images = p.images.map(function(img) {
            if (typeof img === 'string') return { url: img, alt: '' };
            return { url: img.url || img.link || img.src || '', alt: img.alt || '' };
          }).filter(function(img) { return img.url; });
        } else if (p.image || p.image_url) {
          images = [{ url: p.image || p.image_url, alt: '' }];
        }

        // Bullet points / features
        var bulletPoints = [];
        if (p.features && Array.isArray(p.features)) {
          bulletPoints = p.features;
        } else if (p.feature_bullets && Array.isArray(p.feature_bullets)) {
          bulletPoints = p.feature_bullets;
        }

        // A+ Content images (from_the_brand + product_description)
        var aPlusImages = [];
        if (p.from_the_brand && Array.isArray(p.from_the_brand)) {
          p.from_the_brand.forEach(function(url) {
            if (typeof url === 'string') aPlusImages.push({ url: url, section: 'from_the_brand' });
          });
        }
        if (p.product_description && Array.isArray(p.product_description)) {
          p.product_description.forEach(function(item) {
            if (item && item.url && item.type === 'image') aPlusImages.push({ url: item.url, section: 'product_description' });
          });
        }

        return {
          asin: p.asin || '',
          name: p.title || '',
          brand: p.brand || '',
          description: p.description || '',
          rating: p.rating || 0,
          reviews: p.reviews_count || 0,
          image: p.image || p.image_url || '',
          images: images,
          bulletPoints: bulletPoints,
          categories: p.categories || [],
          url: p.url || '',
          // Bestseller data
          bestsellerRank: p.root_bs_rank || null,
          bestsellerCategory: p.root_bs_category || null,
          subcategoryRank: p.bs_rank || null,
          subcategoryName: p.bs_category || null,
          boughtPastMonth: p.bought_past_month || null,
          // A+ Content
          hasAPlus: p.plus_content || false,
          aPlusImages: aPlusImages,
          // Additional useful data
          hasVideo: p.video || false,
          videoUrls: p.videos || [],
          topReview: p.top_review || null,
          customerSays: p.customer_says || null,
          productDetails: p.product_details || [],
          storeUrl: p.store_url || null,
        };
      });
      });

    return res.status(200).json({ products: products, count: products.length });

  } catch (err) {
    console.error('[amazon-search] Error:', err.message, err.stack);
    return res.status(500).json({ error: err.message, stack: (err.stack || '').slice(0, 300) });
  }
};
