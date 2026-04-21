// Blueprint Layout Mapping
//
// Uebersetzt die frei formulierten layoutType-Werte aus den V2-Blueprints
// (data/store-knowledge/*_analysis.json) auf die konkreten Tool-LAYOUTS
// aus src/constants.js. Ohne dieses Mapping kann der Retrieval-basierte
// Skeleton Builder die Blueprint-Struktur nicht in echte Store-Sektionen
// uebersetzen.
//
// Regeln:
// - Amazon-System-Elemente (nav header, share footer, filter accordion,
//   separator) werden auf null gemappt und in der Skeleton-Generierung
//   uebersprungen, weil der Tool-Store sie nicht als Modul abbildet.
// - Product Grids mit ASIN-Rendering werden auf den speziellen Tool-Wert
//   'product_grid_asin' gemappt, der separat vom LAYOUTS-Katalog behandelt
//   wird (Amazon rendert Titel/Preis selbst).
// - Alle anderen V2-Typen werden auf einen der 16 LAYOUTS aus
//   LAYOUT_TILE_DIMS abgebildet.

export const V2_TO_TOOL_LAYOUT = {
  // Amazon-System, nicht als Modul rendern
  'amazon_nav_header':            { toolLayoutId: null, role: 'system_chrome' },
  'amazon_share_footer':          { toolLayoutId: null, role: 'system_chrome' },
  'filter_accordion_collapsed':   { toolLayoutId: null, role: 'system_chrome' },
  'separator_invisible':          { toolLayoutId: null, role: 'spacer' },

  // Hero-Varianten, alle Full-Width
  'hero_banner':                  { toolLayoutId: '1', role: 'hero' },
  'hero_banner_compact':          { toolLayoutId: '1', role: 'hero' },
  'hero_banner_tall':             { toolLayoutId: '1', role: 'hero' },
  'hero_video':                   { toolLayoutId: '1', role: 'hero_video' },
  'hero_video_tall':              { toolLayoutId: '1', role: 'hero_video' },
  'hero_video_split':             { toolLayoutId: 'std-2equal', role: 'hero_split' },

  // Editorial-Banner, alle Full-Width
  'editorial_banner':             { toolLayoutId: '1', role: 'editorial' },
  'editorial_banner_large':       { toolLayoutId: '1', role: 'editorial' },
  'editorial_banner_tall':        { toolLayoutId: '1', role: 'editorial' },
  'editorial_banner_solid_color': { toolLayoutId: '1', role: 'editorial' },
  'editorial_section_intro':      { toolLayoutId: '1', role: 'section_intro' },

  // Editorial-Tile-Kombinationen
  'editorial_tile_pair':          { toolLayoutId: 'std-2equal', role: 'editorial_pair' },
  'editorial_tile_quad':          { toolLayoutId: '2x2wide', role: 'editorial_quad' },

  // Subcategory-Navigation Tiles (immer eigene Full-Width-Row)
  'subcategory_tile':             { toolLayoutId: '1', role: 'navigation_bridge' },

  // Filter-UI (Produktselektor)
  'filter_banner':                { toolLayoutId: '1', role: 'filter_banner' },

  // Shoppable Interactive
  'shoppable_interactive_image':     { toolLayoutId: '1', role: 'shoppable' },
  'shoppable_interactive_image_set': { toolLayoutId: '2x2wide', role: 'shoppable_set' },

  // Product Showcase mit Video
  'product_showcase_video':       { toolLayoutId: '1', role: 'product_showcase' },

  // Product Grids (ASIN-basiert, Amazon rendert Titel und Preis selbst)
  'product_grid_bestsellers':     { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_category':        { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_featured':        { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_filter_results':  { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_full_catalog':    { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_line':            { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
  'product_grid_new_arrivals':    { toolLayoutId: 'product_grid_asin', role: 'product_grid' },
};

// Nimmt einen V2-layoutType und optional tileCount, gibt das Mapping-Objekt zurueck.
// Fallback auf layout '1' wenn unbekannt, mit role 'unknown', damit der Skeleton
// Builder trotzdem rendern kann.
export function mapLayoutToTool(layoutType, tileCount) {
  if (!layoutType) return { toolLayoutId: '1', role: 'unknown' };
  const exact = V2_TO_TOOL_LAYOUT[layoutType];
  if (exact) return exact;
  // Fallback-Heuristik nach tileCount
  if (tileCount === 1) return { toolLayoutId: '1', role: 'unknown' };
  if (tileCount === 2) return { toolLayoutId: 'std-2equal', role: 'unknown' };
  if (tileCount === 4) return { toolLayoutId: '2x2wide', role: 'unknown' };
  if (tileCount >= 5 && tileCount <= 7) return { toolLayoutId: 'lg-4grid', role: 'unknown' };
  if (tileCount >= 8) return { toolLayoutId: '4x2grid', role: 'unknown' };
  return { toolLayoutId: '1', role: 'unknown' };
}

// Fuehrt das Mapping auf eine ganze Seite aus und filtert system_chrome heraus.
// Ergebnis ist eine schlanke Sequenz von Modul-Deskriptoren, die direkt an den
// Retrieval-Matcher oder Skeleton-Builder gehen kann.
export function mapPageToToolSequence(page) {
  const modules = page.modules || [];
  return modules
    .map(m => {
      const mapping = mapLayoutToTool(m.layoutType, m.tileCount);
      return {
        position: m.position,
        moduleName: m.moduleName,
        designIntent: m.designIntent,
        v2LayoutType: m.layoutType,
        toolLayoutId: mapping.toolLayoutId,
        role: mapping.role,
        tileCount: m.tileCount,
        tiles: m.tiles || [],
        structuralPattern: m.structuralPattern,
      };
    })
    .filter(m => m.role !== 'system_chrome' && m.role !== 'spacer');
}
