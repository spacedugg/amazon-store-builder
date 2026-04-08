var GEMINI_KEY = process.env.GEMINI_API_KEY;

// Imagen 4 Fast via Gemini API (primary) — set in Google AI Suite
var IMAGEN_PRIMARY_MODEL = process.env.IMAGEN_MODEL || 'imagen-4.0-fast-generate-001';
var IMAGEN_PRIMARY_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + IMAGEN_PRIMARY_MODEL + ':predict';

// Imagen 3 as fallback
var IMAGEN_FALLBACK_MODEL = process.env.IMAGEN_FALLBACK_MODEL || 'imagen-3.0-generate-002';
var IMAGEN_FALLBACK_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + IMAGEN_FALLBACK_MODEL + ':predict';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var prompt = body.prompt;
  var aspectRatio = body.aspectRatio || '16:9';

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured. Add it to your Vercel environment variables.' });
  }

  var errors = [];

  try {
    // Try Imagen 4 Fast first (primary model)
    var result = await generateWithImagen(prompt, aspectRatio, IMAGEN_PRIMARY_URL, IMAGEN_PRIMARY_MODEL);
    if (result) {
      return res.status(200).json(result);
    }
    errors.push(IMAGEN_PRIMARY_MODEL + ': failed');

    // Fallback: Try Imagen 3
    result = await generateWithImagen(prompt, aspectRatio, IMAGEN_FALLBACK_URL, IMAGEN_FALLBACK_MODEL);
    if (result) {
      return res.status(200).json(result);
    }
    errors.push(IMAGEN_FALLBACK_MODEL + ': failed');

    return res.status(500).json({ error: 'Image generation failed. Tried: ' + errors.join(', ') + '. Check GEMINI_API_KEY permissions and billing at https://aistudio.google.com/apikey' });

  } catch (err) {
    console.error('Wireframe generation error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

async function generateWithImagen(prompt, aspectRatio, apiUrl, modelName) {
  try {
    var requestBody = {
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        personGeneration: 'DONT_ALLOW',
      },
    };

    var resp = await fetch(apiUrl + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      var errText = await resp.text().catch(function() { return ''; });
      console.error(modelName + ' API error (' + resp.status + '):', errText.slice(0, 300));
      return null;
    }

    var data = await resp.json();
    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      return {
        imageBase64: data.predictions[0].bytesBase64Encoded,
        mimeType: data.predictions[0].mimeType || 'image/png',
        model: modelName,
      };
    }

    return null;
  } catch (err) {
    console.error(modelName + ' exception:', err.message);
    return null;
  }
}
