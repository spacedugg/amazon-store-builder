# natural elements als Gold-Plated Referenz fuer den 19-Store-Rollout

Stand: 2026-04-22
Branch: `claude/recover-chat-context-tjPth`
Aggregat: `data/store-knowledge/rerun-v3/natural-elements_analysis.json`

Dieser Workflow beschreibt, wie die vollstaendige natural-elements-Analyse
zustande kam und ist die verbindliche Blaupause fuer die Analyse der 19
verbleibenden Brand Stores. Ziel am Ende ist eine konsistente Datenbank mit
20 Stores, aus der neue Brand Stores generiert werden koennen.

## Leitprinzip: Zwei Ebenen, nicht eine

Der erste Rerun hatte die **Analyse-Ebene** im Blick: was ist auf der Seite,
welche Module, welche Tiles, welche Bilder, welche Texte. Das reicht nicht.
Das Tool soll spaeter neue Brand Stores generieren, und dafuer muss es
**verstehen**, nicht nur **sehen**.

Darum arbeiten wir jetzt mit zwei Ebenen pro Modul und pro Seite:

1. **Analyse-Ebene**: was ist da (DOM plus Vision, Struktur, Texte, Bilder,
   Farben). Abgedeckt durch die v3-Schema-Felder `layoutType`,
   `tileCount`, `imageCategory`, `textOnImage`, `backgroundStyle`,
   `visualContent`, `dominantColors`, `elementProportions`.
2. **Einordnungs-Ebene**: wofuer steht es, warum hier, welche Funktion im
   User-Journey. Abgedeckt durch die v3-Schema-Felder `moduleFunction`
   (pro Modul), `pageArchitecture` (pro Seite), `moduleFunctionalTaxonomy`
   und `pageArchetypes` (im storeAnalysis-Block).

Ohne Einordnung ist die Analyse ein Museum. Mit Einordnung ist sie ein
Generator-Rezept.

## Workflow in drei Phasen

### Phase 1, DOM-Extraktion

**Wer**: Cowork mit Chrome-MCP.
**Input**: Live-URL eines Brand-Store-Seiten-Tabs auf amazon.de.
**Tool**: `scripts/extract-page-dom.js`.
**Output**: `data/store-knowledge/rerun-v3/raw-dom/<store>_<slug>_dom.json`.

Was Phase 1 zuverlaessig liefert:

- Modul-Boundaries via `a-row.stores-row`
- Widget-Klasse pro Modul (Hinweis auf `layoutType`)
- Headlines und CTA-Labels aus dem sichtbaren DOM
- Bild-URLs, Video-Counts, Tile-Counts, Produkt-Counts
- Linkziele (`href`)
- scrollHeight und Modul-Positionen

Was Phase 1 nicht liefert:

- Alles, was nur ueber Pixel-Analyse erkennbar ist (Farben, Bildinhalt,
  Text-auf-Bild-vs-Overlay, elementProportions)
- Die Einordnungs-Ebene (wofuer ist das Modul da)

### Phase 2, Vision-Synthese

**Wer**: Cowork mit Full-Page-Screenshot plus Vision-Modell.
**Input**: Phase-1-Output plus Screenshot.
**Tool-Prompt**: `docs/BLUEPRINT_EXTRACTION_PROMPT.md` als System-Prompt.
**Output**: `data/store-knowledge/rerun-v3/blueprints/<store>_<slug>.json`,
v3-konform.

Pflicht-Felder, die Phase 2 aus dem Screenshot fuellt:

- `imageCategory` (aus 7 Werten, einschliesslich `product_tile_asin`)
- `visualContent` (deutscher Freitext)
- `dominantColors` plus optional `dominantColorsHex`
- `backgroundStyle` und `backgroundDetail`
- `elementProportions`
- `textOnImage.origin` (baked_in vs layered_text vs amazon_overlay)
- `textOnImage.headline`, `subline`, `cta`, `directionCues`

Wichtig:

- **Produkt-Grid-Tiles** (`layoutType` startet mit `product_grid_`) bekommen
  automatisch `imageCategory: product_tile_asin` und `visionRequired: false`.
  Amazon rendert diese Kacheln selbst, keine Designentscheidung des Stores,
  kein Vision-Pass noetig. Das reduziert den Vision-Aufwand drastisch.
- **Videos** werden als Modul mit multiplen Frames behandelt. Bei
  `layoutType: hero_video_split` oder `hero_video` mehrere Frames sampeln
  oder den Claim-Verlauf dokumentieren, nicht nur ein Standbild.

### Phase 3, Brand-Identity plus Einordnungs-Taxonomie

**Wer**: Claude Code in der Sandbox, ohne Browser.
**Input**: Alle Phase-2-Blueprints eines Stores, aggregiert zu
`<store>_analysis.json`.
**Output**: `storeAnalysis`-Block direkt im Aggregat.

Struktur des `storeAnalysis`-Blocks (`schemaVersion: v3-brand-identity-2`):

```
marketSegment, primaryAudience, priceTier, productComplexity
brandVoice (tonality, adjectives, signatureClaims, voiceContrasts)
designAesthetic (colorPalette, typography, photographyStyle, layoutSignals)
positioningClaim (1 Satz)
contentStrategy (approach, emotional/rational layers, modulePreferences, editorialDepth)
conversionPath (primary, secondary, gifting, trustLoop)
keyStrengths (6 Stichpunkte aus der Modulsequenz)
brandUSPs (5 markenebene USPs, produktunabhaengig)
moduleFunctionalTaxonomy (Zaehlung der Muster ueber alle Seiten)
pageArchetypes (pro Seite: primaryFunction, conversionMode, transferableTo)
```

## Was an natural elements konkret gemacht wurde

1. `docs/BLUEPRINT_EXTRACTION_PROMPT.md` um `moduleFunction`,
   `pageArchitecture` und `imageCategory: product_tile_asin` erweitert.
2. Startseite Modul 2 korrigiert auf `hero_video_split` mit rotierenden
   Claims, Startseite Modul 3 korrigiert auf editorial_banner Neuheiten
   OH YEAH. Die Korrektur laeuft ueber `scripts/enrich-rerun-v3.py`.
3. `moduleFunction` per Heuristik aus `layoutType` plus `designIntent` plus
   `moduleName` fuer alle 114 Module gefuellt. Nicht jedes Modul ist
   perfekt individualisiert, aber jedes hat einen sinnvollen
   Funktionsanker.
4. `pageArchitecture` pro Seite handgeschrieben fuer alle 10 Seiten in der
   Heuristik-Tabelle im Script.
5. `storeAnalysis`-Block eingefuegt mit allen Phase-3-Feldern inklusive
   `moduleFunctionalTaxonomy` und `pageArchetypes`, generiert durch
   `scripts/add-phase3-to-rerun-v3.py`.

## Offene Vision-Luecken, nicht blockierend

Die 53 offenen `screenshot_required`-Placeholders aus dem Rerun-Report
verteilen sich auf die 5 Seiten ohne dediziertes Gold-Blueprint (Alle
Produkte, unsere Neuheiten, Geschenk-Sets, Produktselektor, Unsere
Empfehlungen). Nach Umklassifizierung der `product_grid_*`-Tiles
(`product_tile_asin`) bleiben von diesen 53 nur noch die Editorial-,
Shoppable- und Hero-Tiles mit Vision-Luecke. Die kommen im 19-Store-Rollout
ueber den regulaeren Vision-Pass mit.

## Rollout-Plan fuer die 19 weiteren Stores

### Vorab-Fixes am Tooling

1. **Screenshot-Archivierung**. Der Chrome-MCP gibt nur IDs zurueck, keinen
   Pfad. Loesung: `canvas.toDataURL()` ueber `javascript_tool` plus
   `get_page_text` als Base64, dann in der Sandbox zu PNG rekonstruieren.
   Alternativ: MCP-Patch mit `save_to_path`-Parameter.
2. **Viewport-Segmentierung**. Chrome-MCP weist Fenster ueber 1280 Pixel
   zurueck. Full-Page-Shots in 3 bis 4 Abschnitten via `scrollTo` plus
   `screenshot` stacken und dem Vision-Modell als Bildsequenz geben.

### Pro Store, einmal

1. **Phase 1 DOM** pro Seite: rund 1 Minute mit Retry.
2. **Phase 2 Vision** pro Seite: rund 2 bis 3 Minuten, bei Videos eine
   Extra-Minute fuer Frame-Sampling. Produkt-Grid-Tiles automatisch auf
   `product_tile_asin` klassifizieren, kein Vision-Call.
3. **Schema-Validierung**: 8 Pflichtpruefungen aus Paragraf 18 des
   v3-Prompts, bevor die Seite committet wird.
4. **Phase 3 Brand-Identity** durch Claude Code: rund 15 bis 20 Minuten pro
   Store. Kann parallel zur Vision-Phase des naechsten Stores laufen.

### Batching und Reihenfolge

Empfehlung: 3-fache Parallelitaet, Reihenfolge nach strukturellem
Komplexitaetsniveau sortiert:

- Start mit 3 einfachen Stores (wenige Seiten, dominante Grid-Struktur),
  damit die Pipeline sich stabilisiert.
- Dann 3 komplexe Stores (viele Seiten, diverse Module), um Edge-Cases
  frueh zu finden.
- Schluss mit 13 mittleren Stores.

Gesamt rund 10 bis 12 Stunden Cowork-Laufzeit bei 3-facher Parallelitaet,
rund 6 Stunden Claude-Code-Zeit fuer Phase 3 parallel.

### Abbruchkriterien pro Store

- Mehr als 3 Seiten scheitern in Phase 1: Store parken, naechsten
  starten, im Report flaggen.
- Phase 2 produziert mehr als 3 Schema-Violations, die auch nach
  Nachschaerfung bleiben: Store parken, in Gaps-Liste.
- Neuer `layoutType` aufgetaucht, der nicht in den 29 enthalten ist:
  nicht erfinden, `openQuestions`-Eintrag plus Schema-Erweiterungs-
  Vorschlag.

## Wann ist die Datenbank fertig

Die Datenbank gilt als abgeschlossen, wenn:

- Alle 20 Stores ein `<store>_analysis.json` unter `data/store-knowledge/`
  im v3-Schema haben, inklusive `storeAnalysis`-Block.
- Alle Stores die 8 Pflichtpruefungen bestehen.
- `public/data/blueprint-grammar.json` via
  `node scripts/build-blueprint-grammar.mjs` auf mindestens `medium`
  confidence fuer alle Page-Types kommt.
- Keine Em-Dashes oder En-Dashes in kundensichtbaren Feldern.
- Keine produktspezifischen Zahlen in `brandUSPs`.

Dann ist der Step "Datenbank fuer Generator-Tool" abgeschlossen und die
naechste Phase, Tool-Integration, kann starten. Dort kommt dann
`src/blueprintLayoutMap.js` als Bruecke zu `src/constants.js`
`LAYOUTS` zum Einsatz, und `moduleFunction` plus `pageArchitecture` steuern
die Blueprint-Auswahl im Skeleton-Builder.
