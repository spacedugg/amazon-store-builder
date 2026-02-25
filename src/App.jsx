import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, LAYOUTS, LANGS, DOMAINS, validateStore, PRICING, countStoreAssets } from './constants';
import { scrapeAsins } from './api';
import { generateStore, aiRefineStore, applyOperations } from './storeBuilder';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave } from './storage';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import { t } from './i18n';
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

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null, complexity: 2, category: 'generic' };

export default function App() {
  var [store, setStore] = useState(EMPTY_STORE);
  var [curPage, setCurPage] = useState('');
  var [sel, setSel] = useState(null);
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
  var [uiLang, setUiLang] = useState('en');
  var [showSaved, setShowSaved] = useState(false);
  var [showExport, setShowExport] = useState(false);
  var headerBannerInputRef = useRef(null);

  // Load saved stores on mount. Do NOT auto-load last store.
  // Show fresh empty state so user starts with the generate dialog.
  useEffect(function() {
    setSavedStores(loadSavedStores());
    // Check if auto-saved data exists but don't load it automatically.
    // User can access it from saved stores.
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
      if (!products.length) throw new Error('No products returned from Bright Data');
      log('Scraped ' + products.length + '/' + params.asins.length + ' products');

      // Step 2-4: AI generation (with complexity, category)
      var storeData = await generateStore(
        params.asins, products, params.brand, params.marketplace, lang,
        params.instructions, log, params.complexity, params.category
      );

      // Store meta
      storeData.complexity = params.complexity;
      storeData.category = params.category;

      setStore(storeData);
      setCurPage(storeData.pages[0] ? storeData.pages[0].id : '');
      log('Store complete! ' + storeData.pages.length + ' pages, ' + products.length + ' products.');
    } catch (e) {
      log('Error: ' + e.message);
    } finally {
      setGenDone(true);
      setTimeout(function() { setGenerating(false); }, 2000);
    }
  };

  // ─── TILE UPDATE ───
  var updateTile = function(updated) {
    if (!sel) return;
    setStore(function(s) {
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
    setStore(function(s) {
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
    setStore(function(s) {
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

  var moveSection = function(sectionId, newIndex) {
    if (!page) return;
    setStore(function(s) {
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
    var layout = LAYOUTS.find(function(l) { return l.id === layoutId; });
    if (!layout) return;
    setStore(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sectionId) return sec;
              var tiles = sec.tiles.slice();
              while (tiles.length < layout.cells) tiles.push(emptyTile());
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
    setStore(function(s) {
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
    setStore(function(s) {
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
    setStore(function(s) {
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
    setStore(function(s) {
      var pages = s.pages.slice();
      var item = pages.splice(fromIdx, 1)[0];
      pages.splice(toIdx, 0, item);
      return Object.assign({}, s, { pages: pages });
    });
  };

  // ─── SAVED STORES ───
  var handleSave = function() {
    if (!store.pages.length) return;
    var id = saveStore(store);
    if (id) {
      setSavedStores(loadSavedStores());
      alert(t('app.storeSaved', uiLang) + ' (' + (store.brandName || 'Untitled') + ')');
    }
  };

  var handleLoadSaved = function(id) {
    var data = loadStore(id);
    if (data) {
      setStore(data);
      setCurPage(data.pages[0] ? data.pages[0].id : '');
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

  var handleDeleteSaved = function(id) {
    deleteSavedStore(id);
    setSavedStores(loadSavedStores());
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
        setStore(function(s) { return Object.assign({}, s, { headerBannerMobile: data }); });
      } else {
        setStore(function(s) { return Object.assign({}, s, { headerBanner: data }); });
      }
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // ─── EXPORT ───
  var handleExport = async function(briefingLang) {
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
        setStore(function(s) {
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
        onShowAsins={function() { setShowAsins(true); }}
        onShowPrice={function() { setShowPrice(true); }}
        onExport={function() { setShowExport(true); }}
        onSave={handleSave}
        viewMode={viewMode}
        onToggleView={handleToggleView}
        uiLang={uiLang}
        onChangeLang={setUiLang}
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
          onMoveSection={moveSection}
          onChangeLayout={changeLayout}
          viewMode={viewMode}
          onHeaderBannerUpload={handleHeaderBannerUpload}
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
          onClose={function() { setShowPrice(false); }}
          uiLang={uiLang}
        />
      )}

      {showExport && (
        <ExportModal
          onClose={function() { setShowExport(false); }}
          onExport={handleExport}
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
