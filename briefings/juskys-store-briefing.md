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

### 5.1 Tile Schema, strukturiert

`tile.textOverlay` ist ein **Objekt** mit Subfeldern, kein einzelner String. Jedes Subfeld ist optional, wird leer gelassen wenn nicht gebraucht.

```yaml
textOverlay:
  heading: ""       # Hauptüberschrift, optional mit ein Wort grün markiert
  subheading: ""    # Unterüberschrift, kein Markup
  body: ""          # Fließtext, MAXIMAL 350 Zeichen
  bullets: []       # Liste Kurzclaims, je 2 bis 4 Wörter
  cta: ""           # Button Beschriftung
```

### 5.2 Highlight Wort Markup

In `textOverlay.heading` markiere das grüne Highlight Wort mit `**WORT**`. Beispiel `Was **dein** Zuhause braucht`. Die Sterne werden im Briefing eingegeben, der Designer ersetzt sie durch grüne Schriftauszeichnung. Maximal **ein** grünes Wort pro Heading.

`subheading`, `body`, `bullets`, `cta` tragen **kein** Markup.

### 5.3 brief Feld, klare Regeln

`tile.brief` enthält **nur Bildfunktion und Komposition**. Konkret zulässig:

- Bildfunktion (Hero, Trenner, Shoppable, Bestseller Grid, Detail, etc.)
- Komposition (was im Bild zu sehen ist, Anordnung der Hauptelemente)
- Bei `shoppable_image` Tiles: welche Bildelemente Hotspots bekommen

**Nicht** ins brief Feld:

- Lichtsetzung, Stimmung, Schattendetails, Tageszeit
- Textinhalte (gehören in `textOverlay`)
- Hotspot Koordinaten x oder y

### 5.4 Hotspots

Das Feld `tile.hotspots` ist ein Array von `{ x, y, asin }` Objekten, maximal 5 Einträge. Im Konzept Briefing bleibt es leer, der Loader füllt es ein wenn ASINs verknüpft sind.

Welche Bildelemente Hotspots bekommen, beschreibst du in `brief`. Beispiel:

```yaml
brief: "Shoppable Bild Wohnzimmer. 5 Hotspots auf Sofa, Sessel, Beistelltisch, Lampe, Teppich."
```

### 5.5 ASIN Platzhalter

In `tile.asins` Array stehen Platzhalter Strings, bis die Coverage Matrix befüllt ist:

| Platzhalter | Bedeutung |
|-------------|-----------|
| `<TOP-N-CAT>` | N. Bestseller in Kategorie CAT (z.B. `<TOP-8-GARTEN>`) |
| `<ALL-CAT>` | alle ASINs der Kategorie nach Bestseller Rang |
| `<DEALS-CAT>` | reduzierte ASINs der Kategorie |

### 5.6 Section Notation

Jede Section hat:
- `module`, Referenz auf `MODULE_BAUKASTEN`, z.B. `hero.fullWidthHero`
- `layoutId`, Layout ID aus Tabelle 4.2
- `tiles`, Liste von Tiles mit Feldern `type`, `textOverlay` (Objekt), `brief` (String), `linkUrl`, `asins` (Array), `hotspots` (Array, leer)

### 5.7 Beispiel Tile, vollständig

```yaml
- type: shoppable_image
  textOverlay:
    heading: "Outdoor Wohnen, **bereit** für die Saison"
    subheading: "Loungegruppen, Tische, Schatten"
    body: ""
    bullets:
      - "Wetterfest"
      - "Modular kombinierbar"
      - "Schnell aufgebaut"
    cta: ""
  brief: "Shoppable Bild Terrasse. Loungegruppe als Hauptmotiv mit Sonnenschirm, Beistelltisch, Outdoor Kissen. 5 Hotspots auf Sofa, Sessel, Beistelltisch, Sonnenschirm, Kissen."
  asins: ["<TOP-5-GARTEN-LOUNGE>"]
  hotspots: []
```

---

## 6. Pages

10 Pages in dieser Reihenfolge:

1. Home, siehe 6.1
2. Bestseller, siehe 6.2
3. Garten, siehe 6.3
4. Möbel, siehe 6.4
5. Freizeit, siehe 6.5
6. Heimwerken, siehe 6.6
7. Haushalt, siehe 6.7
8. Tierbedarf, siehe 6.8
9. Sale, siehe 6.9
10. Über Uns, siehe 6.10

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
          textOverlay: "Was **dein** Zuhause braucht"
          brief: "Designer Komposition Wohnzimmer hell. Subline: Möbel, Garten, Heimwerken, Haushalt, Tier und Freizeit, aus einem Haus."
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
          textOverlay: "Wohnzimmer, **komplett** gedacht"
          brief: "Designer Komposition Wohnzimmer mit Sofa, Sessel, Beistelltisch, Lampe, Teppich. Bis zu 5 Hotspots auf den Hauptprodukten."
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
          textOverlay: "Die **Saison** beginnt zuhause"
          brief: "Trenner Textbild. Rattan oder Polyrattan Makro auf hellem Grund."

    - section: 8
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Lounge, fertig zum **Loslegen**"
          brief: "Designer Komposition Terrasse Loungegruppe, Sonnenschirm, Beistelltisch, Outdoor Kissen. Bis zu 5 Hotspots."
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

### 6.2 Bestseller

9 Sections.

```yaml
page:
  name: Bestseller
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Was unsere **Kunden** lieben"
          brief: "Designer Komposition Mix Lifestyle aus mehreren Kategorien. Subline: Die meistgekauften Juskys Produkte."

    - section: 2
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top **12** insgesamt"
          brief: "12 Top Bestseller über alle Kategorien."
          asinsPlaceholder: "<TOP-12-OVERALL>"

    - section: 3
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Garten**"
          brief: "Top 8 Bestseller aus Garten."
          asinsPlaceholder: "<TOP-8-GARTEN>"

    - section: 4
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Möbel**"
          brief: "Top 8 Bestseller aus Möbel."
          asinsPlaceholder: "<TOP-8-MOEBEL>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Freizeit**"
          brief: "Top 6 Bestseller aus Freizeit."
          asinsPlaceholder: "<TOP-6-FREIZEIT>"

    - section: 6
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Heimwerken**"
          brief: "Top 6 Bestseller aus Heimwerken."
          asinsPlaceholder: "<TOP-6-HEIMWERKEN>"

    - section: 7
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Haushalt**"
          brief: "Top 8 Bestseller aus Haushalt."
          asinsPlaceholder: "<TOP-8-HAUSHALT>"

    - section: 8
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Top in **Tierbedarf**"
          brief: "Top 6 Bestseller aus Tierbedarf."
          asinsPlaceholder: "<TOP-6-TIERBEDARF>"

    - section: 9
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "Warum **diese** Bestseller"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Meistgekauft**"
          brief: "Square mit grünem Icon Kreis Stern."
        - type: image
          textOverlay: "**Top** bewertet"
          brief: "Square mit grünem Icon Kreis Schild Check."
```

### 6.3 Garten

13 Sections. 14 Sub Kategorien werden über zwei Navigator Sections (8 plus 6) erschlossen.

```yaml
page:
  name: Garten
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Die **Saison** beginnt hier"
          brief: "Designer Komposition Terrasse Abendlicht mit Loungegruppe und Sonnenschirm. Subline: Lounge, Tische, Schatten und alles für draußen."
          ctaText: "Loungegruppen entdecken"

    - section: 2
      module: categoryNav.grid8tiles
      layoutId: '4x2grid'
      tiles:
        - type: image
          textOverlay: "**GARTENMÖBEL** SETS"
          brief: "Sub Kategorie Tile. Freigestelltes Sitzgruppen Rendering auf Beige."
        - type: image
          textOverlay: "**GARTENAUFBEWAHRUNG**"
          brief: "Sub Kategorie Tile. Gerätehaus oder Aufbewahrungsbox Rendering."
        - type: image
          textOverlay: "**GARTENBEDARF**"
          brief: "Sub Kategorie Tile. Pflanzkübel oder Gartenwerkzeug Rendering."
        - type: image
          textOverlay: "**SONNENSCHUTZ**"
          brief: "Sub Kategorie Tile. Sonnenschirm oder Sonnensegel Rendering. Subline: Sonnenschutz und Sichtschutz."
        - type: image
          textOverlay: "**GARTENLIEGEN**"
          brief: "Sub Kategorie Tile. Gartenliege Rendering."
        - type: image
          textOverlay: "**GARTENBÄNKE**"
          brief: "Sub Kategorie Tile. Gartenbank Rendering."
        - type: image
          textOverlay: "**GARTENTISCHE**"
          brief: "Sub Kategorie Tile. Gartentisch Rendering."
        - type: image
          textOverlay: "**BIERZELTGARNITUREN**"
          brief: "Sub Kategorie Tile. Bierzeltgarnitur Rendering."

    - section: 3
      module: categoryNav.grid6tiles
      layoutId: '2s-4grid'
      tiles:
        - type: image
          textOverlay: "**KISSENBOXEN**"
          brief: "Sub Kategorie Tile. Kissenbox Rendering."
        - type: image
          textOverlay: "**GRILLS**"
          brief: "Sub Kategorie Tile. Grill Rendering. Subline: Gas und Holzkohle."
        - type: image
          textOverlay: "**HÄNGEMATTEN**"
          brief: "Sub Kategorie Tile. Hängematte oder Hängesessel Rendering."
        - type: image
          textOverlay: "**ÜBERDACHUNGEN**"
          brief: "Sub Kategorie Tile. Pavillon oder Überdachung Rendering."
        - type: image
          textOverlay: "**POOLBEDARF**"
          brief: "Sub Kategorie Tile. Pool Zubehör Rendering."
        - type: image
          textOverlay: "**GEWÄCHSHÄUSER**"
          brief: "Sub Kategorie Tile. Gewächshaus Rendering."

    - section: 4
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Lounge, **gebaut** für lange Abende"
          brief: "Designer Komposition Loungegruppe mit Sofa, Sessel, Beistelltisch, Outdoor Kissen, Pflanzkübel. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-GARTEN-LOUNGE>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Loungegruppen**"
          brief: "Top 8 Bestseller aus Sub Gartenmöbel Sets."
          asinsPlaceholder: "<TOP-8-GARTEN-LOUNGE>"

    - section: 6
      module: products.productShowcaseLarge
      layoutId: 'lg-2stack'
      tiles:
        - type: image
          textOverlay: "Der **Schirm**, der Schatten macht"
          brief: "Large Image Top Sonnenschirm aus Galerie. Designer Komposition mit Schirm im Garten."
          ctaText: "Jetzt ansehen"
        - type: image
          textOverlay: "**UV** beständig"
          brief: "Wide Tile. USP Bullet zum Material und UV Schutz."
        - type: image
          textOverlay: "**Wasserabweisend**"
          brief: "Wide Tile. USP Bullet zur Witterungsfestigkeit."

    - section: 7
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Auch **kleinere** Flächen"
          brief: "Trenner Textbild. Pflanzen oder Balkonszene Makro."

    - section: 8
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Auch auf dem **Balkon**"
          brief: "Designer Komposition Balkon mit Bistroset, Sonnensegel, Pflanzkübel. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-GARTEN-BALKON>"

    - section: 9
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Mehr **Lieblinge** für draußen"
          brief: "Top 8 Bestseller aus Sonnenschutz, Hängematten, Poolbedarf gemischt."
          asinsPlaceholder: "<TOP-8-GARTEN-DIVERSE>"

    - section: 10
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Grillen, **stilvoll**"
          brief: "Designer Komposition Grill Setup, Holzkohle oder Gas. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-GARTEN-GRILL>"

    - section: 11
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**Wetterfest** durch die Saison"
          brief: "Wide Image plus 3 Wetter Icons (existieren bereits in Juskys CI: Sonne, Regen, Schnee)."
        - type: image
          textOverlay: "**UV** beständig"
          brief: "Square mit grünem Icon Kreis Sonne."
        - type: image
          textOverlay: "**Wasserabweisend**"
          brief: "Square mit grünem Icon Kreis Regentropfen."

    - section: 12
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Garten** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Garten, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-GARTEN>"

    - section: 13
      module: footer.crossSellBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Drinnen passend dazu, weiter zu **Möbel**"
          brief: "Cross Sell Banner. Mini Bild Wohnraum."
          ctaText: "Möbel ansehen"
          linkUrl: "page:Möbel"
```

### 6.4 Möbel

14 Sections. 12 Sub Kategorien werden über zwei Navigatoren abgedeckt (8 plus 4 Tiles).

```yaml
page:
  name: Möbel
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Das Sofa, das zu dir **zurückkommt**"
          brief: "Designer Komposition Wohnzimmer mit Sofa als Hauptmotiv. Subline: Sofas, Betten, Schlafkomfort, Bad und mehr."
          ctaText: "Sofas entdecken"

    - section: 2
      module: categoryNav.grid8tiles
      layoutId: '4x2grid'
      tiles:
        - type: image
          textOverlay: "**SOFAS**"
          brief: "Sub Kategorie Tile. Sofa Rendering freigestellt auf Beige."
        - type: image
          textOverlay: "**POLSTERBETTEN**"
          brief: "Sub Kategorie Tile. Polsterbett Rendering."
        - type: image
          textOverlay: "**BOXSPRINGBETTEN**"
          brief: "Sub Kategorie Tile. Boxspringbett Rendering."
        - type: image
          textOverlay: "**METALLBETTEN**"
          brief: "Sub Kategorie Tile. Metallbett Rendering."
        - type: image
          textOverlay: "**KINDERBETTEN**"
          brief: "Sub Kategorie Tile. Kinderbett Rendering."
        - type: image
          textOverlay: "**WOHNMÖBEL**"
          brief: "Sub Kategorie Tile. Subline: Wohn und Esszimmer Möbel. Sideboard oder Esstisch Rendering."
        - type: image
          textOverlay: "**MASSAGESESSEL**"
          brief: "Sub Kategorie Tile. Massagesessel Rendering."
        - type: image
          textOverlay: "**BÜROMÖBEL**"
          brief: "Sub Kategorie Tile. Schreibtisch oder Bürostuhl Rendering."

    - section: 3
      module: categoryNav.grid4wide
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**MATRATZEN**"
          brief: "Sub Kategorie Tile. Subline: Matratzen und Topper. Matratze Rendering."
        - type: image
          textOverlay: "**SCHLAFKOMFORT**"
          brief: "Sub Kategorie Tile. Kissen oder Decke Rendering."
        - type: image
          textOverlay: "**SCHMINKTISCHE**"
          brief: "Sub Kategorie Tile. Schminktisch Rendering."
        - type: image
          textOverlay: "**BADAUSSTATTUNG**"
          brief: "Sub Kategorie Tile. Badmöbel Rendering."

    - section: 4
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Ein Wohnzimmer, **fünf** Klicks"
          brief: "Designer Komposition Wohnzimmer mit Sofa, Sessel, Beistelltisch, Sideboard, Lampe. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-MOEBEL-WOHNEN>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Sofas**"
          brief: "Top 8 Bestseller aus Sub Sofas."
          asinsPlaceholder: "<TOP-8-MOEBEL-SOFAS>"

    - section: 6
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Guter Schlaf ist **kein** Zufall"
          brief: "Trenner Textbild. Leinen oder Bettwäsche Makro auf hellem Grund."

    - section: 7
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Schlafzimmer, das **ankommt**"
          brief: "Designer Komposition Schlafzimmer mit Boxspring, Nachttisch, Tischleuchte, Kommode, Kissen. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-MOEBEL-SCHLAFEN>"

    - section: 8
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Betten**"
          brief: "Top 8 Bestseller aus Polsterbetten, Boxspringbetten, Metallbetten gemischt."
          asinsPlaceholder: "<TOP-8-MOEBEL-BETTEN>"

    - section: 9
      module: products.productWithWideAndSmall
      layoutId: 'lg-w2s'
      tiles:
        - type: image
          textOverlay: "**Premium** Komfort"
          brief: "Large Image Top ASIN aus Möbel (Boxspring oder Sofa). Designer Komposition. Headline kalibriert sich am Top ASIN."
          ctaText: "Jetzt ansehen"
        - type: image
          textOverlay: "**Stoff**, der hält"
          brief: "Wide Tile. USP zum Bezugsmaterial."
        - type: image
          textOverlay: "**Komfort** Schaum"
          brief: "Small Square Tile. USP zum Polster."
        - type: image
          textOverlay: "**Stauraum** integriert"
          brief: "Small Square Tile. USP zum Bettkasten oder Stauraum."

    - section: 10
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "**Komfort** für Wohnen und Arbeit"
          brief: "Top 6 Bestseller aus Massagesesseln und Büromöbeln gemischt."
          asinsPlaceholder: "<TOP-6-MOEBEL-MASSAGE-BUERO>"

    - section: 11
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Das Bad, **klar** strukturiert"
          brief: "Designer Komposition Bad mit Badmöbeln, Spiegel, Hochschrank. 5 Hotspots auf Badausstattung Produkten."
          hotspotsPlaceholder: "<TOP-5-MOEBEL-BAD>"

    - section: 12
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "Was **unsere** Möbel ausmacht"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Bezug** abnehmbar"
          brief: "Square mit grünem Icon Kreis Reißverschluss."
        - type: image
          textOverlay: "**Stauraum** integriert"
          brief: "Square mit grünem Icon Kreis Box."

    - section: 13
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Möbel** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Möbel, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-MOEBEL>"

    - section: 14
      module: footer.crossSellBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Praktisch fürs Zuhause, weiter zu **Haushalt**"
          brief: "Cross Sell Banner. Mini Bild Haushaltsszene."
          ctaText: "Haushalt ansehen"
          linkUrl: "page:Haushalt"
```

### 6.5 Freizeit

10 Sections. 4 Sub Kategorien (Dachzelte, Camping, Koffersets, Weihnachten saisonal).

```yaml
page:
  name: Freizeit
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Raus, **erleben**, ankommen"
          brief: "Designer Komposition Camping bei Sonnenuntergang (Sommer Default) oder Weihnachtsstimmung (Winter Variante November bis Januar). Saisonal austauschbar. Subline: Dachzelte, Camping, Koffer und Weihnachten."
          ctaText: "Camping entdecken"

    - section: 2
      module: categoryNav.grid4wide
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**DACHZELTE**"
          brief: "Sub Kategorie Tile. Dachzelt Rendering auf Auto."
        - type: image
          textOverlay: "**CAMPING**"
          brief: "Sub Kategorie Tile. Campingstuhl oder Camping Setup Rendering."
        - type: image
          textOverlay: "**KOFFER**"
          brief: "Sub Kategorie Tile. Kofferset Rendering."
        - type: image
          textOverlay: "**WEIHNACHTEN**"
          brief: "Sub Kategorie Tile saisonal. Weihnachtsdeko oder Beleuchtung Rendering. November bis Januar prominent, sonst dezent."

    - section: 3
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Camping, **leicht** gemacht"
          brief: "Designer Komposition Outdoor Setup mit Zelt, Stuhl, Tisch, Lampe, Schlafsack. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-FREIZEIT-CAMPING>"

    - section: 4
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Camping** Produkte"
          brief: "Top 6 Bestseller aus Sub Camping."
          asinsPlaceholder: "<TOP-6-FREIZEIT-CAMPING>"

    - section: 5
      module: products.productShowcaseLarge
      layoutId: 'lg-2stack'
      tiles:
        - type: image
          textOverlay: "Dachzelt, **schnell** aufgebaut"
          brief: "Large Image Top Dachzelt aus Galerie. Designer Komposition mit Auto und Zelt im Outdoor Setting."
          ctaText: "Jetzt ansehen"
        - type: image
          textOverlay: "**Schnell** aufgebaut"
          brief: "Wide Tile. USP Bullet zum Aufbau in Minuten."
        - type: image
          textOverlay: "**Wetterfest**"
          brief: "Wide Tile. USP Bullet zur Witterungsfestigkeit."

    - section: 6
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Koffer**"
          brief: "Top 6 Bestseller aus Sub Koffersets."
          asinsPlaceholder: "<TOP-6-FREIZEIT-KOFFER>"

    - section: 7
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Weihnachten **zuhause**"
          brief: "Designer Komposition Weihnachtsszene mit Beleuchtung, Deko, Pflanzkübeln. Saisonal aktiv November bis Januar. 5 Hotspots."
          hotspotsPlaceholder: "<TOP-5-FREIZEIT-WEIHNACHT>"

    - section: 8
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "Für **draußen** gebaut"
          brief: "Wide Image. Plus 2 Squares mit Outdoor Icons."
        - type: image
          textOverlay: "**Wetterfest**"
          brief: "Square mit grünem Icon Kreis Regentropfen."
        - type: image
          textOverlay: "**Leicht** verstaut"
          brief: "Square mit grünem Icon Kreis Box."

    - section: 9
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Freizeit** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Freizeit inklusive Weihnachten, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-FREIZEIT>"

    - section: 10
      module: footer.crossSellBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Auch fürs Zuhause draußen, weiter zu **Garten**"
          brief: "Cross Sell Banner. Mini Bild Garten."
          ctaText: "Garten ansehen"
          linkUrl: "page:Garten"
```

### 6.6 Heimwerken

10 Sections. 5 Sub Kategorien (Werkzeug, Multifunktionsleitern, Sackkarren, Elektrokamine, Heizungen).

```yaml
page:
  name: Heimwerken
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Werkzeug, das **arbeitet**"
          brief: "Designer Komposition Werkstatt oder Werkzeug Setup auf Werkbank. Subline: Werkzeug, Leitern, Sackkarren, Kamine, Heizungen."
          ctaText: "Werkzeug entdecken"

    - section: 2
      module: categoryNav.grid6tiles
      layoutId: '2s-4grid'
      tiles:
        - type: image
          textOverlay: "**WERKZEUG**"
          brief: "Sub Kategorie Tile als Wide. Werkzeug Set Rendering."
        - type: image
          textOverlay: "**LEITERN**"
          brief: "Sub Kategorie Tile als Wide. Subline: Multifunktionsleitern. Leiter Rendering."
        - type: image
          textOverlay: "**SACKKARREN**"
          brief: "Sub Kategorie Tile. Sackkarre Rendering."
        - type: image
          textOverlay: "**ELEKTROKAMINE**"
          brief: "Sub Kategorie Tile. Elektrokamin Rendering."
        - type: image
          textOverlay: "**HEIZUNGEN**"
          brief: "Sub Kategorie Tile. Heizgerät Rendering."
        - type: image
          textOverlay: "**ROBUST** gebaut"
          brief: "Filler Tile mit Marken USP statt sechster Sub Kategorie. Grünes Icon Kreis Werkzeug Kombi."

    - section: 3
      module: products.productShowcaseLarge
      layoutId: 'lg-2stack'
      tiles:
        - type: image
          textOverlay: "Robust **gebaut**"
          brief: "Large Image Top Werkzeug aus Galerie. Designer Komposition mit Werkzeug in Hand oder auf Werkbank."
          ctaText: "Jetzt ansehen"
        - type: image
          textOverlay: "**Stark** belastbar"
          brief: "Wide Tile. USP Bullet zur Belastung."
        - type: image
          textOverlay: "**Sicher** im Einsatz"
          brief: "Wide Tile. USP Bullet zur Sicherheit."

    - section: 4
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Werkzeuge**"
          brief: "Top 8 Bestseller aus Sub Werkzeug."
          asinsPlaceholder: "<TOP-8-HEIMWERKEN-WERKZEUG>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "**Stark** im Alltag"
          brief: "Top 6 Bestseller aus Multifunktionsleitern und Sackkarren gemischt."
          asinsPlaceholder: "<TOP-6-HEIMWERKEN-LEITERN-SACK>"

    - section: 6
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Wärme, **wenn** es kalt wird"
          brief: "Trenner Textbild. Holzfeuer oder Heizstrahler Makro auf hellem Grund."

    - section: 7
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Wärme zum **Einschalten**"
          brief: "Top 6 Bestseller aus Elektrokaminen und Heizungen gemischt."
          asinsPlaceholder: "<TOP-6-HEIMWERKEN-KAMIN-HEIZ>"

    - section: 8
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**Robust**, sicher, durchdacht"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Belastbar**"
          brief: "Square mit grünem Icon Kreis Werkzeug Kombi."
        - type: image
          textOverlay: "**Sicher**"
          brief: "Square mit grünem Icon Kreis Schild Check."

    - section: 9
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Heimwerken** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Heimwerken, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-HEIMWERKEN>"

    - section: 10
      module: footer.crossSellBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Praktisch fürs Haus, weiter zu **Haushalt**"
          brief: "Cross Sell Banner. Mini Bild Haushaltsszene."
          ctaText: "Haushalt ansehen"
          linkUrl: "page:Haushalt"
```

### 6.7 Haushalt

12 Sections. 9 Sub Kategorien (Schwerlastregale, Aufbewahrung, Küchengeräte, Mülleimer, Wäschesammler, Eiswürfelmaschinen, Heizgeräte, Alltagshilfen, Kinderbedarf).

```yaml
page:
  name: Haushalt
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Alltag, **leichter** gemacht"
          brief: "Designer Komposition Küche oder Hauswirtschaftsraum mit mehreren Helfern. Subline: Aufbewahrung, Küche, Bad, Kinder, Alltagshilfen."
          ctaText: "Sortiment entdecken"

    - section: 2
      module: categoryNav.grid8tiles
      layoutId: '4x2grid'
      tiles:
        - type: image
          textOverlay: "**SCHWERLASTREGALE**"
          brief: "Sub Kategorie Tile. Schwerlastregal Rendering."
        - type: image
          textOverlay: "**AUFBEWAHRUNG**"
          brief: "Sub Kategorie Tile. Boxen oder Aufbewahrungssystem Rendering."
        - type: image
          textOverlay: "**KÜCHENGERÄTE**"
          brief: "Sub Kategorie Tile. Küchengerät Rendering."
        - type: image
          textOverlay: "**MÜLLEIMER**"
          brief: "Sub Kategorie Tile. Mülleimer Rendering."
        - type: image
          textOverlay: "**WÄSCHESAMMLER**"
          brief: "Sub Kategorie Tile. Wäschesammler Rendering."
        - type: image
          textOverlay: "**EISWÜRFELMASCHINEN**"
          brief: "Sub Kategorie Tile. Eiswürfelmaschine Rendering."
        - type: image
          textOverlay: "**HEIZGERÄTE**"
          brief: "Sub Kategorie Tile. Heizgerät Rendering."
        - type: image
          textOverlay: "**ALLTAGSHILFEN**"
          brief: "Sub Kategorie Tile. Alltagshelfer Rendering."

    - section: 3
      module: categoryNav.grid2col
      layoutId: 'std-2equal'
      tiles:
        - type: image
          textOverlay: "**KINDERBEDARF**"
          brief: "Sub Kategorie Tile als Large Square. Kinderausstattung Rendering."
        - type: image
          textOverlay: "**Praktisch** im Alltag"
          brief: "Highlight Tile. Marken USP plus Icon Kreis Box."

    - section: 4
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Küche, **alles** zur Hand"
          brief: "Designer Komposition Küche mit Geräten und Helfern auf der Arbeitsfläche. 5 Hotspots auf Küchengeräte ASINs."
          hotspotsPlaceholder: "<TOP-5-HAUSHALT-KUECHE>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Küchengeräte**"
          brief: "Top 8 Bestseller aus Sub Küchengeräte."
          asinsPlaceholder: "<TOP-8-HAUSHALT-KUECHE>"

    - section: 6
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Stauraum, **klar** sortiert"
          brief: "Trenner Textbild. Lager oder Regal Makro auf hellem Grund."

    - section: 7
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "**Mehr** Stauraum"
          brief: "Top 6 Bestseller aus Schwerlastregalen und Aufbewahrung gemischt."
          asinsPlaceholder: "<TOP-6-HAUSHALT-STAURAUM>"

    - section: 8
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Ordnung, **gerne**"
          brief: "Top 6 Bestseller aus Mülleimern und Wäschesammlern gemischt."
          asinsPlaceholder: "<TOP-6-HAUSHALT-MUELL-WAESCHE>"

    - section: 9
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Eis, Wärme, **fertig**"
          brief: "Top 4 Bestseller aus Eiswürfelmaschinen und Heizgeräten gemischt."
          asinsPlaceholder: "<TOP-4-HAUSHALT-EIS-HEIZ>"

    - section: 10
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Hilfe im **Alltag**"
          brief: "Top 6 Bestseller aus Kinderbedarf und Alltagshilfen gemischt."
          asinsPlaceholder: "<TOP-6-HAUSHALT-KINDER-ALLTAG>"

    - section: 11
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**Praktisch** im Alltag"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Durchdacht**"
          brief: "Square mit grünem Icon Kreis Schild Check."
        - type: image
          textOverlay: "**Langlebig**"
          brief: "Square mit grünem Icon Kreis Stern."

    - section: 12
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Haushalt** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Haushalt, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-HAUSHALT>"
```

### 6.8 Tierbedarf

8 Sections. 3 Sub Kategorien (Katzenbedarf, Hundebedarf, Freilaufgehege).

```yaml
page:
  name: Tierbedarf
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Für **deinen** Liebling"
          brief: "Designer Komposition mit Hund oder Katze in Wohnsetting oder Garten. Subline: Katze, Hund, Freilauf."
          ctaText: "Sortiment entdecken"

    - section: 2
      module: categoryNav.wideAnd2squares
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**FREILAUFGEHEGE**"
          brief: "Wide Tile. Freilaufgehege Rendering im Garten."
        - type: image
          textOverlay: "**HUND**"
          brief: "Square Tile. Hundebedarf Rendering."
        - type: image
          textOverlay: "**KATZE**"
          brief: "Square Tile. Katzenbedarf Rendering."

    - section: 3
      module: products.shoppableFullWidth
      layoutId: '1'
      tiles:
        - type: shoppable_image
          textOverlay: "Freilauf, **sicher** und groß"
          brief: "Designer Komposition Garten mit Freilaufgehege, Hund oder Kleintier, Zubehör. 5 Hotspots auf Freilaufgehege ASINs und Zubehör."
          hotspotsPlaceholder: "<TOP-5-TIER-FREILAUF>"

    - section: 4
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Die beliebtesten **Gehege**"
          brief: "Top 6 Bestseller aus Sub Freilaufgehege."
          asinsPlaceholder: "<TOP-6-TIER-FREILAUF>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Für den **Hund** zuhause"
          brief: "Top 6 Bestseller aus Sub Hundebedarf."
          asinsPlaceholder: "<TOP-6-TIER-HUND>"

    - section: 6
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: best_sellers
          textOverlay: "Für die **Katze** zuhause"
          brief: "Top 6 Bestseller aus Sub Katzenbedarf."
          asinsPlaceholder: "<TOP-6-TIER-KATZE>"

    - section: 7
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**Sicher**, robust, einfach"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Stabil**"
          brief: "Square mit grünem Icon Kreis Werkzeug Kombi für Robustheit."
        - type: image
          textOverlay: "**Tierfreundlich**"
          brief: "Square mit grünem Icon Kreis Pfote."

    - section: 8
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: product_grid
          textOverlay: "Alle **Tierbedarf** Produkte im Überblick"
          brief: "Vollabdeckung. Alle ASINs der Hauptkategorie Tierbedarf, sortiert nach Bestseller Rang."
          asinsPlaceholder: "<ALL-TIERBEDARF>"
```

### 6.9 Sale

10 Sections. Dynamisch befüllt aus allen aktuell reduzierten ASINs.

```yaml
page:
  name: Sale
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "**Aktuell** reduziert"
          brief: "Designer Komposition Mix mit Reduziert Optik. Subline: Aktionen quer durch alle Kategorien."
          ctaText: "Aktionen ansehen"

    - section: 2
      module: categoryNav.grid6tiles
      layoutId: '2s-4grid'
      tiles:
        - type: image
          textOverlay: "Sale **GARTEN**"
          brief: "Filter Tile zur Sale Kategorie Garten."
        - type: image
          textOverlay: "Sale **MÖBEL**"
          brief: "Filter Tile zur Sale Kategorie Möbel."
        - type: image
          textOverlay: "Sale **FREIZEIT**"
          brief: "Filter Tile zur Sale Kategorie Freizeit."
        - type: image
          textOverlay: "Sale **HEIMWERKEN**"
          brief: "Filter Tile zur Sale Kategorie Heimwerken."
        - type: image
          textOverlay: "Sale **HAUSHALT**"
          brief: "Filter Tile zur Sale Kategorie Haushalt."
        - type: image
          textOverlay: "Sale **TIERBEDARF**"
          brief: "Filter Tile zur Sale Kategorie Tierbedarf."

    - section: 3
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Top **12** Aktionen"
          brief: "Top 12 reduzierte ASINs nach Höhe der Reduzierung."
          asinsPlaceholder: "<DEALS-TOP-12>"

    - section: 4
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Garten**"
          brief: "Reduzierte ASINs aus Hauptkategorie Garten."
          asinsPlaceholder: "<DEALS-GARTEN>"

    - section: 5
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Möbel**"
          brief: "Reduzierte ASINs aus Hauptkategorie Möbel."
          asinsPlaceholder: "<DEALS-MOEBEL>"

    - section: 6
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Freizeit**"
          brief: "Reduzierte ASINs aus Hauptkategorie Freizeit."
          asinsPlaceholder: "<DEALS-FREIZEIT>"

    - section: 7
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Heimwerken**"
          brief: "Reduzierte ASINs aus Hauptkategorie Heimwerken."
          asinsPlaceholder: "<DEALS-HEIMWERKEN>"

    - section: 8
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Haushalt**"
          brief: "Reduzierte ASINs aus Hauptkategorie Haushalt."
          asinsPlaceholder: "<DEALS-HAUSHALT>"

    - section: 9
      module: products.fullWidthGrid
      layoutId: '1'
      tiles:
        - type: deals
          textOverlay: "Sale **Tierbedarf**"
          brief: "Reduzierte ASINs aus Hauptkategorie Tierbedarf."
          asinsPlaceholder: "<DEALS-TIERBEDARF>"

    - section: 10
      module: features.featureWideAnd2
      layoutId: 'vh-w2s'
      tiles:
        - type: image
          textOverlay: "**Warum** lohnt sich Sale"
          brief: "Wide Image. Plus 2 Squares mit USP Icons."
        - type: image
          textOverlay: "**Echt** reduziert"
          brief: "Square mit grünem Icon Kreis Stern."
        - type: image
          textOverlay: "**Schnell** weg"
          brief: "Square mit grünem Icon Kreis Truck."
```

### 6.10 Über Uns

6 Sections.

```yaml
page:
  name: Über Uns
  sections:
    - section: 1
      module: hero.fullWidthHero
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "Ein **Haus**, viele Räume"
          brief: "Portrait oder Halle aus juskys.de. Warmes Tageslicht. Subline: Familiengeführt aus Süddeutschland."

    - section: 2
      module: trust.trustSplit
      layoutId: 'std-2equal'
      tiles:
        - type: image
          textOverlay: ""
          brief: "Hallenbild oder Team aus juskys.de. Bild trägt allein."
        - type: image_text
          textOverlay: "Familiengeführt aus **Süddeutschland**"
          brief: "Fließtext ca. 120 Wörter Brand Story Lang. ⚠️ Inhalt vom Kunden freizugeben. Themen: Gründung, Familie, Entwicklung, aktuelle Ausrichtung."

    - section: 3
      module: features.featureGrid4wide
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**Durchdacht**"
          brief: "Wert Tile. Subline: Wir entwickeln vom Alltag her. Foto aus Website."
        - type: image
          textOverlay: "**Zugänglich**"
          brief: "Wert Tile. Subline: Für jede Lebensphase und jedes Budget. Foto aus Website."
        - type: image
          textOverlay: "**Verlässlich**"
          brief: "Wert Tile. Subline: Qualität, die bleibt. Service, der reagiert. Foto aus Website."
        - type: image
          textOverlay: "**Familiengeführt**"
          brief: "Wert Tile. Subline: Aus Süddeutschland. Foto Familie oder Team."

    - section: 4
      module: lifestyle.fullWidthLifestyle
      layoutId: '2s-4grid'
      tiles:
        - type: image
          textOverlay: ""
          brief: "Wide Galerie Bild Lager."
        - type: image
          textOverlay: ""
          brief: "Wide Galerie Bild Designbereich."
        - type: image
          textOverlay: ""
          brief: "Square Galerie Bild Qualitätscheck."
        - type: image
          textOverlay: ""
          brief: "Square Galerie Bild Showroom."
        - type: image
          textOverlay: ""
          brief: "Square Galerie Bild Mitarbeiter."
        - type: image
          textOverlay: ""
          brief: "Square Galerie Bild Gebäude oder Standort."

    - section: 5
      module: features.featureGrid4wide
      layoutId: '2x2wide'
      tiles:
        - type: image
          textOverlay: "**Aus** einem Haus"
          brief: "Marken USP Tile. Grüner Icon Kreis Haus."
        - type: image
          textOverlay: "**Schnell** geliefert"
          brief: "Marken USP Tile. Grüner Icon Kreis Truck."
        - type: image
          textOverlay: "**Montagefreundlich**"
          brief: "Marken USP Tile. Grüner Icon Kreis Schraubenschlüssel."
        - type: image
          textOverlay: "**Familiengeführt**"
          brief: "Marken USP Tile. Grüner Icon Kreis Herz."

    - section: 6
      module: engagement.followBanner
      layoutId: '1'
      tiles:
        - type: image
          textOverlay: "**Service**, der reagiert"
          brief: "Service Block auf Hellgrau. Icons für Kontakt, Versand, Rücksendung."
          ctaText: "Kontakt aufnehmen"
```

---

## 7. Validierung

Nach Befüllung muss `validateStore()` aus `src/constants.js` ohne Errors durchlaufen.

**Pflicht Checks:**
- jede Section hat eine gültige `layoutId` aus Tabelle 4.2
- jeder Tile hat einen gültigen `type` aus Tabelle 4.1
- `shoppable_image` Tiles haben maximal 5 Hotspots
- alle ASINs aus dem Store Top Level sind in mindestens einem Tile referenziert (Coverage Sanity Check)
- `tile.textOverlay.heading` enthält maximal **ein** grünes Highlight Wort (`**...**`)
- `tile.textOverlay.body` ist maximal 350 Zeichen lang
- `tile.brief` enthält keine Lichtsetzung, keine Stimmung, keine Textinhalte
- keine Em Dashes (`—`), keine En Dashes (`–`), keine Bindestriche mit Leerzeichen in kundensichtbaren Texten
