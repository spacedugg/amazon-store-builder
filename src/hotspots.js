// Hotspots einer shoppable_image Kachel. Gemeinsam fuer Editor, Preview und
// Customer Preview, damit ueberall dieselben Punkte erscheinen.
//
// Hat die Kachel von Hand gesetzte Hotspots, gelten diese. Sonst gibt es je
// verknuepftem Produkt einen Standard Punkt, gleichmaessig verteilt, damit
// man sofort sieht, wo die Produkte haengen (und der Punkt in der Preview
// nicht fehlt, nur weil noch niemand ihn verschoben hat).
export function effectiveShoppableHotspots(tile) {
  if (!tile) return [];
  if (Array.isArray(tile.hotspots) && tile.hotspots.length > 0) return tile.hotspots;
  var asins = [];
  if (tile.linkAsin) asins.push(tile.linkAsin);
  (tile.asins || []).forEach(function(a) {
    if (a && asins.indexOf(a) < 0) asins.push(a);
  });
  if (asins.length === 0) return [];
  return asins.map(function(asin, i) {
    var n = asins.length;
    var x = ((i + 1) / (n + 1)) * 100;
    return { asin: asin, x: x, y: 50 };
  });
}
