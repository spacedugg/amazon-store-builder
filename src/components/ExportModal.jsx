import { useState } from 'react';
import { t, UI_LANGUAGES } from '../i18n';

export default function ExportModal({ onClose, onExport, uiLang }) {
  var [briefingLang, setBriefingLang] = useState(uiLang || 'en');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 400 }}>
        <div className="modal-title">{t('export.title', uiLang)}</div>

        <label className="label">{t('export.briefingLanguage', uiLang)}</label>
        <select value={briefingLang} onChange={function(e) { setBriefingLang(e.target.value); }} className="input">
          {UI_LANGUAGES.map(function(lang) {
            return <option key={lang.code} value={lang.code}>{lang.native} ({lang.name})</option>;
          })}
        </select>
        <div className="hint">{t('export.briefingLanguageHint', uiLang)}</div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{t('gen.cancel', uiLang)}</button>
          <button className="btn btn-primary" onClick={function() { onExport(briefingLang); }}>
            {t('export.download', uiLang)}
          </button>
        </div>
      </div>
    </div>
  );
}
