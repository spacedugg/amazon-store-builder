var GEMINI_KEY = process.env.GEMINI_API_KEY;

// Imagen 3 via Gemini API for image generation
var IMAGEN_MODEL = 'imagen-3.0-generate-002';
var IMAGEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/' + IMAGEN_MODEL + ':predict';

// Gemini native image generation models (ordered by preference)
// The stable gemini-2.0-flash does NOT support image output — must use the preview-image-generation variant
var GEMINI_IMAGE_MODELS = [
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.5-flash-preview-image-generation',
];

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
    // Try Imagen 3 first (best for image generation)
    var result = await generateWithImagen(prompt, aspectRatio);
    if (result) {
      return res.status(200).json(result);
    }
    errors.push('Imagen 3: failed');

    // Fallback: Try Gemini native image generation models
    for (var i = 0; i < GEMINI_IMAGE_MODELS.length; i++) {
      result = await generateWithGeminiFlash(prompt, GEMINI_IMAGE_MODELS[i]);
      if (result) {
        return res.status(200).json(result);
      }
      errors.push(GEMINI_IMAGE_MODELS[i] + ': failed');
    }

    return res.status(500).json({ error: 'Image generation failed. Tried: ' + errors.join(', ') + '. Check GEMINI_API_KEY permissions and billing at https://aistudio.google.com/apikey' });

  } catch (err) {
    console.error('Wireframe generation error:', err.message);
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
      var errText = await resp.text().catch(function() { return ''; });
      console.error('Imagen API error (' + resp.status + '):', errText.slice(0, 300));
      // Imagen might not be available — fall through to Gemini Flash
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
    console.error('Imagen exception:', err.message);
    return null;
  }
}

async function generateWithGeminiFlash(prompt, modelName) {
  try {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent';

    var requestBody = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        maxOutputTokens: 4096,
      },
    };

    var resp = await fetch(url + '?key=' + GEMINI_KEY, {
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
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].inlineData) {
          return {
            imageBase64: parts[i].inlineData.data,
            mimeType: parts[i].inlineData.mimeType || 'image/png',
            model: modelName,
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error(modelName + ' exception:', err.message);
    return null;
  }
}
