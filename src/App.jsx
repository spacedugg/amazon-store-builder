import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, LAYOUTS, LANGS, DOMAINS, validateStore } from './constants';
import { scrapeAsins } from './api';
import { generateStore, aiRefineStore, applyOperations } from './storeBuilder';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave } from './storage';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import Topbar from './components/Topbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AsinPanel from './components/AsinPanel';
import GenerateModal from './components/GenerateModal';
import ProgressModal from './components/ProgressModal';
import AIChat from './components/AIChat';

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null };

export default function App() {
  var [store, setStore] = useState(EMPTY_STORE);
  var [curPage, setCurPage] = useState('');
  var [sel, setSel] = useState(null);
  var [showGen, setShowGen] = useState(false);
  var [showAsins, setShowAsins] = useState(false);
  var [generating, setGenerating] = useState(false);
  var [genLog, setGenLog] = useState([]);
  var [genDone, setGenDone] = useState(false);
  var [chatBusy, setChatBusy] = useState(false);
  var [chatResponse, setChatResponse] = useState('');
  var [savedStores, setSavedStores] = useState([]);
  var [warnings, setWarnings] = useState([]);
  var [viewMode, setViewMode] = useState('desktop');
  var [requestedAsins, setRequestedAsins] = useState([]);
  var headerBannerInputRef = useRef(null);

  // Load saved stores on mount + check for auto-save
  useEffect(function() {
    setSavedStores(loadSavedStores());
    var autoSaved = loadAutoSave();
    if (autoSaved && autoSaved.pages && autoSaved.pages.length > 0) {
      setStore(autoSaved);
      setCurPage(autoSaved.pages[0] ? autoSaved.pages[0].id : '');
    }
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

      // Step 2-4: AI generation
      var storeData = await generateStore(
        params.asins, products, params.brand, params.marketplace, lang,
        params.instructions, log
      );

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
  var addPage = function() {
    var name = 'New Page';
    var idx = 1;
    var names = store.pages.map(function(p) { return p.name; });
    while (names.indexOf(name) >= 0) { idx++; name = 'New Page ' + idx; }
    var newPage = {
      id: uid(),
      name: name,
      sections: [{
        id: uid(), layoutId: '1',
        tiles: [emptyTile()],
      }],
    };
    setStore(function(s) {
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
    setStore(function(s) {
      var newPages = s.pages.filter(function(pg) { return pg.id !== pageId; });
      return Object.assign({}, s, { pages: newPages });
    });
    if (curPage === pageId) {
      var fallback = store.pages.find(function(p) { return p.id !== pageId; });
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
      alert('Store saved! (' + (store.brandName || 'Untitled') + ')');
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
  var handleExport = async function() {
    try {
      var blob = await generateBriefingDocx(store);
      var filename = (store.brandName || 'store').replace(/[^a-zA-Z0-9]/g, '_') + '_briefing.docx';
      downloadBlob(blob, filename);
    } catch (e) {
      alert('Export failed: ' + e.message);
    }
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

  return (
    <div className="app-root">
      <Topbar
        store={store}
        onGenerate={function() { setShowGen(true); }}
        onShowAsins={function() { setShowAsins(true); }}
        onExport={handleExport}
        onSave={handleSave}
        viewMode={viewMode}
        onToggleView={handleToggleView}
      />

      <div className="app-body">
        <PageList
          pages={store.pages}
          curPage={page ? page.id : ''}
          onSelect={function(id) { setCurPage(id); setSel(null); }}
          onAddPage={addPage}
          onRenamePage={renamePage}
          onDeletePage={deletePage}
          onReorderPage={reorderPage}
          savedStores={savedStores}
          onLoadSaved={handleLoadSaved}
          onDeleteSaved={handleDeleteSaved}
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
        />

        <PropertiesPanel
          tile={selTile}
          onChange={updateTile}
          products={store.products}
          viewMode={viewMode}
        />
      </div>

      {store.pages.length > 0 && (
        <AIChat
          onSend={handleChatSend}
          disabled={chatBusy}
          lastResponse={chatResponse}
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
        />
      )}

      {generating && (
        <ProgressModal logs={genLog} done={genDone} />
      )}

      {showAsins && (
        <AsinPanel
          asins={store.asins || []}
          pages={store.pages}
          products={store.products}
          requestedAsins={requestedAsins}
          onClose={function() { setShowAsins(false); }}
        />
      )}

      {/* Hidden file input for header banner upload */}
      <input ref={headerBannerInputRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={handleHeaderBannerFile} />
    </div>
  );
}
