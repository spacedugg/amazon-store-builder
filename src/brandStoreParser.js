// ─── AMAZON BRAND STORE HTML PARSER ───
// Parses rendered Brand Store HTML into structured JSON.
// Works client-side. Input: raw HTML string from Web Unlocker.
//
// Amazon Brand Stores use CSS-module class names like:
//   EditorialRow__row__XXXXX, EditorialTile__tile__XXXXX,
//   Hero__heroImage__XXXXX, Navigation__navItem__XXXXX
// We match these with [class*="..."] or data-testid selectors.

export function parseBrandStoreHTML(html, sourceUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  // Find the store content area (skip Amazon chrome like header/footer/nav)
  var storeContent = findStoreContentArea(doc);

  // Extract hero image
  var heroImage = extractStoreHeroImage(doc, html);

  // Extract modules from the actual store content
  var modules = extractModules(doc, storeContent);

  // Extract images: prefer DOM, supplement with raw HTML, then deduplicate
  var domImages = extractStoreImages(storeContent || doc);
  var rawImages = extractImagesFromRawHTML(html);
  var allImages = mergeImageLists(domImages, rawImages);

  // Add hero image at the front if not already included
  if (heroImage && !allImages.some(function(img) { return img.url === heroImage.url; })) {
    allImages.unshift(heroImage);
  }

  var result = {
    url: sourceUrl || '',
    brandName: extractBrandName(doc, html),
    navigation: extractNavigation(doc, html, sourceUrl),
    modules: modules,
    images: allImages,
    texts: extractTexts(doc, storeContent),
    meta: extractMeta(doc),
    heroImage: heroImage,
  };

  return result;
}

// ─── FIND THE STORE CONTENT AREA (skip Amazon chrome) ───
function findStoreContentArea(doc) {
  // The store content is rendered inside a div with an id starting with "Header-"
  // or inside elements with store-specific class patterns
  var storeRoot = doc.querySelector('[id^="Header-"]');
  if (storeRoot) return storeRoot;

  // Fallback: look for the first editorial row's parent
  var firstRow = doc.querySelector('[data-testid="editorial-row"], [class*="EditorialRow__"]');
  if (firstRow && firstRow.parentElement) return firstRow.parentElement;

  // Last resort: look for stores theme class
  var themed = doc.querySelector('[class*="stores-theme-"]');
  if (themed) return themed;

  return null;
}

// ─── BRAND NAME ───
function extractBrandName(doc, html) {
  // Method 1: Breadcrumb (most reliable for store name)
  var breadcrumb = doc.querySelector('[data-testid="breadcrumb-item"] [itemprop="name"]');
  if (breadcrumb && breadcrumb.textContent) return breadcrumb.textContent.trim();

  // Method 2: Navigation bar aria-label often contains brand name
  var navBar = doc.querySelector('[class*="Navigation__navBar__"]');
  if (navBar) {
    var ariaLabel = navBar.getAttribute('aria-label') || '';
    var navMatch = ariaLabel.match(/^(.+?)\s+Navigation/i);
    if (navMatch) return navMatch[1].trim();
  }

  // Method 3: og:title
  var ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) return ogTitle.content.trim();

  // Method 4: page title, strip Amazon prefix
  var title = doc.querySelector('title');
  if (title) {
    var t = title.textContent.trim();
    var prefixes = ['Amazon.de: ', 'Amazon.com: ', 'Amazon.co.uk: ', 'Amazon.fr: '];
    for (var i = 0; i < prefixes.length; i++) {
      if (t.indexOf(prefixes[i]) === 0) return t.slice(prefixes[i].length);
    }
    return t;
  }

  // Method 5: From raw HTML storeId context
  var brandMatch = html.match(/aria-label="([^"]+)\s+(?:folgen|follow)"/i);
  if (brandMatch) return brandMatch[1].trim();

  return '';
}

// ─── NAVIGATION (from DOM with data-testid, fallback to raw HTML) ───
function extractNavigation(doc, html, sourceUrl) {
  var links = [];
  var seen = {};

  // Determine Amazon origin
  var amazonOrigin = 'https://www.amazon.de';
  try {
    var srcUrl = new URL(sourceUrl);
    amazonOrigin = srcUrl.origin;
  } catch (e) { /* default */ }

  // Extract current page UUID to skip self-links
  var sourcePageId = '';
  var sourceMatch = (sourceUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (sourceMatch) sourcePageId = sourceMatch[1].toUpperCase();

  // Method 1: DOM-based extraction using data-testid="nav-item"
  var navItems = doc.querySelectorAll('[data-testid="nav-item"] > a[href*="/stores/page/"]');
  for (var i = 0; i < navItems.length; i++) {
    var a = navItems[i];
    var href = a.getAttribute('href') || '';
    var pageIdMatch = href.match(/page\/([A-F0-9-]{36})/i);
    if (!pageIdMatch) continue;

    var pageId = pageIdMatch[1].toUpperCase();
    if (pageId === sourcePageId || seen[pageId]) continue;
    seen[pageId] = true;

    // Get the link text
    var nameSpan = a.querySelector('[class*="Navigation__linkText__"] span, [class*="linkText"] span');
    var name = nameSpan ? nameSpan.textContent.trim() : (a.textContent || '').trim();

    // Build absolute URL
    var absUrl = href.indexOf('http') === 0 ? href : amazonOrigin + (href.indexOf('/') === 0 ? href : '/' + href);

    // Clean tracking params
    absUrl = cleanTrackingParams(absUrl);

    links.push({ pageId: pageId, name: name, url: absUrl });
  }

  // Method 2: Fallback to raw HTML regex if DOM didn't find any
  if (links.length === 0) {
    links = extractNavigationFromRawHTML(html, sourceUrl);
  }

  return links;
}

// Fallback navigation extraction from raw HTML
function extractNavigationFromRawHTML(html, sourceUrl) {
  var links = [];
  var seen = {};

  var amazonOrigin = 'https://www.amazon.de';
  try {
    var srcUrl = new URL(sourceUrl);
    amazonOrigin = srcUrl.origin;
  } catch (e) { /* default */ }

  var sourcePageId = '';
  var sourceMatch = (sourceUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (sourceMatch) sourcePageId = sourceMatch[1].toUpperCase();

  // Find hrefs within navigation elements (nav-item context)
  var regex = /data-testid="nav-item"[^>]*>[\s\S]*?href=["']([^"']*\/stores\/(?:[^"'\/]+\/)?page\/([A-F0-9-]{36})[^"']*)["'][\s\S]*?<span[^>]*>([^<]{1,80})<\/span>/gi;
  var match;

  while ((match = regex.exec(html)) !== null) {
    var rawPath = match[1];
    var pageId = match[2].toUpperCase();
    var name = match[3].trim();

    if (pageId === sourcePageId || seen[pageId]) continue;
    seen[pageId] = true;

    var absUrl = rawPath.indexOf('http') === 0 ? rawPath : amazonOrigin + (rawPath.indexOf('/') === 0 ? rawPath : '/' + rawPath);
    absUrl = cleanTrackingParams(absUrl);

    links.push({ pageId: pageId, name: name, url: absUrl });
  }

  // Broader fallback: any /stores/page/ links
  if (links.length === 0) {
    var broadRegex = /href=["']([^"']*\/stores\/(?:[^"'\/]+\/)?page\/([A-F0-9-]{36})[^"']*)["']/gi;
    while ((match = broadRegex.exec(html)) !== null) {
      var rawPath2 = match[1];
      var pageId2 = match[2].toUpperCase();

      if (pageId2 === sourcePageId || seen[pageId2]) continue;

      // Skip Amazon header/navigation links
      if (rawPath2.indexOf('field-lbr_brands') >= 0) continue;
      if (rawPath2.indexOf('ref_=nav_cs') >= 0) continue;

      seen[pageId2] = true;

      var absUrl2 = rawPath2.indexOf('http') === 0 ? rawPath2 : amazonOrigin + (rawPath2.indexOf('/') === 0 ? rawPath2 : '/' + rawPath2);
      absUrl2 = cleanTrackingParams(absUrl2);

      // Try to find a nearby name
      var nameMatch = html.slice(match.index, match.index + 500).match(/<span[^>]*>([^<]{2,60})<\/span>/);
      var foundName = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : '';

      links.push({ pageId: pageId2, name: foundName, url: absUrl2 });
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

// ─── STORE MODULES / SECTIONS ───
function extractModules(doc, storeContent) {
  var modules = [];
  var container = storeContent || doc.body;

  // Primary: data-testid="editorial-row" (the actual store content rows)
  var rows = container.querySelectorAll('[data-testid="editorial-row"]');

  // Also try CSS-module class names
  if (rows.length === 0) {
    rows = container.querySelectorAll('[class*="EditorialRow__row__"]');
  }

  // Fallback: look for elements with data-feature attribute (older store format)
  if (rows.length === 0) {
    rows = container.querySelectorAll('[data-feature]');
    // Filter out non-content features
    rows = Array.prototype.filter.call(rows, function(el) {
      var feature = el.getAttribute('data-feature') || '';
      return feature !== 'cf' && feature !== '' && feature.indexOf('nav') < 0;
    });
  }

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row.innerHTML || row.innerHTML.trim().length < 20) continue;
    var module = classifyModule(row);
    if (module) modules.push(module);
  }

  // If still no modules found, try to detect hero as a single module
  if (modules.length === 0) {
    var hero = container.querySelector('[data-testid="hero-image"], [class*="Hero__hero__"]');
    if (hero) {
      modules.push({
        type: 'hero_or_banner',
        layout: 'fullwidth',
        images: extractImagesFromElement(hero),
        texts: [],
        hasProductGrid: false,
        hasVideo: false,
      });
    }
  }

  return modules;
}

function classifyModule(row) {
  var images = extractImagesFromElement(row);
  var texts = extractTextsFromElement(row);

  // Count tiles (each tile is a visual unit)
  var tiles = row.querySelectorAll(
    '[data-testid="large-editorial-tile"], [data-testid="editorial-tile-image"], ' +
    '[class*="EditorialTile__tile__"]'
  );
  var tileCount = tiles.length;

  var hasProductGrid = row.querySelector(
    '[class*="ProductGrid__"], [class*="product-grid"], [data-component-type="product"]'
  ) !== null;
  var hasVideo = row.querySelector(
    'video, [class*="Video__"], [class*="video-container"]'
  ) !== null;
  var hasShoppableImage = row.querySelector(
    '[class*="ShoppableImage__"], [class*="shoppable"]'
  ) !== null;

  // Skip rows that are purely empty
  if (images.length === 0 && texts.length === 0 && !hasProductGrid && !hasVideo && tileCount === 0) return null;

  // Determine module type
  var type = 'unknown';
  if (hasVideo) type = 'video';
  else if (hasProductGrid) type = 'product_grid';
  else if (hasShoppableImage) type = 'shoppable_image';
  else if (tileCount === 1 && images.length === 1 && images[0].isFullWidth) type = 'hero_or_banner';
  else if (tileCount > 1 || images.length > 1) type = 'image_grid';
  else if (images.length === 1) type = 'image_section';
  else if (texts.length > 0) type = 'text_section';

  // Determine layout from tile count (more reliable than image count)
  var layoutBase = tileCount > 0 ? tileCount : images.length;
  var layout = approximateLayout(layoutBase, hasProductGrid);

  // Check for row layout hints in class names
  var rowClass = row.className || '';
  if (rowClass.indexOf('double') >= 0 || rowClass.indexOf('Double') >= 0) {
    if (tileCount === 2) layout = 'std-2equal';
  }
  if (rowClass.indexOf('single') >= 0 || rowClass.indexOf('Single') >= 0) {
    layout = 'fullwidth';
  }
  if (rowClass.indexOf('large') >= 0 || rowClass.indexOf('Large') >= 0) {
    if (type === 'image_grid') type = 'hero_or_banner';
  }

  return {
    type: type,
    layout: layout,
    tileCount: tileCount,
    images: images,
    texts: texts,
    hasProductGrid: hasProductGrid,
    hasVideo: hasVideo,
  };
}

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

// ─── IMAGE EXTRACTION (from DOM) ───
function extractStoreImages(container) {
  var images = [];
  var seen = {};
  var allImgs = container.querySelectorAll('img');

  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    var src = img.getAttribute('src') || '';

    // Check srcset for high-res versions
    var srcset = img.getAttribute('srcset') || '';
    if (srcset) {
      var highRes = extractHighestResSrcset(srcset);
      if (highRes) src = highRes;
    }

    if (!src || seen[src]) continue;
    if (!isStoreImage(src)) continue;
    seen[src] = true;

    images.push({
      url: src,
      alt: img.alt || '',
      width: parseInt(img.getAttribute('width')) || 0,
      height: parseInt(img.getAttribute('height')) || 0,
    });
  }

  // Background images from style attributes
  var bgElements = container.querySelectorAll('[style*="background-image"]');
  for (var j = 0; j < bgElements.length; j++) {
    var style = bgElements[j].getAttribute('style') || '';
    var bgMatch = style.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
    if (bgMatch && bgMatch[1] && isStoreImage(bgMatch[1]) && !seen[bgMatch[1]]) {
      seen[bgMatch[1]] = true;
      images.push({ url: bgMatch[1], alt: '', width: 0, height: 0 });
    }
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
    if (!src || !isStoreImage(src) || seen[src]) continue;
    seen[src] = true;

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
  // Skip obvious non-content images
  if (src.indexOf('sprite') >= 0) return false;
  if (src.indexOf('pixel') >= 0) return false;
  if (src.indexOf('beacon') >= 0) return false;
  if (src.indexOf('transparent-pixel') >= 0) return false;
  if (src.indexOf('loading-') >= 0) return false;
  if (src.indexOf('data:image') === 0) return false;
  // Skip Amazon UI assets (navigation sprites, icons, CSS assets)
  if (src.indexOf('/images/G/') >= 0) return false;
  if (src.indexOf('adsystem') >= 0) return false;
  if (src.indexOf('fls-eu') >= 0) return false;
  // Skip Amazon UI JS/CSS assets disguised as images
  if (src.match(/\.(js|css)\??/)) return false;
  // Skip tiny tracking images
  if (src.indexOf('1x1') >= 0) return false;

  // Store-designed images (highest priority — these are the custom brand store images)
  if (src.indexOf('/images/S/al-') >= 0) return true;
  if (src.indexOf('m.media-amazon.com/images/S/') >= 0) return true;

  // Product images (include if on Amazon CDN — but NOT UI/nav assets)
  if (src.indexOf('m.media-amazon.com/images/I/') >= 0) {
    // Only include if it looks like a real product/content image (has typical sizing params)
    // Skip tiny icons and nav elements
    if (src.match(/\d{2}[A-Za-z0-9]+L\./)) return true; // standard Amazon product image pattern
    return false;
  }

  return false;
}

// ─── TEXT EXTRACTION ───
function extractTexts(doc, storeContent) {
  var texts = [];
  var container = storeContent || doc.querySelector('[id^="Header-"]') || doc.body;
  var seen = {};

  // Get headings within editorial content
  var headings = container.querySelectorAll(
    '[class*="EditorialTile__"] h1, [class*="EditorialTile__"] h2, [class*="EditorialTile__"] h3, ' +
    '[data-testid="editorial-row"] h1, [data-testid="editorial-row"] h2, [data-testid="editorial-row"] h3, ' +
    '[class*="Heading__"] h1, [class*="Heading__"] h2, [class*="Heading__"] h3'
  );
  for (var i = 0; i < headings.length; i++) {
    var t = (headings[i].textContent || '').trim();
    if (t && t.length > 2 && t.length < 300 && !seen[t]) {
      seen[t] = true;
      texts.push({ type: 'heading', text: t });
    }
  }

  // Get paragraphs within editorial content
  var paras = container.querySelectorAll(
    '[class*="EditorialTile__"] p, [data-testid="editorial-row"] p, ' +
    '[class*="Text__"] p, [class*="RichText__"] p'
  );
  for (var j = 0; j < paras.length; j++) {
    var p = (paras[j].textContent || '').trim();
    if (p && p.length > 10 && p.length < 1000 && !seen[p]) {
      seen[p] = true;
      texts.push({ type: 'paragraph', text: p });
    }
  }

  // Fallback: if no texts found, try broader selectors within store content only
  if (texts.length === 0) {
    var allH = container.querySelectorAll('h1, h2, h3, h4');
    for (var k = 0; k < allH.length; k++) {
      var ht = (allH[k].textContent || '').trim();
      // Skip navigation and Amazon chrome text
      if (ht && ht.length > 2 && ht.length < 300 && !seen[ht] &&
          !isAmazonChromeText(ht)) {
        seen[ht] = true;
        texts.push({ type: 'heading', text: ht });
      }
    }
  }

  return texts;
}

function isAmazonChromeText(text) {
  var chromePatterns = [
    'Anmelden', 'Registrieren', 'Mein Konto', 'Warenkorb', 'Sign in',
    'Alle Kategorien', 'Kundenservice', 'Prime', 'Bestseller',
    'Neuerscheinungen', 'Angebote', 'Gutscheine', 'Folgen', 'Folgend',
    'Amazon', 'Impressum', 'Datenschutz', 'AGB', 'Karriere',
  ];
  for (var i = 0; i < chromePatterns.length; i++) {
    if (text === chromePatterns[i]) return true;
  }
  return false;
}

function extractTextsFromElement(el) {
  var texts = [];
  var nodes = el.querySelectorAll('h1, h2, h3, h4, p, [class*="Text__"]');
  var seen = {};
  for (var i = 0; i < nodes.length; i++) {
    var t = (nodes[i].textContent || '').trim();
    if (t && t.length > 3 && t.length < 500 && !seen[t]) {
      seen[t] = true;
      texts.push(t);
    }
  }
  return texts;
}

// ─── META DATA ───
function extractMeta(doc) {
  var ogImage = doc.querySelector('meta[property="og:image"]');
  var description = doc.querySelector('meta[name="description"]');
  return {
    ogImage: ogImage ? ogImage.content : '',
    description: description ? description.content : '',
  };
}

// ─── STORE HERO IMAGE ───
function extractStoreHeroImage(doc, html) {
  // Method 1: data-testid="hero-image" (most reliable)
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

  // Method 2: CSS class pattern
  var heroByClass = doc.querySelector('[class*="Hero__heroImage__"] img, [class*="Hero__hero__"] img');
  if (heroByClass) {
    var heroSrc = heroByClass.getAttribute('src') || '';
    if (heroSrc && heroSrc.indexOf('media-amazon') >= 0) {
      return { url: heroSrc, alt: heroByClass.alt || 'Store Hero', isHero: true };
    }
  }

  // Method 3: og:image meta tag
  var ogImage = doc.querySelector('meta[property="og:image"]');
  if (ogImage && ogImage.content && ogImage.content.indexOf('media-amazon') >= 0) {
    return { url: ogImage.content, alt: 'Store Hero', isHero: true };
  }

  return null;
}

// ─── EXTRACT IMAGES FROM RAW HTML (bypasses DOMParser lazy-load issues) ───
function extractImagesFromRawHTML(html) {
  var images = [];
  var seen = {};

  // Only extract store-designed images (al-eu pattern) from raw HTML
  // This avoids picking up Amazon chrome/UI images
  var storeImagePattern = /src=["'](https:\/\/m\.media-amazon\.com\/images\/S\/al-[^"']+)["']/gi;
  var match;

  while ((match = storeImagePattern.exec(html)) !== null) {
    var url = match[1];
    if (!seen[url]) {
      seen[url] = true;
      images.push({ url: url, alt: '', width: 0, height: 0 });
    }
  }

  // Also get from srcset (higher resolution versions)
  var srcsetPattern = /srcset=["']([^"']*images\/S\/al-[^"']*)["']/gi;
  while ((match = srcsetPattern.exec(html)) !== null) {
    var highRes = extractHighestResSrcset(match[1]);
    if (highRes && !seen[highRes]) {
      seen[highRes] = true;
      images.push({ url: highRes, alt: '', width: 0, height: 0 });
    }
  }

  // Background images with store image pattern
  var bgPattern = /url\(["']?(https:\/\/m\.media-amazon\.com\/images\/S\/al-[^"')]+)["']?\)/gi;
  while ((match = bgPattern.exec(html)) !== null) {
    if (!seen[match[1]]) {
      seen[match[1]] = true;
      images.push({ url: match[1], alt: '', width: 0, height: 0 });
    }
  }

  return images;
}

// ─── MERGE IMAGE LISTS (deduplicate) ───
function mergeImageLists(list1, list2) {
  var seen = {};
  var merged = [];
  function normalizeUrl(url) {
    // Ignore query params and size variants for dedup
    return url.split('?')[0].replace(/_SX\d+_/, '').replace(/_CR[^.]+/, '');
  }
  function addList(list) {
    for (var i = 0; i < list.length; i++) {
      var key = normalizeUrl(list[i].url);
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

// ─── COMBINE MULTIPLE PAGES INTO FULL STORE ANALYSIS ───
export function combineStorePages(pages) {
  if (!pages || pages.length === 0) return null;

  var first = pages[0];
  var allImages = [];
  var allTexts = [];
  var allModules = [];
  var seen = {};

  for (var i = 0; i < pages.length; i++) {
    var page = pages[i];
    // Collect images (deduplicate)
    for (var j = 0; j < page.images.length; j++) {
      var img = page.images[j];
      var imgKey = img.url.split('?')[0];
      if (!seen[imgKey]) {
        seen[imgKey] = true;
        allImages.push({ url: img.url, alt: img.alt, page: page.url });
      }
    }
    // Collect texts
    for (var k = 0; k < page.texts.length; k++) {
      allTexts.push({ text: page.texts[k].text, type: page.texts[k].type, page: page.url });
    }
    // Collect modules
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
