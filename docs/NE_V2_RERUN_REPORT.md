# natural elements V2 Rerun, Workflow-Robustness-Probe

Analyse-Datum: 2026-04-20
Branch: `claude/ne-workflow-probe-20260420` (von `claude/recover-chat-context-tjPth`, HEAD 5847f09)
Ziel: Pipeline-Reproduzierbarkeit testen, ohne die bestehende Gold-Analyse zu sehen, und den unabhängig erzeugten Output anschließend gegen Gold diffen.

Dieser Report ersetzt den vorigen "V2 Rerun Abschlussreport" unter demselben Dateinamen. Der alte Inhalt liegt weiterhin in der Git-History (Commit 5847f09 und älter).

## Aufbau der Probe

Die Probe lief streng zweiphasig, um Kontamination zu vermeiden:

Phase 1: Nur Arbeitsdokumente lesen, keine Gold-Artefakte. Gelesen wurden
`CLAUDE.md`, `docs/BLUEPRINT_EXTRACTION_PROMPT.md`,
`scripts/extract-page-dom.js`, `scripts/build-blueprint-grammar.mjs` und der
STARTUP-Plan. Die Gold-Analyse wurde per `cp` physisch eingefroren als
`data/store-knowledge/rerun/natural-elements_gold.json` (74 KB), ohne die
Datei in den Kontext zu ziehen.

Phase 2: Rerun-Aggregat baut, dann Gold lesen und diffen.

## Artefakte dieser Probe

```
data/store-knowledge/rerun/
  natural-elements_gold.json        (eingefrorene Gold-Analyse, unverändert)
  natural-elements_analysis.json    (Rerun-Aggregat, DOM-only)
  build-blueprints-from-dom.mjs     (Generator DOM zu Blueprint)
  build-rerun-aggregate.mjs         (Generator Blueprint zu Aggregat)
  _diff_inspect.mjs                 (Introspektion Gold-Schema)
  dom/01_startseite.json .. 10_unsere_empfehlungen.json   (DOM-Extrakte)
  blueprints/01_startseite_blueprint.json .. 10_*.json    (v2-DOM-Blueprints)
docs/
  NE_WORKFLOW_PROBE_STARTUP.md      (Startup-Plan der Probe)
  NE_V2_RERUN_REPORT.md             (dieser Report)
```

## Scrape, 10 von 10 Seiten

Alle 10 Pages wurden über Chrome-MCP mit identischem Extraktor gescraped.
Das Schema ist kompakt: pro Row werden Top, Höhe, Widget-Klasse, Headlines,
Text-Preview, Bild-, Produkt-, Video- und Shoppable-Zähler plus bis zu drei
Bild-Meta-Objekte (alt, src) erfasst. Chunked-Console-Pattern für große
JSON-Returns.

| # | Seite | Page-ID | scrollHeight | DOM-Rows | Besonderheiten |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | Startseite | 3955CCD4 | 7899 | 13 | Hero Split, Shoppable, ProductGrid 50, 8 Videos |
| 2 | Immunsystem | 1B2D6D85 | 9705 | 16 | Shoppable, ProductGrid 50, gelber Solid-Color Banner |
| 3 | Vitamine | 5DF9227A | 8519 | 13 | 3 ProductShowcase mit Videos, ProductGrid 40 |
| 4 | SoProtein Vegan | 0C5288E7 | 4081 | 4 | Sub-Page der Neuheiten, Titel vom Hero-Image-Alt |
| 5 | Über uns | C199E0D4 | 7200 | 17 | 10 Editorial-Banner, 1 Brand-Video |
| 6 | Alle Produkte | 56C2E5EE | 6487 | 6 | ProductGrid 50, kompakt |
| 7 | Unsere Neuheiten | E3653495 | 7760 | 10 | Showcase + ProductGrid 50 |
| 8 | Produktselektor | A03B844E | 1610 | 10 | Dynamischer Selektor, meiste Rows sind Inline-Scripts |
| 9 | Geschenk-Sets | 1A5ECF37 | 8290 | 18 | 6 Set-Showcases + Nav-Gallery |
| 10 | Unsere Empfehlungen | B77CB4EF | 4977 | 7 | ProductGrid 26 + 4-Tile-Galleries |

Summe DOM-Rows: 114. Das matcht zufällig exakt die Gold-Modulzahl von 114.
Der Match ist allerdings oberflächlich, siehe Modul-Diff weiter unten.

## Rerun-Aggregat, Kennzahlen

```
pages: 10
totalDomModules:        114
totalLogicalModules:     85   (nach Filter Amazon-UI und Trenn-Rows)
totalImages:            545   (DOM, inkl. Karussell-Duplikate)
totalVideos:             34
```

LayoutShape-Verteilung Rerun:
`full_width_banner` dominant (Banner-Rows), `product_grid_asin` für alle Grid-
Module, `2_tile_grid` und `4_tile_grid` für Gallery-Rows, einzelne
`6_tile_grid` für die ProductShowcase-Module. Kein `shoppable_interactive_image`
aus DOM sicher erkannt, weil DOM keine Shoppable-Hotspots sauber markiert.

## Vergleich gegen Gold

### Modulzählung

| Metrik | Gold | Rerun | Kommentar |
| --- | ---: | ---: | --- |
| Pages | 10 | 10 | identisch |
| totalModules | 114 | 114 DOM | oberflächlicher Match |
| davon Amazon-UI | 20 | 0 (ausgefiltert) | nav_header + share_footer je 10 |
| davon Brand-Module | 94 | 85 | Delta 9 Rerun-Module weniger |
| totalTiles | 108 | 242 | Rerun zählt Karussell-Bildduplikate als eigene Tiles |

Beide Seiten "matchen" bei 114, aber durch gegensätzliche Zählweisen:
Gold erfasst Amazon-UI als eigenes Modul (mit `layoutType` mimics_native_chrome),
Rerun filtert sie raus, landet aber zufällig bei derselben Gesamtzahl weil die
114 DOM-Rows in Rerun Inline-Scripts und Trenn-Rows mitzählen, die Gold nicht
mitzählt. Die korrekte Brand-Modul-Vergleichszahl ist 94 (Gold, brand) zu 85
(Rerun, logisch). Delta: Rerun verliert 9 Brand-Module durch zu aggressives
Filtern, vor allem auf Geschenk-Sets (6 Set-Showcases vs. 13 logische).

### Layout-Vokabular

Gold verwendet ein erweitertes Vokabular mit 29 `layoutType`-Werten, zum Beispiel
`editorial_banner_solid_color`, `editorial_section_intro`, `editorial_tile_pair`,
`editorial_tile_quad`, `hero_video_split`, `product_grid_bestsellers`,
`product_grid_new_arrivals`, `filter_accordion_collapsed`, `subcategory_tile`,
`amazon_nav_header`, `amazon_share_footer`, `separator_invisible`.

Rerun bleibt bei den 8 im `BLUEPRINT_EXTRACTION_PROMPT.md` geschlossen
definierten `layoutShape`-Werten.

Das heißt: Gold folgt eigentlich nicht dem geschlossenen v2-Enum aus
`BLUEPRINT_EXTRACTION_PROMPT.md`, sondern einer reicheren v2-Variante, die in
der Gold-Datei als `methodology: "V4-v2-Blueprint"` und
`v2SchemaNote` dokumentiert ist. Diese Abweichung sollte im
BLUEPRINT_EXTRACTION_PROMPT.md entweder nachgetragen oder als bewusste
Gold-Über-Spezifikation markiert werden. Probe kann also nicht "falsch" sein,
weil sie sich schema-treu an v2 hält, aber Gold ist strategisch reicher.

### textOnImage-Schema

Beide Seiten weichen auch hier:

Gold: `{ visibleText, textType, origin }` mit origin-Enum
(layered_text, baked_in, amazon_overlay, none). Zielt auf Herkunfts-Analyse.

v2-Prompt-Dokumentation: `{ headline, subline, cta, directionCues }`. Zielt
auf Text-Rolle.

Rerun folgt dem dokumentierten v2-Schema, Gold folgt dem V4-internen Schema.
Das ist die gleiche Divergenz wie bei layoutType.

### Brand-Identity

Gold hat reich befüllt:

- `storeAnalysis.brandUSPs` (5 Einträge, auf Markenebene, keine produktspezifischen Zahlen, konform zu CLAUDE.md Regel 2)
- `storeAnalysis.keyStrengths` (6 Einträge, Cross-Page-Beobachtungen)
- `storeAnalysis.positioningClaim` (ausformulierter Satz)
- `storeAnalysis.brandVoice.tonality`, `.adjectives` (5), `.signatureClaims` (11), `.voiceContrasts`
- `storeAnalysis.designAesthetic.colorPalette` (primary, secondary, accents, hexStatus)
- `storeAnalysis.designAesthetic.typography`, `.photographyStyle`, `.layoutSignals`
- `storeAnalysis.marketSegment`, `primaryAudience`, `priceTier`, `productComplexity`, `contentStrategy`, `conversionPath`

Rerun liefert davon: nichts. Alle Brand-Felder sind als
`phase2_brand_identity_pass` Platzhalter markiert. Der Grund: Brand-Identity
entsteht im V4-Brand-Identity-Pass, der in dieser Probe nicht ausgeführt
wurde. Der Rerun zeigt damit sauber: Ohne einen eigenen Brand-Identity-Lauf
über die Seiten ist die DOM-Scrape-Phase allein nicht in der Lage, diese
Felder zu füllen.

### signatureClaims, Besonderheit

Gold listet 11 Signature Claims, darunter "Nahrungsergaenzung neu gedacht:",
"Und dein Koerper so.", "Neue Produkte? OH YEAH!", "Make it full size",
"Fuer deinen Erfolg auf ganzer Linie.". Diese Claims stehen auf den Brand-Bildern
als `baked_in` Text. DOM-Scraping liest sie nicht, weil sie nicht als HTML-Text
vorliegen. Nur Vision (OCR oder Vision-Modell) kann sie extrahieren. Das ist
der klarste Pipeline-Blindspot, den die Probe zeigt.

### Seitenspezifische Anomalien (Rerun-Befunde)

1. Page 4 `SoProtein Vegan`: Tab-Titel ist "Make it full size" (kommt vom
   Hero-Image-Alt). Gold hat den Seitennamen korrekt als "SoProtein Vegan"
   normalisiert, Rerun-DOM zeigt die Tab-Title-Anomalie. Pipeline-Lektion:
   der `title` Tag ist nicht verlässlich, `pageName` muss aus der Breadcrumb
   oder aus dem Store-Navigations-Label ziehen.
2. Page 8 `Produktselektor`: echter Brand-Content ist minimal (1 Hero plus
   1 ProductGrid), alle restlichen 8 DOM-Rows sind Inline-Scripts und
   CSS-Overrides. Gold klassifiziert die 10 Rows als 10 Module inklusive
   `filter_accordion_collapsed` 6-mal, was bedeutet: Gold rendert die Filter-
   Akkordeons clientseitig nach, die im DOM zum Scrape-Zeitpunkt sichtbar sind.
   Rerun hat sie nicht aufgelöst, weil der Extraktor nur `.a-row.stores-row`
   liest, und die Accordions vermutlich in anderen Containern stecken. Das
   ist ein Pipeline-Gap.
3. Page 10 `Unsere Empfehlungen` (Rerun) vs. `Unsere Bestseller Empfehlungen`
   (Gold). Der Tab-Titel der gerenderten Seite sagt nur "Unsere Empfehlungen",
   Gold hat ihn mit "Bestseller Empfehlungen" angereichert, vermutlich aus
   Kontext oder aus der Page-Navigation. Rerun bleibt bei dem, was der Tab
   sagt. Pipeline-Lektion: Seitennamen-Normalisierung sollte Breadcrumb und
   Nav-Label einbeziehen, nicht nur `document.title`.

## Qualitative Bewertung der Robustheit

Was die Pipeline aus reinem DOM-Scraping **verlässlich** liefert:

- Seiten-Inventar (10 von 10), jede Page-ID korrekt
- Modulzählung grob (85 logisch, Gold hat 94 Brand, Delta 10 Prozent)
- Produktanzahl pro ProductGrid (Rerun 50 auf Startseite matcht Gold)
- Videozähler grob, Bildzähler tendenziell zu hoch wegen Karussell-Duplikaten
- Strukturelle Widget-Klassen (EditorialRow, ProductGrid, Shoppable) als Base-Signal
- Anwesenheit von Inline-Scripts und Trenn-Rows (als Noise identifizierbar)

Was die Pipeline aus reinem DOM-Scraping **nicht** liefert und **Vision** braucht:

- Jeglicher Text auf Bildern (Claims, Headlines, CTAs, Direction Cues)
- Farbpalette und Typografie
- `imageCategory`, `backgroundStyle`, `elementProportions`, `dominantColors` pro Tile
- `designIntent` jenseits grober Heuristik (Rerun erkennt Product Grids und Videos, aber nicht Section-Intros, Tile-Pairs oder Mimics-Native-Chrome)
- Dedupe von Karussell-Bildern (Rerun zählt alle 25-30 Karussell-Folien-Bilder, Gold ist auf 1-3 echte Tiles aggregiert)
- Split-Tiles als `creative` mit Farbfläche plus Foto

Was die Pipeline aus reinem DOM-Scraping **gar nicht** liefert und einen
separaten Brand-Identity-Pass braucht:

- brandUSPs auf Markenebene
- positioningClaim
- brandVoice (tonality, adjectives, signatureClaims, voiceContrasts)
- keyStrengths Cross-Page
- designAesthetic (Farbpalette, Typografie, Fotografie-Stil, Layout-Signals)
- marketSegment, primaryAudience, priceTier, productComplexity, contentStrategy, conversionPath

## Empfehlungen für die Pipeline

1. `BLUEPRINT_EXTRACTION_PROMPT.md` auf V4-Vokabular updaten oder einen
   klaren Status markieren: "v2-Prompt ist Minimal-Schema, V4 erweitert um
   spezifischere layoutType-Werte und textOnImage.origin." Sonst gibt es
   nachher wieder einen Schema-Drift zwischen Prompt-Definition und
   tatsächlicher Gold-Produktion.
2. Den Scrape-Extraktor (`scripts/extract-page-dom.js`) um drei Schritte
   erweitern: Breadcrumb-Lesen für `pageName`, Iframe/Accordion-Detection für
   dynamische Filter-UIs, und Karussell-Dedupe (erste Folie zählen, weitere
   als Visual-Duplikate markieren).
3. Vision-Pass (Full-Page-Screenshot plus Gemini oder Claude Vision) als
   obligatorischen Schritt vor dem Brand-Identity-Pass verankern. Ohne
   textOnImage aus Vision fehlen die signatureClaims, und damit fehlt der
   Kern der Brand Voice.
4. Brand-Identity-Pass als eigenständigen Prompt und eigenständige Stage
   dokumentieren. Die Probe zeigt, dass das kein Nebenprodukt vom DOM-Scrape
   ist, sondern ein eigener Modellaufruf, der die 10 Seiten-Blueprints plus
   ein aggregiertes Bild-/Textcorpus konsumiert.
5. CLAUDE.md Regel 4 (Unterseiten dynamisch entdecken) ist in der Probe
   implizit erfüllt (ich habe die 10 Page-IDs aus der Startup-Planung
   verwendet). Für zukünftige Marken sollte der Crawl-Schritt tatsächlich
   dynamisch arbeiten, nicht auf vorab gepflegte Page-Listen bauen.
6. Regel 5 (Bildanalyse per Vision) ist in der Probe komplett ausgelassen.
   Das ist bewusst, weil die Probe primär die DOM-Stage stress-testet. Im
   Echtbetrieb muss der Vision-Pass drin sein, sonst sind Claims wie
   "OH YEAH!" oder "Make it full size" für die Pipeline unsichtbar.

## Reproduzierbarkeit

```
# DOM neu erzeugen aus Chrome-MCP-Session (interaktiv)
# Generatoren:
cd data/store-knowledge/rerun
node build-blueprints-from-dom.mjs
node build-rerun-aggregate.mjs

# Diff-Introspektion:
node _diff_inspect.mjs | less
```

Die 10 DOM-JSONs unter `rerun/dom/` sind 100 Prozent deterministisch, da sie
die Chrome-MCP-Output-Schnapshüsse enthalten. Die Generator-Scripts laufen
ohne Netz und ohne Modelle. Das heißt: die DOM-zu-Blueprint-Stage ist
vollständig reproduzierbar und auditierbar.

## Fazit

Die Probe bestätigt das mentale Modell der Pipeline:

DOM-Scrape ist die preiswerte, schnelle und deterministische Basis für
Modulinventar, Produktzählung und grobe Layout-Klassifikation. Sie ist
allein nicht ausreichend für Brand Voice oder Design-Aesthetic.

Vision und Brand-Identity-Pass sind nicht optional, sondern Pflichtstufen, um
die Felder zu füllen, die Gold trägt.

Die scheinbare 114 zu 114 Modul-Übereinstimmung ist ein schönes Artefakt, das
aber bei genauerem Hinsehen auf zwei unterschiedliche Zählweisen hinausläuft
(Gold zählt Amazon-UI mit, Rerun filtert sie, zählt dafür Inline-Scripts).

Für die nächste Iteration empfehle ich, den Vision-Pass und den
Brand-Identity-Pass in der Pipeline sichtbar als eigene Stages zu ziehen
und im Blueprint-Prompt das tatsächlich eingesetzte erweiterte Vokabular zu
dokumentieren.
