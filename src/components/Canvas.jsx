import SectionView from './SectionView';
import { LAYOUTS, uid, emptyTile } from '../constants';

export default function Canvas({ store, page, curPage, onSelectPage, sel, onSelect, onAddSection, onDeleteSection, onMoveSection, onChangeLayout }) {
  if (!page) {
    return (
      <div className="canvas">
        <div className="canvas-empty">
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#x1F3EA;</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Amazon Brand Store Builder</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Click <b>Generate</b> to upload ASINs and generate a store concept</div>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas">
      <div className="canvas-inner">
        {/* Store header bar */}
        <div className="canvas-store-header">
          <div className="store-brand-name">{store.brandName || 'Brand Store'}</div>
          <div className="store-nav-tabs">
            {store.pages.map(function(pg) {
              return (
                <span key={pg.id}
                  className={'store-nav-tab' + (pg.id === curPage ? ' active' : '')}
                  onClick={function() { onSelectPage(pg.id); }}>
                  {pg.name}
                </span>
              );
            })}
          </div>
        </div>

        {/* Sections */}
        {page.sections.map(function(sec, si) {
          return (
            <SectionView
              key={sec.id}
              section={sec}
              idx={si}
              totalSections={page.sections.length}
              sel={sel}
              onSelect={onSelect}
              onDelete={function() { onDeleteSection(sec.id); }}
              onMoveUp={si > 0 ? function() { onMoveSection(sec.id, si - 1); } : null}
              onMoveDown={si < page.sections.length - 1 ? function() { onMoveSection(sec.id, si + 1); } : null}
              onChangeLayout={function(layoutId) { onChangeLayout(sec.id, layoutId); }}
            />
          );
        })}

        {/* Add section button */}
        <div className="add-section-bar">
          <button className="btn add-section-btn" onClick={onAddSection}>
            + Add Section
          </button>
        </div>
      </div>
    </div>
  );
}
