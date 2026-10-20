import { useState } from 'react';
import { t } from '../i18n';


export default function PageList({ pages, curPage, onSelect, onAddPage, onAddSubPage, onRenamePage, onDeletePage, onReorderPage, onDuplicatePage, onMovePage, uiLang }) {
  var [editingId, setEditingId] = useState(null);
  var [editName, setEditName] = useState('');
  // Drag and Drop State
  var [dragId, setDragId] = useState(null);
  var [dropOver, setDropOver] = useState(null); // { id, pos: 'above'|'below'|'into' }

  var handleImport = function() {
    if (!importUrl.trim() || importBusy) return;
    setImportBusy(true);
    setImportError('');
    onImportStore(importUrl).then(function(err) {
      setImportBusy(false);
      if (err) {
        setImportError(err);
      } else {
        setImportUrl('');
        setShowImport(false);
      }
    });
  };

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

  // Drag and Drop Handler
  var handleDragStart = function(e, pgId) {
    setDragId(pgId);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', pgId); } catch (err) {}
  };
  var handleDragOver = function(e, pgId, isChild) {
    e.preventDefault();
    e.stopPropagation();
    if (!dragId || pgId === dragId) return;
    var rect = e.currentTarget.getBoundingClientRect();
    var y = e.clientY - rect.top;
    var h = rect.height;
    var pos;
    if (y < h * 0.3) pos = 'above';
    else if (y > h * 0.7) pos = 'below';
    else pos = isChild ? 'below' : 'into'; // Sub Pages können kein Sub-Sub bekommen, drum 'below' fallback
    if (!dropOver || dropOver.id !== pgId || dropOver.pos !== pos) {
      setDropOver({ id: pgId, pos: pos });
    }
    e.dataTransfer.dropEffect = 'move';
  };
  var handleDrop = function(e, pgId) {
    e.preventDefault();
    e.stopPropagation();
    if (dragId && dropOver && dragId !== pgId && onMovePage) {
      onMovePage(dragId, dropOver.id, dropOver.pos);
    }
    setDragId(null);
    setDropOver(null);
  };
  var handleDragEnd = function() {
    setDragId(null);
    setDropOver(null);
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
    var isDragging = dragId === pg.id;
    var dropMark = dropOver && dropOver.id === pg.id ? dropOver.pos : null;

    return (
      <div key={pg.id}>
        <div
          draggable={editingId !== pg.id}
          onDragStart={function(e) { handleDragStart(e, pg.id); }}
          onDragOver={function(e) { handleDragOver(e, pg.id, isChild); }}
          onDrop={function(e) { handleDrop(e, pg.id); }}
          onDragEnd={handleDragEnd}
          onDragLeave={function(e) { /* keep dropOver, gets overridden by next dragOver */ }}
          className={'page-item' + (active ? ' active' : '') + (isChild ? ' page-item-child' : '') + (isDragging ? ' page-item-dragging' : '') + (dropMark ? ' page-item-drop-' + dropMark : '')}
          onClick={function() { onSelect(pg.id); }}
          style={Object.assign(
            isDragging ? { opacity: 0.4 } : {},
            dropMark === 'above' ? { boxShadow: 'inset 0 2px 0 #6366f1' } : {},
            dropMark === 'below' ? { boxShadow: 'inset 0 -2px 0 #6366f1' } : {},
            dropMark === 'into' ? { background: '#eef2ff', outline: '1px solid #6366f1' } : {}
          )}>
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
              {isChild ? '└ ' : ''}{pg.name}
            </span>
          )}
          {active && editingId !== pg.id && (
            <div className="page-actions" onClick={function(e) { e.stopPropagation(); }}>
              {idx > 0 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, -1); }} title={t('pages.moveUp', uiLang)}>&uarr;</button>}
              {idx < pages.length - 1 && <button className="btn-icon-sm" onClick={function() { movePage(pg.id, 1); }} title={t('pages.moveDown', uiLang)}>&darr;</button>}
              <button className="btn-icon-sm" onClick={function() { startRename(pg); }} title={t('pages.rename', uiLang)}>R</button>
              {!isChild && <button className="btn-icon-sm" onClick={function() { onAddSubPage(pg.id); }} title={t('pages.addSubPage', uiLang)}>+</button>}
              {onDuplicatePage && <button className="btn-icon-sm" onClick={function() { onDuplicatePage(pg.id); }} title="Page duplizieren">⎘</button>}
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

    </div>
  );
}
