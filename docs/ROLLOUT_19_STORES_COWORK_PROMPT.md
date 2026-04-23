# Cowork-Prompt: 19-Store-Rollout auf Basis natural-elements

Dieser Prompt ist die Blaupause fuer die Analyse der 19 verbleibenden
Brand Stores. Er destilliert den Workflow, den wir mit natural elements
entwickelt haben. Paste alles ab der Trennlinie in eine Cowork-Session.

Referenz-Material, das Cowork vorfinden muss:

- `docs/BLUEPRINT_EXTRACTION_PROMPT.md` v3 (Schema, geschlossene Enums,
  Tool-Sprache, Clickability, Einordnungs-Ebene)
- `docs/NE_GOLD_PLATED_WORKFLOW.md` (Drei-Phasen-Beschreibung)
- `data/store-knowledge/rerun-v3/natural-elements_analysis.json`
  (Gold-Plated-Referenz, 10 Seiten, 94 Module, 108 Tiles, in Tool-Sprache)
- `scripts/extract-page-dom.js` (Phase 1 DOM)
- `scripts/enrich-tool-vocabulary.py` (Phase 2 Tool-Sprache plus Clickability)
- `scripts/add-phase3-to-rerun-v3.py` (Phase 3 Brand Identity)
- `scripts/strip-amazon-chrome.py` (Nav-Header und Share-Footer entfernen)
- `src/constants.js` plus `src/blueprintLayoutMap.js` (Tool-Vokabular-Quelle)

---

# Auftrag: 19 Brand Stores nach natural-elements-Vorlage analysieren

## Ziel

Komplette v3-Analyse von 19 weiteren Amazon Brand Stores, sodass am Ende
eine einheitliche Datenbank von 20 Stores unter
`data/store-knowledge/<store>_analysis.json` steht. Diese Datenbank ist
die Grundlage fuer den Generator, der spaeter neue Brand Stores bauen
wird.

## Leitprinzip

Jeder Store bekommt drei Ebenen:

1. **Analyse-Ebene**: was ist da (DOM plus Vision), Module, Tiles,
   Texte, Bilder, Farben
2. **Einordnungs-Ebene**: wofuer ist es da, welche Rolle im
   User-Journey, welches Bild-Funktions-Muster
3. **Tool-Sprache**: jedes Modul und Tile spricht die Sprache des
   Generator-Tools (`src/constants.js`: LAYOUTS, TILE_TYPES,
   AMAZON_IMG_TYPES)

Ohne Ebene 2 und 3 ist die Analyse unbrauchbar.

## Die 19 Zielstores

Die Liste liegt unter `data/store-knowledge/` als bereits vorhandene
`*_analysis.json`-Dateien. Enthalten sind:

bedsure, blackroll, cloudpillo, desktronic, esn, feandrea, gritin,
hansegruen, holy-energy, kaercher, kloster-kitchen, manscaped,
masterchef, more-nutrition, nespresso, night-cat, nucompany

Plus zwei weitere Stores, die in `data/store-knowledge/` liegen und
noch nicht auf v3 gehoben sind. Pruefe mit `ls data/store-knowledge/`
welche konkret anstehen.

Je Store existiert bereits eine alte V4-Analyse. Diese ist **Referenz**,
nicht Kopiervorlage. Der Rerun muss unabhaengig synthetisiert werden,
damit das Ergebnis vergleichbar bleibt.

## Prioritaet und Reihenfolge

Empfohlene Batch-Reihenfolge, damit die Pipeline sich stabilisiert:

**Batch 1 (einfach, 3 Stores)**: kloster-kitchen, kaercher, gritin.
Wenig Seiten, dominante Grid-Struktur.

**Batch 2 (komplex, 3 Stores)**: nespresso, nucompany, blackroll.
Viele Seiten, diverse Module, Edge-Cases wahrscheinlich.

**Batch 3 (mittel, 13 Stores)**: der Rest.

Nach jedem Batch kurzes Review mit dem User, bevor der naechste startet.

## Repo-Setup

- Repo: `spacedugg/amazon-store-builder`
- Base: `origin/main` (enthaelt v3-Schema plus natural-elements-Gold)
- Arbeits-Branch: `claude/rollout-batch-<nr>-<suffix>` pro Batch

## Phase 1: DOM-Extraktion pro Seite

**Pro Store**:

1. Store-Nav-Seite oeffnen und alle Unterseiten-URLs sammeln.
   Start-URL liegt in der alten Analyse unter `storeUrl`. Dort die
   Store-Nav auslesen und Subpages auflisten.
2. Fuer jede Unterseite:
   - Chrome-MCP oeffnet die URL
   - In 300-Pixel-Schritten mit 400ms Pause bis zum Ende scrollen
     (Lazy-Load triggern)
   - 3 Sekunden warten
   - `scripts/extract-page-dom.js` via `javascript_tool` injizieren
   - Output speichern unter
     `data/store-knowledge/rerun-v3/<store>/raw-dom/<slug>_dom.json`

**Retry-Regel**: Bei Extraction-Fail 15 Sekunden warten und einmal
retryen. Wenn der zweite Versuch auch scheitert, die Seite als
`extraction_failed` im Arbeitsprotokoll markieren und weitergehen.
Nicht faken, nicht raten.

**Pflicht**: DOM-Extraktor um href-Capture erweitern, bevor der
Rollout startet. Aktuelle Version erfasst Headlines, CTAs und
Bild-URLs, aber keine Link-Ziele. Siehe Abschnitt Tooling-Fixes.

## Phase 2: Vision-Synthese pro Seite

**Pro Seite**, nach erfolgreicher Phase 1:

1. Full-Page-Screenshot via `captureBeyondViewport: true`. Falls das
   Viewport-Limit greift, segmentiert in 3 bis 4 Abschnitten shooten.
2. Vision-Modell-Call mit:
   - System-Prompt = `docs/BLUEPRINT_EXTRACTION_PROMPT.md` komplett
   - User-Message = DOM-Extrakt plus Screenshot plus Seitenmeta
3. Output strikt JSON, dem v3-Schema entsprechend (Paragrafen 2
   bis 13 des BLUEPRINT_EXTRACTION_PROMPT).
4. Ablage unter
   `data/store-knowledge/rerun-v3/<store>/blueprints/<slug>.json`

**Vision-Modell**: Claude Sonnet 4.6. Alternative Gemini 2.5 Pro,
wenn Sonnet nicht verfuegbar. Bei strengem Schema tendieren wir zu
Sonnet wegen praeziserem Instruction-Following.

**Pflichtfelder pro Modul** (Paragraf 2):

- position, moduleId, moduleName
- layoutType (aus den 27 erlaubten, Paragraf 3, ohne
  amazon_nav_header und amazon_share_footer)
- layoutShape (Paragraf 4)
- tileCount
- designIntent (Paragraf 10, 7 Werte)
- structuralPattern (Freitext)
- **moduleFunction** (Freitext, 2-3 Saetze, Einordnungs-Pflicht)
- backgroundStyle (Paragraf 5)
- textOnImage (Objekt, Paragraf 7)
- toolLayoutId, toolLayoutName, toolLayoutType, toolLayoutRole
  (Paragraf 11d, PFLICHT)

**Pflichtfelder pro Tile** (Paragraf 11):

- position
- imageCategory (Paragraf 6, 7 Werte inkl. product_tile_asin)
- toolTileType (Paragraf 11a, 10 Werte aus TILE_TYPES)
- toolImageType (Paragraf 11b, aus LAYOUT_TILE_DIMS)
- link (Paragraf 11c, Clickability-Objekt, PFLICHT)
- visualContent (Freitext)
- elementProportions, textOnImage, ctaText, linksTo, backgroundStyle,
  dominantColors

**Pflichtfelder pro Seite** (Paragraf 13):

- pageUrl, pageName, pageId, pageType
- contentStats (domModules, logicalModules, totalImages, totalVideos)
- modules[]
- **pageArchitecture** (Freitext, 2-4 Saetze, Einordnungs-Pflicht)
- openQuestions[]

## Phase 2 Validierung pro Seite

Bevor die Seite committet wird, 8 Pflichtpruefungen aus Paragraf 18
des BLUEPRINT_EXTRACTION_PROMPT:

1. logicalModules >= 1
2. layoutType aus erlaubter Liste (27, ohne nav/share-footer)
3. designIntent aus den 7 Werten
4. backgroundStyle aus den 6 Werten
5. imageCategory aus den 7 Werten
6. textOnImage.origin aus den 5 Werten
7. Keine Em-Dashes, keine En-Dashes
8. openQuestions gefuellt, wenn screenshot_required auftaucht

Bei Violation: Feld flaggen, Modell mit engerem Prompt einmal
nachschaerfen lassen. Wenn weiter Violation: openQuestion-Eintrag,
dann mit naechstem Modul weiter.

## Phase 3: Brand-Identity plus Taxonomie

**Wer**: Claude Code in der Sandbox, nach Phase-2-Commit.
**Input**: Alle Phase-2-Blueprints eines Stores.
**Output**: `storeAnalysis`-Block direkt im Aggregat.

Template: `scripts/add-phase3-to-rerun-v3.py` auf den jeweiligen Store
anpassen. Felder:

- marketSegment, primaryAudience, priceTier, productComplexity
- brandVoice (tonality, adjectives, signatureClaims, voiceContrasts)
- designAesthetic (colorPalette, typography, photographyStyle,
  layoutSignals)
- positioningClaim (1 Satz)
- contentStrategy, conversionPath, keyStrengths, brandUSPs
- **moduleFunctionalTaxonomy** (in Tool-Sprache:
  byToolLayoutAndTileType plus byV3LayoutType)
- **pageArchetypes** (pro Seite primaryFunction, conversionMode,
  transferableTo)

## Regeln und Leitplanken

1. **Kein CTA-Erzwingen.** Nicht jedes klickbare Tile hat einen CTA.
   Kategorie-Tiles mit Kategoriename plus Lifestyle-Bild sind klickbar,
   auch ohne Button. `link.clickable: true`, `link.ctaLabel: null` ist
   zulaessig und haeufig korrekt.

2. **Layout-Semantik schlaegt DOM-Signalabwesenheit** bei klaren
   Mustern: subcategory_tile, editorial_tile_pair, editorial_tile_quad
   sind default klickbar. Navigation-Brigde ist ihr Zweck.

3. **product_showcase_video NICHT blanket klickbar.** Manche
   product_showcase_videos erzaehlen Brand- oder Kategorie-Story und
   verlinken nichts. Klickbar nur bei CTA oder linksTo im DOM.
   Confidence low wenn unklar.

4. **Amazon Nav Header und Share Footer werden entfernt**, nicht nur
   markiert. `scripts/strip-amazon-chrome.py` entfernt sie aus dem
   Aggregat und aus den Einzel-Blueprints. Module-Positionen neu
   durchnummeriert.

5. **Produkt-Grids brauchen keinen Vision-Pass.** Tiles in
   `product_grid_*` sind `imageCategory: product_tile_asin` und
   `visionRequired: false`. Amazon rendert Produktbild und Preis
   selbst. Nur der Grid-Typ (featured, category, bestsellers,
   new_arrivals, full_catalog, line, filter_results) ist relevant.

6. **Tool-Sprache ist verbindlich.** Jedes Modul und Tile fuehrt
   toolLayoutId, toolTileType, toolImageType. Das Display von
   Taxonomie und Reports nutzt Tool-Vokabular, nicht v3-layoutType.

7. **Em-Dash und En-Dash verboten** in allen extrahierten Texten.
   Durch Komma oder Umformulierung ersetzen.

## Tooling-Fixes vor dem Rollout

**Fix 1: DOM-Extraktor um href-Capture erweitern**

In `scripts/extract-page-dom.js` pro Modul hinzufuegen:

```js
hrefs: Array.from(row.querySelectorAll('a[href]'))
  .map(a => ({ href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 50) }))
```

Damit landet in jedem Modul eine Liste echter Link-Targets, die Phase 2
direkt in `link.linkTarget` mit Confidence `high` uebernehmen kann,
statt heuristisch zu raten.

**Fix 2: Screenshot-Archivierung im Chrome-MCP**

Der Chrome-MCP gibt aktuell nur IDs zurueck, keine Datei-Pfade. Workaround:
`javascript_tool` plus `canvas.toDataURL()` im Document-Body stacken, dann
via `get_page_text` als Base64 abholen und sandbox-seitig zu PNG
rekonstruieren. Details im natural-elements-Report Abschnitt 7.

**Fix 3: Viewport-Segmentierung**

Chrome-MCP weist Fenster ueber 1280 Pixel zurueck. Full-Page-Shots in
3 bis 4 Abschnitten via `scrollTo` plus `screenshot` stacken und dem
Vision-Modell als Bildsequenz geben.

## Abbruchkriterien pro Store

- Mehr als 3 Seiten scheitern in Phase 1: Store parken, naechsten
  starten, im Report flaggen.
- Phase 2 produziert mehr als 3 Schema-Violations, die auch nach
  einem Nachschaerfungs-Anlauf bleiben: Store parken, Gaps-Liste.
- Neuer layoutType, der nicht in den 27 enthalten ist: nicht
  erfinden. openQuestion-Eintrag plus Schema-Erweiterungs-Vorschlag.

## Commit und Push pro Store

```
git add data/store-knowledge/rerun-v3/<store>/
git commit -m "<store> v3 rerun, Phase 1 plus Phase 2 plus Phase 3"
git push origin claude/rollout-batch-<nr>-<suffix>
```

## Deliverables am Ende des Rollouts

- 20 Aggregate unter `data/store-knowledge/<store>_analysis.json`,
  alle in v3-Schema, alle mit `storeAnalysis`-Block
- 20 Einzel-Blueprint-Ordner unter
  `data/store-knowledge/rerun-v3/<store>/blueprints/`
- 20 Raw-DOM-Ordner unter
  `data/store-knowledge/rerun-v3/<store>/raw-dom/`
- Ein Gesamt-Report `docs/ROLLOUT_REPORT.md` mit Erkenntnissen pro
  Store und Gesamt-Taxonomie-Update
- `public/data/blueprint-grammar.json` neu gebaut via
  `node scripts/build-blueprint-grammar.mjs`, Erwartung: alle
  Seitentypen mit `medium` oder `high` confidence

## Am Ende kurz zusammenfassen

- X von 19 Stores erfolgreich
- Durchschnitt-Module pro Store
- Gemeinsame Muster in Tool-Sprache
- Edge-Cases und neue layoutType-Kandidaten
- Empfehlung, ob die Datenbank generator-ready ist
