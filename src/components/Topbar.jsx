import { useEffect, useId, useRef, useState } from 'react';
import StoreDriveExport from './StoreDriveExport';
import StoreReferenceLibraryButton from './StoreReferenceLibrary';

function ToolbarIcon({ name }) {
  const paths = {
    desktop: 'M2 3h16v11H2z M7 17h6 M10 14v3',
    mobile: 'M6 2h8v16H6z M9 15h2',
    undo: 'M8 4 3 9l5 5 M3 9h9a5 5 0 0 1 5 5v2',
    redo: 'm12 4 5 5-5 5 M17 9H8a5 5 0 0 0-5 5v2',
    customer: 'M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z M10 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    designer: 'm3 13 10-10 4 4L7 17H3z m8-8 4 4',
    save: 'M3 3h11l3 3v11H3z M6 3v5h7V3 M6 17v-5h8v5',
    feedback: 'M3 4h14v10H9l-4 3v-3H3z M6 8h8 M6 11h5',
  };
  return <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    menu.current.querySelector('button:not(:disabled)')?.focus();
    function closeOutside(event) {
      if (!root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function navigate(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabled = [...menu.current.querySelectorAll('button:not(:disabled)')];
    if (!enabled.length) return;
    const current = enabled.indexOf(document.activeElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
    enabled[index].focus();
  }

  return (
    <div className="store-toolbar-more" ref={root}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button type="button" className="btn" ref={trigger} onClick={() => setOpen(value => !value)}
        onKeyDown={event => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true); } }}
        title="Weitere Funktionen" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}>Mehr <span aria-hidden="true">▾</span></button>
      {open && (
        <div id={id} role="menu" aria-label="Weitere Funktionen" className="store-toolbar-menu" ref={menu} onKeyDown={navigate}>
          {items.filter(Boolean).map(item => (
            <button type="button" key={item.id || item.label} role="menuitem" tabIndex={-1} disabled={item.disabled}
              className={item.danger ? 'danger' : undefined}
              onClick={() => { close(); item.onClick(); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BrandNameDialog({ brandName, onSave, onClose }) {
  const [name, setName] = useState(brandName || '');
  const dialog = useRef(null);
  const title = useId();
  useEffect(() => { dialog.current.showModal(); }, []);
  return (
    <dialog ref={dialog} className="store-toolbar-rename" aria-labelledby={title} onCancel={onClose}>
      <form onSubmit={event => { event.preventDefault(); onSave(name.trim()); onClose(); }}>
        <h2 id={title}>Store-Name ändern</h2>
        <label>Store-Name<input className="input" value={name} onChange={event => setName(event.target.value)} autoFocus /></label>
        <div className="store-toolbar-rename-actions">
          <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn-primary">Übernehmen</button>
        </div>
      </form>
    </dialog>
  );
}

function saveMessage(progress, status) {
  if (progress?.stage === 'upload' && progress.total) return `Bilder werden gespeichert: ${progress.uploaded || 0} von ${progress.total}`;
  if (progress || status === 'saving') return 'Store wird gespeichert …';
  if (status === 'saved') return 'Store gespeichert';
  if (status === 'error') return 'Autosave fehlgeschlagen';
  return '';
}

export default function Topbar({
  onEditDesignDirection, onUseStoreExamples, store, savedStoreId, onExport, onSave, manualSaveProgress,
  viewMode, onToggleView, onNewStore, onPatchImport, onUndo, canUndo, onRedo, canRedo,
  onLoadProducts, onFolderImageUpload, onRemoveAllImages, folderInputRef, autoSaveStatus,
  onCopyCustomerLink, customerSaveProgress, folderUploadProgress, onChangeBrandName,
  onShowFeedback, feedbackNew, onShowStores, returningToOverview,
}) {
  const [renaming, setRenaming] = useState(false);
  const status = saveMessage(manualSaveProgress, autoSaveStatus);
  const folderStatus = folderUploadProgress
    ? `${folderUploadProgress.uploaded || 0} von ${folderUploadProgress.total} Bildern hochgeladen`
    : '';
  return (
    <div className="topbar store-editor-topbar">
      <div className="store-toolbar-left">
        {onShowStores && (
          <button type="button" className="btn topbar-back" onClick={onShowStores} disabled={returningToOverview}>
            <span aria-hidden="true">← </span>Zurück
          </button>
        )}
        <StoreReferenceLibraryButton label="Beispiele" triggerClassName="btn"
          onSelect={onUseStoreExamples} selectedUrls={store.designReferences?.map(row => row.url)}
          onEditReferences={onEditDesignDirection} />
      </div>

      <div className="store-toolbar-right">
        {store.pages.length > 0 ? (
          <>
            {onFolderImageUpload && (
              <input type="file" ref={folderInputRef} hidden webkitdirectory="" directory="" multiple
                onChange={event => { onFolderImageUpload(event.target.files); event.target.value = ''; }} />
            )}
            <span className="store-toolbar-status" aria-live="polite">{customerSaveProgress ? 'Kundenlink wird erstellt …' : folderStatus || status}</span>
            {onToggleView && (
              <div className="view-toggle" role="group" aria-label="Vorschauansicht">
                {[['desktop', 'Desktop-Ansicht'], ['mobile', 'Mobilansicht']].map(([mode, label]) => (
                  <button key={mode} type="button" className={'view-toggle-btn' + (viewMode === mode ? ' active' : '')}
                    aria-label={label} title={label} aria-pressed={viewMode === mode} onClick={() => onToggleView(mode)}>
                    <ToolbarIcon name={mode} />
                  </button>
                ))}
              </div>
            )}
            {onUndo && <button type="button" className="btn store-toolbar-icon" aria-label="Rückgängig"
              title="Rückgängig (Strg+Z)" disabled={!canUndo} onClick={onUndo}><ToolbarIcon name="undo" /></button>}
            {onRedo && <button type="button" className="btn store-toolbar-icon" aria-label="Wiederholen"
              title="Wiederholen (Strg+Umschalt+Z)" disabled={!canRedo} onClick={onRedo}><ToolbarIcon name="redo" /></button>}
            {onCopyCustomerLink && <button type="button" className="btn store-toolbar-share" onClick={onCopyCustomerLink}
              aria-label="Kundenlink" title="Kundenlink" disabled={!!customerSaveProgress} aria-busy={!!customerSaveProgress}>
              <ToolbarIcon name="customer" /><span>Kundenlink</span>
            </button>}
            {onExport && <button type="button" className="btn btn-primary store-toolbar-share" onClick={onExport}
              aria-label="Designer-Link" title="Designer-Link">
              <ToolbarIcon name="designer" /><span>Designer-Link</span>
            </button>}
            <button type="button" className="btn btn-green store-toolbar-secondary" onClick={onSave} disabled={!!manualSaveProgress}
              aria-label="Speichern" aria-busy={!!manualSaveProgress} title={status || 'Änderungen und Bilder speichern'}>
              <ToolbarIcon name="save" /><span>Speichern</span>
            </button>
            {onShowFeedback && (
              <button type="button" className="btn store-toolbar-secondary" onClick={onShowFeedback} title="Kundenfeedback öffnen"
                aria-label={feedbackNew > 0 ? `Feedback (${feedbackNew} neu)` : 'Feedback'}>
                <ToolbarIcon name="feedback" /><span>Feedback</span>
                {feedbackNew > 0 && <span className="store-toolbar-feedback-count">{feedbackNew > 99 ? '99+' : feedbackNew}</span>}
              </button>
            )}
            <StoreDriveExport key={savedStoreId || 'draft'} storeId={savedStoreId} disabled={!!manualSaveProgress}
              renderTrigger={drive => <MoreMenu items={[
                onFolderImageUpload && { id: 'upload', label: folderStatus || 'Bilder hochladen', onClick: () => folderInputRef.current?.click(), disabled: !!folderUploadProgress },
                { label: 'Bilder nach Drive', ...drive },
                onPatchImport && { label: 'Mit Claude bearbeiten', onClick: onPatchImport },
                onLoadProducts && { label: 'Produktdaten laden', onClick: onLoadProducts },
                onChangeBrandName && { label: 'Store-Name ändern', onClick: () => setRenaming(true) },
                onRemoveAllImages && { label: 'Alle Bilder entfernen', danger: true, onClick: onRemoveAllImages },
              ]} />} />
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={onNewStore}>Neuer Store</button>
        )}
      </div>

      {renaming && <BrandNameDialog brandName={store.brandName} onSave={onChangeBrandName} onClose={() => setRenaming(false)} />}
    </div>
  );
}
