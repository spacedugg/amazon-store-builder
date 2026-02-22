var ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// ─── BRIGHT DATA: Scrape ASINs ───
export async function scrapeAsins(asins, domain) {
  var resp = await fetch('/api/amazon-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ asins: asins, domain: domain || 'https://www.amazon.de' }),
  });
  if (!resp.ok) {
    var e = await resp.json().catch(function() { return {}; });
    throw new Error(e.error || e.detail || 'Scrape failed');
  }
  return resp.json();
}

// ─── DETERMINISTIC STORE BUILDER ───
// No AI needed for structure. Structure follows fixed best-practice rules.
// AI is only used for generating text content (briefs, overlays, CTAs).

function groupByCategory(products) {
  // Group products by their Amazon category tree or name patterns
  var groups = {};
  products.forEach(function(p) {
    // Use first category from Amazon data, or derive from product name
    var cat = '';
    if (p.categories && p.categories.length > 0) {
      // Use the most specific (last) category
      var cats = p.categories;
      cat = Array.isArray(cats) ? (cats[cats.length - 1] || cats[0] || '') : String(cats);
    }
    if (!cat) cat = 'Sonstige';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p);
  });

  // If too many small categories, merge ones with <2 products
  var catNames = Object.keys(groups);
  if (catNames.length > 8) {
    var sonstige = groups['Sonstige'] || [];
    catNames.forEach(function(c) {
      if (c !== 'Sonstige' && groups[c].length < 2) {
        sonstige = sonstige.concat(groups[c]);
        delete groups[c];
      }
    });
    if (sonstige.length > 0) groups['Sonstige'] = sonstige;
  }

  // If only 1 category (all products same), try to split by name keywords
  catNames = Object.keys(groups);
  if (catNames.length <= 1 && products.length > 5) {
    groups = splitByNameKeywords(products);
  }

  return groups;
}

function splitByNameKeywords(products) {
  // Heuristic: find common words in product names to form categories
  var keywords = {};
  products.forEach(function(p) {
    var words = p.name.toLowerCase().split(/[\s\-,]+/);
    words.forEach(function(w) {
      if (w.length > 3) {
        if (!keywords[w]) keywords[w] = [];
        keywords[w].push(p.asin);
      }
    });
  });

  // Find keywords that appear in 2+ but not all products
  var total = products.length;
  var useful = Object.keys(keywords).filter(function(k) {
    return keywords[k].length >= 2 && keywords[k].length < total * 0.8;
  });

  // Sort by frequency, pick top keywords as category names
  useful.sort(function(a, b) { return keywords[b].length - keywords[a].length; });

  var groups = {};
  var assigned = {};
  useful.slice(0, 6).forEach(function(kw) {
    var catName = kw.charAt(0).toUpperCase() + kw.slice(1);
    var catProducts = products.filter(function(p) {
      return p.name.toLowerCase().indexOf(kw) >= 0 && !assigned[p.asin];
    });
    if (catProducts.length >= 2) {
      groups[catName] = catProducts;
      catProducts.forEach(function(p) { assigned[p.asin] = true; });
    }
  });

  // Remaining products
  var remaining = products.filter(function(p) { return !assigned[p.asin]; });
  if (remaining.length > 0) {
    groups['Weitere Produkte'] = remaining;
  }

  if (Object.keys(groups).length < 2) {
    // Fallback: just split evenly
    groups = {};
    var half = Math.ceil(products.length / 2);
    groups['Bestseller'] = products.slice(0, half);
    groups['Alle Produkte'] = products.slice(half);
  }

  return groups;
}

function pickLayout(count) {
  if (count <= 1) return '1';
  if (count === 2) return '1-1';
  if (count === 3) return '1-1-1';
  if (count === 4) return '1-1-1-1';
  return '1-1-1-1'; // for 5+ we use multiple sections
}

var _uid = 0;
function uid() { _uid++; return 'id_' + _uid + '_' + Date.now().toString(36); }

export function buildStoreDeterministic(brand, lang, products, categories) {
  var pages = [];
  var catNames = Object.keys(categories);

  // ═══ HOMEPAGE ═══
  var homeSections = [];

  // 1. Hero image
  homeSections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      brief: 'Hero banner for ' + brand + '. Lifestyle photo showcasing the brand world. Professional, aspirational.',
      textOverlay: brand,
      ctaText: '',
      dimensions: { w: 3000, h: 700 },
      asins: [],
    }],
  });

  // 2. Category grid (following Kärcher/ESN pattern)
  if (catNames.length <= 4) {
    var layout = pickLayout(catNames.length);
    homeSections.push({
      id: uid(), layoutId: layout,
      tiles: catNames.map(function(cat) {
        return {
          type: 'image',
          brief: 'Category tile for "' + cat + '". Lifestyle photo showing products from this category. Category name as text overlay.',
          textOverlay: cat,
          ctaText: lang === 'German' ? 'Jetzt entdecken' : 'Shop now',
          dimensions: { w: 3000, h: 1200 },
          asins: [],
        };
      }),
    });
  } else {
    // Split into rows of 3-4 (like Kärcher 4+4 or ESN 2+2)
    var row1 = catNames.slice(0, 4);
    var row2 = catNames.slice(4, 8);
    homeSections.push({
      id: uid(), layoutId: pickLayout(row1.length),
      tiles: row1.map(function(cat) {
        return {
          type: 'image',
          brief: 'Category tile for "' + cat + '". Lifestyle photo with category name overlay.',
          textOverlay: cat,
          ctaText: lang === 'German' ? 'Jetzt entdecken' : 'Shop now',
          dimensions: { w: 3000, h: 1200 },
          asins: [],
        };
      }),
    });
    if (row2.length > 0) {
      homeSections.push({
        id: uid(), layoutId: pickLayout(row2.length),
        tiles: row2.map(function(cat) {
          return {
            type: 'image',
            brief: 'Category tile for "' + cat + '". Lifestyle photo with category name overlay.',
            textOverlay: cat,
            ctaText: lang === 'German' ? 'Jetzt entdecken' : 'Shop now',
            dimensions: { w: 3000, h: 1200 },
            asins: [],
          };
        }),
      });
    }
  }

  // 3. Bestseller product grid (top 5 by rating)
  var topProducts = products.slice().sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }).slice(0, 5);
  if (topProducts.length > 0) {
    homeSections.push({
      id: uid(), layoutId: '1',
      tiles: [{
        type: 'product_grid',
        brief: '', textOverlay: '', ctaText: '',
        dimensions: { w: 3000, h: 1200 },
        asins: topProducts.map(function(p) { return p.asin; }),
      }],
    });
  }

  // 4. Brand story image
  homeSections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      brief: 'Brand story image for ' + brand + '. Show the brand values, heritage, or mission. Professional lifestyle photo.',
      textOverlay: lang === 'German' ? 'Unsere Markengeschichte' : 'Our Brand Story',
      ctaText: '',
      dimensions: { w: 3000, h: 600 },
      asins: [],
    }],
  });

  pages.push({ id: 'homepage', name: 'Homepage', sections: homeSections });

  // ═══ CATEGORY SUBPAGES ═══
  catNames.forEach(function(cat, idx) {
    var catProducts = categories[cat];
    var catSections = [];

    // 1. Category hero
    catSections.push({
      id: uid(), layoutId: '1',
      tiles: [{
        type: 'image',
        brief: 'Category hero for "' + cat + '". Lifestyle photo showing ' + cat + ' products in use. Category name prominently displayed.',
        textOverlay: cat,
        ctaText: '',
        dimensions: { w: 3000, h: 700 },
        asins: [],
      }],
    });

    // 2. Optional lifestyle image (for categories with 5+ products)
    if (catProducts.length >= 5) {
      catSections.push({
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'image',
          brief: 'Lifestyle image showing ' + cat + ' products in real-world use. Aspirational, professional photography.',
          textOverlay: '',
          ctaText: '',
          dimensions: { w: 3000, h: 1500 },
          asins: [],
        }],
      });
    }

    // 3. Product grid with ALL ASINs
    catSections.push({
      id: uid(), layoutId: '1',
      tiles: [{
        type: 'product_grid',
        brief: '', textOverlay: '', ctaText: '',
        dimensions: { w: 3000, h: 1200 },
        asins: catProducts.map(function(p) { return p.asin; }),
      }],
    });

    pages.push({
      id: 'cat-' + idx,
      name: cat,
      sections: catSections,
    });
  });

  return { brandName: brand, pages: pages };
}

// ─── AI: Generate text content for tiles ───
export async function enrichWithAI(store, brand, lang, products) {
  if (!ANTHROPIC_KEY) return store; // Return as-is if no key

  var productSummary = products.slice(0, 20).map(function(p) {
    return p.asin + ': ' + p.name;
  }).join('\n');

  var prompt = 'Brand: "' + brand + '", Language: ' + lang + '\n';
  prompt += 'Products:\n' + productSummary + '\n\n';
  prompt += 'Generate creative text content for this brand store. Return JSON with this exact structure:\n';
  prompt += '{"heroOverlay":"...","herobrief":"...","brandStory":"...","categories":{';
  var catNames = store.pages.filter(function(p) { return p.id !== 'homepage'; }).map(function(p) { return p.name; });
  prompt += catNames.map(function(c) { return '"' + c + '":{"overlay":"...","brief":"..."}'; }).join(',');
  prompt += '}}\n\n';
  prompt += 'heroOverlay: Brand slogan/headline in ' + lang + ' (max 6 words)\n';
  prompt += 'herobrief: EN designer instruction for hero image\n';
  prompt += 'brandStory: Brand story text in ' + lang + ' (1 sentence)\n';
  prompt += 'categories: For each category, overlay (name + subtitle in ' + lang + ') and brief (EN designer instruction)\n';

  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-sonnet-4-5-20250929', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!resp.ok) return store;

    var data = await resp.json();
    var txt = (data.content || []).map(function(b) { return b.text || ''; }).join('');
    var s = txt.indexOf('{'), e = txt.lastIndexOf('}');
    if (s < 0) return store;

    var content = JSON.parse(txt.slice(s, e + 1));

    // Apply text content to store
    var homepage = store.pages[0];
    if (homepage && homepage.sections[0] && homepage.sections[0].tiles[0]) {
      if (content.heroOverlay) homepage.sections[0].tiles[0].textOverlay = content.heroOverlay;
      if (content.herobrief) homepage.sections[0].tiles[0].brief = content.herobrief;
    }
    // Brand story (last section of homepage)
    var lastSec = homepage.sections[homepage.sections.length - 1];
    if (lastSec && lastSec.tiles[0] && content.brandStory) {
      lastSec.tiles[0].textOverlay = content.brandStory;
    }
    // Category content
    if (content.categories) {
      store.pages.forEach(function(pg) {
        if (pg.id === 'homepage') return;
        var catContent = content.categories[pg.name];
        if (catContent && pg.sections[0] && pg.sections[0].tiles[0]) {
          if (catContent.overlay) pg.sections[0].tiles[0].textOverlay = catContent.overlay;
          if (catContent.brief) pg.sections[0].tiles[0].brief = catContent.brief;
        }
      });
    }
  } catch (err) {
    console.log('AI enrichment failed:', err.message);
  }

  return store;
}
