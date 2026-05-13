import { useState } from 'react';

var REFACTOR_PROMPT = 'Aktiviere den Organisations Skill amazon-storefront-design im Refactor Mode. Ich will meinen bestehenden Brand Store nach den aktuellen Skill Regeln neu generieren ohne von Null anzufangen.\n\nHier mein aktueller Store als File Attachment (lade ich gleich an).\n\nWende alle aktuellen Self Check Regeln neu auf jede Page an. Behalte folgende Felder pro Tile unverändert:\n- uploadedImage, uploadedImageMobile, videoThumbnail, wireframeImage, referenceImages\n- asins, linkAsin, hotspots, imageRef Solo Suffixe\n- productSelector Schema\n- bgColor, textAlign\n\nÄndere wo nötig:\n- Headlines, Subheadings, Bodies, Bullets, CTAs nach Brand Voice und Headline Regeln\n- Layouts wo ASIN Grid Stacks vorhanden sind\n- imageCategory Defaults wo nicht passend\n- Section Reihenfolge wo nötig um Stacks aufzulösen\n- Brand Story Tiles auf image (kein image_text mehr)\n- Versand und Lieferung Phrasen ersatzlos streichen\n\nGib am Ende den aktualisierten Store als kompletten JSON zurück plus eine kurze Diff Liste (was wurde geändert). Ich importiere ihn dann über "Neuer Store" plus "JSON Datei wählen" zurück ins Tool.';

export default function JsonExportModal({ onClose, store }) {
  var [copied, setCopied] = useState('');

  var brandSlug = ((store && store.brandName) || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'store';

  var stripImagesFromStore = function(s) {
    return Object.assign({}, s, {
      headerBanner: s.headerBanner ? '<image>' : null,
      headerBannerMobile: s.headerBannerMobile ? '<image>' : null,
      pages: (s.pages || []).map(function(pg) {
        return Object.assign({}, pg, {
          sections: (pg.sections || []).map(function(sec) {
            return Object.assign({}, sec, {
              tiles: (sec.tiles || []).map(function(t) {
                var c = Object.assign({}, t);
                if (c.uploadedImage) c.uploadedImage = '<image>';
                if (c.uploadedImageMobile) c.uploadedImageMobile = '<image>';
                if (c.videoThumbnail) c.videoThumbnail = '<image>';
                if (c.wireframeImage) c.wireframeImage = '<image>';
                if (c.referenceImages) c.referenceImages = (c.referenceImages || []).map(function() { return '<ref image>'; });
                return c;
              }),
            });
          }),
        });
      }),
    });
  };

  var fullJson = store ? JSON.stringify(store, null, 2) : '';
  var slimJson = store ? JSON.stringify(stripImagesFromStore(store), null, 2) : '';
  var fullSize = Math.round(fullJson.length / 1024);
  var slimSize = Math.round(slimJson.length / 1024);
  var hasImages = fullSize > slimSize + 10;

  var doDownload = function(mode) {
    if (!store) return;
    var content = mode === 'full' ? fullJson : slimJson;
    var filename = brandSlug + '-store-' + mode + '.json';
    var blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  };

  var doCopyPrompt = function() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(REFACTOR_PROMPT).then(function() {
        setCopied('prompt');
        setTimeout(function() { setCopied(''); }, 3000);
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 660, padding: 24, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>Store JSON, Backup oder Refactor</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer', lineHeight: 1, padding: 0 }}>&times;</button>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.5, color: '#475569', marginBottom: 14 }}>
          Lade deinen Store als JSON Datei runter. Zwei Use Cases:
        </div>

        {/* Use Case 1: Backup */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f172a', fontSize: 13 }}>Use Case 1: Lokales Backup</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            JSON Datei lokal sichern. Du kannst sie später über <b>Neuer Store</b> plus <b>JSON Datei wählen</b> wieder importieren und den Store damit wiederherstellen.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn"
              disabled={!store || !store.pages || !store.pages.length}
              onClick={function() { doDownload('slim'); }}
              style={{ fontSize: 12, textAlign: 'left' }}
              title="Store JSON ohne hochgeladene Bilder. Klein und für Chat File Attachment oder Skill Refactor Mode.">
              <b>Schlank ohne Bilder ({slimSize} KB)</b>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>Empfohlen, klein genug für Chat plus Skill Refactor</div>
            </button>
            {hasImages && (
              <button
                className="btn"
                disabled={!store || !store.pages || !store.pages.length}
                onClick={function() { doDownload('full'); }}
                style={{ fontSize: 12, textAlign: 'left' }}
                title="Kompletter Store inklusive base64 Bildern. Für vollständiges lokales Backup.">
                <b>Komplett mit Bildern ({fullSize} KB)</b>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>Vollständiges Backup mit hochgeladenen Bildern</div>
              </button>
            )}
          </div>
        </div>

        {/* Use Case 2: Refactor */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#0369a1', fontSize: 13 }}>Use Case 2: Store komplett mit KI neu generieren (Refactor Mode)</div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            Wenn der Skill verbessert wurde und du den ganzen Store auf den neuen Stand bringen willst (Headlines, Layouts, Self Check Regeln). Anders als bei <b>+ Snippet</b> wird hier nicht nur eine Stelle geändert, sondern <b>jede Page neu durchlaufen</b>.
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.5, color: '#334155', marginBottom: 8 }}>
            <b>So gehts:</b>
            <ol style={{ margin: '4px 0 0 18px', padding: 0 }}>
              <li>Schlank ohne Bilder Download (oben) lädst du dir runter</li>
              <li>Öffne einen Claude Code Chat, hänge die JSON Datei als File Attachment an</li>
              <li>Sende den Refactor Prompt (Button unten kopieren)</li>
              <li>Claude gibt aktualisierten Store JSON plus Diff Liste zurück</li>
              <li>Importiere über <b>Neuer Store</b> plus <b>JSON Datei wählen</b>, der bestehende Store wird ersetzt</li>
            </ol>
          </div>
          <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 4, padding: 10, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.4, color: '#334155', whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', marginBottom: 8 }}>
            {REFACTOR_PROMPT}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={doCopyPrompt} style={{ fontSize: 12, padding: '6px 14px' }}>
              Refactor Prompt kopieren
            </button>
            {copied === 'prompt' && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600 }}>Prompt in Zwischenablage</span>}
          </div>
        </div>

        {/* Vergleich zu + Snippet */}
        <div style={{ background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6, padding: 10, marginBottom: 4, fontSize: 11, lineHeight: 1.5, color: '#92400e' }}>
          <b>Unterschied zu + Snippet:</b> Snippet ist für <b>gezielte kleine Änderungen</b> (eine Section ergänzen, eine Headline ändern, bestehender Store bleibt). Refactor ist für <b>komplette Neugeneration</b> nach Skill Update (alle Pages werden durchgespielt, Store wird ersetzt).
        </div>

        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Schließen</button>
        </div>
      </div>
    </div>
  );
}
