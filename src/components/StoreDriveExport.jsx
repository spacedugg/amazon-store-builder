import { useState } from 'react';
import { configureStoreDriveFolder, exportSavedStoreImages, isDriveFolderLink } from '../storeDriveExport.mjs';

export default function StoreDriveExport({ storeId, disabled, renderTrigger }) {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showFolder, setShowFolder] = useState(false);
  const [folder, setFolder] = useState('');

  async function run(newFolder) {
    if (busy || !storeId) return;
    setOpen(true);
    setBusy(true);
    setError('');
    setProgress(null);
    try {
      if (newFolder) {
        await configureStoreDriveFolder(newFolder, storeId);
      }
      const result = await exportSavedStoreImages(storeId, setProgress);
      setShowFolder(Boolean(result.needsFolder));
      if (!result.needsFolder) setProgress(result);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {renderTrigger({ disabled: !storeId || disabled || busy, onClick: () => run() })}
      {open && (
        <div className="modal-overlay" onClick={() => { if (!busy) setOpen(false); }}>
          <div className="modal-box" role="dialog" aria-modal="true" aria-label="Bilder nach Drive"
            onClick={event => event.stopPropagation()} style={{ maxWidth: 570, padding: 24 }}>
            <h2 style={{ marginTop: 0 }}>Bilder nach Drive</h2>
            {showFolder && (
              <form onSubmit={event => { event.preventDefault(); if (isDriveFolderLink(folder)) run(folder); }}>
                <label htmlFor="store-drive-legacy-folder">Google-Drive-Kundenordner</label>
                <input id="store-drive-legacy-folder" type="url" required value={folder}
                  onChange={event => setFolder(event.target.value)} disabled={busy}
                  placeholder="https://drive.google.com/drive/folders/…" style={{ width: '100%', margin: '8px 0' }} />
                <button type="submit" className="btn btn-primary" disabled={busy || !isDriveFolderLink(folder)}>
                  Ordner speichern und exportieren
                </button>
              </form>
            )}
            {busy && <p role="status">{progress ? `${progress.processed} von ${progress.total} Bildern verarbeitet …` : 'Drive-Export wird vorbereitet …'}</p>}
            {error && <p role="alert">{error}</p>}
            {progress && !busy && !error && (
              <>
                <p role="status">{progress.created} neu, {progress.updated} aktualisiert, {progress.unchanged} bereits aktuell.</p>
                {progress.failures.length > 0 && (
                  <details>
                    <summary>{progress.failures.length} Bilder konnten nicht exportiert werden</summary>
                    <ul>{progress.failures.map(item => <li key={item.name}>{item.name}: {item.error}</li>)}</ul>
                  </details>
                )}
                <p><a href={progress.folderUrl} target="_blank" rel="noopener noreferrer">Exportordner in Google Drive öffnen ↗</a></p>
              </>
            )}
            {!busy && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {!showFolder && (progress || error) &&
                  <button type="button" className="btn" onClick={() => setShowFolder(true)}>Drive-Ordner ändern</button>}
                {!showFolder && (error || progress?.failures.length > 0) &&
                  <button type="button" className="btn btn-primary" onClick={() => run()}>Export erneut starten</button>}
                <button type="button" className="btn" onClick={() => setOpen(false)}>Schließen</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
