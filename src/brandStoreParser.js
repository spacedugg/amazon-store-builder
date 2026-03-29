// ─── AMAZON BRAND STORE HTML PARSER ───
// Parses rendered Brand Store HTML into structured JSON.
// Works client-side. Input: raw HTML string from Web Unlocker.

export function parseBrandStoreHTML(html, sourceUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  var result = {
    url: sourceUrl || '',
    brandName: extractBrandName(doc),
    navigation: extractNavigationFromRawHTML(html, sourceUrl),
    modules: extractModules(doc),
    images: extractStoreImages(doc),
    texts: extractTexts(doc),
    meta: extractMeta(doc),
  };

  return result;
}

// ─── BRAND NAME ───
function extractBrandName(doc) {
  // Try og:title first (usually just the brand name)
  var ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) return ogTitle.content.trim();
  // Fallback to page title, strip "Amazon.de: " prefix
  var title = doc.querySelector('title');
  if (title) {
    var t = title.textContent.trim();
    var prefixes = ['Amazon.de: ', 'Amazon.com: ', 'Amazon.co.uk: ', 'Amazon.fr: '];
    for (var i = 0; i < prefixes.length; i++) {
      if (t.indexOf(prefixes[i]) === 0) return t.slice(prefixes[i].length);
    }
    return t;
  }
  return '';
}

// ─── SUBPAGE NAVIGATION (from raw HTML string, NOT DOMParser) ───
// DOMParser resolves relative URLs against the current page origin (Vercel app),
// making them unusable. Instead, we extract store page UUIDs directly from the
// raw HTML string using regex, then build correct Amazon URLs.
function extractNavigationFromRawHTML(html, sourceUrl) {
  var links = [];
  var seen = {};

  // Determine Amazon origin from the source URL
  var amazonOrigin = 'https://www.amazon.de';
  try {
    var srcUrl = new URL(sourceUrl);
    amazonOrigin = srcUrl.origin;
  } catch (e) { /* default */ }

  // Extract the current page's UUID to skip self-links
  var sourcePageId = '';
  var sourceMatch = (sourceUrl || '').match(/page\/([A-F0-9-]{36})/i);
  if (sourceMatch) sourcePageId = sourceMatch[1].toUpperCase();

  // Find ALL /stores/page/UUID and /stores/BRAND/page/UUID patterns in raw HTML
  // This captures both href attributes and any other references
  var regex = /href=["']([^"']*\/stores\/(?:[^"'\/]+\/)?page\/([A-F0-9-]{36})[^"']*)["']/gi;
  var match;

  while ((match = regex.exec(html)) !== null) {
    var rawPath = match[1];
    var pageId = match[2].toUpperCase();

    // Skip current page
    if (pageId === sourcePageId) continue;

    // Skip already seen
    if (seen[pageId]) continue;

    // Skip Amazon header/navigation links (not store subpages)
    if (rawPath.indexOf('field-lbr_brands') >= 0) continue;
    if (rawPath.indexOf('ref_=nav_cs') >= 0) continue;
    if (rawPath.indexOf('ref_=nav_') >= 0 && rawPath.indexOf('ref_=nav_cs') < 0) continue;

    seen[pageId] = true;

    // Build absolute Amazon URL
    var absUrl;
    if (rawPath.indexOf('http') === 0) {
      // Already absolute
      absUrl = rawPath;
    } else {
      // Relative path → prepend Amazon origin
      absUrl = amazonOrigin + (rawPath.indexOf('/') === 0 ? rawPath : '/' + rawPath);
    }

    // Clean tracking params
    try {
      var urlObj = new URL(absUrl);
      ['ref', 'ref_', 'ingress', 'visitId', 'store_ref', 'lp_asin',
       'lp_context_asin', 'lp_context_query'].forEach(function(p) {
        urlObj.searchParams.delete(p);
      });
      absUrl = urlObj.toString();
    } catch (e) { /* keep as is */ }

    // Try to extract a name from nearby text (look for text right after the href)
    var nameMatch = html.slice(match.index, match.index + 500).match(/>([^<]{2,60})</);
    var name = nameMatch ? nameMatch[1].replace(/\s+/g, ' ').trim() : '';

    links.push({
      pageId: pageId,
      name: name,
      url: absUrl,
    });
  }

  return links;
}

// ─── STORE MODULES / SECTIONS ───
function extractModules(doc) {
  var modules = [];
  // Amazon stores render content inside .stores-page .stores-container
  var container = doc.querySelector('.stores-container, .stores-page, [class*="stores-desktop"]');
  if (!container) container = doc.body;

  // Each section is typically a .a-row.stores-row or a div with store content
  var rows = container.querySelectorAll('.stores-row, [class*="stores-widget"], [data-component-type]');
  if (rows.length === 0) {
    // Fallback: look for any major content divs with images
    rows = container.querySelectorAll('.a-row, .a-section, [class*="editorial"], [class*="widget"]');
  }
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row.innerHTML || !row.innerHTML.trim()) continue;

    var module = classifyModule(row);
    if (module) modules.push(module);
  }
  return modules;
}

function classifyModule(row) {
  var images = extractImagesFromElement(row);
  var texts = extractTextsFromElement(row);
  var hasProductGrid = row.querySelector('[class*="product-grid"], [class*="ProductGrid"], [data-component-type="product"]') !== null;
  var hasVideo = row.querySelector('video, [class*="video"], [class*="Video"]') !== null;

  // Skip empty rows
  if (images.length === 0 && texts.length === 0 && !hasProductGrid && !hasVideo) return null;

  var type = 'unknown';
  if (hasVideo) type = 'video';
  else if (hasProductGrid) type = 'product_grid';
  else if (images.length === 1 && images[0].isFullWidth) type = 'hero_or_banner';
  else if (images.length > 1) type = 'image_grid';
  else if (images.length === 1) type = 'image_section';
  else if (texts.length > 0) type = 'text_section';

  // Determine layout approximation based on tile count
  var layout = approximateLayout(images.length, hasProductGrid);

  return {
    type: type,
    layout: layout,
    images: images,
    texts: texts,
    hasProductGrid: hasProductGrid,
    hasVideo: hasVideo,
  };
}

function approximateLayout(imageCount, hasGrid) {
  if (hasGrid) return 'product_grid';
  switch (imageCount) {
    case 0: return 'text_only';
    case 1: return 'fullwidth';
    case 2: return 'std-2equal';
    case 3: return 'vh-w2s';
    case 4: return '2x2wide';
    case 5: return 'lg-4grid';
    case 6: return '2s-4grid';
    case 8: return '4x2grid';
    default: return imageCount > 4 ? 'multi_tile' : 'unknown';
  }
}

// ─── IMAGE EXTRACTION ───
function extractStoreImages(doc) {
  var images = [];
  var seen = {};
  var allImgs = doc.querySelectorAll('img');
  for (var i = 0; i < allImgs.length; i++) {
    var img = allImgs[i];
    var src = img.currentSrc || img.src || '';
    // Also check srcset for high-res versions
    var srcset = img.getAttribute('srcset') || '';
    // Get the highest resolution from srcset
    if (srcset) {
      var highRes = extractHighestResSrcset(srcset);
      if (highRes) src = highRes;
    }
    if (!src || seen[src]) continue;
    // Only include store-designed images (al-eu pattern) and meaningful images
    if (!isStoreImage(src)) continue;
    seen[src] = true;
    images.push({
      url: src,
      alt: img.alt || '',
      width: img.naturalWidth || img.width || 0,
      height: img.naturalHeight || img.height || 0,
    });
  }
  // Also extract background images from style attributes
  var bgElements = doc.querySelectorAll('[style*="background-image"]');
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
  var imgs = el.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i].currentSrc || imgs[i].src || '';
    var srcset = imgs[i].getAttribute('srcset') || '';
    if (srcset) {
      var highRes = extractHighestResSrcset(srcset);
      if (highRes) src = highRes;
    }
    if (!src || !isStoreImage(src)) continue;
    var rect = imgs[i].getBoundingClientRect ? null : null; // not available in DOMParser
    images.push({
      url: src,
      alt: imgs[i].alt || '',
      isFullWidth: (imgs[i].width >= 800 || src.indexOf('SX3000') >= 0 || src.indexOf('SX1500') >= 0),
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
  // Skip Amazon UI assets (navigation sprites, icons, etc.)
  if (src.indexOf('/images/G/') >= 0) return false;
  // Skip tiny tracking/ad images
  if (src.indexOf('adsystem') >= 0) return false;
  if (src.indexOf('fls-eu') >= 0) return false;
  // Store-designed images (highest priority)
  if (src.indexOf('/images/S/al-') >= 0) return true;
  if (src.indexOf('m.media-amazon.com/images/S/') >= 0) return true;
  // Product images and other Amazon CDN images (include them!)
  if (src.indexOf('m.media-amazon.com/images/I/') >= 0) return true;
  if (src.indexOf('images-eu.ssl-images-amazon.com') >= 0) return true;
  if (src.indexOf('images-na.ssl-images-amazon.com') >= 0) return true;
  // Any other amazon media image
  if (src.indexOf('media-amazon.com') >= 0) return true;
  return false;
}

// ─── TEXT EXTRACTION ───
function extractTexts(doc) {
  var texts = [];
  var container = doc.querySelector('.stores-container');
  if (!container) return texts;

  // Get headings
  var headings = container.querySelectorAll('h1, h2, h3, h4');
  for (var i = 0; i < headings.length; i++) {
    var t = (headings[i].textContent || '').trim();
    if (t && t.length > 2 && t.length < 300) {
      texts.push({ type: 'heading', text: t });
    }
  }

  // Get paragraphs and spans with meaningful text
  var paras = container.querySelectorAll('p, [class*="text"], [class*="Text"]');
  for (var j = 0; j < paras.length; j++) {
    var p = (paras[j].textContent || '').trim();
    if (p && p.length > 10 && p.length < 1000) {
      texts.push({ type: 'paragraph', text: p });
    }
  }

  return texts;
}

function extractTextsFromElement(el) {
  var texts = [];
  var nodes = el.querySelectorAll('h1, h2, h3, h4, p, span');
  for (var i = 0; i < nodes.length; i++) {
    var t = (nodes[i].textContent || '').trim();
    if (t && t.length > 3 && t.length < 500) {
      texts.push(t);
    }
  }
  // Deduplicate
  var seen = {};
  return texts.filter(function(t) {
    if (seen[t]) return false;
    seen[t] = true;
    return true;
  });
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
      if (!seen[img.url]) {
        seen[img.url] = true;
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
