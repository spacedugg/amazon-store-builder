export default function AsinPanel({ asins, pages, onClose }) {
  const used = {};
  pages.forEach(pg => pg.sections.forEach(sec => sec.tiles.forEach(t => (t.asins || []).forEach(a => { used[a] = true; }))));

  const cats = {};
  asins.forEach(a => {
    const c = a.category || 'Uncategorized';
    if (!cats[c]) cats[c] = [];
    cats[c].push(a);
  });

  const unassigned = asins.filter(a => !used[a.asin]).length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, maxWidth: 580, width: '95%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 32px rgba(0,0,0,.2)' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>📦 ASIN Overview</div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {asins.length} total · <span style={{ color: unassigned ? '#dc2626' : '#059669' }}>{unassigned} unassigned</span>
            </div>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {Object.keys(cats).sort().map(cat => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #f0f0f0', paddingBottom: 2, marginBottom: 3 }}>
                {cat} ({cats[cat].length})
              </div>
              {cats[cat].map(a => (
                <div key={a.asin} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11 }}>
                  <span style={{ color: used[a.asin] ? '#059669' : '#dc2626', fontSize: 8 }}>●</span>
                  <code style={{ background: '#f5f5f5', padding: '0 3px', borderRadius: 2, fontSize: 10 }}>{a.asin}</code>
                  <span style={{ flex: 1, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name || '—'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
