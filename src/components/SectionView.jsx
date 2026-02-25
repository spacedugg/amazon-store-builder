import { LAYOUTS } from '../constants';
import { t } from '../i18n';
import TileView from './TileView';

// Compute grid style and per-tile positioning for complex layouts
function getGridConfig(layout, isMobile) {
  if (isMobile) {
    return {
      gridStyle: { gridTemplateColumns: layout.mobileCols || '1fr' },
      getTileStyle: function() { return {}; },
    };
  }

  var g = layout.grid;

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
  // T1 = large left, T2-T5 = 2x2 grid right
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

  // lg-6grid: Large left (spans 3 rows) + 2x3 grid right
  // T1 = large left, T2-T7 = 2x3 grid right
  if (g === 'lg-6grid') {
    return {
      gridStyle: { gridTemplateColumns: '2fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1 / 4', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '1', gridColumn: '3' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '2', gridColumn: '3' };
        if (i === 5) return { gridRow: '3', gridColumn: '2' };
        if (i === 6) return { gridRow: '3', gridColumn: '3' };
        return {};
      },
    };
  }

  // 6grid-lg: 2x3 grid left + Large right (spans 3 rows)
  if (g === '6grid-lg') {
    return {
      gridStyle: { gridTemplateColumns: '1fr 1fr 2fr', gridTemplateRows: '1fr 1fr 1fr' },
      getTileStyle: function(i) {
        if (i === 0) return { gridRow: '1', gridColumn: '1' };
        if (i === 1) return { gridRow: '1', gridColumn: '2' };
        if (i === 2) return { gridRow: '2', gridColumn: '1' };
        if (i === 3) return { gridRow: '2', gridColumn: '2' };
        if (i === 4) return { gridRow: '3', gridColumn: '1' };
        if (i === 5) return { gridRow: '3', gridColumn: '2' };
        if (i === 6) return { gridRow: '1 / 4', gridColumn: '3' };
        return {};
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
