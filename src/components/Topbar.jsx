export default function Topbar({ store, onGenerate, onShowAsins, onShowPrice, onExport, onSave, viewMode, onToggleView, onNewStore }) {
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
          {/* Desktop / Mobile toggle */}
          <div className="view-toggle">
            <button className={'view-toggle-btn' + (viewMode === 'desktop' ? ' active' : '')} onClick={function() { onToggleView('desktop'); }} title="Desktop view">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor"><rect x="0" y="0" width="14" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className={'view-toggle-btn' + (viewMode === 'mobile' ? ' active' : '')} onClick={function() { onToggleView('mobile'); }} title="Mobile view">
              <svg width="9" height="14" viewBox="0 0 9 14" fill="currentColor"><rect x="0" y="0" width="9" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1"/></svg>
            </button>
          </div>
          <button className="btn" onClick={onShowAsins} title="ASIN Overview">ASINs ({(store.asins || []).length})</button>
          <button className="btn" onClick={onShowPrice} title="Price Estimate">&#8364;</button>
          <button className="btn" onClick={onSave} title="Save">Save</button>
          <button className="btn" onClick={onExport} title="Export DOCX">Export DOCX</button>
          <button className="btn" onClick={onNewStore} title="Start a new store">New Store</button>
        </>
      )}
      <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
    </div>
  );
}
