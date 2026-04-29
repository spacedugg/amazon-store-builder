// Build Skript für Juskys Brand Store JSON.
// Generiert seed/juskys-store.json im neuen strukturierten Schema
// das von src/briefingImport.js erwartet wird.
//
// Aufruf: node seed/build-juskys-store.mjs

import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getStructuredAsins } from './juskys-asins.mjs';

var __dirname = dirname(fileURLToPath(import.meta.url));

// ─── ASIN HELPERS ─────────────────────────────────────────

var STRUCTURED_ASINS = getStructuredAsins();

// Index: alle Slots der ASIN (primär plus also)
function asinSlots(a) {
  var slots = [{ cat: a.category, sub: a.subcategory }];
  (a.also || []).forEach(function(x) { slots.push({ cat: x.cat, sub: x.sub }); });
  return slots;
}

// Alle ASINs einer Hauptkategorie (über primär oder also Slot)
export function allAsinsByCat(cat) {
  return STRUCTURED_ASINS.filter(function(a) {
    return asinSlots(a).some(function(s) { return s.cat === cat; });
  }).map(function(a) { return a.asin; });
}

// Alle ASINs einer Sub
export function allAsinsBySub(cat, sub) {
  return STRUCTURED_ASINS.filter(function(a) {
    return asinSlots(a).some(function(s) { return s.cat === cat && s.sub === sub; });
  }).map(function(a) { return a.asin; });
}

// Top N ASINs einer Hauptkategorie. Reihenfolge: onHomepage zuerst, dann Rest.
export function topAsinsByCat(cat, n) {
  var list = STRUCTURED_ASINS.filter(function(a) {
    return asinSlots(a).some(function(s) { return s.cat === cat; });
  });
  list.sort(function(x, y) { return (y.onHomepage ? 1 : 0) - (x.onHomepage ? 1 : 0); });
  return list.slice(0, n).map(function(a) { return a.asin; });
}

// Top N ASINs einer Sub
export function topAsinsBySub(cat, sub, n) {
  var list = STRUCTURED_ASINS.filter(function(a) {
    return asinSlots(a).some(function(s) { return s.cat === cat && s.sub === sub; });
  });
  list.sort(function(x, y) { return (y.onHomepage ? 1 : 0) - (x.onHomepage ? 1 : 0); });
  return list.slice(0, n).map(function(a) { return a.asin; });
}

// ASINs für Homepage Bestseller (kuratiert, aus User Auswahl)
export function homepageBestsellerAsins() {
  return [
    'B084JQYGYM', // Polyrattan Lounge Manacor (Garten saisonal)
    'B0F54DJW2F', // Rope Gartenstühle 2er Set (Garten saisonal)
    'B07P7PRG78', // PVC Sichtschutzstreifen 4er (Garten saisonal)
    'B0FNX4DJ8F', // Geräteschuppen Metall M (Garten saisonal)
    'B07QWXMYV9', // Boxspringbett Norfolk (Möbel)
    'B0CX1SJ9R1', // Sofa Iseo Schlaffunktion (Möbel)
  ];
}

// Alle ASINs in Top Level Format { asin, category, subcategory, title, also }
export function topLevelAsinList() {
  return STRUCTURED_ASINS.map(function(a) {
    return {
      asin: a.asin,
      title: a.title,
      category: a.category,
      subcategory: a.subcategory,
    };
  });
}

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
    asins: topLevelAsinList(),
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
