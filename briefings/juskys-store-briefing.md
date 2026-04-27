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

1. Home, siehe 6.1
2. Bestseller, siehe 6.2 ⏳
3. Garten, siehe 6.3 ⏳
4. Möbel, siehe 6.4 ⏳
5. Freizeit, siehe 6.5 ⏳
6. Heimwerken, siehe 6.6 ⏳
7. Haushalt, siehe 6.7 ⏳
8. Tierbedarf, siehe 6.8 ⏳
9. Sale, siehe 6.9 ⏳
10. Über Uns, siehe 6.10 ⏳

### 6.1 Home

11 Sections.

```yaml
page:
  name: Home
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Räume, die **passen**"
          brief: "Designer Komposition Wohnzimmer hell. Subline: Möbel und mehr für jeden Tag, aus einem Haus."
          ctaText: "Sortiment entdecken"

    - section: 2
      module: categoryNav.grid6tiles
      layoutId: '2s-4grid'
      tiles:
        - type: image
          textOverlay: "**GARTEN**"
          brief: "Kategorie Tile Garten. Subline: Lounge, Tische, Schatten."
          linkUrl: "page:Garten"
        - type: image
          textOverlay: "**MÖBEL**"
          brief: "Kategorie Tile Möbel. Subline: Sofas, Betten, Bad."
          linkUrl: "page:Möbel"
        - type: image
          textOverlay: "**FREIZEIT**"
          brief: "Kategorie Tile Freizeit. Subline: Camping, Koffer, Weihnachten."
          linkUrl: "page:Freizeit"
        - type: image
          textOverlay: "**HEIMWERKEN**"
          brief: "Kategorie Tile Heimwerken. Subline: Werkzeug, Leitern, Heizungen."
          linkUrl: "page:Heimwerken"
        - type: image
          textOverlay: "**HAUSHALT**"
          brief: "Kategorie Tile Haushalt. Subline: Küche, Stauraum, Alltagshilfen."
          linkUrl: "page:Haushalt"
        - type: image
          textOverlay: "**TIERBEDARF**"
          brief: "Kategorie Tile Tierbedarf. Subline: Hund, Katze, Freilauf."
          linkUrl: "page:Tierbedarf"

    - section: 3
      module: trust.trustSplit
      layoutId: 'std-2equal'
      tiles:
        - type: image
          textOverlay: ""
          brief: "Team oder Hallenbild aus juskys.de. Warmes Tageslicht, Mitarbeiter im Hintergrund."
        - type: image_text
          textOverlay: "Ein **Haus**, viele Räume"
          brief: "Subline: Familiengeführt aus Süddeutschland. Plus Fließtext 55 Wörter Brand Story Kurzform."
          ctaText: "Mehr über Juskys"
          linkUrl: "page:Über Uns"

    - section: 4
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Räume, die **zusammen** passen"
          brief: "Trenner Textbild. Stoff Makro auf hellem Grund. Anthrazit Text, ein Wort grün."

    - section: 5
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Ein Wohnzimmer, **fünf** Klicks"
          brief: "Designer Komposition Wohnzimmer mit Sofa, Sessel, Beistelltisch, Lampe, Teppich. 5 Hotspots auf den jeweiligen Produkten platzieren."
          hotspotsPlaceholder: "<TOP-5-MOEBEL-WOHNEN>"

    - section: 6
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die meistgekauften **Lieblinge**"
          brief: "Top 8 Bestseller kategorieübergreifend."
          asinsPlaceholder: "<TOP-8-OVERALL>"

    - section: 7
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Draußen ist auch ein **Zimmer**"
          brief: "Trenner Textbild. Rattan oder Polyrattan Makro auf hellem Grund."

    - section: 8
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Draußen, so **gemütlich** wie drinnen"
          brief: "Designer Komposition Terrasse Loungegruppe, Sonnenschirm, Beistelltisch, Outdoor Kissen. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-GARTEN-LOUNGE>"

    - section: 9
      module: features.featureGrid4wide
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**Aus** einem Haus"
          brief: "Marken USP Tile. Grüner Icon Kreis Haus, weiße Linie. Label darunter: Sortiment für Zuhause, Garten, Alltag."
        - type: image
          textOverlay: "**Schnell** geliefert"
          brief: "Marken USP Tile. Grüner Icon Kreis Truck, weiße Linie. Label: Mit Amazon Logistik."
        - type: image
          textOverlay: "**Montagefreundlich**"
          brief: "Marken USP Tile. Grüner Icon Kreis Schraubenschlüssel, weiße Linie. Label: Verständliche Anleitung."
        - type: image
          textOverlay: "**Familiengeführt**"
          brief: "Marken USP Tile. Grüner Icon Kreis Herz, weiße Linie. Label: Aus Süddeutschland."

    - section: 10
      module: engagement.followBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "**Folge** Juskys"
          brief: "Follow Banner auf Hellgrau. Hinweis dass neue Produkte und Aktionen direkt im Feed landen."
          ctaText: "Folgen"

    - section: 11
      module: footer.categoryNavFooter
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**GARTEN**"
          brief: "Footer Kategorie Tile mit Mini Icon."
          linkUrl: "page:Garten"
        - type: image
          textOverlay: "**MÖBEL**"
          brief: "Footer Kategorie Tile mit Mini Icon."
          linkUrl: "page:Möbel"
        - type: image
          textOverlay: "**HAUSHALT**"
          brief: "Footer Kategorie Tile mit Mini Icon."
          linkUrl: "page:Haushalt"
        - type: image
          textOverlay: "**ÜBER** UNS"
          brief: "Footer Tile zur Brand Story."
          linkUrl: "page:Über Uns"
```

Saisonale Variante November bis Januar: Section 8 Bild und textOverlay tauschen gegen `Weihnachten **zuhause**`, hotspotsPlaceholder `<TOP-5-FREIZEIT-WEIHNACHT>`.

---

## 7. Validierung

Nach Befüllung muss `validateStore()` aus `src/constants.js` ohne Errors durchlaufen.

**Pflicht Checks:**
- jede Section hat eine gültige `layoutId` aus Tabelle 4.2
- jeder Tile hat einen gültigen `type` aus Tabelle 4.1
- `shoppable_image` Tiles haben maximal 5 Hotspots
- alle ASINs aus dem Store Top Level sind in mindestens einem Tile referenziert (Coverage Sanity Check)
