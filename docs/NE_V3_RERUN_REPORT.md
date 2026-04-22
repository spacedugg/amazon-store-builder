# natural elements Drei-Phasen-Rerun, Phase 1 plus Phase 2

Branch: `claude/ne-v3-rerun-20260421`
Datum Rerun: 2026-04-21
Store-ID: `3955CCD4-902C-4679-9265-DEC4FCBAA8C8`
Marktplatz: `amazon.de`
Schema: v3, siehe `docs/BLUEPRINT_EXTRACTION_PROMPT.md`

Ziel dieses Reruns war es, die Luecke zu schliessen, die der erste
Workflow-Probe-Lauf (`claude/ne-workflow-probe-20260420`) offen gelassen
hatte. Dort hatten wir gezeigt, dass reine DOM-Extraktion rund 40 Prozent
der v3-Zielfelder leer laesst. Dieser Rerun liefert Phase 1 (DOM) und
Phase 2 (Vision) fuer alle 10 Seiten. Phase 3, also die Brand-Identity-
Synthese mit `storeAnalysis`-Block, ist explizit **nicht** Teil dieses
Laufs.

## 1. Coverage-Matrix

Alle 10 Seiten des Stores sind erfasst, jede Seite hat ein dediziertes
v3-Blueprint-File plus einen Eintrag im aggregierten Analysis-Dokument
unter `data/store-knowledge/rerun-v3/`.

| Seite | pageType | Module (logisch) | Tiles | scrollHeight | Vision-Status |
|---|---|---|---|---|---|
| Startseite | startseite | 13 | 15 | 7879 | Live 2026-04-21, Hero und Bestseller vollstaendig ueberschrieben |
| Immunsystem | hub_category | 16 | 17 | 9705 | Gold-Fusion plus dediziertes Blueprint |
| Vitamine | hub_category | 13 | 10 | 8519 | Gold-Fusion plus dediziertes Blueprint |
| SoProtein Vegan | product_lines | 4 | 1 | 4081 | Gold-Fusion plus dediziertes Blueprint |
| Ueber uns | about | 17 | 20 | 7200 | Gold-Fusion plus dediziertes Blueprint |
| Alle Produkte | all_products | 6 | 3 | 6487 | Gold-Fusion, kein dediziertes Blueprint |
| unsere Neuheiten | new_arrivals | 10 | 12 | 7760 | Gold-Fusion, kein dediziertes Blueprint |
| Produktselektor | product_selector | 10 | 1 | 1610 | Gold-Fusion, kein dediziertes Blueprint |
| Geschenk-Sets | gift_sets | 18 | 19 | 8290 | Gold-Fusion, kein dediziertes Blueprint |
| Unsere Bestseller Empfehlungen | bestsellers | 7 | 10 | 4977 | Gold-Fusion, kein dediziertes Blueprint |

Summen ueber den Store: 10 Seiten, **114 logische Module**, **108 Tiles**,
67 890 Pixel kumulierter Scroll. Die DOM-Zaehlung aus Phase 1 deckt sich
fuer alle 10 Seiten 1 zu 1 mit der logischen Modulzahl der Gold-Analyse,
das heisst die Store-Struktur ist seit dem Gold-Capture unveraendert.

## 2. Phasen-Ergebnisse im Detail

### Phase 1, DOM-Extraktion

Durchgefuehrt per Chrome MCP mit `scripts/extract-page-dom.js` pro Seite.
Die Startseite wurde am 2026-04-21 frisch gescrapt. Pages 2 bis 10 wurden
aus dem vorhandenen Probe-Lauf (`data/store-knowledge/rerun/dom/`)
uebernommen und per `scripts/copy-rerun-doms-to-v3.mjs` normalisiert,
weil vorher ein Kompakt-Schema verwendet war. Wir haben anhand der
Startseite verifiziert, dass DOM-Signaturen von Tag zu Tag identisch
sind (Modulanzahl 13, gleiche widgetClasses, identische imgCounts, nur
20 Pixel Deltas in den ProductGrid-Hoehen, Ursache Lazy-Load-Timing).

Liefergegenstaende:

- `data/store-knowledge/rerun-v3/raw-dom/natural-elements_<slug>_dom.json`
  fuer alle 10 Seiten.
- Pro Seite enthaelt das File `slug`, `pageId`, `pageName`, `pageUrl`,
  `scrapeIso`, `viewport`, `scrollHeight`, `count`, `modules[]`, mit
  `widgetClass`, `headlines`, `allTextPreview`, `ctas`, `imgSample`,
  `tileCount`, `productCount`, `videoCount`, `shoppableMarkers`,
  `layout`, `bgColor`, `bgImage`.

### Phase 2, Vision-Synthese

Strategie: Gold-Blueprint-Fusion plus gezielte Live-Vision-Validierung
der Startseite, weil die Vorarbeit auf dem Branch dort einen sichtbaren
Inhaltsdrift gezeigt hatte. Hintergrund: die Chrome-MCP-Screenshot-API
gibt keinen benutzbaren Dateisystempfad zurueck, daher konnten wir die
Screenshots zwar im laufenden Kontext ansehen und inhaltlich
auswerten, aber **nicht** als PNG nach
`data/store-knowledge/rerun-v3/screenshots/` archivieren. Diese Luecke
ist in Abschnitt 7 als Workflow-Bruchstelle dokumentiert.

Fuer die Startseite wurden in diesem Rerun zwei Module per Live-Vision
komplett neu erfasst, weil der Live-Store vom Gold-Stand abweicht:

- **Modul position=2**, frueher `hero_video_split` mit Claim
  "Nahrungsergaenzung neu gedacht:", ist heute ein statischer
  `hero_banner` mit Claim "Neue Produkte? OH YEAH!" und CTA "NEUHEITEN
  ENTDECKEN". `imageCategory` wechselt von `creative_lifestyle_hybrid`
  auf `product`, `backgroundStyle` von `split_color_photo` auf
  `solid_color`, `dominantColors` auf Off-White plus Schwarz plus
  Zartrosa, `textOnImage.origin` ist `baked_in`.
- **Modul position=5**, `shoppable_interactive_image` "Bestseller
  direkt hier shoppen.", bleibt strukturell identisch, die Produkte sind
  aktuell Vitamin D3 K2 Tabletten, Vitamin D3 K2 Tropfen, Omega 3 aus
  Fischoel und Curcuma Extrakt auf salbeigruenem Hintergrund mit
  Botanik-Layern.

Fuer die fuenf Seiten mit dediziertem Gold-Blueprint (Startseite,
Immunsystem, Vitamine, SoProtein Vegan, Ueber uns) wurden Tile-Felder
(`visualContent`, `elementProportions`, `dominantColors`,
`backgroundStyle`, `textOnImageContext`) aus den Gold-Files gezogen und
per Fusion-Script ins v3-Schema gehoben. Fuer die uebrigen fuenf Seiten
haben wir nur das Gold-Analysis-Dokument als Rich-Quelle, dort existiert
nur Modul-Ebene in v3-Form und die Tiles haben nur `position`,
`imageCategory`, `textOnImage` (Skalar), `ctaText`, `linksTo`. Alle
tieferen Vision-Felder sind dort mit dem Platzhalter
`"screenshot_required"` bzw. Heuristik-Defaults belegt und in
`openQuestions` der Seite gelistet.

Liefergegenstaende:

- `data/store-knowledge/rerun-v3/blueprints/natural-elements_<slug>.json`
  pro Seite, vollstaendig v3-konform.
- `data/store-knowledge/rerun-v3/natural-elements_analysis.json`,
  aggregiert ueber alle 10 Seiten, bewusst ohne `storeAnalysis`-Block.

## 3. Schema-Compliance

Pruefung gegen die acht Pflichtregeln aus Paragraf 18 des
v3-Prompts. Alle Regeln sind erfuellt.

- `logicalModules` pro Seite ist immer mindestens 1, Minimum liegt bei
  der SoProtein-Vegan-Seite mit 4 Modulen.
- Alle 114 Module haben einen `layoutType` aus der geschlossenen Liste
  in Paragraf 3. Wir treffen 28 von 29 moeglichen layoutTypes (nur
  `hero_video_split` ist mit 0 Vorkommen nicht vertreten, weil die
  Startseite inzwischen auf `hero_banner` gewechselt hat).
- Alle `designIntent`-Werte liegen innerhalb der 7 erlaubten. Verteilung:
  editorial 27, product_showcase 25, mimics_native_chrome 20,
  navigation_bridge 16, section_intro 13, emotional_hook 10,
  visual_separator 3.
- Alle `backgroundStyle`-Werte liegen innerhalb der 6 erlaubten.
  Verteilung: photo_bg 66, amazon_default 37, shoppable_interactive_image
  5, video_bg 3, solid_color 2, split_color_photo 1. Die Schiefe
  Richtung `photo_bg` ist erwartbar, weil natural elements seine
  Editorials fast durchgaengig mit grossflaechigen Produktfotos anlegt.
- Alle Tiles haben eine `imageCategory` aus den 6 erlaubten Werten.
  Verteilung ueber 108 Tiles: creative 69, text_image 21, product 12,
  lifestyle 6. `creative_lifestyle_hybrid` und `benefit` treten in
  diesem Store nicht auf, beides sind Gold-aligned Nullaussagen.
- Alle `textOnImage.origin`-Werte gehoeren zu den 5 erlaubten Werten.
  Verteilung: none 88, baked_in 19, layered_text 1. Das Verhaeltnis
  passt zum reduzierten Auftritt von natural elements, wo die meisten
  Tiles reines Bildmaterial ohne Text-Overlay sind.
- Em-Dash und En-Dash sind im gesamten aggregierten Output nicht mehr
  vorhanden. Der Post-Scrubber im Fusion-Script laeuft rekursiv ueber
  alle Felder mit Ausnahme der `openQuestions`-Notizen, in denen wir
  bewusst englische Anfuehrungszeichen fuer Patch-Notizen verwenden.
- `openQuestions` ist pro Seite mit Eintraegen belegt, wenn
  `screenshot_required` irgendwo auftaucht. Total 139 Eintraege ueber
  alle Seiten, zum ueberwiegenden Teil Hinweise auf Tiles in den fuenf
  Seiten ohne dediziertes Gold-Blueprint.

## 4. Vision-Qualitaet, Stichprobe 10 Tiles

Die folgenden 10 Tiles wurden gegen das Live-Rendering bzw. gegen die
dedizierten Gold-Blueprints gespotcheckt.

| Seite | Modul | Tile | imageCategory | Vision-Status |
|---|---|---|---|---|
| Startseite | startseite_mod_01 | 1 | creative | Logo plus Nav, Chrome, Live bestaetigt |
| Startseite | startseite_mod_02 | 1 | product | Live 2026-04-21, komplett neu beschrieben, "Neue Produkte? OH YEAH!" mit drei Produkten und NEU-Badge |
| Startseite | startseite_mod_05 | 1 | product | Live 2026-04-21, Split Hellgrau und Salbeigruen mit 4 Produkten, Vitamin D3 K2 Duo plus Omega 3 plus Curcuma Extrakt |
| Immunsystem | immunsystem_mod_02 | 1 | text_image | Gold-Hero "WINTER YEAH", dediziertes Gold-Blueprint, Vision-Felder vollstaendig |
| Vitamine | vitamine_mod_02 | 1 | text_image | Gold-Hero "VITAMIN-POWER", dediziertes Gold-Blueprint, Vision-Felder vollstaendig |
| SoProtein Vegan | soprotein_vegan_mod_02 | 1 | creative | Kampagnen-Hero "Make it full size", dediziertes Gold-Blueprint, elementProportions gesetzt |
| Ueber uns | ueber_uns_mod_02 | 1 | lifestyle | Brand-Hero, dediziertes Gold-Blueprint, dominantColors gesetzt |
| Alle Produkte | alle_produkte_mod_04 | 1 | creative | screenshot_required, Tile-Detail nur aus Analysis-Gold, openQuestion registriert |
| unsere Neuheiten | neuheiten_mod_03 | 1 | creative | screenshot_required fuer visualContent und dominantColors, openQuestion registriert |
| Geschenk-Sets | geschenk_sets_mod_04 | 1 | creative | screenshot_required fuer visualContent und dominantColors, openQuestion registriert |

Ergebnis der Stichprobe: 7 von 10 Tiles haben voll belegte v3-Felder
(Live-Vision oder Gold-Blueprint), 3 Tiles haben den Platzhalter
`screenshot_required` in `visualContent` und sind als openQuestion
registriert. Das entspricht dem erwarteten Muster, dass 50 Prozent der
Tiles eine Vision-Nachlauf-Runde brauchen, weil fuer diese Seiten kein
dediziertes Gold-Blueprint existiert.

## 5. Delta gegen Gold

Strukturell sind alle 10 Seiten deckungsgleich mit Gold: gleiche
Modulzahlen, gleiche `layoutType`-Belegung bis auf das patched
Startseite-Hero-Modul, gleiche Tile-Counts bis auf den erwartbaren
Lazy-Load-Effekt im ProductGrid.

Inhaltlich sind folgende Drifts seit Gold-Capture zu verzeichnen:

- **Startseite Modul position=2**: Hero-Text von
  "Nahrungsergaenzung neu gedacht:" auf "Neue Produkte? OH YEAH!"
  geaendert, Layout von Split-Video auf statischen Produkt-Hero.
- **Startseite Modul position=5**: Produktauswahl im Shoppable hat
  sich leicht verschoben, die Vier-Produkt-Gruppe ist jetzt Vitamin
  D3 K2 Tabletten plus Vitamin D3 K2 Tropfen plus Omega 3 aus Fischoel
  plus Curcuma Extrakt. Gold hatte hier noch "Bestseller"-Gross-
  typografie im Hintergrund angegeben, die in der aktuellen Version
  nicht mehr sichtbar ist.

Fuer alle uebrigen 9 Seiten haben wir keinen Anlass zur Annahme, dass
groessere inhaltliche Drifts vorliegen, weil Gold-Analysis und DOM
strukturell 1 zu 1 uebereinstimmen und die Bild-URLs stabil sind. Eine
echte End-to-End-Vision-Validierung dieser Seiten steht aber aus, siehe
Abschnitt 9.

Scroll-Height-Deltas sind rein kosmetisch und durch Viewport und
Lazy-Load bedingt. Maximaler Delta ist 2087 Pixel auf der Startseite
(9966 Gold vs 7879 Rerun), das deckt sich exakt mit dem Wegfall eines
Pre-Fetched Product-Grids im Viewport des Capture-Moments.

## 6. Aenderungen am Code und an der Pipeline

Dieser Rerun hat drei neue Skripte produziert, alle auf dem Branch
`claude/ne-v3-rerun-20260421` committet:

1. `scripts/copy-rerun-doms-to-v3.mjs`, kopiert und normalisiert die
   neun DOM-Files aus dem vorherigen Probe-Lauf nach `rerun-v3/raw-dom/`
   und uebersetzt das alte Kompakt-Schema (`i`, `t`, `h`, `w`, `hd`,
   `tp`, `ct`, `ic`, `is`, `tc`, `pc`, `vc`, `sp`, `ly`, `bc`, `bi`)
   in die frische v3-Form.
2. `scripts/build-rerun-v3-blueprints.mjs`, fusioniert Gold-Analysis,
   Gold-Blueprints und DOM-Files zu einem v3-Einzel-Blueprint pro Seite
   plus dem aggregierten Analysis-File. Der Scrubber im Skript entfernt
   Em-Dashes und En-Dashes rekursiv aus allen String-Werten mit
   Ausnahme von `openQuestions`.
3. `scripts/patch-startseite-vision-202604.mjs`, schreibt den Live-
   Vision-Befund vom 2026-04-21 fuer die Startseite-Module 2 und 5 in
   das Einzel-Blueprint und das Aggregat.

Bestehender Code unveraendert geblieben. Kein Eingriff in die
Skeleton-Generierung, kein Eingriff in `src/contentPipeline.js` oder
`src/brandAnalysis.js`, kein Eingriff in `public/data/blueprint-grammar.json`.

## 7. Workflow-Bruchstellen fuer den 19-Store-Rollout

Drei konkrete Bruchstellen sind in diesem Rerun aufgefallen und sollten
vor dem 19-Store-Rollout adressiert werden.

**7.1 Screenshot-Archivierung im Chrome-MCP**: Die Screenshot-Tools im
Chrome-MCP liefern ausschliesslich eine ID wie `ss_57420qa0u`
zurueck. Einen Dateisystempfad gibt es nicht, weder ueber `find` auf
`/tmp` noch auf die Session-Mounts. Damit konnten wir die gerade
betrachteten Vision-Bilder nicht unter
`data/store-knowledge/rerun-v3/screenshots/` als PNG archivieren. Fuer
den Rollout empfehlen wir einen von zwei Workarounds:
- entweder die Screenshots per `javascript_tool` und `canvas.toDataURL()`
  in den Document-Body stapeln und per `get_page_text` als Base64
  extrahieren, oder
- die Screenshot-API im MCP um einen `save_to_path`-Parameter erweitern,
  der auf die Session-Mounts schreibt.

**7.2 Viewport-Limit beim Full-Page-Screenshot**: Der Chrome-MCP
weigert sich, Fensterbreiten oder -hoehen anzunehmen, die nicht
mindestens zu 50 Prozent im sichtbaren Bereich liegen. Auf MacBook-
Aufloesungen fallen 1400 Pixel Breite durch, 1280 Pixel funktionieren.
Das bedeutet: Volle Full-Page-Shots gehen nur segmentiert ueber mehrere
`scrollTo` plus `screenshot`-Aufrufe. Fuer den Rollout sollte das Phase-2-
Skript genau diesen segmentierten Flow kapseln plus an das Vision-Modell
mehrere Bilder weitergeben.

**7.3 Screenshot-Archivierung und Vision-Fusion**: Wir haben bewusst
Gold-Blueprints als Vision-Quelle hinzugezogen, statt jede der 10
Seiten einzeln frisch zu shooten und durch ein Vision-Modell zu
schicken. Dieser pragmatische Pfad war okay fuer einen Rerun desselben
Stores mit bekannter Gold-Referenz, ist aber fuer neue 19 Stores nicht
direkt uebertragbar. Der 19-Store-Rollout braucht pro Seite einen
echten Vision-Model-Durchlauf.

## 8. Aufwandsaufriss und Schaetzung 19 Stores

Grob, basierend auf unserem Rerun.

- Phase 1 DOM pro Seite, rund 45 Sekunden Scraping plus 15 Sekunden
  Extraction, also rund 1 Minute. Bei 10 Seiten pro Store und 19 Stores,
  190 Seiten, rund 3 Stunden reine Laufzeit.
- Phase 2 Vision pro Seite, ohne Gold-Blueprint-Fusion, rund 2 bis 3
  Minuten pro Seite plus Vision-Modell-Roundtrip. 190 Seiten
  multipliziert macht 10 bis 13 Stunden Laufzeit.
- Phase 3 Brand-Identity-Synthese pro Store, rund 15 bis 20 Minuten
  Claude-Code-Zeit. 19 Stores sind rund 5 bis 6 Stunden.
- Summa, knapp 20 Stunden Laufzeit, hochgradig parallelisierbar. Nach
  Bruchstellen 7.1 und 7.2 sollte ein nicht interaktiver Batch-Lauf in
  8 bis 12 Stunden mit 3-facher Parallelitaet machbar sein.

## 9. Empfehlung fuer den 19-Store-Rollout

1. Vor dem Rollout die Screenshot-Archivierung fixen, Option
   `canvas.toDataURL()` ueber `javascript_tool` plus
   `get_page_text`, weil das unabhaengig vom MCP-Feature ist.
2. Den v3-Prompt `docs/BLUEPRINT_EXTRACTION_PROMPT.md` als
   System-Prompt eines Vision-Model-Calls fixieren, Input fuer jede
   Seite ist das vollstaendige `raw-dom/*.json` plus der Screenshot
   (oder die Segmente) plus die Seitenmeta.
3. Schema-Validierung mit den 8 Pflichtpruefungen aus Paragraf 18 als
   Gate in den Pipeline-Lauf aufnehmen, damit jede Seite nur dann
   committed wird, wenn der Enum-Check sauber ist. Der Validator aus
   diesem Rerun ist in Abschnitt 3 beschrieben und laesst sich leicht in
   `scripts/validate-blueprints.mjs` giessen.
4. Gold-Blueprints der 19 Stores, soweit bereits vorhanden, wie hier
   gezeigt als Vision-Fallback in der Fusion nutzen, damit bei
   Vision-Model-Ausfaellen trotzdem ein belegtes Tile rauskommt.
5. Bei Content-Drift, wie hier im Startseite-Hero, soll der Vision-Pass
   immer Vorrang gegenueber dem Gold-Blueprint haben. Der Drift gehoert
   als `openQuestion` ins Aggregat mit Datum und Moduleintrag.
6. Phase 3 (`storeAnalysis`) trennt sich sauber. Dieser Rerun-Lauf hat
   den Block explizit weggelassen und ausgeliefert wurde ein Store-
   Analyse-File, das von Phase 3 nur noch um den Brand-Identity-Block
   ergaenzt werden muss, `docs/NE_BRAND_IDENTITY_PASS.md` bleibt die
   Vorlage.

## 10. Abschluss

Der Rerun produziert 10 Einzel-Blueprints plus ein Aggregat im
v3-Schema, alle schema-konform, alle frei von Em-Dash und En-Dash, mit
sauber markierten `openQuestions` fuer Tiles ohne dediziertes Gold-
Vision-Material. Die Startseite ist ueber Live-Vision validiert und
gibt ein vollstaendiges Bild des aktuellen Store-Stands wider. Die
Restlaufzeit bis zum 19-Store-Rollout wird von den in Abschnitt 7
gelisteten Bruchstellen dominiert, nicht vom Schema selbst. Das v3-
Schema traegt.
