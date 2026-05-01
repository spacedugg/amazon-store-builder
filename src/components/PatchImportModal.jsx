import { useState } from 'react';

var PATCH_PROMPT = 'Aktiviere den Skill amazon-storefront-design im Patch Mode. Ich möchte eine kleine Änderung an meinem bestehenden Brand Store machen, ohne den ganzen Store neu zu generieren.\n\nMein Brand Voice plus Page Index als Kontext (kopiere ich gleich rein im nächsten Block) damit du Tonalität, Struktur und Hero Headlines vom Rest kennst und der Patch konsistent ist. Falls du für eine bestimmte Page das volle Detail brauchst (z.B. um Wording zu matchen), sag mir welche, dann liefere ich nur die Page nach.\n\nMeine Änderung:\n[hier konkret beschreiben, z.B.]\n- Auf Sub Page Sofas eine Section am Ende ergänzen mit drei Fakten zu Stoffqualität, Massivholz und Bezug Wahl.\n- Oder: Headline auf Hero von Garten ändern.\n- Oder: Eine neue Subpage Boxspring Premium an Möbel anhängen mit eigenem Konzept.\n\nGehe dialogisch vor wie bei einem Full Store. Stell mir Headline Vorschläge vor (drei Optionen), wenn das Layout unklar ist frag nach, frag bei Position Detail nach (vor oder nach welcher Section). Nach unserer Abstimmung gib am Ende NUR den Patch JSON mit ops Array aus, kein Full Store JSON. Die Self Check Regeln aus Schritt 5 (ASIN Stack, Headline Bezug, Versand Verbot, Tile Type Whitelist, Repetition) gelten auch im Patch Mode auf das Resultat.';

// Erzeugt einen kompakten Brand Voice Index ohne Tile Briefs, Bilder oder
// Vollkatalog Listen. Nur Brand Felder plus pro Page name, parentName,
// Section Modul Namen plus Hero Headline plus vorhandene imageRef Tags
// als Hint für Reuse Konsistenz. Klein genug für jeden Chat.
function makeBrandIndex(store) {
  if (!store) return '';
  var index = {
    brandName: store.brandName || '',
    marketplace: store.marketplace || 'de',
    brandTone: store.brandTone || '',
    brandStory: store.brandStory || '',
    headerBannerColor: store.headerBannerColor || '',
    pages: (store.pages || []).map(function(p) {
      var heroHeadline = '';
      var modules = [];
      var imageRefs = {};
      (p.sections || []).forEach(function(sec) {
        modules.push((sec.module || '?') + ' (' + (sec.layoutId || '?') + ')');
        (sec.tiles || []).forEach(function(t) {
          if (t && t.imageRef) imageRefs[t.imageRef] = true;
          if (!heroHeadline && t && t.textOverlay && t.textOverlay.heading
              && sec.module && sec.module.indexOf('hero') === 0) {
            heroHeadline = t.textOverlay.heading;
          }
        });
      });
      return {
        name: p.name,
        parentName: (function() {
          if (!p.parentId) return null;
          var parent = (store.pages || []).find(function(pp) { return pp.id === p.parentId; });
          return parent ? parent.name : null;
        })(),
        sectionCount: (p.sections || []).length,
        heroHeadline: heroHeadline,
        modules: modules.slice(0, 12),
        imageRefs: Object.keys(imageRefs),
      };
    }),
  };
  return JSON.stringify(index, null, 2);
}

// Vollständige Page (eine einzige) als JSON mit allen Tile Details, ohne
// Bilder. Für Detail Kontext wenn der User Wording einer konkreten Page
// matchen möchte.
function makeSinglePage(store, pageId) {
  if (!store || !pageId) return '';
  var page = (store.pages || []).find(function(p) { return p.id === pageId; });
  if (!page) return '';
  var slim = Object.assign({}, page, {
    sections: (page.sections || []).map(function(s) {
      return Object.assign({}, s, {
        tiles: (s.tiles || []).map(function(t) {
          var c = Object.assign({}, t);
          if (c.uploadedImage) c.uploadedImage = '<image weggelassen>';
          if (c.uploadedImageMobile) c.uploadedImageMobile = '<image weggelassen>';
          if (c.referenceImages) c.referenceImages = (c.referenceImages || []).map(function() { return '<ref image>'; });
          return c;
        }),
      });
    }),
  });
  return JSON.stringify(slim, null, 2);
}

export default function PatchImportModal({ onClose, onApply, store, currentPageId }) {
  var [text, setText] = useState('');
  var [error, setError] = useState('');
  var [busy, setBusy] = useState(false);
  var [copied, setCopied] = useState('');

  var doCopy = function(content, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(function() {
        setCopied(label);
        setTimeout(function() { setCopied(''); }, 3000);
      });
    }
  };

  var brandIndex = makeBrandIndex(store);
  var indexSize = Math.round(brandIndex.length / 1024);
  var currentPage = store && currentPageId ? (store.pages || []).find(function(p) { return p.id === currentPageId; }) : null;
  var currentPageJson = currentPage ? makeSinglePage(store, currentPage.id) : '';
  var currentPageSize = currentPageJson ? Math.round(currentPageJson.length / 1024) : 0;

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
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto', marginBottom: 8 }}>
            {PATCH_PROMPT}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={function() { doCopy(PATCH_PROMPT, 'prompt'); }} style={{ fontSize: 12, padding: '6px 14px' }}>
              Prompt kopieren
            </button>
            {copied === 'prompt' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt kopiert</span>}
          </div>
        </div>

        {/* Schritt 2, Brand Voice Index als Kontext */}
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#92400e', fontSize: 13 }}>Schritt 2: Kontext mitgeben (zwei Optionen)</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Damit Claude Brand Voice und Page Struktur kennt, gib einen Kontext Block mit. Default ist der schlanke <b>Brand Voice Index</b> (Brand Felder plus pro Page Name, Hero Headline, Modul Liste, imageRef Tags). Klein genug für jeden Chat. Wenn Claude Detail einer bestimmten Page braucht, fragt es nach und du kannst die Page einzeln nachliefern.
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            <button className="btn" onClick={function() { doCopy(brandIndex, 'index'); }} style={{ fontSize: 12, padding: '6px 14px', background: '#fff', border: '1px solid #fde68a' }}>
              Brand Voice Index kopieren
            </button>
            <span style={{ fontSize: 10, color: '#92400e' }}>kompakt, {indexSize} KB</span>
            {copied === 'index' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Index kopiert</span>}
          </div>
          {currentPage && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn" onClick={function() { doCopy(currentPageJson, 'page'); }} style={{ fontSize: 12, padding: '6px 14px', background: '#fff', border: '1px solid #fde68a' }}>
                Aktuelle Page voll kopieren
              </button>
              <span style={{ fontSize: 10, color: '#92400e' }}>{currentPage.name}, {currentPageSize} KB</span>
              {copied === 'page' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Page kopiert</span>}
            </div>
          )}
          <div style={{ fontSize: 10, color: '#78716c', marginTop: 6, fontStyle: 'italic' }}>
            Tipp: erst Index, dann nur die Page voll wenn Claude sie braucht.
          </div>
        </div>

        {/* Schritt 3, Patch JSON einfügen */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: '#0f172a', fontSize: 13 }}>Schritt 3: Patch JSON aus Claude hier einfügen</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 6 }}>
            Nach eurer Abstimmung im Chat gibt Claude einen Patch JSON aus. Hier einfügen, Anwenden klicken. Bestehender Store wird nicht überschrieben.
          </div>
          <div style={{ fontSize: 10, color: '#64748b' }}>
            Verfügbare Operationen: <code>addPage, addSection, addTile, modifyTile, modifySection, deleteSection, deleteTile</code>
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
