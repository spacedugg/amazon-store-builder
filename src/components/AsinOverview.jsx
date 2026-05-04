import { useState } from 'react';

// Sammelt alle ASINs aus dem Store: tile.asins (nur echte B0...), tile.linkAsin,
// tile.hotspots[].asin und store.asins[].asin. Gibt Liste plus Locations zurück.
function gatherStoreAsins(store) {
  var asins = {};
  (store.pages || []).forEach(function(pg, pi) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tl, ti) {
        (tl.asins || []).forEach(function(a) {
          if (a && typeof a === 'string' && a.indexOf('B0') === 0) {
            if (!asins[a]) asins[a] = [];
            asins[a].push({ page: pg.name, section: si + 1, tile: ti + 1, type: tl.type });
          }
        });
        if (tl.linkAsin) {
          if (!asins[tl.linkAsin]) asins[tl.linkAsin] = [];
          asins[tl.linkAsin].push({ page: pg.name, section: si + 1, tile: ti + 1, type: tl.type + ' link' });
        }
        (tl.hotspots || []).forEach(function(hs) {
          if (hs.asin) {
            if (!asins[hs.asin]) asins[hs.asin] = [];
            asins[hs.asin].push({ page: pg.name, section: si + 1, tile: ti + 1, type: 'hotspot' });
          }
        });
      });
    });
  });
  // Top Level store.asins als zusätzliche Quelle
  (store.asins || []).forEach(function(a) {
    var asin = typeof a === 'string' ? a : (a && a.asin);
    if (asin && !asins[asin]) asins[asin] = [];
  });
  return asins;
}

export default function AsinOverview({ store, products, onClose, onMoveAsin, onScrape, onSortAllByBsr }) {
  var [filter, setFilter] = useState('all');
  var [moveAsin, setMoveAsin] = useState(null);
  var [scraping, setScraping] = useState(false);
  var [scrapeMsg, setScrapeMsg] = useState('');
  var [sortMsg, setSortMsg] = useState('');

  if (!store || !store.pages || store.pages.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 600 }}>
          <div className="modal-header">
            <span>ASIN Overview</span>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div style={{ padding: 16, color: '#64748b' }}>No store generated yet.</div>
        </div>
      </div>
    );
  }

  // Alle ASINs im Store sammeln, plus Locations
  var asinLocations = gatherStoreAsins(store);
  var allAsins = Object.keys(asinLocations);

  // Wer hat Produktdaten, wer fehlt
  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });
  var withData = allAsins.filter(function(a) { return productMap[a]; });
  var withoutData = allAsins.filter(function(a) { return !productMap[a]; });

  var displayAsins = allAsins;
  if (filter === 'with') displayAsins = withData;
  if (filter === 'without') displayAsins = withoutData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span>ASIN Overview ({allAsins.length} ASINs im Store)</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Scrape Button plus Status */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {onScrape && (
              <button
                className="btn btn-primary"
                disabled={scraping || allAsins.length === 0}
                onClick={async function() {
                  // Bevorzugt fehlende ASINs scrapen, sonst alle
                  var list = withoutData.length > 0 ? withoutData : allAsins;
                  setScraping(true);
                  setScrapeMsg('Lade ' + list.length + ' ASINs von Amazon, kann mehrere Minuten dauern...');
                  try {
                    var result = await onScrape(list);
                    setScrapeMsg('Fertig: ' + (result && result.success || 0) + ' geladen, ' + (result && result.failed || 0) + ' fehlgeschlagen');
                  } catch (e) {
                    setScrapeMsg('Fehler: ' + e.message);
                  } finally {
                    setScraping(false);
                  }
                }}
                style={{ fontSize: 12, padding: '6px 14px' }}>
                {scraping ? 'Lade...' : (withoutData.length > 0 ? 'Fehlende ASINs laden (' + withoutData.length + ')' : 'Alle ASINs neu laden')}
              </button>
            )}
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Mit Produktdaten: <b>{withData.length}</b>, ohne: <b>{withoutData.length}</b>
            </span>
          </div>
          {scrapeMsg && (
            <div style={{ marginTop: 6, padding: '6px 8px', background: scrapeMsg.indexOf('Fehler') === 0 ? '#fee2e2' : '#dcfce7', borderRadius: 4, fontSize: 11, color: scrapeMsg.indexOf('Fehler') === 0 ? '#991b1b' : '#166534' }}>
              {scrapeMsg}
            </div>
          )}
          {/* Globale BSR Sortierung über alle Tiles mit ASIN Listen */}
          {onSortAllByBsr && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn"
                disabled={withData.length === 0}
                onClick={function() {
                  if (!confirm('Alle Bestseller, Product Grid, Recommended und Deals Tiles auf einmal nach Amazon BSR sortieren? ASINs ohne BSR Daten landen am Ende. Reihenfolge ist danach manuell weiter editierbar, läuft über Undo.')) return;
                  var stats = onSortAllByBsr();
                  if (stats.error) {
                    setSortMsg('Fehler: ' + stats.error);
                  } else if (stats.tilesUpdated === 0) {
                    setSortMsg('Schon korrekt sortiert oder keine Tiles mit ausreichenden BSR Daten gefunden');
                  } else {
                    setSortMsg('Fertig: ' + stats.tilesUpdated + ' Tile(s) sortiert, ' + stats.asinsRanked + ' von ' + stats.totalAsins + ' ASINs hatten BSR Daten');
                  }
                }}
                style={{ fontSize: 12, padding: '6px 14px', background: '#0369a1', color: '#fff', borderColor: '#0369a1' }}>
                Alle Tiles nach BSR sortieren
              </button>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Wendet Sortierung auf alle Bestseller, Product Grid, Recommended, Deals Tiles im Store an
              </span>
            </div>
          )}
          {sortMsg && (
            <div style={{ marginTop: 6, padding: '6px 8px', background: sortMsg.indexOf('Fehler') === 0 ? '#fee2e2' : '#dbeafe', borderRadius: 4, fontSize: 11, color: sortMsg.indexOf('Fehler') === 0 ? '#991b1b' : '#1e40af' }}>
              {sortMsg}
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { key: 'all', label: 'Alle (' + allAsins.length + ')' },
            { key: 'with', label: 'Mit Daten (' + withData.length + ')' },
            { key: 'without', label: 'Ohne Daten (' + withoutData.length + ')' },
          ].map(function(tab) {
            return (
              <button key={tab.key} onClick={function() { setFilter(tab.key); }}
                style={{
                  padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: filter === tab.key ? '#6366f1' : '#f1f5f9',
                  color: filter === tab.key ? '#fff' : '#475569',
                }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ASIN Liste */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
          {displayAsins.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              {filter === 'without' ? 'Alle ASINs haben Produktdaten' : 'Keine ASINs gefunden'}
            </div>
          )}
          {displayAsins.map(function(asin) {
            var prod = productMap[asin];
            var locations = asinLocations[asin] || [];
            var amazonUrl = (prod && prod.url) || ('https://www.amazon.de/dp/' + asin);
            var isMissingData = !prod;

            return (
              <div key={asin} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', marginBottom: 4,
                background: isMissingData ? '#fffbeb' : '#fff',
                border: '1px solid ' + (isMissingData ? '#fde68a' : '#e2e8f0'),
                borderRadius: 6,
              }}>
                {prod && prod.image ? (
                  <a href={amazonUrl} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                    <img src={prod.image} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 4 }} />
                  </a>
                ) : (
                  <div style={{ width: 44, height: 44, background: '#f1f5f9', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#94a3b8' }}>?</div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prod ? (prod.name || asin).slice(0, 60) : asin}
                  </div>
                  <a href={amazonUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#0369a1', fontFamily: 'monospace', textDecoration: 'none' }}>
                    {asin} &#8599;
                  </a>
                  {locations.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {locations.slice(0, 6).map(function(loc, li) {
                        return (
                          <span key={li} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#e0e7ff', color: '#4338ca' }}>
                            {loc.page} S{loc.section} T{loc.tile} ({loc.type})
                          </span>
                        );
                      })}
                      {locations.length > 6 && <span style={{ fontSize: 9, color: '#64748b' }}>+{locations.length - 6}</span>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
                      Nicht in einer Page verwendet
                    </div>
                  )}

                  {moveAsin === asin && onMoveAsin && (
                    <div style={{ marginTop: 6, padding: '6px 8px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>Move to page:</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {store.pages.map(function(pg) {
                          return (
                            <button key={pg.id} onClick={function() { onMoveAsin(asin, pg.id); setMoveAsin(null); }}
                              style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid #bfdbfe', background: '#fff', cursor: 'pointer', color: '#1e40af' }}>
                              {pg.name}
                            </button>
                          );
                        })}
                        <button onClick={function() { setMoveAsin(null); }}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {onMoveAsin && (
                  <button onClick={function() { setMoveAsin(moveAsin === asin ? null : asin); }}
                    style={{ padding: '4px 8px', fontSize: 10, borderRadius: 4, border: '1px solid #e2e8f0', background: moveAsin === asin ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', color: '#475569', flexShrink: 0 }}>
                    Move
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
