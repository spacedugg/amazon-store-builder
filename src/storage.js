import { extractImagesFromStore, inflateImagesIntoStore, uploadImages } from './imageStorage';

var AUTOSAVE_KEY = 'amazon-store-builder-autosave';

// ─── TURSO API (primary) with localStorage fallback ───

export async function loadSavedStores() {
  try {
    var resp = await fetch('/api/stores');
    if (!resp.ok) throw new Error('API error');
    var json = await resp.json();
    return (json.stores || []).map(function(s) {
      return {
        id: s.id,
        brandName: s.brandName,
        marketplace: s.marketplace,
        savedAt: s.updatedAt || s.createdAt,
        pageCount: s.pageCount,
        productCount: s.productCount,
        shareToken: s.shareToken,
      };
    });
  } catch (e) {
    console.warn('DB load failed, using localStorage fallback:', e.message);
    try {
      var raw = localStorage.getItem('amazon-store-builder');
      if (!raw) return [];
      var stores = JSON.parse(raw);
      return Array.isArray(stores) ? stores : [];
    } catch (e2) { return []; }
  }
}

// Save store to DB. Pass existing id/shareToken to update rather than create.
// Throws on server errors so the caller can surface them to the user.
// Falls back to localStorage only if the network is completely unreachable.
//
// Vor dem POST werden alle Base64 Bilder aus dem Store ausgelagert in die
// store_images Tabelle, damit der eigentliche Store JSON Body weit unter
// dem 4,5 MB Vercel Limit bleibt.
export async function saveStore(store, existingId, existingShareToken) {
  // Bilder ausgliedern, hochladen, dann den schlanken Store schicken.
  var extracted = await extractImagesFromStore(store);
  var imagesUploaded = 0;
  if (extracted.images.size > 0) {
    var upResult = await uploadImages(extracted.images);
    imagesUploaded = upResult.uploaded;
    if (upResult.failed.length > 0) {
      // Wenn ein Bild Upload fehlschlägt, brechen wir den Save ab. Andernfalls
      // würde der Store mit nicht auflösbaren Sentinels gespeichert werden.
      var firstFail = upResult.failed[0];
      var err = new Error(
        'Bild Upload fehlgeschlagen (' + upResult.failed.length + ' von ' + extracted.images.size + ' Bildern). ' +
        'Erster Fehler: HTTP ' + firstFail.status + (firstFail.message ? ', ' + firstFail.message : '')
      );
      err.code = 'IMAGE_UPLOAD_FAILED';
      throw err;
    }
  }

  var body = { data: extracted.storeForWire };
  if (existingId) body.id = existingId;
  if (existingShareToken) body.shareToken = existingShareToken;
  var serialized = JSON.stringify(body);
  var sizeMb = serialized.length / 1024 / 1024;

  var resp;
  try {
    resp = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
    });
  } catch (networkErr) {
    // Echte Netzwerkstörung, fallback auf localStorage
    console.warn('Netzwerkfehler beim Save, nutze localStorage:', networkErr.message);
    return saveToLocalStorage(store, existingId);
  }

  if (resp.ok) {
    var json = await resp.json();
    return { id: json.id, shareToken: json.shareToken, imagesUploaded: imagesUploaded };
  }

  // Server hat geantwortet, aber mit Fehler. Echte Meldung holen.
  var serverMsg = '';
  try {
    var errJson = await resp.json();
    serverMsg = errJson.error || '';
  } catch (e) {
    try { serverMsg = await resp.text(); } catch (e2) { /* ignore */ }
  }

  if (resp.status === 413 || /payload.too.large|entity.too.large/i.test(serverMsg)) {
    var err = new Error(
      'Store ist zu groß für den Server (' + sizeMb.toFixed(1) + ' MB, Limit 4,5 MB). ' +
      'Vermutlich liegt das an Base64 Bildern im Store. ' +
      'Reduziere die Anzahl hochgeladener Bilder oder warte auf den Image Auslagerungs Fix.'
    );
    err.code = 'PAYLOAD_TOO_LARGE';
    err.sizeMb = sizeMb;
    throw err;
  }

  throw new Error(
    'Save fehlgeschlagen (HTTP ' + resp.status + ')' +
    (serverMsg ? ': ' + serverMsg : '') +
    ' [Payload ' + sizeMb.toFixed(1) + ' MB]'
  );
}

function saveToLocalStorage(store, existingId) {
  try {
    var id = existingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
    var stores = [];
    var raw = localStorage.getItem('amazon-store-builder');
    if (raw) stores = JSON.parse(raw);
    var idx = stores.findIndex(function(s) { return s.id === id; });
    var entry = {
      id: id,
      brandName: store.brandName,
      marketplace: store.marketplace || 'de',
      savedAt: new Date().toISOString(),
      pageCount: (store.pages || []).length,
      productCount: (store.products || []).length,
      data: store,
    };
    if (idx >= 0) stores[idx] = entry; else stores.unshift(entry);
    if (stores.length > 20) stores = stores.slice(0, 20);
    localStorage.setItem('amazon-store-builder', JSON.stringify(stores));
    return { id: id, shareToken: null, offline: true };
  } catch (e) {
    var err = new Error('localStorage Fallback fehlgeschlagen: ' + e.message);
    err.code = 'STORAGE_QUOTA';
    throw err;
  }
}

export async function loadStore(id) {
  try {
    var resp = await fetch('/api/stores?id=' + encodeURIComponent(id));
    if (!resp.ok) throw new Error('API error');
    var json = await resp.json();
    var data = json.data || null;
    if (data) data = await inflateImagesIntoStore(data);
    return { data: data, shareToken: json.shareToken || null };
  } catch (e) {
    console.warn('DB load failed, using localStorage fallback:', e.message);
    try {
      var raw = localStorage.getItem('amazon-store-builder');
      if (!raw) return { data: null, shareToken: null };
      var stores = JSON.parse(raw);
      var entry = stores.find(function(s) { return s.id === id; });
      return entry ? { data: entry.data, shareToken: null } : { data: null, shareToken: null };
    } catch (e2) { return { data: null, shareToken: null }; }
  }
}

export async function deleteSavedStore(id) {
  try {
    var resp = await fetch('/api/stores?id=' + encodeURIComponent(id), { method: 'DELETE' });
    if (!resp.ok) throw new Error('API error');
  } catch (e) {
    console.warn('DB delete failed, using localStorage fallback:', e.message);
    try {
      var raw = localStorage.getItem('amazon-store-builder');
      if (!raw) return;
      var stores = JSON.parse(raw).filter(function(s) { return s.id !== id; });
      localStorage.setItem('amazon-store-builder', JSON.stringify(stores));
    } catch (e2) { /* ignore */ }
  }
}

export async function loadStoreByShareToken(shareToken) {
  var resp;
  try {
    resp = await fetch('/api/stores?shareToken=' + encodeURIComponent(shareToken));
  } catch (networkErr) {
    throw new Error('Netzwerkfehler: API nicht erreichbar. Bitte prüfe deine Internetverbindung.');
  }
  if (!resp.ok) {
    var ct = resp.headers.get('content-type') || '';
    if (ct.indexOf('text/html') >= 0) {
      throw new Error('API-Endpoint nicht erreichbar (HTML statt JSON). Bitte Deployment prüfen.');
    }
    // Try to extract server error message
    var serverMsg = '';
    try {
      var errJson = await resp.json();
      serverMsg = errJson.error || '';
    } catch (e) { /* ignore */ }
    if (resp.status === 404) {
      throw new Error('Store nicht gefunden (404). ' + (serverMsg || 'Der Share-Token existiert nicht in der Datenbank.'));
    }
    if (resp.status === 500) {
      throw new Error('Serverfehler (500): ' + (serverMsg || 'Datenbank möglicherweise nicht konfiguriert.'));
    }
    throw new Error('HTTP ' + resp.status + (serverMsg ? ': ' + serverMsg : ''));
  }
  var ct = resp.headers.get('content-type') || '';
  if (ct.indexOf('text/html') >= 0) {
    throw new Error('API liefert HTML statt JSON. Der /api/stores Endpoint ist nicht korrekt deployed.');
  }
  var json = await resp.json();
  if (json && json.data) {
    json.data = await inflateImagesIntoStore(json.data);
  }
  return json;
}

// Import a store into your history by share link or token.
// Loads the store via shareToken, then saves a copy under your own id.
export async function importStoreByShareLink(input) {
  // Extract share token from URL or use raw token
  var token = input.trim();
  var match = token.match(/\/share\/([a-z0-9]+)/i);
  if (match) token = match[1];
  if (!token) return { error: 'Invalid link' };

  // Load store data via share token
  var storeData = await loadStoreByShareToken(token);
  if (!storeData || !storeData.data) return { error: 'Store not found' };

  // Save a copy to the database (generates a new id for the importer)
  var result = await saveStore(storeData.data, null, null);
  if (!result) return { error: 'Could not save imported store' };

  return { id: result.id, shareToken: result.shareToken, data: storeData.data };
}

// Fetch designer timer for a store by shareToken
export async function fetchDesignerTimer(shareToken) {
  if (!shareToken) return { seconds: 0, running: false };
  try {
    var resp = await fetch('/api/timer?shareToken=' + encodeURIComponent(shareToken));
    if (!resp.ok) return { seconds: 0, running: false };
    return resp.json();
  } catch (e) { return { seconds: 0, running: false }; }
}

// Auto-save stays in localStorage (frequent writes, no need for DB)
export function autoSave(store) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(store));
  } catch (e) { /* ignore */ }
}

export function loadAutoSave() {
  try {
    var raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
