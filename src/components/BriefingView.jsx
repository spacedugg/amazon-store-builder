import { useState, useEffect, useRef } from 'react';
import { LAYOUTS, LAYOUT_TILE_DIMS, TILE_TYPE_LABELS, PRODUCT_TILE_TYPES, IMAGE_CATEGORIES, findLayout } from '../constants';
import { loadStoreByShareToken } from '../storage';
// DOCX export removed — designer doesn't need it
import SectionView, { getGridConfig } from './SectionView';

var noop = function() {};

// ─── META DESCRIPTION GENERATOR ───
// Generates SEO-optimized meta descriptions for Amazon Brand Store pages.
// Max 155 chars, front-loads brand + primary keywords within first 120 chars.
function generateMetaDescription(page, store) {
  var brand = store.brandName || 'Brand';
  var marketplace = store.marketplace || 'de';
  var products = store.products || [];
  var pageName = page.name || '';
  var isHomepage = pageName.toLowerCase() === 'homepage' || pageName.toLowerCase() === 'home';

  // Collect ASINs used on this page
  var pageAsins = {};
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      (tile.asins || []).forEach(function(a) { pageAsins[a] = true; });
      if (tile.linkAsin) pageAsins[tile.linkAsin] = true;
    });
  });

  // Get product names and categories for this page
  var pageProducts = products.filter(function(p) { return pageAsins[p.asin]; });
  var categories = {};
  pageProducts.forEach(function(p) {
    if (p.category) categories[p.category] = (categories[p.category] || 0) + 1;
  });
  var topCategories = Object.keys(categories).sort(function(a, b) { return categories[b] - categories[a]; }).slice(0, 3);

  // Collect text overlays and CTA texts for keyword hints
  var keywords = [];
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      if (tile.textOverlay && tile.textOverlay.length > 3 && tile.textOverlay.length < 60) {
        keywords.push(tile.textOverlay);
      }
    });
  });

  // Determine page type for appropriate template
  var lowerName = pageName.toLowerCase();
  var isAbout = lowerName.indexOf('about') >= 0 || lowerName.indexOf('über') >= 0 || lowerName.indexOf('story') >= 0 || lowerName.indexOf('geschichte') >= 0;
  var isBestseller = lowerName.indexOf('bestseller') >= 0 || lowerName.indexOf('best seller') >= 0 || lowerName.indexOf('top') >= 0;

  var desc = '';

  if (marketplace === 'de' || marketplace === 'at') {
    // German meta descriptions
    if (isHomepage) {
      var catText = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'Produkte';
      desc = 'Entdecke ' + brand + ' auf Amazon: ' + catText;
      if (store.heroMessage) {
        desc += '. ' + store.heroMessage.replace(/["„"]/g, '').slice(0, 60);
      } else if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Jetzt den offiziellen ' + brand + ' Store entdecken.';
    } else if (isAbout) {
      desc = 'Erfahre mehr über ' + brand;
      if (store.brandTone) desc += ' — ' + store.brandTone;
      desc += '. Unsere Geschichte, Werte und was uns antreibt. Jetzt auf Amazon entdecken.';
    } else if (isBestseller) {
      desc = 'Die beliebtesten ' + brand + ' Produkte auf Amazon. Top-bewertete Bestseller';
      if (topCategories.length > 0) desc += ' aus ' + topCategories[0];
      desc += '. Jetzt entdecken und bestellen.';
    } else {
      // Category page
      desc = brand + ' ' + pageName + ' auf Amazon entdecken';
      if (pageProducts.length > 0) {
        desc += ': ' + pageProducts.length + ' Produkte';
        if (topCategories.length > 0 && topCategories[0] !== pageName) desc += ' aus ' + topCategories[0];
      }
      if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Jetzt im offiziellen Store shoppen.';
    }
  } else if (marketplace === 'es') {
    if (isHomepage) {
      var catTextEs = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'productos';
      desc = 'Descubre ' + brand + ' en Amazon: ' + catTextEs + '. Explora nuestra colección completa en la tienda oficial.';
    } else if (isAbout) {
      desc = 'Conoce ' + brand + ': nuestra historia, valores y misión. Descubre la marca en Amazon.';
    } else {
      desc = 'Compra ' + brand + ' ' + pageName + ' en Amazon. ';
      if (pageProducts.length > 0) desc += pageProducts.length + ' productos disponibles. ';
      desc += 'Visita la tienda oficial ahora.';
    }
  } else {
    // English (default)
    if (isHomepage) {
      var catTextEn = topCategories.length > 0 ? topCategories.slice(0, 2).join(', ') : 'products';
      desc = 'Discover ' + brand + ' on Amazon: ' + catTextEn;
      if (store.heroMessage) {
        desc += '. ' + store.heroMessage.replace(/["„"]/g, '').slice(0, 60);
      } else if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Shop the official ' + brand + ' store now.';
    } else if (isAbout) {
      desc = 'Learn about ' + brand;
      if (store.brandTone) desc += ' — ' + store.brandTone;
      desc += '. Our story, values, and what drives us. Discover more on Amazon.';
    } else if (isBestseller) {
      desc = 'Shop ' + brand + '\'s most popular products on Amazon. Top-rated bestsellers';
      if (topCategories.length > 0) desc += ' in ' + topCategories[0];
      desc += '. Browse and order now.';
    } else {
      desc = 'Shop ' + brand + ' ' + pageName + ' on Amazon';
      if (pageProducts.length > 0) {
        desc += ': ' + pageProducts.length + ' products';
        if (topCategories.length > 0 && topCategories[0] !== pageName) desc += ' in ' + topCategories[0];
      }
      if (keywords.length > 0) {
        desc += '. ' + keywords[0].replace(/["„"]/g, '').slice(0, 50);
      }
      desc += '. Visit the official store.';
    }
  }

  // Truncate to 155 chars without cutting mid-word
  if (desc.length > 155) {
    desc = desc.slice(0, 155);
    var lastSpace = desc.lastIndexOf(' ');
    if (lastSpace > 120) desc = desc.slice(0, lastSpace);
    if (!/[.!]$/.test(desc)) desc += '...';
  }

  return desc;
}

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
  { brand: 'More Nutrition', url: 'https://www.amazon.de/stores/page/7AD425C6-C3C5-402D-A69D-D6201F98F888', category: 'Sports Nutrition' },
  { brand: 'Kloster Kitchen', url: 'https://www.amazon.de/stores/page/34D4A812-9A68-4602-A6A0-30565D399620', category: 'Organic' },
];

// ─── IMAGE CATEGORY EXAMPLES (Google Drive folders with reference images) ───
// Image category examples — link to Google Drive folders with reference images
var IMAGE_CATEGORY_EXAMPLES = [
  { id: 'store_hero', name: 'Store Hero', color: '#8B5CF6', desc: 'First image above menu. Represents the brand instantly.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1mI7t3hpAwCzAL-yOZHDKjTKn1t24pu8m?usp=share_link' },
  { id: 'benefit', name: 'Benefit', color: '#10B981', desc: 'USPs, trust signals, quality markers. Icons + short labels, no product photos.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1uqmEwIbE6YHo0V0Lff76GXqOYYq-71-_?usp=share_link' },
  { id: 'product', name: 'Product', color: '#3B82F6', desc: 'Product clearly in focus. Background can be clean, colored, or styled freely.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/1T0M9h8eITYbW_RS7L5aCxSM-Zg94EUh-?usp=share_link' },
  { id: 'creative', name: 'Creative', color: '#F59E0B', desc: 'Compositions combining products, text, graphics, or lifestyle elements. Engaging and visually appealing.', example: 'Beispiele', exampleUrl: 'https://drive.google.com/drive/folders/10DAe3uEmkcp0rBDCanzHCWYg8FtU08uC?usp=share_link' },
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

// Generate a content fingerprint for a tile to detect duplicates
function tileFingerprint(tile) {
  if (!tile) return '';
  return [tile.type, tile.brief || '', tile.textOverlay || '', tile.ctaText || '', tile.imageCategory || '', tile.bgColor || '',
    (tile.dimensions || {}).w + 'x' + (tile.dimensions || {}).h,
    (tile.asins || []).join(',')].join('|');
}

// ─── TILE FILENAME GENERATOR ───
// Creates canonical filenames for each image tile so designer + preview can match them.
// Format: {PageName}_S{n}_T{n}_desktop.jpg / _mobile.jpg / .jpg (if synced)
function sanitizeName(name) {
  return (name || 'page').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function tileFilename(pageName, sectionIndex, tileIndex, variant) {
  // variant: 'desktop', 'mobile', or 'sync'
  var base = sanitizeName(pageName) + '_S' + (sectionIndex + 1) + '_T' + (tileIndex + 1);
  if (variant === 'sync') return base + '.jpg';
  return base + '_' + variant + '.jpg';
}

// Build a complete filename map for the entire store: { filename -> { pageId, secId, tileIndex, variant } }
function buildFilenameMap(store) {
  var map = {};
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
        if (tile.syncDimensions) {
          var fn = tileFilename(pg.name, si, ti, 'sync');
          map[fn.toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'sync' };
        } else {
          var fnD = tileFilename(pg.name, si, ti, 'desktop');
          var fnM = tileFilename(pg.name, si, ti, 'mobile');
          map[fnD.toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'desktop' };
          map[fnM.toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'mobile' };
        }
      });
    });
  });
  return map;
}

// Build a map of tile fingerprints → first occurrence location
function buildDuplicateMap(store) {
  var map = {};
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
        var fp = tileFingerprint(tile);
        if (!fp || fp === 'image||||||x|') return;
        if (!map[fp]) {
          map[fp] = { page: pg.name, section: si + 1, tile: ti + 1, count: 1 };
        } else {
          map[fp].count++;
        }
      });
    });
  });
  return map;
}

// Render inline text with **bold**, "quoted", and category tags
function renderInlineFormatting(text, keyBase) {
  var parts = [];
  var k = keyBase || 0;
  // Process: category tags, **bold**, "quoted"
  var pattern = /(\[(?:STORE_HERO|BENEFIT|PRODUCT|CREATIVE|LIFESTYLE|TEXT_IMAGE)\]|\*\*(.+?)\*\*|"([^"]+)")/g;
  var lastIndex = 0;
  var match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={k++}>{text.substring(lastIndex, match.index)}</span>);
    }
    if (CATEGORY_TAG_MAP[match[0]]) {
      parts.push(
        <span key={k++} className="briefing-cat-tag-inline" style={{ background: CATEGORY_TAG_MAP[match[0]].color, color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 700, fontSize: 10 }}>
          {match[0]}
        </span>
      );
    } else if (match[2]) {
      // **bold**
      parts.push(<strong key={k++}>{match[2]}</strong>);
    } else if (match[3]) {
      // "quoted" — styled as quoted text for designer
      parts.push(<span key={k++} style={{ fontStyle: 'italic', color: '#0f172a', background: '#fef9c3', padding: '0 3px', borderRadius: 2 }}>&bdquo;{match[3]}&ldquo;</span>);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={k++}>{text.substring(lastIndex)}</span>);
  }
  return parts;
}

// Render brief text with bullet points, bold, quotes, and category tags
function BriefTextHighlighted({ text }) {
  if (!text) return null;
  // Split into lines to detect bullet points
  var lines = text.split('\n');
  var hasBullets = lines.some(function(l) { return /^\s*[-•]\s/.test(l); });

  if (hasBullets) {
    var bulletItems = [];
    var textParts = [];
    var key = 0;
    lines.forEach(function(line, li) {
      var bulletMatch = line.match(/^\s*[-•]\s+(.*)/);
      if (bulletMatch) {
        // Flush any preceding text
        if (textParts.length > 0) {
          bulletItems.push(<span key={key++}>{textParts.map(function(t, i) { return <span key={i}>{renderInlineFormatting(t, i * 100)}{i < textParts.length - 1 ? ' ' : ''}</span>; })}</span>);
          textParts = [];
        }
        bulletItems.push(
          <li key={key++} style={{ marginBottom: 2 }}>{renderInlineFormatting(bulletMatch[1], li * 100)}</li>
        );
      } else if (line.trim()) {
        textParts.push(line.trim());
      }
    });
    if (textParts.length > 0) {
      bulletItems.push(<span key={key++}>{textParts.map(function(t, i) { return <span key={i}>{renderInlineFormatting(t, i * 100)}</span>; })}</span>);
    }
    return (
      <span>
        {bulletItems.some(function(b) { return b.type === 'li'; }) ? (
          <ul style={{ margin: '4px 0', paddingLeft: 16, listStyle: 'disc' }}>{bulletItems}</ul>
        ) : (
          bulletItems
        )}
      </span>
    );
  }

  return <span>{renderInlineFormatting(text, 0)}</span>;
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

// ─── COPYABLE FILENAME (click to copy with visual feedback) ───
function CopyableFilename({ filename, label }) {
  var [copied, setCopied] = useState(false);
  function handleCopy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(filename).then(function() {
      setCopied(true);
      setTimeout(function() { setCopied(false); }, 1500);
    });
  }
  return (
    <div onClick={handleCopy}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'monospace', fontSize: 10, color: copied ? '#16a34a' : '#475569', cursor: 'pointer', padding: '2px 6px', borderRadius: 3, background: copied ? '#dcfce7' : '#f1f5f9', border: '1px solid ' + (copied ? '#86efac' : '#e2e8f0'), transition: 'all .2s', userSelect: 'none', maxWidth: '100%' }}
      title="Click to copy filename">
      {label && <span style={{ fontWeight: 700, fontSize: 9, color: copied ? '#16a34a' : '#94a3b8', minWidth: 10 }}>{label}</span>}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{copied ? 'Copied!' : filename}</span>
      {!copied && <span style={{ fontSize: 9, opacity: 0.5, flexShrink: 0 }}>&#128203;</span>}
    </div>
  );
}

// ─── TILE DETAIL CARD (for right panel) ───
function TileDetail({ tile, tileIndex, layoutId, viewMode, sectionColor, sectionId, isSelected, onClickTile, duplicateInfo, pageId, pageName, sectionIndex, checks, toggleCheck }) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  var desktopType = dims && dims[tileIndex] ? dims[tileIndex] : null;
  var tileLabel = TILE_TYPE_LABELS[tile.type] || tile.type;
  var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;
  var isImageTile = !isProduct && tile.type !== 'text';
  var checkBase = pageId + '/' + sectionId + '/' + tileIndex;

  // Get category color for the badge
  var catColor = tile.imageCategory && CATEGORY_COLOR_MAP[tile.imageCategory] ? CATEGORY_COLOR_MAP[tile.imageCategory] : null;

  return (
    <div
      id={'tile-detail-' + sectionId + '-' + tileIndex}
      className={'briefing-tile-detail' + (isSelected ? ' briefing-tile-detail-selected' : '')}
      style={{ borderLeft: '3px solid ' + sectionColor.border, cursor: 'pointer' }}
      onClick={function() { if (onClickTile) onClickTile({ sid: sectionId, ti: tileIndex }); }}
    >
      <div className="briefing-tile-header">
        <span className="briefing-tile-index">Tile {tileIndex + 1}</span>
        <span className="briefing-tile-type">{tileLabel}</span>
        {tile.imageCategory && IMAGE_CATEGORIES[tile.imageCategory] && (
          <span className="briefing-tile-imgcat" style={{ background: catColor || '#94a3b8', color: '#fff', borderRadius: 3, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
            {IMAGE_CATEGORIES[tile.imageCategory].name}
          </span>
        )}
        {/* dimensions shown in dims row below, no need to repeat layout label */}
      </div>

      {duplicateInfo && duplicateInfo.count > 1 && (
        <div className="briefing-field" style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 4, padding: '4px 8px', marginBottom: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#065f46' }}>
            Duplicate of {duplicateInfo.page} &middot; S{duplicateInfo.section} &middot; T{duplicateInfo.tile} — no new image needed
          </span>
        </div>
      )}

      {tile.brief && (
        <div className="briefing-field">
          <span className="briefing-field-label">Design Brief:</span>
          <span className="briefing-field-value"><BriefTextHighlighted text={tile.brief} /></span>
        </div>
      )}

      {tile.textOverlay && (
        <div className="briefing-field">
          <span className="briefing-field-label">Text on Image:</span>
          <span className="briefing-field-value briefing-field-text">"{tile.textOverlay}"{tile.textAlign && tile.textAlign !== 'left' ? ' (' + (tile.textAlign === 'center' ? 'centered' : 'right-aligned') + ')' : ''}</span>
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
        {tile.syncDimensions && <span className="briefing-dim" style={{ color: '#10B981', fontWeight: 600 }}>= 1 image</span>}
      </div>

      {/* ─── FILE NAMES (click to copy) ─── */}
      {isImageTile && pageName != null && sectionIndex != null && (
        <div style={{ marginTop: 4, padding: '4px 0', fontSize: 10, lineHeight: 1.8 }}>
          {tile.syncDimensions ? (
            <CopyableFilename filename={tileFilename(pageName, sectionIndex, tileIndex, 'sync')} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <CopyableFilename filename={tileFilename(pageName, sectionIndex, tileIndex, 'desktop')} label="D" />
              <CopyableFilename filename={tileFilename(pageName, sectionIndex, tileIndex, 'mobile')} label="M" />
            </div>
          )}
        </div>
      )}

      {/* ─── IMAGE COMPLETION CHECKMARKS ─── */}
      {isImageTile && checks && toggleCheck && (function() {
        var syncDone = !!checks[checkBase + '/sync'];
        var deskDone = !!checks[checkBase + '/desktop'];
        var mobDone = !!checks[checkBase + '/mobile'];
        var allDone = tile.syncDimensions ? syncDone : (deskDone && mobDone);
        var checkBg = allDone ? '#dcfce7' : '#fef2f2';
        var checkBorder = allDone ? '#86efac' : '#fecaca';
        return (
        <div style={{ marginTop: 6, padding: '8px 10px', borderRadius: 6, background: checkBg, border: '1px solid ' + checkBorder, transition: 'all .2s' }}>
          {tile.syncDimensions ? (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: syncDone ? '#16a34a' : '#dc2626' }} onClick={function(e) { e.stopPropagation(); }}>
              <input type="checkbox" checked={syncDone} onChange={function() { toggleCheck(checkBase + '/sync'); }} style={{ accentColor: '#22c55e', width: 16, height: 16 }} />
              {syncDone ? 'Image done' : 'Image missing'}
            </label>
          ) : (
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: deskDone ? '#16a34a' : '#dc2626' }} onClick={function(e) { e.stopPropagation(); }}>
                <input type="checkbox" checked={deskDone} onChange={function() { toggleCheck(checkBase + '/desktop'); }} style={{ accentColor: '#22c55e', width: 16, height: 16 }} />
                Desktop {deskDone ? '\u2713' : '\u2717'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, fontWeight: 600, color: mobDone ? '#16a34a' : '#dc2626' }} onClick={function(e) { e.stopPropagation(); }}>
                <input type="checkbox" checked={mobDone} onChange={function() { toggleCheck(checkBase + '/mobile'); }} style={{ accentColor: '#22c55e', width: 16, height: 16 }} />
                Mobile {mobDone ? '\u2713' : '\u2717'}
              </label>
            </div>
          )}
        </div>
        );
      })()}
    </div>
  );
}

// ─── SECTION BRIEFING (visual preview only) ───
// Section label is positioned to the LEFT of the actual store content,
// so the store layout itself looks clean (like real Amazon) without colored borders.
function SectionBriefing({ section, sectionIndex, viewMode, products, sectionColor, selectedTile, onTileSelect }) {
  var layout = findLayout(section.layoutId);

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}>
      {/* Left gutter label — outside the store layout */}
      <div style={{ width: 56, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRight: '2px solid ' + sectionColor.border, background: sectionColor.bg, padding: '6px 2px' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: sectionColor.label, whiteSpace: 'nowrap', writingMode: 'vertical-lr', transform: 'rotate(180deg)', letterSpacing: 0.5 }}>
          S{sectionIndex + 1}
        </span>
        <span style={{ fontSize: 8, color: sectionColor.label, opacity: 0.7 }}>{layout.cells}T</span>
      </div>

      {/* Store content — clean, no colored borders */}
      <div style={{ flex: 1, minWidth: 0 }} className="briefing-section-preview briefing-section-clickable">
        <SectionView
          section={section}
          idx={sectionIndex}
          totalSections={1}
          sel={selectedTile}
          onSelect={onTileSelect}
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
// No page header inside the store layout — sections connect edge-to-edge like Amazon.
function PageBriefing({ page, viewMode, products, sectionStartIndex, selectedTile, onTileSelect, store }) {
  return (
    <div className="briefing-page" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {page.sections.map(function(sec, si) {
        return (
          <SectionBriefing
            key={sec.id}
            section={sec}
            sectionIndex={si}
            viewMode={viewMode}
            products={products}
            sectionColor={getSectionColor(sectionStartIndex + si)}
            selectedTile={selectedTile}
            onTileSelect={onTileSelect}
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

// ─── DESIGNER TIMER (synced to server, runs accurately even when tab inactive) ───
function DesignerTimer({ shareToken }) {
  var [totalSeconds, setTotalSeconds] = useState(0);
  var [running, setRunning] = useState(false);
  var [syncing, setSyncing] = useState(false);
  var [showHint, setShowHint] = useState(true);
  var startedAtRef = useRef(null); // local timestamp when we last pressed start
  var baseSecondsRef = useRef(0); // seconds from server at last sync
  var intervalRef = useRef(null);
  var syncIntervalRef = useRef(null);

  // Format seconds as HH:MM:SS
  function formatTime(s) {
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  // Fetch timer state from server
  function fetchTimer() {
    return fetch('/api/timer?shareToken=' + encodeURIComponent(shareToken))
      .then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

  // Send start/stop action to server
  function sendAction(action) {
    return fetch('/api/timer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareToken: shareToken, action: action }),
    }).then(function(r) { return r.ok ? r.json() : null; })
      .catch(function() { return null; });
  }

  // Initial load
  useEffect(function() {
    if (!shareToken) return;
    fetchTimer().then(function(data) {
      if (!data) return;
      setTotalSeconds(data.seconds);
      setRunning(data.running);
      baseSecondsRef.current = data.seconds;
      if (data.running) {
        startedAtRef.current = Date.now();
      }
    });
  }, [shareToken]);

  // Accurate local tick using Date.now() difference (not dependent on setInterval accuracy)
  useEffect(function() {
    if (running) {
      if (!startedAtRef.current) startedAtRef.current = Date.now();
      intervalRef.current = setInterval(function() {
        var elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setTotalSeconds(baseSecondsRef.current + elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return function() { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Sync with server every 30s while running (to keep server state up to date)
  useEffect(function() {
    if (running) {
      syncIntervalRef.current = setInterval(function() {
        fetchTimer().then(function(data) {
          if (!data) return;
          baseSecondsRef.current = data.seconds;
          startedAtRef.current = Date.now();
        });
      }, 30000);
    } else {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    }
    return function() { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [running]);

  function handleStart() {
    setSyncing(true);
    sendAction('start').then(function(data) {
      setSyncing(false);
      if (!data) return;
      setRunning(true);
      baseSecondsRef.current = data.seconds;
      startedAtRef.current = Date.now();
      setTotalSeconds(data.seconds);
      setShowHint(false);
    });
  }

  function handleStop() {
    setSyncing(true);
    sendAction('stop').then(function(data) {
      setSyncing(false);
      if (!data) return;
      setRunning(false);
      baseSecondsRef.current = data.seconds;
      startedAtRef.current = null;
      setTotalSeconds(data.seconds);
    });
  }

  return (
    <div className="briefing-timer-sticky">
      <div className="briefing-timer-inner">
        <div className="briefing-timer-display">
          <span className={'briefing-timer-time' + (running ? ' briefing-timer-running' : '')}>{formatTime(totalSeconds)}</span>
          {running ? (
            <button className="briefing-timer-btn briefing-timer-stop" onClick={handleStop} disabled={syncing} title="Pause timer">
              &#9646;&#9646;
            </button>
          ) : (
            <button className="briefing-timer-btn briefing-timer-start" onClick={handleStart} disabled={syncing} title="Start timer">
              &#9654;
            </button>
          )}
        </div>
        {showHint && !running && totalSeconds === 0 && (
          <div className="briefing-timer-hint">
            Press Start before you begin working on this store.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHECKMARK HELPERS (localStorage persistence) ───
function loadChecks(shareToken) {
  try {
    var raw = localStorage.getItem('briefing-checks-' + shareToken);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}
function saveChecks(shareToken, checks) {
  try { localStorage.setItem('briefing-checks-' + shareToken, JSON.stringify(checks)); } catch (e) { /* ignore */ }
}

// Count total images required and how many are checked
function computeProgress(store, checks) {
  var total = 0;
  var done = 0;
  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(tile, ti) {
        if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
        var key = pg.id + '/' + sec.id + '/' + ti;
        // If syncDimensions (same format desktop=mobile), only 1 image needed
        if (tile.syncDimensions) {
          total += 1;
          if (checks[key + '/sync']) done += 1;
        } else {
          total += 2; // desktop + mobile
          if (checks[key + '/desktop']) done += 1;
          if (checks[key + '/mobile']) done += 1;
        }
      });
    });
  });
  return { total: total, done: done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

// ─── PREVIEW MODE COMPONENT ───
// Designer selects a local folder with images. Files are matched by canonical filenames.
function PreviewMode({ store, onClose }) {
  var [pvMode, setPvMode] = useState('desktop');
  var pages = store.pages || [];
  var topPages = pages.filter(function(p) { return !p.parentId; });
  var childrenMap = {};
  topPages.forEach(function(pg) { childrenMap[pg.id] = pages.filter(function(cp) { return cp.parentId === pg.id; }); });
  var [pvPage, setPvPage] = useState(pages[0] ? pages[0].id : '');
  var [hoveredTab, setHoveredTab] = useState(null);
  var [moreOpen, setMoreOpen] = useState(false);
  var morePopupRef = useRef(null);
  var activePg = pages.find(function(p) { return p.id === pvPage; }) || pages[0];
  var [imageMap, setImageMap] = useState({});
  var [loadedCount, setLoadedCount] = useState(0);
  var [totalFiles, setTotalFiles] = useState(0);
  var fileInputRef = useRef(null);
  var [showFilenames, setShowFilenames] = useState(false);

  var fnMap = buildFilenameMap(store);
  var [folderNames, setFolderNames] = useState([]);

  function handleFolderSelect(e) {
    var files = e.target.files;
    if (!files || files.length === 0) return;
    var firstPath = files[0] && files[0].webkitRelativePath ? files[0].webkitRelativePath : '';
    var folderName = firstPath ? firstPath.split('/')[0] : 'Folder';
    var imageExts = /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i;
    var merged = Object.assign({}, imageMap);
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!imageExts.test(file.name)) continue;
      var name = file.name.toLowerCase();
      var nameNoExt = name.replace(/\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i, '');
      if (fnMap[name] && !merged[name]) {
        merged[name] = URL.createObjectURL(file);
      } else if (fnMap[nameNoExt + '.jpg'] && !merged[nameNoExt + '.jpg']) {
        merged[nameNoExt + '.jpg'] = URL.createObjectURL(file);
      } else {
        var keys = Object.keys(fnMap);
        for (var k = 0; k < keys.length; k++) {
          if (merged[keys[k]]) continue;
          var keyBase = keys[k].replace('.jpg', '');
          if (nameNoExt === keyBase || nameNoExt.indexOf(keyBase) >= 0 || keyBase.indexOf(nameNoExt) >= 0) {
            merged[keys[k]] = URL.createObjectURL(file);
            break;
          }
        }
      }
    }
    setImageMap(merged);
    setLoadedCount(Object.keys(merged).length);
    setTotalFiles(function(prev) { return prev + files.length; });
    if (folderNames.indexOf(folderName) < 0) {
      setFolderNames(function(prev) { return prev.concat(folderName); });
    }
    e.target.value = '';
  }

  function handleResetImages() {
    Object.values(imageMap).forEach(function(url) { try { URL.revokeObjectURL(url); } catch(e) {} });
    setImageMap({});
    setLoadedCount(0);
    setTotalFiles(0);
    setFolderNames([]);
  }

  var [showReport, setShowReport] = useState(false);

  function findTileImage(pageName, sectionIndex, tileIndex, variant) {
    var fn = tileFilename(pageName, sectionIndex, tileIndex, variant).toLowerCase();
    return imageMap[fn] || null;
  }

  // Close more popup on outside click
  useEffect(function() {
    if (!moreOpen) return;
    function handleClick(e) {
      if (morePopupRef.current && !morePopupRef.current.contains(e.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [moreOpen]);

  // Match report computation
  var matchReport = { total: 0, matched: 0, missing: [] };
  if (loadedCount > 0) {
    (store.pages || []).forEach(function(pg) {
      (pg.sections || []).forEach(function(sec, si) {
        (sec.tiles || []).forEach(function(tile, ti) {
          if (PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
          if (tile.syncDimensions) {
            matchReport.total += 1;
            var fn = tileFilename(pg.name, si, ti, 'sync').toLowerCase();
            if (imageMap[fn]) { matchReport.matched += 1; } else {
              matchReport.missing.push({ page: pg.name, section: si + 1, tile: ti + 1, filename: tileFilename(pg.name, si, ti, 'sync') });
            }
          } else {
            matchReport.total += 2;
            var fnD = tileFilename(pg.name, si, ti, 'desktop').toLowerCase();
            var fnM = tileFilename(pg.name, si, ti, 'mobile').toLowerCase();
            if (imageMap[fnD]) { matchReport.matched += 1; } else {
              matchReport.missing.push({ page: pg.name, section: si + 1, tile: ti + 1, filename: tileFilename(pg.name, si, ti, 'desktop') });
            }
            if (imageMap[fnM]) { matchReport.matched += 1; } else {
              matchReport.missing.push({ page: pg.name, section: si + 1, tile: ti + 1, filename: tileFilename(pg.name, si, ti, 'mobile') });
            }
          }
        });
      });
    });
  }
  var matchPct = matchReport.total > 0 ? Math.round((matchReport.matched / matchReport.total) * 100) : 0;

  // Find hero tile and its image
  var heroTile = null;
  var heroPageName = null;
  var heroSecIdx = 0;
  var heroTileIdx = 0;
  (store.pages || []).forEach(function(pg) {
    if (heroTile) return;
    (pg.sections || []).forEach(function(sec, si) {
      if (heroTile) return;
      (sec.tiles || []).forEach(function(tile, ti) {
        if (!heroTile && tile.imageCategory === 'store_hero') {
          heroTile = tile;
          heroPageName = pg.name;
          heroSecIdx = si;
          heroTileIdx = ti;
        }
      });
    });
  });

  var heroImgSrc = null;
  if (heroTile && heroPageName) {
    if (heroTile.syncDimensions) {
      heroImgSrc = findTileImage(heroPageName, heroSecIdx, heroTileIdx, 'sync');
    } else {
      heroImgSrc = findTileImage(heroPageName, heroSecIdx, heroTileIdx, pvMode);
      if (!heroImgSrc) heroImgSrc = findTileImage(heroPageName, heroSecIdx, heroTileIdx, pvMode === 'desktop' ? 'mobile' : 'desktop');
      if (!heroImgSrc) heroImgSrc = findTileImage(heroPageName, heroSecIdx, heroTileIdx, 'sync');
    }
    if (!heroImgSrc) heroImgSrc = pvMode === 'desktop' ? (heroTile.uploadedImage || null) : (heroTile.uploadedImageMobile || heroTile.uploadedImage || null);
  }

  var isMobile = pvMode === 'mobile';
  var storeWidth = isMobile ? 414 : 1500;
  var MAX_NAV_TABS = isMobile ? 4 : 6;
  var visibleTabs = topPages.slice(0, MAX_NAV_TABS);
  var overflowTabs = topPages.slice(MAX_NAV_TABS);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#232f3e', display: 'flex', flexDirection: 'column' }}>
      {/* ─── TOOLBAR (our app controls) ─── */}
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontSize: 12, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 13, opacity: 0.7 }}>Preview</span>
          <input ref={fileInputRef} type="file" webkitdirectory="" directory="" multiple style={{ display: 'none' }} onChange={handleFolderSelect} />
          <button onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
            style={{ background: loadedCount > 0 ? '#22c55e' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 12px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
            {loadedCount > 0 ? '+ Folder (' + folderNames.length + ')' : 'Load Folder'}
          </button>
          {loadedCount > 0 && (
            <button onClick={handleResetImages} style={{ background: 'transparent', color: '#fca5a5', border: '1px solid rgba(239,68,68,.3)', borderRadius: 3, padding: '2px 8px', fontSize: 9, cursor: 'pointer' }}>Reset</button>
          )}
          {loadedCount > 0 && (
            <button onClick={function() { setShowReport(!showReport); }}
              style={{ background: matchPct === 100 ? 'rgba(34,197,94,.15)' : 'rgba(251,191,36,.15)', color: matchPct === 100 ? '#4ade80' : '#fbbf24', border: 'none', borderRadius: 3, padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
              {matchPct}% matched
            </button>
          )}
          {loadedCount > 0 && (
            <button onClick={function() { setShowFilenames(!showFilenames); }}
              style={{ background: showFilenames ? 'rgba(99,102,241,.3)' : 'transparent', color: '#a5b4fc', border: '1px solid rgba(99,102,241,.3)', borderRadius: 3, padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              {showFilenames ? 'Hide Names' : 'Show Names'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={function() { setPvMode('desktop'); }} style={{ background: pvMode === 'desktop' ? '#3b82f6' : 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 3, padding: '2px 10px', fontSize: 10, cursor: 'pointer' }}>Desktop</button>
          <button onClick={function() { setPvMode('mobile'); }} style={{ background: pvMode === 'mobile' ? '#3b82f6' : 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.2)', borderRadius: 3, padding: '2px 10px', fontSize: 10, cursor: 'pointer' }}>Mobile</button>
          <button onClick={onClose} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 12px', fontSize: 10, cursor: 'pointer', fontWeight: 600, marginLeft: 8 }}>Close</button>
        </div>
      </div>

      {/* ─── MATCH REPORT (collapsible) ─── */}
      {loadedCount > 0 && showReport && (
        <div style={{ background: matchPct === 100 ? '#f0fdf4' : '#fffbeb', borderBottom: '1px solid ' + (matchPct === 100 ? '#bbf7d0' : '#fde68a'), padding: '10px 20px', maxHeight: 220, overflow: 'auto', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1, height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: matchPct + '%', height: '100%', background: matchPct === 100 ? '#22c55e' : '#f59e0b', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: matchPct === 100 ? '#16a34a' : '#d97706' }}>{matchPct}%</span>
          </div>
          <div style={{ fontSize: 11, color: '#334155', marginBottom: 4 }}>
            <strong>{matchReport.matched}</strong> / <strong>{matchReport.total}</strong> matched
            {matchReport.missing.length > 0 && <span style={{ color: '#dc2626' }}> — {matchReport.missing.length} missing</span>}
          </div>
          {matchReport.missing.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
              {matchReport.missing.map(function(m, i) {
                return (
                  <div key={i} style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 3, padding: '2px 6px', fontSize: 9 }}>
                    <span style={{ color: '#64748b' }}>{m.page} S{m.section} T{m.tile}</span>
                    <span style={{ fontFamily: 'monospace', color: '#dc2626', marginLeft: 4 }}>{m.filename}</span>
                  </div>
                );
              })}
            </div>
          )}
          {matchReport.missing.length === 0 && (
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>All images matched!</div>
          )}
        </div>
      )}

      {/* ─── AMAZON STORE PREVIEW ─── */}
      <div style={{ flex: 1, overflow: 'auto', background: isMobile ? '#f5f5f5' : '#e3e6e6', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: storeWidth, maxWidth: '100%', background: '#fff', minHeight: '100%', boxShadow: isMobile ? 'none' : '0 0 40px rgba(0,0,0,.15)' }}>

          {/* ─── HERO BANNER (full width, like Amazon) ─── */}
          <div style={{ width: '100%', aspectRatio: isMobile ? '1242/450' : '3000/600', background: '#232f3e', position: 'relative', overflow: 'hidden' }}>
            {heroImgSrc ? (
              <img src={heroImgSrc} alt="Store Hero" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'rgba(255,255,255,.4)' }}>
                <div style={{ fontSize: isMobile ? 14 : 20, fontWeight: 700, marginBottom: 4 }}>Store Hero Image</div>
                <div style={{ fontSize: isMobile ? 10 : 13, opacity: 0.6 }}>{isMobile ? '1242 \u00D7 450' : '3000 \u00D7 600'}px</div>
              </div>
            )}
            {showFilenames && heroTile && heroPageName && (
              <div style={{ position: 'absolute', bottom: 6, left: 8, background: 'rgba(0,0,0,.7)', color: '#a5b4fc', fontFamily: 'monospace', fontSize: 9, padding: '2px 6px', borderRadius: 2 }}>
                {tileFilename(heroPageName, heroSecIdx, heroTileIdx, heroTile.syncDimensions ? 'sync' : pvMode)}
              </div>
            )}
          </div>

          {/* ─── BRAND BAR (like Amazon brand logo strip) ─── */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e0e0e0', padding: isMobile ? '10px 12px' : '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: isMobile ? 36 : 48, height: isMobile ? 36 : 48, borderRadius: '50%', background: '#232f3e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: isMobile ? 14 : 18, flexShrink: 0 }}>
              {(store.brandName || 'B').charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: isMobile ? 14 : 18, color: '#0f1111', lineHeight: 1.2 }}>{store.brandName || 'Brand Store'}</div>
              {store.heroMessage && <div style={{ fontSize: isMobile ? 11 : 12, color: '#565959', marginTop: 2 }}>{store.heroMessage}</div>}
            </div>
          </div>

          {/* ─── NAVIGATION BAR (Amazon-style tabs) ─── */}
          <div style={{ background: '#fff', borderBottom: '2px solid #e0e0e0', padding: '0 ' + (isMobile ? '8px' : '24px'), display: 'flex', alignItems: 'stretch', position: 'relative', overflow: 'visible' }}>
            {visibleTabs.map(function(pg) {
              var isActive = pg.id === pvPage || (childrenMap[pg.id] || []).some(function(c) { return c.id === pvPage; });
              var isHovered = hoveredTab === pg.id;
              var children = childrenMap[pg.id] || [];
              return (
                <div key={pg.id} style={{ position: 'relative' }}
                  onMouseEnter={function() { setHoveredTab(pg.id); }}
                  onMouseLeave={function() { setHoveredTab(null); }}>
                  <button onClick={function() { setPvPage(pg.id); }}
                    style={{
                      background: 'transparent', border: 'none', borderBottom: isActive ? '3px solid #e77600' : '3px solid transparent',
                      padding: isMobile ? '10px 8px' : '12px 16px', fontSize: isMobile ? 11 : 13, fontWeight: isActive ? 700 : 400,
                      color: isActive ? '#c45500' : '#0f1111', cursor: 'pointer', whiteSpace: 'nowrap',
                      transition: 'border-color .15s, color .15s'
                    }}>
                    {pg.name}
                  </button>
                  {/* Submenu dropdown on hover */}
                  {children.length > 0 && isHovered && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #d5d9d9', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 100, minWidth: 180, padding: '4px 0' }}>
                      {children.map(function(child) {
                        var childActive = child.id === pvPage;
                        return (
                          <button key={child.id} onClick={function() { setPvPage(child.id); setHoveredTab(null); }}
                            style={{ display: 'block', width: '100%', textAlign: 'left', background: childActive ? '#f0f0f0' : 'transparent', border: 'none', padding: '8px 16px', fontSize: 12, color: childActive ? '#c45500' : '#0f1111', cursor: 'pointer', fontWeight: childActive ? 600 : 400 }}>
                            {child.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {overflowTabs.length > 0 && (
              <div style={{ position: 'relative' }} ref={morePopupRef}>
                <button onClick={function() { setMoreOpen(!moreOpen); }}
                  style={{ background: 'transparent', border: 'none', borderBottom: '3px solid transparent', padding: isMobile ? '10px 8px' : '12px 16px', fontSize: isMobile ? 11 : 13, color: '#0f1111', cursor: 'pointer' }}>
                  Mehr &#9662;
                </button>
                {moreOpen && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: '#fff', border: '1px solid #d5d9d9', borderRadius: '0 0 4px 4px', boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 100, minWidth: 200, padding: '4px 0' }}>
                    {overflowTabs.map(function(pg) {
                      return (
                        <button key={pg.id} onClick={function() { setPvPage(pg.id); setMoreOpen(false); }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: pg.id === pvPage ? '#f0f0f0' : 'transparent', border: 'none', padding: '8px 16px', fontSize: 12, color: pg.id === pvPage ? '#c45500' : '#0f1111', cursor: 'pointer' }}>
                          {pg.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── PAGE CONTENT (sections) ─── */}
          <div style={{ padding: isMobile ? '0' : '0' }}>
            {activePg && activePg.sections.map(function(sec, si) {
              var layout = findLayout(sec.layoutId);
              var config = getGridConfig(layout, isMobile);
              var tileDims = LAYOUT_TILE_DIMS[sec.layoutId] || [];
              var sectionGridStyle = Object.assign({}, config.gridStyle, { display: 'grid', gap: 0, width: '100%' });
              if (!sectionGridStyle.aspectRatio && tileDims.length > 0) {
                var firstDim = tileDims[0] || { w: 1500, h: 600 };
                if (layout.cells === 1) {
                  sectionGridStyle.aspectRatio = String(firstDim.w / firstDim.h);
                }
              }
              return (
                <div key={sec.id} style={{ marginBottom: 0 }}>
                  <div style={sectionGridStyle}>
                    {sec.tiles.map(function(tile, ti) {
                      var isProduct = PRODUCT_TILE_TYPES.indexOf(tile.type) >= 0;
                      var tileStyle = Object.assign({}, config.getTileStyle(ti), { position: 'relative', background: tile.bgColor || '#f5f5f5', overflow: 'hidden', minHeight: 0 });
                      var imgSrc = null;
                      if (!isProduct && tile.type !== 'text') {
                        if (tile.syncDimensions) {
                          imgSrc = findTileImage(activePg.name, si, ti, 'sync');
                        } else {
                          imgSrc = findTileImage(activePg.name, si, ti, pvMode);
                          if (!imgSrc) imgSrc = findTileImage(activePg.name, si, ti, pvMode === 'desktop' ? 'mobile' : 'desktop');
                          if (!imgSrc) imgSrc = findTileImage(activePg.name, si, ti, 'sync');
                        }
                      }
                      if (!imgSrc) {
                        imgSrc = pvMode === 'desktop' ? tile.uploadedImage : (tile.uploadedImageMobile || tile.uploadedImage);
                      }
                      var expectedFilename = (!isProduct && tile.type !== 'text') ? tileFilename(activePg.name, si, ti, tile.syncDimensions ? 'sync' : pvMode) : null;
                      return (
                        <div key={ti} style={tileStyle}>
                          {imgSrc ? (
                            <img src={imgSrc} alt={'Tile ' + (ti + 1)} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: isMobile ? 10 : 12, gap: 4, width: '100%', height: '100%', minHeight: isMobile ? 40 : 60, background: tile.bgColor || '#f0f0f0' }}>
                              {isProduct ? (
                                <span style={{ fontSize: isMobile ? 9 : 11, color: '#888' }}>Product Grid</span>
                              ) : (
                                <span style={{ fontFamily: 'monospace', fontSize: isMobile ? 8 : 10, color: '#aaa' }}>
                                  {expectedFilename || 'No image'}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Filename overlay when toggled */}
                          {showFilenames && expectedFilename && (
                            <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'rgba(0,0,0,.75)', color: '#a5b4fc', fontFamily: 'monospace', fontSize: 8, padding: '1px 5px', borderRadius: 2, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {expectedFilename}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {(!activePg || activePg.sections.length === 0) && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 60, fontSize: 14 }}>No sections on this page.</div>}
          </div>

          {/* End of store content */}
        </div>
      </div>

      {/* Instructions banner (only if no images loaded, floating at bottom) */}
      {loadedCount === 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(30,41,59,.95)', padding: '12px 20px', fontSize: 12, color: '#93c5fd', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
          Click <strong>"Load Folder"</strong> to select a parent folder — all subfolders are scanned automatically. You can load multiple folders.
        </div>
      )}
    </div>
  );
}

// ─── META DESCRIPTIONS PANEL (click-to-copy) ───
function MetaDescriptionsPanel({ pages, store }) {
  var [copiedId, setCopiedId] = useState(null);

  function handleCopy(pgId, text) {
    navigator.clipboard.writeText(text).then(function() {
      setCopiedId(pgId);
      setTimeout(function() { setCopiedId(null); }, 1500);
    });
  }

  return (
    <div className="briefing-sidebar-section" style={{ background: '#f0fdf4', borderRadius: 8, margin: '0 8px 10px', padding: '10px 12px' }}>
      <div className="briefing-sidebar-title" style={{ color: '#15803d', marginBottom: 6 }}>Meta Descriptions</div>
      <div style={{ fontSize: 9, color: '#64748b', marginBottom: 6 }}>Click to copy</div>
      {pages.map(function(pg) {
        var md = generateMetaDescription(pg, store);
        if (!md) return null;
        var isCopied = copiedId === pg.id;
        return (
          <div key={pg.id}
            onClick={function() { handleCopy(pg.id, md); }}
            style={{ marginBottom: 6, padding: '6px 8px', background: isCopied ? '#dcfce7' : '#fff', border: '1px solid ' + (isCopied ? '#86efac' : '#e2e8f0'), borderRadius: 6, cursor: 'pointer', transition: 'all .2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#334155' }}>{pg.name}</div>
              <span style={{ fontSize: 9, color: isCopied ? '#16a34a' : '#94a3b8', fontWeight: 600 }}>{isCopied ? 'Copied!' : 'Click to copy'}</span>
            </div>
            <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.4, marginTop: 2 }}>{md}</div>
            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{md.length}/155 chars</div>
          </div>
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
  var [lastUpdated, setLastUpdated] = useState(null);
  var [changeHighlights, setChangeHighlights] = useState({});
  var [updateBanner, setUpdateBanner] = useState(false);
  var [changeLog, setChangeLog] = useState([]); // [{ time, descriptions[] }]
  var [selectedTile, setSelectedTile] = useState(null); // { sid, ti }
  var [sidebarTab, setSidebarTab] = useState('design'); // 'design' or 'info'
  var [checks, setChecks] = useState({}); // image completion checkmarks
  var [showPreview, setShowPreview] = useState(false);
  var prevStoreRef = useRef(null);
  var pollRef = useRef(null);
  var bannerTimeoutRef = useRef(null);
  var rightPanelRef = useRef(null);

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

  // ─── LOAD CHECKMARKS FROM LOCALSTORAGE ───
  useEffect(function() {
    if (token) setChecks(loadChecks(token));
  }, [token]);

  // Toggle a checkmark and persist
  function toggleCheck(checkKey) {
    setChecks(function(prev) {
      var next = Object.assign({}, prev);
      if (next[checkKey]) { delete next[checkKey]; } else { next[checkKey] = true; }
      saveChecks(token, next);
      return next;
    });
  }

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
          var changeResult = detectChanges(
            oldJson ? JSON.parse(oldJson) : null,
            result.data
          );
          setChangeHighlights(changeResult.highlights);
          var now = new Date();
          setChangeLog(function(prev) {
            return [{ time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), descriptions: changeResult.descriptions }].concat(prev).slice(0, 10);
          });
          setUpdateBanner(true);
          setStore(result.data);
          setLastUpdated(result.updatedAt || new Date().toISOString());
          prevStoreRef.current = newJson;
          if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
          bannerTimeoutRef.current = setTimeout(function() { setUpdateBanner(false); }, 60000);
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
    if (!oldStore || !newStore) return { highlights: {}, descriptions: [] };
    var highlights = {};
    var descriptions = [];
    (newStore.pages || []).forEach(function(page) {
      var oldPage = (oldStore.pages || []).find(function(p) { return p.id === page.id; });
      if (!oldPage) {
        highlights['page-' + page.id] = 'added';
        descriptions.push('Page "' + page.name + '" added');
        return;
      }
      if (oldPage.name !== page.name) {
        descriptions.push('Page "' + oldPage.name + '" renamed to "' + page.name + '"');
      }
      (page.sections || []).forEach(function(sec, si) {
        var oldSec = (oldPage.sections || []).find(function(s) { return s.id === sec.id; });
        if (!oldSec) {
          highlights['sec-' + sec.id] = 'added';
          descriptions.push(page.name + ' — Section ' + (si + 1) + ' added');
          return;
        }
        if (sec.layoutId !== oldSec.layoutId) {
          highlights['sec-' + sec.id] = 'modified';
          var newLayout = findLayout(sec.layoutId);
          descriptions.push(page.name + ' — Section ' + (si + 1) + ' layout changed to "' + (newLayout ? newLayout.name : sec.layoutId) + '"');
        }
        (sec.tiles || []).forEach(function(tile, ti) {
          var oldTile = oldSec.tiles && oldSec.tiles[ti];
          if (!oldTile) {
            highlights['tile-' + sec.id + '-' + ti] = 'added';
            descriptions.push(page.name + ' — Section ' + (si + 1) + ', Tile ' + (ti + 1) + ' added');
          } else if (JSON.stringify(tile) !== JSON.stringify(oldTile)) {
            highlights['tile-' + sec.id + '-' + ti] = 'modified';
            var fields = [];
            if (tile.brief !== oldTile.brief) fields.push('brief');
            if (tile.textOverlay !== oldTile.textOverlay) fields.push('text');
            if (tile.ctaText !== oldTile.ctaText) fields.push('CTA');
            if (tile.bgColor !== oldTile.bgColor) fields.push('color');
            if (tile.imageCategory !== oldTile.imageCategory) fields.push('category');
            if (tile.type !== oldTile.type) fields.push('type');
            if (JSON.stringify(tile.asins) !== JSON.stringify(oldTile.asins)) fields.push('ASINs');
            if (tile.uploadedImage !== oldTile.uploadedImage || tile.uploadedImageMobile !== oldTile.uploadedImageMobile) fields.push('image');
            var detail = fields.length > 0 ? ' (' + fields.join(', ') + ')' : '';
            descriptions.push(page.name + ' — Section ' + (si + 1) + ', Tile ' + (ti + 1) + ' updated' + detail);
          }
        });
      });
      (oldPage.sections || []).forEach(function(sec, si) {
        var exists = (page.sections || []).find(function(s) { return s.id === sec.id; });
        if (!exists) {
          highlights['sec-' + sec.id] = 'removed';
          descriptions.push(page.name + ' — Section ' + (si + 1) + ' removed');
        }
      });
    });
    (oldStore.pages || []).forEach(function(page) {
      var exists = (newStore.pages || []).find(function(p) { return p.id === page.id; });
      if (!exists) {
        highlights['page-' + page.id] = 'removed';
        descriptions.push('Page "' + page.name + '" removed');
      }
    });
    return { highlights: highlights, descriptions: descriptions };
  }

  // DOCX export removed

  // ─── TILE SELECTION (click tile in preview → scroll right panel) ───
  function handleTileSelect(sel) {
    if (!sel) return;
    setSelectedTile(sel);
    // Scroll the right panel to the matching tile detail
    setTimeout(function() {
      var el = document.getElementById('tile-detail-' + sel.sid + '-' + sel.ti);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

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
      rightPanelSections.push({ section: sec, sectionIndex: si, pageName: activePage.name, pageId: activePage.id, colorIndex: si, layoutId: sec.layoutId });
    });
  }

  // Build duplicate detection map
  var duplicateMap = buildDuplicateMap(store);

  // Compute image progress
  var progress = store ? computeProgress(store, checks) : { total: 0, done: 0, pct: 0 };

  return (
    <div className="briefing-root">
      {/* Preview mode overlay */}
      {showPreview && <PreviewMode store={store} onClose={function() { setShowPreview(false); }} />}

      {/* Header */}
      <div className="briefing-header">
        <div className="briefing-header-left">
          <span className="briefing-logo">Designer Briefing</span>
          <span className="briefing-brand-name">{store.brandName || 'Store'}</span>
          <span className="briefing-readonly-badge">Read Only</span>
        </div>
        <div className="briefing-header-right">
          <button onClick={function() { setShowPreview(true); }} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#94a3b8', fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }} title="Preview store with uploaded images">
            Preview
          </button>
          <div className="briefing-view-toggle">
            <button className={'briefing-view-btn' + (viewMode === 'desktop' ? ' active' : '')} onClick={function() { setViewMode('desktop'); }}>Desktop</button>
            <button className={'briefing-view-btn' + (viewMode === 'mobile' ? ' active' : '')} onClick={function() { setViewMode('mobile'); }}>Mobile</button>
          </div>
        </div>
      </div>

      {/* Designer Timer — sticky at top */}
      {token && <DesignerTimer shareToken={token} />}

      {/* Update banner */}
      {updateBanner && (
        <div className="briefing-update-banner">
          <div className="briefing-update-banner-header">
            <span className="briefing-update-banner-title">Briefing Updated</span>
            <button className="briefing-dismiss-btn" onClick={function() { setUpdateBanner(false); setChangeHighlights({}); }}>Dismiss</button>
          </div>
          {changeLog.length > 0 && (
            <div className="briefing-update-changes">
              {changeLog.slice(0, 3).map(function(entry, ei) {
                return (
                  <div key={ei} className="briefing-update-entry">
                    <span className="briefing-update-time">{entry.time}</span>
                    <div className="briefing-update-details">
                      {entry.descriptions.map(function(desc, di) {
                        return <div key={di} className="briefing-update-detail">{desc}</div>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="briefing-body">
        {/* LEFT SIDEBAR — TABBED */}
        <div className="briefing-sidebar">
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', margin: '0 8px 8px' }}>
            <button onClick={function() { setSidebarTab('design'); }} style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', borderBottom: sidebarTab === 'design' ? '2px solid #3b82f6' : '2px solid transparent', color: sidebarTab === 'design' ? '#1d4ed8' : '#94a3b8', marginBottom: -2 }}>
              Design
            </button>
            <button onClick={function() { setSidebarTab('info'); }} style={{ flex: 1, padding: '8px 0', fontSize: 11, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', borderBottom: sidebarTab === 'info' ? '2px solid #3b82f6' : '2px solid transparent', color: sidebarTab === 'info' ? '#1d4ed8' : '#94a3b8', marginBottom: -2 }}>
              Store Info
            </button>
          </div>

          {/* ═══ DESIGN TAB ═══ */}
          {sidebarTab === 'design' && (
            <div>
              {/* Image Category Legend */}
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
            </div>
          )}

          {/* ═══ STORE INFO TAB ═══ */}
          {sidebarTab === 'info' && (
            <div>
              {/* ── Progress Analysis ── */}
              <div className="briefing-sidebar-section" style={{ background: '#f0fdf4', borderRadius: 8, margin: '0 8px 10px', padding: '12px' }}>
                <div className="briefing-sidebar-title" style={{ color: '#15803d', marginBottom: 8 }}>Image Progress</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: progress.pct + '%', height: '100%', background: progress.pct === 100 ? '#22c55e' : '#3b82f6', borderRadius: 4, transition: 'width .3s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: progress.pct === 100 ? '#16a34a' : '#1e293b', minWidth: 40, textAlign: 'right' }}>{progress.pct}%</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{progress.done} / {progress.total} images completed</div>
              </div>

              {/* ── Upload Instructions ── */}
              <div className="briefing-sidebar-section" style={{ background: '#fef9c3', borderRadius: 8, margin: '0 8px 10px', padding: '10px 12px' }}>
                <div className="briefing-sidebar-title" style={{ color: '#a16207' }}>Upload Instructions</div>
                <div className="briefing-legend">
                  <p>Upload all finished assets to the shared Google Drive folder.</p>
                  <p>Use the <strong>exact filenames</strong> shown in the Designer Instructions panel for each tile. This enables the Preview mode to auto-match your images.</p>
                  <p style={{ marginTop: 6 }}><strong>Naming convention:</strong></p>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.8 }}>
                    {'{PageName}'}_S{'{n}'}_T{'{n}'}_desktop.jpg<br />
                    {'{PageName}'}_S{'{n}'}_T{'{n}'}_mobile.jpg<br />
                    <span style={{ color: '#64748b' }}>// If same format (synced):</span><br />
                    {'{PageName}'}_S{'{n}'}_T{'{n}'}.jpg
                  </div>
                  <p style={{ marginTop: 6 }}><strong>Example:</strong></p>
                  <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 8px', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.8 }}>
                    Homepage_S1_T1_desktop.jpg<br />
                    Homepage_S1_T1_mobile.jpg<br />
                    Homepage_S2_T1.jpg<br />
                    Kategorie_1_S1_T1_desktop.jpg<br />
                    ...
                  </div>
                  <p style={{ marginTop: 6, fontSize: 10, color: '#92400e' }}>Tip: Use the Preview button to verify your images. Select the folder and images are matched automatically.</p>
                </div>
              </div>

              {/* ── Meta Descriptions per Page (click to copy) ── */}
              <MetaDescriptionsPanel pages={pages} store={store} />

              {/* ── Store Info ── */}
              <div className="briefing-sidebar-section" style={{ background: '#f8fafc', borderRadius: 8, margin: '0 8px 10px', padding: '10px 12px' }}>
                <div className="briefing-sidebar-title" style={{ color: '#0f766e' }}>Store Info</div>
                <div className="briefing-info-row"><span>Brand:</span> <strong>{store.brandName || 'N/A'}</strong></div>
                <div className="briefing-info-row"><span>Marketplace:</span> <strong>Amazon.{store.marketplace || 'de'}</strong></div>
                <div className="briefing-info-row"><span>Pages:</span> <strong>{pages.length}</strong></div>
                <div className="briefing-info-row"><span>Products (ASINs):</span> <strong>{(store.products || []).length}</strong></div>
                {lastUpdated && (
                  <div className="briefing-info-row"><span>Last Updated:</span> <strong>{new Date(lastUpdated).toLocaleString('en-US')}</strong></div>
                )}
              </div>
            </div>
          )}
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

          {/* Single page content — meta descriptions moved to Store Info tab */}
          {(function() {
            if (!activePage) return <div className="briefing-empty">No pages found.</div>;
            return <PageBriefing page={activePage} viewMode={viewMode} products={store.products || []} sectionStartIndex={0} selectedTile={selectedTile} onTileSelect={handleTileSelect} store={store} />;
          })()}
        </div>

        {/* RIGHT PANEL: Designer Instructions (page-specific) */}
        <div className="briefing-right-panel" ref={rightPanelRef}>
          <div className="briefing-sidebar-title" style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', color: '#dc2626', margin: 0 }}>
            Designer Instructions
            {activePage && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 400, marginLeft: 8 }}>{activePage.name}</span>}
          </div>
          <div className="briefing-right-panel-body">
            {/* Store Hero / Header Banner instructions */}
            {(function() {
              var heroTile = null;
              (store.pages || []).forEach(function(pg) {
                if (heroTile) return;
                (pg.sections || []).forEach(function(sec) {
                  if (heroTile) return;
                  (sec.tiles || []).forEach(function(tile) {
                    if (!heroTile && tile.imageCategory === 'store_hero') heroTile = tile;
                  });
                });
              });
              if (!heroTile) return null;
              var heroColor = { bg: '#fef2f2', border: '#ef4444', label: '#b91c1c' };
              return (
                <div className="briefing-right-section-group">
                  <div className="briefing-right-section-header" style={{ background: heroColor.bg, borderLeft: '3px solid ' + heroColor.border }}>
                    <span style={{ fontWeight: 700, color: heroColor.label, fontSize: 11 }}>Store Hero Image</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}> &middot; Header Banner</span>
                  </div>
                  <div className="briefing-tile-detail" style={{ borderLeft: '3px solid ' + heroColor.border }}>
                    <div className="briefing-tile-header">
                      <span className="briefing-tile-type">Image</span>
                      <span className="briefing-tile-imgcat" style={{ background: '#ef4444', color: '#fff', borderRadius: 3, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                        Store Hero
                      </span>
                    </div>
                    {heroTile.brief && (
                      <div className="briefing-field">
                        <span className="briefing-field-label">Design Brief:</span>
                        <span className="briefing-field-value"><BriefTextHighlighted text={heroTile.brief} /></span>
                      </div>
                    )}
                    {heroTile.textOverlay && (
                      <div className="briefing-field">
                        <span className="briefing-field-label">Text on Image:</span>
                        <span className="briefing-field-value briefing-field-text">"{heroTile.textOverlay}"</span>
                      </div>
                    )}
                    {heroTile.ctaText && (
                      <div className="briefing-field">
                        <span className="briefing-field-label">CTA Button:</span>
                        <span className="briefing-field-value briefing-field-cta">"{heroTile.ctaText}"</span>
                      </div>
                    )}
                    {heroTile.bgColor && (
                      <div className="briefing-field">
                        <span className="briefing-field-label">Background Color:</span>
                        <span className="briefing-field-value">
                          <span className="briefing-color-swatch" style={{ background: heroTile.bgColor }} />
                          {heroTile.bgColor}
                        </span>
                      </div>
                    )}
                    <div className="briefing-tile-dims-row">
                      <span className="briefing-dim">Desktop: 3000&times;600</span>
                      <span className="briefing-dim">Mobile: 1242&times;450</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            {rightPanelSections.map(function(item, idx) {
              var color = getSectionColor(item.colorIndex);
              return (
                <div key={idx} className="briefing-right-section-group">
                  <div className="briefing-right-section-header" style={{ background: color.bg, borderLeft: '3px solid ' + color.border }}>
                    <span style={{ fontWeight: 700, color: color.label, fontSize: 11 }}>{item.pageName}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}> &middot; Section {item.sectionIndex + 1}</span>
                  </div>
                  {item.section.tiles.map(function(tile, ti) {
                    var isSelected = selectedTile && selectedTile.sid === item.section.id && selectedTile.ti === ti;
                    var fp = tileFingerprint(tile);
                    var dupInfo = fp && duplicateMap[fp] && duplicateMap[fp].count > 1
                      && !(duplicateMap[fp].page === item.pageName && duplicateMap[fp].section === item.sectionIndex + 1 && duplicateMap[fp].tile === ti + 1)
                      ? duplicateMap[fp] : null;
                    return (
                      <TileDetail
                        key={ti}
                        tile={tile}
                        tileIndex={ti}
                        layoutId={item.layoutId}
                        viewMode={viewMode}
                        sectionColor={color}
                        sectionId={item.section.id}
                        isSelected={isSelected}
                        onClickTile={handleTileSelect}
                        duplicateInfo={dupInfo}
                        pageId={item.pageId}
                        pageName={item.pageName}
                        sectionIndex={item.sectionIndex}
                        checks={checks}
                        toggleCheck={toggleCheck}
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
