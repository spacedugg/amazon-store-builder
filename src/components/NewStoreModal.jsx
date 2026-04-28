import { useState, useRef } from 'react';

export default function NewStoreModal({ onClose, onImport, onCreateEmpty }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var fileRef = useRef(null);

  var handleImport = function() {
    if (!text.trim()) {
      setError('Bitte Briefing JSON einfügen oder Datei wählen.');
      return;
    }
    try {
      var data = JSON.parse(text);
      onImport(data);
    } catch (e) {
      setError('JSON nicht parsbar, ' + e.message);
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
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 640, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Neuen Store anlegen</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, fontSize: 13, lineHeight: 1.55, color: '#334155', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>So bekommst du dein Konzept</div>
          <div>
            Öffne einen Chat in Claude oder Claude Code und starte mit dem Skill <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>amazon-storefront-design</code>.
            Beantworte die Rückfragen zu Marke, ASINs und CI. Am Ende bekommst du ein Briefing JSON.
            Dieses fügst du unten ein oder lädst es als <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>.json</code> Datei hoch.
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
          <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim()}>Importieren</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onCreateEmpty} style={{ fontSize: 11, color: '#64748b' }}>Stattdessen leeren Store starten</button>
        </div>
      </div>
    </div>
  );
}
