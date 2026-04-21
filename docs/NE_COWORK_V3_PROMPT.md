# Cowork-Prompt v3: natural elements Drei-Phasen-Rerun

Dieser Prompt ersetzt den v2-Prompt aus der Probe
(`claude/ne-workflow-probe-20260420`). Grund: die Probe hat strukturelle
Luecken gezeigt (Schema-Drift, keine Vision-Phase, keine
Brand-Identity-Phase). v3 adressiert alle drei gleichzeitig.

Copy-paste ab der Trennlinie unten in eine neue Cowork-Session.

---

# Auftrag: natural elements Drei-Phasen-Rerun, Phase 1 plus Phase 2

## Kontext

natural elements ist der Probe-Store fuer den Workflow-Rollout auf 20
Amazon Brand Stores. Die erste Probe hat die DOM-Phase validiert, aber
gezeigt, dass rund 40 Prozent der Zielfelder leer bleiben, wenn es bei
DOM bleibt. Diese Session schliesst die Luecke.

Ziel: alle 10 Seiten von natural elements durchlaufen Phase 1 und Phase 2.
Phase 3 (Brand Identity) macht Claude Code anschliessend aus den
Phase-2-Output-Dateien, das ist nicht dein Job.

## Repo-Setup

- Repo: `spacedugg/amazon-store-builder`
- Remote: `https://github.com/spacedugg/amazon-store-builder`
- Aktueller Head auf `claude/recover-chat-context-tjPth` enthaelt das
  v3-Schema (`docs/BLUEPRINT_EXTRACTION_PROMPT.md`) und den ersten
  Brand-Identity-Pass (`docs/NE_BRAND_IDENTITY_PASS.md`).
- Du arbeitest auf einem neuen Branch `claude/ne-v3-rerun-<suffix>`,
  abgezweigt von `claude/recover-chat-context-tjPth`.

Vor Start einmal hart verifizieren:

```bash
git fetch origin
git checkout -b claude/ne-v3-rerun-<suffix> origin/claude/recover-chat-context-tjPth
ls docs/BLUEPRINT_EXTRACTION_PROMPT.md docs/NE_BRAND_IDENTITY_PASS.md
ls data/store-knowledge/natural-elements_analysis.json
ls scripts/extract-page-dom.js
```

Wenn eine dieser Dateien fehlt, sind wir auf dem falschen Branch. Stop und
dem User melden.

## Pflichtlektuere vor Start

1. `CLAUDE.md` (Projektregeln: Em-Dash und En-Dash verboten, USPs
   produktunabhaengig, Sprache Deutsch)
2. `docs/BLUEPRINT_EXTRACTION_PROMPT.md` v3 (das aktuelle Schema mit
   Phase-Grenzen, 29 layoutType-Werten, Gold-aligned Enums)
3. `data/store-knowledge/natural-elements_analysis.json` als
   Gold-Referenz. **Nicht lesen, um den Rerun zu kopieren**. Nur lesen,
   um die Ziel-Granularitaet zu verstehen. Der Rerun muss unabhaengig
   synthetisiert werden.
4. `docs/NE_WORKFLOW_PROBE_STARTUP.md` und `docs/NE_V2_RERUN_REPORT.md`
   aus der vorherigen Probe als Kontext fuer bekannte Anomalien
   (SoProtein Tab-Titel, Produktselektor Inline-Scripts, Seite 10 heisst
   Unsere Empfehlungen).

## Die 10 Zielseiten

Alles auf `amazon.de`, Brand Store ID
`3955CCD4-902C-4679-9265-DEC4FCBAA8C8`. Die pageIds stehen in
`data/store-knowledge/natural-elements_analysis.json` unter
`pages[*].pageId`, dort lesen.

1. Startseite
2. Immunsystem
3. Vitamine
4. SoProtein Vegan
5. Ueber uns
6. Alle Produkte
7. unsere Neuheiten
8. Produktselektor
9. Geschenk-Sets
10. Unsere Empfehlungen

## Phase 1: DOM-Extraktion, pro Seite

1. Chrome MCP oeffnen, URL ansteuern.
2. In 300-Pixel-Schritten mit 400 Millisekunden Pause bis zum Seitenende
   scrollen, um Lazy-Load zu triggern.
3. 3 Sekunden warten, damit zuletzt geladene Bilder volle Aufloesung haben.
4. `scripts/extract-page-dom.js` via `javascript_tool` injizieren.
5. Rohdaten unter
   `data/store-knowledge/rerun-v3/raw-dom/natural-elements_<slug>_dom.json`
   ablegen.

Wenn die Extraktion einmal scheitert: 15 Sekunden warten, dann retryen.
Wenn der zweite Versuch auch scheitert: Seite als `extraction_failed` im
Arbeitsprotokoll markieren, weitermachen mit naechster Seite. Nicht
faken.

## Phase 2: Vision-Pass, pro Seite

Nach Phase 1 fuer jede Seite, die erfolgreich extrahiert wurde:

### 2a. Full-Page-Screenshot

1. Zurueck nach ganz oben scrollen, 1 Sekunde warten.
2. Full-Page-Screenshot via Chrome DevTools Protocol
   `Page.captureScreenshot({ captureBeyondViewport: true, format: 'png' })`.
3. Ablage unter
   `data/store-knowledge/rerun-v3/screenshots/natural-elements_<slug>.png`.

Falls Viewport-Limit zuschlaegt (frueher bei 1309x602 dokumentiert): den
Screenshot-Lauf segmentiert in 3 oder 4 Abschnitten machen (oberer
Drittel, mittlerer Drittel, unterer Drittel), per Modul-Zuordnung aus
Phase 1 zuordnen, in `rerun-v3/screenshots-segmented/<slug>/` ablegen.

### 2b. Vision-Modell-Aufruf

Pro Seite einmalig mit dem Full-Page-Screenshot plus Phase-1-Output als
Kontext:

- System-Prompt: `docs/BLUEPRINT_EXTRACTION_PROMPT.md` (kompletter Text)
- User-Message: Phase-1-DOM-Output plus Screenshot plus Kontext-Hinweis
  (pageName, storeUrl, pageId)
- Modell: Claude Sonnet 4.6 oder Gemini 2.5 Pro, je nach Verfuegbarkeit
- Output: strikt JSON, dem Seiten-Schema aus BLUEPRINT_EXTRACTION_PROMPT
  Paragraf 13 entsprechend
- Ablage: `data/store-knowledge/rerun-v3/blueprints/natural-elements_<slug>.json`

### 2c. Validierung pro Seite

Vor dem naechsten Seite-Durchgang pruefen:

- JSON ist valide und parsbar
- Alle `layoutType`-Werte aus den 29 erlaubten (Paragraf 3)
- Alle `designIntent`-Werte aus den 7 erlaubten (Paragraf 10)
- Alle `backgroundStyle`-Werte aus den 6 erlaubten (Paragraf 5)
- Alle `imageCategory`-Werte aus den 6 erlaubten (Paragraf 6)
- Alle `textOnImage.origin`-Werte aus den 5 erlaubten (Paragraf 9)
- Keine Em-Dashes oder En-Dashes in extrahierten Texten
- Summe `elementProportions` pro Tile ca. 100

Bei Verletzung eines Checks: Feld in `openQuestions` der Seite
protokollieren und das Modell mit engerem Prompt einmal nachschaerfen
lassen. Wenn der zweite Anlauf es auch nicht packt, als Open Question
stehen lassen und im Phase-2-Report vermerken.

## Phase 2 Aggregation

Nach allen 10 Seiten:

1. Alle 10 Phase-2-Blueprints in
   `data/store-knowledge/rerun-v3/natural-elements_analysis.json`
   aggregieren, gleiche Top-Level-Struktur wie Gold
   (`storeMetadata`, `pages[]`, `openQuestions`), aber **ohne**
   `storeAnalysis`-Block. Den fuellt Phase 3 nach.
2. `methodology` auf `V4-v3-Blueprint-vision` setzen.
3. `v2SchemaNote` durch `v3SchemaNote` ersetzen mit kurzer Beschreibung:
   "Phasen 1 plus 2 abgeschlossen, Phase 3 ausstehend".

## Phase 2 Report

Datei: `docs/NE_V3_RERUN_REPORT.md`. Struktur:

**A. Coverage-Matrix** pro Seite: Gold-Module vs Rerun-Module, Delta,
Delta-Typ.

**B. Schema-Compliance**: welcher Prozent der Pflichtfelder ist gefuellt
(nicht `screenshot_required`, nicht `null`, nicht Leerstring)? Pro
Feldgruppe (Modul-Felder, Tile-Felder, textOnImage-Felder).

**C. Vision-Qualitaet**: Stichprobe von 10 Tiles ueber alle Seiten, in
denen Vision-Felder besonders wichtig sind (Hero-Module, Shoppable,
Editorial-Banner mit Text). Pro Tile:
- textOnImage.visibleText korrekt extrahiert?
- textOnImage.origin korrekt klassifiziert (baked_in vs layered_text)?
- dominantColors plausibel?
- imageCategory plausibel?

**D. Delta zum Gold-Stand**: welche markanten Abweichungen (Modul-Grenzen
anders, layoutType grober, designIntent anders)? Jeweils eine Zeile.

**E. Workflow-Bruchstellen**: welche Phase 1 oder Phase 2 Schritte
sind haengengeblieben, bei welcher Seite, welches Retry-Verhalten hat
geholfen.

**F. Empfehlung**: kann mit dem v3-Workflow auf die 19 anderen Stores
ausgerollt werden? Wenn ja, welche Haerte-Fixes sind optional aber
wuenschenswert? Wenn nein, welche Blocker?

## Commit und Push

Am Ende einen Commit auf `claude/ne-v3-rerun-<suffix>`:

```
natural-elements v3 rerun, Phase 1 plus Phase 2

- Phase 1 DOM-Extraktion ueber alle 10 Seiten
- Phase 2 Vision-Pass mit v3-Schema
- Aggregiertes analysis.json ohne storeAnalysis (Phase 3 offen)
- Full-Page-Screenshots pro Seite
- Report docs/NE_V3_RERUN_REPORT.md
```

Push auf origin versuchen. Falls das Credentials-Problem aus der Sandbox
erneut auftritt, dem User die Push-Befehle an die Hand geben:

```bash
git push -u origin claude/ne-v3-rerun-<suffix>
```

## Abbruchkriterien

- Mehr als 3 Seiten scheitern in Phase 1: Stop, User informieren.
- Vision-Modell liefert auf mehr als 3 Seiten Schema-Violations, die
  auch nach einem Nachschaerfungs-Anlauf bleiben: Stop, User informieren
  mit Beispiel-Output.
- Unerwartete Schema-Unsicherheit (zum Beispiel ein layoutType, der im
  Gold-Stand nicht vorkommt, aber auch nicht in der 29er-Liste): nicht
  einfach einen neuen Wert erfinden. Den naechstliegenden Wert nehmen
  und in `openQuestions` einen Vorschlag fuer eine Schema-Erweiterung
  formulieren.

## Working-Rules

- Viewport im Chrome MCP ist auf 1309x602 limitiert. Full-Page-Screenshot
  via `captureBeyondViewport: true` funktioniert trotzdem, weil das CDP
  direkt auf das Render-Backend geht. Sollte das scheitern, auf
  segmentierte Screenshots in 3 bis 4 Abschnitten umschalten.
- `.git/index.lock` auf dem FUSE-Mount ist ein bekanntes Problem. Wenn
  der Lock auftritt, in `/tmp` neuen Clone erzeugen, dort committen,
  dann `git fetch` zurueck.
- Kein Push ohne Credentials. Im Zweifel User benachrichtigen.
- CLAUDE.md-Regeln strikt einhalten, insbesondere Em-Dash und En-Dash
  Verbot und USP-Regel.

## Am Ende kurz zusammenfassen

Eine Zeile pro Ergebnis:

- Phase 1: X von 10 Seiten erfolgreich
- Phase 2: X von 10 Seiten mit gueltigem Vision-Output
- Schema-Compliance: X Prozent der Pflichtfelder gefuellt
- Commit-Hash und Branch
- Pushed: ja oder nein
- Empfehlung fuer 19-Store-Rollout: ja, mit Hinweisen, oder nein plus
  Blocker
