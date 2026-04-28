import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, emptyTileForLayout, LANGS, DOMAINS, validateStore, findLayout, LAYOUT_TILE_DIMS } from './constants';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave, importStoreByShareLink } from './storage';
import { importBriefingToStore } from './briefingImport';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import Topbar from './components/Topbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AsinPanel from './components/AsinPanel';
import NewStoreModal from './components/NewStoreModal';
import PriceCalculator from './components/PriceCalculator';
import ExportModal from './components/ExportModal';
import BriefingView from './components/BriefingView';
import AdminAnalyze from './components/AdminAnalyze';
import AdminScrapingTest from './components/AdminScrapingTest';
import AsinOverview from './components/AsinOverview';

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null, headerBannerColor: '', category: 'generic', googleDriveUrl: '' };

export default function App() {
  // Check if this is a share link — render full BriefingView
  if (window.location.pathname.indexOf('/share/') === 0) {
    return <BriefingView />;
  }

  // Admin pages
  if (window.location.pathname.indexOf('/admin/analyze') === 0) {
    return <AdminAnalyze />;
  }
  if (window.location.pathname.indexOf('/admin/scraping-test') === 0) {
    return <AdminScrapingTest />;
  }

  var uiLang = 'en';
  var [store, setStore] = useState(EMPTY_STORE);
  var [curPage, setCurPage] = useState('');
  var [sel, setSel] = useState(null);
  var [clipboardSection, setClipboardSection] = useState(null);
  var [showAsins, setShowAsins] = useState(false);
  var [showPrice, setShowPrice] = useState(false);
  var [showNewStoreModal, setShowNewStoreModal] = useState(false);
  var [savedStores, setSavedStores] = useState([]);
  var [warnings, setWarnings] = useState([]);
  var [viewMode, setViewMode] = useState('desktop');
  var [requestedAsins, setRequestedAsins] = useState([]);
  var [showSaved, setShowSaved] = useState(false);
  var [showExport, setShowExport] = useState(false);
  var [showAsinOverview, setShowAsinOverview] = useState(false);

  var [storeId, setStoreId] = useState(null);
  var [shareToken, setShareToken] = useState(null);
  var headerBannerInputRef = useRef(null);
  var folderInputRef = useRef(null);

  // ─── UNDO HISTORY ───
  var undoStackRef = useRef([]);
  var redoStackRef = useRef([]);
  var skipHistoryRef = useRef(false);
  var MAX_UNDO = 20;

  var pushUndo = useCallback(function(prevStore) {
    if (!prevStore || !prevStore.pages || prevStore.pages.length === 0) return;
    undoStackRef.current = undoStackRef.current.slice(-(MAX_UNDO - 1)).concat([JSON.stringify(prevStore)]);
    // Clear redo stack on new action
    redoStackRef.current = [];
  }, []);

  var handleUndo = useCallback(function() {
    if (undoStackRef.current.length === 0) return;
    var prev = undoStackRef.current.pop();
    // Push current state to redo stack
    setStore(function(current) {
      redoStackRef.current = redoStackRef.current.slice(-(MAX_UNDO - 1)).concat([JSON.stringify(current)]);
      return current;
    });
    skipHistoryRef.current = true;
    var parsed = JSON.parse(prev);
    setStore(parsed);
    setCurPage(parsed.pages && parsed.pages[0] ? parsed.pages[0].id : '');
    setSel(null);
  }, []);

  var handleRedo = useCallback(function() {
    if (redoStackRef.current.length === 0) return;
    var next = redoStackRef.current.pop();
    // Push current state to undo stack (without clearing redo)
    setStore(function(current) {
      undoStackRef.current = undoStackRef.current.slice(-(MAX_UNDO - 1)).concat([JSON.stringify(current)]);
      return current;
    });
    skipHistoryRef.current = true;
    var parsed = JSON.parse(next);
    setStore(parsed);
    setCurPage(parsed.pages && parsed.pages[0] ? parsed.pages[0].id : '');
    setSel(null);
  }, []);

  // Wrap setStore to track undo history
  var setStoreWithUndo = useCallback(function(updater) {
    setStore(function(prev) {
      var next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistoryRef.current && prev.pages.length > 0) {
        pushUndo(prev);
      }
      skipHistoryRef.current = false;
      return next;
    });
  }, [pushUndo]);

  // Keyboard shortcuts: Ctrl+Z for undo, Ctrl+Shift+Z / Ctrl+Y for redo
  useEffect(function() {
    var handler = function(e) {
      var tag = document.activeElement && document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' && e.shiftKey || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return function() { window.removeEventListener('keydown', handler); };
  }, [handleUndo, handleRedo]);

  // Load saved stores on mount
  useEffect(function() {
    loadSavedStores().then(function(stores) {
      setSavedStores(stores);
    });
  }, []);

  // Auto-save and validate whenever store changes
  useEffect(function() {
    if (store.pages.length > 0) {
      autoSave(store);
      setWarnings(validateStore(store));
    }
  }, [store]);

  var page = store.pages.find(function(p) { return p.id === curPage; }) || store.pages[0] || null;

  // ─── TILE UPDATE ───
  var updateTile = function(updated) {
    if (!sel) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sel.sid) return sec;
              return Object.assign({}, sec, {
                tiles: sec.tiles.map(function(t, i) { return i === sel.ti ? updated : t; }),
              });
            }),
          });
        }),
      });
    });
  };

  // ─── SECTION MANAGEMENT ───
  var addSection = function() {
    if (!page) return;
    var newSec = {
      id: uid(),
      layoutId: '1',
      tiles: [emptyTile()],
    };
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, { sections: pg.sections.concat([newSec]) });
        }),
      });
    });
  };

  var deleteSection = function(sectionId) {
    if (!page) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, {
            sections: pg.sections.filter(function(sec) { return sec.id !== sectionId; }),
          });
        }),
      });
    });
    if (sel && sel.sid === sectionId) setSel(null);
  };

  var duplicateSection = function(sectionId) {
    if (!page) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          var sections = pg.sections.slice();
          var idx = sections.findIndex(function(sec) { return sec.id === sectionId; });
          if (idx < 0) return pg;
          var original = sections[idx];
          var clone = Object.assign({}, original, {
            id: uid(),
            tiles: original.tiles.map(function(tile) {
              return Object.assign({}, tile, {
                dimensions: tile.dimensions ? Object.assign({}, tile.dimensions) : null,
                mobileDimensions: tile.mobileDimensions ? Object.assign({}, tile.mobileDimensions) : null,
                asins: tile.asins ? tile.asins.slice() : [],
              });
            }),
          });
          sections.splice(idx + 1, 0, clone);
          return Object.assign({}, pg, { sections: sections });
        }),
      });
    });
  };

  var copySection = function(sectionId) {
    if (!page) return;
    var sec = page.sections.find(function(s) { return s.id === sectionId; });
    if (sec) setClipboardSection(JSON.parse(JSON.stringify(sec)));
  };

  var pasteSection = function() {
    if (!page || !clipboardSection) return;
    var clone = JSON.parse(JSON.stringify(clipboardSection));
    clone.id = uid();
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, { sections: pg.sections.concat([clone]) });
        }),
      });
    });
  };

  var moveSection = function(sectionId, newIndex) {
    if (!page) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          var sections = pg.sections.slice();
          var idx = sections.findIndex(function(sec) { return sec.id === sectionId; });
          if (idx < 0) return pg;
          var item = sections.splice(idx, 1)[0];
          sections.splice(newIndex, 0, item);
          return Object.assign({}, pg, { sections: sections });
        }),
      });
    });
  };

  var changeLayout = function(sectionId, layoutId) {
    var layout = findLayout(layoutId);
    if (!layout) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sectionId) return sec;
              var tiles = sec.tiles.slice();
              while (tiles.length < layout.cells) tiles.push(emptyTileForLayout(layoutId, tiles.length));
              if (tiles.length > layout.cells) tiles = tiles.slice(0, layout.cells);
              // Re-enforce correct dimensions for existing tiles in the new layout
              var tileDims = LAYOUT_TILE_DIMS[layoutId];
              tiles = tiles.map(function(t, ti) {
                var dd = tileDims && tileDims[ti] ? tileDims[ti] : null;
                if (!dd) return t;
                var isVH = layout.type === 'vh';
                var isFullWidth = layout.type === 'fullwidth';
                if (!isVH && !isFullWidth) {
                  // Standard layout: force correct dimensions
                  return Object.assign({}, t, {
                    dimensions: { w: dd.w, h: dd.h },
                    mobileDimensions: { w: dd.w, h: dd.h },
                    syncDimensions: true,
                  });
                }
                return t;
              });
              return Object.assign({}, sec, { layoutId: layoutId, tiles: tiles });
            }),
          });
        }),
      });
    });
  };

  // Bulk-apply an image category to every image-type tile in a section. This
  // is a one-shot write: tiles can be edited individually afterwards without
  // re-syncing — it does NOT establish any binding between section and tile.
  var applySectionImageCategory = function(sectionId, category) {
    var IMG_TYPES = { image: 1, shoppable_image: 1, image_text: 1 };
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sectionId) return sec;
              return Object.assign({}, sec, {
                tiles: sec.tiles.map(function(t) {
                  if (!IMG_TYPES[t.type]) return t;
                  return Object.assign({}, t, { imageCategory: category });
                }),
              });
            }),
          });
        }),
      });
    });
  };

  // ─── PAGE MANAGEMENT ───
  var addPage = function(parentId) {
    var name = parentId ? 'New Sub-Page' : 'New Page';
    var idx = 1;
    var names = store.pages.map(function(p) { return p.name; });
    while (names.indexOf(name) >= 0) { idx++; name = (parentId ? 'New Sub-Page ' : 'New Page ') + idx; }
    var newPage = {
      id: uid(),
      name: name,
      sections: [{
        id: uid(), layoutId: '1',
        tiles: [emptyTile()],
      }],
    };
    if (parentId) newPage.parentId = parentId;
    setStoreWithUndo(function(s) {
      // Insert subpage right after parent and its existing children
      if (parentId) {
        var pages = s.pages.slice();
        var parentIdx = pages.findIndex(function(p) { return p.id === parentId; });
        if (parentIdx >= 0) {
          // Find the last child of this parent
          var insertIdx = parentIdx + 1;
          while (insertIdx < pages.length && pages[insertIdx].parentId === parentId) insertIdx++;
          pages.splice(insertIdx, 0, newPage);
          return Object.assign({}, s, { pages: pages });
        }
      }
      return Object.assign({}, s, { pages: s.pages.concat([newPage]) });
    });
    setCurPage(newPage.id);
    setSel(null);
  };

  var renamePage = function(pageId, newName) {
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== pageId) return pg;
          return Object.assign({}, pg, { name: newName });
        }),
      });
    });
  };

  var deletePage = function(pageId) {
    if (store.pages.length <= 1) return;
    // Also delete child pages
    var childIds = store.pages.filter(function(p) { return p.parentId === pageId; }).map(function(p) { return p.id; });
    setStoreWithUndo(function(s) {
      var newPages = s.pages.filter(function(pg) { return pg.id !== pageId && childIds.indexOf(pg.id) < 0; });
      return Object.assign({}, s, { pages: newPages });
    });
    if (curPage === pageId || childIds.indexOf(curPage) >= 0) {
      var fallback = store.pages.find(function(p) { return p.id !== pageId && childIds.indexOf(p.id) < 0; });
      setCurPage(fallback ? fallback.id : '');
    }
    setSel(null);
  };

  var reorderPage = function(fromIdx, toIdx) {
    setStoreWithUndo(function(s) {
      var pages = s.pages.slice();
      var item = pages.splice(fromIdx, 1)[0];
      pages.splice(toIdx, 0, item);
      return Object.assign({}, s, { pages: pages });
    });
  };

  // ─── SAVED STORES ───
  var handleSave = async function() {
    if (!store.pages.length) return;
    var result = await saveStore(store, storeId, shareToken);
    if (result) {
      if (result.id) setStoreId(result.id);
      if (result.shareToken) setShareToken(result.shareToken);
      var stores = await loadSavedStores();
      setSavedStores(stores);
      alert('Store saved! (' + (store.brandName || 'Untitled') + ')');
    }
  };

  var handleLoadSaved = async function(id) {
    var result = await loadStore(id);
    if (result && result.data) {
      setStore(result.data);
      setStoreId(id);
      if (result.shareToken) setShareToken(result.shareToken);
      setCurPage(result.data.pages[0] ? result.data.pages[0].id : '');
      setSel(null);
    }
  };

  var handleLoadAutoSave = function() {
    var data = loadAutoSave();
    if (data && data.pages && data.pages.length > 0) {
      setStore(data);
      setCurPage(data.pages[0] ? data.pages[0].id : '');
      setSel(null);
    }
  };

  var handleDeleteSaved = async function(id) {
    await deleteSavedStore(id);
    var stores = await loadSavedStores();
    setSavedStores(stores);
  };

  // ─── IMPORT STORE BY SHARE LINK ───
  var handleImportStore = async function(url) {
    try {
      var result = await importStoreByShareLink(url);
      if (result.error) return result.error;
      // Load the imported store into the editor
      setStore(result.data);
      setStoreId(result.id);
      setShareToken(result.shareToken || null);
      setCurPage(result.data.pages && result.data.pages[0] ? result.data.pages[0].id : '');
      setSel(null);
      // Refresh saved stores list
      var stores = await loadSavedStores();
      setSavedStores(stores);
      return null; // no error
    } catch (e) {
      return e.message || 'Import failed';
    }
  };

  // ─── NEW STORE ───
  // Klick auf "New Store" öffnet Modal mit Briefing JSON Import.
  // Modal bietet außerdem die Option, einen leeren Store zu starten.
  var handleNewStore = function() {
    if (store.pages.length > 0 && !confirm('Neuen Store anlegen? Ungespeicherte Änderungen gehen verloren.')) return;
    setShowNewStoreModal(true);
  };

  var handleCreateEmpty = function() {
    var firstPageId = uid();
    var initialStore = Object.assign({}, EMPTY_STORE, {
      pages: [{
        id: firstPageId,
        name: 'Home',
        sections: [{
          id: uid(), layoutId: '1',
          tiles: [emptyTile()],
        }],
      }],
    });
    setStore(initialStore);
    setCurPage(firstPageId);
    setSel(null);
    setWarnings([]);
    setRequestedAsins([]);
    setStoreId(null);
    setShareToken(null);
    setShowNewStoreModal(false);
  };

  var handleImportBriefing = function(briefingData) {
    try {
      var imported = importBriefingToStore(briefingData);
      setStore(imported);
      setCurPage(imported.pages[0] ? imported.pages[0].id : '');
      setSel(null);
      setWarnings([]);
      setRequestedAsins(imported.asins.map(function(a) { return a.asin; }));
      setStoreId(null);
      setShareToken(null);
      setShowNewStoreModal(false);
    } catch (e) {
      alert('Import fehlgeschlagen, ' + e.message);
    }
  };

  // ─── VIEW MODE ───
  var handleToggleView = function(mode) {
    setViewMode(mode);
  };

  // ─── FOLDER IMAGE UPLOAD (match files to tiles by canonical filename) ───
  var handleFolderImageUpload = function(files) {
    if (!files || files.length === 0 || !store.pages || store.pages.length === 0) return;
    // Build filename map
    var fnMap = {};
    var PRODUCT_TYPES = ['product_grid', 'product_selector'];
    store.pages.forEach(function(pg) {
      (pg.sections || []).forEach(function(sec, si) {
        (sec.tiles || []).forEach(function(tile, ti) {
          if (PRODUCT_TYPES.indexOf(tile.type) >= 0 || tile.type === 'text') return;
          var safeName = (pg.name || 'page');
          if (safeName.normalize) safeName = safeName.normalize('NFC');
          safeName = safeName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
          var base = safeName + '_S' + (si + 1) + '_T' + (ti + 1);
          if (tile.syncDimensions) {
            fnMap[(base + '.jpg').toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'sync' };
          } else {
            fnMap[(base + '_desktop.jpg').toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'desktop' };
            fnMap[(base + '_mobile.jpg').toLowerCase()] = { pageId: pg.id, secId: sec.id, ti: ti, variant: 'mobile' };
          }
        });
      });
    });
    // Match files and read as data URLs
    var imageExts = /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i;
    var matched = {}; // key: "pageId|secId|ti|variant" → file
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!imageExts.test(file.name)) continue;
      var rawName = file.name;
      if (rawName.normalize) rawName = rawName.normalize('NFC');
      var name = rawName.toLowerCase();
      var nameNoExt = name.replace(/\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i, '');
      var entry = null;
      if (fnMap[name]) entry = fnMap[name];
      else if (fnMap[nameNoExt + '.jpg']) entry = fnMap[nameNoExt + '.jpg'];
      else {
        var keys = Object.keys(fnMap);
        for (var k = 0; k < keys.length; k++) {
          var keyBase = keys[k].replace('.jpg', '');
          if (nameNoExt === keyBase || nameNoExt.indexOf(keyBase) >= 0 || keyBase.indexOf(nameNoExt) >= 0) {
            entry = fnMap[keys[k]];
            break;
          }
        }
      }
      if (entry) {
        var mkey = entry.pageId + '|' + entry.secId + '|' + entry.ti + '|' + entry.variant;
        if (!matched[mkey]) matched[mkey] = { entry: entry, file: file };
      }
    }
    // Read matched files as data URLs and update tiles
    var matchKeys = Object.keys(matched);
    if (matchKeys.length === 0) { alert('No matching images found. Expected filenames like: PageName_S1_T1_desktop.jpg'); return; }
    var processed = 0;
    matchKeys.forEach(function(mkey) {
      var item = matched[mkey];
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        setStore(function(s) {
          return Object.assign({}, s, {
            pages: s.pages.map(function(pg) {
              if (pg.id !== item.entry.pageId) return pg;
              return Object.assign({}, pg, {
                sections: pg.sections.map(function(sec) {
                  if (sec.id !== item.entry.secId) return sec;
                  return Object.assign({}, sec, {
                    tiles: sec.tiles.map(function(t, ti) {
                      if (ti !== item.entry.ti) return t;
                      var updates = {};
                      if (item.entry.variant === 'sync' || item.entry.variant === 'desktop') updates.uploadedImage = dataUrl;
                      if (item.entry.variant === 'sync' || item.entry.variant === 'mobile') updates.uploadedImageMobile = dataUrl;
                      return Object.assign({}, t, updates);
                    }),
                  });
                }),
              });
            }),
          });
        });
        processed++;
        if (processed === matchKeys.length) {
          alert(matchKeys.length + ' images matched and loaded.');
        }
      };
      reader.readAsDataURL(item.file);
    });
  };

  // ─── REMOVE ALL UPLOADED IMAGES ───
  var handleRemoveAllImages = function() {
    if (!confirm('Remove all uploaded images from all tiles?')) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              return Object.assign({}, sec, {
                tiles: sec.tiles.map(function(t) {
                  return Object.assign({}, t, { uploadedImage: null, uploadedImageMobile: null });
                }),
              });
            }),
          });
        }),
        headerBanner: null,
        headerBannerMobile: null,
      });
    });
  };

  // ─── HEADER BANNER ───
  var handleHeaderBannerUpload = function() {
    if (!headerBannerInputRef.current) return;
    headerBannerInputRef.current.click();
  };

  var handleHeaderBannerFile = function(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var data = ev.target.result;
      if (viewMode === 'mobile') {
        setStoreWithUndo(function(s) { return Object.assign({}, s, { headerBannerMobile: data }); });
      } else {
        setStoreWithUndo(function(s) { return Object.assign({}, s, { headerBanner: data }); });
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // ─── EXPORT (generate share link — always reuses same link per store) ───
  var handleExport = async function() {
    if (!store.pages.length) return;
    try {
      var hadToken = !!shareToken;
      // Save first (or re-save) to ensure we have a share token
      var result = await saveStore(store, storeId, shareToken);
      if (result && result.shareToken) {
        if (result.id) setStoreId(result.id);
        setShareToken(result.shareToken);
        var shareUrl = window.location.origin + '/share/' + result.shareToken;
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(shareUrl);
          if (hadToken) {
            alert('Store saved & link copied to clipboard (same link as before).\n\n' + shareUrl);
          } else {
            alert('Designer briefing link created & copied to clipboard!\n\n' + shareUrl);
          }
        } catch (clipErr) {
          prompt('Copy this link and share it with your designer:', shareUrl);
        }
        // Also refresh saved stores list
        var stores = await loadSavedStores();
        setSavedStores(stores);
      } else {
        alert('Export failed: could not generate share link.');
      }
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
  };

  // ─── EXPORT DOCX (keep as secondary option) ───
  var handleExportDocx = async function(briefingLang) {
    try {
      var blob = await generateBriefingDocx(store, briefingLang || 'en');
      var filename = (store.brandName || 'store').replace(/[^a-zA-Z0-9]/g, '_') + '_briefing.docx';
      downloadBlob(blob, filename);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
    setShowExport(false);
  };

  // ─── SELECTED TILE ───
  var selTile = null;
  var selLayoutType = null;
  var selHeroBanner = false;
  if (sel && sel.sid === '__heroBanner__' && page) {
    selHeroBanner = true;
  } else if (sel && page) {
    var sec = page.sections.find(function(s) { return s.id === sel.sid; });
    selTile = sec ? (sec.tiles[sel.ti] || null) : null;
    // Bug 2 fix: invalidate stale selection when target tile no longer exists
    if (sel.ti !== undefined && sec && !selTile) {
      setTimeout(function() { setSel({ sid: sel.sid }); }, 0);
    }
    if (sec) {
      var selLayout = findLayout(sec.layoutId);
      selLayoutType = selLayout ? selLayout.type : null;
    }
  }

  // ─── HERO BANNER UPDATE ───
  var updateHeroBanner = function(key, value) {
    if (!page) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, { [key]: value });
        }),
      });
    });
  };

  // Check if an auto-save exists for the "Continue last session" button
  var hasAutoSave = false;
  try {
    var autoData = loadAutoSave();
    hasAutoSave = autoData && autoData.pages && autoData.pages.length > 0;
  } catch(e) { /* ignore */ }

  return (
    <div className="app-root">
      <Topbar
        store={store}
        onExport={handleExport}
        onSave={handleSave}
        viewMode={viewMode}
        onToggleView={handleToggleView}
        onNewStore={handleNewStore}
        onUndo={handleUndo}
        canUndo={undoStackRef.current.length > 0}
        onRedo={handleRedo}
        canRedo={redoStackRef.current.length > 0}
        onShowPrice={function() { setShowPrice(true); }}
        onShowAsinOverview={store.pages.length > 0 ? function() { setShowAsinOverview(true); } : null}
        onFolderImageUpload={handleFolderImageUpload}
        onRemoveAllImages={handleRemoveAllImages}
        folderInputRef={folderInputRef}
      />

      <div className="app-body">
        <PageList
          pages={store.pages}
          curPage={page ? page.id : ''}
          onSelect={function(id) { setCurPage(id); setSel(null); }}
          onAddPage={addPage}
          onAddSubPage={function(parentId) { addPage(parentId); }}
          onRenamePage={renamePage}
          onDeletePage={deletePage}
          onReorderPage={reorderPage}
          savedStores={savedStores}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={handleDeleteSaved}
          onImportStore={handleImportStore}
          uiLang={uiLang}
          showSaved={showSaved}
          onToggleSaved={function() { setShowSaved(!showSaved); }}
        />

        <Canvas
          store={store}
          page={page}
          curPage={page ? page.id : ''}
          onSelectPage={function(id) { setCurPage(id); setSel(null); }}
          sel={sel}
          onSelect={setSel}
          onAddSection={addSection}
          onDeleteSection={deleteSection}
          onDuplicateSection={duplicateSection}
          onCopySection={copySection}
          onPasteSection={clipboardSection ? pasteSection : null}
          onMoveSection={moveSection}
          onChangeLayout={changeLayout}
          onApplySectionImageCategory={applySectionImageCategory}
          viewMode={viewMode}
          onHeaderBannerUpload={handleHeaderBannerUpload}
          headerBannerColor={store.headerBannerColor || ''}
          onHeaderBannerColorChange={function(color) { setStoreWithUndo(function(s) { return Object.assign({}, s, { headerBannerColor: color }); }); }}
          products={store.products}
          uiLang={uiLang}
          hasAutoSave={hasAutoSave}
          onLoadAutoSave={handleLoadAutoSave}
          onGenerate={handleNewStore}
        />

        <PropertiesPanel
          key={sel ? (sel.sid + ':' + (sel.ti != null ? sel.ti : '')) : 'none'}
          tile={selTile}
          onChange={updateTile}
          products={store.products}
          viewMode={viewMode}
          uiLang={uiLang}
          layoutType={selLayoutType}
          heroBanner={selHeroBanner ? page : null}
          onHeroBannerChange={selHeroBanner ? updateHeroBanner : null}
        />
      </div>

      {/* Validation warnings */}
      {warnings.length > 0 && store.pages.length > 0 && (
        <div className="warnings-bar">
          {warnings.filter(function(w) { return w.level === 'error' || w.level === 'warning'; }).slice(0, 3).map(function(w, i) {
            return <span key={i} className={'warning-item ' + w.level}>{w.message}</span>;
          })}
        </div>
      )}

      {showNewStoreModal && (
        <NewStoreModal
          onClose={function() { setShowNewStoreModal(false); }}
          onImport={handleImportBriefing}
          onCreateEmpty={handleCreateEmpty}
        />
      )}

      {showAsins && (
        <AsinPanel
          asins={store.asins || []}
          pages={store.pages}
          products={store.products}
          requestedAsins={requestedAsins}
          onClose={function() { setShowAsins(false); }}
          uiLang={uiLang}
        />
      )}

      {showPrice && (
        <PriceCalculator
          store={store}
          shareToken={shareToken}
          onClose={function() { setShowPrice(false); }}
          uiLang={uiLang}
        />
      )}

      {showAsinOverview && (
        <AsinOverview
          store={store}
          products={store.products}
          onClose={function() { setShowAsinOverview(false); }}
          onMoveAsin={function(asin, targetPageId) {
            // Add the ASIN to the target page's last product_grid section
            // or create a new product_grid section if none exists
            setStoreWithUndo(function(s) {
              return Object.assign({}, s, {
                pages: s.pages.map(function(pg) {
                  if (pg.id !== targetPageId) return pg;
                  var sections = (pg.sections || []).slice();
                  // Find existing product_grid section
                  var gridIdx = -1;
                  for (var i = sections.length - 1; i >= 0; i--) {
                    var hasPG = sections[i].tiles.some(function(t) { return t.type === 'product_grid'; });
                    if (hasPG) { gridIdx = i; break; }
                  }
                  if (gridIdx >= 0) {
                    // Add ASIN to existing product_grid tile
                    sections[gridIdx] = Object.assign({}, sections[gridIdx], {
                      tiles: sections[gridIdx].tiles.map(function(t) {
                        if (t.type !== 'product_grid') return t;
                        var newAsins = (t.asins || []).slice();
                        if (newAsins.indexOf(asin) < 0) newAsins.push(asin);
                        return Object.assign({}, t, { asins: newAsins });
                      }),
                    });
                  } else {
                    // Create new product_grid section with the ASIN
                    sections.push({ id: uid(), layoutId: '1', tiles: [Object.assign(emptyTile(), { type: 'product_grid', asins: [asin] })] });
                  }
                  return Object.assign({}, pg, { sections: sections });
                }),
              });
            });
          }}
        />
      )}

      {showExport && (
        <ExportModal
          onClose={function() { setShowExport(false); }}
          onExport={handleExportDocx}
          uiLang={uiLang}
        />
      )}

      {/* Hidden file input for header banner upload */}
      <input ref={headerBannerInputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={handleHeaderBannerFile} />
    </div>
  );
}
