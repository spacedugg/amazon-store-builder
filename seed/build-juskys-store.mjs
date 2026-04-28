// seed/build-juskys-store.mjs
//
// Baut aus dem Briefing in briefings/juskys-store-briefing.md ein vollständiges
// Juskys Brand Store JSON. Importiert Schema Helfer aus src/constants.js,
// damit Tile Defaults und Validierung 1 zu 1 mit der App übereinstimmen.
//
// Aufruf:  node seed/build-juskys-store.mjs
// Output:  seed/juskys-store.json
// Stats:   wird auf stdout ausgegeben, inkl. validateStore() Resultat.

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { uid, emptyTileForLayout, validateStore } from '../src/constants.js';

var __dirname = dirname(fileURLToPath(import.meta.url));
var OUT_PATH = join(__dirname, 'juskys-store.json');
var HTML_LOADER_PATH = join(__dirname, 'juskys-store-loader.html');

// ─── Briefing Daten als JS Struktur ───────────────────────────────────────
//
// Vokabular entspricht briefings/juskys-store-briefing.md Kapitel 5.3:
//   Section: { layoutId, tiles: [...] }
//   Tile:    { type, textOverlay, brief, ctaText?, linkUrl?,
//              asinsPlaceholder?, hotspotsPlaceholder? }
//
// asinsPlaceholder landet später im asins Array als Stringliteral.
// hotspotsPlaceholder bleibt im Hotspots Array leer, aber der Hinweis
// wird in das brief Feld eingefügt damit Operator weiß was zu tun ist.

var TOP_LEVEL = {
  brandName: 'Juskys',
  marketplace: 'de',
  category: 'generic',
  headerBannerColor: '#93bd26',
  brandTone:
    'Nahbar, konkret, praktisch. Ohne Premium Pose, ohne Superlative. Duzen. ' +
    'Kein Schwarz, kein Em Dash, kein En Dash, kein Bindestrich mit Leerzeichen ' +
    'in kundensichtbaren Texten.',
  brandStory:
    'Juskys ist Teil eines familiengeführten Hauses in Süddeutschland. ' +
    'Wir gestalten Möbel und Produkte für Zuhause, Garten und Alltag. ' +
    'Klare Formen, ehrliche Materialien, faire Preise. ' +
    'Ein Sortiment für viele Lebensbereiche bei einem verlässlichen Anbieter.',
};

// Hilfsfunktion: knappe Tile Definition anlegen
function t(type, textOverlay, brief, extras) {
  var tile = { type: type, textOverlay: textOverlay || '', brief: brief || '' };
  if (extras) {
    if (extras.ctaText) tile.ctaText = extras.ctaText;
    if (extras.linkUrl) tile.linkUrl = extras.linkUrl;
    if (extras.asinsPlaceholder) tile.asinsPlaceholder = extras.asinsPlaceholder;
    if (extras.hotspotsPlaceholder) tile.hotspotsPlaceholder = extras.hotspotsPlaceholder;
  }
  return tile;
}

// ─── Pages ─────────────────────────────────────────────────────────────────

var PAGES = [];

// 6.1 Home, 11 Sections
PAGES.push({
  name: 'Home',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Räume, die **passen**',
        'Designer Komposition Wohnzimmer hell. Subline: Möbel und mehr für jeden Tag, aus einem Haus.',
        { ctaText: 'Sortiment entdecken' }),
    ] },
    { layoutId: '2s-4grid', tiles: [
      t('image', '**GARTEN**',     'Kategorie Tile Garten. Subline: Lounge, Tische, Schatten.',          { linkUrl: 'page:Garten' }),
      t('image', '**MÖBEL**',      'Kategorie Tile Möbel. Subline: Sofas, Betten, Bad.',                 { linkUrl: 'page:Möbel' }),
      t('image', '**FREIZEIT**',   'Kategorie Tile Freizeit. Subline: Camping, Koffer, Weihnachten.',    { linkUrl: 'page:Freizeit' }),
      t('image', '**HEIMWERKEN**', 'Kategorie Tile Heimwerken. Subline: Werkzeug, Leitern, Heizungen.',  { linkUrl: 'page:Heimwerken' }),
      t('image', '**HAUSHALT**',   'Kategorie Tile Haushalt. Subline: Küche, Stauraum, Alltagshilfen.',  { linkUrl: 'page:Haushalt' }),
      t('image', '**TIERBEDARF**', 'Kategorie Tile Tierbedarf. Subline: Hund, Katze, Freilauf.',         { linkUrl: 'page:Tierbedarf' }),
    ] },
    { layoutId: 'std-2equal', tiles: [
      t('image',      '',                          'Team oder Hallenbild aus juskys.de. Warmes Tageslicht, Mitarbeiter im Hintergrund.'),
      t('image_text', 'Ein **Haus**, viele Räume', 'Subline: Familiengeführt aus Süddeutschland. Plus Fließtext 55 Wörter Brand Story Kurzform.',
        { ctaText: 'Mehr über Juskys', linkUrl: 'page:Über Uns' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Räume, die **zusammen** passen',
        'Trenner Textbild. Stoff Makro auf hellem Grund. Anthrazit Text, ein Wort grün.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Ein Wohnzimmer, **fünf** Klicks',
        'Designer Komposition Wohnzimmer mit Sofa, Sessel, Beistelltisch, Lampe, Teppich. 5 Hotspots auf den jeweiligen Produkten platzieren.',
        { hotspotsPlaceholder: '<TOP-5-MOEBEL-WOHNEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die meistgekauften **Lieblinge**',
        'Top 8 Bestseller kategorieübergreifend.',
        { asinsPlaceholder: '<TOP-8-OVERALL>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Draußen ist auch ein **Zimmer**',
        'Trenner Textbild. Rattan oder Polyrattan Makro auf hellem Grund.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Draußen, so **gemütlich** wie drinnen',
        'Designer Komposition Terrasse Loungegruppe, Sonnenschirm, Beistelltisch, Outdoor Kissen. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-GARTEN-LOUNGE>' }),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**Aus** einem Haus',     'Marken USP Tile. Grüner Icon Kreis Haus, weiße Linie. Label darunter: Sortiment für Zuhause, Garten, Alltag.'),
      t('image', '**Schnell** geliefert',  'Marken USP Tile. Grüner Icon Kreis Truck, weiße Linie. Label: Mit Amazon Logistik.'),
      t('image', '**Montagefreundlich**',  'Marken USP Tile. Grüner Icon Kreis Schraubenschlüssel, weiße Linie. Label: Verständliche Anleitung.'),
      t('image', '**Familiengeführt**',    'Marken USP Tile. Grüner Icon Kreis Herz, weiße Linie. Label: Aus Süddeutschland.'),
    ] },
    { layoutId: '1', tiles: [
      t('image', '**Folge** Juskys',
        'Follow Banner auf Hellgrau. Hinweis dass neue Produkte und Aktionen direkt im Feed landen.',
        { ctaText: 'Folgen' }),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**GARTEN**',    'Footer Kategorie Tile mit Mini Icon.', { linkUrl: 'page:Garten' }),
      t('image', '**MÖBEL**',     'Footer Kategorie Tile mit Mini Icon.', { linkUrl: 'page:Möbel' }),
      t('image', '**HAUSHALT**',  'Footer Kategorie Tile mit Mini Icon.', { linkUrl: 'page:Haushalt' }),
      t('image', '**ÜBER** UNS',  'Footer Tile zur Brand Story.',         { linkUrl: 'page:Über Uns' }),
    ] },
  ],
});

// 6.2 Bestseller, 9 Sections
PAGES.push({
  name: 'Bestseller',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Was unsere **Kunden** lieben',
        'Designer Komposition Mix Lifestyle aus mehreren Kategorien. Subline: Die meistgekauften Juskys Produkte.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top **12** insgesamt',     '12 Top Bestseller über alle Kategorien.',  { asinsPlaceholder: '<TOP-12-OVERALL>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Garten**',        'Top 8 Bestseller aus Garten.',             { asinsPlaceholder: '<TOP-8-GARTEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Möbel**',         'Top 8 Bestseller aus Möbel.',              { asinsPlaceholder: '<TOP-8-MOEBEL>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Freizeit**',      'Top 6 Bestseller aus Freizeit.',           { asinsPlaceholder: '<TOP-6-FREIZEIT>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Heimwerken**',    'Top 6 Bestseller aus Heimwerken.',         { asinsPlaceholder: '<TOP-6-HEIMWERKEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Haushalt**',      'Top 8 Bestseller aus Haushalt.',           { asinsPlaceholder: '<TOP-8-HAUSHALT>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Top in **Tierbedarf**',    'Top 6 Bestseller aus Tierbedarf.',         { asinsPlaceholder: '<TOP-6-TIERBEDARF>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', 'Warum **diese** Bestseller', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Meistgekauft**',           'Square mit grünem Icon Kreis Stern.'),
      t('image', '**Top** bewertet',           'Square mit grünem Icon Kreis Schild Check.'),
    ] },
  ],
});

// 6.3 Garten, 13 Sections
PAGES.push({
  name: 'Garten',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Die **Saison** beginnt hier',
        'Designer Komposition Terrasse Abendlicht mit Loungegruppe und Sonnenschirm. Subline: Lounge, Tische, Schatten und alles für draußen.',
        { ctaText: 'Loungegruppen entdecken' }),
    ] },
    { layoutId: '4x2grid', tiles: [
      t('image', '**GARTENMÖBEL** SETS',     'Sub Kategorie Tile. Freigestelltes Sitzgruppen Rendering auf Beige.'),
      t('image', '**GARTENAUFBEWAHRUNG**',   'Sub Kategorie Tile. Gerätehaus oder Aufbewahrungsbox Rendering.'),
      t('image', '**GARTENBEDARF**',         'Sub Kategorie Tile. Pflanzkübel oder Gartenwerkzeug Rendering.'),
      t('image', '**SONNENSCHUTZ**',         'Sub Kategorie Tile. Sonnenschirm oder Sonnensegel Rendering. Subline: Sonnenschutz und Sichtschutz.'),
      t('image', '**GARTENLIEGEN**',         'Sub Kategorie Tile. Gartenliege Rendering.'),
      t('image', '**GARTENBÄNKE**',          'Sub Kategorie Tile. Gartenbank Rendering.'),
      t('image', '**GARTENTISCHE**',         'Sub Kategorie Tile. Gartentisch Rendering.'),
      t('image', '**BIERZELTGARNITUREN**',   'Sub Kategorie Tile. Bierzeltgarnitur Rendering.'),
    ] },
    { layoutId: '2s-4grid', tiles: [
      t('image', '**KISSENBOXEN**',     'Sub Kategorie Tile. Kissenbox Rendering.'),
      t('image', '**GRILLS**',          'Sub Kategorie Tile. Grill Rendering. Subline: Gas und Holzkohle.'),
      t('image', '**HÄNGEMATTEN**',     'Sub Kategorie Tile. Hängematte oder Hängesessel Rendering.'),
      t('image', '**ÜBERDACHUNGEN**',   'Sub Kategorie Tile. Pavillon oder Überdachung Rendering.'),
      t('image', '**POOLBEDARF**',      'Sub Kategorie Tile. Pool Zubehör Rendering.'),
      t('image', '**GEWÄCHSHÄUSER**',   'Sub Kategorie Tile. Gewächshaus Rendering.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Lounge, **gebaut** für lange Abende',
        'Designer Komposition Loungegruppe mit Sofa, Sessel, Beistelltisch, Outdoor Kissen, Pflanzkübel. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-GARTEN-LOUNGE>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Loungegruppen**',
        'Top 8 Bestseller aus Sub Gartenmöbel Sets.',
        { asinsPlaceholder: '<TOP-8-GARTEN-LOUNGE>' }),
    ] },
    { layoutId: 'lg-2stack', tiles: [
      t('image', 'Der **Schirm**, der Schatten macht',
        'Large Image Top Sonnenschirm aus Galerie. Designer Komposition mit Schirm im Garten.',
        { ctaText: 'Jetzt ansehen' }),
      t('image', '**UV** beständig',     'Wide Tile. USP Bullet zum Material und UV Schutz.'),
      t('image', '**Wasserabweisend**',  'Wide Tile. USP Bullet zur Witterungsfestigkeit.'),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Auch **kleinere** Flächen',
        'Trenner Textbild. Pflanzen oder Balkonszene Makro.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Auch auf dem **Balkon**',
        'Designer Komposition Balkon mit Bistroset, Sonnensegel, Pflanzkübel. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-GARTEN-BALKON>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Mehr **Lieblinge** für draußen',
        'Top 8 Bestseller aus Sonnenschutz, Hängematten, Poolbedarf gemischt.',
        { asinsPlaceholder: '<TOP-8-GARTEN-DIVERSE>' }),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Grillen, **stilvoll**',
        'Designer Komposition Grill Setup, Holzkohle oder Gas. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-GARTEN-GRILL>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**Wetterfest** durch die Saison',
        'Wide Image plus 3 Wetter Icons (existieren bereits in Juskys CI: Sonne, Regen, Schnee).'),
      t('image', '**UV** beständig',     'Square mit grünem Icon Kreis Sonne.'),
      t('image', '**Wasserabweisend**',  'Square mit grünem Icon Kreis Regentropfen.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Garten** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Garten, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-GARTEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Drinnen passend dazu, weiter zu **Möbel**',
        'Cross Sell Banner. Mini Bild Wohnraum.',
        { ctaText: 'Möbel ansehen', linkUrl: 'page:Möbel' }),
    ] },
  ],
});

// 6.4 Möbel, 14 Sections
PAGES.push({
  name: 'Möbel',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Das Sofa, das zu dir **zurückkommt**',
        'Designer Komposition Wohnzimmer mit Sofa als Hauptmotiv. Subline: Sofas, Betten, Schlafkomfort, Bad und mehr.',
        { ctaText: 'Sofas entdecken' }),
    ] },
    { layoutId: '4x2grid', tiles: [
      t('image', '**SOFAS**',             'Sub Kategorie Tile. Sofa Rendering freigestellt auf Beige.'),
      t('image', '**POLSTERBETTEN**',     'Sub Kategorie Tile. Polsterbett Rendering.'),
      t('image', '**BOXSPRINGBETTEN**',   'Sub Kategorie Tile. Boxspringbett Rendering.'),
      t('image', '**METALLBETTEN**',      'Sub Kategorie Tile. Metallbett Rendering.'),
      t('image', '**KINDERBETTEN**',      'Sub Kategorie Tile. Kinderbett Rendering.'),
      t('image', '**WOHNMÖBEL**',         'Sub Kategorie Tile. Subline: Wohn und Esszimmer Möbel. Sideboard oder Esstisch Rendering.'),
      t('image', '**MASSAGESESSEL**',     'Sub Kategorie Tile. Massagesessel Rendering.'),
      t('image', '**BÜROMÖBEL**',         'Sub Kategorie Tile. Schreibtisch oder Bürostuhl Rendering.'),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**MATRATZEN**',       'Sub Kategorie Tile. Subline: Matratzen und Topper. Matratze Rendering.'),
      t('image', '**SCHLAFKOMFORT**',   'Sub Kategorie Tile. Kissen oder Decke Rendering.'),
      t('image', '**SCHMINKTISCHE**',   'Sub Kategorie Tile. Schminktisch Rendering.'),
      t('image', '**BADAUSSTATTUNG**',  'Sub Kategorie Tile. Badmöbel Rendering.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Ein Wohnzimmer, **fünf** Klicks',
        'Designer Komposition Wohnzimmer mit Sofa, Sessel, Beistelltisch, Sideboard, Lampe. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-MOEBEL-WOHNEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Sofas**',
        'Top 8 Bestseller aus Sub Sofas.',
        { asinsPlaceholder: '<TOP-8-MOEBEL-SOFAS>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Guter Schlaf ist **kein** Zufall',
        'Trenner Textbild. Leinen oder Bettwäsche Makro auf hellem Grund.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Schlafzimmer, das **ankommt**',
        'Designer Komposition Schlafzimmer mit Boxspring, Nachttisch, Tischleuchte, Kommode, Kissen. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-MOEBEL-SCHLAFEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Betten**',
        'Top 8 Bestseller aus Polsterbetten, Boxspringbetten, Metallbetten gemischt.',
        { asinsPlaceholder: '<TOP-8-MOEBEL-BETTEN>' }),
    ] },
    { layoutId: 'lg-w2s', tiles: [
      t('image', '**Premium** Komfort',
        'Large Image Top ASIN aus Möbel (Boxspring oder Sofa). Designer Komposition. Headline kalibriert sich am Top ASIN.',
        { ctaText: 'Jetzt ansehen' }),
      t('image', '**Stoff**, der hält',     'Wide Tile. USP zum Bezugsmaterial.'),
      t('image', '**Komfort** Schaum',      'Small Square Tile. USP zum Polster.'),
      t('image', '**Stauraum** integriert', 'Small Square Tile. USP zum Bettkasten oder Stauraum.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', '**Komfort** für Wohnen und Arbeit',
        'Top 6 Bestseller aus Massagesesseln und Büromöbeln gemischt.',
        { asinsPlaceholder: '<TOP-6-MOEBEL-MASSAGE-BUERO>' }),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Das Bad, **klar** strukturiert',
        'Designer Komposition Bad mit Badmöbeln, Spiegel, Hochschrank. 5 Hotspots auf Badausstattung Produkten.',
        { hotspotsPlaceholder: '<TOP-5-MOEBEL-BAD>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', 'Was **unsere** Möbel ausmacht', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Bezug** abnehmbar',           'Square mit grünem Icon Kreis Reißverschluss.'),
      t('image', '**Stauraum** integriert',       'Square mit grünem Icon Kreis Box.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Möbel** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Möbel, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-MOEBEL>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Praktisch fürs Zuhause, weiter zu **Haushalt**',
        'Cross Sell Banner. Mini Bild Haushaltsszene.',
        { ctaText: 'Haushalt ansehen', linkUrl: 'page:Haushalt' }),
    ] },
  ],
});

// 6.5 Freizeit, 10 Sections
PAGES.push({
  name: 'Freizeit',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Raus, **erleben**, ankommen',
        'Designer Komposition Camping bei Sonnenuntergang (Sommer Default) oder Weihnachtsstimmung (Winter Variante November bis Januar). Saisonal austauschbar. Subline: Dachzelte, Camping, Koffer und Weihnachten.',
        { ctaText: 'Camping entdecken' }),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**DACHZELTE**',     'Sub Kategorie Tile. Dachzelt Rendering auf Auto.'),
      t('image', '**CAMPING**',       'Sub Kategorie Tile. Campingstuhl oder Camping Setup Rendering.'),
      t('image', '**KOFFER**',        'Sub Kategorie Tile. Kofferset Rendering.'),
      t('image', '**WEIHNACHTEN**',   'Sub Kategorie Tile saisonal. Weihnachtsdeko oder Beleuchtung Rendering. November bis Januar prominent, sonst dezent.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Camping, **leicht** gemacht',
        'Designer Komposition Outdoor Setup mit Zelt, Stuhl, Tisch, Lampe, Schlafsack. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-FREIZEIT-CAMPING>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Camping** Produkte',
        'Top 6 Bestseller aus Sub Camping.',
        { asinsPlaceholder: '<TOP-6-FREIZEIT-CAMPING>' }),
    ] },
    { layoutId: 'lg-2stack', tiles: [
      t('image', 'Dachzelt, **schnell** aufgebaut',
        'Large Image Top Dachzelt aus Galerie. Designer Komposition mit Auto und Zelt im Outdoor Setting.',
        { ctaText: 'Jetzt ansehen' }),
      t('image', '**Schnell** aufgebaut', 'Wide Tile. USP Bullet zum Aufbau in Minuten.'),
      t('image', '**Wetterfest**',        'Wide Tile. USP Bullet zur Witterungsfestigkeit.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Koffer**',
        'Top 6 Bestseller aus Sub Koffersets.',
        { asinsPlaceholder: '<TOP-6-FREIZEIT-KOFFER>' }),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Weihnachten **zuhause**',
        'Designer Komposition Weihnachtsszene mit Beleuchtung, Deko, Pflanzkübeln. Saisonal aktiv November bis Januar. 5 Hotspots.',
        { hotspotsPlaceholder: '<TOP-5-FREIZEIT-WEIHNACHT>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', 'Für **draußen** gebaut', 'Wide Image. Plus 2 Squares mit Outdoor Icons.'),
      t('image', '**Wetterfest**',         'Square mit grünem Icon Kreis Regentropfen.'),
      t('image', '**Leicht** verstaut',    'Square mit grünem Icon Kreis Box.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Freizeit** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Freizeit inklusive Weihnachten, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-FREIZEIT>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Auch fürs Zuhause draußen, weiter zu **Garten**',
        'Cross Sell Banner. Mini Bild Garten.',
        { ctaText: 'Garten ansehen', linkUrl: 'page:Garten' }),
    ] },
  ],
});

// 6.6 Heimwerken, 10 Sections
PAGES.push({
  name: 'Heimwerken',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Werkzeug, das **arbeitet**',
        'Designer Komposition Werkstatt oder Werkzeug Setup auf Werkbank. Subline: Werkzeug, Leitern, Sackkarren, Kamine, Heizungen.',
        { ctaText: 'Werkzeug entdecken' }),
    ] },
    { layoutId: '2s-4grid', tiles: [
      t('image', '**WERKZEUG**',       'Sub Kategorie Tile als Wide. Werkzeug Set Rendering.'),
      t('image', '**LEITERN**',        'Sub Kategorie Tile als Wide. Subline: Multifunktionsleitern. Leiter Rendering.'),
      t('image', '**SACKKARREN**',     'Sub Kategorie Tile. Sackkarre Rendering.'),
      t('image', '**ELEKTROKAMINE**',  'Sub Kategorie Tile. Elektrokamin Rendering.'),
      t('image', '**HEIZUNGEN**',      'Sub Kategorie Tile. Heizgerät Rendering.'),
      t('image', '**ROBUST** gebaut',  'Filler Tile mit Marken USP statt sechster Sub Kategorie. Grünes Icon Kreis Werkzeug Kombi.'),
    ] },
    { layoutId: 'lg-2stack', tiles: [
      t('image', 'Robust **gebaut**',
        'Large Image Top Werkzeug aus Galerie. Designer Komposition mit Werkzeug in Hand oder auf Werkbank.',
        { ctaText: 'Jetzt ansehen' }),
      t('image', '**Stark** belastbar',  'Wide Tile. USP Bullet zur Belastung.'),
      t('image', '**Sicher** im Einsatz', 'Wide Tile. USP Bullet zur Sicherheit.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Werkzeuge**',
        'Top 8 Bestseller aus Sub Werkzeug.',
        { asinsPlaceholder: '<TOP-8-HEIMWERKEN-WERKZEUG>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', '**Stark** im Alltag',
        'Top 6 Bestseller aus Multifunktionsleitern und Sackkarren gemischt.',
        { asinsPlaceholder: '<TOP-6-HEIMWERKEN-LEITERN-SACK>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Wärme, **wenn** es kalt wird',
        'Trenner Textbild. Holzfeuer oder Heizstrahler Makro auf hellem Grund.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Wärme zum **Einschalten**',
        'Top 6 Bestseller aus Elektrokaminen und Heizungen gemischt.',
        { asinsPlaceholder: '<TOP-6-HEIMWERKEN-KAMIN-HEIZ>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**Robust**, sicher, durchdacht', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Belastbar**',                  'Square mit grünem Icon Kreis Werkzeug Kombi.'),
      t('image', '**Sicher**',                     'Square mit grünem Icon Kreis Schild Check.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Heimwerken** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Heimwerken, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-HEIMWERKEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Praktisch fürs Haus, weiter zu **Haushalt**',
        'Cross Sell Banner. Mini Bild Haushaltsszene.',
        { ctaText: 'Haushalt ansehen', linkUrl: 'page:Haushalt' }),
    ] },
  ],
});

// 6.7 Haushalt, 12 Sections
PAGES.push({
  name: 'Haushalt',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Alltag, **leichter** gemacht',
        'Designer Komposition Küche oder Hauswirtschaftsraum mit mehreren Helfern. Subline: Aufbewahrung, Küche, Bad, Kinder, Alltagshilfen.',
        { ctaText: 'Sortiment entdecken' }),
    ] },
    { layoutId: '4x2grid', tiles: [
      t('image', '**SCHWERLASTREGALE**',     'Sub Kategorie Tile. Schwerlastregal Rendering.'),
      t('image', '**AUFBEWAHRUNG**',         'Sub Kategorie Tile. Boxen oder Aufbewahrungssystem Rendering.'),
      t('image', '**KÜCHENGERÄTE**',         'Sub Kategorie Tile. Küchengerät Rendering.'),
      t('image', '**MÜLLEIMER**',            'Sub Kategorie Tile. Mülleimer Rendering.'),
      t('image', '**WÄSCHESAMMLER**',        'Sub Kategorie Tile. Wäschesammler Rendering.'),
      t('image', '**EISWÜRFELMASCHINEN**',   'Sub Kategorie Tile. Eiswürfelmaschine Rendering.'),
      t('image', '**HEIZGERÄTE**',           'Sub Kategorie Tile. Heizgerät Rendering.'),
      t('image', '**ALLTAGSHILFEN**',        'Sub Kategorie Tile. Alltagshelfer Rendering.'),
    ] },
    { layoutId: 'std-2equal', tiles: [
      t('image', '**KINDERBEDARF**',     'Sub Kategorie Tile als Large Square. Kinderausstattung Rendering.'),
      t('image', '**Praktisch** im Alltag', 'Highlight Tile. Marken USP plus Icon Kreis Box.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Küche, **alles** zur Hand',
        'Designer Komposition Küche mit Geräten und Helfern auf der Arbeitsfläche. 5 Hotspots auf Küchengeräte ASINs.',
        { hotspotsPlaceholder: '<TOP-5-HAUSHALT-KUECHE>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Küchengeräte**',
        'Top 8 Bestseller aus Sub Küchengeräte.',
        { asinsPlaceholder: '<TOP-8-HAUSHALT-KUECHE>' }),
    ] },
    { layoutId: '1', tiles: [
      t('image', 'Stauraum, **klar** sortiert',
        'Trenner Textbild. Lager oder Regal Makro auf hellem Grund.'),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', '**Mehr** Stauraum',
        'Top 6 Bestseller aus Schwerlastregalen und Aufbewahrung gemischt.',
        { asinsPlaceholder: '<TOP-6-HAUSHALT-STAURAUM>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Ordnung, **gerne**',
        'Top 6 Bestseller aus Mülleimern und Wäschesammlern gemischt.',
        { asinsPlaceholder: '<TOP-6-HAUSHALT-MUELL-WAESCHE>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Eis, Wärme, **fertig**',
        'Top 4 Bestseller aus Eiswürfelmaschinen und Heizgeräten gemischt.',
        { asinsPlaceholder: '<TOP-4-HAUSHALT-EIS-HEIZ>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Hilfe im **Alltag**',
        'Top 6 Bestseller aus Kinderbedarf und Alltagshilfen gemischt.',
        { asinsPlaceholder: '<TOP-6-HAUSHALT-KINDER-ALLTAG>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**Praktisch** im Alltag', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Durchdacht**',          'Square mit grünem Icon Kreis Schild Check.'),
      t('image', '**Langlebig**',           'Square mit grünem Icon Kreis Stern.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Haushalt** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Haushalt, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-HAUSHALT>' }),
    ] },
  ],
});

// 6.8 Tierbedarf, 8 Sections
PAGES.push({
  name: 'Tierbedarf',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Für **deinen** Liebling',
        'Designer Komposition mit Hund oder Katze in Wohnsetting oder Garten. Subline: Katze, Hund, Freilauf.',
        { ctaText: 'Sortiment entdecken' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**FREILAUFGEHEGE**', 'Wide Tile. Freilaufgehege Rendering im Garten.'),
      t('image', '**HUND**',           'Square Tile. Hundebedarf Rendering.'),
      t('image', '**KATZE**',          'Square Tile. Katzenbedarf Rendering.'),
    ] },
    { layoutId: '1', tiles: [
      t('shoppable_image', 'Freilauf, **sicher** und groß',
        'Designer Komposition Garten mit Freilaufgehege, Hund oder Kleintier, Zubehör. 5 Hotspots auf Freilaufgehege ASINs und Zubehör.',
        { hotspotsPlaceholder: '<TOP-5-TIER-FREILAUF>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Die beliebtesten **Gehege**',
        'Top 6 Bestseller aus Sub Freilaufgehege.',
        { asinsPlaceholder: '<TOP-6-TIER-FREILAUF>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Für den **Hund** zuhause',
        'Top 6 Bestseller aus Sub Hundebedarf.',
        { asinsPlaceholder: '<TOP-6-TIER-HUND>' }),
    ] },
    { layoutId: '1', tiles: [
      t('best_sellers', 'Für die **Katze** zuhause',
        'Top 6 Bestseller aus Sub Katzenbedarf.',
        { asinsPlaceholder: '<TOP-6-TIER-KATZE>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**Sicher**, robust, einfach', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Stabil**',                  'Square mit grünem Icon Kreis Werkzeug Kombi für Robustheit.'),
      t('image', '**Tierfreundlich**',          'Square mit grünem Icon Kreis Pfote.'),
    ] },
    { layoutId: '1', tiles: [
      t('product_grid', 'Alle **Tierbedarf** Produkte im Überblick',
        'Vollabdeckung. Alle ASINs der Hauptkategorie Tierbedarf, sortiert nach Bestseller Rang.',
        { asinsPlaceholder: '<ALL-TIERBEDARF>' }),
    ] },
  ],
});

// 6.9 Sale, 10 Sections
PAGES.push({
  name: 'Sale',
  sections: [
    { layoutId: '1', tiles: [
      t('image', '**Aktuell** reduziert',
        'Designer Komposition Mix mit Reduziert Optik. Subline: Aktionen quer durch alle Kategorien.',
        { ctaText: 'Aktionen ansehen' }),
    ] },
    { layoutId: '2s-4grid', tiles: [
      t('image', 'Sale **GARTEN**',     'Filter Tile zur Sale Kategorie Garten.'),
      t('image', 'Sale **MÖBEL**',      'Filter Tile zur Sale Kategorie Möbel.'),
      t('image', 'Sale **FREIZEIT**',   'Filter Tile zur Sale Kategorie Freizeit.'),
      t('image', 'Sale **HEIMWERKEN**', 'Filter Tile zur Sale Kategorie Heimwerken.'),
      t('image', 'Sale **HAUSHALT**',   'Filter Tile zur Sale Kategorie Haushalt.'),
      t('image', 'Sale **TIERBEDARF**', 'Filter Tile zur Sale Kategorie Tierbedarf.'),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Top **12** Aktionen',  'Top 12 reduzierte ASINs nach Höhe der Reduzierung.', { asinsPlaceholder: '<DEALS-TOP-12>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Garten**',      'Reduzierte ASINs aus Hauptkategorie Garten.',     { asinsPlaceholder: '<DEALS-GARTEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Möbel**',       'Reduzierte ASINs aus Hauptkategorie Möbel.',      { asinsPlaceholder: '<DEALS-MOEBEL>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Freizeit**',    'Reduzierte ASINs aus Hauptkategorie Freizeit.',   { asinsPlaceholder: '<DEALS-FREIZEIT>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Heimwerken**',  'Reduzierte ASINs aus Hauptkategorie Heimwerken.', { asinsPlaceholder: '<DEALS-HEIMWERKEN>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Haushalt**',    'Reduzierte ASINs aus Hauptkategorie Haushalt.',   { asinsPlaceholder: '<DEALS-HAUSHALT>' }),
    ] },
    { layoutId: '1', tiles: [
      t('deals', 'Sale **Tierbedarf**',  'Reduzierte ASINs aus Hauptkategorie Tierbedarf.', { asinsPlaceholder: '<DEALS-TIERBEDARF>' }),
    ] },
    { layoutId: 'vh-w2s', tiles: [
      t('image', '**Warum** lohnt sich Sale', 'Wide Image. Plus 2 Squares mit USP Icons.'),
      t('image', '**Echt** reduziert',        'Square mit grünem Icon Kreis Stern.'),
      t('image', '**Schnell** weg',           'Square mit grünem Icon Kreis Truck.'),
    ] },
  ],
});

// 6.10 Über Uns, 6 Sections
PAGES.push({
  name: 'Über Uns',
  sections: [
    { layoutId: '1', tiles: [
      t('image', 'Ein **Haus**, viele Räume',
        'Portrait oder Halle aus juskys.de. Warmes Tageslicht. Subline: Familiengeführt aus Süddeutschland.'),
    ] },
    { layoutId: 'std-2equal', tiles: [
      t('image',      '',                                       'Hallenbild oder Team aus juskys.de. Bild trägt allein.'),
      t('image_text', 'Familiengeführt aus **Süddeutschland**', 'Fließtext ca. 120 Wörter Brand Story Lang. ⚠️ Inhalt vom Kunden freizugeben. Themen: Gründung, Familie, Entwicklung, aktuelle Ausrichtung.'),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**Durchdacht**',     'Wert Tile. Subline: Wir entwickeln vom Alltag her. Foto aus Website.'),
      t('image', '**Zugänglich**',     'Wert Tile. Subline: Für jede Lebensphase und jedes Budget. Foto aus Website.'),
      t('image', '**Verlässlich**',    'Wert Tile. Subline: Qualität, die bleibt. Service, der reagiert. Foto aus Website.'),
      t('image', '**Familiengeführt**', 'Wert Tile. Subline: Aus Süddeutschland. Foto Familie oder Team.'),
    ] },
    { layoutId: '2s-4grid', tiles: [
      t('image', '', 'Wide Galerie Bild Lager.'),
      t('image', '', 'Wide Galerie Bild Designbereich.'),
      t('image', '', 'Square Galerie Bild Qualitätscheck.'),
      t('image', '', 'Square Galerie Bild Showroom.'),
      t('image', '', 'Square Galerie Bild Mitarbeiter.'),
      t('image', '', 'Square Galerie Bild Gebäude oder Standort.'),
    ] },
    { layoutId: '2x2wide', tiles: [
      t('image', '**Aus** einem Haus',     'Marken USP Tile. Grüner Icon Kreis Haus.'),
      t('image', '**Schnell** geliefert',  'Marken USP Tile. Grüner Icon Kreis Truck.'),
      t('image', '**Montagefreundlich**',  'Marken USP Tile. Grüner Icon Kreis Schraubenschlüssel.'),
      t('image', '**Familiengeführt**',    'Marken USP Tile. Grüner Icon Kreis Herz.'),
    ] },
    { layoutId: '1', tiles: [
      t('image', '**Service**, der reagiert',
        'Service Block auf Hellgrau. Icons für Kontakt, Versand, Rücksendung.',
        { ctaText: 'Kontakt aufnehmen' }),
    ] },
  ],
});

// ─── Store Objekt aufbauen ────────────────────────────────────────────────

function buildTile(briefTile, layoutId, tileIndex) {
  // Basis aus emptyTileForLayout, dann Briefing Werte überschreiben
  var base = emptyTileForLayout(layoutId, tileIndex);
  var tile = Object.assign({}, base, {
    type: briefTile.type,
    textOverlay: briefTile.textOverlay || '',
    brief: briefTile.brief || '',
    ctaText: briefTile.ctaText || '',
    linkUrl: briefTile.linkUrl || '',
    asins: [],
    hotspots: [],
  });

  // ASIN Platzhalter als Stringliteral in asins Array (für product_grid,
  // best_sellers, deals, recommended Tiles).
  if (briefTile.asinsPlaceholder) {
    tile.asins = [briefTile.asinsPlaceholder];
  }

  // Hotspots Platzhalter, das eigentliche Hotspots Array bleibt leer
  // (validateStore prüft Hotspots erst wenn welche da sind). Der Platzhalter
  // landet als Hinweis im brief Feld, damit ein Operator weiß welche 5 ASINs
  // er als Hotspots eintragen soll.
  if (briefTile.hotspotsPlaceholder) {
    var note = ' [Hotspots Platzhalter: ' + briefTile.hotspotsPlaceholder +
      '. Manuell durch 5 ASINs aus dieser Liste ersetzen, max 5 Hotspots.]';
    tile.brief = tile.brief + note;
  }

  return tile;
}

function buildSection(briefSection) {
  return {
    id: uid(),
    layoutId: briefSection.layoutId,
    tiles: briefSection.tiles.map(function(briefTile, ti) {
      return buildTile(briefTile, briefSection.layoutId, ti);
    }),
  };
}

function buildPage(briefPage) {
  return {
    id: uid(),
    name: briefPage.name,
    sections: briefPage.sections.map(buildSection),
  };
}

var store = {
  brandName: TOP_LEVEL.brandName,
  marketplace: TOP_LEVEL.marketplace,
  // 270 ASINs werden später vom Operator extern eingespielt. Top Level Liste
  // bleibt vorerst leer, damit das Schema valide ist und keine Phantom ASINs
  // im Store stehen.
  asins: [],
  products: [],
  pages: PAGES.map(buildPage),
  brandTone: TOP_LEVEL.brandTone,
  brandStory: TOP_LEVEL.brandStory,
  headerBanner: null,
  headerBannerMobile: null,
  headerBannerColor: TOP_LEVEL.headerBannerColor,
  category: TOP_LEVEL.category,
  googleDriveUrl: '',
};

// ─── Schreiben ────────────────────────────────────────────────────────────

mkdirSync(__dirname, { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(store, null, 2), 'utf8');

// ─── HTML Loader Datei mit eingebettetem JSON ─────────────────────────────
//
// Dieser Loader funktioniert ohne Terminal. Datei per Doppelklick im Browser
// öffnen, Vercel URL eintragen, Hochladen klicken. Ruft POST /api/stores
// mit Body { data: store } auf, exakt wie die Server API erwartet.

function buildLoaderHtml(storeJson) {
  // Wir betten den Store als JSON String in einem script Tag ein. Damit der
  // Browser den Inhalt nicht als HTML interpretiert, escapen wir die Zeichen
  // </ und <! defensiv.
  var safeJson = storeJson
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--');
  return [
    '<!doctype html>',
    '<html lang="de"><head><meta charset="utf-8">',
    '<title>Juskys Store hochladen</title>',
    '<style>',
    '  body { font-family: -apple-system, system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #222; }',
    '  h1 { font-size: 22px; margin-bottom: 4px; }',
    '  p.lead { color: #555; margin-top: 4px; }',
    '  label { display: block; font-size: 13px; font-weight: 600; margin-top: 18px; margin-bottom: 6px; }',
    '  input[type=url] { width: 100%; padding: 10px 12px; font-size: 15px; border: 1px solid #ccc; border-radius: 6px; box-sizing: border-box; }',
    '  button { margin-top: 16px; padding: 12px 18px; font-size: 15px; font-weight: 600; background: #93bd26; color: #fff; border: 0; border-radius: 6px; cursor: pointer; }',
    '  button:disabled { opacity: 0.6; cursor: wait; }',
    '  .stats { background: #f5f5f5; padding: 12px 14px; border-radius: 6px; font-size: 13px; line-height: 1.6; margin-top: 18px; }',
    '  .stats b { display: inline-block; min-width: 110px; }',
    '  .result { margin-top: 24px; padding: 14px 16px; border-radius: 6px; font-size: 14px; line-height: 1.5; }',
    '  .result.ok { background: #eaf5d6; border: 1px solid #93bd26; }',
    '  .result.err { background: #fdecea; border: 1px solid #e74c3c; color: #a01a10; white-space: pre-wrap; }',
    '  code { font-family: ui-monospace, Menlo, monospace; background: #fff; padding: 1px 5px; border-radius: 3px; border: 1px solid #ddd; }',
    '  a { color: #4f5969; }',
    '  ol { padding-left: 18px; line-height: 1.7; }',
    '</style></head><body>',
    '<h1>Juskys Store hochladen</h1>',
    '<p class="lead">Lädt das fertige Store JSON in deine laufende Vercel App. Kein Terminal nötig.</p>',
    '<div class="stats" id="stats">Wird geladen...</div>',
    '<label for="url">URL deines Store Builders</label>',
    '<input id="url" type="url" placeholder="https://amazon-store-builder.vercel.app" />',
    '<button id="go">Store hochladen</button>',
    '<div id="result"></div>',
    '<ol style="margin-top:28px;color:#555;font-size:13px;">',
    '  <li>URL oben eintragen, ohne Pfad. Beispiel: <code>https://amazon-store-builder.vercel.app</code></li>',
    '  <li>Auf Store hochladen klicken. Du bekommst danach einen Share Link.</li>',
    '  <li>Im offenen Builder Tab links auf <b>+ Import Store</b> klicken, den Share Link einfügen, Enter.</li>',
    '</ol>',
    '<script>',
    'var STORE = ' + safeJson + ';',
    '(function() {',
    '  var pages = (STORE.pages || []).length;',
    '  var sections = 0, tiles = 0, shoppable = 0;',
    '  (STORE.pages || []).forEach(function(p) { sections += (p.sections || []).length; (p.sections || []).forEach(function(s) { tiles += (s.tiles || []).length; (s.tiles || []).forEach(function(t) { if (t.type === "shoppable_image") shoppable++; }); }); });',
    '  document.getElementById("stats").innerHTML = ',
    '    "<b>Brand:</b> " + (STORE.brandName || "?") + "<br>" +',
    '    "<b>Marketplace:</b> " + (STORE.marketplace || "?") + "<br>" +',
    '    "<b>Pages:</b> " + pages + "<br>" +',
    '    "<b>Sections:</b> " + sections + "<br>" +',
    '    "<b>Tiles:</b> " + tiles + " (davon " + shoppable + " Shoppable Image)";',
    '  // Wenn die HTML aus einem Server Tab geöffnet wird, URL voreintragen',
    '  if (location.protocol !== "file:" && location.host) {',
    '    document.getElementById("url").value = location.protocol + "//" + location.host;',
    '  }',
    '})();',
    'document.getElementById("go").addEventListener("click", async function() {',
    '  var btn = this;',
    '  var resultEl = document.getElementById("result");',
    '  resultEl.innerHTML = "";',
    '  resultEl.className = "";',
    '  var rawUrl = document.getElementById("url").value.trim();',
    '  if (!rawUrl) { resultEl.className = "result err"; resultEl.textContent = "Bitte URL eintragen."; return; }',
    '  var base = rawUrl.replace(/\\/+$/, "");',
    '  var endpoint = base + "/api/stores";',
    '  btn.disabled = true; btn.textContent = "Lade hoch...";',
    '  try {',
    '    var res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: STORE }) });',
    '    var text = await res.text();',
    '    var body = null; try { body = JSON.parse(text); } catch (e) {}',
    '    if (!res.ok) {',
    '      resultEl.className = "result err";',
    '      resultEl.textContent = "HTTP " + res.status + " " + res.statusText + "\\n" + text;',
    '      return;',
    '    }',
    '    var id = body && body.id;',
    '    var token = body && body.shareToken;',
    '    var shareLink = base + "/share/" + token;',
    '    resultEl.className = "result ok";',
    '    resultEl.innerHTML = "<b>Store erfolgreich angelegt.</b><br>" +',
    '      "id: <code>" + (id || "?") + "</code><br>" +',
    '      "shareToken: <code>" + (token || "?") + "</code><br><br>" +',
    '      "Share Link für Import in der App:<br>" +',
    '      "<code>" + shareLink + "</code><br><br>" +',
    '      "<a href=\\"" + shareLink + "\\" target=\\"_blank\\">Share Link in neuem Tab öffnen</a> (zur Kontrolle).";',
    '  } catch (e) {',
    '    resultEl.className = "result err";',
    '    resultEl.textContent = "Verbindung fehlgeschlagen: " + (e && e.message ? e.message : e);',
    '  } finally {',
    '    btn.disabled = false; btn.textContent = "Store hochladen";',
    '  }',
    '});',
    '</script>',
    '</body></html>',
  ].join('\n');
}

writeFileSync(HTML_LOADER_PATH, buildLoaderHtml(JSON.stringify(store)), 'utf8');

// ─── Statistik und Validierung ────────────────────────────────────────────

var stats = {
  pages: store.pages.length,
  sections: 0,
  tiles: 0,
  shoppableTiles: 0,
  asinPlaceholders: 0,
  hotspotPlaceholders: 0,
};

store.pages.forEach(function(pg) {
  stats.sections += pg.sections.length;
  pg.sections.forEach(function(sec) {
    stats.tiles += sec.tiles.length;
    sec.tiles.forEach(function(tile) {
      if (tile.type === 'shoppable_image') stats.shoppableTiles++;
      if (Array.isArray(tile.asins)) {
        tile.asins.forEach(function(a) {
          if (typeof a === 'string' && a.indexOf('<') === 0) stats.asinPlaceholders++;
        });
      }
      if (typeof tile.brief === 'string' && tile.brief.indexOf('Hotspots Platzhalter:') >= 0) {
        stats.hotspotPlaceholders++;
      }
    });
  });
});

var warnings = validateStore(store);
var errors = warnings.filter(function(w) { return w.level === 'error'; });
var nonErrorWarnings = warnings.filter(function(w) { return w.level !== 'error'; });

console.log('');
console.log('Juskys Brand Store gebaut nach:');
console.log('  ' + OUT_PATH);
console.log('');
console.log('Statistik:');
console.log('  Pages:                ' + stats.pages);
console.log('  Sections:             ' + stats.sections);
console.log('  Tiles:                ' + stats.tiles);
console.log('  Shoppable Image:      ' + stats.shoppableTiles);
console.log('  ASIN Platzhalter:     ' + stats.asinPlaceholders);
console.log('  Hotspot Platzhalter:  ' + stats.hotspotPlaceholders);
console.log('');
console.log('Validierung:');
console.log('  Errors:               ' + errors.length);
console.log('  Warnings + Info:      ' + nonErrorWarnings.length);

if (errors.length > 0) {
  console.log('');
  console.log('FEHLER:');
  errors.forEach(function(w) { console.log('  - ' + w.message); });
  process.exit(1);
}

if (nonErrorWarnings.length > 0) {
  console.log('');
  console.log('Hinweise (kein Blocker):');
  // Gruppieren nach level
  var byLevel = {};
  nonErrorWarnings.forEach(function(w) {
    byLevel[w.level] = (byLevel[w.level] || 0) + 1;
  });
  Object.keys(byLevel).forEach(function(lvl) {
    console.log('  ' + lvl + ': ' + byLevel[lvl]);
  });
}
console.log('');
console.log('Fertig.');
