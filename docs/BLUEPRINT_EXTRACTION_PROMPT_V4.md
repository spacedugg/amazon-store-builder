# Blueprint Extraktion Prompt v4 (Modul Beziehung, Voice Marker, Hero Archetype)

Dieses Dokument ersetzt v3 (`BLUEPRINT_EXTRACTION_PROMPT.md`). v3 bleibt
zur Referenz erhalten, neue Analysen laufen ausschliesslich nach v4.

## Diff v3 zu v4

**Neu in v4**

- Pro Modul vier Beziehungs Felder: `relationToPrevious`, `relationToNext`,
  `visualBridge`, `copyBridge`. Module werden nicht mehr isoliert betrachtet,
  sondern in ihrer Sequenz Logik. Kern Anliegen dieser Iteration.
- Pro Hero Modul ein Feld `heroArchetype` als **offene Enum**. Bekannte
  Werte stehen in `data/store-knowledge/_hero_archetype_vocabulary.md`,
  jeder neue Wert wird beim Anlegen dort dokumentiert. Keine fixe Liste,
  weil Brand Kategorien (Sport, Fashion, Tech, Food) je eigene Archetypen
  hervorbringen, die wir vorab nicht kennen.
- Pro Page ein Block `voiceMarkers` mit fuenf Tag Feldern plus ein Array
  `voiceExamples` mit drei woertlichen Beispielsaetzen aus dem echten
  Store. Das ist der Tonalitaets Anker fuer die spaetere Generierung.

**Raus in v4**

- Sektion 5 `backgroundStyle` plus `backgroundDetail` komplett, samt
  Tile Level Spiegel und Validierungspunkt. Hintergrund Klassifikation
  ist Designer Aufgabe, nicht Generierungs Input.
- Tile Level Felder `dominantColors` und `dominantColorsHex`. Farb CI
  laeuft beim Designer separat ueber den CI Analyzer im Tool.
- Validierungspunkt 4 (backgroundStyle Pruefung) faellt weg.

**Unveraendert**

`layoutType` (29 geschlossen), `layoutShape` (8), `imageCategory` (7),
`textOnImage` Struktur, `textType` (12), `origin` (5), `designIntent` (7),
`toolTileType`, `toolImageType`, `link`, `tileContentTopic`,
`elementProportions`, Page Level Felder ausser den entfernten Farben,
Phasen Workflow, Typografie Regel, Phase Grenzen.

## 0. Phased Workflow, Kurzfassung

| Phase | Wer fuehrt aus | Input | Output | Tool |
|-------|----------------|-------|--------|------|
| 1 DOM | Cowork (Chrome MCP) | Live amazon.de Seite | `raw-dom/*.json` pro Seite | `scripts/extract-page-dom.js` |
| 2 Vision | Cowork (Full Page Screenshot plus Vision Modell) | Phase 1 Output plus Screenshot | v4 Blueprint pro Seite, volles Schema | Diesen Prompt hier |
| 3 Brand Identity | Claude Code (Text Synthese) | Alle v4 Blueprints eines Stores | `storeAnalysis` Block im `<store>_analysis.json` | Synthese Template in `docs/NE_BRAND_IDENTITY_PASS.md` |

Phase 1 liefert die Geruest Ebene (Module, Tiles, Headlines, CTAs, Link
Ziele, Bild URLs, Video Counts). Phase 2 liefert die Bild und Bedeutungs
Ebene plus die neuen Beziehungs und Voice Felder. Phase 3 liefert die
Marken Ebene (USPs, Tonalitaet, Positioning ueber alle Seiten).

## 1. Modul Segmentierung (gilt fuer Phase 1 und Phase 2)

Ein **Modul** ist ein DOM gebundener horizontaler Block, extrahiert via
`a-row.stores-row` in Phase 1. In Phase 2 uebernimmst du diese Modul
grenzen und verfeinerst nur die inhaltlichen Felder.

Regeln:

- Jedes eigenstaendige Full Width Element (Banner, Hero, USP Bar,
  Editorial Bild, Produktberater) ist ein Modul.
- Drei untereinander stehende Full Width Banner sind drei Module, auch
  wenn sie semantisch zusammengehoeren. Die Zusammengehoerigkeit wird in
  v4 ueber die neuen Beziehungs Felder explizit gemacht.
- Echte Grid Container (2x2, 1x4, 4x2, 3x1) zaehlen als ein Modul mit
  mehreren Tiles.
- Amazon Systemkomponenten (Follow Button, Breadcrumb, Nav Header,
  Share Footer, ASIN interne UI) zaehlen als Module im Schema, aber mit
  `designIntent: mimics_native_chrome`, damit die Grammar sie ausfiltern
  kann.
- Unsichtbare Trenner (1px spacer) bleiben als `separator_invisible`
  erhalten.
- Inline Scripts ohne sichtbaren Content werden nicht als Modul erfasst.

## 2. Modul Level Felder (Zielschema v4)

```
position              1-basiert, fortlaufend
moduleId              <pageSlug>_mod_<zweistellig>, z.B. immunsystem_mod_03
moduleName            deutsche Kurzrolle, z.B. "Hero Split Video", "USP-Bar"
layoutType            Enum aus Paragraf 3, Gold aligned 29 Werte
layoutShape           Enum aus Paragraf 4, 8 abstrakte Werte, aus layoutType abgeleitet
tileCount             Anzahl Kacheln im Modul
designIntent          Enum aus Paragraf 10, 7 Werte, Gold aligned
designIntentDetail    Optionaler Freitext, 1 Satz Begruendung
structuralPattern     1 bis 2 Saetze Freitext, wiederkehrendes Muster
moduleFunction        2 bis 3 Saetze Freitext, PFLICHT, wofuer ist dieses Modul
                      da, welche Rolle im User Journey, zu welcher Subpage
                      lenkt es, welches Bedurfnis bedient es

# NEU in v4: Modul zu Modul Beziehung
relationToPrevious    Enum aus Paragraf 19, 7 Werte plus none
relationToNext        Enum aus Paragraf 20, 6 Werte plus none
visualBridge          Enum aus Paragraf 21, 7 Werte plus none
copyBridge            Enum aus Paragraf 22, 6 Werte plus none

# NEU in v4: nur fuer Hero Module (designIntent emotional_hook und
# layoutType beginnt mit hero_), sonst null
heroArchetype         Offene Enum, Werte aus
                      data/store-knowledge/_hero_archetype_vocabulary.md
                      Wenn keiner passt, neuen Wert anlegen, Begriff dort
                      mit Definitionssatz und Beispiel ergaenzen.

textOnImage           Objekt aus Paragraf 7, strukturiert
tiles[]               Array der Tile Objekte, Paragraf 11
```

Zusatzfelder, die aus Phase 1 uebernommen werden:

```
dom.widgetClass       CSS Klasse der Row, z.B. "widget-container"
dom.visibleHeadings   Array DOM Textes fuer Sanity Check
dom.ctaLabels         Array der DOM Button Labels
dom.imageUrls         Array der extrahierten Bild URLs
dom.videoCount        Anzahl Video Elemente
```

## 3. `layoutType`, 29 Werte, geschlossene Liste (Gold aligned)

Gruppiert nach Familie, keine neuen erfinden. Falls ein Modul partout
nicht passt, in `openQuestions` flaggen und den naechstliegenden Wert
waehlen.

**Amazon Chrome**
- `amazon_nav_header`
- `amazon_share_footer`
- `separator_invisible`

**Hero**
- `hero_banner`
- `hero_banner_compact`
- `hero_banner_tall`
- `hero_video`
- `hero_video_split`
- `hero_video_tall`

**Editorial**
- `editorial_banner`
- `editorial_banner_large`
- `editorial_banner_tall`
- `editorial_banner_solid_color`
- `editorial_section_intro`
- `editorial_tile_pair`
- `editorial_tile_quad`

**Produkt**
- `product_showcase_video`
- `product_grid_featured`
- `product_grid_category`
- `product_grid_line`
- `product_grid_full_catalog`
- `product_grid_new_arrivals`
- `product_grid_bestsellers`
- `product_grid_filter_results`

**Navigation**
- `subcategory_tile`
- `shoppable_interactive_image`
- `shoppable_interactive_image_set`

**Filter**
- `filter_accordion_collapsed`
- `filter_banner`

## 4. `layoutShape`, abstrahierte Geometrie, 8 Werte

- `full_width_banner`
- `full_width_tall`
- `split_two_columns`
- `grid_three_columns`
- `grid_four_columns`
- `grid_two_rows`
- `single_atomic`
- `chrome_thin`

## 5. (entfernt in v4)

`backgroundStyle` und `backgroundDetail` sind in v4 nicht mehr Teil des
Schemas. Hintergrund Klassifikation laeuft beim Designer, der die CI
visuell separat analysiert.

## 6. `imageCategory`, 7 Werte (Tile Level)

Gold hat 5 beobachtete Werte. Hinzu kommen `benefit` fuer reine USP
Flaechen und der entscheidende Wert `product_tile_asin` fuer Kacheln,
die lediglich einen Amazon Produktlink einbetten, wo also Amazon selbst
Produktbild, Titel und Preis rendert und wo es **keine Designentscheidung
des Stores** gibt. Diese Tiles brauchen keinen Vision Pass.

- `creative` zwei oder drei Elementtypen gleichgewichtig (dominanter Default)
- `text_image` Text und Grafik dominant, Foto unter 20 Prozent
- `product` brand gestaltete Produkt Kachel im eigenen Layout
- `product_tile_asin` Amazon ASIN Tile ohne Brand Design. Nur die ASIN
  und der Link zaehlen. Alle weiteren Vision Felder (visualContent,
  elementProportions, textOnImage Details) bleiben leer beziehungsweise
  auf `not_required` gesetzt. Typisch in jedem `product_grid_*` Modul,
  auch im Shoppable Hotspot Target.
- `lifestyle` Lifestyle Foto dominiert ueber 70 Prozent Flaeche
- `creative_lifestyle_hybrid` Creative Layout mit starkem Lifestyle Anteil
- `benefit` nur USPs, Icons, Awards, Zertifikate, keine Produkte

Entscheidungsbaum, erste zutreffende Regel gewinnt:

1. Modul `layoutType` startet mit `product_grid_` und Tile ist direktes
   ASIN Kind: `product_tile_asin`
2. Rein Text und Grafik, Foto unter 20 Prozent: `text_image`
3. Nur USPs, Icons, Awards ohne Produkt und Personen: `benefit`
4. Brand gestaltetes Produkt Setup (Szene, Hintergrund, Typografie)
   ueber 50 Prozent Flaeche: `product`
5. Lifestyle Foto ueber 70 Prozent, nur dezentes Overlay: `lifestyle`
6. Creative Layout mit sichtbarem Lifestyle Foto Anteil:
   `creative_lifestyle_hybrid`
7. Sonst: `creative`

## 7. `textOnImage`, strukturiert, mit Origin Marker

```
textOnImage: {
  visibleText: string | null,      // wortgetreuer Gesamttext, oder null
  textType: enum,                  // Paragraf 8
  origin: enum,                    // Paragraf 9
  headline: string | null,         // primaerer, hervorgehobener Text
  subline: string | null,          // zweitrangig
  cta: string | null,              // CTA artige Formulierung
  directionCues: string | null     // Pfeil, Kreis, Markierung
}
```

Regeln:

- `visibleText` ist die Roh Zeile, Paragraf 8 und 9 klassifizieren sie.
- `headline/subline/cta/directionCues` sind die strukturierte Aufteilung.
- Wenn nur ein einzeiliger Claim vorliegt, landet er in `headline`,
  `visibleText` ist identisch, `subline/cta/directionCues` sind null.
- Produkt Etiketten Text (Verpackungen, Schilder, Szenen Text) gehoert
  nicht hierher, sondern in `visualContent` auf Tile Ebene.
- Wenn Text nicht vollstaendig gelesen werden kann, in `openQuestions`
  flaggen, nicht stillschweigend null setzen.

## 8. `textType`, 12 Werte (Gold aligned)

- `none` kein Text
- `unknown` Text vorhanden, aber nicht klassifizierbar
- `headline` generische Headline
- `tagline` Marken Tagline
- `category_headline` "Immunsystem", "Vitamine"
- `category_label` kleineres Kategorie Label
- `section_label` "Unsere Empfehlungen", schmaler Section Header
- `story_copy` laengerer Editorial Text
- `product_title` Produkt Name (typisch in Amazon Overlay)
- `cta` nur CTA Formulierung ohne Headline
- `headline_cta` Headline plus CTA kombiniert
- `filter_label` Filter Beschriftung

## 9. `origin`, 5 Werte (Gold aligned)

Wichtig fuer die spaetere Template Generierung, ist der Text **im Bild
gebacken** oder **drueber gelegt**?

- `none` kein Text
- `baked_in` Text ist Teil des gerenderten Bildes, nicht editierbar
- `layered_text` Text liegt via CSS ueber dem Bild, editierbar
- `amazon_overlay` Amazon rendert Titel oder Preis ueber dem Produkt
- `amazon_chrome` Amazon UI Text (Teilen, Folgen)

## 10. `designIntent`, 7 Werte (Gold aligned)

- `emotional_hook` Hero, Saison Banner, Lifestyle Moment ohne Verkauf
- `product_showcase` direkter Produktverkauf, Grid, Shoppable
- `editorial` redaktioneller Banner, Story, Wert, visuelle Pause
- `navigation_bridge` Tile oder Banner, der zu einer anderen Seite fuehrt
- `section_intro` schmaler Header, der die folgenden Module einleitet
- `mimics_native_chrome` Amazon Nav, Share Footer, nicht markenrelevant
- `visual_separator` unsichtbarer Trenner, nur dekorativ

## 11. Tile Level Felder

```
position              1-basiert, links oben zuerst
imageCategory         Enum aus Paragraf 6
toolTileType          Enum aus Paragraf 11a (PFLICHT, Tool Sprache)
toolImageType         Enum aus Paragraf 11b (PFLICHT, aus Layout Position)
link                  Objekt aus Paragraf 11c (Clickability, aus tileContentTopic ableitbar)
tileContentTopic      Objekt aus Paragraf 11e (PFLICHT, semantisches Kernfeld)
visualContent         deutscher Freitext, was inhaltlich zu sehen ist
elementProportions    Objekt mit Schluesseln aus Paragraf 12, Summe ca. 100
textOnImage           Objekt aus Paragraf 7
ctaText               sichtbarer CTA Button Text, oder null (Spiegel in link.ctaLabel)
linksTo               Tile Target, freitextlich (Spiegel in link.linkTarget)
```

In v4 entfernt aus den Tile Feldern: `backgroundStyle`, `backgroundDetail`,
`dominantColors`, `dominantColorsHex`.

## 11a. `toolTileType`, Tool Sprache (geschlossene Liste)

Diese Liste kommt direkt aus `src/constants.js` `TILE_TYPES` und darf
nicht erweitert werden. Verbindliche Sprache des Generator Tools.

- `image` reines Bild
- `image_text` Bild plus Text, typisch fuer editorial_banner mit Headline
- `product_grid` ASIN Grid, Amazon rendert Kacheln
- `best_sellers` ASIN Grid, Bestseller Sortierung
- `recommended` ASIN Grid, Recommendations oder Neuheiten
- `deals` ASIN Grid, Angebote
- `video` Videoflaeche (Full Width oder in Split)
- `text` reiner Text im Amazon Chrome (Nav, Share Footer)
- `shoppable_image` Bild mit Hotspots, jeder Hotspot links to ASIN
- `product_selector` Filter Quiz fuer Beratung

Ableitung, erste zutreffende Regel gewinnt:

1. `layoutType` startet mit `product_grid_`: je nach Subtyp `best_sellers`,
   `recommended` oder `product_grid`
2. `imageCategory == product_tile_asin`: `product_grid`
3. `layoutType` startet mit `shoppable_`: `shoppable_image`
4. Modul enthaelt Video: `video`
5. `layoutType` in Filter UI: `product_selector`
6. `layoutType` in Amazon Chrome: `text`
7. `imageCategory == text_image` oder Modul ist `editorial_section_intro`:
   `image_text`
8. `imageCategory == benefit`: `image_text`
9. Sonst: `image`

## 11b. `toolImageType`, Tool Image Dimensionen (aus Layout Position)

Werte siehe `src/constants.js` `AMAZON_IMG_TYPES`. Pflicht pro Tile,
abgeleitet aus `layoutType` und `position`.

## 11c. `link`, Clickability Objekt (PFLICHT pro Tile)

```
link: {
  clickable: boolean,
  linkType: "asin" | "page" | "url" | "none",
  linkTarget: string | null,
  ctaLabel: string | null
}
```

Aus `tileContentTopic` plus DOM `linksTo` ableitbar.

## 11d. Tool Layout pro Modul (PFLICHT)

Pro Modul am Modul Level setzen:

```
toolLayoutId: string  // z.B. "1", "lg-4grid", "vh-w2s", aus blueprintLayoutMap.js
```

## 11e. `tileContentTopic` (PFLICHT pro Tile)

Semantisches Kernfeld, das die Bedeutung der Kachel im Store Kontext
beschreibt. Frei formuliert, aber pflicht.

```
tileContentTopic: {
  primarySubject: string,        // z.B. "Vitamin D Praeparat", "Saisonale Aktion"
  productOrCategoryRef: string,  // ASIN oder Subpage Slug, oder null
  intent: "navigate" | "showcase" | "story" | "trust" | "convert",
  rolePosition: string           // z.B. "Page Hero", "Section Header", "Trust Anchor"
}
```

## 12. `elementProportions`, geschlossene Schluessel

Alle Werte Prozent, Summe pro Tile rund 100.

- `product_photo`
- `lifestyle_photo`
- `photographic_background`
- `text`
- `icons`
- `graphic_elements`
- `logo`
- `solid_background`
- `textured_background`
- `cta_button`
- `badge`
- `decorative_elements`

## 13. Seiten Level Felder

```
pageUrl               volle URL
pageName              deutscher Anzeigename
pageId                Amazon Stores Page ID
pageLevel             0 = Startseite, 1 = Hub Kategorie, 2 = Sub Kategorie
pageType              Enum, startseite, hub_category, sub_category, about,
                      bestsellers, new_arrivals, product_selector,
                      sustainability, brand_story, product_lines,
                      gift_sets, all_products
scrollHeight          in Pixeln, aus Phase 1
contentStats:
  domModules            reine DOM Zaehlung aus Phase 1
  logicalModules        nach Segmentierung aus Paragraf 1
  totalImages           gezaehlt
  totalVideos           gezaehlt
heroBanner:
  description           Freitext
  textOnImage           Objekt aus Paragraf 7
  estimatedDimensions   z.B. "3000x1500"
modules[]             Array der Modulobjekte

# NEU in v4
voiceMarkers          Objekt aus Paragraf 23, fuenf Tag Felder
voiceExamples         Array mit drei woertlichen Beispielsaetzen aus
                      dieser Page, je 1 bis 2 Saetzen, woertlich aus dem
                      Store kopiert. Pflicht. Wenn die Page weniger als
                      drei Texte enthaelt, alle vorhandenen aufnehmen
                      und das Array kuerzer halten.

pageAnalysis:
  tonalityVisual        Freitext
  ctaStrategies         Freitext
  contentDepth          Freitext
  useForArchetype       Freitext, Template Eignung
  moduleClusters        Array oder Freitext, semantische Gruppierungen
pageArchitecture      Freitext, 2 bis 4 Saetze, PFLICHT, wie ist die
                      Seite funktional aufgebaut, in welcher Reihenfolge
                      fuehrt sie den Nutzer, welcher Bedarfsfall wird
                      adressiert.
openQuestions         Array von Strings, alles was nicht sicher
                      erkennbar war
```

In v4 entfernt aus pageAnalysis: `dominantPalette`. Farb CI laeuft beim
Designer separat.

## 14. Typografie Regel (CLAUDE.md)

Em Dash (U+2014) und En Dash (U+2013) sind in allen extrahierten Texten
verboten. Wenn sie im Screenshot vorkommen, durch Komma, Punkt oder
Doppelpunkt ersetzen. Hyphen Minus (U+002D) nur in Komposita ohne
Leerzeichen links oder rechts. Ergaenzungsstriche ("Beauty- und ...")
vermeiden, ausformulieren.

## 15. Abschlussregel fuer Phase 2

Gib ausschliesslich ein valides JSON Objekt zurueck, das dem Seiten
Schema in Paragraf 13 entspricht. Keine Markdown Codefences. Kein Text
davor oder danach.

## 16. Phase Grenzen, welche Felder kommen woher

Wenn Phase 2 ein Feld nicht sicher bestimmen kann, weil nur Phase 1
(DOM ohne Screenshot) verfuegbar ist oder der Screenshot unklar ist,
dann **nicht raten**, sondern mit dem Platzhalter `"screenshot_required"`
belegen beziehungsweise bei Arrays `[]` mit Note in `openQuestions`.

Felder, die **Phase 1** zuverlaessig liefert:
- `layoutType` (abgeleitet aus Widget Klasse)
- `tileCount`
- `dom.widgetClass`, `dom.visibleHeadings`, `dom.ctaLabels`,
  `dom.imageUrls`, `dom.videoCount`
- `ctaText` (Button Label)
- `linksTo` (href)
- `textOnImage.visibleText` (wenn DOM Text, dann `origin: layered_text`)

Felder, die **nur Phase 2** (Vision) liefern kann:
- `imageCategory`
- `textOnImage.origin` (baked_in vs layered_text, entscheidend fuer
  Template Generierung spaeter)
- `textOnImage.headline / subline / cta / directionCues` aus baked in Text
- `elementProportions`
- `visualContent`
- `designIntent` (mit Phase 1 Signalen plausibilisiert)
- `structuralPattern`
- `relationToPrevious`, `relationToNext`, `visualBridge`, `copyBridge`
- `heroArchetype` (nur Hero Module)
- `voiceMarkers`, `voiceExamples`

Felder, die **nur Phase 3** (Brand Identity Synthese) liefert:
- `storeAnalysis.*` (siehe `docs/NE_BRAND_IDENTITY_PASS.md`)

## 17. Integration in bestehende Daten

Pro Store nach Phase 2 abgeschlossen:

- `data/store-knowledge/<store>_<page>_blueprint.json` pro Seite im
  v4 Schema.
- `data/store-knowledge/<store>_analysis.json` aggregiert, ohne
  `storeAnalysis` Block, den fuellt Phase 3 nach.

Nach Phase 3:

- `storeAnalysis` Block im `<store>_analysis.json` eingetragen.

## 18. Validierung am Ende eines Store Laufs

Pflichtpruefungen, bevor ein Store als "fertig" markiert wird:

1. Alle Seiten haben `logicalModules >= 1`.
2. Alle Module haben einen `layoutType` aus Paragraf 3, keine freien
   Strings.
3. Kein `designIntent` ausserhalb der 7 Werte in Paragraf 10.
4. Alle Tiles haben `imageCategory` aus Paragraf 6.
5. Alle `textOnImage.origin` aus Paragraf 9.
6. Keine Em Dashes oder En Dashes in irgendeinem extrahierten Text.
7. `openQuestions` pro Seite ist gefuellt, wenn irgendein Feld
   `screenshot_required` ist.
8. Jedes Modul hat `relationToPrevious` und `relationToNext` gesetzt
   (auch wenn Wert `none`).
9. Jedes Hero Modul (designIntent emotional_hook und layoutType beginnt
   mit hero_) hat `heroArchetype` gesetzt. Wenn neuer Wert eingefuehrt,
   ist er in `_hero_archetype_vocabulary.md` ergaenzt.
10. Jede Page hat `voiceMarkers` (alle fuenf Felder gefuellt) und
    mindestens einen Eintrag in `voiceExamples`.

Bei einem Fehlschlag, das betreffende Feld explizit in `openQuestions`
mit Seiten ID und Modul Position eintragen, dann mit dem naechsten Modul
weitermachen.

## 19. `relationToPrevious`, 7 Werte plus none (NEU in v4)

Wie verbindet sich dieses Modul inhaltlich oder kompositorisch mit dem
unmittelbar darueber liegenden Modul?

- `opens_section_thematically` Modul eroeffnet ein Thema, das vom
  vorherigen Modul angekuendigt oder uebergeben wurde
- `proves_above_claim` Modul liefert Beweise, Daten, Beispiele, Reviews
  fuer einen Anspruch des vorherigen Moduls
- `zooms_into_above_subject` Modul vertieft ein Detail, ein Produkt,
  eine Eigenschaft des vorherigen Moduls
- `contrasts_above` Modul spielt bewusst gegen das vorherige Modul
  (Vorher/Nachher, Variante A/B, Idee/Ergebnis)
- `summarizes_above` Modul fasst die vorherigen Module zusammen
  (Wrap Up, USP Bar nach Story)
- `lists_subordinate_options` Modul listet untergeordnete Auswahl
  Optionen, deren Oberbegriff vom vorherigen Modul kommt (Kategorie
  Hub, Geschenkset Auswahl)
- `repeats_pattern` Modul reproduziert das gleiche Schema wie das
  vorherige Modul, nur mit anderem Inhalt (parallele Sektionen)
- `none` keine erkennbare Verbindung, neues Thema

## 20. `relationToNext`, 6 Werte plus none (NEU in v4)

Wie kuendigt dieses Modul das unmittelbar darunter liegende Modul an?

- `sets_up_next` Modul stellt eine These oder Frage, die das naechste
  Modul beantwortet oder vertieft
- `promises_proof_below` Modul macht einen Anspruch und der naechste
  Modul soll ihn untermauern
- `hands_off_to_navigation` Modul leitet zur Auswahl ueber (oft Hero
  zu Kategorie Grid)
- `closes_chapter` Modul schliesst ein Kapitel ab, naechster Modul
  beginnt etwas inhaltlich Neues
- `repeats_pattern_to_next` Modul kuendigt parallele Wiederholung an
  (z.B. erste Sektion einer dreiteiligen Reihe)
- `prepares_visual_break` Modul bereitet bewusst einen visuellen Bruch
  vor (z.B. dunkles Modul vor hellem)
- `none` keine erkennbare Vorbereitung

## 21. `visualBridge`, 7 Werte plus none (NEU in v4)

Visuelle Verbindung zum vorherigen Modul.

- `shared_color` selbe dominante Farbe wie das vorherige Modul
- `shared_subject_class` selbe Subjekt Klasse (Produkt, Person,
  Zutat, Symbol)
- `shared_setting` selbes Setting (Kueche, Outdoor, Studio)
- `shared_typography_treatment` selbe Schrift Behandlung, Groesse,
  Farbe
- `shared_pattern` wiederkehrendes Marken Pattern, Formen, Linien
- `hard_break_intentional` bewusster harter Bruch, oft per
  Kontrastfarbe oder Whitespace
- `continuation_via_directional_cue` Pfeil, Verlauf, Linie zieht den
  Blick weiter
- `none` keine erkennbare visuelle Bruecke

## 22. `copyBridge`, 6 Werte plus none (NEU in v4)

Sprachliche Verbindung zum vorherigen Modul.

- `continues_idea` Copy fuehrt den Gedanken des vorherigen Moduls fort
- `contrasts_idea` Copy stellt eine Gegenposition dar
- `repeats_keyword` Copy nimmt ein zentrales Schluesselwort wieder auf
- `answers_above_question` Copy beantwortet eine Frage, die das
  vorherige Modul gestellt hat
- `poses_question_for_below` Copy stellt eine Frage, die das naechste
  Modul beantworten wird
- `fresh_topic` neues Thema, keine erkennbare Bruecke
- `none` keine Copy im Modul vorhanden

## 23. `voiceMarkers`, fuenf Tag Felder (NEU in v4, pro Page)

Pro Page genau ein Tag pro Feld setzen, das die dominante Auspraegung
auf dieser Page beschreibt. Wenn die Page mehrere Tonalitaeten mischt,
den dominantesten Wert waehlen und in `openQuestions` notieren.

```
voiceRegister:    nahbar | direkt | technisch | emotional |
                  professionell | saisonal | autoritaer | verspielt
sentencePattern:  kurze_aussage | frage_pattern | komma_erklaerung |
                  befehl | paradox | datenpunkt | listen_aufzaehlung
vocabularyField:  kulinarisch | klinisch | sportlich |
                  naturwissenschaftlich | lifestyle | traditionell |
                  industriell | familiaer
claimType:        benefit_funktional | benefit_emotional | social_proof |
                  expertise_signal | herkunft_prozess |
                  ergebnis_versprechen | zugehoerigkeit
rhetoricalDevice: alliteration | kontrast | metapher | konkrete_zahl |
                  namens_callout | wiederholung_anapher | none
```

Diese Felder sind **offene Vokabulare**, ergaenzbar ueber
`data/store-knowledge/_voice_marker_vocabulary.md`. Wenn ein neuer Wert
fuer einen Store passt, dort mit Definitionssatz und Beispiel ergaenzen.

## 24. `heroArchetype`, offene Enum (NEU in v4)

Nur fuer Module mit `designIntent: emotional_hook` und `layoutType`
beginnt mit `hero_`. Sonst Wert null.

Bekannte Werte stehen in
`data/store-knowledge/_hero_archetype_vocabulary.md`. Beispiele aus
bisherigen Analysen:

- `product_in_setting_with_claim` Produkt in Lifestyle Setting plus
  einzeiliger Claim
- `brand_mood_no_product` reine Markenstimmung ohne Produkt im Vordergrund
- `multi_product_lineup` mehrere Produkte nebeneinander aufgereiht
- `typographic_only` reine Typografie, kein dominantes Bild
- `seasonal_thematic` saisonal getriebener Hero (Sommer, Weihnachten)

Wenn keiner passt, neuen Begriff einfuehren und in
`_hero_archetype_vocabulary.md` mit Definitionssatz und Quelle (Brand,
Page) eintragen. Keine geschlossene Liste, weil Brand Kategorien je
eigene Hero Archetypen produzieren.

## 25. Tool Sprache Mapping und Gap Marker

Falls ein Modul oder Tile auf eine Komposition trifft, die das Tool
heute noch nicht abbildet, das Modul oder Tile bekommt zusaetzlich:

```
toolGap: {
  description: string,    // 1 bis 2 Saetze, was kann das Tool heute nicht
  suggestedExtension: string  // optional, was muesste im Tool ergaenzt werden
}
```

Diese Gap Marker werden spaeter aggregiert und sind die Roadmap fuer
Tool Erweiterungen, getrieben aus der echten Storeanalyse, nicht aus
Bauchgefuehl.
