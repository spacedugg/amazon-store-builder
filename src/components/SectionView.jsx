import { LAYOUTS } from '../constants';
import { t } from '../i18n';
import TileView from './TileView';

// Compute grid style and per-tile positioning for complex layouts
function getGridConfig(layout, isMobile) {
  var g = layout.grid;
  var mg = layout.mobileGrid;

  // ─── MOBILE ───
  if (isMobile) {
    var mobileCols = layout.mobileCols || '1fr';

    // Mobile grids with tile spanning (wide tiles span 2 columns)
    if (mg === 'lg-2stack') {
      // Mobile #3: wide → 2 small (t0 spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 0) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === '2stack-lg') {
      // Mobile #6: 2 small → wide (t2 spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 2) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === 'lg-4grid') {
      // Mobile: wide → pairs of small (t0 spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 0) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === '4grid-lg') {
      // Mobile: pairs of small → wide (last tile spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 4) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === 'lg-w2s') {
      // Mobile #4: wide → 2 small → wide (t0, t3 span)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 0 || i === 3) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === 'w2s-lg') {
      // Mobile #10: wide → 2 small → wide (t0, t3 span)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 0 || i === 3) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === '4grid-2s') {
      // Mobile #12: 2 small → wide → 2 small → wide (t2, t5 span)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 2 || i === 5) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === 'w2s-4grid') {
      // Mobile #11: wide → 2 small → 2 small → 2 small (t0 spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 0) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }
    if (mg === '4grid-w2s') {
      // Mobile (mirror of #7): 2 small → 2 small → wide → 2 small (t4 spans)
      return {
        gridStyle: { gridTemplateColumns: '1fr 1fr' },
        getTileStyle: function(i) {
          if (i === 4) return { gridColumn: '1 / 3' };
          return {};
        },
      };
    }

    // Default mobile: simple columns, no spanning
    return {
      gridStyle: { gridTemplateColumns: mobileCols },
      getTileStyle: function() { return {}; },
    };
  }

  // ─── DESKTOP ───

  // lg-2stack: Large left (spans 2 rows) + 2 stacked right
  if (g === 'lg-2stack') {
    return {
      gridStyle: { gridTemplateColumns: '2fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '2' };
        return {};
      },
    };
  }

  // 2stack-lg: 2 stacked left + Large right (spans 2 rows)
  if (g === '2stack-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 2fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '1 / 3', gridColumn: '2' };
        return {};
      },
    };
  }

  // lg-4grid: Large left (spans 2 rows) + 2x2 grid right
  if (g === 'lg-4grid') {
    return {
      gridStyle: { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '1', gridColumn: '3' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '2', gridColumn: '3' };
        return {};
      },
    };
  }

  // 4grid-lg: 2x2 grid left + Large right (spans 2 rows)
  if (g === '4grid-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 2fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '1 / 3', gridColumn: '3' };
        return {};
      },
    };
  }

  // lg-w2s: Large left (spans 2 rows) + Wide top-right + 2 Small bottom-right
  // Tiles in mobile order: [large, small, small, wide]
  if (g === 'lg-w2s') {
    return {
      gridStyle: { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 3', gridColumn: '1' };
        if (i === 1) return { gridRow: '2', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '3' };
        if (i === 3) return { gridRow: '1', gridColumn: '2 / 4' };
        return {};
      },
    };
  }

  // w2s-lg: Wide top-left + 2 Small bottom-left + Large right (spans 2 rows)
  // Tiles in mobile order: [wide, small, small, large]
  if (g === 'w2s-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 2fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '2', gridColumn: '2' };
        if (i === 3) return { gridRow: '1 / 3', gridColumn: '3' };
        return {};
      },
    };
  }

  // 2x2wide: 2×2 grid of 4 wide tiles (full width)
  if (g === '2x2wide') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        return {};
      },
    };
  }

  // 2s-4grid: 2 stacked left + 2×2 grid right (6 tiles)
  // Tiles: [left-top, left-bottom, right-top-1, right-top-2, right-btm-1, right-btm-2]
  if (g === '2s-4grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '1', gridColumn: '2' };
        if (i === 3) return { gridRow: '1', gridColumn: '3' };
        if (i === 4) return { gridRow: '2', gridColumn: '2' };
        if (i === 5) return { gridRow: '2', gridColumn: '3' };
        return {};
      },
    };
  }

  // 4grid-2s: 2×2 grid left + 2 stacked right (6 tiles, mirror of 2s-4grid)
  // Tiles: [left-top-1, left-top-2, right-top, left-btm-1, left-btm-2, right-btm]
  if (g === '4grid-2s') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '1', gridColumn: '3' };
        if (i === 3) return { gridRow: '2', gridColumn: '1' };
        if (i === 4) return { gridRow: '2', gridColumn: '2' };
        if (i === 5) return { gridRow: '2', gridColumn: '3' };
        return {};
      },
    };
  }

  // w2s-4grid: (Wide + 2 Small) left + 2×2 grid right (7 tiles)
  // Tiles: [wide-top-left, sm-btm-left-1, sm-btm-left-2, sm-top-right-1, sm-top-right-2, sm-btm-right-1, sm-btm-right-2]
  if (g === 'w2s-4grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1 / 3' };
        if (i === 1) return { gridRow: '2', gridColumn: '1' };
        if (i === 2) return { gridRow: '2', gridColumn: '2' };
        if (i === 3) return { gridRow: '1', gridColumn: '3' };
        if (i === 4) return { gridRow: '1', gridColumn: '4' };
        if (i === 5) return { gridRow: '2', gridColumn: '3' };
        if (i === 6) return { gridRow: '2', gridColumn: '4' };
        return {};
      },
    };
  }

  // 4grid-w2s: 2×2 grid left + (Wide + 2 Small) right (7 tiles, mirror)
  // Tiles: [sm-top-left-1, sm-top-left-2, sm-btm-left-1, sm-btm-left-2, wide-top-right, sm-btm-right-1, sm-btm-right-2]
  if (g === '4grid-w2s') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '1', gridColumn: '3 / 5' };
        if (i === 5) return { gridRow: '2', gridColumn: '3' };
        if (i === 6) return { gridRow: '2', gridColumn: '4' };
        return {};
      },
    };
  }

  // 4x2grid: 4×2 grid of 8 small tiles (full width)
  if (g === '4x2grid') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' },
      getTileStyle: function(i) {
        var row = Math.floor(i / 4) + 1;
        var col = (i % 4) + 1;
        return { gridRow: String(row), gridColumn: String(col) };
      },
    };
  }

  // Default: simple column layout
  return {
    gridStyle: { gridTemplateColumns: layout.cols },
    getTileStyle: function() { return {}; },
  };
}

export default function SectionView({ section, idx, totalSections, sel, onSelect, onDelete, onMoveUp, onMoveDown, onChangeLayout, viewMode, products, uiLang }) {
  var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
  var isMobile = viewMode === 'mobile';
  var config = getGridConfig(layout, isMobile);

  return (
    <div className="section-container">
      <div className="section-header">
        <span className="section-label">{t('canvas.section', uiLang)} {idx + 1}</span>
        <select className="section-layout-select" value={section.layoutId}
          onChange={function(e) { onChangeLayout(e.target.value); }}
          onClick={function(e) { e.stopPropagation(); }}>
          {LAYOUTS.map(function(l) {
            return <option key={l.id} value={l.id}>{l.name} ({l.cells})</option>;
          })}
        </select>
        <div className="section-actions">
          {onMoveUp && <button className="btn-icon-sm" onClick={onMoveUp} title={t('section.moveUp', uiLang)}>&uarr;</button>}
          {onMoveDown && <button className="btn-icon-sm" onClick={onMoveDown} title={t('section.moveDown', uiLang)}>&darr;</button>}
          {totalSections > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={onDelete} title={t('section.delete', uiLang)}>&times;</button>}
        </div>
      </div>
      <div className="section-tiles" style={config.gridStyle}>
        {section.tiles.map(function(t, i) {
          return (
            <div key={i} style={config.getTileStyle(i)}>
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
