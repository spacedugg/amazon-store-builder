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
      tile('image', ov('Warum **diese** Bestseller'), 'Wide Image. Plus 2 Squares mit USP Icons.'),
      tile('image', ov('**Meistgekauft**'), 'Square mit grünem Icon Kreis Stern.'),
      tile('image', ov('**Inhabergeführt**'), 'Square mit grünem Icon Kreis Haus.'),
    ], 'features.featureWideAnd2'),
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

function buildStore() {
  var pages = [];

  pages.push(buildHomePage());
  pages.push(buildBestsellerPage());
  pages.push(buildGartenPage());
  pages.push(buildMoebelPage());
  // weitere Pages folgen in nächsten Schritten

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
