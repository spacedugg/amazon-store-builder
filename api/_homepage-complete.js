// Strict eligibility rule for Outreach's internal Store Preview picker.
// A homepage is only eligible when its banner and ALL visual tiles have
// actual uploaded assets. Native Amazon product/text modules are exempt.
const NATIVE = new Set(['product_grid', 'best_sellers', 'recommended', 'deals', 'text', 'product_selector']);
const hasImage = value => typeof value === 'string' &&
  (/^https:\/\//i.test(value) || /^#imgref:sha256:[a-f0-9]{64}$/.test(value));
function sameAspect(a, b) {
  if (!a || !b || !(a.w > 0 && a.h > 0 && b.w > 0 && b.h > 0)) return false;
  return Math.abs(a.w / a.h - b.w / b.h) < .01;
}
function homepageComplete(store) {
  if (!store || !Array.isArray(store.pages) || !store.pages.length) return false;
  const home = store.pages[0];
  if (!hasImage(home.headerBanner) && !hasImage(store.headerBanner)) return false;
  if (!Array.isArray(home.sections) || !home.sections.length) return false;
  let required = 0;
  for (const section of home.sections) {
    if (!Array.isArray(section.tiles)) return false;
    for (const tile of section.tiles) {
      if (!tile || NATIVE.has(tile.type)) continue;
      required++;
      if (!hasImage(tile.uploadedImage)) return false;
      if (tile.mobileDimensions && !tile.syncDimensions &&
          !sameAspect(tile.dimensions, tile.mobileDimensions) &&
          !hasImage(tile.uploadedImageMobile)) return false;
    }
  }
  return required > 0;
}
module.exports = { homepageComplete };
