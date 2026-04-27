# Juskys Brand Store Briefing

Tool natives Briefing für den Aufbau im Amazon Store Builder Tool. Vokabular und Feldnamen entsprechen `src/constants.js` (LAYOUTS, TILE_TYPES, MODULE_BAUKASTEN, emptyTile).

---

## 1. Store Top Level Felder

Diese Werte gehen in das Store Wurzelobjekt (siehe `EMPTY_STORE` in `src/App.jsx`).

| Feld | Wert |
|------|------|
| `brandName` | Juskys |
| `marketplace` | de |
| `category` | generic |
| `headerBannerColor` | #93bd26 |
| `brandTone` | Nahbar, konkret, praktisch. Ohne Premium Pose, ohne Superlative. Duzen. Kein Schwarz, kein Em Dash, kein En Dash, kein Bindestrich mit Leerzeichen in kundensichtbaren Texten. |
| `brandStory` | Juskys ist Teil eines familiengeführten Hauses in Süddeutschland. Wir gestalten Möbel und Produkte für Zuhause, Garten und Alltag. Klare Formen, ehrliche Materialien, faire Preise. Ein Sortiment für viele Lebensbereiche bei einem verlässlichen Anbieter. |
| `asins` | 270 ASINs aus der Liste, 1 zu 1 übernehmen |

---

## 2. Corporate Identity

| Rolle | Farbe | HEX |
|-------|-------|-----|
| Hauptakzent (CTA, Highlights, Icon Kreise) | Juskys Hellgrün | `#93bd26` |
| Haupttext (Fließtext, Sublines, Labels) | Dunkelgrau Blaugrau | `#4f5969` |
| Hintergrund Default | Hellgrau | ⚠️ HEX vom Kunden |
| Hintergrund Alternativ | Beige | ⚠️ HEX vom Kunden |
| Hintergrund Kontrast | Weiß | `#FFFFFF` |
| Sekundäre Textfarbe | Weiß | `#FFFFFF` (nur auf grünem oder dunkelgrauem Untergrund) |

**Verboten:** Schwarz als Textfarbe, Dunkelgrau als Vollflächen Hintergrund.

### 2.1 Headline Signatur, "ein Wort grün"

Jede Headline hat genau ein Wort in `#93bd26`, der Rest in Weiß (auf Foto) oder `#4f5969` (auf hell). Beispiel: "Räume, die **passen**".

### 2.2 Schrift

⚠️ Schriftname vom Kunden. Stilrichtung: geometrische Grotesk. Headlines in Versalien, Sublines im dünnen Schnitt.

### 2.3 Icon System

Grüner Vollkreis (`#93bd26`), weißes Linien Icon (2 Pixel Strichstärke), Label darunter in `#4f5969`, 2 bis 3 Wörter.

---

## 3. Marken USPs (produktunabhängig)

1. Aus einem Haus, breites Sortiment für Zuhause, Garten und Alltag
2. Familiengeführt aus Süddeutschland
3. Schnelle Lieferung mit Amazon Logistik
4. Montagefreundlich konzipiert

---

## 4. Tool Vokabular

### 4.1 Tile Types (aus `TILE_TYPES`)

| Type | Bedeutung |
|------|-----------|
| `image` | Bild mit Text Overlay |
| `image_text` | Bild mit nativem Text daneben |
| `shoppable_image` | klickbare Hotspots, **maximal 5 Hotspots pro Tile** |
| `product_grid` | ASIN Grid |
| `best_sellers` | Bestseller Grid |
| `recommended` | Empfohlene Produkte |
| `deals` | Aktionen, reduzierte Preise |
| `video` | Video |
| `text` | nativer Text, nur als Section Heading |
| `product_selector` | Quiz |

### 4.2 Layouts (aus `LAYOUTS`)

| Layout ID | Beschreibung | Cells |
|-----------|--------------|------:|
| `1` | Full Width | 1 |
| `std-2equal` | 2 Equal | 2 |
| `lg-2stack` | Large + 2 Stacked | 3 |
| `2stack-lg` | 2 Stacked + Large | 3 |
| `vh-w2s` | Wide + 2 Squares (VH) | 3 |
| `vh-2sw` | 2 Squares + Wide (VH) | 3 |
| `2x2wide` | 4 Equal (2x2 Wide) | 4 |
| `lg-4grid` | Large + 2x2 Grid | 5 |
| `4grid-lg` | 2x2 Grid + Large | 5 |
| `2s-4grid` | 2 Stacked + 2x2 Grid | 6 |
| `4grid-2s` | 2x2 Grid + 2 Stacked | 6 |
| `4x2grid` | 4x2 Grid | 8 |
| `vh-2equal` | 2 Equal (VH) | 2 |
| `vh-4square` | 4 Squares (VH) | 4 |

---

## 5. Notation im Briefing

### 5.1 textOverlay Markup

Im `textOverlay` Feld markiere ich das grüne Highlight Wort mit `**WORT**` (Sterne werden mit eingegeben, der Designer ersetzt sie durch grüne Schriftauszeichnung).

### 5.2 ASIN Platzhalter

| Platzhalter | Bedeutung |
|-------------|-----------|
| `<TOP-N-CAT>` | N. Bestseller in Kategorie CAT (z.B. `<TOP-8-GARTEN>`) |
| `<ALL-CAT>` | alle ASINs der Kategorie nach Bestseller Rang |
| `<DEALS-CAT>` | reduzierte ASINs der Kategorie |

Diese Platzhalter werden durch echte ASINs ersetzt, sobald die Coverage Matrix befüllt ist.

### 5.3 Section Notation

Jede Section hat:
- `module`, Referenz auf `MODULE_BAUKASTEN`, z.B. `hero.fullWidthHero`
- `layoutId`, Layout ID aus Tabelle 4.2
- `tiles`, Liste von Tiles mit Feldern `type`, `brief`, `textOverlay`, `ctaText`, `linkUrl`, `asins`, `hotspots`

---

## 6. Pages

10 Pages in dieser Reihenfolge:

1. Home (Page 1) ⏳ folgt in Schritt 2
2. Bestseller (Page 2)
3. Garten (Page 3)
4. Möbel (Page 4)
5. Freizeit (Page 5)
6. Heimwerken (Page 6)
7. Haushalt (Page 7)
8. Tierbedarf (Page 8)
9. Sale (Page 9)
10. Über Uns (Page 10)

⏳ Inhalt der Pages wird in den nachfolgenden Schritten ergänzt.

---

## 7. Validierung

Nach Befüllung muss `validateStore()` aus `src/constants.js` ohne Errors durchlaufen.

**Pflicht Checks:**
- jede Section hat eine gültige `layoutId` aus Tabelle 4.2
- jeder Tile hat einen gültigen `type` aus Tabelle 4.1
- `shoppable_image` Tiles haben maximal 5 Hotspots
- alle ASINs aus dem Store Top Level sind in mindestens einem Tile referenziert (Coverage Sanity Check)
