// Image Auslagerung: Base64 Data URLs werden vor dem Save aus dem Store
// extrahiert, hash basiert in der store_images Tabelle abgelegt und durch
// einen Sentinel String ersetzt. Damit bleibt der Store JSON Body weit
// unter dem 4,5 MB Vercel Body Limit. Beim Laden werden die Sentinels
// transparent zurück in Data URLs aufgelöst, der Rest der App sieht den
// gleichen Store wie vorher.

var SENTINEL_PREFIX = '#imgref:sha256:';

// Felder im Store, die Data URLs enthalten können.
var IMAGE_FIELDS_TILE = ['uploadedImage', 'uploadedImageMobile', 'videoThumbnail'];
var IMAGE_FIELDS_PAGE = ['headerBanner', 'headerBannerMobile'];
var IMAGE_FIELDS_STORE = ['headerBanner', 'headerBannerMobile'];

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
          if (json && json.data) resolved.set(h, json.data);
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

// Lädt eine Map von hash → dataUrl in den Server hoch. Jeder Upload ist
// ein eigener POST, damit jede Request weit unter dem 4,5 MB Limit bleibt.
// Bekannte Hashes werden serverseitig dedupliziert.
export async function uploadImages(images) {
  if (!images || images.size === 0) return { uploaded: 0, failed: [] };
  var entries = Array.from(images.entries());
  var failed = [];
  var uploaded = 0;
  var concurrency = 4;
  var idx = 0;

  async function worker() {
    while (idx < entries.length) {
      var myIdx = idx++;
      var pair = entries[myIdx];
      var hash = pair[0];
      var data = pair[1];
      try {
        var resp = await fetch('/api/store-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: hash, data: data }),
        });
        if (!resp.ok) {
          var msg = '';
          try { msg = (await resp.json()).error || ''; } catch (e) { /* ignore */ }
          failed.push({ hash: hash, status: resp.status, message: msg });
        } else {
          uploaded++;
        }
      } catch (e) {
        failed.push({ hash: hash, status: 0, message: e.message });
      }
    }
  }

  var workers = [];
  for (var w = 0; w < concurrency; w++) workers.push(worker());
  await Promise.all(workers);
  return { uploaded: uploaded, failed: failed };
}
