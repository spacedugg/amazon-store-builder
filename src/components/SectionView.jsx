import { LAYOUTS } from '../constants';
import TileView from './TileView';

export default function SectionView({ section, idx, totalSections, sel, onSelect, onDelete, onMoveUp, onMoveDown, onChangeLayout, viewMode, products }) {
  var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];
  var isMobile = viewMode === 'mobile';
  var cols = isMobile ? (layout.mobileCols || '1fr') : layout.cols;

  // Stacked layout CSS grid
  var gridStyle = { gridTemplateColumns: cols };
  if (layout.stacked && !isMobile) {
    gridStyle.gridTemplateRows = '1fr 1fr';
  }

  return (
    <div className="section-container">
      <div className="section-header">
        <span className="section-label">Section {idx + 1}</span>
        <select className="section-layout-select" value={section.layoutId}
          onChange={function(e) { onChangeLayout(e.target.value); }}
          onClick={function(e) { e.stopPropagation(); }}>
          {LAYOUTS.map(function(l) {
            return <option key={l.id} value={l.id}>{l.name}</option>;
          })}
        </select>
        <div className="section-actions">
          {onMoveUp && <button className="btn-icon-sm" onClick={onMoveUp} title="Move up">&uarr;</button>}
          {onMoveDown && <button className="btn-icon-sm" onClick={onMoveDown} title="Move down">&darr;</button>}
          {totalSections > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={onDelete} title="Delete section">&times;</button>}
        </div>
      </div>
      <div className={'section-tiles' + (layout.stacked && !isMobile ? ' section-tiles-stacked-' + layout.stacked : '')} style={gridStyle}>
        {section.tiles.map(function(t, i) {
          var tileStyle = {};
          // Stacked layout: first tile spans 2 rows
          if (layout.stacked && !isMobile) {
            if (layout.stacked === 'right' && i === 0) tileStyle.gridRow = '1 / 3';
            if (layout.stacked === 'left' && i === 2) tileStyle.gridRow = '1 / 3';
            if (layout.stacked === 'left' && i === 2) tileStyle.gridColumn = '2';
          }
          return (
            <div key={i} style={tileStyle}>
              <TileView tile={t}
                selected={sel && sel.sid === section.id && sel.ti === i}
                onClick={function() { onSelect({ sid: section.id, ti: i }); }}
                viewMode={viewMode}
                products={products}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
