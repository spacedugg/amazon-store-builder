// ─── LAYOUTS ───
export const LAYOUTS = [
  { id: '1', name: 'Full Width', cols: '1fr', cells: 1 },
  { id: '1-1', name: '2 Equal', cols: '1fr 1fr', cells: 2 },
  { id: '1-1-1', name: '3 Equal', cols: '1fr 1fr 1fr', cells: 3 },
  { id: '1-1-1-1', name: '4 Equal', cols: 'repeat(4,1fr)', cells: 4 },
  { id: '2-1', name: 'Large + Small', cols: '2fr 1fr', cells: 2 },
  { id: '1-2', name: 'Small + Large', cols: '1fr 2fr', cells: 2 },
  { id: '2-1-1', name: 'Large + 2 Small', cols: '2fr 1fr 1fr', cells: 3 },
];

export const TILE_TYPES = ['image', 'product_grid', 'video', 'text', 'shoppable_image'];

export const LANGS = { de: 'German', com: 'English', 'co.uk': 'English', fr: 'French' };

export const DOMAINS = {
  de: 'https://www.amazon.de',
  com: 'https://www.amazon.com',
  'co.uk': 'https://www.amazon.co.uk',
  fr: 'https://www.amazon.fr',
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function emptyTile() {
  return {
    type: 'image', brief: '', textOverlay: '', ctaText: '',
    dimensions: { w: 3000, h: 1200 }, asins: [],
  };
}

// ─── BEST-PRACTICE STORE PATTERNS (from real top-performing Brand Stores) ───

export const REFERENCE_STORES = [
  {
    brand: 'Kaercher',
    style: 'professional/technical, yellow brand color',
    homepage: '8 categories in 4x2 grid, image-only, yellow bar overlay with category name',
    modules: '85% image, 15% product grid, NO native text',
    keyPattern: 'Category tiles with lifestyle photo + colored overlay bar with text',
  },
  {
    brand: 'Nespresso',
    style: 'premium/luxury, dark tones',
    homepage: 'Hero + campaign banner + 2 category blocks (Original/Vertuo) in 2-1-1 layout + quiz section + accessories grid + sustainability text + footer',
    modules: '75% image, 15% native text, 10% product grid',
    keyPattern: 'Uses native text for section headings and sustainability content. image_text for quiz section.',
  },
  {
    brand: 'ESN',
    style: 'dark/sporty, bold, athletic',
    homepage: 'Hero + lifestyle B/W + 2x2 category tiles + product band + brand story split',
    modules: '95% image, 5% product grid, NO native text',
    keyPattern: 'Categories as 2-col image tiles with CTA buttons designed into the image',
  },
  {
    brand: 'Affenzahn',
    style: 'colorful, playful, children-oriented',
    homepage: 'Colorful images, animal characters, category tiles',
    modules: '80% image, 20% product grid',
    keyPattern: 'Character-based category navigation, bright colors',
  },
  {
    brand: 'AG1',
    style: 'clean/health, green tones, single-product focus',
    homepage: 'Hero + product banner + product grid + ingredients section (image_text modules)',
    modules: '50% image, 25% image_text, 25% product grid',
    keyPattern: 'Uses image_text modules for ingredient/feature highlights in a 3x2 grid',
  },
  {
    brand: 'SNOCKS',
    style: 'minimalist, clean, modern',
    homepage: 'Category grid as 4x2 image_text tiles with lifestyle photo + category label overlay',
    modules: '95% image/image_text, 5% product grid',
    keyPattern: 'Subcategory-focused grid layout, each tile = lifestyle + text label',
  },
  {
    brand: 'Bears with Benefits',
    style: 'pink/lifestyle, feminine, testimonial-heavy',
    homepage: 'Hero split + shoppable image + alternating lifestyle/icon tiles + testimonials',
    modules: '80% image, 10% shoppable, 10% product grid',
    keyPattern: 'Shoppable images for product discovery, testimonial sections with designed quotes',
  },
  {
    brand: 'Holy Energy',
    style: 'bold colors, energetic, youth-oriented',
    homepage: 'Hero + banner + VIDEO module + more image sections',
    modules: '85% image, 10% video, 5% product grid',
    keyPattern: 'Video module for product unboxing/experience',
  },
  {
    brand: 'nucao',
    style: 'pink/playful, sustainable, food',
    homepage: 'Hero with slogan + 2-col category tiles + product grid dominant',
    modules: '75% image, 25% product grid',
    keyPattern: 'Product grid-heavy, fewer image sections, fun brand voice',
  },
];

export const STORE_PATTERNS = {
  homepage: {
    description: 'Typical structure of successful Amazon Brand Stores',
    sections: [
      { role: 'hero', description: 'Full-width hero banner with brand message/slogan', layout: '1', tileType: 'image', dims: { w: 3000, h: [600, 800] } },
      { role: 'categories', description: 'Category grid, layout depends on number of categories (2-col, 3-col, 4-col, or 4x2)', tileType: 'image' },
      { role: 'bestsellers', description: 'Optional: Top products as Product Grid (based on ratings/reviews)', tileType: 'product_grid' },
      { role: 'lifestyle', description: 'Optional: Lifestyle/brand-story image showing products in use', layout: '1', tileType: 'image', dims: { w: 3000, h: [1200, 1500] } },
      { role: 'video', description: 'Optional: Brand video for product experience', layout: '1', tileType: 'video' },
      { role: 'trust', description: 'Optional: Testimonials, certifications, trust elements', tileType: 'image' },
    ],
  },
  categoryPage: {
    description: 'Typical structure of a category subpage',
    sections: [
      { role: 'hero', description: 'Category hero with lifestyle photo of category products', layout: '1', tileType: 'image', dims: { w: 3000, h: [600, 800] } },
      { role: 'features', description: 'Optional: USPs/features of the category (2-col or 3-col image tiles)', tileType: 'image' },
      { role: 'products', description: 'Product Grid with ALL category ASINs', layout: '1', tileType: 'product_grid' },
      { role: 'lifestyle', description: 'Optional: Additional lifestyle images showing products in context', tileType: 'image' },
      { role: 'crosssell', description: 'Optional: Related categories as image links', tileType: 'image' },
    ],
  },
  bundlePage: {
    description: 'For brands with bundles/multipacks/savings offers',
    sections: [
      { role: 'hero', description: 'Bundle hero with savings message', layout: '1', tileType: 'image', dims: { w: 3000, h: [600, 800] } },
      { role: 'products', description: 'All bundle ASINs in a product grid', layout: '1', tileType: 'product_grid' },
    ],
  },
  moduleMix: {
    image: 0.74,
    product_grid: 0.13,
    image_text: 0.05,
    shoppable_image: 0.04,
    text: 0.03,
    video: 0.01,
  },
  textRules: {
    heroOverlay: 'Max 6 words, brand slogan or main message',
    categoryOverlay: 'Category name, optionally with subtitle',
    cta: "Short: 'Jetzt entdecken', 'Mehr erfahren', 'Shop now'",
    brief: 'English, for the designer, describes image content/style/mood',
    nativeText: 'ONLY for section headings or legal text, NOT for marketing content',
  },
  imageDimensions: {
    hero: { w: 3000, h: [600, 800] },
    categoryTile: { w: 3000, h: [1000, 1200] },
    lifestyle: { w: 3000, h: [1200, 1500] },
    brandStory: { w: 3000, h: [400, 600] },
  },
  nativeTextUsage: [
    'Section headings between image sections (like Nespresso: "ZWEI EINZIGARTIGE KAFFEE-ERLEBNISSE")',
    'Longer body text for sustainability/compliance/legal (like Nespresso B-Corp)',
    'image_text subtitle labels (like AG1 ingredient labels "MINERALSTOFFE")',
    'NEVER for main content messaging - that goes INTO images as designed text overlays',
  ],
};

// ─── VALIDATION HELPERS ───

export function validateStore(store) {
  var warnings = [];

  if (!store.pages || store.pages.length === 0) {
    warnings.push({ level: 'error', message: 'Store has no pages' });
    return warnings;
  }

  // Check unique page names
  var pageNames = {};
  store.pages.forEach(function(pg) {
    if (pageNames[pg.name]) {
      warnings.push({ level: 'warning', message: 'Duplicate page name: "' + pg.name + '"' });
    }
    pageNames[pg.name] = true;
  });

  // Check each page has at least 1 section
  store.pages.forEach(function(pg) {
    if (!pg.sections || pg.sections.length === 0) {
      warnings.push({ level: 'warning', message: 'Page "' + pg.name + '" has no sections' });
    }
  });

  // Check tile counts match layouts
  store.pages.forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      var layout = LAYOUTS.find(function(l) { return l.id === sec.layoutId; });
      if (!layout) {
        warnings.push({ level: 'error', message: 'Page "' + pg.name + '" section ' + (si + 1) + ': invalid layout "' + sec.layoutId + '"' });
        return;
      }
      if (sec.tiles.length !== layout.cells) {
        warnings.push({ level: 'warning', message: 'Page "' + pg.name + '" section ' + (si + 1) + ': has ' + sec.tiles.length + ' tiles but layout "' + layout.name + '" expects ' + layout.cells });
      }
    });
  });

  // Check ASIN coverage
  var asinUsage = {};
  store.pages.forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      sec.tiles.forEach(function(t) {
        if (t.type === 'product_grid' && t.asins) {
          t.asins.forEach(function(a) {
            if (asinUsage[a]) {
              warnings.push({ level: 'warning', message: 'ASIN ' + a + ' appears in multiple product grids' });
            }
            asinUsage[a] = true;
          });
        }
      });
    });
  });

  // Check tile validity
  store.pages.forEach(function(pg) {
    (pg.sections || []).forEach(function(sec, si) {
      sec.tiles.forEach(function(t, ti) {
        if (TILE_TYPES.indexOf(t.type) < 0) {
          warnings.push({ level: 'error', message: 'Page "' + pg.name + '" S' + (si + 1) + ' T' + (ti + 1) + ': invalid type "' + t.type + '"' });
        }
        if ((t.type === 'image' || t.type === 'shoppable_image') && !t.brief) {
          warnings.push({ level: 'info', message: 'Page "' + pg.name + '" S' + (si + 1) + ' T' + (ti + 1) + ': image tile has no designer brief' });
        }
        if (t.type === 'product_grid' && (!t.asins || t.asins.length === 0)) {
          warnings.push({ level: 'warning', message: 'Page "' + pg.name + '" S' + (si + 1) + ' T' + (ti + 1) + ': product grid has no ASINs' });
        }
      });
    });
  });

  return warnings;
}
