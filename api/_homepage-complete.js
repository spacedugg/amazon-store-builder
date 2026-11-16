// Outreach: a homepage is selectable only when its visual slots have real
// designer uploads. Use the same tile types and hero fallback as CustomerPreview.
const NATIVE = new Set([
  'product_grid', 'product_collection', 'best_sellers',
  'recommended', 'deals', 'text', 'product_selector'
]);
const VISUAL = new Set(['image', 'image_text', 'shoppable_image']);
const hasImage = value => typeof value === 'string' &&
  (/^https:\/\//i.test(value) || /^#imgref:sha256:[a-f0-9]{64}$/.test(value));
function sameAspect(a, b) {
  if (!a || !b || !(a.w > 0 && a.h > 0 && b.w > 0 && b.h > 0)) return false;
  return Math.abs(a.w / a.h - b.w / b.h) < .01;
}
function firstHome(store) {
  return store && Array.isArray(store.pages) && store.pages[0];
}
function homepageStatus(store) {
  const home = firstHome(store);
  if (!home || !Array.isArray(home.sections) || !home.sections.length)
    return {complete:false,reason:'missing_homepage',imageCount:0};
  let hero = hasImage(home.headerBanner) || hasImage(store.headerBanner);
  let count = 0;
  for (const section of home.sections) {
    if (!section || !Array.isArray(section.tiles)) return {complete:false,reason:'invalid_section',imageCount:count};
    for (const tile of section.tiles) {
      if (!tile || !tile.type) return {complete:false,reason:'invalid_tile',imageCount:count};
      if (NATIVE.has(tile.type) || tile.type === 'video') continue;
      if (!VISUAL.has(tile.type)) return {complete:false,reason:'unknown_tile',imageCount:count};
      // The Customer Preview can use a finished store_hero tile in place of
      // a separately uploaded header banner.
      if (tile.imageCategory === 'store_hero' && hasImage(tile.uploadedImage)) hero = true;
      count++;
      if (!hasImage(tile.uploadedImage))
        return {complete:false,reason:'missing_desktop_image',imageCount:count};
      // Different mobile aspect ratios require their own image. Same aspect,
      // or syncDimensions, deliberately reuse the desktop asset.
      if (tile.mobileDimensions && !tile.syncDimensions &&
          !sameAspect(tile.dimensions,tile.mobileDimensions) &&
          !hasImage(tile.uploadedImageMobile))
        return {complete:false,reason:'missing_mobile_image',imageCount:count};
    }
  }
  if (!hero) return {complete:false,reason:'missing_header',imageCount:count};
  if (!count) return {complete:false,reason:'no_visual_assets',imageCount:0};
  return {complete:true,reason:null,imageCount:count};
}
function homepageComplete(store) { return homepageStatus(store).complete; }
module.exports = { homepageComplete, homepageStatus, hasImage };
