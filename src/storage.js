var STORAGE_KEY = 'amazon-store-builder';
var MAX_SAVED = 3;

export function loadSavedStores() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    var stores = JSON.parse(raw);
    return Array.isArray(stores) ? stores : [];
  } catch (e) {
    return [];
  }
}

export function saveStore(store) {
  try {
    var stores = loadSavedStores();
    // Remove existing store with same brand + timestamp combo
    var entry = {
      id: store.id || Date.now().toString(36),
      brandName: store.brandName,
      marketplace: store.marketplace || 'de',
      savedAt: new Date().toISOString(),
      pageCount: (store.pages || []).length,
      productCount: (store.products || []).length,
      data: store,
    };
    // Prepend
    stores.unshift(entry);
    // Keep only last MAX_SAVED
    if (stores.length > MAX_SAVED) stores = stores.slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
    return entry.id;
  } catch (e) {
    console.warn('Failed to save store:', e.message);
    return null;
  }
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
  } catch (e) {
    console.warn('Failed to delete store:', e.message);
  }
}
