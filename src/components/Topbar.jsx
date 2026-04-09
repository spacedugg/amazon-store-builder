export default function Topbar({ store, onGenerate, onExport, onSave, viewMode, onToggleView, onNewStore, onUndo, canUndo, onRedo, canRedo, onShowPrice, onFolderImageUpload, onRemoveAllImages, folderInputRef }) {
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

          <button className="btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button className="btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
            </svg>
          </button>
          {onFolderImageUpload && (
            <>
              <input type="file" ref={folderInputRef} style={{ display: 'none' }} webkitdirectory="" directory="" multiple
                onChange={function(e) { onFolderImageUpload(e.target.files); e.target.value = ''; }} />
              <button className="btn" onClick={function() { folderInputRef.current && folderInputRef.current.click(); }} title="Load image folder" style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
              </button>
            </>
          )}
          {onRemoveAllImages && (
            <button className="btn" onClick={onRemoveAllImages} title="Remove all images" style={{ fontSize: 10, padding: '4px 8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          )}
          <button className="btn btn-green" onClick={onSave} title="Save store">Save</button>
          <button className="btn btn-primary" onClick={onExport} title="Generate share link for designer">Export</button>
          <button className="btn" onClick={onShowPrice} title="Price calculator" style={{ fontSize: 11 }}>&#128176;</button>
          <button className="btn" onClick={onNewStore} title="Start a new store">New Store</button>
        </>
      )}

      <button className="btn btn-primary" onClick={onGenerate} style={store.pages.length > 0 ? { marginLeft: 4 } : {}}>Generate</button>
    </div>
  );
}
