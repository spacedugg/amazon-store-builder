// Crawl a complete Amazon Brand Store and analyze all images with Gemini Vision
// Usage: node scripts/analyze-store.js <store-url>

var UNLOCKER_TOKEN = '9589c001-7f88-4b6a-95fc-c613b2811c52';
var UNLOCKER_ZONE = 'amz_brand_store_studio';
var GEMINI_KEY = 'AIzaSyDQHpBQ8uPmgOk04Hxtd7O7yXhEbzBQ3dg';
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

var storeUrl = process.argv[2] || 'https://www.amazon.de/stores/page/3955CCD4-902C-4679-9265-DEC4FCBAA8C8';

// Clean URL
try {
  var u = new URL(storeUrl);
  ['lp_asin', 'lp_context_asin', 'lp_context_query', 'visitId', 'ref', 'store_ref', 'ingress', 'byline_logo_guardrail_passed'].forEach(function(p) { u.searchParams.delete(p); });
  storeUrl = u.toString();
} catch (e) {}

console.log('=== AMAZON BRAND STORE ANALYZER ===');
console.log('URL:', storeUrl);
console.log('');

async function crawlPage(url) {
  console.log('  Crawling:', url.substring(0, 80) + '...');
  var resp = await fetch('https://api.brightdata.com/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + UNLOCKER_TOKEN },
    body: JSON.stringify({ zone: UNLOCKER_ZONE, url: url, format: 'raw' }),
  });
  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('Crawl failed (' + resp.status + '): ' + err.substring(0, 200));
  }
  var html = await resp.text();
  console.log('  → ' + html.length + ' chars');
  return html;
}

// Extract var config blocks from HTML (main data source)
function extractConfigs(html) {
  var configs = [];
  var regex = /var\s+config\s*=\s*\{/g;
  var match;
  while ((match = regex.exec(html)) !== null) {
    var start = match.index + match[0].length - 1;
    var depth = 1; var i = start + 1;
    while (i < html.length && depth > 0) {
      if (html[i] === '{') depth++;
      if (html[i] === '}') depth--;
      i++;
    }
    try {
      var json = html.substring(start, i);
      configs.push(JSON.parse(json));
    } catch (e) {}
  }
  return configs;
}

// Extract navigation from config
function extractNav(configs, baseUrl) {
  var nav = [];
  var seen = {};
  configs.forEach(function(cfg) {
    if (cfg.content && cfg.content.navigationItems) {
      cfg.content.navigationItems.forEach(function(item) {
        var text = (item.text || item.title || '').trim();
        var link = item.link || item.url || '';
        if (link && link.indexOf('/page/') >= 0 && !seen[link]) {
          // Build full URL
          try {
            var full = link.startsWith('http') ? link : new URL(link, baseUrl).toString();
            seen[full] = true;
            nav.push({ name: text, url: full });
          } catch (e) {}
        }
      });
    }
    // Also check for tabs/pages in different config formats
    if (cfg.tabs) {
      cfg.tabs.forEach(function(tab) {
        var text = tab.text || tab.title || '';
        var link = tab.url || tab.link || '';
        if (link && !seen[link]) {
          try {
            var full = link.startsWith('http') ? link : new URL(link, baseUrl).toString();
            seen[full] = true;
            nav.push({ name: text, url: full });
          } catch (e) {}
        }
      });
    }
  });
  return nav;
}

// Extract all images from HTML
function extractImages(html) {
  var images = [];
  var seen = {};
  // From config blocks
  var imgRegex = /(?:imageUrl|imageKey|heroImageUrl|backgroundImageUrl|src)["']?\s*[:=]\s*["']([^"']+(?:\.jpg|\.png|\.webp|\.jpeg)[^"']*)/gi;
  var m;
  while ((m = imgRegex.exec(html)) !== null) {
    var url = m[1];
    if (url.indexOf('amazon') >= 0 && !seen[url] && url.indexOf('/images/G/') < 0 && url.indexOf('pixel') < 0 && url.indexOf('transparent') < 0) {
      seen[url] = true;
      images.push(url);
    }
  }
  // From img tags
  var imgTagRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((m = imgTagRegex.exec(html)) !== null) {
    var url = m[1];
    if (url.indexOf('images/I/') >= 0 && !seen[url]) {
      seen[url] = true;
      images.push(url);
    }
  }
  return images;
}

// Extract sections/modules structure
function extractSections(html) {
  var sections = [];
  var configs = extractConfigs(html);
  configs.forEach(function(cfg) {
    if (cfg.content && cfg.content.widgetType) {
      var sec = {
        type: cfg.content.widgetType || 'unknown',
        sectionType: cfg.content.sectionType || '',
        tileCount: 0,
        tiles: [],
        images: [],
        texts: [],
        hasVideo: false,
        hasProductGrid: false,
      };
      // Count tiles
      if (cfg.content.tiles) {
        sec.tileCount = cfg.content.tiles.length;
        cfg.content.tiles.forEach(function(tile) {
          var t = { type: 'image' };
          if (tile.image || tile.imageUrl) {
            t.imageUrl = tile.image || tile.imageUrl;
            sec.images.push(t.imageUrl);
          }
          if (tile.shoppable) t.type = 'shoppable_image';
          if (tile.video || tile.videoUrl) { t.type = 'video'; sec.hasVideo = true; }
          if (tile.text || tile.headline) {
            sec.texts.push(tile.text || tile.headline);
          }
          sec.tiles.push(t);
        });
      }
      if (cfg.content.products || cfg.content.asinList) {
        sec.hasProductGrid = true;
      }
      sections.push(sec);
    }
  });
  return sections;
}

// Analyze images with Gemini Vision
async function analyzeImagesWithGemini(imageUrls, brandName) {
  console.log('  Sending ' + imageUrls.length + ' images to Gemini Vision...');

  // Download and convert to base64
  var imageParts = [];
  for (var i = 0; i < Math.min(imageUrls.length, 15); i++) {
    try {
      var resp = await fetch(imageUrls[i]);
      if (!resp.ok) continue;
      var buffer = await resp.arrayBuffer();
      var base64 = Buffer.from(buffer).toString('base64');
      var mimeType = resp.headers.get('content-type') || 'image/jpeg';
      imageParts.push({ inline_data: { mime_type: mimeType, data: base64 } });
    } catch (e) { /* skip */ }
  }

  if (imageParts.length === 0) return null;
  console.log('  → ' + imageParts.length + ' images downloaded');

  var prompt = [
    'Analyze these ' + imageParts.length + ' images from the Amazon Brand Store of "' + brandName + '".',
    '',
    'For EACH image, describe:',
    '1. BACKGROUND: What is the background? (solid color + hex estimate, gradient, photo, pattern, texture)',
    '2. CONTENT: What is shown? (product, text, lifestyle scene, icons, badges, ingredients)',
    '3. STYLE: Visual treatment (clean/minimal, busy/detailed, photographic, illustrated, flat design)',
    '4. TEXT: Any text visible and how it is styled (bold, thin, uppercase, color)',
    '5. TILE TYPE: Is this a hero banner, category tile, product shot, benefit tile, lifestyle image, or text graphic?',
    '',
    'Then provide an OVERALL ANALYSIS:',
    '- How do backgrounds VARY across the store? List all different background treatments.',
    '- What creates the visual CONSISTENCY despite background variation?',
    '- What is the background RHYTHM (e.g. light → photo → dark → light)?',
    '- How many distinct background colors/styles are used?',
    '- Which sections share backgrounds, which differ?',
    '',
    'Return valid JSON:',
    '{',
    '  "images": [{ "index": 1, "background": "...", "content": "...", "style": "...", "text": "...", "tileType": "..." }, ...],',
    '  "overallAnalysis": {',
    '    "backgroundVariation": "description of how backgrounds vary",',
    '    "backgroundTypes": ["list of distinct background treatments used"],',
    '    "rhythm": "description of the visual rhythm/alternation pattern",',
    '    "consistencyFactors": ["what makes it feel cohesive despite variation"],',
    '    "distinctBackgroundCount": N',
    '  }',
    '}',
  ].join('\n');

  var parts = [{ text: prompt }].concat(imageParts);
  var reqBody = {
    contents: [{ parts: parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
  };

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
  });

  if (!resp.ok) {
    var err = await resp.text();
    console.log('  Gemini error:', resp.status, err.substring(0, 200));
    return null;
  }

  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  try {
    var jsonStart = text.indexOf('{');
    var jsonEnd = text.lastIndexOf('}');
    return JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  } catch (e) {
    console.log('  Gemini returned non-JSON:', text.substring(0, 300));
    return { raw: text };
  }
}

// Main
async function main() {
  try {
    // Step 1: Crawl main page
    console.log('STEP 1: Crawling main page...');
    var mainHtml = await crawlPage(storeUrl);

    var configs = extractConfigs(mainHtml);
    console.log('  Found ' + configs.length + ' config blocks');

    // Extract brand name
    var brandName = '';
    var brandMatch = mainHtml.match(/stores\/([^/]+)\/page/);
    if (brandMatch) brandName = decodeURIComponent(brandMatch[1]);
    if (!brandName) {
      configs.forEach(function(cfg) {
        if (cfg.content && cfg.content.brandName && !brandName) brandName = cfg.content.brandName;
      });
    }
    console.log('  Brand:', brandName || 'Unknown');

    // Step 2: Extract navigation
    console.log('\nSTEP 2: Extracting navigation...');
    var nav = extractNav(configs, storeUrl);
    console.log('  Found ' + nav.length + ' subpages:');
    nav.forEach(function(n) { console.log('    - ' + n.name + ': ' + n.url.substring(0, 60) + '...'); });

    // Step 3: Extract sections from main page
    console.log('\nSTEP 3: Analyzing main page structure...');
    var mainSections = extractSections(mainHtml);
    var mainImages = extractImages(mainHtml);
    console.log('  Sections: ' + mainSections.length);
    console.log('  Images found: ' + mainImages.length);
    mainSections.forEach(function(s, i) {
      console.log('    Section ' + (i+1) + ': ' + s.type + (s.sectionType ? '/' + s.sectionType : '') + ' — ' + s.tileCount + ' tiles' + (s.hasVideo ? ' [VIDEO]' : '') + (s.hasProductGrid ? ' [PRODUCT_GRID]' : ''));
    });

    // Step 4: Crawl subpages
    console.log('\nSTEP 4: Crawling subpages...');
    var allImages = mainImages.slice();
    var allSections = [{ page: 'Homepage', sections: mainSections }];

    for (var i = 0; i < Math.min(nav.length, 10); i++) {
      try {
        await new Promise(function(r) { setTimeout(r, 2000); }); // Rate limit
        var subHtml = await crawlPage(nav[i].url);
        var subSections = extractSections(subHtml);
        var subImages = extractImages(subHtml);
        allImages = allImages.concat(subImages);
        allSections.push({ page: nav[i].name, sections: subSections });
        console.log('    ' + nav[i].name + ': ' + subSections.length + ' sections, ' + subImages.length + ' images');
      } catch (e) {
        console.log('    ' + nav[i].name + ': FAILED - ' + e.message);
      }
    }

    // Deduplicate images
    var uniqueImages = [];
    var seenImg = {};
    allImages.forEach(function(img) {
      if (!seenImg[img]) { uniqueImages.push(img); seenImg[img] = true; }
    });
    console.log('\n  Total unique images: ' + uniqueImages.length);

    // Step 5: Analyze images with Gemini
    console.log('\nSTEP 5: Gemini Vision analysis...');
    var geminiResult = await analyzeImagesWithGemini(uniqueImages, brandName);

    if (geminiResult) {
      console.log('\n=== GEMINI ANALYSIS RESULT ===');
      console.log(JSON.stringify(geminiResult, null, 2));
    }

    // Summary
    console.log('\n=== STORE SUMMARY ===');
    console.log('Brand: ' + brandName);
    console.log('Pages: ' + (1 + nav.length));
    console.log('Total sections: ' + allSections.reduce(function(s, p) { return s + p.sections.length; }, 0));
    console.log('Total unique images: ' + uniqueImages.length);
    allSections.forEach(function(p) {
      console.log('\n  Page: ' + p.page);
      p.sections.forEach(function(s, i) {
        console.log('    ' + (i+1) + '. ' + s.type + ' — ' + s.tileCount + ' tiles' + (s.texts.length > 0 ? ' — text: "' + s.texts[0].substring(0, 50) + '"' : ''));
      });
    });

  } catch (err) {
    console.error('FATAL:', err.message);
    console.error(err.stack);
  }
}

main();
