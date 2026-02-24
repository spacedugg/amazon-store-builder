var STORAGE_KEY = 'amazon-store-builder';
var AUTOSAVE_KEY = 'amazon-store-builder-autosave';
var MAX_SAVED = 3;

export function loadSavedStores() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    var stores = JSON.parse(raw);
    return Array.isArray(stores) ? stores : [];
  } catch (e) { return []; }
}

// Manual save — creates a named entry
export function saveStore(store) {
  try {
    var stores = loadSavedStores();
    var entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      brandName: store.brandName,
      marketplace: store.marketplace || 'de',
      savedAt: new Date().toISOString(),
      pageCount: (store.pages || []).length,
      productCount: (store.products || []).length,
      data: store,
    };
    stores.unshift(entry);
    if (stores.length > MAX_SAVED) stores = stores.slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
    return entry.id;
  } catch (e) { console.warn('Save failed:', e.message); return null; }
}

// Auto-save — overwrites a single slot (no duplicates)
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

export function loadStore(id) {
  var stores = loadSavedStores();
  var entry = stores.find(function(s) { return s.id === id; });
  return entry ? entry.data : null;
}

export function deleteSavedStore(id) {
  try {
    var stores = loadSavedStores();
    stores = stores.filter(function(s) { return s.id !== id; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
  } catch (e) { console.warn('Delete failed:', e.message); }
}
