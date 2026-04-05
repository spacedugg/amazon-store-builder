import { uid, LAYOUTS, LAYOUT_TILE_DIMS, REFERENCE_STORES, STORE_PRINCIPLES, MODULE_BAUKASTEN, PRODUCT_COMPLEXITY, COMPLEXITY_LEVELS, CATEGORY_STYLE_HINTS, IMAGE_CATEGORIES, IMAGE_CATEGORY_DECISION_TREE, findLayout, resolveLayoutId, createDefaultProductSelector } from './constants';

var ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
var PRIMARY_MODEL = 'claude-opus-4-6';
var FALLBACK_MODEL = 'claude-sonnet-4-6';

// ─── TIMEOUT-AWARE FETCH ───
function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
      reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's'));
    }, timeoutMs);
    var fetchOptions = Object.assign({}, options, { signal: controller.signal });
    fetch(url, fetchOptions).then(function(resp) {
      clearTimeout(timer);
      resolve(resp);
    }).catch(function(err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's'));
      } else {
        reject(err);
      }
    });
  });
}

// ─── CLAUDE API CALL (with retry + fallback + timeout) ───
var CLAUDE_TIMEOUT_MS = 180000; // 3 minutes per API call — complex stores need more time

async function callClaude(systemPrompt, userPrompt, maxTokens) {
  if (!ANTHROPIC_KEY) throw new Error('VITE_ANTHROPIC_API_KEY not configured');

  var models = [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL];
  var delays = [2000, 4000, 0];

  for (var attempt = 0; attempt < models.length; attempt++) {
    var model = models[attempt];
    try {
      var resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
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
      }, CLAUDE_TIMEOUT_MS);

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
      if (attempt < models.length - 1 && (e.message.indexOf('529') >= 0 || e.message.indexOf('503') >= 0 || e.message.indexOf('overload') >= 0 || e.message.indexOf('fetch') >= 0 || e.message.indexOf('timed out') >= 0)) {
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

// ─── INFER IMAGE CATEGORY FROM BRIEF TAG ───
function inferImageCategory(brief, tileType) {
  if (!brief) return 'creative';
  var b = brief.toUpperCase();
  if (b.indexOf('[STORE_HERO]') >= 0) return 'store_hero';
  if (b.indexOf('[BENEFIT]') >= 0) return 'benefit';
  if (b.indexOf('[TEXT_IMAGE]') >= 0) return 'text_image';
  if (b.indexOf('[LIFESTYLE]') >= 0) return 'lifestyle';
  if (b.indexOf('[PRODUCT]') >= 0) return 'product';
  if (b.indexOf('[SHOPPABLE]') >= 0) return 'product';
  if (b.indexOf('[CREATIVE]') >= 0) return 'creative';
  // Fallback: infer from tile type
  if (tileType === 'shoppable_image') return 'product';
  if (tileType === 'image_text') return 'creative';
  return 'creative';
}

// ─── FORMAT WEBSITE DATA FOR AI CONTEXT ───
function formatWebsiteContext(websiteData) {
  if (!websiteData) return '';
  var parts = [];
  parts.push('=== BRAND WEBSITE INTELLIGENCE (scraped from ' + (websiteData.url || 'brand website') + ', ' + (websiteData.pagesScraped || 1) + ' pages crawled) ===');
  if (websiteData.title) parts.push('Website title: ' + websiteData.title);
  if (websiteData.description) parts.push('Website description: ' + websiteData.description);
  if (websiteData.tagline) parts.push('Brand tagline: ' + websiteData.tagline);

  // ── AI-ANALYZED FIELDS (higher quality, take priority) ──
  var ai = websiteData.aiAnalysis;
  if (ai) {
    if (ai.brandStory) parts.push('BRAND STORY: ' + ai.brandStory);
    if (ai.brandTone) parts.push('BRAND TONE/PERSONALITY: ' + ai.brandTone);
    if (ai.targetAudience) parts.push('TARGET AUDIENCE: ' + ai.targetAudience);
    if (ai.usps && ai.usps.length > 0) parts.push('USPs: ' + ai.usps.join(' | '));
    if (ai.certifications && ai.certifications.length > 0) parts.push('CERTIFICATIONS: ' + ai.certifications.join(' | '));
    if (ai.brandValues && ai.brandValues.length > 0) parts.push('BRAND VALUES: ' + ai.brandValues.join(' | '));
    if (ai.productCategories && ai.productCategories.length > 0) parts.push('PRODUCT CATEGORIES: ' + ai.productCategories.join(' | '));
    if (ai.sustainabilityFocus) parts.push('SUSTAINABILITY: ' + ai.sustainabilityFocus);
    if (ai.keyIngredients && ai.keyIngredients.length > 0) parts.push('KEY INGREDIENTS/MATERIALS: ' + ai.keyIngredients.join(' | '));
    if (ai.visualStyle) parts.push('VISUAL STYLE: ' + ai.visualStyle);
  }

  // ── RAW EXTRACTED FIELDS (fallback if no AI, or supplementary) ──
  if (!ai || !ai.brandStory) {
    if (websiteData.aboutText) parts.push('Brand story / About: ' + websiteData.aboutText.slice(0, 800));
  }
  if (websiteData.sustainabilityText && (!ai || !ai.sustainabilityFocus)) {
    parts.push('Sustainability info: ' + websiteData.sustainabilityText.slice(0, 500));
  }
  if (websiteData.qualityText) parts.push('Quality / Production: ' + websiteData.qualityText.slice(0, 500));
  if (websiteData.valuesText && (!ai || !ai.brandValues)) {
    parts.push('Brand values text: ' + websiteData.valuesText.slice(0, 500));
  }
  if (websiteData.ingredientsText && (!ai || !ai.keyIngredients || ai.keyIngredients.length === 0)) {
    parts.push('Ingredients / Materials: ' + websiteData.ingredientsText.slice(0, 500));
  }

  // ── SUPPLEMENTARY RAW DATA ──
  if (!ai || !ai.certifications || ai.certifications.length === 0) {
    if (websiteData.certifications && websiteData.certifications.length > 0) {
      parts.push('Certifications & trust signals: ' + websiteData.certifications.slice(0, 8).join(' | '));
    }
  }
  if (!ai || !ai.usps || ai.usps.length === 0) {
    if (websiteData.features && websiteData.features.length > 0) {
      parts.push('Product features / USPs: ' + websiteData.features.slice(0, 10).join(' | '));
    }
  }
  if (websiteData.productInfo && websiteData.productInfo.length > 0) {
    parts.push('Product info from website: ' + websiteData.productInfo.slice(0, 3).join(' | '));
  }
  if (websiteData.socialProof && websiteData.socialProof.length > 0) {
    parts.push('Customer testimonials / social proof: ' + websiteData.socialProof.slice(0, 3).join(' | '));
  }
  // Colors & Fonts extracted from CSS
  if (websiteData.colors && websiteData.colors.length > 0) {
    parts.push('BRAND COLORS (from CSS): ' + websiteData.colors.join(', '));
  }
  if (websiteData.fonts && websiteData.fonts.length > 0) {
    parts.push('BRAND FONTS (from CSS): ' + websiteData.fonts.join(', '));
  }

  parts.push('=== END BRAND WEBSITE INTELLIGENCE ===');
  parts.push('');
  parts.push('USE this brand intelligence to:');
  parts.push('- Adapt brand tone, messaging, and visual style to match the brand\'s actual identity');
  parts.push('- Include real brand USPs, certifications, and story elements in the store');
  parts.push('- Use actual taglines, slogans, or key phrases from the brand website');
  parts.push('- Reference real product features and benefits mentioned on the website');
  parts.push('- Integrate trust signals (certifications, awards, quality seals) into appropriate sections');
  parts.push('- Use the brand colors and visual style for design direction');
  parts.push('- Tailor messaging to the target audience identified');
  parts.push('');
  return parts.join('\n');
}

// ─── PARSE MENU STRUCTURE FROM USER INSTRUCTIONS ───
function parseMenuStructure(instructions) {
  if (!instructions) return null;
  var lines = instructions.split('\n');
  var categories = [];
  var notes = [];
  var currentParent = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var trimmed = line.trim();
    if (!trimmed) continue;

    // Lines starting with "- " are subcategories
    if (/^\s*-\s+/.test(line)) {
      var subName = trimmed.replace(/^-\s+/, '');
      if (currentParent) {
        if (!currentParent.subcategories) currentParent.subcategories = [];
        currentParent.subcategories.push({ name: subName });
      }
    }
    // Lines that look like category names (short, no punctuation, not a sentence/note)
    else if (trimmed.length <= 60 && !trimmed.match(/[.!?;]$/) && trimmed.indexOf(': ') < 0 && !trimmed.match(/,\s/) && trimmed.split(/\s+/).length <= 8) {
      currentParent = { name: trimmed, subcategories: [] };
      categories.push(currentParent);
    }
    // Everything else is a note/hint for the AI
    else {
      notes.push(trimmed);
    }
  }

  if (categories.length === 0) return null;
  return { categories: categories, notes: notes };
}

// ─── ENFORCE MENU STRUCTURE (deterministic — never trust AI to echo names) ───
function enforceMenuCategories(userCategories, aiCategories, allAsins) {
  var aiLookup = {};
  (aiCategories || []).forEach(function(ac) {
    aiLookup[ac.name.toLowerCase().trim()] = ac;
  });

  var assignedAsins = {};

  var result = userCategories.map(function(uc) {
    var ucKey = uc.name.toLowerCase().trim();
    // Find matching AI category (exact or partial)
    var aiMatch = aiLookup[ucKey];
    if (!aiMatch) {
      var aiKeys = Object.keys(aiLookup);
      for (var k = 0; k < aiKeys.length; k++) {
        if (aiKeys[k].indexOf(ucKey) >= 0 || ucKey.indexOf(aiKeys[k]) >= 0) {
          aiMatch = aiLookup[aiKeys[k]];
          break;
        }
      }
    }

    var cat = {
      name: uc.name, // ALWAYS use the user's exact name
      asins: [],
      productCount: 0,
      subcategories: [],
    };

    if (uc.subcategories && uc.subcategories.length > 0) {
      var aiSubs = aiMatch ? (aiMatch.subcategories || []) : [];
      var aiSubLookup = {};
      aiSubs.forEach(function(as) { aiSubLookup[as.name.toLowerCase().trim()] = as; });

      cat.subcategories = uc.subcategories.map(function(us) {
        var usKey = us.name.toLowerCase().trim();
        var subMatch = aiSubLookup[usKey];
        if (!subMatch) {
          var subKeys = Object.keys(aiSubLookup);
          for (var sk = 0; sk < subKeys.length; sk++) {
            if (subKeys[sk].indexOf(usKey) >= 0 || usKey.indexOf(subKeys[sk]) >= 0) {
              subMatch = aiSubLookup[subKeys[sk]];
              break;
            }
          }
        }
        var subAsins = subMatch ? (subMatch.asins || []) : [];
        subAsins.forEach(function(a) { assignedAsins[a] = true; });
        return { name: us.name, asins: subAsins, productCount: subAsins.length };
      });

      // Move parent-level ASINs to first subcategory
      var parentAsins = aiMatch ? (aiMatch.asins || []) : [];
      if (parentAsins.length > 0 && cat.subcategories.length > 0) {
        parentAsins.forEach(function(a) { assignedAsins[a] = true; });
        cat.subcategories[0].asins = cat.subcategories[0].asins.concat(parentAsins);
        cat.subcategories[0].productCount = cat.subcategories[0].asins.length;
      }
    } else {
      var catAsins = aiMatch ? (aiMatch.asins || []) : [];
      if (aiMatch && aiMatch.subcategories) {
        aiMatch.subcategories.forEach(function(s) { catAsins = catAsins.concat(s.asins || []); });
      }
      catAsins.forEach(function(a) { assignedAsins[a] = true; });
      cat.asins = catAsins;
    }

    cat.productCount = cat.asins.length;
    cat.subcategories.forEach(function(s) { cat.productCount += s.productCount; });
    return cat;
  });

  // Distribute unassigned ASINs across categories
  var unassigned = allAsins.filter(function(a) { return !assignedAsins[a]; });
  if (unassigned.length > 0 && result.length > 0) {
    // Distribute evenly
    for (var i = 0; i < unassigned.length; i++) {
      var targetIdx = i % result.length;
      var target = result[targetIdx];
      if (target.subcategories.length > 0) {
        var subIdx = i % target.subcategories.length;
        target.subcategories[subIdx].asins.push(unassigned[i]);
        target.subcategories[subIdx].productCount++;
      } else {
        target.asins.push(unassigned[i]);
      }
      target.productCount++;
    }
  }

  return result;
}

// ─── STEP 1: ANALYSIS & PAGE STRUCTURE ───
export async function aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions, websiteData, referenceAnalysis) {
  var productList = products.map(function(p) {
    var item = {
      asin: p.asin,
      name: p.name,
      brand: p.brand,
      description: (p.description || '').slice(0, 200),
      price: p.price,
      rating: p.rating,
      reviews: p.reviews,
      categories: p.categories,
    };
    // Include bullet points from PDP for richer content analysis
    if (p.bulletPoints && p.bulletPoints.length > 0) {
      item.bulletPoints = p.bulletPoints.slice(0, 5);
    }
    // Include image count and alt texts for visual content analysis
    if (p.images && p.images.length > 0) {
      item.imageCount = p.images.length;
      var alts = p.images.filter(function(img) { return img.alt; }).map(function(img) { return img.alt; });
      if (alts.length > 0) item.imageAlts = alts.slice(0, 5);
    }
    return item;
  });

  // Parse menu structure from instructions
  var parsed = parseMenuStructure(userInstructions);
  var hasMenuStructure = parsed && parsed.categories.length > 0;
  var additionalNotes = parsed ? parsed.notes.join('\n') : (userInstructions || '');

  var system = [
    'You are an expert Amazon Brand Store strategist.',
    '',
    'YOUR TASK: Analyze the product catalog and assign each product to the correct category.',
    '',
    hasMenuStructure ? [
      '╔══════════════════════════════════════════════════════════════╗',
      '║  MANDATORY: USE THE EXACT MENU STRUCTURE PROVIDED BELOW    ║',
      '║  Do NOT rename, reorder, merge, split, or skip categories. ║',
      '║  Do NOT add new categories. Do NOT remove any.             ║',
      '║  Your ONLY job: assign each ASIN to the best-matching one. ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      'EXACT MENU STRUCTURE TO USE:',
      JSON.stringify(parsed.categories, null, 2),
      '',
    ].join('\n') : '',
    'PRINCIPLES:',
    '- Every ASIN must be assigned to exactly ONE category or subcategory',
    hasMenuStructure
      ? '- Copy category/subcategory names VERBATIM from the structure above. Character-for-character identical.'
      : '- Create 2-8 meaningful categories based on what products ARE (e.g. "Schuhe", "Taschen")',
    '- Classify product complexity: simple, medium, complex, or variantRich',
    '- Detect brand tone from product descriptions and images',
    '- Extract 3-5 key product features that could be highlighted visually',
    '',
    'Return ONLY valid JSON.',
  ].filter(Boolean).join('\n');

  var user = [
    'Brand: "' + brand + '"',
    'Marketplace: Amazon.' + marketplace,
    'Language: ' + lang,
    '',
    hasMenuStructure ? [
      '=== MANDATORY MENU STRUCTURE (use these EXACT names) ===',
      parsed.categories.map(function(cat) {
        var s = cat.name;
        if (cat.subcategories && cat.subcategories.length > 0) {
          s += '\n' + cat.subcategories.map(function(sub) { return '  - ' + sub.name; }).join('\n');
        }
        return s;
      }).join('\n'),
      '=== END MENU STRUCTURE ===',
      '',
    ].join('\n') : '',
    additionalNotes ? [
      'Additional context from user: ' + additionalNotes,
      '',
    ].join('\n') : '',
    formatWebsiteContext(websiteData),
    referenceAnalysis ? referenceAnalysis : '',
    'Products (' + products.length + '):',
    JSON.stringify(productList, null, 1),
    '',
    'Return this JSON (use the EXACT category names from above if provided):',
    '{',
    '  "categories": [',
    '    {',
    '      "name": "EXACT category name from menu structure",',
    '      "asins": ["B0XXX", ...],',
    '      "productCount": N,',
    '      "subcategories": [',
    '        {"name": "EXACT subcategory name", "asins": ["B0XXX", ...], "productCount": N}',
    '      ]',
    '    }',
    '  ],',
    '  "hasBundles": true/false,',
    '  "bundleAsins": ["B0XXX"],',
    '  "suggestedPages": ["Homepage", "Category1", ...],',
    '  "brandTone": "professional/technical"|"lifestyle/premium"|"playful/colorful"|"sporty/bold"|"clean/minimal",',
    '  "productComplexity": "simple"|"medium"|"complex"|"variantRich",',
    '  "heroMessage": "Brand slogan in ' + lang + ' (max 6 words)",',
    '  "brandStory": "One sentence brand story in ' + lang + '",',
    '  "keyFeatures": ["Feature 1", "Feature 2", ...],',
    '  "hasVariants": true/false,',
    '  "variantTypes": ["Colors", "Sizes", ...] or []',
    '}',
    '',
    'RULES:',
    hasMenuStructure ? '- You MUST output EXACTLY the categories from the menu structure. Same names, same order, same subcategories.' : '- Group into 2-8 meaningful categories by product type.',
    '- Every ASIN from the list must appear in exactly one category/subcategory.',
    '- If a category has subcategories, put ASINs in subcategories ONLY (not in parent).',
    '- If a category has NO subcategories, put ASINs directly in the category.',
  ].filter(Boolean).join('\n');

  var text = await callClaude(system, user, 8000);
  var result = extractJSON(text);

  // ─── ENFORCE MENU STRUCTURE: Replace AI category names with user's exact names ───
  if (hasMenuStructure) {
    console.log('[aiAnalyzeProducts] Enforcing user menu structure over AI categories');
    var enforceAsins = products.map(function(p) { return p.asin; });
    result.categories = enforceMenuCategories(parsed.categories, result.categories, enforceAsins);
    result.suggestedPages = ['Homepage'].concat(result.categories.map(function(c) { return c.name; }));
    result._menuSource = 'user';
  }

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
export async function aiGeneratePageLayout(pageName, pageProducts, brand, lang, isHomepage, allCategories, analysis, userInstructions, complexityLevel, category, template, websiteData, referenceAnalysis, isSubpage) {
  var productList = pageProducts.map(function(p) {
    var item = { asin: p.asin, name: p.name, price: p.price, rating: p.rating, reviews: p.reviews, description: (p.description || '').slice(0, 100) };
    if (p.bulletPoints && p.bulletPoints.length > 0) item.bulletPoints = p.bulletPoints.slice(0, 3);
    if (p.images && p.images.length > 0) {
      item.imageCount = p.images.length;
      var alts = p.images.filter(function(img) { return img.alt; }).map(function(img) { return img.alt; });
      if (alts.length > 0) item.imageAlts = alts.slice(0, 3);
    }
    return item;
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
    'IMPORTANT: shoppable_image is ONLY allowed in Standard ("Basis") layouts and Full-Width layout. NEVER use shoppable_image in VH (Variable Height) layouts!',
    'A shoppable_image needs: brief (describing the photo), and optionally a linkAsin or a hotspots array.',
    '',
    '=== HOTSPOTS (multi-product shoppable images) ===',
    'Shoppable images can have up to 5 hotspots, each linking to a different product ASIN.',
    'Use hotspots when ONE image shows MULTIPLE products/variants that should each be clickable.',
    'Each hotspot has: { x: 0-100, y: 0-100, asin: "B0..." } where x/y are percentage positions.',
    'CRITICAL: Hotspots and CTA buttons are Amazon UI overlays — NOT part of the image design!',
    'The designer must NOT design hotspot dots or CTA buttons into the image itself.',
    'When to use hotspots vs linkAsin:',
    '- Single product in image → use linkAsin (string)',
    '- Multiple products/variants visible in image → use hotspots array (up to 5)',
    'Example hotspot tile:',
    '  { "type": "shoppable_image", "hotspots": [{"x": 15, "y": 70, "asin": "B0AAA"}, {"x": 50, "y": 70, "asin": "B0BBB"}] }',
    'Position hotspots where the corresponding product/variant is visually located in the image.',
    '',
    'MODULE PATTERNS (pick and combine freely):',
    JSON.stringify(MODULE_BAUKASTEN, null, 1),
    '',
    'COMPOSITION PRINCIPLES:',
    STORE_PRINCIPLES.general.join('\n'),
    '',
    'VISUAL HARMONY (tiles in a section must relate to each other):',
    STORE_PRINCIPLES.visualHarmony.join('\n'),
    '',
    'PRODUCT HIERARCHY & EQUAL SIZING:',
    '- Products of the SAME hierarchy level (same category, same importance) MUST get EQUAL tile sizes.',
    '- Two soaps, two bottles, two chairs, two machines = same tile dimensions. Use std-2equal or 1-1-1.',
    '- A main product + accessory (e.g. bottle + cap, mower + spare blade) CAN have different sizes (large + small).',
    '- In a section with shoppable_image tiles: if two products are peers, both MUST be same size.',
    '- NEVER give one product a 1500x1500 tile and a peer product only a 1500x750 tile.',
    '- If a section has a lifestyle image + 2 product shoppable images: use a layout where both products get equal space.',
    '  Example: "lg-2stack" with large=lifestyle, stacked=two equal product tiles. Or "1-1-1" with lifestyle + 2 equal products.',
    '',
    'PRODUCT COMPLEXITY: ' + analysis.productComplexity + ':' + complexity.description,
    'APPROACH: ' + complexity.approach,
    '',
    'BRAND TONE: ' + (analysis.brandTone || 'professional'),
    analysis.keyFeatures ? 'KEY FEATURES: ' + analysis.keyFeatures.join(', ') : '',
    analysis.hasVariants ? 'VARIANTS: ' + (analysis.variantTypes || []).join(', ') + ':use variant showcase layouts (lg-4grid)' : '',
    '',
    formatWebsiteContext(websiteData),
    'DIMENSION RULES:',
    '- Full-width images (Desktop): 3000px wide x VARIABLE height. Max aspect ratio 15:1 (minimum height = width/15, e.g. 3000x200 is OK, 3000x199 is NOT).',
    '- Full-width images (Mobile): 1680px wide x VARIABLE height. Max aspect ratio 5:1 (minimum height = width/5, e.g. 1680x336 is OK, 1680x335 is NOT).',
    '- IMPORTANT: Full-width tiles need TWO separate images (desktop + mobile) because dimensions differ. Set mobileDimensions independently.',
    '- Heights are FLEXIBLE, especially for full-width layouts. A hero can be 3000x800, a lifestyle banner 3000x1000.',
    '- Multi-tile layouts: all tiles in a row have the SAME height.',
    '- Standard tile sizes: LS=1500x1500, SS=750x750, W=1500x750 (minimum!). These use ONE image for desktop+mobile.',
    '',
    'TEXT RULES:',
    '- textOverlay: Text designed INTO the image. In store language (' + lang + ').',
    '- ctaText: CTA button designed into image. In store language.',
    '- EVERY image tile should be clickable: set either linkAsin (links to product) or linkUrl (links to store subpage like "/pageid").',
    '  Exception: store_hero, benefit, and text_image tiles do not need links.',
    '  If a tile has ctaText, it MUST have a linkAsin or linkUrl.',
    '- brief: ENGLISH instructions for the designer.',
    '- Native text: ONLY for section headings. NOT for marketing.',
    '- NEVER use em-dashes (\u2014 or \u2013) in any text. Restructure sentences instead. Use periods, commas, or colons.',
    '- textOverlay supports multiple lines (use \\n). Use this for headline + subline combinations.',
    '',
    complexityLevel && COMPLEXITY_LEVELS[complexityLevel]
      ? (function() {
          var cl = COMPLEXITY_LEVELS[complexityLevel];
          var rules = cl.imageCategoryRules || {};
          var categoryRulesText = Object.keys(rules).map(function(cat) {
            var catName = (IMAGE_CATEGORIES[cat] || {}).name || cat;
            return '  - ' + catName + ': ' + rules[cat];
          }).join('\n');
          return [
            '',
            'STORE TIER: ' + complexityLevel + ' (' + cl.name + ')',
            cl.description,
            isHomepage
              ? 'Target sections for homepage: ' + cl.sectionsPerHomepage.min + ' to ' + cl.sectionsPerHomepage.max
              : 'Target sections for category page: ' + cl.sectionsPerCategoryPage.min + ' to ' + cl.sectionsPerCategoryPage.max,
            cl.includeVideos ? 'Include up to ' + (cl.videoMax || 1) + ' video section(s).' : 'No video sections needed.',
            cl.includeFollowCTA ? 'Include a follow/subscribe CTA section.' : '',
            cl.includeTrustElements ? 'Include trust/certification elements.' : '',
            cl.includeBrandStory ? 'Include brand story elements.' : '',
            '',
            '=== TIER-SPECIFIC IMAGE CATEGORY RULES ===',
            categoryRulesText,
            complexityLevel === 1 ? 'Minimal tier: NO storytelling, NO infographics, NO service promotions.' : '',
            complexityLevel === 3 ? 'Premium tier: Individual hero per subpage. Benefits on EVERY page. Maximum category variety.' : '',
          ].filter(Boolean).join('\n');
        })()
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
    // ─── TEMPLATE BLUEPRINT (if selected) ───
    template ? [
      '',
      '╔══════════════════════════════════════════════════════════════╗',
      '║  TEMPLATE: ' + template.name.toUpperCase() + ' (inspired by ' + template.inspiration + ')',
      '║  FOLLOW this template\'s STRUCTURE and SECTION ORDER.       ║',
      '║  Colors, fonts, CI come from the BRAND, not the template.  ║',
      '╚══════════════════════════════════════════════════════════════╝',
      '',
      '=== STRUCTURAL STYLE (from template) ===',
      'IMPORTANT: Colors, typography, and brand identity are determined by the BRAND CI, NOT by this template.',
      'The template defines ONLY: section order, layout choices, tile types, content density, and photography approach.',
      'Section alternation: ' + template.visualDNA.colors.sectionAlternation,
      'Content density: ' + Math.round(template.visualDNA.textStyle.ratio * 100) + '% text, ' + Math.round((1 - template.visualDNA.textStyle.ratio) * 100) + '% imagery',
      'Photography approach: ' + template.visualDNA.productDisplay.photography,
      'Product display: primary=' + template.visualDNA.productDisplay.primary + ', secondary=' + template.visualDNA.productDisplay.secondary,
      template.visualDNA.sectionVariety.videoPresence ? 'Include video sections.' : 'No video sections.',
      template.visualDNA.sectionVariety.shoppableImages ? 'Use shoppable images generously.' : '',
      template.visualDNA.sectionVariety.trustElements ? 'Include trust/certification elements.' : '',
      template.visualDNA.sectionVariety.brandStory ? 'Include brand story section.' : '',
      '',
      '=== SECTION BLUEPRINT (follow this order and structure) ===',
      'Generate sections following this template pattern. Adapt briefs to the current brand "' + brand + '" but keep the same layout flow:',
      '',
      (isHomepage ? template.homepage : template.categoryPage).map(function(sec, i) {
        return (i + 1) + '. Layout "' + sec.layout + '" — ' + sec.purpose + ': ' + sec.brief;
      }).join('\n'),
      '',
      'CRITICAL: Adapt EVERY brief to "' + brand + '" — do NOT output generic/template text.',
      '- Replace ALL [product], [category product], generic references with ACTUAL product names from the product list.',
      '- Every brief MUST mention specific "' + brand + '" products by name or ASIN.',
      '- textOverlay MUST be in the store language and brand-specific (not "Product Name" but "Kärcher K5 Premium").',
      '- Adjust section count if needed (add more product grids for large catalogs).',
      '- Keep the visual DNA consistent: colors, photography style, text ratios.',
      '',
    ].filter(Boolean).join('\n') : '',
    'CRITICAL RULES:',
    '- Tile count per section MUST match layout cell count.',
    '- ASIN GRID RULES: product_grid tiles are only needed when there are many products to browse.',
    '  If a page has few products (2-4) that are already shown as shoppable_image tiles with linkAsin,',
    '  a product_grid is UNNECESSARY. Only add product_grid when it adds value (5+ products to browse).',
    '  Every image tile can have a linkAsin to make it clickable — this often replaces the need for a grid.',
    '- Use VARIED layouts. NEVER use more than 2 full-width "1" layouts per page.',
    '- Mix std-2equal, lg-2stack, lg-4grid, 2x2wide, vh-w2s, 2s-4grid etc.',
    '- Sections flow: Hero → Feature/USP → Product showcase → Lifestyle → Product grid → Cross-sell.',
    '- Do NOT just alternate full-width image + product grid. That is the WORST pattern.',
    '- LINK DEDUPLICATION: No two tiles on the same page should link to the same ASIN or store URL. Each product link and page link must appear only ONCE per page.',
    '',
    '=== AVAILABLE LAYOUTS ===',
    'Full Width: "1" (1 tile)',
    'Standard (2-row, 4-col grid):',
    '  "std-2equal" (2 tiles: 2 Large Squares)',
    '  "lg-2stack" (3 tiles: LS + 2 Wides stacked) / "2stack-lg" (mirror)',
    '  "lg-w2s" (4 tiles: LS + Wide + 2 Small Squares) / "w2s-lg" (mirror)',
    '  "2x2wide" (4 tiles: 4 Wides in 2×2)',
    '  "lg-4grid" (5 tiles: LS + 4 SS in 2×2) / "4grid-lg" (mirror)',
    '  "2s-4grid" (6 tiles: 2 Wides + 4 SS) / "4grid-2s" (mirror)',
    '  "4x2grid" (8 tiles: 8 SS in 4×2)',
    'Variable Height (1-row, 4-col grid):',
    '  "vh-2equal" (2 tiles: 2 Wides)',
    '  "vh-w2s" (3 tiles: Wide + 2 SS) / "vh-2sw" (mirror: 2 SS + Wide)',
    '',
    '=== LAYOUT MIRRORING ===',
    'Mirrored layouts swap left/right and affect mobile stacking order:',
    '- "lg-2stack" → "2stack-lg": On mobile, the Large Square moves to bottom.',
    '- "lg-4grid" → "4grid-lg": On mobile, the Large Square moves to bottom.',
    '- "vh-w2s" → "vh-2sw": On mobile, the Wide moves to bottom.',
    '',
    '=== IMAGE CATEGORIES (6 types — assign one per image tile) ===',
    'Each image tile MUST have an "imageCategory" field AND a brief starting with the category tag.',
    '',
    'CATEGORIES:',
    '- [STORE_HERO] = First image in store, above menu. Represents brand instantly.',
    '  Elements: slogan/headline, product, lifestyle, abstract/texture. NO CTA button.',
    '  Do NOT specify logo placement or size. Do NOT specify exact font styles.',
    '  Example: "[STORE_HERO] ' + brand + ' brand world, warm lifestyle backdrop, headline: Best Quality Since 2015"',
    '',
    '- [BENEFIT] = USPs, trust signals, quality markers.',
    '  Elements: text labels, optional award badges. NO product photos, NO people, NO CTA.',
    '  Do NOT specify icon styles or icon descriptions. The designer chooses icons.',
    '  Benefits can be simple statements OR headline + short explanation. Choose what fits the context.',
    '  On subpages or About Us: a catchy headline + brief explanation (max 5-6 words) works well.',
    '  On homepage or benefit banners: simple USP statements are often enough.',
    '  Banner form (single wide image with visual columns) or Grid form (multiple tiles).',
    '  For SMALL SQUARE tiles (SS 750x750): exactly ONE benefit per tile.',
    '  For WIDE tiles (W 1500x750+) or LARGE tiles: multiple benefits allowed.',
    '  Example simple: "[BENEFIT] 4 USPs: BPA-frei, Made in Germany, 100% recycled, 5 Jahre Garantie"',
    '  Example with explanation: "[BENEFIT] BPA-frei. Alle Materialien sind schadstofffrei und lebensmittelecht."',
    '',
    '- [PRODUCT] = Product clearly in focus. Background can be clean, colored, or styled freely.',
    '  Elements: product photo, optional name/CTA/badge. Product takes majority of area.',
    '  Example: "[PRODUCT] ' + brand + ' Spray bottle, 45° angle, light gray bg, badge: NEW"',
    '',
    '- [CREATIVE] = Compositions combining products, text, graphics, or lifestyle elements. Engaging and visually appealing.',
    '  Dual goal: engagement (emotion) AND information (explain/categorize/trigger action).',
    '  Functions: category navigation, product explanation, promotion, storytelling, service.',
    '  Example: "[CREATIVE] Split layout: left brand-color gradient with headline, right product close-up + 3 feature icons"',
    '',
    '- [LIFESTYLE] = Lifestyle photo dominates (70-80%+). Text is subordinate/optional.',
    '  Elements: professional photo, product in use, optional short text line.',
    '  Do NOT specify logo placement. Do NOT add dark overlays or gradients unless brand requires it.',
    '  Example: "[LIFESTYLE] Person applying ' + brand + ' product in garden, sunny day, product prominent"',
    '',
    '- [TEXT_IMAGE] = Text and/or graphics dominant. NO product/lifestyle photos.',
    '  Full control over typography. Replaces Amazon text fields.',
    '  Functions: section heading, feature explanation, brand claim, tech specs.',
    '  Example: "[TEXT_IMAGE] Section heading: Unsere Bestseller — bold display font, brand blue bg"',
    '',
    '- [SHOPPABLE] = Shorthand for PRODUCT category with shoppable_image tile type. Clean packshot, clickable.',
    '  For single product: use linkAsin. For multiple products/variants: use hotspots array (max 5).',
    '  IMPORTANT: Hotspots + CTA = Amazon overlays, NOT designed into the image!',
    '  Example single: "[SHOPPABLE] ' + brand + ' bestseller, white bg, product centered, soft shadow"',
    '  Example multi: "[SHOPPABLE] ' + brand + ' 3 color variants on neutral bg, each variant clearly separated"',
    '',
    'CATEGORY DECISION LOGIC:',
    '1. First image above menu? → STORE_HERO',
    '2. Pure text/graphics, no photo? → TEXT_IMAGE',
    '3. Product on plain bg as main focus? → PRODUCT',
    '4. Lifestyle photo >70% with subtle text? → LIFESTYLE',
    '5. Only USPs/icons/awards, no product photos? → BENEFIT',
    '6. Combines 2-3 elements equally? → CREATIVE',
    '',
    'BACKGROUND RULES:',
    '- NEVER use dark backgrounds by default. No black, dark gray, dark navy, or dark green.',
    '- Default backgrounds: white, light gray, warm neutrals, or brand colors.',
    '- Dark backgrounds ONLY when the brand explicitly uses them (e.g. premium tech brands).',
    '- For product shots: light/neutral or brand-color gradient backgrounds work best.',
    '',
    'BRIEF RULES:',
    '- Keep briefs SHORT: max 15-20 words after the tag.',
    '- Name the specific ' + brand + ' product or category from the product list.',
    '- textOverlay MUST be in store language (' + lang + ') — use real product/category names.',
    '- Do NOT use generic placeholders like "[product]" or "lifestyle image".',
    '- NEVER place two identical image categories directly adjacent (e.g. two LIFESTYLE sections in a row).',
    '',
    'USP CONSISTENCY RULES:',
    '- Use the EXACT same wording for each USP across the entire store. If one tile says "BPA-frei", every tile must say "BPA-frei" (not "Ohne BPA" or "BPA Free").',
    '- For SMALL SQUARE tiles (750x750): exactly ONE benefit/USP per tile. Headline + 1-sentence explanation.',
    '- For WIDE tiles (1500x750+) or LARGE SQUARE tiles (1500x1500): multiple USPs allowed.',
    '- On detail pages, a catchy benefit headline + short explanation (max 5-6 words) can work well. On overview pages, simple USP labels are fine.',
    '',
    'SMART PRODUCT DISPLAY LOGIC (' + pageProducts.length + ' products on this page):',
    '- ALWAYS prioritize individual image modules (shoppable_image, lifestyle, creative) over product_grids.',
    '- Feature the BEST SELLERS from each category as individual tiles with rich design (lifestyle shots, product close-ups, benefit overlays).',
    '- product_grids are a SUPPLEMENT, not a replacement. They go BELOW the curated modules to show remaining products.',
    pageProducts.length <= 8
      ? '- With ' + pageProducts.length + ' products: Each product can get individual attention. Use modules, no product_grid needed unless explicitly helpful.'
      : pageProducts.length <= 30
        ? '- With ' + pageProducts.length + ' products: Feature top products individually in modules. Use product_grid at the end for the full catalog.'
        : '- With ' + pageProducts.length + ' products: Describe categories with rich modules, pick the best seller from each category for individual tiles. Product_grids below each category section show the remaining products (up to 20-30 per grid).',
    '',
    'MINIMUM SECTIONS:',
    complexityLevel === 1
      ? (isHomepage
          ? '- Minimal tier: Homepage ' + (pageProducts.length <= 5 ? '2-3' : '3-4') + ' sections MAXIMUM. Hero + category nav is enough for small catalogs. Do NOT repeat the same products across multiple sections.'
          : '- Minimal tier: Category page 2 sections MAXIMUM. Hero/header + product display. No product_grid if products shown as shoppable_image.')
      : complexityLevel === 3
        ? (isHomepage ? '- Premium tier: Homepage 7-12 sections. Rich variety of all image categories.' : '- Premium tier: Category page 4-7 sections. Full range of image categories.')
        : (isHomepage ? '- Standard tier: Homepage 5-8 sections. Good variety.' : '- Standard tier: Category page 3-5 sections.'),
    '',
    'DEDUPLICATION (CRITICAL):',
    '- NEVER feature the same ASIN or product in more than ONE section on the same page.',
    '- If there are only ' + pageProducts.length + ' products, each product should appear AT MOST ONCE as a shoppable_image/linkAsin.',
    '- With ' + pageProducts.length + ' products, you need AT MOST ' + pageProducts.length + ' product-featuring sections (including the category nav).',
    pageProducts.length <= 5 ? '- SMALL CATALOG (' + pageProducts.length + ' products): Keep it lean. Hero + category nav + 1 optional highlight = DONE. Do NOT pad with repetitive sections.' : '',
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
    '        "imageCategory": "store_hero",',
    '        "brief": "[STORE_HERO] ' + brand + ' brand world, logo + lifestyle backdrop, claim: ' + (analysis.heroMessage || brand) + '",',
    '        "textOverlay": "' + (analysis.heroMessage || brand) + '",',
    '        "ctaText": "",',
    '        "dimensions": {"w": 3000, "h": 700}',
    '      }]',
    '    },',
    '    {',
    '      "layoutId": "std-2equal",',
    '      "tiles": [',
    '        {"type": "image", "imageCategory": "creative", "brief": "[CREATIVE] ' + brand + ' category name on brand-color background, bold typography + product silhouette", "textOverlay": "[Category Name]", "ctaText": "", "dimensions": {"w": 1500, "h": 1500}},',
    '        {"type": "shoppable_image", "imageCategory": "product", "brief": "[SHOPPABLE] ' + brand + ' bestseller packshot on white, soft shadow", "textOverlay": "", "ctaText": "", "dimensions": {"w": 1500, "h": 1500}, "linkAsin": "' + (pageProducts[0] ? pageProducts[0].asin : 'B0XXXXXXXXXX') + '"}',
    '      ]',
    '    },',
    '    ... more sections',
    '  ]',
    '}',
    '',
    isHomepage
      ? (pageProducts.length <= 5 && complexityLevel === 1
        ? [
          'HOMEPAGE SECTIONS — SMALL CATALOG, MINIMAL TIER (' + pageProducts.length + ' products):',
          'Generate EXACTLY 2-3 sections. Do NOT generate more. Every product appears AT MOST ONCE.',
          'Each tile MUST include "imageCategory" field.',
          '',
          '1. STORE HERO (layout "1"): imageCategory="store_hero". Brand hero image. Logo + claim. NO CTA.',
          '2. CATEGORY NAVIGATION (layout based on count: 2="std-2equal", 3="vh-w2s"):',
          '   Each tile imageCategory="creative". Category name on brand-color bg + product silhouette + CTA. textOverlay = EXACT category name. Each tile links to its category page via linkUrl.',
          '3. (OPTIONAL, only if it adds value) BENEFIT SECTION (layout "1" or "vh-2equal"):',
          '   imageCategory="benefit". USPs/quality markers. NO product photos, NO linkAsin.',
          '',
          'DO NOT add any more sections. NO bestseller showcase, NO product grid, NO lifestyle split, NO brand story, NO footer nav.',
          'With only ' + pageProducts.length + ' products, the category pages handle product display. The homepage is just navigation + brand impression.',
          'EVERY brief must name specific ' + brand + ' products — generic briefs are FORBIDDEN.',
        ].join('\n')
        : [
          'HOMEPAGE SECTIONS — The homepage is a NAVIGATION HUB. Its purpose is to showcase brand identity and guide shoppers to category pages. Do NOT display random products here.',
          'Generate sections in this order, adapt count to tier/catalog size:',
          'Each tile MUST include "imageCategory" field. Follow the recommended flow: STORE_HERO → CREATIVE/LIFESTYLE → PRODUCT → TEXT_IMAGE → BENEFIT → CREATIVE → PRODUCT → LIFESTYLE → BENEFIT.',
          '',
          '1. STORE HERO (layout "1"): imageCategory="store_hero". Brand hero image. Logo + claim + optional lifestyle/product. NO CTA.',
          '2. CATEGORY NAVIGATION (layout based on count: 2="std-2equal", 4="std-4equal" or "2x2wide", 5+="lg-4grid"):',
          '   Each tile imageCategory="creative". Category name on brand-color bg + product silhouette + CTA. textOverlay = EXACT category name. linkUrl = "/pageid" to link to category page.',
          pageProducts.length > 5 ? '3. BESTSELLER SHOWCASE (layout "std-2equal" or "lg-2stack"): Tile 1 imageCategory="product" as shoppable_image with real ASIN. Tile 2 imageCategory="creative" with feature text.' : '',
          pageProducts.length > 8 ? '4. PRODUCT GRID (layout "1"): type "product_grid" with top 5-8 products by rating.' : '',
          '5. BENEFIT SECTION (layout "1" or "vh-w2s"): imageCategory="benefit". USP icons/awards on brand-colored bg. No product photos.',
          complexityLevel >= 2 ? '6. LIFESTYLE SPLIT (layout "std-2equal"): Tile 1 imageCategory="lifestyle" — product in use. Tile 2 imageCategory="product" as shoppable_image with linkAsin.' : '',
          complexityLevel >= 3 ? '7. BRAND STORY (layout "lg-2stack" or "2stack-lg"): Large tile imageCategory="lifestyle". Wide tiles imageCategory="creative".' : '',
          complexityLevel >= 2 ? '8. FOOTER NAV (layout "std-4equal" or "2x2wide"): imageCategory="creative" category tiles.' : '',
          '',
          'IMPORTANT: Each product/ASIN must appear AT MOST ONCE across all sections. Do NOT repeat the same product in multiple sections.',
          'For 5+ categories, use lg-4grid (5 tiles) or split into two rows.',
          'EVERY brief must name specific ' + brand + ' products — generic briefs are FORBIDDEN.',
          'NEVER place two identical imageCategories adjacent (e.g. two lifestyle sections in a row).',
        ].filter(Boolean).join('\n')
      )
      : [
          isSubpage
            ? 'This is a SUBCATEGORY PAGE. PRIORITIZE navigation to subcategories (if any) over full-width hero. Simple category intro only.'
            : pageName.indexOf('(Category Overview)') >= 0
            ? 'This is a CATEGORY OVERVIEW page. PRIORITIZE navigation to subcategories over product display. Include category navigation tiles (each with textOverlay = subcategory name) before any product grids.'
            : '',
          'CATEGORY PAGE "' + pageName + '" SECTIONS (generate ALL of these):',
          'Each tile MUST include "imageCategory" field. Follow flow: STORE_HERO/CREATIVE → TEXT_IMAGE → PRODUCT → CREATIVE → BENEFIT → PRODUCT → LIFESTYLE.',
          '',
          isSubpage
            ? '1. PAGE HEADER (layout "std-2equal" or "lg-2stack"): imageCategory="creative" — simple category intro with ' + pageName + ' products. NO full-width hero banner for subcategory pages.'
            : '1. PAGE HEADER (layout "1"): imageCategory="store_hero" or "creative". ' + pageName + ' products featured. Name specific products.',
          '2. TEXT_IMAGE HEADING (layout "1"): imageCategory="text_image". Category headline/explanation in ' + lang + '.',
          '3. PRODUCT HIGHLIGHT (layout "std-2equal" or "lg-2stack"):',
          '   Tile 1 imageCategory="product" as shoppable_image with real ASIN.',
          '   Tile 2 imageCategory="creative" — feature tile with headline + product info.',
          '4. PRODUCT GRID (layout "1"): type "product_grid" with ALL ' + pageProducts.length + ' ASINs. MANDATORY.',
          '5. BENEFIT SECTION: imageCategory="benefit". Category-specific USPs. No product photos.',
          '6. LIFESTYLE ACTION (layout "std-2equal"):',
          '   imageCategory="lifestyle" — complementary scenes with ' + pageName + ' products.',
          analysis.productComplexity === 'complex' || analysis.productComplexity === 'variantRich'
            ? '7. VARIANT SHOWCASE (layout "lg-4grid"): imageCategory="product" — large hero + 4 variant tiles.'
            : '7. CROSS-SELL (layout "vh-w2s"): imageCategory="creative" — wide tile + two square tiles linking to related categories.',
          '',
          'MINIMUM 5 sections. EVERY brief must start with [STORE_HERO], [BENEFIT], [PRODUCT], [CREATIVE], [LIFESTYLE], [TEXT_IMAGE], or [SHOPPABLE] tag.',
          'Every image tile MUST have imageCategory set to one of: store_hero, benefit, product, creative, lifestyle, text_image.',
          'Use shoppable_image (with real linkAsin) for any clickable product.',
        ].filter(Boolean).join('\n'),
  ].filter(Boolean).join('\n');

  var text = await callClaude(system, user, 8000);
  var result = extractJSON(text);

  // Validate and fix sections
  (result.sections || []).forEach(function(sec) {
    sec.layoutId = resolveLayoutId(sec.layoutId);
    var layout = findLayout(sec.layoutId);
    if (!layout) {
      sec.layoutId = '1';
      layout = LAYOUTS[0];
    }
    var tileDims = LAYOUT_TILE_DIMS[sec.layoutId];
    while (sec.tiles.length < layout.cells) {
      var idx = sec.tiles.length;
      var dd = tileDims && tileDims[idx] ? tileDims[idx] : { w: 3000, h: 1200 };
      sec.tiles.push({
        type: 'image', brief: 'Additional image tile', textOverlay: '', ctaText: '',
        dimensions: { w: dd.w, h: dd.h }, asins: [],
      });
    }
    if (sec.tiles.length > layout.cells) {
      sec.tiles = sec.tiles.slice(0, layout.cells);
    }
    sec.tiles.forEach(function(t, ti) {
      if (!t.type) t.type = 'image';
      if (!t.brief) t.brief = '';
      if (!t.textOverlay) t.textOverlay = '';
      if (!t.ctaText) t.ctaText = '';
      if (!t.dimensions) {
        var dd = tileDims && tileDims[ti] ? tileDims[ti] : { w: 3000, h: 1200 };
        t.dimensions = { w: dd.w, h: dd.h };
      }
      if (!t.asins) t.asins = [];
      // Set mobileDimensions based on layout type:
      // Standard (LS, SS, W): same image for desktop and mobile (designer creates once)
      // Full-width: mobile is 1680px wide, height taller than desktop for text readability
      // VH: fixed 1500×750
      if (layout && layout.type === 'vh') {
        t.mobileDimensions = { w: 1500, h: 750 };
      } else if (layout && layout.type === 'fullwidth' && t.dimensions) {
        // Full-width: mobile = 1680px wide, independent height. Enforce max ratio 5:1.
        var mobileH = (t.mobileDimensions && t.mobileDimensions.h) || t.dimensions.h;
        t.mobileDimensions = { w: 1680, h: Math.max(mobileH, Math.ceil(1680 / 5)) };
      } else if (t.dimensions) {
        t.mobileDimensions = { w: t.dimensions.w, h: t.dimensions.h };
      }
      // Shoppable images not allowed in VH layouts — convert to regular image
      if (layout && layout.type === 'vh' && t.type === 'shoppable_image') {
        t.type = 'image';
      }
      // Enforce minimum Wide height of 750px
      if (t.dimensions && t.dimensions.w === 1500 && t.dimensions.h < 750) {
        t.dimensions.h = 750;
        t.mobileDimensions = { w: 1500, h: 750 };
      }
      // Enforce aspect ratio limits: Desktop max 15:1, Mobile max 5:1
      if (t.dimensions && t.dimensions.w && t.dimensions.h) {
        var minDesktopH = Math.ceil(t.dimensions.w / 15);
        if (t.dimensions.h < minDesktopH) t.dimensions.h = minDesktopH;
      }
      if (t.mobileDimensions && t.mobileDimensions.w && t.mobileDimensions.h) {
        var minMobileH = Math.ceil(t.mobileDimensions.w / 5);
        if (t.mobileDimensions.h < minMobileH) t.mobileDimensions.h = minMobileH;
      }
      // Infer imageCategory from brief tag if not explicitly set
      if (!t.imageCategory && t.brief && t.type !== 'product_grid' && t.type !== 'text' && t.type !== 'video') {
        t.imageCategory = inferImageCategory(t.brief, t.type);
      }
      // Strip category tags from brief text (redundant since category is set via dropdown)
      if (t.brief) {
        t.brief = t.brief.replace(/\[(STORE_HERO|BENEFIT|PRODUCT|CREATIVE|LIFESTYLE|TEXT_IMAGE|SHOPPABLE)\]\s*/gi, '').trim();
      }
      // ─── EVERY IMAGE TILE NEEDS A LINK (linkAsin or linkUrl) ───
      // Every clickable tile should link somewhere — either to a product (linkAsin) or a store page (linkUrl).
      // If neither is set and it's an image-type tile, assign a product ASIN.
      if ((t.type === 'image' || t.type === 'shoppable_image' || t.type === 'image_text') && !t.linkAsin && !t.linkUrl && !(t.hotspots && t.hotspots.length > 0)) {
        // Skip store_hero and benefit tiles (they don't need links)
        if (t.imageCategory !== 'store_hero' && t.imageCategory !== 'benefit' && t.imageCategory !== 'text_image') {
          if (t.asins && t.asins.length > 0) {
            t.linkAsin = t.asins[0];
          } else if (pageProducts.length > 0) {
            t.linkAsin = pageProducts[ti % pageProducts.length].asin;
          }
        }
      }
      // Remove em-dashes from all text fields (replace with colon or period)
      if (t.textOverlay) t.textOverlay = t.textOverlay.replace(/\s*[\u2014\u2013]\s*/g, '. ').replace(/\.\s*\./g, '.');
      if (t.brief) t.brief = t.brief.replace(/\s*[\u2014\u2013]\s*/g, ': ').replace(/:\s*:/g, ':');
      if (t.ctaText) t.ctaText = t.ctaText.replace(/[\u2014\u2013]/g, '');
    });
    sec.id = uid();
  });

  // ─── DEDUPLICATION: Remove sections that repeat ASINs already shown ───
  // For small catalogs especially, this prevents 3 sections showing the same product
  var seenAsins = {};
  var seenLinkUrls = {};
  var deduped = [];
  (result.sections || []).forEach(function(sec, si) {
    // Always keep the first section (hero) and category-nav sections (all creative with linkUrl)
    if (si === 0) { deduped.push(sec); return; }

    // ─── DEDUPLICATE TILE LINKS WITHIN A PAGE ───
    // No two tiles on the same page should link to the same ASIN or the same store URL.
    // If a tile's linkAsin or linkUrl is already used, clear the duplicate link.
    sec.tiles.forEach(function(t) {
      if (t.linkAsin && seenLinkUrls['asin:' + t.linkAsin]) {
        // This ASIN is already linked elsewhere on this page — remove duplicate link
        t.linkAsin = '';
      } else if (t.linkAsin) {
        seenLinkUrls['asin:' + t.linkAsin] = true;
      }
      if (t.linkUrl && seenLinkUrls['url:' + t.linkUrl]) {
        // This URL is already linked elsewhere on this page — remove duplicate link
        t.linkUrl = '';
      } else if (t.linkUrl) {
        seenLinkUrls['url:' + t.linkUrl] = true;
      }
    });

    // Check if this section only features ASINs we already have
    var sectionAsins = [];
    sec.tiles.forEach(function(t) {
      if (t.linkAsin) sectionAsins.push(t.linkAsin);
      if (t.asins) t.asins.forEach(function(a) { sectionAsins.push(a); });
      if (t.hotspots) t.hotspots.forEach(function(hs) { if (hs.asin) sectionAsins.push(hs.asin); });
    });
    // If ALL ASINs in this section were already seen, skip the section
    if (sectionAsins.length > 0) {
      var allDupes = sectionAsins.every(function(a) { return seenAsins[a]; });
      if (allDupes) return; // skip duplicate section
    }
    // Track ASINs from this section
    sectionAsins.forEach(function(a) { seenAsins[a] = true; });
    deduped.push(sec);
  });
  result.sections = deduped;

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
                imageCategory: t.imageCategory || '',
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
    'Valid image categories: store_hero, benefit, product, creative, lifestyle, text_image',
    'Every image tile should have an imageCategory. When adding/updating tiles, always include imageCategory.',
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
        var addDims = LAYOUT_TILE_DIMS[newSec.layoutId];
        newSec.tiles.forEach(function(t, ti) {
          if (!t.type) t.type = 'image';
          if (!t.brief) t.brief = '';
          if (!t.textOverlay) t.textOverlay = '';
          if (!t.ctaText) t.ctaText = '';
          if (!t.dimensions) {
            var dd = addDims && addDims[ti] ? addDims[ti] : { w: 3000, h: 1200 };
            t.dimensions = { w: dd.w, h: dd.h };
          }
          if (!t.asins) t.asins = [];
          if (!t.imageCategory && t.type !== 'product_grid' && t.type !== 'text' && t.type !== 'video') {
            t.imageCategory = inferImageCategory(t.brief, t.type);
          }
          // Strip category tags from brief text
          if (t.brief) {
            t.brief = t.brief.replace(/\[(STORE_HERO|BENEFIT|PRODUCT|CREATIVE|LIFESTYLE|TEXT_IMAGE|SHOPPABLE)\]\s*/gi, '').trim();
          }
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
          op.newLayoutId = resolveLayoutId(op.newLayoutId);
          var newLayout = findLayout(op.newLayoutId);
          if (newLayout) {
            sec2.layoutId = op.newLayoutId;
            var chDims = LAYOUT_TILE_DIMS[op.newLayoutId];
            while (sec2.tiles.length < newLayout.cells) {
              var ci = sec2.tiles.length;
              var dd = chDims && chDims[ci] ? chDims[ci] : { w: 3000, h: 1200 };
              sec2.tiles.push({ type: 'image', brief: '', textOverlay: '', ctaText: '', dimensions: { w: dd.w, h: dd.h }, asins: [] });
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
          var pgDims = LAYOUT_TILE_DIMS[s.layoutId];
          (s.tiles || []).forEach(function(t, ti) {
            if (!t.type) t.type = 'image';
            if (!t.brief) t.brief = '';
            if (!t.textOverlay) t.textOverlay = '';
            if (!t.ctaText) t.ctaText = '';
            if (!t.dimensions) {
              var dd = pgDims && pgDims[ti] ? pgDims[ti] : { w: 3000, h: 1200 };
              t.dimensions = { w: dd.w, h: dd.h };
            }
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

// ─── ENSURE MINIMUM SECTIONS PER PAGE ───
function ensureMinimumSections(sections, pageName, brand, lang, analysis, template, isHomepage, complexityLevel) {
  // Count total products across all categories to detect small catalogs
  var totalProducts = 0;
  (analysis.categories || []).forEach(function(c) { totalProducts += (c.asins || []).length; });

  var minSections;
  if (complexityLevel === 1) {
    // Small catalog: Hero + category nav is enough
    if (totalProducts <= 5) {
      minSections = isHomepage ? 2 : 1;
    } else {
      minSections = isHomepage ? 3 : 2;
    }
  } else if (complexityLevel === 3) {
    minSections = isHomepage ? 7 : 4;
  } else {
    minSections = isHomepage ? 5 : 3;
  }
  if (sections.length >= minSections) return sections;

  // Use template blueprint to fill missing sections
  var blueprint = null;
  if (template) {
    blueprint = isHomepage ? template.homepage : template.categoryPage;
  }

  var cta = lang === 'German' ? 'Jetzt entdecken' : 'Shop now';

  while (sections.length < minSections) {
    var idx = sections.length;
    if (blueprint && blueprint[idx]) {
      var bp = blueprint[idx];
      var layout = findLayout(resolveLayoutId(bp.layout)) || LAYOUTS[0];
      var tiles = (bp.tileTypes || ['image']).map(function(type) {
        var dim = type === 'video' ? { w: 3000, h: 1688 } : { w: 3000, h: 1200 };
        return {
          type: type,
          brief: bp.brief.replace(/\[product\]/g, brand + ' product').replace(/\[category product\]/g, pageName + ' products'),
          textOverlay: type === 'text' ? pageName : '',
          ctaText: type === 'image' ? cta : '',
          dimensions: dim, asins: [],
        };
      });
      // Ensure tile count matches layout
      while (tiles.length < layout.cells) {
        tiles.push({ type: 'image', brief: '[PRODUCT] ' + brand + ' ' + pageName + ' product on neutral background', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] });
      }
      if (tiles.length > layout.cells) tiles = tiles.slice(0, layout.cells);
      sections.push({ id: uid(), layoutId: bp.layout, tiles: tiles });
    } else {
      // Generic fallback patterns
      var patterns = [
        { layoutId: '1-1', tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' ' + pageName + ' products in use, natural setting', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
          { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + brand + ' ' + pageName + ' bestseller packshot on white', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
        ] },
        { layoutId: '1-1-1', tiles: [
          { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] Primary ' + brand + ' ' + pageName + ' USP with label.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
          { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] Secondary ' + brand + ' ' + pageName + ' USP with label.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
          { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] Tertiary ' + brand + ' ' + pageName + ' USP with label.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
        ] },
        { layoutId: '1', tiles: [
          { type: 'image', imageCategory: 'text_image', brief: '[TEXT_IMAGE] ' + brand + ' brand values statement for ' + pageName + ', bold headline, brand colors', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 800 }, asins: [] },
        ] },
      ];
      var pattern = patterns[(idx - (blueprint ? blueprint.length : 0)) % patterns.length];
      sections.push(Object.assign({ id: uid() }, JSON.parse(JSON.stringify(pattern))));
    }
  }

  return sections;
}

// ─── FULL GENERATION WORKFLOW ───
export async function generateStore(asins, products, brand, marketplace, lang, userInstructions, onLog, complexityLevel, template, websiteData, referenceAnalysis, featureOptions) {
  var log = onLog || function() {};
  var cLevel = complexityLevel || 2;
  var cConfig = COMPLEXITY_LEVELS[cLevel] || COMPLEXITY_LEVELS[2];
  var opts = featureOptions || {};
  var extraPageFlags = opts.extraPages || {};
  var includeProductVideos = opts.includeProductVideos || false;

  // STEP 1: AI Analysis
  log('AI analyzing product catalog and planning store structure...');
  log('   Complexity: Level ' + cLevel + ' (' + cConfig.name + ')');
  if (template) {
    log('   Template: ' + template.name + ' (inspired by ' + template.inspiration + ')');
  }
  if (websiteData) {
    log('   Brand website: ' + (websiteData.title || websiteData.url || 'scanned'));
    if (websiteData.aboutText) log('   Brand story content found');
    if (websiteData.certifications && websiteData.certifications.length > 0) log('   Certifications/USPs: ' + websiteData.certifications.length + ' found');
  }
  // Check if user provided a menu structure BEFORE calling AI
  var parsedMenu = parseMenuStructure(userInstructions);
  var userHasMenu = parsedMenu && parsedMenu.categories.length > 0;
  if (userHasMenu) {
    log('Menu structure detected: ' + parsedMenu.categories.map(function(c) {
      var s = c.name;
      if (c.subcategories && c.subcategories.length > 0) s += ' (' + c.subcategories.map(function(sc) { return sc.name; }).join(', ') + ')';
      return s;
    }).join(' | '));
  } else {
    log('No menu structure detected — AI will create categories from products.');
  }

  var analysis;
  try {
    analysis = await aiAnalyzeProducts(products, brand, lang, marketplace, userInstructions, websiteData, referenceAnalysis);
    // Validate that we got actual categories
    if (!analysis.categories || analysis.categories.length === 0) {
      log('AI returned no categories, using fallback grouping...');
      analysis = fallbackAnalysis(products, brand, lang, userInstructions);
    } else if (analysis.categories.length === 1 && analysis.categories[0].name.match(/sonstige|andere|other|misc|all/i)) {
      log('AI grouped everything into one generic category, using smarter fallback...');
      analysis = fallbackAnalysis(products, brand, lang, userInstructions);
    }
  } catch (err) {
    log('AI analysis failed (' + err.message + '), falling back to deterministic grouping...');
    analysis = fallbackAnalysis(products, brand, lang, userInstructions);
  }

  // SAFETY NET: If user provided menu structure but analysis categories don't match, force-apply it
  if (userHasMenu) {
    var userCatNames = parsedMenu.categories.map(function(c) { return c.name.toLowerCase().trim(); });
    var analysisCatNames = (analysis.categories || []).map(function(c) { return c.name.toLowerCase().trim(); });
    var menuMatches = userCatNames.filter(function(n) { return analysisCatNames.indexOf(n) >= 0; }).length;
    if (menuMatches < userCatNames.length * 0.5) {
      log('WARNING: AI categories do not match user menu structure. Force-applying user menu...');
      var allAsins = products.map(function(p) { return p.asin; });
      analysis.categories = enforceMenuCategories(parsedMenu.categories, analysis.categories, allAsins);
      analysis.suggestedPages = ['Homepage'].concat(analysis.categories.map(function(c) { return c.name; }));
      analysis._menuSource = 'user';
    }
  }

  log('Structure planned: ' + (analysis.categories || []).length + ' categories' + (analysis._menuSource === 'user' ? ' (from YOUR menu structure)' : ' (AI-generated)'));
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

  // Product category for CATEGORY_STYLE_HINTS — use user selection first, then AI fallback
  var category = (opts.referenceCategory && opts.referenceCategory !== 'generic') ? opts.referenceCategory : 'generic';
  if (category === 'generic') {
    // Fallback: try to derive from AI analysis brand tone
    var toneToCategory = {
      'professional/technical': 'tools',
      'lifestyle/premium': 'beauty',
      'playful/colorful': 'toys',
      'sporty/bold': 'sports',
      'clean/minimal': 'fashion',
      'natural/organic': 'health',
    };
    if (template && template.style && toneToCategory[template.style]) {
      category = toneToCategory[template.style];
    } else if (analysis.brandTone && toneToCategory[analysis.brandTone]) {
      category = toneToCategory[analysis.brandTone];
    }
  }

  // Build product lookup
  var productMap = {};
  products.forEach(function(p) { productMap[p.asin] = p; });

  var pages = [];

  // STEP 2: Generate Homepage Layout
  log('AI designing Homepage layout...');
  // Homepage = navigation hub: pick top 1 product per category as hero/representative
  var homepageProducts = [];
  (analysis.categories || []).forEach(function(cat) {
    var catAsins = (cat.asins || []).slice();
    if (cat.subcategories) cat.subcategories.forEach(function(s) { catAsins = catAsins.concat(s.asins || []); });
    var catProds = catAsins.map(function(a) { return productMap[a]; }).filter(Boolean);
    catProds.sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); });
    if (catProds[0]) homepageProducts.push(catProds[0]);
  });
  // Add a few more top sellers if we have very few categories
  if (homepageProducts.length < 3) {
    var topByReview = products.slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); });
    for (var tbi = 0; tbi < topByReview.length && homepageProducts.length < 5; tbi++) {
      if (homepageProducts.indexOf(topByReview[tbi]) < 0) homepageProducts.push(topByReview[tbi]);
    }
  }
  try {
    var homeResult = await aiGeneratePageLayout(
      'Homepage', homepageProducts, brand, lang, true,
      analysis.categories || [], analysis, userInstructions, cLevel, category, template, websiteData, referenceAnalysis, false
    );
    var homeSections = ensureMinimumSections(homeResult.sections || [], 'Homepage', brand, lang, analysis, template, true, cLevel);
    pages.push({ id: 'homepage', name: 'Homepage', sections: homeSections });
    log('Homepage: ' + homeSections.length + ' sections');
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
    // Never skip user-defined categories — create a page even with 0 products
    if (allCatProducts.length === 0) {
      log('Warning: "' + cat.name + '" has 0 matched products. Creating placeholder page...');
      pages.push({
        id: parentPageId,
        name: cat.name,
        sections: [
          { id: uid(), layoutId: '1', tiles: [{ type: 'image', imageCategory: 'store_hero', brief: '[STORE_HERO] Category hero for "' + cat.name + '". Lifestyle photo showing ' + brand + ' products, logo, brand tone: ' + (analysis.brandTone || 'professional') + '.', textOverlay: cat.name, ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [] }] },
          { id: uid(), layoutId: '1-1', tiles: [
            { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] Feature/benefit tile for "' + cat.name + '" showing key product advantage with headline.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
            { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' ' + cat.name + ' products in real-world use, natural setting.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
          ] },
        ],
      });
      continue;
    }

    // Generate the parent category page
    log('AI designing "' + cat.name + '" page (' + allCatProducts.length + ' products)...');
    var catPageName = hasSubs ? cat.name + ' (Category Overview)' : cat.name;
    try {
      var catResult = await aiGeneratePageLayout(
        catPageName, allCatProducts, brand, lang, false,
        categories, analysis, userInstructions, cLevel, category, template, websiteData, referenceAnalysis, false
      );
      var catSections = ensureMinimumSections(catResult.sections || [], cat.name, brand, lang, analysis, template, false, cLevel);
      pages.push({ id: parentPageId, name: cat.name, sections: catSections });
      log(cat.name + ': ' + catSections.length + ' sections');
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
            categories, analysis, userInstructions, cLevel, category, template, websiteData, referenceAnalysis, true
          );
          var subSections = ensureMinimumSections(subResult.sections || [], sub.name, brand, lang, analysis, template, false, cLevel);
          pages.push({ id: subPageId, name: sub.name, parentId: parentPageId, sections: subSections });
          log('  ' + sub.name + ': ' + subSections.length + ' sections');
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
              imageCategory: 'store_hero',
              brief: '[STORE_HERO] Bundle/savings hero banner for ' + brand + '. Multiple products together, savings messaging, logo. Brand tone: ' + (analysis.brandTone || 'professional') + '.',
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

  // ═══════════════════════════════════════════════════
  // STEP 5: USER-SELECTED EXTRA SUBPAGES
  // Each page is independently toggled via checkboxes.
  // ═══════════════════════════════════════════════════
  var brandTone = analysis.brandTone || 'professional';
  var aboutCtx = (websiteData && websiteData.aboutText ? ' Brand info: ' + websiteData.aboutText.substring(0, 200) : '') + (analysis.brandStory ? ' ' + analysis.brandStory : '');
  var certCtx = websiteData && websiteData.certifications ? websiteData.certifications.slice(0, 5).join(', ') : '';
  var bestProducts = products.slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); });
  var topAsins8 = bestProducts.slice(0, 8).map(function(p) { return p.asin; });
  var topAsins12 = bestProducts.slice(0, 12).map(function(p) { return p.asin; });

  // Helper to create a standard extra page
  function makeExtraPage(name, herobrief, heroOverlay, sections) {
    log('Creating extra page: "' + name + '"...');
    var secs = [
      { id: uid(), layoutId: '1', tiles: [{ type: 'image', imageCategory: 'store_hero', brief: herobrief, textOverlay: heroOverlay, ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [] }] },
    ];
    sections.forEach(function(sec) {
      secs.push({
        id: uid(), layoutId: sec.layout,
        tiles: sec.tiles.map(function(t) {
          return { type: t.type || 'image', imageCategory: t.cat || '', brief: t.brief || '', textOverlay: t.overlay || '', ctaText: t.cta || '', dimensions: t.dim || { w: 1500, h: 1000 }, asins: t.asins || [] };
        }),
      });
    });
    pages.push({ id: uid(), name: name, sections: secs });
  }

  // ── Produktauswahl (Quiz) ──
  if (extraPageFlags.product_selector && products.length >= 4) {
    log('Generating Produktauswahl (Quiz) tile...');
    var selCats = (analysis.categories || []).slice(0, 4);
    var isDE = lang === 'German';

    // Build quiz questions from product categories
    var quizQuestions = [];
    // Q1: What type of product are you looking for?
    var q1Answers = selCats.map(function(cat, ci) {
      var catAsins = (cat.asins || []).slice(0, 5);
      return { id: 'a' + (ci + 1), text: cat.name.slice(0, 40), image: null, asins: catAsins };
    });
    // Ensure at least 2 answers
    while (q1Answers.length < 2) {
      q1Answers.push({ id: 'a' + (q1Answers.length + 1), text: isDE ? 'Alle Produkte' : 'All Products', image: null, asins: topAsins8.slice(0, 5) });
    }
    quizQuestions.push({
      id: 'q1',
      questionText: (isDE ? 'Welche Kategorie interessiert dich?' : 'Which category interests you?').slice(0, 55),
      descriptionText: (isDE ? 'Wähle die Kategorie, die am besten passt.' : 'Choose the category that fits best.').slice(0, 80),
      answers: q1Answers.slice(0, 6),
      allowImages: true,
    });

    // Q2: What's important to you? (from key features)
    var keyFeats = (analysis.keyFeatures || []).slice(0, 4);
    if (keyFeats.length >= 2) {
      var q2Answers = keyFeats.map(function(feat, fi) {
        return { id: 'a' + (fi + 1), text: feat.slice(0, 40), image: null, asins: [] };
      });
      quizQuestions.push({
        id: 'q2',
        questionText: (isDE ? 'Was ist dir besonders wichtig?' : 'What matters most to you?').slice(0, 55),
        descriptionText: (isDE ? 'Wähle das Kriterium, das dich am meisten anspricht.' : 'Pick what resonates with you.').slice(0, 80),
        answers: q2Answers.slice(0, 6),
        allowImages: false,
      });
    }

    // Collect all recommended ASINs from quiz answers
    var quizAsins = [];
    quizQuestions.forEach(function(q) {
      (q.answers || []).forEach(function(a) {
        (a.asins || []).forEach(function(asin) {
          if (quizAsins.indexOf(asin) < 0) quizAsins.push(asin);
        });
      });
    });
    // Fallback: use top ASINs if we have no quiz-specific ones
    if (quizAsins.length === 0) quizAsins = topAsins12.slice(0, 10);

    var productSelectorData = createDefaultProductSelector();
    productSelectorData.intro = {
      enabled: true,
      headline: (isDE ? 'Finde dein Produkt' : 'Find Your Product').slice(0, 45),
      description: (isDE ? 'Beantworte wenige Fragen und wir zeigen dir das passende Produkt.' : 'Answer a few questions and we show your perfect match.').slice(0, 70),
      buttonLabel: (isDE ? 'Quiz starten' : 'Start Quiz').slice(0, 20),
      image: null,
    };
    productSelectorData.questions = quizQuestions;
    productSelectorData.results = {
      headline: (isDE ? 'Deine Empfehlungen' : 'Your Recommendations').slice(0, 30),
      description: (isDE ? 'Basierend auf deinen Antworten empfehlen wir dir diese Produkte.' : 'Based on your answers, we recommend these products.').slice(0, 80),
      storePageLink: '',
      restartLabel: (isDE ? 'Quiz wiederholen' : 'Retake Quiz').slice(0, 20),
      disclaimer: '',
    };
    productSelectorData.recommendedAsins = quizAsins.slice(0, 50);

    // Create a page with hero + quiz tile + product grid
    var quizSections = [
      {
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'image', imageCategory: 'store_hero',
          brief: '[STORE_HERO] Produktauswahl hero for ' + brand + '. "' + productSelectorData.intro.headline + '" — inviting, helpful quiz design.',
          textOverlay: productSelectorData.intro.headline,
          dimensions: { w: 3000, h: 600 },
        }],
      },
      {
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'product_selector',
          productSelector: productSelectorData,
          dimensions: { w: 3000, h: 1200 },
        }],
      },
      {
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'product_grid', brief: '', asins: quizAsins.slice(0, 8),
          dimensions: { w: 3000, h: 600 },
        }],
      },
    ];
    pages.push({
      id: uid(),
      name: isDE ? 'Produktauswahl' : 'Product Finder',
      sections: quizSections,
    });
    log('   Produktauswahl page: ' + quizQuestions.length + ' questions, ' + quizAsins.length + ' products');
  }

  // ── Geschenk-Sets ──
  if (extraPageFlags.gift_sets) {
    makeExtraPage(
      lang === 'German' ? 'Geschenk-Sets' : 'Gift Sets',
      '[STORE_HERO] Gift sets hero for ' + brand + '. Festive, warm, inviting gift presentation.',
      lang === 'German' ? 'Geschenk-Sets' : 'Gift Sets',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' gift inspiration: festive presentation showing products as gift ideas. Warm, inviting styling with gift wrapping elements.', dim: { w: 3000, h: 1000 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'Add ONLY bundle/set ASINs here — not individual products.', asins: topAsins12, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Unsere Empfehlungen ──
  if (extraPageFlags.recommendations) {
    makeExtraPage(
      lang === 'German' ? 'Unsere Empfehlungen' : 'Our Recommendations',
      '[STORE_HERO] Recommendations hero for ' + brand + '. Curated selection, editorial feel.',
      lang === 'German' ? 'Unsere Empfehlungen' : 'Our Picks',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' curated picks: editorial-style layout showing why these products stand out. Staff favorites badge or highlight.', dim: { w: 3000, h: 1000 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: '', asins: topAsins12, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Neuheiten ──
  // NOTE: We cannot know which products are actually new. Use product_grid only.
  // The user must manually assign the correct new-arrival ASINs.
  if (extraPageFlags.new_arrivals) {
    makeExtraPage(
      lang === 'German' ? 'Neuheiten' : 'New Arrivals',
      '[STORE_HERO] New arrivals hero for ' + brand + '. Fresh, modern, exciting. "NEW" badge or label.',
      lang === 'German' ? 'Neuheiten' : 'New Arrivals',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' new arrivals teaser: exciting "NEW" badges, fresh packaging, modern styling. No specific products — the grid below shows them.', dim: { w: 3000, h: 1000 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'Replace with ACTUAL new-arrival ASINs. These are placeholder top products.', asins: topAsins8, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Spar-Abo ──
  if (extraPageFlags.subscribe_save) {
    makeExtraPage(
      lang === 'German' ? 'Spar-Abo' : 'Subscribe & Save',
      '[STORE_HERO] Subscribe & Save hero for ' + brand + '. Recurring delivery, savings, convenience.',
      lang === 'German' ? 'Spar-Abo' : 'Subscribe & Save',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] How Subscribe & Save works: 3-step visual guide. Step 1: Choose your ' + brand + ' product. Step 2: Set delivery interval. Step 3: Save money automatically. Clean infographic style.', dim: { w: 3000, h: 1000 } },
        ]},
        { layout: 'vh-w2s', tiles: [
          { cat: 'benefit', brief: '[BENEFIT] ' + (lang === 'German' ? 'Bis zu 15% sparen bei jedem Spar-Abo. Automatische Lieferung, jederzeit kündbar.' : 'Save up to 15% with Subscribe & Save. Automatic delivery, cancel anytime.'), dim: { w: 1500, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + (lang === 'German' ? 'Nie wieder ausgehen. Regelmäßige Lieferung direkt vor die Tür.' : 'Never run out. Regular delivery to your door.'), dim: { w: 750, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + (lang === 'German' ? 'Flexibel: Intervall ändern, pausieren oder kündigen — jederzeit.' : 'Flexible: change interval, pause or cancel — anytime.'), dim: { w: 750, h: 750 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'Replace with ASINs that are available for Subscribe & Save.', asins: topAsins8, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Probiersets ──
  if (extraPageFlags.sample_sets) {
    makeExtraPage(
      lang === 'German' ? 'Probiersets' : 'Sample Sets',
      '[STORE_HERO] Sample sets hero for ' + brand + '. Try before you commit. Discovery, variety.',
      lang === 'German' ? 'Probiersets' : 'Try Our Samples',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' sample/trial sets: show variety packs, starter kits, mini sizes. Emphasize trying different variants before committing.', dim: { w: 3000, h: 1000 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'Replace with ACTUAL sample/trial set ASINs — not individual products.', asins: topAsins8, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Über uns ──
  if (extraPageFlags.about_us) {
    // Build about-us content from crawled data
    var aboutBrief = '[LIFESTYLE] Authentic photo of the people behind ' + brand + '.';
    var valuesBrief = '[CREATIVE] ' + brand + ' brand values and mission.';
    if (websiteData && websiteData.aboutText) {
      aboutBrief = '[LIFESTYLE] ' + brand + ' team/founder: ' + websiteData.aboutText.substring(0, 120).replace(/["\n]/g, ' ').trim() + '.';
      valuesBrief = '[CREATIVE] ' + brand + ' values: ' + websiteData.aboutText.substring(120, 250).replace(/["\n]/g, ' ').trim() + '.';
    } else if (analysis.brandStory) {
      aboutBrief = '[LIFESTYLE] ' + brand + ': ' + analysis.brandStory.substring(0, 120).replace(/["\n]/g, ' ').trim() + '.';
    }
    // Build benefit pillars from features/certifications
    var feats = (websiteData && websiteData.features ? websiteData.features : []).slice(0, 3);
    var pillar1 = feats[0] ? feats[0].slice(0, 60) : (lang === 'German' ? 'Qualität & Expertise' : 'Quality & Expertise');
    var pillar2 = feats[1] ? feats[1].slice(0, 60) : (lang === 'German' ? 'Innovation' : 'Innovation');
    var pillar3 = feats[2] ? feats[2].slice(0, 60) : (lang === 'German' ? 'Für dich gemacht' : 'Made for You');
    makeExtraPage(
      lang === 'German' ? 'Über uns' : 'About Us',
      '[STORE_HERO] Brand story hero for ' + brand + '. Mission, values, origin story. Logo prominent.' + aboutCtx,
      lang === 'German' ? 'Wir sind ' + brand : 'We are ' + brand,
      [
        { layout: 'std-2equal', tiles: [
          { cat: 'lifestyle', brief: aboutBrief },
          { cat: 'creative', brief: valuesBrief },
        ]},
        { layout: 'vh-w2s', tiles: [
          { cat: 'benefit', brief: '[BENEFIT] ' + pillar1 + '.', overlay: pillar1.split(/[.,:]/)[0], dim: { w: 1500, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + pillar2 + '.', overlay: pillar2.split(/[.,:]/)[0], dim: { w: 750, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + pillar3 + '.', overlay: pillar3.split(/[.,:]/)[0], dim: { w: 750, h: 750 } },
        ]},
      ]
    );
  }

  // ── So funktioniert's ──
  if (extraPageFlags.how_it_works) {
    // Build how-it-works content from crawled product features
    var featureList = (websiteData && websiteData.features ? websiteData.features : []);
    var prodFeatures = (analysis.keyFeatures || []);
    var allFeatures = featureList.concat(prodFeatures).slice(0, 6);
    var problemBrief = '[CREATIVE] Problem that ' + brand + ' solves for the customer.';
    var solutionBrief = '[CREATIVE] How ' + brand + ' products solve this problem.';
    if (allFeatures.length >= 2) {
      problemBrief = '[CREATIVE] Customer problem: why ' + brand + ' products matter. Focus on: ' + allFeatures[0].slice(0, 80) + '.';
      solutionBrief = '[CREATIVE] ' + brand + ' solution: ' + allFeatures[1].slice(0, 80) + '. Show mechanism or technology.';
    }
    var proof1 = certCtx.split(',')[0] ? certCtx.split(',')[0].trim() : (lang === 'German' ? 'Geprüfte Qualität' : 'Proven quality');
    var proof2 = certCtx.split(',')[1] ? certCtx.split(',')[1].trim() : (lang === 'German' ? 'Kundenzufriedenheit' : 'Customer satisfaction');
    var proof3 = certCtx.split(',')[2] ? certCtx.split(',')[2].trim() : (lang === 'German' ? 'Ausgezeichnet' : 'Award-winning');
    makeExtraPage(
      lang === 'German' ? 'So funktioniert\'s' : 'How It Works',
      '[STORE_HERO] Educational hero for ' + brand + '. Problem/pain point with solution teaser.',
      lang === 'German' ? 'So funktioniert\'s' : 'How It Works',
      [
        { layout: 'std-2equal', tiles: [
          { cat: 'creative', brief: problemBrief },
          { cat: 'creative', brief: solutionBrief },
        ]},
        { layout: 'vh-w2s', tiles: [
          { cat: 'benefit', brief: '[BENEFIT] ' + proof1 + '. Badge + explanation.', overlay: proof1, dim: { w: 1500, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + proof2 + '. Badge + explanation.', overlay: proof2, dim: { w: 750, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + proof3 + '. Badge + explanation.', overlay: proof3, dim: { w: 750, h: 750 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: '', asins: topAsins8, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Bestseller ──
  // NOTE: Products are sorted by review count as a proxy for bestseller status.
  if (extraPageFlags.bestsellers && bestProducts.length >= 3) {
    makeExtraPage(
      lang === 'German' ? 'Bestseller' : 'Bestsellers',
      '[STORE_HERO] Bestseller hero for ' + brand + '. Top-rated products, aspirational mood, "Bestseller" badge.',
      lang === 'German' ? 'Unsere Bestseller' : 'Our Bestsellers',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' bestseller showcase: editorial "Top Rated" or "Bestseller" styling. Show why customers love these products.', dim: { w: 3000, h: 800 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'Top-rated products by review count. Verify these are actual bestsellers.', asins: topAsins12, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Angebote ──
  // NOTE: We CANNOT know which products are currently on sale. Only use product_grid.
  // The user MUST manually replace the ASINs with actually discounted products.
  if (extraPageFlags.deals) {
    makeExtraPage(
      lang === 'German' ? 'Angebote' : 'Deals',
      '[STORE_HERO] Deals/offers hero for ' + brand + '. Eye-catching, urgency, savings visualization.',
      lang === 'German' ? 'Aktuelle Angebote' : 'Current Deals',
      [
        { layout: '1', tiles: [
          { cat: 'creative', brief: '[CREATIVE] ' + brand + ' deals page: eye-catching savings graphic. Percentage badges, "SALE" labels, urgency elements. No specific products — the grid below shows them.', dim: { w: 3000, h: 800 } },
        ]},
        { layout: '1', tiles: [{ type: 'product_grid', brief: 'IMPORTANT: Replace with ASINs that are CURRENTLY discounted on Amazon. These are placeholder products.', asins: topAsins12, dim: { w: 3000, h: 1200 } }] },
      ]
    );
  }

  // ── Nachhaltigkeit ──
  if (extraPageFlags.sustainability) {
    // Build sustainability content from actual certifications
    var cert1 = certCtx.split(',')[0] ? certCtx.split(',')[0].trim() : '';
    var cert2 = certCtx.split(',')[1] ? certCtx.split(',')[1].trim() : '';
    var cert3 = certCtx.split(',')[2] ? certCtx.split(',')[2].trim() : '';
    var sustainBrief = '[CREATIVE] ' + brand + ' sustainability commitment:';
    if (cert1 || cert2) {
      sustainBrief += ' Highlighting ' + [cert1, cert2].filter(Boolean).join(' and ') + '.';
    }
    sustainBrief += ' Show materials, sourcing practices, and eco-friendly packaging.';
    makeExtraPage(
      lang === 'German' ? 'Nachhaltigkeit' : 'Sustainability',
      '[STORE_HERO] Sustainability hero for ' + brand + '. Green, eco-conscious design.' + (cert1 ? ' Feature: ' + cert1 + '.' : ''),
      lang === 'German' ? 'Unsere Verantwortung' : 'Our Responsibility',
      [
        { layout: 'std-2equal', tiles: [
          { cat: 'creative', brief: sustainBrief },
          { cat: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' eco-friendly production or sustainable packaging in use. Natural setting, green tones.' },
        ]},
        { layout: 'vh-w2s', tiles: [
          { cat: 'benefit', brief: '[BENEFIT] ' + (cert1 || (lang === 'German' ? 'Nachhaltig produziert' : 'Sustainably produced')) + '. Badge icon + 1-sentence explanation of what this means for the customer.', overlay: cert1 || (lang === 'German' ? 'Nachhaltig' : 'Sustainable'), dim: { w: 1500, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + (cert2 || (lang === 'German' ? 'Umweltfreundliche Verpackung' : 'Eco-friendly packaging')) + '. Badge icon + 1-sentence explanation.', overlay: cert2 || (lang === 'German' ? 'Eco-Verpackung' : 'Eco Packaging'), dim: { w: 750, h: 750 } },
          { cat: 'benefit', brief: '[BENEFIT] ' + (cert3 || (lang === 'German' ? 'Verantwortungsvoll beschafft' : 'Responsibly sourced')) + '. Badge icon + 1-sentence explanation.', overlay: cert3 || (lang === 'German' ? 'Verantwortung' : 'Responsible'), dim: { w: 750, h: 750 } },
        ]},
      ]
    );
  }

  // ─── OPTIONAL: Product Videos on Category Pages ───
  if (includeProductVideos) {
    log('Adding product video sections to category pages...');
    pages.forEach(function(pg) {
      if (pg.id === 'homepage') return;
      if (!pg.sections || pg.sections.length < 2) return;
      var videoInsertIdx = Math.max(pg.sections.length - 1, 1);
      pg.sections.splice(videoInsertIdx, 0, {
        id: uid(), layoutId: '1',
        tiles: [{ type: 'video', brief: 'Product demonstration video for ' + pg.name + '. Shows product in action, key features, and usage.', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1688 }, mobileDimensions: { w: 1680, h: 945 }, asins: [] }],
      });
    });
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

  // ─── OPTIONAL: Generate Wireframe Sketches for Image Tiles ───
  if (opts.generateWireframes) {
    log('Generating wireframe sketches for image tiles...');
    var wireframeCount = 0;
    var wireframeFailed = 0;
    var wireframeTotal = 0;

    // Count total image tiles to generate wireframes for
    pages.forEach(function(pg) {
      (pg.sections || []).forEach(function(sec) {
        (sec.tiles || []).forEach(function(tile) {
          if (tile.type === 'image' || tile.type === 'shoppable_image' || tile.type === 'image_text') {
            wireframeTotal++;
          }
        });
      });
    });

    log('   ' + wireframeTotal + ' image tiles found for wireframe generation');

    // Extract CI info for prompts
    var ciColors = '';
    var ciBrandStyle = '';
    if (websiteData) {
      // Try to extract brand colors from website data
      var colorHints = [];
      if (websiteData.rawTextSections) {
        websiteData.rawTextSections.forEach(function(sec) {
          var colorMatch = (sec.text || '').match(/#[0-9A-Fa-f]{3,6}/g);
          if (colorMatch) colorHints = colorHints.concat(colorMatch);
        });
      }
      if (colorHints.length > 0) ciColors = colorHints.slice(0, 4).join(', ');
      ciBrandStyle = (websiteData.description || '') + ' ' + (websiteData.tagline || '');
    }
    if (referenceAnalysis && referenceAnalysis.colorPaletteNote) {
      ciColors = ciColors || referenceAnalysis.colorPaletteNote;
    }

    // Generate wireframes sequentially (to avoid API rate limits)
    for (var pgIdx = 0; pgIdx < pages.length; pgIdx++) {
      var pg = pages[pgIdx];
      for (var secIdx = 0; secIdx < (pg.sections || []).length; secIdx++) {
        var sec = pg.sections[secIdx];
        for (var tIdx = 0; tIdx < (sec.tiles || []).length; tIdx++) {
          var tile = sec.tiles[tIdx];
          if (tile.type !== 'image' && tile.type !== 'shoppable_image' && tile.type !== 'image_text') continue;

          try {
            var wfPrompt = buildWireframePrompt(tile, brand, ciColors, ciBrandStyle, analysis);
            var aspectW = (tile.dimensions || {}).w || 3000;
            var aspectH = (tile.dimensions || {}).h || 1200;
            var aspectRatio = getClosestAspectRatio(aspectW, aspectH);

            log('   [' + (wireframeCount + wireframeFailed + 1) + '/' + wireframeTotal + '] ' + (tile.imageCategory || 'image') + ' (' + pg.name + ')...');

            var wfResult = await generateWireframeAPI(wfPrompt, aspectRatio);
            if (wfResult && wfResult.imageBase64) {
              tile.wireframeImage = 'data:' + (wfResult.mimeType || 'image/png') + ';base64,' + wfResult.imageBase64;
              wireframeCount++;
            } else {
              wireframeFailed++;
            }
          } catch (wfErr) {
            wireframeFailed++;
            log('   Wireframe failed: ' + wfErr.message);
          }
        }
      }
    }

    log('Wireframes generated: ' + wireframeCount + ' success, ' + wireframeFailed + ' failed');
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

// ─── WIREFRAME GENERATION HELPERS ───

// Map pixel dimensions to closest supported Imagen aspect ratio
function getClosestAspectRatio(w, h) {
  var ratio = w / h;
  // Imagen 3 supported ratios: 1:1, 16:9, 9:16, 4:3, 3:4
  var ratios = [
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3 / 4 },
    { label: '9:16', value: 9 / 16 },
  ];
  var closest = ratios[0];
  var minDiff = Math.abs(ratio - closest.value);
  for (var i = 1; i < ratios.length; i++) {
    var diff = Math.abs(ratio - ratios[i].value);
    if (diff < minDiff) { closest = ratios[i]; minDiff = diff; }
  }
  return closest.label;
}

// Build wireframe prompt based on tile properties and image category
function buildWireframePrompt(tile, brand, ciColors, ciBrandStyle, analysis) {
  var cat = tile.imageCategory || 'creative';
  var brief = tile.brief || '';
  var textOverlay = tile.textOverlay || '';
  var isShoppable = tile.type === 'shoppable_image';
  var hotspotCount = (tile.hotspots || []).length;

  // Base style instruction: sketch/wireframe aesthetic
  var styleBase = [
    'Create a minimalistic wireframe sketch for an Amazon Brand Store tile.',
    'Style: pencil sketch with light color accents, NOT photorealistic.',
    'Use simple geometric shapes, placeholder areas, and minimal line art.',
    'Elements should be suggested/indicated, not fully rendered.',
    'Background should be clean and light.',
  ].join(' ');

  // Add brand context
  var brandContext = 'Brand: ' + brand + '.';
  if (ciColors) brandContext += ' Brand colors: ' + ciColors + ' (use as accent colors in sketch).';
  if (analysis.brandTone) brandContext += ' Brand tone: ' + analysis.brandTone + '.';

  // Category-specific sketch instructions
  var categoryPrompt = '';
  switch (cat) {
    case 'store_hero':
      categoryPrompt = [
        'HERO BANNER wireframe: Wide format.',
        'Show a large placeholder area for the main visual/background.',
        'Indicate logo placement with a simple rectangle labeled "LOGO".',
        textOverlay ? 'Show text area with wavy lines indicating headline: "' + textOverlay.substring(0, 60) + '".' : 'Show headline text area with placeholder wavy lines.',
        'If there is a CTA button, draw a rounded rectangle labeled "CTA".',
        'Keep the composition bold and impactful, with clear visual hierarchy.',
      ].join(' ');
      break;

    case 'benefit':
      categoryPrompt = [
        'BENEFIT/USP tile wireframe:',
        'Show a simple icon placeholder (circle or square with a symbol inside).',
        textOverlay ? 'Indicate the USP text: "' + textOverlay.substring(0, 40) + '".' : 'Show a short text label area.',
        'Clean, minimal layout. The icon and text should be the focus.',
        'No heavy background elements, just the core message.',
      ].join(' ');
      break;

    case 'product':
      categoryPrompt = [
        'PRODUCT IMAGE wireframe:',
        'Show a centered product silhouette placeholder (simple outline shape).',
        'Clean white or light background.',
        'Maybe a subtle shadow or platform line beneath the product.',
        isShoppable && hotspotCount > 0 ? 'Include ' + hotspotCount + ' small circles (hotspot indicators) near the product area.' : '',
        'Professional product photography layout feel.',
      ].join(' ');
      break;

    case 'creative':
      categoryPrompt = [
        'CREATIVE/GRAPHIC tile wireframe:',
        'Show a design-forward layout with mixed elements.',
        brief.indexOf('Badge') >= 0 || brief.indexOf('badge') >= 0 ? 'Indicate a badge/seal element (circle or shield shape).' : '',
        brief.indexOf('icon') >= 0 || brief.indexOf('Icon') >= 0 ? 'Include simple icon placeholder shapes.' : '',
        textOverlay ? 'Show text area: "' + textOverlay.substring(0, 50) + '".' : '',
        'Use brand color accents to create visual interest.',
        'Show placeholder areas for graphic elements with simple shapes.',
      ].join(' ');
      break;

    case 'lifestyle':
      categoryPrompt = [
        'LIFESTYLE IMAGE wireframe:',
        'Show a scene sketch: simple outline of a person/people in a setting.',
        'The product should be subtly indicated in the scene (outline shape).',
        'Suggest an environment (indoor/outdoor) with minimal line art.',
        textOverlay ? 'Show a text overlay area: "' + textOverlay.substring(0, 50) + '".' : '',
        'Warm, inviting composition. Sketch the mood, not the details.',
      ].join(' ');
      break;

    case 'text_image':
      categoryPrompt = [
        'TEXT-FOCUSED IMAGE wireframe:',
        'Typography-driven layout.',
        textOverlay ? 'Show the main text prominently: "' + textOverlay.substring(0, 60) + '".' : 'Show large text placeholder area with wavy lines.',
        'Brand colors as background or accent blocks.',
        'Minimal imagery, focus on the text message and brand identity.',
      ].join(' ');
      break;

    default:
      categoryPrompt = 'Generic image tile wireframe. Show placeholder elements based on the brief.';
  }

  // Add brief context (shortened)
  var briefContext = '';
  if (brief) {
    // Strip the [CATEGORY] prefix
    var cleanBrief = brief.replace(/^\[[\w_]+\]\s*/, '');
    if (cleanBrief.length > 150) cleanBrief = cleanBrief.substring(0, 150) + '...';
    briefContext = 'Content description: ' + cleanBrief;
  }

  return [styleBase, brandContext, categoryPrompt, briefContext].filter(Boolean).join('\n');
}

// Call the wireframe generation API endpoint
async function generateWireframeAPI(prompt, aspectRatio) {
  var resp = await fetch('/api/generate-wireframe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, aspectRatio: aspectRatio }),
  });
  if (!resp.ok) {
    var err = await resp.json().catch(function() { return {}; });
    throw new Error(err.error || 'Wireframe API error');
  }
  return resp.json();
}

// ─── EXPORTED: Generate wireframes for a single page (called from BriefingView) ───
export async function generateWireframesForPage(page, brand, websiteData, analysis, onProgress) {
  var log = onProgress || function() {};
  var tiles = [];
  // Collect all image tiles from this page
  (page.sections || []).forEach(function(sec, si) {
    (sec.tiles || []).forEach(function(tile, ti) {
      if (tile.type === 'image' || tile.type === 'shoppable_image' || tile.type === 'image_text') {
        tiles.push({ tile: tile, secIdx: si, tileIdx: ti });
      }
    });
  });
  if (tiles.length === 0) return { success: 0, failed: 0, total: 0 };

  // Extract CI info
  var ciColors = '';
  var ciBrandStyle = '';
  if (websiteData) {
    var colorHints = [];
    if (websiteData.rawTextSections) {
      websiteData.rawTextSections.forEach(function(sec) {
        var colorMatch = (sec.text || '').match(/#[0-9A-Fa-f]{3,6}/g);
        if (colorMatch) colorHints = colorHints.concat(colorMatch);
      });
    }
    if (colorHints.length > 0) ciColors = colorHints.slice(0, 4).join(', ');
    if (websiteData.colors && websiteData.colors.length > 0) ciColors = websiteData.colors.slice(0, 4).join(', ');
    ciBrandStyle = (websiteData.description || '') + ' ' + (websiteData.tagline || '');
  }

  var success = 0;
  var failed = 0;
  var lastError = '';
  for (var i = 0; i < tiles.length; i++) {
    var entry = tiles[i];
    var tile = entry.tile;
    try {
      log(i + 1, tiles.length, tile.imageCategory || 'image');
      var wfPrompt = buildWireframePrompt(tile, brand, ciColors, ciBrandStyle, analysis || {});
      var aspectW = (tile.dimensions || {}).w || 3000;
      var aspectH = (tile.dimensions || {}).h || 1200;
      var aspectRatio = getClosestAspectRatio(aspectW, aspectH);
      var wfResult = await generateWireframeAPI(wfPrompt, aspectRatio);
      if (wfResult && wfResult.imageBase64) {
        tile.wireframeImage = 'data:' + (wfResult.mimeType || 'image/png') + ';base64,' + wfResult.imageBase64;
        success++;
      } else {
        failed++;
        console.warn('Wireframe failed: Image generation failed with all available models');
        lastError = 'Image generation failed with all available models';
      }
    } catch (err) {
      failed++;
      lastError = err.message || 'Unknown error';
      console.warn('Wireframe failed:', lastError);
      // If the first request fails with a config error, abort early — no point trying 58 more
      if (i === 0 && (lastError.indexOf('not configured') >= 0 || lastError.indexOf('API_KEY') >= 0)) {
        log(1, tiles.length, 'API KEY MISSING — aborting');
        return { success: 0, failed: tiles.length, total: tiles.length, error: lastError };
      }
    }
  }
  return { success: success, failed: failed, total: tiles.length, error: failed > 0 ? lastError : '' };
}

// ─── FALLBACK: Deterministic store building ───

function fallbackAnalysis(products, brand, lang, userInstructions) {
  // ─── PRIORITY: If user provided a menu structure, use it directly ───
  var parsed = parseMenuStructure(userInstructions);
  if (parsed && parsed.categories.length > 0) {
    console.log('[fallbackAnalysis] User menu structure detected with ' + parsed.categories.length + ' categories — using it directly');
    var allAsins = products.map(function(p) { return p.asin; });
    // Distribute ASINs across user categories using simple keyword matching
    var productAssigned = {};
    var userCats = parsed.categories.map(function(uc) {
      var catAsins = [];
      var catKeywords = uc.name.toLowerCase().split(/[\s\/&,]+/).filter(function(w) { return w.length > 2; });
      products.forEach(function(p) {
        if (productAssigned[p.asin]) return;
        var pText = ((p.name || '') + ' ' + (p.description || '') + ' ' + ((p.categories || []).join(' '))).toLowerCase();
        var matches = catKeywords.filter(function(kw) { return pText.indexOf(kw) >= 0; }).length;
        if (matches > 0) {
          catAsins.push(p.asin);
          productAssigned[p.asin] = true;
        }
      });
      var subcategories = (uc.subcategories || []).map(function(us) {
        var subAsins = [];
        var subKeywords = us.name.toLowerCase().split(/[\s\/&,]+/).filter(function(w) { return w.length > 2; });
        products.forEach(function(p) {
          if (productAssigned[p.asin]) return;
          var pText = ((p.name || '') + ' ' + (p.description || '') + ' ' + ((p.categories || []).join(' '))).toLowerCase();
          var matches = subKeywords.filter(function(kw) { return pText.indexOf(kw) >= 0; }).length;
          if (matches > 0) {
            subAsins.push(p.asin);
            productAssigned[p.asin] = true;
          }
        });
        return { name: us.name, asins: subAsins, productCount: subAsins.length };
      });
      return { name: uc.name, asins: catAsins, productCount: catAsins.length, subcategories: subcategories };
    });
    // Distribute unassigned products evenly
    var unassigned = allAsins.filter(function(a) { return !productAssigned[a]; });
    for (var ui = 0; ui < unassigned.length; ui++) {
      var target = userCats[ui % userCats.length];
      if (target.subcategories && target.subcategories.length > 0) {
        target.subcategories[ui % target.subcategories.length].asins.push(unassigned[ui]);
        target.subcategories[ui % target.subcategories.length].productCount++;
      } else {
        target.asins.push(unassigned[ui]);
      }
      target.productCount++;
    }
    return {
      categories: userCats,
      hasBundles: false,
      bundleAsins: [],
      suggestedPages: ['Homepage'].concat(userCats.map(function(c) { return c.name; })),
      brandTone: 'professional',
      productComplexity: 'medium',
      heroMessage: brand,
      brandStory: '',
      keyFeatures: [],
      hasVariants: false,
      variantTypes: [],
      _menuSource: 'user',
    };
  }

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
      imageCategory: 'store_hero',
      brief: '[STORE_HERO] ' + brand + ' brand world, logo + ' + (analysis.brandTone || 'professional') + ' mood',
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
        return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] "' + cat + '" category name on brand-color background, product silhouette + CTA', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
      }),
    });
  } else if (catNames.length > 4) {
    var row1 = catNames.slice(0, 4);
    var row2 = catNames.slice(4, 8);
    sections.push({
      id: uid(), layoutId: '1-1-1-1',
      tiles: row1.map(function(cat) {
        return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] "' + cat + '" category name on brand-color background, product silhouette + CTA', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
      }),
    });
    if (row2.length > 0) {
      var lid = row2.length === 1 ? '1' : row2.length === 2 ? '1-1' : row2.length === 3 ? '1-1-1' : '1-1-1-1';
      sections.push({
        id: uid(), layoutId: lid,
        tiles: row2.map(function(cat) {
          return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] "' + cat + '" category name on brand-color background, product silhouette + CTA', textOverlay: cat, ctaText: cta, dimensions: { w: 3000, h: 1200 }, asins: [] };
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
        { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' products in real-world use, natural setting', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
        { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + brand + ' bestseller packshot on white, soft shadow', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
      ],
    });
  }

  // Brand story
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      imageCategory: 'creative',
      brief: '[CREATIVE] ' + brand + ' brand values and identity statement, split layout with brand colors',
      textOverlay: lang === 'German' ? 'Unsere Geschichte' : 'Our Story',
      ctaText: '', dimensions: { w: 3000, h: 600 }, mobileDimensions: { w: 1680, h: 900 }, asins: [],
    }],
  });

  return { id: 'homepage', name: 'Homepage', sections: sections };
}

function fallbackCategoryPage(id, name, catProducts, lang, analysis) {
  var cta = lang === 'German' ? 'Jetzt entdecken' : 'Shop now';
  var sections = [];
  var complexity = (analysis && analysis.productComplexity) || 'medium';
  var topProducts = catProducts.slice().sort(function(a, b) { return (b.reviews || 0) - (a.reviews || 0); });
  var heroProduct = topProducts[0];

  // 1. Category Hero
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image',
      imageCategory: 'store_hero',
      brief: '[STORE_HERO] ' + name + ' category hero, ' + (heroProduct ? heroProduct.name : name + ' products') + ' in use, brand logo',
      textOverlay: name, ctaText: '', dimensions: { w: 3000, h: 700 }, asins: [],
    }],
  });

  // 2. Product spotlight (1-1)
  if (heroProduct) {
    sections.push({
      id: uid(), layoutId: '1-1',
      tiles: [
        { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] "' + heroProduct.name.split(' ').slice(0, 4).join(' ') + '" bold name on brand-color background + product silhouette', textOverlay: heroProduct.name.split(' ').slice(0, 4).join(' '), ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
        { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + heroProduct.name + ' packshot on white, soft shadow', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [], linkAsin: heroProduct.asin },
      ],
    });
  }

  // 3. Benefit section
  var features = (analysis && analysis.keyFeatures) || [];
  sections.push({
    id: uid(), layoutId: '1-1-1',
    tiles: [
      { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] ' + (features[0] || 'Key Benefit') + ' USP with label.', textOverlay: features[0] || '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
      { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] ' + (features[1] || 'Second Benefit') + ' USP with label.', textOverlay: features[1] || '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
      { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] ' + (features[2] || 'Third Benefit') + ' USP with label.', textOverlay: features[2] || '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
    ],
  });

  // 4. Lifestyle split
  sections.push({
    id: uid(), layoutId: '1-1',
    tiles: [
      { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + (heroProduct ? heroProduct.name : name + ' products') + ' in real-world setting, natural light', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
      { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + (topProducts[1] ? topProducts[1].name : name + ' product') + ' packshot on white', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [], linkAsin: topProducts[1] ? topProducts[1].asin : '' },
    ],
  });

  // 5. Product grid
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'product_grid', brief: '', textOverlay: '', ctaText: '',
      dimensions: { w: 3000, h: 1200 },
      asins: catProducts.map(function(p) { return p.asin; }),
    }],
  });

  // 6. Cross-sell / related categories
  if (topProducts.length >= 3) {
    sections.push({
      id: uid(), layoutId: '1-1-1',
      tiles: topProducts.slice(0, 3).map(function(p) {
        return { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + p.name.split(' ').slice(0, 4).join(' ') + ' packshot on neutral bg', textOverlay: p.name.split(' ').slice(0, 3).join(' '), ctaText: cta, dimensions: { w: 3000, h: 1000 }, asins: [], linkAsin: p.asin };
      }),
    });
  }

  return { id: id, name: name, sections: sections };
}
