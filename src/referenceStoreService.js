// ─── REFERENCE STORE CRAWLING & ANALYSIS ORCHESTRATION ───
// Handles the complete flow: crawl pages → parse HTML → analyze images → AI analysis
// Used for both per-project references and knowledge base building.

import { crawlBrandStorePage, analyzeStoreImages } from './api';

// ─── LOAD STORE KNOWLEDGE BASE (from Cowork analysis of 21 stores) ───
// Returns a formatted string with cross-store insights for use in generation prompts.
// This is the PRIMARY source of store-building knowledge.
var _knowledgeCache = null;
export async function loadStoreKnowledge() {
  if (_knowledgeCache) return _knowledgeCache;
  try {
    var resp = await fetch('/data/store-knowledge.json');
    if (!resp.ok) return null;
    var data = await resp.json();
    _knowledgeCache = data;
    return data;
  } catch (e) { return null; }
}

// ─── LOAD DEEP BLUEPRINTS (the 20 individual deep-analyzed stores) ───
// Each blueprint is a rich structural skeleton: pages × modules × tiles
// with layoutIds, designRationale, imageCategory, and storeAnalysis patterns.
// This replaces the old "text dump" store-knowledge approach — blueprints
// are now used STRUCTURALLY to inform page planning and module cadence.
var _blueprintCache = null;
export async function loadBlueprints() {
  if (_blueprintCache) return _blueprintCache;
  try {
    var kb = await loadStoreKnowledge();
    if (!kb || !kb.storeIndex) return null;
    var blueprints = [];
    for (var i = 0; i < kb.storeIndex.length; i++) {
      var entry = kb.storeIndex[i];
      try {
        var resp = await fetch('/data/store-knowledge/' + entry.file);
        if (!resp.ok) continue;
        var bp = await resp.json();
        blueprints.push(bp);
      } catch (e) { /* skip failing blueprint */ }
    }
    _blueprintCache = blueprints;
    return blueprints;
  } catch (e) { return null; }
}

// ─── MATCH BLUEPRINTS to a brand intelligence profile ───
// Pure scoring function. Ranks the 20 deep analyses by fit to this brand's
// tone, visual mood, and product count. Returns top N compact blueprints
// that planPages and generateOnePage use as structural inspiration.
export function matchBlueprints(blueprints, brandIntelligence, productCount, topN) {
  if (!blueprints || blueprints.length === 0) return [];
  var n = topN || 3;
  var v = (brandIntelligence && brandIntelligence.visual) || {};
  var voice = (brandIntelligence && brandIntelligence.voice) || {};

  // Build a match signature from the brand
  var brandMoodText = [v.visualMood, v.photographyStyle, v.designerNotes, (voice.toneDescriptors || []).join(' ')].join(' ').toLowerCase();

  // Product-count band: 1-3 / 4-8 / 9-20 / 21+
  function pageBandForProducts(n) {
    if (n <= 3) return [2, 3];
    if (n <= 8) return [3, 4];
    if (n <= 20) return [4, 6];
    return [5, 10];
  }
  var targetPageBand = pageBandForProducts(productCount || 0);

  function score(bp) {
    var sa = bp.storeAnalysis || {};
    var ciText = (sa.ciSummary || '').toLowerCase();
    var s = 0;
    // Mood overlap: score tokens that appear in both
    var brandTokens = brandMoodText.split(/[^\wäöüß]+/).filter(function(w) { return w.length > 4; });
    brandTokens.forEach(function(t) {
      if (ciText.indexOf(t) >= 0) s += 2;
    });
    // Page count proximity
    var pc = sa.totalPages || (bp.pages || []).length;
    if (pc >= targetPageBand[0] && pc <= targetPageBand[1]) s += 4;
    else if (Math.abs(pc - ((targetPageBand[0] + targetPageBand[1]) / 2)) <= 2) s += 2;
    // Image category alignment (lifestyle-heavy brands should match lifestyle-heavy stores)
    var dominantCats = sa.dominantImageCategories || [];
    if (brandMoodText.indexOf('lifestyle') >= 0 && dominantCats.indexOf('lifestyle') >= 0) s += 2;
    if (brandMoodText.indexOf('creative') >= 0 && dominantCats.indexOf('creative') >= 0) s += 2;
    if (brandMoodText.indexOf('produkt') >= 0 && dominantCats.indexOf('product') >= 0) s += 2;
    return s;
  }

  var scored = blueprints.map(function(bp) { return { bp: bp, score: score(bp) }; });
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, n).map(function(x) { return x.bp; });
}

// ─── FORMAT BLUEPRINTS for prompt injection ───
// Compact structural view — page by page, module cadence, design rationale.
// This is what planPages and generateOnePage actually inject into their prompts.
export function formatBlueprintsForPrompt(blueprints) {
  if (!blueprints || blueprints.length === 0) return '';
  var parts = [];
  parts.push('=== STRUCTURAL BLUEPRINTS (best-matching reference stores) ===');
  parts.push('Use these as STRUCTURAL inspiration — page count, module cadence, layout rhythm.');
  parts.push('Do NOT copy content. Do NOT copy brand voice. Only structure and module flow.');
  parts.push('');
  blueprints.forEach(function(bp, bi) {
    var sa = bp.storeAnalysis || {};
    parts.push('─── BLUEPRINT ' + (bi + 1) + ': ' + bp.brandName + ' ───');
    parts.push('  Pages: ' + ((bp.pages || []).length) + ' | Modules total: ' + (sa.totalModules || '?'));
    if (sa.dominantLayouts) parts.push('  Dominant layouts: ' + (Array.isArray(sa.dominantLayouts) ? sa.dominantLayouts.slice(0, 4).join(' | ') : ''));
    if (sa.dominantImageCategories) parts.push('  Dominant image categories: ' + sa.dominantImageCategories.join(', '));
    if (sa.modulePatterns && sa.modulePatterns.length) {
      parts.push('  Module patterns:');
      sa.modulePatterns.slice(0, 5).forEach(function(p) { parts.push('    - ' + p); });
    }
    if (sa.crossPageConsistency) parts.push('  Cross-page consistency: ' + sa.crossPageConsistency.slice(0, 220));
    // Per-page module cadence
    (bp.pages || []).forEach(function(p) {
      var modules = p.modules || [];
      if (modules.length === 0) return;
      var cadence = modules.map(function(m) {
        var imgCat = '';
        if (m.tiles && m.tiles[0] && m.tiles[0].imageCategory) imgCat = '/' + m.tiles[0].imageCategory;
        return (m.layoutId || m.layoutType || '?') + imgCat;
      }).join(' → ');
      parts.push('  "' + (p.pageName || 'page') + '": ' + cadence);
    });
    parts.push('');
  });
  parts.push('=== END BLUEPRINTS ===');
  return parts.join('\n');
}

export function formatStoreKnowledge(kb) {
  if (!kb) return '';
  var parts = [];

  parts.push('=== REFERENCE STORE INSIGHTS (for layout/section selection only) ===');
  parts.push('These insights come from 21 analyzed top Amazon Brand Stores.');
  parts.push('Use them to decide HOW to present content (which section type, which layout),');
  parts.push('NOT to decide WHAT content to show. Content comes from the Content Pool.');
  parts.push('NOTE: Terminology: sections contain tiles, pages contain sections.');
  parts.push('A section contains tiles. A page contains sections.');
  parts.push('');

  // Section 1: USP Presentation
  var lp = kb.layoutPatterns || {};
  parts.push('USP PRESENTATION in successful stores:');
  parts.push('- 95% use Full-Width hero banner as first element');
  parts.push('- 70% follow with a USP/trust bar (narrow full-width banner with 3-4 icons)');
  if (lp.mostUsedLayouts) {
    lp.mostUsedLayouts.slice(0, 3).forEach(function(l) {
      if (typeof l === 'object') parts.push('- ' + (l.layout || l.name || '') + ': ' + (l.usage || l.purpose || ''));
    });
  }
  parts.push('');

  // Section 2: Category Navigation
  parts.push('CATEGORY NAVIGATION in successful stores:');
  parts.push('- std-2equal (2 equal tiles) used by 70% for category pairs');
  parts.push('- For 3+ categories: 1-1-1 or grid layouts');
  parts.push('- Category tiles typically: image with text overlay + CTA');
  parts.push('');

  // Section 3: Hero Strategies
  var hp = kb.heroPatterns || {};
  if (hp.contentStrategies) {
    parts.push('HERO STRATEGIES:');
    hp.contentStrategies.forEach(function(s) {
      if (typeof s === 'object') parts.push('- ' + (s.strategy || '') + ': ' + (s.effectiveness || ''));
    });
    parts.push('');
  }

  // Section 4: Module Flow
  var mf = kb.moduleFlowPatterns || {};
  if (mf.patterns) {
    parts.push('PAGE FLOW PATTERNS:');
    mf.patterns.slice(0, 3).forEach(function(p) {
      if (typeof p === 'object') parts.push('- ' + (p.name || '') + ': ' + (p.structure || ''));
    });
    parts.push('');
  }

  parts.push('=== END REFERENCE STORE INSIGHTS ===');
  return parts.join('\n');
}
import { parseBrandStoreHTML, combineStorePages } from './brandStoreParser';

var DELAY_BETWEEN_PAGES = 2000; // 2s between subpage crawls to avoid rate limiting
var MAX_SUBPAGES = 40; // Safety limit per store
var MAX_IMAGES_FOR_ANALYSIS = 20; // Max images to send to Gemini per store

function delay(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

// ─── SAFE JSON FETCH: Validates Content-Type before parsing ───
async function fetchJSON(url) {
  var resp = await fetch(url);
  if (!resp.ok) throw new Error('HTTP ' + resp.status + ' for ' + url);
  var ct = resp.headers.get('content-type') || '';
  if (ct.indexOf('application/json') < 0 && ct.indexOf('text/json') < 0) {
    // Some servers serve .json files as text/plain — allow that but reject text/html
    if (ct.indexOf('text/html') >= 0) {
      throw new Error('Server returned HTML instead of JSON for ' + url + '. Check that the file exists and is deployed correctly.');
    }
  }
  return resp.json();
}

// ─── CRAWL & PARSE A SINGLE BRAND STORE (ALL PAGES) ───
export async function crawlAndParseStore(storeUrl, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Step 1: Crawl the main page
  log('Crawling main page: ' + shortenUrl(storeUrl));
  var mainResult = await crawlBrandStorePage(storeUrl);
  log('  HTML size: ' + mainResult.html.length + ' chars');
  var mainPage = parseBrandStoreHTML(mainResult.html, storeUrl);
  log('  Brand: ' + mainPage.brandName);
  log('  Navigation: ' + mainPage.navigation.length + ' subpages');
  log('  Modules: ' + mainPage.modules.length + ' (' + mainPage.modules.map(function(m) { return m.tileCount + ' tiles/' + m.source; }).join(', ') + ')');
  log('  Images: ' + mainPage.images.length + ' unique');
  log('  Hero: ' + (mainPage.heroImage ? 'yes' : 'no'));

  if (cancelRef && cancelRef.current) return combineStorePages([mainPage]);

  var allPages = [mainPage];

  // Step 2: Crawl subpages
  var subpages = mainPage.navigation.filter(function(nav) {
    // Skip the current page (homepage)
    return nav.pageId && nav.url !== storeUrl && nav.url.indexOf(extractPageId(storeUrl)) < 0;
  }).slice(0, MAX_SUBPAGES);

  for (var i = 0; i < subpages.length; i++) {
    if (cancelRef && cancelRef.current) break;

    var sub = subpages[i];
    log('Crawling subpage ' + (i + 1) + '/' + subpages.length + ': ' + (sub.name || sub.pageId.slice(0, 8)));

    try {
      await delay(DELAY_BETWEEN_PAGES);
      if (cancelRef && cancelRef.current) break;
      var subResult = await crawlBrandStorePage(sub.url);
      var subPage = parseBrandStoreHTML(subResult.html, sub.url);
      subPage.pageName = sub.name;
      allPages.push(subPage);
      log('  → ' + subPage.modules.length + ' modules (' + subPage.modules.map(function(m) { return m.tileCount + 't/' + m.source; }).join(', ') + '), ' + subPage.images.length + ' images');
    } catch (err) {
      log('  → Failed: ' + err.message);
    }
  }

  // Step 3: Combine all pages
  var combined = combineStorePages(allPages);
  log('Store analysis complete: ' + combined.pageCount + ' pages, ' + combined.summary.totalImages + ' images, ' + combined.summary.totalModules + ' modules');

  return combined;
}

// ─── CRAWL MULTIPLE REFERENCE STORES ───
export async function crawlMultipleStores(urls, onProgress) {
  var log = onProgress || function() {};
  var stores = [];

  for (var i = 0; i < urls.length; i++) {
    log('');
    log('━━━ Reference Store ' + (i + 1) + '/' + urls.length + ' ━━━');
    try {
      var store = await crawlAndParseStore(urls[i], log);
      stores.push(store);
    } catch (err) {
      log('ERROR crawling store: ' + err.message);
      // Continue with other stores
    }
  }

  return stores;
}

// ─── ANALYZE STORE IMAGES WITH GEMINI ───
export async function analyzeStoreImagesWithGemini(store, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Select the most relevant images (only store-designed images with al- pattern)
  var images = store.allImages
    .filter(function(img) { return img.url && img.url.indexOf('/images/S/al-') >= 0; })
    .slice(0, MAX_IMAGES_FOR_ANALYSIS)
    .map(function(img) {
      return {
        url: img.url,
        context: 'Brand: ' + store.brandName + ', Page: ' + (img.page || 'homepage'),
      };
    });

  if (images.length === 0) {
    log('No store-designed images found for Gemini analysis');
    return [];
  }

  log('Analyzing ' + images.length + ' images with Gemini Vision...');

  // Send in batches of 5
  var batchSize = 5;
  var allResults = [];

  for (var i = 0; i < images.length; i += batchSize) {
    if (cancelRef && cancelRef.current) break;

    var batch = images.slice(i, i + batchSize);
    log('  Image batch ' + (Math.floor(i / batchSize) + 1) + '/' + Math.ceil(images.length / batchSize) + '...');

    try {
      var result = await analyzeStoreImages(batch);
      allResults = allResults.concat(result.analyses || []);
    } catch (err) {
      log('  → Batch failed: ' + err.message);
    }
  }

  log('Image analysis complete: ' + allResults.length + ' images analyzed');
  return allResults;
}

// ─── LOAD STATIC REFERENCE DATA FROM _summary.json ───
export async function loadStaticReferenceData(category) {
  try {
    var fullData = await fetchJSON('/data/reference-stores/_summary.json');
    if (!fullData) return null;

    var parts = [];

    // 1. What makes great stores at different tiers
    parts.push('=== TIER PATTERNS FOR THIS CATEGORY ===');
    if (fullData.whatMakesGreatStores) {
      parts.push('\nTier 5 (Best Practices):');
      if (fullData.whatMakesGreatStores.tier5Patterns) {
        fullData.whatMakesGreatStores.tier5Patterns.forEach(function(pattern) {
          parts.push('  • ' + pattern);
        });
      }

      parts.push('\nTier 4 (Good Practices):');
      if (fullData.whatMakesGreatStores.tier4Patterns) {
        fullData.whatMakesGreatStores.tier4Patterns.forEach(function(pattern) {
          parts.push('  • ' + pattern);
        });
      }

      parts.push('\nCommon Weaknesses to Avoid:');
      if (fullData.whatMakesGreatStores.commonWeaknesses) {
        fullData.whatMakesGreatStores.commonWeaknesses.forEach(function(weakness) {
          parts.push('  • ' + weakness);
        });
      }
    }

    // 2. Layout combinations
    parts.push('\n=== RECOMMENDED LAYOUT COMBINATIONS ===');
    if (fullData.layoutUsagePatterns) {
      parts.push('\nMost Used Layouts:');
      if (fullData.layoutUsagePatterns.mostUsedLayouts) {
        fullData.layoutUsagePatterns.mostUsedLayouts.slice(0, 4).forEach(function(layout) {
          parts.push('  • ' + layout.name + ' (' + layout.layoutId + '): ' + layout.bestFor);
          if (layout.examples && layout.examples.length > 0) {
            parts.push('    Examples: ' + layout.examples.join(', '));
          }
        });
      }

      parts.push('\nLayout Flow Patterns:');
      if (fullData.layoutUsagePatterns.layoutCombinations) {
        var combos = fullData.layoutUsagePatterns.layoutCombinations;
        ['storytelling', 'katalog', 'premium', 'minimal'].forEach(function(key) {
          if (combos[key]) {
            parts.push('  ' + key.charAt(0).toUpperCase() + key.slice(1) + ': ' + combos[key]);
          }
        });
      }
    }

    // 3. Color Palette
    parts.push('\n=== COLOR PALETTE & VISUAL CONCEPTS ===');
    if (fullData.imageStrategies) {
      parts.push('\nLifestyle vs Product Balance:');
      if (fullData.imageStrategies.lifestyleVsProduct) {
        var ratio = fullData.imageStrategies.lifestyleVsProduct;
        parts.push('  Tier 5: ' + ratio.tier5);
        parts.push('  Tier 4: ' + ratio.tier4);
        parts.push('  Tier 3: ' + ratio.tier3);
      }

      parts.push('\nIMPORTANT: Color palettes are ALWAYS brand-specific, never category-based.');
      parts.push('Derive colors from the client\'s existing CI, website, or logo.');
      if (fullData.imageStrategies.colorPaletteNote) {
        parts.push('  ' + fullData.imageStrategies.colorPaletteNote);
      }

      parts.push('\nUnique Visual Concepts (Differentiation):');
      if (fullData.imageStrategies.uniqueVisualConcepts) {
        fullData.imageStrategies.uniqueVisualConcepts.slice(0, 3).forEach(function(concept) {
          parts.push('  • ' + concept.brand + ': ' + concept.concept);
          parts.push('    Impact: ' + concept.impact);
        });
      }

      parts.push('\nHero Image Patterns:');
      if (fullData.imageStrategies.heroImagePatterns) {
        fullData.imageStrategies.heroImagePatterns.forEach(function(pattern) {
          parts.push('  • ' + pattern);
        });
      }
    }

    // 4. Copywriting Patterns
    parts.push('\n=== COPYWRITING PATTERNS ===');
    if (fullData.copywritingPatterns) {
      parts.push('\nClaim Styles:');
      if (fullData.copywritingPatterns.claimStyles) {
        var claims = fullData.copywritingPatterns.claimStyles;
        Object.keys(claims).forEach(function(style) {
          parts.push('  ' + style + ': ' + (claims[style].length > 0 ? claims[style][0] : ''));
        });
      }

      parts.push('\nHeadline Patterns:');
      if (fullData.copywritingPatterns.headlinePatterns) {
        var headlines = fullData.copywritingPatterns.headlinePatterns;
        Object.keys(headlines).forEach(function(pattern) {
          var examples = headlines[pattern];
          if (examples && examples.length > 0) {
            parts.push('  ' + pattern + ': ' + examples[0]);
          }
        });
      }

      parts.push('\nCTA Patterns:');
      if (fullData.copywritingPatterns.ctaPatterns) {
        var ctas = fullData.copywritingPatterns.ctaPatterns;
        parts.push('  Standard: ' + (ctas.standard ? ctas.standard.slice(0, 2).join(' | ') : ''));
        if (ctas.arrow_style && ctas.arrow_style.length > 0) {
          parts.push('  Arrow Style: ' + ctas.arrow_style[0]);
        }
      }

      parts.push('\nTonality: Always derived from the brand\'s own voice and positioning, not from the category.');
    }

    // 5. CI Implementation
    parts.push('\n=== BRAND IDENTITY IMPLEMENTATION ===');
    if (fullData.ciImplementationPatterns) {
      parts.push('\nConsistency Levels:');
      var levels = fullData.ciImplementationPatterns.consistencyLevels;
      Object.keys(levels).forEach(function(key) {
        var level = levels[key];
        parts.push('  Score ' + level.score + ' (' + key + '): ' + level.pattern);
      });

      if (fullData.ciImplementationPatterns.brandingElements) {
        var elements = fullData.ciImplementationPatterns.brandingElements;
        parts.push('\nKey Branding Elements:');
        parts.push('  Color System: ' + elements.color_system);
        parts.push('  Logo Placement: ' + elements.logo_placement);
        parts.push('  Photography Style: ' + elements.photography_style);
      }
    }

    // 6. Conversion & Social Proof
    parts.push('\n=== CONVERSION & SOCIAL PROOF ELEMENTS ===');
    if (fullData.conversionElementPatterns) {
      var conversion = fullData.conversionElementPatterns;
      if (conversion.socialProof) {
        parts.push('\nSocial Proof Examples:');
        parts.push('  Test Seals: ' + (conversion.socialProof.testsiegel ? conversion.socialProof.testsiegel.slice(0, 2).join(', ') : 'N/A'));
        parts.push('  Numbered Proof: ' + (conversion.socialProof.zahlen ? conversion.socialProof.zahlen[0] : 'Use numbers like 70+, 20M+'));
      }
      if (conversion.ctaPlacement) {
        parts.push('\nCTA Placement Best Practice:');
        parts.push('  ' + conversion.ctaPlacement.best_practice);
      }
      if (conversion.specialElements && conversion.specialElements.length > 0) {
        parts.push('\nSpecial Conversion Elements:');
        conversion.specialElements.slice(0, 3).forEach(function(elem) {
          parts.push('  • ' + elem);
        });
      }
    }

    // 7. Storytelling Archetypes
    parts.push('\n=== STORYTELLING ARCHETYPES ===');
    if (fullData.storytellingArchetypes) {
      var archetypes = fullData.storytellingArchetypes;
      Object.keys(archetypes).forEach(function(key) {
        var archetype = archetypes[key];
        parts.push('  ' + key + ': ' + archetype.description);
        if (archetype.example) {
          parts.push('    Example: ' + archetype.example);
        }
      });
    }

    // 8. Subpage strategies
    parts.push('\n=== SUBPAGE STRUCTURE RECOMMENDATIONS ===');
    if (fullData.subpageStrategies && fullData.subpageStrategies.byPageCount) {
      var strategies = fullData.subpageStrategies.byPageCount;
      Object.keys(strategies).forEach(function(key) {
        var strategy = strategies[key];
        parts.push('  ' + key + ': ' + strategy.strategy);
      });
    }

    parts.push('\n=== END STATIC REFERENCE DATA ===\n');

    return parts.join('\n');
  } catch (err) {
    console.error('Error loading static reference data:', err);
    return null;
  }
}

// ─── LOAD VISUAL INTELLIGENCE FROM INDIVIDUAL STORE JSONS ───
// Loads CI, navigation, page structure, V3 enrichment, and browserCrawl data
// Uses ALL available data sources: ci, navigation, analysis, pages, geminiVisionV3, browserCrawl
export async function loadGeminiAnalysesForCategory(category) {
  try {
    var summary = await fetchJSON('/data/reference-stores/_summary.json');
    if (!summary || !summary.meta || !summary.meta.stores) return [];

    // Filter by category, always include top-tier stores
    var storeFiles = summary.meta.stores;
    if (category && category !== 'generic') {
      var categoryStores = storeFiles.filter(function(s) { return s.category === category; });
      var otherTopStores = storeFiles.filter(function(s) {
        return s.category !== category && s.qualityScore >= 4;
      }).slice(0, 5);
      storeFiles = categoryStores.concat(otherTopStores);
    }

    var allStoreData = [];
    for (var i = 0; i < storeFiles.length; i++) {
      try {
        var storeData = await fetchJSON('/data/reference-stores/' + storeFiles[i].file);

        // Only include stores that have meaningful data
        var hasCI = storeData.ci && storeData.ci.primaryColors;
        var hasPages = storeData.pages && storeData.pages.length > 0;
        var hasV3 = storeData.geminiVisionV3 && storeData.geminiVisionV3.pages;
        var hasBrowserCrawl = storeData.browserCrawl && storeData.browserCrawl.pages;
        var hasNavigation = storeData.navigation && storeData.navigation.pageCount;

        if (hasCI || hasPages || hasV3 || hasBrowserCrawl) {
          allStoreData.push({
            brandName: storeData.brandName,
            category: storeData.category,
            qualityScore: storeData.qualityScore || 3,
            ci: storeData.ci || null,
            navigation: storeData.navigation || null,
            analysis: storeData.analysis || null,
            pages: hasPages ? storeData.pages : [],
            v3: hasV3 ? storeData.geminiVisionV3 : null,
            browserCrawl: hasBrowserCrawl ? storeData.browserCrawl : null,
          });
        }
      } catch (e) { /* skip this store */ }
    }

    return allStoreData;
  } catch (err) {
    console.error('Error loading reference store data:', err);
    return [];
  }
}

// Format all reference store intelligence for AI prompts
export function formatGeminiAnalysesContext(storeDataList) {
  if (!storeDataList || storeDataList.length === 0) return '';

  var parts = [];
  parts.push('=== REFERENCE STORE VISUAL INTELLIGENCE (from ' + storeDataList.length + ' real Amazon Brand Stores) ===');
  parts.push('Use these as INSPIRATION for structure, visual approach, and design patterns.');
  parts.push('IMPORTANT: Colors are always brand-specific. Do NOT copy colors from other brands.');
  parts.push('');

  for (var i = 0; i < storeDataList.length; i++) {
    var store = storeDataList[i];
    parts.push('--- ' + store.brandName + ' (Quality: ' + store.qualityScore + '/5, Category: ' + store.category + ') ---');

    // CI data (colors, image style, typography, tonality)
    if (store.ci) {
      var ci = store.ci;
      if (ci.primaryColors) parts.push('  Colors: ' + ci.primaryColors.join(', ') + (ci.accentColors ? ' | Accents: ' + ci.accentColors.join(', ') : ''));
      if (ci.imageStyle) parts.push('  Image Style: ' + ci.imageStyle.substring(0, 200));
      if (ci.typographyStyle) parts.push('  Typography: ' + ci.typographyStyle.substring(0, 150));
      if (ci.tonality) parts.push('  Tonality: ' + ci.tonality.substring(0, 150));
    }

    // Navigation structure
    if (store.navigation) {
      var nav = store.navigation;
      parts.push('  Pages: ' + (nav.pageCount || 0));
      if (nav.structurePrinciple) parts.push('  Navigation Logic: ' + nav.structurePrinciple.substring(0, 200));
    }

    // Analysis insights
    if (store.analysis) {
      var an = store.analysis;
      if (an.ciImplementation) parts.push('  CI Implementation: ' + an.ciImplementation.substring(0, 200));
      if (an.imageLanguage) parts.push('  Image Language: ' + an.imageLanguage.substring(0, 200));
      if (an.storytelling) parts.push('  Storytelling: ' + an.storytelling.substring(0, 200));
    }

    // Page module structure (from original crawl)
    if (store.pages && store.pages.length > 0) {
      var homepage = store.pages[0];
      if (homepage.modules && homepage.modules.length > 0) {
        var moduleFlow = homepage.modules.map(function(m) {
          return m.type + (m.tileCount ? '(' + m.tileCount + 't)' : '');
        }).join(' → ');
        parts.push('  Homepage Flow: ' + moduleFlow);
        // Show first 3 module descriptions
        var modDescs = homepage.modules.slice(0, 3).map(function(m, idx) {
          var desc = m.visualConnection || '';
          if (m.tiles && m.tiles.length > 0) {
            desc += ' | Tiles: ' + m.tiles.map(function(t) { return t.description || t.tileType || ''; }).join('; ').substring(0, 100);
          }
          return '    M' + (idx + 1) + ' (' + m.type + '): ' + desc.substring(0, 150);
        });
        parts.push(modDescs.join('\n'));
      }
    }

    // V3 enrichment data (page structure, image counts, section types)
    if (store.v3) {
      var v3 = store.v3;
      var totals = v3.storeTotals || {};
      parts.push('  V3 Data: ' + (v3.pagesAnalyzed || 0) + ' pages, ' + (totals.totalImages || 0) + ' images, ' + (totals.totalVideos || 0) + ' videos, ' + (totals.totalAsins || 0) + ' ASINs');
      if (totals.sectionTypeCounts) {
        var types = Object.keys(totals.sectionTypeCounts).map(function(k) { return k + ':' + totals.sectionTypeCounts[k]; });
        parts.push('  Section Types: ' + types.join(', '));
      }
    }

    // Browser crawl data (navigation pattern, subpages)
    if (store.browserCrawl) {
      var bc = store.browserCrawl;
      if (bc.storeStructure) {
        if (bc.storeStructure.navigationPattern) parts.push('  Nav Pattern: ' + bc.storeStructure.navigationPattern.substring(0, 200));
        if (bc.storeStructure.categoryLogic) parts.push('  Category Logic: ' + bc.storeStructure.categoryLogic);
      }
      if (bc.subpageNames && bc.subpageNames.length > 0) {
        parts.push('  Subpages: ' + bc.subpageNames.slice(0, 10).join(', '));
      }
    }

    parts.push('');
  }

  parts.push('=== END REFERENCE STORE VISUAL INTELLIGENCE ===');
  parts.push('');
  return parts.join('\n');
}

// ─── FORMAT REFERENCE DATA FOR AI PROMPTS ───
export function formatReferenceStoreContext(stores, imageAnalyses) {
  if (!stores || stores.length === 0) return '';

  var parts = [];
  parts.push('=== REFERENCE BRAND STORE ANALYSIS (from ' + stores.length + ' real Amazon Brand Stores) ===');
  parts.push('Use these as INSPIRATION for structure, flow, and visual approach. Do NOT copy — create an ORIGINAL concept.');
  parts.push('');

  for (var i = 0; i < stores.length; i++) {
    var store = stores[i];
    parts.push('--- Reference Store ' + (i + 1) + ': ' + store.brandName + ' ---');
    parts.push('Pages: ' + store.pageCount + ' | Images: ' + store.summary.totalImages + ' | Modules: ' + store.summary.totalModules);

    // Visual Flow Pattern
    parts.push('\nVisual Flow Pattern:');
    if (store.pages && store.pages.length > 0) {
      var firstPage = store.pages[0];
      var moduleFlow = firstPage.modules ? firstPage.modules.map(function(m) {
        return m.type + (m.tileCount ? '(' + m.tileCount + 't)' : '');
      }).join(' → ') : 'N/A';
      parts.push('  ' + moduleFlow);
    }

    // Module patterns
    parts.push('Module types used: ' + JSON.stringify(store.summary.moduleTypes));
    parts.push('Layout patterns: ' + JSON.stringify(store.summary.layoutTypes));

    // Page structure with more detail
    parts.push('\nPage-by-Page Structure:');
    for (var j = 0; j < store.pages.length && j < 5; j++) {
      var page = store.pages[j];
      var pageModules = page.modules ? page.modules : [];
      var moduleTypes = pageModules.map(function(m) { return m.type; });
      var pageInfo = page.pageName || (j === 0 ? 'Homepage' : 'Subpage ' + (j + 1));
      parts.push('  ' + pageInfo + ': ' + moduleTypes.join(' → '));

      // Add layout info if available
      if (page.layoutTypes && page.layoutTypes.length > 0) {
        parts.push('    Layouts: ' + page.layoutTypes.join(' + '));
      }
    }

    // Key texts (first few headings)
    parts.push('\nKey Copywriting:');
    var headings = store.allTexts ? store.allTexts.filter(function(t) { return t.type === 'heading'; }).slice(0, 5) : [];
    if (headings.length > 0) {
      parts.push('  Headlines: ' + headings.map(function(t) { return '"' + t.text + '"'; }).join(' | '));
    }

    // Extract any visible claims
    var claims = store.allTexts ? store.allTexts.filter(function(t) { return t.type === 'claim'; }).slice(0, 3) : [];
    if (claims.length > 0) {
      parts.push('  Claims: ' + claims.map(function(t) { return '"' + t.text + '"'; }).join(' | '));
    }

    // CI insights
    parts.push('\nBrand Identity:');
    if (store.summary.dominantColors && store.summary.dominantColors.length > 0) {
      parts.push('  Colors: ' + store.summary.dominantColors.join(', '));
    } else {
      parts.push('  Colors: Requires analysis from images');
    }
    if (store.summary.ciConsistency) {
      parts.push('  CI Consistency Score: ' + store.summary.ciConsistency + '/5');
    }

    parts.push('');
  }

  // Image analysis summary
  if (imageAnalyses && imageAnalyses.length > 0) {
    parts.push('--- Visual Style Analysis (from Gemini Vision) ---');
    for (var k = 0; k < imageAnalyses.length && k < 10; k++) {
      var analysis = imageAnalyses[k];
      if (analysis.summary) {
        parts.push('• ' + analysis.summary);
      }
    }
    parts.push('');
  }

  parts.push('=== END REFERENCE STORE ANALYSIS ===');
  parts.push('');
  parts.push('INSTRUCTIONS: Use the patterns above as guidance for section flow, module variety, and visual approach.');
  parts.push('Adapt to the current brand\'s products, tone, and category — do not replicate.');
  parts.push('');

  return parts.join('\n');
}

// ─── FORMAT STATIC REFERENCE CONTEXT (works without crawled stores) ───
export async function formatStaticReferenceContext(category) {
  var staticData = await loadStaticReferenceData(category);
  if (!staticData) {
    return formatDefaultReferenceContext(category);
  }

  var parts = [];
  parts.push('=== REFERENCE BEST PRACTICES (from analysis of 23+ brand stores) ===');
  parts.push('These patterns are extracted from top-performing Amazon Brand Stores.');
  parts.push('Use them as guidance to build a strong store without reinventing the wheel.');
  parts.push('');
  parts.push(staticData);

  return parts.join('\n');
}

// ─── FALLBACK: Default reference context when _summary.json unavailable ───
function formatDefaultReferenceContext(category) {
  var parts = [];
  parts.push('=== REFERENCE BEST PRACTICES (Default Guidance) ===');
  parts.push('');
  parts.push('Tier 5 Brand Store Patterns:');
  parts.push('  • 8-10 modules on homepage with clear narrative arc');
  parts.push('  • 70% lifestyle photography + 30% product photography');
  parts.push('  • Strong consistent brand identity: colors, fonts, graphics used throughout');
  parts.push('  • Social proof: test seals, awards, ratings prominently displayed');
  parts.push('  • CTAs on EVERY section, not just at the end');
  parts.push('  • Multiple subpages (8+) with logical structure');
  parts.push('  • Benefit-focused copywriting (not just product descriptions)');
  parts.push('');

  parts.push('Most Effective Layout Combinations:');
  parts.push('  • Storytelling: Full Width Hero → 2 Equal Categories → Section Header → Large + 4 Grid → Product Grid');
  parts.push('  • Premium: Full Width Hero → 2 Equal Lifestyle → Full Width Video → 2x2 Categories → Full Width Awards');
  parts.push('  • Minimal: Full Width Hero → 2 Equal Categories → Full Width Text Header');
  parts.push('');

  parts.push('Color & Visual Strategy:');
  parts.push('  • Colors are ALWAYS brand-specific — derive from client CI, website, or logo');
  parts.push('  • Use 2-3 main brand colors + 1-2 accent colors');
  parts.push('  • Ensure one accent color for CTAs (makes them stand out)');
  parts.push('  • Maintain consistent photography style across all images');
  parts.push('  • Consider a unique visual concept for differentiation');
  parts.push('');

  parts.push('Copywriting Approach:');
  parts.push('  • Use short, punchy claims (2-3 words or contrasting statements)');
  parts.push('  • Headlines follow patterns: benefit-first, emotional hook, numbered proof, or wordplay');
  parts.push('  • CTAs: action-oriented ("Jetzt shoppen", "Mehr erfahren", "Alle Produkte ansehen")');
  parts.push('  • Tone is ALWAYS brand-specific — derive from the client\'s existing communication style');
  parts.push('');

  parts.push('Storytelling Archetypes:');
  parts.push('  • Educational Funnel: Problem → Solution → Proof → Product');
  parts.push('  • Category Navigator: Hero → Categories → Per-category: Lifestyle + Products');
  parts.push('  • Purpose Story: Mission → Values → Impact Numbers → Products');
  parts.push('  • Product Showcase: Hero → Bestseller → Features → Accessories');
  parts.push('  • Seasonal Hook: Seasonal angle → Current Favorites → Categories');
  parts.push('');

  parts.push('Conversion & Social Proof:');
  parts.push('  • Use test seals, awards, certifications prominently');
  parts.push('  • Add numbered proof (customer count, trees planted, regions served)');
  parts.push('  • Place CTAs on EVERY section (not just end of page)');
  parts.push('  • Follow product grids with lifestyle/feature images for breathing room');
  parts.push('');

  parts.push('=== END DEFAULT REFERENCE GUIDANCE ===');
  parts.push('');

  return parts.join('\n');
}

// ─── KNOWLEDGE BASE: Save analyzed store for future use ───
export async function saveToKnowledgeBase(store, imageAnalyses, claudeAnalysis, category, qualityScore) {
  var resp = await fetch('/api/reference-stores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: store.brandName,
      storeUrl: store.storeUrl,
      marketplace: extractMarketplace(store.storeUrl),
      category: category || 'generic',
      pageCount: store.pageCount,
      imageCount: store.summary.totalImages,
      parsedData: store,
      imageAnalyses: imageAnalyses || [],
      claudeAnalysis: claudeAnalysis || null,
      qualityScore: qualityScore || 3,
    }),
  });
  if (!resp.ok) throw new Error('Failed to save to knowledge base');
  return resp.json();
}

// ─── KNOWLEDGE BASE: Load reference data for a category ───
export async function loadKnowledgeBaseForCategory(category) {
  try {
    var data = await fetchJSON('/api/reference-stores?forCategory=' + encodeURIComponent(category || 'generic'));
    return data.analyses || [];
  } catch (e) {
    console.warn('Knowledge base load failed:', e.message);
    return [];
  }
}

// ─── KNOWLEDGE BASE: List all reference stores ───
export async function listKnowledgeBaseStores(category) {
  var url = '/api/reference-stores';
  if (category && category !== 'all') url += '?category=' + encodeURIComponent(category);
  var resp = await fetch(url);
  if (!resp.ok) return [];
  var data = await resp.json();
  return data.stores || [];
}

// ─── KNOWLEDGE BASE: Delete a reference store ───
export async function deleteFromKnowledgeBase(id) {
  var resp = await fetch('/api/reference-stores?id=' + encodeURIComponent(id), { method: 'DELETE' });
  return resp.ok;
}

// ─── FULL PIPELINE: Crawl, analyze, and save to knowledge base ───
export async function addStoreToKnowledgeBase(storeUrl, category, onProgress, cancelRef) {
  var log = onProgress || function() {};

  // Step 1: Crawl & parse
  log('Step 1/3: Crawling store...');
  var store = await crawlAndParseStore(storeUrl, log, cancelRef);
  if (cancelRef && cancelRef.current) return null;

  // Step 2: Gemini image analysis
  log('Step 2/3: Analyzing images...');
  var imageAnalyses = [];
  try {
    imageAnalyses = await analyzeStoreImagesWithGemini(store, log, cancelRef);
  } catch (e) { log('Image analysis skipped: ' + e.message); }
  if (cancelRef && cancelRef.current) return null;

  // Step 3: Save to database
  log('Step 3/3: Saving to knowledge base...');
  var result = await saveToKnowledgeBase(store, imageAnalyses, null, category, 3);
  log('Saved! ID: ' + result.id);

  return { id: result.id, store: store, imageAnalyses: imageAnalyses };
}

// ─── FORMAT KNOWLEDGE BASE DATA FOR AI PROMPTS ───
export function formatKnowledgeBaseContext(kbAnalyses) {
  if (!kbAnalyses || kbAnalyses.length === 0) return '';

  var parts = [];
  parts.push('=== KNOWLEDGE BASE: Best practices from ' + kbAnalyses.length + ' analyzed Brand Stores ===');
  parts.push('');

  // Group by category for better organization
  var byCategory = {};
  for (var i = 0; i < kbAnalyses.length; i++) {
    var entry = kbAnalyses[i];
    var cat = entry.category || 'generic';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(entry);
  }

  // Format by category
  Object.keys(byCategory).forEach(function(category) {
    var entries = byCategory[category];
    parts.push('--- ' + category.toUpperCase() + ' (' + entries.length + ' stores) ---');

    entries.forEach(function(entry) {
      parts.push('\n• ' + entry.brandName);

      // Structure info
      if (entry.pageCount) {
        parts.push('  Pages: ' + entry.pageCount);
      }
      if (entry.imageCount) {
        parts.push('  Images: ' + entry.imageCount);
      }

      // If we have detailed parsed data
      if (entry.parsedData) {
        var data = entry.parsedData;
        if (data.summary) {
          if (data.summary.moduleTypes && data.summary.moduleTypes.length > 0) {
            parts.push('  Modules: ' + data.summary.moduleTypes.join(', '));
          }
          if (data.summary.layoutTypes && data.summary.layoutTypes.length > 0) {
            parts.push('  Layouts: ' + data.summary.layoutTypes.join(', '));
          }
          if (data.summary.dominantColors && data.summary.dominantColors.length > 0) {
            parts.push('  Colors: ' + data.summary.dominantColors.join(', '));
          }
        }
      }

      // AI analysis summary (if available)
      if (entry.claudeAnalysis) {
        var analysis = typeof entry.claudeAnalysis === 'string'
          ? entry.claudeAnalysis
          : JSON.stringify(entry.claudeAnalysis);
        var summary = analysis.length > 300 ? analysis.slice(0, 300) + '...' : analysis;
        parts.push('  Insights: ' + summary);
      } else if (entry.analysis) {
        var analysisText = typeof entry.analysis === 'string'
          ? entry.analysis
          : JSON.stringify(entry.analysis);
        var analysisSummary = analysisText.length > 300 ? analysisText.slice(0, 300) + '...' : analysisText;
        parts.push('  Insights: ' + analysisSummary);
      }

      // Image analysis highlights
      if (entry.imageAnalyses && entry.imageAnalyses.length > 0) {
        var visualHighlights = entry.imageAnalyses
          .slice(0, 2)
          .map(function(img) { return img.summary || img.description; })
          .filter(function(x) { return x; });
        if (visualHighlights.length > 0) {
          parts.push('  Visual: ' + visualHighlights.join(' | '));
        }
      }

      // Quality score
      if (entry.qualityScore) {
        var scoreLabel = entry.qualityScore >= 4 ? 'Excellent' : entry.qualityScore >= 3 ? 'Good' : 'Fair';
        parts.push('  Quality: ' + scoreLabel + ' (' + entry.qualityScore + '/5)');
      }
    });

    parts.push('');
  });

  parts.push('=== END KNOWLEDGE BASE ===');
  parts.push('');
  parts.push('RECOMMENDATIONS:');
  parts.push('  • Study the module and layout patterns for your category above');
  parts.push('  • Pay special attention to color schemes and visual concepts from high-quality stores');
  parts.push('  • Use the copywriting and structure examples as inspiration, not templates');
  parts.push('  • Adapt proven patterns to your unique brand and product positioning');
  parts.push('');

  return parts.join('\n');
}

// ─── HELPERS ───
function extractMarketplace(url) {
  if (!url) return 'de';
  if (url.indexOf('amazon.com') >= 0) return 'com';
  if (url.indexOf('amazon.co.uk') >= 0) return 'co.uk';
  if (url.indexOf('amazon.fr') >= 0) return 'fr';
  if (url.indexOf('amazon.de') >= 0) return 'de';
  return 'de';
}
function extractPageId(url) {
  var match = (url || '').match(/page\/([A-F0-9-]{36})/i);
  return match ? match[1] : '';
}

function shortenUrl(url) {
  try {
    var u = new URL(url);
    return u.hostname + u.pathname.slice(0, 60) + (u.pathname.length > 60 ? '...' : '');
  } catch (e) { return url.slice(0, 80); }
}

// ─── GEMINI VISION ENRICHMENT FOR REFERENCE STORES ───

// Enrich a single reference store with Gemini Vision analysis
export async function enrichReferenceStoreWithGemini(storeUrl, brandName, maxImages, onProgress) {
  var log = onProgress || function() {};
  log('Enriching ' + brandName + ' with Gemini Vision...');

  var resp = await fetch('/api/enrich-reference-store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storeUrl: storeUrl,
      brandName: brandName,
      maxImages: maxImages || 50,
    }),
  });

  if (!resp.ok) {
    var errData = await resp.json().catch(function() { return { error: 'Unknown error' }; });
    throw new Error('Enrichment failed for ' + brandName + ': ' + (errData.error || resp.status));
  }

  var result = await resp.json();
  log('  → ' + result.imageCount + ' images analyzed (' + result.totalImagesFound + ' total found)');
  return result;
}

// Batch-enrich all reference stores from SEED_STORES
export async function enrichAllReferenceStores(seedStores, onProgress, cancelRef) {
  var log = onProgress || function() {};
  var results = [];

  for (var i = 0; i < seedStores.length; i++) {
    if (cancelRef && cancelRef.current) {
      log('Enrichment cancelled by user');
      break;
    }

    var store = seedStores[i];
    log('');
    log('━━━ Enriching ' + (i + 1) + '/' + seedStores.length + ': ' + store.brandHint + ' ━━━');

    try {
      var result = await enrichReferenceStoreWithGemini(
        store.url,
        store.brandHint,
        15,
        log
      );
      results.push(result);
      log('  ✓ ' + store.brandHint + ' complete');
    } catch (err) {
      log('  ✗ ' + store.brandHint + ' failed: ' + err.message);
      results.push({ brandName: store.brandHint, error: err.message, geminiAnalyses: [] });
    }

    // Delay between stores to avoid rate limiting
    if (i < seedStores.length - 1) {
      log('  Waiting 3s before next store...');
      await new Promise(function(r) { setTimeout(r, 3000); });
    }
  }

  log('');
  log('━━━ ENRICHMENT COMPLETE ━━━');
  var successCount = results.filter(function(r) { return !r.error; }).length;
  log(successCount + '/' + seedStores.length + ' stores successfully enriched');

  return results;
}

// Merge Gemini analyses into an existing store JSON object
export function mergeGeminiIntoStoreJson(storeJson, geminiResult) {
  if (!geminiResult || !geminiResult.geminiAnalyses) return storeJson;

  // Add geminiAnalyses array to the store JSON
  storeJson.geminiAnalyses = {
    analyzedAt: geminiResult.analyzedAt || new Date().toISOString(),
    imageCount: geminiResult.imageCount || 0,
    analyses: geminiResult.geminiAnalyses.map(function(a) {
      return {
        url: a.url || '',
        page: a.page || '',
        summary: a.summary || '',
        imageCategory: a.imageCategory || 'unknown',
        dominantColors: a.dominantColors || [],
        textOnImage: a.textOnImage || '',
        elements: a.elements || [],
        brandingElements: a.brandingElements || '',
        designPatterns: a.designPatterns || [],
      };
    }),
  };

  // Also extract aggregated CI data from Gemini analyses
  var allColors = [];
  var allPatterns = [];
  storeJson.geminiAnalyses.analyses.forEach(function(a) {
    if (a.dominantColors) {
      a.dominantColors.forEach(function(c) {
        if (allColors.indexOf(c) < 0) allColors.push(c);
      });
    }
    if (a.designPatterns) {
      a.designPatterns.forEach(function(p) {
        if (allPatterns.indexOf(p) < 0) allPatterns.push(p);
      });
    }
  });

  // Add aggregated data
  storeJson.geminiAnalyses.aggregated = {
    allDominantColors: allColors.slice(0, 10),
    allDesignPatterns: allPatterns,
  };

  return storeJson;
}
