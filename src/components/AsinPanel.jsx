export default function AsinPanel({ asins, pages, products, onClose }) {
  var used = {};
  var pageMap = {};
  pages.forEach(function(pg) {
    pg.sections.forEach(function(sec) {
      sec.tiles.forEach(function(t) {
        (t.asins || []).forEach(function(a) {
          used[a] = true;
          pageMap[a] = pg.name;
        });
      });
    });
  });

  var productMap = {};
  (products || []).forEach(function(p) { productMap[p.asin] = p; });

  var cats = {};
  asins.forEach(function(a) {
    var c = a.category || 'Uncategorized';
    if (!cats[c]) cats[c] = [];
    cats[c].push(a);
  });

  var totalCount = asins.length;
  var assignedCount = asins.filter(function(a) { return used[a.asin]; }).length;
  var unassignedCount = totalCount - assignedCount;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 600, maxHeight: '80vh' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ marginBottom: 2 }}>ASIN Overview</div>
            <div className="hint">
              {totalCount} total &middot;{' '}
              <span style={{ color: assignedCount === totalCount ? '#059669' : '#dc2626' }}>
                {unassignedCount} unassigned
              </span>
            </div>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="modal-scroll-body">
          {Object.keys(cats).sort().map(function(cat) {
            return (
              <div key={cat} className="asin-group">
                <div className="asin-group-header">{cat} ({cats[cat].length})</div>
                {cats[cat].map(function(a) {
                  var p = productMap[a.asin];
                  return (
                    <div key={a.asin} className="asin-row">
                      <span className={'asin-dot' + (used[a.asin] ? ' assigned' : ' unassigned')}></span>
                      <code className="asin-code">{a.asin}</code>
                      <span className="asin-name">{a.name || p?.name || '—'}</span>
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
