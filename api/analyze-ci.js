var GEMINI_KEY = process.env.GEMINI_API_KEY;
var GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
var GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var imageUrls = body.images; // Array of { url, context } — product listing images
  var brandName = body.brandName || '';

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'Missing images array' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Limit to 8 images for CI analysis (enough to detect patterns)
  var imagesToAnalyze = imageUrls.slice(0, 8);

  try {
    // Download all images and convert to base64 for Gemini
    var imageParts = [];
    for (var i = 0; i < imagesToAnalyze.length; i++) {
      try {
        var imgResp = await fetch(imagesToAnalyze[i].url);
        if (!imgResp.ok) continue;
        var buffer = await imgResp.arrayBuffer();
        var base64 = Buffer.from(buffer).toString('base64');
        var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
        imageParts.push({
          inline_data: { mime_type: mimeType, data: base64 },
        });
      } catch (e) { /* skip failed image */ }
    }

    if (imageParts.length === 0) {
      return res.status(400).json({ error: 'Could not download any of the provided images' });
    }

    // Build the CI analysis prompt
    var prompt = [
      'You are a brand identity analyst. Analyze these ' + imageParts.length + ' product listing images from the brand "' + brandName + '" on Amazon.',
      'Extract the Corporate Identity (CI) / visual design language that is consistent across these images.',
      '',
      'Look for:',
      '- Color palette: primary, secondary, accent colors (exact hex codes if possible)',
      '- Typography style: serif/sans-serif, thin/bold, uppercase/lowercase, modern/classic',
      '- Background patterns: solid colors, gradients, textures, nature elements, geometric patterns',
      '- Visual mood: minimalist, premium, natural/organic, scientific/clinical, playful, bold',
      '- Layout patterns in listing images: how text is positioned, product placement, use of icons',
      '- Recurring design elements: icons, badges, borders, shapes, decorative elements',
      '- Photography style: studio/white bg, lifestyle, macro/close-up, flat-lay',
      '- Text density: minimal (few words) vs. detailed (many bullet points, explanations)',
      '- Color consistency: Are colors the SAME across all products (brand-global) or do they VARY per product (product-specific, e.g. different label colors)?',
      '',
      'Return ONLY valid JSON:',
      '{',
      '  "primaryColors": ["#hex1", "#hex2", "#hex3"] (most dominant brand colors)',
      '  "secondaryColors": ["#hex1", "#hex2"] (accent/supporting colors)',
      '  "backgroundColor": "#hex" (most common background color)',
      '  "colorVariation": "brand-global" or "product-specific" (do colors change per product or stay the same?)',
      '  "colorVariationNote": "Short explanation, e.g. Each product has its own accent color matching the label, but backgrounds are always beige"',
      '  "typographyStyle": "e.g. modern sans-serif, bold headlines with thin body text"',
      '  "typographyWeight": "thin|regular|medium|bold|extra-bold"',
      '  "typographyCase": "uppercase|lowercase|mixed|sentence-case"',
      '  "visualMood": "e.g. natural, earthy, premium-minimalist, scientific-clean"',
      '  "backgroundPattern": "e.g. solid beige, subtle leaf textures, gradient cream-to-white"',
      '  "recurringElements": ["e.g. leaf icons", "rounded corners", "circular badges", "nature photography"]',
      '  "photographyStyle": "e.g. studio white background, lifestyle with nature, macro ingredients"',
      '  "textDensity": "minimal|moderate|detailed"',
      '  "layoutStyle": "e.g. centered product with text below, split layout left text right image"',
      '  "designerNotes": "2-3 sentences summarizing the CI for a designer to recreate this visual style"',
      '}',
    ].join('\n');

    var parts = [{ text: prompt }].concat(imageParts);

    var requestBody = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
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

    // Extract JSON from response
    var jsonStart = text.indexOf('{');
    var jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) {
      return res.status(500).json({ error: 'Gemini did not return valid JSON', raw: text.slice(0, 500) });
    }
    var ciData = JSON.parse(text.slice(jsonStart, jsonEnd + 1));

    // Include source image URLs for designer reference
    ciData.sourceImages = imagesToAnalyze.map(function(img) { return img.url; });
    ciData.imagesAnalyzed = imageParts.length;

    return res.status(200).json(ciData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
