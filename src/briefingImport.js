import { uid, emptyTile, emptyTextOverlay } from './constants';

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
    var sections = (p.sections || []).map(function(s) {
      var sectionId = uid();
      var tiles = (s.tiles || []).map(function(t) {
        var tile = Object.assign({}, emptyTile());
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
        if (typeof t.linkUrl === 'string') {
          if (t.linkUrl.indexOf('page:') === 0) {
            var pageName = t.linkUrl.slice(5);
            if (pageIdByName[pageName]) tile.linkUrl = '/page/' + pageIdByName[pageName];
            else tile.linkUrl = t.linkUrl; // Fallback: Briefing referenziert eine Page die es nicht gibt
          } else {
            tile.linkUrl = t.linkUrl;
          }
        }
        return tile;
      });
      return { id: sectionId, layoutId: s.layoutId || '1', tiles: tiles };
    });
    var page = { id: entry._id, name: p.name || 'Unbenannt', sections: sections };
    if (p.parentId && pageIdByName[p.parentId]) page.parentId = pageIdByName[p.parentId];
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
