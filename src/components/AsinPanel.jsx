export default function AsinPanel({ asins, pages, products, requestedAsins, onClose }) {
  // Build usage map
  var used = {};
  var pageMap = {};
  pages.forEach(function(pg) {
    pg.sections.forEach(function(sec) {
      sec.tiles.forEach(function(t) {
        (t.asins || []).forEach(function(a) { used[a] = true; pageMap[a] = pg.name; });
      });
    });
  });

  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });

  // Determine statuses
  var scrapedAsins = (products || []).map(function(p) { return p.asin; });
  var allRequested = requestedAsins || scrapedAsins;
  var failedAsins = allRequested.filter(function(a) { return scrapedAsins.indexOf(a) < 0; });

  var cats = {};
  asins.forEach(function(a) {
    var c = a.category || 'Uncategorized';
    if (!cats[c]) cats[c] = [];
    cats[c].push(a);
  });

  var totalRequested = allRequested.length;
  var scrapedCount = scrapedAsins.length;
  var assignedCount = asins.filter(function(a) { return used[a.asin]; }).length;
  var unassignedCount = asins.length - assignedCount;
  var failedCount = failedAsins.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 650, maxHeight: '85vh' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ marginBottom: 4 }}>ASIN Overview</div>
            <div className="asin-stats">
              <span className="asin-stat">Requested: <b>{totalRequested}</b></span>
              <span className="asin-stat stat-ok">Scraped: <b>{scrapedCount}</b></span>
              <span className={'asin-stat' + (assignedCount === scrapedCount ? ' stat-ok' : ' stat-warn')}>
                Integrated: <b>{assignedCount}</b>
              </span>
              {unassignedCount > 0 && <span className="asin-stat stat-warn">Unassigned: <b>{unassignedCount}</b></span>}
              {failedCount > 0 && <span className="asin-stat stat-err">Failed: <b>{failedCount}</b></span>}
            </div>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

        <div className="modal-scroll-body">
          {/* Failed ASINs */}
          {failedCount > 0 && (
            <div className="asin-group">
              <div className="asin-group-header asin-group-failed">Failed to scrape ({failedCount})</div>
              {failedAsins.map(function(a) {
                return (
                  <div key={a} className="asin-row">
                    <span className="asin-dot failed"></span>
                    <code className="asin-code">{a}</code>
                    <span className="asin-name asin-failed-label">Not found on Amazon</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Categorized ASINs */}
          {Object.keys(cats).sort().map(function(cat) {
            return (
              <div key={cat} className="asin-group">
                <div className="asin-group-header">{cat} ({cats[cat].length})</div>
                {cats[cat].map(function(a) {
                  var p = productMap[a.asin];
                  var status = used[a.asin] ? 'integrated' : 'unassigned';
                  return (
                    <div key={a.asin} className="asin-row">
                      <span className={'asin-dot ' + status}></span>
                      <code className="asin-code">{a.asin}</code>
                      <span className="asin-name">{a.name || (p && p.name) || '—'}</span>
                      {p && p.price > 0 && <span className="asin-price">{p.currency || '€'}{p.price}</span>}
                      {pageMap[a.asin] && <span className="asin-page">{pageMap[a.asin]}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
