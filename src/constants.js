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

// ─── STORE TEMPLATES (selectable layout blueprints) ───
// Each template defines the PATTERN of a real top-performing Amazon Brand Store.
// The AI adapts the pattern to the user's brand, products, and categories.
export var STORE_TEMPLATES = [
  {
    id: 'premium-lifestyle',
    name: 'Premium Lifestyle',
    description: 'Elegant, image-heavy. Dark tones with accent colors. Perfect for premium brands, cosmetics, fashion.',
    inspiration: 'Nespresso, Bears with Benefits',
    style: 'lifestyle/premium',
    thumbnail: 'dark-elegant',
    homepage: [
      { layout: '1', purpose: 'Hero banner', tiles: ['image: Full-width brand hero, dark/moody lifestyle shot, product artfully placed, brand slogan overlay'] },
      { layout: '1-1', purpose: 'Brand promise', tiles: ['image: Lifestyle close-up of product in use, warm lighting', 'image: Brand USP statement designed into elegant typography on brand-colored background'] },
      { layout: '1-1-1', purpose: 'Category navigation', tiles: ['image: Category 1 lifestyle + name overlay + CTA', 'image: Category 2 lifestyle + name overlay + CTA', 'image: Category 3 lifestyle + name overlay + CTA'] },
      { layout: 'lg-2stack', purpose: 'Hero product spotlight', tiles: ['shoppable_image: Large bestseller product, editorial-style photo on neutral background', 'image: Product feature highlight with text overlay', 'image: Second feature or ingredient close-up'] },
      { layout: '1', purpose: 'Bestseller product grid', tiles: ['product_grid: Top 6-8 products by rating'] },
      { layout: '1-1', purpose: 'Lifestyle storytelling', tiles: ['image: Model/person using product in aspirational setting', 'shoppable_image: Same product clean packshot, clickable'] },
      { layout: '1-1-1', purpose: 'Trust & USPs', tiles: ['image: USP 1 icon/visual + text overlay', 'image: USP 2 icon/visual + text overlay', 'image: USP 3 icon/visual + text overlay'] },
      { layout: '1', purpose: 'Brand story', tiles: ['image: Full-width brand story banner, founder/team/origin story visual'] },
      { layout: '1-1-1-1', purpose: 'Footer category nav', tiles: ['image: Cat 1 thumbnail + name', 'image: Cat 2 thumbnail + name', 'image: Cat 3 thumbnail + name', 'image: Cat 4 thumbnail + name'] },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tiles: ['image: Full-width category lifestyle, products in context'] },
      { layout: '1-1', purpose: 'Product spotlight', tiles: ['image: Product name + feature text designed into image', 'shoppable_image: Hero product of this category, clean photo'] },
      { layout: '1-1-1', purpose: 'Feature highlights', tiles: ['image: Feature 1 with icon and text overlay', 'image: Feature 2 with icon and text overlay', 'image: Feature 3 with icon and text overlay'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: ALL category ASINs'] },
      { layout: '1-1', purpose: 'Lifestyle', tiles: ['image: Product in real-world use scenario A', 'image: Product in real-world use scenario B'] },
      { layout: '1-1-1', purpose: 'Cross-sell', tiles: ['image: Related category 1 + CTA', 'image: Related category 2 + CTA', 'image: Related category 3 + CTA'] },
    ],
  },
  {
    id: 'technical-professional',
    name: 'Technical / Professional',
    description: 'Feature-rich, detail-focused. Great for electronics, tools, appliances, complex products.',
    inspiration: 'Kärcher, Dyson, Desktronic',
    style: 'professional/technical',
    thumbnail: 'tech-clean',
    homepage: [
      { layout: '1', purpose: 'Hero banner', tiles: ['image: Full-width product hero with brand slogan, clean background, product dominates'] },
      { layout: '1-1-1-1', purpose: 'Category navigation', tiles: ['image: Cat 1 product lineup + name overlay', 'image: Cat 2 product lineup + name overlay', 'image: Cat 3 product lineup + name overlay', 'image: Cat 4 product lineup + name overlay'] },
      { layout: 'lg-4grid', purpose: 'Feature showcase', tiles: ['image: Large hero product in action, dramatic angle', 'image: Feature 1 close-up with annotation', 'image: Feature 2 technical detail', 'image: Feature 3 performance metric visual', 'image: Feature 4 accessory/compatibility'] },
      { layout: '1', purpose: 'Video', tiles: ['video: Product demo or brand video'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: Top 8 products'] },
      { layout: '1-1', purpose: 'Technology highlight', tiles: ['image: Technology diagram/exploded view of product internals', 'image: Performance comparison or specification chart designed as infographic'] },
      { layout: '1-1-1', purpose: 'Trust elements', tiles: ['image: Certification/award badge visual', 'image: Customer satisfaction stat visual', 'image: Warranty/guarantee visual'] },
      { layout: '1', purpose: 'Brand story', tiles: ['image: Full-width innovation/heritage banner'] },
      { layout: '1-1-1', purpose: 'Footer nav', tiles: ['image: Cat 1 quick link', 'image: Cat 2 quick link', 'image: Cat 3 quick link'] },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tiles: ['image: Full-width category product hero shot, dramatic lighting'] },
      { layout: 'lg-2stack', purpose: 'Product + features', tiles: ['shoppable_image: Hero product of category, large, detailed shot', 'image: Key feature 1 close-up with text overlay', 'image: Key feature 2 close-up with text overlay'] },
      { layout: '1-1-1', purpose: 'Tech specs visual', tiles: ['image: Spec 1 visualized (dimensions, power, etc.)', 'image: Spec 2 visualized', 'image: Spec 3 visualized'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: ALL category ASINs'] },
      { layout: '1-1', purpose: 'Comparison/usage', tiles: ['image: Before/after or product comparison visual', 'image: Product in professional use setting'] },
      { layout: '1', purpose: 'Video demo', tiles: ['video: Category product demo'] },
      { layout: '1-1-1-1', purpose: 'Cross-sell', tiles: ['image: Related cat 1', 'image: Related cat 2', 'image: Related cat 3', 'image: Accessories'] },
    ],
  },
  {
    id: 'clean-minimal',
    name: 'Clean & Minimal',
    description: 'White space, product-focused. Perfect for fashion, basics, everyday products.',
    inspiration: 'SNOCKS, Apple',
    style: 'clean/minimal',
    thumbnail: 'clean-white',
    homepage: [
      { layout: '1', purpose: 'Hero banner', tiles: ['image: Clean, minimal hero with product centered on white/light background, bold sans-serif slogan'] },
      { layout: '1-1', purpose: 'Category navigation', tiles: ['image: Category 1 product flat-lay on white + name overlay', 'image: Category 2 product flat-lay on white + name overlay'] },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tiles: ['shoppable_image: Large bestseller product, white background, shadow underneath', 'image: Product benefit 1 with minimal icon and text', 'image: Product benefit 2 with minimal icon and text'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: Top 6 products'] },
      { layout: '1-1', purpose: 'Lifestyle', tiles: ['image: Minimal lifestyle shot, product in everyday use, neutral tones', 'shoppable_image: Same product, clean packshot'] },
      { layout: '1-1-1', purpose: 'USPs', tiles: ['image: USP 1 icon + short text on white', 'image: USP 2 icon + short text on white', 'image: USP 3 icon + short text on white'] },
      { layout: '1', purpose: 'Brand statement', tiles: ['image: Full-width minimal brand statement, large typography on neutral background'] },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tiles: ['image: Category products arranged in grid/flat-lay on white, category name overlay'] },
      { layout: '1-1', purpose: 'Product feature', tiles: ['image: Product detail close-up, minimal styling', 'shoppable_image: Product packshot on white'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: ALL category ASINs'] },
      { layout: '1-1-1', purpose: 'Material/quality', tiles: ['image: Material close-up', 'image: Quality detail', 'image: Sizing/fit visual'] },
      { layout: '1-1', purpose: 'Cross-sell', tiles: ['image: Related category 1 link', 'image: Related category 2 link'] },
    ],
  },
  {
    id: 'colorful-playful',
    name: 'Colorful & Playful',
    description: 'Vibrant colors, fun layouts. Great for kids, pets, food, creative brands.',
    inspiration: 'Affenzahn, air up',
    style: 'playful/colorful',
    thumbnail: 'colorful-fun',
    homepage: [
      { layout: '1', purpose: 'Hero banner', tiles: ['image: Vibrant, colorful hero with products, playful typography, bright brand colors'] },
      { layout: '1-1-1', purpose: 'Category navigation', tiles: ['image: Cat 1 with playful illustration/mascot + name', 'image: Cat 2 with playful illustration/mascot + name', 'image: Cat 3 with playful illustration/mascot + name'] },
      { layout: '1-1', purpose: 'Feature spotlight', tiles: ['image: Fun product action shot with expressive background colors', 'shoppable_image: Product with colorful props/staging'] },
      { layout: 'lg-6grid', purpose: 'Product showcase', tiles: ['image: Large lifestyle with product and people/kids/pets', 'shoppable_image: Product 1', 'shoppable_image: Product 2', 'shoppable_image: Product 3', 'image: Fun fact or USP visual', 'shoppable_image: Product 4', 'shoppable_image: Product 5'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: Top 8 products'] },
      { layout: '1-1', purpose: 'Social proof', tiles: ['image: Customer testimonial designed as colorful quote card', 'image: User-generated content or rating highlights visual'] },
      { layout: '1-1-1-1', purpose: 'Footer nav', tiles: ['image: Cat 1 icon', 'image: Cat 2 icon', 'image: Cat 3 icon', 'image: All products icon'] },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tiles: ['image: Colorful category hero with products and playful elements'] },
      { layout: '1-1-1', purpose: 'Product highlights', tiles: ['shoppable_image: Product 1 with fun background', 'shoppable_image: Product 2 with fun background', 'shoppable_image: Product 3 with fun background'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: ALL category ASINs'] },
      { layout: 'lg-2stack', purpose: 'Feature + fun facts', tiles: ['image: Large playful lifestyle shot', 'image: Fun fact about the products', 'image: Usage tip with playful illustration'] },
      { layout: '1-1', purpose: 'Cross-sell', tiles: ['image: Related category with fun visual', 'image: Another category with fun visual'] },
    ],
  },
  {
    id: 'sporty-bold',
    name: 'Sporty & Bold',
    description: 'Dynamic, high-contrast. Perfect for fitness, sports nutrition, outdoor, athletic brands.',
    inspiration: 'ESN, Nike, Under Armour',
    style: 'sporty/bold',
    thumbnail: 'sporty-dark',
    homepage: [
      { layout: '1', purpose: 'Hero banner', tiles: ['image: High-energy hero, athlete/model using product, dark background with bold accent color, powerful slogan'] },
      { layout: '1-1', purpose: 'Category navigation', tiles: ['image: Category 1 with dynamic sports photo + bold name overlay', 'image: Category 2 with dynamic sports photo + bold name overlay'] },
      { layout: 'lg-2stack', purpose: 'Product hero', tiles: ['shoppable_image: Hero product dramatic shot, dark moody lighting', 'image: Key ingredient/feature callout, bold typography', 'image: Performance stat or result visual'] },
      { layout: '1', purpose: 'Video', tiles: ['video: Training/workout video featuring product'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: Top 8 bestsellers'] },
      { layout: '1-1-1', purpose: 'Performance USPs', tiles: ['image: Performance benefit 1 with bold number/stat', 'image: Performance benefit 2 with bold number/stat', 'image: Performance benefit 3 with bold number/stat'] },
      { layout: '1-1', purpose: 'Athlete/social proof', tiles: ['image: Athlete endorsement or action shot', 'image: Community/results showcase'] },
      { layout: '1', purpose: 'Brand mission', tiles: ['image: Full-width brand mission statement, bold typography on dark background'] },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tiles: ['image: Dynamic category hero, product in action/sport context'] },
      { layout: '1-1', purpose: 'Product spotlight', tiles: ['shoppable_image: Category hero product, dramatic lighting', 'image: Key benefits/ingredients designed as bold infographic'] },
      { layout: '1-1-1', purpose: 'Flavor/variant showcase', tiles: ['shoppable_image: Variant 1', 'shoppable_image: Variant 2', 'shoppable_image: Variant 3'] },
      { layout: '1', purpose: 'Product grid', tiles: ['product_grid: ALL category ASINs'] },
      { layout: 'lg-4grid', purpose: 'Feature deep-dive', tiles: ['image: Large product beauty shot', 'image: Feature 1 detail', 'image: Feature 2 detail', 'image: Usage instruction', 'image: Result/transformation'] },
      { layout: '1-1', purpose: 'Cross-sell', tiles: ['image: Related category with sport visual', 'image: Accessories/complementary products'] },
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
