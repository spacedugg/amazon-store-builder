import { t, UI_LANGUAGES } from '../i18n';

export default function Topbar({ store, onGenerate, onShowAsins, onShowPrice, onExport, onSave, viewMode, onToggleView, uiLang, onChangeLang }) {
  return (
    <div className="topbar">
      <div className="topbar-brand">
        <span className="topbar-icon">&#x1F3EA;</span>
        <span className="topbar-title"><span style={{ color: '#FF9900' }}>Store</span> Builder</span>
      </div>
      {store.brandName && (
        <div className="topbar-info">
          {store.brandName} &middot; {(store.products || []).length} {t('app.products', uiLang)} &middot; {(store.pages || []).length} {t('app.pages', uiLang)}
        </div>
      )}
      <div style={{ flex: 1 }} />

      {/* Language selector */}
      <select
        className="topbar-lang-select"
        value={uiLang}
        onChange={function(e) { onChangeLang(e.target.value); }}
        title={t('app.title', uiLang)}
      >
        {UI_LANGUAGES.map(function(lang) {
          return <option key={lang.code} value={lang.code}>{lang.native}</option>;
        })}
      </select>

      {store.pages.length > 0 && (
        <>
          {/* Desktop / Mobile toggle */}
          <div className="view-toggle">
            <button className={'view-toggle-btn' + (viewMode === 'desktop' ? ' active' : '')} onClick={function() { onToggleView('desktop'); }} title={t('app.desktopView', uiLang)}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="currentColor"><rect x="0" y="0" width="14" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className={'view-toggle-btn' + (viewMode === 'mobile' ? ' active' : '')} onClick={function() { onToggleView('mobile'); }} title={t('app.mobileView', uiLang)}>
              <svg width="9" height="14" viewBox="0 0 9 14" fill="currentColor"><rect x="0" y="0" width="9" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="3" y1="12" x2="6" y2="12" stroke="currentColor" strokeWidth="1"/></svg>
            </button>
          </div>
          <button className="btn" onClick={onShowAsins} title={t('asins.title', uiLang)}>ASINs ({(store.asins || []).length})</button>
          <button className="btn" onClick={onShowPrice} title={t('price.title', uiLang)}>&#8364;</button>
          <button className="btn" onClick={onSave} title={t('app.save', uiLang)}>{t('app.save', uiLang)}</button>
          <button className="btn" onClick={onExport} title={t('app.exportDocx', uiLang)}>{t('app.exportDocx', uiLang)}</button>
        </>
      )}
      <button className="btn btn-primary" onClick={onGenerate}>{t('app.generate', uiLang)}</button>
    </div>
  );
}
