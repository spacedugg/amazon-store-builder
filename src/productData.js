// Produktdaten (Hauptbild, Titel, Preis) der ASINs eines Stores.
// Quelle ist Bright Data ueber /api/amazon-search; das Ergebnis steht in store.products.

import { DOMAINS } from './constants';

// Alle ASINs, die im Store vorkommen: Kacheln, Hotspots, Produktauswahl und die Liste store.asins.
export function gatherStoreAsins(store) {
  var seen = {};
  var out = [];
  function add(a) {
    if (a && typeof a === 'string' && /^[A-Z0-9]{10}$/i.test(a) && !seen[a.toUpperCase()]) {
      seen[a.toUpperCase()] = true; out.push(a.toUpperCase());
    }
  }
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      (sec.tiles || []).forEach(function(tl) {
        (tl.asins || []).forEach(add);
        add(tl.linkAsin);
        (tl.hotspots || []).forEach(function(hs) { add(hs && hs.asin); });
        var ps = tl.productSelector;
        if (ps) {
          (ps.asins || []).forEach(add);
          (ps.products || []).forEach(function(x) { add(typeof x === 'string' ? x : x && x.asin); });
        }
      });
    });
  });
  (store.asins || []).forEach(function(a) { add(typeof a === 'string' ? a : a && a.asin); });
  return out;
}

// Fehlt noch etwas fuer die Anzeige? Aeltere Abrufe kannten den Preis noch nicht (kein Feld "price").
export function productIsComplete(p) {
  return !!(p && typeof p.image === 'string' && p.image && Object.prototype.hasOwnProperty.call(p, 'price'));
}

export function missingProductAsins(store) {
  var map = {};
  (store.products || []).forEach(function(p) { if (p && p.asin) map[String(p.asin).toUpperCase()] = p; });
  return gatherStoreAsins(store).filter(function(a) { return !productIsComplete(map[a]); });
}

// Nur im Store platzierte ASINs brauchen Daten fuer die Vorschau. Die allgemeine
// Import-/Produktliste bleibt erhalten, darf aber keine entfernte Kachel blockieren.
export function missingUsedProductAsins(store) {
  return missingProductAsins(Object.assign({}, store, { asins: [] }));
}

export function productDataWarning(store) {
  var missing = missingUsedProductAsins(store);
  return missing.length
    ? 'Produktdaten fehlen für ' + missing.join(', ') + '. Änderungen können trotzdem gespeichert werden. Unter „ASIN Übersicht“ die Produktdaten nachladen und danach speichern.'
    : '';
}

// Holt die Daten in kleinen Paketen, damit ein Fehler nicht alles kostet.
// onProgress({ done, total }) wird nach jedem Paket gerufen. Gibt { products, failed } zurueck.
export async function fetchProductData(asins, marketplace, onProgress) {
  asins = Array.from(new Set(asins.map(function(a) { return String(a).trim().toUpperCase(); })));
  var domain = DOMAINS[marketplace] || DOMAINS.de;
  var products = [];
  var failed = [];
  var failures = [];
  var seen = {};
  var CHUNK = 12;
  for (var i = 0; i < asins.length; i += CHUNK) {
    var part = asins.slice(i, i + CHUNK);
    try {
      var resp = await fetch('/api/amazon-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asins: part, domain: domain }),
      });
      if (!resp.ok) {
        var e = await resp.json().catch(function() { return {}; });
        throw new Error((e.error || 'Abruf fehlgeschlagen') + (e.hint ? ' ' + e.hint : ''));
      }
      var json = await resp.json();
      var got = (json.products || []).filter(function(p) {
        var asin = p && String(p.asin || '').toUpperCase();
        if (part.indexOf(asin) === -1 || !productIsComplete(p) || seen[asin]) return false;
        seen[asin] = true;
        return true;
      });
      products = products.concat(got);
      var gotAsins = {};
      got.forEach(function(p) { gotAsins[String(p.asin).toUpperCase()] = true; });
      part.forEach(function(a) {
        if (gotAsins[a]) return;
        failed.push(a);
        var detail = (json.failed || []).find(function(f) { return String(f.asin || '').toUpperCase() === a; });
        failures.push({ asin: a, reason: detail && detail.reason || 'Keine vollstaendigen Produktdaten erhalten.' });
      });
    } catch (err) {
      part.forEach(function(a) { failed.push(a); failures.push({ asin: a, reason: err.message || 'Abruf fehlgeschlagen.' }); });
    }
    if (onProgress) onProgress({ done: Math.min(asins.length, i + CHUNK), total: asins.length });
  }
  return { products: products, failed: failed, failures: failures };
}

export function formatProductFailures(failures) {
  var groups = new Map();
  (failures || []).forEach(function(f) {
    var reason = f.reason || 'Keine verwertbaren Produktdaten erhalten.';
    if (!groups.has(reason)) groups.set(reason, []);
    groups.get(reason).push(f.asin);
  });
  return Array.from(groups, function(entry) { return entry[1].join(', ') + ': ' + entry[0]; }).join('\n\n');
}

export function mergeProducts(existing, fresh) {
  var map = {};
  var order = [];
  (existing || []).forEach(function(p) { if (p && p.asin) { map[p.asin] = p; order.push(p.asin); } });
  (fresh || []).forEach(function(p) { if (p && p.asin) { if (!map[p.asin]) order.push(p.asin); map[p.asin] = p; } });
  return order.map(function(a) { return map[a]; });
}


