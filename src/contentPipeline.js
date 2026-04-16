// ─── CONTENT-FIRST PIPELINE v2 ───
// Every step is a SMALL, focused API call. No mega-prompts.
// Results are accumulated step by step.
// Fully automated — no manual intervention between steps.

var ANTHROPIC_KEY = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_ANTHROPIC_API_KEY : '';
var ANTHROPIC_MODEL = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-sonnet-4-20250514') : 'claude-sonnet-4-20250514';

async function callClaude(systemPrompt, userPrompt, maxTokens) {
  var resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens || 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('Claude ' + resp.status + ': ' + errText.slice(0, 200));
  }
  var data = await resp.json();
  var text = data.content && data.content[0] ? data.content[0].text : '';
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (e) {} }
  return { _raw: text };
}

// ═══════════════════════════════════════════════════════════════
// STEP 1: Analyze ONE product
// Called once per ASIN. Small focused call.
// ═══════════════════════════════════════════════════════════════
export async function analyzeOneProduct(product) {
  var system = 'You analyze a single Amazon product for Brand Store creation. Return ONLY valid JSON. NEVER use hyphens, dashes or m-dashes to combine text elements. Use line breaks or hierarchy (bold/regular) instead.';
  var user = [
    'Product: ' + product.name,
    'ASIN: ' + product.asin,
    'Rating: ' + product.rating + ' (' + product.reviews + ' reviews)',
    'Bought past month: ' + (product.boughtPastMonth || 'unknown'),
    'Bestseller rank: ' + (product.bestsellerRank || 'unknown'),
    '',
    'Bullet Points:',
    (product.bulletPoints || []).join('\n'),
    '',
    'Description:',
    product.description || '(none)',
    '',
    'Customer says: ' + (product.customerSays || '(none)'),
    '',
    'Amazon categories: ' + (product.categories || []).join(' > '),
    '',
    'Return JSON:',
    '{',
    '  "productCategory": "what category this product belongs to (by function, not Amazon breadcrumb)",',
    '  "keyBenefits": ["benefit 1", "benefit 2", "benefit 3"],',
    '  "targetUseCase": "who uses this and when",',
    '  "uniqueFeatures": ["what makes this product special"],',
    '  "isBestseller": true/false,',
    '  "shortHeadline": "short product headline for store",',
    '  "shortDescription": "1-2 sentences about this product"',
    '}',
  ].join('\n');
  return await callClaude(system, user, 1024);
}

// ═══════════════════════════════════════════════════════════════
// STEP 2: Group analyzed products into categories
// Gets ALL product analyses as input (small summaries, not raw data)
// ═══════════════════════════════════════════════════════════════
export async function groupIntoCategories(productAnalyses, brand, lang) {
  var system = 'You group products into logical categories for a Brand Store. Return ONLY valid JSON.';
  var summaries = productAnalyses.map(function(pa) {
    return pa.asin + ': ' + pa.shortHeadline + ' → ' + pa.productCategory;
  });
  var user = [
    'Brand: ' + brand + ' | Language: ' + lang,
    '',
    'Products and their AI-suggested categories:',
    summaries.join('\n'),
    '',
    'Group these products into 3-8 logical categories.',
    'Products may be in the wrong suggested category — use your judgment.',
    'Return JSON:',
    '{',
    '  "categories": [',
    '    { "name": "Category Name", "asins": ["B0..."], "description": "what this category is about" }',
    '  ]',
    '}',
    '',
    'EVERY ASIN must appear in exactly one category.',
  ].join('\n');
  return await callClaude(system, user, 2048);
}

// ═══════════════════════════════════════════════════════════════
// STEP 3: Extract brand USPs from website page
// Called once per scraped website page.
// ═══════════════════════════════════════════════════════════════
export async function analyzeWebsitePage(pageText, pageSource, brand) {
  var system = 'You extract brand information from a website page. Return ONLY valid JSON.';
  var user = [
    'Brand: ' + brand,
    'Page source: ' + pageSource,
    '',
    'Page content:',
    pageText,
    '',
    'Extract EVERYTHING relevant for a Brand Store:',
    '{',
    '  "usps": ["customer-facing USP/benefit found on this page"],',
    '  "brandStoryElements": ["any brand story, founder info, history, values"],',
    '  "certifications": ["certifications, awards, quality seals mentioned"],',
    '  "trustElements": ["satisfaction guarantees, statistics, social proof"],',
    '  "keyPhrases": ["important phrases/slogans the brand uses"],',
    '  "productMentions": ["products or categories mentioned on this page"]',
    '}',
  ].join('\n');
  return await callClaude(system, user, 2048);
}

// ═══════════════════════════════════════════════════════════════
// STEP 4: Synthesize brand profile from all collected data
// Gets accumulated results from Steps 1-3
// ═══════════════════════════════════════════════════════════════
export async function synthesizeBrandProfile(allProductAnalyses, allWebsiteAnalyses, categories, brandVoice, brand, lang) {
  var system = [
    'You create the definitive brand profile for a Brand Store.',
    'All data has been pre-analyzed. Your job is to SYNTHESIZE, not re-analyze.',
    'Return ONLY valid JSON. All texts in ' + lang + '.',
    'TEXT RULE: NEVER use hyphens (-), m-dashes (—), or en-dashes (–) to combine two text elements.',
    'Use line breaks or text hierarchy (headline + subline) instead. Example: NOT "Hochdosiert - Made in Germany" but "Hochdosiert\\nMade in Germany".',
  ].join('\n');

  // Collect all USPs from website pages
  var allUsps = [];
  var allStoryElements = [];
  var allCerts = [];
  var allTrust = [];
  var allPhrases = [];
  (allWebsiteAnalyses || []).forEach(function(wa) {
    (wa.usps || []).forEach(function(u) { if (allUsps.indexOf(u) < 0) allUsps.push(u); });
    (wa.brandStoryElements || []).forEach(function(s) { allStoryElements.push(s); });
    (wa.certifications || []).forEach(function(c) { if (allCerts.indexOf(c) < 0) allCerts.push(c); });
    (wa.trustElements || []).forEach(function(t) { if (allTrust.indexOf(t) < 0) allTrust.push(t); });
    (wa.keyPhrases || []).forEach(function(p) { if (allPhrases.indexOf(p) < 0) allPhrases.push(p); });
  });

  // Collect product benefits
  var allBenefits = [];
  (allProductAnalyses || []).forEach(function(pa) {
    (pa.keyBenefits || []).forEach(function(b) { if (allBenefits.indexOf(b) < 0) allBenefits.push(b); });
  });

  var user = [
    'Brand: ' + brand + ' | Language: ' + lang,
    '',
    'BRAND VOICE: ' + JSON.stringify(brandVoice, null, 1),
    '',
    'USPs found on website: ' + allUsps.join(' | '),
    'Brand story elements: ' + allStoryElements.join(' | '),
    'Certifications: ' + allCerts.join(' | '),
    'Trust elements: ' + allTrust.join(' | '),
    'Key phrases: ' + allPhrases.join(' | '),
    'Product benefits (across all products): ' + allBenefits.join(' | '),
    '',
    'Categories: ' + (categories.categories || []).map(function(c) { return c.name + ' (' + (c.asins || []).length + ')'; }).join(', '),
    '',
    'Synthesize into a definitive brand profile:',
    '{',
    '  "usps": [{ "text": "USP as customer benefit in ' + lang + '", "source": "website/product/derived" }],',
    '  "brandStory": { "available": true/false, "headline": "...", "text": "2-4 sentences", "source": "..." },',
    '  "trustElements": [{ "text": "...", "type": "certification/guarantee/statistic" }],',
    '  "heroBannerConcept": { "headline": "...", "subline": "..." },',
    '  "imageConcepts": [{ "type": "lifestyle/creative/product", "description": "what to show", "forPage": "Homepage/Category" }]',
    '}',
    '',
    'RULES:',
    '- USPs must come from ACTUAL website/product data. Not invented.',
    '- If no brand story info found, set available=false. Do NOT invent one.',
    '- All texts in ' + lang + '.',
  ].join('\n');

  return await callClaude(system, user, 4096);
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: Plan page structure from content
// ═══════════════════════════════════════════════════════════════
export async function planPages(brandProfile, categories, productAnalyses, storeKnowledge, brand, lang, extraPages) {
  var system = [
    'You plan Amazon Brand Store pages. Content determines structure.',
    'Only create pages for content that EXISTS. No empty pages.',
    'Return ONLY valid JSON. All texts in ' + lang + '.',
  ].join('\n');

  var user = [
    'Brand: ' + brand,
    '',
    'CONTENT AVAILABLE:',
    '- USPs: ' + (brandProfile.usps || []).map(function(u) { return u.text; }).join(' | '),
    '- Brand Story: ' + (brandProfile.brandStory && brandProfile.brandStory.available ? 'Yes' : 'No'),
    '- Trust Elements: ' + (brandProfile.trustElements || []).length,
    '- Categories: ' + (categories.categories || []).map(function(c) { return c.name + ' (' + (c.asins || []).length + ' products)'; }).join(', '),
    '- Products: ' + productAnalyses.length + ' total',
    '- Image Concepts: ' + (brandProfile.imageConcepts || []).length,
    '',
    storeKnowledge ? 'REFERENCE STORE INSIGHTS (for section selection only):\n' + storeKnowledge : '',
    '',
    'Plan pages. Return JSON:',
    '{',
    '  "pages": [',
    '    { "id": "homepage", "name": "Homepage", "sections": [',
    '      { "purpose": "what this shows", "contentSource": "usps/categories/brandStory/products/trust", "layout": "Full-Width/std-2equal/lg-2stack/2x2wide/vh-w2s/etc" }',
    '    ] }',
    '  ]',
    '}',
    '',
    'Only create pages for which content exists.',
    'Homepage + 1 page per category is the minimum.',
    'Extra pages (About, Bestsellers) only if content supports them.',
    extraPages && Object.keys(extraPages).some(function(k) { return extraPages[k]; })
      ? 'USER REQUESTED these extra pages: ' + Object.keys(extraPages).filter(function(k) { return extraPages[k]; }).join(', ') + '. Include them in the plan.'
      : '',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 4096);
}

// ═══════════════════════════════════════════════════════════════
// STEP 6: Generate ONE page
// Called once per page. Gets the page plan + relevant content.
// ═══════════════════════════════════════════════════════════════
export async function generateOnePage(pagePlan, brandProfile, categories, productAnalyses, brand, lang, previousPages, storeKnowledge) {
  var system = [
    'You generate ONE Amazon Brand Store page.',
    'You receive the page plan + all relevant content.',
    'Your job: fill the sections with real content. No filler. No generic text.',
    'Return ONLY valid JSON. All textOverlay texts in ' + lang + '.',
    'Briefs in English, 10-20 words max — just the image idea.',
    'TEXT RULE: NEVER use hyphens (-), m-dashes (—), or en-dashes (–) to combine text blocks in headings, USPs, features, or overlays.',
    'Use line breaks (\\n) for multi-line text. Use hierarchy (larger text + smaller text) instead of dashes.',
  ].join('\n');

  // Find relevant products for this page
  var pageCategory = (categories.categories || []).find(function(c) { return c.name === pagePlan.name; });
  var relevantAsins = pageCategory ? (pageCategory.asins || []) : [];
  var relevantProducts = productAnalyses.filter(function(pa) { return relevantAsins.indexOf(pa.asin) >= 0; });

  var user = [
    'Page: "' + pagePlan.name + '" (id: ' + pagePlan.id + ')',
    'Brand: ' + brand + ' | Language: ' + lang,
    '',
    'PAGE PLAN (sections to fill):',
    JSON.stringify(pagePlan.sections, null, 1),
    '',
    'BRAND USPs: ' + (brandProfile.usps || []).map(function(u) { return u.text; }).join(' | '),
    '',
    relevantProducts.length > 0 ? 'PRODUCTS FOR THIS PAGE:\n' + JSON.stringify(relevantProducts, null, 1) : 'This is the homepage — show overview of all categories.',
    '',
    pageCategory ? 'CATEGORY: ' + pageCategory.name + ' — ' + (pageCategory.description || '') : '',
    '',
    previousPages && previousPages.length > 0 ? 'ALREADY GENERATED PAGES (avoid duplicating content):\n' + previousPages.map(function(p) { return p.name + ': ' + (p.sections || []).length + ' sections'; }).join('\n') : '',
    '',
    storeKnowledge ? 'REFERENCE STORE INSIGHTS (for section/layout inspiration):\n' + storeKnowledge : '',
    '',
    'Generate sections. Each section has a layoutId and tiles.',
    'IMPORTANT: Each section has a layoutId that determines tile arrangement.',
    '',
    'AVAILABLE LAYOUTS:',
    '"1" = Full Width (1 tile, full width of the store)',
    '"std-2equal" = 2 equal tiles side by side',
    '"lg-2stack" = 1 large tile + 2 stacked smaller tiles',
    '"2stack-lg" = mirror of lg-2stack',
    '"lg-4grid" = 1 large tile + 4 small tiles in grid',
    '"2x2wide" = 4 wide tiles in 2x2 grid',
    '"vh-w2s" = 1 wide + 2 small squares (variable height)',
    '"vh-2equal" = 2 equal wide tiles (variable height)',
    '"1-1-1" = 3 equal tiles',
    '',
    'Return JSON:',
    '{',
    '  "heroBannerBrief": "10 words: what the hero banner above the menu shows",',
    '  "heroBannerTextOverlay": "headline text on the banner",',
    '  "sections": [',
    '    {',
    '      "layoutId": "MUST be one of the layouts listed above",',
    '      "tiles": [{',
    '        "type": "image/shoppable_image/product_grid/video/text",',
    '        "imageCategory": "lifestyle/creative/product/text_image/benefit",',
    '        "brief": "10-20 words English: what the image shows (just the idea, no style/mood)",',
    '        "textOverlay": "text ON the image in ' + lang + '",',
    '        "ctaText": "CTA button text in ' + lang + '",',
    '        "linkAsin": "B0... (MUST match the product described in the brief)",',
    '        "linkUrl": "/page-id (for cross-page links)",',
    '        "dimensions": {"w": 3000, "h": 1200},',
    '        "mobileDimensions": {"w": 1680, "h": 1200}',
    '      }]',
    '    }',
    '  ]',
    '}',
    '',
    'RULES:',
    '- Every product mentioned in a brief MUST have its ASIN in linkAsin or asins.',
    '- textOverlay in ' + lang + '. Briefs in English.',
    '- Briefs: 10-20 words. Just the idea. No lighting, mood, camera angles.',
    '- No generic text. Every text must be specific to this brand and these products.',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 6000);
}

// ═══════════════════════════════════════════════════════════════
// BRAND VOICE ANALYSIS
// Deep tone/language pattern analysis. Steers ALL downstream copy & briefs.
// Migrated from legacy generationPipeline.js and expanded.
// ═══════════════════════════════════════════════════════════════
export async function analyzeBrandVoice(products, brand, websiteTexts, brandToneExamples) {
  var sampleTexts = [];
  products.forEach(function(p) {
    if (p.bulletPoints) {
      sampleTexts.push('Product "' + (p.name || '').slice(0, 50) + '" bullets: ' + p.bulletPoints.join(' | '));
    }
    if (p.description) {
      sampleTexts.push('Description: ' + p.description);
    }
  });
  if (websiteTexts) {
    sampleTexts.push('Website text: ' + websiteTexts);
  }

  var system = [
    'You analyze how a brand speaks. Your output is a voice playbook that every',
    'downstream copy task (headlines, USPs, CTAs, image briefs) will follow.',
    'Go deep. Do not stop at formal/informal. Capture the fingerprint.',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '"',
    '',
    'Text samples from this brand:',
    sampleTexts.join('\n'),
    '',
    brandToneExamples ? 'User-provided tone examples: ' + brandToneExamples : '',
    '',
    'Produce a voice playbook. Return JSON:',
    '{',
    '  "communicationStyle": "formal | informal | mixed",',
    '  "addressing": "du | Sie | neutral",',
    '  "toneDescriptors": ["3-6 adjectives that capture the brand voice"],',
    '  "voiceFingerprint": "2-3 sentences describing the unique texture of this brand voice — what would make a reader recognise it blind",',
    '  "sentencePatterns": {',
    '    "typicalLength": "short (3-6 words) | medium (7-14) | long (15+) | mixed",',
    '    "structure": "e.g. claim + beleg, frage + antwort, aufzählung, staccato-sätze",',
    '    "rhythm": "description of cadence (punchy, flowing, declarative, conversational)"',
    '  },',
    '  "vocabulary": {',
    '    "signatureWords": ["6-12 words/phrases the brand really uses"],',
    '    "avoidedWords": ["4-8 words/phrases the brand would never use"],',
    '    "languageLevel": "simple | moderate | expert",',
    '    "anglicisms": "none | moderate | heavy",',
    '    "emotionalRegister": "sachlich | warm | emotional | inspirierend | hyperbolisch"',
    '  },',
    '  "typicalPhrases": ["verbatim phrases the brand uses (max 8)"],',
    '  "ctaStyle": {',
    '    "register": "direkt | sanft | fragend | imperativ | poetisch",',
    '    "examples": ["3-5 CTA phrasings the brand would actually use"]',
    '  },',
    '  "textLength": "short | medium | long",',
    '  "do": ["5-8 concrete guidelines a copywriter must follow"],',
    '  "dont": ["5-8 traps a copywriter must avoid"],',
    '  "visualToneCues": ["3-5 cues that tell an image briefer what mood fits this voice, e.g. ruhig & klar, laut & bunt, technisch & kühl"]',
    '}',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 3072);
}

// ═══════════════════════════════════════════════════════════════
// ASIN COMPLETENESS CHECK
// Synchronous utility — no API call. Verifies every input ASIN is placed somewhere.
// Migrated from legacy generationPipeline.js.
// ═══════════════════════════════════════════════════════════════
export function checkAsinCompleteness(inputAsins, pages) {
  var asinLocations = {};
  inputAsins.forEach(function(a) { asinLocations[a] = []; });

  (pages || []).forEach(function(page) {
    (page.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (tile.linkAsin && asinLocations[tile.linkAsin] !== undefined) {
          asinLocations[tile.linkAsin].push({ page: page.name, section: si + 1, tile: ti + 1, type: 'linkAsin' });
        }
        (tile.asins || []).forEach(function(a) {
          if (asinLocations[a] !== undefined) {
            asinLocations[a].push({ page: page.name, section: si + 1, tile: ti + 1, type: 'tile' });
          }
        });
        (tile.hotspots || []).forEach(function(hs) {
          if (hs.asin && asinLocations[hs.asin] !== undefined) {
            asinLocations[hs.asin].push({ page: page.name, section: si + 1, tile: ti + 1, type: 'hotspot' });
          }
        });
      });
    });
  });

  var missing = [];
  var found = [];
  Object.keys(asinLocations).forEach(function(asin) {
    if (asinLocations[asin].length === 0) {
      missing.push(asin);
    } else {
      found.push({ asin: asin, locations: asinLocations[asin] });
    }
  });

  return { asinLocations: asinLocations, missing: missing, found: found, complete: missing.length === 0 };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════
export function validateStore(store, inputAsins, lang) {
  var issues = [];

  var foundAsins = {};
  (store.pages || []).forEach(function(page) {
    (page.sections || []).forEach(function(sec) {
      (sec.tiles || []).forEach(function(tile) {
        if (tile.linkAsin) foundAsins[tile.linkAsin] = true;
        (tile.asins || []).forEach(function(a) { foundAsins[a] = true; });
        (tile.hotspots || []).forEach(function(hs) { if (hs.asin) foundAsins[hs.asin] = true; });
      });
    });
  });

  var missingAsins = inputAsins.filter(function(a) { return !foundAsins[a]; });
  if (missingAsins.length > 0) issues.push({ type: 'ASIN_MISSING', severity: 'critical', count: missingAsins.length, asins: missingAsins });

  (store.pages || []).forEach(function(page) {
    var contentSections = (page.sections || []).filter(function(sec) {
      return sec.tiles && sec.tiles.length > 0;
    });
    if (contentSections.length < 2) issues.push({ type: 'EMPTY_PAGE', severity: 'critical', page: page.name });
  });

  if (lang === 'German' || lang === 'de') {
    var enPattern = /\b(discover|explore|shop now|our collection|premium quality|learn more)\b/i;
    (store.pages || []).forEach(function(page) {
      (page.sections || []).forEach(function(sec, si) {
        (sec.tiles || []).forEach(function(tile, ti) {
          if (tile.textOverlay && enPattern.test(tile.textOverlay)) {
            issues.push({ type: 'WRONG_LANGUAGE', severity: 'warning', page: page.name, text: tile.textOverlay.slice(0, 50) });
          }
        });
      });
    });
  }

  return { valid: issues.filter(function(i) { return i.severity === 'critical'; }).length === 0, issues: issues };
}
