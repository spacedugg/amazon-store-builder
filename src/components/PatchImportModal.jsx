import { useState } from 'react';

var PATCH_PROMPT_HINT = 'Im Claude Chat sagen:\n\n"Hier mein aktueller Brand Store [Name]. Ich brauche [konkrete Änderung, z.B. eine neue Section auf Sub Page Sofas mit drei Fakten zu Stoffqualität]. Nutze den Skill amazon-storefront-design Patch Mode und gib nur die ops Liste aus, kein full Store JSON."';

export default function PatchImportModal({ onClose, onApply }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [busy, setBusy] = useState(false);

  var handleApply = function() {
    setError('');
    if (!text.trim()) { setError('Patch JSON ist leer'); return; }
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setError('JSON nicht parsbar, ' + e.message);
      return;
    }
    if (!data.ops || !Array.isArray(data.ops)) {
      setError('Patch JSON braucht ein "ops" Array');
      return;
    }
    setBusy(true);
    try {
      var summary = onApply(data);
      setBusy(false);
      var msg = (summary && summary.length ? summary.join('\n') : 'Keine Änderungen');
      alert('Patch angewendet:\n\n' + msg);
      onClose();
    } catch (e) {
      setBusy(false);
      setError('Fehler beim Anwenden, ' + e.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 720, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Snippet einfügen, Patch JSON</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>So funktioniert es</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Im normalen Claude Chat (extern) im Repo amazon-store-builder sagen:
          </div>
          <pre style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, color: '#334155', whiteSpace: 'pre-wrap', margin: 0 }}>
{PATCH_PROMPT_HINT}
          </pre>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#475569', marginTop: 8 }}>
            Claude gibt einen Patch JSON aus mit "ops": [...]. Hier einfügen, "Anwenden" klicken. Bestehender Store wird **nicht** überschrieben, nur die Operationen werden additiv eingefügt oder einzelne Tiles geändert.
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 11, lineHeight: 1.5, color: '#334155' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Verfügbare Operationen:</div>
          <code style={{ display: 'block', fontSize: 10 }}>addPage, addSection, addTile, modifyTile, modifySection, deleteSection, deleteTile</code>
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Patch JSON</label>
        <textarea
          value={text}
          onChange={function(e) { setText(e.target.value); setError(''); }}
          placeholder='{"ops": [{"op": "addSection", "pageName": "Sofas", "after": 2, "section": {...}}]}'
          rows={14}
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, padding: 8, border: '1px solid ' + (error ? '#ef4444' : '#e2e8f0'), borderRadius: 4, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.4 }}
        />

        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</div>
        )}

        <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleApply} disabled={!text.trim() || busy}>
            {busy ? 'Wird angewendet...' : 'Anwenden'}
          </button>
          <button className="btn" onClick={onClose}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}
