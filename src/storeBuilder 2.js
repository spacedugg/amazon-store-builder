import { uid, LAYOUTS, LAYOUT_TILE_DIMS, MODULE_BAUKASTEN, findLayout, resolveLayoutId } from './constants';

var ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
var PRIMARY_MODEL = 'claude-opus-4-6';
var FALLBACK_MODEL = 'claude-sonnet-4-6';

// ─── TIMEOUT-AWARE FETCH ───
function fetchWithTimeout(url, options, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var controller = new AbortController();
    var timer = setTimeout(function() {
      controller.abort();
      reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's'));
    }, timeoutMs);
    var fetchOptions = Object.assign({}, options, { signal: controller.signal });
    fetch(url, fetchOptions).then(function(resp) {
      clearTimeout(timer);
      resolve(resp);
    }).catch(function(err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        reject(new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + 's'));
      } else {
        reject(err);
      }
    });
  });
}

// ─── CLAUDE API CALL (with retry + fallback + timeout) ───
var CLAUDE_TIMEOUT_MS = 180000; // 3 minutes per API call — complex stores need more time

async function callClaude(systemPrompt, userPrompt, maxTokens) {
  if (!ANTHROPIC_KEY) throw new Error('VITE_ANTHROPIC_API_KEY not configured');

  var models = [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL];
  var delays = [2000, 4000, 0];

  for (var attempt = 0; attempt < models.length; attempt++) {
    var model = models[attempt];
    try {
      var resp = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model,
          max_tokens: maxTokens || 4000,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      }, CLAUDE_TIMEOUT_MS);

      if (resp.status === 529 || resp.status === 503 || resp.status === 429) {
        if (attempt < models.length - 1) {
          console.warn('API ' + resp.status + ' with ' + model + ', retrying in ' + (delays[attempt] / 1000) + 's...');
          if (delays[attempt] > 0) await new Promise(function(r) { setTimeout(r, delays[attempt]); });
          continue;
        }
      }

      if (!resp.ok) {
        var err = await resp.text();
        throw new Error('Claude API error: ' + resp.status + ' ' + err);
      }

      var data = await resp.json();
      var text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
      return text;
    } catch (e) {
      if (attempt < models.length - 1 && (e.message.indexOf('529') >= 0 || e.message.indexOf('503') >= 0 || e.message.indexOf('overload') >= 0 || e.message.indexOf('fetch') >= 0 || e.message.indexOf('timed out') >= 0)) {
        console.warn('Call failed (' + e.message + '), retrying...');
        if (delays[attempt] > 0) await new Promise(function(r) { setTimeout(r, delays[attempt]); });
        continue;
      }
      throw e;
    }
  }

  throw new Error('All API attempts failed');
}

function extractJSON(text) {
  var s = text.indexOf('{');
  var e = text.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('No JSON found in AI response');
  return JSON.parse(text.slice(s, e + 1));
}

// ─── INFER IMAGE CATEGORY FROM BRIEF TAG ───
function inferImageCategory(brief, tileType) {
  if (!brief) return 'creative';
  var b = brief.toUpperCase();
  if (b.indexOf('[STORE_HERO]') >= 0) return 'store_hero';
  if (b.indexOf('[BENEFIT]') >= 0) return 'benefit';
  if (b.indexOf('[TEXT_IMAGE]') >= 0) return 'text_image';
  if (b.indexOf('[LIFESTYLE]') >= 0) return 'lifestyle';
  if (b.indexOf('[PRODUCT]') >= 0) return 'product';
  if (b.indexOf('[SHOPPABLE]') >= 0) return 'product';
  if (b.indexOf('[CREATIVE]') >= 0) return 'creative';
  // Fallback: infer from tile type
  if (tileType === 'shoppable_image') return 'product';
  if (tileType === 'image_text') return 'creative';
  return 'creative';
}

// ─── STEP 3: AI CHAT REFINEMENT ───
export async function aiRefineStore(store, command, brand, lang) {
  var storeSnapshot = JSON.stringify({
    pages: store.pages.map(function(pg) {
      return {
        id: pg.id,
        name: pg.name,
        parentId: pg.parentId || null,
        sections: pg.sections.map(function(sec, si) {
          return {
            index: si,
            id: sec.id,
            layoutId: sec.layoutId,
            tiles: sec.tiles.map(function(t, ti) {
              return {
                index: ti,
                type: t.type,
                imageCategory: t.imageCategory || '',
                textOverlay: t.textOverlay,
                brief: t.brief ? t.brief.slice(0, 80) : '',
                asins: t.asins || [],
              };
            }),
          };
        }),
      };
    }),
  });

  var validLayouts = LAYOUTS.map(function(l) { return l.id; });

  var system = [
    'You are an Amazon Brand Store editor. The user wants to modify their store layout.',
    'Current store structure:',
    storeSnapshot,
    '',
    'Valid layouts: ' + validLayouts.join(', '),
    'Valid tile types: image, product_grid, video, text, shoppable_image, image_text',
    'Valid image categories: store_hero, benefit, product, creative, lifestyle, text_image',
    'Every image tile should have an imageCategory. When adding/updating tiles, always include imageCategory.',
    '',
    'Available section patterns for inspiration:',
    JSON.stringify(MODULE_BAUKASTEN, null, 1),
    '',
    'Return a JSON object describing the changes to make. Possible operations:',
    '{',
    '  "operations": [',
    '    {"op": "add_section", "pageId": "...", "afterIndex": 1, "section": {layoutId, tiles: [...]}},',
    '    {"op": "remove_section", "pageId": "...", "sectionId": "..."},',
    '    {"op": "move_section", "pageId": "...", "sectionId": "...", "newIndex": 0},',
    '    {"op": "update_tile", "pageId": "...", "sectionId": "...", "tileIndex": 0, "changes": {textOverlay: "...", brief: "..."}},',
    '    {"op": "change_layout", "pageId": "...", "sectionId": "...", "newLayoutId": "1-1"},',
    '    {"op": "add_page", "page": {name: "...", sections: [...]}, "parentId": "optional-parent-page-id"},',
    '    {"op": "remove_page", "pageId": "..."},',
    '    {"op": "rename_page", "pageId": "...", "newName": "..."},',
    '    {"op": "set_parent", "pageId": "...", "parentId": "new-parent-id-or-null"}',
    '  ],',
    '  "explanation": "What was changed and why"',
    '}',
    '',
    'TEXT RULES for any customer-facing text (textOverlay, ctaText, page names, briefs that go into image text):',
    '  - All customer-facing text MUST be written in ' + lang + '.',
    '  - Never use em dash (U+2014) or en dash (U+2013).',
    '  - Hyphen "-" is allowed ONLY inside a compound word without surrounding spaces (e.g. "Wasserfilter-Flaschen", "3-in-1").',
    '  - A hyphen with a space before or after it (like " - ") is FORBIDDEN. Use comma, colon, line break, or a rewrite.',
    '',
    'Return ONLY valid JSON.',
  ].join('\n');

  var user = 'User command: "' + command + '"\nBrand: ' + brand + ', Language: ' + lang;

  var text = await callClaude(system, user, 3000);
  return extractJSON(text);
}

// ─── APPLY REFINEMENT OPERATIONS ───
export function applyOperations(store, operations) {
  var newStore = JSON.parse(JSON.stringify(store));

  operations.forEach(function(op) {
    var page = newStore.pages.find(function(p) { return p.id === op.pageId; });

    switch (op.op) {
      case 'add_section': {
        if (!page) break;
        var newSec = op.section || {};
        newSec.id = uid();
        if (!newSec.tiles) newSec.tiles = [];
        var addDims = LAYOUT_TILE_DIMS[newSec.layoutId];
        var addLayout = findLayout(newSec.layoutId);
        var addIsVH = addLayout && addLayout.type === 'vh';
        var addIsFullWidth = addLayout && addLayout.type === 'fullwidth';
        newSec.tiles.forEach(function(t, ti) {
          if (!t.type) t.type = 'image';
          if (!t.brief) t.brief = '';
          if (!t.textOverlay) t.textOverlay = '';
          if (!t.ctaText) t.ctaText = '';
          var dd = addDims && addDims[ti] ? addDims[ti] : { w: 3000, h: 1200 };
          if (!addIsVH && !addIsFullWidth) {
            t.dimensions = { w: dd.w, h: dd.h };
            t.mobileDimensions = { w: dd.w, h: dd.h };
            t.syncDimensions = true;
          } else if (!t.dimensions) {
            t.dimensions = { w: dd.w, h: dd.h };
          }
          if (!t.asins) t.asins = [];
          if (!t.imageCategory && t.type !== 'product_grid' && t.type !== 'text' && t.type !== 'video') {
            t.imageCategory = inferImageCategory(t.brief, t.type);
          }
          // Strip category tags from brief text
          if (t.brief) {
            t.brief = t.brief.replace(/\[(STORE_HERO|BENEFIT|PRODUCT|CREATIVE|LIFESTYLE|TEXT_IMAGE|SHOPPABLE)\]\s*/gi, '').trim();
          }
        });
        var idx = typeof op.afterIndex === 'number' ? op.afterIndex + 1 : page.sections.length;
        page.sections.splice(idx, 0, newSec);
        break;
      }
      case 'remove_section': {
        if (!page) break;
        page.sections = page.sections.filter(function(s) { return s.id !== op.sectionId; });
        break;
      }
      case 'move_section': {
        if (!page) break;
        var secIdx = page.sections.findIndex(function(s) { return s.id === op.sectionId; });
        if (secIdx >= 0) {
          var sec = page.sections.splice(secIdx, 1)[0];
          page.sections.splice(op.newIndex || 0, 0, sec);
        }
        break;
      }
      case 'update_tile': {
        if (!page) break;
        var section = page.sections.find(function(s) { return s.id === op.sectionId; });
        if (section && section.tiles[op.tileIndex]) {
          Object.assign(section.tiles[op.tileIndex], op.changes || {});
        }
        break;
      }
      case 'change_layout': {
        if (!page) break;
        var sec2 = page.sections.find(function(s) { return s.id === op.sectionId; });
        if (sec2) {
          op.newLayoutId = resolveLayoutId(op.newLayoutId);
          var newLayout = findLayout(op.newLayoutId);
          if (newLayout) {
            sec2.layoutId = op.newLayoutId;
            var chDims = LAYOUT_TILE_DIMS[op.newLayoutId];
            while (sec2.tiles.length < newLayout.cells) {
              var ci = sec2.tiles.length;
              var dd = chDims && chDims[ci] ? chDims[ci] : { w: 3000, h: 1200 };
              sec2.tiles.push({ type: 'image', brief: '', textOverlay: '', ctaText: '', dimensions: { w: dd.w, h: dd.h }, asins: [] });
            }
            if (sec2.tiles.length > newLayout.cells) {
              sec2.tiles = sec2.tiles.slice(0, newLayout.cells);
            }
          }
        }
        break;
      }
      case 'add_page': {
        var newPage = op.page || {};
        newPage.id = uid();
        if (op.parentId) newPage.parentId = op.parentId;
        (newPage.sections || []).forEach(function(s) {
          s.id = uid();
          var pgDims = LAYOUT_TILE_DIMS[s.layoutId];
          var pgLayout = findLayout(s.layoutId);
          var pgIsVH = pgLayout && pgLayout.type === 'vh';
          var pgIsFullWidth = pgLayout && pgLayout.type === 'fullwidth';
          (s.tiles || []).forEach(function(t, ti) {
            if (!t.type) t.type = 'image';
            if (!t.brief) t.brief = '';
            if (!t.textOverlay) t.textOverlay = '';
            if (!t.ctaText) t.ctaText = '';
            var dd = pgDims && pgDims[ti] ? pgDims[ti] : { w: 3000, h: 1200 };
            if (!pgIsVH && !pgIsFullWidth) {
              t.dimensions = { w: dd.w, h: dd.h };
              t.mobileDimensions = { w: dd.w, h: dd.h };
              t.syncDimensions = true;
            } else if (!t.dimensions) {
              t.dimensions = { w: dd.w, h: dd.h };
            }
            if (!t.asins) t.asins = [];
          });
        });
        newStore.pages.push(newPage);
        break;
      }
      case 'remove_page': {
        // Also remove child pages when removing a parent
        var childIds = newStore.pages.filter(function(p) { return p.parentId === op.pageId; }).map(function(p) { return p.id; });
        newStore.pages = newStore.pages.filter(function(p) { return p.id !== op.pageId && childIds.indexOf(p.id) < 0; });
        break;
      }
      case 'rename_page': {
        if (page) page.name = op.newName || page.name;
        break;
      }
      case 'set_parent': {
        if (page) page.parentId = op.parentId || undefined;
        break;
      }
    }
  });

  return newStore;
}

// ─── WIREFRAME GENERATION HELPERS ───

// Map pixel dimensions to closest supported Imagen aspect ratio
function getClosestAspectRatio(w, h) {
  var ratio = w / h;
  // Imagen 3 supported ratios: 1:1, 16:9, 9:16, 4:3, 3:4
  var ratios = [
    { label: '16:9', value: 16 / 9 },
    { label: '4:3', value: 4 / 3 },
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3 / 4 },
    { label: '9:16', value: 9 / 16 },
  ];
  var closest = ratios[0];
  var minDiff = Math.abs(ratio - closest.value);
  for (var i = 1; i < ratios.length; i++) {
    var diff = Math.abs(ratio - ratios[i].value);
    if (diff < minDiff) { closest = ratios[i]; minDiff = diff; }
  }
  return closest.label;
}

// Build image description for wireframe generation.
// This produces a VISUAL description of the final image — not a wireframe/mockup/layout.
// The description is stored as tile.wireframeDescription (internal, not shown to designer).
function buildWireframePrompt(tile, brand, ciColors, ciBrandStyle, analysis) {
  var cat = tile.imageCategory || 'creative';
  var brief = tile.brief || '';
  var textOverlay = tile.textOverlay || '';

  // ─── DESIGN LANGUAGE (consistent across all images in this store) ───
  var ciData = analysis.productCI || null;
  var designLanguage = [];
  designLanguage.push('A single image, edge-to-edge, no frame or border.');
  designLanguage.push('NOT a webpage, NOT a mockup, NOT a multi-panel layout. Just one standalone image.');

  // CI-based design direction
  if (ciData) {
    if (ciData.visualMood) designLanguage.push('Visual style: ' + ciData.visualMood + '.');
    if (ciData.backgroundPattern) designLanguage.push('Background style: ' + ciData.backgroundPattern + '.');
    if (ciData.typographyStyle) designLanguage.push('Typography: ' + ciData.typographyStyle + '.');
    if (ciData.recurringElements && ciData.recurringElements.length > 0) {
      designLanguage.push('Design elements: ' + ciData.recurringElements.slice(0, 4).join(', ') + '.');
    }
  } else if (analysis.brandTone) {
    designLanguage.push('Style: ' + analysis.brandTone + '.');
  }

  // Colors — product-specific if available, otherwise brand palette
  if (ciColors) {
    designLanguage.push('Color palette: ' + ciColors + '.');
  }

  // ─── IMAGE CONTENT (what the image shows) ───
  var content = [];
  switch (cat) {
    case 'store_hero':
      content.push('Wide panoramic image.');
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 60) + '".');
      content.push('Brand atmosphere, bold composition.');
      break;
    case 'benefit':
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 50) + '".');
      content.push('Clean graphical element. No product photo.');
      break;
    case 'product':
      content.push('Product centered on clean background.');
      break;
    case 'creative':
      if (textOverlay) content.push('Text: "' + textOverlay.substring(0, 50) + '".');
      content.push('Graphic composition with text and visual elements.');
      break;
    case 'lifestyle':
      content.push('Lifestyle scene with product in natural context.');
      if (textOverlay) content.push('Subtle text: "' + textOverlay.substring(0, 40) + '".');
      break;
    case 'text_image':
      if (textOverlay) content.push('Prominent text: "' + textOverlay.substring(0, 60) + '".');
      content.push('Typography-driven. Minimal imagery.');
      break;
    default:
      content.push('Image based on the description below.');
  }

  // Add brief as content context (shortened, stripped of tags)
  if (brief) {
    var cleanBrief = brief.replace(/^\[[\w_]+\]\s*/, '');
    if (cleanBrief.length > 120) cleanBrief = cleanBrief.substring(0, 120) + '...';
    content.push(cleanBrief);
  }

  return designLanguage.concat(content).filter(Boolean).join(' ');
}

// Generate the internal wireframe description for a tile (CI-aware, not shown to designer).
// Called during wireframe generation to create the prompt AND store the description.
function buildWireframeDescription(tile, brand, analysis) {
  var cat = tile.imageCategory || 'creative';
  var brief = tile.brief || '';
  var textOverlay = tile.textOverlay || '';
  var ciData = analysis.productCI || null;

  var parts = [];
  parts.push('[' + cat.toUpperCase() + ']');

  // Content description
  var cleanBrief = brief.replace(/^\[[\w_]+\]\s*/, '').trim();
  if (cleanBrief) parts.push(cleanBrief);

  // Text content
  if (textOverlay) {
    var lines = textOverlay.split(/\\n|\n/).filter(function(l) { return l.trim(); });
    parts.push('Text: ' + lines.join(' | '));
  }

  // CI notes for this image
  if (ciData) {
    var ciNotes = [];
    if (ciData.visualMood) ciNotes.push(ciData.visualMood);
    if (ciData.backgroundPattern) ciNotes.push('BG: ' + ciData.backgroundPattern);
    if (ciNotes.length > 0) parts.push('CI: ' + ciNotes.join(', '));
  }

  return parts.join(' — ');
}

// Call the wireframe generation API endpoint
async function generateWireframeAPI(prompt, aspectRatio) {
  var resp = await fetch('/api/generate-wireframe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt, aspectRatio: aspectRatio }),
  });
  if (!resp.ok) {
    var err = await resp.json().catch(function() { return {}; });
    throw new Error(err.error || 'Wireframe API error');
  }
  return resp.json();
}

// ─── EXPORTED: Generate wireframes for a single page (called from BriefingView) ───
export async function generateWireframesForPage(page, brand, websiteData, analysis, onProgress, manualCI, cancelRef) {
  var log = onProgress || function() {};
  var tiles = [];
  // Collect all image tiles from this page
  (page.sections || []).forEach(function(sec, si) {
    (sec.tiles || []).forEach(function(tile, ti) {
      if (tile.type === 'image' || tile.type === 'shoppable_image' || tile.type === 'image_text') {
        tiles.push({ tile: tile, secIdx: si, tileIdx: ti });
      }
    });
  });
  if (tiles.length === 0) return { success: 0, failed: 0, total: 0 };

  // ─── STEP 1: Get CI-aware image descriptions from Gemini (batch) ───
  var ciData = (analysis || {}).productCI || (websiteData && websiteData.productCI) || null;
  // Merge manualCI colors into ciData if present
  if (manualCI && manualCI.colors && manualCI.colors.length > 0) {
    if (!ciData) ciData = {};
    ciData.primaryColors = manualCI.colors;
  }
  var brandTone = (manualCI && manualCI.brandTone) || (analysis || {}).brandTone || '';

  var imageDescriptions = null;
  try {
    log(0, tiles.length, 'Gemini erstellt Bildbeschreibungen...');
    var tileInputs = tiles.map(function(entry) {
      var sec = (page.sections || [])[entry.secIdx];
      var totalTilesInSection = sec ? sec.tiles.length : 1;
      return {
        imageCategory: entry.tile.imageCategory || 'creative',
        brief: entry.tile.brief || '',
        textOverlay: entry.tile.textOverlay || '',
        dimensions: entry.tile.dimensions || { w: 3000, h: 1200 },
        sectionIndex: entry.secIdx,
        tileIndex: entry.tileIdx,
        totalTilesInSection: totalTilesInSection,
        layoutId: sec ? sec.layoutId : '1',
      };
    });
    var pageName = page.name || 'Page';
    // Build rich context for Gemini so wireframes match the brand
    var brandVoice = (analysis || {}).pipelineBrandVoice || {};
    var brandUSPs = (analysis || {}).brandUSPs || (analysis || {}).keyFeatures || [];
    var pageContext = {
      pageName: pageName,
      isHomepage: pageName.toLowerCase() === 'homepage' || pageName.toLowerCase() === 'home' || pageName.toLowerCase() === 'startseite',
      totalSections: (page.sections || []).length,
      brandStory: (analysis || {}).brandStory || '',
      keyFeatures: brandUSPs,
      // Full brand context for CI-consistent wireframes
      brandVoiceTone: brandVoice.tone || brandTone || '',
      brandVoiceStyle: brandVoice.communicationStyle || '',
      brandTypicalPhrases: (brandVoice.typicalPhrases || []).slice(0, 5),
      // Brand assets for wireframe consistency
      hasLogo: !!(websiteData && websiteData.logoDataUrl),
      brandFonts: (websiteData && websiteData.userFonts) || null,
    };
    var descResp = await fetch('/api/generate-image-descriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles: tileInputs, ciData: ciData, brandName: brand, brandTone: brandTone, pageContext: pageContext }),
    });
    if (descResp.ok) {
      var descData = await descResp.json();
      if (descData.descriptions && descData.descriptions.length > 0) {
        imageDescriptions = descData.descriptions;
        log(0, tiles.length, imageDescriptions.length + ' Bildbeschreibungen von Gemini erhalten');
      }
    }
  } catch (descErr) {
    log(0, tiles.length, 'Gemini-Beschreibungen nicht verfügbar, verwende Fallback (' + descErr.message + ')');
  }

  // ─── STEP 2: Generate images using descriptions ───
  var success = 0;
  var failed = 0;
  var cancelled = false;
  var lastError = '';
  for (var i = 0; i < tiles.length; i++) {
    // Check for cancellation
    if (cancelRef && cancelRef.current) {
      cancelled = true;
      log(i + 1, tiles.length, 'ABGEBROCHEN');
      break;
    }
    var entry = tiles[i];
    var tile = entry.tile;
    try {
      log(i + 1, tiles.length, tile.imageCategory || 'image');

      // Use Gemini-generated description if available, otherwise fallback to hardcoded
      var wfPrompt;
      if (imageDescriptions && imageDescriptions[i] && imageDescriptions[i].imagePrompt) {
        wfPrompt = imageDescriptions[i].imagePrompt;
        tile.wireframeDescription = imageDescriptions[i].internalDescription || '';
      } else {
        // Fallback: use the old hardcoded prompt builder
        var ciColors = ciData && ciData.primaryColors ? ciData.primaryColors.join(', ') : '';
        wfPrompt = buildWireframePrompt(tile, brand, ciColors, '', analysis || {});
        tile.wireframeDescription = buildWireframeDescription(tile, brand, analysis || {});
      }

      var aspectW = (tile.dimensions || {}).w || 3000;
      var aspectH = (tile.dimensions || {}).h || 1200;
      var aspectRatio = getClosestAspectRatio(aspectW, aspectH);
      var wfResult = await generateWireframeAPI(wfPrompt, aspectRatio);
      if (wfResult && wfResult.imageBase64) {
        tile.wireframeImage = 'data:' + (wfResult.mimeType || 'image/png') + ';base64,' + wfResult.imageBase64;
        success++;
      } else {
        failed++;
        console.warn('Wireframe failed: Image generation failed with all available models');
        lastError = 'Image generation failed with all available models';
      }
    } catch (err) {
      failed++;
      lastError = err.message || 'Unknown error';
      console.warn('Wireframe failed:', lastError);
      // If the first request fails with a config error, abort early — no point trying 58 more
      if (i === 0 && (lastError.indexOf('not configured') >= 0 || lastError.indexOf('API_KEY') >= 0)) {
        log(1, tiles.length, 'API KEY MISSING — aborting');
        return { success: 0, failed: tiles.length, total: tiles.length, error: lastError };
      }
    }
  }
  return { success: success, failed: failed, total: tiles.length, cancelled: cancelled, error: cancelled ? 'Abgebrochen' : (failed > 0 ? lastError : '') };
}

// ─── EXPORTED: Delete all wireframes for a single page ───
export function deleteWireframesForPage(page) {
  var deleted = 0;
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(tile) {
      if (tile.wireframeImage) {
        delete tile.wireframeImage;
        deleted++;
      }
    });
  });
  return deleted;
}
