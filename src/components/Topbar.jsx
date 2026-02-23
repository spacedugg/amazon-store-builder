export default function Topbar({ store, onGenerate, onShowAsins, onExport }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-icon">&#x1F3EA;</span>
        <span className="topbar-title"><span style={{ color: '#FF9900' }}>Store</span> Builder</span>
      </div>
      {store.brandName && (
        <div className="topbar-info">
          {store.brandName} &middot; {(store.products || []).length} products &middot; {(store.pages || []).length} pages
        </div>
      )}
      <div style={{ flex: 1 }} />
      {store.pages.length > 0 && (
        <>
          <button className="btn" onClick={onShowAsins} title="ASIN Overview">
            ASINs ({(store.asins || []).length})
          </button>
          <button className="btn" onClick={onExport} title="Export Designer Briefing">
            Export DOCX
          </button>
        </>
      )}
      <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
    </div>
  );
}
