import { useState } from 'react';
import { t, UI_LANGUAGES } from '../i18n';

function stripImagesFromStore(store) {
  if (!store) return null;
  return Object.assign({}, store, {
    headerBanner: store.headerBanner ? '<image>' : null,
    headerBannerMobile: store.headerBannerMobile ? '<image>' : null,
    pages: (store.pages || []).map(function(pg) {
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
}

function downloadJson(content, filename) {
  var blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

export default function ExportModal({ onClose, onExport, store, uiLang }) {
  var [briefingLang, setBriefingLang] = useState(uiLang || 'en');

  var brandSlug = ((store && store.brandName) || 'store').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'store';
  var fullJson = store ? JSON.stringify(store, null, 2) : '';
  var slimJson = store ? JSON.stringify(stripImagesFromStore(store), null, 2) : '';
  var fullSize = Math.round(fullJson.length / 1024);
  var slimSize = Math.round(slimJson.length / 1024);
  var withImages = fullSize > slimSize + 10;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 540 }}>
        <div className="modal-title">{t('export.title', uiLang)}</div>

        {/* Designer Briefing als DOCX */}
        <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Designer Briefing (DOCX)</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Fertig formatiertes Briefing für den Designer als Word Dokument.</div>
          <label className="label">{t('export.briefingLanguage', uiLang)}</label>
          <select value={briefingLang} onChange={function(e) { setBriefingLang(e.target.value); }} className="input">
            {UI_LANGUAGES.map(function(lang) {
              return <option key={lang.code} value={lang.code}>{lang.native} ({lang.name})</option>;
            })}
          </select>
          <div className="hint">{t('export.briefingLanguageHint', uiLang)}</div>
          <button className="btn btn-primary" onClick={function() { onExport(briefingLang); }} style={{ marginTop: 8 }}>
            {t('export.download', uiLang)}
          </button>
        </div>

        {/* Store JSON Download */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Store JSON</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 1.4 }}>
            Kompletter Store als JSON Datei. Für lokales Backup, Migration in einen anderen Store, oder als Input für den Skill Refactor Mode in Claude Code (regeneriert den Store nach aktuellen Regeln).
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              className="btn"
              disabled={!store || !store.pages || !store.pages.length}
              onClick={function() {
                if (!store) return;
                downloadJson(slimJson, brandSlug + '-store-slim.json');
              }}
              style={{ fontSize: 12, textAlign: 'left' }}
              title="Store JSON ohne hochgeladene Bilder. Klein und für den Skill Refactor Mode oder Chat File Attachment geeignet. Bilder werden im Tool durch erneutes Hochladen wieder gefüllt.">
              <b>Schlank ohne Bilder ({slimSize} KB)</b>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>Empfohlen für Chat / Skill Refactor</div>
            </button>
            {withImages && (
              <button
                className="btn"
                disabled={!store || !store.pages || !store.pages.length}
                onClick={function() {
                  if (!store) return;
                  downloadJson(fullJson, brandSlug + '-store-full.json');
                }}
                style={{ fontSize: 12, textAlign: 'left' }}
                title="Kompletter Store inklusive base64 Bildern. Für vollständiges lokales Backup.">
                <b>Komplett mit Bildern ({fullSize} KB)</b>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 400 }}>Lokales Backup, vollständig</div>
              </button>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{t('gen.cancel', uiLang)}</button>
        </div>
      </div>
    </div>
  );
}
