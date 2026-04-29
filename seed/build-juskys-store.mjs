// Build Skript für Juskys Brand Store JSON.
// Generiert seed/juskys-store.json im neuen strukturierten Schema
// das von src/briefingImport.js erwartet wird.
//
// Aufruf: node seed/build-juskys-store.mjs

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

var __dirname = dirname(fileURLToPath(import.meta.url));

// ─── HELPERS ───────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// textOverlay Objekt mit Defaults
export function ov(heading, subheading, body, bullets, cta) {
  return {
    heading: heading || '',
    subheading: subheading || '',
    body: body || '',
    bullets: bullets || [],
    cta: cta || '',
  };
}

// Tile Factory.
// type: 'image' | 'image_text' | 'shoppable_image' | 'product_grid' |
//       'best_sellers' | 'recommended' | 'deals' | 'video' | 'text' | 'product_selector'
// overlay: ov(...) Objekt oder null
// brief: nur Bildfunktion und Komposition (keine Texte, kein Licht)
// opts: { asins, hotspots, linkUrl, bgColor, imageCategory, textAlign }
export function tile(type, overlay, brief, opts) {
  opts = opts || {};
  return {
    type: type,
    textOverlay: overlay || ov(),
    brief: brief || '',
    asins: opts.asins || [],
    hotspots: opts.hotspots || [],
    linkUrl: opts.linkUrl || '',
    linkAsin: opts.linkAsin || '',
    bgColor: opts.bgColor || '',
    imageCategory: opts.imageCategory || '',
    textAlign: opts.textAlign || 'left',
  };
}

// Section Factory
export function section(layoutId, tiles, module) {
  return {
    id: uid(),
    layoutId: layoutId,
    module: module || '',
    tiles: tiles,
  };
}

// Page Factory. parentName ist der Name der Eltern Page für Subpages.
// Wird im Post Processing auf die echte Page ID gemappt.
export function page(name, sections, parentName) {
  return {
    id: uid(),
    name: name,
    parentName: parentName || null,
    sections: sections,
  };
}

// linkUrl Helper für interne Page Links
export function linkTo(pageName) {
  return 'page:' + pageName;
}

// ─── TOP LEVEL FELDER ──────────────────────────────────────

var BRAND_TONE = 'Nahbar, konkret, praktisch. Inhabergeführt seit 2005, klare Sprache, kein Premium Pose, duzen.';

var BRAND_STORY_KURZ = 'Seit 2005 bringen Philipp Juskys und Daniel Heidrich ein breites Sortiment für Wohnen, Garten und Alltag direkt zu dir. Inhabergeführt, mit Qualitätskontrolle vor Ort beim Hersteller und versandkostenfrei in Deutschland.';

var BRAND_STORY_LANG = 'Seit 2005 ist Juskys dein Partner für Wohnen, Garten, Heimwerken, Tier und Freizeit. Geleitet von Philipp Juskys und Daniel Heidrich, inhabergeführt aus Deutschland. Wir besuchen unsere Hersteller persönlich, prüfen regelmäßig die Qualität und liefern versandkostenfrei in Deutschland.';

// ─── BUILD ────────────────────────────────────────────────

function buildStore() {
  var pages = [];

  // Pages werden in den nächsten Schritten ergänzt
  // pages.push(buildHomePage());
  // pages.push(buildBestsellerPage());
  // pages.push(buildGartenPage());
  // ...

  // Resolve parentName references → echte parentId
  var pageIdByName = {};
  pages.forEach(function(p) { pageIdByName[p.name] = p.id; });
  pages.forEach(function(p) {
    if (p.parentName && pageIdByName[p.parentName]) {
      p.parentId = pageIdByName[p.parentName];
    }
    delete p.parentName;
    p.sections.forEach(function(sec) {
      sec.tiles.forEach(function(t) {
        if (t.linkUrl && t.linkUrl.indexOf('page:') === 0) {
          var name = t.linkUrl.slice(5);
          if (pageIdByName[name]) t.linkUrl = '/page/' + pageIdByName[name];
        }
      });
    });
  });

  return {
    brandName: 'Juskys',
    marketplace: 'de',
    category: 'generic',
    brandTone: BRAND_TONE,
    brandStory: BRAND_STORY_KURZ,
    headerBannerColor: '#93bd26',
    headerBanner: null,
    headerBannerMobile: null,
    asins: [],
    products: [],
    pages: pages,
    googleDriveUrl: '',
  };
}

// ─── WRITE ────────────────────────────────────────────────

var store = buildStore();
var outPath = join(__dirname, 'juskys-store.json');
writeFileSync(outPath, JSON.stringify(store, null, 2), 'utf8');

console.log('OK: ' + outPath);
console.log('Pages: ' + store.pages.length);
console.log('Sections: ' + store.pages.reduce(function(a, p) { return a + p.sections.length; }, 0));
console.log('Tiles: ' + store.pages.reduce(function(a, p) {
  return a + p.sections.reduce(function(b, s) { return b + s.tiles.length; }, 0);
}, 0));
console.log('ASINs (top level): ' + store.asins.length);
