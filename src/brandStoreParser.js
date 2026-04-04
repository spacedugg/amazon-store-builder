// ─── AMAZON BRAND STORE HTML PARSER ───
// Parses rendered Brand Store HTML into structured JSON.
// Works client-side. Input: raw HTML string from Web Unlocker.
//
// ARCHITECTURE: Amazon Brand Stores embed widget data as JSON in <script> tags
// (var config = {...}) which contain the REAL module/tile/image data.
// The rendered DOM is often incomplete (lazy-loaded via JS).
// Therefore we parse BOTH: JSON configs (primary) + DOM (supplementary).

export function parseBrandStoreHTML(html, sourceUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  // PRIMARY: Extract widget data from JSON script configs
  var widgetConfigs = extractWidgetConfigs(html);

  // Extract hero image from config or DOM
  var heroImage = extractHeroFromConfig(widgetConfigs) || extractStoreHeroImage(doc, html);

  // Extract modules from JSON configs (primary) + DOM (supplementary)
  var configModules = extractModulesFromConfigs(widgetConfigs);
  var domModules = extractModulesFromDOM(doc);

  // Enrich config modules with DOM data (interactiveImage tiles have images in DOM but not in config)
  enrichModulesWithDOM(configModules, widgetConfigs, doc);

  // Use config modules if found, otherwise fall back to DOM
  var modules = configModules.length > 0 ? configModules : domModules;

  // Extract images: from configs (primary) + DOM + raw HTML
  var configImages = extractImagesFromConfigs(widgetConfigs);
  var domImages = extractStoreImagesFromDOM(doc);
  var rawImages = extractImagesFromRawHTML(html);
  var allImages = mergeImageLists(configImages, mergeImageLists(domImages, rawImages));

  // Add hero image at the front if not already included
  if (heroImage && !allImages.some(function(img) { return normalizeImageUrl(img.url) === normalizeImageUrl(heroImage.url); })) {
    allImages.unshift(heroImage);
  }

  // Extract navigation: from config (primary) + DOM
  var navigation = extractNavigationFromConfig(widgetConfigs, sourceUrl) ||
                   extractNavigationFromDOM(doc, html, sourceUrl);

  var result = {
    url: sourceUrl || '',
    brandName: extractBrandName(doc, html, widgetConfigs),
    navigation: navigation,
    modules: modules,
    images: allImages,
    texts: extractTexts(doc, html),
    meta: extractMeta(doc),
    heroImage: heroImage,
  };

  return result;
}

// ═══════════════════════════════════════════════════════════
// JSON CONFIG EXTRACTION (PRIMARY DATA SOURCE)
// ═══════════════════════════════════════════════════════════

function extractWidgetConfigs(html) {
  var configs = [];

  // 1. Find ALL "var config = {" positions, then extract JSON via balanced brace counting.
  // The old regex approach failed on real Web Unlocker HTML because the terminator pattern
  // (newline/var/window after };) didn't match the actual formatting.
  var searchPos = 0;
  while (true) {
    var idx = html.indexOf('var config', searchPos);
    if (idx < 0) break;
    searchPos = idx + 10;

    // Find the opening brace after "var config ="
    var eqIdx = html.indexOf('{', idx);
    if (eqIdx < 0 || eqIdx > idx + 30) continue; // { must be close to "var config"

    // Extract balanced JSON using brace counting
    var jsonStr = extractBalancedJSON(html, eqIdx);
    if (!jsonStr) continue;

    try {
      var data = JSON.parse(jsonStr);
      if (data.widgetType || data.sectionType || data.widgetId) {
        configs.push(data);
      }
    } catch (e) {
      // Skip unparseable configs
    }
  }

  // 2. Find "var slots = [...]" — lazy-loaded widgets (tile skeletons, no images)
  var slotsSearchPos = 0;
  while (true) {
    var slotsIdx = html.indexOf('var slots', slotsSearchPos);
    if (slotsIdx < 0) break;
    slotsSearchPos = slotsIdx + 9;

    var bracketIdx = html.indexOf('[', slotsIdx);
    if (bracketIdx < 0 || bracketIdx > slotsIdx + 20) continue;

    var slotsJson = extractBalancedBrackets(html, bracketIdx);
    if (!slotsJson) continue;

    try {
      var slots = JSON.parse(slotsJson);
      for (var i = 0; i < slots.length; i++) {
        var slot = slots[i];
        var skeleton = slot.widgetSkeleton || {};
        if (skeleton.widgetType || skeleton.tiles) {
          configs.push({
            widgetType: skeleton.widgetType || 'editorialrow',
            widgetId: slot.widgetId || '',
            tiles: (skeleton.tiles || []).map(function(t) {
              return { type: t.type || 'image', size: t.size || 'standard', content: {} };
            }),
            sectionType: 'EditorialRow',
            isLazyLoaded: true, // Mark as skeleton data (no image URLs)
          });
        }
      }
    } catch (e) { /* skip malformed slots */ }
  }

  return configs;
}

function extractBalancedJSON(html, startPos) {
  return extractBalanced(html, startPos, '{', '}');
}

function extractBalancedBrackets(html, startPos) {
  return extractBalanced(html, startPos, '[', ']');
}

function extractBalanced(html, startPos, openChar, closeChar) {
  var depth = 0;
  var inString = false;
  var escNext = false;

  for (var i = startPos; i < html.length && i < startPos + 500000; i++) {
    var ch = html[i];
    if (escNext) { escNext = false; continue; }
    if (ch === '\\') { escNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return html.slice(startPos, i + 1);
    }
  }
  return null;
}

// Extract modules from JSON widget configs
function extractModulesFromConfigs(configs) {
  var modules = [];

  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];
    var wtype = (config.widgetType || '').toLowerCase();

    // Skip header — it's the hero, not a content module
    if (wtype === 'header') continue;

    if (wtype === 'editorialrow') {
      var tiles = config.tiles || (config.content && config.content.tiles) || [];
      if (tiles.length === 0) continue;

      // Skip share/social widgets (externalwidget tiles)
      var isShareWidget = tiles.length === 1 && tiles[0].type === 'externalwidget';
      if (isShareWidget) continue;

      var tileData = [];
      for (var j = 0; j < tiles.length; j++) {
        var tile = tiles[j];
        var tContent = tile.content || {};
        var imageUrl = tContent.imageUrl || tContent.imageKey || '';
        // Sometimes image data is nested
        if (!imageUrl && tContent.image) {
          imageUrl = tContent.image.imageUrl || tContent.image.imageKey || '';
        }

        tileData.push({
          type: tile.type || 'image',
          size: tile.size || 'standard',
          hasImage: !!imageUrl,
          imageUrl: imageUrl,
          title: tContent.headline || tContent.title || '',
          text: tContent.bodyText || tContent.description || '',
          altText: tContent.altText || tContent.a11yImageAltText || '',
          hasLink: !!(tContent.pageId || tContent.callToAction),
        });
      }

      modules.push({
        type: wtype === 'editorialrow' ? 'editorial_row' : wtype,
        layout: approximateLayout(tiles.length, false),
        tileCount: tiles.length,
        tiles: tileData,
        images: tileData.filter(function(t) { return t.hasImage; }).map(function(t) {
          return { url: t.imageUrl, alt: t.altText, isFullWidth: t.size === 'large' };
        }),
        texts: tileData.filter(function(t) { return t.title || t.text; }).map(function(t) {
          return t.title || t.text;
        }),
        hasProductGrid: false,
        hasVideo: false,
        source: config.isLazyLoaded ? 'lazy' : 'config',
      });
    } else if (wtype === 'productgrid' || wtype === 'categoryselectorwithproductgrid') {
      modules.push({
        type: 'product_grid',
        layout: 'product_grid',
        tileCount: 0,
        images: [],
        texts: [],
        hasProductGrid: true,
        hasVideo: false,
        source: 'config',
      });
    } else if (wtype === 'video' || wtype === 'videowidget') {
      modules.push({
        type: 'video',
        layout: 'fullwidth',
        tileCount: 0,
        images: [],
        texts: [],
        hasProductGrid: false,
        hasVideo: true,
        source: 'config',
      });
    }
  }

  return modules;
}

// Enrich config-based modules with images from the rendered DOM
// (interactiveImage / ShoppableImage tiles have images in DOM but not in config JSON)
function enrichModulesWithDOM(modules, configs, doc) {
  for (var i = 0; i < modules.length; i++) {
    var module = modules[i];
    if (module.source !== 'config') continue;

    // Find the corresponding config to get widgetId
    var config = configs[i + 1]; // +1 because first config is Header (skipped)
    if (!config || !config.widgetId) continue;

    // Find the rendered DOM container for this widget
    var container = doc.querySelector('[id$="-' + config.widgetId + '"]');
    if (!container) continue;

    // Extract images from the rendered DOM
    var domImages = extractImagesFromElement(container);

    // If DOM has more images than config, use DOM images (they're more complete)
    if (domImages.length > module.images.length) {
      module.images = domImages;
    }
  }
}

// Extract images from JSON widget configs
function extractImagesFromConfigs(configs) {
  var images = [];
  var seen = {};

  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];

    // Header hero image
    var content = config.content || {};
    if (content.imageUrl) {
      addConfigImage(images, seen, content.imageUrl, content.alt || content.a11yImageAltText || 'Hero');
    }

    // Mobile content image
    var mobile = content.mobileContent || config.mobileContent || {};
    if (mobile.imageUrl) {
      addConfigImage(images, seen, mobile.imageUrl, 'Mobile');
    }

    // Tile images
    var tiles = config.tiles || content.tiles || [];
    for (var j = 0; j < tiles.length; j++) {
      var tile = tiles[j];
      var tc = tile.content || {};

      if (tc.imageUrl) {
        addConfigImage(images, seen, tc.imageUrl, tc.altText || tc.a11yImageAltText || '');
      }
      if (tc.imageKey && !tc.imageUrl) {
        addConfigImage(images, seen, tc.imageKey, tc.altText || '');
      }

      // Mobile tile image
      var mobileT = tc.mobileContent || tile.mobileContent || {};
      if (mobileT.imageUrl) {
        addConfigImage(images, seen, mobileT.imageUrl, 'Mobile');
      }
    }
  }

  return images;
}

function addConfigImage(images, seen, url, alt) {
  if (!url) return;
  // Ensure it's a full URL
  if (url.indexOf('http') !== 0) {
    url = 'https://m.media-amazon.com/images/S/' + url;
  }
  var key = normalizeImageUrl(url);
  if (seen[key]) return;
  seen[key] = true;
  images.push({ url: url, alt: alt || '', width: 0, height: 0 });
}

// Extract hero from config
function extractHeroFromConfig(configs) {
  for (var i = 0; i < configs.length; i++) {
    var config = configs[i];
    if ((config.widgetType || '').toLowerCase() === 'header' || (config.sectionType || '').toLowerCase() === 'hero') {
      var content = config.content || {};
      if (content.imageUrl) {
        return { url: content.imageUrl, alt: content.a11yImageAltText || content.alt || 'Store Hero', isHero: true };
      }
    }
  }
  return null;
}

// Extract navigation from config
function extractNavigationFromConfig(configs, sourceUrl) {
  var amazonOrigin = 'https://www.amazon.de';
  try { amazonOrigin = new URL(sourceUrl).origin; } catch (e) { /* default */ }

  var sourcePageId = '';
  var sourceMatch = (sourceUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (sourceMatch) sourcePageId = sourceMatch[1].toUpperCase();

  for (var i = 0; i < configs.length; i++) {
    var nav = (configs[i].content || {}).nav;
    if (!nav || typeof nav !== 'object') continue;

    var links = [];
    var keys = Object.keys(nav);
    for (var j = 0; j < keys.length; j++) {
      var pageId = keys[j].toUpperCase();
      if (pageId === sourcePageId) continue;

      var entry = nav[keys[j]];
      if (!entry || !entry.href) continue;

      // Only include direct children (level 2 = main nav items)
      // Level 3 = sub-navigation items (also include them)
      var absUrl = entry.href.indexOf('http') === 0 ? entry.href : amazonOrigin + entry.href;
      absUrl = cleanTrackingParams(absUrl);

      links.push({
        pageId: pageId,
        name: entry.title || '',
        url: absUrl,
        level: entry.level || 0,
        parent: entry.parent || '',
      });
    }

    if (links.length > 0) return links;
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// DOM-BASED EXTRACTION (FALLBACK)
// ═══════════════════════════════════════════════════════════

function extractModulesFromDOM(doc) {
  var modules = [];

  // Find rendered editorial rows
  var rows = doc.querySelectorAll('[data-testid="editorial-row"], [class*="EditorialRow__row__"]');
  if (rows.length === 0) {
    rows = doc.querySelectorAll('[id^="EditorialRow-"]');
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row.innerHTML || row.innerHTML.trim().length < 20) continue;
    var module = classifyDOMModule(row);
    if (module) modules.push(module);
  }

  return modules;
}

function classifyDOMModule(row) {
  var images = extractImagesFromElement(row);
  var texts = extractTextsFromElement(row);
  var tiles = row.querySelectorAll('[data-testid="large-editorial-tile"], [data-testid="editorial-tile-image"], [class*="EditorialTile__tile__"]');
  var tileCount = tiles.length;
  var hasProductGrid = row.querySelector('[class*="ProductGrid__"]') !== null;
  var hasVideo = row.querySelector('video, [class*="Video__"]') !== null;

  if (images.length === 0 && texts.length === 0 && !hasProductGrid && !hasVideo && tileCount === 0) return null;

  var type = 'unknown';
  if (hasVideo) type = 'video';
  else if (hasProductGrid) type = 'product_grid';
  else if (tileCount === 1 && images.length === 1 && images[0].isFullWidth) type = 'hero_or_banner';
  else if (tileCount > 1 || images.length > 1) type = 'image_grid';
  else if (images.length === 1) type = 'image_section';
  else if (texts.length > 0) type = 'text_section';

  return {
    type: type,
    layout: approximateLayout(tileCount > 0 ? tileCount : images.length, hasProductGrid),
    tileCount: tileCount,
    images: images,
    texts: texts,
    hasProductGrid: hasProductGrid,
    hasVideo: hasVideo,
    source: 'dom',
  };
}

// ═══════════════════════════════════════════════════════════
// BRAND NAME
// ═══════════════════════════════════════════════════════════

function extractBrandName(doc, html, configs) {
  // Method 1: Breadcrumb (most reliable)
  var breadcrumb = doc.querySelector('[data-testid="breadcrumb-item"] [itemprop="name"]');
  if (breadcrumb && breadcrumb.textContent) return breadcrumb.textContent.trim();

  // Method 2: NavBar aria-label
  var navBar = doc.querySelector('[class*="Navigation__navBar__"]');
  if (navBar) {
    var ariaLabel = navBar.getAttribute('aria-label') || '';
    var navMatch = ariaLabel.match(/^(.+?)\s+Navigation/i);
    if (navMatch) return navMatch[1].trim();
  }

  // Method 3: Follow button
  var followBtn = doc.querySelector('[data-arialabelfollow]');
  if (followBtn) {
    var followLabel = followBtn.getAttribute('data-arialabelfollow') || '';
    var fMatch = followLabel.match(/^(.+?)\s+(?:folgen|follow)/i);
    if (fMatch) return fMatch[1].trim();
  }

  // Method 4: og:title
  var ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) return ogTitle.content.trim();

  // Method 5: canonical URL brand segment
  var canonical = doc.querySelector('link[rel="canonical"]');
  if (canonical) {
    var canonMatch = (canonical.href || '').match(/\/stores\/([^\/]+)\/page/);
    if (canonMatch && canonMatch[1] !== 'page') return decodeURIComponent(canonMatch[1]);
  }

  // Method 6: page title
  var title = doc.querySelector('title');
  if (title) {
    var t = title.textContent.trim();
    var prefixes = ['Amazon.de: ', 'Amazon.com: ', 'Amazon.co.uk: ', 'Amazon.fr: '];
    for (var i = 0; i < prefixes.length; i++) {
      if (t.indexOf(prefixes[i]) === 0) return t.slice(prefixes[i].length);
    }
  }

  return '';
}

// ═══════════════════════════════════════════════════════════
// NAVIGATION (DOM-based fallback)
// ═══════════════════════════════════════════════════════════

function extractNavigationFromDOM(doc, html, sourceUrl) {
  var links = [];
  var seen = {};

  var amazonOrigin = 'https://www.amazon.de';
  try { amazonOrigin = new URL(sourceUrl).origin; } catch (e) {}

  var sourcePageId = '';
  var sourceMatch = (sourceUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (sourceMatch) sourcePageId = sourceMatch[1].toUpperCase();

  // Try DOM nav items
  var navItems = doc.querySelectorAll('[data-testid="nav-item"] > a[href*="/stores/page/"]');
  for (var i = 0; i < navItems.length; i++) {
    var a = navItems[i];
    var href = a.getAttribute('href') || '';
    var pageIdMatch = href.match(/page\/([A-F0-9-]{36})/i);
    if (!pageIdMatch) continue;

    var pageId = pageIdMatch[1].toUpperCase();
    if (pageId === sourcePageId || seen[pageId]) continue;
    seen[pageId] = true;

    var nameEl = a.querySelector('span span') || a.querySelector('span');
    var name = nameEl ? nameEl.textContent.trim() : (a.textContent || '').trim();
    var absUrl = href.indexOf('http') === 0 ? href : amazonOrigin + href;
    absUrl = cleanTrackingParams(absUrl);

    links.push({ pageId: pageId, name: name, url: absUrl });
  }

  // Fallback: raw HTML regex for /stores/page/ links
  if (links.length === 0) {
    var regex = /href=["']([^"']*\/stores\/(?:[^"'\/]+\/)?page\/([A-F0-9-]{36})[^"']*)["']/gi;
    var match;
    while ((match = regex.exec(html)) !== null) {
      var rawPath = match[1];
      var pid = match[2].toUpperCase();
      if (pid === sourcePageId || seen[pid]) continue;
      if (rawPath.indexOf('field-lbr_brands') >= 0 || rawPath.indexOf('ref_=nav_cs') >= 0) continue;
      seen[pid] = true;

      var absUrl2 = rawPath.indexOf('http') === 0 ? rawPath : amazonOrigin + (rawPath.indexOf('/') === 0 ? rawPath : '/' + rawPath);
      absUrl2 = cleanTrackingParams(absUrl2);

      var nameMatch = html.slice(match.index, match.index + 500).match(/<span[^>]*>([^<]{2,60})<\/span>/);
      links.push({ pageId: pid, name: nameMatch ? nameMatch[1].trim() : '', url: absUrl2 });
    }
  }

  return links;
}

function cleanTrackingParams(url) {
  try {
    var urlObj = new URL(url);
    ['ref', 'ref_', 'ingress', 'visitId', 'store_ref', 'lp_asin',
     'lp_context_asin', 'lp_context_query'].forEach(function(p) {
      urlObj.searchParams.delete(p);
    });
    return urlObj.toString();
  } catch (e) { return url; }
}

// ═══════════════════════════════════════════════════════════
// IMAGE EXTRACTION
// ═══════════════════════════════════════════════════════════

function extractStoreImagesFromDOM(doc) {
  var storeRoot = doc.querySelector('[id^="Header-"]') || doc.querySelector('[id^="EditorialRow-"]');
  var container = storeRoot ? storeRoot.parentElement || doc.body : doc.body;

  var images = [];
  var seen = {};
  var allImgs = container.querySelectorAll('img');

  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    var src = img.getAttribute('src') || '';
    var srcset = img.getAttribute('srcset') || '';
    if (srcset) {
      var highRes = extractHighestResSrcset(srcset);
      if (highRes) src = highRes;
    }
    if (!src || !isStoreImage(src)) continue;
    var key = normalizeImageUrl(src);
    if (seen[key]) continue;
    seen[key] = true;
    images.push({ url: src, alt: img.alt || '', width: 0, height: 0 });
  }

  return images;
}

function extractImagesFromElement(el) {
  var images = [];
  var seen = {};
  var imgs = el.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].getAttribute('src') || '';
    var srcset = imgs[i].getAttribute('srcset') || '';
    if (srcset) {
      var highRes = extractHighestResSrcset(srcset);
      if (highRes) src = highRes;
    }
    if (!src || !isStoreImage(src)) continue;
    var key = normalizeImageUrl(src);
    if (seen[key]) continue;
    seen[key] = true;
    images.push({
      url: src,
      alt: imgs[i].alt || '',
      isFullWidth: (src.indexOf('SX3000') >= 0 || src.indexOf('SX1500') >= 0 || src.indexOf('SX1920') >= 0),
    });
  }
  return images;
}

function extractHighestResSrcset(srcset) {
  var parts = srcset.split(',').map(function(s) { return s.trim(); });
  var best = null;
  var bestWidth = 0;
  for (var i = 0; i < parts.length; i++) {
    var pieces = parts[i].split(/\s+/);
    if (pieces.length >= 2) {
      var w = parseInt(pieces[1]);
      if (w > bestWidth) {
        bestWidth = w;
        best = pieces[0];
      }
    }
  }
  return best;
}

function isStoreImage(src) {
  if (!src) return false;
  // Reject tracking, UI elements, and non-content images
  if (src.indexOf('sprite') >= 0) return false;
  if (src.indexOf('pixel') >= 0) return false;
  if (src.indexOf('beacon') >= 0) return false;
  if (src.indexOf('transparent-pixel') >= 0) return false;
  if (src.indexOf('loading-') >= 0) return false;
  if (src.indexOf('data:image') === 0) return false;
  if (src.indexOf('/images/G/') >= 0) return false;
  if (src.indexOf('adsystem') >= 0) return false;
  if (src.indexOf('fls-eu') >= 0) return false;
  if (src.match(/\.(js|css)\??/)) return false;
  if (src.indexOf('1x1') >= 0) return false;
  if (src.indexOf('icon') >= 0 && src.indexOf('.png') >= 0 && src.indexOf('SX') < 0) return false;
  if (src.indexOf('nav-sprite') >= 0) return false;
  if (src.indexOf('amazonui') >= 0) return false;

  // Store-designed images (al- prefix = custom store content)
  if (src.indexOf('/images/S/al-') >= 0) return true;
  // Amazon media CDN store images
  if (src.indexOf('m.media-amazon.com/images/S/') >= 0) return true;
  // Product and content images from Amazon media CDN (also used in stores)
  if (src.indexOf('m.media-amazon.com/images/I/') >= 0) return true;
  // Any sufficiently large Amazon-hosted image (SX/SY resize params indicate real content)
  if (src.indexOf('m.media-amazon.com') >= 0 && (src.indexOf('SX') >= 0 || src.indexOf('SY') >= 0)) return true;
  // Store images served from images-na.ssl-images-amazon.com
  if (src.indexOf('images-na.ssl-images-amazon.com/images/') >= 0) return true;
  // images-eu (European CDN)
  if (src.indexOf('images-eu.ssl-images-amazon.com/images/') >= 0) return true;

  return false;
}

function extractImagesFromRawHTML(html) {
  var images = [];
  var seen = {};

  // Store-designed images (al- prefix) from raw HTML
  var storeImagePattern = /(?:src|srcset)=["']([^"']*images\/S\/al-[^"'\s,]+)/gi;
  var match;
  while ((match = storeImagePattern.exec(html)) !== null) {
    var url = match[1];
    if (url.indexOf('http') !== 0) url = 'https://m.media-amazon.com/' + url;
    var key = normalizeImageUrl(url);
    if (!seen[key]) {
      seen[key] = true;
      images.push({ url: url, alt: '', width: 0, height: 0 });
    }
  }

  // Also extract content images from m.media-amazon.com/images/I/ (product + store content)
  var mediaImagePattern = /(?:src|srcset)=["'](https?:\/\/m\.media-amazon\.com\/images\/[SI]\/[^"'\s,]+)/gi;
  while ((match = mediaImagePattern.exec(html)) !== null) {
    var mUrl = match[1];
    // Skip tiny images (likely icons/UI)
    if (mUrl.indexOf('SX50') >= 0 || mUrl.indexOf('SX36') >= 0 || mUrl.indexOf('SX20') >= 0) continue;
    var mKey = normalizeImageUrl(mUrl);
    if (!seen[mKey]) {
      seen[mKey] = true;
      images.push({ url: mUrl, alt: '', width: 0, height: 0 });
    }
  }

  // Also try images-eu and images-na CDN
  var cdnPattern = /(?:src|srcset)=["'](https?:\/\/images-(?:eu|na)\.ssl-images-amazon\.com\/images\/[^"'\s,]+)/gi;
  while ((match = cdnPattern.exec(html)) !== null) {
    var cUrl = match[1];
    var cKey = normalizeImageUrl(cUrl);
    if (!seen[cKey]) {
      seen[cKey] = true;
      images.push({ url: cUrl, alt: '', width: 0, height: 0 });
    }
  }

  return images;
}

// ═══════════════════════════════════════════════════════════
// TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════

function extractTexts(doc, html) {
  var texts = [];
  var seen = {};

  // From DOM: editorial content
  var storeRoot = doc.querySelector('[id^="Header-"]');
  if (storeRoot) {
    var parent = storeRoot.parentElement || doc.body;
    var headings = parent.querySelectorAll('[class*="EditorialTile__"] h1, [class*="EditorialTile__"] h2, [class*="EditorialTile__"] h3, [data-testid="editorial-row"] h1, [data-testid="editorial-row"] h2');
    for (var i = 0; i < headings.length; i++) {
      var t = (headings[i].textContent || '').trim();
      if (t && t.length > 2 && t.length < 300 && !seen[t]) {
        seen[t] = true;
        texts.push({ type: 'heading', text: t });
      }
    }
  }

  // From JSON configs: tile titles and texts
  var configs = extractWidgetConfigs(html);
  for (var c = 0; c < configs.length; c++) {
    var tiles = configs[c].tiles || [];
    for (var j = 0; j < tiles.length; j++) {
      var tc = tiles[j].content || {};
      if (tc.headline && !seen[tc.headline]) {
        seen[tc.headline] = true;
        texts.push({ type: 'heading', text: tc.headline });
      }
      if (tc.title && !seen[tc.title]) {
        seen[tc.title] = true;
        texts.push({ type: 'heading', text: tc.title });
      }
      if (tc.bodyText && !seen[tc.bodyText]) {
        seen[tc.bodyText] = true;
        texts.push({ type: 'paragraph', text: tc.bodyText });
      }
    }
  }

  return texts;
}

function extractTextsFromElement(el) {
  var texts = [];
  var seen = {};
  var nodes = el.querySelectorAll('h1, h2, h3, h4, p');
  for (var i = 0; i < nodes.length; i++) {
    var t = (nodes[i].textContent || '').trim();
    if (t && t.length > 3 && t.length < 500 && !seen[t]) {
      seen[t] = true;
      texts.push(t);
    }
  }
  return texts;
}

// ═══════════════════════════════════════════════════════════
// META & HERO
// ═══════════════════════════════════════════════════════════

function extractMeta(doc) {
  var ogImage = doc.querySelector('meta[property="og:image"]');
  var description = doc.querySelector('meta[name="description"]');
  return {
    ogImage: ogImage ? ogImage.content : '',
    description: description ? description.content : '',
  };
}

function extractStoreHeroImage(doc, html) {
  // data-testid="hero-image"
  var heroContainer = doc.querySelector('[data-testid="hero-image"]');
  if (heroContainer) {
    var heroImg = heroContainer.querySelector('img');
    if (heroImg) {
      var src = heroImg.getAttribute('src') || '';
      var srcset = heroImg.getAttribute('srcset') || '';
      if (srcset) {
        var highRes = extractHighestResSrcset(srcset);
        if (highRes) src = highRes;
      }
      if (src && src.indexOf('media-amazon') >= 0) {
        return { url: src, alt: heroImg.alt || 'Store Hero', isHero: true };
      }
    }
  }

  // og:image fallback
  var ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content && ogImage.content.indexOf('media-amazon') >= 0) {
    return { url: ogImage.content, alt: 'Store Hero', isHero: true };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function approximateLayout(tileOrImageCount, hasGrid) {
  if (hasGrid) return 'product_grid';
  switch (tileOrImageCount) {
    case 0: return 'text_only';
    case 1: return 'fullwidth';
    case 2: return 'std-2equal';
    case 3: return 'vh-w2s';
    case 4: return '2x2wide';
    case 5: return 'lg-4grid';
    case 6: return '2s-4grid';
    case 8: return '4x2grid';
    default: return tileOrImageCount > 4 ? 'multi_tile' : 'unknown';
  }
}

function normalizeImageUrl(url) {
  // Normalize to base image UUID for dedup.
  // Amazon image URLs: .../al-eu-ZONE/UUID._CR0,0,W,H_SXN_.ext or .../al-eu-ZONE/UUID.ext
  // We strip everything between the UUID and the final file extension.
  var base = (url || '').split('?')[0];
  base = base.replace(/%2C/gi, ',');
  // Remove ALL size/crop suffixes: ._anything_anything_.ext → .ext
  // Match from first ._ after UUID to last _. before extension
  base = base.replace(/(\.[a-z]{3,4})$/i, function(ext) {
    // Get everything before the extension
    var withoutExt = base.slice(0, base.length - ext.length);
    // Remove ._..._ suffix chain (everything after the UUID's last hex char)
    var cleaned = withoutExt.replace(/\._.*$/, '');
    return cleaned + ext;
  });
  // Simpler approach: extract the UUID-based path and extension
  var uuidMatch = base.match(/(\/images\/S\/al-[^/]+\/[a-f0-9-]+)\.[^/]*$/i);
  if (uuidMatch) return uuidMatch[1];
  return base;
}

function mergeImageLists(list1, list2) {
  var seen = {};
  var merged = [];
  function addList(list) {
    for (var i = 0; i < list.length; i++) {
      var key = normalizeImageUrl(list[i].url);
      if (!seen[key]) {
        seen[key] = true;
        merged.push(list[i]);
      }
    }
  }
  addList(list1);
  addList(list2);
  return merged;
}

// ═══════════════════════════════════════════════════════════
// COMBINE MULTIPLE PAGES
// ═══════════════════════════════════════════════════════════

export function combineStorePages(pages) {
  if (!pages || pages.length === 0) return null;

  var first = pages[0];
  var allImages = [];
  var allTexts = [];
  var allModules = [];
  var seen = {};

  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    for (var j = 0; j < page.images.length; j++) {
      var img = page.images[j];
      var imgKey = normalizeImageUrl(img.url);
      if (!seen[imgKey]) {
        seen[imgKey] = true;
        allImages.push({ url: img.url, alt: img.alt, page: page.url });
      }
    }
    for (var k = 0; k < page.texts.length; k++) {
      allTexts.push({ text: page.texts[k].text, type: page.texts[k].type, page: page.url });
    }
    for (var m = 0; m < page.modules.length; m++) {
      allModules.push(Object.assign({}, page.modules[m], { page: page.url }));
    }
  }

  return {
    brandName: first.brandName,
    storeUrl: first.url,
    navigation: first.navigation,
    pageCount: pages.length,
    pages: pages.map(function(p) {
      return {
        url: p.url,
        brandName: p.brandName,
        pageName: p.pageName || '',
        moduleCount: p.modules.length,
        imageCount: p.images.length,
        modules: p.modules,
      };
    }),
    allImages: allImages,
    allTexts: allTexts,
    allModules: allModules,
    summary: {
      totalImages: allImages.length,
      totalModules: allModules.length,
      totalPages: pages.length,
      moduleTypes: countBy(allModules, 'type'),
      layoutTypes: countBy(allModules, 'layout'),
    },
  };
}

function countBy(arr, key) {
  var counts = {};
  for (var i = 0; i < arr.length; i++) {
    var val = arr[i][key];
    counts[val] = (counts[val] || 0) + 1;
  }
  return counts;
}
