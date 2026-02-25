import { useState } from 'react';
import { t } from '../i18n';

export default function PageList({ pages, curPage, onSelect, onAddPage, onAddSubPage, onRenamePage, onDeletePage, onReorderPage, savedStores, onLoadSaved, onDeleteSaved, uiLang, showSaved, onToggleSaved }) {
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

  // Build tree: top-level pages and their children
  var topLevel = pages.filter(function(p) { return !p.parentId; });

  var getChildren = function(parentId) {
    return pages.filter(function(p) { return p.parentId === parentId; });
  };

  var renderPage = function(pg, idx, isChild) {
    var active = pg.id === curPage;
    var children = isChild ? [] : getChildren(pg.id);
    var hasChildren = children.length > 0;

    return (
      <div key={pg.id}>
        <div
          className={'page-item' + (active ? ' active' : '') + (isChild ? ' page-item-child' : '')}
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
            <span className="page-name">
              {isChild ? '\u2514 ' : ''}{pg.name}
            </span>
          )}
          {active && editingId !== pg.id && (
            <div className="page-actions" onClick={function(e) { e.stopPropagation(); }}>
              {idx > 0 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, -1); }} title={t('pages.moveUp', uiLang)}>&uarr;</button>}
              {idx < pages.length - 1 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, 1); }} title={t('pages.moveDown', uiLang)}>&darr;</button>}
              <button className="btn-icon-sm" onClick={function() { startRename(pg); }} title={t('pages.rename', uiLang)}>R</button>
              {!isChild && <button className="btn-icon-sm" onClick={function() { onAddSubPage(pg.id); }} title={t('pages.addSubPage', uiLang)}>+</button>}
              {pages.length > 1 && <button className="btn-icon-sm btn-icon-danger" onClick={function() { onDeletePage(pg.id); }} title={t('pages.delete', uiLang)}>&times;</button>}
            </div>
          )}
        </div>
        {hasChildren && children.map(function(child, ci) {
          return renderPage(child, ci, true);
        })}
      </div>
    );
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span>{t('pages.title', uiLang)}</span>
        <button className="btn-icon" onClick={function() { onAddPage(); }} title={t('pages.addPage', uiLang)}>+</button>
      </div>
      <div className="page-list-body">
        {pages.length === 0 && (
          <div className="page-list-empty">{t('pages.generateFirst', uiLang)}</div>
        )}
        {topLevel.map(function(pg, idx) {
          return renderPage(pg, idx, false);
        })}
      </div>

      {/* Saved stores section: collapsed by default, toggle to show */}
      {savedStores && savedStores.length > 0 && (
        <>
          <div className="page-list-header saved-header" style={{ marginTop: 4, cursor: 'pointer' }} onClick={onToggleSaved}>
            <span>{t('pages.savedStores', uiLang)}</span>
            <span className="btn-icon-sm" style={{ fontSize: 10, fontWeight: 700 }}>{showSaved ? '\u25B2' : '\u25BC'}</span>
          </div>
          {showSaved && (
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
                    <button className="btn-icon-sm btn-icon-danger" onClick={function() { onDeleteSaved(s.id); }} title={t('pages.delete', uiLang)}>&times;</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
