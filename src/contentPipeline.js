// ─── CONTENT-FIRST PIPELINE ───
// Implements the 5-phase Content-First paradigm:
//   Phase 1: Brand Deep Dive (data collection — handled by App.jsx)
//   Phase 2: Content Creation (THIS FILE — creates the Content Pool)
//   Phase 3: Structure Planning (THIS FILE — derives layout from content)
//   Phase 4: Store Assembly (handled by storeBuilder.js with Content Pool input)
//   Phase 5: Validation (THIS FILE — quality checks)

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
      max_tokens: maxTokens || 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('Claude API error ' + resp.status + ': ' + errText.slice(0, 200));
  }
  var data = await resp.json();
  var text = data.content && data.content[0] ? data.content[0].text : '';
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch (e) {} }
  var arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch (e) {} }
  return { _raw: text };
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: CONTENT CREATION
// Creates the Content Pool — all texts, USPs, stories, categories
// INDEPENDENT of any layout decisions.
// ═══════════════════════════════════════════════════════════════

export async function createContentPool(brandProfile, products, brand, lang) {
  // brandProfile contains: websiteData, productCI, brandVoice, productAnalysis

  var websiteData = brandProfile.websiteData || {};
  var productAnalysis = brandProfile.productAnalysis || {};
  var brandVoice = brandProfile.brandVoice || {};

  // Collect ALL available text content
  var allBrandTexts = [];
  if (websiteData.aboutText) allBrandTexts.push('ABOUT: ' + websiteData.aboutText);
  if (websiteData.sustainabilityText) allBrandTexts.push('SUSTAINABILITY: ' + websiteData.sustainabilityText);
  if (websiteData.qualityText) allBrandTexts.push('QUALITY: ' + websiteData.qualityText);
  if (websiteData.valuesText) allBrandTexts.push('VALUES: ' + websiteData.valuesText);
  if (websiteData.ingredientsText) allBrandTexts.push('INGREDIENTS: ' + websiteData.ingredientsText);
  (websiteData.rawTextSections || []).forEach(function(s) { allBrandTexts.push('PAGE: ' + s.text); });

  // Collect product data
  var productData = products.map(function(p) {
    return {
      asin: p.asin,
      name: p.name,
      bulletPoints: p.bulletPoints || [],
      description: p.description || '',
      rating: p.rating,
      reviews: p.reviews,
      bestsellerRank: p.bestsellerRank || null,
      boughtPastMonth: p.boughtPastMonth || null,
      customerSays: p.customerSays || null,
      categories: p.categories || [],
    };
  });

  var system = [
    'You create content for Amazon Brand Stores.',
    'You work in the Content-First paradigm: you create ALL content FIRST,',
    'completely independent of layout or module decisions.',
    'Your output is a Content Pool — pure content, no layout.',
    'All texts must be in ' + lang + '.',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '"',
    'Language: ' + lang,
    '',
    'BRAND VOICE:',
    JSON.stringify(brandVoice, null, 1),
    '',
    'PRODUCT ANALYSIS:',
    JSON.stringify(productAnalysis, null, 1),
    '',
    'ALL BRAND TEXTS FROM WEBSITE:',
    allBrandTexts.join('\n\n'),
    '',
    'WEBSITE FEATURES/USPS:',
    JSON.stringify(websiteData.features || [], null, 1),
    '',
    'WEBSITE CERTIFICATIONS:',
    JSON.stringify(websiteData.certifications || [], null, 1),
    '',
    'PRODUCTS (' + products.length + '):',
    JSON.stringify(productData, null, 1),
    '',
    'Create a COMPLETE Content Pool. Return JSON:',
    '{',
    '  "usps": [',
    '    { "text": "USP as customer benefit", "source": "where this came from (website/product/derived)" }',
    '  ],',
    '  "brandStory": {',
    '    "available": true/false,',
    '    "headline": "Brand story headline",',
    '    "text": "2-4 sentences brand story",',
    '    "source": "website about page / derived from products"',
    '  },',
    '  "categories": [',
    '    {',
    '      "name": "Category Name",',
    '      "description": "2-3 sentences what this category offers",',
    '      "asins": ["B0..."],',
    '      "categoryUSPs": ["USP specific to this category"],',
    '      "highlightProducts": [{ "asin": "B0...", "headline": "short product headline" }]',
    '    }',
    '  ],',
    '  "productTexts": [',
    '    { "asin": "B0...", "headline": "short headline", "description": "1-2 sentences" }',
    '  ],',
    '  "trustElements": [',
    '    { "text": "trust element", "type": "certification/award/guarantee/statistic" }',
    '  ],',
    '  "quiz": {',
    '    "needed": true/false,',
    '    "reason": "why or why not",',
    '    "questions": [',
    '      { "text": "question", "answers": [{ "text": "answer", "asins": ["B0..."] }] }',
    '    ]',
    '  },',
    '  "imageConcepts": [',
    '    { "type": "lifestyle/creative/product/text_image", "description": "what the image shows", "forCategory": "category name or homepage" }',
    '  ],',
    '  "heroBannerConcepts": [',
    '    { "page": "Homepage", "concept": "what the hero banner shows", "textOverlay": "headline text" }',
    '  ]',
    '}',
    '',
    'RULES:',
    '- USPs MUST come from the website data or product data. Do NOT invent USPs.',
    '- If no brand story exists on the website, set brandStory.available = false.',
    '- EVERY ASIN must appear in exactly one category.',
    '- Categories must be LOGICAL — based on product function, not Amazon breadcrumb.',
    '  (e.g. "Flohsamenschalen" belongs to Digestion, not Sleep)',
    '- Product headlines: based on actual product features, not generic.',
    '- Quiz: only if >10 products in overlapping categories. Questions must lead to PRODUCTS.',
    '- Image concepts: describe WHAT the image shows, not how it looks (no colors, lighting, mood).',
    '- All texts in ' + lang + '. No English fragments.',
  ].join('\n');

  return await callClaude(system, user, 8000);
}


// ═══════════════════════════════════════════════════════════════
// PHASE 3: STRUCTURE PLANNING
// Derives page structure FROM the Content Pool.
// Uses Reference Store insights for MODULE selection only.
// ═══════════════════════════════════════════════════════════════

export async function planStructure(contentPool, storeKnowledge, brand, lang) {
  var system = [
    'You plan Amazon Brand Store page structures.',
    'You follow the Content-First paradigm: the CONTENT determines the structure.',
    'You only create pages and sections for content that EXISTS in the Content Pool.',
    'No empty pages. No filler sections. No modules without content.',
    'Return ONLY valid JSON.',
  ].join('\n');

  // Inventory what content exists
  var inventory = {
    usps: (contentPool.usps || []).length,
    brandStory: contentPool.brandStory && contentPool.brandStory.available,
    categories: (contentPool.categories || []).length,
    products: (contentPool.productTexts || []).length,
    trustElements: (contentPool.trustElements || []).length,
    quiz: contentPool.quiz && contentPool.quiz.needed,
    imageConcepts: (contentPool.imageConcepts || []).length,
    heroBanners: (contentPool.heroBannerConcepts || []).length,
  };

  var user = [
    'Brand: "' + brand + '" | Language: ' + lang,
    '',
    'CONTENT INVENTORY (what exists in the Content Pool):',
    JSON.stringify(inventory, null, 1),
    '',
    'CONTENT POOL SUMMARY:',
    '- USPs: ' + (contentPool.usps || []).map(function(u) { return u.text; }).join(' | '),
    '- Categories: ' + (contentPool.categories || []).map(function(c) { return c.name + ' (' + (c.asins || []).length + ' products)'; }).join(', '),
    '- Brand Story: ' + (contentPool.brandStory && contentPool.brandStory.available ? 'Available' : 'Not available'),
    '- Trust Elements: ' + (contentPool.trustElements || []).length,
    '- Quiz: ' + (contentPool.quiz && contentPool.quiz.needed ? 'Yes (' + (contentPool.quiz.questions || []).length + ' questions)' : 'No'),
    '- Image Concepts: ' + (contentPool.imageConcepts || []).length,
    '',
    storeKnowledge ? [
      'REFERENCE STORE INSIGHTS (use as MODULE INSPIRATION only):',
      storeKnowledge,
    ].join('\n') : '',
    '',
    'Plan the page structure. Return JSON:',
    '{',
    '  "pages": [',
    '    {',
    '      "id": "homepage",',
    '      "name": "Homepage",',
    '      "sections": [',
    '        { "purpose": "what this section communicates", "contentRef": "which content pool entry", "suggestedModule": "Full-Width/std-2equal/etc" }',
    '      ]',
    '    }',
    '  ]',
    '}',
    '',
    'RULES:',
    '- ONLY create pages for which content EXISTS.',
    '- If no brand story → no "Über uns" page.',
    '- If only 2 categories → homepage needs only 2 category sections, not 8.',
    '- Every section must have a contentRef pointing to real Content Pool data.',
    '- Use Reference Store insights ONLY for module choice (Full-Width vs Grid etc.),',
    '  NOT for deciding what content to show.',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 6000);
}


// ═══════════════════════════════════════════════════════════════
// PHASE 5: VALIDATION
// Automated quality checks before delivery.
// ═══════════════════════════════════════════════════════════════

export function validateStore(store, inputAsins, contentPool, lang) {
  var issues = [];

  // 1. ASIN completeness
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
  if (missingAsins.length > 0) {
    issues.push({ type: 'ASIN_MISSING', severity: 'critical', count: missingAsins.length, asins: missingAsins });
  }

  // 2. Empty pages
  (store.pages || []).forEach(function(page) {
    var contentSections = (page.sections || []).filter(function(sec) {
      return sec.tiles && sec.tiles.length > 0 && sec.tiles.some(function(t) { return t.brief || t.textOverlay || t.type === 'product_grid'; });
    });
    if (contentSections.length < 2) {
      issues.push({ type: 'EMPTY_PAGE', severity: 'critical', page: page.name, sections: contentSections.length });
    }
  });

  // 3. Language check (detect English in German store)
  if (lang === 'German' || lang === 'de') {
    var englishPatterns = /\b(discover|explore|shop now|our collection|premium quality|learn more|view all|best sellers)\b/i;
    (store.pages || []).forEach(function(page) {
      (page.sections || []).forEach(function(sec, si) {
        (sec.tiles || []).forEach(function(tile, ti) {
          if (tile.textOverlay && englishPatterns.test(tile.textOverlay)) {
            issues.push({ type: 'WRONG_LANGUAGE', severity: 'warning', page: page.name, section: si + 1, tile: ti + 1, text: tile.textOverlay.slice(0, 50) });
          }
          if (tile.ctaText && englishPatterns.test(tile.ctaText)) {
            issues.push({ type: 'WRONG_LANGUAGE', severity: 'warning', page: page.name, section: si + 1, tile: ti + 1, text: tile.ctaText });
          }
        });
      });
    });
  }

  // 4. Duplicate texts across pages
  var seenTexts = {};
  (store.pages || []).forEach(function(page) {
    (page.sections || []).forEach(function(sec) {
      (sec.tiles || []).forEach(function(tile) {
        var key = (tile.textOverlay || '').trim().toLowerCase();
        if (key.length > 15) {
          if (seenTexts[key] && seenTexts[key] !== page.name) {
            issues.push({ type: 'DUPLICATE_TEXT', severity: 'warning', text: key.slice(0, 50), pages: [seenTexts[key], page.name] });
          }
          seenTexts[key] = page.name;
        }
      });
    });
  });

  // 5. Brief quality (too short = placeholder)
  (store.pages || []).forEach(function(page) {
    (page.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if ((tile.type === 'image' || tile.type === 'shoppable_image' || tile.type === 'image_text') && tile.brief && tile.brief.length < 20) {
          issues.push({ type: 'BRIEF_TOO_SHORT', severity: 'warning', page: page.name, section: si + 1, tile: ti + 1, brief: tile.brief });
        }
      });
    });
  });

  return {
    valid: issues.filter(function(i) { return i.severity === 'critical'; }).length === 0,
    issues: issues,
    criticalCount: issues.filter(function(i) { return i.severity === 'critical'; }).length,
    warningCount: issues.filter(function(i) { return i.severity === 'warning'; }).length,
  };
}
