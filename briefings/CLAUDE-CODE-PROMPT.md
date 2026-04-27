# Claude Code Prompt: Juskys Brand Store generieren

Diesen Prompt in einer neuen Claude Code Session im Repo `amazon-store-builder` einsetzen.

---

## Aufgabe

Du arbeitest im Amazon Store Builder Repo. Generiere aus dem Briefing in `briefings/juskys-store-briefing.md` ein vollständiges, valides Juskys Brand Store JSON Objekt. Speichere es als `seed/juskys-store.json` und stelle sicher, dass es ohne Fehler durch `validateStore()` läuft.

## Kontext, was du wissen musst

Die Schema Definitionen liegen in:

- `src/constants.js`
  - `LAYOUTS` Array, alle gültigen Layout IDs
  - `TILE_TYPES` Array, alle gültigen Tile Types
  - `MODULE_BAUKASTEN` Modul Baukasten Referenzen
  - `LAYOUT_TILE_DIMS` Default Dimensionen pro Layout und Tile Position
  - `emptyTile()` Default Tile Struktur
  - `emptyTileForLayout(layoutId, tileIndex)` Tile mit korrekten Default Dimensionen
  - `validateStore(store)` Validation Funktion
  - `uid()` ID Generierung
- `src/App.jsx`
  - `EMPTY_STORE` Top Level Struktur

Lies diese Stellen einmal, bevor du den Store baust, damit du das Schema kennst.

## Was zu tun ist

### 1. Briefing lesen

Lies `briefings/juskys-store-briefing.md` vollständig durch. Die Datei enthält:

- Kapitel 1, Store Top Level Felder
- Kapitel 2, CI mit HEX Werten
- Kapitel 3, Marken USPs
- Kapitel 4, Tool Vokabular Mapping
- Kapitel 5, Notation für Markup und ASIN Platzhalter
- Kapitel 6, 10 Pages mit Sections und Tiles in YAML Code Blöcken (6.1 bis 6.10)
- Kapitel 7, Validierungsregeln

### 2. Store JSON bauen

Erstelle ein JavaScript Objekt das `EMPTY_STORE` entspricht und befülle es:

#### 2.1 Top Level

Aus Briefing Kapitel 1:
- `brandName`, `marketplace`, `category`, `brandTone`, `brandStory`, `headerBannerColor`
- `asins`, leere Liste vorerst, da ASIN Daten extern befüllt werden (kommentar im Code dass die 270 ASINs später eingefüttert werden)
- `pages`, Liste mit 10 Pages, siehe 2.2

#### 2.2 Pages

Für jede Page in den YAML Blöcken aus Briefing Kapitel 6:

- `id`, generiert mit `uid()` aus constants.js
- `name`, aus Briefing
- `sections`, Liste, siehe 2.3

#### 2.3 Sections

Für jede Section im YAML:

- `id`, mit `uid()`
- `layoutId`, aus Briefing
- `tiles`, Liste mit Default Werten aus `emptyTileForLayout(layoutId, tileIndex)` plus die im Briefing gesetzten Werte überschrieben

#### 2.4 Tiles

Für jeden Tile im YAML:

- Starten mit `emptyTileForLayout(layoutId, tileIndex)` als Basis
- Felder überschreiben aus Briefing:
  - `type`, übernehmen
  - `brief`, übernehmen
  - `textOverlay`, übernehmen, **`**WORT**` Markup unverändert beibehalten** (der Designer interpretiert die Sterne als grüne Schriftauszeichnung)
  - `ctaText`, übernehmen falls gesetzt
  - `linkUrl`, übernehmen falls gesetzt (Format `page:Möbel` ist OK als interner Link Hinweis, der spätere UI Schritt setzt das auf eine echte Page Referenz um)
  - `asins`, leere Liste, plus den `asinsPlaceholder` Wert aus YAML als ersten Eintrag (Stringliteral wie `<TOP-8-MOEBEL-SOFAS>`), damit später ein Operator die Platzhalter durch echte ASINs ersetzen kann
  - `hotspots`, leere Liste, plus Kommentar im `brief` Feld dass `<TOP-5-XXX>` Platzhalter manuell durch 5 ASINs ersetzt werden muss

### 3. Schreiben und Validieren

- Schreibe das fertige Objekt nach `seed/juskys-store.json` mit 2 Space Indent
- Lade es aus dem JSON wieder ein und rufe `validateStore()` auf
- Falls Errors, korrigiere sie und re-validiere bis 0 Errors bleiben
- Gib am Ende eine Statistik aus:
  - Anzahl Pages, Sections, Tiles
  - Anzahl ASIN Platzhalter
  - Anzahl shoppable_image Tiles
  - Validation Errors und Warnings

### 4. Loader Skript schreiben

Erstelle `seed/juskys-store-loader.js`, ein Node Skript das:

1. `seed/juskys-store.json` liest
2. einen POST gegen `http://localhost:3000/api/stores` macht (oder konfigurierbarer URL via env var `STORE_API_URL`)
3. die Response auswertet und `id` plus `shareToken` ausgibt

Das Skript verwendet `fetch` aus Node 18+, kein extra Dependency.

## Constraints

- Marketplace ist `de`, alle Texte bleiben Deutsch
- Keine Em Dash, keine En Dash, keine Bindestriche mit Leerzeichen in `textOverlay` und `brief`
- shoppable_image Tiles haben **maximal 5** Hotspots
- `**WORT**` Markup bleibt unverändert in `textOverlay`, NICHT als Markdown rendern oder entfernen
- ASIN Platzhalter wie `<TOP-N-CAT>` und `<ALL-CAT>` und `<DEALS-CAT>` bleiben als Strings im `asins` Array stehen, kein Versuch sie aufzulösen

## Deliverables

1. `seed/juskys-store.json`, vollständiges Store JSON
2. `seed/juskys-store-loader.js`, Loader Skript
3. Statistik Ausgabe in der Konsole, plus kurzer Bericht im Chat:
   - Wie viele Pages, Sections, Tiles
   - Welche Validation Probleme gefixt wurden
   - Wie der User den Store ins Tool lädt (Befehl für den Loader)

## Wenn etwas nicht klar ist

Im Briefing fehlende Felder ⚠️ (Hellgrau HEX, Beige HEX, Schriftname, exakte ASINs) markierst du im Code mit Kommentaren `// TODO: vom Kunden eintragen`. Den Store trotzdem voll bauen mit Default Werten, Platzhalter Strings sind erlaubt.

Kein Versuch externe APIs (Bright Data, Anthropic) zu rufen. Nur reine Codetransformation aus Briefing zu Store JSON.

## Erwartetes Ergebnis

Nach Lauf liegt im Repo:
- `seed/juskys-store.json` mit 10 Pages, ~104 Sections, ~270 Tiles
- `seed/juskys-store-loader.js` als Loader

Der User startet `npm run dev`, dann in einem zweiten Terminal `node seed/juskys-store-loader.js`, der Store erscheint im UI als gespeicherter Store, kann geöffnet und weiter bearbeitet werden.
