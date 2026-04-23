// Reusable in-browser extractor for Amazon Brand Store pages.
// Run via Chrome MCP javascript_tool. Returns structured DOM data per module.
//
// v3-Rollout Fix: captures hrefs pro Link und pro Tile-Container (anchor-
// wrapped Tiles), damit Phase 2 und die Generator-Logik echte Ziel-URLs
// bzw. interne Store-Slugs ableiten koennen. Gibt zusaetzlich die
// Seiten-Level Store-Nav als Linkliste zurueck (fuer Subpage-Discovery).
(function extractPageDom(){
  var rows = Array.from(document.querySelectorAll('.a-row.stores-row'));

  function absUrl(href){
    if (!href) return null;
    try { return new URL(href, location.href).href; } catch(e){ return href; }
  }

  function classifyLink(url){
    if (!url) return 'none';
    try {
      var u = new URL(url, location.href);
      if (u.hostname && u.hostname.indexOf('amazon.') === -1) return 'external';
      if (u.pathname.indexOf('/stores/page/') === 0 || u.pathname.indexOf('/stores/page/') !== -1) return 'internal_subpage';
      if (u.pathname.indexOf('/stores/node/') !== -1) return 'internal_subpage';
      if (u.pathname.indexOf('/dp/') !== -1 || u.pathname.indexOf('/gp/product/') !== -1) return 'pdp_asin';
      if (u.pathname.indexOf('/s') === 0 || u.searchParams.get('k')) return 'internal_filter';
      if (u.hash && u.hash.indexOf('#pf_') !== -1) return 'internal_filter';
      return 'amazon_native';
    } catch(e){ return 'none'; }
  }

  function extractAnchors(scope){
    return Array.from(scope.querySelectorAll('a[href]')).map(function(a){
      var href = absUrl(a.getAttribute('href'));
      var label = (a.textContent||'').trim().replace(/\s+/g,' ').slice(0,200);
      var ariaLabel = (a.getAttribute('aria-label')||'').trim().slice(0,200);
      // Amazon trennt Kategorien per Asin-Grid-Links auf, die keinen Text haben.
      // Fuer solche Faelle nehmen wir das Alt-Attribut des ersten Bildes als Label-Hinweis.
      if (!label && !ariaLabel) {
        var firstImg = a.querySelector('img');
        if (firstImg) label = (firstImg.alt||'').trim().slice(0,200);
      }
      return {
        href: href,
        label: label,
        ariaLabel: ariaLabel || null,
        linkType: classifyLink(href),
        rel: a.getAttribute('rel') || null,
        target: a.getAttribute('target') || null
      };
    }).filter(function(x){ return x.href; });
  }

  // Store-Nav: Links, die zu weiteren Brand-Store-Seiten fuehren. Aus dem
  // Amazon-Nav-Header rendert Amazon diese oft als Buttons mit role=link.
  var storeNavLinks = [];
  (function(){
    var navRoot = document.querySelector('#navPage, [role="navigation"], [id*="Nav"], [id*="store-navigation"]');
    var scope = navRoot || document;
    var candidates = Array.from(scope.querySelectorAll('a[href*="/stores/page/"], a[href*="/stores/node/"]'));
    candidates.forEach(function(a){
      var href = absUrl(a.getAttribute('href'));
      if (!href) return;
      storeNavLinks.push({
        href: href,
        label: (a.textContent||'').trim().replace(/\s+/g,' ').slice(0,120),
        ariaLabel: (a.getAttribute('aria-label')||'').trim().slice(0,120) || null
      });
    });
    // Duplikate raus
    var seen = {};
    storeNavLinks = storeNavLinks.filter(function(l){
      if (seen[l.href]) return false; seen[l.href] = true; return true;
    });
  })();

  var result = [];
  rows.forEach(function(row, idx){
    var rect = row.getBoundingClientRect();
    var top = Math.round(rect.top + window.scrollY);
    var height = Math.round(rect.height);

    var widgetEl = row.querySelector('[class*="Editorial"], [class*="ProductGrid"], [class*="ProductShowcase"], [class*="Shoppable"], [class*="Video"]');
    var widgetClass = widgetEl ? (widgetEl.className.split(' ').filter(function(c){ return c.indexOf('Editorial')!==-1 || c.indexOf('Product')!==-1 || c.indexOf('Shoppable')!==-1 || c.indexOf('Video')!==-1; })[0] || null) : null;

    var headlines = Array.from(row.querySelectorAll('h1,h2,h3,h4,[class*="headline"],[class*="Headline"],[class*="title"],[class*="Title"]'))
      .map(function(e){ return (e.textContent||'').trim(); })
      .filter(function(t){ return t && t.length < 200; });
    var allText = (row.innerText||'').trim().replace(/\s+/g,' ').slice(0, 800);

    var ctas = Array.from(row.querySelectorAll('a,button'))
      .map(function(a){
        return {
          text: (a.textContent||'').trim().replace(/\s+/g,' '),
          href: a.tagName === 'A' ? absUrl(a.getAttribute('href')) : null
        };
      })
      .filter(function(t){ return t.text && t.text.length < 80 && t.text.length > 1; });
    // Nur eindeutige CTAs, max 15
    var ctaSeen = {};
    var ctaSet = ctas.filter(function(c){
      var key = c.text + '||' + (c.href||'');
      if (ctaSeen[key]) return false; ctaSeen[key] = true; return true;
    }).slice(0, 15);

    var imgs = Array.from(row.querySelectorAll('img')).map(function(img){
      return {
        alt: img.alt || '',
        src: img.src || img.getAttribute('data-a-hires') || '',
        w: img.naturalWidth || img.width || null,
        h: img.naturalHeight || img.height || null
      };
    }).filter(function(i){ return i.src; }).slice(0, 25);

    // Tile-Container: im Amazon-Markup sind Tiles oft <li> oder <div> mit
    // einem anchor als Root. Fuer jeden "Tile-artigen" Container erfassen
    // wir den primaeren Link, damit Phase 2 den linkTarget ableiten kann.
    var tileEls = Array.from(row.querySelectorAll('[class*="Tile"],[data-testid*="tile"],[class*="asin"]'));
    var tileLinks = tileEls.map(function(t, tIdx){
      var a = t.tagName === 'A' ? t : t.querySelector('a[href]');
      var img = t.querySelector('img');
      return {
        idx: tIdx,
        href: a ? absUrl(a.getAttribute('href')) : null,
        linkType: a ? classifyLink(absUrl(a.getAttribute('href'))) : 'none',
        anchorLabel: a ? (a.textContent||'').trim().replace(/\s+/g,' ').slice(0,160) : null,
        ariaLabel: a ? (a.getAttribute('aria-label')||'').trim().slice(0,160) || null : null,
        imgAlt: img ? (img.alt||'').slice(0,160) : null,
        asin: t.getAttribute('data-asin') || (a && a.getAttribute('href') ? (function(){
          var m = a.getAttribute('href').match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/);
          return m ? m[1] : null;
        })() : null)
      };
    });

    var products = row.querySelectorAll('[data-asin]');

    var layoutRow = row.querySelector('[class*="Row"]');
    var comp = layoutRow ? window.getComputedStyle(layoutRow) : window.getComputedStyle(row);
    var layout = {
      display: comp.display,
      flexDirection: comp.flexDirection,
      gridTemplateColumns: comp.gridTemplateColumns,
      gap: comp.gap,
      justifyContent: comp.justifyContent,
      alignItems: comp.alignItems
    };

    var bg = null;
    var bgImg = null;
    var cur = row;
    for (var i = 0; i < 3 && cur; i++) {
      var s = window.getComputedStyle(cur);
      if (s.backgroundImage && s.backgroundImage !== 'none') { bgImg = s.backgroundImage.slice(0,250); break; }
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') { bg = s.backgroundColor; break; }
      cur = cur.firstElementChild;
    }

    var videos = row.querySelectorAll('video,[class*="Video"]');
    var shoppable = row.querySelectorAll('[class*="Interactive"],[class*="Shoppable"],[class*="ProductPin"]').length;

    // Anchors im Modul vollstaendig, fuer spaetere Detailauswertung
    var anchors = extractAnchors(row).slice(0, 25);

    result.push({
      idx: idx,
      top: top,
      height: height,
      widgetClass: widgetClass,
      headlines: headlines.slice(0,6),
      allTextPreview: allText.slice(0, 500),
      ctas: ctaSet,
      imgCount: imgs.length,
      imgSample: imgs.slice(0, 6).map(function(i){ return { alt: i.alt.slice(0,120), src: i.src.slice(0,120) }; }),
      tileCount: tileEls.length,
      tileLinks: tileLinks.slice(0, 12),
      anchors: anchors,
      productCount: products.length,
      videoCount: videos.length,
      shoppableMarkers: shoppable,
      layout: layout,
      bgColor: bg,
      bgImage: bgImg ? bgImg.slice(0,150) : null
    });
  });

  return {
    count: result.length,
    modules: result,
    url: location.href,
    scrollHeight: document.body.scrollHeight,
    viewport: { w: innerWidth, h: innerHeight },
    storeNavLinks: storeNavLinks
  };
})();
