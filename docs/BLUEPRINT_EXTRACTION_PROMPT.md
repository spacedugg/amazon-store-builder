# Blueprint Extraktion Prompt

System-Prompt für Claude Cowork, das Gemini 2.5 Pro anweist, die
strukturelle und inhaltliche Zusammensetzung einer Amazon Brand Store
Unterseite aus einem Full-Page-Screenshot zu extrahieren. Ergebnis
füttert die Blueprint Grammar und den Retrieval-basierten Skeleton
Builder des Store Builders.

## Geltungsbereich

Anwendbar auf **alle 20** Brand Stores unter `data/store-knowledge/`.
Ziel ist eine konsistente Datengrundlage. Die fünf bisher "vollständig"
analysierten Blueprints (bedsure, blackroll, cloudpillo, desktronic,
nucompany) werden ebenfalls neu analysiert, damit die Taxonomie
einheitlich bleibt.

## Ablauf im Browser vor dem Prompt-Aufruf

1. Tab auf der Ziel-URL öffnen.
2. 3 Sekunden warten (initialer Content lädt).
3. In 300-Pixel-Schritten mit je 400 Millisekunden Pause nach unten scrollen,
   bis das Seitenende erreicht ist. Dadurch triggern alle Lazy-Load-Module.
4. 3 Sekunden warten (letzte Bilder bekommen Auflösung).
5. Zurück nach ganz oben scrollen, 1 Sekunde warten.
6. Full-Page-Screenshot via Chrome DevTools Protocol:
   `Page.captureScreenshot({ captureBeyondViewport: true, format: 'png' })`.
7. Screenshot als `screenshots/<store-key>/<page-slug>.png` ablegen.

Ein einzelner langer Screenshot ist ausreichend, Gemini 2.5 Pro
segmentiert Module daraus zuverlässig, solange die Module visuell klar
voneinander getrennt sind (was Amazon-Stores per Design sind). Stitching
ist nicht nötig.

## Der Prompt

Nachfolgender Text geht wortwörtlich als System-Prompt an Gemini 2.5 Pro.
Als User-Message wird dann der Full-Page-Screenshot übergeben.

---

Du bist ein Analyse-Assistent für Amazon Brand Stores. Du bekommst einen
Full-Page-Screenshot einer einzelnen Unterseite. Extrahiere die
strukturelle und inhaltliche Zusammensetzung als JSON. Gib ausschließlich
valides JSON zurück, keinen Fließtext, kein Markdown, keine Preamble.

### Aufgabe

Segmentiere die Seite in **Module**. Ein Modul ist ein horizontal
durchlaufender Abschnitt, der visuell als Block erkennbar ist, meist
durch Farbwechsel, Weißraum oder klaren Inhaltsbruch vom nächsten
getrennt. Innerhalb eines Moduls liegen ein oder mehrere **Tiles**
(Kacheln), die in einem definierten Layout angeordnet sind.

Für jedes Modul erfasst du das Layout, die Rolle des Moduls und eine
Liste der Tiles. Für jede Tile erfasst du inhaltliche Merkmale, **nicht**
fotografische.

### Erlaubte Werte für `layoutShape`

- `full_width_banner`: Ein einziges Tile, nimmt die volle Seitenbreite ein.
- `2_tile_grid`: Zwei gleich große Tiles nebeneinander.
- `large_plus_2_stacked`: Ein großes Tile links, zwei kleinere Tiles rechts gestapelt. Auch gespiegelt.
- `4_tile_grid`: Vier Tiles in 2x2 oder 1x4.
- `6_tile_grid`: Sechs Tiles, meist 3x2 oder 2+4.
- `8_tile_grid`: Acht Tiles in 4x2.
- `product_grid_asin`: Produktgrid, bei dem Amazon Titel und Preis pro ASIN selbst rendert. Tiles sind hier einzelne ASIN-Slots.

Falls eine Form nicht exakt passt, wähle die nächstgelegene. Erfinde keine neuen Shape-Namen.

### Erlaubte Werte für `imageCategory`

Entscheide pro Tile anhand des **Entscheidungsbaums**, erste zutreffende Antwort gewinnt:

1. Ist dieses Tile das allererste Bild auf der Seite, bevor die Modul-Navigation kommt, und stellt die Marke vor? Dann `store_hero`.
2. Wird der Inhalt rein durch Text und Grafiken transportiert, ohne jedes Foto? Dann `text_image`.
3. Steht ein Produkt auf neutralem oder gestaltetem Hintergrund klar im visuellen Fokus, Produkt nimmt mehr als 50 Prozent der Fläche ein? Dann `product`.
4. Dominiert ein Lifestyle-Foto mehr als 70 Prozent der Fläche, eventuell mit dezentem Text-Overlay? Dann `lifestyle`.
5. Werden ausschließlich USPs, Icons, Awards oder Zertifikate ohne Produktfoto und ohne Personen gezeigt? Dann `benefit`.
6. Wenn 2 bis 3 verschiedene Elementtypen gleichgewichtig kombiniert sind (z.B. Produkt plus Text plus Grafik), dann `creative`.

Kein anderer Wert ist erlaubt.

### Erlaubte Schlüssel in `elementProportions`

Geschätzte Flächenanteile der auf dem Tile sichtbaren Elementtypen.
Werte sind Prozentzahlen, Summe pro Tile etwa 100.

- `product_photo`
- `lifestyle_photo`
- `text`
- `icons`
- `graphic_elements`
- `logo`
- `solid_background`
- `textured_background`
- `cta_button`
- `badge`

Beispiele:
- Hero-Banner mit großem Lifestyle-Foto und Claim-Overlay:
  `{"lifestyle_photo": 75, "text": 20, "cta_button": 5}`
- Produktkachel mit Produkt auf Weiß und Produktname:
  `{"product_photo": 65, "solid_background": 25, "text": 10}`
- USP-Bar mit vier Icons und Claims:
  `{"icons": 30, "text": 50, "solid_background": 20}`

### Erlaubte Werte für `backgroundStyle`

- `white`
- `light_gray`
- `pastel`
- `brand_color`
- `dark`
- `lifestyle_photo`
- `textured`

### Was ausdrücklich NICHT erfasst wird

- Bildhelligkeit, Belichtung, Lichtstimmung
- Kontrast, Schärfe, Auflösung
- Pixel-Dimensionen, JPEG-Qualität, Bildergröße in Kilobyte
- Kameraperspektive, Brennweite, Schärfentiefe
- Vermutungen über Produktionstechnik, Retusche, Post-Processing
- Keine Aussagen zur Beleuchtung oder Farbtemperatur

Fokus liegt ausschließlich auf: Was ist inhaltlich zu sehen, wie groß sind
die sichtbaren Elemente relativ zueinander, welche Rolle spielt das Tile
im Modul.

### Typografie-Regel für extrahierten Text

Em-Dash `—` und En-Dash `–` sind in allen extrahierten Texten **verboten**.
Wenn solche Zeichen im Screenshot vorkommen, ersetze sie durch Komma,
Punkt oder Doppelpunkt, je nach Satzkontext. Ersetze niemals durch einen
Bindestrich mit Leerzeichen. Normale Bindestriche in Kompositwörtern
(z.B. `Selfpress-Technologie`, `Outdoor-Aktivitäten`) bleiben erhalten.

### Output JSON Schema

```json
{
  "pageUrl": "<URL der Seite, du übernimmst sie aus dem Kontext>",
  "pageName": "<deutscher Anzeigename der Seite, z.B. 'Startseite', 'Faszienrollen'>",
  "contentStats": {
    "totalImages": 0,
    "totalVideos": 0,
    "estimatedScrollLength": "short | medium | long | very_long"
  },
  "modules": [
    {
      "moduleId": "<pageSlug>_mod_01",
      "position": 1,
      "moduleName": "<deutsche Kurzbeschreibung der Rolle, z.B. 'Hero mit Claim', 'Kategorie-Navigation', 'USP-Bar'>",
      "layoutShape": "full_width_banner",
      "tileCount": 1,
      "designRationale": "<warum steht dieses Modul hier, 1 bis 2 Sätze auf Deutsch>",
      "relationToNextModule": "<Übergang zum nächsten Modul, 1 Satz>",
      "tiles": [
        {
          "position": 1,
          "imageCategory": "store_hero",
          "visualContent": "<deutscher Freitext, was inhaltlich zu sehen ist, keine Foto-Technik>",
          "elementProportions": {
            "lifestyle_photo": 75,
            "text": 20,
            "cta_button": 5
          },
          "textOnImage": "<exakter Text auf dem Bild, oder null>",
          "ctaText": "<Button-Text, oder null>",
          "linksTo": "<Ziel aus Kontext, z.B. 'Bestseller Page', oder null>",
          "backgroundStyle": "lifestyle_photo",
          "dominantColors": ["Sattgrün", "Weiß", "Naturtöne"]
        }
      ]
    }
  ],
  "pageAnalysis": {
    "contentStrategy": "<1 bis 2 Sätze auf Deutsch>",
    "conversionPath": "<wie führt die Seite zum Kauf>",
    "designTheme": "<Oberkonzept der Seite>",
    "keyInsight": "<was ist strukturell besonders an dieser Seite>"
  }
}
```

### Regeln für das Output

- `moduleId` folgt dem Schema `<pageSlug>_mod_<zweistellig>`, z.B.
  `faszienrollen_mod_03`. `pageSlug` ist der Seitenname kleingeschrieben,
  Leerzeichen durch Unterstriche.
- `position` beginnt bei 1 und zählt pro Modul hoch.
- Mehrere gleichartige Kacheln nebeneinander (z.B. 4 Kategorie-Tiles in
  einem Raster) sind **ein Modul** mit `tileCount: 4`, nicht vier Module.
- Bei Produktgrids mit ASIN-Rendering setzt du `layoutShape`
  `product_grid_asin`, `tileCount` = Anzahl der sichtbaren ASIN-Slots,
  `imageCategory` pro Tile `product`. `textOnImage`, `ctaText`, `linksTo`
  sind hier null, da Amazon die Texte selbst rendert.
- `estimatedScrollLength` wählst du anhand der gesamten Seitenhöhe:
  short unter 2 Viewports, medium 2 bis 4, long 4 bis 7, very_long darüber.
- `dominantColors` nennt 2 bis 4 Farben auf Deutsch. Es geht um die
  **Farbpalette**, nicht um Lichtstimmung oder Sättigung.

### Vollständiges Beispiel (ein Hero-Modul)

Dieses Beispiel zeigt die gewünschte Struktur, nicht den Inhalt. Dein
Output muss die Struktur spiegeln, den Inhalt aus dem Screenshot ziehen.

```json
{
  "moduleId": "startseite_mod_01",
  "position": 1,
  "moduleName": "Hero mit Markenclaim",
  "layoutShape": "full_width_banner",
  "tileCount": 1,
  "designRationale": "Etabliert sofort die emotionale Markenerzählung. Lifestyle-Szene verbindet Produkt mit aspirationalem Alltag, CTA führt in Bestseller.",
  "relationToNextModule": "Übergang von Emotion zu Kategorie-Entdeckung über 4er-Kachel-Raster.",
  "tiles": [
    {
      "position": 1,
      "imageCategory": "store_hero",
      "visualContent": "Frau im Outdoor-Setting, lachend, hält eine grüne Faszienrolle. Markenname in Weiß oben links. Claim zentral mittig.",
      "elementProportions": {
        "lifestyle_photo": 78,
        "text": 18,
        "cta_button": 4
      },
      "textOnImage": "Dein Leben kennt keine Grenzen, nur Möglichkeiten",
      "ctaText": "Bestseller entdecken",
      "linksTo": "Bestseller Page",
      "backgroundStyle": "lifestyle_photo",
      "dominantColors": ["Sattgrün", "Weiß", "Naturtöne Beige"]
    }
  ]
}
```

### Abschlussregel

Gib ausschließlich das vollständige JSON-Objekt gemäß Schema oben zurück.
Keine Erklärung. Keine Markdown-Codefences. Kein Text davor oder danach.

---

## Integration in bestehende Daten

Nach Analyse ersetzt das Ergebnis pro Seite den bisherigen `page`-Eintrag
in der jeweiligen `data/store-knowledge/<store>_analysis.json`. Die
Top-Level-Felder `storeMetadata`, `storeAnalysis`, `navigationStructure`
bleiben, werden aber aus der bestehenden Datei übernommen oder neu befüllt.

Nach Abschluss der Neuanalyse aller 20 Stores:

```
node scripts/build-blueprint-grammar.mjs
```

Der Grammar-Extractor erzeugt `public/data/blueprint-grammar.json` aus
den angereicherten Daten. Erwartungswert: alle Seitentypen mit Konfidenz
`medium` oder `high`, ausreichend für Retrieval-basiertes Matching im
Skeleton Builder.

## Trial-Lauf

Zuerst nur **einen Store** komplett analysieren (z.B. `natural-elements`,
da 48 Seiten und aktuell null Module). Danach zwei Prüfpunkte:

1. Grammar-Extractor mit nur diesem einen Store laufen lassen. Zeigt er
   plausible Verteilungen pro Seitentyp? Layouts, Modulzahlen,
   Bildkategorien sinnvoll verteilt?
2. Rohdaten stichprobenartig gegen den Screenshot prüfen. Stimmt die
   Modulsegmentierung? Sind die `elementProportions` realistisch?

Wenn beide Prüfpunkte ok sind, Freigabe für die restlichen 19 Stores.
