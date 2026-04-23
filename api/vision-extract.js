// Vision-Extract Proxy fuer den v3-Rollout.
// Serverside proxy auf Vercel, damit der Sandbox ohne API-Key auskommt.
//
// POST /api/vision-extract
// Body:
// {
//   model?: string,               // default "claude-sonnet-4-6"
//   system: string,               // Systemprompt, i.d.R. BLUEPRINT_EXTRACTION_PROMPT.md
//   userText: string,             // Nutzer-Message-Text (DOM-Extrakt plus Seitenmeta)
//   imagesB64: string[],          // Screenshot-Segmente als reines Base64, ohne Data-URL-Prefix
//   maxTokens?: number,           // default 8192
//   temperature?: number,         // default 0
//   responseFormat?: "json"|null  // falls "json" erzwingt das Wrapper-Prompting
// }
//
// Antwort:
// { text: string, usage: {...} }
// oder Fehler: { error: string, status: number }
//
// Secrets: VITE_ANTHROPIC_API_KEY (primaer, Vercel-Konvention) oder ANTHROPIC_API_KEY.
// Keine Keys gehen jemals an den Client zurueck.

var ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
var ANTHROPIC_VERSION = '2023-06-01';

function readJsonBody(req) {
  return new Promise(function (resolve, reject) {
    if (req.body && typeof req.body === 'object') { resolve(req.body); return; }
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      try {
        var raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  // CORS fuer den Sandbox-Aufruf
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-vision-proxy-token');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  var KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!KEY) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel env' }); return; }

  // Optionales Shared-Secret fuer leichten Missbrauchsschutz. Wenn gesetzt, Pflicht im Request-Header.
  var EXPECTED = process.env.VISION_PROXY_TOKEN;
  if (EXPECTED) {
    var got = req.headers['x-vision-proxy-token'];
    if (got !== EXPECTED) { res.status(401).json({ error: 'proxy token mismatch' }); return; }
  }

  var body;
  try { body = await readJsonBody(req); }
  catch (e) { res.status(400).json({ error: 'invalid JSON body' }); return; }

  var model = body.model || 'claude-sonnet-4-6';
  var system = body.system;
  var userText = body.userText;
  var imagesB64 = Array.isArray(body.imagesB64) ? body.imagesB64 : [];
  var maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 8192;
  var temperature = typeof body.temperature === 'number' ? body.temperature : 0;

  if (!system || !userText) { res.status(400).json({ error: 'system und userText sind Pflicht' }); return; }
  if (imagesB64.length > 20) { res.status(400).json({ error: 'zu viele Images (max 20)' }); return; }

  var content = [];
  for (var i = 0; i < imagesB64.length; i++) {
    var b64 = imagesB64[i];
    // Data-URL-Prefix entfernen, falls der Aufrufer ihn mitgeschickt hat
    if (typeof b64 === 'string' && b64.indexOf('base64,') !== -1) {
      b64 = b64.split('base64,')[1];
    }
    if (!b64) continue;
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: b64 }
    });
  }
  content.push({ type: 'text', text: userText });

  var anthropicBody = {
    model: model,
    max_tokens: maxTokens,
    temperature: temperature,
    system: system,
    messages: [{ role: 'user', content: content }]
  };

  try {
    var resp = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify(anthropicBody)
    });
    if (!resp.ok) {
      var errText = await resp.text();
      res.status(resp.status).json({ error: 'anthropic_error', status: resp.status, detail: errText.slice(0, 2000) });
      return;
    }
    var data = await resp.json();
    var text = (data.content && data.content[0]) ? data.content[0].text : '';
    res.status(200).json({ text: text, usage: data.usage || null, model: model });
  } catch (e) {
    res.status(502).json({ error: 'proxy_error', detail: String(e && e.message || e).slice(0, 500) });
  }
}

// Vercel-spezifisch: Bodygroesse hoch, weil segmentierte Screenshots mehrere MB haben
export var config = {
  api: {
    bodyParser: { sizeLimit: '25mb' }
  },
  maxDuration: 60
};
