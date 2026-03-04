module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var body = req.method === 'POST' ? req.body : {};
  var url = body.url;

  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'Missing url' });

  // Validate URL
  try {
    var parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Invalid URL protocol' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  try {
    // Fetch the main page
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 15000);

    var resp;
    try {
      resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5,de;q=0.3',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return res.status(504).json({ error: 'Website timed out after 15 seconds' });
      }
      return res.status(502).json({ error: 'Could not reach website: ' + fetchErr.message });
    }
    clearTimeout(timeout);

    if (!resp.ok) {
      return res.status(502).json({ error: 'Website returned status ' + resp.status });
    }

    var html = await resp.text();

    // Extract useful content from HTML
    var result = extractBrandInfo(html, url);

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

function extractBrandInfo(html, url) {
  var info = {
    url: url,
    title: '',
    description: '',
    brandName: '',
    tagline: '',
    aboutText: '',
    productInfo: [],
    features: [],
    certifications: [],
    socialProof: [],
    rawTextSections: [],
  };

  // Extract <title>
  var titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) info.title = cleanText(titleMatch[1]);

  // Extract meta description
  var metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (!metaDesc) metaDesc = html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (metaDesc) info.description = cleanText(metaDesc[1]);

  // Extract Open Graph meta tags
  var ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  if (ogTitle && !info.title) info.title = cleanText(ogTitle[1]);

  var ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
  if (ogDesc && !info.description) info.description = cleanText(ogDesc[1]);

  var ogSiteName = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  if (ogSiteName) info.brandName = cleanText(ogSiteName[1]);

  // Extract all headings
  var headings = [];
  var headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  var hMatch;
  while ((hMatch = headingRegex.exec(html)) !== null) {
    var text = cleanText(stripTags(hMatch[1]));
    if (text && text.length > 2 && text.length < 200) headings.push(text);
  }

  // Extract paragraphs (skip very short ones and navigation text)
  var paragraphs = [];
  var pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  var pMatch;
  while ((pMatch = pRegex.exec(html)) !== null) {
    var pText = cleanText(stripTags(pMatch[1]));
    if (pText && pText.length > 30 && pText.length < 2000) {
      paragraphs.push(pText);
    }
  }

  // Extract list items (often contain features/USPs)
  var listItems = [];
  var liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  var liMatch;
  while ((liMatch = liRegex.exec(html)) !== null) {
    var liText = cleanText(stripTags(liMatch[1]));
    if (liText && liText.length > 5 && liText.length < 300) {
      listItems.push(liText);
    }
  }

  // Look for "about" sections
  var aboutPatterns = [
    /<(?:section|div|article)[^>]*(?:class|id)=["'][^"']*(?:about|story|mission|philosophy|vision|ueber-uns|über-uns|brand|history|heritage|unternehmen)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi,
  ];
  aboutPatterns.forEach(function(pattern) {
    var m;
    while ((m = pattern.exec(html)) !== null) {
      var sectionText = cleanText(stripTags(m[1]));
      if (sectionText && sectionText.length > 50) {
        info.aboutText += sectionText.slice(0, 1000) + ' ';
      }
    }
  });
  info.aboutText = info.aboutText.trim().slice(0, 2000);

  // Look for certifications / trust signals
  var certPatterns = /(?:zertifizier|certif|bio|organic|vegan|nachhaltig|sustainab|fair.?trade|iso\s?\d|tuv|tüv|dermatologisch|tested|geprüft|made.in|hergestellt|award|ausgezeichn)/gi;
  var allText = stripTags(html);
  var certMatches = allText.match(new RegExp('[^.!?]*(?:' + certPatterns.source + ')[^.!?]*[.!?]', 'gi'));
  if (certMatches) {
    info.certifications = certMatches.slice(0, 10).map(function(s) { return cleanText(s).slice(0, 200); });
  }

  // Look for product-related sections
  var productPatterns = [
    /<(?:section|div|article)[^>]*(?:class|id)=["'][^"']*(?:product|produkt|collection|kollektion|bestseller|shop|sortiment|assortment)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi,
  ];
  productPatterns.forEach(function(pattern) {
    var m;
    while ((m = pattern.exec(html)) !== null) {
      var sectionText = cleanText(stripTags(m[1]));
      if (sectionText && sectionText.length > 30) {
        info.productInfo.push(sectionText.slice(0, 500));
      }
    }
  });
  info.productInfo = info.productInfo.slice(0, 5);

  // Look for social proof / reviews / testimonials
  var socialPatterns = [
    /<(?:section|div|article)[^>]*(?:class|id)=["'][^"']*(?:review|testimonial|bewertung|feedback|kunden|customer|social.?proof)[^"']*["'][^>]*>([\s\S]*?)<\/(?:section|div|article)>/gi,
  ];
  socialPatterns.forEach(function(pattern) {
    var m;
    while ((m = pattern.exec(html)) !== null) {
      var sectionText = cleanText(stripTags(m[1]));
      if (sectionText && sectionText.length > 20) {
        info.socialProof.push(sectionText.slice(0, 300));
      }
    }
  });
  info.socialProof = info.socialProof.slice(0, 5);

  // Compile features from headings and list items
  var featureKeywords = /(?:vorteil|benefit|feature|merkmal|eigenschaft|quality|qualität|vorteile|advantages|why|warum|highlights|usp)/i;
  info.features = listItems.filter(function(li) {
    return li.length > 10 && li.length < 150;
  }).slice(0, 15);

  // Determine tagline (first meaningful heading that isn't the brand name)
  for (var hi = 0; hi < headings.length; hi++) {
    var h = headings[hi];
    if (h.length > 5 && h.length < 100 && h.toLowerCase() !== info.brandName.toLowerCase()) {
      info.tagline = h;
      break;
    }
  }

  // Build rawTextSections for AI consumption (curated, deduplicated)
  var seenTexts = {};
  var addRawText = function(text, source) {
    if (!text || text.length < 20) return;
    var key = text.slice(0, 50).toLowerCase();
    if (seenTexts[key]) return;
    seenTexts[key] = true;
    info.rawTextSections.push({ text: text.slice(0, 500), source: source });
  };

  // Add key headings
  headings.slice(0, 10).forEach(function(h) { addRawText(h, 'heading'); });

  // Add most relevant paragraphs (longer ones tend to be more informative)
  paragraphs.sort(function(a, b) { return b.length - a.length; });
  paragraphs.slice(0, 8).forEach(function(p) { addRawText(p, 'paragraph'); });

  // Trim rawTextSections to reasonable size
  info.rawTextSections = info.rawTextSections.slice(0, 15);

  return info;
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
