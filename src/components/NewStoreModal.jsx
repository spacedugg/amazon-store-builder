import { useState, useRef } from 'react';

var SKILL_PROMPT = 'Erstelle ein Amazon Brand Store Konzept als Briefing JSON, das in das Brand Store Builder Tool importiert werden kann.\n\nFolge dieser Spezifikation des Skills amazon-storefront-design:\n\nRegeln:\n- Sprache Deutsch, kundensichtbar\n- Kein Em Dash, kein En Dash, Hyphen nur in Komposita ohne Leerzeichen\n- Marken USPs produktunabhängig\n- Eine Bestseller Section auf Home, max 6 bis 8 ASINs\n- Pro Subpage eigene Hero Headline, kein "Sub-Name bei Sub-Name"\n- Subpages: Cross Navigation am Ende mit anderen Subs\n- Bestseller Page: pro Kategorie ein Lifestyle Trenner plus Grid\n- Image Tile braucht imageCategory (store_hero, benefit, product, lifestyle, text_image, creative)\n- linkUrl interner Link Format "page:Name"\n- ASIN Platzhalter "<TOP-N-CAT>" und "<ALL-CAT>" wenn keine echten ASINs\n\nOutput Format pro Tile textOverlay als Objekt mit heading, subheading, body (max 350 Zeichen), bullets, cta. brief enthält nur Bildfunktion und Komposition.\n\nStelle erst Multiple Choice Rückfragen zu:\n- Marke und Stand (neuer Store, Relaunch)\n- Scope (Vollkonzept, nur Menüstruktur, nur Wording, etc.)\n- Menüstruktur vorgegeben oder vorschlagen\n- ASIN Liste (eingefügt, CSV, später)\n\nDann generiere das Briefing JSON.\n\nMeine Marke ist [BITTE NAMEN EINTRAGEN].';

function getClaudeChatUrl() {
  // claude.ai/new akzeptiert keinen prompt query param zuverlässig.
  // Wir öffnen die Startseite, User pasted den Prompt aus der Zwischenablage.
  return 'https://claude.ai/new';
}

export default function NewStoreModal({ onClose, onImport, onCreateEmpty }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [copied, setCopied] = useState(false);
  var fileRef = useRef(null);

  function handleStartChat() {
    // Skill Prompt in Zwischenablage kopieren, dann Claude.ai im neuen Tab öffnen
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SKILL_PROMPT).then(function() {
        setCopied(true);
        window.open(getClaudeChatUrl(), '_blank', 'noopener');
        setTimeout(function() { setCopied(false); }, 4000);
      }).catch(function() {
        window.open(getClaudeChatUrl(), '_blank', 'noopener');
      });
    } else {
      window.open(getClaudeChatUrl(), '_blank', 'noopener');
    }
  }

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
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Schritt 1: Konzept im Chat erstellen</div>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Klick öffnet einen neuen Claude Chat plus kopiert die Skill Anweisung in deine Zwischenablage. Du fügst sie im Chat ein, beantwortest die Rückfragen zur Marke, bekommst am Ende das Briefing JSON.
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handleStartChat} style={{ fontSize: 12, padding: '6px 14px' }}>
              Konzept im Chat erstellen
            </button>
            <button className="btn" onClick={handleCopyPrompt} style={{ fontSize: 11, padding: '5px 10px' }}>
              Nur Prompt kopieren
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
