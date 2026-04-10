// ─── GENERATION PIPELINE: Separate steps for the new process ───
// Phase 2: Analysis (product, CI, brand voice, content strategy)
// Phase 3: Text creation
// Phase 4: Store assembly
//
// Each function is a separate step that builds on previous results.
// All steps are called sequentially from generateStore() in storeBuilder.js.

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
    throw new Error('Claude API error ' + resp.status + ': ' + errText.slice(0, 200));
  }
  var data = await resp.json();
  var text = data.content && data.content[0] ? data.content[0].text : '';
  // Extract JSON from response
  var jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) {}
  }
  // Try array
  var arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch (e) {}
  }
  return { _raw: text };
}

// ─── PHASE 2.1: PRODUCT ANALYSIS ───
// Clusters products, identifies USPs at 3 levels, finds bestsellers/novelties
export async function analyzeProducts(products, brand, lang) {
  var productList = products.map(function(p) {
    return {
      asin: p.asin,
      name: p.name,
      rating: p.rating,
      reviews: p.reviews,
      bulletPoints: (p.bulletPoints || []).slice(0, 5),
      description: p.description || '',
      categories: p.categories,
      bestsellerRank: p.bestsellerRank || null,
      boughtPastMonth: p.boughtPastMonth || null,
      // Customer review summary — very useful for understanding what the product ACTUALLY does
      customerSays: p.customerSays || null,
    };
  });

  var system = [
    'You analyze Amazon product catalogs for Brand Store creation.',
    'Your categorization must be ACCURATE. Read the product title, bullet points, description,',
    'and Amazon categories carefully. A product about "Flohsamenschalen" (psyllium husks) belongs',
    'to Digestion, NOT to Sleep. A "Schlafbeere" (Ashwagandha) can belong to Sleep.',
    'When in doubt, the Amazon category breadcrumb is the most reliable signal.',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '" | Language: ' + lang,
    'Products (' + products.length + '):',
    JSON.stringify(productList, null, 1),
    '',
    'Analyze and return JSON:',
    '{',
    '  "categories": [',
    '    { "name": "Category Name", "asins": ["B0..."], "bestseller": "B0...", "novelty": "B0..." or null,',
    '      "commonFeatures": ["shared feature 1", "shared feature 2"],',
    '      "categoryUSPs": ["USP specific to this category"] }',
    '  ],',
    '  "brandUSPs": ["USPs that apply to ALL products across the brand"],',
    '  "brandThemes": ["themes/pain points the brand addresses"],',
    '  "whatMakesBrandSpecial": "1-2 sentences: what sets this brand apart",',
    '  "productComplexity": "simple|medium|complex",',
    '  "brandTone": "derived from product texts (e.g. scientific, playful, premium)"',
    '}',
    '',
    'USP RULES:',
    '- brandUSPs: Things true for the ENTIRE brand (e.g. "Made in Germany", "Family-owned since 1985")',
    '- categoryUSPs: Things true for a product GROUP but not all products (e.g. "Bio-certified" only for supplements)',
    '- Product-level USPs stay in the product data, not extracted here',
    '- Do NOT just count repeated words. Understand the MEANING across all products.',
    '  A brand may use different words for the same concept across products.',
    '- Identify patterns: if 80% of products mention quality/testing/certification in different words,',
    '  that is a brand USP even though no single phrase repeats.',
  ].join('\n');

  return await callClaude(system, user, 4096);
}

// ─── PHASE 2.3: BRAND VOICE ANALYSIS ───
// Analyzes how the brand communicates
export async function analyzeBrandVoice(products, brand, websiteTexts, brandToneExamples) {
  var sampleTexts = [];
  // Collect bullet points and descriptions
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

  var system = 'You analyze brand communication style. Return ONLY valid JSON.';

  var user = [
    'Brand: "' + brand + '"',
    '',
    'Text samples from this brand:',
    sampleTexts.join('\n'),
    '',
    brandToneExamples ? 'User-provided tone examples: ' + brandToneExamples : '',
    '',
    'Analyze and return JSON:',
    '{',
    '  "communicationStyle": "formal|informal|mixed",',
    '  "addressing": "du|Sie|neutral",',
    '  "tone": "description in 3-5 words (e.g. scientific yet approachable)",',
    '  "typicalPhrases": ["phrases the brand actually uses (max 8)"],',
    '  "ctaStyle": "how they formulate calls to action (e.g. direct/soft/question)",',
    '  "textLength": "short|medium|long — how verbose is the brand",',
    '  "languageLevel": "simple|moderate|expert — vocabulary complexity"',
    '}',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 2048);
}

// ─── PHASE 2.4: CONTENT STRATEGY ───
// Defines page structure and themes per page
export async function createContentStrategy(productAnalysis, ciProfile, brandVoice, websiteData, storeKnowledge, brand, lang, userInstructions) {
  var system = [
    'You create content strategies for Amazon Brand Stores.',
    'You have access to insights from 21 analyzed top Brand Stores.',
    'Use these insights as ORIENTATION for your decisions, not as rigid rules.',
    'Every store is unique — the content strategy must fit THIS specific brand.',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '" | Language: ' + lang,
    '',
    'PRODUCT ANALYSIS:',
    JSON.stringify(productAnalysis, null, 1),
    '',
    ciProfile ? 'CI PROFILE:\n' + (typeof ciProfile === 'string' ? ciProfile : JSON.stringify(ciProfile, null, 1)) : '',
    '',
    brandVoice ? 'BRAND VOICE:\n' + JSON.stringify(brandVoice, null, 1) : '',
    '',
    websiteData ? [
      'WEBSITE DATA:',
      'Title: ' + (websiteData.title || ''),
      'Categories: ' + ((websiteData.categories || []).join(', ') || 'unknown'),
      websiteData.tagline ? 'Tagline: ' + websiteData.tagline : '',
      websiteData.aboutText ? 'About: ' + websiteData.aboutText : '',
      websiteData.aiAnalysis ? 'USPs from website: ' + JSON.stringify(websiteData.aiAnalysis.keyUSPs || websiteData.aiAnalysis.brandValues || [], null, 1) : '',
      websiteData.certifications ? 'Certifications: ' + websiteData.certifications.join(', ') : '',
      'IMPORTANT: The USPs on the brand website are the PRIMARY source of truth.',
      'Use THESE USPs in the store, not invented ones.',
    ].filter(Boolean).join('\n') : '',
    '',
    storeKnowledge || '',
    '',
    userInstructions ? 'USER INSTRUCTIONS: ' + userInstructions : '',
    '',
    'Create a content strategy. Return JSON:',
    '{',
    '  "pages": [',
    '    {',
    '      "id": "homepage",',
    '      "name": "Homepage",',
    '      "purpose": "why this page exists",',
    '      "themes": ["theme 1", "theme 2", ...],',
    '      "asins": ["B0...", ...] (products shown on this page),',
    '      "heroBannerConcept": "brief concept for the hero banner above the menu"',
    '    },',
    '    {',
    '      "id": "cat-0",',
    '      "name": "Category Name",',
    '      "purpose": "why this page exists",',
    '      "themes": ["theme 1", "theme 2", ...],',
    '      "asins": ["B0...", ...],',
    '      "heroBannerConcept": "..."',
    '    }',
    '  ],',
    '  "crossPageLinks": ["description of how pages link to each other"],',
    '  "designDirection": "1-2 sentences: overall visual direction for the store",',
    '  "suggestedExtraPages": ["about_us", "bestsellers", ...] (ONLY suggest pages that make sense for THIS brand)',
    '}',
    '',
    'EXTRA PAGE OPTIONS (only suggest if they genuinely add value):',
    '- "about_us": brand story, founder, values — useful if brand has a strong story',
    '- "bestsellers": dedicated bestseller page — useful for brands with clear top products',
    '- "new_arrivals": new products page — useful if brand regularly launches new items',
    '- "how_it_works": product finder/quiz — useful for complex product ranges',
    '- "sustainability": eco/sustainability page — useful if brand emphasizes this',
    '- "deals": deals/offers page — useful for brands with frequent promotions',
    '',
    'RULES:',
    '- Every ASIN from the product list MUST appear on at least one page.',
    '- ASINs can appear on multiple pages.',
    '- Themes per page emerge from the actual products and brand, not from templates.',
    '- Pages are individually structured. The homepage is NOT a template for category pages.',
    '- Do NOT force a narrative or storyline. Thematic grouping is enough.',
    '- Extra pages (about_us, bestsellers, etc.) need REAL content too, not empty shells.',
    '  If you suggest an about_us page, define themes like "founder story, brand values, quality promise".',
    '  If you suggest a bestsellers page, assign the actual bestseller ASINs to it.',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 4096);
}

// ─── PHASE 3.1: TEXT BUILDING BLOCKS ───
// Creates all text elements per page
export async function createTextBlocks(contentStrategy, brandVoice, productAnalysis, brand, lang, originalTexts) {
  var system = [
    'You create text content for Amazon Brand Stores.',
    'All texts must be in ' + lang + ' (store language).',
    'Use the brand voice analysis to match the brand\'s communication style.',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '" | Language: ' + lang,
    '',
    'CONTENT STRATEGY:',
    JSON.stringify(contentStrategy, null, 1),
    '',
    'BRAND VOICE:',
    JSON.stringify(brandVoice, null, 1),
    '',
    'PRODUCT ANALYSIS (USPs):',
    JSON.stringify({
      brandUSPs: productAnalysis.brandUSPs,
      categories: (productAnalysis.categories || []).map(function(c) {
        return { name: c.name, categoryUSPs: c.categoryUSPs, commonFeatures: c.commonFeatures };
      }),
    }, null, 1),
    '',
    originalTexts ? 'ORIGINAL BRAND TEXTS (use as wording reference, do not copy 1:1):\n' + originalTexts : '',
    '',
    'Create text blocks per page. Return JSON:',
    '{',
    '  "pages": [',
    '    {',
    '      "pageId": "homepage",',
    '      "heroBannerText": "slogan or claim for hero banner",',
    '      "headlines": ["section headline 1", "section headline 2"],',
    '      "usps": ["USP 1", "USP 2", "USP 3"],',
    '      "ctaTexts": ["CTA 1", "CTA 2"],',
    '      "benefitTexts": ["benefit description 1"],',
    '      "productHighlights": [{ "asin": "B0...", "highlight": "short feature text" }]',
    '    }',
    '  ]',
    '}',
    '',
    'USP CONSISTENCY RULES:',
    '- If the SAME USP appears on multiple pages, it must be IDENTICALLY worded.',
    '  (e.g. "Made in Germany" is always "Made in Germany", never "Hergestellt in Deutschland")',
    '- BUT: Different pages show DIFFERENT USPs. A category page shows category-specific USPs,',
    '  the homepage shows brand-level USPs. Not every page has the same USPs.',
    '- Wording must match the brand voice (formal/informal, Du/Sie, vocabulary level).',
    '- Draw from original brand texts where possible.',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 6000);
}

// ─── PHASE 3.2: COPYWRITING REVIEW ───
// Reviews all text blocks for quality, consistency, and brand voice match
export async function reviewCopywriting(textBlocks, brandVoice, brand, lang, originalTexts) {
  var system = [
    'You review and refine text content for Amazon Brand Stores.',
    'Your job: check quality, consistency, and brand voice compliance.',
    'Return the IMPROVED version of the text blocks. Return ONLY valid JSON.',
  ].join('\n');

  var user = [
    'Brand: "' + brand + '" | Language: ' + lang,
    '',
    'BRAND VOICE:',
    JSON.stringify(brandVoice, null, 1),
    '',
    'TEXT BLOCKS TO REVIEW:',
    JSON.stringify(textBlocks, null, 1),
    '',
    originalTexts ? 'ORIGINAL BRAND TEXTS (for wording reference):\n' + originalTexts : '',
    '',
    'REVIEW AND FIX:',
    '1. If the SAME USP appears with different wording on different pages, standardize to ONE version.',
    '2. Check that the tone matches the brand voice throughout.',
    '3. Remove generic/template-sounding text. Everything must sound like the brand wrote it.',
    '4. Ensure CTAs are varied (not every page says "Jetzt entdecken").',
    '5. Check headline quality — they should be specific and benefit-driven.',
    '6. Compare with original brand texts — wording should align, not diverge.',
    '',
    'Return the corrected text blocks in the SAME JSON structure.',
  ].filter(Boolean).join('\n');

  return await callClaude(system, user, 6000);
}

// ─── PHASE 4.2: ASIN COMPLETENESS CHECK ───
// Verifies every input ASIN appears somewhere in the store
export function checkAsinCompleteness(inputAsins, pages) {
  var asinLocations = {}; // asin -> [{ page, module, type }]
  inputAsins.forEach(function(a) { asinLocations[a] = []; });

  (pages || []).forEach(function(page) {
    (page.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        // Check linkAsin
        if (tile.linkAsin && asinLocations[tile.linkAsin] !== undefined) {
          asinLocations[tile.linkAsin].push({ page: page.name, section: si + 1, tile: ti + 1, type: 'linkAsin' });
        }
        // Check asins array
        (tile.asins || []).forEach(function(a) {
          if (asinLocations[a] !== undefined) {
            asinLocations[a].push({ page: page.name, section: si + 1, tile: ti + 1, type: 'tile' });
          }
        });
        // Check hotspots
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
