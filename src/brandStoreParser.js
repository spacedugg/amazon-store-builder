// ─── AMAZON BRAND STORE HTML PARSER ───
// Parses rendered Brand Store HTML into structured JSON.
// Works client-side. Input: raw HTML string from Web Unlocker.

export function parseBrandStoreHTML(html, sourceUrl) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  var result = {
    url: sourceUrl || '',
    brandName: extractBrandName(doc),
    navigation: extractNavigation(doc, sourceUrl),
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

// ─── SUBPAGE NAVIGATION ───
function extractNavigation(doc, sourceUrl) {
  var links = [];
  var seen = {};

  // Extract the brand name from the source URL to filter relevant links
  var storeBrand = '';
  var brandMatch = (sourceUrl || '').match(/\/stores\/([^/]+)\/page\//i);
  if (brandMatch) storeBrand = decodeURIComponent(brandMatch[1]).toLowerCase();

  // Extract the store page ID from the source URL
  var sourcePageId = '';
  var pageIdMatch = (sourceUrl || '').match(/\/page\/([A-F0-9-]{36})/i);
  if (pageIdMatch) sourcePageId = pageIdMatch[1].toUpperCase();

  // Search ONLY within the store container, not Amazon header/footer
  var container = doc.querySelector('.stores-container, .stores-page, [class*="stores"]');
  var searchRoot = container || doc.body || doc;

  // Find all links matching /stores/page/UUID or /stores/BRAND/page/UUID
  var allLinks = searchRoot.querySelectorAll('a[href*="/stores/"]');
  for (var i = 0; i < allLinks.length; i++) {
    var href = allLinks[i].href || allLinks[i].getAttribute('href') || '';
    var text = (allLinks[i].textContent || '').trim();

    // MUST contain /page/UUID pattern (real store subpages)
    var match = href.match(/\/stores\/(?:([^/]+)\/)?page\/([A-F0-9-]{36})/i);
    if (!match) continue;

    var linkBrand = match[1] ? decodeURIComponent(match[1]).toLowerCase() : '';
    var pageId = match[2].toUpperCase();

    // Skip the current page
    if (pageId === sourcePageId) continue;

    // Skip if already seen
    if (seen[pageId]) continue;

    // If we know the store brand, only accept links from the SAME brand store
    // This filters out Amazon Basics, other brand store links in the header, etc.
    if (storeBrand && linkBrand && linkBrand !== storeBrand) continue;

    seen[pageId] = true;

    // Build absolute URL
    var absUrl = href;
    if (href.indexOf('http') !== 0 && sourceUrl) {
      try {
        var base = new URL(sourceUrl);
        absUrl = base.origin + (href.indexOf('/') === 0 ? href : '/' + href);
      } catch (e) { absUrl = href; }
    }

    // Clean tracking params from the URL
    try {
      var urlObj = new URL(absUrl);
      ['ref', 'ref_', 'ingress', 'visitId', 'store_ref'].forEach(function(p) {
        urlObj.searchParams.delete(p);
      });
      absUrl = urlObj.toString();
    } catch (e) { /* keep as is */ }

    links.push({
      pageId: pageId,
      name: text.replace(/\s+/g, ' ').trim().slice(0, 100) || '',
      url: absUrl,
    });
  }
  return links;
}

// ─── STORE MODULES / SECTIONS ───
function extractModules(doc) {
  var modules = [];
  // Amazon stores render content inside .stores-page .stores-container
  var container = doc.querySelector('.stores-container');
  if (!container) return modules;

  // Each section is typically a .a-row.stores-row with a data-feature or widget content
  var rows = container.querySelectorAll('.stores-row');
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.offsetHeight === 0 && !row.innerHTML.trim()) continue;

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
  // Store-designed images are on the al-eu CDN or al-na CDN
  if (src.indexOf('/images/S/al-') >= 0) return true;
  // Also include custom store images on media-amazon
  if (src.indexOf('m.media-amazon.com/images/S/') >= 0) return true;
  // Skip Amazon UI sprites, icons, tracking pixels
  if (src.indexOf('/images/G/') >= 0) return false;
  if (src.indexOf('/images/I/') >= 0 && src.indexOf('._') >= 0) return false; // product thumbs
  if (src.indexOf('sprite') >= 0) return false;
  if (src.indexOf('pixel') >= 0) return false;
  if (src.indexOf('beacon') >= 0) return false;
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
