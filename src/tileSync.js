// Gemeinsame Regeln dafuer, wann Desktop und Mobil EIN Bild teilen duerfen.

// Returns true if desktop and mobile dimensions have the same aspect ratio
// (e.g. 3000x1500 and 1500x750 are both 2:1, or 1000x1000 and 500x500 are both 1:1)
export function isSameAspectRatio(deskDims, mobDims) {
  if (!deskDims || !mobDims) return false;
  if (deskDims.w === mobDims.w && deskDims.h === mobDims.h) return true;
  // Compare ratios with tolerance for floating point
  var deskRatio = deskDims.w / deskDims.h;
  var mobRatio = mobDims.w / mobDims.h;
  return Math.abs(deskRatio - mobRatio) < 0.01;
}

// A tile is effectively synced (only one image needed) when:
// - syncDimensions flag is explicitly set, OR
// - mobile dimensions are absent (mobile inherits desktop), OR
// - desktop and mobile dimensions share the same aspect ratio.
// Without this, a tile whose desktop and mobile dims happen to be identical
// but whose syncDimensions checkbox is unchecked would expect two separate
// files and report 50 percent missing.
export function tileEffectivelySynced(tile) {
  if (!tile) return false;
  if (tile.syncDimensions) return true;
  if (!tile.mobileDimensions) return true;
  return isSameAspectRatio(tile.dimensions, tile.mobileDimensions);
}

// Fertiges Bild einer Kachel fuer die gewaehlte Ansicht. Ein Bild der ANDEREN
// Ansicht darf nur einspringen, wenn beide dasselbe Seitenverhaeltnis haben
// (tileEffectivelySynced). Haben sie unterschiedliche Formate, passt das
// Desktop Bild nicht in die mobile Kachel (wuerde abgeschnitten gezeigt),
// dann gibt es lieber keins, und der Platzhalter bzw. "fehlt" erscheint.
export function tileImageForView(tile, isMobile) {
  if (!tile) return null;
  var own = isMobile ? tile.uploadedImageMobile : tile.uploadedImage;
  if (own) return own;
  if (!tileEffectivelySynced(tile)) return null;
  return (isMobile ? tile.uploadedImage : tile.uploadedImageMobile) || null;
}
