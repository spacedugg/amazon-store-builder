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

// ─── SMART PRODUCT MATCHING: Online Shop ↔ Amazon ───
// Matches products between brand website and Amazon catalog using primary keywords.
// Does NOT match on full titles — extracts the core product keyword and matches precisely.
// E.g. "Mariendistel" matches "Mariendistel Kapseln 500mg", but
// "Mariendistel Extrakt Pulver" does NOT match "Mariendistel Kapseln mit Vitamin C".
function extractProductKeywords(name) {
  if (!name || typeof name !== 'string') return [];
  // Remove common filler words, dosages, brand names, packaging info
  var cleaned = name
    .replace(/\b\d+\s*(mg|ml|g|kg|stück|stk|kapseln|tabletten|caps|tablets|pack|er|x)\b/gi, '')
    .replace(/\b(mit|und|für|von|the|with|and|for|from|in|aus|ohne|plus|extra|premium|bio|organic|vegan|natural|natürlich)\b/gi, '')
    .replace(/[®™©()[\]{}"'´`,.;:!?|\/\\–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Split into meaningful words (min 3 chars)
  var words = cleaned.split(/\s+/).filter(function(w) { return w.length >= 3; });
  return words.map(function(w) { return w.toLowerCase(); });
}

// Match a shop product name to an Amazon product. Returns the best match or null.
// Uses the FIRST 1-2 significant keywords to find the primary product type.
// Then validates that the product forms/types don't conflict (e.g. "Pulver" vs "Kapseln").
function matchShopProductToAmazon(shopProductName, amazonProducts) {
  var shopKW = extractProductKeywords(shopProductName);
  if (shopKW.length === 0) return null;

  // Product form words that must match exactly if present in both
  var formWords = ['kapseln', 'tabletten', 'pulver', 'extrakt', 'tropfen', 'spray', 'creme', 'gel', 'öl', 'oil', 'seife', 'shampoo', 'tee', 'tea', 'saft', 'juice', 'riegel', 'bar', 'drops', 'capsules', 'tablets', 'powder', 'cream', 'liquid', 'granulat', 'paste', 'salbe', 'sirup', 'tinktur'];

  var shopForm = shopKW.filter(function(w) { return formWords.indexOf(w) >= 0; });
  // Primary keyword = first non-form keyword (the actual product name)
  var shopPrimary = shopKW.filter(function(w) { return formWords.indexOf(w) < 0; });
  if (shopPrimary.length === 0) return null;

  var bestMatch = null;
  var bestScore = 0;

  for (var i = 0; i < amazonProducts.length; i++) {
    var amzName = (amazonProducts[i].name || amazonProducts[i].title || '').toLowerCase();
    var amzKW = extractProductKeywords(amzName);
    var amzForm = amzKW.filter(function(w) { return formWords.indexOf(w) >= 0; });

    // Check if primary keyword(s) match
    var primaryMatches = 0;
    for (var k = 0; k < Math.min(shopPrimary.length, 2); k++) {
      if (amzName.indexOf(shopPrimary[k]) >= 0) primaryMatches++;
    }
    if (primaryMatches === 0) continue;

    // If both have form words, they must match (Pulver != Kapseln)
    if (shopForm.length > 0 && amzForm.length > 0) {
      var formMatch = shopForm.some(function(f) { return amzForm.indexOf(f) >= 0; });
      if (!formMatch) continue; // Form conflict — skip
    }

    // Score: primary keyword matches + bonus for form match
    var score = primaryMatches;
    if (shopForm.length > 0 && amzForm.length > 0) score += 0.5;
    // Bonus for similar word count (avoids matching single-ingredient to combo products)
    var kwLenDiff = Math.abs(shopPrimary.length - amzKW.filter(function(w) { return formWords.indexOf(w) < 0; }).length);
    if (kwLenDiff <= 1) score += 0.3;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = amazonProducts[i];
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

// Enrich Amazon products with matched website product data
export function matchWebsiteProductsToAmazon(websiteData, amazonProducts) {
  if (!websiteData || !websiteData.productDescriptions || websiteData.productDescriptions.length === 0) {
    return { matched: [], unmatched: [], enriched: amazonProducts };
  }

  var matched = [];
  var unmatched = [];
  var enrichments = {}; // asin -> website info

  websiteData.productDescriptions.forEach(function(shopProduct) {
    var shopName = typeof shopProduct === 'string' ? shopProduct : (shopProduct.name || shopProduct.title || '');
    if (!shopName || shopName.length < 3) return;

    var match = matchShopProductToAmazon(shopName, amazonProducts);
    if (match) {
      matched.push({ shopName: shopName, amazonAsin: match.asin, amazonName: match.name || match.title });
      if (!enrichments[match.asin]) enrichments[match.asin] = [];
      enrichments[match.asin].push(shopName);
    } else {
      unmatched.push(shopName);
    }
  });

  // Enrich products with website data (add shopNames for richer copywriting)
  var enriched = amazonProducts.map(function(p) {
    if (enrichments[p.asin]) {
      return Object.assign({}, p, { websiteNames: enrichments[p.asin] });
    }
    return p;
  });

  return { matched: matched, unmatched: unmatched, enriched: enriched };
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
  if (!websiteData) return [
    '',
    '=== NO BRAND WEBSITE DATA AVAILABLE ===',
    'No brand website or existing store was provided. You MUST generate original, high-quality copywriting.',
    '',
    'COPYWRITING GUIDELINES (when no brand content exists):',
    '- Derive the brand voice from the PRODUCT DATA: product names, descriptions, bullet points, price tier, and categories.',
    '- Premium-priced products → premium, aspirational tone. Budget products → practical, value-focused tone.',
    '- Analyze product descriptions for recurring keywords, benefits, and claims — use these as USPs.',
    '- Extract product features from bullet points and craft compelling headlines from them.',
    '- Write headlines that are specific and benefit-driven (NOT generic "Discover Our Products").',
    '- Create a brand story based on what the products suggest about the brand identity.',
    '- Identify the target audience from price points, categories, and product language.',
    '- If products have certifications in descriptions (Bio, Vegan, Made in Germany), highlight them as USPs.',
    '- Keep copy authentic to the product niche. Supplements → health/wellness language. Fashion → style/confidence. Tech → precision/innovation.',
    '- textOverlay text MUST sound like the brand wrote it, not like a template.',
    '=== END COPYWRITING GUIDELINES ===',
    '',
  ].join('\n');
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
  // Product CI from Gemini Vision analysis of listing images
  if (websiteData.productCI) {
    var ci = websiteData.productCI;
    parts.push('');
    parts.push('=== BRAND CI (from Amazon listing image analysis) ===');
    if (ci.primaryColors) parts.push('PRIMARY COLORS: ' + ci.primaryColors.join(', '));
    if (ci.secondaryColors) parts.push('SECONDARY COLORS: ' + ci.secondaryColors.join(', '));
    if (ci.backgroundColor) parts.push('BACKGROUND COLOR: ' + ci.backgroundColor);
    if (ci.visualMood) parts.push('VISUAL MOOD: ' + ci.visualMood);
    if (ci.typographyStyle) parts.push('TYPOGRAPHY: ' + ci.typographyStyle);
    if (ci.backgroundPattern) parts.push('BACKGROUND PATTERN: ' + ci.backgroundPattern);
    if (ci.photographyStyle) parts.push('PHOTOGRAPHY STYLE: ' + ci.photographyStyle);
    if (ci.recurringElements) parts.push('RECURRING ELEMENTS: ' + ci.recurringElements.join(', '));
    if (ci.textDensity) parts.push('TEXT DENSITY: ' + ci.textDensity);
    if (ci.designerNotes) parts.push('DESIGNER NOTES: ' + ci.designerNotes);
    parts.push('IMPORTANT: Match this CI exactly in all image briefs and text overlays.');
    parts.push('=== END BRAND CI ===');
    parts.push('');
  }

  // Colors & Fonts extracted from CSS
  if (websiteData.colors && websiteData.colors.length > 0) {
    parts.push('BRAND COLORS (from CSS): ' + websiteData.colors.join(', '));
  }
  if (websiteData.fonts && websiteData.fonts.length > 0) {
    parts.push('BRAND FONTS (from CSS): ' + websiteData.fonts.join(', '));
  }
  if (websiteData.typographyStyle) {
    var ts = websiteData.typographyStyle;
    parts.push('TEXT DENSITY: ' + ts.textDensity + ' (avg ' + ts.avgParagraphLength + ' chars/paragraph, ' + ts.paragraphCount + ' paragraphs, ' + ts.headingCount + ' headings)');
    if (ts.textDensity === 'minimalist') {
      parts.push('COPYWRITING STYLE: Keep text minimal and impactful. Short headlines, few words. Let images speak.');
    } else if (ts.textDensity === 'text-heavy') {
      parts.push('COPYWRITING STYLE: Brand uses detailed descriptions. Include more explanatory text, benefit descriptions, and product details.');
    } else {
      parts.push('COPYWRITING STYLE: Balanced approach. Mix of concise headlines and supporting detail text where needed.');
    }
    if (ts.fontWeights && ts.fontWeights.length > 0) parts.push('FONT WEIGHTS USED: ' + ts.fontWeights.join(', '));
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
    // Include matched website product names for richer copywriting context
    if (p.websiteNames && p.websiteNames.length > 0) {
      item.websiteProductNames = p.websiteNames;
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
      : products.length <= 4
        ? '- With only ' + products.length + ' products: Create 1-2 categories with SPECIFIC, descriptive names based on what the products actually ARE. Use the product type (e.g. "Schwefelseife", "Naturseife") — NEVER use generic names like "Weitere Produkte", "Alle Produkte", "Sonstige", or just the brand name.'
        : '- Create 2-8 meaningful categories based on what products ARE (e.g. "Schuhe", "Taschen"). NEVER use generic names like "Weitere Produkte", "Alle Produkte", "Sonstige".',
    '- Classify product complexity: simple, medium, complex, or variantRich',
    '- Detect brand tone from product descriptions and images',
    '- Extract 3-5 key product features that could be highlighted visually',
    '- Generate a compelling heroMessage (brand slogan) that captures the brand essence',
    '- Write a brandStory that sounds authentic to the brand, even if no website data is available',
    '- Derive the brand voice from: product names, price tier, category, descriptions, and bullet points',
    '- keyFeatures should be specific to these products (e.g. "Kaltgepresstes Schwarzkümmelöl" not "Hohe Qualität")',
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
    '  "heroMessage": "Short brand SLOGAN in ' + lang + ' (max 6 words). This is the main heading on the hero banner. It should be aspirational, emotional, or identity-driven (e.g. Deine Natur. Deine Kraft., Pure Science. Real Results.). NEVER list USPs or features here. NEVER use commas to enumerate qualities.",',
    '  "brandStory": "One sentence brand story in ' + lang + '",',
    '  "keyFeatures": ["Feature 1", "Feature 2", ...] (these are separate from heroMessage — USPs and certifications go HERE, not in heroMessage)',
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
      var missingProds = missing.map(function(a) { return products.find(function(p) { return p.asin === a; }); }).filter(Boolean);
      var missingCatName = deriveCategoryName(missingProds, products, brand, lang, result.categories.map(function(c) { return c.name; }));
      result.categories.push({ name: missingCatName, asins: missing, productCount: missing.length, subcategories: [] });
    }
  }

  if (!result.productComplexity) result.productComplexity = 'medium';

  return result;
}

// ─── STEP 2: LAYOUT PER PAGE ───
export async function aiGeneratePageLayout(pageName, pageProducts, brand, lang, isHomepage, allCategories, analysis, userInstructions, complexityLevel, category, template, websiteData, referenceAnalysis, isSubpage, structuralBlueprint) {
  // Derive skipCategoryPages: small catalog with 1 category = all products on homepage
  var skipCategoryPages = isHomepage && pageProducts.length <= 4 && allCategories.length <= 1;
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
    '- textOverlay supports multiple lines (use \\n). When a tile has MULTIPLE text elements, use \\n to separate them.',
    '  The LINE POSITION determines the visual hierarchy (NOT text length):',
    '  Line 1 = HIERARCHY 1 — largest, most prominent text (heading). Line 2 = HIERARCHY 2 — medium-sized text (subheading/supporting). Line 3+ = HIERARCHY 3 — smallest text, lightest weight (body/detail).',
    '  The designer sets font size + weight based on the hierarchy level. Example: "Effektive Porenreinigung\\nFür ein klares Hautbild" → H1 heading + H2 subheading.',
    '  If a tile has only ONE text element, no hierarchy is needed — just write the text.',
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
    '  Elements: brand SLOGAN (short, aspirational, max 6 words), product/lifestyle visual, texture/mood. NO CTA button.',
    '  The textOverlay for a hero MUST be a brand slogan or claim, NOT a list of USPs or features.',
    '  Good examples: "Deine Natur. Deine Kraft.", "Pure Science. Real Results.", "Tradition seit 1923"',
    '  BAD examples: "Made in Germany, Laborgeprüft, Hochdosiert, Vegan" (these are USPs, not a slogan!)',
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
    '  Example: "[CREATIVE] Split layout: headline left, product close-up right, 3 feature icons"',
    '',
    '- [LIFESTYLE] = Lifestyle photo dominates (70-80%+). Text is subordinate/optional.',
    '  Elements: professional photo, product in use, optional short text line.',
    '  Do NOT specify logo placement. Do NOT add dark overlays or gradients unless brand requires it.',
    '  Example: "[LIFESTYLE] Person applying ' + brand + ' product in garden, sunny day, product prominent"',
    '',
    '- [TEXT_IMAGE] = Text and/or graphics dominant. NO product/lifestyle photos.',
    '  Full control over typography. Replaces Amazon text fields.',
    '  Functions: section heading, feature explanation, brand claim, tech specs.',
    '  Example: "[TEXT_IMAGE] Section heading: Unsere Bestseller"',
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
    '- The designer decides backgrounds, colors, and gradients based on the CI.',
    '',
    'BRIEF RULES (briefs are instructions for a DESIGNER who already knows the brand CI):',
    '- Keep briefs SHORT: max 15-20 words after the tag.',
    '- Describe WHAT the image shows (subject, scene, composition) — NOT HOW it should look (no color, font, shadow instructions).',
    '- The designer knows the brand CI (colors, fonts, style). Do NOT specify colors, backgrounds, gradients, or font styles in briefs.',
    '- WRONG: "Dark green background with white sans-serif text and leaf pattern"',
    '- RIGHT: "Category preview with representative product, headline: Vitamine"',
    '- Name the specific ' + brand + ' product or category from the product list.',
    '- textOverlay MUST be in store language (' + lang + ') — use real product/category names. For category/navigation tiles: textOverlay = JUST the category name (e.g. "Vitamine"), NOT a sentence. The CTA carries the action.',
    '- Do NOT use generic placeholders like "[product]" or "lifestyle image".',
    '- NEVER place two identical image categories directly adjacent (e.g. two LIFESTYLE sections in a row).',
    '- FACTUAL ACCURACY: NEVER reference more categories, products, or features than actually exist. There are exactly ' + allCategories.length + ' categories (' + allCategories.map(function(c) { return c.name; }).join(', ') + '). Do NOT write "three category previews" if there are only ' + allCategories.length + '. Briefs must match the real data.',
    '- CROSS-SELL TO A SPECIFIC CATEGORY: Use imageCategory="creative" or "lifestyle" with a visual preview. textOverlay = JUST the category name (e.g. "Vitamine"), NOT a sentence. The CTA carries the action. Brief = SHORT, e.g. "[CREATIVE] ' + brand + ' [category] preview with representative product".',
    '- GENERIC "BACK TO ALL" NAVIGATION: For tiles that link back to ALL products or the homepage without featuring a specific category, use imageCategory="text_image" with a short headline and a CTA. No elaborate design description needed.',
    '',
    'USP CONSISTENCY RULES:',
    '- Use the EXACT same wording for each USP across the entire store. If one tile says "BPA-frei", every tile must say "BPA-frei" (not "Ohne BPA" or "BPA Free").',
    '- For SMALL SQUARE tiles (750x750): exactly ONE benefit/USP per tile. Headline + 1-sentence explanation.',
    '- For WIDE tiles (1500x750+) or LARGE SQUARE tiles (1500x1500): multiple USPs allowed.',
    '- On detail pages, a catchy benefit headline + short explanation (max 5-6 words) can work well. On overview pages, simple USP labels are fine.',
    '',
    'SMART PRODUCT DISPLAY LOGIC (' + pageProducts.length + ' products on this page):',
    isHomepage
      ? [
        '- HOMEPAGE: Do NOT display individual products. The homepage is for NAVIGATION and BRAND IDENTITY.',
        '- Show categories as navigation tiles, NOT individual product tiles.',
        '- The ONLY exception: ONE clearly labeled bestseller highlight (if tier 2+).',
        '- All product showcasing happens on CATEGORY PAGES, not on the homepage.',
      ].join('\n')
      : [
        '- ALWAYS prioritize individual image modules (shoppable_image, lifestyle, creative) over product_grids.',
        '- Feature the BEST SELLERS from this category as individual tiles with rich design.',
        '- product_grids are a SUPPLEMENT, not a replacement. They go BELOW the curated modules.',
        pageProducts.length <= 8
          ? '- With ' + pageProducts.length + ' products: Each product can get individual attention. Use modules, no product_grid needed unless explicitly helpful.'
          : pageProducts.length <= 30
            ? '- With ' + pageProducts.length + ' products: Feature top products individually in modules. Use product_grid at the end for the full catalog.'
            : '- With ' + pageProducts.length + ' products: Pick the best seller from each subcategory for individual tiles. Product_grids below each section show remaining products.',
      ].join('\n'),
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
    '        {"type": "image", "imageCategory": "creative", "brief": "[CREATIVE] ' + brand + ' ' + (allCategories[0] ? allCategories[0].name : 'Category 1') + ' — representative product + representative product", "textOverlay": "' + (allCategories[0] ? allCategories[0].name : 'Category 1') + '", "ctaText": "Entdecken", "dimensions": {"w": 1500, "h": 1500}, "linkUrl": "/cat-0"},',
    '        {"type": "image", "imageCategory": "creative", "brief": "[CREATIVE] ' + brand + ' ' + (allCategories[1] ? allCategories[1].name : 'Category 2') + ' — representative product + representative product", "textOverlay": "' + (allCategories[1] ? allCategories[1].name : 'Category 2') + '", "ctaText": "Entdecken", "dimensions": {"w": 1500, "h": 1500}, "linkUrl": "/cat-1"}',
    '      ]',
    '    },',
    '    ... more sections',
    '  ]',
    '}',
    '',
    isHomepage
      ? (skipCategoryPages
        ? [
          'HOMEPAGE SECTIONS — SMALL CATALOG, ALL PRODUCTS ON HOMEPAGE (' + pageProducts.length + ' products, NO separate category pages):',
          'This homepage is the ONLY page. There are no category subpages. Show ALL products here with RICH detail.',
          'With only ' + pageProducts.length + ' products, you have room to really showcase each product individually.',
          'Generate ' + (complexityLevel >= 3 ? '8-12' : complexityLevel >= 2 ? '6-9' : '5-7') + ' sections. Every product appears AT MOST ONCE as shoppable_image, but can appear in lifestyle/creative context.',
          'Each tile MUST include "imageCategory" field.',
          '',
          'STRUCTURE — tell a story about the brand and its products:',
          '',
          '1. STORE HERO (layout "1"): imageCategory="store_hero". Brand hero image with logo + claim. Show the brand world.',
          '',
          '2. PRODUCT OVERVIEW (layout based on ' + pageProducts.length + ' products):',
          '   Show ALL products side by side as shoppable_image tiles with real ASINs.',
          '   With 2 products: "std-2equal" — one shoppable_image per tile, each with product name as textOverlay.',
          '   With 3 products: "1-1-1" — three equal tiles.',
          '   With 4 products: "std-4equal" or "2x2wide".',
          '',
          '3. BENEFIT / USP SECTION (layout "1" or "vh-w2s"):',
          '   imageCategory="benefit". Brand-level USPs that apply to ALL products. No product photos.',
          '',
          'Then for EACH product, create a mini-showcase (1-2 sections per product):',
          '',
          '4. TEXT HEADING for Product 1 (layout "1"): imageCategory="text_image". Product name as headline. Brief intro text.',
          '5. PRODUCT 1 DETAIL (layout "lg-2stack" or "std-2equal"):',
          '   Large tile: imageCategory="lifestyle" — Product 1 in real-world use, or imageCategory="creative" — product features/ingredients/benefits.',
          '   Smaller tile(s): imageCategory="creative" — key features, USPs, or detail shots specific to THIS product.',
          '',
          '6. TEXT HEADING for Product 2 (layout "1"): imageCategory="text_image". Product name as headline.',
          '7. PRODUCT 2 DETAIL (layout "lg-2stack" or "std-2equal"):',
          '   Same approach: lifestyle/creative + feature details specific to THIS product.',
          '',
          pageProducts.length > 2 ? '(Repeat pattern for Products 3-' + pageProducts.length + '.)' : '',
          '',
          'FINAL SECTION:',
          pageProducts.length === 2
            ? '8. COMPARISON or COMBINED LIFESTYLE (layout "std-2equal"): imageCategory="creative" or "lifestyle" — both products together, showing how they complement each other or differ.'
            : '8. COMBINED LIFESTYLE (layout "1"): imageCategory="lifestyle" — all products in one scene.',
          '',
          'KEY PRINCIPLES:',
          '- Each product gets its OWN dedicated section(s) with specific features, ingredients, or benefits.',
          '- Use text_image tiles as section dividers/headings between product showcases — product name as bold headline.',
          '- Alternate between lifestyle, creative, and benefit content to keep it varied.',
          '- Name SPECIFIC product features from the product data (e.g. actual ingredients, actual use cases).',
          '- DO NOT add category navigation tiles. There are no category pages to navigate to.',
          '- EVERY brief must name specific ' + brand + ' products — generic briefs are FORBIDDEN.',
        ].filter(Boolean).join('\n')
        : pageProducts.length <= 5 && complexityLevel === 1
        ? [
          'HOMEPAGE SECTIONS — SMALL CATALOG, MINIMAL TIER (' + pageProducts.length + ' products):',
          'Generate EXACTLY 2-3 sections. Do NOT generate more. Every product appears AT MOST ONCE.',
          'Each tile MUST include "imageCategory" field.',
          '',
          '1. STORE HERO (layout "1"): imageCategory="store_hero". Brand hero image. Logo + claim. NO CTA.',
          '2. CATEGORY NAVIGATION (layout based on count: 2="std-2equal", 3="vh-w2s"):',
          '   Each tile imageCategory="creative". Product silhouette + CTA. textOverlay = JUST the category name (e.g. "Vitamine"), NOT a sentence. The CTA provides the action. Each tile links to its category page via linkUrl.',
          '3. (OPTIONAL, only if it adds value) BENEFIT SECTION (layout "1" or "vh-2equal"):',
          '   imageCategory="benefit". USPs/quality markers. NO product photos, NO linkAsin.',
          '',
          'DO NOT add any more sections. NO bestseller showcase, NO product grid, NO lifestyle split, NO brand story, NO footer nav.',
          'With only ' + pageProducts.length + ' products, the category pages handle product display. The homepage is just navigation + brand impression.',
          'EVERY brief must name specific ' + brand + ' products — generic briefs are FORBIDDEN.',
        ].join('\n')
        : [
          '╔══════════════════════════════════════════════════════════════════╗',
          '║  HOMEPAGE = NAVIGATION HUB + BRAND IDENTITY                    ║',
          '║  Purpose: guide shoppers to category pages, NOT display random  ║',
          '║  products. Individual products belong on CATEGORY pages only.   ║',
          '╚══════════════════════════════════════════════════════════════════╝',
          '',
          'CRITICAL STRUCTURAL RULE:',
          '- ALL ' + allCategories.length + ' categories MUST appear as ONE contiguous navigation block.',
          '- NEVER split categories across multiple sections with other content in between.',
          '- NEVER show random individual products on the homepage unless they are clearly labeled as "Bestseller" or "Neuheit" (new arrival).',
          '- The homepage tells the BRAND STORY and provides NAVIGATION — the category pages sell products.',
          '',
          'Each tile MUST include "imageCategory" field.',
          '',
          '=== MANDATORY SECTION ORDER (follow this EXACTLY) ===',
          '',
          '1. STORE HERO (layout "1"):',
          '   imageCategory="store_hero". Brand hero — slogan + lifestyle/product visual. NO CTA button.',
          '',
          '2. COMPLETE CATEGORY NAVIGATION — ALL ' + allCategories.length + ' CATEGORIES IN ONE BLOCK:',
          allCategories.length <= 2
            ? '   Layout "std-2equal" (2 tiles). Each tile = one category.'
            : allCategories.length <= 3
            ? '   Layout "1-1-1" (3 tiles). Each tile = one category.'
            : allCategories.length === 4
            ? '   Layout "2x2wide" or "std-4equal" (4 tiles). Each tile = one category.'
            : allCategories.length <= 5
            ? '   Layout "lg-4grid" (5 tiles). Each tile = one category.'
            : allCategories.length <= 6
            ? '   USE TWO ROWS: First row "1-1-1" (3 categories) + Second row "1-1-1" (3 categories).'
            : allCategories.length <= 8
            ? '   USE TWO ROWS: First row "2x2wide" (4 categories) + Second row "2x2wide" (4 categories). Or first "lg-4grid" (5) + second "1-1-1" (3).'
            : '   USE MULTIPLE ROWS to show ALL ' + allCategories.length + ' categories. Split evenly across 2-3 sections placed DIRECTLY after each other with NO other content between them.',
          '   imageCategory="creative" for each tile. textOverlay = JUST the category name. CTA links to category page.',
          '   IMPORTANT: Category navigation sections must be ADJACENT — no other sections between them!',
          '   Categories: ' + allCategories.map(function(c) { return c.name + ' (' + c.productCount + ' products)'; }).join(', '),
          '',
          '3. BENEFIT / USP SECTION (layout "1" or "vh-w2s"):',
          '   imageCategory="benefit". Brand-level USPs/certifications/awards. NO product photos, NO people.',
          '',
          complexityLevel >= 2 ? [
            '4. BESTSELLER HIGHLIGHT (layout "std-2equal" or "lg-2stack"):',
            '   ONLY if the brand has a clear bestseller product (highest reviews/rating).',
            '   Tile 1: imageCategory="lifestyle" — bestseller in real-world context.',
            '   Tile 2: imageCategory="creative" — key benefit/feature of this bestseller.',
            '   textOverlay MUST include "Bestseller" or "Beliebtestes Produkt" to justify its presence.',
            '   If no clear bestseller stands out, SKIP this section entirely.',
            '',
          ].join('\n') : '',
          complexityLevel >= 3 ? [
            '5. BRAND STORY (layout "lg-2stack" or "std-2equal"):',
            '   Large tile: imageCategory="lifestyle" — brand founders, manufacturing, or brand world.',
            '   Small tile(s): imageCategory="creative" — brand values, history, mission.',
            '',
          ].join('\n') : '',
          'FINAL SECTION:',
          complexityLevel >= 2
            ? '6. LIFESTYLE / BRAND WORLD (layout "1"): imageCategory="lifestyle". One compelling brand-world image. Product in use, brand atmosphere. NO random product showcase.'
            : '(No additional sections for minimal tier.)',
          '',
          '=== FORBIDDEN ON HOMEPAGE ===',
          '- NO random individual product tiles (shoppable_image with a single product) unless explicitly labeled as Bestseller/Neuheit.',
          '- NO product_grid sections — these belong on category pages.',
          '- NO splitting categories across the page with other content between them.',
          '- NO duplicate category appearances (each category exactly ONCE).',
          '- NO "lifestyle split" sections that feature random products with no context.',
          '',
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
            : allCategories.length > 1
            ? (function() {
              // Build cross-sell section that includes ALL other categories (excluding current page)
              var otherCategories = allCategories.filter(function(c) { return c.name !== pageName && pageName.indexOf(c.name) < 0; });
              var otherCount = otherCategories.length;
              if (otherCount === 0) return '7. NAVIGATION BANNER (layout "1"): imageCategory="text_image". Simple text banner with a short headline and CTA linking back to homepage.';
              var crossSellLayout;
              if (otherCount <= 2) crossSellLayout = 'Layout "std-2equal" or "vh-2equal"';
              else if (otherCount <= 3) crossSellLayout = 'Layout "1-1-1"';
              else if (otherCount <= 4) crossSellLayout = 'Layout "2x2wide"';
              else if (otherCount <= 5) crossSellLayout = 'Layout "lg-4grid"';
              else if (otherCount <= 6) crossSellLayout = 'TWO ROWS: "1-1-1" + "1-1-1" placed DIRECTLY adjacent';
              else if (otherCount <= 8) crossSellLayout = 'TWO ROWS: "2x2wide" + "2x2wide" placed DIRECTLY adjacent';
              else crossSellLayout = 'MULTIPLE ROWS to fit all ' + otherCount + ' categories — placed DIRECTLY adjacent';
              return [
                '7. CROSS-SELL — ALL ' + otherCount + ' OTHER CATEGORIES (COMPLETE, not a random subset):',
                '   ' + crossSellLayout + '.',
                '   imageCategory="creative" or "lifestyle" — visual preview with representative product.',
                '   textOverlay = JUST the category name, NOT a sentence. Add a fitting CTA.',
                '   MANDATORY: Include ALL of these categories: ' + otherCategories.map(function(c) { return c.name; }).join(', '),
                '   NEVER pick only 1-2 random categories. EVERY other category must be represented.',
                '   If multiple rows are needed, place them DIRECTLY adjacent — no other content between cross-sell rows.',
              ].join('\n');
            })()
            : '7. NAVIGATION BANNER (layout "1"): imageCategory="text_image". Simple text banner with a short headline and CTA. No elaborate design description.',
          '',
          '',
          // ─── THEMATIC BLUEPRINT FROM FIRST CATEGORY PAGE ───
          structuralBlueprint && !isSubpage ? [
            '',
            '╔══════════════════════════════════════════════════════════════════╗',
            '║  THEMATIC CONSISTENCY: Follow the same thematic section flow.   ║',
            '║  All category pages should feel like part of ONE brand store.   ║',
            '╚══════════════════════════════════════════════════════════════════╝',
            '',
            'Another category page in this store uses this thematic flow:',
            structuralBlueprint.map(function(bp) {
              var themeLabels = { hero: 'Hero/Header', product_highlight: 'Product Highlight', product_grid: 'Product Grid', benefit: 'USP/Benefit Section', lifestyle: 'Lifestyle Scene', creative: 'Creative/Feature', section_heading: 'Text Heading', cross_sell: 'Cross-Sell Navigation', content: 'Content Section' };
              return '  ' + bp.position + '. ' + (themeLabels[bp.theme] || bp.theme) + ' (used layout: "' + bp.layoutId + '")';
            }).join('\n'),
            '',
            'FOLLOW THE SAME THEMATIC ORDER:',
            '- Use the same sequence of section THEMES (hero → heading → product → benefit → lifestyle → cross-sell etc.)',
            '- The LAYOUT within each section can vary based on this category\'s product count and content needs.',
            '- You MAY use a different layout for the same theme (e.g. "lg-2stack" instead of "std-2equal" for a product highlight).',
            '- You MAY add 1-2 extra sections if this category has special content (e.g. more products, unique features).',
            '- You MAY skip a section only if it truly doesn\'t apply (e.g. no benefit section if category has no specific USPs).',
            '- The goal: a visitor navigating between category pages should feel a consistent, professional structure.',
            '',
          ].join('\n') : '',
          'CROSS-PAGE CTA CONSISTENCY (CRITICAL):',
          '- ALL category pages MUST follow the SAME section structure, layout order, and CTA wording patterns.',
          '- Only the product-specific name or category name differs between pages.',
          '- Example: If one page has CTA "Zur Aktivkohleseife", the same section on another page MUST be "Zur Schwefelseife" (NOT "Zur Kollektion" or "Zum Sortiment").',
          '- Generic CTAs like "Jetzt stöbern" must be IDENTICAL across pages — do NOT vary them ("Zum Sortiment", "Entdecken" etc.).',
          '- CTA patterns to use consistently: "Zu/Zur [Product/Category]", "Jetzt [action]", "[Product] entdecken".',
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
      if (!t.asins) t.asins = [];
      // ─── ENFORCE CORRECT DIMENSIONS PER LAYOUT TYPE ───
      // Standard layouts have FIXED tile dimensions — the AI cannot override them.
      // Only VH layouts allow variable height. Full-width has independent mobile height.
      var isVH = layout && layout.type === 'vh';
      var isFullWidth = layout && layout.type === 'fullwidth';
      var correctDims = tileDims && tileDims[ti] ? tileDims[ti] : { w: 3000, h: 1200 };
      if (!isVH && !isFullWidth) {
        // Standard layout: ALWAYS use the fixed dimensions from LAYOUT_TILE_DIMS
        t.dimensions = { w: correctDims.w, h: correctDims.h };
        t.mobileDimensions = { w: correctDims.w, h: correctDims.h };
        t.syncDimensions = true; // Standard tiles: same image for desktop + mobile
      } else if (isVH) {
        // VH layout: width is fixed, height can be customized by AI
        var vhH = (t.dimensions && t.dimensions.h) ? Math.max(t.dimensions.h, Math.ceil(correctDims.w / 5)) : correctDims.h;
        t.dimensions = { w: correctDims.w, h: vhH };
        t.mobileDimensions = { w: 1500, h: 750 };
      } else if (isFullWidth) {
        // Full-width: width fixed at 3000, height can vary. Mobile is 1680px wide.
        if (!t.dimensions) t.dimensions = { w: 3000, h: correctDims.h || 600 };
        t.dimensions.w = 3000;
        var mobileH = (t.mobileDimensions && t.mobileDimensions.h) || t.dimensions.h;
        t.mobileDimensions = { w: 1680, h: Math.max(mobileH, Math.ceil(1680 / 5)) };
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
        var addLayout = findLayout(newSec.layoutId);
        var addIsVH = addLayout && addLayout.type === 'vh';
        var addIsFullWidth = addLayout && addLayout.type === 'fullwidth';
        newSec.tiles.forEach(function(t, ti) {
          if (!t.type) t.type = 'image';
          if (!t.brief) t.brief = '';
          if (!t.textOverlay) t.textOverlay = '';
          if (!t.ctaText) t.ctaText = '';
          var dd = addDims && addDims[ti] ? addDims[ti] : { w: 3000, h: 1200 };
          if (!addIsVH && !addIsFullWidth) {
            t.dimensions = { w: dd.w, h: dd.h };
            t.mobileDimensions = { w: dd.w, h: dd.h };
            t.syncDimensions = true;
          } else if (!t.dimensions) {
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
          var pgLayout = findLayout(s.layoutId);
          var pgIsVH = pgLayout && pgLayout.type === 'vh';
          var pgIsFullWidth = pgLayout && pgLayout.type === 'fullwidth';
          (s.tiles || []).forEach(function(t, ti) {
            if (!t.type) t.type = 'image';
            if (!t.brief) t.brief = '';
            if (!t.textOverlay) t.textOverlay = '';
            if (!t.ctaText) t.ctaText = '';
            var dd = pgDims && pgDims[ti] ? pgDims[ti] : { w: 3000, h: 1200 };
            if (!pgIsVH && !pgIsFullWidth) {
              t.dimensions = { w: dd.w, h: dd.h };
              t.mobileDimensions = { w: dd.w, h: dd.h };
              t.syncDimensions = true;
            } else if (!t.dimensions) {
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

  // Detect small-catalog-only-homepage scenario
  var isSmallCatalogHomepage = isHomepage && totalProducts <= 4 && (analysis.categories || []).length <= 1;

  var minSections;
  if (isSmallCatalogHomepage) {
    // Small catalog homepage = the ONLY page, needs enough sections to showcase all products
    minSections = complexityLevel >= 3 ? 8 : complexityLevel >= 2 ? 6 : 5;
  } else if (complexityLevel === 1) {
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
      // Generic fallback patterns — HOMEPAGE uses brand/benefit sections only, CATEGORY pages use product sections
      var homePatterns = [
        { layoutId: '1', tiles: [
          { type: 'image', imageCategory: 'benefit', brief: '[BENEFIT] ' + brand + ' key USPs and quality markers — certifications, awards, trust signals', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 600 }, asins: [] },
        ] },
        { layoutId: '1', tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' brand world — products in real-world setting, brand atmosphere', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1000 }, asins: [] },
        ] },
        { layoutId: '1', tiles: [
          { type: 'image', imageCategory: 'text_image', brief: '[TEXT_IMAGE] ' + brand + ' brand values statement, bold headline, brand colors', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 800 }, asins: [] },
        ] },
      ];
      var catPatterns = [
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
      var patterns = isHomepage ? homePatterns : catPatterns;
      var pattern = patterns[(idx - (blueprint ? blueprint.length : 0)) % patterns.length];
      sections.push(Object.assign({ id: uid() }, JSON.parse(JSON.stringify(pattern))));
    }
  }

  return sections;
}

// ─── FULL GENERATION WORKFLOW ───
export async function generateStore(asins, products, brand, marketplace, lang, userInstructions, onLog, complexityLevel, template, websiteData, referenceAnalysis, featureOptions, cancelRef) {
  var log = onLog || function() {};
  var cLevel = complexityLevel || 2;
  var cConfig = COMPLEXITY_LEVELS[cLevel] || COMPLEXITY_LEVELS[2];
  var opts = featureOptions || {};
  var extraPageFlags = opts.extraPages || {};
  var includeProductVideos = opts.includeProductVideos || false;

  function checkCancel() {
    if (cancelRef && cancelRef.current) {
      throw new Error('CANCELLED');
    }
  }

  // STEP 0: Smart Product Matching (Online Shop ↔ Amazon)
  if (websiteData && websiteData.productDescriptions && websiteData.productDescriptions.length > 0) {
    log('Matching website products to Amazon catalog...');
    var matchResult = matchWebsiteProductsToAmazon(websiteData, products);
    if (matchResult.matched.length > 0) {
      log('   ' + matchResult.matched.length + ' products matched between website and Amazon');
      products = matchResult.enriched; // Use enriched products with website data
    }
    if (matchResult.unmatched.length > 0) {
      log('   ' + matchResult.unmatched.length + ' website products not found on Amazon (excluded from store)');
    }
  }

  checkCancel();

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
    } else if (analysis.categories.length === 1 && analysis.categories[0].name.match(/sonstige|andere|other|misc|all|weitere|more\s*products?|produkte/i)) {
      log('AI grouped everything into one generic category, using smarter fallback...');
      analysis = fallbackAnalysis(products, brand, lang, userInstructions);
    }

    // POST-FIX: Rename any remaining generic category names to meaningful ones
    var genericPattern = /^(weitere\s*produkte|more\s*products?|sonstige|andere|all\s*products?|alle\s*produkte|misc|übrige)$/i;
    if (analysis.categories && analysis.categories.length > 0) {
      var existingNames = analysis.categories.map(function(c) { return c.name; });
      analysis.categories.forEach(function(cat) {
        if (genericPattern.test(cat.name.trim())) {
          var catProds = (cat.asins || []).map(function(a) { return products.find(function(p) { return p.asin === a; }); }).filter(Boolean);
          var betterName = deriveCategoryName(catProds, products, brand, lang, existingNames.filter(function(n) { return n !== cat.name; }));
          log('Renaming generic category "' + cat.name + '" → "' + betterName + '"');
          cat.name = betterName;
        }
      });
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

  // ─── SMALL CATALOG HANDLING ───
  // If only 1 category or very few products (≤4), put ALL products on homepage
  // and skip creating a separate category page that just duplicates homepage content
  var isSmallCatalog = products.length <= 4;
  var isSingleCategory = (analysis.categories || []).length <= 1;
  var skipCategoryPages = isSmallCatalog && isSingleCategory;

  if (skipCategoryPages) {
    log('Small catalog detected (' + products.length + ' products, ' + (analysis.categories || []).length + ' category) — all products on homepage, no separate category pages.');
  }

  checkCancel();

  // STEP 2: Generate Homepage Layout
  log('AI designing Homepage layout...');
  // For small catalogs: show ALL products on homepage
  // For larger catalogs: pick top 1 product per category as hero/representative
  var homepageProducts = [];
  if (skipCategoryPages) {
    // Small catalog: ALL products go to homepage
    homepageProducts = products.slice();
  } else {
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

  checkCancel();

  // STEP 3: Generate Category Pages (with subcategory support)
  // Skip if small catalog with single category — everything is already on homepage
  var categories = analysis.categories || [];
  if (skipCategoryPages) {
    log('Skipping category pages (small catalog — all products shown on homepage).');
    categories = []; // empty array = no category pages generated
  }
  // ─── STRUCTURAL BLUEPRINT: First category page defines the layout pattern for all others ───
  var categoryBlueprint = null; // Will be set after first successful category page generation

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
    checkCancel();
    log('AI designing "' + cat.name + '" page (' + allCatProducts.length + ' products)...');
    var catPageName = hasSubs ? cat.name + ' (Category Overview)' : cat.name;
    try {
      var catResult = await aiGeneratePageLayout(
        catPageName, allCatProducts, brand, lang, false,
        categories, analysis, userInstructions, cLevel, category, template, websiteData, referenceAnalysis, false, categoryBlueprint
      );
      var catSections = ensureMinimumSections(catResult.sections || [], cat.name, brand, lang, analysis, template, false, cLevel);
      pages.push({ id: parentPageId, name: cat.name, sections: catSections });
      log(cat.name + ': ' + catSections.length + ' sections');

      // Capture thematic blueprint from first category page
      if (!categoryBlueprint && catSections.length >= 3) {
        categoryBlueprint = catSections.map(function(sec, si) {
          // Determine the thematic purpose of each section
          var tileCategories = sec.tiles.map(function(t) { return t.imageCategory || t.type || ''; });
          var theme = 'content';
          if (tileCategories.indexOf('store_hero') >= 0) theme = 'hero';
          else if (sec.tiles.some(function(t) { return t.type === 'product_grid'; })) theme = 'product_grid';
          else if (tileCategories.every(function(c) { return c === 'benefit'; })) theme = 'benefit';
          else if (tileCategories.indexOf('text_image') >= 0 && sec.tiles.length === 1) theme = 'section_heading';
          else if (tileCategories.indexOf('lifestyle') >= 0) theme = 'lifestyle';
          else if (sec.tiles.some(function(t) { return t.type === 'shoppable_image'; })) theme = 'product_highlight';
          else if (tileCategories.indexOf('creative') >= 0) theme = 'creative';
          // Check if this is a cross-sell section (links to other categories)
          if (sec.tiles.some(function(t) { return t.linkUrl && t.linkUrl.indexOf('/cat-') >= 0; })) theme = 'cross_sell';
          return {
            position: si + 1,
            theme: theme,
            layoutId: sec.layoutId,
            tileCount: sec.tiles.length,
          };
        });
        log('   → Thematic blueprint captured: ' + categoryBlueprint.map(function(bp) { return bp.theme; }).join(' → '));
      }
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

  checkCancel();

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

  checkCancel();

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
      var resolvedLayout = resolveLayoutId(sec.layout);
      var layoutObj = findLayout(resolvedLayout);
      var epDims = LAYOUT_TILE_DIMS[resolvedLayout];
      secs.push({
        id: uid(), layoutId: resolvedLayout,
        tiles: sec.tiles.map(function(t, ti) {
          var dim = t.dim || (epDims && epDims[ti]) || { w: 1500, h: 1000 };
          var isStd = layoutObj && layoutObj.type !== 'vh' && layoutObj.type !== 'fullwidth';
          // Standard layouts: mobileDimensions = dimensions (same image)
          var mobileDim = isStd ? { w: dim.w, h: dim.h } : layoutObj && layoutObj.type === 'fullwidth' ? { w: 1680, h: Math.max(dim.h, Math.ceil(1680 / 5)) } : { w: 1500, h: 750 };
          return {
            type: t.type || 'image', imageCategory: t.cat || '', brief: t.brief || '',
            textOverlay: t.overlay || '', ctaText: t.cta || '',
            dimensions: { w: dim.w, h: dim.h },
            mobileDimensions: mobileDim,
            syncDimensions: isStd,
            asins: t.asins || [],
          };
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

  // ─── FINAL SANITIZE: Enforce correct dimensions on ALL tiles across ALL pages ───
  pages.forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      var resolvedId = resolveLayoutId(sec.layoutId);
      var layoutObj = findLayout(resolvedId);
      var dims = LAYOUT_TILE_DIMS[resolvedId];
      var isStandard = layoutObj && layoutObj.type !== 'vh' && layoutObj.type !== 'fullwidth';
      (sec.tiles || []).forEach(function(t, ti) {
        if (isStandard && dims && dims[ti]) {
          // Standard layout: desktop = mobile = LAYOUT_TILE_DIMS value
          t.dimensions = { w: dims[ti].w, h: dims[ti].h };
          t.mobileDimensions = { w: dims[ti].w, h: dims[ti].h };
          t.syncDimensions = true;
        }
        // Ensure mobileDimensions always exists
        if (!t.mobileDimensions && t.dimensions) {
          t.mobileDimensions = { w: t.dimensions.w, h: t.dimensions.h };
        }
      });
    });
  });

  // ─── CROSS-PAGE CTA WORDING CONSISTENCY ───
  // Category pages keep their own structure/layouts (categories are naturally different).
  // Only CTA wording patterns are harmonised: same-purpose CTAs use the same pattern,
  // with only the category/product name swapped.
  // E.g. "Zur Aktivkohleseife" on page 1 → "Zur Schwefelseife" on page 2.
  // Generic CTAs like "Jetzt stöbern" stay identical across pages.
  (function enforceCrossPageConsistency() {
    var catPages = pages.filter(function(p) { return p.id && p.id.indexOf('cat-') === 0 && !p.parentId; });
    if (catPages.length < 2) return;

    var refPage = catPages[0];
    var refName = refPage.name || '';

    // Helper: swap reference page/category name words in a string with the target's name
    function swapNames(text, srcName, tgtName) {
      if (!text || !srcName || !tgtName) return text;
      var srcWords = srcName.split(/\s+/);
      var result = text;
      srcWords.forEach(function(w) {
        if (w.length >= 3 && result.toLowerCase().indexOf(w.toLowerCase()) >= 0) {
          var regex = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          result = result.replace(regex, tgtName);
        }
      });
      return result;
    }

    // Collect all CTA texts from the reference page (with section+tile index as key)
    var refCTAs = {};
    (refPage.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (tile.ctaText) {
          refCTAs[si + ':' + ti] = tile.ctaText;
        }
      });
    });

    for (var cp = 1; cp < catPages.length; cp++) {
      var targetPage = catPages[cp];
      var tgtName = targetPage.name || '';

      (targetPage.sections || []).forEach(function(sec, si) {
        (sec.tiles || []).forEach(function(tile, ti) {
          var key = si + ':' + ti;
          // If reference page has a CTA at the same position, harmonise the wording pattern
          if (refCTAs[key]) {
            tile.ctaText = swapNames(refCTAs[key], refName, tgtName);
          }
        });
      });
    }
    log('Cross-page CTA wording consistency enforced across ' + catPages.length + ' category pages.');
  })();

  // ─── CROSS-PAGE THEMATIC CONSISTENCY CHECK ───
  // Log how well category pages match thematically. Does NOT force layouts —
  // only reports deviations so the user is aware. The AI prompt blueprint
  // handles consistency at generation time; this is a verification step.
  (function checkThematicConsistency() {
    var catPages = pages.filter(function(p) { return p.id && p.id.indexOf('cat-') === 0 && !p.parentId; });
    if (catPages.length < 2) return;

    var refPage = catPages[0];
    var refSections = refPage.sections || [];

    // Extract thematic fingerprint (section themes, not layouts)
    function getSectionTheme(sec) {
      var cats = (sec.tiles || []).map(function(t) { return t.imageCategory || t.type || ''; });
      if (cats.indexOf('store_hero') >= 0) return 'hero';
      if (sec.tiles.some(function(t) { return t.type === 'product_grid'; })) return 'product_grid';
      if (cats.every(function(c) { return c === 'benefit'; })) return 'benefit';
      if (cats.indexOf('text_image') >= 0 && sec.tiles.length === 1) return 'heading';
      if (sec.tiles.some(function(t) { return t.type === 'shoppable_image'; })) return 'product_highlight';
      if (cats.indexOf('lifestyle') >= 0) return 'lifestyle';
      if (cats.indexOf('creative') >= 0) return 'creative';
      if (sec.tiles.some(function(t) { return t.linkUrl && t.linkUrl.indexOf('/cat-') >= 0; })) return 'cross_sell';
      return 'content';
    }

    var refThemes = refSections.map(getSectionTheme);

    var consistent = 0;
    var deviated = 0;
    for (var cp = 1; cp < catPages.length; cp++) {
      var targetThemes = (catPages[cp].sections || []).map(getSectionTheme);
      // Compare theme sequences (allow ±1 section difference)
      var themeMatch = 0;
      var maxLen = Math.max(refThemes.length, targetThemes.length);
      for (var ti = 0; ti < Math.min(refThemes.length, targetThemes.length); ti++) {
        if (refThemes[ti] === targetThemes[ti]) themeMatch++;
      }
      var matchRate = maxLen > 0 ? Math.round(themeMatch / maxLen * 100) : 100;
      if (matchRate >= 70) { consistent++; } else { deviated++; }
    }

    if (deviated > 0) {
      log('Thematic consistency: ' + consistent + '/' + (catPages.length - 1) + ' pages match reference, ' + deviated + ' deviate (>30% theme difference).');
    } else {
      log('Thematic consistency: all ' + catPages.length + ' category pages follow the same thematic flow.');
    }
  })();

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

// Build image description for wireframe generation.
// This produces a VISUAL description of the final image — not a wireframe/mockup/layout.
// The description is stored as tile.wireframeDescription (internal, not shown to designer).
function buildWireframePrompt(tile, brand, ciColors, ciBrandStyle, analysis) {
  var cat = tile.imageCategory || 'creative';
  var brief = tile.brief || '';
  var textOverlay = tile.textOverlay || '';

  // ─── DESIGN LANGUAGE (consistent across all images in this store) ───
  var ciData = analysis.productCI || null;
  var designLanguage = [];
  designLanguage.push('A single image, edge-to-edge, no frame or border.');
  designLanguage.push('NOT a webpage, NOT a mockup, NOT a multi-panel layout. Just one standalone image.');

  // CI-based design direction
  if (ciData) {
    if (ciData.visualMood) designLanguage.push('Visual style: ' + ciData.visualMood + '.');
    if (ciData.backgroundPattern) designLanguage.push('Background style: ' + ciData.backgroundPattern + '.');
    if (ciData.typographyStyle) designLanguage.push('Typography: ' + ciData.typographyStyle + '.');
    if (ciData.recurringElements && ciData.recurringElements.length > 0) {
      designLanguage.push('Design elements: ' + ciData.recurringElements.slice(0, 4).join(', ') + '.');
    }
  } else if (analysis.brandTone) {
    designLanguage.push('Style: ' + analysis.brandTone + '.');
  }

  // Colors — product-specific if available, otherwise brand palette
  if (ciColors) {
    designLanguage.push('Color palette: ' + ciColors + '.');
  }

  // ─── IMAGE CONTENT (what the image shows) ───
  var content = [];
  switch (cat) {
    case 'store_hero':
      content.push('Wide panoramic image.');
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 60) + '".');
      content.push('Brand atmosphere, bold composition.');
      break;
    case 'benefit':
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 50) + '".');
      content.push('Clean graphical element. No product photo.');
      break;
    case 'product':
      content.push('Product centered on clean background.');
      break;
    case 'creative':
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 50) + '".');
      content.push('Graphic composition with text and visual elements.');
      break;
    case 'lifestyle':
      content.push('Lifestyle scene with product in natural context.');
      if (textOverlay) content.push('Subtle text: "' + textOverlay.substring(0, 40) + '".');
      break;
    case 'text_image':
      if (textOverlay) content.push('Prominent text: "' + textOverlay.substring(0, 60) + '".');
      content.push('Typography-driven. Minimal imagery.');
      break;
    default:
      content.push('Image based on the description below.');
  }

  // Add brief as content context (shortened, stripped of tags)
  if (brief) {
    var cleanBrief = brief.replace(/^\[[\w_]+\]\s*/, '');
    if (cleanBrief.length > 120) cleanBrief = cleanBrief.substring(0, 120) + '...';
    content.push(cleanBrief);
  }

  return designLanguage.concat(content).filter(Boolean).join(' ');
}

// Generate the internal wireframe description for a tile (CI-aware, not shown to designer).
// Called during wireframe generation to create the prompt AND store the description.
function buildWireframeDescription(tile, brand, analysis) {
  var cat = tile.imageCategory || 'creative';
  var brief = tile.brief || '';
  var textOverlay = tile.textOverlay || '';
  var ciData = analysis.productCI || null;

  var parts = [];
  parts.push('[' + cat.toUpperCase() + ']');

  // Content description
  var cleanBrief = brief.replace(/^\[[\w_]+\]\s*/, '').trim();
  if (cleanBrief) parts.push(cleanBrief);

  // Text content
  if (textOverlay) {
    var lines = textOverlay.split(/\\n|\n/).filter(function(l) { return l.trim(); });
    parts.push('Text: ' + lines.join(' | '));
  }

  // CI notes for this image
  if (ciData) {
    var ciNotes = [];
    if (ciData.visualMood) ciNotes.push(ciData.visualMood);
    if (ciData.backgroundPattern) ciNotes.push('BG: ' + ciData.backgroundPattern);
    if (ciNotes.length > 0) parts.push('CI: ' + ciNotes.join(', '));
  }

  return parts.join(' — ');
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
export async function generateWireframesForPage(page, brand, websiteData, analysis, onProgress, manualCI, cancelRef) {
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

  // ─── STEP 1: Get CI-aware image descriptions from Gemini (batch) ───
  var ciData = (analysis || {}).productCI || (websiteData && websiteData.productCI) || null;
  // Merge manualCI colors into ciData if present
  if (manualCI && manualCI.colors && manualCI.colors.length > 0) {
    if (!ciData) ciData = {};
    ciData.primaryColors = manualCI.colors;
  }
  var brandTone = (manualCI && manualCI.brandTone) || (analysis || {}).brandTone || '';

  var imageDescriptions = null;
  try {
    log(0, tiles.length, 'Gemini erstellt Bildbeschreibungen...');
    var tileInputs = tiles.map(function(entry) {
      return {
        imageCategory: entry.tile.imageCategory || 'creative',
        brief: entry.tile.brief || '',
        textOverlay: entry.tile.textOverlay || '',
        dimensions: entry.tile.dimensions || { w: 3000, h: 1200 },
      };
    });
    var descResp = await fetch('/api/generate-image-descriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles: tileInputs, ciData: ciData, brandName: brand, brandTone: brandTone }),
    });
    if (descResp.ok) {
      var descData = await descResp.json();
      if (descData.descriptions && descData.descriptions.length > 0) {
        imageDescriptions = descData.descriptions;
        log(0, tiles.length, imageDescriptions.length + ' Bildbeschreibungen von Gemini erhalten');
      }
    }
  } catch (descErr) {
    log(0, tiles.length, 'Gemini-Beschreibungen nicht verfügbar, verwende Fallback (' + descErr.message + ')');
  }

  // ─── STEP 2: Generate images using descriptions ───
  var success = 0;
  var failed = 0;
  var cancelled = false;
  var lastError = '';
  for (var i = 0; i < tiles.length; i++) {
    // Check for cancellation
    if (cancelRef && cancelRef.current) {
      cancelled = true;
      log(i + 1, tiles.length, 'ABGEBROCHEN');
      break;
    }
    var entry = tiles[i];
    var tile = entry.tile;
    try {
      log(i + 1, tiles.length, tile.imageCategory || 'image');

      // Use Gemini-generated description if available, otherwise fallback to hardcoded
      var wfPrompt;
      if (imageDescriptions && imageDescriptions[i] && imageDescriptions[i].imagePrompt) {
        wfPrompt = imageDescriptions[i].imagePrompt;
        tile.wireframeDescription = imageDescriptions[i].internalDescription || '';
      } else {
        // Fallback: use the old hardcoded prompt builder
        var ciColors = ciData && ciData.primaryColors ? ciData.primaryColors.join(', ') : '';
        wfPrompt = buildWireframePrompt(tile, brand, ciColors, '', analysis || {});
        tile.wireframeDescription = buildWireframeDescription(tile, brand, analysis || {});
      }

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
  return { success: success, failed: failed, total: tiles.length, cancelled: cancelled, error: cancelled ? 'Abgebrochen' : (failed > 0 ? lastError : '') };
}

// ─── EXPORTED: Delete all wireframes for a single page ───
export function deleteWireframesForPage(page) {
  var deleted = 0;
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      if (tile.wireframeImage) {
        delete tile.wireframeImage;
        deleted++;
      }
    });
  });
  return deleted;
}

// ─── HELPER: Derive a meaningful category name from products ───
// Instead of "Weitere Produkte", extract the most descriptive term from product data
function deriveCategoryName(productsInGroup, allProducts, brand, lang, existingNames) {
  existingNames = existingNames || [];
  var existingLower = existingNames.map(function(n) { return n.toLowerCase(); });

  // Strategy 1: Use Amazon category data from the products
  var catCounts = {};
  productsInGroup.forEach(function(p) {
    if (p.categories && p.categories.length > 0) {
      // Prefer 2nd level category (more specific than top, less than leaf)
      var cat = p.categories.length >= 2 ? p.categories[1] : p.categories[0];
      if (cat && cat.length > 1) {
        if (!catCounts[cat]) catCounts[cat] = 0;
        catCounts[cat]++;
      }
    }
  });
  var bestCat = Object.keys(catCounts).sort(function(a, b) { return catCounts[b] - catCounts[a]; })[0];
  if (bestCat && existingLower.indexOf(bestCat.toLowerCase()) < 0) return bestCat;

  // Strategy 2: Find the most common meaningful word from product names
  var brandWords = brand.toLowerCase().split(/\s+/);
  var filler = ['with', 'für', 'for', 'and', 'und', 'the', 'von', 'aus', 'set', 'pack', 'stück', 'stk',
    'pcs', 'size', 'color', 'amazon', 'prime', 'premium', 'original', 'neue', 'new', 'best', 'top',
    'pro', 'plus', 'extra', 'super', 'ultra', 'max', 'mini', 'groß', 'klein', 'large', 'small',
    'ml', 'mg', 'stk', 'x', 'er'];
  var wordCounts = {};
  productsInGroup.forEach(function(p) {
    var name = (p.name || '').toLowerCase();
    var words = name.replace(/[^a-zäöüß\s]/g, ' ').split(/\s+/).filter(function(w) {
      return w.length > 3 && filler.indexOf(w) < 0 && brandWords.indexOf(w) < 0;
    });
    // Deduplicate per product (count each word max once per product)
    var seen = {};
    words.forEach(function(w) {
      if (!seen[w]) { seen[w] = true; if (!wordCounts[w]) wordCounts[w] = 0; wordCounts[w]++; }
    });
  });
  var sortedWords = Object.keys(wordCounts).sort(function(a, b) { return wordCounts[b] - wordCounts[a]; });
  // Pick the most common word that appears in at least 40% of group products
  for (var i = 0; i < sortedWords.length; i++) {
    var w = sortedWords[i];
    if (wordCounts[w] >= productsInGroup.length * 0.4 || wordCounts[w] >= 2) {
      var label = w.charAt(0).toUpperCase() + w.slice(1);
      if (existingLower.indexOf(label.toLowerCase()) < 0) return label;
    }
  }

  // Strategy 3: Use 1st level Amazon category
  var topCatCounts = {};
  productsInGroup.forEach(function(p) {
    if (p.categories && p.categories.length > 0) {
      var cat = p.categories[0];
      if (cat) { if (!topCatCounts[cat]) topCatCounts[cat] = 0; topCatCounts[cat]++; }
    }
  });
  var bestTopCat = Object.keys(topCatCounts).sort(function(a, b) { return topCatCounts[b] - topCatCounts[a]; })[0];
  if (bestTopCat && existingLower.indexOf(bestTopCat.toLowerCase()) < 0) return bestTopCat;

  // Strategy 4: Use brand name + "Sortiment" / "Collection"
  var collLabel = lang === 'German' ? (brand + ' Sortiment') : (brand + ' Collection');
  if (existingLower.indexOf(collLabel.toLowerCase()) < 0) return collLabel;

  // Last resort: number it
  return lang === 'German' ? ('Kollektion ' + (existingNames.length + 1)) : ('Collection ' + (existingNames.length + 1));
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

    // Remaining unassigned products — derive a meaningful name instead of "Weitere Produkte"
    var remaining = products.filter(function(p) { return !assigned[p.asin]; });
    if (remaining.length > 0) {
      var remLabel = deriveCategoryName(remaining, products, brand, lang, Object.keys(groups));
      groups[remLabel] = remaining.map(function(p) { return p.asin; });
    }
  } else {
    // Clean up __uncat__ bucket — derive meaningful name
    if (groups['__uncat__'] && groups['__uncat__'].length > 0) {
      var uncatProds = products.filter(function(p) { return groups['__uncat__'].indexOf(p.asin) >= 0; });
      var remLabel2 = deriveCategoryName(uncatProds, products, brand, lang, Object.keys(groups).filter(function(k) { return k !== '__uncat__'; }));
      groups[remLabel2] = groups['__uncat__'];
    }
    delete groups['__uncat__'];
  }

  // Consolidate: merge tiny groups, limit to 8
  var catNames = Object.keys(groups);
  if (catNames.length > 8) {
    // Collect overflow products to derive a proper name later
    var overflowAsins = [];
    catNames.sort(function(a, b) { return groups[a].length - groups[b].length; });
    while (Object.keys(groups).length > 8) {
      var smallest = Object.keys(groups).sort(function(a, b) { return groups[a].length - groups[b].length; })[0];
      overflowAsins = overflowAsins.concat(groups[smallest]);
      delete groups[smallest];
    }
    if (overflowAsins.length > 0) {
      var overflowProds = products.filter(function(p) { return overflowAsins.indexOf(p.asin) >= 0; });
      var overflowLabel = deriveCategoryName(overflowProds, products, brand, lang, Object.keys(groups));
      groups[overflowLabel] = overflowAsins;
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
  var complexity = (analysis && analysis.productComplexity) || 'medium';
  var isSmallCatalog = products.length <= 4 && categories.length <= 1;

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

  if (isSmallCatalog) {
    // ── SMALL CATALOG: Show all products with rich detail on homepage ──

    // Product overview: all products side by side as shoppable images
    var layoutId = products.length === 1 ? '1' : products.length === 2 ? '1-1' : products.length === 3 ? '1-1-1' : '1-1-1-1';
    sections.push({
      id: uid(), layoutId: layoutId,
      tiles: products.map(function(p) {
        return { type: 'shoppable_image', imageCategory: 'product', brief: '[SHOPPABLE] ' + brand + ' ' + (p.name || 'product') + ' packshot on white, soft shadow', textOverlay: p.name || '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [], linkAsin: p.asin };
      }),
    });

    // Benefit section
    sections.push({
      id: uid(), layoutId: '1',
      tiles: [{
        type: 'image', imageCategory: 'benefit',
        brief: '[BENEFIT] ' + brand + ' brand USPs, quality markers, trust signals',
        textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 600 }, asins: [],
      }],
    });

    // Per-product showcase sections
    products.forEach(function(p, pi) {
      // Text heading for this product
      sections.push({
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'image', imageCategory: 'text_image',
          brief: '[TEXT_IMAGE] Section heading for ' + (p.name || 'Product ' + (pi + 1)) + ', bold product name',
          textOverlay: p.name || (brand + ' Produkt ' + (pi + 1)),
          ctaText: '', dimensions: { w: 3000, h: 400 }, asins: [],
        }],
      });
      // Product detail: lifestyle + creative features
      sections.push({
        id: uid(), layoutId: '1-1',
        tiles: [
          { type: 'image', imageCategory: 'lifestyle', brief: '[LIFESTYLE] ' + brand + ' ' + (p.name || 'product') + ' in real-world use', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
          { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] ' + brand + ' ' + (p.name || 'product') + ' key features and benefits', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
        ],
      });
    });

    // Combined closing section
    if (products.length >= 2) {
      sections.push({
        id: uid(), layoutId: '1',
        tiles: [{
          type: 'image', imageCategory: 'lifestyle',
          brief: '[LIFESTYLE] ' + brand + ' all products together in complementary scene',
          textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 800 }, asins: [],
        }],
      });
    }

  } else {
    // ── NORMAL CATALOG: Category navigation + bestsellers ──

    // Category grid
    var catNames = categories.map(function(c) { return c.name; });
    if (catNames.length > 0 && catNames.length <= 4) {
      var catLayoutId = catNames.length === 1 ? '1' : catNames.length === 2 ? '1-1' : catNames.length === 3 ? '1-1-1' : '1-1-1-1';
      sections.push({
        id: uid(), layoutId: catLayoutId,
        tiles: catNames.map(function(cat) {
          return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] ' + brand + ' ' + cat + ' category preview, representative product', textOverlay: cat, ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] };
        }),
      });
    } else if (catNames.length > 4) {
      var row1 = catNames.slice(0, 4);
      var row2 = catNames.slice(4, 8);
      sections.push({
        id: uid(), layoutId: '1-1-1-1',
        tiles: row1.map(function(cat) {
          return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] ' + brand + ' ' + cat + ' category preview, representative product', textOverlay: cat, ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] };
        }),
      });
      if (row2.length > 0) {
        var lid = row2.length === 1 ? '1' : row2.length === 2 ? '1-1' : row2.length === 3 ? '1-1-1' : '1-1-1-1';
        sections.push({
          id: uid(), layoutId: lid,
          tiles: row2.map(function(cat) {
            return { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] ' + brand + ' ' + cat + ' category preview, representative product', textOverlay: cat, ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] };
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
  }

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
        { type: 'image', imageCategory: 'creative', brief: '[CREATIVE] "' + heroProduct.name.split(' ').slice(0, 4).join(' ') + '" bold name on clean background + product silhouette', textOverlay: heroProduct.name.split(' ').slice(0, 4).join(' '), ctaText: '', dimensions: { w: 3000, h: 1200 }, asins: [] },
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

  // 6. Cross-sell navigation banner
  sections.push({
    id: uid(), layoutId: '1',
    tiles: [{
      type: 'image', imageCategory: 'text_image',
      brief: '[TEXT_IMAGE] Navigation banner — simple text on representative product linking back to all products.',
      textOverlay: lang === 'German' ? 'Alle Produkte entdecken' : 'Explore All Products',
      ctaText: lang === 'German' ? 'Jetzt stöbern' : 'Browse Now',
      dimensions: { w: 3000, h: 600 }, asins: [],
    }],
  });

  return { id: id, name: name, sections: sections };
}
