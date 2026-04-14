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
  var imageUrls = body.images; // Array of { url, context } — product listing images
  var brandName = body.brandName || '';

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'Missing images array' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Accept all images sent by the client (client handles batching)
  var imagesToAnalyze = imageUrls;

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

    // Build the CI analysis prompt — clean JSON schema, no inline comments.
    // The responseMimeType forces Gemini to return ONLY valid JSON.
    var prompt = [
      'Analyze these ' + imageParts.length + ' Amazon product listing images from "' + brandName + '".',
      'Extract the consistent Corporate Identity (CI) across the images.',
      '',
      'Return a JSON object with these fields:',
      '- primaryColors: array of 2-4 hex color strings (most dominant brand colors)',
      '- secondaryColors: array of 1-3 hex color strings (accent colors)',
      '- backgroundColor: hex string (most common background)',
      '- colorVariation: "brand-global" or "product-specific"',
      '- typographyStyle: short description of font style',
      '- visualMood: 2-4 words describing the visual feeling',
      '- backgroundPattern: short description',
      '- recurringElements: array of recurring design elements',
      '- photographyStyle: short description',
      '- textDensity: "minimal" or "moderate" or "detailed"',
      '- designerNotes: 2-3 sentences for a designer to recreate this style',
    ].join('\n');

    var parts = [{ text: prompt }].concat(imageParts);

    var requestBody = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1500,
        responseMimeType: 'application/json',
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

    // With responseMimeType: "application/json", Gemini MUST return valid JSON.
    // But still be defensive: strip markdown fences and clean up just in case.
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    var ciData;
    try {
      ciData = JSON.parse(text);
    } catch (parseErr) {
      // Fallback: try to extract JSON from the text
      var jsonStart = text.indexOf('{');
      var jsonEnd = text.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        try {
          ciData = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
        } catch (e2) {
          var cleaned = text.slice(jsonStart, jsonEnd + 1)
            .replace(/,\s*([\]}])/g, '$1')
            .replace(/[\r\n]+/g, ' ');
          try {
            ciData = JSON.parse(cleaned);
          } catch (e3) {
            return res.status(500).json({ error: 'Gemini returned malformed JSON', raw: text.slice(0, 500) });
          }
        }
      } else {
        return res.status(500).json({ error: 'Gemini did not return JSON', raw: text.slice(0, 500) });
      }
    }

    // Include source image URLs for designer reference
    ciData.sourceImages = imagesToAnalyze.map(function(img) { return img.url; });
    ciData.imagesAnalyzed = imageParts.length;

    return res.status(200).json(ciData);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
