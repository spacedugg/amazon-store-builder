# Cowork Prompt v4: 19 Store Rollout mit Modul Beziehung, Voice Marker, Hero Archetype

Dieser Prompt loest die v3 Variante (`ROLLOUT_19_STORES_COWORK_PROMPT.md`)
ab. Er folgt dem v4 Schema aus `docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md`,
das gegenueber v3 drei Erweiterungen und zwei Streichungen bringt.

Paste alles ab der Trennlinie in eine Cowork Session.

Referenz Material, das Cowork vorfinden muss:

- `docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md` (Schema, neue Beziehungs Felder,
  Voice Marker, offene Hero Archetype Liste, Tool Sprache Mapping, gap
  Marker)
- `docs/NE_GOLD_PLATED_WORKFLOW.md` (Drei Phasen Beschreibung, gilt
  weiterhin)
- `data/store-knowledge/rerun-v3/natural-elements_analysis.json`
  (Goldplated v3 Referenz, 10 Seiten, 94 Module, 108 Tiles, in Tool
  Sprache. Achtung: enthaelt noch keine v4 Felder, wird **nicht**
  rueckwirkend nachgezogen, sondern dient nur als strukturelle
  Vorlage fuer Tool Sprache und Phasen Workflow)
- `data/store-knowledge/_hero_archetype_vocabulary.md` (offene Liste,
  wird beim Anlegen ergaenzt)
- `data/store-knowledge/_voice_marker_vocabulary.md` (offene Liste,
  wird beim Anlegen ergaenzt)
- `scripts/extract-page-dom.js` (Phase 1 DOM)
- `scripts/enrich-tool-vocabulary.py` (Phase 2 Tool Sprache plus
  Clickability, muss um neue v4 Felder erweitert werden)
- `scripts/add-phase3-to-rerun-v3.py` (Phase 3 Brand Identity)
- `scripts/strip-amazon-chrome.py` (Nav Header und Share Footer entfernen)
- `src/constants.js` plus `src/blueprintLayoutMap.js` (Tool Vokabular
  Quelle)

---

# Auftrag: 19 Brand Stores nach v4 Schema analysieren

## Ziel

Komplette v4 Analyse von 19 Amazon Brand Stores. Jeder Store bekommt
zusaetzlich zu den v3 Feldern:

1. Pro Modul vier Beziehungs Felder (`relationToPrevious`,
   `relationToNext`, `visualBridge`, `copyBridge`).
2. Pro Hero Modul `heroArchetype` (offene Liste, ergaenzbar).
3. Pro Page `voiceMarkers` plus `voiceExamples` (drei woertliche
   Beispielsaetze).

Streichungen gegenueber v3: kein `backgroundStyle`, kein
`backgroundDetail`, keine `dominantColors` auf Tile Level, keine
`dominantPalette` auf Page Level. Hintergrund und Farb CI laufen beim
Designer separat, nicht in der Generierungs Pipeline.

## Leitprinzip

Jeder Store bekommt vier Ebenen:

1. **Analyse Ebene**: was ist da (DOM plus Vision), Module, Tiles,
   Texte, Bilder
2. **Einordnungs Ebene**: wofuer ist es da, welche Rolle im User
   Journey, welches Bild Funktions Muster
3. **Tool Sprache**: jedes Modul und Tile spricht die Sprache des
   Generator Tools (`src/constants.js` LAYOUTS, TILE_TYPES,
   AMAZON_IMG_TYPES, IMAGE_CATEGORIES)
4. **Beziehungs und Voice Ebene** (NEU in v4): wie haengen die
   Module zusammen, welche Bruecken bauen Bild und Copy zwischen
   ihnen, in welcher Tonalitaet spricht die Page

Ohne Ebene 2, 3 und 4 ist die Analyse unbrauchbar.

## Die 19 Zielstores

Die Liste liegt unter `data/store-knowledge/` als bereits vorhandene
`*_analysis.json` Dateien (alte v1 Tiefe). Enthalten sind:

bedsure, blackroll, cloudpillo, desktronic, esn, feandrea, gritin,
hansegruen, holy-energy, kaercher, kloster-kitchen, manscaped,
masterchef, more-nutrition, nespresso, night-cat, nucompany, trixie,
twentythree

Pruefe mit `ls data/store-knowledge/` welche konkret anstehen.

Je Store existiert eine alte v1 Analyse. Diese ist **Referenz**, nicht
Kopiervorlage. Der Rerun muss unabhaengig synthetisiert werden, damit
das Ergebnis vergleichbar bleibt.

natural-elements ist bereits v3, wird **nicht** auf v4 gezogen, ausser
der User entscheidet das spaeter explizit. Das v3 Aggregat dient als
Vorlage fuer Phase 1 plus 2 plus Tool Sprache, die v4 Felder fehlen
noch.

## Prioritaet und Reihenfolge

**Vorgehen: ein Store nach dem anderen.** Keine Batches. Jeder Store
wird einzeln vollstaendig analysiert und vollstaendig mit dem User
reviewt, bevor der naechste startet. Langsam und sicher schlaegt
schnell und unvollstaendig.

**Probe Store**: `kloster-kitchen`. Vorhandenes Phase 1 DOM Material
liegt unter `data/store-knowledge/rerun-v3/kloster-kitchen/raw-dom/`
fuer 10 Seiten bereit. Der Probe Store validiert das v4 Schema mit
echten Beziehungs und Voice Feldern, bevor die komplexen Stores dran
sind.

Nach erfolgreichem Abschluss von kloster-kitchen:

1. User reviewt das Aggregat manuell.
2. Offene Punkte aus dem Review werden im Schema, im Blueprint Prompt
   v4 oder im Enrichment Skript nachgezogen.
3. Die zwei neuen Vokabular Dateien
   (`_hero_archetype_vocabulary.md`, `_voice_marker_vocabulary.md`)
   werden mit den waehrend Kloster eingefuehrten Begriffen
   initialisiert.
4. Erst dann startet der naechste Store.

## Output Pfade

Pro Store:

- `data/store-knowledge/rerun-v4/<store>_analysis.json` aggregiert,
  ohne `storeAnalysis` Block (Phase 3 fuellt nach)
- `data/store-knowledge/rerun-v4/blueprints/<store>_<page>.json`
  pro Seite v4 Schema
- `data/store-knowledge/rerun-v4/raw-dom/<store>/<NN>_<page-slug>_dom.json`
  pro Seite Phase 1 Output

Globale Vokabulare:

- `data/store-knowledge/_hero_archetype_vocabulary.md`
- `data/store-knowledge/_voice_marker_vocabulary.md`

## Vorgehen pro Store

### Phase 1, DOM

Pro Page mit Chrome MCP die Live URL aufrufen, `extract-page-dom.js`
ausfuehren, Output unter `rerun-v4/raw-dom/<store>/<NN>_<page-slug>_dom.json`
ablegen. Falls Phase 1 Material aus v3 schon vorliegt
(z.B. fuer kloster-kitchen unter `rerun-v3/kloster-kitchen/raw-dom/`),
das uebernehmen, nicht neu extrahieren.

### Phase 2, Vision plus Klassifikation

Pro Page einen Full Page Screenshot anfertigen plus den Phase 1 Output
laden. Dann Modul fuer Modul nach Schema v4 fuellen:

1. v3 Felder genau wie bisher (layoutType, layoutShape, designIntent,
   imageCategory, textOnImage, elementProportions, toolTileType,
   tileContentTopic, link, etc.).
2. Neu in v4: `relationToPrevious`, `relationToNext`, `visualBridge`,
   `copyBridge` ueber jedes Modul. Werte aus Paragraf 19 bis 22 des
   v4 Schemas.
3. Neu in v4: bei Hero Modulen `heroArchetype`. Wenn keiner der
   bekannten Werte passt, neuen Begriff einfuehren und in
   `_hero_archetype_vocabulary.md` mit Definitionssatz und Quelle
   ergaenzen.
4. Neu in v4: pro Page `voiceMarkers` Block plus `voiceExamples` mit
   drei woertlichen Saetzen aus dem echten Store, eins zu eins
   uebernommen, keine Paraphrasierung.

Streichungen gegenueber v3 in der Phase 2 Datei:

- `backgroundStyle` und `backgroundDetail` weglassen, auch nicht null
  setzen, das Feld existiert in v4 nicht mehr.
- `dominantColors` und `dominantColorsHex` auf Tile Level weglassen.
- `dominantPalette` auf Page Level weglassen.

### Phase 3, Brand Identity Synthese

Wie v3, beschrieben in `docs/NE_BRAND_IDENTITY_PASS.md`. Die in v4
neu hinzugekommenen Felder fliessen mit ein, das Ergebnis ist eine
reichere Tonalitaets Synthese pro Store.

## Validierung pro Store

Bevor ein Store als fertig markiert wird:

1. Alle Pruefungen aus v3 ausser Punkt 4 (`backgroundStyle` ist weg).
2. Jedes Modul hat `relationToPrevious` und `relationToNext` gesetzt
   (Wert `none` ist erlaubt).
3. Jedes Hero Modul (`designIntent: emotional_hook` und `layoutType`
   beginnt mit `hero_`) hat `heroArchetype` gesetzt.
4. Jede Page hat `voiceMarkers` (alle fuenf Felder gefuellt) und
   mindestens einen Eintrag in `voiceExamples`.
5. Falls neue Vokabular Werte eingefuehrt wurden, sind sie in der
   passenden Vokabular Datei (Hero Archetype oder Voice Marker)
   ergaenzt.

## Tool Gap Marker (NEU in v4)

Wenn waehrend der Analyse eine Komposition auffaellt, die das Tool
heute nicht abbilden kann (z.B. ein Modul Beziehungs Muster, das es im
Generator nicht gibt, oder eine Hero Komposition ohne entsprechendes
Layout), das Modul oder Tile bekommt zusaetzlich:

```
toolGap: {
  description: string,
  suggestedExtension: string
}
```

Aggregiert ueber alle 19 Stores ergeben diese Gap Marker eine konkrete,
empirisch begruendete Tool Roadmap, getrieben aus echten Stores statt
aus Bauchgefuehl.

## Was am Ende rauskommt

Eine Datenbank aus 19 Store Analysen im v4 Schema, plus zwei wachsende
Vokabular Dateien (Hero Archetype, Voice Marker). Diese Datenbank ist
die Grundlage fuer den naechsten Schritt: Erweiterung des Generierungs
Skills (`amazon-storefront-design`) um Pattern Hinweise (Modul
Beziehungs Vorschlaege, Tonalitaets Anker mit echten Beispielsaetzen,
Hero Archetypen Auswahl je nach Brand Kontext).
