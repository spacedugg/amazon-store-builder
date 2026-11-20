import StoreReferenceLibraryButton from './StoreReferenceLibrary';
import { useState, useEffect } from 'react';
import { loadFeedbackCounts } from '../feedbackApi';

function formatDate(value) {
  if (!value) return '';
  var normalized = String(value).replace(' ', 'T');
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(normalized)) normalized += 'Z';
  var d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function Preview({ store }) {
  var preview = store.preview || {};
  var images = (preview.tiles || []).slice(0, 3);
  var initial = (store.brandName || 'S').trim().charAt(0).toUpperCase();
  return (
    <div className="store-home-preview" aria-hidden="true">
      <div className="store-home-mockbar"><span className="store-home-mark">{initial}</span><span className="store-home-mockbrand">{store.brandName || 'Unbenannter Store'}</span><span className="store-home-mockmenu">☰</span></div>
      <div className={'store-home-banner' + (preview.banner ? ' has-image' : '')}>
        {preview.banner ? <img src={preview.banner} alt="" loading="lazy" onError={function(e) { e.currentTarget.hidden = true; }} /> : <span>{store.brandName || 'Brand Store'}</span>}
      </div>
      <div className="store-home-mocknav"><span>{preview.pageName || 'Home'}</span><span>Produkte</span><span>Über uns</span></div>
      <div className="store-home-tiles">
        {[0, 1, 2].map(function(i) {
          return <div className="store-home-tile" key={i}>
            {images[i] ? <img src={images[i]} alt="" loading="lazy" onError={function(e) { e.currentTarget.hidden = true; }} /> : <span className="store-home-tile-shape" />}
          </div>;
        })}
      </div>
    </div>
  );
}

export default function StoreOverview({ stores, loading, loadError, hasAutoSave, onContinue, onOpen, onDelete, onNewStore, onImportRescueJson, onImportStore }) {
  var [opening, setOpening] = useState(null);
  var [deleting, setDeleting] = useState(null);
  var [deleteTarget, setDeleteTarget] = useState(null);
  var [deleteStage, setDeleteStage] = useState(1);
  var [error, setError] = useState('');
  var [importOpen, setImportOpen] = useState(false);
  var [importUrl, setImportUrl] = useState('');
  var [importing, setImporting] = useState(false);
  var [feedbackCounts, setFeedbackCounts] = useState({});

  useEffect(function() {
    var stopped = false;
    var pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        var counts = await loadFeedbackCounts();
        if (!stopped) setFeedbackCounts(counts);
      } catch (e) { /* Keep the last successful counts while offline. */ }
      finally { pending = false; }
    }
    refresh();
    var timer = setInterval(refresh, 60000);
    function visible() { if (document.visibilityState !== 'hidden') refresh(); }
    document.addEventListener('visibilitychange', visible);
    return function() { stopped = true; clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, []);

  async function openStore(id) {
    if (opening) return;
    setOpening(id); setError('');
    try {
      var ok = await onOpen(id);
      if (!ok) setError('Dieser Store konnte nicht geladen werden. Bitte erneut versuchen.');
    } catch (e) {
      setError(e.message || 'Store konnte nicht geladen werden.');
    } finally {
      setOpening(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    if (deleteStage === 1) {
      setDeleteStage(2);
      return;
    }
    var store = deleteTarget;
    setDeleting(store.id);
    setError('');
    try {
      await onDelete(store.id);
      setDeleteTarget(null);
      setDeleteStage(1);
    } catch (e) {
      setError(e.message || 'Store konnte nicht gelöscht werden.');
      // Keep the second confirmation dialog open for an explicit retry.
    } finally {
      setDeleting(null);
    }
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteStage(1);
  }

  async function importLink(e) {
    e.preventDefault();
    if (!importUrl.trim() || importing) return;
    setImporting(true); setError('');
    try {
      var message = await onImportStore(importUrl.trim());
      if (message) setError(message);
    } catch (e) {
      setError(e.message || 'Import fehlgeschlagen.');
    } finally {
      setImporting(false);
    }
  }

  function rescue(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    file.text().then(function(text) {
      onImportRescueJson(JSON.parse(text));
    }).catch(function(err) { setError('JSON konnte nicht geladen werden: ' + err.message); });
    e.target.value = '';
  }

  return (
    <div className="store-home">
      <header className="store-home-header">
        <div>
          <div className="store-home-eyebrow">Store Builder</div>
          <h1>Deine Stores</h1>
          <p>Öffne einen Store, um seine Seiten anzusehen und weiterzubearbeiten.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><StoreReferenceLibraryButton onSelect={onNewStore ? choices => onNewStore(choices.map(c => ({ url: c.storeUrl, notes: '' }))) : undefined} /><button className="store-home-create" onClick={onNewStore}>+ Neuer Store</button></div>
      </header>
      <main className="store-home-main">
        <div className="store-home-section">
          <div>
            <h2>Gespeicherte Stores</h2>
            <p>{loading ? 'Stores werden geladen …' : stores.length + (stores.length === 1 ? ' Store' : ' Stores')}</p>
          </div>
          <div className="store-home-tools">
            {hasAutoSave && <button onClick={onContinue}>Letzten Entwurf fortsetzen</button>}
            <button onClick={function() { setImportOpen(!importOpen); }}>Store-Link importieren</button>
            <label>Rescue JSON laden<input type="file" accept="application/json,.json" onChange={rescue} /></label>
          </div>
        </div>
        {importOpen && <form className="store-home-import" onSubmit={importLink}>
          <input type="url" required placeholder="Link zum Store einfügen" value={importUrl} onChange={function(e) { setImportUrl(e.target.value); }} />
          <button type="submit" disabled={importing}>{importing ? 'Importiere …' : 'Importieren'}</button>
        </form>}
        {(error || loadError) && <p className="store-home-error" role="alert">{error || loadError}</p>}
        {loading ? <div className="store-home-loading">Stores werden geladen …</div> : stores.length ? (
          <div className="store-home-grid">
            {stores.map(function(store) {
              var count = Number(feedbackCounts[store.id]);
              if (!Number.isSafeInteger(count) || count < 1) count = 0;
              var feedbackLabel = count ? count + (count === 1 ? ' neues Feedback' : ' neue Feedbacks') : '';
              return <div className="store-home-entry" key={store.id}><button className="store-home-card" onClick={function() { openStore(store.id); }} disabled={!!opening || !!deleting} aria-label={(store.brandName || 'Unbenannter Store') + ' öffnen' + (count ? ', ' + feedbackLabel : '')}>
                <Preview store={store} />
                <div className="store-home-card-details">
                  <div className="store-home-card-title">{store.brandName || 'Unbenannter Store'} <span aria-hidden="true">↗</span></div>
                  <div className="store-home-card-meta">
                    <span>{store.pageCount || 0} {store.pageCount === 1 ? 'Seite' : 'Seiten'}</span>
                    {store.createdBy && <span>Erstellt von {store.createdBy}</span>}
                    {store.savedAt && <span>Bearbeitet {formatDate(store.savedAt)}</span>}
                  </div>
                  {opening === store.id && <div className="store-home-opening">Store wird geöffnet …</div>}
                  {count > 0 && <span className="store-home-feedback" title={feedbackLabel} aria-label={feedbackLabel}>{count}</span>}
                </div>
              </button><button type="button" className="store-home-delete-icon"
                aria-label={'Brand Store ' + (store.brandName || 'Unbenannter Store') + ' löschen'}
                title="Brand Store löschen"
                disabled={!!opening || !!deleting}
                onClick={function() { setError(''); setDeleteTarget(store); setDeleteStage(1); }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>
                </svg>
              </button></div>;
            })}
          </div>
        ) : loadError ? null : <div className="store-home-empty"><h3>Noch keine Stores gespeichert</h3><p>Erstelle deinen ersten Store oder importiere einen bestehenden Link.</p><button className="store-home-create" onClick={onNewStore}>Neuen Store anlegen</button></div>}
      </main>
      {deleteTarget && <div className="store-delete-backdrop" role="presentation" onMouseDown={function(e) { if (e.target === e.currentTarget) closeDelete(); }}>
        <div className="store-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="store-delete-title" aria-describedby="store-delete-message">
          <h2 id="store-delete-title">{deleteStage === 1 ? 'Brand Store löschen?' : 'Löschung endgültig bestätigen'}</h2>
          <p id="store-delete-message">
            {deleteStage === 1
              ? <>Möchtest du den Brand Store <strong>{deleteTarget.brandName || 'Unbenannter Store'}</strong> wirklich löschen? Der gespeicherte Store und sein öffentlicher Kundenlink werden dadurch entfernt.</>
              : <>Letzte Bestätigung: <strong>{deleteTarget.brandName || 'Unbenannter Store'}</strong> wird dauerhaft aus den gespeicherten Brand Stores gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.</>}
          </p>
          <div className="store-delete-actions">
            <button type="button" onClick={closeDelete} disabled={!!deleting}>Abbrechen</button>
            <button type="button" className="store-delete-confirm" onClick={confirmDelete} disabled={!!deleting}>
              {deleting ? 'Wird gelöscht …' : deleteStage === 1 ? 'Weiter' : 'Endgültig löschen'}
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}

