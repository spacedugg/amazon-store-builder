import { uid, emptyTile, emptyTileForLayout, emptyTextOverlay, deriveMobileDims } from './constants';

// Hilfsfunktion: Tile aus Briefing Dict normalisieren (Default Felder ergänzen,
// Dimensions ableiten, linkUrl Page Refs auflösen). Kann sowohl beim Full
// Briefing Import als auch beim Patch Apply genutzt werden.
export function importTileFromBriefing(t, layoutId, ti, pageIdByName) {
  pageIdByName = pageIdByName || {};
  var tile = Object.assign({}, emptyTileForLayout(layoutId || '1', ti || 0));
  if (t.type) tile.type = t.type;
  if (typeof t.brief === 'string') tile.brief = t.brief;
  if (t.textOverlay && typeof t.textOverlay === 'object') {
    tile.textOverlay = Object.assign(emptyTextOverlay(), t.textOverlay);
    if (!Array.isArray(tile.textOverlay.bullets)) tile.textOverlay.bullets = [];
  }
  if (Array.isArray(t.asins)) tile.asins = t.asins.slice();
  if (Array.isArray(t.hotspots)) tile.hotspots = t.hotspots.slice();
  if (typeof t.bgColor === 'string') tile.bgColor = t.bgColor;
  if (typeof t.imageCategory === 'string') tile.imageCategory = t.imageCategory;
  if (typeof t.textAlign === 'string') tile.textAlign = t.textAlign;
  if (typeof t.linkAsin === 'string') tile.linkAsin = t.linkAsin;
  if (typeof t.imageRef === 'string') tile.imageRef = t.imageRef;
  if (t.dimensions && typeof t.dimensions === 'object'
      && Number(t.dimensions.w) > 0 && Number(t.dimensions.h) > 0) {
    tile.dimensions = { w: Number(t.dimensions.w), h: Number(t.dimensions.h) };
    tile.mobileDimensions = deriveMobileDims(layoutId || '1', tile.dimensions.w, tile.dimensions.h);
  }
  if (t.mobileDimensions && typeof t.mobileDimensions === 'object'
      && Number(t.mobileDimensions.w) > 0 && Number(t.mobileDimensions.h) > 0) {
    tile.mobileDimensions = { w: Number(t.mobileDimensions.w), h: Number(t.mobileDimensions.h) };
  }
  if (t.productSelector && typeof t.productSelector === 'object') tile.productSelector = t.productSelector;
  if (typeof t.linkUrl === 'string') {
    if (t.linkUrl.indexOf('page:') === 0) {
      var pageName = t.linkUrl.slice(5);
      if (pageIdByName[pageName]) tile.linkUrl = '/' + pageIdByName[pageName];
      else tile.linkUrl = t.linkUrl;
    } else {
      tile.linkUrl = t.linkUrl;
    }
  }
  return tile;
}

// Hilfsfunktion: Section aus Briefing Dict normalisieren.
export function importSectionFromBriefing(s, pageIdByName) {
  var layoutId = s.layoutId || '1';
  var tiles = (s.tiles || []).map(function(t, ti) {
    return importTileFromBriefing(t, layoutId, ti, pageIdByName);
  });
  return { id: uid(), layoutId: layoutId, tiles: tiles };
}

// Hilfsfunktion: Page aus Briefing Dict normalisieren.
export function importPageFromBriefing(p, pageIdByName) {
  var sections = (p.sections || []).map(function(s) {
    return importSectionFromBriefing(s, pageIdByName);
  });
  var page = { id: uid(), name: p.name || 'Unbenannt', sections: sections };
  var parentRef = p.parentName || p.parentId;
  if (parentRef) {
    page.parentId = pageIdByName[parentRef] || parentRef;
  }
  return page;
}

// Briefing JSON → Store Objekt.
// Erwartet das Briefing Format aus briefings/juskys-store-briefing.md:
// { brandName, marketplace, category, brandTone, brandStory, headerBannerColor,
//   asins: ['B0...' | <PLATZHALTER>], pages: [{ name, sections: [{ module, layoutId, tiles: [...] }] }] }
//
// Normalisiert:
//  - generiert frische IDs für Pages und Sections
//  - ergänzt Default Tile Felder aus emptyTile()
//  - resolved linkUrl im Format 'page:Name' auf die echte Page ID
//  - belässt ASIN Platzhalter Strings ('<TOP-N-CAT>' etc.) im asins Array
export function importBriefingToStore(briefing) {
  var data = typeof briefing === 'string' ? JSON.parse(briefing) : briefing;
  if (!data || typeof data !== 'object') throw new Error('Briefing ist kein Objekt');
  if (!Array.isArray(data.pages) || data.pages.length === 0) throw new Error('Briefing enthält keine Pages');

  var pageIdByName = {};
  var rawPages = data.pages.map(function(p) {
    var id = uid();
    if (p && p.name) pageIdByName[p.name] = id;
    return { _id: id, raw: p || {} };
  });

  var pages = rawPages.map(function(entry) {
    var p = entry.raw;
    // Verwende den vorab erzeugten ID damit Subpage parentId Refs intakt bleiben.
    var page = importPageFromBriefing(p, pageIdByName);
    page.id = entry._id;
    return page;
  });

  var asins = [];
  if (Array.isArray(data.asins)) {
    asins = data.asins.map(function(a) {
      if (typeof a === 'string') return { asin: a, category: '' };
      if (a && typeof a === 'object' && a.asin) return Object.assign({ category: '' }, a);
      return null;
    }).filter(Boolean);
  }

  return {
    brandName: data.brandName || '',
    marketplace: data.marketplace || 'de',
    category: data.category || 'generic',
    brandTone: data.brandTone || '',
    brandStory: data.brandStory || '',
    headerBanner: null,
    headerBannerMobile: null,
    headerBannerColor: data.headerBannerColor || '',
    asins: asins,
    products: Array.isArray(data.products) ? data.products : [],
    pages: pages,
    googleDriveUrl: data.googleDriveUrl || '',
  };
}
