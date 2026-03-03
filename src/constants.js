// ─── LAYOUTS (Desktop + Mobile) ───
// Based on all available Amazon Brand Store section types
// Desktop image types: Large Square (1500×1500), Small Square (750×750), Wide (1500×700)
// Mobile: variable ratio (min 1680px wide, 20–3000px high)
export var LAYOUTS = [
  // ─── Existing layouts (generic / legacy) ───
  { id: '1', name: 'Full Width', cols: '1fr', cells: 1, mobileCols: '1fr' },
  { id: '1-1', name: '2 Equal', cols: '1fr 1fr', cells: 2, mobileCols: '1fr' },
  { id: '1-1-1', name: '3 Equal', cols: '1fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-1-1', name: '4 Equal', cols: 'repeat(4,1fr)', cells: 4, mobileCols: '1fr 1fr' },
  // Asymmetric 2-col
  { id: '2-1', name: 'Large + Small', cols: '2fr 1fr', cells: 2, mobileCols: '1fr 1fr' },
  { id: '1-2', name: 'Small + Large', cols: '1fr 2fr', cells: 2, mobileCols: '1fr 1fr' },
  // Asymmetric 3-col
  { id: '2-1-1', name: 'Large + 2 Small', cols: '2fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-2', name: '2 Small + Large', cols: '1fr 1fr 2fr', cells: 3, mobileCols: '1fr' },
  // Stacked: Large + 2 stacked (Amazon Desktop #3 + mirror)
  { id: 'lg-2stack', name: 'Large Left + 2 Stacked Right', cols: '2fr 1fr', cells: 3, grid: 'lg-2stack', mobileCols: '1fr 1fr', mobileGrid: 'lg-2stack' },
  { id: '2stack-lg', name: '2 Stacked Left + Large Right', cols: '1fr 2fr', cells: 3, grid: '2stack-lg', mobileCols: '1fr 1fr', mobileGrid: '2stack-lg' },
  // Large + 2x2 Grid (5 tiles)
  { id: 'lg-4grid', name: 'Large Left + 2x2 Grid Right', cols: '2fr 1fr 1fr', cells: 5, grid: 'lg-4grid', mobileCols: '1fr 1fr', mobileGrid: 'lg-4grid' },
  { id: '4grid-lg', name: '2x2 Grid Left + Large Right', cols: '1fr 1fr 2fr', cells: 5, grid: '4grid-lg', mobileCols: '1fr 1fr', mobileGrid: '4grid-lg' },

  // ─── Amazon Desktop #4: Large + (Wide over 2 Small) ───
  // Mobile: wide → 2 small → wide (t0 spans, t1+t2 side-by-side, t3 spans)
  { id: 'lg-w2s', name: 'Large + Wide & 2 Small', cols: '2fr 1fr 1fr', cells: 4, grid: 'lg-w2s', mobileCols: '1fr 1fr', mobileGrid: 'lg-w2s' },
  // Mirror: (Wide over 2 Small) + Large
  { id: 'w2s-lg', name: 'Wide & 2 Small + Large', cols: '1fr 1fr 2fr', cells: 4, grid: 'w2s-lg', mobileCols: '1fr 1fr', mobileGrid: 'w2s-lg' },

  // ─── Amazon Desktop #5: 2×2 Wide Grid (full width) ───
  // Mobile: tiles flow in 2-column pairs
  { id: '2x2wide', name: '2×2 Wide Grid', cols: '1fr 1fr', cells: 4, grid: '2x2wide', mobileCols: '1fr 1fr' },

  // ─── Amazon Desktop #6: 2 Stacked + 2×2 Small Grid ───
  // Mobile: 3 rows of 2 small tiles
  { id: '2s-4grid', name: '2 Stacked + 2×2 Grid', cols: '1fr 1fr 1fr', cells: 6, grid: '2s-4grid', mobileCols: '1fr 1fr' },
  // Mirror: 2×2 Grid + 2 Stacked
  // Mobile: 2 small → wide → 2 small → wide (t2,t5 span)
  { id: '4grid-2s', name: '2×2 Grid + 2 Stacked', cols: '1fr 1fr 1fr', cells: 6, grid: '4grid-2s', mobileCols: '1fr 1fr', mobileGrid: '4grid-2s' },

  // ─── Amazon Desktop #7: (Wide + 2 Small) + 2×2 Grid ───
  // Mobile: wide → 2 small → 2 small → 2 small (t0 spans)
  { id: 'w2s-4grid', name: 'Wide & 2 Small + 2×2 Grid', cols: '1fr 1fr 1fr 1fr', cells: 7, grid: 'w2s-4grid', mobileCols: '1fr 1fr', mobileGrid: 'w2s-4grid' },
  // Mirror: 2×2 Grid + (Wide + 2 Small)
  // Mobile: 2 small → 2 small → wide → 2 small (t4 spans)
  { id: '4grid-w2s', name: '2×2 Grid + Wide & 2 Small', cols: '1fr 1fr 1fr 1fr', cells: 7, grid: '4grid-w2s', mobileCols: '1fr 1fr', mobileGrid: '4grid-w2s' },

  // ─── Amazon Desktop #8: 4×2 Grid (full width, 8 small tiles) ───
  // Mobile: 4 rows of 2 small tiles
  { id: '4x2grid', name: '4×2 Grid', cols: '1fr 1fr 1fr 1fr', cells: 8, grid: '4x2grid', mobileCols: '1fr 1fr' },
];

export var TILE_TYPES = ['image', 'product_grid', 'best_sellers', 'recommended', 'deals', 'video', 'text', 'shoppable_image', 'image_text'];

export var TILE_TYPE_LABELS = {
  image: 'Image', product_grid: 'Product Grid (ASIN)', best_sellers: 'Best Sellers',
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
    bgColor: '',
  };
}

export var DIMENSION_PRESETS = {
  desktop: { hero: { w: 3000, h: 600 }, category: { w: 3000, h: 1200 }, lifestyle: { w: 3000, h: 1500 }, video: { w: 3000, h: 1688 } },
  mobile: { hero: { w: 1242, h: 450 }, category: { w: 1242, h: 1200 }, lifestyle: { w: 1242, h: 1500 }, video: { w: 1242, h: 699 } },
  headerBanner: { desktop: { w: 3000, h: 600 }, mobile: { w: 1242, h: 450 } },
};

// ─── AMAZON DESKTOP IMAGE TYPES ───
// Strict desktop formats — mobile is always variable (min 1680px wide, 20–3000px high)
export var AMAZON_IMG_TYPES = {
  LARGE_SQUARE: { w: 1500, h: 1500, label: 'Large Square' },
  SMALL_SQUARE: { w: 750, h: 750, label: 'Small Square' },
  WIDE: { w: 1500, h: 700, label: 'Wide' },
  FULL_WIDTH: { w: 3000, h: 600, label: 'Full Width' },
};

// ─── PER-LAYOUT TILE DIMENSIONS (Desktop) ───
// Maps layout id → array of desktop dimension objects per tile index (mobile order)
var I = AMAZON_IMG_TYPES;
export var LAYOUT_TILE_DIMS = {
  '1':          [I.FULL_WIDTH],
  '2-1':        [I.LARGE_SQUARE, I.SMALL_SQUARE],
  '1-2':        [I.SMALL_SQUARE, I.LARGE_SQUARE],
  'lg-2stack':  [I.LARGE_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '2stack-lg':  [I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  'lg-w2s':     [I.LARGE_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.WIDE],
  'w2s-lg':     [I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  '2x2wide':    [I.WIDE, I.WIDE, I.WIDE, I.WIDE],
  '2s-4grid':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-2s':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  'w2s-4grid':  [I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-w2s':  [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4x2grid':    [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  // Legacy layouts (5-tile): Large + 2x2
  'lg-4grid':   [I.LARGE_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-lg':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
};

// Helper: create empty tile with correct dimensions for a specific layout position
export function emptyTileForLayout(layoutId, tileIndex) {
  var dims = LAYOUT_TILE_DIMS[layoutId];
  var d = dims && dims[tileIndex] ? dims[tileIndex] : { w: 3000, h: 1200 };
  return {
    type: 'image', brief: '', textOverlay: '', ctaText: '',
    dimensions: { w: d.w, h: d.h },
    mobileDimensions: { w: 1680, h: Math.round(1680 * d.h / d.w) },
    asins: [], linkAsin: '', linkUrl: '',
    uploadedImage: null, uploadedImageMobile: null, videoThumbnail: null,
    bgColor: '',
  };
}

// ─── AMAZON PRODUCT CATEGORIES ───
// Top-level categories to influence store tone/style
export var AMAZON_CATEGORIES = [
  { id: 'generic', name: 'General / Other' },
  { id: 'electronics', name: 'Electronics & Computers' },
  { id: 'home_kitchen', name: 'Home & Kitchen' },
  { id: 'beauty', name: 'Beauty & Personal Care' },
  { id: 'health', name: 'Health & Wellness' },
  { id: 'sports', name: 'Sports & Outdoors' },
  { id: 'fashion', name: 'Clothing, Shoes & Jewelry' },
  { id: 'baby', name: 'Baby & Kids' },
  { id: 'toys', name: 'Toys & Games' },
  { id: 'food', name: 'Grocery & Gourmet Food' },
  { id: 'supplements', name: 'Vitamins & Supplements' },
  { id: 'pets', name: 'Pet Supplies' },
  { id: 'garden', name: 'Garden & Outdoor' },
  { id: 'automotive', name: 'Automotive' },
  { id: 'tools', name: 'Tools & Home Improvement' },
  { id: 'office', name: 'Office Products' },
  { id: 'books', name: 'Books & Media' },
  { id: 'handmade', name: 'Handmade & Craft' },
  { id: 'industrial', name: 'Industrial & Scientific' },
  { id: 'cleaning', name: 'Cleaning & Household' },
];

// Style guidance per category for AI prompts
export var CATEGORY_STYLE_HINTS = {
  generic: { tone: 'neutral, professional', visualStyle: 'clean and versatile', trustFocus: false },
  electronics: { tone: 'technical, innovative, modern', visualStyle: 'dark backgrounds, product renders, tech aesthetic', trustFocus: true },
  home_kitchen: { tone: 'warm, inviting, practical', visualStyle: 'lifestyle shots in home setting, warm lighting', trustFocus: false },
  beauty: { tone: 'elegant, aspirational, sensory', visualStyle: 'soft tones, close-ups, lifestyle beauty shots', trustFocus: false },
  health: { tone: 'trustworthy, scientific, reassuring', visualStyle: 'clean whites, certifications prominent, trust badges', trustFocus: true },
  sports: { tone: 'energetic, bold, performance-driven', visualStyle: 'action shots, strong colors, athletic imagery', trustFocus: false },
  fashion: { tone: 'trendy, stylish, aspirational', visualStyle: 'model shots, lookbook style, lifestyle focus', trustFocus: false },
  baby: { tone: 'gentle, caring, safe, playful', visualStyle: 'soft pastels, happy families, safety certifications', trustFocus: true },
  toys: { tone: 'fun, colorful, playful, exciting', visualStyle: 'bright colors, children playing, animated feel', trustFocus: true },
  food: { tone: 'appetizing, natural, authentic', visualStyle: 'food photography, ingredients, origin stories', trustFocus: false },
  supplements: { tone: 'scientific, healthy, trustworthy', visualStyle: 'clean design, ingredient highlights, certifications', trustFocus: true },
  pets: { tone: 'loving, caring, fun', visualStyle: 'happy pets, lifestyle shots, warm colors', trustFocus: false },
  garden: { tone: 'natural, fresh, outdoor', visualStyle: 'garden settings, greenery, seasonal imagery', trustFocus: false },
  automotive: { tone: 'technical, reliable, precise', visualStyle: 'product detail shots, installation context, dark tones', trustFocus: true },
  tools: { tone: 'practical, durable, professional', visualStyle: 'workshop settings, product in use, technical detail', trustFocus: false },
  office: { tone: 'professional, productive, organized', visualStyle: 'office settings, clean desk aesthetic, minimal', trustFocus: false },
  books: { tone: 'intellectual, creative, storytelling', visualStyle: 'reading scenes, atmospheric, cozy', trustFocus: false },
  handmade: { tone: 'artisanal, unique, personal', visualStyle: 'craft process, maker story, warm textures', trustFocus: false },
  industrial: { tone: 'professional, precise, reliable', visualStyle: 'industrial settings, technical specs, clean layout', trustFocus: true },
  cleaning: { tone: 'clean, effective, eco-conscious', visualStyle: 'before/after, clean spaces, ingredient focus', trustFocus: false },
};

// ─── STORE COMPLEXITY LEVELS ───
// Controls section count, extra pages, and overall depth
export var COMPLEXITY_LEVELS = {
  1: {
    name: 'Basic',
    sectionsPerCategoryPage: { min: 2, max: 3 },
    sectionsPerHomepage: { min: 3, max: 5 },
    extraPages: false,
    includeVideos: false,
    includeFollowCTA: false,
    includeTrustElements: false,
    includeBrandStory: false,
    description: 'Product categories with clean, direct structure. All products easily findable.',
  },
  2: {
    name: 'Standard',
    sectionsPerCategoryPage: { min: 3, max: 5 },
    sectionsPerHomepage: { min: 5, max: 8 },
    extraPages: true,
    extraPageTypes: ['bestsellers', 'about_us'],
    includeVideos: true,
    videoMax: 1,
    includeFollowCTA: false,
    includeTrustElements: true,
    includeBrandStory: true,
    description: 'Categories plus extra pages (Bestsellers, About Us). Lifestyle imagery, optional video.',
  },
  3: {
    name: 'Premium',
    sectionsPerCategoryPage: { min: 4, max: 7 },
    sectionsPerHomepage: { min: 7, max: 12 },
    extraPages: true,
    extraPageTypes: ['bestsellers', 'about_us', 'features', 'certifications', 'sustainability'],
    includeVideos: true,
    videoMax: 3,
    includeFollowCTA: true,
    includeTrustElements: true,
    includeBrandStory: true,
    includeDetailedShowcases: true,
    description: 'Full experience with extra pages, videos, trust elements, follow CTA, and detailed showcases.',
  },
};

// ─── PRICING CONFIGURATION ───
// Market-rate estimates for brand store design
export var PRICING = {
  imagePrice: 45,
  videoPrice: 650,
  baseSetupFee: 750,
  imageCost: 5,
  currency: 'EUR',
  password: 'agentur2024',
};

// ─── MODULE BAUKASTEN (Building Blocks for Amazon Brand Stores) ───
// Composable modules: the AI picks and combines them based on brand,
// product complexity, and available content. NOT rigid templates.

export var MODULE_BAUKASTEN = {
  // === HERO MODULES ===
  hero: {
    fullWidthHero: { description: 'Full-width hero banner with brand message or campaign', layout: '1', tileType: 'image' },
    splitHero: { description: 'Hero split: lifestyle left + product/message right', layout: '1-1', tileType: 'image' },
  },

  // === CATEGORY NAVIGATION ===
  categoryNav: {
    grid2col: { description: '2 category tiles with lifestyle + category name overlay', layout: '1-1' },
    grid3col: { description: '3 category tiles', layout: '1-1-1' },
    grid4col: { description: '4 category tiles in a row', layout: '1-1-1-1' },
    largeAndStacked: { description: 'Main category large + 2 subcategories stacked', layout: 'lg-2stack' },
    largeAnd4grid: { description: 'Main category large + 4 subcategories in 2x2 grid', layout: 'lg-4grid' },
    grid6tiles: { description: '6 category tiles in 3×2 grid (2 stacked + 2×2)', layout: '2s-4grid' },
    grid8tiles: { description: '8 category tiles in 4×2 grid', layout: '4x2grid' },
    wideGrid4: { description: '4 wide category tiles in 2×2 grid', layout: '2x2wide' },
  },

  // === PRODUCT DISPLAY ===
  products: {
    fullWidthGrid: { description: 'Full-width ASIN product grid', layout: '1', tileType: 'product_grid' },
    productPlusLifestyle: { description: 'Product grid left + lifestyle image right (or reversed)', layout: '1-1' },
    shoppableFullWidth: { description: 'Full-width shoppable image (clean product photo, clickable hotspots)', layout: '1', tileType: 'shoppable_image' },
    shoppableSplit: { description: 'Shoppable image left + product name/text tile right (or reversed)', layout: '1-1',
      example: 'Left: clean product image as shoppable_image. Right: image with just the product name designed in.' },
    productShowcaseLarge: { description: 'Large product shoppable_image left + 2 stacked detail tiles right', layout: 'lg-2stack',
      example: 'Left: large product/bundle shoppable image. Right top: USP/feature tile. Right bottom: another product or CTA tile.' },
    productWith4Details: { description: 'Large product image left + 4 detail/variant tiles in 2x2 right', layout: 'lg-4grid',
      example: 'Left: hero product shot. Right 2x2: four detail tiles (features, variants, angles, or 4 smaller shoppable products).' },
    productWithWideAndSmall: { description: 'Large product left + wide banner top-right + 2 detail tiles bottom-right', layout: 'lg-w2s',
      example: 'Left: large hero product. Right top: wide feature/promo banner. Right bottom: 2 smaller detail or variant tiles.' },
    bundleShowcase: { description: 'Bundle displayed as large image + small component products', layout: 'lg-2stack',
      example: 'Left: bundle shoppable_image. Right: individual products as smaller shoppable tiles.' },
    productGrid2x2wide: { description: '4 product lifestyle shots as wide tiles in 2×2 grid', layout: '2x2wide',
      example: 'Four wide product/lifestyle tiles showing different use cases or product lines.' },
  },

  // === LIFESTYLE / BRAND STORYTELLING ===
  lifestyle: {
    fullWidthLifestyle: { description: 'Full-width lifestyle image showing products in context', layout: '1', tileType: 'image' },
    lifestyleSplit: { description: 'Two lifestyle images side by side (different use cases)', layout: '1-1' },
    alternatingPairing: { description: 'Section A: lifestyle left + product right. Section B: product left + lifestyle right.', layout: '1-1',
      note: 'Use across 2 consecutive sections, mirroring arrangement for visual rhythm.' },
    nameAndProduct: { description: 'Product/category name tile left + clean product image right', layout: '1-1',
      example: 'Left: image with just product name designed in, minimal. Right: product packshot or shoppable_image.' },
  },

  // === FEATURE / USP MODULES ===
  features: {
    featureGrid3col: { description: '3-column feature/benefit tiles (icon+text designed into image)', layout: '1-1-1' },
    featureGrid4col: { description: '4-column feature tiles', layout: '1-1-1-1' },
    featureLargeAndDetails: { description: 'Large feature image + 2 stacked detail tiles', layout: 'lg-2stack' },
    featureSplit: { description: 'Product photo left + USP bullets designed into image right', layout: '1-1' },
    featureWith4Grid: { description: 'Large product left + 4 feature tiles in 2x2 grid right', layout: 'lg-4grid',
      example: 'Left: product hero. Right: 4 tiles each highlighting one feature/benefit.' },
    featureWide2x2: { description: 'Wide feature overview + 2 detail tiles on left, 2×2 grid of feature icons on right', layout: 'w2s-4grid',
      example: 'Left top: wide feature overview banner. Left bottom: 2 detail tiles. Right: 4 individual feature icons/tiles.' },
    featureGrid8: { description: '8 feature/benefit tiles in 4×2 grid', layout: '4x2grid',
      example: 'Eight small tiles, each showing one feature or benefit with icon and short text.' },
  },

  // === VIDEO ===
  video: {
    fullWidthVideo: { description: 'Full-width video section', layout: '1', tileType: 'video' },
    videoWithContext: { description: 'Video next to lifestyle/feature image', layout: '1-1' },
  },

  // === TEXT (use sparingly!) ===
  text: {
    sectionHeading: { description: 'Native text as section heading ONLY (not for marketing)', layout: '1', tileType: 'text' },
  },

  // === TRUST / SOCIAL PROOF ===
  trust: {
    testimonialBanner: { description: 'Customer reviews/quotes designed into banner', layout: '1' },
    certificationGrid: { description: 'Certification/trust badges in a row', layout: '1-1-1' },
    trustSplit: { description: 'Brand story / about us split', layout: '1-1' },
  },

  // === VARIANT / COLOR SHOWCASE ===
  variants: {
    colorShowcase4: { description: '4 color/variant tiles in a row', layout: '1-1-1-1' },
    variantBanner: { description: 'All variants in one designed banner', layout: '1' },
    variantLargeAnd4: { description: 'Product hero left + 4 color variants in 2x2 right', layout: 'lg-4grid' },
    variantGrid6: { description: '6 variant tiles in 3×2 grid', layout: '2s-4grid' },
    variantGrid8: { description: '8 variant/color tiles in 4×2 grid', layout: '4x2grid' },
  },

  // === FOOTER / CROSS-SELL ===
  footer: {
    categoryNavFooter: { description: 'Category navigation tiles at page bottom', layout: '1-1-1-1' },
    crossSellBanner: { description: 'Cross-sell banner linking to related category', layout: '1' },
    crossSellSplit: { description: 'Two cross-sell tiles linking to other categories', layout: '1-1' },
  },

  // === FOLLOW / ENGAGEMENT (Premium) ===
  engagement: {
    followBanner: { description: 'Follow button CTA banner encouraging store follows', layout: '1', tileType: 'image' },
    followSplit: { description: 'Brand story left + follow CTA right', layout: '1-1' },
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

// ─── STORE TEMPLATES (based on real scraped Amazon Brand Store analyses) ───
// Each template captures the VISUAL DNA of real top-performing stores.
// The AI adapts the pattern to the user's brand, products, and categories.
export var STORE_TEMPLATES = [
  {
    id: 'technical-professional',
    name: 'Technical / Professional',
    description: 'Strong brand color, feature-rich, product-in-action photography. Deep navigation. Ideal for tools, appliances, electronics, cleaning equipment.',
    inspiration: 'Kärcher, Dyson, Bosch',
    style: 'professional/technical',
    // ─── VISUAL DNA (scraped from Kärcher store) ───
    visualDNA: {
      colors: {
        primary: '#FFED00',       // Kärcher yellow (RAL 1018)
        secondary: '#000000',     // Black
        accent: '#FFFFFF',        // White
        backgrounds: ['brand-color', 'white', 'dark'],
        sectionAlternation: 'brand-color → white-grid → lifestyle-dark → white-grid → brand-color',
      },
      textStyle: {
        ratio: 0.25,              // 25% text, 75% imagery
        headlines: 'large-bold-sans-serif',
        overlayStyle: 'white-on-dark or black-on-brand-color',
        ctaStyle: 'button-designed-into-image',
      },
      productDisplay: {
        primary: 'in-use-lifestyle',    // People using products in real settings
        secondary: 'floating-on-brand-color', // Product silhouette on yellow
        grid: 'packshot-white-bg',      // Standard Amazon white bg in grids
        photography: 'contrast-rich, sharp, bold, frontal angles',
      },
      sectionVariety: {
        floatingWhiteBg: true,
        videoPresence: true,
        shoppableImages: true,
        trustElements: true,       // Heritage, patents, awards
        brandStory: true,
      },
    },
    // ─── SECTION BLUEPRINT ───
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[LIFESTYLE] [product] in outdoor use, brand-color accent bar, bold tagline' },
      { layout: '1-1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category name on dark overlay, lifestyle background' },
      { layout: 'lg-4grid', purpose: 'Hero product spotlight', tileTypes: ['shoppable_image','image','image','image','image'], brief: '[SHOPPABLE] flagship product on brand-color bg + [CREATIVE] 4 feature close-ups with specs' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Brand heritage / technology', tileTypes: ['image','image'], brief: '[CREATIVE] heritage/innovation showcase + technology infographic' },
      { layout: '1', purpose: 'Product grid by category', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Trust / certification elements', tileTypes: ['image','image','image'], brief: '[CREATIVE] trust badge with icon on white — certification, award, sustainability' },
      { layout: '1', purpose: 'Deals / promo banner', tileTypes: ['image'], brief: '[CREATIVE] promo banner on brand-color, bold savings messaging' },
      { layout: '1-1-1-1', purpose: 'Footer category navigation', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category thumbnail with name overlay for bottom nav' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] [category product] in realistic setting, category name overlay' },
      { layout: 'lg-2stack', purpose: 'Product + features', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] hero product on white + [CREATIVE] 2 feature close-ups with specs' },
      { layout: '1-1-1', purpose: 'Technical specs visual', tileTypes: ['image','image','image'], brief: '[CREATIVE] spec/feature detail with number overlay (e.g. "180 bar")' },
      { layout: '1', purpose: 'Product demo video', tileTypes: ['video'], brief: 'Product demo video: product in real conditions, technical close-ups' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1', purpose: 'Comparison / usage scenarios', tileTypes: ['image','image'], brief: '[CREATIVE] before/after comparison + [LIFESTYLE] product in professional use' },
      { layout: '1-1-1', purpose: 'Accessories cross-sell', tileTypes: ['image','image','image'], brief: '[SHOPPABLE] accessory product with name overlay' },
    ],
  },
  {
    id: 'premium-lifestyle',
    name: 'Premium / Luxury',
    description: 'Dark, moody, luxurious. Shoppable lifestyle images. Minimal text. Sustainability storytelling. Ideal for premium food, beauty, home goods.',
    inspiration: 'Nespresso, Rituals, Jo Malone',
    style: 'lifestyle/premium',
    visualDNA: {
      colors: {
        primary: '#2E2E2C',       // Near-black charcoal
        secondary: '#BD6416',     // Rich amber/gold
        accent: '#FDAF3E',        // Warm honey gold
        backgrounds: ['dark', 'very-dark-brown', 'white'],
        sectionAlternation: 'dark-lifestyle → white-grid → dark-brand-story → white-grid → dark-footer',
      },
      textStyle: {
        ratio: 0.20,              // 20% text, 80% imagery — very image-dominant
        headlines: 'elegant-sans-serif-medium-weight',
        overlayStyle: 'white-on-dark, gold-accents',
        ctaStyle: 'subtle-text-link-or-small-button',
      },
      productDisplay: {
        primary: 'editorial-lifestyle',   // Products in aspirational settings
        secondary: 'packshot-white-bg',   // Clean product shots in grids
        grid: 'packshot-white-bg',
        photography: 'warm lighting, moody, dark backgrounds, lifestyle-first',
      },
      sectionVariety: {
        floatingWhiteBg: true,     // White grids contrast with dark sections
        videoPresence: true,       // Brand/product videos
        shoppableImages: true,     // Key module — lifestyle with hotspots
        trustElements: true,       // Sustainability, B-Corp, recycling
        brandStory: true,          // Heritage, values, sustainability deep-dive
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[LIFESTYLE] product in elegant premium setting, dark moody warm lighting' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[LIFESTYLE] category lifestyle on dark tone, white category name overlay' },
      { layout: '1', purpose: 'Shoppable lifestyle', tileTypes: ['shoppable_image'], brief: '[SHOPPABLE] premium setting with products, warm lighting, dark bg' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Brand story / sustainability', tileTypes: ['image','image'], brief: '[CREATIVE] brand heritage/origin + sustainability values, dark bg, gold accent' },
      { layout: '1', purpose: 'Product grid secondary', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Trust / values', tileTypes: ['image','image','image'], brief: '[CREATIVE] value pillar icon with one-word overlay, dark bg, gold text' },
      { layout: '1', purpose: 'Footer promo', tileTypes: ['image'], brief: '[CREATIVE] brand statement, dark elegant minimal text' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products in premium dark moody setting' },
      { layout: '1-1', purpose: 'Product spotlight', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product editorial photo + [PRODUCT] feature close-up' },
      { layout: '1', purpose: 'Brand lifestyle video', tileTypes: ['video'], brief: 'Premium lifestyle video: elegant product usage, moody cinematic quality' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1-1', purpose: 'Variant showcase', tileTypes: ['image','image','image'], brief: '[PRODUCT] variant/flavor with color-coded accent and name overlay' },
      { layout: '1-1', purpose: 'Lifestyle storytelling', tileTypes: ['image','image'], brief: '[LIFESTYLE] product in different aspirational usage contexts' },
    ],
  },
  {
    id: 'sporty-bold',
    name: 'Sporty / Bold',
    description: 'Black-dominant, high-contrast, performance-driven. Angular design motifs. Perfect for fitness, sports nutrition, athletic brands.',
    inspiration: 'ESN, Optimum Nutrition, MyProtein',
    style: 'sporty/bold',
    visualDNA: {
      colors: {
        primary: '#000000',       // Black
        secondary: '#FFFFFF',     // White
        accent: 'flavor-specific', // Each product line has own color
        backgrounds: ['black', 'white', 'dark-gradient'],
        sectionAlternation: 'black-hero → white-grid → black-brand → white-grid → black-footer',
      },
      textStyle: {
        ratio: 0.20,
        headlines: 'heavy-bold-uppercase-sans-serif',
        overlayStyle: 'white-on-black, bold, angular',
        ctaStyle: 'bold-button-with-contrast',
      },
      productDisplay: {
        primary: 'packshot-on-dark',      // Products on black with dramatic lighting
        secondary: 'athlete-lifestyle',    // Fitness models using products
        grid: 'packshot-white-bg',
        photography: 'high-contrast, dramatic lighting, angular crops, masculine feel',
      },
      sectionVariety: {
        floatingWhiteBg: false,    // Prefer dark backgrounds
        videoPresence: true,       // Training/workout videos
        shoppableImages: true,
        trustElements: true,       // Performance stats, lab-tested badges
        brandStory: true,          // "For the Win" style mission statement
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[LIFESTYLE] athlete with product, dark bg, dramatic lighting, bold tagline' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] packshot on dark bg, flavor-colored accent stripe, bold category name' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] flagship product dramatic packshot + [CREATIVE] ingredient/benefit tiles, high-contrast' },
      { layout: '1', purpose: 'Video section', tileTypes: ['video'], brief: 'Training footage, product demo, athlete endorsement. Dark, energetic.' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Performance USPs', tileTypes: ['image','image','image'], brief: '[CREATIVE] bold stat/metric tile (e.g. "30g Protein"), white on dark, accent highlight' },
      { layout: '1-1', purpose: 'Athlete / social proof', tileTypes: ['image','image'], brief: '[LIFESTYLE] athlete using product + [CREATIVE] testimonial quote card on dark bg' },
      { layout: '1', purpose: 'Brand mission', tileTypes: ['image'], brief: '[CREATIVE] bold mission statement typography on dark bg, angular motif' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[PRODUCT] product range lineup on dark bg, dramatic lighting, category name' },
      { layout: '1-1', purpose: 'Product + benefits', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product dramatic packshot + [CREATIVE] benefit infographic on dark bg' },
      { layout: '1-1-1', purpose: 'Flavor/variant showcase', tileTypes: ['shoppable_image','shoppable_image','shoppable_image'], brief: '[SHOPPABLE] flavor variant packshot on dark bg, flavor-colored accent' },
      { layout: '1', purpose: 'Performance training video', tileTypes: ['video'], brief: 'High-energy training video: athlete using product, fast cuts, dramatic lighting' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'lg-4grid', purpose: 'Feature deep-dive', tileTypes: ['image','image','image','image','image'], brief: '[PRODUCT] large beauty shot + [CREATIVE] 4 detail tiles (nutrition, ingredients, usage, lab-test)' },
    ],
  },
  {
    id: 'clean-minimal',
    name: 'Clean & Minimal',
    description: 'White space dominant, product-focused flat-lays, minimal text. Perfect for fashion basics, everyday products, simple consumer goods.',
    inspiration: 'SNOCKS, Apple, Muji',
    style: 'clean/minimal',
    visualDNA: {
      colors: {
        primary: '#FFFFFF',       // White
        secondary: '#0F172A',     // Near-black text
        accent: '#E2E8F0',       // Light gray
        backgrounds: ['white', 'light-gray', 'occasional-lifestyle'],
        sectionAlternation: 'white-hero → white-grid → light-lifestyle → white-grid → white-footer',
      },
      textStyle: {
        ratio: 0.15,              // Very minimal text
        headlines: 'clean-medium-weight-sans-serif',
        overlayStyle: 'black-on-white or white-on-lifestyle',
        ctaStyle: 'subtle-underlined-text',
      },
      productDisplay: {
        primary: 'flat-lay-white-bg',     // Products arranged on white surface
        secondary: 'minimal-lifestyle',    // Simple, everyday use scenes
        grid: 'packshot-white-bg',
        photography: 'bright, airy, lots of white space, product-centered, soft shadows',
      },
      sectionVariety: {
        floatingWhiteBg: true,     // Dominant style
        videoPresence: false,
        shoppableImages: true,
        trustElements: false,
        brandStory: true,          // Short, minimal brand statement
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[PRODUCT] clean product arrangement on white, minimal headline, soft shadow' },
      { layout: '1-1', purpose: 'Category navigation', tileTypes: ['image','image'], brief: '[PRODUCT] product flat-lay on white, clean category name, lots of whitespace' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] hero product on white, soft shadow + [CREATIVE] minimal benefit icons on white' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Lifestyle', tileTypes: ['image','shoppable_image'], brief: '[LIFESTYLE] minimal, person using product, neutral tones + [SHOPPABLE] packshot on white' },
      { layout: '1-1-1', purpose: 'USPs', tileTypes: ['image','image','image'], brief: '[CREATIVE] minimal icon + one USP word on white, lots of negative space' },
      { layout: '1', purpose: 'Brand statement', tileTypes: ['image'], brief: '[CREATIVE] large typography brand statement on white, one sentence, minimal' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[PRODUCT] category products flat-lay on white, clean category name' },
      { layout: '1-1', purpose: 'Product detail', tileTypes: ['image','shoppable_image'], brief: '[PRODUCT] material/quality close-up + [SHOPPABLE] product on white' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1-1', purpose: 'Quality details', tileTypes: ['image','image','image'], brief: '[PRODUCT] material close-up, sizing visual, care instruction on white' },
    ],
  },
  {
    id: 'natural-organic',
    name: 'Natural / Organic',
    description: 'Earthy tones, nature imagery, ingredient-focused. Trust and certification heavy. Perfect for supplements, organic food, natural cosmetics.',
    inspiration: 'Hansegrün, Nucao, natural brands',
    style: 'natural/organic',
    visualDNA: {
      colors: {
        primary: '#2D5016',       // Deep forest green
        secondary: '#F5F0E8',     // Warm cream/off-white
        accent: '#8B6914',        // Earthy gold
        backgrounds: ['cream', 'forest-green', 'white', 'nature-photo'],
        sectionAlternation: 'green-hero → cream-features → white-grid → nature-lifestyle → cream-trust → white-grid',
      },
      textStyle: {
        ratio: 0.30,              // Moderate text — ingredient info matters
        headlines: 'warm-serif-or-rounded-sans',
        overlayStyle: 'white-on-green or dark-on-cream',
        ctaStyle: 'rounded-button-on-green',
      },
      productDisplay: {
        primary: 'product-with-ingredients',  // Product surrounded by raw ingredients
        secondary: 'nature-lifestyle',         // Products in natural settings
        grid: 'packshot-white-bg',
        photography: 'warm, natural lighting, raw ingredients visible, earthy tones, greenery',
      },
      sectionVariety: {
        floatingWhiteBg: true,
        videoPresence: true,
        shoppableImages: true,
        trustElements: true,       // Bio-certified, lab-tested, vegan, plastic-free
        brandStory: true,          // Founder story, sustainability mission
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[LIFESTYLE] products with natural ingredients (herbs, seeds), warm earthy tones, green accent' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] product + key ingredient on cream bg, warm category name' },
      { layout: '1-1', purpose: 'Ingredient spotlight', tileTypes: ['image','shoppable_image'], brief: '[CREATIVE] ingredient close-up with benefit text on green bg + [SHOPPABLE] product on cream bg' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1-1', purpose: 'Trust badges', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] certification icon on cream bg (Bio, Lab-tested, Vegan, Recyclable)' },
      { layout: '1', purpose: 'Brand origin video', tileTypes: ['video'], brief: 'Authentic brand video: founder story, sourcing, production. Green fields, natural light.' },
      { layout: '1', purpose: 'Brand story', tileTypes: ['image'], brief: '[CREATIVE] founder story on nature background, white text overlay, warm authentic' },
      { layout: '1-1', purpose: 'Lifestyle + social proof', tileTypes: ['image','image'], brief: '[LIFESTYLE] person using product in nature/kitchen + [CREATIVE] review quote or bestseller badge' },
      { layout: '1-1-1', purpose: 'Footer category links', tileTypes: ['image','image','image'], brief: '[PRODUCT] category thumbnail with ingredients-around-product style' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products with raw ingredients, warm natural lighting' },
      { layout: '1-1', purpose: 'Benefit + product', tileTypes: ['image','shoppable_image'], brief: '[CREATIVE] ingredient benefit infographic on green bg + [SHOPPABLE] product on cream bg' },
      { layout: '1-1-1', purpose: 'Key features', tileTypes: ['image','image','image'], brief: '[PRODUCT] ingredient close-up with benefit text, cream bg, green accent' },
      { layout: '1', purpose: 'Ingredient journey video', tileTypes: ['video'], brief: 'Nature-inspired video: ingredients to product journey. Fields, harvesting, production. Warm authentic.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1', purpose: 'Trust + origin', tileTypes: ['image','image'], brief: '[CREATIVE] sourcing/origin story + certification badges' },
    ],
  },
  {
    id: 'colorful-playful',
    name: 'Colorful / Playful',
    description: 'Vibrant, energetic, Gen-Z appeal. Bold colors, variant showcases. Perfect for drinks, candy, kids products, lifestyle accessories.',
    inspiration: 'air up, Holy Energy, Affenzahn',
    style: 'playful/colorful',
    visualDNA: {
      colors: {
        primary: 'multi-color',   // Varies by product/flavor
        secondary: '#FFFFFF',
        accent: 'product-specific',
        backgrounds: ['white', 'vibrant-color-blocks', 'gradient'],
        sectionAlternation: 'colorful-hero → white-grid → color-block → white-grid → colorful-footer',
      },
      textStyle: {
        ratio: 0.25,
        headlines: 'bold-rounded-playful-sans',
        overlayStyle: 'white-on-color or dark-on-white',
        ctaStyle: 'fun-bold-button',
      },
      productDisplay: {
        primary: 'product-on-matching-color',  // Product on its flavor/variant color
        secondary: 'fun-lifestyle',             // Young people using product, energetic
        grid: 'packshot-white-bg',
        photography: 'bright, saturated, energetic, props and color-coded backgrounds',
      },
      sectionVariety: {
        floatingWhiteBg: true,
        videoPresence: true,       // Energetic brand videos
        shoppableImages: true,
        trustElements: false,
        brandStory: true,          // Community/generation focused
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: '[LIFESTYLE] vibrant products on gradient/multi-color bg, bold playful headline, fun props' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] product on signature color bg with fun props, bold playful category name' },
      { layout: '1-1', purpose: 'Hero product + lifestyle', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product on bold color bg + [LIFESTYLE] young person using product, vibrant' },
      { layout: 'lg-4grid', purpose: 'Variant showcase', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: '[LIFESTYLE] large group shot + [SHOPPABLE] 4 variants on flavor colors' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Social proof / community', tileTypes: ['image','image'], brief: '[LIFESTYLE] UGC/influencer shot + [CREATIVE] community stat on brand color' },
      { layout: '1', purpose: 'Video', tileTypes: ['video'], brief: 'Energetic brand video: product in action, lifestyle montage, music-driven' },
      { layout: '1-1-1-1', purpose: 'Footer nav', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category icon on matching color, playful thumbnail' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products on vibrant gradient, fun bold category name' },
      { layout: '1-1-1', purpose: 'Top picks', tileTypes: ['shoppable_image','shoppable_image','shoppable_image'], brief: '[SHOPPABLE] hero product on flavor/variant color bg, bold product name' },
      { layout: '1', purpose: 'Energetic brand video', tileTypes: ['video'], brief: 'Vibrant fast-paced video: young people enjoying product, bright colors, energetic' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'lg-4grid', purpose: 'Flavor exploration', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: '[LIFESTYLE] large action shot + [SHOPPABLE] 4 variants on color backgrounds' },
      { layout: '1-1', purpose: 'Fun fact + cross-sell', tileTypes: ['image','image'], brief: '[CREATIVE] fun product fact on bold color bg + category link with playful visual' },
    ],
  },
];

// Legacy reference (kept for backward compat)
export var REFERENCE_STORES = STORE_TEMPLATES.map(function(t) {
  return { brand: t.inspiration, style: t.style, complexity: 'medium', keyPattern: t.description };
});

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
  visualHarmony: [
    'SECTION RHYTHM: Alternate between wide (full-width) and multi-column layouts. Never 3+ consecutive same-width sections.',
    'TILE PAIRING: In 2-column layouts, tiles relate to each other: (product name tile + product packshot), (lifestyle + shoppable product), (feature text + close-up photo).',
    'BACKGROUND ALTERNATION: Sections alternate between light and dark backgrounds. The pattern follows the template visual DNA.',
    'PRODUCT GRID SPACING: Never place two product_grid sections adjacent. Always insert lifestyle/feature imagery between grids.',
    'VISUAL BREATHING: After information-dense sections (feature grids, specs), follow with a visually simple section (full-width lifestyle, video).',
    'COLOR BLOCKING: In multi-tile sections, one tile can be a bold brand-color text tile paired with a clean product photo.',
    'SHOPPABLE PAIRS: Every shoppable_image should be paired with a context tile (lifestyle, name, or feature) in the same section.',
    'VIDEO PLACEMENT: Videos work best after product introduction sections, providing depth/demonstration after the viewer has seen the product.',
  ],
};

// ─── HELPER: Count images and videos in a store ───
export function countStoreAssets(store) {
  var images = 0;
  var videos = 0;
  var hasHeader = store.headerBanner || store.headerBannerMobile ? 1 : 0;
  // Header banner counts as 1 image (desktop+mobile = 1 asset)
  images += hasHeader ? 0 : 1; // always need header designed

  (store.pages || []).forEach(function(pg) {
    (pg.sections || []).forEach(function(sec) {
      (sec.tiles || []).forEach(function(tile) {
        if (tile.type === 'video') {
          videos++;
        } else if (PRODUCT_TILE_TYPES.indexOf(tile.type) < 0 && tile.type !== 'text') {
          // image, shoppable_image, image_text all need design
          images++;
        }
      });
    });
  });

  return { images: images, videos: videos };
}

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
