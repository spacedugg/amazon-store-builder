import { uid, LAYOUTS, REFERENCE_STORES, STORE_PRINCIPLES, MODULE_BAUKASTEN, PRODUCT_COMPLEXITY } from './constants';

var ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

// ─── CLAUDE API CALL ───
async function callClaude(systemPrompt, userPrompt, maxTokens) {
  if (!ANTHROPIC_KEY) throw new Error('VITE_ANTHROPIC_API_KEY not configured');
  var resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens || 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('Claude API error: ' + resp.status + ' ' + err);
  }
  var data = await resp.json();
  var text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
  return text;
}

function extractJSON(text) {
  var s = text.indexOf('{');
  var e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON found in AI response');
  return JSON.parse(text.slice(s, e + 1));
}

// ─── STEP 1: ANALYSIS & PAGE STRUCTURE ───
export async function aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions) {
  var productList = products.map(function(p) {
    return {
      asin: p.asin,
      name: p.name,
      brand: p.brand,
      description: (p.description || '').slice(0, 200),
      price: p.price,
      rating: p.rating,
      reviews: p.reviews,
      categories: p.categories,
    };
  });

  var system = [
    'You are an expert Amazon Brand Store strategist who has analyzed hundreds of top-performing Brand Stores.',
    '',
    'YOUR TASK: Analyze the product catalog and create an optimal store structure.',
    '',
    'PRODUCT COMPLEXITY CLASSIFICATION (determines store depth):',
    JSON.stringify(PRODUCT_COMPLEXITY, null, 1),
    '',
    'REFERENCE STORES for inspiration:',
    JSON.stringify(REFERENCE_STORES, null, 1),
    '',
    'PRINCIPLES:',
    '- Every ASIN must be assigned to exactly ONE category',
    '- Categories should be based on actual product types/use cases, NOT Amazon taxonomy',
    '- If products include multipacks/bundles/sets, create a "Bundles & Sparen" page',
    '- Homepage always exists as the first page',
    '- 2-8 category pages depending on product variety',
    '- Classify the product complexity: simple, medium, complex, or variantRich',
    '- The complexity classification drives how many feature/lifestyle/video modules the store needs',
    '- Brand tone must match the product category (technical, lifestyle, playful, premium, etc.)',
    '- Look at the product descriptions to determine if products have notable features worth highlighting',
    '- If products come in many variants (colors, materials, sizes), flag as variantRich',
    '',
    'Return ONLY valid JSON, no other text.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '"',
    'Marketplace: Amazon.' + marketplace,
    'Language: ' + lang,
    userInstructions ? 'User instructions: ' + userInstructions : '',
    '',
    'Products (' + products.length + '):',
    JSON.stringify(productList, null, 1),
    '',
    'Analyze the products and return this JSON structure:',
    '{',
    '  "categories": [{"name": "CategoryName", "asins": ["B0XXX", ...], "productCount": N}],',
    '  "hasBundles": true/false,',
    '  "bundleAsins": ["B0XXX"],',
    '  "suggestedPages": ["Homepage", "Category1", "Category2", ...],',
    '  "brandTone": "professional/technical" or "lifestyle/premium" or "playful/colorful" or "sporty/bold" or "clean/minimal",',
    '  "productComplexity": "simple" or "medium" or "complex" or "variantRich",',
    '  "heroMessage": "Brand slogan in ' + lang + ' (max 6 words)",',
    '  "brandStory": "One sentence brand story in ' + lang + '",',
    '  "keyFeatures": ["Feature 1", "Feature 2", ...],',
    '  "hasVariants": true/false,',
    '  "variantTypes": ["Colors", "Sizes", ...] or []',
    '}',
    '',
    'IMPORTANT:',
    '- Every ASIN from the product list must appear in exactly one category. Do not skip any ASINs.',
    '- Determine productComplexity by looking at product descriptions: simple products need less explanation, complex/technical products need more.',
    '- keyFeatures: Extract 3-5 notable product features from descriptions that could be highlighted visually.',
  ].filter(Boolean).join('\n');

  var text = await callClaude(system, user, 4000);
  var result = extractJSON(text);

  // Validate: every ASIN must be in a category
  var allAsins = products.map(function(p) { return p.asin; });
  var assignedAsins = {};
  (result.categories || []).forEach(function(cat) {
    (cat.asins || []).forEach(function(a) { assignedAsins[a] = cat.name; });
  });
  if (result.bundleAsins) {
    result.bundleAsins.forEach(function(a) { assignedAsins[a] = 'Bundles'; });
  }

  var missing = allAsins.filter(function(a) { return !assignedAsins[a]; });
  if (missing.length > 0) {
    var lastCat = result.categories[result.categories.length - 1];
    if (lastCat) {
      lastCat.asins = lastCat.asins.concat(missing);
      lastCat.productCount = lastCat.asins.length;
    } else {
      result.categories.push({ name: 'Weitere Produkte', asins: missing, productCount: missing.length });
    }
  }

  if (!result.productComplexity) result.productComplexity = 'medium';

  return result;
}

// ─── STEP 2: LAYOUT PER PAGE ───
export async function aiGeneratePageLayout(pageName, pageProducts, brand, lang, isHomepage, allCategories, analysis, userInstructions) {
  var productList = pageProducts.map(function(p) {
    return { asin: p.asin, name: p.name, price: p.price, rating: p.rating, reviews: p.reviews, description: (p.description || '').slice(0, 100) };
  });

  var validLayouts = LAYOUTS.map(function(l) {
    return l.id + ' (' + l.name + ', ' + l.cells + ' tiles)';
  });

  var complexity = PRODUCT_COMPLEXITY[analysis.productComplexity] || PRODUCT_COMPLEXITY.medium;

  var system = [
    'You are an Amazon Brand Store layout designer who creates visually compelling store pages.',
    'You think in IMAGES, not text. 90% of your modules are image-based.',
    '',
    'VALID LAYOUTS: ' + validLayouts.join(', '),
    '',
    'VALID TILE TYPES: image, product_grid, video, text, shoppable_image, image_text',
    '',
    'AVAILABLE MODULE PATTERNS (pick and combine freely):',
    JSON.stringify(MODULE_BAUKASTEN, null, 1),
    '',
    'COMPOSITION PRINCIPLES:',
    JSON.stringify(STORE_PRINCIPLES, null, 1),
    '',
    'PRODUCT COMPLEXITY: ' + analysis.productComplexity + ' — ' + complexity.description,
    'APPROACH: ' + complexity.approach,
    'TARGET MIX: ~' + complexity.imagePct + '% image, ~' + (complexity.productGridPct || 15) + '% product_grid' + (complexity.videoPct ? ', ~' + complexity.videoPct + '% video' : ''),
    '',
    'BRAND TONE: ' + (analysis.brandTone || 'professional'),
    analysis.keyFeatures ? 'KEY FEATURES TO HIGHLIGHT: ' + analysis.keyFeatures.join(', ') : '',
    analysis.hasVariants ? 'PRODUCT VARIANTS: ' + (analysis.variantTypes || []).join(', ') + ' — consider variant showcase modules' : '',
    '',
    'DIMENSION RULES:',
    '- Hero images: 3000 x 600-800',
    '- Category tiles: 3000 x 1000-1200',
    '- Lifestyle images: 3000 x 1200-1500',
    '- Brand story: 3000 x 400-600',
    '- All tiles in a row have the SAME height',
    '',
    'TEXT RULES:',
    '- textOverlay: Text designed INTO the image (headlines, slogans, category names). In store language.',
    '- ctaText: CTA button text designed into image ("Jetzt entdecken", "Shop now"). In store language.',
    '- brief: ENGLISH instructions for the designer describing image content/style/mood.',
    '- Native text module: ONLY for section headings between image blocks. NOT for marketing.',
    '',
    'CRITICAL RULES:',
    '- Number of tiles per section MUST match the layout (e.g. layout "1-1-1" = exactly 3 tiles)',
    '- ALL ASINs must be placed in exactly ONE product_grid tile',
    '- product_grid tiles need asins array. Image tiles need brief + dimensions.',
    '- Use VARIED layouts. Not all sections should be full-width. Mix 1-col, 2-col, 3-col, stacked.',
    '- Create visual rhythm: alternate between wide/narrow, image/product, lifestyle/feature.',
    '- For simple products: fewer sections, more product grids, lifestyle imagery.',
    '- For complex products: more feature modules, videos, detailed briefs.',
    '- Return ONLY valid JSON, no other text.',
  ].filter(Boolean).join('\n');

  var user = [
    'Page: "' + pageName + '" (' + (isHomepage ? 'HOMEPAGE' : 'Category subpage') + ')',
    'Brand: "' + brand + '" | Language: ' + lang,
    userInstructions ? 'User instructions: ' + userInstructions : '',
    '',
    isHomepage ? 'Categories: ' + allCategories.map(function(c) { return c.name + ' (' + c.productCount + ')'; }).join(', ') : '',
    '',
    'Products for this page (' + pageProducts.length + '):',
    JSON.stringify(productList, null, 1),
    '',
    'Return JSON:',
    '{',
    '  "sections": [',
    '    {',
    '      "layoutId": "1",',
    '      "role": "hero",',
    '      "tiles": [{',
    '        "type": "image",',
    '        "brief": "English designer instruction describing the image...",',
    '        "textOverlay": "Brand slogan in store language",',
    '        "ctaText": "CTA text or empty",',
    '        "dimensions": {"w": 3000, "h": 700}',
    '      }]',
    '    },',
    '    ... more sections',
    '  ]',
    '}',
    '',
    isHomepage
      ? [
          'For homepage: Build a compelling brand entrance.',
          '1. Hero banner with brand slogan.',
          '2. Category navigation tiles (choose layout based on number of categories).',
          '3. Optional: Bestseller product grid (top 5 by rating).',
          '4. Optional: Lifestyle/brand story section.',
          '5. Optional: Video module (if complex/technical products).',
          '6. Optional: Trust/testimonial section.',
          'Use varied layouts. Create visual interest through different section widths.',
        ].join('\n')
      : [
          'For category page "' + pageName + '": Showcase this category.',
          '1. Category hero banner (lifestyle shot of category products).',
          analysis.productComplexity === 'complex' || analysis.productComplexity === 'variantRich'
            ? '2. Feature/USP sections showing product benefits (use varied layouts like lg-2stack, 1-1, 1-1-1).'
            : '2. Optional: Lifestyle section showing products in use.',
          '3. Product grid with ALL ' + pageProducts.length + ' ASINs.',
          analysis.hasVariants ? '4. Optional: Variant showcase if products come in multiple variants.' : '',
          '5. Optional: Cross-sell section linking to related categories.',
          'Mix image and product_grid sections. Create visual breathing room.',
        ].filter(Boolean).join('\n'),
  ].filter(Boolean).join('\n');

  var text = await callClaude(system, user, 4000);
  var result = extractJSON(text);

  // Validate and fix sections
  (result.sections || []).forEach(function(sec) {
    var layout = LAYOUTS.find(function(l) { return l.id === sec.layoutId; });
    if (!layout) {
      sec.layoutId = '1';
      layout = LAYOUTS[0];
    }
    while (sec.tiles.length < layout.cells) {
      sec.tiles.push({
        type: 'image', brief: 'Additional image tile', textOverlay: '', ctaText: '',
        dimensions: { w: 3000, h: 1200 }, asins: [],
      });
    }
    if (sec.tiles.length > layout.cells) {
      sec.tiles = sec.tiles.slice(0, layout.cells);
    }
    sec.tiles.forEach(function(t) {
      if (!t.type) t.type = 'image';
      if (!t.brief) t.brief = '';
      if (!t.textOverlay) t.textOverlay = '';
      if (!t.ctaText) t.ctaText = '';
      if (!t.dimensions) t.dimensions = { w: 3000, h: 1200 };
      if (!t.asins) t.asins = [];
    });
    sec.id = uid();
  });

  return result;
}

// ─── STEP 3: AI CHAT REFINEMENT ───
export async function aiRefineStore(store, command, brand, lang) {
  var storeSnapshot = JSON.stringify({
    pages: store.pages.map(function(pg) {
      return {
        id: pg.id,
        name: pg.name,
        sections: pg.sections.map(function(sec, si) {
          return {
            index: si,
            id: sec.id,
            layoutId: sec.layoutId,
            tiles: sec.tiles.map(function(t, ti) {
              return {
                index: ti,
                type: t.type,
                textOverlay: t.textOverlay,
                brief: t.brief ? t.brief.slice(0, 80) : '',
                asins: t.asins || [],
              };
            }),
          };
        }),
      };
    }),
  });

  var validLayouts = LAYOUTS.map(function(l) { return l.id; });

  var system = [
    'You are an Amazon Brand Store editor. The user wants to modify their store layout.',
    'Current store structure:',
    storeSnapshot,
    '',
    'Valid layouts: ' + validLayouts.join(', '),
    'Valid tile types: image, product_grid, video, text, shoppable_image, image_text',
    '',
    'Available module patterns for inspiration:',
    JSON.stringify(MODULE_BAUKASTEN, null, 1),
    '',
    'Return a JSON object describing the changes to make. Possible operations:',
    '{',
    '  "operations": [',
    '    {"op": "add_section", "pageId": "...", "afterIndex": 1, "section": {layoutId, tiles: [...]}},',
    '    {"op": "remove_section", "pageId": "...", "sectionId": "..."},',
    '    {"op": "move_section", "pageId": "...", "sectionId": "...", "newIndex": 0},',
    '    {"op": "update_tile", "pageId": "...", "sectionId": "...", "tileIndex": 0, "changes": {textOverlay: "...", brief: "..."}},',
    '    {"op": "change_layout", "pageId": "...", "sectionId": "...", "newLayoutId": "1-1"},',
    '    {"op": "add_page", "page": {name: "...", sections: [...]}},',
    '    {"op": "remove_page", "pageId": "..."},',
    '    {"op": "rename_page", "pageId": "...", "newName": "..."}',
    '  ],',
    '  "explanation": "What was changed and why"',
    '}',
    '',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = 'User command: "' + command + '"\nBrand: ' + brand + ', Language: ' + lang;

  var text = await callClaude(system, user, 3000);
  return extractJSON(text);
}

// ─── APPLY REFINEMENT OPERATIONS ───
export function applyOperations(store, operations) {
  var newStore = JSON.parse(JSON.stringify(store));

  operations.forEach(function(op) {
    var page = newStore.pages.find(function(p) { return p.id === op.pageId; });

    switch (op.op) {
      case 'add_section': {
        if (!page) break;
        var newSec = op.section || {};
        newSec.id = uid();
        if (!newSec.tiles) newSec.tiles = [];
        newSec.tiles.forEach(function(t) {
          if (!t.type) t.type = 'image';
          if (!t.brief) t.brief = '';
          if (!t.textOverlay) t.textOverlay = '';
          if (!t.ctaText) t.ctaText = '';
          if (!t.dimensions) t.dimensions = { w: 3000, h: 1200 };
          if (!t.asins) t.asins = [];
        });
        var idx = typeof op.afterIndex === 'number' ? op.afterIndex + 1 : page.sections.length;
        page.sections.splice(idx, 0, newSec);
        break;
      }
      case 'remove_section': {
        if (!page) break;
        page.sections = page.sections.filter(function(s) { return s.id !== op.sectionId; });
        break;
      }
      case 'move_section': {
        if (!page) break;
        var secIdx = page.sections.findIndex(function(s) { return s.id === op.sectionId; });
        if (secIdx >= 0) {
          var sec = page.sections.splice(secIdx, 1)[0];
          page.sections.splice(op.newIndex || 0, 0, sec);
        }
        break;
      }
      case 'update_tile': {
        if (!page) break;
        var section = page.sections.find(function(s) { return s.id === op.sectionId; });
        if (section && section.tiles[op.tileIndex]) {
          Object.assign(section.tiles[op.tileIndex], op.changes || {});
        }
        break;
      }
      case 'change_layout': {
        if (!page) break;
        var sec2 = page.sections.find(function(s) { return s.id === op.sectionId; });
        if (sec2) {
          var newLayout = LAYOUTS.find(function(l) { return l.id === op.newLayoutId; });
          if (newLayout) {
            sec2.layoutId = op.newLayoutId;
            while (sec2.tiles.length < newLayout.cells) {
              sec2.tiles.push({ type: 'image', brief: '', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] });
            }
            if (sec2.tiles.length > newLayout.cells) {
              sec2.tiles = sec2.tiles.slice(0, newLayout.cells);
            }
          }
        }
        break;
      }
      case 'add_page': {
        var newPage = op.page || {};
        newPage.id = uid();
        (newPage.sections || []).forEach(function(s) {
          s.id = uid();
          (s.tiles || []).forEach(function(t) {
            if (!t.type) t.type = 'image';
            if (!t.brief) t.brief = '';
            if (!t.textOverlay) t.textOverlay = '';
            if (!t.ctaText) t.ctaText = '';
            if (!t.dimensions) t.dimensions = { w: 3000, h: 1200 };
            if (!t.asins) t.asins = [];
          });
        });
        newStore.pages.push(newPage);
        break;
      }
      case 'remove_page': {
        newStore.pages = newStore.pages.filter(function(p) { return p.id !== op.pageId; });
        break;
      }
      case 'rename_page': {
        if (page) page.name = op.newName || page.name;
        break;
      }
    }
  });

  return newStore;
}

// ─── FULL GENERATION WORKFLOW ───
export async function generateStore(asins, products, brand, marketplace, lang, userInstructions, onLog) {
  var log = onLog || function() {};

  // STEP 1: AI Analysis
  log('AI analyzing product catalog and planning store structure...');
  var analysis;
  try {
    analysis = await aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions);
  } catch (err) {
    log('AI analysis failed (' + err.message + '), falling back to deterministic grouping...');
    analysis = fallbackAnalysis(products, brand, lang);
  }

  log('Structure planned: ' + (analysis.suggestedPages || []).length + ' pages');
  log('   Brand tone: ' + (analysis.brandTone || 'professional'));
  log('   Product complexity: ' + (analysis.productComplexity || 'medium'));
  log('   Hero: "' + (analysis.heroMessage || brand) + '"');
  if (analysis.keyFeatures && analysis.keyFeatures.length > 0) {
    log('   Key features: ' + analysis.keyFeatures.join(', '));
  }
  (analysis.categories || []).forEach(function(cat) {
    log('   ' + cat.name + ': ' + (cat.asins || []).length + ' products');
  });

  // Build product lookup
  var productMap = {};
  products.forEach(function(p) { productMap[p.asin] = p; });

  var pages = [];

  // STEP 2: Generate Homepage Layout
  log('AI designing Homepage layout...');
  var homepageProducts = products.slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); }).slice(0, 10);
  try {
    var homeResult = await aiGeneratePageLayout(
      'Homepage', homepageProducts, brand, lang, true,
      analysis.categories || [], analysis, userInstructions
    );
    pages.push({ id: 'homepage', name: 'Homepage', sections: homeResult.sections || [] });
    log('Homepage: ' + (homeResult.sections || []).length + ' sections');
  } catch (err) {
    log('AI homepage failed (' + err.message + '), using fallback...');
    pages.push(fallbackHomepage(brand, lang, analysis.categories || [], products, analysis));
  }

  // STEP 3: Generate Category Pages
  var categories = analysis.categories || [];
  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var catProducts = (cat.asins || []).map(function(a) { return productMap[a]; }).filter(Boolean);
    if (catProducts.length === 0) continue;

    log('AI designing "' + cat.name + '" page (' + catProducts.length + ' products)...');
    try {
      var catResult = await aiGeneratePageLayout(
        cat.name, catProducts, brand, lang, false,
        categories, analysis, userInstructions
      );
      pages.push({ id: 'cat-' + ci, name: cat.name, sections: catResult.sections || [] });
      log(cat.name + ': ' + (catResult.sections || []).length + ' sections');
    } catch (err) {
      log('"' + cat.name + '" failed (' + err.message + '), using fallback...');
      pages.push(fallbackCategoryPage('cat-' + ci, cat.name, catProducts, lang, analysis));
    }
  }

  // STEP 4: Bundle page if needed
  if (analysis.hasBundles && analysis.bundleAsins && analysis.bundleAsins.length > 0) {
    var bundleProducts = (analysis.bundleAsins || []).map(function(a) { return productMap[a]; }).filter(Boolean);
    if (bundleProducts.length > 0) {
      log('Creating Bundles & Sparen page...');
      pages.push({
        id: 'bundles',
        name: lang === 'German' ? 'Bundles & Sparen' : 'Bundles & Savings',
        sections: [
          {
            id: uid(), layoutId: '1',
            tiles: [{
              type: 'image',
              brief: 'Bundle/savings hero banner for ' + brand + '. Show multiple products together with savings messaging. Brand tone: ' + (analysis.brandTone || 'professional') + '.',
              textOverlay: lang === 'German' ? 'Bundles & Sparen' : 'Bundles & Savings',
              ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [],
            }],
          },
          {
            id: uid(), layoutId: '1',
            tiles: [{
              type: 'product_grid', brief: '', textOverlay: '', ctaText: '',
              dimensions: { w: 3000, h: 1200 },
              asins: bundleProducts.map(function(p) { return p.asin; }),
            }],
          },
        ],
      });
      log('Bundles page: ' + bundleProducts.length + ' products');
    }
  }

  // Build ASIN info list
  var asinList = products.map(function(p) {
    var catName = '';
    (analysis.categories || []).forEach(function(cat) {
      if ((cat.asins || []).indexOf(p.asin) >= 0) catName = cat.name;
    });
    return { asin: p.asin, name: p.name, category: catName };
  });

  // Verify coverage
  var usedAsins = {};
  pages.forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      (sec.tiles || []).forEach(function(t) {
        (t.asins || []).forEach(function(a) { usedAsins[a] = true; });
      });
    });
  });
  var assignedCount = products.filter(function(p) { return usedAsins[p.asin]; }).length;
  log(assignedCount + '/' + products.length + ' ASINs assigned to product grids');

  if (assignedCount < products.length) {
    var unassigned = products.filter(function(p) { return !usedAsins[p.asin]; });
    log(unassigned.length + ' unassigned ASINs — adding to nearest category page...');
    var added = false;
    for (var pi = 1; pi < pages.length && !added; pi++) {
      var pg = pages[pi];
      for (var si = 0; si < pg.sections.length && !added; si++) {
        for (var ti = 0; ti < pg.sections[si].tiles.length; ti++) {
          if (pg.sections[si].tiles[ti].type === 'product_grid') {
            pg.sections[si].tiles[ti].asins = pg.sections[si].tiles[ti].asins.concat(
              unassigned.map(function(p) { return p.asin; })
            );
            added = true;
            break;
          }
        }
      }
    }
    if (!added && pages.length > 0) {
      var lastPage = pages[pages.length - 1];
      lastPage.sections.push({
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'product_grid', brief: '', textOverlay: '', ctaText: '',
          dimensions: { w: 3000, h: 1200 },
          asins: unassigned.map(function(p) { return p.asin; }),
        }],
      });
    }
  }

  log('Store generation complete!');

  return {
    brandName: brand,
    marketplace: marketplace,
    brandTone: analysis.brandTone || 'professional',
    productComplexity: analysis.productComplexity || 'medium',
    heroMessage: analysis.heroMessage || brand,
    brandStory: analysis.brandStory || '',
    keyFeatures: analysis.keyFeatures || [],
    products: products,
    pages: pages,
    asins: asinList,
  };
}

// ─── FALLBACK: Deterministic store building ───

function fallbackAnalysis(products, brand, lang) {
  var groups = {};
  products.forEach(function(p) {
    var cat = '';
    if (p.categories && p.categories.length > 0) {
      var cats = p.categories;
      cat = Array.isArray(cats) ? (cats[cats.length - 1] || cats[0] || '') : String(cats);
    }
    if (!cat) cat = 'Sonstige';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p.asin);
  });

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

  var categories = Object.keys(groups).map(function(name) {
    return { name: name, asins: groups[name], productCount: groups[name].length };
  });

  var suggestedPages = ['Homepage'].concat(categories.map(function(c) { return c.name; }));

  return {
    categories: categories,
    hasBundles: false,
    bundleAsins: [],
    suggestedPages: suggestedPages,
    brandTone: 'professional',
    productComplexity: 'medium',
    heroMessage: brand,
    brandStory: '',
    keyFeatures: [],
    hasVariants: false,
    variantTypes: [],
  };
}

function fallbackHomepage(brand, lang, categories, products, analysis) {
  var sections = [];
  var cta = lang === 'German' ? 'Jetzt entdecken' : 'Shop now';
  var complexity = (analysis && analysis.productComplexity) || 'medium';

  // Hero
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      brief: 'Hero banner for ' + brand + '. Lifestyle photo showcasing the brand world. Brand tone: ' + (analysis.brandTone || 'professional') + '.',
      textOverlay: (analysis && analysis.heroMessage) || brand,
      ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [],
    }],
  });

  // Category grid
  var catNames = categories.map(function(c) { return c.name; });
  if (catNames.length > 0 && catNames.length <= 4) {
    var layoutId = catNames.length === 1 ? '1' : catNames.length === 2 ? '1-1' : catNames.length === 3 ? '1-1-1' : '1-1-1-1';
    sections.push({
      id: uid(), layoutId: layoutId,
      tiles: catNames.map(function(cat) {
        return { type: 'image', brief: 'Category tile for "' + cat + '". Lifestyle photo with category name overlay.', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
      }),
    });
  } else if (catNames.length > 4) {
    var row1 = catNames.slice(0, 4);
    var row2 = catNames.slice(4, 8);
    sections.push({
      id: uid(), layoutId: '1-1-1-1',
      tiles: row1.map(function(cat) {
        return { type: 'image', brief: 'Category tile for "' + cat + '". Lifestyle photo with category name overlay.', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
      }),
    });
    if (row2.length > 0) {
      var lid = row2.length === 1 ? '1' : row2.length === 2 ? '1-1' : row2.length === 3 ? '1-1-1' : '1-1-1-1';
      sections.push({
        id: uid(), layoutId: lid,
        tiles: row2.map(function(cat) {
          return { type: 'image', brief: 'Category tile for "' + cat + '". Lifestyle photo with category name overlay.', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
        }),
      });
    }
  }

  // Bestseller grid
  var top5 = products.slice().sort(function(a, b) { return (b.rating || 0) - (a.rating || 0); }).slice(0, 5);
  if (top5.length > 0) {
    sections.push({
      id: uid(), layoutId: '1',
      tiles: [{ type: 'product_grid', brief: '', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: top5.map(function(p) { return p.asin; }) }],
    });
  }

  // Lifestyle section (for medium/complex)
  if (complexity !== 'simple') {
    sections.push({
      id: uid(), layoutId: '1-1',
      tiles: [
        { type: 'image', brief: 'Lifestyle shot showing ' + brand + ' products in real-world use. ' + (analysis.brandTone || 'Professional') + ' mood.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
        { type: 'image', brief: 'Second lifestyle image for ' + brand + '. Different use case or target audience.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
      ],
    });
  }

  // Brand story
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      brief: 'Brand story banner for ' + brand + '. Communicate brand values and identity.',
      textOverlay: lang === 'German' ? 'Unsere Geschichte' : 'Our Story',
      ctaText: '', dimensions: { w: 3000, h: 600 }, asins: [],
    }],
  });

  return { id: 'homepage', name: 'Homepage', sections: sections };
}

function fallbackCategoryPage(id, name, catProducts, lang, analysis) {
  var cta = lang === 'German' ? 'Jetzt entdecken' : 'Shop now';
  var sections = [];
  var complexity = (analysis && analysis.productComplexity) || 'medium';

  // Hero
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      brief: 'Category hero for "' + name + '". Lifestyle photo showing ' + name + ' products in use. Brand tone: ' + ((analysis && analysis.brandTone) || 'professional') + '.',
      textOverlay: name, ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [],
    }],
  });

  // Feature section for complex products
  if ((complexity === 'complex' || complexity === 'variantRich') && catProducts.length >= 3) {
    sections.push({
      id: uid(), layoutId: '1-1-1',
      tiles: [
        { type: 'image', brief: 'Feature/USP tile 1 for "' + name + '". Show a key product benefit with icon or visual.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
        { type: 'image', brief: 'Feature/USP tile 2 for "' + name + '". Second key benefit.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
        { type: 'image', brief: 'Feature/USP tile 3 for "' + name + '". Third key benefit.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
      ],
    });
  }

  // Lifestyle for medium+ complexity
  if (complexity !== 'simple' && catProducts.length >= 5) {
    sections.push({
      id: uid(), layoutId: '1',
      tiles: [{
        type: 'image',
        brief: 'Lifestyle image showing ' + name + ' products in real-world use.',
        textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1500 }, asins: [],
      }],
    });
  }

  // Product grid
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'product_grid', brief: '', textOverlay: '', ctaText: '',
      dimensions: { w: 3000, h: 1200 },
      asins: catProducts.map(function(p) { return p.asin; }),
    }],
  });

  return { id: id, name: name, sections: sections };
}
