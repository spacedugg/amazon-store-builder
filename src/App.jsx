import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, emptyTileForLayout, LAYOUTS, LANGS, DOMAINS, validateStore, PRICING, countStoreAssets, STORE_TEMPLATES, findLayout } from './constants';
import { scrapeAsins } from './api';
import { generateStore, aiRefineStore, applyOperations } from './storeBuilder';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave, loadStoreByShareToken, importStoreByShareLink } from './storage';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import Topbar from './components/Topbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AsinPanel from './components/AsinPanel';
import GenerateModal from './components/GenerateModal';
import ProgressModal from './components/ProgressModal';
import AIChat from './components/AIChat';
import PriceCalculator from './components/PriceCalculator';
import ExportModal from './components/ExportModal';
import BriefingView from './components/BriefingView';
import KnowledgeBaseAdmin from './components/KnowledgeBaseAdmin';

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null, headerBannerColor: '', complexity: 2, category: 'generic', googleDriveUrl: '' };

export default function App() {
  // Check if this is a share link — render full BriefingView
  if (window.location.pathname.indexOf('/share/') === 0) {
    return <BriefingView />;
  }

  var uiLang = 'en';
  var [store, setStore] = useState(EMPTY_STORE);
  var [curPage, setCurPage] = useState('');
  var [sel, setSel] = useState(null);
  var [clipboardSection, setClipboardSection] = useState(null);
  var [showGen, setShowGen] = useState(false);
  var [showAsins, setShowAsins] = useState(false);
  var [showPrice, setShowPrice] = useState(false);
  var [generating, setGenerating] = useState(false);
  var [genLog, setGenLog] = useState([]);
  var [genDone, setGenDone] = useState(false);
  var [chatBusy, setChatBusy] = useState(false);
  var [chatResponse, setChatResponse] = useState('');
  var [savedStores, setSavedStores] = useState([]);
  var [warnings, setWarnings] = useState([]);
  var [viewMode, setViewMode] = useState('desktop');
  var [requestedAsins, setRequestedAsins] = useState([]);
  var [showSaved, setShowSaved] = useState(false);
  var [showExport, setShowExport] = useState(false);
  var [showKB, setShowKB] = useState(false);
  var [storeId, setStoreId] = useState(null);
  var [shareToken, setShareToken] = useState(null);
  var headerBannerInputRef = useRef(null);

  // ─── UNDO HISTORY ───
  var undoStackRef = useRef([]);
  var redoStackRef = useRef([]);
  var skipHistoryRef = useRef(false);
  var MAX_UNDO = 10;

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

  var log = useCallback(function(m) { setGenLog(function(p) { return p.concat([m]); }); }, []);

  var page = store.pages.find(function(p) { return p.id === curPage; }) || store.pages[0] || null;

  // ─── GENERATION ───

  var handleGenerate = async function(params) {
    setShowGen(false);
    setGenerating(true);
    setGenDone(false);
    setGenLog([]);
    setSel(null);
    setRequestedAsins(params.asins.slice());

    var lang = LANGS[params.marketplace] || 'German';
    var domain = DOMAINS[params.marketplace] || DOMAINS.de;

    try {
      // Step 1: Scrape
      log('Scraping ' + params.asins.length + ' ASINs from Amazon.' + params.marketplace + '...');
      var scrapeResult = await scrapeAsins(params.asins, domain);
      var products = scrapeResult.products || [];
      if (!products.length) throw new Error('No products returned from Bright Data. Check your ASINs and try again.');
      log('Scraped ' + products.length + '/' + params.asins.length + ' products');

      // Step 1.5: Crawl & analyze reference stores (if provided)
      var referenceAnalysis = null;
      if (params.referenceStoreUrls && params.referenceStoreUrls.length > 0) {
        var { crawlMultipleStores, analyzeStoreImagesWithGemini, formatReferenceStoreContext } = await import('./referenceStoreService');

        log('Analyzing ' + params.referenceStoreUrls.length + ' reference stores...');
        var parsedStores = await crawlMultipleStores(params.referenceStoreUrls, log);

        // Gemini image analysis (if available)
        var imageAnalyses = [];
        for (var si = 0; si < parsedStores.length; si++) {
          try {
            var analyses = await analyzeStoreImagesWithGemini(parsedStores[si], log);
            imageAnalyses = imageAnalyses.concat(analyses);
          } catch (e) { log('Image analysis skipped: ' + e.message); }
        }

        referenceAnalysis = formatReferenceStoreContext(parsedStores, imageAnalyses);
        log('Reference analysis complete');
      }

      // Step 1.6: Load knowledge base data for the selected category
      try {
        var { loadKnowledgeBaseForCategory, formatKnowledgeBaseContext } = await import('./referenceStoreService');
        var kbCategory = params.category || 'generic';
        log('Loading knowledge base for category: ' + kbCategory + '...');
        var kbData = await loadKnowledgeBaseForCategory(kbCategory);
        if (kbData && kbData.length > 0) {
          var kbContext = formatKnowledgeBaseContext(kbData);
          referenceAnalysis = (referenceAnalysis || '') + '\n' + kbContext;
          log('Knowledge base: ' + kbData.length + ' reference stores loaded');
        } else {
          log('Knowledge base: no reference stores for this category yet');
        }
      } catch (kbErr) {
        log('Knowledge base skipped: ' + kbErr.message);
      }

      // Resolve template data if selected
      var templateData = null;
      if (params.template) {
        templateData = STORE_TEMPLATES.find(function(t) { return t.id === params.template; }) || null;
      }

      // Step 2-4: AI generation (with complexity, category, template, websiteData, referenceAnalysis)
      var storeData = await generateStore(
        params.asins, products, params.brand, params.marketplace, lang,
        params.instructions, log, params.complexity, templateData, params.websiteData, referenceAnalysis
      );

      // Store meta
      storeData.complexity = params.complexity;
      if (templateData) storeData.templateId = templateData.id;

      setStore(storeData);
      setCurPage(storeData.pages[0] ? storeData.pages[0].id : '');
      log('Store complete! ' + storeData.pages.length + ' pages, ' + products.length + ' products.');
    } catch (e) {
      log('');
      log('ERROR: ' + e.message);
      if (e.message.indexOf('timed out') >= 0) {
        log('The request timed out. Try again with fewer ASINs or choose a lower complexity level.');
      } else if (e.message.indexOf('fetch') >= 0 || e.message.indexOf('network') >= 0 || e.message.indexOf('Failed to fetch') >= 0) {
        log('Network error — check your internet connection and try again.');
      } else if (e.message.indexOf('API error') >= 0 || e.message.indexOf('529') >= 0 || e.message.indexOf('overload') >= 0) {
        log('The AI service is temporarily overloaded. Please wait a minute and try again.');
      }
    } finally {
      setGenDone(true);
      // Keep the modal visible longer so the user can read the error
      setTimeout(function() { setGenerating(false); }, 8000);
    }
  };

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
              return Object.assign({}, sec, { layoutId: layoutId, tiles: tiles });
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

  // ─── NEW STORE (reset) ───
  var handleNewStore = function() {
    if (store.pages.length > 0 && !confirm('Start a new store? Unsaved changes will be lost.')) return;
    setStore(EMPTY_STORE);
    setCurPage('');
    setSel(null);
    setWarnings([]);
    setRequestedAsins([]);
    setStoreId(null);
    setShareToken(null);
  };

  // ─── VIEW MODE ───
  var handleToggleView = function(mode) {
    setViewMode(mode);
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

  // ─── AI CHAT ───
  var handleChatSend = async function(command) {
    if (!store.pages.length) return;
    setChatBusy(true);
    setChatResponse('Processing...');
    try {
      var lang = LANGS[store.marketplace] || 'German';
      var result = await aiRefineStore(store, command, store.brandName, lang);
      if (result.operations && result.operations.length > 0) {
        var newStore = applyOperations(store, result.operations);
        setStoreWithUndo(function(s) {
          return Object.assign({}, newStore, { products: s.products, asins: s.asins, brandName: s.brandName, marketplace: s.marketplace });
        });
        setChatResponse(result.explanation || 'Changes applied.');
      } else {
        setChatResponse(result.explanation || 'No changes needed.');
      }
    } catch (e) {
      setChatResponse('Error: ' + e.message);
    } finally {
      setChatBusy(false);
    }
  };

  // ─── SELECTED TILE ───
  var selTile = null;
  if (sel && page) {
    var sec = page.sections.find(function(s) { return s.id === sel.sid; });
    selTile = sec ? (sec.tiles[sel.ti] || null) : null;
  }

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
        onGenerate={function() { setShowGen(true); }}
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
        onShowKnowledgeBase={function() { setShowKB(true); }}
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
          viewMode={viewMode}
          onHeaderBannerUpload={handleHeaderBannerUpload}
          headerBannerColor={store.headerBannerColor || ''}
          onHeaderBannerColorChange={function(color) { setStoreWithUndo(function(s) { return Object.assign({}, s, { headerBannerColor: color }); }); }}
          products={store.products}
          uiLang={uiLang}
          hasAutoSave={hasAutoSave}
          onLoadAutoSave={handleLoadAutoSave}
          onGenerate={function() { setShowGen(true); }}
        />

        <PropertiesPanel
          tile={selTile}
          onChange={updateTile}
          products={store.products}
          viewMode={viewMode}
          uiLang={uiLang}
        />
      </div>

      {store.pages.length > 0 && (
        <AIChat
          onSend={handleChatSend}
          disabled={chatBusy}
          lastResponse={chatResponse}
          uiLang={uiLang}
        />
      )}

      {/* Validation warnings */}
      {warnings.length > 0 && store.pages.length > 0 && (
        <div className="warnings-bar">
          {warnings.filter(function(w) { return w.level === 'error' || w.level === 'warning'; }).slice(0, 3).map(function(w, i) {
            return <span key={i} className={'warning-item ' + w.level}>{w.message}</span>;
          })}
        </div>
      )}

      {showGen && (
        <GenerateModal
          onClose={function() { setShowGen(false); }}
          onGenerate={handleGenerate}
          uiLang={uiLang}
          googleDriveUrl={store.googleDriveUrl || ''}
          onGoogleDriveChange={function(url) { setStoreWithUndo(function(s) { return Object.assign({}, s, { googleDriveUrl: url }); }); }}
        />
      )}

      {generating && (
        <ProgressModal logs={genLog} done={genDone} uiLang={uiLang} />
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
      {showKB && (
        <KnowledgeBaseAdmin onClose={function() { setShowKB(false); }} />
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
