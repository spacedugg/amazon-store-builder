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
export async function saveStore(store, existingId, existingShareToken) {
  try {
    var body = { data: store };
    if (existingId) body.id = existingId;
    if (existingShareToken) body.shareToken = existingShareToken;
    var resp = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('API error');
    var json = await resp.json();
    return { id: json.id, shareToken: json.shareToken };
  } catch (e) {
    console.warn('DB save failed, using localStorage fallback:', e.message);
    try {
      var id = existingId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      var stores = [];
      var raw = localStorage.getItem('amazon-store-builder');
      if (raw) stores = JSON.parse(raw);
      // Update existing or add new
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
      if (idx >= 0) {
        stores[idx] = entry;
      } else {
        stores.unshift(entry);
      }
      if (stores.length > 20) stores = stores.slice(0, 20);
      localStorage.setItem('amazon-store-builder', JSON.stringify(stores));
      return { id: id, shareToken: null };
    } catch (e2) { return null; }
  }
}

export async function loadStore(id) {
  try {
    var resp = await fetch('/api/stores?id=' + encodeURIComponent(id));
    if (!resp.ok) throw new Error('API error');
    var json = await resp.json();
    return { data: json.data || null, shareToken: json.shareToken || null };
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
  var resp = await fetch('/api/stores?shareToken=' + encodeURIComponent(shareToken));
  if (!resp.ok) return null;
  var json = await resp.json();
  return json;
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
