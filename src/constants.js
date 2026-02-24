// ─── LAYOUTS (Desktop + Mobile) ───
export var LAYOUTS = [
  { id: '1', name: 'Full Width', cols: '1fr', cells: 1, mobileCols: '1fr' },
  { id: '1-1', name: '2 Equal', cols: '1fr 1fr', cells: 2, mobileCols: '1fr' },
  { id: '1-1-1', name: '3 Equal', cols: '1fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-1-1', name: '4 Equal', cols: 'repeat(4,1fr)', cells: 4, mobileCols: '1fr 1fr' },
  { id: '2-1', name: 'Large + Small', cols: '2fr 1fr', cells: 2, mobileCols: '1fr' },
  { id: '1-2', name: 'Small + Large', cols: '1fr 2fr', cells: 2, mobileCols: '1fr' },
  { id: '2-1-1', name: 'Large + 2 Small', cols: '2fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-2', name: '2 Small + Large', cols: '1fr 1fr 2fr', cells: 3, mobileCols: '1fr' },
  // Stacked variants
  { id: 'lg-2stack', name: 'Large Left + 2 Stacked Right', cols: '2fr 1fr', cells: 3, stacked: 'right', mobileCols: '1fr' },
  { id: '2stack-lg', name: '2 Stacked Left + Large Right', cols: '1fr 2fr', cells: 3, stacked: 'left', mobileCols: '1fr' },
];

export var TILE_TYPES = ['image', 'product_grid', 'best_sellers', 'recommended', 'deals', 'video', 'text', 'shoppable_image', 'image_text'];

export var TILE_TYPE_LABELS = {
  image: 'Image', product_grid: 'Product Grid (ASIN-based)', best_sellers: 'Best Sellers',
  recommended: 'Recommended Products', deals: 'Deals / Offers', video: 'Video',
  text: 'Text (native)', shoppable_image: 'Shoppable Image', image_text: 'Image with Text',
};

export var PRODUCT_TILE_TYPES = ['product_grid', 'best_sellers', 'recommended', 'deals'];

export var LANGS = { de: 'German', com: 'English', 'co.uk': 'English', fr: 'French' };

export var DOMAINS = {
  de: 'https://www.amazon.de', com: 'https://www.amazon.com',
  'co.uk': 'https://www.amazon.co.uk', fr: 'https://www.amazon.fr',
};

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function emptyTile() {
  return {
    type: 'image', brief: '', textOverlay: '', ctaText: '',
    dimensions: { w: 3000, h: 1200 }, mobileDimensions: { w: 1242, h: 1200 },
    asins: [], linkAsin: '', linkUrl: '',
    uploadedImage: null, uploadedImageMobile: null, videoThumbnail: null,
  };
}

export var DIMENSION_PRESETS = {
  desktop: { hero: { w: 3000, h: 600 }, category: { w: 3000, h: 1200 }, lifestyle: { w: 3000, h: 1500 }, video: { w: 3000, h: 1688 } },
  mobile: { hero: { w: 1242, h: 450 }, category: { w: 1242, h: 1200 }, lifestyle: { w: 1242, h: 1500 }, video: { w: 1242, h: 699 } },
  headerBanner: { desktop: { w: 3000, h: 600 }, mobile: { w: 1242, h: 450 } },
};

// ─── MODULE BAUKASTEN (Building Blocks for Amazon Brand Stores) ───
// Composable modules — the AI picks and combines them based on brand,
// product complexity, and available content. NOT rigid templates.

export var MODULE_BAUKASTEN = {
  hero: {
    fullWidthHero: { description: 'Full-width hero banner with brand message or campaign', layout: '1', tileType: 'image', dims: { w: 3000, h: [600, 800] } },
    splitHero: { description: 'Hero split into two halves (lifestyle left + product right)', layout: '1-1', tileType: 'image', dims: { w: 3000, h: [800, 1200] } },
  },
  categoryNav: {
    grid2col: { description: '2-column category tiles with lifestyle + category name overlay', layout: '1-1', tileType: 'image' },
    grid3col: { description: '3-column category tiles', layout: '1-1-1', tileType: 'image' },
    grid4col: { description: '4-column category tiles', layout: '1-1-1-1', tileType: 'image' },
    largeAndSmall: { description: 'One large category + 2 stacked smaller ones', layout: 'lg-2stack', tileType: 'image' },
  },
  products: {
    fullWidthGrid: { description: 'Full-width product grid with category ASINs', layout: '1', tileType: 'product_grid' },
    productLifestylePairing: { description: 'Product grid next to lifestyle image (alternate sides for rhythm)', layout: '1-1' },
    shoppableImage: { description: 'Shoppable lifestyle image with clickable products', layout: '1', tileType: 'shoppable_image' },
  },
  lifestyle: {
    fullWidthLifestyle: { description: 'Full-width lifestyle image showing products in context', layout: '1', tileType: 'image', dims: { w: 3000, h: [1200, 1500] } },
    lifestyleSplit: { description: 'Two lifestyle images side by side (different use cases)', layout: '1-1', tileType: 'image' },
    alternatingPairing: { description: 'Alternating: Lifestyle left+Product right, then reversed next section', layout: '1-1' },
  },
  features: {
    featureGrid3col: { description: '3-column feature/benefit tiles (icon+text designed into image)', layout: '1-1-1', tileType: 'image' },
    featureGrid4col: { description: '4-column feature tiles', layout: '1-1-1-1', tileType: 'image' },
    featureLargeAndDetails: { description: 'Large feature image left + 2 stacked detail images right', layout: 'lg-2stack', tileType: 'image' },
    featureSplit: { description: 'Product photo left, USP bullets designed into image right', layout: '1-1', tileType: 'image' },
  },
  video: {
    fullWidthVideo: { description: 'Full-width video section', layout: '1', tileType: 'video', dims: { w: 3000, h: 1688 } },
    videoWithContext: { description: 'Video next to lifestyle/feature image', layout: '1-1' },
  },
  text: {
    sectionHeading: { description: 'Native text as section heading ONLY', layout: '1', tileType: 'text' },
  },
  trust: {
    testimonialBanner: { description: 'Customer quotes/reviews designed into banner', layout: '1', tileType: 'image' },
    certificationGrid: { description: 'Certification/trust badges in a row', layout: '1-1-1', tileType: 'image' },
    trustSplit: { description: 'Brand story / about us split section', layout: '1-1', tileType: 'image' },
  },
  variants: {
    colorShowcase: { description: 'Product in multiple colors/variants as grid', layout: '1-1-1-1', tileType: 'image' },
    variantBanner: { description: 'All variants in one designed banner', layout: '1', tileType: 'image' },
  },
  footer: {
    categoryNavFooter: { description: 'Category navigation tiles at page bottom', layout: '1-1-1-1', tileType: 'image' },
    crossSellBanner: { description: 'Cross-sell banner linking to related category', layout: '1', tileType: 'image' },
  },
};

// ─── PRODUCT COMPLEXITY CLASSIFICATION ───
export var PRODUCT_COMPLEXITY = {
  simple: {
    description: 'Simple, self-explanatory products (socks, basic clothing, accessories)',
    approach: 'Heavy on product grids and lifestyle imagery. Minimal feature explanation.',
    imagePct: 80, productGridPct: 15, otherPct: 5,
  },
  medium: {
    description: 'Products with some USPs (organic food, special materials, branded items)',
    approach: 'Mix of product display and feature highlights. Some USP modules.',
    imagePct: 70, productGridPct: 15, otherPct: 15,
  },
  complex: {
    description: 'Technical/feature-rich products (electronics, appliances, equipment)',
    approach: 'Rich feature showcases, videos, technical details alongside product grids.',
    imagePct: 65, productGridPct: 10, videoPct: 10, otherPct: 15,
  },
  variantRich: {
    description: 'Products with many colors/sizes/materials (furniture, fashion, customizable)',
    approach: 'Showcase variants prominently. Color/material grids alongside product grids.',
    imagePct: 75, productGridPct: 15, otherPct: 10,
  },
};

// ─── REFERENCE STORES (real top-performing Amazon Brand Stores) ───
export var REFERENCE_STORES = [
  { brand: 'Kaercher', style: 'professional/technical, yellow brand color', complexity: 'complex',
    keyPattern: 'Category tiles with lifestyle photo + colored overlay bar. 85% image. No native text.' },
  { brand: 'Nespresso', style: 'premium/luxury, dark tones', complexity: 'medium',
    keyPattern: 'Native text ONLY for section headings. image_text for quiz. Dark lifestyle + gold accents. Large+2stack layout.' },
  { brand: 'ESN', style: 'dark/sporty, bold, athletic', complexity: 'medium',
    keyPattern: '2-col category tiles with CTA designed into images. 95% image, no native text.' },
  { brand: 'Affenzahn', style: 'colorful, playful, children-oriented', complexity: 'simple',
    keyPattern: 'Character-based category nav, bright colors, playful CTAs.' },
  { brand: 'AG1', style: 'clean/health, green tones', complexity: 'medium',
    keyPattern: 'image_text modules for ingredient highlights in 3x2 grid.' },
  { brand: 'SNOCKS', style: 'minimalist, clean, modern', complexity: 'simple',
    keyPattern: '4x2 image_text tiles (lifestyle+label). Large-left/2-stacked-right layout.' },
  { brand: 'Bears with Benefits', style: 'pink/feminine, testimonial-heavy', complexity: 'medium',
    keyPattern: 'Shoppable images. Alternating lifestyle/icon tiles. Testimonials with designed quotes.' },
  { brand: 'Dyson', style: 'premium/tech, dark backgrounds', complexity: 'complex',
    keyPattern: 'Background video tiles per product line. Feature-heavy with exploded views.' },
  { brand: 'air up', style: 'colorful/modern, Gen-Z oriented', complexity: 'variantRich',
    keyPattern: 'Alternating ASIN/lifestyle pairings. Variant showcase. 4-col category nav footer.' },
  { brand: 'Desktronic', style: 'modern/tech, clean', complexity: 'complex',
    keyPattern: 'Background video tiles. Feature comparison. Variant/color showcase grid.' },
];

// ─── STORE COMPOSITION PRINCIPLES ───
export var STORE_PRINCIPLES = {
  general: [
    '90% of modules are image-based (image, shoppable_image, image_text). Text is designed INTO images.',
    'Native text modules ONLY for section headings or legal/compliance. NEVER for marketing.',
    'Visual communication beats text. Show, dont tell.',
    'Every page: Hero -> Content -> Products -> Cross-sell.',
    'CTA text and headlines are designed INTO images, not as separate text modules.',
    'Each tile in a row must have the SAME height.',
    'Think in image pairs and trios, not isolated tiles.',
  ],
  homepage: [
    'Homepage = brand entrance. Communicate brand world visually.',
    'Hero banner with slogan/campaign. Category navigation tiles linking to subpages.',
    'Optional: Bestseller grid, brand story, lifestyle, video.',
    'Homepage does NOT show all products. It navigates to categories.',
  ],
  categoryPage: [
    'Start with category hero (lifestyle shot).',
    'Product grid with ALL category ASINs is the core.',
    'Mix lifestyle/feature images between product grids for breathing room.',
    'Simple products: product grid dominates. Complex products: feature modules + videos.',
  ],
  adaptToComplexity: [
    'SIMPLE products: More direct product tiles, less explanation. Lifestyle sells.',
    'MEDIUM products: Some feature modules to highlight USPs.',
    'COMPLEX products: Rich feature sections, videos, technical breakdowns.',
    'VARIANT-RICH products: Variant showcase modules, color/material grids.',
  ],
};

// ─── VALIDATION HELPERS ───

export function validateStore(store) {
  var warnings = [];

  if (!store.pages || store.pages.length === 0) {
    warnings.push({ level: 'error', message: 'Store has no pages' });
    return warnings;
  }

  var pageNames = {};
  store.pages.forEach(function(pg) {
    if (pageNames[pg.name]) {
      warnings.push({ level: 'warning', message: 'Duplicate page name: "' + pg.name + '"' });
    }
    pageNames[pg.name] = true;
  });

  store.pages.forEach(function(pg) {
    if (!pg.sections || pg.sections.length === 0) {
      warnings.push({ level: 'warning', message: 'Page "' + pg.name + '" has no sections' });
    }
  });

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
