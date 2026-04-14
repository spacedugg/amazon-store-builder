import { useState, useCallback, useEffect, useRef } from 'react';
import { uid, emptyTile, emptyTileForLayout, LANGS, DOMAINS, validateStore, findLayout, LAYOUT_TILE_DIMS } from './constants';
import { scrapeAsins, analyzeBrandCI } from './api';
import { generateStore, aiRefineStore, applyOperations, generateWireframesForPage, deleteWireframesForPage } from './storeBuilder';
import { saveStore, loadSavedStores, loadStore, deleteSavedStore, autoSave, loadAutoSave, importStoreByShareLink } from './storage';
import { analyzeOneProduct, groupIntoCategories, analyzeWebsitePage, synthesizeBrandProfile, planPages, generateOnePage, validateStore as validateStoreQuality } from './contentPipeline';
import { analyzeBrandVoice } from './generationPipeline';
import { generateBriefingDocx, downloadBlob } from './exportBriefing';
import { crawlMultipleStores, crawlAndParseStore, analyzeStoreImagesWithGemini, formatReferenceStoreContext, loadStoreKnowledge, formatStoreKnowledge } from './referenceStoreService';
import Topbar from './components/Topbar';
import PageList from './components/PageList';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import AsinPanel from './components/AsinPanel';
import GenerateModal from './components/GenerateModal';
import GenerationWizard from './components/GenerationWizard';
import ProgressModal from './components/ProgressModal';
import AIChat from './components/AIChat';
import PriceCalculator from './components/PriceCalculator';
import ExportModal from './components/ExportModal';
import BriefingView from './components/BriefingView';
import AdminAnalyze from './components/AdminAnalyze';
import AdminScrapingTest from './components/AdminScrapingTest';
import AsinOverview from './components/AsinOverview';
// KnowledgeBaseAdmin removed — reference data loads automatically in background

var EMPTY_STORE = { brandName: '', marketplace: 'de', products: [], asins: [], pages: [], brandTone: '', brandStory: '', headerBanner: null, headerBannerMobile: null, headerBannerColor: '', complexity: 2, category: 'generic', googleDriveUrl: '' };

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
  var [showGen, setShowGen] = useState(false);
  var [showWizard, setShowWizard] = useState(false);
  var [resumeWizardId, setResumeWizardId] = useState(null);
  var [activeCheckpoints, setActiveCheckpoints] = useState([]);
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
  var [showAsinOverview, setShowAsinOverview] = useState(false);

  var [storeId, setStoreId] = useState(null);
  var [shareToken, setShareToken] = useState(null);
  var [wfGenerating, setWfGenerating] = useState(null);
  var [wfProgress, setWfProgress] = useState('');
  var wfCancelRef = useRef(false);
  var genCancelRef = useRef(false);
  var headerBannerInputRef = useRef(null);
  var folderInputRef = useRef(null);

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

  // ─── WIREFRAME GENERATION ───
  var handleGenerateWireframes = function(pageId) {
    if (wfGenerating) return;
    var wfPage = (store.pages || []).find(function(p) { return p.id === pageId; });
    if (!wfPage) return;
    wfCancelRef.current = false;
    setWfGenerating(pageId);
    setWfProgress('Starte...');
    generateWireframesForPage(
      wfPage, store.brandName || '', store.websiteData || null,
      { brandTone: store.brandTone, brandStory: store.brandStory, keyFeatures: store.keyFeatures, productCI: store.productCI || null },
      function(current, total, category) {
        setWfProgress(current + '/' + total + ' (' + category + ')');
      },
      store.manualCI || null,
      wfCancelRef
    ).then(function(result) {
      setWfGenerating(null);
      var msg = result.cancelled
        ? result.success + ' generiert, abgebrochen'
        : result.success + ' generiert, ' + result.failed + ' fehlgeschlagen';
      if (result.error && !result.cancelled) msg += ' (' + result.error + ')';
      setWfProgress(msg);
      setStore(function(prev) { return Object.assign({}, prev); });
      setTimeout(function() { setWfProgress(''); }, result.error ? 8000 : 4000);
    }).catch(function(err) {
      setWfGenerating(null);
      setWfProgress('Fehler: ' + err.message);
      setTimeout(function() { setWfProgress(''); }, 4000);
    });
  };

  var handleStopWireframes = function() {
    wfCancelRef.current = true;
    setWfProgress('Wird angehalten...');
  };

  // ─── WIREFRAME DELETION ───
  var handleDeleteWireframes = function(pageId) {
    var wfPage = (store.pages || []).find(function(p) { return p.id === pageId; });
    if (!wfPage) return;
    var deleted = deleteWireframesForPage(wfPage);
    if (deleted > 0) {
      setStore(function(prev) { return Object.assign({}, prev); });
      setWfProgress(deleted + ' Wireframes gelöscht');
      setTimeout(function() { setWfProgress(''); }, 3000);
    }
  };

  // ─── GENERATION ───

  var handleGenerate = async function(params) {
    setShowGen(false);
    setGenerating(true);
    setGenDone(false);
    setGenLog([]);

    // Keep tab alive during long generation (prevents browser from freezing inactive tabs)
    var keepAlive = setInterval(function() { /* no-op tick keeps the tab active */ }, 1000);
    setSel(null);
    setRequestedAsins(params.asins.slice());
    lastGenParams.current = params;
    genCancelRef.current = false;

    var lang = LANGS[params.marketplace] || 'German';
    var domain = DOMAINS[params.marketplace] || DOMAINS.de;

    try {
      // Step 1: Scrape
      log('Scraping ' + params.asins.length + ' ASINs from Amazon.' + params.marketplace + '...');
      var scrapeResult = await scrapeAsins(params.asins, domain);
      var products = scrapeResult.products || [];
      if (!products.length) throw new Error('No products returned from Bright Data. Check your ASINs and try again.');
      log('Scraped ' + products.length + '/' + params.asins.length + ' products');

      // Step 1.2: Analyze brand CI from product listing images via Gemini Vision
      var productCI = null;
      var userCiSource = params.ciSource || 'auto';
      if (userCiSource !== 'manual' && userCiSource !== 'website') {
        // Analyze Amazon listing images for CI (unless user chose "website only" or "manual")
        try {
          var ciImages = [];
          // Collect ALL images from ALL products
          products.forEach(function(p) {
            var imgs = (p.images || []);
            for (var ii = 0; ii < imgs.length; ii++) {
              var imgUrl = typeof imgs[ii] === 'string' ? imgs[ii] : (imgs[ii].url || '');
              if (imgUrl) ciImages.push({ url: imgUrl, context: p.name });
            }
          });
          if (ciImages.length > 0) {
            log('Analyzing brand CI from ' + ciImages.length + ' images across ' + products.length + ' products...');
            // Send in batches — one batch per product (all images of one product together)
            // This gives Gemini context: "these are all images of the SAME product"
            var allCiResults = [];
            var batchNum = 0;
            for (var pi = 0; pi < products.length; pi++) {
              var pImgs = (products[pi].images || []).map(function(img) {
                var u = typeof img === 'string' ? img : (img.url || '');
                return u ? { url: u, context: products[pi].name } : null;
              }).filter(Boolean);
              if (pImgs.length === 0) continue;
              batchNum++;
              log('   CI: product ' + batchNum + '/' + products.length + ' (' + pImgs.length + ' images) — ' + (products[pi].name || '').slice(0, 40));
              // Retry up to 2 times per product
              for (var attempt = 0; attempt < 2; attempt++) {
                try {
                  var batchCI = await analyzeBrandCI(pImgs, params.brand);
                  if (batchCI && (batchCI.primaryColors || batchCI.visualMood)) {
                    allCiResults.push(batchCI);
                  }
                  break; // success
                } catch (batchErr) {
                  if (attempt === 0) {
                    log('     Retry...');
                    await new Promise(function(r) { setTimeout(r, 2000); });
                  }
                }
              }
              // Brief pause between products to avoid rate limiting
              if (pi < products.length - 1) {
                await new Promise(function(r) { setTimeout(r, 500); });
              }
            }
            // Merge all product CI results into one profile — ALL dimensions, not just colors
            if (allCiResults.length > 0) {
              // Helper: find most common string value across all results for a field
              function ciMostCommon(field) {
                var counts = {};
                allCiResults.forEach(function(r) {
                  var v = r[field];
                  if (v && typeof v === 'string') counts[v] = (counts[v] || 0) + 1;
                });
                var best = ''; var bestN = 0;
                Object.keys(counts).forEach(function(k) { if (counts[k] > bestN) { best = k; bestN = counts[k]; } });
                return best;
              }
              // Helper: merge all unique values from array field
              function ciMergeArray(field) {
                var seen = {}; var out = [];
                allCiResults.forEach(function(r) {
                  (r[field] || []).forEach(function(v) { if (v && !seen[v]) { seen[v] = true; out.push(v); } });
                });
                return out;
              }
              // Filter generic white/black/gray that come from product photo BGs
              function ciIsGenericColor(hex) {
                var c = (hex || '').toLowerCase().replace('#', '');
                if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
                if (c.length !== 6) return true;
                var r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
                var brightness = (r + g + b) / 3, saturation = Math.max(r, g, b) - Math.min(r, g, b);
                if (brightness > 240 && saturation < 15) return true;
                if (brightness < 15 && saturation < 15) return true;
                if (saturation < 10 && brightness > 50 && brightness < 200) return true;
                return false;
              }
              var allColors = {};
              allCiResults.forEach(function(r) {
                (r.primaryColors || []).forEach(function(c) { if (!ciIsGenericColor(c)) allColors[c] = (allColors[c] || 0) + 1; });
                (r.secondaryColors || []).forEach(function(c) { if (!ciIsGenericColor(c)) allColors[c] = (allColors[c] || 0) + 1; });
              });
              var sortedColors = Object.entries(allColors).sort(function(a, b) { return b[1] - a[1]; });
              productCI = {
                primaryColors: sortedColors.slice(0, 6).map(function(e) { return e[0]; }),
                secondaryColors: sortedColors.slice(6, 10).map(function(e) { return e[0]; }),
                backgroundColor: ciMostCommon('backgroundColor'),
                colorVariation: ciMostCommon('colorVariation'),
                typographyStyle: ciMostCommon('typographyStyle'),
                visualMood: ciMostCommon('visualMood'),
                backgroundPattern: ciMostCommon('backgroundPattern'),
                recurringElements: ciMergeArray('recurringElements'),
                photographyStyle: ciMostCommon('photographyStyle'),
                textDensity: ciMostCommon('textDensity'),
                designerNotes: allCiResults.map(function(r) { return r.designerNotes || ''; }).filter(function(n) { return n.length > 10; })[0] || '',
                productsAnalyzed: allCiResults.length,
              };
              log('   CI complete: ' + allCiResults.length + '/' + products.length + ' products analyzed');
              log('   Colors: ' + productCI.primaryColors.join(', '));
              log('   Mood: ' + (productCI.visualMood || '–') + ', Typography: ' + (productCI.typographyStyle || '–'));
              if (productCI.designerNotes) log('   Notes: ' + productCI.designerNotes);
            }
          }
        } catch (ciErr) {
          log('Amazon CI analysis skipped: ' + ciErr.message);
        }
      } else if (userCiSource === 'website') {
        log('CI source: Website only (Amazon listing images skipped per user choice)');
      } else {
        log('CI source: Manual (no automatic CI extraction)');
      }

      // Step 1.5: Crawl & analyze reference stores (if provided)
      var referenceAnalysis = null;
      if (params.referenceStoreUrls && params.referenceStoreUrls.length > 0) {
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

      // ─── Track critical failures for retry prompt ───
      var criticalFailures = [];

      // Step 1.5b: Analyze existing store with Gemini Vision (if provided)
      if (params.existingStoreUrl) {
        var existingStoreRetries = 0;
        var existingStoreSuccess = false;
        while (!existingStoreSuccess && existingStoreRetries < 3) {
          try {
            var modeLabel = (params.existingStoreMode === 'reconceptualize') ? 'NEU KONZIPIEREN' : 'OPTIMIEREN';
            log(existingStoreRetries > 0 ? ('Retrying existing store analysis (attempt ' + (existingStoreRetries + 1) + ')...') : ('Analyzing existing brand store (' + modeLabel + '): ' + params.existingStoreUrl));
            var existingStore = await crawlAndParseStore(params.existingStoreUrl, log);

            // Analyze existing store images with Gemini for CI extraction
            var existingImageAnalyses = [];
            try {
              existingImageAnalyses = await analyzeStoreImagesWithGemini(existingStore, log);
            } catch (e) { log('Existing store image analysis skipped: ' + e.message); }

            var existingContext = formatReferenceStoreContext([existingStore], existingImageAnalyses);
            var storeMode = params.existingStoreMode || 'optimize';
            var existingPrefix;
            if (storeMode === 'reconceptualize') {
              existingPrefix = '\n=== EXISTING BRAND STORE (current store — NEEDS COMPLETE RECONCEPTUALIZATION) ===\n'
                + 'This store is fundamentally underoptimized. DO NOT preserve its structure or layout.\n'
                + 'CREATE a completely new concept from scratch:\n'
                + '- ONLY extract and keep: brand colors, logo, typography, and brand voice/tonality\n'
                + '- IGNORE the existing page structure, navigation hierarchy, and module arrangement\n'
                + '- Design an entirely new storytelling arc, new page structure, new module flow\n'
                + '- Use the reference store best practices to build something significantly better\n'
                + '- The existing store serves ONLY as CI reference, NOT as structural template\n\n';
            } else {
              existingPrefix = '\n=== EXISTING BRAND STORE (current store — OPTIMIZE & EXPAND) ===\n'
                + 'This store has a good foundation. PRESERVE its core structure:\n'
                + (params.keepMenuStructure
                  ? '- CRITICAL: KEEP the EXACT menu/navigation structure (same pages, same hierarchy, same names). Do NOT rename, add, remove, or reorganize pages.\n'
                  : '- You MAY reorganize the navigation/page structure if it improves the store.\n')
                + '- KEEP module arrangements that work well (good flow, clear storytelling)\n'
                + '- IMPROVE content quality: better headlines, stronger CTAs, richer descriptions\n'
                + '- EXPAND with new products (from scraped ASINs) into existing categories\n'
                + '- ADD missing elements: social proof, lifestyle images, benefit sections\n'
                + '- FIX specific weaknesses while maintaining the overall concept\n'
                + '- Match CI exactly: same colors, same image style, same tonality\n\n';
            }
            referenceAnalysis = (referenceAnalysis || '') + existingPrefix + existingContext;
            log('Existing store analyzed: ' + existingStore.pageCount + ' pages, ' + existingStore.summary.totalImages + ' images');
            existingStoreSuccess = true;
          } catch (existErr) {
            existingStoreRetries++;
            if (existingStoreRetries < 3) {
              log('Existing store analysis failed (' + existErr.message + '), retrying in 3s...');
              await new Promise(function(r) { setTimeout(r, 3000); });
            } else {
              log('CRITICAL: Existing store analysis FAILED after 3 attempts: ' + existErr.message);
              criticalFailures.push('Existing store analysis');
            }
          }
        }
      }

      // Step 1.6: Load store knowledge base (from 21 Cowork-analyzed stores)
      try {
        log('Loading store knowledge base (21 analyzed top stores)...');
        var storeKB = await loadStoreKnowledge();
        if (storeKB) {
          var kbContext = formatStoreKnowledge(storeKB);
          referenceAnalysis = (referenceAnalysis || '') + '\n' + kbContext;
          log('Store knowledge base loaded: layout patterns, module flows, design archetypes, insights');
        } else {
          log('Store knowledge base not available');
        }
      } catch (kbErr) {
        log('Store knowledge base skipped: ' + kbErr.message);
      }

      // ─── CRITICAL FAILURE CHECK: Warn user and offer to abort ───
      if (criticalFailures.length > 0) {
        log('');
        log('WARNING: ' + criticalFailures.length + ' data sources failed: ' + criticalFailures.join(', '));
        log('The store will be generated with INCOMPLETE data. Quality may be reduced.');
        log('To retry: close this dialog, fix the issue, and re-generate.');
        log('');
      }

      // Step 1.8: Log selected extra pages
      var selectedExtraPages = params.extraPages || {};
      var activeExtras = Object.keys(selectedExtraPages).filter(function(k) { return selectedExtraPages[k]; });
      if (activeExtras.length > 0) {
        log('Extra subpages: ' + activeExtras.join(', '));
      }

      // Website data is always used for CI extraction when available
      var enhancedWebsiteData = params.websiteData || null;

      // Merge CI data based on user's ciSource selection
      if (productCI) {
        if (!enhancedWebsiteData) enhancedWebsiteData = {};
        enhancedWebsiteData.productCI = productCI;
      }
      if (userCiSource === 'amazon' && productCI) {
        // Amazon-only: use Amazon CI colors, ignore website colors
        if (!enhancedWebsiteData) enhancedWebsiteData = {};
        enhancedWebsiteData.colors = (productCI.primaryColors || []).concat(productCI.secondaryColors || []);
        log('CI priority: Amazon listing images (website colors ignored)');
      } else if (userCiSource === 'website') {
        // Website-only: keep website colors, don't override with Amazon
        log('CI priority: Website (Amazon CI available for reference only)');
      } else if (userCiSource === 'auto' && productCI) {
        // Auto: Amazon CI takes priority for colors if website has none
        if (!enhancedWebsiteData) enhancedWebsiteData = {};
        if ((!enhancedWebsiteData.colors || enhancedWebsiteData.colors.length === 0) && productCI.primaryColors) {
          enhancedWebsiteData.colors = productCI.primaryColors.concat(productCI.secondaryColors || []);
        }
        log('CI priority: Auto (Amazon + Website combined)');
      } else if (userCiSource === 'manual') {
        log('CI priority: Manual (user will set CI in CI tab)');
      }

      function checkCancel() {
        if (genCancelRef.current) throw new Error('CANCELLED');
      }

      // ═══════════════════════════════════════════════════
      // NEW PIPELINE: Sequential analysis steps
      // Each step MUST succeed before the next one starts.
      // Up to 3 retries per step. If a step fails after 3
      // attempts, generation STOPS — no fallback, no skip.
      // ═══════════════════════════════════════════════════

      async function runPipelineStep(stepName, fn) {
        var maxRetries = 3;
        for (var attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 1) log('   Retry ' + attempt + '/' + maxRetries + '...');
            var result = await fn();
            if (!result) throw new Error('Empty result');
            return result;
          } catch (err) {
            if (attempt < maxRetries) {
              log('   ' + stepName + ' failed: ' + err.message + ' — retrying in 3s...');
              await new Promise(function(r) { setTimeout(r, 3000); });
            } else {
              log('');
              log('ERROR: ' + stepName + ' failed after ' + maxRetries + ' attempts: ' + err.message);
              log('Generation stopped. Fix the issue and try again.');
              throw new Error(stepName + ' failed: ' + err.message);
            }
          }
        }
      }

      // Enrich website data with user-provided brand assets
      if (params.logoFile || params.fontNames || params.brandColors) {
        if (!enhancedWebsiteData) enhancedWebsiteData = {};
        if (params.logoFile) enhancedWebsiteData.logoDataUrl = params.logoFile;
        if (params.fontNames) enhancedWebsiteData.userFonts = params.fontNames;
        if (params.brandColors) {
          var userColors = params.brandColors.split(/[,;\s]+/).filter(function(c) { return c.match(/^#[0-9a-fA-F]{3,8}$/); });
          if (userColors.length > 0) {
            enhancedWebsiteData.colors = userColors;
            log('User-provided brand colors: ' + userColors.join(', '));
          }
        }
      }

      // ═══════════════════════════════════════════════════
      // CONTENT-FIRST PIPELINE v2
      // Small, focused API calls. No mega-prompts.
      // Every step: one focused question, one focused answer.
      // All results accumulated and stored.
      // ═══════════════════════════════════════════════════

      // ─── PHASE 1: ANALYZE EACH PRODUCT INDIVIDUALLY ───
      log('');
      log('═══ PHASE 1: PRODUKT-ANALYSE (einzeln) ═══');
      var allProductAnalyses = [];
      for (var pi = 0; pi < products.length; pi++) {
        checkCancel();
        var p = products[pi];
        log('   Product ' + (pi + 1) + '/' + products.length + ': ' + (p.name || '').slice(0, 50));
        try {
          var pa = await analyzeOneProduct(p);
          pa.asin = p.asin;
          pa.name = p.name;
          allProductAnalyses.push(pa);
        } catch (paErr) {
          log('     Failed: ' + paErr.message + ' — skipping');
          allProductAnalyses.push({ asin: p.asin, name: p.name, productCategory: 'Uncategorized', keyBenefits: [], shortHeadline: p.name, shortDescription: '' });
        }
        // Brief pause to avoid rate limiting
        if (pi < products.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
      }
      log('   ' + allProductAnalyses.length + ' products analyzed');

      checkCancel();

      // ─── PHASE 1.5: GROUP INTO CATEGORIES ───
      log('');
      log('═══ PHASE 1.5: KATEGORISIERUNG ═══');
      var categories = await runPipelineStep('Kategorisierung', function() {
        return groupIntoCategories(allProductAnalyses, params.brand, lang);
      });
      (categories.categories || []).forEach(function(c) {
        log('   ' + c.name + ': ' + (c.asins || []).length + ' products');
      });

      checkCancel();

      // ─── PHASE 2: ANALYZE WEBSITE PAGES INDIVIDUALLY ───
      log('');
      log('═══ PHASE 2: WEBSITE-ANALYSE (pro Seite) ═══');
      var allWebsiteAnalyses = [];
      if (enhancedWebsiteData && enhancedWebsiteData.rawTextSections && enhancedWebsiteData.rawTextSections.length > 0) {
        for (var wi = 0; wi < enhancedWebsiteData.rawTextSections.length; wi++) {
          checkCancel();
          var section = enhancedWebsiteData.rawTextSections[wi];
          var pageText = section.text || '';
          if (pageText.length < 50) continue;
          log('   Page ' + (wi + 1) + '/' + enhancedWebsiteData.rawTextSections.length + ' (' + section.source + ')');
          try {
            var wa = await analyzeWebsitePage(pageText, section.source, params.brand);
            allWebsiteAnalyses.push(wa);
          } catch (waErr) {
            log('     Failed: ' + waErr.message);
          }
          if (wi < enhancedWebsiteData.rawTextSections.length - 1) await new Promise(function(r) { setTimeout(r, 300); });
        }
      } else {
        log('   No website data available — using product data only');
      }
      log('   ' + allWebsiteAnalyses.length + ' website pages analyzed');

      checkCancel();

      // ─── PHASE 2.5: BRAND VOICE ───
      log('');
      log('═══ PHASE 2.5: BRAND VOICE ═══');
      var websiteTexts = enhancedWebsiteData ? (enhancedWebsiteData.aboutText || enhancedWebsiteData.rawTextContent || '') : '';
      var pipelineBrandVoice = await runPipelineStep('Brand Voice', function() {
        return analyzeBrandVoice(products, params.brand, websiteTexts, params.brandToneExamples || '');
      });
      log('   Tone: ' + (pipelineBrandVoice.tone || '?'));

      checkCancel();

      // ─── PHASE 3: SYNTHESIZE BRAND PROFILE ───
      log('');
      log('═══ PHASE 3: BRAND PROFILE ═══');
      var brandProfile = await runPipelineStep('Brand Profile', function() {
        return synthesizeBrandProfile(allProductAnalyses, allWebsiteAnalyses, categories, pipelineBrandVoice, params.brand, lang);
      });
      log('   USPs: ' + (brandProfile.usps || []).length);
      log('   Brand Story: ' + (brandProfile.brandStory && brandProfile.brandStory.available ? 'yes' : 'no'));
      log('   Trust: ' + (brandProfile.trustElements || []).length);

      checkCancel();

      // ─── PHASE 4: PLAN PAGES ───
      log('');
      log('═══ PHASE 4: SEITENPLANUNG ═══');
      var storeKnowledgeStr = null;
      try { var kb = await loadStoreKnowledge(); if (kb) storeKnowledgeStr = formatStoreKnowledge(kb); } catch(e) {}
      var pagePlan = await runPipelineStep('Seitenplanung', function() {
        return planPages(brandProfile, categories, allProductAnalyses, storeKnowledgeStr, params.brand, lang, selectedExtraPages);
      });
      (pagePlan.pages || []).forEach(function(pg) {
        log('   ' + pg.name + ': ' + (pg.sections || []).length + ' sections');
      });

      checkCancel();

      // ─── PHASE 5: GENERATE EACH PAGE ───
      log('');
      log('═══ PHASE 5: SEITEN GENERIEREN (einzeln) ═══');
      var generatedPages = [];
      var plannedPages = pagePlan.pages || [];
      for (var gi = 0; gi < plannedPages.length; gi++) {
        checkCancel();
        var pp = plannedPages[gi];
        log('   Page ' + (gi + 1) + '/' + plannedPages.length + ': ' + pp.name);
        try {
          var pageResult = await generateOnePage(pp, brandProfile, categories, allProductAnalyses, params.brand, lang, generatedPages, storeKnowledgeStr);
          var pageObj = {
            id: pp.id || ('page-' + gi),
            name: pp.name,
            sections: pageResult.sections || [],
            heroBannerBrief: pageResult.heroBannerBrief || '',
            heroBannerTextOverlay: pageResult.heroBannerTextOverlay || '',
          };
          generatedPages.push(pageObj);
          log('     ' + (pageResult.sections || []).length + ' sections generated');
        } catch (pgErr) {
          log('     FAILED: ' + pgErr.message);
          generatedPages.push({ id: pp.id || ('page-' + gi), name: pp.name, sections: [] });
        }
        if (gi < plannedPages.length - 1) await new Promise(function(r) { setTimeout(r, 1000); });
      }

      checkCancel();

      // ─── BUILD FINAL STORE ───
      log('');
      log('═══ PHASE 6: ZUSAMMENBAU ═══');

      var storeData = {
        brandName: params.brand,
        marketplace: params.marketplace,
        brandTone: pipelineBrandVoice.tone || 'professional',
        heroMessage: brandProfile.heroBannerConcept ? brandProfile.heroBannerConcept.headline : params.brand,
        brandStory: brandProfile.brandStory ? brandProfile.brandStory.text : '',
        keyFeatures: (brandProfile.usps || []).map(function(u) { return u.text; }),
        products: products,
        pages: generatedPages,
        asins: params.asins,
        // Pipeline data
        contentPool: brandProfile,
        categories: categories,
        productAnalyses: allProductAnalyses,
        websiteAnalyses: allWebsiteAnalyses,
        pipelineBrandVoice: pipelineBrandVoice,
        // For wireframe generation access
        analysis: {
          brandTone: pipelineBrandVoice.tone || 'professional',
          brandStory: brandProfile.brandStory ? brandProfile.brandStory.text : '',
          keyFeatures: (brandProfile.usps || []).map(function(u) { return u.text; }),
          productCI: productCI,
          pipelineBrandVoice: pipelineBrandVoice,
        },
      };

      // Store meta
      storeData.complexity = params.complexity;
      if (productCI) storeData.productCI = productCI;
      storeData.ciSource = userCiSource;
      if (enhancedWebsiteData) storeData.websiteData = enhancedWebsiteData;

      // ═══ PHASE 7: VALIDATION ═══
      log('');
      log('═══ PHASE 7: VALIDIERUNG ═══');
      var validation = validateStoreQuality(storeData, params.asins, lang);
      if (validation.issues.length > 0) {
        validation.issues.forEach(function(i) {
          log('   ' + i.severity.toUpperCase() + ': ' + i.type + (i.page ? ' on ' + i.page : '') + (i.count ? ' (' + i.count + ')' : ''));
        });
      } else {
        log('   All checks passed.');
      }
      storeData.validation = validation;

      setStore(storeData);
      setCurPage(storeData.pages[0] ? storeData.pages[0].id : '');
      log('');
      log('Store complete! ' + storeData.pages.length + ' pages, ' + products.length + ' products.');

      // (Old generateStore() pipeline removed — replaced by Content-First v2 above)
    } catch (e) {
      if (e.message === 'CANCELLED') {
        log('');
        log('Generierung abgebrochen.');
        log('Bereits generierte Seiten bleiben erhalten.');
      } else {
        log('');
        log('ERROR: ' + e.message);
        if (e.message.indexOf('timed out') >= 0) {
          log('The request timed out. Try again with fewer ASINs or choose a lower complexity level.');
        } else if (e.message.indexOf('fetch') >= 0 || e.message.indexOf('network') >= 0 || e.message.indexOf('Failed to fetch') >= 0) {
          log('Network error — check your internet connection and try again.');
        } else if (e.message.indexOf('API error') >= 0 || e.message.indexOf('529') >= 0 || e.message.indexOf('overload') >= 0) {
          log('The AI service is temporarily overloaded. Please wait a minute and try again.');
        }
      }
    } finally {
      clearInterval(keepAlive);
      setGenDone(true);
      // NEVER auto-close the modal. User must click OK or Close.
    }
  };

  var lastGenParams = useRef(null);

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
  var selLayoutType = null;
  var selHeroBanner = false;
  if (sel && sel.sid === '__heroBanner__' && page) {
    selHeroBanner = true;
  } else if (sel && page) {
    var sec = page.sections.find(function(s) { return s.id === sel.sid; });
    selTile = sec ? (sec.tiles[sel.ti] || null) : null;
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

  // Load any unfinished wizard checkpoints so the user can resume
  useEffect(function() {
    fetch('/api/wizard-state').then(function(r) { return r.ok ? r.json() : null; }).then(function(json) {
      if (json && json.items) setActiveCheckpoints(json.items);
    }).catch(function() { /* ignore */ });
  }, [showWizard]);

  // Wizard completion: install generated store into the editor
  var handleWizardComplete = useCallback(function(storeObj) {
    if (!storeObj || !storeObj.pages) return;
    setStore(storeObj);
    setCurPage(storeObj.pages[0] ? storeObj.pages[0].id : '');
    setSel(null);
  }, []);

  return (
    <div className="app-root">
      <Topbar
        store={store}
        onGenerate={function() { setResumeWizardId(null); setShowWizard(true); }}
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
          viewMode={viewMode}
          onHeaderBannerUpload={handleHeaderBannerUpload}
          headerBannerColor={store.headerBannerColor || ''}
          onHeaderBannerColorChange={function(color) { setStoreWithUndo(function(s) { return Object.assign({}, s, { headerBannerColor: color }); }); }}
          products={store.products}
          uiLang={uiLang}
          hasAutoSave={hasAutoSave}
          onLoadAutoSave={handleLoadAutoSave}
          onGenerate={function() { setResumeWizardId(null); setShowWizard(true); }}
          onGenerateWireframes={handleGenerateWireframes}
          onDeleteWireframes={handleDeleteWireframes}
          onStopWireframes={handleStopWireframes}
          wfGenerating={wfGenerating}
          wfProgress={wfProgress}
        />

        <PropertiesPanel
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

      {showWizard && (
        <GenerationWizard
          resumeId={resumeWizardId}
          onComplete={function(storeObj) { handleWizardComplete(storeObj); setShowWizard(false); setResumeWizardId(null); }}
          onCancel={function() { setShowWizard(false); setResumeWizardId(null); }}
        />
      )}

      {/* Resume checkpoint banner — shown on the empty-state canvas only */}
      {!showWizard && !store.pages.length && activeCheckpoints.length > 0 && (
        <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#fff', border: '1px solid #FF9900', borderRadius: 10, padding: 14, boxShadow: '0 10px 30px rgba(0,0,0,.15)', maxWidth: 360, zIndex: 40 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, color: '#0f172a' }}>Unfertige Generierungen</div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>Du hast {activeCheckpoints.length} Wizard-Lauf{activeCheckpoints.length === 1 ? '' : 'e'}, der unterbrochen wurde. An welcher Stelle weitermachen?</div>
          {activeCheckpoints.slice(0, 4).map(function(cp) {
            return (
              <button key={cp.id} className="btn" style={{ display: 'block', width: '100%', fontSize: 11, marginBottom: 4, textAlign: 'left' }} onClick={function() { setResumeWizardId(cp.id); setShowWizard(true); }}>
                {cp.brandName || '(Ohne Namen)'} — Schritt {cp.step + 1}
              </button>
            );
          })}
        </div>
      )}

      {generating && (
        <ProgressModal
          logs={genLog}
          done={genDone}
          uiLang={uiLang}
          onClose={function() { setGenerating(false); }}
          onRetry={lastGenParams.current ? function() { handleGenerate(lastGenParams.current); } : null}
          onStop={function() { genCancelRef.current = true; log('Abbrechen angefordert — warte auf laufenden Schritt...'); }}
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
                    sections.push({ id: uid(), layoutId: '1', tiles: [{ type: 'product_grid', asins: [asin], brief: '', textOverlay: '', ctaText: '', dimensions: { w: 3000, h: 1200 }, mobileDimensions: { w: 1680, h: 1200 } }] });
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
