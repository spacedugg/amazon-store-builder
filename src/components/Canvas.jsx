import { useState } from 'react';
import SectionView from './SectionView';
import { t } from '../i18n';

export default function Canvas({ store, page, curPage, onSelectPage, sel, onSelect, onAddSection, onDeleteSection, onDuplicateSection, onCopySection, onPasteSection, onMoveSection, onChangeLayout, viewMode, onHeaderBannerUpload, headerBannerColor, onHeaderBannerColorChange, products, uiLang, hasAutoSave, onLoadAutoSave, onGenerate }) {
  var [hoveredNav, setHoveredNav] = useState(null);
  var [showHeroPicker, setShowHeroPicker] = useState(false);

  // Find hero tile in the current page's sections so we can select it
  var heroSel = null;
  if (page) {
    page.sections.forEach(function(sec) {
      if (heroSel) return;
      sec.tiles.forEach(function(tile, ti) {
        if (!heroSel && tile.imageCategory === 'store_hero') {
          heroSel = { sid: sec.id, ti: ti };
        }
      });
    });
  }
  var isHeroSelected = heroSel && sel && sel.sid === heroSel.sid && sel.ti === heroSel.ti;

  function handleHeroClick() {
    if (heroSel) {
      onSelect(heroSel);
    }
  }
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
                {t('canvas.continueSession', uiLang)}
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
        <div className="canvas-header-banner" onClick={handleHeroClick} style={{ cursor: heroSel ? 'pointer' : undefined, outline: isHeroSelected ? '2px solid #6366f1' : undefined, outlineOffset: -2, borderRadius: 2, position: 'relative' }}>
          {isHeroSelected && (
            <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 2, background: '#6366f1', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>Store Hero Image</div>
          )}
          {bannerSrc ? (
            <div style={{ cursor: 'pointer' }}>
              <img src={bannerSrc} className="header-banner-img" alt="" />
            </div>
          ) : (
            <div className="header-banner-placeholder" style={headerBannerColor ? { background: headerBannerColor, borderColor: headerBannerColor } : undefined}>
              <span>{t('canvas.headerBanner', uiLang)} ({isMobile ? '1242 x 450' : '3000 x 600'})</span>
              <div className="header-banner-actions">
                <button className="btn" style={{ fontSize: 10, padding: '4px 10px' }} onClick={function(e) { e.stopPropagation(); onHeaderBannerUpload && onHeaderBannerUpload(); }}>
                  Bild hochladen
                </button>
                <button className="btn" style={{ fontSize: 10, padding: '4px 10px' }} onClick={function(e) { e.stopPropagation(); setShowHeroPicker(!showHeroPicker); }}>
                  {headerBannerColor ? 'Farbe ändern' : 'Nur Farbe'}
                </button>
                {headerBannerColor && (
                  <button className="btn" style={{ fontSize: 10, padding: '4px 10px' }} onClick={function(e) { e.stopPropagation(); onHeaderBannerColorChange(''); }}>
                    Farbe entfernen
                  </button>
                )}
              </div>
              {showHeroPicker && (
                <div className="header-banner-color-picker" onClick={function(e) { e.stopPropagation(); }}>
                  <input
                    type="color"
                    value={headerBannerColor || '#ffffff'}
                    onChange={function(e) { onHeaderBannerColorChange(e.target.value); }}
                    style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', borderRadius: 4 }}
                  />
                  <input
                    value={headerBannerColor || ''}
                    onChange={function(e) { onHeaderBannerColorChange(e.target.value); }}
                    className="input"
                    placeholder="#RRGGBB"
                    style={{ width: 90, fontFamily: 'monospace', fontSize: 11 }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Store nav bar (2-level) */}
        <div className="canvas-store-header">
          <div className="store-brand-name">{store.brandName || 'Brand Store'}</div>
          <div className="store-nav-tabs">
            {store.pages.filter(function(pg) { return !pg.parentId; }).map(function(pg) {
              var children = store.pages.filter(function(cp) { return cp.parentId === pg.id; });
              var isActive = pg.id === curPage || children.some(function(c) { return c.id === curPage; });
              var hasDropdown = children.length > 0;

              return (
                <div key={pg.id} className="store-nav-item"
                  onMouseEnter={function() { if (hasDropdown) setHoveredNav(pg.id); }}
                  onMouseLeave={function() { setHoveredNav(null); }}>
                  <span
                    className={'store-nav-tab' + (isActive ? ' active' : '') + (hasDropdown ? ' has-dropdown' : '')}
                    onClick={function() { onSelectPage(pg.id); }}>
                    {pg.name}
                    {hasDropdown && <span className="nav-dropdown-arrow">{'\u25BE'}</span>}
                  </span>
                  {hasDropdown && hoveredNav === pg.id && (
                    <div className="nav-dropdown">
                      {children.map(function(child) {
                        return (
                          <div key={child.id}
                            className={'nav-dropdown-item' + (child.id === curPage ? ' active' : '')}
                            onClick={function() { onSelectPage(child.id); setHoveredNav(null); }}>
                            {child.name}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
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
              onDuplicate={function() { onDuplicateSection(sec.id); }}
              onCopy={function() { onCopySection(sec.id); }}
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
          {onPasteSection && (
            <button className="btn add-section-btn" onClick={onPasteSection} style={{ marginLeft: 8 }}>
              {t('section.paste', uiLang)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
