import { useState, useEffect } from 'react';

export default function Topbar({ store, onGenerate, onShowAsins, onShowPrice, onExport, onExportDocx, onSave, viewMode, onToggleView, onNewStore, onGoogleDriveChange, googleDriveUrl }) {
  var [showDriveInput, setShowDriveInput] = useState(false);
  var [driveUrl, setDriveUrl] = useState(googleDriveUrl || '');

  // Sync local state when prop changes (e.g. after loading a saved store)
  useEffect(function() { setDriveUrl(googleDriveUrl || ''); }, [googleDriveUrl]);

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

          {/* Google Drive URL */}
          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={function() { setShowDriveInput(!showDriveInput); }} title="Google Drive Link">
              Drive
            </button>
            {showDriveInput && (
              <div className="topbar-drive-dropdown">
                <div className="topbar-drive-label">Google Drive output folder URL</div>
                <input
                  className="input"
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={driveUrl}
                  onChange={function(e) { setDriveUrl(e.target.value); }}
                  onBlur={function() { if (onGoogleDriveChange) onGoogleDriveChange(driveUrl); }}
                  onKeyDown={function(e) { if (e.key === 'Enter') { if (onGoogleDriveChange) onGoogleDriveChange(driveUrl); setShowDriveInput(false); } }}
                  style={{ width: 300, fontSize: 11 }}
                />
                <div className="topbar-drive-hint">Designer will upload assets here</div>
              </div>
            )}
          </div>

          <button className="btn" onClick={onSave} title="Save">Save</button>
          <button className="btn btn-green" onClick={onExport} title="Generate share link for designer">Export</button>
          <button className="btn" onClick={onExportDocx} title="Download DOCX briefing">DOCX</button>
          <button className="btn" onClick={onNewStore} title="Start a new store">New Store</button>
        </>
      )}
      <button className="btn btn-primary" onClick={onGenerate}>Generate</button>
    </div>
  );
}
