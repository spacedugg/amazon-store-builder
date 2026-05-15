import { upload } from '@vercel/blob/client';

// Image Auslagerung: Data URLs werden vor dem Save aus dem Store extrahiert,
// hash basiert in die Vercel Blob Infrastruktur hochgeladen und durch einen
// Sentinel String im Store JSON ersetzt. Der Client uploaded direkt nach
// Blob, damit das 4,5 MB Vercel Function Body Limit komplett umgangen wird.
// Beim Laden werden die Sentinels transparent zurueck in Blob URLs aufgeloest,
// der Rest der App sieht weiterhin den gleichen Store wie vorher.

var SENTINEL_PREFIX = '#imgref:sha256:';

// Felder im Store, die Data URLs enthalten können.
var IMAGE_FIELDS_TILE = ['uploadedImage', 'uploadedImageMobile', 'videoThumbnail'];
var IMAGE_FIELDS_PAGE = ['headerBanner', 'headerBannerMobile'];
var IMAGE_FIELDS_STORE = ['headerBanner', 'headerBannerMobile'];

// localStorage Cache der bereits hochgeladenen Hashes. Damit muss bei einem
// erneuten Save eines Stores mit 380 Bildern nicht jeder einzelne Hash erneut
// gegen den Server gecheckt werden.
var UPLOADED_CACHE_KEY = 'amazon-store-builder-uploaded-hashes';
function getUploadedCache() {
  try {
    var raw = localStorage.getItem(UPLOADED_CACHE_KEY);
    if (!raw) return {};
    var parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) { return {}; }
}
function markUploaded(hash) {
  try {
    var cache = getUploadedCache();
    cache[hash] = 1;
    // Cache nicht beliebig wachsen lassen, bei 5000 Eintraegen halbieren.
    var keys = Object.keys(cache);
    if (keys.length > 5000) {
      var trimmed = {};
      keys.slice(-2500).forEach(function(k) { trimmed[k] = 1; });
      cache = trimmed;
      cache[hash] = 1;
    }
    localStorage.setItem(UPLOADED_CACHE_KEY, JSON.stringify(cache));
  } catch (e) { /* localStorage voll, ignorieren */ }
}

function isDataUrl(v) {
  return typeof v === 'string' && v.indexOf('data:') === 0;
}

function isSentinel(v) {
  return typeof v === 'string' && v.indexOf(SENTINEL_PREFIX) === 0;
}

function makeSentinel(hash) {
  return SENTINEL_PREFIX + hash;
}

function hashFromSentinel(s) {
  return s.slice(SENTINEL_PREFIX.length);
}

async function sha256Hex(text) {
  var enc = new TextEncoder().encode(text);
  var buf = await crypto.subtle.digest('SHA-256', enc);
  var bytes = new Uint8Array(buf);
  var hex = '';
  for (var i = 0; i < bytes.length; i++) {
    var h = bytes[i].toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

// Walks the store, extracts every data URL into a hash map, replaces it
// with a sentinel. Returns { storeForWire, images } where images is a Map
// from hash to data URL.
export async function extractImagesFromStore(store) {
  if (!store || typeof store !== 'object') return { storeForWire: store, images: new Map() };

  var images = new Map();

  async function replaceField(obj, key) {
    var v = obj[key];
    if (!isDataUrl(v)) return;
    var hash = await sha256Hex(v);
    images.set(hash, v);
    obj[key] = makeSentinel(hash);
  }

  // referenceImages: Array von { dataUrl, name } pro Tile.
  async function replaceReferenceImages(tile) {
    if (!tile || !Array.isArray(tile.referenceImages)) return;
    for (var i = 0; i < tile.referenceImages.length; i++) {
      var entry = tile.referenceImages[i];
      if (!entry || !isDataUrl(entry.dataUrl)) continue;
      var hash = await sha256Hex(entry.dataUrl);
      images.set(hash, entry.dataUrl);
      entry.dataUrl = makeSentinel(hash);
    }
  }

  // Deep clone to avoid mutating UI state
  var clone = JSON.parse(JSON.stringify(store));

  // Top level
  for (var i = 0; i < IMAGE_FIELDS_STORE.length; i++) {
    await replaceField(clone, IMAGE_FIELDS_STORE[i]);
  }

  // Pages
  if (Array.isArray(clone.pages)) {
    for (var p = 0; p < clone.pages.length; p++) {
      var page = clone.pages[p];
      if (!page || typeof page !== 'object') continue;
      for (var pf = 0; pf < IMAGE_FIELDS_PAGE.length; pf++) {
        await replaceField(page, IMAGE_FIELDS_PAGE[pf]);
      }
      if (!Array.isArray(page.sections)) continue;
      for (var s = 0; s < page.sections.length; s++) {
        var sec = page.sections[s];
        if (!sec || !Array.isArray(sec.tiles)) continue;
        for (var t = 0; t < sec.tiles.length; t++) {
          var tile = sec.tiles[t];
          if (!tile || typeof tile !== 'object') continue;
          for (var tf = 0; tf < IMAGE_FIELDS_TILE.length; tf++) {
            await replaceField(tile, IMAGE_FIELDS_TILE[tf]);
          }
          await replaceReferenceImages(tile);
        }
      }
    }
  }

  // Safety Net: rekursiv durch den ganzen Store laufen und jede noch
  // verbliebene Data URL ausgliedern. Fängt Felder ab, die ich oben nicht
  // explizit aufgelistet habe (z.B. neu hinzukommende oder von Brand
  // Analysis injiziert). Inflate funktioniert dann automatisch über die
  // gleiche rekursive Logik in inflateImagesIntoStore.
  await sweepRemainingDataUrls(clone, images);

  return { storeForWire: clone, images: images };
}

async function sweepRemainingDataUrls(node, images) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var v = node[i];
      if (isDataUrl(v)) {
        var hash = await sha256Hex(v);
        images.set(hash, v);
        node[i] = makeSentinel(hash);
      } else if (v && typeof v === 'object') {
        await sweepRemainingDataUrls(v, images);
      }
    }
    return;
  }
  var keys = Object.keys(node);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var val = node[key];
    if (isDataUrl(val)) {
      var h = await sha256Hex(val);
      images.set(h, val);
      node[key] = makeSentinel(h);
    } else if (val && typeof val === 'object') {
      await sweepRemainingDataUrls(val, images);
    }
  }
}

// Walks the store, finds every sentinel, fetches the matching data URL
// from /api/store-images and inflates it back. Mutates a deep clone.
export async function inflateImagesIntoStore(store) {
  if (!store || typeof store !== 'object') return store;

  // Erst alle benötigten Hashes sammeln, dann parallel fetchen, dann
  // ersetzen. Das vermeidet redundante Requests bei Bildwiederverwendung.
  var clone = JSON.parse(JSON.stringify(store));
  var neededHashes = new Set();

  function collect(obj, key) {
    var v = obj[key];
    if (isSentinel(v)) neededHashes.add(hashFromSentinel(v));
  }

  function collectReferenceImages(tile) {
    if (!tile || !Array.isArray(tile.referenceImages)) return;
    tile.referenceImages.forEach(function(entry) {
      if (entry && isSentinel(entry.dataUrl)) neededHashes.add(hashFromSentinel(entry.dataUrl));
    });
  }

  for (var i = 0; i < IMAGE_FIELDS_STORE.length; i++) collect(clone, IMAGE_FIELDS_STORE[i]);

  if (Array.isArray(clone.pages)) {
    clone.pages.forEach(function(page) {
      if (!page) return;
      IMAGE_FIELDS_PAGE.forEach(function(k) { collect(page, k); });
      if (!Array.isArray(page.sections)) return;
      page.sections.forEach(function(sec) {
        if (!sec || !Array.isArray(sec.tiles)) return;
        sec.tiles.forEach(function(tile) {
          if (!tile) return;
          IMAGE_FIELDS_TILE.forEach(function(k) { collect(tile, k); });
          collectReferenceImages(tile);
        });
      });
    });
  }

  // Safety Net: rekursiv jeden Sentinel finden, auch in Feldern die wir
  // hier nicht explizit kennen. Pendant zur sweep Logik beim Extract.
  sweepCollectSentinels(clone, neededHashes);

  if (neededHashes.size === 0) return clone;

  // Parallel fetchen mit kleinem Concurrency Limit, damit der Browser
  // nicht 200 Requests gleichzeitig öffnet.
  var hashList = Array.from(neededHashes);
  var resolved = new Map();
  var concurrency = 6;
  var idx = 0;

  async function worker() {
    while (idx < hashList.length) {
      var myIdx = idx++;
      var h = hashList[myIdx];
      try {
        var resp = await fetch('/api/store-images?hash=' + encodeURIComponent(h));
        if (resp.ok) {
          var json = await resp.json();
          // Neuer Pfad: Blob URL direkt verwenden. Legacy Pfad: Base64
          // Data URL als Fallback.
          if (json && json.url) resolved.set(h, json.url);
          else if (json && json.data) resolved.set(h, json.data);
        }
      } catch (e) { /* image bleibt als Sentinel, UI zeigt leeres Image */ }
    }
  }

  var workers = [];
  for (var w = 0; w < concurrency; w++) workers.push(worker());
  await Promise.all(workers);

  function replace(obj, key) {
    var v = obj[key];
    if (!isSentinel(v)) return;
    var h = hashFromSentinel(v);
    if (resolved.has(h)) obj[key] = resolved.get(h);
    else obj[key] = null; // nicht auflösbar, UI behandelt null als kein Bild
  }

  function replaceReferenceImages(tile) {
    if (!tile || !Array.isArray(tile.referenceImages)) return;
    tile.referenceImages = tile.referenceImages.map(function(entry) {
      if (!entry || !isSentinel(entry.dataUrl)) return entry;
      var h = hashFromSentinel(entry.dataUrl);
      var data = resolved.get(h) || null;
      return Object.assign({}, entry, { dataUrl: data });
    }).filter(function(entry) {
      // Nicht auflösbare Reference Images rauswerfen statt mit null Datenstand zu rendern
      return entry && entry.dataUrl;
    });
  }

  for (var k = 0; k < IMAGE_FIELDS_STORE.length; k++) replace(clone, IMAGE_FIELDS_STORE[k]);

  if (Array.isArray(clone.pages)) {
    clone.pages.forEach(function(page) {
      if (!page) return;
      IMAGE_FIELDS_PAGE.forEach(function(kk) { replace(page, kk); });
      if (!Array.isArray(page.sections)) return;
      page.sections.forEach(function(sec) {
        if (!sec || !Array.isArray(sec.tiles)) return;
        sec.tiles.forEach(function(tile) {
          if (!tile) return;
          IMAGE_FIELDS_TILE.forEach(function(kk) { replace(tile, kk); });
          replaceReferenceImages(tile);
        });
      });
    });
  }

  // Safety Net: rekursiv alle restlichen Sentinels ersetzen.
  sweepReplaceSentinels(clone, resolved);

  return clone;
}

function sweepCollectSentinels(node, neededHashes) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach(function(v) {
      if (isSentinel(v)) neededHashes.add(hashFromSentinel(v));
      else if (v && typeof v === 'object') sweepCollectSentinels(v, neededHashes);
    });
    return;
  }
  Object.keys(node).forEach(function(key) {
    var v = node[key];
    if (isSentinel(v)) neededHashes.add(hashFromSentinel(v));
    else if (v && typeof v === 'object') sweepCollectSentinels(v, neededHashes);
  });
}

function sweepReplaceSentinels(node, resolved) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) {
      var v = node[i];
      if (isSentinel(v)) {
        var h = hashFromSentinel(v);
        node[i] = resolved.has(h) ? resolved.get(h) : null;
      } else if (v && typeof v === 'object') {
        sweepReplaceSentinels(v, resolved);
      }
    }
    return;
  }
  Object.keys(node).forEach(function(key) {
    var v = node[key];
    if (isSentinel(v)) {
      var h = hashFromSentinel(v);
      node[key] = resolved.has(h) ? resolved.get(h) : null;
    } else if (v && typeof v === 'object') {
      sweepReplaceSentinels(v, resolved);
    }
  });
}

// Batched Check welche Hashes bereits in der DB sind. Aufruf in einem
// einzigen Roundtrip statt 380 mal Einzelpost. localStorage Cache vorab,
// damit Re Saves quasi instant durchlaufen.
async function fetchExistingHashes(hashes) {
  var cache = getUploadedCache();
  var toCheck = hashes.filter(function(h) { return !cache[h]; });
  var existing = {};
  hashes.forEach(function(h) { if (cache[h]) existing[h] = true; });
  if (toCheck.length === 0) return existing;
  // Vercel Body Limit beachten, Hashes sind kurz (64 hex chars) aber sicher
  // gehen wir in 500er Bloecken.
  var CHUNK = 500;
  for (var i = 0; i < toCheck.length; i += CHUNK) {
    var slice = toCheck.slice(i, i + CHUNK);
    try {
      var resp = await fetch('/api/store-images?action=exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashes: slice }),
      });
      if (resp.ok) {
        var json = await resp.json();
        var map = (json && json.exists) || {};
        Object.keys(map).forEach(function(h) {
          if (map[h]) { existing[h] = true; markUploaded(h); }
        });
      }
    } catch (e) { /* Fallback: einzeln pruefen via POST upload, der dedupliziert */ }
  }
  return existing;
}

// Wandelt eine Data URL in einen Blob fuer den Vercel Blob Upload. mime
// Type wird aus dem Data URL Prefix gezogen.
async function dataUrlToBlob(dataUrl) {
  var response = await fetch(dataUrl);
  return await response.blob();
}

function extractMime(dataUrl) {
  var match = /^data:([^;,]+)[;,]/.exec(dataUrl || '');
  return match ? match[1] : 'image/jpeg';
}

function extFromMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/svg+xml') return 'svg';
  if (mime === 'image/bmp') return 'bmp';
  if (mime === 'image/tiff') return 'tiff';
  return 'jpg';
}

// Laedt jeden Hash zu Data URL Eintrag in der Map nach Vercel Blob hoch.
// Der eigentliche Upload geht direkt vom Browser nach Blob, nicht durch
// unseren Serverless Endpoint, damit es kein 4,5 MB Limit gibt. Bekannte
// Hashes werden via Batch Check und localStorage Cache ausgefiltert.
// Verbleibende Bilder werden mit hoher Concurrency parallel hochgeladen.
// onProgress liefert Live Status fuer das UI. Teilfehler brechen den
// Save nicht ab, der Aufrufer bekommt die Liste der gescheiterten Bilder.
export async function uploadImages(images, onProgress) {
  if (!images || images.size === 0) return { uploaded: 0, failed: [], skipped: 0 };
  var entries = Array.from(images.entries());
  var hashes = entries.map(function(e) { return e[0]; });
  var existing = await fetchExistingHashes(hashes);
  var toUpload = entries.filter(function(e) { return !existing[e[0]]; });
  var skipped = entries.length - toUpload.length;
  var totalToDo = toUpload.length;
  if (typeof onProgress === 'function') onProgress({ uploaded: 0, total: totalToDo, skipped: skipped });

  if (totalToDo === 0) {
    return { uploaded: 0, failed: [], skipped: skipped };
  }

  var failed = [];
  var uploaded = 0;
  var concurrency = 8;
  var idx = 0;

  async function worker() {
    while (idx < toUpload.length) {
      var myIdx = idx++;
      var pair = toUpload[myIdx];
      var hash = pair[0];
      var dataUrl = pair[1];
      try {
        var mime = extractMime(dataUrl);
        var ext = extFromMime(mime);
        var blob = await dataUrlToBlob(dataUrl);
        var pathname = 'store-images/' + hash + '.' + ext;
        var result = await upload(pathname, blob, {
          access: 'public',
          handleUploadUrl: '/api/blob-upload',
          contentType: mime,
          clientPayload: JSON.stringify({ hash: hash }),
        });
        // Fallback Registrierung. Der onUploadCompleted Callback auf der
        // Server Seite traegt ebenfalls Hash zu URL in die DB ein, aber
        // wenn dieser Callback aus irgendeinem Grund nicht durchlaeuft
        // (Local Dev, Vercel Probleme), sichert dieser POST ab dass die
        // Zuordnung in der DB landet.
        try {
          await fetch('/api/store-images?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hash: hash, blob_url: result.url, byte_size: blob.size || 0 }),
          });
        } catch (e) { /* nicht kritisch, onUploadCompleted laeuft eh */ }
        uploaded++;
        markUploaded(hash);
      } catch (e) {
        failed.push({ hash: hash, status: 0, message: e.message || 'Blob upload fehlgeschlagen', size: dataUrl ? dataUrl.length : 0 });
      }
      if (typeof onProgress === 'function') onProgress({ uploaded: uploaded, total: totalToDo, skipped: skipped, failed: failed.length });
    }
  }

  var workers = [];
  for (var w = 0; w < concurrency; w++) workers.push(worker());
  await Promise.all(workers);
  return { uploaded: uploaded, failed: failed, skipped: skipped };
}
