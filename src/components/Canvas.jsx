import SectionView from './SectionView';
import { t } from '../i18n';

export default function Canvas({ store, page, curPage, onSelectPage, sel, onSelect, onAddSection, onDeleteSection, onMoveSection, onChangeLayout, viewMode, onHeaderBannerUpload, products, uiLang, hasAutoSave, onLoadAutoSave, onGenerate }) {
  if (!page) {
    return (
      <div className="canvas">
        <div className="canvas-empty">
          <div className="empty-icon">&#x1F3EA;</div>
          <div className="empty-title">Amazon Brand Store Builder</div>
          <div className="empty-subtitle">{t('canvas.empty', uiLang)}</div>
          <div className="empty-actions">
            <button className="btn btn-primary" style={{ padding: '10px 28px', fontSize: 13 }} onClick={onGenerate}>
              {t('app.generate', uiLang)}
            </button>
            {hasAutoSave && (
              <button className="btn" style={{ padding: '10px 20px', fontSize: 12, marginLeft: 10 }} onClick={onLoadAutoSave}>
                Continue last session
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  var isMobile = viewMode === 'mobile';
  var headerBanner = page.headerBanner || store.headerBanner || null;
  var headerBannerMobile = page.headerBannerMobile || store.headerBannerMobile || null;
  var bannerSrc = isMobile ? (headerBannerMobile || headerBanner) : headerBanner;

  return (
    <div className="canvas">
      <div className={'canvas-inner' + (isMobile ? ' canvas-mobile' : '')}>
        {/* Header banner (above nav) */}
        <div className="canvas-header-banner" onClick={function() { onHeaderBannerUpload && onHeaderBannerUpload(); }}>
          {bannerSrc ? (
            <img src={bannerSrc} className="header-banner-img" alt="" />
          ) : (
            <div className="header-banner-placeholder">
              <span>{t('canvas.headerBanner', uiLang)} ({isMobile ? '1242 x 450' : '3000 x 600'})</span>
              <span className="header-banner-hint">Click to upload</span>
            </div>
          )}
        </div>

        {/* Store nav bar */}
        <div className="canvas-store-header">
          <div className="store-brand-name">{store.brandName || 'Brand Store'}</div>
          <div className="store-nav-tabs">
            {store.pages.map(function(pg) {
              return (
                <span key={pg.id}
                  className={'store-nav-tab' + (pg.id === curPage ? ' active' : '')}
                  onClick={function() { onSelectPage(pg.id); }}>
                  {pg.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sections */}
        {page.sections.map(function(sec, si) {
          return (
            <SectionView key={sec.id} section={sec} idx={si}
              totalSections={page.sections.length} sel={sel} onSelect={onSelect}
              onDelete={function() { onDeleteSection(sec.id); }}
              onMoveUp={si > 0 ? function() { onMoveSection(sec.id, si - 1); } : null}
              onMoveDown={si < page.sections.length - 1 ? function() { onMoveSection(sec.id, si + 1); } : null}
              onChangeLayout={function(layoutId) { onChangeLayout(sec.id, layoutId); }}
              viewMode={viewMode}
              products={products}
              uiLang={uiLang}
            />
          );
        })}

        <div className="add-section-bar">
          <button className="btn add-section-btn" onClick={onAddSection}>+ {t('canvas.addSection', uiLang)}</button>
        </div>
      </div>
    </div>
  );
}
