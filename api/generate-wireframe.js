var GEMINI_KEY = process.env.GEMINI_API_KEY;

// Imagen 3 via Gemini API for image generation
var IMAGEN_MODEL = 'imagen-3.0-generate-002';
var IMAGEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + IMAGEN_MODEL + ':predict';

// Fallback: Gemini 2.0 Flash with native image generation
var GEMINI_FLASH_MODEL = 'gemini-2.0-flash-exp';
var GEMINI_FLASH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_FLASH_MODEL + ':generateContent';

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
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  try {
    // Try Imagen 3 first (cheaper, faster for image generation)
    var result = await generateWithImagen(prompt, aspectRatio);
    if (result) {
      return res.status(200).json(result);
    }

    // Fallback: Gemini 2.0 Flash with image output
    result = await generateWithGeminiFlash(prompt);
    if (result) {
      return res.status(200).json(result);
    }

    return res.status(500).json({ error: 'Image generation failed with all available models' });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

async function generateWithImagen(prompt, aspectRatio) {
  try {
    var requestBody = {
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        personGeneration: 'DONT_ALLOW',
      },
    };

    var resp = await fetch(IMAGEN_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) {
      // Imagen might not be available, fall through to Gemini Flash
      return null;
    }

    var data = await resp.json();
    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
      return {
        imageBase64: data.predictions[0].bytesBase64Encoded,
        mimeType: data.predictions[0].mimeType || 'image/png',
        model: 'imagen-3',
      };
    }

    return null;
  } catch (err) {
    return null;
  }
}

async function generateWithGeminiFlash(prompt) {
  try {
    var requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        maxOutputTokens: 4096,
      },
    };

    var resp = await fetch(GEMINI_FLASH_URL + '?key=' + GEMINI_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!resp.ok) return null;

    var data = await resp.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].inlineData) {
          return {
            imageBase64: parts[i].inlineData.data,
            mimeType: parts[i].inlineData.mimeType || 'image/png',
            model: 'gemini-flash',
          };
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}
