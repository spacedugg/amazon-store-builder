import { useState, useEffect, useRef } from 'react';
import { LAYOUTS, LAYOUT_TILE_DIMS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_TYPES, findLayout } from '../constants';
import { loadStoreByShareToken } from '../storage';
import { generateBriefingDocx, downloadBlob } from '../exportBriefing';
import SectionView from './SectionView';

var noop = function() {};

// ─── INSPIRATION LIBRARY ───
var INSPIRATION_LINKS = [
  { brand: 'Hansegr\u00FCn', url: 'https://www.amazon.de/stores/page/BC9A9642-4612-460E-81B4-985E9AF6A7D2', category: 'Natural' },
  { brand: 'Desktronic', url: 'https://www.amazon.de/stores/Desktronic/page/1A862649-6CEA-4E30-855F-0C27A1F99A6C', category: 'Office' },
  { brand: 'Nespresso', url: 'https://www.amazon.de/stores/page/2429E3F3-8BFA-466A-9185-35FB47867B06', category: 'Premium' },
  { brand: 'Snocks', url: 'https://www.amazon.de/stores/SNOCKS/page/C0392661-40E4-498F-992D-2FFEB9086ABB', category: 'Fashion' },
  { brand: 'Bears with Benefits', url: 'https://www.amazon.de/stores/BearswithBenefits/page/AFC77FAF-F173-4A4E-A7DF-8779F7E16E97', category: 'Health' },
  { brand: 'K\u00E4rcher', url: 'https://www.amazon.de/stores/K%C3%A4rcher/page/EFE3653A-1163-432C-A85B-0486A31C0E3D', category: 'Tools' },
  { brand: 'Holy', url: 'https://www.amazon.de/stores/HOLYEnergy/page/7913E121-CB43-4349-A8D2-9F0843B226E4', category: 'Food & Drinks' },
  { brand: 'Nucao', url: 'https://www.amazon.de/stores/thenucompany/page/A096FF51-79D5-440D-8789-6255E9DFE87D', category: 'Food' },
  { brand: 'ESN', url: 'https://www.amazon.de/stores/ESN/page/F5F8CAD5-7990-44CF-9F5B-61DFFF5E8581', category: 'Sports Nutrition' },
  { brand: 'Blackroll', url: 'https://www.amazon.de/stores/page/870649DE-4F7E-421F-B141-C4C47864D539', category: 'Fitness' },
  { brand: 'AG1', url: 'https://www.amazon.de/stores/AG1/page/E676C84A-8A86-4F92-B978-3343F367DD0C', category: 'Health' },
  { brand: 'North Face', url: 'https://www.amazon.de/stores/THENORTHFACE/page/91172724-C342-482B-A300-564D9EA5E09F', category: 'Outdoor' },
];

// Section color palette for visual distinction
var SECTION_COLORS = [
  { bg: '#eff6ff', border: '#3b82f6', label: '#1d4ed8' },
  { bg: '#f0fdf4', border: '#22c55e', label: '#15803d' },
  { bg: '#fdf4ff', border: '#d946ef', label: '#a21caf' },
  { bg: '#fff7ed', border: '#f97316', label: '#c2410c' },
  { bg: '#faf5ff', border: '#a855f7', label: '#7e22ce' },
  { bg: '#fefce8', border: '#eab308', label: '#a16207' },
  { bg: '#f0fdfa', border: '#14b8a6', label: '#0f766e' },
  { bg: '#fef2f2', border: '#ef4444', label: '#b91c1c' },
];

function getSectionColor(index) {
  return SECTION_COLORS[index % SECTION_COLORS.length];
}

// ─── IMAGE TYPE TAG COLORS ───
var IMAGE_TYPE_COLORS = {
  benefit: '#10b981',
  creative: '#6366f1',
  lifestyle: '#f59e0b',
  product: '#3b82f6',
  textimage: '#ec4899',
};

// ─── TILE DETAIL CARD (for right panel) ───
function TileDetail({ tile, tileIndex, layoutId, viewMode, sectionColor }) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  var desktopType = dims && dims[tileIndex] ? dims[tileIndex] : null;
  var tileLabel = TILE_TYPE_LABELS[tile.type] || tile.type;
  var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;

  // Parse image type tag from brief
  var imageTypeKey = null;
  if (tile.brief) {
    var match = tile.brief.match(/^\[(\w+)\]/);
    if (match) {
      var tag = match[1].toLowerCase();
      if (IMAGE_TYPES[tag]) imageTypeKey = tag;
    }
  }

  return (
    <div className="briefing-tile-detail" style={{ borderLeft: '3px solid ' + sectionColor.border }}>
      <div className="briefing-tile-header">
        <span className="briefing-tile-index">T{tileIndex + 1}</span>
        <span className="briefing-tile-type">{tileLabel}</span>
        {imageTypeKey && (
          <span className="briefing-tile-imgtag" style={{ background: IMAGE_TYPE_COLORS[imageTypeKey] + '18', color: IMAGE_TYPE_COLORS[imageTypeKey] }}>
            {IMAGE_TYPES[imageTypeKey].name}
          </span>
        )}
        {desktopType && <span className="briefing-tile-imgtype">{desktopType.label} ({desktopType.w}&times;{desktopType.h})</span>}
      </div>

      {tile.brief && (
        <div className="briefing-field">
          <span className="briefing-field-value">{tile.brief.replace(/^\[\w+\]\s*/, '')}</span>
        </div>
      )}

      {tile.textOverlay && (
        <div className="briefing-field">
          <span className="briefing-field-label">Text:</span>
          <span className="briefing-field-value briefing-field-text">"{tile.textOverlay}"</span>
        </div>
      )}

      {tile.ctaText && (
        <div className="briefing-field">
          <span className="briefing-field-label">CTA:</span>
          <span className="briefing-field-value briefing-field-cta">"{tile.ctaText}"</span>
        </div>
      )}

      {isProduct && tile.asins && tile.asins.length > 0 && (
        <div className="briefing-field">
          <span className="briefing-field-label">ASINs:</span>
          <span className="briefing-field-value briefing-field-mono">{tile.asins.join(', ')}</span>
        </div>
      )}

      {tile.linkAsin && (
        <div className="briefing-field">
          <span className="briefing-field-label">Link:</span>
          <span className="briefing-field-value briefing-field-mono">{tile.linkAsin}</span>
        </div>
      )}

      <div className="briefing-tile-dims-row">
        <span className="briefing-dim">{tile.dimensions ? (tile.dimensions.w + '\u00D7' + tile.dimensions.h) : 'N/A'}</span>
        <span className="briefing-dim-sep">/</span>
        <span className="briefing-dim">{tile.mobileDimensions ? (tile.mobileDimensions.w + '\u00D7' + tile.mobileDimensions.h) : 'N/A'}</span>
      </div>
    </div>
  );
}

// ─── SECTION BRIEFING (visual preview only) ───
function SectionBriefing({ section, sectionIndex, viewMode, products, sectionColor }) {
  var layout = findLayout(section.layoutId);

  return (
    <div className="briefing-section" style={{ borderLeft: '3px solid ' + sectionColor.border, background: sectionColor.bg }}>
      <div className="briefing-section-header">
        <span className="briefing-section-label" style={{ color: sectionColor.label }}>Section {sectionIndex + 1}</span>
        <span className="briefing-section-layout">{layout.name}</span>
      </div>

      <div className="briefing-section-preview">
        <SectionView
          section={section}
          idx={sectionIndex}
          totalSections={1}
          sel={null}
          onSelect={noop}
          onDelete={noop}
          onMoveUp={null}
          onMoveDown={null}
          onChangeLayout={noop}
          viewMode={viewMode}
          products={products || []}
          uiLang="en"
        />
      </div>
    </div>
  );
}

// ─── IMAGE TYPE LIBRARY PANEL ───
function ImageTypeLibrary({ onClose }) {
  var typeKeys = Object.keys(IMAGE_TYPES);

  return (
    <div className="imglib-overlay" onClick={onClose}>
      <div className="imglib-panel" onClick={function(e) { e.stopPropagation(); }}>
        <div className="imglib-header">
          <span className="imglib-title">Image Type Library</span>
          <button className="imglib-close" onClick={onClose}>&times;</button>
        </div>
        <div className="imglib-body">
          {typeKeys.map(function(key) {
            var type = IMAGE_TYPES[key];
            var color = IMAGE_TYPE_COLORS[key];
            return (
              <div key={key} className="imglib-type">
                <div className="imglib-type-header">
                  <span className="imglib-type-tag" style={{ background: color + '18', color: color }}>{type.tag}</span>
                  <span className="imglib-type-name">{type.name}</span>
                </div>
                <p className="imglib-type-desc">{type.description}</p>
                <div className="imglib-type-components">
                  <span className="imglib-components-label">Components:</span>
                  <ul>
                    {type.components.map(function(c, i) {
                      return <li key={i}>{c}</li>;
                    })}
                  </ul>
                </div>
                <div className="imglib-type-usage">
                  <span className="imglib-components-label">Used for:</span> {type.usedFor}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN BRIEFING VIEW ───
export default function BriefingView() {
  var [store, setStore] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [viewMode, setViewMode] = useState('desktop');
  var [curPage, setCurPage] = useState('');
  var [showAllPages, setShowAllPages] = useState(true);
  var [lastUpdated, setLastUpdated] = useState(null);
  var [changeHighlights, setChangeHighlights] = useState({});
  var [updateBanner, setUpdateBanner] = useState(false);
  var [showImageLib, setShowImageLib] = useState(false);
  var prevStoreRef = useRef(null);
  var pollRef = useRef(null);
  var bannerTimeoutRef = useRef(null);

  var token = window.location.pathname.split('/share/')[1];

  // ─── INITIAL LOAD ───
  useEffect(function() {
    if (!token) { setError('No share token provided'); setLoading(false); return; }
    loadStoreByShareToken(token).then(function(result) {
      if (!result || !result.data) { setError('Store not found or link has expired.'); setLoading(false); return; }
      setStore(result.data);
      setLastUpdated(result.updatedAt || new Date().toISOString());
      setCurPage(result.data.pages && result.data.pages[0] ? result.data.pages[0].id : '');
      prevStoreRef.current = JSON.stringify(result.data);
      setLoading(false);
    }).catch(function(e) { setError('Failed to load: ' + e.message); setLoading(false); });
  }, [token]);

  // ─── POLLING FOR CHANGES (every 15s) ───
  useEffect(function() {
    if (!token) return;

    pollRef.current = setInterval(function() {
      if (!prevStoreRef.current) return;
      loadStoreByShareToken(token).then(function(result) {
        if (!result || !result.data) return;
        var newJson = JSON.stringify(result.data);
        var oldJson = prevStoreRef.current;
        if (newJson !== oldJson) {
          var highlights = detectChanges(
            oldJson ? JSON.parse(oldJson) : null,
            result.data
          );
          setChangeHighlights(highlights);
          setUpdateBanner(true);
          setStore(result.data);
          setLastUpdated(result.updatedAt || new Date().toISOString());
          prevStoreRef.current = newJson;
          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = setTimeout(function() { setUpdateBanner(false); }, 30000);
        }
      }).catch(function() { /* silent retry */ });
    }, 15000);

    return function() {
      if (pollRef.current) clearInterval(pollRef.current);
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, [token]);

  // ─── CHANGE DETECTION ───
  function detectChanges(oldStore, newStore) {
    if (!oldStore || !newStore) return {};
    var highlights = {};
    (newStore.pages || []).forEach(function(page) {
      var oldPage = (oldStore.pages || []).find(function(p) { return p.id === page.id; });
      if (!oldPage) { highlights['page-' + page.id] = 'added'; return; }
      (page.sections || []).forEach(function(sec) {
        var oldSec = (oldPage.sections || []).find(function(s) { return s.id === sec.id; });
        if (!oldSec) { highlights['sec-' + sec.id] = 'added'; return; }
        if (sec.layoutId !== oldSec.layoutId) highlights['sec-' + sec.id] = 'modified';
        (sec.tiles || []).forEach(function(tile, ti) {
          var oldTile = oldSec.tiles && oldSec.tiles[ti];
          if (!oldTile) { highlights['tile-' + sec.id + '-' + ti] = 'added'; }
          else if (JSON.stringify(tile) !== JSON.stringify(oldTile)) { highlights['tile-' + sec.id + '-' + ti] = 'modified'; }
        });
      });
      (oldPage.sections || []).forEach(function(sec) {
        var exists = (page.sections || []).find(function(s) { return s.id === sec.id; });
        if (!exists) highlights['sec-' + sec.id] = 'removed';
      });
    });
    (oldStore.pages || []).forEach(function(page) {
      var exists = (newStore.pages || []).find(function(p) { return p.id === page.id; });
      if (!exists) highlights['page-' + page.id] = 'removed';
    });
    return highlights;
  }

  function getHighlightClass(key) {
    var h = changeHighlights[key];
    if (h === 'added') return ' briefing-highlight-added';
    if (h === 'modified') return ' briefing-highlight-modified';
    if (h === 'removed') return ' briefing-highlight-removed';
    return '';
  }

  // ─── DOCX DOWNLOAD ───
  var handleDocxDownload = async function() {
    if (!store) return;
    try {
      var blob = await generateBriefingDocx(store, 'en');
      var filename = (store.brandName || 'store').replace(/[^a-zA-Z0-9]/g, '_') + '_briefing.docx';
      downloadBlob(blob, filename);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  if (loading) return (
    <div className="briefing-loading">
      <div className="briefing-loading-spinner" />
      <div>Loading designer briefing...</div>
    </div>
  );
  if (error) return (
    <div className="briefing-error">
      <div className="briefing-error-icon">!</div>
      <div className="briefing-error-msg">{error}</div>
    </div>
  );
  if (!store) return null;

  var pages = store.pages || [];
  var topPages = pages.filter(function(p) { return !p.parentId; });
  var childrenMap = {};
  topPages.forEach(function(pg) {
    childrenMap[pg.id] = pages.filter(function(cp) { return cp.parentId === pg.id; });
  });
  var googleDriveUrl = store.googleDriveUrl || '';

  var activePage = showAllPages ? null : (pages.find(function(p) { return p.id === curPage; }) || pages[0]);

  // Gather all visible sections for the right panel
  var rightPanelSections = [];
  if (showAllPages) {
    var globalIdx = 0;
    topPages.forEach(function(pg) {
      var children = childrenMap[pg.id] || [];
      pg.sections.forEach(function(sec, si) {
        rightPanelSections.push({ section: sec, sectionIndex: si, pageName: pg.name, colorIndex: globalIdx, layoutId: sec.layoutId });
        globalIdx++;
      });
      children.forEach(function(child) {
        child.sections.forEach(function(sec, si) {
          rightPanelSections.push({ section: sec, sectionIndex: si, pageName: child.name, colorIndex: globalIdx, layoutId: sec.layoutId });
          globalIdx++;
        });
      });
    });
  } else if (activePage) {
    activePage.sections.forEach(function(sec, si) {
      rightPanelSections.push({ section: sec, sectionIndex: si, pageName: activePage.name, colorIndex: si, layoutId: sec.layoutId });
    });
  }

  // Hovered nav for dropdown
  var [hoveredNav, setHoveredNav] = useState(null);

  return (
    <div className="briefing-root">
      {/* Header */}
      <div className="briefing-header">
        <div className="briefing-header-left">
          <span className="briefing-logo">Designer Briefing</span>
          <span className="briefing-brand-name">{store.brandName || 'Store'}</span>
          <span className="briefing-readonly-badge">Read Only</span>
        </div>
        <div className="briefing-header-right">
          <button className="btn briefing-header-btn" onClick={function() { setShowImageLib(true); }} title="Image Type Library">
            Image Types
          </button>
          <button className="btn briefing-header-btn" onClick={handleDocxDownload} title="Download DOCX briefing">
            DOCX
          </button>
          <div className="briefing-view-toggle">
            <button className={'briefing-view-btn' + (viewMode === 'desktop' ? ' active' : '')} onClick={function() { setViewMode('desktop'); }}>Desktop</button>
            <button className={'briefing-view-btn' + (viewMode === 'mobile' ? ' active' : '')} onClick={function() { setViewMode('mobile'); }}>Mobile</button>
          </div>
          <button className={'briefing-view-btn' + (showAllPages ? ' active' : '')} onClick={function() { setShowAllPages(!showAllPages); }}>
            {showAllPages ? 'All Pages' : 'Single Page'}
          </button>
        </div>
      </div>

      {/* Update banner */}
      {updateBanner && (
        <div className="briefing-update-banner">
          The concept has been updated. Changes are highlighted below.
          <button className="briefing-dismiss-btn" onClick={function() { setUpdateBanner(false); setChangeHighlights({}); }}>Dismiss</button>
        </div>
      )}

      <div className="briefing-body">
        {/* LEFT SIDEBAR: Compact info */}
        <div className="briefing-sidebar">
          {/* Store info — compact */}
          <div className="briefing-sidebar-section">
            <div className="briefing-info-compact">
              <span>{store.brandName || 'N/A'}</span>
              <span className="briefing-info-sep">&middot;</span>
              <span>Amazon.{store.marketplace || 'de'}</span>
              <span className="briefing-info-sep">&middot;</span>
              <span>{pages.length} pages</span>
              <span className="briefing-info-sep">&middot;</span>
              <span>{(store.products || []).length} products</span>
            </div>
            {lastUpdated && (
              <div className="briefing-info-updated">Updated: {new Date(lastUpdated).toLocaleString('de-DE')}</div>
            )}
          </div>

          {/* Google Drive */}
          {googleDriveUrl && (
            <div className="briefing-sidebar-section">
              <a href={googleDriveUrl} target="_blank" rel="noopener noreferrer" className="briefing-drive-link">
                Google Drive Folder
              </a>
            </div>
          )}

          {/* Image Dimensions Reference — compact */}
          <div className="briefing-sidebar-section">
            <div className="briefing-sidebar-title">Tile Dimensions</div>
            <div className="briefing-dims-compact">
              <div><strong>LS</strong> 1500&times;1500</div>
              <div><strong>SS</strong> 750&times;750</div>
              <div><strong>W</strong> 1500&times;700</div>
              <div><strong>FW</strong> 3000&times;var</div>
            </div>
            <div className="briefing-dims-note">Header: 3000&times;600 / 1242&times;450</div>
          </div>

          {/* Upload Instructions — compact */}
          <div className="briefing-sidebar-section">
            <div className="briefing-sidebar-title">Upload</div>
            <div className="briefing-upload-compact">
              <div>Subfolder per page</div>
              <div>Name: S1_T1_desktop.jpg</div>
              <div>Desktop + Mobile versions</div>
            </div>
          </div>

          {/* Inspiration */}
          <div className="briefing-sidebar-section">
            <div className="briefing-sidebar-title">Inspiration</div>
            <div className="briefing-inspiration-compact">
              {INSPIRATION_LINKS.map(function(link, i) {
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="briefing-insp-link">
                    {link.brand}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: Store visual preview with integrated nav */}
        <div className="briefing-content">
          {/* Amazon-style Store Navigation Bar */}
          <div className="briefing-store-chrome">
            <div className="briefing-store-brand">{store.brandName || 'Brand Store'}</div>
            <div className="briefing-store-nav">
              {topPages.map(function(pg) {
                var children = childrenMap[pg.id] || [];
                var isActive = showAllPages
                  ? false
                  : (pg.id === curPage || children.some(function(c) { return c.id === curPage; }));
                var hasDropdown = children.length > 0;

                return (
                  <div key={pg.id} className="briefing-nav-tab-wrap"
                    onMouseEnter={function() { if (hasDropdown) setHoveredNav(pg.id); }}
                    onMouseLeave={function() { setHoveredNav(null); }}>
                    <span
                      className={'briefing-nav-tab' + (isActive ? ' active' : '')}
                      onClick={function() { setCurPage(pg.id); setShowAllPages(false); }}>
                      {pg.name}
                      {hasDropdown && <span className="briefing-nav-arrow">{'\u25BE'}</span>}
                    </span>
                    {hasDropdown && hoveredNav === pg.id && (
                      <div className="briefing-nav-dropdown">
                        {children.map(function(child) {
                          return (
                            <div key={child.id}
                              className={'briefing-nav-dd-item' + (child.id === curPage ? ' active' : '')}
                              onClick={function() { setCurPage(child.id); setShowAllPages(false); setHoveredNav(null); }}>
                              {child.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <span
                className={'briefing-nav-tab briefing-nav-all' + (showAllPages ? ' active' : '')}
                onClick={function() { setShowAllPages(true); }}>
                All Pages
              </span>
            </div>
          </div>

          {/* Page content */}
          <div className="briefing-pages-area">
            {showAllPages ? (
              (function() {
                var globalSectionIdx = 0;
                return topPages.map(function(pg, pi) {
                  var children = childrenMap[pg.id] || [];
                  var startIdx = globalSectionIdx;
                  globalSectionIdx += pg.sections.length;
                  children.forEach(function(c) { globalSectionIdx += c.sections.length; });
                  return (
                    <div key={pg.id}>
                      <div className="briefing-page-divider">{pg.name}</div>
                      {pg.sections.map(function(sec, si) {
                        return (
                          <SectionBriefing
                            key={sec.id}
                            section={sec}
                            sectionIndex={si}
                            viewMode={viewMode}
                            products={store.products || []}
                            sectionColor={getSectionColor(startIdx + si)}
                          />
                        );
                      })}
                      {children.map(function(child, ci) {
                        var childStart = startIdx + pg.sections.length;
                        for (var k = 0; k < ci; k++) childStart += children[k].sections.length;
                        return (
                          <div key={child.id}>
                            <div className="briefing-page-divider briefing-page-divider-sub">{child.name}</div>
                            {child.sections.map(function(sec, si) {
                              return (
                                <SectionBriefing
                                  key={sec.id}
                                  section={sec}
                                  sectionIndex={si}
                                  viewMode={viewMode}
                                  products={store.products || []}
                                  sectionColor={getSectionColor(childStart + si)}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()
            ) : (
              (function() {
                var pg = pages.find(function(p) { return p.id === curPage; }) || pages[0];
                if (!pg) return <div className="briefing-empty">No pages found.</div>;
                return pg.sections.map(function(sec, si) {
                  return (
                    <SectionBriefing
                      key={sec.id}
                      section={sec}
                      sectionIndex={si}
                      viewMode={viewMode}
                      products={store.products || []}
                      sectionColor={getSectionColor(si)}
                    />
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Designer Instructions */}
        <div className="briefing-right-panel">
          <div className="briefing-sidebar-title" style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', margin: 0 }}>
            Designer Instructions
          </div>
          <div className="briefing-right-panel-body">
            {rightPanelSections.map(function(item, idx) {
              var color = getSectionColor(item.colorIndex);
              return (
                <div key={idx} className="briefing-right-section-group">
                  <div className="briefing-right-section-header" style={{ background: color.bg, borderLeft: '3px solid ' + color.border }}>
                    <span style={{ fontWeight: 700, color: color.label, fontSize: 11 }}>{item.pageName}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}> &middot; S{item.sectionIndex + 1}</span>
                  </div>
                  {item.section.tiles.map(function(tile, ti) {
                    return (
                      <TileDetail
                        key={ti}
                        tile={tile}
                        tileIndex={ti}
                        layoutId={item.layoutId}
                        viewMode={viewMode}
                        sectionColor={color}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Image Type Library Modal */}
      {showImageLib && <ImageTypeLibrary onClose={function() { setShowImageLib(false); }} />}
    </div>
  );
}
