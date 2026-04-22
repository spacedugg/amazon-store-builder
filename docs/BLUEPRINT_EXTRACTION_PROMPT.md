# Blueprint Extraktion Prompt v3 (Phased, Gold-aligned)

Dieses Dokument ersetzt v2 (Commit `bb44ed7`) und die erste v2-Schaerfung
(Commit `2e8bf72`). Grund fuer den Bruch: die Probe auf natural elements
(Branch `claude/ne-workflow-probe-20260420`) hat gezeigt, dass das
bisherige v2-Schema (8 abstrakte `layoutShape`-Werte plus Vision-only-Felder
ohne klare Phasen-Trennung) mit dem realen Gold-Stand (29 konkrete
`layoutType`-Werte, 5 `origin`-Werte fuer textOnImage) nicht deckungsgleich
ist und dass die DOM-Extraktion allein rund 40 Prozent der Zielfelder leer
laesst. v3 loest das mit einer klaren Drei-Phasen-Architektur plus einem
aligned Schema.

## 0. Phased Workflow, Kurzfassung

| Phase | Wer fuehrt aus | Input | Output | Tool |
|-------|----------------|-------|--------|------|
| 1 DOM | Cowork (Chrome MCP) | Live amazon.de Seite | `raw-dom/*.json` pro Seite | `scripts/extract-page-dom.js` |
| 2 Vision | Cowork (Full-Page-Screenshot plus Vision-Modell) | Phase-1-Output plus Screenshot | v2-Blueprint pro Seite, volles Schema | Diesen Prompt hier |
| 3 Brand Identity | Claude Code (Text-Synthese) | Alle v2-Blueprints eines Stores | `storeAnalysis`-Block im `<store>_analysis.json` | Synthese-Template in `docs/NE_BRAND_IDENTITY_PASS.md` |

Phase 1 liefert die Geruest-Ebene (Module, Tiles, Headlines, CTAs, Link-Ziele,
Bild-URLs, Video-Counts). Phase 2 liefert die Bild- und Bedeutungs-Ebene
(imageCategory, backgroundStyle, dominantColors, textOnImage-Details,
visualContent, elementProportions). Phase 3 liefert die Marken-Ebene (USPs,
Tonalitaet, Positioning, Farbaesthetik ueber alle Seiten).

## 1. Modul-Segmentierung (gilt fuer Phase 1 und Phase 2)

Ein **Modul** ist ein DOM-gebundener horizontaler Block, extrahiert via
`a-row.stores-row` in Phase 1. In Phase 2 uebernimmst du diese
Modulgrenzen und verfeinerst nur die inhaltlichen Felder.

Regeln:

- Jedes eigenstaendige Full-Width-Element (Banner, Hero, USP-Bar,
  Editorial-Bild, Produktberater) ist ein Modul.
- Drei untereinander stehende Full-Width-Banner sind drei Module, auch wenn
  sie semantisch zusammengehoeren.
- Echte Grid-Container (2x2, 1x4, 4x2, 3x1) zaehlen als ein Modul mit
  mehreren Tiles.
- Amazon-Systemkomponenten (Follow-Button, Breadcrumb, Nav-Header,
  Share-Footer, ASIN-interne UI) zaehlen als Module im Schema, aber mit
  `designIntent: mimics_native_chrome`, damit die Grammar sie ausfiltern
  kann.
- Unsichtbare Trenner (1px spacer) bleiben als `separator_invisible` erhalten.
- Inline-Scripts ohne sichtbaren Content werden nicht als Modul erfasst.

## 2. Modul-Level-Felder (Zielschema v3)

```
position             1-basiert, fortlaufend
moduleId             <pageSlug>_mod_<zweistellig>, z.B. immunsystem_mod_03
moduleName           deutsche Kurzrolle, z.B. "Hero Split Video", "USP-Bar"
layoutType           Enum aus Paragraf 3, Gold-aligned 29 Werte
layoutShape          Enum aus Paragraf 4, 8 abstrakte Werte, aus layoutType abgeleitet
tileCount            Anzahl Kacheln im Modul
designIntent         Enum aus Paragraf 10, 7 Werte, Gold-aligned
designIntentDetail   Optionaler Freitext, 1 Satz Begruendung
structuralPattern    1 bis 2 Saetze Freitext: wiederkehrendes Muster
moduleFunction       2 bis 3 Saetze Freitext, PFLICHT: wofuer ist dieses Modul da,
                     welche Rolle im User-Journey, zu welcher Subpage lenkt es,
                     welches Bedurfnis bedient es. Das ist die Einordnungs-Ebene
                     und das eigentliche Nutzungs-Ziel der Analyse.
backgroundStyle      Enum aus Paragraf 5, 6 Werte, Gold-aligned
backgroundDetail     Optionaler Freitext, Spezifika der Flaeche
textOnImage          Objekt aus Paragraf 7, strukturiert
tiles[]              Array der Tile-Objekte, Paragraf 11
```

Zusatzfelder, die aus Phase 1 uebernommen werden:

```
dom.widgetClass      CSS-Klasse der Row, z.B. "widget-container"
dom.visibleHeadings  Array DOM-Textes fuer Sanity-Check
dom.ctaLabels        Array der DOM-Button-Labels
dom.imageUrls        Array der extrahierten Bild-URLs
dom.videoCount       Anzahl Video-Elemente
```

## 3. `layoutType`, 29 Werte, geschlossene Liste (Gold-aligned)

Gruppiert nach Familie, keine neuen erfinden. Falls ein Modul partout nicht
passt, in `openQuestions` flaggen und den naechstliegenden Wert waehlen.

**Amazon-Chrome**
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

Orthogonal zu `layoutType`. Dient dem Skeleton-Builder, um ueber Stores
hinweg Muster zu matchen.

- `full_width_banner` — ein Tile, volle Seitenbreite
- `split_two` — zwei gleich grosse Tiles nebeneinander
- `large_plus_two_stacked` — ein grosses Tile plus zwei kleinere gestapelt
- `grid_four` — vier Tiles in 2x2 oder 1x4
- `grid_six` — sechs Tiles
- `grid_eight_plus` — acht oder mehr Tiles, zum Beispiel Produkt-Grids
- `interactive_hotspot` — Shoppable Image mit Hotspots
- `chrome_or_separator` — Amazon-UI oder unsichtbarer Trenner

## 5. `backgroundStyle`, 6 Werte, geschlossene Liste (Gold-aligned)

- `photo_bg` — fotografischer Hintergrund, inklusive Lifestyle
- `solid_color` — Volltonflaeche
- `split_color_photo` — Split aus Farbflaeche und Foto
- `video_bg` — Video im Hintergrund
- `shoppable_interactive_image` — Shoppable-Bild mit Hotspots
- `amazon_default` — kein gestalteter Hintergrund, Amazon-Standard

Zusatzfeld `backgroundDetail` als optionaler Freitext fuer Spezifika,
zum Beispiel "Volltonfarbe Gelb mit Produkt-Silhouetten", "Split links
salbei-gruen rechts Lifestyle-Foto".

## 6. `imageCategory`, 7 Werte (Tile-Level)

Gold hat 5 beobachtete Werte. Hinzu kommen `benefit` fuer reine
USP-Flaechen und der entscheidende neue Wert `product_tile_asin` fuer
Kacheln, die lediglich einen Amazon-Produktlink einbetten, wo also
Amazon selbst Produktbild, Titel und Preis rendert und wo es **keine
Designentscheidung des Stores** gibt. Diese Tiles brauchen keinen
Vision-Pass.

- `creative` — zwei oder drei Elementtypen gleichgewichtig (dominanter Default)
- `text_image` — Text und Grafik dominant, Foto unter 20 Prozent
- `product` — brand-gestaltete Produkt-Kachel im eigenen Layout
- `product_tile_asin` — Amazon-ASIN-Tile ohne Brand-Design. Nur die ASIN
  und der Link zaehlen. Alle weiteren Vision-Felder (visualContent,
  dominantColors, elementProportions, textOnImage-Details) bleiben leer
  beziehungsweise auf `not_required` gesetzt. Typisch in jedem
  `product_grid_*`-Modul, auch im Shoppable-Hotspot-Target.
- `lifestyle` — Lifestyle-Foto dominiert ueber 70 Prozent Flaeche
- `creative_lifestyle_hybrid` — Creative-Layout mit starkem Lifestyle-Anteil
- `benefit` — nur USPs, Icons, Awards, Zertifikate, keine Produkte

Entscheidungsbaum, erste zutreffende Regel gewinnt:

1. Modul-layoutType startet mit `product_grid_` und Tile ist direktes
   ASIN-Kind? `product_tile_asin`
2. Rein Text und Grafik, Foto unter 20 Prozent: `text_image`
3. Nur USPs, Icons, Awards ohne Produkt und Personen: `benefit`
4. Brand-gestaltetes Produkt-Setup (Szene, Hintergrund, Typografie)
   ueber 50 Prozent Flaeche: `product`
5. Lifestyle-Foto ueber 70 Prozent, nur dezentes Overlay: `lifestyle`
6. Creative-Layout mit sichtbarem Lifestyle-Foto-Anteil: `creative_lifestyle_hybrid`
7. Sonst: `creative`

## 7. `textOnImage`, strukturiert, mit Origin-Marker

```
textOnImage: {
  visibleText: string | null,      // wortgetreuer Gesamttext, oder null
  textType: enum,                  // Paragraf 8
  origin: enum,                    // Paragraf 9
  headline: string | null,         // primaerer, hervorgehobener Text
  subline: string | null,          // zweitrangig
  cta: string | null,              // CTA-artige Formulierung
  directionCues: string | null     // Pfeil, Kreis, Markierung
}
```

Regeln:

- `visibleText` ist die Roh-Zeile, Paragraf 8 und 9 klassifizieren sie.
- `headline/subline/cta/directionCues` sind die strukturierte Aufteilung.
- Wenn nur ein einzeiliger Claim vorliegt, landet er in `headline`,
  `visibleText` ist identisch, `subline/cta/directionCues` sind null.
- Produkt-Etiketten-Text (Verpackungen, Schilder, Szenen-Text) gehoert
  nicht hierher, sondern in `visualContent` auf Tile-Ebene.
- Wenn Text nicht vollstaendig gelesen werden kann, in `openQuestions`
  flaggen, nicht stillschweigend null setzen.

## 8. `textType`, 12 Werte (Gold-aligned)

- `none` — kein Text
- `unknown` — Text vorhanden, aber nicht klassifizierbar
- `headline` — generische Headline
- `tagline` — Marken-Tagline
- `category_headline` — "Immunsystem", "Vitamine"
- `category_label` — kleineres Kategorie-Label
- `section_label` — "Unsere Empfehlungen", schmaler Section-Header
- `story_copy` — laengerer Editorial-Text
- `product_title` — Produkt-Name (typisch in Amazon-Overlay)
- `cta` — nur CTA-Formulierung ohne Headline
- `headline_cta` — Headline plus CTA kombiniert
- `filter_label` — Filter-Beschriftung

## 9. `origin`, 5 Werte (Gold-aligned)

Wichtig fuer die spaetere Template-Generierung: ist der Text **im Bild
gebacken** oder **drueber gelegt**?

- `none` — kein Text
- `baked_in` — Text ist Teil des gerenderten Bildes, nicht editierbar
- `layered_text` — Text liegt via CSS ueber dem Bild, editierbar
- `amazon_overlay` — Amazon rendert Titel oder Preis ueber dem Produkt
- `amazon_chrome` — Amazon-UI-Text (Teilen, Folgen)

## 10. `designIntent`, 7 Werte (Gold-aligned)

- `emotional_hook` — Hero, Saison-Banner, Lifestyle-Moment ohne Verkauf
- `product_showcase` — direkter Produktverkauf, Grid, Shoppable
- `editorial` — redaktioneller Banner, Story, Wert, visuelle Pause
- `navigation_bridge` — Tile oder Banner, der zu einer anderen Seite fuehrt
- `section_intro` — schmaler Header, der die folgenden Module einleitet
- `mimics_native_chrome` — Amazon-Nav, Share-Footer, nicht markenrelevant
- `visual_separator` — unsichtbarer Trenner, nur dekorativ

Aus der v2-Vorversion entfernt: `immersive` (faellt in emotional_hook),
`trust_signals` (faellt in editorial mit `imageCategory: benefit`),
`product_showcase` bleibt wie zuvor.

## 11. Tile-Level-Felder

```
position              1-basiert, links-oben zuerst
imageCategory         Enum aus Paragraf 6
visualContent         deutscher Freitext, was inhaltlich zu sehen ist
elementProportions    Objekt mit Schluesseln aus Paragraf 12, Summe ca. 100
textOnImage           Objekt aus Paragraf 7
ctaText               sichtbarer CTA-Button-Text, oder null
linksTo               erkennbares Ziel aus Kontext, oder null
backgroundStyle       Enum aus Paragraf 5
backgroundDetail      optionaler Freitext
dominantColors        Array mit 2 bis 4 Farbbegriffen auf Deutsch
dominantColorsHex     optionales Array mit 2 bis 4 Hex-Werten, falls extrahierbar
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

## 13. Seiten-Level-Felder

```
pageUrl               volle URL
pageName              deutscher Anzeigename
pageId                Amazon-Stores-Page-ID
pageLevel             0 = Startseite, 1 = Hub-Kategorie, 2 = Sub-Kategorie
pageType              Enum: startseite, hub_category, sub_category, about,
                            bestsellers, new_arrivals, product_selector,
                            sustainability, brand_story, product_lines,
                            gift_sets, all_products
scrollHeight          in Pixeln, aus Phase 1
contentStats:
  domModules            reine DOM-Zaehlung aus Phase 1
  logicalModules        nach Segmentierung aus Paragraf 1
  totalImages           gezaehlt
  totalVideos           gezaehlt
heroBanner:
  description           Freitext
  textOnImage           Objekt aus Paragraf 7
  estimatedDimensions   z.B. "3000x1500"
modules[]             Array der Modulobjekte
pageAnalysis:
  dominantPalette       Array von 3 bis 8 Farben, Deutsch, optional Hex
  tonalityVisual        Freitext
  ctaStrategies         Freitext
  contentDepth          Freitext
  useForArchetype       Freitext, Template-Eignung
  moduleClusters        Array oder Freitext, semantische Gruppierungen
pageArchitecture      Freitext, 2 bis 4 Saetze, PFLICHT: wie ist die Seite
                      funktional aufgebaut, in welcher Reihenfolge fuehrt
                      sie den Nutzer, welcher Bedarfsfall wird adressiert.
                      Das ist die Seiten-Ebene der Einordnung, analog zu
                      moduleFunction auf Modul-Ebene.
openQuestions         Array von Strings, alles was nicht sicher erkennbar war
```

## 14. Typografie-Regel (CLAUDE.md)

Em-Dash (U+2014) und En-Dash (U+2013) sind in allen extrahierten Texten
verboten. Wenn sie im Screenshot vorkommen, durch Komma, Punkt oder
Doppelpunkt ersetzen. Hyphen-Minus (U+002D) nur in Komposita ohne
Leerzeichen links oder rechts. Ergaenzungsstriche ("Beauty- und ...")
vermeiden, ausformulieren.

## 15. Abschlussregel fuer Phase 2

Gib ausschliesslich ein valides JSON-Objekt zurueck, das dem Seiten-Schema
in Paragraf 13 entspricht. Keine Markdown-Codefences. Kein Text davor oder
danach.

## 16. Phase-Grenzen, welche Felder kommen woher

Wenn Phase 2 ein Feld nicht sicher bestimmen kann, weil nur Phase 1
(DOM ohne Screenshot) verfuegbar ist oder der Screenshot unklar ist, dann
**nicht raten**, sondern mit dem Platzhalter `"screenshot_required"`
belegen beziehungsweise bei Arrays `[]` mit Note in `openQuestions`.

Felder, die **Phase 1** zuverlaessig liefert:
- `layoutType` (abgeleitet aus Widget-Klasse)
- `tileCount`
- `dom.widgetClass`, `dom.visibleHeadings`, `dom.ctaLabels`,
  `dom.imageUrls`, `dom.videoCount`
- `ctaText` (Button-Label)
- `linksTo` (href)
- `textOnImage.visibleText` (wenn DOM-Text, dann `origin: layered_text`)

Felder, die **nur Phase 2** (Vision) liefern kann:
- `imageCategory`
- `backgroundStyle`, `backgroundDetail`
- `dominantColors`, `dominantColorsHex`
- `textOnImage.origin` (baked_in vs layered_text, entscheidend fuer
  Template-Generierung spaeter)
- `textOnImage.headline / subline / cta / directionCues` aus baked-in Text
- `elementProportions`
- `visualContent`
- `designIntent` (mit Phase-1-Signalen plausibilisiert)
- `structuralPattern`

Felder, die **nur Phase 3** (Brand Identity Synthese) liefert:
- `storeAnalysis.*` (siehe `docs/NE_BRAND_IDENTITY_PASS.md`)

## 17. Integration in bestehende Daten

Pro Store nach Phase 2 abgeschlossen:

- `data/store-knowledge/<store>_<page>_blueprint.json` pro Seite im
  v3-Schema.
- `data/store-knowledge/<store>_analysis.json` aggregiert, ohne
  `storeAnalysis`-Block, den fuellt Phase 3 nach.

Nach Phase 3:

- `storeAnalysis`-Block im `<store>_analysis.json` eingetragen.
- Optional: `public/data/blueprint-grammar.json` neu bauen via
  `node scripts/build-blueprint-grammar.mjs`.

## 18. Validierung am Ende eines Store-Laufs

Pflichtpruefungen, bevor ein Store als "fertig" markiert wird:

1. Alle Seiten haben `logicalModules >= 1`.
2. Alle Module haben einen `layoutType` aus Paragraf 3, keine freien Strings.
3. Kein `designIntent` ausserhalb der 7 Werte in Paragraf 10.
4. Kein `backgroundStyle` ausserhalb der 6 Werte in Paragraf 5.
5. Alle Tiles haben `imageCategory` aus Paragraf 6.
6. Alle `textOnImage.origin` aus Paragraf 9.
7. Keine Em-Dashes oder En-Dashes in irgendeinem extrahierten Text.
8. `openQuestions` pro Seite ist gefuellt, wenn irgendein Feld
  `screenshot_required` ist.

Bei einem Fehlschlag: das betreffende Feld explizit in `openQuestions`
mit Seiten-ID und Modul-Position eintragen, dann mit dem naechsten Modul
weiter.
