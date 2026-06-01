import { extractImagesFromStore, inflateImagesIntoStore, uploadImages } from './imageStorage';

var AUTOSAVE_KEY = 'amazon-store-builder-autosave';
var AUTOSAVE_META_KEY = 'amazon-store-builder-autosave-meta';

// Build a URL safe slug from a brand name. Diacritics werden in ASCII
// Ersatz aufgelöst (ä -> ae usw.), alles andere wird zu einem einzigen
// Bindestrich getrennten Lowercase Block. Liefert einen leeren String
// wenn der Name keine slugfähigen Zeichen enthält. Wird sowohl für die
// Customer URL als auch für die Slug Auflösung beim Laden benutzt, damit
// Konstruktion und Lookup garantiert dasselbe Ergebnis erzeugen.
export function brandToSlug(name) {
  if (!name) return '';
  var s = String(name).toLowerCase();
  s = s.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  s = s.normalize ? s.normalize('NFKD').replace(/[̀-ͯ]/g, '') : s;
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s;
}

// Liefert die oeffentliche Basis URL fuer geteilte Links (Designer Briefing
// und Customer Preview). Bewusst NICHT window.location.origin, weil das Tool
// haeufig auf einer geschuetzten *.vercel.app Deployment URL laeuft, die ein
// Vercel Login erzwingt. Geteilte Links muessen immer auf die oeffentliche
// Custom Domain zeigen, die im Vercel Projekt auf das Production Deployment
// gemappt ist. Ueber VITE_SHARE_BASE_URL ueberschreibbar (ohne abschliessenden
// Slash), faellt sonst auf die fest hinterlegte Domain zurueck.
export function shareBaseUrl() {
  var configured = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env.VITE_SHARE_BASE_URL
    : undefined;
  var base = configured || 'https://brand-store-preview.temoa.de';
  return String(base).replace(/\/+$/, '');
}

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
export async function saveStore(store, existingId, existingShareToken, onProgress) {
  // Bilder ausgliedern, hochladen, dann den schlanken Store schicken.
  if (typeof onProgress === 'function') onProgress({ stage: 'extract' });
  var extracted = await extractImagesFromStore(store);
  var imagesUploaded = 0;
  var imageFailures = [];
  var imagesSkipped = 0;
  if (extracted.images.size > 0) {
    if (typeof onProgress === 'function') onProgress({ stage: 'upload', uploaded: 0, total: extracted.images.size });
    var upResult = await uploadImages(extracted.images, function(p) {
      if (typeof onProgress === 'function') onProgress({ stage: 'upload', uploaded: p.uploaded, total: p.total, skipped: p.skipped, failed: p.failed });
    });
    imagesUploaded = upResult.uploaded;
    imageFailures = upResult.failed || [];
    imagesSkipped = upResult.skipped || 0;
    // Wir brechen den Save NICHT mehr bei einzelnen Bildfehlern ab. Stattdessen
    // wird der Store mit dem aktuellen Stand gespeichert, fehlende Bilder
    // bleiben als Sentinel im Store und werden beim naechsten Save erneut
    // versucht. Operator bekommt eine Warnung mit Anzahl und ersten Details.
  }

  var body = { data: extracted.storeForWire };
  if (existingId) body.id = existingId;
  if (existingShareToken) body.shareToken = existingShareToken;
  var serialized = JSON.stringify(body);
  var sizeMb = serialized.length / 1024 / 1024;

  if (typeof onProgress === 'function') onProgress({ stage: 'store-save', sizeMb: sizeMb });

  var resp;
  try {
    // 60 Sekunden Timeout. Wenn die Function laenger braucht, soll der
    // Benutzer eine klare Fehlermeldung sehen, statt unsichtbar zu warten.
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 60000);
    resp = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serialized,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (networkErr) {
    if (networkErr.name === 'AbortError') {
      var abortErr = new Error('Save Timeout, /api/stores hat innerhalb von 60 Sekunden nicht geantwortet. Bitte erneut versuchen.');
      abortErr.code = 'SAVE_TIMEOUT';
      throw abortErr;
    }
    // Echte Netzwerkstörung, fallback auf localStorage
    console.warn('Netzwerkfehler beim Save, nutze localStorage:', networkErr.message);
    return saveToLocalStorage(store, existingId);
  }

  if (resp.ok) {
    if (typeof onProgress === 'function') onProgress({ stage: 'done' });
    var json = await resp.json();
    return {
      id: json.id,
      shareToken: json.shareToken,
      imagesUploaded: imagesUploaded,
      imagesSkipped: imagesSkipped,
      imageFailures: imageFailures,
    };
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

export async function loadStoreBySlug(slug) {
  var resp;
  try {
    resp = await fetch('/api/stores?slug=' + encodeURIComponent(slug));
  } catch (networkErr) {
    throw new Error('Netzwerkfehler: API nicht erreichbar.');
  }
  if (!resp.ok) {
    var serverMsg = '';
    var available = [];
    try {
      var errJson = await resp.json();
      serverMsg = errJson.error || '';
      available = errJson.availableSlugs || [];
    } catch (e) { /* ignore */ }
    if (resp.status === 404) {
      var hint = available.length > 0
        ? '\n\nVerfügbare Stores: ' + available.map(function(s) { return s.slug; }).join(', ')
        : '';
      throw new Error('Store nicht gefunden für Slug ' + slug + '.' + hint);
    }
    throw new Error('HTTP ' + resp.status + (serverMsg ? ': ' + serverMsg : ''));
  }
  var json = await resp.json();
  if (json && json.data) {
    json.data = await inflateImagesIntoStore(json.data);
  }
  return json;
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
export function autoSave(store, meta) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(store));
    if (meta && meta.storeId) {
      localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify({
        storeId: meta.storeId,
        shareToken: meta.shareToken || null,
        savedAt: new Date().toISOString(),
      }));
    }
  } catch (e) { /* ignore */ }
}

export function loadAutoSave() {
  try {
    var raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function loadAutoSaveMeta() {
  try {
    var raw = localStorage.getItem(AUTOSAVE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

// Session pointer in sessionStorage so a tab reload keeps the same DB row,
// but a closed and reopened tab starts fresh. Holds only storeId and
// shareToken — the actual store data still flows through the DB load.
var SESSION_KEY = 'amazon-store-builder-session';

export function setSessionStore(storeId, shareToken) {
  try {
    if (storeId) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ storeId: storeId, shareToken: shareToken || null }));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (e) { /* ignore */ }
}

export function getSessionStore() {
  try {
    var raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
