import { useState, useRef } from 'react';
import { AMAZON_CATEGORIES, COMPLEXITY_LEVELS } from '../constants';
import { t, UI_LANGUAGES } from '../i18n';

function parseAsinFile(text) {
  var asins = [];
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  text.split(/[\r\n]+/).filter(Boolean).forEach(function(line) {
    var upper = line.toUpperCase();
    var idx = upper.indexOf('B0');
    if (idx >= 0) {
      var end = idx + 2;
      while (end < upper.length && CHARS.indexOf(upper[end]) >= 0) end++;
      if (end - idx >= 10) {
        var asin = upper.slice(idx, end);
        if (asins.indexOf(asin) < 0) asins.push(asin);
      }
    }
  });
  return asins;
}

export default function GenerateModal({ onClose, onGenerate, uiLang }) {
  var [brand, setBrand] = useState('');
  var [marketplace, setMarketplace] = useState('de');
  var [instructions, setInstructions] = useState('');
  var [asins, setAsins] = useState([]);
  var [pasteMode, setPasteMode] = useState(false);
  var [pasteText, setPasteText] = useState('');
  var [complexity, setComplexity] = useState(2);
  var [category, setCategory] = useState('generic');
  var [briefingLang, setBriefingLang] = useState(uiLang || 'en');
  var fileRef = useRef(null);

  var onFileChange = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) { setAsins(parseAsinFile(ev.target.result)); };
    reader.readAsText(f);
    if (fileRef.current) fileRef.current.value = '';
  };

  var onPasteConfirm = function() {
    if (pasteText.trim()) {
      setAsins(parseAsinFile(pasteText));
      setPasteMode(false);
    }
  };

  var canGenerate = brand.trim() && asins.length > 0;
  var levelInfo = COMPLEXITY_LEVELS[complexity];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={function(e) { e.stopPropagation(); }} style={{ maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-title">{t('gen.title', uiLang)}</div>

        {/* 1. ASIN Upload */}
        <label className="label">1. {t('gen.uploadAsins', uiLang)} *</label>
        {!pasteMode ? (
          <>
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" style={{ display: 'none' }} onChange={onFileChange} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={'btn' + (asins.length ? ' btn-green' : '')}
                style={{ flex: 1, padding: 8 }}
                onClick={function() { fileRef.current && fileRef.current.click(); }}
              >
                {asins.length ? asins.length + ' ' + t('gen.asinsLoaded', uiLang) : t('gen.uploadCsv', uiLang)}
              </button>
              <button className="btn" style={{ padding: 8 }} onClick={function() { setPasteMode(true); }}>
                {t('gen.paste', uiLang)}
              </button>
            </div>
          </>
        ) : (
          <>
            <textarea
              className="input"
              rows={4}
              placeholder="B0XXXXXXXXXX&#10;B0YYYYYYYYYY"
              value={pasteText}
              onChange={function(e) { setPasteText(e.target.value); }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button className="btn" onClick={function() { setPasteMode(false); }}>{t('gen.cancel', uiLang)}</button>
              <button className="btn btn-primary" onClick={onPasteConfirm}>{t('gen.parseAsins', uiLang)}</button>
            </div>
          </>
        )}
        <div className="hint">{t('gen.asinHint', uiLang)}</div>
        {asins.length > 0 && (
          <div className="asin-preview">
            {asins.slice(0, 6).join(', ')}{asins.length > 6 ? ' +' + (asins.length - 6) + ' more' : ''}
          </div>
        )}

        {/* 2. Brand Name */}
        <label className="label" style={{ marginTop: 10 }}>2. {t('gen.brandName', uiLang)} *</label>
        <input value={brand} onChange={function(e) { setBrand(e.target.value); }} className="input" placeholder="e.g. Futum, Kaercher, Nespresso" />

        {/* 3. Marketplace */}
        <label className="label">3. {t('gen.marketplace', uiLang)}</label>
        <select value={marketplace} onChange={function(e) { setMarketplace(e.target.value); }} className="input">
          <option value="de">Amazon.de (Germany)</option>
          <option value="com">Amazon.com (USA)</option>
          <option value="co.uk">Amazon.co.uk (UK)</option>
          <option value="fr">Amazon.fr (France)</option>
        </select>

        {/* 4. Product Category */}
        <label className="label">4. {t('gen.category', uiLang)}</label>
        <select value={category} onChange={function(e) { setCategory(e.target.value); }} className="input">
          {AMAZON_CATEGORIES.map(function(cat) {
            return <option key={cat.id} value={cat.id}>{cat.name}</option>;
          })}
        </select>
        <div className="hint">{t('gen.categoryHint', uiLang)}</div>

        {/* 5. Complexity Slider */}
        <label className="label" style={{ marginTop: 10 }}>5. {t('gen.complexity', uiLang)}</label>
        <div className="complexity-slider">
          <div className="complexity-track">
            {[1, 2, 3].map(function(level) {
              var info = COMPLEXITY_LEVELS[level];
              var isActive = complexity === level;
              return (
                <button
                  key={level}
                  className={'complexity-option' + (isActive ? ' active' : '')}
                  onClick={function() { setComplexity(level); }}
                >
                  <span className="complexity-level">{level}</span>
                  <span className="complexity-name">
                    {t('gen.complexity' + info.name, uiLang)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="complexity-desc">
            {t('gen.complexity' + levelInfo.name + 'Desc', uiLang)}
          </div>
        </div>

        {/* 6. Briefing Language */}
        <label className="label" style={{ marginTop: 10 }}>6. {t('gen.briefingLanguage', uiLang)}</label>
        <select value={briefingLang} onChange={function(e) { setBriefingLang(e.target.value); }} className="input">
          {UI_LANGUAGES.map(function(lang) {
            return <option key={lang.code} value={lang.code}>{lang.native} ({lang.name})</option>;
          })}
        </select>
        <div className="hint">{t('gen.briefingLanguageHint', uiLang)}</div>

        {/* 7. Instructions */}
        <label className="label" style={{ marginTop: 10 }}>7. {t('gen.instructions', uiLang)}</label>
        <textarea
          value={instructions}
          onChange={function(e) { setInstructions(e.target.value); }}
          className="input"
          rows={2}
          placeholder={t('gen.instructionsPlaceholder', uiLang)}
        />

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>{t('gen.cancel', uiLang)}</button>
          <button
            className="btn btn-primary"
            disabled={!canGenerate}
            onClick={function() {
              onGenerate({
                brand: brand.trim(),
                marketplace: marketplace,
                instructions: instructions,
                asins: asins,
                complexity: complexity,
                category: category,
                briefingLang: briefingLang,
              });
            }}
          >
            {t('gen.scrapeGenerate', uiLang)} ({asins.length} ASINs)
          </button>
        </div>
      </div>
    </div>
  );
}
