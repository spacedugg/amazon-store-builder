# Phase 0: Reference Store Deep Analysis

## Dein Auftrag

Du analysierst Amazon Brand Stores. Du öffnest jede Store-URL selbständig, navigierst durch alle Unterseiten, und analysierst jeden einzelnen visuellen Inhalt. Du arbeitest komplett eigenständig ohne Rückfragen.

## Stores die analysiert werden (in dieser Reihenfolge)

Starte mit nucompany als Test. Wenn das funktioniert, mache alle weiteren.

1. **nucompany**: https://www.amazon.de/stores/thenucompany/page/A096FF51-79D5-440D-8789-6255E9DFE87D
2. **natural elements**: https://www.amazon.de/stores/page/3955CCD4-902C-4679-9265-DEC4FCBAA8C8
3. **bedsure**: https://www.amazon.de/stores/page/7DC5A9F8-2A3D-426B-B2F2-F819AE825B1F
4. **blackroll**: https://www.amazon.de/stores/page/870649DE-4F7E-421F-B141-C4C47864D539
5. **cloudpillo**: https://www.amazon.de/stores/Cloudpillo/page/741141B6-87D5-44F9-BE63-71B55CD51198
6. **desktronic**: https://www.amazon.de/stores/Desktronic/page/1A862649-6CEA-4E30-855F-0C27A1F99A6C
7. **esn**: https://www.amazon.de/stores/ESN/page/F5F8CAD5-7990-44CF-9F5B-61DFFF5E8581
8. **feandrea**: https://www.amazon.de/stores/page/FB4FA857-CD07-4E92-A32C-CF0CD556ACF6
9. **gritin**: https://www.amazon.de/stores/page/1758941C-AE87-4628-AB45-62C0A2BDB75C
10. **hansegruen**: https://www.amazon.de/stores/page/BC9A9642-4612-460E-81B4-985E9AF6A7D2
11. **holy-energy**: https://www.amazon.de/stores/HOLYEnergy/page/7913E121-CB43-4349-A8D2-9F0843B226E4
12. **kaercher**: https://www.amazon.de/stores/Kärcher/page/EFE3653A-1163-432C-A85B-0486A31C0E3D
13. **klosterkitchen**: https://www.amazon.de/stores/page/34D4A812-9A68-4602-A6A0-30565D399620
14. **manscaped**: https://www.amazon.de/stores/page/44908195-3880-47D6-9EC0-D2A1543EB718
15. **masterchef**: https://www.amazon.de/stores/page/4E8E4B73-1DA5-45E1-8EFA-5EB4A3A758F6
16. **more-nutrition**: https://www.amazon.de/stores/page/7AD425C6-C3C5-402D-A69D-D6201F98F888
17. **nespresso**: https://www.amazon.de/stores/page/2429E3F3-8BFA-466A-9185-35FB47867B06
18. **nightcat**: https://www.amazon.de/stores/page/CC609240-DCC5-47C5-A171-3B973268CD34
19. **trixie**: https://www.amazon.de/stores/page/30552E59-AC22-47B1-BBBB-AEA9225BD614
20. **twentythree**: https://www.amazon.de/stores/twentythree/page/0E8D9A31-200C-4EC5-BC94-CBBC023B28A4

## Was du pro Store tust

### Schritt 1: Startseite öffnen und Navigation erfassen
- Öffne die Store-URL
- Scrolle die gesamte Seite durch damit alles lädt
- Erfasse die komplette Menüstruktur: Alle Seitennamen und deren Hierarchie (Hauptseiten + Unterseiten)

### Schritt 2: Jede Seite analysieren (Startseite + alle Unterseiten)

Pro Seite erfasst du von OBEN nach UNTEN:

**A) Hero Banner (über der Menüleiste)**
- Bildbeschreibung: Was ist zu sehen?
- Text auf dem Bild
- Dimensionen (volle Breite, Höhe schätzen)

**B) Jedes Modul/Sektion (unter der Menüleiste, von oben nach unten)**

Pro Modul erfasst du:
- **Position**: Welches Modul der Reihe nach (1., 2., 3., ...)
- **Layout-Typ**: Wie sind die Kacheln angeordnet?
  - Full-Width (1 Bild über volle Breite)
  - 2 gleiche Kacheln nebeneinander (std-2equal)
  - 1 große + 2 kleine gestapelt (lg-2stack)
  - 1 große + 4 kleine im Grid (lg-4grid)
  - 4 gleiche im 2x2 Grid (2x2wide)
  - 3 gleiche nebeneinander (1-1-1)
  - Produkt-Grid (ASIN-Raster mit Amazon-Produktkarten)
  - Video
  - Anderes (beschreiben)
- **Anzahl Kacheln**: Wie viele Bildkacheln hat dieses Modul?

**C) Pro Kachel innerhalb eines Moduls**
- **Kachel-Position im Modul**: Links/Rechts/Oben-Links/etc.
- **Kachel-Größe**: Full-Width / Large Square (1500x1500) / Wide (1500x750) / Small Square (750x750)
- **Bildkategorie**:
  - `lifestyle`: Foto mit Person/Szene, Produkt in Benutzung
  - `creative`: Komposition aus Produkt + Text + Grafik-Elementen
  - `product`: Produkt-Packshot auf cleanem Hintergrund
  - `text_image`: Hauptsächlich Text/Grafik, kein Foto
  - `benefit`: USPs, Icons, Zertifikate
  - `store_hero`: Erstes Bild ganz oben (Hero)
- **Bildbeschreibung**: Was genau ist auf dem Bild zu sehen? (Person, Szene, Produkt, Grafik-Elemente, Komposition)
- **Text auf dem Bild**: Welcher Text steht auf dem Bild? (Headlines, Subheadlines, Bullet Points, CTAs)
- **Verlinkung**: Ist die Kachel klickbar? Verlinkt auf ASIN oder auf Unterseite?

**D) Modul-Beziehungen**
- Wie stehen benachbarte Module zueinander?
  - Bilden zwei übereinanderliegende Full-Width-Bilder ein Gesamtdesign?
  - Gibt es thematische Blöcke (z.B. 3 Module zusammen bilden einen Produktbereich)?
  - Wie wechseln sich verschiedene Modul-Typen ab?

### Schritt 3: WICHTIG — Was du NICHT erfasst
- Keine Produktbilder aus ASIN-Grids / Recommended Products / Bestseller-Widgets
- Keine Amazon-UI-Elemente (Navigation, Footer, Werbebanner)
- Keine Thumbnails aus Produktkarussellen
- NUR die vom Brand gestalteten Bilder in den Layout-Kacheln

## Output-Format

Speichere die Ergebnisse pro Store als JSON-Datei. Dateiname: `{storename}_analysis.json`

```json
{
  "brandName": "the nu company",
  "storeUrl": "https://...",
  "analyzedAt": "2026-04-09",
  "navigation": {
    "pageCount": 5,
    "pages": [
      { "name": "Startseite", "level": 0 },
      { "name": "Riegel", "level": 1 },
      { "name": "Pulver", "level": 1 }
    ]
  },
  "pages": [
    {
      "pageName": "Startseite",
      "heroBanner": {
        "description": "Grüner Hintergrund mit nucao Riegel-Lineup, Headline: Die bessere Schokolade",
        "textOnImage": "Die bessere Schokolade",
        "estimatedDimensions": "3000x600"
      },
      "modules": [
        {
          "position": 1,
          "layoutType": "Full-Width",
          "layoutId": "1",
          "tileCount": 1,
          "designRationale": "Emotionaler Einstieg mit Lifestyle-Bild nach dem Hero",
          "tiles": [
            {
              "position": "full",
              "size": "Full Width",
              "imageCategory": "lifestyle",
              "description": "Junge Frau beißt draußen im Park in einen nucao Riegel, sonniges Licht, lächelnd, Riegel prominent in der Hand",
              "textOnImage": "",
              "ctaText": "Jetzt entdecken",
              "linksTo": "Unterseite: Riegel"
            }
          ],
          "relationToNextModule": "Thematischer Wechsel: von emotional (Lifestyle) zu informativ (Produktkategorien)"
        },
        {
          "position": 2,
          "layoutType": "3 gleiche Kacheln",
          "layoutId": "1-1-1",
          "tileCount": 3,
          "designRationale": "Kategorie-Navigation: Jede Kachel repräsentiert eine Produktkategorie",
          "tiles": [
            {
              "position": "links",
              "size": "Large Square",
              "imageCategory": "creative",
              "description": "nucao Riegel-Sortiment auf grünem Hintergrund mit Kakao-Bohnen-Deko",
              "textOnImage": "Riegel",
              "ctaText": "Entdecken",
              "linksTo": "Unterseite: Riegel"
            },
            {
              "position": "mitte",
              "size": "Large Square",
              "imageCategory": "creative",
              "description": "nupro Shake-Pulver mit Früchten und Blättern arrangiert",
              "textOnImage": "Pulver",
              "ctaText": "Entdecken",
              "linksTo": "Unterseite: Pulver"
            },
            {
              "position": "rechts",
              "size": "Large Square",
              "imageCategory": "creative",
              "description": "nucao Tafelschokolade mit Kakaobohnen und Nüssen",
              "textOnImage": "Schokolade",
              "ctaText": "Entdecken",
              "linksTo": "Unterseite: Schokolade"
            }
          ],
          "relationToNextModule": "Nach der Kategorie-Navigation folgt ein informativer Block über die Marke"
        }
      ],
      "pageAnalysis": {
        "totalModules": 6,
        "totalBrandImages": 12,
        "layoutSequence": ["1", "1-1-1", "1", "std-2equal", "1", "product_grid"],
        "imageCategoryDistribution": {
          "lifestyle": 3,
          "creative": 5,
          "product": 2,
          "text_image": 1,
          "benefit": 1
        },
        "moduleFlow": "Hero → Lifestyle Full-Width → Kategorie-Navigation → Brand Story → Produkt-Highlights → Produkt-Grid",
        "visualTheme": "Grüntöne, natürliche Materialien, nachhaltig, jung, clean"
      }
    }
  ],
  "storeAnalysis": {
    "totalPages": 5,
    "totalModules": 24,
    "totalBrandImages": 48,
    "dominantLayouts": ["1 (Full-Width)", "std-2equal", "1-1-1"],
    "dominantImageCategories": ["creative", "lifestyle", "product"],
    "ciSummary": "Grüntöne als Primärfarbe, Clean/Natural Aesthetic, Sans-Serif Typography, nachhaltige Bildsprache",
    "modulePatterns": [
      "Full-Width Lifestyle nach Hero als emotionaler Einstieg",
      "Kategorie-Kacheln als 1-1-1 oder std-2equal Layout",
      "Abwechslung zwischen Full-Width und Grid-Modulen"
    ],
    "crossPageConsistency": "Gleiche Farben und Bildstil über alle Seiten, Hero-Banner variiert pro Seite"
  }
}
```

## Arbeitsweise

1. Arbeite einen Store komplett ab (alle Seiten) bevor du zum nächsten gehst
2. Starte mit nucompany als Test
3. Zeige mir nach nucompany das Ergebnis — ich prüfe und gebe Feedback
4. Dann mache die restlichen 19 Stores
5. Speichere jede JSON-Datei ab sobald ein Store fertig ist
6. Am Ende erstelle eine `_aggregated_analysis.json` mit Patterns über alle Stores

## Wichtig

- Scrolle jede Seite KOMPLETT durch damit alle Inhalte laden
- Erfasse NUR die vom Brand gestalteten Bilder/Module, NICHT Amazon-UI oder Produkt-Grids
- Beschreibe Bilder INHALTLICH (was ist zu sehen) nicht stilistisch (welche Farbe)
- Achte besonders auf Modul-Beziehungen: Welche Module bilden zusammen einen visuellen Block?
- Wenn zwei Full-Width-Bilder übereinander ein Gesamtdesign bilden, notiere das explizit
