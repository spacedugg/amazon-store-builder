import { uid, emptyTile, emptyTileForLayout, emptyTextOverlay } from './constants';

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
      var layoutId = s.layoutId || '1';
      var tiles = (s.tiles || []).map(function(t, ti) {
        // Default Tile mit korrekten Dimensionen basierend auf Layout und Position.
        // Layout '1' Full Width hat 3000x600 Desktop, 1680x900 Mobile (anderes Aspect).
        // Standard Layouts (std-*, lg-*, etc.) haben gleiche Dimensionen für beide.
        var tile = Object.assign({}, emptyTileForLayout(layoutId, ti));
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
        // Produktberater Quiz Schema, wird per Tool Properties Panel weiter
        // bearbeitet. Briefing JSON kann das initiale Schema vorgeben.
        if (t.productSelector && typeof t.productSelector === 'object') tile.productSelector = t.productSelector;
        if (typeof t.linkUrl === 'string') {
          if (t.linkUrl.indexOf('page:') === 0) {
            var pageName = t.linkUrl.slice(5);
            if (pageIdByName[pageName]) tile.linkUrl = '/' + pageIdByName[pageName];
            else tile.linkUrl = t.linkUrl; // Fallback: Briefing referenziert eine Page die es nicht gibt
          } else {
            tile.linkUrl = t.linkUrl;
          }
        }
        return tile;
      });
      return { id: sectionId, layoutId: layoutId, tiles: tiles };
    });
    var page = { id: entry._id, name: p.name || 'Unbenannt', sections: sections };
    // Eltern Beziehung kann als parentName (Name der Eltern Page) oder parentId
    // (Name oder bereits UID) angegeben sein. Wir suchen erst im Name Index, sonst
    // nehmen wir den Wert 1 zu 1 (z.B. wenn schon eine echte UID übergeben wurde).
    var parentRef = p.parentName || p.parentId;
    if (parentRef) {
      page.parentId = pageIdByName[parentRef] || parentRef;
    }
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
