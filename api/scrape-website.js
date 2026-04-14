var ANTHROPIC_KEY = process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : {};
  var url = body.url;

  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });

  try {
    var parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    var baseOrigin = parsed.origin;

    // ═══════════════════════════════════════════════════
    // STEP 1: Fetch the homepage
    // ═══════════════════════════════════════════════════
    var homepageHtml = await fetchPage(url);
    if (!homepageHtml) {
      return res.status(502).json({ error: 'Could not reach website' });
    }

    // ═══════════════════════════════════════════════════
    // STEP 2: Discover internal links (important subpages)
    // ═══════════════════════════════════════════════════
    var internalLinks = discoverInternalLinks(homepageHtml, baseOrigin, parsed.pathname);

    // ═══════════════════════════════════════════════════
    // STEP 3: Crawl subpages (up to 30)
    // ═══════════════════════════════════════════════════
    var subpageContents = {};
    var maxSubpages = 100;
    var linksToFetch = internalLinks.slice(0, maxSubpages);
    // Crawl in batches of 5 to avoid overwhelming the server
    for (var batch = 0; batch < linksToFetch.length; batch += 5) {
      var batchLinks = linksToFetch.slice(batch, batch + 5);
      var crawlPromises = batchLinks.map(function(link) {
        return fetchPage(link.url).then(function(html) {
          if (html) subpageContents[link.category + '_' + link.url] = { url: link.url, html: html, label: link.label, category: link.category };
        }).catch(function() {});
      });
      await Promise.all(crawlPromises);
    }

    // ═══════════════════════════════════════════════════
    // STEP 4: Extract raw content from ALL pages
    // ═══════════════════════════════════════════════════
    var allContent = extractAllContent(homepageHtml, subpageContents, url);

    // ═══════════════════════════════════════════════════
    // STEP 5: AI analysis of the collected content
    // ═══════════════════════════════════════════════════
    var aiAnalysis = null;
    if (ANTHROPIC_KEY && allContent.rawText.length > 100) {
      aiAnalysis = await analyzeWithAI(allContent, url);
    }

    // ═══════════════════════════════════════════════════
    // STEP 6: Merge extracted data + AI analysis
    // ═══════════════════════════════════════════════════
    var result = buildResult(allContent, aiAnalysis, url);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ─── FETCH A SINGLE PAGE ───
async function fetchPage(url) {
  try {
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 12000);
    var resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,de;q=0.3',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    return await resp.text();
  } catch (e) {
    return null;
  }
}

// ─── DISCOVER INTERNAL LINKS TO IMPORTANT SUBPAGES ───
function discoverInternalLinks(html, baseOrigin, basePath) {
  var links = [];
  var seen = {};
  var linkRegex = /<a[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  var match;

  // Priority patterns — which pages are most valuable for brand intelligence
  var priorities = [
    { pattern: /(?:about|ueber-uns|über-uns|about-us|our-story|unsere-geschichte|unternehmen|who-we-are)/i, category: 'about', priority: 10 },
    { pattern: /(?:nachhaltig|sustainab|umwelt|environment|responsibility|verantwortung|green)/i, category: 'sustainability', priority: 9 },
    { pattern: /(?:qualit|quality|herstellung|production|manufacturing|how.?(?:we|it).?(?:work|made|produce))/i, category: 'quality', priority: 8 },
    { pattern: /(?:philosophy|philosophie|mission|vision|values|werte)/i, category: 'values', priority: 8 },
    { pattern: /(?:product|produkt|collection|kollektion|shop|sortiment|all-products|alle-produkte)/i, category: 'products', priority: 7 },
    { pattern: /(?:ingredient|zutaten|inhaltsstoffe|material|rohstoff)/i, category: 'ingredients', priority: 7 },
    { pattern: /(?:faq|haeufig|häufig|frequently|help|hilfe)/i, category: 'faq', priority: 5 },
    { pattern: /(?:blog|magazine|magazin|journal|news|aktuell|ratgeber)/i, category: 'blog', priority: 4 },
    { pattern: /(?:contact|kontakt|customer.?service|kundenservice)/i, category: 'contact', priority: 3 },
  ];

  while ((match = linkRegex.exec(html)) !== null) {
    var href = match[1].trim();
    var label = cleanText(stripTags(match[2])).slice(0, 100);

    // Resolve relative URLs
    var fullUrl;
    try {
      if (href.startsWith('http')) {
        fullUrl = href;
      } else if (href.startsWith('/')) {
        fullUrl = baseOrigin + href;
      } else {
        fullUrl = baseOrigin + '/' + href;
      }
      // Must be same origin
      var linkParsed = new URL(fullUrl);
      if (linkParsed.origin !== baseOrigin) continue;
    } catch (e) { continue; }

    // Skip the homepage itself, anchors, assets
    if (fullUrl === baseOrigin + basePath || fullUrl === baseOrigin + '/') continue;
    if (/\.(jpg|jpeg|png|gif|svg|css|js|pdf|zip|mp4|webp)(\?|$)/i.test(fullUrl)) continue;
    if (seen[fullUrl]) continue;
    seen[fullUrl] = true;

    // Check priority
    var bestPriority = 0;
    var bestCategory = 'other';
    priorities.forEach(function(p) {
      if ((p.pattern.test(href) || p.pattern.test(label)) && p.priority > bestPriority) {
        bestPriority = p.priority;
        bestCategory = p.category;
      }
    });

    if (bestPriority > 0) {
      links.push({ url: fullUrl, category: bestCategory, label: label, priority: bestPriority });
    }
  }

  // Sort by priority, highest first
  links.sort(function(a, b) { return b.priority - a.priority; });

  // Allow multiple pages per category (up to 5 per category for product pages, 2 for others)
  var categoryCount = {};
  return links.filter(function(l) {
    var maxPerCategory = l.category === 'products' ? 20 : 2;
    categoryCount[l.category] = (categoryCount[l.category] || 0) + 1;
    return categoryCount[l.category] <= maxPerCategory;
  });
}

// ─── EXTRACT CONTENT FROM ALL CRAWLED PAGES ───
function extractAllContent(homepageHtml, subpageContents, url) {
  var result = {
    url: url,
    title: '',
    description: '',
    brandName: '',
    tagline: '',
    // Collected text from ALL pages, categorized
    aboutText: '',
    sustainabilityText: '',
    qualityText: '',
    valuesText: '',
    productDescriptions: [],
    ingredientsText: '',
    faqItems: [],
    // Structured extractions
    certifications: [],
    features: [],
    socialProof: [],
    colors: [],
    fonts: [],
    typographyStyle: null,
    // Raw text for AI
    rawText: '',
    pagesScraped: 1,
    subpagesFound: Object.keys(subpageContents).length,
  };

  // ── HOMEPAGE EXTRACTION ──
  var homeInfo = extractFromPage(homepageHtml, 'homepage');
  result.title = homeInfo.title;
  result.description = homeInfo.description;
  result.brandName = homeInfo.brandName;
  result.tagline = homeInfo.tagline;
  result.colors = homeInfo.colors;
  result.fonts = homeInfo.fonts;
  result.typographyStyle = homeInfo.typographyStyle || null;
  result.certifications = homeInfo.certifications.slice();
  result.features = homeInfo.features.slice();
  result.socialProof = homeInfo.socialProof.slice();
  result.rawText += '=== HOMEPAGE ===\n' + homeInfo.mainText.slice(0, 3000) + '\n\n';

  // ── SUBPAGE EXTRACTION ──
  Object.keys(subpageContents).forEach(function(key) {
    var page = subpageContents[key];
    var category = page.category || key;
    var pageInfo = extractFromPage(page.html, category);
    result.pagesScraped++;

    // Limit rawText per page based on total pages (keep within AI context)
    var rawTextBudget = Math.max(500, Math.floor(10000 / Math.max(Object.keys(subpageContents).length, 1)));
    result.rawText += '=== ' + category.toUpperCase() + ' PAGE (' + page.label + ') ===\n' + pageInfo.mainText.slice(0, rawTextBudget) + '\n\n';

    // Merge certifications (deduplicated)
    var certSet = {};
    result.certifications.forEach(function(c) { certSet[c.toLowerCase().slice(0, 30)] = true; });
    pageInfo.certifications.forEach(function(c) {
      var key2 = c.toLowerCase().slice(0, 30);
      if (!certSet[key2]) { result.certifications.push(c); certSet[key2] = true; }
    });

    // Merge features
    pageInfo.features.forEach(function(f) { result.features.push(f); });

    // Merge colors
    var colorSet = {};
    result.colors.forEach(function(c) { colorSet[c] = true; });
    pageInfo.colors.forEach(function(c) { if (!colorSet[c]) { result.colors.push(c); colorSet[c] = true; } });

    // Merge fonts
    var fontSet = {};
    result.fonts.forEach(function(f) { fontSet[f.toLowerCase()] = true; });
    pageInfo.fonts.forEach(function(f) { if (!fontSet[f.toLowerCase()]) { result.fonts.push(f); fontSet[f.toLowerCase()] = true; } });

    // Merge typography style (use homepage as primary)
    if (pageInfo.typographyStyle && !result.typographyStyle) {
      result.typographyStyle = pageInfo.typographyStyle;
    }

    // Category-specific text
    if (category === 'about' && !result.aboutText) result.aboutText = pageInfo.mainText.slice(0, 3000);
    if (category === 'sustainability' && !result.sustainabilityText) result.sustainabilityText = pageInfo.mainText.slice(0, 2000);
    if (category === 'quality' && !result.qualityText) result.qualityText = pageInfo.mainText.slice(0, 2000);
    if (category === 'values' && !result.valuesText) result.valuesText = pageInfo.mainText.slice(0, 2000);
    if (category === 'ingredients' && !result.ingredientsText) result.ingredientsText = pageInfo.mainText.slice(0, 2000);
    if (category === 'products') {
      // Extract product names and descriptions from product pages
      var prodHeadings = pageInfo.mainText.match(/^## .+/gm) || [];
      prodHeadings.forEach(function(h) {
        var name = h.replace(/^## /, '').trim();
        if (name.length > 3 && name.length < 200) result.productDescriptions.push(name);
      });
      pageInfo.productDescriptions.forEach(function(pd) { result.productDescriptions.push(pd); });
    }
  });

  // Trim visual collections (reasonable: UI palette limits)
  result.colors = result.colors.slice(0, 10);
  result.fonts = result.fonts.slice(0, 6);
  // certifications and features: NO cap — all data forwarded to AI
  // Trim rawText to fit AI context (expanded for deeper crawls)
  result.rawText = result.rawText.slice(0, 20000);

  return result;
}

// ─── EXTRACT DATA FROM A SINGLE PAGE ───
function extractFromPage(html, category) {
  var info = {
    title: '', description: '', brandName: '', tagline: '',
    mainText: '', certifications: [], features: [], socialProof: [],
    productDescriptions: [], colors: [], fonts: [],
  };

  // ── META TAGS ──
  var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) info.title = cleanText(titleMatch[1]);
  var metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (!metaDesc) metaDesc = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDesc) info.description = cleanText(metaDesc[1]);
  var ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteName) info.brandName = cleanText(ogSiteName[1]);

  // ── STRIP NAVIGATION/HEADER/FOOTER for main content extraction ──
  var contentHtml = html
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<(?:ul|ol|div)[^>]*(?:class|id)=["'][^"']*(?:menu|nav|navigation|breadcrumb|sidebar|cookie|popup|modal|banner|announcement)[^"']*["'][^>]*>[\s\S]*?<\/(?:ul|ol|div)>/gi, '');

  // ── HEADINGS ──
  var headings = [];
  var headingRegex = /<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  var hMatch;
  while ((hMatch = headingRegex.exec(contentHtml)) !== null) {
    var text = cleanText(stripTags(hMatch[1]));
    if (text && text.length > 2 && text.length < 200) headings.push(text);
  }

  // Tagline from first meaningful heading
  for (var hi = 0; hi < headings.length; hi++) {
    if (headings[hi].length > 5 && headings[hi].length < 100 &&
        headings[hi].toLowerCase() !== (info.brandName || '').toLowerCase()) {
      info.tagline = headings[hi];
      break;
    }
  }

  // ── PARAGRAPHS ──
  var paragraphs = [];
  var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  var pMatch;
  while ((pMatch = pRegex.exec(contentHtml)) !== null) {
    var pText = cleanText(stripTags(pMatch[1]));
    if (pText && pText.length > 20 && pText.length < 3000) paragraphs.push(pText);
  }

  // ── LIST ITEMS ──
  var listItems = [];
  var liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  var liMatch;
  while ((liMatch = liRegex.exec(contentHtml)) !== null) {
    var liText = cleanText(stripTags(liMatch[1]));
    if (liText && liText.length > 5 && liText.length < 300) listItems.push(liText);
  }

  // ── MAIN TEXT (headings + paragraphs combined) ──
  var mainParts = [];
  headings.slice(0, 20).forEach(function(h) { mainParts.push('## ' + h); });
  paragraphs.forEach(function(p) { mainParts.push(p); });
  listItems.filter(function(l) { return l.length > 15; }).slice(0, 30).forEach(function(l) { mainParts.push('- ' + l); });
  info.mainText = mainParts.join('\n').slice(0, 5000);

  // ── CERTIFICATIONS & TRUST SIGNALS ──
  // Two sources: (1) text on the page, (2) alt/title attributes of images
  // (many certifications are shown as badge IMAGES with descriptive alt text).
  var certPatterns = /(?:zertifizier|certif|bio[\s-]?(?:siegel|zerti|label|qualit)|organic|vegan|vegetarisch|nachhaltig|sustainab|fair.?trade|fairtrade|iso[\s-]?\d|tuv|tüv|dekra|sgs\b|intertek|eurofins|dermatologisch|klinisch.?getestet|tested|geprüft|laborgeprüft|schadstoff|made.?in|hergestellt.?in|produziert.?in|award|ausgezeichn|prämier|preis.?träger|gewinner|stiftung.?warentest|öko.?test|vergleich.?org|trusted.?shop|proven.?expert|cruelty.?free|tierschutz|tierversuchsfrei|recycl|klimaneutral|co2.?neutral|co2.?kompensier|carbon.?neutral|plastic.?free|plastikfrei|gots\b|oeko.?tex|öko.?tex|blauer.?engel|fsc\b|pefc\b|eu.?bio|de.?öko|naturland|demeter|bioland|ecocert|cosmos|natrue|bdih|leaping.?bunny|peta\b|rainforest.?alliance|utz\b|msc\b|asc\b|v.?label|ohne.?gentechnik|gmo.?free|gluten.?free|glutenfrei|laktosefrei|lactose.?free|hypoallergen|ce.?kennzeichnung|ce.?marking|din[\s-]?\d|en[\s-]?\d|haccp|gmp\b|brc\b|ifs\b|halal|kosher|rohs\b|reach\b|weee\b|energy.?star|blue.?angel|green.?seal|nordic.?swan|eu.?ecolabel|cradle.?to.?cradle|b[\s-]?corp)/gi;

  // Source 1: Page text (existing approach)
  var allText = stripTags(contentHtml);
  var certMatches = allText.match(new RegExp('[^.!?]*(?:' + certPatterns.source + ')[^.!?]*[.!?]', 'gi')) || [];

  // Source 2: Image alt texts and title attributes (catches badge/seal IMAGES)
  var imgAltRegex = /<img[^>]*(?:alt|title)=["']([^"']+)["'][^>]*>/gi;
  var imgMatch;
  while ((imgMatch = imgAltRegex.exec(contentHtml)) !== null) {
    var altText = cleanText(imgMatch[1]);
    if (altText.length > 3 && altText.length < 200 && certPatterns.test(altText)) {
      certMatches.push(altText);
    }
    certPatterns.lastIndex = 0; // reset regex state
  }

  if (certMatches.length > 0) {
    var seenCerts = {};
    info.certifications = certMatches
      .map(function(s) { return cleanText(s).slice(0, 200); })
      .filter(function(s) {
        if (/(?:open\s|menu|navigation|home\s|kontakt|warenkorb|cart|search|suche|anmelden|login|registr|cookie|datenschutz|impressum|agb)/i.test(s)) return false;
        if (s.length < 10 || s.length > 200) return false;
        var key = s.toLowerCase().slice(0, 40);
        if (seenCerts[key]) return false;
        seenCerts[key] = true;
        return true;
      });
  }

  // ── FEATURES ── (no arbitrary cap — forward everything to AI)
  info.features = listItems.filter(function(li) {
    return li.length > 10 && li.length < 150;
  });

  // ── COLORS & FONTS ──
  var styleBlocks = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  var allCss = styleBlocks.map(function(s) { return s.replace(/<\/?style[^>]*>/gi, ''); }).join(' ');
  // CSS custom properties (often brand colors)
  var cssVarMatch = allCss.match(/--[a-zA-Z-]*(?:color|brand|primary|secondary|accent)[^:]*:\s*([^;}{]+)/gi) || [];
  cssVarMatch.forEach(function(m) {
    var valMatch = m.match(/#[0-9A-Fa-f]{3,6}\b/);
    if (valMatch) {
      var c = valMatch[0].toLowerCase();
      if (!isGenericColor(c)) info.colors.push(c);
    }
  });
  // Regular hex colors
  var hexColors = allCss.match(/#[0-9A-Fa-f]{3,6}\b/g) || [];
  var colorSet = {};
  info.colors.forEach(function(c) { colorSet[c] = true; });
  hexColors.forEach(function(c) {
    var n = c.toLowerCase();
    if (!isGenericColor(n) && !colorSet[n]) { info.colors.push(n); colorSet[n] = true; }
  });
  info.colors = info.colors.slice(0, 8);

  // Fonts
  var fontMatches = allCss.match(/font-family\s*:\s*([^;}{]+)/gi) || [];
  var fontSet = {};
  fontMatches.forEach(function(f) {
    var family = f.replace(/font-family\s*:\s*/i, '').replace(/['"]/g, '').split(',')[0].trim();
    if (family && family.length > 1 && family.length < 60 && !fontSet[family.toLowerCase()] &&
        !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|inherit|initial|unset|-apple-system|BlinkMacSystemFont)$/i.test(family)) {
      fontSet[family.toLowerCase()] = true;
      info.fonts.push(family);
    }
  });
  info.fonts = info.fonts.slice(0, 4);

  // ── TYPOGRAPHY STYLE ANALYSIS ──
  // Extract font sizes used across the site
  var fontSizes = [];
  var sizeMatches = allCss.match(/font-size\s*:\s*([^;}{]+)/gi) || [];
  sizeMatches.forEach(function(m) {
    var val = m.replace(/font-size\s*:\s*/i, '').trim();
    if (val && fontSizes.indexOf(val) < 0 && fontSizes.length < 12) fontSizes.push(val);
  });
  info.fontSizes = fontSizes;

  // Extract font weights
  var fontWeights = [];
  var weightMatches = allCss.match(/font-weight\s*:\s*([^;}{]+)/gi) || [];
  var weightSet = {};
  weightMatches.forEach(function(m) {
    var val = m.replace(/font-weight\s*:\s*/i, '').trim();
    if (val && !weightSet[val]) { fontWeights.push(val); weightSet[val] = true; }
  });
  info.fontWeights = fontWeights.slice(0, 8);

  // Text density analysis: count paragraphs, headings, and avg paragraph length
  var paraCount = paragraphs.length;
  var headingCount = headings.length;
  var avgParaLen = paraCount > 0 ? Math.round(paragraphs.reduce(function(s, p) { return s + p.length; }, 0) / paraCount) : 0;
  // Classify: minimalist (<80 avg chars, few paragraphs) vs. text-heavy (>150 avg, many paragraphs)
  var textDensity = 'balanced';
  if (avgParaLen < 80 && paraCount < 15) textDensity = 'minimalist';
  else if (avgParaLen > 150 || paraCount > 40) textDensity = 'text-heavy';
  info.typographyStyle = {
    fontSizes: fontSizes.slice(0, 8),
    fontWeights: fontWeights.slice(0, 6),
    textDensity: textDensity,
    avgParagraphLength: avgParaLen,
    paragraphCount: paraCount,
    headingCount: headingCount,
  };

  return info;
}

// ─── AI ANALYSIS OF COLLECTED WEBSITE CONTENT ───
async function analyzeWithAI(content, url) {
  if (!ANTHROPIC_KEY) return null;

  var system = [
    'You are a brand analyst. Analyze the crawled website content and extract structured brand intelligence.',
    'Return ONLY valid JSON with these fields:',
    '{',
    '  "brandStory": "2-3 sentence brand story/origin based on the about page content",',
    '  "brandTone": "2-4 adjectives describing the brand personality (e.g. natural, premium, playful)",',
    '  "usps": ["list of 3-6 unique selling propositions"],',
    '  "certifications": ["list of actual certifications/seals found (e.g. Vegan, Bio, FSC, Made in Germany)"],',
    '  "targetAudience": "1 sentence describing the target customer",',
    '  "productCategories": ["main product categories found"],',
    '  "sustainabilityFocus": "1-2 sentences about sustainability if mentioned, or empty string",',
    '  "keyIngredients": ["key ingredients or materials if relevant, or empty array"],',
    '  "brandValues": ["3-5 core brand values"],',
    '  "visualStyle": "2-3 words describing the visual/design style (e.g. minimalist, earthy, bold)"',
    '}',
  ].join('\n');

  var user = [
    'Website: ' + url,
    'Pages scraped: ' + content.pagesScraped + ' (Homepage + ' + content.subpagesFound + ' subpages)',
    '',
    content.rawText,
  ].join('\n');

  try {
    var resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!resp.ok) return null;
    var data = await resp.json();
    var text = (data.content || []).map(function(b) { return b.text || ''; }).join('');
    // Extract JSON
    var jsonStart = text.indexOf('{');
    var jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) return null;
    return JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  } catch (e) {
    return null;
  }
}

// ─── BUILD FINAL RESULT ───
function buildResult(content, aiAnalysis, url) {
  var result = {
    url: url,
    title: content.title,
    description: content.description,
    brandName: content.brandName,
    tagline: content.tagline,
    aboutText: content.aboutText || '',
    sustainabilityText: content.sustainabilityText || '',
    qualityText: content.qualityText || '',
    valuesText: content.valuesText || '',
    ingredientsText: content.ingredientsText || '',
    productInfo: content.productDescriptions,
    features: content.features,
    certifications: content.certifications,
    socialProof: content.socialProof,
    colors: content.colors.slice(0, 10),
    fonts: content.fonts.slice(0, 6),
    typographyStyle: content.typographyStyle || null,
    rawTextSections: [],
    pagesScraped: content.pagesScraped,
    // AI-enriched fields
    aiAnalysis: aiAnalysis || null,
  };

  // If AI analysis found better data, merge it
  if (aiAnalysis) {
    if (aiAnalysis.brandStory && (!result.aboutText || result.aboutText.length < 50)) {
      result.aboutText = aiAnalysis.brandStory;
    }
    if (aiAnalysis.brandTone) result.brandTone = aiAnalysis.brandTone;
    if (aiAnalysis.usps && aiAnalysis.usps.length > 0) {
      // AI USPs are cleaner — prepend them
      result.features = aiAnalysis.usps.concat(result.features);
    }
    if (aiAnalysis.certifications && aiAnalysis.certifications.length > 0) {
      // AI certifications are cleaner — use them as primary
      result.certifications = aiAnalysis.certifications;
    }
    if (aiAnalysis.targetAudience) result.targetAudience = aiAnalysis.targetAudience;
    if (aiAnalysis.productCategories) result.productCategories = aiAnalysis.productCategories;
    if (aiAnalysis.sustainabilityFocus) result.sustainabilityFocus = aiAnalysis.sustainabilityFocus;
    if (aiAnalysis.keyIngredients) result.keyIngredients = aiAnalysis.keyIngredients;
    if (aiAnalysis.brandValues) result.brandValues = aiAnalysis.brandValues;
    if (aiAnalysis.visualStyle) result.visualStyle = aiAnalysis.visualStyle;
  }

  // Build rawTextSections for backward compatibility
  var rawText = content.rawText || '';
  var sections = rawText.split(/===\s*[A-Z]+\s*(?:PAGE[^=]*)?\s*===/g).filter(function(s) { return s.trim().length > 20; });
  sections.forEach(function(s, i) {
    result.rawTextSections.push({ text: s.trim(), source: i === 0 ? 'homepage' : 'subpage' });
  });

  return result;
}

// ─── HELPERS ───
function isGenericColor(c) {
  return /^#(?:fff|000|f{6}|0{6}|[def]{3}|[def]{6}|[0-3]{3}|[0-3]{6}|ccc|ddd|eee|aaa|bbb|999|888|777|666|555|444|333|222|111)$/i.test(c);
}

function stripTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
