// ─── LAYOUTS (Desktop + Mobile) ───
// Based on all available Amazon Brand Store section types
export var LAYOUTS = [
  // Basic
  { id: '1', name: 'Full Width', cols: '1fr', cells: 1, mobileCols: '1fr' },
  { id: '1-1', name: '2 Equal', cols: '1fr 1fr', cells: 2, mobileCols: '1fr' },
  { id: '1-1-1', name: '3 Equal', cols: '1fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-1-1', name: '4 Equal', cols: 'repeat(4,1fr)', cells: 4, mobileCols: '1fr 1fr' },
  // Asymmetric 2-col
  { id: '2-1', name: 'Large + Small', cols: '2fr 1fr', cells: 2, mobileCols: '1fr' },
  { id: '1-2', name: 'Small + Large', cols: '1fr 2fr', cells: 2, mobileCols: '1fr' },
  // Asymmetric 3-col
  { id: '2-1-1', name: 'Large + 2 Small', cols: '2fr 1fr 1fr', cells: 3, mobileCols: '1fr' },
  { id: '1-1-2', name: '2 Small + Large', cols: '1fr 1fr 2fr', cells: 3, mobileCols: '1fr' },
  // Stacked: Large + 2 stacked
  { id: 'lg-2stack', name: 'Large Left + 2 Stacked Right', cols: '2fr 1fr', cells: 3, grid: 'lg-2stack', mobileCols: '1fr' },
  { id: '2stack-lg', name: '2 Stacked Left + Large Right', cols: '1fr 2fr', cells: 3, grid: '2stack-lg', mobileCols: '1fr' },
  // Large + 2x2 Grid (5 tiles)
  { id: 'lg-4grid', name: 'Large Left + 2x2 Grid Right', cols: '2fr 1fr 1fr', cells: 5, grid: 'lg-4grid', mobileCols: '1fr 1fr' },
  { id: '4grid-lg', name: '2x2 Grid Left + Large Right', cols: '1fr 1fr 2fr', cells: 5, grid: '4grid-lg', mobileCols: '1fr 1fr' },
  // Large + 2x3 Grid (7 tiles)
  { id: 'lg-6grid', name: 'Large Left + 2x3 Grid Right', cols: '2fr 1fr 1fr', cells: 7, grid: 'lg-6grid', mobileCols: '1fr 1fr' },
  { id: '6grid-lg', name: '2x3 Grid Left + Large Right', cols: '1fr 1fr 2fr', cells: 7, grid: '6grid-lg', mobileCols: '1fr 1fr' },
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
    largeAnd6grid: { description: 'Main category large + 6 subcategories in 2x3 grid', layout: 'lg-6grid' },
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
    bundleShowcase: { description: 'Bundle displayed as large image + small component products', layout: 'lg-2stack',
      example: 'Left: bundle shoppable_image. Right: individual products as smaller shoppable tiles.' },
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
    featureWith6Grid: { description: 'Large product left + 6 feature tiles in 2x3 grid right', layout: 'lg-6grid',
      example: 'Left: product/lifestyle. Right: 6 tiles for ingredients, benefits, certifications etc.' },
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
    variantLargeAnd6: { description: 'Product hero left + 6 variants in 2x3 right', layout: 'lg-6grid' },
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
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width lifestyle hero: person using [product] outdoors. Brand color accent bar at bottom. Bold headline overlay with brand tagline. Background: lifestyle photo with brand-color elements.' },
      { layout: '1-1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image','image'], brief: 'Each tile: category lifestyle photo showing product in use. Category name as large white text overlay. Semi-transparent dark overlay for text readability. Each links to category subpage.' },
      { layout: 'lg-4grid', purpose: 'Hero product spotlight', tileTypes: ['shoppable_image','image','image','image','image'], brief: 'Large left: flagship product floating on brand-color background, dramatic frontal angle. Grid: 4 feature close-ups with short text overlay each (e.g., "600+ Patents", "Since 1935").' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Brand heritage / technology', tileTypes: ['image','image'], brief: 'Left: historical/heritage brand image or innovation showcase. Right: technology diagram or infographic showing product internals. Dark background, white text.' },
      { layout: '1', purpose: 'Product grid by category', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Trust / certification elements', tileTypes: ['image','image','image'], brief: 'Three trust badges: certification, award, sustainability. Each on white background with icon and short text overlay. Clean, minimal.' },
      { layout: '1', purpose: 'Deals / promo banner', tileTypes: ['image'], brief: 'Full-width promotional banner on brand-color background. Bold savings messaging. CTA button designed into image.' },
      { layout: '1-1-1-1', purpose: 'Footer category navigation', tileTypes: ['image','image','image','image'], brief: 'Repeat category tiles for bottom-of-page navigation. Smaller, thumbnail-style with category names.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Full-width lifestyle: person using [category product] in realistic setting (garden, kitchen, etc.). Category name as large overlay.' },
      { layout: 'lg-2stack', purpose: 'Product + features', tileTypes: ['shoppable_image','image','image'], brief: 'Large: hero product of category, floating on white/brand-color. Right stack: two feature close-ups with text overlay explaining key specs.' },
      { layout: '1-1-1', purpose: 'Technical specs visual', tileTypes: ['image','image','image'], brief: 'Three spec/feature tiles: each shows a product detail close-up with specification number/text overlay (e.g., "180 bar", "500 l/h", "3-in-1 nozzle").' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1', purpose: 'Comparison / usage scenarios', tileTypes: ['image','image'], brief: 'Left: before/after or product comparison chart designed as image. Right: product in professional use setting.' },
      { layout: '1-1-1', purpose: 'Accessories cross-sell', tileTypes: ['image','image','image'], brief: 'Three accessory/addon tiles linking to accessories subpage. Each shows accessory product with name overlay.' },
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
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width premium lifestyle: product in elegant setting (marble counter, modern kitchen). Dark, moody, warm lighting. Minimal text — just brand name or short tagline in elegant white type.' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: 'Three category tiles: each a lifestyle photo with the product category artfully displayed. Category name in clean white sans-serif on dark-toned image. Subtle CTA ("Entdecken").' },
      { layout: '1', purpose: 'Shoppable lifestyle', tileTypes: ['shoppable_image'], brief: 'Full-width shoppable lifestyle image: premium setting with multiple products visible, each tagged with clickable hotspots. Warm lighting, dark background, products as heroes.' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Brand story / sustainability', tileTypes: ['image','image'], brief: 'Left: brand origin/heritage image (founder, production, ingredients). Right: sustainability messaging (recycling, certifications, eco-values). Dark backgrounds, gold accent text.' },
      { layout: '1', purpose: 'Product grid secondary', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Trust / values', tileTypes: ['image','image','image'], brief: 'Three value pillars: each an icon or lifestyle close-up with one-word value overlay (Quality, Sustainability, Craft). Dark bg, gold text.' },
      { layout: '1', purpose: 'Footer promo', tileTypes: ['image'], brief: 'Full-width brand statement or seasonal campaign. Dark, elegant, minimal text.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Full-width: products from this category arranged in premium setting. Dark, moody. Category name in elegant typography.' },
      { layout: '1-1', purpose: 'Product spotlight', tileTypes: ['shoppable_image','image'], brief: 'Left: shoppable image of hero product (editorial photo, warm lighting). Right: ingredients/feature close-up or product detail.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1-1', purpose: 'Variant showcase', tileTypes: ['image','image','image'], brief: 'Three variant/flavor tiles: each showing a different variant with color-coded accent and name overlay.' },
      { layout: '1-1', purpose: 'Lifestyle storytelling', tileTypes: ['image','image'], brief: 'Two complementary lifestyle scenes: product in different usage contexts. Aspirational, warm, premium feel.' },
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
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width: athlete/fitness model with product, black background, dramatic lighting. Bold angular slash motif. Brand tagline in heavy white uppercase. High energy, performance feel.' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: 'Three category tiles: each with product packshot on black, flavor-colored accent stripe. Category name in bold white uppercase. Angular crop/frame.' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: 'Large: hero product (flagship protein/supplement) dramatic packshot on dark bg. Right stack: key ingredient/benefit tile + flavor photography tile. Bold, high-contrast.' },
      { layout: '1', purpose: 'Video section', tileTypes: ['video'], brief: 'Brand or product video: training footage, product demo, athlete endorsement. Dark, energetic.' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1', purpose: 'Performance USPs', tileTypes: ['image','image','image'], brief: 'Three bold stat tiles: each with large number/metric (e.g., "30g Protein", "Lab Tested", "Zero Sugar"). White text on black, accent color highlight.' },
      { layout: '1-1', purpose: 'Athlete / social proof', tileTypes: ['image','image'], brief: 'Left: athlete using product, motivational. Right: community results or testimonial designed as bold quote card. Black bg.' },
      { layout: '1', purpose: 'Brand mission', tileTypes: ['image'], brief: 'Full-width mission statement: bold typography on black. Angular slash motif. "For the Win" style messaging.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Full-width: product range lineup on black, dramatic lighting. Category name in heavy uppercase white.' },
      { layout: '1-1', purpose: 'Product + benefits', tileTypes: ['shoppable_image','image'], brief: 'Left: hero product shoppable image, dramatic packshot. Right: ingredient/benefit infographic on dark bg.' },
      { layout: '1-1-1', purpose: 'Flavor/variant showcase', tileTypes: ['shoppable_image','shoppable_image','shoppable_image'], brief: 'Three flavor variants: each packshot on dark bg with flavor-colored accent. Shoppable, clickable.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'lg-4grid', purpose: 'Feature deep-dive', tileTypes: ['image','image','image','image','image'], brief: 'Large: product beauty shot. Grid: 4 detail tiles — nutrition facts, ingredients, usage instruction, lab-test badge. Black bg, white text.' },
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
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width: clean product arrangement on white/light background. Minimal bold headline. Product is the star — no distracting elements. Soft shadow underneath.' },
      { layout: '1-1', purpose: 'Category navigation', tileTypes: ['image','image'], brief: 'Two category tiles: each a product flat-lay or lifestyle on white/light bg. Category name in clean dark sans-serif. Lots of white space around text.' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: 'Large: hero product floating on white, soft shadow. Right stack: two benefit tiles with minimal icon + short text on white bg.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Lifestyle', tileTypes: ['image','shoppable_image'], brief: 'Left: minimal lifestyle, person wearing/using product, neutral tones. Right: same product clean packshot on white, shoppable.' },
      { layout: '1-1-1', purpose: 'USPs', tileTypes: ['image','image','image'], brief: 'Three tiles: each with minimal icon + one USP word on white (Quality, Comfort, Value). Super clean, lots of negative space.' },
      { layout: '1', purpose: 'Brand statement', tileTypes: ['image'], brief: 'Full-width: large typography brand statement on white. One sentence. Minimal.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Products from category arranged as flat-lay on white. Category name in clean type.' },
      { layout: '1-1', purpose: 'Product detail', tileTypes: ['image','shoppable_image'], brief: 'Left: material/quality close-up, minimal styling. Right: product on white, shoppable.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1-1', purpose: 'Quality details', tileTypes: ['image','image','image'], brief: 'Three tiles: material close-up, sizing visual, care instruction. All on white, minimal text.' },
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
        videoPresence: false,
        shoppableImages: true,
        trustElements: true,       // Bio-certified, lab-tested, vegan, plastic-free
        brandStory: true,          // Founder story, sustainability mission
      },
    },
    homepage: [
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width: product range with raw natural ingredients scattered around (herbs, seeds, leaves). Warm earthy tones. Brand name in warm serif or rounded sans-serif. Forest green accent.' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: 'Three tiles: each with product + key ingredient on cream background. Category name in warm type. Earthy, natural styling. Subtle green accent.' },
      { layout: '1-1', purpose: 'Ingredient spotlight', tileTypes: ['image','shoppable_image'], brief: 'Left: close-up of key ingredient (turmeric, ashwagandha, etc.) with benefit text overlay on green bg. Right: product containing that ingredient, shoppable, on cream bg.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1-1-1', purpose: 'Trust badges', tileTypes: ['image','image','image','image'], brief: 'Four certification tiles on cream bg: Bio-certified, Lab-tested, Vegan, Recyclable. Each with icon and short label. Clean, trustworthy.' },
      { layout: '1', purpose: 'Brand story', tileTypes: ['image'], brief: 'Full-width: founder story or sustainability mission. Nature background (forest, field, garden). White text overlay with brand values. Warm, authentic.' },
      { layout: '1-1', purpose: 'Lifestyle + social proof', tileTypes: ['image','image'], brief: 'Left: person in nature or kitchen using product, warm tones. Right: customer review quote or "Bestseller" badge designed as image with star rating.' },
      { layout: '1-1-1', purpose: 'Footer category links', tileTypes: ['image','image','image'], brief: 'Three category thumbnails with ingredients-around-product style. Links to subpages.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Full-width: category products with relevant raw ingredients. Warm natural lighting. Category name in warm type on nature/cream bg.' },
      { layout: '1-1', purpose: 'Benefit + product', tileTypes: ['image','shoppable_image'], brief: 'Left: ingredient/benefit infographic on green bg (what it does, how it works). Right: product shoppable image on cream bg.' },
      { layout: '1-1-1', purpose: 'Key features', tileTypes: ['image','image','image'], brief: 'Three benefit tiles: each with ingredient close-up and short benefit text. Cream bg, green accent text.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: '1-1', purpose: 'Trust + origin', tileTypes: ['image','image'], brief: 'Left: sourcing/origin story (where ingredients come from). Right: certification badges for this product line.' },
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
      { layout: '1', purpose: 'Hero banner', tileTypes: ['image'], brief: 'Full-width: vibrant, colorful hero with product range displayed on gradient or multi-color background. Bold playful headline. Energetic, young, fun. Props that match brand world.' },
      { layout: '1-1-1', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: 'Three tiles: each category on its signature color background. Product floating with fun props. Bold playful category name. Each links to subpage.' },
      { layout: '1-1', purpose: 'Hero product + lifestyle', tileTypes: ['shoppable_image','image'], brief: 'Left: hero product on bold color bg, shoppable. Right: young person using product, energetic lifestyle, vibrant colors.' },
      { layout: 'lg-6grid', purpose: 'Variant showcase', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: 'Large left: lifestyle/group shot. Grid: 6 product variants, each on its flavor color. Shoppable. Creates a rainbow/palette effect.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '1-1', purpose: 'Social proof / community', tileTypes: ['image','image'], brief: 'Left: user-generated content collage or influencer shot. Right: community stat or testimonial on brand color.' },
      { layout: '1', purpose: 'Video', tileTypes: ['video'], brief: 'Energetic brand video: product in action, lifestyle montage, music-driven.' },
      { layout: '1-1-1-1', purpose: 'Footer nav', tileTypes: ['image','image','image','image'], brief: 'Four category tiles with product icons on matching colors. Playful, small.' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: 'Full-width: category products on vibrant color gradient. Fun, energetic. Category name in bold playful type.' },
      { layout: '1-1-1', purpose: 'Top picks', tileTypes: ['shoppable_image','shoppable_image','shoppable_image'], brief: 'Three hero products from category, each on its flavor/variant color. Shoppable. Bold product names.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'lg-4grid', purpose: 'Flavor exploration', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: 'Large: lifestyle action shot. Grid: 4 variants on color backgrounds. Shoppable. Creates discovery moment.' },
      { layout: '1-1', purpose: 'Fun fact + cross-sell', tileTypes: ['image','image'], brief: 'Left: fun ingredient/product fact on bold color bg. Right: related category link with playful visual.' },
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
