// ─── DEBUG: Count ALL image URLs in a store page ───
// Shows what BrightData delivers and what our filters miss
// GET /api/debug-image-count?url=https://...

var UNLOCKER_TOKEN = process.env.BRIGHTDATA_UNLOCKER_TOKEN;
var UNLOCKER_ZONE = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'amz_brand_store_studio';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var storeUrl = req.query.url || req.body && req.body.url;
  if (!storeUrl) return res.status(400).json({ error: 'Missing url param' });

  try {
    // Crawl the page
    var resp = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + UNLOCKER_TOKEN,
      },
      body: JSON.stringify({ zone: UNLOCKER_ZONE, url: storeUrl, format: 'raw' }),
    });

    if (!resp.ok) return res.status(502).json({ error: 'Crawler error: ' + resp.status });
    var html = await resp.text();

    // Count ALL image URLs by pattern
    var allMediaAmazon = (html.match(/https:\/\/m\.media-amazon\.com\/images\/[^"'\s<>)]+/g) || []);
    var alImages = allMediaAmazon.filter(function(u) { return u.indexOf('/images/S/al-') >= 0; });
    var productImages = allMediaAmazon.filter(function(u) { return u.indexOf('/images/I/') >= 0; });
    var otherS = allMediaAmazon.filter(function(u) { return u.indexOf('/images/S/') >= 0 && u.indexOf('/images/S/al-') < 0; });

    // Count images in var config blocks
    var configImageUrls = [];
    var searchPos = 0;
    while (true) {
      var idx = html.indexOf('var config', searchPos);
      if (idx < 0) break;
      searchPos = idx + 10;
      var eqIdx = html.indexOf('{', idx);
      if (eqIdx < 0 || eqIdx > idx + 30) continue;

      // Extract balanced JSON
      var depth = 0, inStr = false, esc = false;
      var jsonStart = eqIdx;
      for (var i = eqIdx; i < html.length && i < eqIdx + 500000; i++) {
        var ch = html[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        if (ch === '}') { depth--; if (depth === 0) { var jsonStr = html.slice(jsonStart, i + 1); break; } }
      }

      if (jsonStr) {
        // Find all imageUrl values in this config block
        var imgMatches = jsonStr.match(/"imageUrl"\s*:\s*"([^"]+)"/g) || [];
        imgMatches.forEach(function(m) {
          var urlMatch = m.match(/"imageUrl"\s*:\s*"([^"]+)"/);
          if (urlMatch) configImageUrls.push(urlMatch[1]);
        });
        var keyMatches = jsonStr.match(/"imageKey"\s*:\s*"([^"]+)"/g) || [];
        keyMatches.forEach(function(m) {
          var keyMatch = m.match(/"imageKey"\s*:\s*"([^"]+)"/);
          if (keyMatch) configImageUrls.push('https://m.media-amazon.com/images/S/' + keyMatch[1]);
        });
      }
    }

    // Count <img> tags
    var imgTags = (html.match(/<img[^>]+src="[^"]+"/g) || []);
    var imgSrcs = imgTags.map(function(tag) {
      var m = tag.match(/src="([^"]+)"/);
      return m ? m[1] : '';
    }).filter(function(u) { return u; });

    // Dedup all
    var uniqueAll = {};
    allMediaAmazon.forEach(function(u) { uniqueAll[u.replace(/\._[A-Z0-9,%_]+_\./g, '.').replace(/\?.*$/, '')] = u; });

    // Categorize config images
    var configAl = configImageUrls.filter(function(u) { return u.indexOf('al-') >= 0; });
    var configProduct = configImageUrls.filter(function(u) { return u.indexOf('/images/I/') >= 0 || u.indexOf('/images/I/') < 0 && u.indexOf('al-') < 0; });

    return res.status(200).json({
      htmlSize: html.length,
      varConfigBlocks: (html.match(/var config/g) || []).length,
      totalMediaAmazonUrls: allMediaAmazon.length,
      uniqueUrls: Object.keys(uniqueAll).length,
      breakdown: {
        storeDesign_al: alImages.length,
        productImages_I: productImages.length,
        otherS_images: otherS.length,
      },
      configBlock: {
        totalImageUrls: configImageUrls.length,
        alPattern: configAl.length,
        other: configImageUrls.length - configAl.length,
      },
      imgTags: {
        total: imgTags.length,
        srcs: imgSrcs.length,
      },
      samples: {
        alImages: alImages.slice(0, 5),
        productImages: productImages.slice(0, 5),
        otherS: otherS.slice(0, 5),
        configNonAl: configImageUrls.filter(function(u) { return u.indexOf('al-') < 0; }).slice(0, 5),
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
