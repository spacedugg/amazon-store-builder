// ─── LAYOUTS (Desktop + Mobile) ───
// Amazon Brand Store: Desktop always 4-column grid. NO vertical images on desktop.
//
// CATEGORIES:
//   Full Width: single-image section (not Standard or VH)
//   Standard: 2-row layouts (4 cols × 2 rows). Tiles can span cols+rows.
//   VH (Variable Height): 1-row layouts (4 cols × 1 row). Single row, tiles horizontal.
//
// Desktop image types:
//   Full Width (FW): min 3000px wide, 16–2400px high
//   Large Square (LS): 1500×1500 (2 cols × 2 rows, Standard only)
//   Wide (W): 1500×700 (2 cols × 1 row)
//   Small Square (SS): 750×750 (1 col × 1 row)
//
// Mobile:
//   Standard: default = desktop dims, height variable
//   VH: fixed min 1500×750
//
// IMPORTANT: VH desktop ↔ VH mobile ONLY. Standard desktop ↔ Standard mobile ONLY.

export var LAYOUTS = [
  // ─── Full Width (single-image section) ───
  { id: '1', name: 'Full Width', type: 'fullwidth', cols: '1fr', cells: 1, mobileCols: '1fr' },

  // ─── Standard Layouts (Desktop: 4 cols × 2 rows) ───
  // Mobile: LS/W tiles span full width, SS tiles pair side-by-side
  { id: 'std-2equal', name: '2 Equal', type: 'standard', cells: 2, grid: 'std-2equal', mobileCols: '1fr' },
  { id: 'lg-2stack', name: 'Large + 2 Stacked', type: 'standard', cells: 3, grid: 'lg-2stack', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '2stack-lg', name: '2 Stacked + Large', type: 'standard', cells: 3, grid: '2stack-lg', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: 'lg-w2s', name: 'Large + Wide & 2 Small', type: 'standard', cells: 4, grid: 'lg-w2s', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: 'w2s-lg', name: 'Wide & 2 Small + Large', type: 'standard', cells: 4, grid: 'w2s-lg', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '2x2wide', name: '4 Equal (2×2 Wide)', type: 'standard', cells: 4, grid: '2x2wide', mobileCols: '1fr' },
  { id: 'lg-4grid', name: 'Large + 2×2 Grid', type: 'standard', cells: 5, grid: 'lg-4grid', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '4grid-lg', name: '2×2 Grid + Large', type: 'standard', cells: 5, grid: '4grid-lg', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '2s-4grid', name: '2 Stacked + 2×2 Grid', type: 'standard', cells: 6, grid: '2s-4grid', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '4grid-2s', name: '2×2 Grid + 2 Stacked', type: 'standard', cells: 6, grid: '4grid-2s', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: '4x2grid', name: '4×2 Grid', type: 'standard', cells: 8, grid: '4x2grid', mobileCols: '1fr 1fr' },

  // ─── Variable Height Layouts (Desktop: 4 cols × 1 row) ───
  // Mobile: W tiles span full width, SS tiles pair side-by-side
  { id: 'vh-2equal', name: '2 Equal (VH)', type: 'vh', cells: 2, grid: 'vh-2equal', mobileCols: '1fr' },
  { id: 'vh-w2s', name: 'Wide + 2 Squares (VH)', type: 'vh', cells: 3, grid: 'vh-w2s', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
  { id: 'vh-2sw', name: '2 Squares + Wide (VH)', type: 'vh', cells: 3, grid: 'vh-2sw', mobileCols: '1fr 1fr', mobileGrid: 'std-auto' },
];

// ─── LEGACY LAYOUT ID MAPPING ───
// Maps removed/renamed layout IDs to their closest valid replacement
export var LEGACY_LAYOUT_MAP = {
  '1-1': 'std-2equal',
  '1-1-1': 'vh-w2s',
  '1-1-1-1': '2x2wide',
  '2-1': 'lg-2stack',
  '1-2': '2stack-lg',
  '2-1-1': 'lg-2stack',
  '1-1-2': '2stack-lg',
  'w2s-4grid': '2s-4grid',
  '4grid-w2s': '4grid-2s',
};

// Resolve a layout ID (handles legacy IDs)
export function resolveLayoutId(id) {
  if (LAYOUTS.find(function(l) { return l.id === id; })) return id;
  return LEGACY_LAYOUT_MAP[id] || 'std-2equal';
}

// Find layout by ID (with legacy fallback)
export function findLayout(id) {
  var layout = LAYOUTS.find(function(l) { return l.id === id; });
  if (layout) return layout;
  var resolved = LEGACY_LAYOUT_MAP[id];
  if (resolved) return LAYOUTS.find(function(l) { return l.id === resolved; });
  return LAYOUTS[0];
}

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
// Desktop formats based on 4-column grid. No vertical images on desktop.
// Standard mobile: default = desktop dims (height variable)
// VH mobile: fixed min 1500×750
export var AMAZON_IMG_TYPES = {
  LARGE_SQUARE: { w: 1500, h: 1500, label: 'Large Square' },
  SMALL_SQUARE: { w: 750, h: 750, label: 'Small Square' },
  WIDE: { w: 1500, h: 700, label: 'Wide' },
  FULL_WIDTH: { w: 3000, h: 600, label: 'Full Width' },
};

// ─── PER-LAYOUT TILE DIMENSIONS (Desktop) ───
// Maps layout id → array of desktop dimension objects per tile index
// Tile order = visual reading order (desktop: left→right, top→bottom)
var I = AMAZON_IMG_TYPES;
export var LAYOUT_TILE_DIMS = {
  // Full Width
  '1':          [I.FULL_WIDTH],
  // Standard layouts (2-row)
  'std-2equal': [I.LARGE_SQUARE, I.LARGE_SQUARE],
  'lg-2stack':  [I.LARGE_SQUARE, I.WIDE, I.WIDE],
  '2stack-lg':  [I.WIDE, I.WIDE, I.LARGE_SQUARE],
  'lg-w2s':     [I.LARGE_SQUARE, I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  'w2s-lg':     [I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  '2x2wide':    [I.WIDE, I.WIDE, I.WIDE, I.WIDE],
  'lg-4grid':   [I.LARGE_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-lg':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.LARGE_SQUARE],
  '2s-4grid':   [I.WIDE, I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  '4grid-2s':   [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.WIDE, I.WIDE],
  '4x2grid':    [I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  // VH layouts (1-row)
  'vh-2equal':  [I.WIDE, I.WIDE],
  'vh-w2s':     [I.WIDE, I.SMALL_SQUARE, I.SMALL_SQUARE],
  'vh-2sw':     [I.SMALL_SQUARE, I.SMALL_SQUARE, I.WIDE],
};

// Helper: create empty tile with correct dimensions for a specific layout position
export function emptyTileForLayout(layoutId, tileIndex) {
  var resolved = resolveLayoutId(layoutId);
  var dims = LAYOUT_TILE_DIMS[resolved];
  var d = dims && dims[tileIndex] ? dims[tileIndex] : { w: 3000, h: 1200 };
  var layout = findLayout(resolved);
  // VH mobile: fixed min 1500×750. Standard mobile: default = desktop dims.
  var mobileW, mobileH;
  if (layout && layout.type === 'vh') {
    mobileW = 1500;
    mobileH = 750;
  } else {
    mobileW = d.w;
    mobileH = d.h;
  }
  return {
    type: 'image', brief: '', textOverlay: '', ctaText: '',
    dimensions: { w: d.w, h: d.h },
    mobileDimensions: { w: mobileW, h: mobileH },
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
// ─── IMAGE CATEGORIES (6 types used in Amazon Brand Stores) ───
// Each category describes a type of image that can appear in store tiles.
// The AI assigns one category per image tile during store conception.
// This drives layout decisions, briefing content, and designer instructions.

export var IMAGE_CATEGORIES = {
  store_hero: {
    id: 'store_hero',
    name: 'Store Hero',
    description: 'First image in store, above menu bar. Represents the brand instantly.',
    placement: 'Always and exclusively as the first image above store navigation.',
    allowedElements: ['headline', 'claim', 'logo', 'lifestyle_photo', 'product', 'texture', 'abstract'],
    noCTA: true,
    requiredDecisions: [
      'claimOrSlogan', // string or null
      'showLogo',      // boolean + prominence
      'showProduct',   // boolean + which products
      'lifestyleElement', // boolean + scene type
      'abstractTexture',  // boolean (purely abstract/texture-based)
    ],
    tierBehavior: {
      1: 'Single hero for all pages, can be simple (logo + texture or logo + simple claim)',
      2: 'Single hero for all pages, but higher quality and more polished',
      3: 'Individual hero per subpage/category, each tailored to the page theme',
    },
  },
  benefit: {
    id: 'benefit',
    name: 'Benefit',
    description: 'USPs, quality markers, trust signals, or brand values at a glance. One statement per element.',
    placement: 'Between other sections as trust and information anchors.',
    forms: ['single_banner', 'grid'],
    typicalElements: ['icons', 'illustrations', 'award_logos', 'text_labels', 'solid_backgrounds'],
    excludedElements: ['cta_button', 'product_photos', 'persons'],
    variations: ['serious_awards', 'playful_illustrations', 'pure_typographic'],
    requiredDecisions: [
      'specificBenefits',  // string[] - which USPs
      'format',            // 'banner' | 'grid'
      'benefitCount',      // number
      'iconStyle',         // 'line' | 'illustration' | 'award_logo' | 'typographic'
      'backgroundColor',   // string
    ],
    tierBehavior: {
      1: 'Simple USP banner, homepage only',
      2: 'Varied types (awards, value grids), occasionally on subpages',
      3: 'Category-specific benefits on EVERY subpage, multiple presentation forms',
    },
  },
  product: {
    id: 'product',
    name: 'Product',
    description: 'Product clearly in focus. Background can be clean, colored, or styled freely.',
    placement: 'Product grid sections, category tiles for navigation, highlight displays.',
    typicalElements: ['product_photo', 'solid_background', 'product_name', 'category_name', 'cta_button', 'badge'],
    excludedElements: ['body_text', 'long_descriptions'],
    variations: ['single', 'lineup', 'set', 'macro_detail'],
    backgroundStyles: ['white', 'light_gray', 'pastel', 'brand_color'],
    requiredDecisions: [
      'products',       // which product(s)
      'singleOrGroup',  // 'single' | 'lineup' | 'set'
      'showName',       // boolean + product or category name
      'showCTA',        // boolean + CTA text
      'showBadge',      // boolean + badge text (e.g. 'NEW', 'Bestseller')
      'backgroundStyle', // string
      'perspective',     // 'frontal' | 'angle' | 'overhead' | 'dynamic' | 'macro'
    ],
    coreRule: 'Product takes up the majority of the image area. Everything else is subordinate.',
    tierBehavior: {
      1: 'Simple product tiles',
      2: 'Differentiated (lineups, details, category tiles with CTA)',
      3: 'Full range: single, lineups, detail views, sets, macro shots',
    },
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Compositions combining products, text, graphics, or lifestyle elements. Engaging and visually appealing.',
    placement: 'Central storytelling and engagement element throughout the store.',
    coreProperty: 'Combines 2-3+ element types. Text always present and plays active role.',
    dualGoal: 'Engagement (emotion, brand, curiosity) AND Information (explain product, assign category, trigger action)',
    typicalElements: ['product_photo', 'headline', 'subline', 'cta_button', 'color_blocks', 'gradients', 'split_layouts', 'icons', 'badges', 'lifestyle_photo', 'infographic', 'logo'],
    functionVariations: ['category_navigation', 'product_explanation', 'promotion', 'brand_storytelling', 'service_promotion'],
    emotionVsInfo: ['strong_emotional', 'strong_informational', 'balanced'],
    requiredDecisions: [
      'function',       // 'navigation' | 'explanation' | 'promotion' | 'storytelling' | 'service'
      'elements',       // which elements combined
      'layoutType',     // 'split' | 'banner' | 'square' | 'infographic'
      'emotionOrInfo',  // 'emotional' | 'informational' | 'balanced'
      'headline',       // string
      'ctaText',        // string
    ],
    tierBehavior: {
      1: 'Sparse or none. If used, simple banner (headline + product + CTA)',
      2: 'Targeted: bestseller banners, new product teasers, feature explanations',
      3: 'Central element: infographics, exploded views, split layouts, storytelling, service promotions',
    },
  },
  lifestyle: {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Product in use or target audience shown. Atmosphere and emotional identification.',
    placement: 'Emotional anchors between information-heavy sections.',
    coreRule: 'Lifestyle photo dominates (70-80%+ of image area). Text stays subordinate.',
    typicalElements: ['lifestyle_photo', 'product_in_use', 'logo_small', 'headline_overlay', 'category_label'],
    excludedElements: ['infographic', 'icons', 'feature_lists', 'prominent_cta'],
    variations: ['person_using', 'product_in_environment', 'detail_hand_shot'],
    textPresence: ['none', 'logo_only', 'short_claim_overlay', 'headline_subline'],
    settings: ['outdoor_nature', 'indoor_home', 'studio_near'],
    requiredDecisions: [
      'sceneType',      // 'indoor' | 'outdoor' | 'studio' | specific setting
      'showPerson',     // boolean + target audience description
      'productVisible', // which product in use
      'textOverlay',    // string or null
      'showLogo',       // boolean
    ],
    differentiationFromCreative: 'Lifestyle: photo dominates (>70%). Creative: composition of multiple equal elements. 80% photo + 20% text = Lifestyle. 50% photo + 50% text/graphic = Creative.',
    tierBehavior: {
      1: 'Optional, not on every page',
      2: 'Regular as emotional anchors',
      3: 'Consistent on nearly every page, varied scenes and target audience perspectives',
    },
  },
  text_image: {
    id: 'text_image',
    name: 'Text Image',
    description: 'Text and/or graphics are dominant. Replaces Amazon text fields for full design control.',
    placement: 'Section headings, explanation blocks, feature descriptions, claims, dividers.',
    coreRule: 'Text is primary content. No product photos, no lifestyle photos. Graphics/icons/diagrams may support.',
    reason: 'Full control over typography, color, layout, and visual elements vs Amazon text input.',
    typicalElements: ['headline', 'subline', 'body_text', 'cta_button', 'icons', 'diagrams', 'rating_scales', 'progress_bars', 'solid_background'],
    excludedElements: ['product_photos', 'lifestyle_photos'],
    functionVariations: ['section_heading', 'feature_explanation', 'category_entry_cta', 'brand_storytelling', 'brand_claim', 'tech_specs', 'taste_profile'],
    requiredDecisions: [
      'function',        // 'heading' | 'explanation' | 'claim' | 'specs' | etc.
      'exactText',       // string - the actual text content
      'graphicElements', // boolean + type (icons, diagrams, scales)
      'showCTA',         // boolean + CTA text
      'backgroundColor', // string
      'typographyHierarchy', // what is headline, subline, body
    ],
    tierBehavior: {
      1: 'Simple headings and dividers only',
      2: 'Headings + feature explanations + claims',
      3: 'Full range: specs, impact numbers, technical details, taste profiles',
    },
  },
};

// ─── IMAGE CATEGORY DECISION LOGIC ───
// Used by AI to determine which category fits a module
export var IMAGE_CATEGORY_DECISION_TREE = [
  { question: 'Is it the very first image above the menu bar?', yes: 'store_hero' },
  { question: 'Is content conveyed purely through text and/or graphics (no photo)?', yes: 'text_image' },
  { question: 'Is a product on a plain background the clear visual focus?', yes: 'product' },
  { question: 'Does a lifestyle photo dominate (>70% area) with only subtle text?', yes: 'lifestyle' },
  { question: 'Are only USPs/icons/awards shown without product photos?', yes: 'benefit' },
  { question: 'Does it combine 2-3 elements equally (product + text + graphic + maybe lifestyle)?', yes: 'creative' },
];

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
    name: 'Minimal',
    sectionsPerCategoryPage: { min: 2, max: 3 },
    sectionsPerHomepage: { min: 3, max: 5 },
    extraPages: false,
    includeVideos: false,
    includeFollowCTA: false,
    includeTrustElements: false,
    includeBrandStory: false,
    description: 'Lean and functional. Focus on conversion with minimal image category variety.',
    // ─── Tier-specific image category rules ───
    imageCategoryRules: {
      store_hero: 'required_single', // 1 hero for ALL pages, can be simple
      benefit: 'simple_banner_homepage_only', // Single USP banner, homepage only
      product: 'basic_tiles', // Simple product tiles
      creative: 'sparse_or_none', // Sparingly or not at all
      lifestyle: 'optional', // Not on every page
      text_image: 'headings_only', // Simple headings and dividers
    },
    noStorytelling: true,
    noInfographics: true,
    noServicePromotions: true,
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
    description: 'Balanced — informative and emotional. Professional brand presence with sensible structure.',
    imageCategoryRules: {
      store_hero: 'required_single_polished', // 1 hero for all pages, high quality
      benefit: 'varied_types', // Awards, value grids, occasionally on subpages
      product: 'differentiated', // Lineups, details, category tiles with CTA
      creative: 'targeted', // Bestseller banners, new product teasers, feature explanations
      lifestyle: 'regular', // Regular emotional anchors
      text_image: 'headings_and_features', // Headings + feature explanations + claims
    },
    firstStorytellingApproaches: true,
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
    description: 'Comprehensive brand presence with maximum depth, storytelling, and detailed product explanations.',
    imageCategoryRules: {
      store_hero: 'individual_per_page', // Individual hero per subpage/category
      benefit: 'category_specific_every_page', // Category-specific benefits on EVERY subpage
      product: 'full_range', // Single, lineups, details, sets, macro shots
      creative: 'central_element', // Infographics, exploded views, split layouts, storytelling, service promotions
      lifestyle: 'pervasive', // On nearly every page, varied scenes and perspectives
      text_image: 'full_range', // Specs, impact numbers, technical details
    },
    specialPages: ['about_us', 'technology', 'sustainability'],
    maxCategoryVariety: true,
  },
};

// ─── PRICING CONFIGURATION ───
// Market-rate estimates for brand store design
export var PRICING = {
  imagePrice: 45,
  videoPrice: 650,
  baseSetupFee: 750,
  imageCost: 5,
  designerHourlyUsd: 14,
  usdToEur: 0.92,
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
    splitHero: { description: 'Hero split: lifestyle left + product/message right (2 large squares)', layout: 'std-2equal', tileType: 'image' },
  },

  // === CATEGORY NAVIGATION ===
  categoryNav: {
    grid2col: { description: '2 category tiles as large squares side by side', layout: 'std-2equal' },
    wideAnd2squares: { description: 'Main category wide + 2 subcategory squares (VH)', layout: 'vh-w2s' },
    largeAndStacked: { description: 'Main category large + 2 subcategories stacked as wides', layout: 'lg-2stack' },
    largeAnd4grid: { description: 'Main category large + 4 subcategories in 2×2 grid', layout: 'lg-4grid' },
    grid4wide: { description: '4 category tiles as 2×2 wide grid', layout: '2x2wide' },
    grid6tiles: { description: '6 category tiles (2 stacked wides + 2×2 squares)', layout: '2s-4grid' },
    grid8tiles: { description: '8 category tiles in 4×2 grid', layout: '4x2grid' },
  },

  // === PRODUCT DISPLAY ===
  products: {
    fullWidthGrid: { description: 'Full-width ASIN product grid', layout: '1', tileType: 'product_grid' },
    productPlusLifestyle: { description: 'Product grid left + lifestyle image right (2 large squares)', layout: 'std-2equal' },
    shoppableFullWidth: { description: 'Full-width shoppable image (clean product photo, clickable hotspots)', layout: '1', tileType: 'shoppable_image' },
    shoppableSplit: { description: 'Shoppable image left + product name/text tile right (2 large squares)', layout: 'std-2equal',
      example: 'Left: clean product image as shoppable_image. Right: image with just the product name designed in.' },
    productShowcaseLarge: { description: 'Large product shoppable_image left + 2 stacked wide tiles right', layout: 'lg-2stack',
      example: 'Left: large product/bundle shoppable image. Right top: USP/feature wide tile. Right bottom: another product or CTA wide tile.' },
    productWith4Details: { description: 'Large product image left + 4 detail/variant tiles in 2×2 right', layout: 'lg-4grid',
      example: 'Left: hero product shot. Right 2×2: four detail tiles (features, variants, angles, or 4 smaller shoppable products).' },
    productWithWideAndSmall: { description: 'Large product left + wide banner top-right + 2 detail tiles bottom-right', layout: 'lg-w2s',
      example: 'Left: large hero product. Right top: wide feature/promo banner. Right bottom: 2 smaller detail or variant tiles.' },
    bundleShowcase: { description: 'Bundle displayed as large image + 2 stacked wide component tiles', layout: 'lg-2stack',
      example: 'Left: bundle shoppable_image. Right: individual products as wide tiles stacked.' },
    productGrid2x2wide: { description: '4 product lifestyle shots as wide tiles in 2×2 grid', layout: '2x2wide',
      example: 'Four wide product/lifestyle tiles showing different use cases or product lines.' },
  },

  // === LIFESTYLE / BRAND STORYTELLING ===
  lifestyle: {
    fullWidthLifestyle: { description: 'Full-width lifestyle image showing products in context', layout: '1', tileType: 'image' },
    lifestyleSplit: { description: 'Two lifestyle images side by side as large squares', layout: 'std-2equal' },
    alternatingPairing: { description: 'Section A: lifestyle left + product right. Section B: product left + lifestyle right.', layout: 'std-2equal',
      note: 'Use across 2 consecutive sections, mirroring arrangement for visual rhythm.' },
    nameAndProduct: { description: 'Product/category name tile left + clean product image right (large squares)', layout: 'std-2equal',
      example: 'Left: image with just product name designed in, minimal. Right: product packshot or shoppable_image.' },
  },

  // === FEATURE / USP MODULES ===
  features: {
    featureWideAnd2: { description: 'Wide feature banner + 2 square benefit tiles (VH, 3 tiles)', layout: 'vh-w2s' },
    featureLargeAndDetails: { description: 'Large feature image + 2 stacked wide detail tiles', layout: 'lg-2stack' },
    featureSplit: { description: 'Product photo left + USP bullets designed into image right (large squares)', layout: 'std-2equal' },
    featureWith4Grid: { description: 'Large product left + 4 feature tiles in 2×2 grid right', layout: 'lg-4grid',
      example: 'Left: product hero. Right: 4 tiles each highlighting one feature/benefit.' },
    featureGrid4wide: { description: '4 feature tiles as wide images in 2×2 grid', layout: '2x2wide' },
    featureGrid8: { description: '8 feature/benefit tiles in 4×2 grid', layout: '4x2grid',
      example: 'Eight small tiles, each showing one feature or benefit with icon and short text.' },
  },

  // === VIDEO ===
  video: {
    fullWidthVideo: { description: 'Full-width video section', layout: '1', tileType: 'video' },
    videoWithContext: { description: 'Video next to lifestyle/feature image (2 large squares)', layout: 'std-2equal' },
  },

  // === TEXT (use sparingly!) ===
  text: {
    sectionHeading: { description: 'Native text as section heading ONLY (not for marketing)', layout: '1', tileType: 'text' },
  },

  // === TRUST / SOCIAL PROOF ===
  trust: {
    testimonialBanner: { description: 'Customer reviews/quotes designed into banner', layout: '1' },
    certificationWide2s: { description: 'Certification wide banner + 2 trust badge squares (VH)', layout: 'vh-w2s' },
    trustSplit: { description: 'Brand story / about us split (large squares)', layout: 'std-2equal' },
  },

  // === VARIANT / COLOR SHOWCASE ===
  variants: {
    colorShowcase4wide: { description: '4 color/variant tiles as wide images in 2×2 grid', layout: '2x2wide' },
    variantBanner: { description: 'All variants in one designed banner', layout: '1' },
    variantLargeAnd4: { description: 'Product hero left + 4 color variants in 2×2 right', layout: 'lg-4grid' },
    variantGrid6: { description: '6 variant tiles (2 stacked wides + 2×2 squares)', layout: '2s-4grid' },
    variantGrid8: { description: '8 variant/color tiles in 4×2 grid', layout: '4x2grid' },
  },

  // === FOOTER / CROSS-SELL ===
  footer: {
    categoryNavFooter: { description: 'Category navigation as 4 wide tiles in 2×2', layout: '2x2wide' },
    crossSellBanner: { description: 'Cross-sell banner linking to related category', layout: '1' },
    crossSellSplit: { description: 'Two cross-sell tiles as large squares', layout: 'std-2equal' },
  },

  // === FOLLOW / ENGAGEMENT (Premium) ===
  engagement: {
    followBanner: { description: 'Follow button CTA banner encouraging store follows', layout: '1', tileType: 'image' },
    followSplit: { description: 'Brand story left + follow CTA right (large squares)', layout: 'std-2equal' },
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
      { layout: '2x2wide', purpose: 'Category navigation', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category name on dark overlay, lifestyle background' },
      { layout: 'lg-4grid', purpose: 'Hero product spotlight', tileTypes: ['shoppable_image','image','image','image','image'], brief: '[SHOPPABLE] flagship product on brand-color bg + [CREATIVE] 4 feature close-ups with specs' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: 'std-2equal', purpose: 'Brand heritage / technology', tileTypes: ['image','image'], brief: '[CREATIVE] heritage/innovation showcase + technology infographic' },
      { layout: '1', purpose: 'Product grid by category', tileTypes: ['product_grid'], brief: '' },
      { layout: 'vh-w2s', purpose: 'Trust / certification elements', tileTypes: ['image','image','image'], brief: '[CREATIVE] trust wide banner + 2 square badges — certification, award, sustainability' },
      { layout: '1', purpose: 'Deals / promo banner', tileTypes: ['image'], brief: '[CREATIVE] promo banner on brand-color, bold savings messaging' },
      { layout: '2x2wide', purpose: 'Footer category navigation', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category thumbnail with name overlay for bottom nav' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] [category product] in realistic setting, category name overlay' },
      { layout: 'lg-2stack', purpose: 'Product + features', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] hero product on white + [CREATIVE] 2 feature wide close-ups with specs' },
      { layout: 'vh-w2s', purpose: 'Technical specs visual', tileTypes: ['image','image','image'], brief: '[CREATIVE] wide spec overview + 2 square detail tiles (e.g. "180 bar")' },
      { layout: '1', purpose: 'Product demo video', tileTypes: ['video'], brief: 'Product demo video: product in real conditions, technical close-ups' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'std-2equal', purpose: 'Comparison / usage scenarios', tileTypes: ['image','image'], brief: '[CREATIVE] before/after comparison + [LIFESTYLE] product in professional use' },
      { layout: 'vh-w2s', purpose: 'Accessories cross-sell', tileTypes: ['image','image','image'], brief: '[SHOPPABLE] wide accessory overview + 2 square product tiles' },
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
      { layout: 'vh-w2s', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[LIFESTYLE] wide category lifestyle on dark tone + 2 square subcategory tiles, white name overlay' },
      { layout: '1', purpose: 'Shoppable lifestyle', tileTypes: ['shoppable_image'], brief: '[SHOPPABLE] premium setting with products, warm lighting, dark bg' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: 'std-2equal', purpose: 'Brand story / sustainability', tileTypes: ['image','image'], brief: '[CREATIVE] brand heritage/origin + sustainability values, dark bg, gold accent' },
      { layout: '1', purpose: 'Product grid secondary', tileTypes: ['product_grid'], brief: '' },
      { layout: 'vh-w2s', purpose: 'Trust / values', tileTypes: ['image','image','image'], brief: '[CREATIVE] wide value banner + 2 square pillar icons, dark bg, gold text' },
      { layout: '1', purpose: 'Footer promo', tileTypes: ['image'], brief: '[CREATIVE] brand statement, dark elegant minimal text' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products in premium dark moody setting' },
      { layout: 'std-2equal', purpose: 'Product spotlight', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product editorial photo + [PRODUCT] feature close-up' },
      { layout: '1', purpose: 'Brand lifestyle video', tileTypes: ['video'], brief: 'Premium lifestyle video: elegant product usage, moody cinematic quality' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'vh-w2s', purpose: 'Variant showcase', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide variant overview + 2 square flavor tiles with color-coded accent' },
      { layout: 'std-2equal', purpose: 'Lifestyle storytelling', tileTypes: ['image','image'], brief: '[LIFESTYLE] product in different aspirational usage contexts' },
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
      { layout: 'vh-w2s', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide category overview + 2 square packshots on dark bg, flavor-colored accent stripe' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] flagship product dramatic packshot + [CREATIVE] ingredient/benefit wide tiles, high-contrast' },
      { layout: '1', purpose: 'Video section', tileTypes: ['video'], brief: 'Training footage, product demo, athlete endorsement. Dark, energetic.' },
      { layout: '1', purpose: 'Product grid bestsellers', tileTypes: ['product_grid'], brief: '' },
      { layout: 'vh-w2s', purpose: 'Performance USPs', tileTypes: ['image','image','image'], brief: '[CREATIVE] wide stat banner + 2 square metric tiles (e.g. "30g Protein"), white on dark' },
      { layout: 'std-2equal', purpose: 'Athlete / social proof', tileTypes: ['image','image'], brief: '[LIFESTYLE] athlete using product + [CREATIVE] testimonial quote card on dark bg' },
      { layout: '1', purpose: 'Brand mission', tileTypes: ['image'], brief: '[CREATIVE] bold mission statement typography on dark bg, angular motif' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[PRODUCT] product range lineup on dark bg, dramatic lighting, category name' },
      { layout: 'std-2equal', purpose: 'Product + benefits', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product dramatic packshot + [CREATIVE] benefit infographic on dark bg' },
      { layout: 'vh-w2s', purpose: 'Flavor/variant showcase', tileTypes: ['image','image','image'], brief: '[SHOPPABLE] wide variant overview + 2 square flavor packshots on dark bg' },
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
      { layout: 'std-2equal', purpose: 'Category navigation', tileTypes: ['image','image'], brief: '[PRODUCT] product flat-lay on white, clean category name, lots of whitespace' },
      { layout: 'lg-2stack', purpose: 'Bestseller spotlight', tileTypes: ['shoppable_image','image','image'], brief: '[SHOPPABLE] hero product on white, soft shadow + [CREATIVE] minimal benefit wide tiles on white' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: 'std-2equal', purpose: 'Lifestyle', tileTypes: ['image','shoppable_image'], brief: '[LIFESTYLE] minimal, person using product, neutral tones + [SHOPPABLE] packshot on white' },
      { layout: 'vh-w2s', purpose: 'USPs', tileTypes: ['image','image','image'], brief: '[CREATIVE] wide minimal USP banner + 2 square icon tiles on white, lots of negative space' },
      { layout: '1', purpose: 'Brand statement', tileTypes: ['image'], brief: '[CREATIVE] large typography brand statement on white, one sentence, minimal' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[PRODUCT] category products flat-lay on white, clean category name' },
      { layout: 'std-2equal', purpose: 'Product detail', tileTypes: ['image','shoppable_image'], brief: '[PRODUCT] material/quality close-up + [SHOPPABLE] product on white' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'vh-w2s', purpose: 'Quality details', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide material overview + 2 square detail tiles (sizing, care)' },
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
      { layout: 'vh-w2s', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide category overview + 2 square product+ingredient tiles on cream bg' },
      { layout: 'std-2equal', purpose: 'Ingredient spotlight', tileTypes: ['image','shoppable_image'], brief: '[CREATIVE] ingredient close-up with benefit text on green bg + [SHOPPABLE] product on cream bg' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: '2x2wide', purpose: 'Trust badges', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] certification icon on cream bg (Bio, Lab-tested, Vegan, Recyclable)' },
      { layout: '1', purpose: 'Brand origin video', tileTypes: ['video'], brief: 'Authentic brand video: founder story, sourcing, production. Green fields, natural light.' },
      { layout: '1', purpose: 'Brand story', tileTypes: ['image'], brief: '[CREATIVE] founder story on nature background, white text overlay, warm authentic' },
      { layout: 'std-2equal', purpose: 'Lifestyle + social proof', tileTypes: ['image','image'], brief: '[LIFESTYLE] person using product in nature/kitchen + [CREATIVE] review quote or bestseller badge' },
      { layout: 'vh-w2s', purpose: 'Footer category links', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide category banner + 2 square thumbnails with ingredients-around-product style' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products with raw ingredients, warm natural lighting' },
      { layout: 'std-2equal', purpose: 'Benefit + product', tileTypes: ['image','shoppable_image'], brief: '[CREATIVE] ingredient benefit infographic on green bg + [SHOPPABLE] product on cream bg' },
      { layout: 'vh-w2s', purpose: 'Key features', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide ingredient overview + 2 square close-up tiles, cream bg, green accent' },
      { layout: '1', purpose: 'Ingredient journey video', tileTypes: ['video'], brief: 'Nature-inspired video: ingredients to product journey. Fields, harvesting, production. Warm authentic.' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'std-2equal', purpose: 'Trust + origin', tileTypes: ['image','image'], brief: '[CREATIVE] sourcing/origin story + certification badges' },
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
      { layout: 'vh-w2s', purpose: 'Category navigation', tileTypes: ['image','image','image'], brief: '[PRODUCT] wide category overview + 2 square product tiles on signature color bg with fun props' },
      { layout: 'std-2equal', purpose: 'Hero product + lifestyle', tileTypes: ['shoppable_image','image'], brief: '[SHOPPABLE] hero product on bold color bg + [LIFESTYLE] young person using product, vibrant' },
      { layout: 'lg-4grid', purpose: 'Variant showcase', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: '[LIFESTYLE] large group shot + [SHOPPABLE] 4 variants on flavor colors' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: '' },
      { layout: 'std-2equal', purpose: 'Social proof / community', tileTypes: ['image','image'], brief: '[LIFESTYLE] UGC/influencer shot + [CREATIVE] community stat on brand color' },
      { layout: '1', purpose: 'Video', tileTypes: ['video'], brief: 'Energetic brand video: product in action, lifestyle montage, music-driven' },
      { layout: '2x2wide', purpose: 'Footer nav', tileTypes: ['image','image','image','image'], brief: '[CREATIVE] category icon on matching color, playful thumbnail' },
    ],
    categoryPage: [
      { layout: '1', purpose: 'Category hero', tileTypes: ['image'], brief: '[LIFESTYLE] category products on vibrant gradient, fun bold category name' },
      { layout: 'vh-w2s', purpose: 'Top picks', tileTypes: ['image','image','image'], brief: '[SHOPPABLE] wide hero product + 2 square variant tiles on flavor/variant color bg' },
      { layout: '1', purpose: 'Energetic brand video', tileTypes: ['video'], brief: 'Vibrant fast-paced video: young people enjoying product, bright colors, energetic' },
      { layout: '1', purpose: 'Product grid', tileTypes: ['product_grid'], brief: 'ALL category ASINs' },
      { layout: 'lg-4grid', purpose: 'Flavor exploration', tileTypes: ['image','shoppable_image','shoppable_image','shoppable_image','shoppable_image'], brief: '[LIFESTYLE] large action shot + [SHOPPABLE] 4 variants on color backgrounds' },
      { layout: 'std-2equal', purpose: 'Fun fact + cross-sell', tileTypes: ['image','image'], brief: '[CREATIVE] fun product fact on bold color bg + category link with playful visual' },
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
    '90% of modules are image-based (image, shoppable_image, image_text). Text is designed INTO images as TEXT_IMAGE category.',
    'Native text modules ONLY for section headings or legal/compliance. NEVER for marketing.',
    'Visual communication beats text. Show, dont tell.',
    'CTA text and headlines are designed INTO images, not as separate text modules.',
    'Each tile in a row must have the SAME height.',
    'Think in image pairs and trios, not isolated tiles.',
    'Every text element in the store is a designed image (TEXT_IMAGE or CREATIVE), not an Amazon text field.',
  ],
  // ─── IMAGE CATEGORY RULES ───
  imageCategories: [
    'Every image tile MUST have an imageCategory: store_hero, benefit, product, creative, lifestyle, or text_image.',
    'Store Hero: ALWAYS first image, above menu. One per page (except Minimal tier: one for all pages).',
    'Benefit: At least 1 on homepage. USPs/icons/awards only, no product photos or people.',
    'Product: Product dominates image. Clean background. Optional name, CTA, badge.',
    'Creative: Combines 2-3+ elements equally. Text always present. Dual goal: engagement + information.',
    'Lifestyle: Photo dominates 70-80%+. Text subordinate. Emotional anchor between info sections.',
    'Text Image: Text/graphics dominant. No product/lifestyle photos. Full typographic control.',
    'NEVER two identical image categories directly adjacent (e.g. two LIFESTYLE in a row).',
  ],
  // ─── SECTION FLOW RECOMMENDATIONS ───
  homepageFlow: [
    'STORE_HERO → CREATIVE or LIFESTYLE (emotional entry)',
    '→ PRODUCT (category navigation or highlights)',
    '→ TEXT_IMAGE (section divider / heading)',
    '→ BENEFIT (USPs / trust signals)',
    '→ CREATIVE (product explanation or promotion)',
    '→ PRODUCT (more products)',
    '→ LIFESTYLE (emotional closing or application scene)',
    '→ BENEFIT (awards / trust as closing)',
  ],
  categoryPageFlow: [
    'STORE_HERO or CREATIVE (page header)',
    '→ TEXT_IMAGE (category headline / explanation)',
    '→ PRODUCT (category products)',
    '→ CREATIVE (feature explanation or infographic)',
    '→ BENEFIT (category-specific USPs)',
    '→ PRODUCT (more products)',
    '→ LIFESTYLE (application scene for this category)',
  ],
  // ─── QUALITY CRITERIA ───
  qualityCriteria: [
    'VARIETY: Never two identical image categories directly adjacent.',
    'BALANCE: Emotional (lifestyle, creative) vs informational (benefit, text_image, product) is balanced.',
    'FLOW: Page reads top-to-bottom logically — emotional entry to detailed information.',
    'CONSISTENCY: All modules share brand CI (colors, fonts, tonality).',
    'CONVERSION: Product modules and CTA-bearing creatives placed to drive purchases.',
    'TRUST: Benefit modules placed strategically where purchase barriers exist.',
    'TIER CONSISTENCY: Tier determines variety and depth of image categories, not total module count.',
    'DECISION CLARITY: AI provides clear directives to designer, not open option menus.',
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
      var layout = findLayout(sec.layoutId);
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
