import { LAYOUTS } from '../constants';
import TileView from './TileView';

export default function SectionView({ section, idx, totalSections, sel, onSelect, onDelete, onMoveUp, onMoveDown, onChangeLayout }) {
  var layout = LAYOUTS.find(function(l) { return l.id === section.layoutId; }) || LAYOUTS[0];

  return (
    <div className="section-container">
      <div className="section-header">
        <span className="section-label">Section {idx + 1}</span>
        <select
          className="section-layout-select"
          value={section.layoutId}
          onChange={function(e) { onChangeLayout(e.target.value); }}
          onClick={function(e) { e.stopPropagation(); }}
        >
          {LAYOUTS.map(function(l) {
            return <option key={l.id} value={l.id}>{l.name} ({l.id})</option>;
          })}
        </select>
        <div className="section-actions">
          {onMoveUp && <button className="btn-icon-sm" onClick={onMoveUp} title="Move up">&uarr;</button>}
          {onMoveDown && <button className="btn-icon-sm" onClick={onMoveDown} title="Move down">&darr;</button>}
          {totalSections > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={onDelete} title="Delete section">&times;</button>}
        </div>
      </div>
      <div className="section-tiles" style={{ gridTemplateColumns: layout.cols }}>
        {section.tiles.map(function(t, i) {
          return (
            <TileView
              key={i}
              tile={t}
              selected={sel && sel.sid === section.id && sel.ti === i}
              onClick={function() { onSelect({ sid: section.id, ti: i }); }}
            />
          );
        })}
      </div>
    </div>
  );
}
