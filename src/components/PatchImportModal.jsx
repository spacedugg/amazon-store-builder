import { useState } from 'react';

var PATCH_PROMPT = 'Aktiviere den Skill amazon-storefront-design im Patch Mode. Ich möchte eine kleine Änderung an meinem bestehenden Brand Store machen, ohne den ganzen Store neu zu generieren.\n\nMein aktueller Store JSON als Kontext (kopiere ich gleich rein im nächsten Block) damit du Wording, Brand Voice, vorhandene Pages und Sub Strukturen kennst und dein Patch konsistent zum Rest passt.\n\nMeine Änderung:\n[hier konkret beschreiben, z.B.]\n- Auf Sub Page Sofas eine Section am Ende ergänzen mit drei Fakten zu Stoffqualität, Massivholz und Bezug Wahl.\n- Oder: Headline auf Hero von Garten ändern.\n- Oder: Eine neue Subpage Boxspring Premium an Möbel anhängen mit eigenem Konzept.\n\nGehe dialogisch vor wie bei einem Full Store. Stell mir Headline Vorschläge vor (drei Optionen), wenn das Layout unklar ist frag nach, frag bei Position Detail nach (vor oder nach welcher Section). Nach unserer Abstimmung gib am Ende NUR den Patch JSON mit ops Array aus, kein Full Store JSON. Die Self Check Regeln aus Schritt 5 (ASIN Stack, Headline Bezug, Versand Verbot, Tile Type Whitelist, Repetition) gelten auch im Patch Mode auf das Resultat.';

export default function PatchImportModal({ onClose, onApply, store }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [busy, setBusy] = useState(false);
  var [copiedPrompt, setCopiedPrompt] = useState(false);
  var [copiedStore, setCopiedStore] = useState(false);

  var handleCopyPrompt = function() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(PATCH_PROMPT).then(function() {
        setCopiedPrompt(true);
        setTimeout(function() { setCopiedPrompt(false); }, 3000);
      });
    }
  };

  var handleCopyStore = function() {
    if (!store) return;
    // Schlanke Variante des Stores als Kontext, ohne Bilder Daten
    var slim = Object.assign({}, store, {
      headerBanner: store.headerBanner ? '<base64 image, weggelassen>' : null,
      headerBannerMobile: store.headerBannerMobile ? '<base64 image, weggelassen>' : null,
      pages: (store.pages || []).map(function(p) {
        return Object.assign({}, p, {
          sections: (p.sections || []).map(function(s) {
            return Object.assign({}, s, {
              tiles: (s.tiles || []).map(function(t) {
                var copy = Object.assign({}, t);
                if (copy.uploadedImage) copy.uploadedImage = '<image, weggelassen>';
                if (copy.uploadedImageMobile) copy.uploadedImageMobile = '<image, weggelassen>';
                if (copy.referenceImages) copy.referenceImages = (copy.referenceImages || []).map(function() { return '<ref image>'; });
                return copy;
              }),
            });
          }),
        });
      }),
    });
    var json = JSON.stringify(slim, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(json).then(function() {
        setCopiedStore(true);
        setTimeout(function() { setCopiedStore(false); }, 3000);
      });
    }
  };

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
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 720, padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Snippet einfügen, Patch Mode</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        {/* Schritt 1, Prompt im Chat einfügen */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Schritt 1: Prompt in Claude Code einfügen</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Öffne Claude Code im Repo amazon-store-builder. Kopiere diesen Prompt, füge ihn in den Chat ein, schreib deine konkrete Änderung rein wo es im Prompt steht.
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            {PATCH_PROMPT}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleCopyPrompt} style={{ fontSize: 12, padding: '6px 14px' }}>
              Prompt kopieren
            </button>
            {copiedPrompt && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt kopiert</span>}
          </div>
        </div>

        {/* Schritt 2, Store JSON als Kontext */}
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#92400e', fontSize: 13 }}>Schritt 2: Aktuellen Store als Kontext mitgeben</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Damit Claude die Brand Voice, vorhandene Pages und das Wording des Stores kennt und der Patch dazu konsistent ist, kopiere den aktuellen Store JSON in den Chat (als Kontext Block direkt nach dem Prompt). Bilder werden ausgelassen damit das Volumen klein bleibt.
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={handleCopyStore} style={{ fontSize: 12, padding: '6px 14px', background: '#fff', border: '1px solid #fde68a' }}>
              Aktuellen Store kopieren
            </button>
            {copiedStore && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Store kopiert ({(store && store.pages && store.pages.length) || 0} Pages)</span>}
          </div>
        </div>

        {/* Schritt 3, Patch JSON einfügen */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>Schritt 3: Patch JSON aus Claude hier einfügen</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 6 }}>
            Nach eurer Abstimmung im Chat (Headlines, Layout, Position) gibt Claude einen Patch JSON aus. Hier einfügen, Anwenden klicken. Bestehender Store wird **nicht** überschrieben.
          </div>
          <div style={{ fontSize: 10, color: '#64748b' }}>
            Verfügbare Operationen: <code>addPage, addSection, addTile, modifyTile, modifySection, deleteSection, deleteTile</code>. Position kommt aus dem Patch selbst (pageName, sectionIdx, after).
          </div>
        </div>

        <textarea
          value={text}
          onChange={function(e) { setText(e.target.value); setError(''); }}
          placeholder='{"ops": [{"op": "addSection", "pageName": "Sofas", "after": 2, "section": {...}}]}'
          rows={12}
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
