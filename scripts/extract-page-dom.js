// Reusable in-browser extractor for Amazon Brand Store pages.
// Run via Chrome MCP javascript_tool. Returns structured DOM data per module.
(function extractPageDom(){
  const rows = Array.from(document.querySelectorAll('.a-row.stores-row'));
  const result = [];
  rows.forEach((row, idx) => {
    const rect = row.getBoundingClientRect();
    const top = Math.round(rect.top + window.scrollY);
    const height = Math.round(rect.height);

    const widgetEl = row.querySelector('[class*="Editorial"], [class*="ProductGrid"], [class*="ProductShowcase"], [class*="Shoppable"], [class*="Video"]');
    const widgetClass = widgetEl ? (widgetEl.className.split(' ').filter(c => c.includes('Editorial') || c.includes('Product') || c.includes('Shoppable') || c.includes('Video'))[0] || null) : null;

    const headlines = Array.from(row.querySelectorAll('h1,h2,h3,h4,[class*="headline"],[class*="Headline"],[class*="title"],[class*="Title"]'))
      .map(e => (e.textContent||'').trim()).filter(t => t && t.length < 200);
    const allText = (row.innerText||'').trim().replace(/\s+/g,' ').slice(0, 800);

    const ctas = Array.from(row.querySelectorAll('a,button'))
      .map(a => (a.textContent||'').trim().replace(/\s+/g,' '))
      .filter(t => t && t.length < 80 && t.length > 1);
    const ctaSet = Array.from(new Set(ctas)).slice(0, 15);

    const imgs = Array.from(row.querySelectorAll('img')).map(img => ({
      alt: img.alt || '',
      src: img.src || img.getAttribute('data-a-hires') || '',
      w: img.naturalWidth || img.width || null,
      h: img.naturalHeight || img.height || null
    })).filter(i => i.src).slice(0, 25);

    const tiles = row.querySelectorAll('[class*="Tile"],[data-testid*="tile"],[class*="asin"]');
    const products = row.querySelectorAll('[data-asin]');

    const layoutRow = row.querySelector('[class*="Row"]');
    const comp = layoutRow ? window.getComputedStyle(layoutRow) : window.getComputedStyle(row);
    const layout = {
      display: comp.display,
      flexDirection: comp.flexDirection,
      gridTemplateColumns: comp.gridTemplateColumns,
      gap: comp.gap,
      justifyContent: comp.justifyContent,
      alignItems: comp.alignItems
    };

    let bg = null;
    let bgImg = null;
    let cur = row;
    for (let i = 0; i < 3 && cur; i++) {
      const s = window.getComputedStyle(cur);
      if (s.backgroundImage && s.backgroundImage !== 'none') { bgImg = s.backgroundImage.slice(0,250); break; }
      if (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent') { bg = s.backgroundColor; break; }
      cur = cur.firstElementChild;
    }

    const videos = row.querySelectorAll('video,[class*="Video"]');
    const shoppable = row.querySelectorAll('[class*="Interactive"],[class*="Shoppable"],[class*="ProductPin"]').length;

    result.push({
      idx, top, height, widgetClass,
      headlines: headlines.slice(0,6),
      allTextPreview: allText.slice(0, 500),
      ctas: ctaSet,
      imgCount: imgs.length,
      imgSample: imgs.slice(0, 6).map(i=>({alt:i.alt.slice(0,120), src: i.src.slice(0,120)})),
      tileCount: tiles.length,
      productCount: products.length,
      videoCount: videos.length,
      shoppableMarkers: shoppable,
      layout,
      bgColor: bg,
      bgImage: bgImg ? bgImg.slice(0,150) : null
    });
  });
  return { count: result.length, modules: result, url: location.href, scrollHeight: document.body.scrollHeight, viewport: {w: innerWidth, h: innerHeight} };
})();
