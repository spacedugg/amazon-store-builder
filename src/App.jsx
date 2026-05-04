import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, emptyTileForLayout, LANGS, DOMAINS, validateStore, findLayout, LAYOUT_TILE_DIMS } from './constants';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave, importStoreByShareLink } from './storage';
import { importBriefingToStore, importPageFromBriefing, importSectionFromBriefing, importTileFromBriefing } from './briefingImport';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import Topbar from './components/Topbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AsinPanel from './components/AsinPanel';
import NewStoreModal from './components/NewStoreModal';
import PatchImportModal from './components/PatchImportModal';
import PriceCalculator from './components/PriceCalculator';
import ExportModal from './components/ExportModal';
import BriefingView from './components/BriefingView';
import AdminAnalyze from './components/AdminAnalyze';
import AdminScrapingTest from './components/AdminScrapingTest';
import AsinOverview from './components/AsinOverview';

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null, headerBannerColor: '', category: 'generic', googleDriveUrl: '' };

// Synchronisiert imageRef WxH Suffixe mit den aktuellen Tile Dimensionen.
// Wenn ein Tile nach einem Layout Wechsel andere Dimensionen hat, wird
// der WxH Teil im imageRef neu berechnet. Solo Suffix (eigene Variante
// nach Entkopplung) bleibt erhalten. Damit gehört das Tile danach zum
// passenden Reuse Pool seiner aktuellen Größe oder bleibt isoliert wenn
// keine andere Tile dieselbe Größe und Topic hat.
function refreshImageRefs(store) {
  if (!store || !store.pages) return store;

  // Schritt 1, Dimensions Suffix updaten
  var changed = false;
  var newPages = store.pages.map(function(pg) {
    return Object.assign({}, pg, {
      sections: (pg.sections || []).map(function(sec) {
        return Object.assign({}, sec, {
          tiles: (sec.tiles || []).map(function(t) {
            if (!t || !t.imageRef || !t.dimensions) return t;
            var soloMatch = String(t.imageRef).match(/^(.+?)-(\d+)x(\d+)(-solo-[a-z0-9]+)?$/);
            if (!soloMatch) return t;
            var stem = soloMatch[1];
            var oldW = soloMatch[2];
            var oldH = soloMatch[3];
            var soloSuffix = soloMatch[4] || '';
            var newW = String(t.dimensions.w);
            var newH = String(t.dimensions.h);
            if (oldW === newW && oldH === newH) return t;
            changed = true;
            return Object.assign({}, t, {
              imageRef: stem + '-' + newW + 'x' + newH + soloSuffix,
            });
          }),
        });
      }),
    });
  });

  // Schritt 2, Briefing Konsistenz pro Reuse Familie prüfen.
  // Tiles mit gleichem imageRef (ohne Solo Suffix) gehören in eine Familie.
  // Wenn ein Tile in einer Familie abweichendes Briefing hat (anderes
  // textOverlay, brief, imageCategory, bgColor, dimensions, type oder
  // textAlign), wird es automatisch entkoppelt. Damit ist die Familie
  // ein echter Reuse Pool, alle Mitglieder teilen das identische Bild.
  // Master Fingerprint pro Familie ist der häufigste Fingerprint.
  function tileBriefingFingerprint(t) {
    if (!t) return '';
    var ov = (t.textOverlay && typeof t.textOverlay === 'object') ? t.textOverlay : {};
    var ovStr = [ov.heading || '', ov.subheading || '', ov.body || '', (ov.bullets || []).join(';'), ov.cta || ''].join('§');
    var d = t.dimensions || {};
    return [
      t.type || '', t.brief || '', ovStr, t.imageCategory || '', t.bgColor || '',
      d.w + 'x' + d.h, t.textAlign || 'left',
    ].join('|');
  }

  var groups = {};
  newPages.forEach(function(pg, pi) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(t, ti) {
        if (!t || !t.imageRef) return;
        if (/-solo-[a-z0-9]+$/.test(t.imageRef)) return; // schon entkoppelt
        if (!groups[t.imageRef]) groups[t.imageRef] = [];
        groups[t.imageRef].push({ pi: pi, si: si, ti: ti, fp: tileBriefingFingerprint(t) });
      });
    });
  });

  Object.keys(groups).forEach(function(key) {
    var members = groups[key];
    if (members.length < 2) return;
    // Häufigsten Fingerprint als Master bestimmen
    var counts = {};
    members.forEach(function(m) { counts[m.fp] = (counts[m.fp] || 0) + 1; });
    var masterFp = Object.keys(counts).reduce(function(a, b) {
      return counts[a] >= counts[b] ? a : b;
    });
    // Outlier bekommen automatischen Solo Suffix
    members.forEach(function(m) {
      if (m.fp === masterFp) return;
      var pg = newPages[m.pi];
      var sec = pg.sections[m.si];
      var t = sec.tiles[m.ti];
      var soloId = Math.random().toString(36).slice(2, 8);
      var newSecTiles = sec.tiles.slice();
      newSecTiles[m.ti] = Object.assign({}, t, {
        imageRef: t.imageRef + '-solo-' + soloId,
      });
      var newSections = pg.sections.slice();
      newSections[m.si] = Object.assign({}, sec, { tiles: newSecTiles });
      newPages[m.pi] = Object.assign({}, pg, { sections: newSections });
      changed = true;
    });
  });

  // Schritt 3, Auto-Merge: Tiles mit identischem Briefing aber unterschiedlichen
  // (oder fehlenden) imageRefs werden automatisch zur Familie zusammengeführt.
  // Tritt ein wenn der User Sections kopiert, gleichen Inhalt manuell an mehrere
  // Stellen kopiert oder ein Briefing JSON importiert in dem Tiles identische
  // Texte aber keinen einheitlichen Tag haben. Solo Tiles (explizit entkoppelt)
  // werden ausgenommen und bleiben isoliert.
  var IMG_TYPES = ['image', 'shoppable_image', 'image_text'];
  var fpGroups = {};
  newPages.forEach(function(pg, pi) {
    (pg.sections || []).forEach(function(sec, si) {
      (sec.tiles || []).forEach(function(t, ti) {
        if (!t || !t.dimensions) return;
        if (IMG_TYPES.indexOf(t.type) < 0) return;
        if (t.imageRef && /-solo-[a-z0-9]+$/.test(t.imageRef)) return;
        var ov = t.textOverlay || {};
        var hasContent = (t.brief && t.brief.length > 0)
          || ov.heading || ov.subheading || ov.body || (ov.bullets && ov.bullets.length)
          || ov.cta;
        if (!hasContent) return;
        var fp = tileBriefingFingerprint(t);
        if (!fpGroups[fp]) fpGroups[fp] = [];
        fpGroups[fp].push({ pi: pi, si: si, ti: ti, ref: t.imageRef || '' });
      });
    });
  });

  Object.keys(fpGroups).forEach(function(fp) {
    var members = fpGroups[fp];
    if (members.length < 2) return;
    // Häufigsten imageRef als kanonisch nehmen, sonst Hash basierten Auto Tag
    var refCounts = {};
    members.forEach(function(m) { refCounts[m.ref] = (refCounts[m.ref] || 0) + 1; });
    var canonical = Object.keys(refCounts).reduce(function(a, b) {
      // Bevorzuge nicht leere Refs vor leeren
      if (a === '' && b !== '') return b;
      if (b === '' && a !== '') return a;
      return refCounts[a] >= refCounts[b] ? a : b;
    });
    if (!canonical) {
      // Stable Hash aus Fingerprint
      var hash = 0;
      for (var i = 0; i < fp.length; i++) {
        hash = ((hash << 5) - hash + fp.charCodeAt(i)) | 0;
      }
      var hashHex = Math.abs(hash).toString(36).slice(0, 6);
      var pgFirst = newPages[members[0].pi];
      var tFirst = pgFirst.sections[members[0].si].tiles[members[0].ti];
      var d = tFirst.dimensions || {};
      canonical = 'auto-' + hashHex + '-' + d.w + 'x' + d.h;
    }
    // Allen Mitgliedern den kanonischen Ref setzen wenn abweichend
    members.forEach(function(m) {
      var pg = newPages[m.pi];
      var sec = pg.sections[m.si];
      var t = sec.tiles[m.ti];
      if (t.imageRef === canonical) return;
      var newSecTiles = sec.tiles.slice();
      newSecTiles[m.ti] = Object.assign({}, t, { imageRef: canonical });
      var newSections = pg.sections.slice();
      newSections[m.si] = Object.assign({}, sec, { tiles: newSecTiles });
      newPages[m.pi] = Object.assign({}, pg, { sections: newSections });
      changed = true;
    });
  });

  return changed ? Object.assign({}, store, { pages: newPages }) : store;
}

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
  var [showPatchImport, setShowPatchImport] = useState(false);
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
    setStore(refreshImageRefs(parsed));
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
    setStore(refreshImageRefs(parsed));
    setCurPage(parsed.pages && parsed.pages[0] ? parsed.pages[0].id : '');
    setSel(null);
  }, []);

  // Wrap setStore to track undo history. refreshImageRefs synchronisiert
  // die imageRef WxH Suffixe mit den aktuellen Tile Dimensionen, damit
  // Reuse Pools auch nach Layout Wechseln konsistent bleiben.
  var setStoreWithUndo = useCallback(function(updater) {
    setStore(function(prev) {
      var next = typeof updater === 'function' ? updater(prev) : updater;
      if (!skipHistoryRef.current && prev.pages.length > 0) {
        pushUndo(prev);
      }
      skipHistoryRef.current = false;
      return refreshImageRefs(next);
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
  // Felder die beim Image Reuse über imageRef synchronisiert werden, wenn
  // mehrere Tiles denselben imageRef teilen. Tile spezifische Felder
  // (linkAsin, linkUrl, asins, hotspots, imageRef selbst, uploadedImage)
  // bleiben pro Tile individuell.
  var SYNCED_REUSE_FIELDS = ['brief', 'textOverlay', 'dimensions', 'mobileDimensions', 'imageCategory', 'bgColor', 'type', 'textAlign'];

  var updateTile = function(updated) {
    if (!sel) return;
    setStoreWithUndo(function(s) {
      // Original Tile finden um zu prüfen ob es einen imageRef hat den
      // andere Tiles teilen. Wenn ja, synchronisierte Felder auf alle
      // Geschwister anwenden.
      var origTile = null;
      s.pages.forEach(function(pg) {
        (pg.sections || []).forEach(function(sec) {
          if (sec.id === sel.sid) {
            origTile = (sec.tiles || [])[sel.ti] || null;
          }
        });
      });
      var syncRef = (origTile && origTile.imageRef && updated && updated.imageRef === origTile.imageRef) ? origTile.imageRef : '';
      // Wenn der User gerade imageRef ändert, sync nicht über alten Ref
      if (updated && origTile && updated.imageRef !== origTile.imageRef) syncRef = '';
      // Sync Patch aus den Feldern die als shared gelten
      var syncPatch = {};
      if (syncRef && origTile) {
        SYNCED_REUSE_FIELDS.forEach(function(k) {
          if (Object.prototype.hasOwnProperty.call(updated, k)) syncPatch[k] = updated[k];
        });
      }
      var hasSync = syncRef && Object.keys(syncPatch).length > 0;
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              return Object.assign({}, sec, {
                tiles: sec.tiles.map(function(t, i) {
                  if (sec.id === sel.sid && i === sel.ti) return updated;
                  if (hasSync && t && t.imageRef === syncRef) {
                    return Object.assign({}, t, syncPatch);
                  }
                  return t;
                }),
              });
            }),
          });
        }),
      });
    });
  };

  // Tile vom Image Reuse entkoppeln: imageRef wird einzigartig gemacht.
  // Damit landet das Tile beim Folder Upload nicht mehr im Reuse Pool und
  // Briefing Edits auf anderen Stellen wirken nicht mehr darauf.
  var detachTileFromReuse = function() {
    if (!sel) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sel.sid) return sec;
              return Object.assign({}, sec, {
                tiles: sec.tiles.map(function(t, i) {
                  if (i !== sel.ti) return t;
                  if (!t.imageRef) return t;
                  return Object.assign({}, t, { imageRef: t.imageRef + '-solo-' + uid() });
                }),
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

  // Patch Apply: nimmt ein { ops: [...] } Objekt und wendet die Operationen
  // additiv auf den bestehenden Store an. Operationen:
  //   addPage          {page}                        → neue Page anhängen
  //   addSection       {pageName, after?, atEnd?, atStart?, section}
  //   addTile          {pageName, sectionIdx, after?, tile}
  //   modifyTile       {pageName, sectionIdx, tileIdx, patch}
  //   modifySection    {pageName, sectionIdx, patch}
  //   deleteSection    {pageName, sectionIdx}
  //   deleteTile       {pageName, sectionIdx, tileIdx}
  // Bestehende Pages, Sections, Tiles bleiben unangetastet außer den
  // explizit referenzierten. Selektion und alle nicht betroffenen Edits
  // bleiben erhalten.
  var applyPatch = function(patchData) {
    var data = typeof patchData === 'string' ? JSON.parse(patchData) : patchData;
    if (!data || !Array.isArray(data.ops)) {
      throw new Error('Patch JSON ungültig, erwartet { "ops": [...] }');
    }
    var summary = [];
    setStoreWithUndo(function(s) {
      var pages = s.pages.slice();
      // Name zu ID Mapping inklusive neuer Pages aus dem Patch
      var pageIdByName = {};
      pages.forEach(function(p) { if (p.name) pageIdByName[p.name] = p.id; });
      // Erst alle addPage Ops, damit linkUrl page:Refs auf neue Pages auflösen
      data.ops.forEach(function(op) {
        if (op && op.op === 'addPage' && op.page && op.page.name) {
          pageIdByName[op.page.name] = pageIdByName[op.page.name] || 'pending-' + op.page.name;
        }
      });
      var findPageIdx = function(name) {
        return pages.findIndex(function(p) { return p.name === name; });
      };
      data.ops.forEach(function(op, idx) {
        if (!op || typeof op !== 'object') return;
        if (op.op === 'addPage') {
          if (!op.page || !op.page.name) return;
          var newPage = importPageFromBriefing(op.page, pageIdByName);
          pageIdByName[newPage.name] = newPage.id;
          if (typeof op.afterPageName === 'string') {
            var afterIdx = findPageIdx(op.afterPageName);
            if (afterIdx >= 0) {
              pages.splice(afterIdx + 1, 0, newPage);
            } else {
              pages.push(newPage);
            }
          } else {
            pages.push(newPage);
          }
          summary.push('Page hinzugefügt: ' + newPage.name);
          return;
        }
        if (op.op === 'addSection') {
          var pi = findPageIdx(op.pageName);
          if (pi < 0) { summary.push('Op ' + idx + ' übersprungen, Page nicht gefunden: ' + op.pageName); return; }
          var pg = pages[pi];
          var newSec = importSectionFromBriefing(op.section || {}, pageIdByName);
          var sections = pg.sections.slice();
          var insertIdx;
          if (op.atStart) insertIdx = 0;
          else if (typeof op.after === 'number') insertIdx = Math.min(op.after + 1, sections.length);
          else if (typeof op.before === 'number') insertIdx = Math.max(0, op.before);
          else insertIdx = sections.length;
          sections.splice(insertIdx, 0, newSec);
          pages[pi] = Object.assign({}, pg, { sections: sections });
          summary.push('Section eingefügt in ' + op.pageName + ' an Position ' + (insertIdx + 1));
          return;
        }
        if (op.op === 'addTile') {
          var pi2 = findPageIdx(op.pageName);
          if (pi2 < 0) { summary.push('Op ' + idx + ' übersprungen, Page nicht gefunden'); return; }
          var pg2 = pages[pi2];
          var sec = pg2.sections[op.sectionIdx];
          if (!sec) { summary.push('Op ' + idx + ' übersprungen, Section ' + op.sectionIdx + ' nicht gefunden'); return; }
          var tiles = sec.tiles.slice();
          var insertTileIdx;
          if (op.atStart) insertTileIdx = 0;
          else if (typeof op.after === 'number') insertTileIdx = Math.min(op.after + 1, tiles.length);
          else insertTileIdx = tiles.length;
          var newTile = importTileFromBriefing(op.tile || {}, sec.layoutId, insertTileIdx, pageIdByName);
          tiles.splice(insertTileIdx, 0, newTile);
          var sections2 = pg2.sections.slice();
          sections2[op.sectionIdx] = Object.assign({}, sec, { tiles: tiles });
          pages[pi2] = Object.assign({}, pg2, { sections: sections2 });
          summary.push('Tile eingefügt in ' + op.pageName + ' S' + (op.sectionIdx + 1));
          return;
        }
        if (op.op === 'modifyTile') {
          var pi3 = findPageIdx(op.pageName);
          if (pi3 < 0) { summary.push('Op ' + idx + ' übersprungen, Page nicht gefunden'); return; }
          var pg3 = pages[pi3];
          var sec3 = pg3.sections[op.sectionIdx];
          if (!sec3 || !sec3.tiles[op.tileIdx]) { summary.push('Op ' + idx + ' übersprungen, Tile nicht gefunden'); return; }
          var tiles3 = sec3.tiles.slice();
          tiles3[op.tileIdx] = Object.assign({}, sec3.tiles[op.tileIdx], op.patch || {});
          var sections3 = pg3.sections.slice();
          sections3[op.sectionIdx] = Object.assign({}, sec3, { tiles: tiles3 });
          pages[pi3] = Object.assign({}, pg3, { sections: sections3 });
          summary.push('Tile geändert: ' + op.pageName + ' S' + (op.sectionIdx + 1) + ' T' + (op.tileIdx + 1));
          return;
        }
        if (op.op === 'modifySection') {
          var pi4 = findPageIdx(op.pageName);
          if (pi4 < 0) { summary.push('Op ' + idx + ' übersprungen, Page nicht gefunden'); return; }
          var pg4 = pages[pi4];
          var sec4 = pg4.sections[op.sectionIdx];
          if (!sec4) { summary.push('Op ' + idx + ' übersprungen, Section nicht gefunden'); return; }
          var sections4 = pg4.sections.slice();
          sections4[op.sectionIdx] = Object.assign({}, sec4, op.patch || {});
          pages[pi4] = Object.assign({}, pg4, { sections: sections4 });
          summary.push('Section geändert: ' + op.pageName + ' S' + (op.sectionIdx + 1));
          return;
        }
        if (op.op === 'deleteSection') {
          var pi5 = findPageIdx(op.pageName);
          if (pi5 < 0) return;
          var pg5 = pages[pi5];
          if (op.sectionIdx < 0 || op.sectionIdx >= pg5.sections.length) return;
          var sections5 = pg5.sections.slice();
          sections5.splice(op.sectionIdx, 1);
          pages[pi5] = Object.assign({}, pg5, { sections: sections5 });
          summary.push('Section gelöscht: ' + op.pageName + ' S' + (op.sectionIdx + 1));
          return;
        }
        if (op.op === 'deleteTile') {
          var pi6 = findPageIdx(op.pageName);
          if (pi6 < 0) return;
          var pg6 = pages[pi6];
          var sec6 = pg6.sections[op.sectionIdx];
          if (!sec6) return;
          var tiles6 = sec6.tiles.slice();
          tiles6.splice(op.tileIdx, 1);
          var sections6 = pg6.sections.slice();
          sections6[op.sectionIdx] = Object.assign({}, sec6, { tiles: tiles6 });
          pages[pi6] = Object.assign({}, pg6, { sections: sections6 });
          summary.push('Tile gelöscht: ' + op.pageName + ' S' + (op.sectionIdx + 1) + ' T' + (op.tileIdx + 1));
          return;
        }
        summary.push('Op ' + idx + ' unbekannt: ' + op.op);
      });
      return Object.assign({}, s, { pages: pages });
    });
    return summary;
  };

  // Globale BSR Sortierung. Geht durch alle Tiles mit asins Liste (Product
  // Grid, Bestseller, Recommended, Deals plus optional Image und Shoppable),
  // sortiert pro Tile die ASINs aufsteigend nach subcategoryRank (oder
  // bestsellerRank Fallback). ASINs ohne BSR Daten landen am Ende. Gibt
  // Statistik zurück: wieviele Tiles sortiert, wieviele ASINs konnten nach
  // BSR sortiert werden.
  var sortAllBestsellersByBSR = function() {
    var products = store.products || [];
    if (!products.length) {
      return { tilesUpdated: 0, asinsRanked: 0, totalAsins: 0, error: 'Keine Produktdaten im Store. Erst ASINs scrapen.' };
    }
    var productMap = {};
    products.forEach(function(p) { productMap[p.asin] = p; });
    var stats = { tilesUpdated: 0, asinsRanked: 0, totalAsins: 0 };
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          return Object.assign({}, pg, {
            sections: (pg.sections || []).map(function(sec) {
              return Object.assign({}, sec, {
                tiles: (sec.tiles || []).map(function(t) {
                  // Nur Tiles mit ASIN Listen sortieren. Hotspot ASINs nicht
                  // anfassen, da Position auf dem Bild bewusst gesetzt ist.
                  if (!t.asins || t.asins.length < 2) return t;
                  var typesToSort = ['best_sellers', 'product_grid', 'recommended', 'deals'];
                  if (typesToSort.indexOf(t.type) < 0) return t;
                  var withRankCount = 0;
                  t.asins.forEach(function(a) {
                    var p = productMap[a];
                    if (p && (p.subcategoryRank || p.bestsellerRank)) withRankCount++;
                  });
                  if (withRankCount === 0) return t;
                  var sorted = t.asins.slice().sort(function(a, b) {
                    var pa = productMap[a];
                    var pb = productMap[b];
                    var ra = (pa && (pa.subcategoryRank || pa.bestsellerRank)) || 1e9;
                    var rb = (pb && (pb.subcategoryRank || pb.bestsellerRank)) || 1e9;
                    return ra - rb;
                  });
                  // Nur als geändert zählen wenn die Reihenfolge tatsächlich anders ist
                  var changed = false;
                  for (var i = 0; i < sorted.length; i++) {
                    if (sorted[i] !== t.asins[i]) { changed = true; break; }
                  }
                  if (!changed) return t;
                  stats.tilesUpdated++;
                  stats.asinsRanked += withRankCount;
                  stats.totalAsins += t.asins.length;
                  return Object.assign({}, t, { asins: sorted });
                }),
              });
            }),
          });
        }),
      });
    });
    return stats;
  };
  // Tiles innerhalb einer Section per Drag and Drop tauschen.
  // fromIdx und toIdx sind die Tile Positionen innerhalb der Section.
  var swapTiles = function(sectionId, fromIdx, toIdx) {
    if (!page || fromIdx === toIdx) return;
    setStoreWithUndo(function(s) {
      return Object.assign({}, s, {
        pages: s.pages.map(function(pg) {
          if (pg.id !== page.id) return pg;
          return Object.assign({}, pg, {
            sections: pg.sections.map(function(sec) {
              if (sec.id !== sectionId) return sec;
              var tiles = sec.tiles.slice();
              if (fromIdx < 0 || toIdx < 0 || fromIdx >= tiles.length || toIdx >= tiles.length) return sec;
              var item = tiles.splice(fromIdx, 1)[0];
              tiles.splice(toIdx, 0, item);
              return Object.assign({}, sec, { tiles: tiles });
            }),
          });
        }),
      });
    });
    // Selection nach Drag mitnehmen
    if (sel && sel.sid === sectionId && sel.ti === fromIdx) {
      setSel({ sid: sectionId, ti: toIdx });
    }
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

  // Page komplett duplizieren mit allen Sections, Tiles und Sub Pages.
  // Neue UIDs werden erzeugt, parentId Bezüge angepasst.
  var duplicatePage = function(pageId) {
    setStoreWithUndo(function(s) {
      var orig = s.pages.find(function(p) { return p.id === pageId; });
      if (!orig) return s;
      var copyPage = function(p, newId, newParentId) {
        var copy = Object.assign({}, p, {
          id: newId,
          sections: (p.sections || []).map(function(sec) {
            return Object.assign({}, sec, {
              id: uid(),
              tiles: (sec.tiles || []).map(function(t) { return Object.assign({}, t); }),
            });
          }),
        });
        if (newParentId !== undefined) {
          if (newParentId === null) delete copy.parentId;
          else copy.parentId = newParentId;
        }
        return copy;
      };
      var newOrigId = uid();
      var origCopy = copyPage(orig, newOrigId);
      origCopy.name = orig.name + ' Kopie';
      var children = s.pages.filter(function(p) { return p.parentId === pageId; });
      var childCopies = children.map(function(c) { return copyPage(c, uid(), newOrigId); });
      var pages = s.pages.slice();
      var origIdx = pages.findIndex(function(p) { return p.id === pageId; });
      var insertIdx = origIdx + 1;
      while (insertIdx < pages.length && pages[insertIdx].parentId === pageId) insertIdx++;
      var toInsert = [origCopy].concat(childCopies);
      pages.splice.apply(pages, [insertIdx, 0].concat(toInsert));
      return Object.assign({}, s, { pages: pages });
    });
  };

  // Drag and Drop Move. Ziehe Page (mit allen Sub Pages) an eine andere
  // Stelle. position 'above' und 'below' lassen die Hierarchie Ebene gleich
  // (Sibling von target). position 'into' macht die Page zur Sub von target.
  // Top Level kann zur Sub werden, Sub kann zur Top Level werden.
  var movePageStructural = function(srcId, targetId, position) {
    if (srcId === targetId) return;
    setStoreWithUndo(function(s) {
      var pages = s.pages.slice();
      var src = pages.find(function(p) { return p.id === srcId; });
      var target = pages.find(function(p) { return p.id === targetId; });
      if (!src || !target) return s;
      // Verbiete Drop in eigenen Subtree
      if (position === 'into' && target.parentId === srcId) return s;
      // Sammle src und seine direkten Kinder als bewegender Block
      var srcChildren = pages.filter(function(p) { return p.parentId === srcId; });
      var movingIds = [srcId].concat(srcChildren.map(function(p) { return p.id; }));
      var moving = pages.filter(function(p) { return movingIds.indexOf(p.id) >= 0; });
      pages = pages.filter(function(p) { return movingIds.indexOf(p.id) < 0; });
      // Update src parentId nach position
      var newParentId;
      if (position === 'into') newParentId = targetId;
      else newParentId = target.parentId || null;
      if (newParentId === null) delete src.parentId;
      else src.parentId = newParentId;
      // Wenn src zu Sub wird, dürfen seine Sub Kinder nicht mit, weil das
      // Schema nur 1 Ebene tief erlaubt. Kinder werden Top Level.
      if (newParentId !== null) {
        srcChildren.forEach(function(c) { delete c.parentId; });
      }
      // Neue Position bestimmen
      var newTargetIdx = pages.findIndex(function(p) { return p.id === targetId; });
      var insertIdx;
      if (position === 'above') {
        insertIdx = newTargetIdx;
      } else if (position === 'below') {
        insertIdx = newTargetIdx + 1;
        // Skip target's existing children
        while (insertIdx < pages.length && pages[insertIdx].parentId === targetId) insertIdx++;
      } else { // into
        insertIdx = newTargetIdx + 1;
        while (insertIdx < pages.length && pages[insertIdx].parentId === targetId) insertIdx++;
      }
      // Insert. Wenn src zu Sub wird, kommen die ehemaligen Kinder als Top Level am Ende.
      var toInsert = [src];
      if (newParentId === null) {
        // src bleibt oder wird Top Level mit eigenen Subs direkt dahinter
        toInsert = toInsert.concat(srcChildren);
      }
      pages.splice.apply(pages, [insertIdx, 0].concat(toInsert));
      // Wenn src zu Sub wurde, ehemalige Kinder als Top Level am Ende anhängen
      if (newParentId !== null && srcChildren.length > 0) {
        pages = pages.concat(srcChildren);
      }
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
      setStore(refreshImageRefs(result.data));
      setStoreId(id);
      if (result.shareToken) setShareToken(result.shareToken);
      setCurPage(result.data.pages[0] ? result.data.pages[0].id : '');
      setSel(null);
    }
  };

  var handleLoadAutoSave = function() {
    var data = loadAutoSave();
    if (data && data.pages && data.pages.length > 0) {
      setStore(refreshImageRefs(data));
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
      setStore(refreshImageRefs(result.data));
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
  // Zwei Match Modi:
  //  1. Per Tile: Filename PageName_S1_T1[_desktop|_mobile].jpg → genau ein Tile
  //  2. Per imageRef: Filename gleicht imageRef Tag (z.B. cat-garten-lifestyle-1500x750.jpg)
  //     → Bild geht an ALLE Tiles mit identischem imageRef. Da imageRef die
  //     Dimensionen WxH bereits enthält, wird nie auf einer anderen Bildgröße
  //     überschrieben. Bilder werden nicht gestreckt oder anders gefüllt.
  var handleFolderImageUpload = function(files) {
    if (!files || files.length === 0 || !store.pages || store.pages.length === 0) return;
    // Build filename map
    var fnMap = {};
    // imageRef Map: refKey:variant → Liste aller Tiles mit dem Ref
    var refMap = {};
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
          // imageRef → mehrere Tiles teilen sich ein Bild
          if (tile.imageRef) {
            var refKey = String(tile.imageRef).toLowerCase();
            if (!refMap[refKey]) refMap[refKey] = [];
            refMap[refKey].push({ pageId: pg.id, secId: sec.id, ti: ti });
          }
        });
      });
    });
    // Match files and read as data URLs
    var imageExts = /\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i;
    var matched = {}; // key: "pageId|secId|ti|variant" → { entries: [...], file }
    var matchedRefs = {}; // ref → { variant, file }
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (!imageExts.test(file.name)) continue;
      var rawName = file.name;
      if (rawName.normalize) rawName = rawName.normalize('NFC');
      var name = rawName.toLowerCase();
      var nameNoExt = name.replace(/\.(jpg|jpeg|png|webp|gif|svg|bmp|tiff?)$/i, '');
      // Variante aus Suffix ableiten
      var refVariant = 'sync';
      var refStem = nameNoExt;
      if (/_desktop$/.test(nameNoExt)) { refVariant = 'desktop'; refStem = nameNoExt.replace(/_desktop$/, ''); }
      else if (/_mobile$/.test(nameNoExt)) { refVariant = 'mobile'; refStem = nameNoExt.replace(/_mobile$/, ''); }
      // 1. imageRef Match (Bild Reuse über mehrere Tiles)
      if (refMap[refStem]) {
        var rkey = refStem + '|' + refVariant;
        if (!matchedRefs[rkey]) matchedRefs[rkey] = { ref: refStem, variant: refVariant, file: file, entries: refMap[refStem] };
        continue;
      }
      // 2. Per Tile Filename Match (existierend)
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
    var refKeys = Object.keys(matchedRefs);
    if (matchKeys.length === 0 && refKeys.length === 0) { alert('Kein Bild zugeordnet.\nErwartete Filenames:\n• Per Tile: PageName_S1_T1_desktop.jpg\n• Per imageRef: cat-garten-lifestyle-1500x750.jpg (oder _desktop / _mobile Variante)'); return; }
    // imageRef Files lesen und auf alle zugehörigen Tiles anwenden
    var refProcessed = 0;
    var totalReuses = 0;
    refKeys.forEach(function(rkey) {
      var item = matchedRefs[rkey];
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        setStore(function(s) {
          return Object.assign({}, s, {
            pages: s.pages.map(function(pg) {
              return Object.assign({}, pg, {
                sections: pg.sections.map(function(sec) {
                  return Object.assign({}, sec, {
                    tiles: sec.tiles.map(function(t, ti) {
                      var hit = item.entries.some(function(e) { return e.pageId === pg.id && e.secId === sec.id && e.ti === ti; });
                      if (!hit) return t;
                      var updates = {};
                      if (item.variant === 'sync' || item.variant === 'desktop') updates.uploadedImage = dataUrl;
                      if (item.variant === 'sync' || item.variant === 'mobile') updates.uploadedImageMobile = dataUrl;
                      return Object.assign({}, t, updates);
                    }),
                  });
                }),
              });
            }),
          });
        });
        totalReuses += item.entries.length;
        refProcessed++;
        if (refProcessed === refKeys.length && matchKeys.length === 0) {
          alert(refKeys.length + ' imageRef Bild(er) verteilt auf ' + totalReuses + ' Tile(s).');
        }
      };
      reader.readAsDataURL(item.file);
    });
    if (matchKeys.length === 0) return;
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
          var msg = matchKeys.length + ' Tile Bild(er) zugeordnet.';
          if (refKeys.length > 0) msg += ' Plus ' + refKeys.length + ' imageRef Bild(er) auf ' + totalReuses + ' Tile(s).';
          alert(msg);
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
        onPatchImport={store.pages.length > 0 ? function() { setShowPatchImport(true); } : null}
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
          onDuplicatePage={duplicatePage}
          onMovePage={movePageStructural}
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
          onSwapTiles={swapTiles}
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
          onDetachReuse={detachTileFromReuse}
          products={store.products}
          viewMode={viewMode}
          uiLang={uiLang}
          layoutType={selLayoutType}
          pages={store.pages}
          allPages={store.pages}
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

      {showPatchImport && (
        <PatchImportModal
          onClose={function() { setShowPatchImport(false); }}
          onApply={applyPatch}
          store={store}
          currentPageId={curPage}
        />
      )}

      {showAsins && (
        <AsinPanel
          asins={store.asins || []}
          pages={store.pages}
          products={store.products}
          requestedAsins={requestedAsins}
          onClose={function() { setShowAsins(false); }}
          onScrape={async function(asinList) {
            setRequestedAsins(asinList);
            var domain = DOMAINS[store.marketplace] || DOMAINS.de;
            var resp = await fetch('/api/amazon-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ asins: asinList, domain: domain }),
            });
            if (!resp.ok) {
              var e = await resp.json().catch(function() { return {}; });
              throw new Error(e.error || e.detail || 'Scrape failed');
            }
            var json = await resp.json();
            var newProducts = json.products || [];
            // Merge mit bestehenden products, neue gewinnen bei Konflikt
            setStoreWithUndo(function(s) {
              var existing = {};
              (s.products || []).forEach(function(p) { existing[p.asin] = p; });
              newProducts.forEach(function(p) { existing[p.asin] = p; });
              return Object.assign({}, s, { products: Object.keys(existing).map(function(k) { return existing[k]; }) });
            });
            return { success: newProducts.length, failed: asinList.length - newProducts.length };
          }}
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
          onSortAllByBsr={sortAllBestsellersByBSR}
          onClose={function() { setShowAsinOverview(false); }}
          onScrape={async function(asinList) {
            setRequestedAsins(asinList);
            var domain = DOMAINS[store.marketplace] || DOMAINS.de;
            var resp = await fetch('/api/amazon-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ asins: asinList, domain: domain }),
            });
            if (!resp.ok) {
              var e = await resp.json().catch(function() { return {}; });
              throw new Error(e.error || e.detail || 'Scrape failed');
            }
            var json = await resp.json();
            var newProducts = json.products || [];
            setStoreWithUndo(function(s) {
              var existing = {};
              (s.products || []).forEach(function(p) { existing[p.asin] = p; });
              newProducts.forEach(function(p) { existing[p.asin] = p; });
              return Object.assign({}, s, { products: Object.keys(existing).map(function(k) { return existing[k]; }) });
            });
            return { success: newProducts.length, failed: asinList.length - newProducts.length };
          }}
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
