import { useState, useEffect } from 'react';
import { brandToSlug } from '../storage';

// Inline editierbarer Brand Name. Klickt der Operator auf das Feld, kann er
// den Namen tippen. Der Slug wird live unter dem Feld angezeigt, damit klar
// ist welche Customer URL beim nächsten Save herauskommt.
function BrandNameField({ value, onChange }) {
  var [draft, setDraft] = useState(value || '');
  var [focused, setFocused] = useState(false);
  useEffect(function() { setDraft(value || ''); }, [value]);
  var slug = brandToSlug(draft);
  function commit() {
    setFocused(false);
    var next = draft.trim();
    if (next !== (value || '')) onChange(next);
  }
  var inputStyle = {
    background: focused ? '#fff' : 'transparent',
    border: '1px solid ' + (focused ? '#cbd5e1' : 'transparent'),
    borderRadius: 4, padding: '2px 6px',
    font: 'inherit', fontWeight: 600, color: '#0f172a',
    minWidth: 80, maxWidth: 220,
  };
  return (
    <div className="topbar-brand-name" style={{ display: 'inline-flex', alignItems: 'center' }}>
      <input value={draft}
        placeholder="Brand-Name"
        onChange={function(e) { setDraft(e.target.value); }}
        onFocus={function() { setFocused(true); }}
        onBlur={commit}
        onKeyDown={function(e) { if (e.key === 'Enter') e.target.blur(); }}
        style={inputStyle} />
      {slug && (
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }} title="Customer URL Pfad nach dem nächsten Save">/{slug}</span>
      )}
    </div>
  );
}

function AutoSaveBadge({ status, hasShareToken }) {
  if (hasShareToken) {
    return <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }} title="Designer Link aktiv, Autosave deaktiviert. Bitte manuell speichern, sobald du fertig bist.">Manuell</span>;
  }
  if (status === 'saving') return <span style={{ fontSize: 10, color: '#6b7280', marginRight: 6 }}>Speichert...</span>;
  if (status === 'saved') return <span style={{ fontSize: 10, color: '#16a34a', marginRight: 6 }}>Gespeichert</span>;
  if (status === 'error') return <span style={{ fontSize: 10, color: '#dc2626', marginRight: 6 }} title="Autosave fehlgeschlagen, bitte manuell speichern und Console prüfen">Autosave Fehler</span>;
  return <span style={{ fontSize: 10, color: '#9ca3af', marginRight: 6 }}>Auto</span>;
}

function formatCustomerProgress(p) {
  if (!p) return '';
  if (p.stage === 'extract') return 'Bilder extrahieren...';
  if (p.stage === 'upload') {
    if (!p.total) return 'Store speichern...';
    var label = 'Bilder ' + (p.uploaded || 0) + ' / ' + p.total;
    if (p.failed) label += ' (' + p.failed + ' Fehler)';
    return label;
  }
  if (p.stage === 'store-save') return 'Store speichern...';
  if (p.stage === 'done') return 'Fertig';
  return 'Speichere...';
}

export default function Topbar({ store, shareToken, onExport, onSave, onShowJsonExport, viewMode, onToggleView, onNewStore, onPatchImport, onUndo, canUndo, onRedo, canRedo, onShowPrice, onShowAsinOverview, onFolderImageUpload, onRemoveAllImages, folderInputRef, autoSaveStatus, hasShareToken, onCopyCustomerLink, customerSaveProgress, folderUploadProgress, onChangeBrandName }) {
  var folderProgressLabel = '';
  if (folderUploadProgress) {
    folderProgressLabel = 'Bilder ' + (folderUploadProgress.uploaded || 0) + ' / ' + folderUploadProgress.total;
    if (folderUploadProgress.failed) folderProgressLabel += ' (' + folderUploadProgress.failed + ' Fehler)';
  }
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-icon">&#x1F3EA;</span>
        <span className="topbar-title"><span style={{ color: '#FF9900' }}>Store</span> Builder</span>
      </div>
      {onChangeBrandName ? (
        <div className="topbar-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrandNameField value={store.brandName || ''} onChange={onChangeBrandName} />
          {((store.products || []).length > 0 || (store.pages || []).length > 0) && (
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {(store.products || []).length} products &middot; {(store.pages || []).length} pages
            </span>
          )}
        </div>
      ) : store.brandName && (
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
              <button className="btn"
                onClick={function() { folderInputRef.current && folderInputRef.current.click(); }}
                disabled={!!folderUploadProgress}
                title={folderUploadProgress ? 'Lade Bilder nach Vercel Blob hoch' : 'Bilder Ordner hochladen. Jedes Bild geht direkt in den Cloud Speicher, der Store ist danach sofort bereit fuer Customer.'}
                style={{ background: '#f59e0b', color: '#fff', border: 'none', minWidth: folderUploadProgress ? 130 : undefined, paddingLeft: folderUploadProgress ? 10 : undefined, paddingRight: folderUploadProgress ? 10 : undefined, fontSize: 11 }}>
                {folderUploadProgress ? folderProgressLabel : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                )}
              </button>
            </>
          )}
          {onRemoveAllImages && (
            <button className="btn" onClick={onRemoveAllImages} title="Remove all images" style={{ fontSize: 10, padding: '4px 8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
            </button>
          )}
          <AutoSaveBadge status={autoSaveStatus} hasShareToken={hasShareToken} />
          <button className="btn btn-green" onClick={onSave} title="Store im Backend speichern">Save</button>
          {onShowJsonExport && (
            <button className="btn" onClick={onShowJsonExport} title="Store als JSON Datei runterladen. Zwei Use Cases: lokales Backup ODER kompletter Refactor mit KI (Skill Refactor Mode, alle Pages werden nach aktuellen Skill Regeln neu generiert)." style={{ fontSize: 11 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 3 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              JSON / Refactor
            </button>
          )}
          <button className="btn btn-primary" onClick={onExport} title="Designer Briefing als DOCX exportieren oder Share Link generieren">Export</button>
          <button className="btn" onClick={onCopyCustomerLink}
            disabled={!onCopyCustomerLink || !!customerSaveProgress}
            title="Speichert den Store inkl. hochgeladenen Bildern und kopiert den Customer Preview Link. Premium Amazon Brand Store Vorschau ohne Designer Tools, ideal fuer Unternehmenskunden."
            style={{ fontSize: 11, background: '#0F1111', color: '#fff', borderColor: '#0F1111', minWidth: customerSaveProgress ? 140 : undefined }}>
            {customerSaveProgress ? formatCustomerProgress(customerSaveProgress) : 'Customer'}
          </button>
          {onShowAsinOverview && (
            <button className="btn" onClick={onShowAsinOverview} title="ASIN Übersicht aller Stores plus BSR Sortierung" style={{ fontSize: 11 }}>ASINs</button>
          )}
          <button className="btn" onClick={onShowPrice} title="Preis Kalkulator" style={{ fontSize: 11 }}>&#128176;</button>
          {onPatchImport && (
            <button className="btn" onClick={onPatchImport} title="Patch Mode: kleine Änderung am Store mit KI. Claude generiert Operationen (Section ergänzen, Tile ändern), die additiv auf den bestehenden Store angewendet werden. Bestehende Edits bleiben erhalten." style={{ fontSize: 11 }}>+ Snippet (Patch)</button>
          )}
          <button className="btn" onClick={onNewStore} title="Neuen Store von Grund auf erstellen, bestehender Store wird ersetzt">New Store</button>
        </>
      )}

      {!store.pages.length && (
        <button className="btn btn-primary" onClick={onNewStore} style={{ marginLeft: 4 }}>Neuer Store</button>
      )}
    </div>
  );
}
