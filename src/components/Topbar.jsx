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
    font: 'inherit', fontWeight: 600, color: focused ? '#0f172a' : 'inherit',
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

// Selten gebrauchte Funktionen verstecken sich hier, damit die Leiste ruhig bleibt.
function MoreMenu({ items }) {
  var [open, setOpen] = useState(false);
  var [alignLeft, setAlignLeft] = useState(false);
  var list = items.filter(Boolean);
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button className="btn" onClick={function(e) { setAlignLeft(e.currentTarget.getBoundingClientRect().left < 240); setOpen(!open); }} title="Weitere Funktionen" aria-haspopup="menu" aria-expanded={open}>Mehr &#9662;</button>
      {open && (
        <>
          <div onClick={function() { setOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 150 }} />
          <div role="menu" style={{ position: 'absolute', [alignLeft ? 'left' : 'right']: 0, top: '100%', marginTop: 6, zIndex: 151, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: 6, minWidth: 230 }}>
            {list.map(function(it, i) {
              return (
                <button key={i} role="menuitem" onClick={function() { setOpen(false); it.onClick(); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontFamily: 'inherit', color: it.danger ? '#dc2626' : '#1e293b' }}
                  onMouseEnter={function(e) { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{it.label}</div>
                  {it.hint && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>{it.hint}</div>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function formatCustomerProgress(p) {
  if (!p) return '';
  if (p.stage === 'extract') return 'Bilder extrahieren...';
  if (p.stage === 'products') return 'Produktdaten ' + (p.done || 0) + ' / ' + (p.total || 0);
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

export default function Topbar({ store, shareToken, onExport, onSave, onShowJsonExport, viewMode, onToggleView, onNewStore, onPatchImport, onUndo, canUndo, onRedo, canRedo, onLoadProducts, onFolderImageUpload, onRemoveAllImages, folderInputRef, autoSaveStatus, hasShareToken, onCopyCustomerLink, customerSaveProgress, folderUploadProgress, onChangeBrandName, onShowFeedback, feedbackNew }) {
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

          <button className="btn" onClick={onUndo} disabled={!canUndo} title="Rückgängig (Strg+Z)">&#8630;</button>
          <button className="btn" onClick={onRedo} disabled={!canRedo} title="Wiederholen (Strg+Umschalt+Z)">&#8631;</button>
          {onFolderImageUpload && (
            <>
              <input type="file" ref={folderInputRef} style={{ display: 'none' }} webkitdirectory="" directory="" multiple
                onChange={function(e) { onFolderImageUpload(e.target.files); e.target.value = ''; }} />
              <button className="btn btn-folder"
                onClick={function() { folderInputRef.current && folderInputRef.current.click(); }}
                disabled={!!folderUploadProgress}
                title="Ordner mit fertigen Bildern hochladen. Die Bilder gehen direkt in den Cloud Speicher, danach ist der Store bereit für den Kunden."
                style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                {folderUploadProgress ? folderProgressLabel : 'Bilder hochladen'}
              </button>
            </>
          )}
          <span className="topbar-sep" />
          <AutoSaveBadge status={autoSaveStatus} hasShareToken={hasShareToken} />
          <button className="btn btn-green" onClick={onSave} title="Store im Backend speichern">Speichern</button>
          <span className="topbar-sep" />
          <button className="btn btn-primary" onClick={onExport} title="Briefing für den Designer: Share Link erzeugen oder als DOCX exportieren">Designer</button>
          <button className="btn btn-customer" onClick={onCopyCustomerLink}
            disabled={!onCopyCustomerLink || !!customerSaveProgress}
            title="Speichert den Store samt Bildern und zeigt den Link für den Kunden zum Kopieren."
            style={{ background: '#0F1111', color: '#fff', borderColor: '#0F1111' }}>
            {customerSaveProgress ? formatCustomerProgress(customerSaveProgress) : 'Kunden-Link'}
          </button>
          {onShowFeedback && (
            <button className="btn" onClick={onShowFeedback}
              title="Feedback, das der Kunde in der Vorschau hinterlassen hat">
              Feedback
              {feedbackNew > 0 && (
                <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 9, minWidth: 18, height: 18, padding: '0 5px', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{feedbackNew > 99 ? '99+' : feedbackNew}</span>
              )}
            </button>
          )}
          <MoreMenu items={[
            onShowJsonExport && { label: 'JSON / Refactor', hint: 'Backup als Datei oder Umbau mit KI', onClick: onShowJsonExport },
            onPatchImport && { label: '+ Snippet (Patch)', hint: 'Kleine Änderung per KI einspielen', onClick: onPatchImport },
            onLoadProducts && { label: 'Produktdaten laden', hint: 'Bild, Titel und Preis aller ASINs von Amazon holen', onClick: onLoadProducts },
            onRemoveAllImages && { label: 'Alle Bilder entfernen', danger: true, onClick: onRemoveAllImages },
          ]} />
        </>
      )}

      {!store.pages.length && (
        <button className="btn btn-primary" onClick={onNewStore} style={{ marginLeft: 4 }}>Neuer Store</button>
      )}
    </div>
  );
}
