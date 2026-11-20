import { STOREFRONT_CONCEPT_PROMPT } from '../storefrontConceptPrompt';
import { useState, useRef } from 'react';
import { STOREFRONT_ASIN_PROMPT } from '../storefrontAsinPrompt';

var SKILL_PROMPT = STOREFRONT_CONCEPT_PROMPT;

export default function NewStoreModal({ onClose, onImport, onCreateEmpty }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [importing, setImporting] = useState(false);
  var [copied, setCopied] = useState(false);
  var fileRef = useRef(null);

  function handleCopyPrompt(content, kind) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(function() {
        setCopied(kind);
      });
    }
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
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Schritt 2: Konzept in Claude Code erstellen</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Öffne einen neuen Claude Code oder Cowork Chat. Kopiere den Prompt unten und füge ihn ein. Der Skill <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>amazon-storefront-design</code> liegt im Repo unter <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>.claude/skills/</code> und nutzt eine v4-Wissensbasis aus 20 analysierten Amazon Brand Stores (Phase-3-Analyses + Per-Page-Blueprints + Voice-/Hero-/Page-Architecture-Vokabular).
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            {SKILL_PROMPT}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={function() { handleCopyPrompt(SKILL_PROMPT, 'concept'); }} style={{ fontSize: 12, padding: '6px 14px' }}>
              Prompt kopieren
            </button>
            {copied === 'concept' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt in Zwischenablage</span>}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>Schritt 3: Briefing JSON importieren</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155' }}>
            Sobald dein Briefing JSON aus dem Chat fertig ist, füge es unten ein oder lade es als <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>.json</code> Datei hoch.
          </div>
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Briefing JSON</label>
        <textarea
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



