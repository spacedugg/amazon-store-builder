var GEMINI_KEY = process.env.GEMINI_API_KEY;
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20';
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var tiles = body.tiles;           // Array of { imageCategory, brief, textOverlay, dimensions, sectionIndex, tileIndex, totalTilesInSection, layoutId }
  var ciData = body.ciData;         // Product CI from analyze-ci (colors, mood, patterns, etc.)
  var brandName = body.brandName || '';
  var brandTone = body.brandTone || '';
  var pageContext = body.pageContext || {}; // { pageName, isHomepage, totalSections, brandStory, keyFeatures }

  if (!tiles || !Array.isArray(tiles) || tiles.length === 0) {
    return res.status(400).json({ error: 'Missing tiles array' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    // Build CI context for Gemini
    var ciContext = [];
    ciContext.push('Brand: ' + brandName);
    if (brandTone) ciContext.push('Brand tone: ' + brandTone);

    if (ciData) {
      ciContext.push('');
      ciContext.push('=== BRAND VISUAL IDENTITY (from analysis of product listing images) ===');
      if (ciData.primaryColors) ciContext.push('Primary colors: ' + ciData.primaryColors.join(', '));
      if (ciData.secondaryColors) ciContext.push('Secondary colors: ' + ciData.secondaryColors.join(', '));
      if (ciData.backgroundColor) ciContext.push('Common background: ' + ciData.backgroundColor);
      if (ciData.visualMood) ciContext.push('Visual mood: ' + ciData.visualMood);
      if (ciData.typographyStyle) ciContext.push('Typography: ' + ciData.typographyStyle);
      if (ciData.backgroundPattern) ciContext.push('Background patterns: ' + ciData.backgroundPattern);
      if (ciData.photographyStyle) ciContext.push('Photography style: ' + ciData.photographyStyle);
      if (ciData.recurringElements) ciContext.push('Recurring elements: ' + ciData.recurringElements.join(', '));
      if (ciData.textDensity) ciContext.push('Text density: ' + ciData.textDensity);
      if (ciData.colorVariation) ciContext.push('Color behavior: ' + ciData.colorVariation);
      if (ciData.designerNotes) ciContext.push('Design notes: ' + ciData.designerNotes);
      ciContext.push('=== END VISUAL IDENTITY ===');
    } else {
      ciContext.push('No CI data available — describe images in a clean, professional style matching the brand tone.');
    }

    // Build page context + brand voice for CI-consistent wireframes
    var pageContextLines = [];
    if (pageContext.pageName) pageContextLines.push('Page: ' + pageContext.pageName + (pageContext.isHomepage ? ' (HOMEPAGE)' : ' (Category page)'));
    if (pageContext.totalSections) pageContextLines.push('Total sections on page: ' + pageContext.totalSections);
    if (pageContext.brandStory) pageContextLines.push('Brand story: ' + pageContext.brandStory.substring(0, 200));
    if (pageContext.keyFeatures && pageContext.keyFeatures.length > 0) pageContextLines.push('Brand USPs: ' + pageContext.keyFeatures.join(', '));
    if (pageContext.brandVoiceTone) pageContextLines.push('Brand voice tone: ' + pageContext.brandVoiceTone);
    if (pageContext.brandVoiceStyle) pageContextLines.push('Communication style: ' + pageContext.brandVoiceStyle);
    if (pageContext.brandTypicalPhrases && pageContext.brandTypicalPhrases.length > 0) {
      pageContextLines.push('Typical brand phrases: ' + pageContext.brandTypicalPhrases.join(' | '));
    }
    if (pageContext.hasLogo) pageContextLines.push('Brand logo is available — include it in hero/brand sections where appropriate.');
    if (pageContext.brandFonts) pageContextLines.push('BRAND FONTS: Use "' + pageContext.brandFonts + '" for all text in wireframes. This is critical for CI consistency.');
    pageContextLines.push('');
    pageContextLines.push('IMPORTANT: All wireframe images must feel like they belong to ONE brand.');
    pageContextLines.push('The visual style, color usage, typography feel, and composition must be CONSISTENT');
    pageContextLines.push('across all images — derived from the CI data above, not invented per image.');
    if (pageContext.brandFonts) pageContextLines.push('Typography: All text must use or reference the brand fonts (' + pageContext.brandFonts + ').');

    // Build tile list for Gemini
    var tileDescriptions = tiles.map(function(tile, i) {
      var parts = [];
      parts.push('IMAGE ' + (i + 1) + ' (Section ' + ((tile.sectionIndex || 0) + 1) + ', Tile ' + ((tile.tileIndex || 0) + 1) + ' of ' + (tile.totalTilesInSection || 1) + ', layout: ' + (tile.layoutId || '1') + '):');
      parts.push('  Category: ' + (tile.imageCategory || 'creative'));
      if (tile.brief) parts.push('  Content: ' + tile.brief.replace(/^\[[\w_]+\]\s*/, '').substring(0, 300));
      if (tile.textOverlay) parts.push('  Text on image: ' + tile.textOverlay.replace(/\\n/g, ' | '));
      if (tile.dimensions) parts.push('  Format: ' + tile.dimensions.w + 'x' + tile.dimensions.h + 'px');
      return parts.join('\n');
    });

    var prompt = [
      'You are creating image generation prompts for an Amazon Brand Store.',
      'You know this brand\'s CI from analyzing their product images.',
      '',
      ciContext.join('\n'),
      '',
      pageContextLines.length > 0 ? pageContextLines.join('\n') : '',
      '',
      'YOUR TASK: Write ONE unified visual style, then apply it to all ' + tiles.length + ' images.',
      'These images form a COHESIVE PAGE — they must flow together as one visual narrative.',
      'Adjacent tiles in the same section must feel like a pair/group. Tiles in consecutive sections should have visual continuity.',
      '',
      '═══ STEP 1: Define the STORE DESIGN SYSTEM (applies to ALL images) ═══',
      'Before writing individual prompts, define these (based on the CI above):',
      '- ONE background treatment (same for all images, derived from brand CI)',
      '- ONE illustration style (derived from brand CI)',
      '- ONE text rendering approach (derived from brand CI — use the brand fonts and colors)',
      '- ONE accent color usage (derived from brand CI)',
      '',
      '═══ STEP 2: Write prompts per image ═══',
      'CRITICAL CONSISTENCY RULES:',
      '- ALL images use the EXACT SAME background color/treatment. No per-image variation.',
      '- ALL images use the EXACT SAME illustration style. If one has flat icons, all have flat icons.',
      '- ALL images use the EXACT SAME typography style. Same font feel, same weight, same color.',
      '- Tiles within the SAME section (same row) must look like they belong together — same visual weight.',
      '- The ONLY thing that differs between tiles is the CONTENT (product, text, icon subject).',
      '- Think of it as a design template applied to different content — not individual designs.',
      '',
      'WHAT TO DESCRIBE (imagePrompt):',
      '- The visual content: what is shown (product, icon, scene, text)',
      '- Composition: where elements are placed',
      '- The unified style from Step 1',
      '- 2-3 sentences max. No fluff.',
      '- NOT a webpage, NOT a layout, NOT a mockup. A single standalone graphic.',
      '',
      'WHAT NOT TO DESCRIBE:',
      '- Do NOT invent different backgrounds per tile',
      '- Do NOT invent different color palettes per tile',
      '- Do NOT describe shadows, gradients, or effects unless they are part of the CI',
      '',
      'IMAGES:',
      tileDescriptions.join('\n\n'),
      '',
      'Return ONLY valid JSON:',
      '[',
      '  {',
      '    "imagePrompt": "Prompt for AI image generation (2-3 sentences, CI-consistent)",',
      '    "internalDescription": "One-line internal note: what this image shows + which CI elements apply"',
      '  },',
      '  ...',
      ']',
    ].join('\n');

    var requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 3000,
      },
    };

    var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      var errText = await resp.text();
      return res.status(500).json({ error: 'Gemini API error: ' + resp.status + ' ' + errText.slice(0, 300) });
    }

    var data = await resp.json();
    var text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
    }

    // Extract JSON array from response
    var jsonStart = text.indexOf('[');
    var jsonEnd = text.lastIndexOf(']');
    if (jsonStart < 0 || jsonEnd < 0) {
      return res.status(500).json({ error: 'Gemini did not return valid JSON array', raw: text.slice(0, 500) });
    }
    var descriptions = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    return res.status(200).json({ descriptions: descriptions, count: descriptions.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
