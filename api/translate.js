var crypto = require('crypto');
var { getClient, migrate } = require('./_db');

// Batch Übersetzung mit Cache. Designer Briefing Felder werden im Share
// View ins Englische übersetzt. Der Cache ist content addressed (sha256
// über source_text plus target_lang) damit identische Texte nur einmal
// kosten, egal in wievielen Stores sie vorkommen.

var ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
var ANTHROPIC_VERSION = '2023-06-01';
var MODEL = 'claude-haiku-4-5-20251001'; // Schnell und günstig genug für Briefing Übersetzungen
var BATCH_SIZE = 30; // Wieviele Texte pro Claude Call. Hält den Prompt kurz und reduziert Latenz.

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function loadFromCache(db, hashes, targetLang) {
  if (hashes.length === 0) return new Map();
  // libsql IN Klausel braucht eine Bind Liste, wir bauen sie dynamisch
  var placeholders = hashes.map(function() { return '?'; }).join(',');
  var args = hashes.concat([targetLang]);
  var sql = 'SELECT source_hash, translated_text FROM translations WHERE source_hash IN (' + placeholders + ') AND target_lang = ?';
  var result = await db.execute({ sql: sql, args: args });
  var map = new Map();
  result.rows.forEach(function(row) { map.set(row.source_hash, row.translated_text); });
  return map;
}

async function persistToCache(db, entries, targetLang) {
  if (entries.length === 0) return;
  // Eine Insert Statement pro Entry mit ON CONFLICT IGNORE damit
  // parallele Übersetzungen denselben Eintrag nicht crashen.
  var stmts = entries.map(function(e) {
    return {
      sql: 'INSERT INTO translations (source_hash, target_lang, source_text, translated_text) VALUES (?, ?, ?, ?) ON CONFLICT(source_hash, target_lang) DO NOTHING',
      args: [e.hash, targetLang, e.source, e.translated],
    };
  });
  try {
    await db.batch(stmts);
  } catch (e) {
    // Cache Write nicht kritisch, Übersetzung wird einfach beim nächsten
    // Mal neu gemacht.
    console.warn('translation cache persist failed:', e.message);
  }
}

async function translateBatch(apiKey, texts, targetLang) {
  if (texts.length === 0) return [];
  // Sentinel basierter Prompt, damit Claude die Reihenfolge beibehält und
  // wir die Antworten zuverlässig wieder den Inputs zuordnen können.
  var langName = targetLang === 'en' ? 'English' : targetLang;
  var system = 'You translate short marketing and design briefing texts into ' + langName + '. Rules:\n' +
    '- Only translate. Do not add commentary, do not summarize, do not change meaning.\n' +
    '- Preserve product names, brand names, ASINs (B0...), URLs, hex color codes, and inline numbers as is.\n' +
    '- If the source is already in ' + langName + ', return it unchanged.\n' +
    '- Keep the natural register of the source (casual stays casual, professional stays professional).\n' +
    '- Output ONLY the translations, nothing else, in the exact same order as the inputs, separated by lines that contain only the marker <<<NEXT>>>.';

  var userText = 'Translate each of the following texts. Output the translations separated by lines containing only <<<NEXT>>>. Do not number them. Do not add a heading. Just the translations.\n\n';
  texts.forEach(function(t, i) {
    if (i > 0) userText += '\n<<<NEXT>>>\n';
    userText += t;
  });

  var resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: system,
      messages: [{ role: 'user', content: userText }],
    }),
  });
  if (!resp.ok) {
    var errText = await resp.text();
    throw new Error('anthropic_error ' + resp.status + ': ' + errText.slice(0, 500));
  }
  var data = await resp.json();
  var raw = (data.content && data.content[0]) ? data.content[0].text : '';
  var parts = raw.split(/\n?<<<NEXT>>>\n?/);
  // Anzahl muss matchen, sonst fallen wir auf die Originaltexte zurück (besser als kaputt mappen)
  if (parts.length !== texts.length) {
    console.warn('translate batch length mismatch:', parts.length, 'vs', texts.length);
    return texts.slice();
  }
  return parts.map(function(p) { return p.trim(); });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var apiKey = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured in Vercel env' });

  var db = getClient();
  try {
    await migrate();
  } catch (e) {
    return res.status(500).json({ error: 'Database not available: ' + e.message });
  }

  var body = req.body || {};
  var texts = Array.isArray(body.texts) ? body.texts : [];
  var targetLang = body.targetLang || 'en';
  if (texts.length === 0) return res.status(200).json({ translations: [] });

  // Eingangstexte: leere Strings oder reine Whitespace Strings nicht
  // übersetzen. Wir liefern für jede Stelle einen Output, damit der Client
  // 1:1 mappen kann.
  var hashes = texts.map(function(t) { return t ? sha256Hex(t) : ''; });
  var cacheMap = await loadFromCache(db, hashes.filter(function(h) { return !!h; }), targetLang);

  // Welche Texte fehlen im Cache? Eindeutige Source Texte sammeln.
  var missing = [];
  var seenInBatch = new Set();
  for (var i = 0; i < texts.length; i++) {
    var t = texts[i];
    if (!t) continue;
    var h = hashes[i];
    if (cacheMap.has(h)) continue;
    if (seenInBatch.has(h)) continue;
    seenInBatch.add(h);
    missing.push({ hash: h, source: t });
  }

  // In Subbatches aufteilen damit der Claude Prompt nicht explodiert.
  var newEntries = [];
  for (var b = 0; b < missing.length; b += BATCH_SIZE) {
    var slice = missing.slice(b, b + BATCH_SIZE);
    try {
      var translated = await translateBatch(apiKey, slice.map(function(m) { return m.source; }), targetLang);
      for (var j = 0; j < slice.length; j++) {
        var translatedText = translated[j] != null ? translated[j] : slice[j].source;
        cacheMap.set(slice[j].hash, translatedText);
        newEntries.push({ hash: slice[j].hash, source: slice[j].source, translated: translatedText });
      }
    } catch (e) {
      // Bei API Fehler den Originaltext durchschleifen, damit der Designer
      // wenigstens die deutschen Texte sieht statt einer Fehlermeldung.
      console.warn('translate batch failed:', e.message);
      slice.forEach(function(m) { cacheMap.set(m.hash, m.source); });
    }
  }

  if (newEntries.length > 0) {
    await persistToCache(db, newEntries, targetLang);
  }

  // Output in Eingangsreihenfolge zusammenbauen
  var out = texts.map(function(t, idx) {
    if (!t) return t;
    var h = hashes[idx];
    return cacheMap.get(h) || t;
  });
  return res.status(200).json({ translations: out });
};
