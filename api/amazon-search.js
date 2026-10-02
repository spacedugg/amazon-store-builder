var BRIGHT_DATA_TOKEN = process.env.BRIGHT_DATA_API_KEY;
var DATASET_ID = 'gd_l7q7dkf244hwjntr0';

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

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

    // Bright Data "scrape" antwortet synchron — aber nur, wenn es in etwa einer Minute fertig wird. Dauert es laenger
    // (viele ASINs, Bot-Schutz), kommt HTTP 202 mit einer snapshot_id. Frueher wurde das wie ein Erfolg behandelt:
    // ohne Produkte, ohne Fehlermeldung — „es wird nichts gezogen“. Jetzt warten wir auf den Snapshot.
    var deadline = Date.now() + 270000; // Vercel erlaubt hier 300 s
    var url = 'https://api.brightdata.com/datasets/v3/scrape?dataset_id=' + DATASET_ID + '&notify=false&include_errors=true';
    var authHeader = { 'Authorization': 'Bearer ' + BRIGHT_DATA_TOKEN };

    var resp;
    var pending = null;
    for (var attempt = 0; attempt < 2; attempt++) {
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); }, Math.max(5000, Math.min(240000, deadline - Date.now())));
      try {
        resp = await fetch(url, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader),
          body: JSON.stringify({ input: inputItems }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        if (fetchErr.name === 'AbortError') {
          return res.status(504).json({ error: 'Bright Data hat nicht rechtzeitig geantwortet. Bitte mit weniger ASINs noch einmal versuchen.' });
        }
        if (attempt === 0) { await sleep(2000); continue; }
        throw fetchErr;
      }
      clearTimeout(timeout);
      // Kurzzeitige Fehler (Ueberlastung, Bot-Schutz) einmal wiederholen
      if ((resp.status === 429 || resp.status >= 500) && attempt === 0) { await sleep(3000); continue; }
      break;
    }

    if (!resp.ok) {
      var errText = (await resp.text()).slice(0, 500);
      return res.status(resp.status).json({
        error: 'Bright Data error (HTTP ' + resp.status + ')',
        detail: errText,
        hint: resp.status === 401 || resp.status === 403
          ? 'Der Bright-Data-Schluessel (BRIGHT_DATA_API_KEY in Vercel) wird abgelehnt — abgelaufen, widerrufen oder Konto gesperrt/ohne Guthaben.'
          : undefined,
      });
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

    // HTTP 202 / {snapshot_id}: noch nicht fertig → abfragen, bis die Daten da sind
    var first = Array.isArray(rawData) ? rawData[0] : rawData;
    if (resp.status === 202 || (first && first.snapshot_id && !first.asin && !first.title)) {
      var snapshotId = first && first.snapshot_id;
      if (!snapshotId) {
        return res.status(502).json({ error: 'Bright Data hat keine Daten und keine snapshot_id geliefert', detail: rawText.slice(0, 300) });
      }
      var ready = false;
      while (Date.now() < deadline) {
        await sleep(5000);
        var pr = await fetch('https://api.brightdata.com/datasets/v3/progress/' + snapshotId, { headers: authHeader });
        if (!pr.ok) continue;
        var pj = await pr.json().catch(function() { return {}; });
        if (pj.status === 'ready') { ready = true; break; }
        if (pj.status === 'failed' || pj.status === 'cancelled') {
          return res.status(502).json({ error: 'Bright Data Auftrag ' + pj.status, detail: JSON.stringify(pj).slice(0, 300) });
        }
      }
      if (!ready) {
        return res.status(504).json({ error: 'Bright Data braucht zu lange (Auftrag ' + snapshotId + ' laeuft noch). Bitte mit weniger ASINs noch einmal versuchen.' });
      }
      var sr = await fetch('https://api.brightdata.com/datasets/v3/snapshot/' + snapshotId + '?format=json', { headers: authHeader });
      if (!sr.ok) {
        return res.status(sr.status).json({ error: 'Bright Data Ergebnis nicht abrufbar (HTTP ' + sr.status + ')', detail: (await sr.text()).slice(0, 300) });
      }
      var snapText = await sr.text();
      try {
        rawData = JSON.parse(snapText);
      } catch (e) {
        rawData = snapText.split('\n').filter(function(l) { return l.trim(); }).map(function(l) {
          try { return JSON.parse(l); } catch (e2) { return null; }
        }).filter(function(x) { return x !== null; });
      }
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

    // Eintraege, bei denen Bright Data einen Fehler meldet, nicht mehr stillschweigend verwerfen: der Aufrufer sieht warum
    var failed = rawData
      .filter(function(p) { return p && p.error; })
      .map(function(p) { return { asin: (p.input && p.input.url ? (p.input.url.match(/\/dp\/([A-Z0-9]{10})/i) || [])[1] : '') || p.asin || '', reason: String(p.error).slice(0, 200) }; });

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

    return res.status(200).json({ products: products, count: products.length, failed: failed });

  } catch (err) {
    console.error('[amazon-search] Error:', err.message, err.stack);
    return res.status(500).json({ error: err.message, stack: (err.stack || '').slice(0, 300) });
  }
};
