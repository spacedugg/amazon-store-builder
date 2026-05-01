import { useState, useRef, useEffect } from 'react';
import { LAYOUTS, LAYOUT_TILE_DIMS, IMAGE_CATEGORIES, findLayout } from '../constants';
import { t } from '../i18n';
import TileView from './TileView';

// Check if a tile at given index in a layout is a "spanning" type (LS or W = spans full width on mobile)
function isTileSpanning(layoutId, tileIndex) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  if (!dims || !dims[tileIndex]) return true; // default: span
  var d = dims[tileIndex];
  // LS (1500×1500) and W (1500×700) and FW (3000×600) all span full width on mobile
  // Only SS (750×750) does NOT span
  return d.w > 750;
}

// Compute grid style and per-tile positioning for complex layouts
export function getGridConfig(layout, isMobile) {
  var g = layout.grid;

  // ─── MOBILE ───
  if (isMobile) {
    // Standard/VH mobile: use "std-auto" which auto-detects spanning from tile dims
    // LS and W tiles span full width, SS tiles pair side-by-side
    if (layout.mobileGrid === 'std-auto' || g === 'std-2equal' || g === 'vh-2equal' || g === '2x2wide') {
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (isTileSpanning(layout.id, i)) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }

    // 4x2grid mobile: all SS, pair side-by-side (4 rows of 2)
    if (g === '4x2grid') {
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function() { return {}; },
      };
    }

    // VH 4 squares mobile: 2×2 grid
    if (g === 'vh-4square') {
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function() { return {}; },
      };
    }

    // VH w2s / 2sw mobile: W spans, SS pair
    if (g === 'vh-w2s' || g === 'vh-2sw') {
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (isTileSpanning(layout.id, i)) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }

    // Default mobile: single column
    return {
      gridStyle: { gridTemplateColumns: layout.mobileCols || '1fr' },
      getTileStyle: function() { return {}; },
    };
  }

  // ─── DESKTOP ───

  // Full Width
  if (!g) {
    return {
      gridStyle: { gridTemplateColumns: layout.cols || '1fr' },
      getTileStyle: function() { return {}; },
    };
  }

  // Standard: 2 Equal (2 Large Squares, each 2 cols × 2 rows)
  if (g === 'std-2equal') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function() { return {}; },
    };
  }

  // VH: 2 Equal (2 Wides, each 2 cols × 1 row)
  if (g === 'vh-2equal') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', aspectRatio: '4.3' },
      getTileStyle: function() { return {}; },
    };
  }

  // VH: Wide + 2 Squares (W=2cols, SS=1col, SS=1col)
  if (g === 'vh-w2s') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', aspectRatio: '4' },
      getTileStyle: function(i) {
        if (i === 0) return { gridColumn: '1 / 3' };
        if (i === 1) return { gridColumn: '3' };
        if (i === 2) return { gridColumn: '4' };
        return {};
      },
    };
  }

  // VH: 2 Squares + Wide (SS=1col, SS=1col, W=2cols)
  if (g === 'vh-2sw') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', aspectRatio: '4' },
      getTileStyle: function(i) {
        if (i === 0) return { gridColumn: '1' };
        if (i === 1) return { gridColumn: '2' };
        if (i === 2) return { gridColumn: '3 / 5' };
        return {};
      },
    };
  }

  // VH: 4 Squares (SS×4, desktop: 4 across, mobile: 2×2 grid)
  if (g === 'vh-4square') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', aspectRatio: '4' },
      getTileStyle: function(i) {
        return { gridColumn: '' + (i + 1) };
      },
    };
  }

  // lg-2stack: Large Square left (2cols × 2rows) + 2 Wides stacked right (2cols × 1row each)
  if (g === 'lg-2stack') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '2' };
        return {};
      },
    };
  }

  // 2stack-lg: 2 Wides stacked left + Large Square right
  if (g === '2stack-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '1 / 3', gridColumn: '2' };
        return {};
      },
    };
  }

  // lg-w2s: LS (2×2) + W (2×1 top-right) + 2 SS (1×1 bottom-right)
  if (g === 'lg-w2s') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '1', gridColumn: '3 / 5' };
        if (i === 2) return { gridRow: '2', gridColumn: '3' };
        if (i === 3) return { gridRow: '2', gridColumn: '4' };
        return {};
      },
    };
  }

  // w2s-lg: W (2×1 top-left) + 2 SS (1×1 bottom-left) + LS (2×2 right)
  if (g === 'w2s-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '2', gridColumn: '2' };
        if (i === 3) return { gridRow: '1 / 3', gridColumn: '3 / 5' };
        return {};
      },
    };
  }

  // 2x2wide: 4 Wides in 2×2 (each 2cols × 1row)
  if (g === '2x2wide') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2.14' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        return {};
      },
    };
  }

  // lg-4grid: LS (2×2) + 4 SS in 2×2 grid right
  if (g === 'lg-4grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '1', gridColumn: '3' };
        if (i === 2) return { gridRow: '1', gridColumn: '4' };
        if (i === 3) return { gridRow: '2', gridColumn: '3' };
        if (i === 4) return { gridRow: '2', gridColumn: '4' };
        return {};
      },
    };
  }

  // 4grid-lg: 4 SS in 2×2 grid left + LS (2×2) right
  if (g === '4grid-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '1 / 3', gridColumn: '3 / 5' };
        return {};
      },
    };
  }

  // 2s-4grid: 2 Wides stacked left (2cols each) + 4 SS in 2×2 grid right
  if (g === '2s-4grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '2', gridColumn: '1 / 3' };
        if (i === 2) return { gridRow: '1', gridColumn: '3' };
        if (i === 3) return { gridRow: '1', gridColumn: '4' };
        if (i === 4) return { gridRow: '2', gridColumn: '3' };
        if (i === 5) return { gridRow: '2', gridColumn: '4' };
        return {};
      },
    };
  }

  // 4grid-2s: 4 SS in 2×2 grid left + 2 Wides stacked right
  if (g === '4grid-2s') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '1', gridColumn: '3 / 5' };
        if (i === 5) return { gridRow: '2', gridColumn: '3 / 5' };
        return {};
      },
    };
  }

  // 4x2grid: 8 SS in 4×2 grid
  if (g === '4x2grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '2' },
      getTileStyle: function(i) {
        var row = Math.floor(i / 4) + 1;
        var col = (i % 4) + 1;
        return { gridRow: String(row), gridColumn: String(col) };
      },
    };
  }

  // Default: simple column layout
  return {
    gridStyle: { gridTemplateColumns: layout.cols || '1fr' },
    getTileStyle: function() { return {}; },
  };
}

// ─── Mini layout preview thumbnail ───
// Renders a tiny grid preview of a layout for the dropdown picker
var TILE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#ef4444'];

function LayoutThumb({ layout, isMobile, size }) {
  var w = size || 48;
  // Always use desktop config for the layout thumbnail to show correct proportions
  var config = getGridConfig(layout, false);
  var gs = config.gridStyle;
  // Determine aspect ratio for thumbnail height
  var ar = parseFloat(gs.aspectRatio || '0');
  var h;
  if (layout.type === 'fullwidth') {
    h = Math.round(w * 0.25);
  } else if (ar > 0) {
    h = Math.round(w / ar);
  } else {
    h = Math.round(w * 0.5);
  }

  var tiles = [];
  for (var i = 0; i < layout.cells; i++) {
    var ts = config.getTileStyle(i);
    tiles.push(
      <div key={i} style={Object.assign({
        background: TILE_COLORS[i % TILE_COLORS.length],
        borderRadius: 2,
        minHeight: 0,
        minWidth: 0,
        opacity: 0.85,
      }, ts)} />
    );
  }

  // Build grid container style — only use grid properties, not aspectRatio
  var containerStyle = {
    display: 'grid',
    gap: 1,
    width: w,
    height: h,
  };
  if (gs.gridTemplateColumns) containerStyle.gridTemplateColumns = gs.gridTemplateColumns;
  if (gs.gridTemplateRows) containerStyle.gridTemplateRows = gs.gridTemplateRows;

  return <div style={containerStyle}>{tiles}</div>;
}

// Group layouts for the dropdown
var LAYOUT_GROUPS = [
  { label: 'Full Width', type: 'fullwidth' },
  { label: 'Standard', type: 'standard' },
  { label: 'Variable Height', type: 'vh' },
];

// ─── Custom layout picker dropdown ───
function LayoutPicker({ value, onChange, isMobile }) {
  var ref = useRef(null);
  var open = useState(false);
  var isOpen = open[0];
  var setOpen = open[1];

  // Close on outside click
  useEffect(function() {
    if (!isOpen) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [isOpen]);

  var current = findLayout(value) || LAYOUTS[0];

  return (
    <div ref={ref} className="layout-picker" onClick={function(e) { e.stopPropagation(); }}>
      <button
        className="layout-picker-trigger"
        onClick={function() { setOpen(!isOpen); }}
        title={current.name}
      >
        <LayoutThumb layout={current} isMobile={isMobile} size={44} />
        <span className="layout-picker-arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>
      {isOpen && (
        <div className="layout-picker-dropdown">
          {LAYOUT_GROUPS.map(function(group) {
            var groupLayouts = LAYOUTS.filter(function(l) { return l.type === group.type; });
            if (groupLayouts.length === 0) return null;
            return (
              <div key={group.type} className="layout-picker-group">
                <div className="layout-picker-group-label">{group.label}</div>
                <div className="layout-picker-grid">
                  {groupLayouts.map(function(l) {
                    var isSelected = l.id === value;
                    return (
                      <button
                        key={l.id}
                        className={'layout-picker-item' + (isSelected ? ' selected' : '')}
                        onClick={function() { onChange(l.id); setOpen(false); }}
                        title={l.name + ' (' + l.cells + ' tiles)'}
                      >
                        <LayoutThumb layout={l} isMobile={isMobile} size={56} />
                        <span className="layout-picker-item-label">{l.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SectionView({ section, idx, totalSections, sel, onSelect, onDelete, onDuplicate, onCopy, onMoveUp, onMoveDown, onChangeLayout, onApplyImageCategory, onSwapTiles, viewMode, products, uiLang }) {
  // Drag and Drop State pro Section. dragIdx ist der Tile Index der gerade
  // gezogen wird, dropIdx ist der Hover Tile Index.
  var [dragIdx, setDragIdx] = useState(null);
  var [dropIdx, setDropIdx] = useState(null);

  var handleTileDragStart = function(e, tileIdx) {
    if (!onSwapTiles) return;
    setDragIdx(tileIdx);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(tileIdx)); } catch (err) {}
  };
  var handleTileDragOver = function(e, tileIdx) {
    if (dragIdx === null || tileIdx === dragIdx) return;
    e.preventDefault();
    e.stopPropagation();
    if (dropIdx !== tileIdx) setDropIdx(tileIdx);
    e.dataTransfer.dropEffect = 'move';
  };
  var handleTileDrop = function(e, tileIdx) {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx !== null && tileIdx !== dragIdx && onSwapTiles) {
      onSwapTiles(dragIdx, tileIdx);
    }
    setDragIdx(null);
    setDropIdx(null);
  };
  var handleTileDragEnd = function() {
    setDragIdx(null);
    setDropIdx(null);
  };
  var layout = findLayout(section.layoutId);
  var isMobile = viewMode === 'mobile';
  var config = getGridConfig(layout, isMobile);

  // Bulk image-category dropdown: only meaningful when the section contains
  // image-type tiles. Shows the common category if all image-type tiles share
  // one, otherwise an empty value (mixed). Picking a category writes it to
  // every image-type tile once — individual edits afterwards stay independent.
  var IMG_TYPES = { image: 1, shoppable_image: 1, image_text: 1 };
  var imageTiles = (section.tiles || []).filter(function(t) { return IMG_TYPES[t.type]; });
  var commonCategory = '';
  if (imageTiles.length > 0) {
    var first = imageTiles[0].imageCategory || '';
    var allSame = imageTiles.every(function(t) { return (t.imageCategory || '') === first; });
    commonCategory = allSame ? first : '__mixed__';
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <span className="section-label">{t('canvas.section', uiLang)} {idx + 1}</span>
        <LayoutPicker value={section.layoutId} onChange={onChangeLayout} isMobile={isMobile} />
        {onApplyImageCategory && imageTiles.length > 1 && (
          <label
            className="section-bulk-cat"
            title={'Bildkategorie auf alle ' + imageTiles.length + ' Bildkacheln dieser Sektion anwenden. Einzelne Kacheln können danach unabhängig bearbeitet werden.'}
            onClick={function(e) { e.stopPropagation(); }}
          >
            <span style={{ fontSize: 10, color: '#64748b', marginRight: 4 }}>Bilder:</span>
            <select
              value={commonCategory === '__mixed__' ? '' : commonCategory}
              onChange={function(e) { onApplyImageCategory(e.target.value); }}
              style={{ fontSize: 10, padding: '2px 4px', border: '1px solid #e2e8f0', borderRadius: 3, background: commonCategory === '__mixed__' ? '#fef3c7' : '#fff', maxWidth: 130 }}
            >
              <option value="">{commonCategory === '__mixed__' ? '— gemischt —' : '— Kategorie —'}</option>
              {Object.keys(IMAGE_CATEGORIES).map(function(catId) {
                return <option key={catId} value={catId}>{IMAGE_CATEGORIES[catId].name}</option>;
              })}
            </select>
          </label>
        )}
        <div className="section-actions">
          {onMoveUp && <button className="btn-icon-sm" onClick={onMoveUp} title={t('section.moveUp', uiLang)}>&uarr;</button>}
          {onMoveDown && <button className="btn-icon-sm" onClick={onMoveDown} title={t('section.moveDown', uiLang)}>&darr;</button>}
          <button className="btn-icon-sm" onClick={onDuplicate} title={t('section.duplicate', uiLang)}>&#x29C9;</button>
          <button className="btn-icon-sm" onClick={onCopy} title={t('section.copy', uiLang)}>&#x2398;</button>
          {totalSections > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={onDelete} title={t('section.delete', uiLang)}>&times;</button>}
        </div>
      </div>
      <div className="section-tiles" style={config.gridStyle}>
        {section.tiles.map(function(t, i) {
          var isDragging = dragIdx === i;
          var isDropTarget = dropIdx === i && dragIdx !== null;
          var tileStyle = Object.assign({}, config.getTileStyle(i),
            isDragging ? { opacity: 0.4 } : {},
            isDropTarget ? { outline: '2px dashed #6366f1', outlineOffset: -2 } : {}
          );
          return (
            <div
              key={section.id + '-' + i}
              style={tileStyle}
              draggable={!!onSwapTiles}
              onDragStart={function(e) { handleTileDragStart(e, i); }}
              onDragOver={function(e) { handleTileDragOver(e, i); }}
              onDrop={function(e) { handleTileDrop(e, i); }}
              onDragEnd={handleTileDragEnd}
            >
              <TileView tile={t}
                selected={sel && sel.sid === section.id && sel.ti === i}
                onClick={function() { onSelect({ sid: section.id, ti: i }); }}
                viewMode={viewMode}
                products={products}
                uiLang={uiLang}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
