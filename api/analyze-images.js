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
  var images = body.images;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: 'Missing images array' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Limit batch size
  if (images.length > 10) {
    images = images.slice(0, 10);
  }

  try {
    var analyses = [];

    for (var i = 0; i < images.length; i++) {
      var img = images[i];
      if (!img.url) continue;

      try {
        var analysis = await analyzeImage(img.url, img.context || '');
        analyses.push({
          url: img.url,
          summary: analysis.summary || '',
          imageCategory: analysis.imageCategory || 'creative',
          style: analysis.style || '',
          composition: analysis.composition || '',
          colors: analysis.colors || '',
          textContent: analysis.textContent || '',
          elements: analysis.elements || [],
        });
      } catch (err) {
        analyses.push({
          url: img.url,
          error: err.message,
          summary: 'Analysis failed',
        });
      }
    }

    return res.status(200).json({ analyses: analyses, count: analyses.length });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

async function analyzeImage(imageUrl, context) {
  var prompt = [
    'Analyze this Amazon Brand Store image. Be concise (max 3 sentences total).',
    '',
    context ? 'Context: ' + context : '',
    '',
    'Return ONLY valid JSON:',
    '{',
    '  "summary": "One sentence describing what this image shows and its purpose",',
    '  "imageCategory": "store_hero|benefit|product|creative|lifestyle|text_image",',
    '  "style": "e.g. dark/moody, clean/minimal, colorful/bold, professional/technical",',
    '  "composition": "e.g. full-width banner, split layout, grid, centered product",',
    '  "colors": "dominant colors, e.g. dark gray + gold accents",',
    '  "textContent": "any text visible in the image, or empty string",',
    '  "elements": ["product", "person", "logo", "cta_button", "icon", "lifestyle_scene"]',
    '}',
  ].filter(Boolean).join('\n');

  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          file_data: {
            mime_type: 'image/jpeg',
            file_uri: imageUrl,
          },
        },
      ],
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 500,
    },
  };

  // Gemini can also accept images via URL directly using inlineData or fileData
  // For external URLs, we use the image URL approach
  // If file_data doesn't work with external URLs, fall back to downloading + base64
  var resp;
  try {
    resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (fetchErr) {
    // Fallback: try with image URL in text prompt only (no vision)
    return analyzeImageTextOnly(imageUrl, context);
  }

  if (!resp.ok) {
    // If file_data approach fails, try downloading the image and sending as base64
    return analyzeImageViaDownload(imageUrl, context);
  }

  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  return extractJSON(text);
}

async function analyzeImageViaDownload(imageUrl, context) {
  // Download image and convert to base64
  var imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error('Failed to download image');

  var buffer = await imgResp.arrayBuffer();
  var base64 = Buffer.from(buffer).toString('base64');
  var mimeType = imgResp.headers.get('content-type') || 'image/jpeg';

  var prompt = [
    'Analyze this Amazon Brand Store image concisely (max 3 sentences).',
    context ? 'Context: ' + context : '',
    'Return ONLY valid JSON: {"summary":"...","imageCategory":"store_hero|benefit|product|creative|lifestyle|text_image","style":"...","composition":"...","colors":"...","textContent":"...","elements":["..."]}',
  ].filter(Boolean).join('\n');

  var requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: base64 } },
      ],
    }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
  };

  var resp = await fetch(GEMINI_URL + '?key=' + GEMINI_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!resp.ok) {
    var err = await resp.text();
    throw new Error('Gemini API error: ' + resp.status + ' ' + err.slice(0, 200));
  }

  var data = await resp.json();
  var text = '';
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    text = data.candidates[0].content.parts.map(function(p) { return p.text || ''; }).join('');
  }

  return extractJSON(text);
}

async function analyzeImageTextOnly(imageUrl, context) {
  // Fallback: just describe what we can infer from the URL
  return {
    summary: 'Image from Amazon Brand Store (analysis unavailable)',
    imageCategory: 'creative',
    style: '',
    composition: '',
    colors: '',
    textContent: '',
    elements: [],
  };
}

function extractJSON(text) {
  // Strip markdown code fences that Gemini often wraps around JSON
  var cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    var s = cleaned.indexOf('{');
    var e = cleaned.lastIndexOf('}');
    if (s >= 0 && e > s) {
      return JSON.parse(cleaned.slice(s, e + 1));
    }
  } catch (err) {
    // Try removing trailing commas and newlines inside JSON
    try {
      var fixed = cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/[\r\n]+/g, ' ');
      return JSON.parse(fixed);
    } catch (e2) { /* fall through */ }
  }
  return { summary: text.slice(0, 200), imageCategory: 'creative' };
}
