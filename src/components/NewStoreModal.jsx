import { useState, useRef } from 'react';

var SKILL_PROMPT = 'Aktiviere den Skill amazon-storefront-design aus diesem Repo (.claude/skills/amazon-storefront-design/SKILL.md) und erstelle ein Amazon Brand Store Konzept als Briefing JSON.\n\nStarte mit den Marken Basics: frag mich nach\n1. Markenname (Pflicht)\n2. Website URL der Marke (optional, falls vorhanden, hilft bei Tonalität und CI)\n3. Bestehender Amazon Brand Store URL (optional, für Relaunch oder Inspiration)\n\nWenn ich Website oder Brand Store leer lasse, bau das Konzept ohne sie.\n\nHinweis: ASIN Listen als Text oder CSV einfügen, nicht als Screenshot. Bilder dauern in der Verarbeitung lange und können den Chat blockieren.\n\nDann stelle die Multiple Choice Rückfragen zu Stand, Scope, Menüstruktur, Marktplatz und ASIN Lieferung. Generiere am Ende das Briefing JSON nach dem im Skill definierten Schema (textOverlay als Objekt mit heading, subheading, body, bullets, cta. brief nur Bildfunktion und Komposition. linkUrl Format page:Name. imageCategory Pflicht auf Image Tiles).\n\nSpeichere das fertige JSON unter seed/[markenname]-store.json plus erstelle den passenden api/[markenname]-store.js Endpoint und vercel.json includeFiles Eintrag, sodass das JSON nach Push unter https://amazon-store-builder.vercel.app/api/[markenname]-store erreichbar ist.';

export default function NewStoreModal({ onClose, onImport, onCreateEmpty }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [copied, setCopied] = useState(false);
  var fileRef = useRef(null);

  function handleCopyPrompt() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SKILL_PROMPT).then(function() {
        setCopied(true);
        setTimeout(function() { setCopied(false); }, 3000);
      });
    }
  }

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

        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Schritt 1: Konzept in Claude Code erstellen</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Öffne Claude Code im Repo <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>amazon-store-builder</code>.
            Kopiere den Prompt unten und füge ihn in den Chat ein. Der Skill <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>amazon-storefront-design</code> wird automatisch aktiviert weil er im Repo unter <code style={{ background: '#e2e8f0', padding: '1px 6px', borderRadius: 3, fontSize: 11 }}>.claude/skills/</code> liegt.
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            {SKILL_PROMPT}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleCopyPrompt} style={{ fontSize: 12, padding: '6px 14px' }}>
              Prompt kopieren
            </button>
            {copied && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt in Zwischenablage</span>}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>Schritt 2: Briefing JSON importieren</div>
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
          <button className="btn btn-primary" onClick={handleImport} disabled={!text.trim()}>Importieren</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onCreateEmpty} style={{ fontSize: 11, color: '#64748b' }}>Stattdessen leeren Store starten</button>
        </div>
      </div>
    </div>
  );
}
