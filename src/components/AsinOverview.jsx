import { useState } from 'react';
import { checkAsinCompleteness } from '../contentPipeline';

export default function AsinOverview({ store, products, onClose, onMoveAsin }) {
  var [filter, setFilter] = useState('all'); // 'all', 'missing', 'found'
  var [moveAsin, setMoveAsin] = useState(null); // asin being moved

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

  var inputAsins = (products || []).map(function(p) { return p.asin; });
  var check = checkAsinCompleteness(inputAsins, store.pages);
  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });

  var displayAsins = inputAsins;
  if (filter === 'missing') displayAsins = check.missing;
  if (filter === 'found') displayAsins = check.found.map(function(f) { return f.asin; });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <span>ASIN Overview ({inputAsins.length} products)</span>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {/* Summary bar */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: check.complete ? '#f0fdf4' : '#fef2f2', borderBottom: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: check.complete ? '#166534' : '#991b1b' }}>
            {check.complete
              ? 'All ' + inputAsins.length + ' ASINs found in the store'
              : check.missing.length + ' ASINs missing from the store!'}
          </span>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 2, padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { key: 'all', label: 'All (' + inputAsins.length + ')' },
            { key: 'found', label: 'Found (' + check.found.length + ')' },
            { key: 'missing', label: 'Missing (' + check.missing.length + ')' },
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

        {/* ASIN list */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
          {displayAsins.map(function(asin) {
            var prod = productMap[asin];
            var locations = check.asinLocations[asin] || [];
            var isMissing = locations.length === 0;

            return (
              <div key={asin} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', marginBottom: 4,
                background: isMissing ? '#fef2f2' : '#fff',
                border: '1px solid ' + (isMissing ? '#fecaca' : '#e2e8f0'),
                borderRadius: 6,
              }}>
                {/* Product image */}
                {prod && prod.image && (
                  <img src={prod.image} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
                )}

                {/* Product info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {prod ? prod.name.slice(0, 60) : asin}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{asin}</div>

                  {/* Locations */}
                  {locations.length > 0 ? (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                      {locations.map(function(loc, li) {
                        return (
                          <span key={li} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, background: '#e0e7ff', color: '#4338ca' }}>
                            {loc.page} S{loc.section} T{loc.tile} ({loc.type})
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, marginTop: 2 }}>
                      Not found in any page
                    </div>
                  )}

                  {/* Move ASIN dropdown */}
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

                {/* Move button */}
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
