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
// imageCategory wird automatisch gesetzt für image und image_text Tiles wenn
// nicht explizit angegeben. Default Mapping greift in section() Kontext.
export function tile(type, overlay, brief, opts) {
  opts = opts || {};
  var ic = opts.imageCategory || '';
  if (!ic) {
    if (type === 'image_text') ic = 'text_image';
    else if (type === 'shoppable_image') ic = 'lifestyle';
    else if (type === 'image') ic = 'creative'; // wird in section() ggf. überschrieben
  }
  return {
    type: type,
    textOverlay: overlay || ov(),
    brief: brief || '',
    asins: opts.asins || [],
    hotspots: opts.hotspots || [],
    linkUrl: opts.linkUrl || '',
    linkAsin: opts.linkAsin || '',
    bgColor: opts.bgColor || '',
    imageCategory: ic,
    textAlign: opts.textAlign || 'left',
  };
}

// Section Factory.
// Setzt imageCategory auf image Tiles automatisch basierend auf Modul Typ,
// falls der Tile noch den Default 'creative' hat.
export function section(layoutId, tiles, module) {
  var sectionDefault = '';
  if (module) {
    if (module.indexOf('hero') === 0) sectionDefault = 'store_hero';
    else if (module.indexOf('features') === 0) sectionDefault = 'benefit';
    else if (module.indexOf('lifestyle') === 0) sectionDefault = 'lifestyle';
    else if (module.indexOf('trust') === 0) sectionDefault = 'lifestyle';
    else if (module.indexOf('engagement') === 0) sectionDefault = 'creative';
    else if (module.indexOf('footer') === 0) sectionDefault = 'creative';
    else if (module.indexOf('categoryNav') === 0) sectionDefault = 'product';
  }
  if (sectionDefault) {
    tiles.forEach(function(t) {
      if (t.type === 'image' && t.imageCategory === 'creative') {
        t.imageCategory = sectionDefault;
      }
    });
  }
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

// ─── PAGE BUILDERS ────────────────────────────────────────

function buildHomePage() {
  return page('Home', [
    // 1, Hero
    section('1', [
      tile('image',
        ov('Was **dein** Zuhause braucht', 'Möbel, Garten, Heimwerken, Haushalt, Tier und Freizeit, aus einem Haus seit 2005', '', [], 'Sortiment entdecken'),
        'Hero Bild Startseite. Wohnraum mit Sofa, Sessel, Beistelltisch, Lampe, im Hintergrund Übergang zur Terrasse.'
      ),
    ], 'hero.fullWidthHero'),

    // 2, Navigator 6 Kategorien
    section('2s-4grid', [
      tile('image', ov('**GARTEN**', 'Lounge, Tische, Schatten'), 'Kategorie Tile Garten. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Garten') }),
      tile('image', ov('**MÖBEL**', 'Sofas, Betten, Bad'), 'Kategorie Tile Möbel. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Möbel') }),
      tile('image', ov('**FREIZEIT**', 'Camping, Koffer, Sport'), 'Kategorie Tile Freizeit. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Freizeit') }),
      tile('image', ov('**HEIMWERKEN**', 'Werkzeug, Leitern, Kamine'), 'Kategorie Tile Heimwerken. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Heimwerken') }),
      tile('image', ov('**HAUSHALT**', 'Küche, Stauraum, Alltag'), 'Kategorie Tile Haushalt. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Haushalt') }),
      tile('image', ov('**TIERBEDARF**', 'Hund, Katze, Freilauf'), 'Kategorie Tile Tierbedarf. Freigestelltes Leitprodukt auf Beige.', { linkUrl: linkTo('Tierbedarf') }),
    ], 'categoryNav.grid6tiles'),

    // 3, Brand Story Split
    section('std-2equal', [
      tile('image', ov(), 'Image Tile Brand Story. Team oder Hallenbild aus juskys.de, Mitarbeiter und Standort.'),
      tile('image_text',
        ov('Ein **Haus**, viele Räume', 'Inhabergeführt seit 2005', BRAND_STORY_KURZ, [], 'Mehr über Juskys'),
        'Brand Story Tile mit Text neben Bild aus Section Tile 1. Verlinkt auf Über Uns.',
        { linkUrl: linkTo('Über Uns') }
      ),
    ], 'trust.trustSplit'),

    // 4, Trenner
    section('1', [
      tile('image', ov('Räume, die **zusammen** passen'), 'Trenner Textbild. Stoff Makro im Hintergrund.'),
    ], 'hero.fullWidthHero'),

    // 5, Shoppable Wohnzimmer
    section('1', [
      tile('shoppable_image',
        ov('Wohnzimmer, **komplett** gedacht', 'Sofa, Sessel, Beistelltisch, Lampe, Teppich'),
        'Shoppable Bild Wohnzimmer. 5 Hotspots auf Sofa, Sessel, Beistelltisch, Lampe, Teppich.',
        { asins: topAsinsBySub('Möbel', 'Sofas', 1).concat(topAsinsBySub('Möbel', 'Wohnmöbel', 2), topAsinsBySub('Möbel', 'Boxspringbetten', 1), topAsinsBySub('Möbel', 'Schlafkomfort', 1)) }
      ),
    ], 'products.shoppableFullWidth'),

    // 6, EINZIGE Bestseller Section auf Home (4 Garten saisonal plus 2 Möbel)
    section('1', [
      tile('best_sellers',
        ov('Die meistgekauften **Lieblinge**', 'Saisonal kuratierter Mix aus Garten und Möbel'),
        'Bestseller Grid 6 ASINs kuratiert.',
        { asins: homepageBestsellerAsins() }
      ),
    ], 'products.fullWidthGrid'),

    // 7, Trenner Garten
    section('1', [
      tile('image', ov('Die **Saison** beginnt zuhause'), 'Trenner Textbild. Rattan oder Polyrattan Makro im Hintergrund.'),
    ], 'hero.fullWidthHero'),

    // 8, Shoppable Garten
    section('1', [
      tile('shoppable_image',
        ov('Lounge, fertig zum **Loslegen**', 'Loungegruppen, Tische, Schatten'),
        'Shoppable Bild Terrasse. Loungegruppe als Hauptmotiv mit Sonnenschirm, Beistelltisch, Outdoor Kissen. 5 Hotspots auf Sofa, Sessel, Beistelltisch, Sonnenschirm, Kissen.',
        { asins: topAsinsBySub('Garten', 'Gartenmöbel Sets', 3).concat(topAsinsBySub('Garten', 'Sonnenschutz', 1), topAsinsBySub('Garten', 'Gartentische', 1)) }
      ),
    ], 'products.shoppableFullWidth'),

    // 9, USP Leiste 4 Marken USPs
    section('2x2wide', [
      tile('image', ov('**Inhabergeführt**', 'Seit 2005 aus Deutschland'), 'Marken USP Tile mit grünem Icon Kreis Haus.'),
      tile('image', ov('**Versandkostenfrei**', 'In ganz Deutschland'), 'Marken USP Tile mit grünem Icon Kreis Truck.'),
      tile('image', ov('**Geprüft**', 'Hersteller persönlich besucht'), 'Marken USP Tile mit grünem Icon Kreis Schild Check.'),
      tile('image', ov('**Sortiment**', 'Für viele Lebensbereiche'), 'Marken USP Tile mit grünem Icon Kreis Stern.'),
    ], 'features.featureGrid4wide'),

    // 10, Follow Banner
    section('1', [
      tile('image',
        ov('**Folge** Juskys', 'Neue Produkte und Aktionen direkt im Feed', '', [], 'Folgen'),
        'Follow Banner Full Width.'
      ),
    ], 'engagement.followBanner'),

    // 11, Footer Nav
    section('2x2wide', [
      tile('image', ov('**GARTEN**'), 'Footer Kategorie Tile mit Mini Icon.', { linkUrl: linkTo('Garten') }),
      tile('image', ov('**MÖBEL**'), 'Footer Kategorie Tile mit Mini Icon.', { linkUrl: linkTo('Möbel') }),
      tile('image', ov('**HAUSHALT**'), 'Footer Kategorie Tile mit Mini Icon.', { linkUrl: linkTo('Haushalt') }),
      tile('image', ov('**ÜBER** UNS'), 'Footer Tile zur Brand Story.', { linkUrl: linkTo('Über Uns') }),
    ], 'footer.categoryNavFooter'),
  ]);
}

function buildBestsellerPage() {
  return page('Bestseller', [
    section('1', [
      tile('image',
        ov('Was unsere **Kunden** lieben', 'Die meistgekauften Juskys Produkte'),
        'Hero Bild Mix aus mehreren Kategorien.'
      ),
    ], 'hero.fullWidthHero'),

    section('2s-4grid', [
      tile('image', ov('**GARTEN**', 'Top in Garten'), 'Sub Navigator Tile, Filter zu Garten Bestseller.', { linkUrl: linkTo('Garten') }),
      tile('image', ov('**MÖBEL**', 'Top in Möbel'), 'Sub Navigator Tile, Filter zu Möbel Bestseller.', { linkUrl: linkTo('Möbel') }),
      tile('image', ov('**FREIZEIT**', 'Top in Freizeit'), 'Sub Navigator Tile, Filter zu Freizeit Bestseller.', { linkUrl: linkTo('Freizeit') }),
      tile('image', ov('**HEIMWERKEN**', 'Top in Heimwerken'), 'Sub Navigator Tile, Filter zu Heimwerken Bestseller.', { linkUrl: linkTo('Heimwerken') }),
      tile('image', ov('**HAUSHALT**', 'Top in Haushalt'), 'Sub Navigator Tile, Filter zu Haushalt Bestseller.', { linkUrl: linkTo('Haushalt') }),
      tile('image', ov('**TIERBEDARF**', 'Top in Tierbedarf'), 'Sub Navigator Tile, Filter zu Tierbedarf Bestseller.', { linkUrl: linkTo('Tierbedarf') }),
    ], 'categoryNav.grid6tiles'),

    section('1', [
      tile('best_sellers',
        ov('Top **12** insgesamt', 'Kategorieübergreifend'),
        'Bestseller Grid 12 Top Seller aus allen Kategorien.',
        { asins: STRUCTURED_ASINS.filter(function(a) { return a.onHomepage; }).slice(0, 12).map(function(a) { return a.asin; }) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Garten**'), 'Top 8 Bestseller aus Garten.', { asins: topAsinsByCat('Garten', 8) }),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Möbel**'), 'Top 8 Bestseller aus Möbel.', { asins: topAsinsByCat('Möbel', 8) }),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Freizeit**'), 'Top 6 Bestseller aus Freizeit.', { asins: topAsinsByCat('Freizeit', 6) }),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Heimwerken**'), 'Top 6 Bestseller aus Heimwerken.', { asins: topAsinsByCat('Heimwerken', 6) }),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Haushalt**'), 'Top 8 Bestseller aus Haushalt.', { asins: topAsinsByCat('Haushalt', 8) }),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers', ov('Top in **Tierbedarf**'), 'Top 5 Bestseller aus Tierbedarf.', { asins: topAsinsByCat('Tierbedarf', 5) }),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('Warum **Juskys**'), 'Wide Image USP Bild.'),
      tile('image', ov('**Geprüfte** Qualität'), 'Square mit grünem Icon Kreis Schild Check.'),
      tile('image', ov('**Versandkostenfrei**'), 'Square mit grünem Icon Kreis Truck.'),
    ], 'features.featureWideAnd2'),
  ]);
}

// Hero Headlines pro Subpage, Mapping per Eltern Kategorie und Sub.
// Format: { '[Parent] > [Sub]': { heading, subheading } }
var SUB_HERO_TEXTS = {
  // Garten
  'Garten > Gartenmöbel Sets': { heading: 'Lounge, **bereit** für die Saison', subheading: 'Komplette Sitzgruppen für Garten und Terrasse' },
  'Garten > Gartenaufbewahrung': { heading: 'Stauraum, der **draußen** bleibt', subheading: 'Gerätehäuser, Holzunterstände, Boxen' },
  'Garten > Gartenbedarf': { heading: 'Alles für den **Garten**', subheading: 'Schlauch, Schubkarre, Werkzeug' },
  'Garten > Sonnenschutz': { heading: '**Schatten**, wo du ihn brauchst', subheading: 'Sonnenschirme, Markisen, Sichtschutz' },
  'Garten > Gartenliegen': { heading: 'Liegen, **lang** ausstrecken', subheading: 'Sonnenliegen und Doppelliegen' },
  'Garten > Gartenbänke': { heading: '**Bänke** zum Niederlassen', subheading: 'Klassische Gartenbänke aus Holz und Metall' },
  'Garten > Gartentische': { heading: 'Der **Tisch** für draußen', subheading: 'Gartentische in verschiedenen Größen' },
  'Garten > Bierzeltgarnituren': { heading: '**Feiern** ohne Aufwand', subheading: 'Bierzeltgarnituren für jeden Anlass' },
  'Garten > Hängematten': { heading: 'Hängen, **schaukeln**, abschalten', subheading: 'Hängematten und Hängesessel mit Gestell' },
  'Garten > Überdachungen': { heading: '**Schutz** für die Saison', subheading: 'Terrassendach, Carport, Wintergarten' },
  'Garten > Poolbedarf': { heading: '**Pool** und Wasser', subheading: 'Solardusche, Abdeckung, Filteranlage' },
  'Garten > Gewächshäuser': { heading: 'Pflanzen unter **Glas**', subheading: 'Aluminium Gewächshäuser für deinen Garten' },
  // Möbel
  'Möbel > Sofas': { heading: 'Das Sofa, das **bleibt**', subheading: 'Komfort fürs Wohnzimmer' },
  'Möbel > Polsterbetten': { heading: 'Polster, das **trägt**', subheading: 'Polsterbetten in mehreren Größen' },
  'Möbel > Boxspringbetten': { heading: 'Boxspring, **fest** verankert', subheading: 'Klassischer Schlafkomfort' },
  'Möbel > Metallbetten': { heading: 'Metall, **klare** Linie', subheading: 'Schlichte Metallbetten' },
  'Möbel > Kinderbetten': { heading: 'Für **kleine** Träumer', subheading: 'Polsterbetten in Kindergrößen' },
  'Möbel > Wohnmöbel': { heading: 'Möbel fürs **Leben**', subheading: 'Wohn und Esszimmer Möbel' },
  'Möbel > Massagesessel': { heading: 'Entspannung **per** Knopfdruck', subheading: 'Massagesessel für zuhause' },
  'Möbel > Büromöbel': { heading: 'Arbeit, **bequem** gemacht', subheading: 'Bürostühle, Schreibtische, Aktenschränke' },
  'Möbel > Matratzen': { heading: '**Guter** Schlaf beginnt hier', subheading: 'Matratzen und Topper' },
  'Möbel > Schlafkomfort': { heading: '**Komfort** über der Matratze', subheading: 'Kissen, Decken, Aufstehhilfen' },
  'Möbel > Schminktische': { heading: 'Dein **Spiegel** im Alltag', subheading: 'Schminktische mit LED' },
  'Möbel > Badausstattung': { heading: 'Das **Bad**, klar strukturiert', subheading: 'Wäschekörbe und Stauraum' },
  // Freizeit
  'Freizeit > Camping': { heading: 'Camping, **leicht** gemacht', subheading: 'Stuhl, Tisch, Kühlbox, Matratze' },
  'Freizeit > Koffersets': { heading: '**Reisen** ohne Stress', subheading: 'Hartschale und Trolley Sets' },
  'Freizeit > Dachzelte': { heading: '**Schlafen**, wo du parkst', subheading: 'Autodachzelte für Roadtrips' },
  'Freizeit > Sport': { heading: 'In Bewegung **bleiben**', subheading: 'Sport und Outdoor Aktivitäten' },
  // Heimwerken
  'Heimwerken > Werkzeug': { heading: '**Werkzeug**, das hält', subheading: 'Hebeanlage, Wagenheber, Reparaturständer' },
  'Heimwerken > Sackkarren': { heading: '**Tragen**, ohne Mühe', subheading: 'Klappbare Sackkarren für Treppen und Boden' },
  'Heimwerken > Multifunktionsleitern': { heading: '**Hoch** hinaus', subheading: 'Aluminium Multifunktionsleitern' },
  'Heimwerken > Elektrokamine': { heading: '**Wärme**, wenn es kalt wird', subheading: 'Elektrokamine und Heizstrahler' },
  // Haushalt
  'Haushalt > Schwerlastregale': { heading: '**Stauraum**, der trägt', subheading: 'Verzinkte Lager und Schwerlastregale' },
  'Haushalt > Aufbewahrung': { heading: '**Ordnung**, leicht gemacht', subheading: 'Boxen und Aufbewahrungssysteme' },
  'Haushalt > Küchengeräte': { heading: 'Küche, **schnell** zur Hand', subheading: 'Airfryer und Helfer' },
  'Haushalt > Mülleimer': { heading: 'Müll, **sauber** getrennt', subheading: 'Küchenmülleimer in mehreren Größen' },
  'Haushalt > Eiswürfelmaschinen': { heading: 'Eis, **per** Knopfdruck', subheading: 'Kompakte Eiswürfelmaschinen' },
  'Haushalt > Heizgeräte': { heading: 'Wärme, **wenn** du sie brauchst', subheading: 'Heizgeräte für drinnen und draußen' },
  'Haushalt > Alltagshilfen': { heading: 'Alltag, **leichter** gemacht', subheading: 'Rollator, Bollerwagen und mehr' },
  'Haushalt > Kinderbedarf': { heading: 'Für **kleine** Helden', subheading: 'Kinderausstattung fürs Zuhause' },
  // Tierbedarf
  'Tierbedarf > Hundebedarf': { heading: 'Für deinen **Hund**', subheading: 'Transport, Treppe, Auslauf' },
  'Tierbedarf > Katzenbedarf': { heading: 'Für deine **Katze**', subheading: 'Komfort und Spiel für Stubentiger' },
  'Tierbedarf > Freilaufgehege': { heading: '**Freilauf**, sicher und groß', subheading: 'Gehege für Garten und Balkon' },
};

// Default Image Category pro Tile Typ
function defaultImageCategory(type, sectionModule) {
  if (type === 'image_text') return 'text_image';
  if (type === 'shoppable_image') return 'lifestyle';
  if (sectionModule && sectionModule.indexOf('hero') === 0) return 'store_hero';
  if (sectionModule && sectionModule.indexOf('features') === 0) return 'benefit';
  if (sectionModule && sectionModule.indexOf('lifestyle') === 0) return 'lifestyle';
  if (sectionModule && sectionModule.indexOf('trust') === 0) return 'lifestyle';
  if (sectionModule && sectionModule.indexOf('engagement') === 0) return 'creative';
  if (sectionModule && sectionModule.indexOf('footer') === 0) return 'creative';
  if (sectionModule && sectionModule.indexOf('categoryNav') === 0) return 'product';
  return 'creative';
}

// Standard Subpage Template, vier Sections.
// Wird für jede Sub mit ASINs aufgerufen.
function buildSubpage(parentName, subName, headlineWord) {
  var subAsins = allAsinsBySub(parentName, subName);
  if (subAsins.length === 0) return null;
  var key = parentName + ' > ' + subName;
  var heroText = SUB_HERO_TEXTS[key] || { heading: 'Top **' + subName + '**', subheading: '' };
  return page(subName, [
    section('1', [
      tile('image',
        ov(heroText.heading, heroText.subheading, '', [], 'Sortiment ansehen'),
        'Hero Bild Sub Page ' + subName + '. Freigestelltes Leitprodukt aus dieser Sub.'
      ),
    ], 'hero.fullWidthHero'),
    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **' + subName + '**'),
        'Bestseller Grid in dieser Sub.',
        { asins: subAsins.slice(0, 8) }
      ),
    ], 'products.fullWidthGrid'),
    section('1', [
      tile('product_grid',
        ov('Alle **' + subName + '** Produkte'),
        'Vollkatalog dieser Sub.',
        { asins: subAsins }
      ),
    ], 'products.fullWidthGrid'),
    section('1', [
      tile('image',
        ov('Mehr aus **' + parentName + '**', '', '', [], parentName + ' ansehen'),
        'Cross Link zur Eltern Kategorie.',
        { linkUrl: linkTo(parentName) }
      ),
    ], 'footer.crossSellBanner'),
  ], parentName);
}

// Alle Subs pro Eltern Page in der gewünschten Reihenfolge
var SUB_LIST = {
  Garten: ['Gartenmöbel Sets', 'Gartenaufbewahrung', 'Gartenbedarf', 'Sonnenschutz', 'Gartenliegen', 'Gartenbänke', 'Gartentische', 'Bierzeltgarnituren', 'Kissenboxen', 'Grills', 'Hängematten', 'Überdachungen', 'Poolbedarf', 'Gewächshäuser'],
  Möbel: ['Sofas', 'Polsterbetten', 'Boxspringbetten', 'Metallbetten', 'Kinderbetten', 'Wohnmöbel', 'Massagesessel', 'Büromöbel', 'Matratzen', 'Schlafkomfort', 'Schminktische', 'Badausstattung'],
  Freizeit: ['Camping', 'Koffersets', 'Dachzelte', 'Sport'],
  Heimwerken: ['Werkzeug', 'Sackkarren', 'Multifunktionsleitern', 'Elektrokamine'],
  Haushalt: ['Schwerlastregale', 'Aufbewahrung', 'Küchengeräte', 'Mülleimer', 'Eiswürfelmaschinen', 'Heizgeräte', 'Alltagshilfen', 'Kinderbedarf'],
  Tierbedarf: ['Hundebedarf', 'Katzenbedarf', 'Freilaufgehege'],
};

function buildAllSubpages() {
  var subpages = [];
  Object.keys(SUB_LIST).forEach(function(parent) {
    SUB_LIST[parent].forEach(function(sub) {
      var p = buildSubpage(parent, sub);
      if (p) subpages.push(p);
    });
  });
  return subpages;
}

function buildTierbedarfPage() {
  return page('Tierbedarf', [
    section('1', [
      tile('image',
        ov('Für **deinen** Liebling', 'Hund, Katze, Freilauf', '', [], 'Sortiment entdecken'),
        'Hero Bild mit Hund oder Katze in Wohnsetting oder Garten.'
      ),
    ], 'hero.fullWidthHero'),

    section('vh-w2s', [
      tile('image', ov('**FREILAUFGEHEGE**'), 'Wide Tile Freilaufgehege.'),
      tile('image', ov('**HUND**'), 'Square Tile Hundebedarf.'),
      tile('image', ov('**KATZE**'), 'Square Tile Katzenbedarf.'),
    ], 'categoryNav.wideAnd2squares'),

    section('1', [
      tile('shoppable_image',
        ov('Freilauf, **sicher** und groß', 'Auslauf für Kleintiere und Hunde'),
        'Shoppable Bild Garten mit Freilaufgehege. 1 Hotspot Freilaufgehege plus weitere Hundebedarf wenn vorhanden.',
        { asins: ['B09M7GCK5Y', 'B0716T9673', 'B01CSNO9YO', 'B079YT88DT', 'B0C4FHBSR1'] }
      ),
    ], 'products.shoppableFullWidth'),

    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Gehege**'),
        'Bestseller Freilaufgehege.',
        { asins: topAsinsBySub('Tierbedarf', 'Freilaufgehege', 4) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers',
        ov('Für den **Hund** zuhause'),
        'Bestseller Hundebedarf.',
        { asins: topAsinsBySub('Tierbedarf', 'Hundebedarf', 6) }
      ),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('**Sicher**, robust, einfach'), 'Wide Bild.'),
      tile('image', ov('**Stabil**'), 'Square mit grünem Icon Kreis Werkzeug.'),
      tile('image', ov('**Tierfreundlich**'), 'Square mit grünem Icon Kreis Pfote.'),
    ], 'features.featureWideAnd2'),

    section('1', [
      tile('product_grid',
        ov('Alle **Tierbedarf** Produkte im Überblick'),
        'Vollkatalog Tierbedarf.',
        { asins: allAsinsByCat('Tierbedarf') }
      ),
    ], 'products.fullWidthGrid'),
  ]);
}

function buildSalePage() {
  return page('Sale', [
    section('1', [
      tile('image',
        ov('**Aktuell** reduziert', 'Aktionen quer durch alle Kategorien', '', [], 'Aktionen ansehen'),
        'Hero Bild Mix.'
      ),
    ], 'hero.fullWidthHero'),

    section('2s-4grid', [
      tile('image', ov('Sale **GARTEN**'), 'Filter Tile.', { linkUrl: linkTo('Garten') }),
      tile('image', ov('Sale **MÖBEL**'), 'Filter Tile.', { linkUrl: linkTo('Möbel') }),
      tile('image', ov('Sale **FREIZEIT**'), 'Filter Tile.', { linkUrl: linkTo('Freizeit') }),
      tile('image', ov('Sale **HEIMWERKEN**'), 'Filter Tile.', { linkUrl: linkTo('Heimwerken') }),
      tile('image', ov('Sale **HAUSHALT**'), 'Filter Tile.', { linkUrl: linkTo('Haushalt') }),
      tile('image', ov('Sale **TIERBEDARF**'), 'Filter Tile.', { linkUrl: linkTo('Tierbedarf') }),
    ], 'categoryNav.grid6tiles'),

    section('1', [
      tile('deals',
        ov('Top **12** Aktionen', 'Aktuell reduzierte Bestseller'),
        'Top 12 reduzierte ASINs. Operator pflegt die Liste manuell oder per CSV.',
        { asins: STRUCTURED_ASINS.filter(function(a) { return a.onHomepage; }).slice(0, 12).map(function(a) { return a.asin; }) }
      ),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('**Warum** lohnt sich Sale'), 'Wide Bild.'),
      tile('image', ov('**Echt** reduziert'), 'Square mit grünem Icon Kreis Stern.'),
      tile('image', ov('**Schnell** weg'), 'Square mit grünem Icon Kreis Truck.'),
    ], 'features.featureWideAnd2'),
  ]);
}

function buildUeberUnsPage() {
  return page('Über Uns', [
    section('1', [
      tile('image',
        ov('Ein **Haus**, viele Räume', 'Inhabergeführt seit 2005, aus Deutschland'),
        'Hero Bild Portrait oder Halle aus juskys.de.'
      ),
    ], 'hero.fullWidthHero'),

    section('std-2equal', [
      tile('image', ov(), 'Image Tile Brand Story. Hallenbild oder Team aus juskys.de.'),
      tile('image_text',
        ov('Inhabergeführt aus **Deutschland**', 'Seit 2005', BRAND_STORY_LANG),
        'Brand Story Tile mit Text neben Bild. Brand Story Lang aus Website Content kondensiert.'
      ),
    ], 'trust.trustSplit'),

    section('2x2wide', [
      tile('image', ov('**Inhabergeführt**', 'Seit 2005'), 'Wert Tile Inhabergeführt mit Foto Geschäftsführer Juskys/Heidrich.'),
      tile('image', ov('**Geprüft**', 'Hersteller persönlich besucht'), 'Wert Tile Qualität mit Foto Hersteller Visite.'),
      tile('image', ov('**Versandkostenfrei**', 'In ganz Deutschland'), 'Wert Tile Versand mit Foto Logistik.'),
      tile('image', ov('**Engagiert**', 'Soziales Engagement, Spenden'), 'Wert Tile Engagement mit Foto Spendenaktion.'),
    ], 'features.featureGrid4wide'),

    section('2s-4grid', [
      tile('image', ov(), 'Wide Galerie Bild Lager.'),
      tile('image', ov(), 'Wide Galerie Bild Designbereich.'),
      tile('image', ov(), 'Square Galerie Bild Qualitätscheck.'),
      tile('image', ov(), 'Square Galerie Bild Showroom.'),
      tile('image', ov(), 'Square Galerie Bild Mitarbeiter.'),
      tile('image', ov(), 'Square Galerie Bild Gebäude oder Standort.'),
    ], 'lifestyle.fullWidthLifestyle'),

    section('1', [
      tile('image',
        ov('**Service**, der reagiert', 'Kontakt, Versand, Rücksendung', '', [], 'Kontakt aufnehmen'),
        'Service Block mit Icons Kontakt Versand Rücksendung.'
      ),
    ], 'engagement.followBanner'),
  ]);
}

function buildHaushaltPage() {
  return page('Haushalt', [
    section('1', [
      tile('image',
        ov('Alltag, **leichter** gemacht', 'Stauraum, Küche, Kinder, Alltagshilfen', '', [], 'Sortiment entdecken'),
        'Hero Bild Hauswirtschaftsraum oder Küche.'
      ),
    ], 'hero.fullWidthHero'),

    section('4x2grid', [
      tile('image', ov('**SCHWERLASTREGALE**'), 'Sub Tile Schwerlastregale.'),
      tile('image', ov('**AUFBEWAHRUNG**'), 'Sub Tile Aufbewahrung.'),
      tile('image', ov('**KÜCHENGERÄTE**'), 'Sub Tile Küchengeräte.'),
      tile('image', ov('**MÜLLEIMER**'), 'Sub Tile Mülleimer.'),
      tile('image', ov('**EISWÜRFELMASCHINEN**'), 'Sub Tile Eiswürfelmaschinen.'),
      tile('image', ov('**HEIZGERÄTE**'), 'Sub Tile Heizgeräte.'),
      tile('image', ov('**ALLTAGSHILFEN**'), 'Sub Tile Alltagshilfen, Rollator oder Bollerwagen.'),
      tile('image', ov('**KINDERBEDARF**'), 'Sub Tile Kinderbedarf.'),
    ], 'categoryNav.grid8tiles'),

    section('1', [
      tile('shoppable_image',
        ov('Küche, **alles** zur Hand', 'Geräte und Helfer'),
        'Shoppable Bild Küche. 5 Hotspots auf Airfryer, Mülleimer, Eiswürfelmaschine, Aufbewahrungsbox, Multifunktionstisch.',
        { asins: ['B0DHGHCZTF', 'B0CK4QSWF9', 'B0D5QK6TLM', 'B0CD7VC4D8', 'B0BWN6NB4Z'] }
      ),
    ], 'products.shoppableFullWidth'),

    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Küchengeräte**'),
        'Bestseller Küchengeräte plus Eiswürfelmaschine.',
        { asins: topAsinsBySub('Haushalt', 'Küchengeräte', 3).concat(topAsinsBySub('Haushalt', 'Eiswürfelmaschinen', 1), topAsinsBySub('Haushalt', 'Mülleimer', 1)) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('image', ov('Stauraum, **klar** sortiert'), 'Trenner Textbild. Lager Makro.'),
    ], 'hero.fullWidthHero'),

    section('1', [
      tile('best_sellers',
        ov('**Mehr** Stauraum', 'Schwerlastregale und Aufbewahrung'),
        'Bestseller Schwerlastregale plus Aufbewahrung.',
        { asins: topAsinsBySub('Haushalt', 'Schwerlastregale', 6).concat(topAsinsBySub('Haushalt', 'Aufbewahrung', 2)) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers',
        ov('Hilfe im **Alltag**', 'Kinderbedarf und Alltagshilfen'),
        'Bestseller Kinderbedarf plus Alltagshilfen.',
        { asins: topAsinsBySub('Haushalt', 'Kinderbedarf', 5).concat(topAsinsBySub('Haushalt', 'Alltagshilfen', 3)) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers',
        ov('Wärme zum **Einschalten**'),
        'Bestseller Heizgeräte.',
        { asins: topAsinsBySub('Haushalt', 'Heizgeräte', 2) }
      ),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('**Praktisch** im Alltag'), 'Wide Bild.'),
      tile('image', ov('**Durchdacht**'), 'Square mit grünem Icon Kreis Schild Check.'),
      tile('image', ov('**Langlebig**'), 'Square mit grünem Icon Kreis Stern.'),
    ], 'features.featureWideAnd2'),

    section('1', [
      tile('product_grid',
        ov('Alle **Haushalt** Produkte im Überblick'),
        'Vollkatalog Haushalt.',
        { asins: allAsinsByCat('Haushalt') }
      ),
    ], 'products.fullWidthGrid'),
  ]);
}

function buildHeimwerkenPage() {
  return page('Heimwerken', [
    section('1', [
      tile('image',
        ov('Werkzeug, das **arbeitet**', 'Werkzeug, Leitern, Sackkarren, Kamine', '', [], 'Werkzeug entdecken'),
        'Hero Bild Werkstatt oder Werkzeug Setup.'
      ),
    ], 'hero.fullWidthHero'),

    section('vh-w2s', [
      tile('image', ov('**WERKZEUG**'), 'Sub Tile Werkzeug.'),
      tile('image', ov('**SACKKARREN**'), 'Sub Tile Sackkarren.'),
      tile('image', ov('**LEITERN**', 'Multifunktionsleitern'), 'Sub Tile Leitern.'),
    ], 'categoryNav.wideAnd2squares'),

    section('std-2equal', [
      tile('image', ov('**ELEKTROKAMINE**'), 'Sub Tile Elektrokamine, Standkamin Rendering.'),
      tile('image', ov('**Robust** gebaut', 'Werkzeug das hält'), 'USP Highlight Tile mit grünem Icon Kreis Werkzeug.'),
    ], 'categoryNav.grid2col'),

    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Werkzeuge**'),
        'Bestseller Werkzeug.',
        { asins: topAsinsBySub('Heimwerken', 'Werkzeug', 3) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers',
        ov('**Stark** im Alltag', 'Sackkarren und Leitern'),
        'Bestseller Sackkarren plus Leitern.',
        { asins: topAsinsBySub('Heimwerken', 'Sackkarren', 3).concat(topAsinsBySub('Heimwerken', 'Multifunktionsleitern', 1)) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('image', ov('Wärme, **wenn** es kalt wird'), 'Trenner Textbild. Holzfeuer Makro.'),
    ], 'hero.fullWidthHero'),

    section('1', [
      tile('best_sellers',
        ov('Wärme zum **Einschalten**', 'Elektrokamine und Heizstrahler'),
        'Bestseller Elektrokamine plus Heizstrahler die hier Doppel Mapping haben.',
        { asins: topAsinsBySub('Heimwerken', 'Elektrokamine', 6) }
      ),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('**Robust**, sicher, durchdacht'), 'Wide Bild.'),
      tile('image', ov('**Belastbar**'), 'Square mit grünem Icon Kreis Werkzeug.'),
      tile('image', ov('**Sicher**'), 'Square mit grünem Icon Kreis Schild Check.'),
    ], 'features.featureWideAnd2'),

    section('1', [
      tile('product_grid',
        ov('Alle **Heimwerken** Produkte im Überblick'),
        'Vollkatalog Heimwerken.',
        { asins: allAsinsByCat('Heimwerken') }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('image',
        ov('Praktisch fürs Haus, weiter zu **Haushalt**', '', '', [], 'Haushalt ansehen'),
        'Cross Sell Banner.',
        { linkUrl: linkTo('Haushalt') }
      ),
    ], 'footer.crossSellBanner'),
  ]);
}

function buildFreizeitPage() {
  return page('Freizeit', [
    section('1', [
      tile('image',
        ov('Raus, **erleben**, ankommen', 'Camping, Koffer, Sport, Dachzelte', '', [], 'Sortiment entdecken'),
        'Hero Bild Outdoor Setup mit Zelt oder Camping Setup.'
      ),
    ], 'hero.fullWidthHero'),

    section('2x2wide', [
      tile('image', ov('**CAMPING**'), 'Sub Tile Camping, Campingstuhl Rendering.'),
      tile('image', ov('**KOFFER**'), 'Sub Tile Koffersets, Trolley Rendering.'),
      tile('image', ov('**DACHZELTE**'), 'Sub Tile Dachzelte, Dachzelt Rendering.'),
      tile('image', ov('**SPORT**'), 'Sub Tile Sport, Tischtennis oder Walking Stöcke.'),
    ], 'categoryNav.grid4wide'),

    section('1', [
      tile('shoppable_image',
        ov('Camping, **leicht** gemacht', 'Stuhl, Tisch, Kühlbox, Luftmatratze'),
        'Shoppable Bild Outdoor Camping Setup. 5 Hotspots auf Campingstuhl, Campingtisch, Kühlbox, Luftmatratze, Walking Stöcke.',
        { asins: topAsinsBySub('Freizeit', 'Camping', 5) }
      ),
    ], 'products.shoppableFullWidth'),

    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Camping** Produkte'),
        'Bestseller Camping.',
        { asins: topAsinsBySub('Freizeit', 'Camping', 5) }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Koffer**'),
        'Bestseller Koffersets.',
        { asins: topAsinsBySub('Freizeit', 'Koffersets', 7) }
      ),
    ], 'products.fullWidthGrid'),

    section('lg-2stack', [
      tile('image',
        ov('Dachzelt, **schnell** aufgebaut'),
        'Large Image Dachzelt Lago auf Auto im Outdoor Setting.'
      ),
      tile('image', ov('**Schnell** aufgebaut'), 'Wide USP Bullet zum Aufbau in Minuten.'),
      tile('image', ov('**Wetterfest**'), 'Wide USP Bullet zur Witterungsfestigkeit.'),
    ], 'products.productShowcaseLarge'),

    section('1', [
      tile('best_sellers',
        ov('**Sport** für draußen'),
        'Bestseller Sport.',
        { asins: topAsinsBySub('Freizeit', 'Sport', 4) }
      ),
    ], 'products.fullWidthGrid'),

    section('vh-w2s', [
      tile('image', ov('Für **draußen** gebaut'), 'Wide Bild Outdoor.'),
      tile('image', ov('**Wetterfest**'), 'Square mit grünem Icon Kreis Regentropfen.'),
      tile('image', ov('**Leicht** verstaut'), 'Square mit grünem Icon Kreis Box.'),
    ], 'features.featureWideAnd2'),

    section('1', [
      tile('product_grid',
        ov('Alle **Freizeit** Produkte im Überblick'),
        'Vollkatalog Freizeit.',
        { asins: allAsinsByCat('Freizeit') }
      ),
    ], 'products.fullWidthGrid'),

    section('1', [
      tile('image',
        ov('Auch fürs Zuhause draußen, weiter zu **Garten**', '', '', [], 'Garten ansehen'),
        'Cross Sell Banner.',
        { linkUrl: linkTo('Garten') }
      ),
    ], 'footer.crossSellBanner'),
  ]);
}

function buildMoebelPage() {
  return page('Möbel', [
    section('1', [
      tile('image',
        ov('Das Sofa, das zu dir **zurückkommt**', 'Sofas, Betten, Schlafkomfort, Bad und mehr', '', [], 'Sofas entdecken'),
        'Hero Bild Wohnzimmer mit Sofa als Hauptmotiv.'
      ),
    ], 'hero.fullWidthHero'),

    // Sub Navigator 8
    section('4x2grid', [
      tile('image', ov('**SOFAS**'), 'Sub Tile Sofas, freigestelltes Sofa.'),
      tile('image', ov('**POLSTERBETTEN**'), 'Sub Tile Polsterbetten.'),
      tile('image', ov('**BOXSPRINGBETTEN**'), 'Sub Tile Boxspringbetten.'),
      tile('image', ov('**METALLBETTEN**'), 'Sub Tile Metallbetten.'),
      tile('image', ov('**KINDERBETTEN**'), 'Sub Tile Kinderbetten.'),
      tile('image', ov('**WOHNMÖBEL**', 'Wohn und Esszimmer'), 'Sub Tile Wohn Esszimmer Möbel.'),
      tile('image', ov('**MASSAGESESSEL**'), 'Sub Tile Massagesessel.'),
      tile('image', ov('**BÜROMÖBEL**'), 'Sub Tile Büromöbel.'),
    ], 'categoryNav.grid8tiles'),

    // Sub Navigator 4
    section('2x2wide', [
      tile('image', ov('**MATRATZEN**', 'Matratzen und Topper'), 'Sub Tile Matratzen.'),
      tile('image', ov('**SCHLAFKOMFORT**'), 'Sub Tile Schlafkomfort, Kissen und Decken.'),
      tile('image', ov('**SCHMINKTISCHE**'), 'Sub Tile Schminktische.'),
      tile('image', ov('**BADAUSSTATTUNG**'), 'Sub Tile Badausstattung.'),
    ], 'categoryNav.grid4wide'),

    // Shoppable Wohnzimmer
    section('1', [
      tile('shoppable_image',
        ov('Wohnzimmer, **komplett** gedacht', 'Sofa, Sessel, Beistelltisch, Lampe, Teppich'),
        'Shoppable Bild Wohnzimmer. 5 Hotspots auf Sofa, Relaxsessel, Akustikpaneele, Beistelltisch, Schminktisch.',
        { asins: ['B0CX1SJ9R1', 'B0DXFLWC1L', 'B0F8BR8ZW5', 'B0GX1BYJXM', 'B0FGDH2KMJ'] }
      ),
    ], 'products.shoppableFullWidth'),

    // Bestseller Wohnen Wohnmöbel + Sofas
    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Wohnstücke**'),
        'Bestseller Grid Sofa und Wohnmöbel.',
        { asins: topAsinsBySub('Möbel', 'Sofas', 1).concat(topAsinsBySub('Möbel', 'Wohnmöbel', 2), topAsinsBySub('Möbel', 'Massagesessel', 1), topAsinsBySub('Möbel', 'Büromöbel', 4)) }
      ),
    ], 'products.fullWidthGrid'),

    // Trenner Schlafen
    section('1', [
      tile('image', ov('Guter Schlaf ist **kein** Zufall'), 'Trenner Textbild. Leinen oder Bettwäsche Makro.'),
    ], 'hero.fullWidthHero'),

    // Shoppable Schlafzimmer
    section('1', [
      tile('shoppable_image',
        ov('Schlafzimmer, das **ankommt**', 'Boxspring, Matratze, Kissen, Schminktisch'),
        'Shoppable Bild Schlafzimmer. 5 Hotspots auf Bett, Matratze, Kissen, Topper, Schminktisch.',
        { asins: ['B07QWXMYV9', 'B0DM9FFLYF', 'B0D31GY3G4', 'B09PLDVF2L', 'B0FGDGNZNT'] }
      ),
    ], 'products.shoppableFullWidth'),

    // Bestseller Betten
    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Betten**'),
        'Bestseller Grid Polster, Boxspring, Metallbett.',
        { asins: topAsinsBySub('Möbel', 'Polsterbetten', 3).concat(topAsinsBySub('Möbel', 'Boxspringbetten', 2), topAsinsBySub('Möbel', 'Metallbetten', 2)) }
      ),
    ], 'products.fullWidthGrid'),

    // Shoppable Bad
    section('1', [
      tile('shoppable_image',
        ov('Das Bad, **klar** strukturiert', 'Wäschekörbe und Stauraum'),
        'Shoppable Bild Bad. 3 Hotspots auf Wäschekorb 100L, Wäschekorb Round, Wäschekorb Grau.',
        { asins: topAsinsBySub('Möbel', 'Badausstattung', 3) }
      ),
    ], 'products.shoppableFullWidth'),

    // USP Möbel
    section('vh-w2s', [
      tile('image', ov('Was **unsere** Möbel ausmacht'), 'Wide Bild. Plus 2 Squares mit USP Icons.'),
      tile('image', ov('**Pflegeleicht**'), 'Square mit grünem Icon Kreis Reißverschluss.'),
      tile('image', ov('**Solide** verarbeitet'), 'Square mit grünem Icon Kreis Schild Check.'),
    ], 'features.featureWideAnd2'),

    // Vollkatalog
    section('1', [
      tile('product_grid',
        ov('Alle **Möbel** Produkte im Überblick'),
        'Vollkatalog Möbel.',
        { asins: allAsinsByCat('Möbel') }
      ),
    ], 'products.fullWidthGrid'),

    // Cross Link
    section('1', [
      tile('image',
        ov('Praktisch fürs Zuhause, weiter zu **Haushalt**', '', '', [], 'Haushalt ansehen'),
        'Cross Sell Banner.',
        { linkUrl: linkTo('Haushalt') }
      ),
    ], 'footer.crossSellBanner'),
  ]);
}

function buildGartenPage() {
  return page('Garten', [
    section('1', [
      tile('image',
        ov('Die **Saison** beginnt hier', 'Lounge, Tische, Schatten und alles für draußen', '', [], 'Loungegruppen entdecken'),
        'Hero Bild Terrasse Abendlicht mit Loungegruppe und Sonnenschirm.'
      ),
    ], 'hero.fullWidthHero'),

    // Sub Navigator 8 Tiles
    section('4x2grid', [
      tile('image', ov('**GARTENMÖBEL** SETS'), 'Sub Tile Gartenmöbel Sets, freigestelltes Sitzgruppen Rendering.'),
      tile('image', ov('**GARTENAUFBEWAHRUNG**'), 'Sub Tile Gartenaufbewahrung, Gerätehaus Rendering.'),
      tile('image', ov('**GARTENBEDARF**'), 'Sub Tile Gartenbedarf, Schlauchtrommel oder Werkzeug Rendering.'),
      tile('image', ov('**SONNENSCHUTZ**', 'Sonnen und Sichtschutz'), 'Sub Tile Sonnenschutz, Sonnenschirm Rendering.'),
      tile('image', ov('**GARTENLIEGEN**'), 'Sub Tile Gartenliegen, Gartenliege Rendering.'),
      tile('image', ov('**GARTENBÄNKE**'), 'Sub Tile Gartenbänke, Gartenbank Rendering.'),
      tile('image', ov('**GARTENTISCHE**'), 'Sub Tile Gartentische, Gartentisch Rendering.'),
      tile('image', ov('**BIERZELT**'), 'Sub Tile Bierzeltgarnituren, Bierzeltgarnitur Rendering.'),
    ], 'categoryNav.grid8tiles'),

    // Sub Navigator 6 Tiles
    section('2s-4grid', [
      tile('image', ov('**HÄNGEMATTEN**'), 'Sub Tile Hängematten und Hängesessel.'),
      tile('image', ov('**ÜBERDACHUNGEN**'), 'Sub Tile Überdachungen, Pavillon Rendering.'),
      tile('image', ov('**POOLBEDARF**'), 'Sub Tile Poolbedarf.'),
      tile('image', ov('**GEWÄCHSHÄUSER**'), 'Sub Tile Gewächshäuser.'),
      tile('image', ov('**KISSENBOXEN**'), 'Sub Tile Kissenboxen, leer im Sortiment, optional ausblenden.'),
      tile('image', ov('**GRILLS**', 'Gas und Holzkohle'), 'Sub Tile Grills, leer im Sortiment, optional ausblenden.'),
    ], 'categoryNav.grid6tiles'),

    // Shoppable Loungegruppe
    section('1', [
      tile('shoppable_image',
        ov('Lounge, **gebaut** für lange Abende', 'Sofa, Sessel, Beistelltisch, Sonnenschirm, Kissen'),
        'Shoppable Bild Loungegruppe. 5 Hotspots auf Lounge Set, Beistelltisch, Sonnenschirm, Liegestuhl, Kissen.',
        { asins: topAsinsBySub('Garten', 'Gartenmöbel Sets', 5) }
      ),
    ], 'products.shoppableFullWidth'),

    // Bestseller Loungegruppen
    section('1', [
      tile('best_sellers',
        ov('Die beliebtesten **Loungegruppen**'),
        'Bestseller Grid Loungegruppen.',
        { asins: topAsinsBySub('Garten', 'Gartenmöbel Sets', 8) }
      ),
    ], 'products.fullWidthGrid'),

    // Trenner kleinere Flächen
    section('1', [
      tile('image', ov('Auch **kleinere** Flächen'), 'Trenner Textbild. Pflanzen oder Balkonszene Makro.'),
    ], 'hero.fullWidthHero'),

    // Shoppable Balkon
    section('1', [
      tile('shoppable_image',
        ov('Auch auf dem **Balkon**', 'Bistroset, Sonnensegel, Pflanzkübel'),
        'Shoppable Bild Balkon. 5 Hotspots auf Bistroset, Sichtschutz, Sonnenschirm, Hängematte, Pflanzen.',
        { asins: ['B0C6N1D6S1', 'B08L3V12L2', 'B07P7PRG78', 'B0BX3XGM2F', 'B0CRVS21Q6'] }
      ),
    ], 'products.shoppableFullWidth'),

    // Bestseller Mehr für draußen
    section('1', [
      tile('best_sellers',
        ov('Mehr **Lieblinge** für draußen', 'Sonnenschutz, Hängematten, Pool, Liegen'),
        'Bestseller Grid quer aus Sub Sonnenschutz, Hängematten, Pool, Gartenliegen.',
        { asins: topAsinsBySub('Garten', 'Sonnenschutz', 2)
            .concat(topAsinsBySub('Garten', 'Hängematten', 2),
                    topAsinsBySub('Garten', 'Poolbedarf', 2),
                    topAsinsBySub('Garten', 'Gartenliegen', 2)) }
      ),
    ], 'products.fullWidthGrid'),

    // USP Leiste Wetter (3 Icons existieren in Juskys CI)
    section('vh-w2s', [
      tile('image', ov('**Wetterfest** durch die Saison'), 'Wide Bild Saison. Plus 3 Wetter Icons.'),
      tile('image', ov('**UV** beständig'), 'Square mit grünem Icon Kreis Sonne.'),
      tile('image', ov('**Wasserabweisend**'), 'Square mit grünem Icon Kreis Regentropfen.'),
    ], 'features.featureWideAnd2'),

    // Vollkatalog Garten
    section('1', [
      tile('product_grid',
        ov('Alle **Garten** Produkte im Überblick', 'Sortiert nach Bestseller Rang'),
        'Vollkatalog. Alle Garten ASINs.',
        { asins: allAsinsByCat('Garten') }
      ),
    ], 'products.fullWidthGrid'),

    // Cross Link Möbel
    section('1', [
      tile('image',
        ov('Drinnen passend dazu, weiter zu **Möbel**', '', '', [], 'Möbel ansehen'),
        'Cross Sell Banner. Mini Bild Wohnraum.',
        { linkUrl: linkTo('Möbel') }
      ),
    ], 'footer.crossSellBanner'),
  ]);
}

// ─── BUILD ────────────────────────────────────────────────
// Output ist ein "rohes" Briefing JSON mit parentName Strings und
// linkUrl im Format 'page:Name'. Der Importer (src/briefingImport.js)
// macht die Resolution auf echte Page UIDs beim Laden ins Tool.

function buildStore() {
  var pages = [];

  pages.push(buildHomePage());
  pages.push(buildBestsellerPage());
  pages.push(buildGartenPage());
  pages.push(buildMoebelPage());
  pages.push(buildFreizeitPage());
  pages.push(buildHeimwerkenPage());
  pages.push(buildHaushaltPage());
  pages.push(buildTierbedarfPage());
  pages.push(buildSalePage());
  pages.push(buildUeberUnsPage());

  // 42 Subpages, eine pro Sub mit mindestens 1 ASIN
  buildAllSubpages().forEach(function(p) { pages.push(p); });

  // Tile IDs entfernen, parentId entfernen, IDs entfernen
  // damit der Importer eigene UIDs erzeugt
  pages.forEach(function(p) {
    delete p.id;
    if (!p.parentName) delete p.parentName;
    p.sections.forEach(function(sec) {
      delete sec.id;
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
