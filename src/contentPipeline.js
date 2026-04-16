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
export async function synthesizeBrandProfile(allProductAnalyses, allWebsiteAnalyses, categories, brandVoice, brand, lang, brandIntelligence) {
  var system = [
    'You create the definitive brand profile for a Brand Store.',
    'All data has been pre-analyzed. Your job is to SYNTHESIZE, not re-analyze.',
    'You receive a BRAND INTELLIGENCE block — the single source of truth.',
    'Every USP, story element, trust claim, and image concept you produce MUST align with it.',
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
    brandIntelligence ? formatBrandIntelligenceForPrompt(brandIntelligence) : 'BRAND VOICE: ' + JSON.stringify(brandVoice, null, 1),
    '',
    'PRE-AGGREGATED DATA:',
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
    '- USPs must come from ACTUAL website/product/existing-store data. Not invented.',
    '- If no brand story info found, set available=false. Do NOT invent one.',
    '- Headlines, sublines, and image descriptions MUST follow the voice fingerprint, sentence patterns, and CTA style from BRAND INTELLIGENCE.',
    '- Image concepts MUST match visualMood, photographyStyle, and visualToneCues.',
    '- If BRAND INTELLIGENCE shows adoptExistingContent=true, reuse verbatim headlines/USPs from existing store context where they fit.',
    '- All texts in ' + lang + '.',
  ].join('\n');

  return await callClaude(system, user, 4096);
}

// ═══════════════════════════════════════════════════════════════
// STEP 5: Plan page structure from content
// ═══════════════════════════════════════════════════════════════
export async function planPages(brandProfile, categories, productAnalyses, storeKnowledge, brand, lang, extraPages, brandIntelligence) {
  var system = [
    'You plan Amazon Brand Store pages. Content determines structure.',
    'Only create pages for content that EXISTS. No empty pages.',
    'The BRAND INTELLIGENCE block is the single source of truth — respect voice, visual mood, and reuse flags.',
    'Return ONLY valid JSON. All texts in ' + lang + '.',
  ].join('\n');

  var user = [
    'Brand: ' + brand,
    '',
    brandIntelligence ? formatBrandIntelligenceForPrompt(brandIntelligence) : '',
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
export async function generateOnePage(pagePlan, brandProfile, categories, productAnalyses, brand, lang, previousPages, storeKnowledge, brandIntelligence) {
  var system = [
    'You generate ONE Amazon Brand Store page.',
    'You receive the page plan + all relevant content + BRAND INTELLIGENCE.',
    'BRAND INTELLIGENCE is the single source of truth for voice, visuals, and reusable content.',
    'Every textOverlay and every image brief MUST follow: voice.voiceFingerprint, voice.sentencePatterns, voice.ctaStyle, visual.visualMood, visual.visualToneCues.',
    'Lean on contentInventory.reusablePhrases where they fit — do not invent new brand phrases.',
    'If reuseFlags.adoptExistingContent=true, prefer verbatim headlines/USPs from existingStoreRawContext over new ones.',
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
    brandIntelligence ? formatBrandIntelligenceForPrompt(brandIntelligence) : '',
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
// BRAND INTELLIGENCE MODULE
// Pure function (no API call). Packages ALL collected brand signals
// (voice, visual, content inventory, reuse flags) into ONE structured
// object that every downstream call can inject.
// This is the single source of truth that the Content-First pipeline
// now carries through synthesizeBrandProfile → planPages → generateOnePage.
// ═══════════════════════════════════════════════════════════════
export function buildBrandIntelligence(args) {
  var voice = args.voicePlaybook || {};
  var productCI = args.productCI || null;
  var websiteData = args.websiteData || null;
  var websiteAnalyses = args.allWebsiteAnalyses || [];
  var existingStoreAnalysis = args.existingStoreAnalysis || null;
  var existingStoreMode = args.existingStoreMode || null;
  var adoptExistingContent = !!args.adoptExistingContent;
  var brand = args.brand || '';
  var lang = args.lang || '';

  // ─── VISUAL PLAYBOOK ───
  // Consolidates productCI (Amazon listing images), website colors,
  // user-provided brand assets, and voice-derived visual cues.
  var websiteColors = (websiteData && websiteData.colors) ? websiteData.colors : [];
  var primaryColors = productCI && productCI.primaryColors ? productCI.primaryColors.slice() : [];
  websiteColors.forEach(function(c) { if (c && primaryColors.indexOf(c) < 0) primaryColors.push(c); });

  var visual = {
    primaryColors: primaryColors.slice(0, 6),
    secondaryColors: productCI && productCI.secondaryColors ? productCI.secondaryColors : [],
    backgroundColor: productCI ? (productCI.backgroundColor || '') : '',
    colorVariation: productCI ? (productCI.colorVariation || '') : '',
    typographyStyle: productCI ? (productCI.typographyStyle || '') : (websiteData && websiteData.userFonts ? websiteData.userFonts : ''),
    photographyStyle: productCI ? (productCI.photographyStyle || '') : '',
    visualMood: productCI ? (productCI.visualMood || '') : '',
    backgroundPattern: productCI ? (productCI.backgroundPattern || '') : '',
    recurringElements: productCI ? (productCI.recurringElements || []) : [],
    textDensity: productCI ? (productCI.textDensity || '') : '',
    designerNotes: productCI ? (productCI.designerNotes || '') : '',
    visualToneCues: voice.visualToneCues || [],
    productsAnalyzed: productCI ? (productCI.productsAnalyzed || 0) : 0,
  };

  // ─── CONTENT INVENTORY ───
  // Every reusable signal from website + existing store + product bullets.
  var websiteUsps = [];
  var websiteStoryElements = [];
  var certifications = [];
  var trustElements = [];
  var keyPhrases = [];
  var productMentions = [];
  websiteAnalyses.forEach(function(wa) {
    (wa.usps || []).forEach(function(u) { if (u && websiteUsps.indexOf(u) < 0) websiteUsps.push(u); });
    (wa.brandStoryElements || []).forEach(function(s) { if (s && websiteStoryElements.indexOf(s) < 0) websiteStoryElements.push(s); });
    (wa.certifications || []).forEach(function(c) { if (c && certifications.indexOf(c) < 0) certifications.push(c); });
    (wa.trustElements || []).forEach(function(t) { if (t && trustElements.indexOf(t) < 0) trustElements.push(t); });
    (wa.keyPhrases || []).forEach(function(p) { if (p && keyPhrases.indexOf(p) < 0) keyPhrases.push(p); });
    (wa.productMentions || []).forEach(function(m) { if (m && productMentions.indexOf(m) < 0) productMentions.push(m); });
  });

  // Voice playbook already contains typicalPhrases + signatureWords — these are
  // the verbatim phrases the copywriter/briefer must lean on.
  var reusablePhrases = [];
  (voice.typicalPhrases || []).forEach(function(p) { if (p && reusablePhrases.indexOf(p) < 0) reusablePhrases.push(p); });
  (voice.vocabulary && voice.vocabulary.signatureWords ? voice.vocabulary.signatureWords : []).forEach(function(p) {
    if (p && reusablePhrases.indexOf(p) < 0) reusablePhrases.push(p);
  });

  var contentInventory = {
    websiteUsps: websiteUsps,
    websiteStoryElements: websiteStoryElements,
    certifications: certifications,
    trustElements: trustElements,
    keyPhrases: keyPhrases,
    productMentions: productMentions,
    reusablePhrases: reusablePhrases,
    // Raw existing-store analysis (free-form text from crawl+vision).
    // Kept as text for downstream prompts; copywriter can mine it.
    existingStoreRawContext: existingStoreAnalysis || '',
  };

  // ─── REUSE FLAGS ───
  // Tells downstream calls HOW to treat the raw material.
  var reuseFlags = {
    hasExistingStore: !!existingStoreAnalysis,
    existingStoreMode: existingStoreMode,
    // Adopt existing content verbatim only when user explicitly opts in
    // AND mode is optimize (reconceptualize always rewrites from scratch).
    adoptExistingContent: !!(adoptExistingContent && existingStoreMode === 'optimize'),
    adoptExistingStructure: !!(existingStoreMode === 'optimize'),
    hasWebsite: websiteAnalyses.length > 0,
    hasVisualCI: !!(productCI && (productCI.primaryColors || []).length > 0),
  };

  return {
    brand: brand,
    lang: lang,
    voice: voice,
    visual: visual,
    contentInventory: contentInventory,
    reuseFlags: reuseFlags,
  };
}

// Compact rendering of brand intelligence for prompt injection.
// Keeps the payload small but every downstream prompt gets the same view.
export function formatBrandIntelligenceForPrompt(bi) {
  if (!bi) return '';
  var v = bi.voice || {};
  var vis = bi.visual || {};
  var inv = bi.contentInventory || {};
  var rf = bi.reuseFlags || {};
  var parts = [];
  parts.push('=== BRAND INTELLIGENCE (single source of truth) ===');
  // Voice
  parts.push('VOICE:');
  if (v.voiceFingerprint) parts.push('  Fingerprint: ' + v.voiceFingerprint);
  if (v.communicationStyle) parts.push('  Style: ' + v.communicationStyle + ' / addressing: ' + (v.addressing || 'neutral'));
  if (v.toneDescriptors) parts.push('  Tone: ' + v.toneDescriptors.join(', '));
  if (v.sentencePatterns) parts.push('  Sentences: ' + (v.sentencePatterns.typicalLength || '') + ', ' + (v.sentencePatterns.rhythm || ''));
  if (v.vocabulary) {
    if (v.vocabulary.signatureWords) parts.push('  Signature words: ' + v.vocabulary.signatureWords.join(', '));
    if (v.vocabulary.avoidedWords) parts.push('  Avoid: ' + v.vocabulary.avoidedWords.join(', '));
  }
  if (v.typicalPhrases) parts.push('  Typical phrases: ' + v.typicalPhrases.join(' | '));
  if (v.ctaStyle) parts.push('  CTA style: ' + (v.ctaStyle.register || '') + ' — examples: ' + (v.ctaStyle.examples || []).join(' | '));
  if (v.do) parts.push('  DO: ' + v.do.join(' | '));
  if (v.dont) parts.push('  DONT: ' + v.dont.join(' | '));

  // Visual
  parts.push('VISUAL:');
  if (vis.primaryColors && vis.primaryColors.length) parts.push('  Primary colors: ' + vis.primaryColors.join(', '));
  if (vis.secondaryColors && vis.secondaryColors.length) parts.push('  Secondary colors: ' + vis.secondaryColors.join(', '));
  if (vis.visualMood) parts.push('  Mood: ' + vis.visualMood);
  if (vis.typographyStyle) parts.push('  Typography: ' + vis.typographyStyle);
  if (vis.photographyStyle) parts.push('  Photography: ' + vis.photographyStyle);
  if (vis.backgroundColor) parts.push('  Background: ' + vis.backgroundColor + (vis.backgroundPattern ? ' (' + vis.backgroundPattern + ')' : ''));
  if (vis.recurringElements && vis.recurringElements.length) parts.push('  Recurring visual elements: ' + vis.recurringElements.join(', '));
  if (vis.visualToneCues && vis.visualToneCues.length) parts.push('  Visual tone cues: ' + vis.visualToneCues.join(' | '));
  if (vis.designerNotes) parts.push('  Designer notes: ' + vis.designerNotes);

  // Content inventory
  parts.push('CONTENT INVENTORY (use these as raw material — NOT invented):');
  if (inv.websiteUsps && inv.websiteUsps.length) parts.push('  Website USPs: ' + inv.websiteUsps.join(' | '));
  if (inv.certifications && inv.certifications.length) parts.push('  Certifications: ' + inv.certifications.join(' | '));
  if (inv.trustElements && inv.trustElements.length) parts.push('  Trust elements: ' + inv.trustElements.join(' | '));
  if (inv.keyPhrases && inv.keyPhrases.length) parts.push('  Key phrases: ' + inv.keyPhrases.join(' | '));
  if (inv.reusablePhrases && inv.reusablePhrases.length) parts.push('  Reusable phrases (lean on these): ' + inv.reusablePhrases.join(' | '));

  // Reuse flags
  parts.push('REUSE FLAGS:');
  parts.push('  Has existing store: ' + rf.hasExistingStore + ' (mode: ' + (rf.existingStoreMode || 'none') + ')');
  parts.push('  Adopt existing content: ' + rf.adoptExistingContent);
  parts.push('  Adopt existing structure: ' + rf.adoptExistingStructure);
  if (rf.hasExistingStore && inv.existingStoreRawContext) {
    parts.push('EXISTING STORE RAW CONTEXT (mine for content/structure per reuse flags):');
    // Truncate to keep prompt size reasonable
    var raw = inv.existingStoreRawContext;
    parts.push(raw.length > 4000 ? raw.slice(0, 4000) + '\n...[truncated]' : raw);
  }
  return parts.join('\n');
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
