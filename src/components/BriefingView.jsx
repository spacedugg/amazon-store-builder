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
// Image category examples — link to Google Drive folders with reference images
var IMAGE_CATEGORY_EXAMPLES = [
  { id: 'store_hero', name: 'Store Hero', color: '#8B5CF6', desc: 'First image above menu. Represents the brand instantly.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1mI7t3hpAwCzAL-yOZHDKjTKn1t24pu8m?usp=share_link' },
  { id: 'benefit', name: 'Benefit', color: '#10B981', desc: 'USPs, trust signals, quality markers. Icons + short labels, no product photos.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1uqmEwIbE6YHo0V0Lff76GXqOYYq-71-_?usp=share_link' },
  { id: 'product', name: 'Product', color: '#3B82F6', desc: 'Product on clean background. Optional name, CTA, badge.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1T0M9h8eITYbW_RS7L5aCxSM-Zg94EUh-?usp=share_link' },
  { id: 'creative', name: 'Creative', color: '#F59E0B', desc: 'Complex composition: product + text + graphics. Engagement AND information.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/10DAe3uEmkcp0rBDCanzHCWYg8FtU08uC?usp=share_link' },
  { id: 'lifestyle', name: 'Lifestyle', color: '#EC4899', desc: 'Lifestyle photo dominates (70-80%+). Emotional, product in use.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1JVOOwEfXqzW34sN6BJJM6imBD-8U6VBB?usp=share_link' },
  { id: 'text_image', name: 'Text Image', color: '#6B7280', desc: 'Text/graphics dominant. Full typographic control. No product/lifestyle photos.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1cI3ldu0or4VBFMLmbvkTVrUOo0MgEZuG?usp=share_link' },
];

// Map category IDs to colors for inline highlighting
var CATEGORY_COLOR_MAP = {};
IMAGE_CATEGORY_EXAMPLES.forEach(function(cat) { CATEGORY_COLOR_MAP[cat.id] = cat.color; });

// Category tag patterns for highlighting in brief text
var CATEGORY_TAG_MAP = {
  '[STORE_HERO]': { id: 'store_hero', color: '#8B5CF6' },
  '[BENEFIT]': { id: 'benefit', color: '#10B981' },
  '[PRODUCT]': { id: 'product', color: '#3B82F6' },
  '[CREATIVE]': { id: 'creative', color: '#F59E0B' },
  '[LIFESTYLE]': { id: 'lifestyle', color: '#EC4899' },
  '[TEXT_IMAGE]': { id: 'text_image', color: '#6B7280' },
};

// Render brief text with colored category tags
function BriefTextHighlighted({ text }) {
  if (!text) return null;
  var parts = [];
  var remaining = text;
  var key = 0;
  while (remaining.length > 0) {
    var earliest = -1;
    var earliestTag = null;
    var earliestInfo = null;
    Object.keys(CATEGORY_TAG_MAP).forEach(function(tag) {
      var idx = remaining.indexOf(tag);
      if (idx >= 0 && (earliest < 0 || idx < earliest)) {
        earliest = idx;
        earliestTag = tag;
        earliestInfo = CATEGORY_TAG_MAP[tag];
      }
    });
    if (earliest < 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
    if (earliest > 0) {
      parts.push(<span key={key++}>{remaining.substring(0, earliest)}</span>);
    }
    parts.push(
      <span key={key++} className="briefing-cat-tag-inline" style={{ background: earliestInfo.color, color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 10 }}>
        {earliestTag}
      </span>
    );
    remaining = remaining.substring(earliest + earliestTag.length);
  }
  return <span>{parts}</span>;
}

// ─── BRIEFING STORE NAV BAR ───
function BriefingStoreNav({ store, curPage, onSelectPage, viewMode }) {
  var [showMore, setShowMore] = useState(false);
  var [drillParent, setDrillParent] = useState(null); // parent page id for subcategory drill-down
  var [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  var moreRef = useRef(null);
  var moreBtnRef = useRef(null);
  var popupRef = useRef(null);
  var pages = store.pages || [];
  var topPages = pages.filter(function(p) { return !p.parentId; });
  var childrenMap = {};
  topPages.forEach(function(pg) {
    childrenMap[pg.id] = pages.filter(function(cp) { return cp.parentId === pg.id; });
  });

  var isMobile = viewMode === 'mobile';
  var MAX_VISIBLE = isMobile ? 999 : 6;
  var visiblePages = topPages.slice(0, MAX_VISIBLE);
  var overflowPages = topPages.slice(MAX_VISIBLE);
  var hasOverflow = overflowPages.length > 0;

  // Close popup when clicking outside (check both the button area and the popup itself)
  useEffect(function() {
    if (!showMore) return;
    function handleClickOutside(e) {
      var insideBtn = moreRef.current && moreRef.current.contains(e.target);
      var insidePopup = popupRef.current && popupRef.current.contains(e.target);
      if (!insideBtn && !insidePopup) {
        setShowMore(false);
        setDrillParent(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return function() { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showMore]);

  function handleOpenMore() {
    if (!showMore && moreBtnRef.current) {
      var rect = moreBtnRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 4, left: Math.max(8, rect.right - 260) });
    }
    setShowMore(!showMore);
    setDrillParent(null);
  }

  function handleSelectPage(pageId) {
    onSelectPage(pageId);
    setShowMore(false);
    setDrillParent(null);
  }

  function handleDrillInto(parentId) {
    setDrillParent(parentId);
  }

  function handleDrillBack() {
    setDrillParent(null);
  }

  // Determine what the popup shows
  var popupContent = null;
  if (showMore) {
    if (drillParent) {
      // Show subcategories of the drilled parent
      var parentPage = topPages.find(function(p) { return p.id === drillParent; });
      var children = childrenMap[drillParent] || [];
      popupContent = (
        <div className="briefing-nav-popup" ref={popupRef} style={{ top: popupPos.top, left: popupPos.left }}>
          <button className="briefing-nav-popup-back" onClick={handleDrillBack}>
            &#8592; Back
          </button>
          <button
            className={'briefing-nav-popup-item' + (curPage === drillParent ? ' active' : '')}
            onClick={function() { handleSelectPage(drillParent); }}
          >
            {parentPage ? parentPage.name : 'Category'}
            <span className="briefing-nav-popup-hint">Overview</span>
          </button>
          {children.map(function(child) {
            return (
              <button
                key={child.id}
                className={'briefing-nav-popup-item briefing-nav-popup-sub' + (child.id === curPage ? ' active' : '')}
                onClick={function() { handleSelectPage(child.id); }}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      );
    } else {
      // Show all top-level pages
      popupContent = (
        <div className="briefing-nav-popup" ref={popupRef} style={{ top: popupPos.top, left: popupPos.left }}>
          {topPages.map(function(pg) {
            var children = childrenMap[pg.id] || [];
            var hasChildren = children.length > 0;
            return (
              <button
                key={pg.id}
                className={'briefing-nav-popup-item' + (pg.id === curPage ? ' active' : '')}
                onClick={function() {
                  if (hasChildren) {
                    handleDrillInto(pg.id);
                  } else {
                    handleSelectPage(pg.id);
                  }
                }}
              >
                <span>{pg.name}</span>
                {hasChildren && <span className="briefing-nav-popup-arrow">&#9656;</span>}
              </button>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="briefing-store-nav">
      <div className="briefing-nav-tabs">
        {visiblePages.map(function(pg) {
          var isActive = pg.id === curPage || (childrenMap[pg.id] || []).some(function(c) { return c.id === curPage; });
          var children = childrenMap[pg.id] || [];
          var hasChildren = children.length > 0;
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
          <div className="briefing-nav-tab-item" ref={moreRef}>
            <button className="briefing-nav-tab-more" ref={moreBtnRef} onClick={handleOpenMore}>
              Mehr &#9662;
            </button>
          </div>
        )}
      </div>
      {popupContent}
    </div>
  );
}

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

// ─── TILE DETAIL CARD (for right panel) ───
function TileDetail({ tile, tileIndex, layoutId, viewMode, sectionColor }) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  var desktopType = dims && dims[tileIndex] ? dims[tileIndex] : null;
  var tileLabel = TILE_TYPE_LABELS[tile.type] || tile.type;
  var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;

  // Get category color for the badge
  var catColor = tile.imageCategory && CATEGORY_COLOR_MAP[tile.imageCategory] ? CATEGORY_COLOR_MAP[tile.imageCategory] : null;

  return (
    <div className="briefing-tile-detail" style={{ borderLeft: '3px solid ' + sectionColor.border }}>
      <div className="briefing-tile-header">
        <span className="briefing-tile-index">Tile {tileIndex + 1}</span>
        <span className="briefing-tile-type">{tileLabel}</span>
        {tile.imageCategory && IMAGE_CATEGORIES[tile.imageCategory] && (
          <span className="briefing-tile-imgcat" style={{ background: catColor || '#94a3b8', color: '#fff', borderRadius: 3, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
            {IMAGE_CATEGORIES[tile.imageCategory].name}
          </span>
        )}
        {desktopType && <span className="briefing-tile-imgtype">{desktopType.label} ({desktopType.w}&times;{desktopType.h})</span>}
      </div>

      {tile.brief && (
        <div className="briefing-field">
          <span className="briefing-field-label">Design Brief:</span>
          <span className="briefing-field-value"><BriefTextHighlighted text={tile.brief} /></span>
        </div>
      )}

      {tile.textOverlay && (
        <div className="briefing-field">
          <span className="briefing-field-label">Text on Image:</span>
          <span className="briefing-field-value briefing-field-text">"{tile.textOverlay}"{tile.textAlign && tile.textAlign !== 'left' ? ' (' + (tile.textAlign === 'center' ? 'zentriert' : 'rechtsbündig') + ')' : ''}</span>
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

// ─── SECTION BRIEFING (visual preview only) ───
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

// ─── PAGE BRIEFING (center content — visual only, single page) ───
function PageBriefing({ page, viewMode, products, sectionStartIndex }) {
  return (
    <div className="briefing-page">
      <div className="briefing-page-header">
        <span className="briefing-page-name">{page.name || 'Page'}</span>
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

// ─── STORE HERO BANNER (above nav) ───
function StoreHeroBanner({ store, viewMode }) {
  // Find the first store_hero tile across all pages
  var heroTile = null;
  (store.pages || []).forEach(function(page) {
    if (heroTile) return;
    (page.sections || []).forEach(function(sec) {
      if (heroTile) return;
      (sec.tiles || []).forEach(function(tile) {
        if (!heroTile && tile.imageCategory === 'store_hero') {
          heroTile = tile;
        }
      });
    });
  });

  var isDesktop = viewMode === 'desktop';
  var width = isDesktop ? 3000 : 1242;
  var height = isDesktop ? 600 : 450;

  return (
    <div className="briefing-hero-banner">
      <div className="briefing-hero-placeholder">
        <div className="briefing-hero-label">Store Hero Image</div>
        <div className="briefing-hero-dims">{width} &times; {height}px</div>
        {heroTile && heroTile.brief && (
          <div className="briefing-hero-brief"><BriefTextHighlighted text={heroTile.brief} /></div>
        )}
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

  // Always single-page mode: find the active page
  var activePage = pages.find(function(p) { return p.id === curPage; }) || pages[0];

  // Right panel: only show sections for the currently visible page
  var rightPanelSections = [];
  if (activePage) {
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
        {/* LEFT SIDEBAR */}
        <div className="briefing-sidebar">
          {/* Image Category Legend — PROMINENT */}
          <div className="briefing-sidebar-section briefing-imgcat-section">
            <div className="briefing-imgcat-title">Image Categories</div>
            <div className="briefing-imgcat-subtitle">6 image types used throughout this briefing</div>
            <div className="briefing-imgcat-legend">
              {IMAGE_CATEGORY_EXAMPLES.map(function(cat) {
                return (
                  <div key={cat.id} className="briefing-imgcat-item">
                    <span className="briefing-imgcat-badge" style={{ background: cat.color }}>{cat.name}</span>
                    <span className="briefing-imgcat-desc">
                      {cat.desc}
                      {cat.exampleUrl && (
                        <a href={cat.exampleUrl} target="_blank" rel="noopener noreferrer" className="briefing-imgcat-link">Example: {cat.example}</a>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspiration Library */}
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

          {/* Google Drive */}
          {googleDriveUrl && (
            <div className="briefing-sidebar-section">
              <div className="briefing-sidebar-title" style={{ color: '#1d4ed8' }}>Asset Upload</div>
              <a href={googleDriveUrl} target="_blank" rel="noopener noreferrer" className="briefing-drive-link">
                Open Google Drive Folder
              </a>
            </div>
          )}

          {/* Upload Instructions — moved to bottom */}
          <div className="briefing-sidebar-section" style={{ background: '#fef9c3', borderRadius: 8, margin: '0 8px', padding: '10px 12px' }}>
            <div className="briefing-sidebar-title" style={{ color: '#a16207' }}>Upload Instructions</div>
            <div className="briefing-legend">
              <p>Alle fertigen Assets in den geteilten Google Drive Ordner hochladen.</p>
              <p><strong>Ordnerstruktur:</strong></p>
              <ul>
                <li>Pro Seite einen Ordner anlegen (z.B. "Homepage")</li>
                <li>Innerhalb jeder Seite pro Sektion einen Unterordner (z.B. "Sektion 1", "Sektion 2")</li>
                <li>In jeden Sektions-Ordner die passenden Bilder (Desktop + Mobile)</li>
              </ul>
              <p style={{ marginTop: 6 }}><strong>Beispiel:</strong></p>
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.8 }}>
                Homepage/<br />
                &nbsp;&nbsp;Sektion 1/<br />
                &nbsp;&nbsp;&nbsp;&nbsp;tile1_desktop.jpg<br />
                &nbsp;&nbsp;&nbsp;&nbsp;tile1_mobile.jpg<br />
                &nbsp;&nbsp;Sektion 2/<br />
                &nbsp;&nbsp;&nbsp;&nbsp;tile1_desktop.jpg<br />
                Kategorie Fitness/<br />
                &nbsp;&nbsp;Sektion 1/<br />
                &nbsp;&nbsp;&nbsp;&nbsp;...
              </div>
            </div>
          </div>

          {/* Store Info — moved to very bottom */}
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
        </div>

        {/* CENTER: Store visual preview */}
        <div className={'briefing-content' + (viewMode === 'mobile' ? ' briefing-mobile' : '')}>
          {/* Store Hero Banner above nav */}
          <StoreHeroBanner store={store} viewMode={viewMode} />

          {/* Brand logo + Store nav bar */}
          <div className="briefing-store-brand-bar">
            <span className="briefing-store-brand">{store.brandName || 'Brand Store'}</span>
          </div>
          <BriefingStoreNav store={store} curPage={curPage} onSelectPage={function(id) { setCurPage(id); }} viewMode={viewMode} />

          {/* Single page content */}
          {(function() {
            if (!activePage) return <div className="briefing-empty">No pages found.</div>;
            return <PageBriefing page={activePage} viewMode={viewMode} products={store.products || []} sectionStartIndex={0} />;
          })()}
        </div>

        {/* RIGHT PANEL: Designer Instructions (page-specific) */}
        <div className="briefing-right-panel">
          <div className="briefing-sidebar-title" style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', margin: 0 }}>
            Designer Instructions
            {activePage && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>{activePage.name}</span>}
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
