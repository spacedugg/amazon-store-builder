import { useState, useEffect, useRef } from 'react';
import { LAYOUTS, LAYOUT_TILE_DIMS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES, findLayout } from '../constants';
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

// ─── IMAGE CATEGORY EXAMPLES (Google Drive folders with reference images) ───
var IMAGE_CATEGORY_EXAMPLES = [
  { id: 'store_hero', name: 'Store Hero', color: '#8B5CF6', desc: 'First image above menu. Represents the brand instantly.', folder: '' },
  { id: 'benefit', name: 'Benefit', color: '#10B981', desc: 'USPs, trust signals, quality markers. Icons + short labels, no product photos.', folder: '' },
  { id: 'product', name: 'Product', color: '#3B82F6', desc: 'Product on clean background. Optional name, CTA, badge.', folder: '' },
  { id: 'creative', name: 'Creative', color: '#F59E0B', desc: 'Complex composition: product + text + graphics. Engagement AND information.', folder: '' },
  { id: 'lifestyle', name: 'Lifestyle', color: '#EC4899', desc: 'Lifestyle photo dominates (70-80%+). Emotional, product in use.', folder: '' },
  { id: 'text_image', name: 'Text Image', color: '#6B7280', desc: 'Text/graphics dominant. Full typographic control. No product/lifestyle photos.', folder: '' },
];

// ─── BRIEFING STORE NAV BAR ───
function BriefingStoreNav({ store, curPage, onSelectPage, viewMode }) {
  var [showMore, setShowMore] = useState(false);
  var pages = store.pages || [];
  var topPages = pages.filter(function(p) { return !p.parentId; });
  var childrenMap = {};
  topPages.forEach(function(pg) {
    childrenMap[pg.id] = pages.filter(function(cp) { return cp.parentId === pg.id; });
  });

  var isMobile = viewMode === 'mobile';
  // For desktop: show as many tabs as fit, then "Mehr" for overflow
  var MAX_VISIBLE = isMobile ? 999 : 6;
  var visiblePages = topPages.slice(0, MAX_VISIBLE);
  var overflowPages = topPages.slice(MAX_VISIBLE);
  var hasOverflow = overflowPages.length > 0;

  return (
    <div className="briefing-store-nav">
      <div className="briefing-store-brand">{store.brandName || 'Brand Store'}</div>
      <div className="briefing-nav-tabs">
        {visiblePages.map(function(pg) {
          var isActive = pg.id === curPage || (childrenMap[pg.id] || []).some(function(c) { return c.id === curPage; });
          return (
            <div key={pg.id} className="briefing-nav-tab-item">
              <button className={'briefing-nav-tab' + (isActive ? ' active' : '')}
                onClick={function() { onSelectPage(pg.id); }}>
                {pg.name}
              </button>
            </div>
          );
        })}
        {hasOverflow && (
          <div className="briefing-nav-tab-item" style={{ position: 'relative' }}>
            <button className="briefing-nav-tab-more" onClick={function() { setShowMore(!showMore); }}>
              Mehr &#9662;
            </button>
            {showMore && (
              <div className="briefing-nav-more-menu">
                {topPages.map(function(pg) {
                  var children = childrenMap[pg.id] || [];
                  var isActive = pg.id === curPage;
                  return (
                    <div key={pg.id}>
                      <button className={'briefing-nav-more-item' + (isActive ? ' active' : '')}
                        onClick={function() { onSelectPage(pg.id); setShowMore(false); }}>
                        {pg.name}
                      </button>
                      {children.map(function(child) {
                        return (
                          <button key={child.id}
                            className={'briefing-nav-more-item briefing-nav-more-sub' + (child.id === curPage ? ' active' : '')}
                            onClick={function() { onSelectPage(child.id); setShowMore(false); }}>
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Section color palette for visual distinction
var SECTION_COLORS = [
  { bg: '#eff6ff', border: '#3b82f6', label: '#1d4ed8' },  // blue
  { bg: '#f0fdf4', border: '#22c55e', label: '#15803d' },  // green
  { bg: '#fdf4ff', border: '#d946ef', label: '#a21caf' },  // fuchsia
  { bg: '#fff7ed', border: '#f97316', label: '#c2410c' },  // orange
  { bg: '#faf5ff', border: '#a855f7', label: '#7e22ce' },  // purple
  { bg: '#fefce8', border: '#eab308', label: '#a16207' },  // yellow
  { bg: '#f0fdfa', border: '#14b8a6', label: '#0f766e' },  // teal
  { bg: '#fef2f2', border: '#ef4444', label: '#b91c1c' },  // red
];

function getSectionColor(index) {
  return SECTION_COLORS[index % SECTION_COLORS.length];
}

// ─── TILE DETAIL CARD (for right panel) ───
function TileDetail({ tile, tileIndex, layoutId, viewMode, sectionColor }) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  var desktopType = dims && dims[tileIndex] ? dims[tileIndex] : null;
  var tileLabel = TILE_TYPE_LABELS[tile.type] || tile.type;
  var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;

  return (
    <div className="briefing-tile-detail" style={{ borderLeft: '3px solid ' + sectionColor.border }}>
      <div className="briefing-tile-header">
        <span className="briefing-tile-index">Tile {tileIndex + 1}</span>
        <span className="briefing-tile-type">{tileLabel}</span>
        {tile.imageCategory && IMAGE_CATEGORIES[tile.imageCategory] && (
          <span className="briefing-tile-imgcat" style={{ background: '#f0f0f0', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
            {IMAGE_CATEGORIES[tile.imageCategory].name}
          </span>
        )}
        {desktopType && <span className="briefing-tile-imgtype">{desktopType.label} ({desktopType.w}&times;{desktopType.h})</span>}
      </div>

      {tile.brief && (
        <div className="briefing-field">
          <span className="briefing-field-label">Design Brief:</span>
          <span className="briefing-field-value">{tile.brief}</span>
        </div>
      )}

      {tile.textOverlay && (
        <div className="briefing-field">
          <span className="briefing-field-label">Text on Image:</span>
          <span className="briefing-field-value briefing-field-text">"{tile.textOverlay}"</span>
        </div>
      )}

      {tile.ctaText && (
        <div className="briefing-field">
          <span className="briefing-field-label">CTA Button:</span>
          <span className="briefing-field-value briefing-field-cta">"{tile.ctaText}"</span>
        </div>
      )}

      {tile.bgColor && (
        <div className="briefing-field">
          <span className="briefing-field-label">Background Color:</span>
          <span className="briefing-field-value">
            <span className="briefing-color-swatch" style={{ background: tile.bgColor }} />
            {tile.bgColor}
          </span>
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
          <span className="briefing-field-label">Link ASIN:</span>
          <span className="briefing-field-value briefing-field-mono">{tile.linkAsin}</span>
        </div>
      )}

      {tile.linkUrl && (
        <div className="briefing-field">
          <span className="briefing-field-label">Link URL:</span>
          <span className="briefing-field-value briefing-field-mono">{tile.linkUrl}</span>
        </div>
      )}

      <div className="briefing-tile-dims-row">
        <span className="briefing-dim">Desktop: {tile.dimensions ? (tile.dimensions.w + '\u00D7' + tile.dimensions.h) : 'N/A'}</span>
        <span className="briefing-dim">Mobile: {tile.mobileDimensions ? (tile.mobileDimensions.w + '\u00D7' + tile.mobileDimensions.h) : 'N/A'}</span>
      </div>
    </div>
  );
}

// ─── SECTION BRIEFING (visual preview only — no inline details) ───
function SectionBriefing({ section, sectionIndex, viewMode, products, sectionColor }) {
  var layout = findLayout(section.layoutId);

  return (
    <div className="briefing-section" style={{ borderLeft: '3px solid ' + sectionColor.border, background: sectionColor.bg }}>
      <div className="briefing-section-header">
        <span className="briefing-section-label" style={{ color: sectionColor.label }}>Section {sectionIndex + 1}</span>
        <span className="briefing-section-layout">{layout.name} ({layout.cells} tiles)</span>
      </div>

      {/* Visual preview */}
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

// ─── PAGE BRIEFING (center content — visual only) ───
function PageBriefing({ page, pageIndex, isSubPage, viewMode, products, sectionStartIndex }) {
  return (
    <div className={'briefing-page' + (isSubPage ? ' briefing-subpage' : '')}>
      <div className="briefing-page-header">
        <span className="briefing-page-name">{isSubPage ? '\u2514 ' : ''}{page.name || ('Page ' + (pageIndex + 1))}</span>
        <span className="briefing-page-count">{page.sections.length} section{page.sections.length !== 1 ? 's' : ''}</span>
      </div>

      {page.sections.map(function(sec, si) {
        return (
          <SectionBriefing
            key={sec.id}
            section={sec}
            sectionIndex={si}
            viewMode={viewMode}
            products={products}
            sectionColor={getSectionColor(sectionStartIndex + si)}
          />
        );
      })}
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

  // Find the currently-shown page for the right panel
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
          <button className="btn" style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#fff', fontSize: 11, padding: '5px 12px' }} onClick={handleDocxDownload} title="Download DOCX briefing">
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
        {/* LEFT SIDEBAR: Structure + Info */}
        <div className="briefing-sidebar">
          {/* Image Category Legend */}
          <div className="briefing-sidebar-section" style={{ background: '#faf5ff', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#7e22ce' }}>Image Categories (6 Types)</div>
            <div className="briefing-imgcat-legend">
              {IMAGE_CATEGORY_EXAMPLES.map(function(cat) {
                return (
                  <div key={cat.id} className="briefing-imgcat-item">
                    <span className="briefing-imgcat-badge" style={{ background: cat.color }}>{cat.name}</span>
                    <span className="briefing-imgcat-desc">
                      {cat.desc}
                      {cat.folder && (
                        <a href={cat.folder} target="_blank" rel="noopener noreferrer" className="briefing-imgcat-link">Examples</a>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>
              Every image tile is one of these 6 types. The category badge appears on each tile in the preview and briefing.
            </div>
          </div>

          {/* Store info — highlighted */}
          <div className="briefing-sidebar-section" style={{ background: '#f8fafc', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#0f766e' }}>Store Info</div>
            <div className="briefing-info-row"><span>Brand:</span> <strong>{store.brandName || 'N/A'}</strong></div>
            <div className="briefing-info-row"><span>Marketplace:</span> <strong>Amazon.{store.marketplace || 'de'}</strong></div>
            <div className="briefing-info-row"><span>Pages:</span> <strong>{pages.length}</strong></div>
            <div className="briefing-info-row"><span>Products:</span> <strong>{(store.products || []).length}</strong></div>
            {lastUpdated && (
              <div className="briefing-info-row"><span>Last Updated:</span> <strong>{new Date(lastUpdated).toLocaleString('en-US')}</strong></div>
            )}
          </div>

          {/* Google Drive — highlighted */}
          {googleDriveUrl && (
            <div className="briefing-sidebar-section">
              <div className="briefing-sidebar-title" style={{ color: '#1d4ed8' }}>Asset Upload</div>
              <a href={googleDriveUrl} target="_blank" rel="noopener noreferrer" className="briefing-drive-link">
                Open Google Drive Folder
              </a>
            </div>
          )}

          {/* Upload Instructions — highlighted */}
          <div className="briefing-sidebar-section" style={{ background: '#fef9c3', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#a16207' }}>Upload Instructions</div>
            <div className="briefing-legend">
              <p>Upload finished assets to the shared Google Drive folder.</p>
              <p><strong>Folder structure:</strong></p>
              <ul>
                <li>One subfolder per page (e.g. "Homepage")</li>
                <li>Name: "S1_T1_desktop.jpg"</li>
                <li>Both desktop + mobile versions</li>
                <li>Use exact dimensions per tile</li>
              </ul>
            </div>
          </div>

          {/* Image type reference — highlighted */}
          <div className="briefing-sidebar-section" style={{ background: '#ede9fe', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#7e22ce' }}>Desktop Image Types</div>
            <div className="briefing-legend">
              <div className="briefing-imgtype-ref">
                <div><span className="briefing-imgtype-badge large">LS</span> Large Square: 1500 &times; 1500</div>
                <div><span className="briefing-imgtype-badge small">SS</span> Small Square: 750 &times; 750</div>
                <div><span className="briefing-imgtype-badge wide">W</span> Wide: 1500 &times; 700</div>
                <div><span className="briefing-imgtype-badge full">FW</span> Full Width: 3000 &times; 600+</div>
              </div>
              <p style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>Header: 3000&times;600 (desktop), 1242&times;450 (mobile)</p>
              <p style={{ marginTop: 4, fontSize: 10, color: '#a16207', fontWeight: 600 }}>Full-width images can have variable heights (e.g. 3000&times;800, 3000&times;1000). The dimensions per tile are guidelines, not rigid constraints.</p>
            </div>
          </div>

          {/* Inspiration — highlighted */}
          <div className="briefing-sidebar-section" style={{ background: '#ecfdf5', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#15803d' }}>Inspiration Library</div>
            <div className="briefing-inspiration">
              {INSPIRATION_LINKS.map(function(link, i) {
                return (
                  <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="briefing-inspiration-link">
                    <span className="briefing-inspiration-brand">{link.brand}</span>
                    <span className="briefing-inspiration-cat">{link.category}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER: Store visual preview */}
        <div className={'briefing-content' + (viewMode === 'mobile' ? ' briefing-mobile' : '')}>
          {/* Store nav bar (clickable, like in the real Brand Store) */}
          <BriefingStoreNav store={store} curPage={curPage} onSelectPage={function(id) { setCurPage(id); setShowAllPages(false); }} viewMode={viewMode} />

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
                    <PageBriefing page={pg} pageIndex={pi} isSubPage={false} viewMode={viewMode} products={store.products || []} sectionStartIndex={startIdx} />
                    {children.map(function(child, ci) {
                      var childStart = startIdx + pg.sections.length;
                      for (var k = 0; k < ci; k++) childStart += children[k].sections.length;
                      return <PageBriefing key={child.id} page={child} pageIndex={ci} isSubPage={true} viewMode={viewMode} products={store.products || []} sectionStartIndex={childStart} />;
                    })}
                  </div>
                );
              });
            })()
          ) : (
            (function() {
              var pg = pages.find(function(p) { return p.id === curPage; }) || pages[0];
              if (!pg) return <div className="briefing-empty">No pages found.</div>;
              var pi = pages.indexOf(pg);
              return <PageBriefing page={pg} pageIndex={pi} isSubPage={!!pg.parentId} viewMode={viewMode} products={store.products || []} sectionStartIndex={0} />;
            })()
          )}
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
                    <span style={{ fontSize: 10, color: '#64748b' }}> &middot; Section {item.sectionIndex + 1}</span>
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
    </div>
  );
}
