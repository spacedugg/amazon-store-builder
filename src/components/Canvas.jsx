import { useState } from 'react';
import SectionView from './SectionView';
import { t } from '../i18n';

export default function Canvas({ store, page, curPage, onSelectPage, sel, onSelect, onAddSection, onDeleteSection, onDuplicateSection, onCopySection, onPasteSection, onMoveSection, onSwapTiles, onChangeLayout, onApplySectionImageCategory, onChangeTileHotspots, viewMode, onHeaderBannerUpload, headerBannerColor, onHeaderBannerColorChange, products, uiLang, hasAutoSave, onLoadAutoSave, onImportRescueJson, onGenerate, onAutoLinkSubpages }) {
  var [hoveredNav, setHoveredNav] = useState(null);
  var [showHeroPicker, setShowHeroPicker] = useState(false);

  // Hero banner is a separate element above the menu, NOT a section tile
  var isHeroBannerSelected = sel && sel.sid === '__heroBanner__';

  function handleHeroBannerClick() {
    onSelect({ sid: '__heroBanner__' });
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
            {onImportRescueJson && (
              <label className="btn" style={{ padding: '10px 20px', fontSize: 12, marginLeft: 10, cursor: 'pointer' }} title="Rescue JSON Datei aus DevTools Snippet zurück in den Editor laden">
                Rescue JSON laden
                <input type="file" accept="application/json,.json" style={{ display: 'none' }}
                  onChange={function(e) {
                    var file = e.target.files && e.target.files[0];
                    if (!file) return;
                    var reader = new FileReader();
                    reader.onload = function(ev) {
                      try {
                        var parsed = JSON.parse(ev.target.result);
                        onImportRescueJson(parsed);
                      } catch (err) {
                        alert('Konnte JSON nicht parsen: ' + err.message);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} />
              </label>
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
        {/* Header banner (above nav) — independent from sections */}
        <div className="canvas-header-banner" onClick={handleHeroBannerClick} style={{ cursor: 'pointer', outline: isHeroBannerSelected ? '2px solid #f59e0b' : undefined, outlineOffset: -2, borderRadius: 2, position: 'relative' }}>
          {isHeroBannerSelected && (
            <div style={{ position: 'absolute', top: 4, left: 4, zIndex: 2, background: '#f59e0b', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>Store Hero Banner</div>
          )}
          {page && page.heroBannerBrief && !bannerSrc && (
            <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, zIndex: 2, fontSize: 9, color: '#64748b', padding: '2px 6px', background: 'rgba(255,255,255,0.8)', borderRadius: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {page.heroBannerBrief}
            </div>
          )}
          {bannerSrc ? (
            <div style={{ cursor: 'pointer' }}>
              <img src={bannerSrc} className="header-banner-img" alt="" />
            </div>
          ) : (
            <div className="header-banner-placeholder" style={headerBannerColor ? { background: headerBannerColor, borderColor: headerBannerColor } : undefined}>
              <span>{t('canvas.headerBanner', uiLang)} ({isMobile ? '1680 x 900' : '3000 x 600'})</span>
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
          {store.websiteData && store.websiteData.logoDataUrl && (
            <img src={store.websiteData.logoDataUrl} alt="" style={{ height: 28, borderRadius: 4, marginRight: 8, flexShrink: 0 }} />
          )}
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

        {/* Auto Link Subpages Toolbar. Zeigt sich nur auf Parent Pages, die
            mindestens eine Subpage haben und mindestens eine Bildkachel ohne
            Link enthalten. Verlinkt die Kacheln in Reihenfolge mit den
            Subpages, ueberschreibt nichts Bestehendes. */}
        {(function() {
          if (!onAutoLinkSubpages) return null;
          var subpages = store.pages.filter(function(p) { return p.parentId === page.id; });
          if (subpages.length === 0) return null;
          var IMAGE_TYPES = { image: 1, shoppable_image: 1, image_text: 1 };
          var unlinkedCount = 0;
          (page.sections || []).forEach(function(sec) {
            (sec.tiles || []).forEach(function(t) {
              if (IMAGE_TYPES[t.type] && !t.linkUrl && !t.linkAsin) unlinkedCount += 1;
            });
          });
          if (unlinkedCount === 0) return null;
          var willLink = Math.min(unlinkedCount, subpages.length);
          return (
            <div style={{
              margin: '8px 12px', padding: '8px 12px',
              background: 'linear-gradient(90deg, rgba(124,58,237,.08), rgba(99,102,241,.08))',
              border: '1px dashed #a78bfa', borderRadius: 8,
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#4c1d95',
            }}>
              <span style={{ fontSize: 14 }}>&#128279;</span>
              <div style={{ flex: 1 }}>
                Diese Page hat <b>{subpages.length}</b> Subpage{subpages.length !== 1 ? 's' : ''} und <b>{unlinkedCount}</b> noch nicht verlinkte Bildkachel{unlinkedCount !== 1 ? 'n' : ''}.
              </div>
              <button onClick={onAutoLinkSubpages}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                title={'Verlinkt die naechsten ' + willLink + ' Bildkachel(n) automatisch mit den Subpages.'}>
                Auto-Link {willLink} Kachel{willLink !== 1 ? 'n' : ''}
              </button>
            </div>
          );
        })()}

        {/* Sections */}
        {page.sections.map(function(sec, si) {
          // Hotspot Drag Callbacks pro shoppable_image Kachel aufbauen. Damit
          // bekommt TileView ein onChangeHotspots, sobald der Operator den
          // Mauszeiger auf einem Hotspot drueckt.
          var previewByTileIndex = null;
          if (onChangeTileHotspots) {
            previewByTileIndex = {};
            (sec.tiles || []).forEach(function(tile, ti) {
              if (tile.type !== 'shoppable_image') return;
              previewByTileIndex[ti] = {
                src: null,
                onClear: null,
                onChangeHotspots: function(newList) { onChangeTileHotspots(sec.id, ti, newList); },
              };
            });
          }
          return (
            <SectionView key={sec.id} section={sec} idx={si}
              totalSections={page.sections.length} sel={sel} onSelect={onSelect}
              onDelete={function() { onDeleteSection(sec.id); }}
              onDuplicate={function() { onDuplicateSection(sec.id); }}
              onCopy={function() { onCopySection(sec.id); }}
              onMoveUp={si > 0 ? function() { onMoveSection(sec.id, si - 1); } : null}
              onMoveDown={si < page.sections.length - 1 ? function() { onMoveSection(sec.id, si + 1); } : null}
              onChangeLayout={function(layoutId) { onChangeLayout(sec.id, layoutId); }}
              onApplyImageCategory={onApplySectionImageCategory ? function(cat) { onApplySectionImageCategory(sec.id, cat); } : null}
              onSwapTiles={onSwapTiles ? function(fromIdx, toIdx) { onSwapTiles(sec.id, fromIdx, toIdx); } : null}
              viewMode={viewMode}
              products={products}
              uiLang={uiLang}
              previewByTileIndex={previewByTileIndex}
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
