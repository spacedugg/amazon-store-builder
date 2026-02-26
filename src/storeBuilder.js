import { uid, LAYOUTS, REFERENCE_STORES, STORE_PRINCIPLES, MODULE_BAUKASTEN, PRODUCT_COMPLEXITY, COMPLEXITY_LEVELS, CATEGORY_STYLE_HINTS } from './constants';

var ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
var PRIMARY_MODEL = 'claude-opus-4-6';
var FALLBACK_MODEL = 'claude-sonnet-4-6';

// ─── CLAUDE API CALL (with retry + fallback) ───
async function callClaude(systemPrompt, userPrompt, maxTokens) {
  if (!ANTHROPIC_KEY) throw new Error('VITE_ANTHROPIC_API_KEY not configured');

  var models = [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL];
  var delays = [2000, 4000, 0];

  for (var attempt = 0; attempt < models.length; attempt++) {
    var model = models[attempt];
    try {
      var resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens || 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (resp.status === 529 || resp.status === 503 || resp.status === 429) {
        if (attempt < models.length - 1) {
          console.warn('API ' + resp.status + ' with ' + model + ', retrying in ' + (delays[attempt] / 1000) + 's...');
          if (delays[attempt] > 0) await new Promise(function(r) { setTimeout(r, delays[attempt]); });
          continue;
        }
      }

      if (!resp.ok) {
        var err = await resp.text();
        throw new Error('Claude API error: ' + resp.status + ' ' + err);
      }

      var data = await resp.json();
      var text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
      return text;
    } catch (e) {
      if (attempt < models.length - 1 && (e.message.indexOf('529') >= 0 || e.message.indexOf('503') >= 0 || e.message.indexOf('overload') >= 0 || e.message.indexOf('fetch') >= 0)) {
        console.warn('Call failed (' + e.message + '), retrying...');
        if (delays[attempt] > 0) await new Promise(function(r) { setTimeout(r, delays[attempt]); });
        continue;
      }
      throw e;
    }
  }

  throw new Error('All API attempts failed');
}

function extractJSON(text) {
  var s = text.indexOf('{');
  var e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON found in AI response');
  return JSON.parse(text.slice(s, e + 1));
}

// ─── STEP 1: ANALYSIS & PAGE STRUCTURE ───
export async function aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions, category) {
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
    '- Create 2-8 meaningful category names based on what the products actually ARE (e.g. "Schuhe", "Taschen", "Accessoires")',
    '- If products include multipacks/bundles/sets, create a "Bundles & Sparen" page',
    '- Homepage always exists as the first page',
    '- OPTIONAL: A category with 8+ products MAY have subcategories to split into sub-groups',
    '- Most categories should NOT have subcategories - only use when it clearly makes sense',
    '- Classify the product complexity: simple, medium, complex, or variantRich',
    '- Brand tone must match the product category (technical, lifestyle, playful, premium, etc.)',
    '- Look at the product descriptions to determine if products have notable features worth highlighting',
    '- If products come in many variants (colors, materials, sizes), flag as variantRich',
    '',
    category && category !== 'generic' && CATEGORY_STYLE_HINTS[category]
      ? [
          'PRODUCT NICHE: ' + category,
          'TONE: ' + CATEGORY_STYLE_HINTS[category].tone,
          'VISUAL STYLE: ' + CATEGORY_STYLE_HINTS[category].visualStyle,
          CATEGORY_STYLE_HINTS[category].trustFocus ? 'TRUST FOCUS: Include trust elements, certifications, and USPs prominently.' : '',
        ].filter(Boolean).join('\n')
      : '',
    '',
    'Return ONLY valid JSON, no other text.',
  ].filter(Boolean).join('\n');

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
    '  "categories": [',
    '    {',
    '      "name": "CategoryName",',
    '      "asins": ["B0XXX", ...],',
    '      "productCount": N,',
    '      "subcategories": [',
    '        {"name": "SubcategoryName", "asins": ["B0XXX", ...], "productCount": N}',
    '      ]',
    '    }',
    '  ],',
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
    '- FOCUS ON CATEGORIZATION: Group products into 2-8 meaningful categories based on PRODUCT TYPE, not brand taxonomy.',
    '- Examples: "Reinigungsgeräte", "Zubehör", "Pflegemittel" or "Shirts", "Hosen", "Jacken", "Schuhe".',
    '- NEVER put all products into one single category like "Sonstige" or "Alle Produkte". Always find meaningful sub-groups.',
    '- Every ASIN from the product list must appear in exactly one category. Do not skip any ASINs.',
    '- If a category has subcategories, put the ASINs in the subcategories, NOT in the parent category.',
    '- If a category has NO subcategories, put ASINs directly in the category and omit "subcategories".',
    '- Most categories should NOT have subcategories. Only use them for very large groups (8+ products) with natural sub-divisions.',
    '- Determine productComplexity by looking at product descriptions: simple products need less explanation, complex/technical products need more.',
    '- keyFeatures: Extract 3-5 notable product features from descriptions that could be highlighted visually.',
  ].filter(Boolean).join('\n');

  var text = await callClaude(system, user, 8000);
  var result = extractJSON(text);

  // Validate: every ASIN must be in a category or subcategory
  var allAsins = products.map(function(p) { return p.asin; });
  var assignedAsins = {};
  (result.categories || []).forEach(function(cat) {
    (cat.asins || []).forEach(function(a) { assignedAsins[a] = cat.name; });
    (cat.subcategories || []).forEach(function(sub) {
      (sub.asins || []).forEach(function(a) { assignedAsins[a] = cat.name + ' > ' + sub.name; });
    });
  });
  if (result.bundleAsins) {
    result.bundleAsins.forEach(function(a) { assignedAsins[a] = 'Bundles'; });
  }

  var missing = allAsins.filter(function(a) { return !assignedAsins[a]; });
  if (missing.length > 0) {
    var lastCat = result.categories[result.categories.length - 1];
    if (lastCat) {
      if (lastCat.subcategories && lastCat.subcategories.length > 0) {
        var lastSub = lastCat.subcategories[lastCat.subcategories.length - 1];
        lastSub.asins = lastSub.asins.concat(missing);
        lastSub.productCount = lastSub.asins.length;
      } else {
        lastCat.asins = (lastCat.asins || []).concat(missing);
        lastCat.productCount = (lastCat.asins || []).length;
      }
    } else {
      result.categories.push({ name: 'Weitere Produkte', asins: missing, productCount: missing.length, subcategories: [] });
    }
  }

  if (!result.productComplexity) result.productComplexity = 'medium';

  return result;
}

// ─── STEP 2: LAYOUT PER PAGE ───
export async function aiGeneratePageLayout(pageName, pageProducts, brand, lang, isHomepage, allCategories, analysis, userInstructions, complexityLevel, category) {
  var productList = pageProducts.map(function(p) {
    return { asin: p.asin, name: p.name, price: p.price, rating: p.rating, reviews: p.reviews, description: (p.description || '').slice(0, 100) };
  });

  var validLayouts = LAYOUTS.map(function(l) {
    return l.id + ' (' + l.name + ', ' + l.cells + ' tiles)';
  });

  var complexity = PRODUCT_COMPLEXITY[analysis.productComplexity] || PRODUCT_COMPLEXITY.medium;

  var system = [
    'You are an Amazon Brand Store layout designer. You create visually compelling, interconnected store pages.',
    'You think in IMAGES. 90% of modules are image-based. Tiles within a section RELATE to each other.',
    '',
    'VALID LAYOUTS (id, name, tile count):',
    validLayouts.join(', '),
    '',
    'VALID TILE TYPES: image, product_grid, video, text, shoppable_image, image_text',
    '',
    '=== CRITICAL: HOW TILES WORK TOGETHER IN A SECTION ===',
    'Tiles in a section are NOT isolated. They form a visual unit. Examples:',
    '- Layout "1-1": Left tile = product name text designed into image. Right tile = clean product packshot as shoppable_image.',
    '- Layout "lg-2stack": Left = large lifestyle/bundle shoppable_image. Right top = feature tile. Right bottom = another product tile.',
    '- Layout "lg-4grid": Left = product hero shot. Right 2x2 = four detail tiles (features, variants, angles).',
    '- Layout "1-1": Left = lifestyle image of product in use. Right = same product as shoppable_image (clean packshot).',
    '- Layout "1-1-1": Three related products, each as a shoppable_image with the product name in textOverlay.',
    '',
    '=== SHOPPABLE IMAGES ===',
    'Use shoppable_image when:',
    '- Clean product photos that should be clickable (user can buy directly from the image)',
    '- Product packshots paired with a name/text tile in the same section',
    '- Bundle displays where users should click individual products',
    '- Lifestyle scenes where multiple products are visible and should be tagged',
    'A shoppable_image needs: brief (describing the photo), and optionally a linkAsin or asins array.',
    '',
    'MODULE PATTERNS (pick and combine freely):',
    JSON.stringify(MODULE_BAUKASTEN, null, 1),
    '',
    'COMPOSITION PRINCIPLES:',
    STORE_PRINCIPLES.general.join('\n'),
    '',
    'PRODUCT COMPLEXITY: ' + analysis.productComplexity + ':' + complexity.description,
    'APPROACH: ' + complexity.approach,
    '',
    'BRAND TONE: ' + (analysis.brandTone || 'professional'),
    analysis.keyFeatures ? 'KEY FEATURES: ' + analysis.keyFeatures.join(', ') : '',
    analysis.hasVariants ? 'VARIANTS: ' + (analysis.variantTypes || []).join(', ') + ':use variant showcase layouts (lg-4grid, lg-6grid)' : '',
    '',
    'DIMENSION RULES:',
    '- Hero: 3000 x 600-800. Category tiles: 3000 x 1000-1200. Lifestyle: 3000 x 1200-1500.',
    '- All tiles in a row have the SAME height.',
    '',
    'TEXT RULES:',
    '- textOverlay: Text designed INTO the image. In store language.',
    '- ctaText: CTA button designed into image. In store language.',
    '- brief: ENGLISH instructions for the designer.',
    '- Native text: ONLY for section headings. NOT for marketing.',
    '',
    complexityLevel && COMPLEXITY_LEVELS[complexityLevel]
      ? [
          '',
          'STORE COMPLEXITY LEVEL: ' + complexityLevel + ' (' + COMPLEXITY_LEVELS[complexityLevel].name + ')',
          COMPLEXITY_LEVELS[complexityLevel].description,
          isHomepage
            ? 'Target sections for homepage: ' + COMPLEXITY_LEVELS[complexityLevel].sectionsPerHomepage.min + ' to ' + COMPLEXITY_LEVELS[complexityLevel].sectionsPerHomepage.max
            : 'Target sections for category page: ' + COMPLEXITY_LEVELS[complexityLevel].sectionsPerCategoryPage.min + ' to ' + COMPLEXITY_LEVELS[complexityLevel].sectionsPerCategoryPage.max,
          COMPLEXITY_LEVELS[complexityLevel].includeVideos ? 'Include up to ' + (COMPLEXITY_LEVELS[complexityLevel].videoMax || 1) + ' video section(s).' : 'No video sections needed.',
          COMPLEXITY_LEVELS[complexityLevel].includeFollowCTA ? 'Include a follow/subscribe CTA section.' : '',
          COMPLEXITY_LEVELS[complexityLevel].includeTrustElements ? 'Include trust/certification elements.' : '',
          COMPLEXITY_LEVELS[complexityLevel].includeBrandStory ? 'Include brand story elements.' : '',
        ].filter(Boolean).join('\n')
      : '',
    '',
    category && category !== 'generic' && CATEGORY_STYLE_HINTS[category]
      ? [
          'PRODUCT NICHE: ' + category,
          'NICHE TONE: ' + CATEGORY_STYLE_HINTS[category].tone,
          'VISUAL STYLE: ' + CATEGORY_STYLE_HINTS[category].visualStyle,
          CATEGORY_STYLE_HINTS[category].trustFocus ? 'TRUST FOCUS: Include trust elements, certifications, quality seals, and USPs prominently.' : '',
        ].filter(Boolean).join('\n')
      : '',
    '',
    'CRITICAL RULES:',
    '- Tile count per section MUST match layout. layout "1-1-1" = exactly 3 tiles. "lg-4grid" = exactly 5 tiles. "lg-6grid" = exactly 7 tiles.',
    '- ALL ASINs must be placed in exactly ONE product_grid tile.',
    '- Use VARIED layouts. Not just full-width! Mix 1-1, 1-1-1, lg-2stack, lg-4grid etc.',
    '- Sections must flow logically. Each section connects to the next.',
    '- Do NOT just alternate between full-width images and product grids. Be creative.',
    '- Think about what makes tiles in a section work TOGETHER as a visual unit.',
    '- Return ONLY valid JSON.',
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
    '      "tiles": [{',
    '        "type": "image",',
    '        "brief": "English designer instruction...",',
    '        "textOverlay": "Headline in store language",',
    '        "ctaText": "CTA or empty",',
    '        "dimensions": {"w": 3000, "h": 700}',
    '      }]',
    '    },',
    '    {',
    '      "layoutId": "1-1",',
    '      "tiles": [',
    '        {"type": "image", "brief": "Product name tile. Clean design with just the product name.", "textOverlay": "Product Name", "ctaText": "", "dimensions": {"w": 3000, "h": 1200}},',
    '        {"type": "shoppable_image", "brief": "Clean packshot of the product on white/neutral background.", "textOverlay": "", "ctaText": "", "dimensions": {"w": 3000, "h": 1200}, "linkAsin": "B0XXXXXXXXXX"}',
    '      ]',
    '    },',
    '    ... more sections',
    '  ]',
    '}',
    '',
    isHomepage
      ? [
          'HOMEPAGE GUIDELINES:',
          '1. Hero banner (full-width) with brand slogan.',
          '2. Category navigation (choose layout based on count: 2=1-1, 3=1-1-1, 4=1-1-1-1, 5+=lg-4grid or two rows).',
          '   Each category tile = lifestyle photo + category name overlay + CTA.',
          '3. Optional: Bestseller product_grid (top 5 by rating).',
          '4. Optional: Lifestyle section:use 1-1 with one tile showing product name, other showing product as shoppable_image.',
          '5. Optional: Video module (for complex/technical products).',
          '6. Optional: Brand story / trust section.',
          '7. Optional: Footer category navigation (1-1-1-1).',
          '',
          'IMPORTANT: Use varied layouts! If you have 5+ categories, consider lg-4grid or lg-6grid instead of just rows of 1-1-1-1.',
          'Create sections where tiles relate to each other (name tile + product tile, lifestyle + shoppable, etc.).',
        ].join('\n')
      : [
          'CATEGORY PAGE "' + pageName + '" GUIDELINES:',
          '1. Category hero (lifestyle shot of category products).',
          analysis.productComplexity === 'complex' || analysis.productComplexity === 'variantRich'
            ? '2. Feature/USP sections. Use lg-2stack (large product + 2 feature details) or lg-4grid (product + 4 features) or featureSplit (1-1).'
            : '2. Optional: Product name tile + shoppable product image (1-1 layout).',
          '3. Product grid with ALL ' + pageProducts.length + ' ASINs.',
          '4. Optional: Lifestyle split (1-1):two different use-case images.',
          analysis.hasVariants ? '5. Variant showcase: Use lg-4grid or lg-6grid (large product hero + variant tiles in grid).' : '',
          '6. Optional: Cross-sell to related categories.',
          '',
          'IMPORTANT: Do NOT just stack full-width images and product grids.',
          'Create interconnected sections: e.g. product name tile left + shoppable_image right.',
          'Use shoppable_image for clean product photos that should be clickable.',
          'Use varied layouts including lg-2stack, lg-4grid for richer compositions.',
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
        parentId: pg.parentId || null,
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
    '    {"op": "add_page", "page": {name: "...", sections: [...]}, "parentId": "optional-parent-page-id"},',
    '    {"op": "remove_page", "pageId": "..."},',
    '    {"op": "rename_page", "pageId": "...", "newName": "..."},',
    '    {"op": "set_parent", "pageId": "...", "parentId": "new-parent-id-or-null"}',
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
        if (op.parentId) newPage.parentId = op.parentId;
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
        // Also remove child pages when removing a parent
        var childIds = newStore.pages.filter(function(p) { return p.parentId === op.pageId; }).map(function(p) { return p.id; });
        newStore.pages = newStore.pages.filter(function(p) { return p.id !== op.pageId && childIds.indexOf(p.id) < 0; });
        break;
      }
      case 'rename_page': {
        if (page) page.name = op.newName || page.name;
        break;
      }
      case 'set_parent': {
        if (page) page.parentId = op.parentId || undefined;
        break;
      }
    }
  });

  return newStore;
}

// ─── FULL GENERATION WORKFLOW ───
export async function generateStore(asins, products, brand, marketplace, lang, userInstructions, onLog, complexityLevel, category) {
  var log = onLog || function() {};
  var cLevel = complexityLevel || 2;
  var cConfig = COMPLEXITY_LEVELS[cLevel] || COMPLEXITY_LEVELS[2];

  // STEP 1: AI Analysis
  log('AI analyzing product catalog and planning store structure...');
  log('   Complexity: Level ' + cLevel + ' (' + cConfig.name + ')');
  if (category && category !== 'generic') log('   Niche: ' + category);
  var analysis;
  try {
    analysis = await aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions, category);
    // Validate that we got actual categories
    if (!analysis.categories || analysis.categories.length === 0) {
      log('AI returned no categories, using fallback grouping...');
      analysis = fallbackAnalysis(products, brand, lang);
    } else if (analysis.categories.length === 1 && analysis.categories[0].name.match(/sonstige|andere|other|misc|all/i)) {
      log('AI grouped everything into one generic category, using smarter fallback...');
      analysis = fallbackAnalysis(products, brand, lang);
    }
  } catch (err) {
    log('AI analysis failed (' + err.message + '), falling back to deterministic grouping...');
    analysis = fallbackAnalysis(products, brand, lang);
  }

  log('Structure planned: ' + (analysis.categories || []).length + ' categories, ' + (analysis.suggestedPages || []).length + ' pages');
  log('   Brand tone: ' + (analysis.brandTone || 'professional'));
  log('   Product complexity: ' + (analysis.productComplexity || 'medium'));
  log('   Hero: "' + (analysis.heroMessage || brand) + '"');
  if (analysis.keyFeatures && analysis.keyFeatures.length > 0) {
    log('   Key features: ' + analysis.keyFeatures.join(', '));
  }
  (analysis.categories || []).forEach(function(cat) {
    var totalAsins = (cat.asins || []).length;
    if (cat.subcategories && cat.subcategories.length > 0) {
      cat.subcategories.forEach(function(sub) { totalAsins += (sub.asins || []).length; });
      log('   ' + cat.name + ': ' + totalAsins + ' products (' + cat.subcategories.length + ' sub-categories)');
    } else {
      log('   ' + cat.name + ': ' + totalAsins + ' products');
    }
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
      analysis.categories || [], analysis, userInstructions, cLevel, category
    );
    pages.push({ id: 'homepage', name: 'Homepage', sections: homeResult.sections || [] });
    log('Homepage: ' + (homeResult.sections || []).length + ' sections');
  } catch (err) {
    log('AI homepage failed (' + err.message + '), using fallback...');
    pages.push(fallbackHomepage(brand, lang, analysis.categories || [], products, analysis));
  }

  // STEP 3: Generate Category Pages (with subcategory support)
  var categories = analysis.categories || [];
  for (var ci = 0; ci < categories.length; ci++) {
    var cat = categories[ci];
    var hasSubs = cat.subcategories && cat.subcategories.length > 0;
    var parentPageId = 'cat-' + ci;

    // Gather all ASINs for the parent category (including subcategory ASINs)
    var allCatAsins = (cat.asins || []).slice();
    if (hasSubs) {
      cat.subcategories.forEach(function(sub) {
        allCatAsins = allCatAsins.concat(sub.asins || []);
      });
    }
    var allCatProducts = allCatAsins.map(function(a) { return productMap[a]; }).filter(Boolean);
    if (allCatProducts.length === 0) continue;

    // Generate the parent category page
    log('AI designing "' + cat.name + '" page (' + allCatProducts.length + ' products)...');
    try {
      var catResult = await aiGeneratePageLayout(
        cat.name, allCatProducts, brand, lang, false,
        categories, analysis, userInstructions, cLevel, category
      );
      pages.push({ id: parentPageId, name: cat.name, sections: catResult.sections || [] });
      log(cat.name + ': ' + (catResult.sections || []).length + ' sections');
    } catch (err) {
      log('"' + cat.name + '" failed (' + err.message + '), using fallback...');
      pages.push(fallbackCategoryPage(parentPageId, cat.name, allCatProducts, lang, analysis));
    }

    // Generate subcategory pages
    if (hasSubs) {
      for (var si = 0; si < cat.subcategories.length; si++) {
        var sub = cat.subcategories[si];
        var subProducts = (sub.asins || []).map(function(a) { return productMap[a]; }).filter(Boolean);
        if (subProducts.length === 0) continue;

        var subPageId = parentPageId + '-sub-' + si;
        log('  AI designing sub-page "' + sub.name + '" (' + subProducts.length + ' products)...');
        try {
          var subResult = await aiGeneratePageLayout(
            sub.name, subProducts, brand, lang, false,
            categories, analysis, userInstructions, cLevel, category
          );
          pages.push({ id: subPageId, name: sub.name, parentId: parentPageId, sections: subResult.sections || [] });
          log('  ' + sub.name + ': ' + (subResult.sections || []).length + ' sections');
        } catch (err) {
          log('  "' + sub.name + '" failed (' + err.message + '), using fallback...');
          var fbPage = fallbackCategoryPage(subPageId, sub.name, subProducts, lang, analysis);
          fbPage.parentId = parentPageId;
          pages.push(fbPage);
        }
      }
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

  // STEP 5: Extra pages for Standard/Premium complexity
  if (cConfig.extraPages && cConfig.extraPageTypes) {
    var extraTypes = cConfig.extraPageTypes;

    // Bestsellers page
    if (extraTypes.indexOf('bestsellers') >= 0) {
      var bestProducts = products.slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); }).slice(0, 12);
      if (bestProducts.length >= 3) {
        log('Creating Bestsellers page...');
        var bestSections = [
          {
            id: uid(), layoutId: '1',
            tiles: [{ type: 'image', brief: 'Bestseller hero banner for ' + brand + '. Showcase top-rated products with an aspirational message. Brand tone: ' + (analysis.brandTone || 'professional') + '.', textOverlay: lang === 'German' ? 'Unsere Bestseller' : 'Our Bestsellers', ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [] }],
          },
          {
            id: uid(), layoutId: '1',
            tiles: [{ type: 'product_grid', brief: '', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: bestProducts.map(function(p) { return p.asin; }) }],
          },
        ];
        pages.push({ id: uid(), name: lang === 'German' ? 'Bestseller' : 'Bestsellers', sections: bestSections });
      }
    }

    // About Us page
    if (extraTypes.indexOf('about_us') >= 0) {
      log('Creating About Us page...');
      var aboutSections = [
        {
          id: uid(), layoutId: '1',
          tiles: [{ type: 'image', brief: 'About Us hero for ' + brand + '. Communicate brand values, origin story, and mission visually. Brand tone: ' + (analysis.brandTone || 'professional') + '.', textOverlay: lang === 'German' ? 'Wir sind ' + brand : 'We are ' + brand, ctaText: '', dimensions: { w: 3000, h: 800 }, asins: [] }],
        },
        {
          id: uid(), layoutId: '1-1',
          tiles: [
            { type: 'image', brief: 'Brand story image: team, workshop, or production. Authentic and personal.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
            { type: 'image', brief: 'Brand values image: quality, sustainability, or craftsmanship.', textOverlay: analysis.brandStory || '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
          ],
        },
      ];
      if (cLevel >= 3) {
        aboutSections.push({
          id: uid(), layoutId: '1-1-1',
          tiles: [
            { type: 'image', brief: 'Trust/value pillar 1: Quality, craftsmanship, or expertise.', textOverlay: lang === 'German' ? 'Qualität' : 'Quality', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
            { type: 'image', brief: 'Trust/value pillar 2: Innovation or sustainability.', textOverlay: lang === 'German' ? 'Innovation' : 'Innovation', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
            { type: 'image', brief: 'Trust/value pillar 3: Customer focus or community.', textOverlay: lang === 'German' ? 'Für dich' : 'For You', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
          ],
        });
      }
      pages.push({ id: uid(), name: lang === 'German' ? 'Über uns' : 'About Us', sections: aboutSections });
    }

    // Features/How It Works page (Premium only, for complex products)
    if (extraTypes.indexOf('features') >= 0 && (analysis.productComplexity === 'complex' || analysis.productComplexity === 'variantRich')) {
      log('Creating Features page...');
      var featSections = [
        {
          id: uid(), layoutId: '1',
          tiles: [{ type: 'image', brief: 'Features/technology hero banner for ' + brand + '. Highlight innovation and product capabilities.', textOverlay: lang === 'German' ? 'So funktioniert es' : 'How It Works', ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [] }],
        },
        {
          id: uid(), layoutId: 'lg-4grid',
          tiles: [
            { type: 'image', brief: 'Large product hero shot showing the main product in detail.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
            { type: 'image', brief: 'Feature 1: ' + ((analysis.keyFeatures || [])[0] || 'Key feature highlighted visually.'), textOverlay: (analysis.keyFeatures || [])[0] || '', ctaText: '', dimensions: { w: 1500, h: 600 }, asins: [] },
            { type: 'image', brief: 'Feature 2: ' + ((analysis.keyFeatures || [])[1] || 'Second feature highlighted.'), textOverlay: (analysis.keyFeatures || [])[1] || '', ctaText: '', dimensions: { w: 1500, h: 600 }, asins: [] },
            { type: 'image', brief: 'Feature 3: ' + ((analysis.keyFeatures || [])[2] || 'Third feature.'), textOverlay: (analysis.keyFeatures || [])[2] || '', ctaText: '', dimensions: { w: 1500, h: 600 }, asins: [] },
            { type: 'image', brief: 'Feature 4: ' + ((analysis.keyFeatures || [])[3] || 'Fourth feature or USP.'), textOverlay: (analysis.keyFeatures || [])[3] || '', ctaText: '', dimensions: { w: 1500, h: 600 }, asins: [] },
          ],
        },
      ];
      if (cConfig.includeVideos) {
        featSections.push({
          id: uid(), layoutId: '1',
          tiles: [{ type: 'video', brief: 'Product demonstration video showing the product in action.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1688 }, mobileDimensions: { w: 1242, h: 699 }, asins: [] }],
        });
      }
      pages.push({ id: uid(), name: lang === 'German' ? 'Funktionen' : 'Features', sections: featSections });
    }

    // Certifications page (Premium only, for trust-focused categories)
    if (extraTypes.indexOf('certifications') >= 0 && CATEGORY_STYLE_HINTS[category] && CATEGORY_STYLE_HINTS[category].trustFocus) {
      log('Creating Certifications page...');
      pages.push({
        id: uid(),
        name: lang === 'German' ? 'Zertifizierungen' : 'Certifications',
        sections: [
          {
            id: uid(), layoutId: '1',
            tiles: [{ type: 'image', brief: 'Certifications hero: showcase trust badges, quality seals, and third-party certifications for ' + brand + '.', textOverlay: lang === 'German' ? 'Unsere Zertifizierungen' : 'Our Certifications', ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [] }],
          },
          {
            id: uid(), layoutId: '1-1-1',
            tiles: [
              { type: 'image', brief: 'Certification badge 1 with explanation.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
              { type: 'image', brief: 'Certification badge 2 with explanation.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
              { type: 'image', brief: 'Certification badge 3 with explanation.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
            ],
          },
        ],
      });
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
    log(unassigned.length + ' unassigned ASINs:adding to nearest category page...');
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

  // Strategy 1: Try scraped Amazon categories (use the most specific one)
  products.forEach(function(p) {
    var cat = '';
    if (p.categories && p.categories.length > 0) {
      var cats = p.categories;
      if (Array.isArray(cats)) {
        // Use 2nd-level category if available (more specific than top-level, less specific than leaf)
        cat = cats.length >= 2 ? cats[1] : cats[0] || '';
      } else {
        cat = String(cats);
      }
    }
    if (!cat) cat = '__uncat__';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(p.asin);
  });

  // If too many products ended up in one bucket or __uncat__, try name-based grouping
  var uncatCount = (groups['__uncat__'] || []).length;
  var largestGroup = 0;
  Object.keys(groups).forEach(function(k) { if (groups[k].length > largestGroup) largestGroup = groups[k].length; });

  if (uncatCount > products.length * 0.5 || largestGroup > products.length * 0.7 || Object.keys(groups).length <= 1) {
    // Reset and try keyword-based grouping from product names
    groups = {};
    var keywords = {};

    // Extract common keywords from product names
    products.forEach(function(p) {
      var name = (p.name || '').toLowerCase();
      // Extract significant words (>3 chars, not common filler)
      var filler = ['with', 'für', 'for', 'and', 'und', 'the', 'von', 'aus', 'set', 'pack', 'stück', 'stk', 'pcs', 'size', 'color', 'black', 'white', 'blue', 'red', 'green', 'grey', 'pink', 'braun', 'schwarz', 'weiß', 'grün', 'blau', 'rot', 'amazon', 'prime'];
      var words = name.replace(/[^a-zäöüß\s]/g, ' ').split(/\s+/).filter(function(w) {
        return w.length > 3 && filler.indexOf(w) < 0;
      });
      words.forEach(function(w) {
        if (!keywords[w]) keywords[w] = [];
        keywords[w].push(p.asin);
      });
    });

    // Find the best grouping keywords (appear in 2+ products but not ALL products)
    var sortedKw = Object.keys(keywords).filter(function(k) {
      return keywords[k].length >= 2 && keywords[k].length < products.length * 0.8;
    }).sort(function(a, b) {
      return keywords[b].length - keywords[a].length;
    });

    // Greedy assignment: assign each product to the best keyword group
    var assigned = {};
    sortedKw.slice(0, 8).forEach(function(kw) {
      var groupAsins = keywords[kw].filter(function(a) { return !assigned[a]; });
      if (groupAsins.length >= 2) {
        // Capitalize keyword for display
        var label = kw.charAt(0).toUpperCase() + kw.slice(1);
        groups[label] = groupAsins;
        groupAsins.forEach(function(a) { assigned[a] = true; });
      }
    });

    // Remaining unassigned products
    var remaining = products.filter(function(p) { return !assigned[p.asin]; }).map(function(p) { return p.asin; });
    if (remaining.length > 0) {
      var remLabel = lang === 'German' ? 'Weitere Produkte' : 'More Products';
      groups[remLabel] = remaining;
    }
  } else {
    // Clean up __uncat__ bucket
    if (groups['__uncat__'] && groups['__uncat__'].length > 0) {
      var remLabel2 = lang === 'German' ? 'Weitere Produkte' : 'More Products';
      groups[remLabel2] = groups['__uncat__'];
    }
    delete groups['__uncat__'];
  }

  // Consolidate: merge tiny groups, limit to 8
  var catNames = Object.keys(groups);
  if (catNames.length > 8) {
    var overflow = lang === 'German' ? 'Weitere Produkte' : 'More Products';
    if (!groups[overflow]) groups[overflow] = [];
    catNames.sort(function(a, b) { return groups[a].length - groups[b].length; });
    while (Object.keys(groups).length > 8) {
      var smallest = Object.keys(groups).sort(function(a, b) { return groups[a].length - groups[b].length; })[0];
      if (smallest === overflow) break;
      groups[overflow] = groups[overflow].concat(groups[smallest]);
      delete groups[smallest];
    }
  }

  var categories = Object.keys(groups).map(function(name) {
    return { name: name, asins: groups[name], productCount: groups[name].length };
  });

  // Sort by product count descending
  categories.sort(function(a, b) { return b.productCount - a.productCount; });

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
