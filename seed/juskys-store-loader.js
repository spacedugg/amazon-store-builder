// seed/juskys-store-loader.js
//
// Lädt seed/juskys-store.json in die laufende Store Builder API.
// Nutzt das fetch das ab Node 18 nativ verfügbar ist, keine extra Dependency.
//
// Aufruf:
//   node seed/juskys-store-loader.js
//   STORE_API_URL=http://localhost:5173/api/stores node seed/juskys-store-loader.js
//
// Vorraussetzung:
//   - npm run dev läuft im anderen Terminal
//   - die API erwartet POST mit JSON Body und antwortet mit { id, shareToken }
//
// Bei nicht 2xx Antworten beendet das Skript mit Exit Code 1 und gibt den
// Body aus, damit man den Fehler vom Server sieht.

'use strict';

var fs = require('fs');
var path = require('path');

var STORE_API_URL = process.env.STORE_API_URL || 'http://localhost:3000/api/stores';
var STORE_PATH = path.join(__dirname, 'juskys-store.json');

function fail(msg, extra) {
  console.error('Fehler: ' + msg);
  if (extra) console.error(extra);
  process.exit(1);
}

if (typeof fetch !== 'function') {
  fail('fetch ist nicht verfügbar. Bitte Node 18 oder neuer benutzen.');
}

if (!fs.existsSync(STORE_PATH)) {
  fail('Store JSON nicht gefunden unter ' + STORE_PATH +
    '. Vorher seed/build-juskys-store.mjs laufen lassen.');
}

var raw;
try {
  raw = fs.readFileSync(STORE_PATH, 'utf8');
} catch (e) {
  fail('Konnte Store JSON nicht lesen', e && e.message);
}

var store;
try {
  store = JSON.parse(raw);
} catch (e) {
  fail('Store JSON ist kein valides JSON', e && e.message);
}

console.log('POST ' + STORE_API_URL);
console.log('  Pages:    ' + (store.pages ? store.pages.length : 0));
console.log('  Brand:    ' + store.brandName);
console.log('  Market:   ' + store.marketplace);
console.log('');

(async function main() {
  var res;
  try {
    res = await fetch(STORE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Die API erwartet { data: storeObjekt } (siehe api/stores.js Zeile 108).
      body: JSON.stringify({ data: store }),
    });
  } catch (e) {
    fail('Request fehlgeschlagen, läuft npm run dev und ist die URL korrekt?',
      e && e.message);
  }

  var text = await res.text();
  var body = null;
  try { body = JSON.parse(text); } catch (e) { /* lassen, wir geben Text aus */ }

  if (!res.ok) {
    console.error('HTTP ' + res.status + ' ' + res.statusText);
    console.error(text);
    process.exit(1);
  }

  var id = body && (body.id || (body.store && body.store.id));
  var shareToken = body && (body.shareToken || (body.store && body.store.shareToken));

  console.log('Store erfolgreich angelegt:');
  console.log('  id:         ' + (id || '(nicht in Antwort gefunden)'));
  console.log('  shareToken: ' + (shareToken || '(nicht in Antwort gefunden)'));

  if (!id) {
    console.log('');
    console.log('Antwort vom Server (Rohdaten):');
    console.log(text);
  }
})();
