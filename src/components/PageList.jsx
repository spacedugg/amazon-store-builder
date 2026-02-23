import { useState } from 'react';
import { uid } from '../constants';

export default function PageList({ pages, curPage, onSelect, onAddPage, onRenamePage, onDeletePage, onReorderPage, savedStores, onLoadSaved, onDeleteSaved }) {
  var [editingId, setEditingId] = useState(null);
  var [editName, setEditName] = useState('');

  var startRename = function(pg) {
    setEditingId(pg.id);
    setEditName(pg.name);
  };

  var finishRename = function() {
    if (editingId && editName.trim()) {
      onRenamePage(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName('');
  };

  var movePage = function(pgId, dir) {
    var idx = pages.findIndex(function(p) { return p.id === pgId; });
    if (idx < 0) return;
    var newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= pages.length) return;
    onReorderPage(idx, newIdx);
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span>Pages</span>
        <button className="btn-icon" onClick={onAddPage} title="Add page">+</button>
      </div>
      <div className="page-list-body">
        {pages.length === 0 && (
          <div className="page-list-empty">Generate a store first</div>
        )}
        {pages.map(function(pg, idx) {
          var active = pg.id === curPage;
          return (
            <div key={pg.id}
              className={'page-item' + (active ? ' active' : '')}
              onClick={function() { onSelect(pg.id); }}>
              {editingId === pg.id ? (
                <input
                  className="page-rename-input"
                  value={editName}
                  onChange={function(e) { setEditName(e.target.value); }}
                  onBlur={finishRename}
                  onKeyDown={function(e) { if (e.key === 'Enter') finishRename(); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  onClick={function(e) { e.stopPropagation(); }}
                />
              ) : (
                <span className="page-name">{pg.name}</span>
              )}
              {active && editingId !== pg.id && (
                <div className="page-actions" onClick={function(e) { e.stopPropagation(); }}>
                  {idx > 0 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, -1); }} title="Move up">&uarr;</button>}
                  {idx < pages.length - 1 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, 1); }} title="Move down">&darr;</button>}
                  <button className="btn-icon-sm" onClick={function() { startRename(pg); }} title="Rename">R</button>
                  {pages.length > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={function() { onDeletePage(pg.id); }} title="Delete">&times;</button>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {savedStores && savedStores.length > 0 && (
        <>
          <div className="page-list-header" style={{ marginTop: 4 }}>
            <span>Saved Stores</span>
          </div>
          <div className="page-list-body">
            {savedStores.map(function(s) {
              return (
                <div key={s.id} className="saved-store-item">
                  <div className="saved-store-name" onClick={function() { onLoadSaved(s.id); }}>
                    {s.brandName}
                  </div>
                  <div className="saved-store-meta">
                    {s.pageCount}p &middot; {s.productCount} ASINs
                  </div>
                  <button className="btn-icon-sm btn-icon-danger" onClick={function() { onDeleteSaved(s.id); }} title="Delete">&times;</button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
