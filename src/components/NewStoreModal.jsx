import StoreReferenceLibraryButton from './StoreReferenceLibrary';
import { appendReferenceChoices } from '../storeReferences.mjs';
import { buildStorefrontConceptPrompt, validateStorefrontReferences } from '../storefrontConceptPrompt';
import { useState, useRef } from 'react';
import { STOREFRONT_ASIN_PROMPT } from '../storefrontAsinPrompt';

export default function NewStoreModal({ onClose, onImport, onCreateEmpty, initialReferences = [] }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [importing, setImporting] = useState(false);
  var [copied, setCopied] = useState(false);
  var [references, setReferences] = useState(() => initialReferences.length ? initialReferences.map(r => ({ url: r.url, notes: r.notes || '' })) : [{ url: '', notes: '' }]);
  var [copyError, setCopyError] = useState('');
  var referenceError = validateStorefrontReferences(references);
  var conceptPrompt = referenceError ? '' : buildStorefrontConceptPrompt(references);

  function updateReference(index, field, value) {
    setReferences(function(rows) { return rows.map(function(row, i) { return i === index ? { ...row, [field]: value } : row; }); });
    setCopied(false);
    setCopyError('');
  }
  var fileRef = useRef(null);

  function handleCopyPrompt(content, kind) {
    setCopyError('');
    if (kind === 'concept' && referenceError) { setCopyError(referenceError); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(function() {
        setCopied(kind);
      }).catch(function() { setCopyError('Kopieren fehlgeschlagen. Bitte den angezeigten Prompt markieren und manuell kopieren.'); });
    } else { setCopyError('Bitte den angezeigten Prompt markieren und manuell kopieren.'); }
  }

  var handleImport = async function() {
    if (importing) return;
    if (!text.trim()) {
      setError('Bitte Briefing JSON einfügen oder Datei wählen.');
      return;
    }
    try {
      var data = JSON.parse(text);
      setImporting(true);
      await onImport(data);
    } catch (e) {
      setError('Import fehlgeschlagen, ' + e.message);
    } finally {
      setImporting(false);
    }
  };

  var handleFile = function(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      setText(String(ev.target.result || ''));
      setError('');
    };
    reader.onerror = function() {
      setError('Datei konnte nicht gelesen werden');
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box workflow-modal" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 720, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Neuen Store anlegen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        <section className="asin-workflow-step">
          <h3>Schritt 1: ASIN-Liste aus dem Amazon-Schaufenster holen</h3>
          <p>Falls noch keine ASIN-Liste vorliegt: Verkäufer-Schaufenster auf Amazon öffnen, dessen URL im Prompt einsetzen und den Prompt in einem Chat mit Browserzugriff ausführen. Die CSV anschließend im Konzept-Chat mitgeben. Mit vorhandener Liste kannst du direkt zu Schritt 2 gehen.</p>
          <details><summary>ASIN-Prompt ansehen</summary><pre>{STOREFRONT_ASIN_PROMPT}</pre></details>
          <p>Der beschriebene Padding-Trick funktioniert nur in unterstützten Chat-Umgebungen. Der Prompt verlangt andernfalls einen verfügbaren Datei-Export.</p>
          <button className="btn btn-primary" onClick={function() { handleCopyPrompt(STOREFRONT_ASIN_PROMPT, 'asin'); }}>ASIN-Prompt kopieren</button>
          {copied === 'asin' && <span role="status"> ASIN-Prompt kopiert</span>}
        </section>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Schritt 2: Konzept in Claude erstellen</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Öffne einen neuen Claude-Chat mit dem installierten Skill <code>amazon-storefront-design</code>. Kopiere den Auftrag und gib deine ASIN-Liste dazu. Der Skill enthält die kuratierte Wissensbasis und kann zusätzliche Referenz-Stores berücksichtigen.
            {' '}<a href="/brand-store-claude/amazon-storefront-design.zip" download>Aktualisierten Skill herunterladen</a>
          </div>
          <fieldset style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: 12, margin: '12px 0' }}>
            <legend style={{ fontWeight: 700, fontSize: 13 }}>Referenz-Stores (optional)</legend>
            <div style={{ marginBottom: 12 }}><StoreReferenceLibraryButton label="Aus Beispielen auswählen" selectedUrls={references.map(r => r.url)} onSelect={choices => { setReferences(rows => appendReferenceChoices(rows, choices)); setCopied(false); setCopyError(''); }} /></div>
            {references.map(function(reference, index) { return (
              <div key={index} style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <label style={{ fontSize: 12 }}>Amazon-Store-Link {index + 1}
                  <input className="input" type="url" value={reference.url} placeholder="https://www.amazon.de/stores/…" onChange={function(e) { updateReference(index, 'url', e.target.value); }} style={{ width: '100%', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: 12 }}>Was gefällt dir an Referenz {index + 1}? (optional)
                  <textarea className="input" rows={2} value={reference.notes} placeholder="Zum Beispiel: Aufbau der Startseite, Wechsel von Lifestyle und Produkten oder Gestaltung einer Unterseite" onChange={function(e) { updateReference(index, 'notes', e.target.value); }} style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 64, height: 64 }} />
                </label>
                {references.length > 1 && <button className="btn" type="button" aria-label={'Referenz ' + (index + 1) + ' entfernen'} onClick={function() { setReferences(function(rows) { return rows.filter(function(_, i) { return i !== index; }); }); setCopied(false); setCopyError(''); }} style={{ justifySelf: 'start', fontSize: 12 }}>Entfernen</button>}
              </div>
            ); })}
            <button className="btn" type="button" onClick={function() { setReferences(function(rows) { return [...rows, { url: '', notes: '' }]; }); setCopied(false); }}>Referenz hinzufügen</button>
            <p style={{ fontSize: 12, marginBottom: 0 }}>Links und Hinweise werden mitkopiert. Claude prüft erreichbare Seiten; bei gesperrten Seiten sind Screenshots oder ein Export nötig.</p>
            {referenceError && <div role="alert" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>{referenceError}</div>}
          </fieldset>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            {conceptPrompt || 'Bitte die Referenz-Links prüfen, um den vollständigen Auftrag anzuzeigen.'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={function() { handleCopyPrompt(conceptPrompt, 'concept'); }} disabled={!!referenceError} style={{ fontSize: 12, padding: '6px 14px' }}>
              Prompt kopieren
            </button>
            {copyError && <span role="alert" style={{ color: '#b91c1c', fontSize: 12 }}>{copyError}</span>}
            {copied === 'concept' && <span role="status" style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt in Zwischenablage</span>}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>Schritt 3: Briefing JSON importieren</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155' }}>
            Sobald dein Briefing JSON aus dem Chat fertig ist, füge es unten ein oder lade es als <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>.json</code> Datei hoch.
          </div>
        </div>

        <label htmlFor="store-briefing-json" style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Briefing JSON</label>
        <textarea
          id="store-briefing-json"
          value={text}
          onChange={function(e) { setText(e.target.value); setError(''); }}
          placeholder='{"brandName": "Juskys", "marketplace": "de", "pages": [...]}'
          rows={12}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, padding: 8, border: '1px solid ' + (error ? '#ef4444' : '#e2e8f0'), borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.4 }}
        />

        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</div>
        )}

        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} style={{ display: 'none' }} />
          <button className="btn" onClick={function() { fileRef.current && fileRef.current.click(); }}>JSON Datei wählen</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim() || importing}>{importing ? 'Store prüfen …' : 'Importieren'}</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onCreateEmpty} disabled={importing} style={{ fontSize: 11, color: '#64748b' }}>Stattdessen leeren Store starten</button>
        </div>
      </div>
    </div>
  );
}



