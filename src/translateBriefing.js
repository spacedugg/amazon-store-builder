// Übersetzt designer facing Felder eines Stores ins Englische, ohne
// kundensichtbare Inhalte (textOverlay, Page Namen, Brand Namen) anzufassen.
// Sammelt erst alle Strings, schickt sie als ein Batch an /api/translate
// (server cached pro source Hash), schreibt das Ergebnis zurück.
//
// Aufruf nur im Designer Share View. Im internen Editor bleibt alles in
// Original Sprache.

// Pfade aus dem Store, deren String Wert übersetzt wird. Jeder Eintrag ist
// eine Funktion die den passenden Knoten zurückliefert. Wir nutzen einen
// gezielten Walker statt einer breiten Heuristik, damit nur designer
// facing Felder übersetzt werden und Bildtexte/Navigation original bleiben.

function pickStringRefs(store) {
  var refs = []; // Array von { get: fn, set: fn }

  function fieldRef(obj, key) {
    if (!obj || typeof obj !== 'object') return;
    var v = obj[key];
    if (typeof v !== 'string' || !v.trim()) return;
    refs.push({ get: function() { return obj[key]; }, set: function(nv) { obj[key] = nv; } });
  }

  function arrayStringRef(obj, key) {
    if (!obj || !Array.isArray(obj[key])) return;
    var arr = obj[key];
    arr.forEach(function(item, idx) {
      if (typeof item !== 'string' || !item.trim()) return;
      refs.push({ get: function() { return arr[idx]; }, set: function(nv) { arr[idx] = nv; } });
    });
  }

  // Store level designer context
  fieldRef(store, 'brandStory');
  fieldRef(store, 'brandTone');
  fieldRef(store, 'heroMessage');

  if (store.manualCI) {
    fieldRef(store.manualCI, 'notes');
    fieldRef(store.manualCI, 'brandTone');
  }

  if (store.productCI) {
    fieldRef(store.productCI, 'designerNotes');
    fieldRef(store.productCI, 'visualMood');
    fieldRef(store.productCI, 'backgroundPattern');
    fieldRef(store.productCI, 'typographyStyle');
    fieldRef(store.productCI, 'photographyStyle');
    arrayStringRef(store.productCI, 'recurringElements');
  }

  if (store.websiteData) {
    fieldRef(store.websiteData, 'aboutText');
    if (store.websiteData.aiAnalysis) {
      var a = store.websiteData.aiAnalysis;
      fieldRef(a, 'brandStory');
      fieldRef(a, 'targetAudience');
      fieldRef(a, 'visualStyle');
      fieldRef(a, 'sustainabilityFocus');
      arrayStringRef(a, 'brandValues');
      arrayStringRef(a, 'keyIngredients');
    }
  }
  if (store.analysis) {
    fieldRef(store.analysis, 'brandStory');
    fieldRef(store.analysis, 'brandTone');
    fieldRef(store.analysis, 'targetAudience');
  }

  // Pages: heroBannerBrief
  // KEIN page.name, KEIN heroBannerTextOverlay
  if (Array.isArray(store.pages)) {
    store.pages.forEach(function(page) {
      if (!page) return;
      fieldRef(page, 'heroBannerBrief');
      if (!Array.isArray(page.sections)) return;
      page.sections.forEach(function(sec) {
        if (!sec || !Array.isArray(sec.tiles)) return;
        sec.tiles.forEach(function(tile) {
          if (!tile) return;
          // Tile brief, der Designer Brief Text
          fieldRef(tile, 'brief');
          // KEIN tile.textOverlay (Bildtexte bleiben Original)
          // KEIN tile.linkAsin / linkUrl
          // KEIN tile.imageRef
        });
      });
    });
  }

  return refs;
}

// Ruft /api/translate für die Source Texte auf und schreibt die Übersetzungen
// in eine Kopie des Stores. Bei API Fehlern wird der Original Store
// zurückgegeben (Fail open, der Designer sieht dann eben Deutsch).
export async function translateStoreForDesigner(store, targetLang) {
  if (!store) return store;
  var lang = targetLang || 'en';
  // Deep clone damit der Original Store unangetastet bleibt
  var clone = JSON.parse(JSON.stringify(store));
  var refs = pickStringRefs(clone);
  if (refs.length === 0) return clone;

  var sources = refs.map(function(r) { return r.get(); });

  try {
    var resp = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: sources, targetLang: lang }),
    });
    if (!resp.ok) {
      console.warn('translate api error:', resp.status);
      return clone;
    }
    var json = await resp.json();
    var translations = (json && Array.isArray(json.translations)) ? json.translations : null;
    if (!translations || translations.length !== refs.length) {
      console.warn('translate api length mismatch');
      return clone;
    }
    refs.forEach(function(ref, i) {
      var t = translations[i];
      if (typeof t === 'string' && t.trim()) ref.set(t);
    });
    return clone;
  } catch (e) {
    console.warn('translate fetch failed:', e.message);
    return clone;
  }
}
