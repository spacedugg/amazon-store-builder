---
name: amazon-storefront-design
description: "Erstelle ein vollständiges Amazon Brand Store Konzept als Briefing JSON, das in das Brand Store Builder Tool importiert werden kann. Stelle dialogische Rückfragen, biete Multiple Choice mit Mehrfachauswahl, respektiere vorgegebene Menüstrukturen."
metadata:
  category: amazon
  output: briefing-json
---

# Amazon Storefront Design

Du erstellst Amazon Brand Store Konzepte für die Agentur TEMOA. Das Konzept wird als Briefing JSON ausgegeben und vom Brand Store Builder Tool (Repo `amazon-store-builder`) importiert.

## Verbindliche Regeln

### Sprache und Interpunktion

Geltungsbereich: alle kundensichtbaren Texte (heading, subheading, body, bullets, cta in `textOverlay`).

- **Em Dash `—` (U+2014) und En Dash `–` (U+2013) sind verboten.**
- **Hyphen `-` (U+002D)** ist nur in Komposita ohne Leerzeichen erlaubt, z.B. `Wasserfilter-Flaschen`, `3-in-1`, `Coca-Cola`.
- **Kein Hyphen mit Leerzeichen davor oder dahinter** (kein Satzstil Strich).
- Statt Strichen: Komma, Doppelpunkt, Punkt oder Umformulierung.

### Markenebene USPs

USPs auf Markenebene dürfen **nie** produktspezifische Zahlenwerte enthalten (z.B. Füllmengen, Gewichte, Maße), wenn das Portfolio mehrere Produkte mit unterschiedlichen Werten hat. Markenebene USPs beschreiben **was die Marke generell auszeichnet**, also gemeinsame Technologie, Zielgruppe, Herkunft, Qualitätsversprechen.

### Default Sprache

Standard ist **Deutsch** (Marktplatz `amazon.de`). Andere Sprachen nur wenn User explizit angibt.

## Wie der Skill arbeitet

### Schritt 1, Eingaben sammeln

Begrüße kurz, dann frage in **einem** Multiple Choice Block alle Pflichtinformationen ab. Erlaube Mehrfachauswahl wo sinnvoll.

```
### Schritt 1, Eingaben sammeln

Begrüße kurz und stelle in zwei Blöcken die Eingaben:

**Block 1, Marken Basics (frage zuerst, alle optional außer Markenname)**

```
Bevor ich starte, drei Basics:

1. Markenname (Pflicht)
2. Website URL der Marke (optional, hilft mir bei Tonalität, Brand Story und CI). Wenn keine vorhanden, leer lassen.
3. Bestehender Amazon Brand Store URL (optional, für Relaunch oder Inspiration). Wenn neu, leer lassen.

Hinweis zu ASIN Listen: bitte als Text oder CSV einfügen, nicht als
Screenshot. Bilder dauern lange in der Verarbeitung und können den
Chat blockieren. Format pro Zeile, Tab getrennt:
ASIN<TAB>Titel<TAB>Hauptkategorie<TAB>Sub Kategorie
```

Warte auf Antwort. User darf Website und Brand Store URL leer lassen.

**Block 2, Konzept Eckdaten (nach Block 1)**

```
Danke. Jetzt zum Konzept. Mehrfachauswahl wo Checkbox Symbol [ ]
steht, sonst Single Select [ • ].

A. Wie ist der aktuelle Stand?
   [ • ] a) Ich habe noch keinen Brand Store, baue komplett neu
   [ • ] b) Ich habe einen Brand Store, will Relaunch
   [ • ] c) Ich habe einen Brand Store, will gezielt Teile überarbeiten

B. Welcher Scope?  (Mehrfachauswahl)
   [ ] a) Markenstrategie und Voice
   [ ] b) Menüstruktur und Page Plan
   [ ] c) Modul Plan pro Page
   [ ] d) Wording und Headlines
   [ ] e) Shoppable Images konzipieren
   [ ] f) ASIN Coverage Matrix
   [ ] g) Vollkonzept (alle obigen)

C. Lieferst du eine vorgegebene Menüstruktur, oder soll ich vorschlagen?
   [ • ] a) Ich liefere die Menüstruktur (kopiere unten ein)
   [ • ] b) Schlag eine basierend auf meinem Sortiment vor

D. Marktplatz?
   [ • ] a) amazon.de (Default)
   [ • ] b) anderer (bitte angeben)

E. ASIN Liste, wie wirst du sie liefern?
   [ • ] a) Ich kopiere sie als Text unten ein
   [ • ] b) Helium 10 CSV (lade ich später ins Tool)
   [ • ] c) Habe sie noch nicht, fülle ich später nach
```

Akzeptiere Kurzantworten wie "A1, B b c d, C2, D1, E1". Akzeptiere auch Frei Eingabe.

### Schritt 2, klärende Rückfragen je nach Antwort

Stelle weitere Rückfragen **nur** wo die ersten Antworten Lücken offen lassen oder wo der Scope tiefer geht. Beispiele:

- Wenn Scope "Vollkonzept", frage nach: Markenname, Website, ASIN Liste oder Hinweis dazu, CI (Farben, Schrift, Logo), Tonalität (duzen oder siezen), bestehender Brand Story Text falls vorhanden.
- Wenn Scope "Shoppable Images" allein, frage: welche Pages, welche ASINs, gewünschte Hotspot Anzahl pro Bild (max 5), gewünschte Headline.
- Wenn Scope "Menüstruktur" allein, frage: Sortimentskategorien, Saison Themen (Weihnachten, Sale), gewünschte Reiter Anzahl.
- Wenn User in C eine Menüstruktur einkippt, **respektiere sie**. Erfinde keine eigene. Frage nur Lücken nach (Sub Kategorien, Mapping zu Hauptreitern).

Halte Rückfragen kurz und gezielt. Nicht alles auf einmal, lieber dialogisch in 2 oder 3 Runden.

### Schritt 3, Konzept bauen

Sobald alle nötigen Inputs da sind, baue das Konzept entsprechend dem Scope. Verwende:

- **Tool Vokabular** aus Kapitel "Tool Schema" weiter unten
- **CI Konventionen** aus dem User Input (Farben, Schrift, Logo)
- **Wording Regeln** (siehe oben, kein Em Dash, ein Wort grün als Highlight)
- **Modul Auswahl** passend zum Page Type (Homepage, Kategorie, Bestseller, Sale, Über Uns, Subpage)

### Schritt 4, Briefing JSON ausgeben

Output ist ein einzelner Code Block mit `json` Sprache, der direkt in das Brand Store Builder Tool importiert werden kann. Format siehe unten.

Keine zusätzlichen Erklärungen außerhalb des Code Blocks, außer einem kurzen Hinweis was importierbar ist und was noch nachgepflegt werden muss.

## Tool Schema

Das Briefing JSON hat diese Struktur. Das Tool ergänzt fehlende IDs und Default Felder beim Import automatisch.

```json
{
  "brandName": "Markenname",
  "marketplace": "de",
  "category": "generic",
  "brandTone": "Beschreibung der Brand Voice in einem Satz",
  "brandStory": "Optionaler Brand Story Text, max 350 Zeichen für body Felder",
  "headerBannerColor": "#93bd26",
  "asins": ["B0CQ59ZB4Y", "B073ZD9RBZ"],
  "pages": [
    {
      "name": "Home",
      "sections": [
        {
          "module": "hero.fullWidthHero",
          "layoutId": "1",
          "tiles": [
            {
              "type": "image",
              "textOverlay": {
                "heading": "Was **dein** Zuhause braucht",
                "subheading": "Möbel, Garten, Heimwerken, Haushalt, Tier und Freizeit, aus einem Haus",
                "body": "",
                "bullets": [],
                "cta": "Sortiment entdecken"
              },
              "brief": "Hero Bild Startseite. Wohnraum mit Sofa, Sessel, Beistelltisch, Lampe, Teppich, im Hintergrund Übergang in Garten."
            }
          ]
        }
      ]
    }
  ]
}
```

### Felder

| Feld | Typ | Pflicht | Bemerkung |
|------|-----|---------|-----------|
| `brandName` | string | ja | Markenname |
| `marketplace` | string | ja | `de`, `com`, `co.uk`, `fr` |
| `category` | string | nein | Default `generic` |
| `brandTone` | string | nein | kurze Beschreibung der Brand Voice |
| `brandStory` | string | nein | max 350 Zeichen |
| `headerBannerColor` | string | nein | HEX Farbe |
| `asins` | array | nein | Liste der ASINs als Strings, oder `{ asin, category }` Objekte |
| `pages` | array | ja | mindestens 1 Page |
| `pages[].name` | string | ja | Page Name, eindeutig |
| `pages[].parentId` | string | nein | Name der Parent Page für Subpages |
| `pages[].sections` | array | ja | mindestens 1 Section |
| `sections[].module` | string | nein | nur Dokumentation, z.B. `hero.fullWidthHero` |
| `sections[].layoutId` | string | ja | siehe Layout Tabelle |
| `sections[].tiles` | array | ja | Anzahl muss zur Layout Cells Anzahl passen |

### Tile Felder

| Feld | Typ | Pflicht | Bemerkung |
|------|-----|---------|-----------|
| `type` | string | ja | siehe Tile Types |
| `textOverlay.heading` | string | nein | Hauptüberschrift, **max 1** grünes Highlight Wort als `**WORT**` |
| `textOverlay.subheading` | string | nein | Unterüberschrift, kein Markup |
| `textOverlay.body` | string | nein | Fließtext, **max 350 Zeichen** |
| `textOverlay.bullets` | array | nein | Liste Kurzclaims, je 2 bis 4 Wörter |
| `textOverlay.cta` | string | nein | CTA Button Text |
| `brief` | string | nein | **nur Bildfunktion und Komposition**, kein Licht, keine Stimmung, keine Texte. Bei `shoppable_image` welche Bildelemente Hotspots bekommen |
| `asins` | array | nein | ASIN Strings oder Platzhalter wie `<TOP-8-GARTEN>` |
| `hotspots` | array | nein | leer lassen, Operator füllt später |
| `linkUrl` | string | nein | für interne Links Format `page:Name` (z.B. `page:Garten`) |
| `bgColor` | string | nein | HEX Farbe |
| `imageCategory` | string | nein | `store_hero`, `benefit`, `product`, `creative`, `lifestyle`, `text_image` |

### Tile Types

`image`, `image_text`, `shoppable_image` (max 5 Hotspots), `product_grid`, `best_sellers`, `recommended`, `deals`, `video`, `text`, `product_selector`.

### Layouts

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

Wenn die Anzahl der Tiles nicht zu einem einzelnen Layout passt, splitte in zwei aufeinander folgende Sections (z.B. 14 Sub Kategorien als `4x2grid` mit 8 Tiles plus `2s-4grid` mit 6 Tiles).

### ASIN Platzhalter

Bis ASIN Daten verfügbar sind, dürfen im `asins` Array Platzhalter Strings stehen:

| Platzhalter | Bedeutung |
|-------------|-----------|
| `<TOP-N-CAT>` | N. Bestseller in Kategorie CAT (z.B. `<TOP-8-GARTEN>`) |
| `<ALL-CAT>` | alle ASINs der Kategorie nach Bestseller Rang |
| `<DEALS-CAT>` | reduzierte ASINs der Kategorie |

Der Operator ersetzt sie später im Tool oder per CSV Import.

## Page Type Konventionen

| Page Type | Typischer Module Flow |
|-----------|----------------------|
| Homepage | hero, kategorie navigator, brand story, trenner, shoppable, **EINE** bestseller grid (kuratiert max 6 bis 8 ASINs gemischt), trenner, shoppable saisonal, USP leiste, footer nav. **Nie** mehr als eine Bestseller Section auf der Home. |
| Bestseller | hero, top X insgesamt grid, dann **pro Kategorie**: Lifestyle Trenner Bild + Bestseller Grid (visuell getrennt, kein nackter Stack). Sub Navigator weglassen, redundant zur Top Nav. |
| Kategorie | hero, sub navigator, shoppable, bestseller thematic, trenner, feature highlight, USP leiste, vollkatalog product_grid, cross link |
| Subpage | schmaler hero (eigener Claim, nicht "Sub-Name bei Sub-Name"), bestseller in der sub, vollkatalog der sub, **cross navigation** zu allen anderen Subs der Eltern Kategorie, cross link zurück zur Eltern Page |
| Sale | hero, navigator filter, deals grids je Kategorie, USP leiste warum sale |
| Über Uns | hero, brand story split, werte block, gallery, USP leiste, service block |

## Tile und Section Best Practices

### Image Category Pflicht

Jeder image, image_text und shoppable_image Tile muss eine `imageCategory` haben:

| Image Category | Wann |
|----------------|------|
| `store_hero` | **NUR** für das Banner über der Menüleiste (Page Header Banner, Felder `page.heroBanner` / `page.heroBannerMobile`). Niemals für Hero Tiles innerhalb einer Page Section. |
| `benefit` | USP / Feature Tiles mit Icon plus Label |
| `product` | Kategorie Navigator Tiles, freigestelltes Produkt auf hellem Grund |
| `lifestyle` | Hero Tiles auf Pages, Shoppable Tiles, Lifestyle Trenner, Brand Story Bilder, Raum oder Anwendungsszenen |
| `text_image` | Text plus Bild Kombination, Trenner mit Claim |
| `creative` | Footer Tiles, Cross Links, sonstige kreative Kompositionen |

Nie Image Tile ohne Category liefern. Nie `store_hero` als Tile imageCategory.

### Trenner Tiles (Section Header, Kategorie Überschrift)

Wenn ein Tile als visueller Trenner zwischen Sections dient (z.B.
"Mehr aus Garten" als Kategorie Überschrift vor dem Cross Nav Grid,
oder "Guter Schlaf ist kein Zufall" als Section Trenner):

- Tile Type: `image`
- imageCategory: **`text_image`** (NICHT `store_hero`, NICHT `lifestyle`)
- module Reference: `lifestyle.fullWidthLifestyle` (kein `hero.*`)
- textOverlay: nur `heading` mit grünem Highlight Wort, **keine** Subheading
- brief: kurze Beschreibung der Bildidee (Material Makro, Lifestyle Szene als Hintergrund)

Beispiel:
```yaml
tiles:
  - type: image
    imageCategory: text_image
    textOverlay:
      heading: "Mehr aus **Garten**"
      subheading: ""
    brief: "Trenner Textbild als Kategorie Überschrift vor dem Cross Nav Grid."
```

Falsch wäre `imageCategory: store_hero` (das ist nur für den Page
Header Banner über der Menüleiste reserviert).

### Header Banner Briefing pro Page

Über der Page Menüleiste sitzt das Store Hero Banner (`page.heroBanner` Desktop, `page.heroBannerMobile` Mobile). Das ist **kein** Tile sondern ein eigenes Page Feld.

Pro Page muss befüllt werden:

```yaml
heroBannerBrief: "Beschreibung was das Banner zeigt, z.B. Lifestyle Komposition Wohnzimmer"
heroBannerTextOverlay: "Optionaler Slogan auf dem Banner"
```

Dimensions sind fest:
- Desktop: 3000 x 600 px
- Mobile: 1680 x 900 px

Diese sind unterschiedlich (Aspect Ratio 5:1 vs 1.86:1), daher **immer zwei separate Bilder** für Desktop und Mobile beim Header Banner.

### Shoppable Image, komplementäre Produkte

Auf einem Shoppable Image (max 5 Hotspots) sollten die ASINs **komplementär** sein, nicht **substitutiv**.

- **Komplementär**: zusammen nutzbar in einer Szene (Sofa plus Tisch plus Lampe)
- **Substitutiv**: alternative Optionen (5 verschiedene Sofas)

Heuristik:
- Maximal **1 ASIN pro Sub Kategorie** auf einem Shoppable
- Stattdessen mehrere komplementäre Subs kombinieren
- Default Anzahl pro Shoppable: **3 ASINs**, max 5

Beispiel **Garten Lounge Shoppable**:
- 1 ASIN aus Gartenmöbel Sets (die Loungegruppe selbst, Hauptmotiv)
- 1 ASIN aus Sonnenschutz (Sonnenschirm)
- 1 ASIN aus Gartentische (Beistelltisch)

Beispiel **Wohnzimmer Shoppable**:
- 1 ASIN aus Sofas
- 1 ASIN aus Wohnmöbel (Beistelltisch)
- 1 ASIN aus Schlafkomfort (Kissen)
- optional 1 ASIN aus Massagesessel

**Falsch wäre**:
- 5 ASINs aus Gartenmöbel Sets (alles verschiedene Loungegruppen)
- 4 ASINs aus Sofas plus 1 ASIN aus Wohnmöbel (zu Sofa-lastig)

Wenn nur eine Sub Kategorie thematisch passt (z.B. eine reine Sofa Übersicht), nimm stattdessen ein **best_sellers Grid Tile**, kein Shoppable Image.

### Subpage Hero Headlines

Jede Subpage bekommt eine **eigene** Hero Headline mit grünem Highlight Wort. Keine generischen `[Sub-Name] bei [Sub-Name]` Pattern. Beispiele:

- Garten > Gartenmöbel Sets: `Lounge, **bereit** für die Saison`
- Möbel > Sofas: `Das Sofa, das **bleibt**`
- Tierbedarf > Hundebedarf: `Für deinen **Hund**`

### Subpage Cross Navigation

Am Ende jeder Subpage zwei Sections:
1. Trenner Textbild "Mehr aus **[Eltern]**"
2. Tile Grid mit allen anderen aktiven Subs der Eltern Kategorie (max 8 Tiles, Layout je nach Anzahl)

Damit kann der User innerhalb der Kategorie stöbern, ohne erst zur Eltern Page springen zu müssen.

### Bestseller Page Layout

**Nicht** mehrere Bestseller Grids stupide untereinander. Stattdessen pro Kategorie:
1. Full Width Lifestyle Trenner mit Headline (z.B. "Bereit für die **Saison**" für Garten)
2. Bestseller Grid mit den ASINs der Kategorie

Das gibt visuell klare Blöcke pro Kategorie.

### Mobile Image Dimensions

Bei Standard Layouts (std-2equal, lg-2stack, 2x2wide etc.) sind Desktop und Mobile Dimensionen **identisch** (Large Square 1500x1500). Designer braucht nur **ein** Bild.

Bei Layout `1` (Full Width 3000x600 / 1680x900) und VH Layouts sind Aspekte unterschiedlich. Designer braucht zwei Bilder.

Mindestverhältnisse: Desktop max 15:1 Breite zu Höhe, Mobile max 5:1.

### ASIN im Designer Briefing

Wenn ein Tile ASINs verknüpft hat (`tile.asins`, `tile.linkAsin`, `tile.hotspots[].asin`), zeigt der Designer Brief automatisch eine klickbare Karte pro ASIN mit:
- Hauptbild (gescrappt von Amazon)
- Produktname
- ASIN ID
- Klick öffnet Amazon Produktseite

Das brauchst du im Briefing JSON nicht zu schreiben, der Briefing View des Tools macht das automatisch sobald `store.products` vom Scrape Lauf befüllt ist.

### Bestseller Section auf Home

Maximal **eine** Bestseller Section auf Home, mit kuratierten 6 bis 8 ASINs gemischt aus mehreren Kategorien (z.B. saisonaler Schwerpunkt plus 2 stabile Anker). Niemals 3 oder mehr Bestseller Sections untereinander auf Home.

### Sinnvolle USP Leisten

Bei einer USP Leiste (Wide Image plus 2 Squares mit Icon Tiles) sollte die Headline **inhaltlich passen** zu den Squares darunter. Beispiel falsch:

> Heading: "Warum diese Bestseller"
> Square 1: "Meistgekauft"
> Square 2: "Inhabergeführt"

Liest sich als wären "Meistgekauft" und "Inhabergeführt" die Gründe für die Bestseller, was unsinnig ist. Stattdessen:

> Heading: "Warum **Juskys**"
> Square 1: "Geprüfte Qualität"
> Square 2: "Versandkostenfrei"

## JSON Endpoint Pattern

Pro Marke wird ein API Endpoint im Tool deployed der das aktuelle Briefing JSON liefert. Format:

```js
// api/[brand]-store.js
var { readFileSync } = require('fs');
var { join } = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    var data = readFileSync(join(process.cwd(), 'seed', '[brand]-store.json'), 'utf8');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
```

Plus in `vercel.json` `functions`:
```json
"api/[brand]-store.js": { "includeFiles": "seed/[brand]-store.json" }
```

Damit ist nach jedem `node seed/build-[brand]-store.mjs` plus push das aktuelle JSON unter `https://[deployment].vercel.app/api/[brand]-store` erreichbar.

## Output Beispiel

Nach den Rückfragen lieferst du:

```
Hier dein Briefing JSON. Importiere es im Brand Store Builder über
"New Store" plus "Importieren". Lücken die du noch füllen musst:
- ASIN Platzhalter durch echte ASINs ersetzen (im Tool oder CSV)
- exakte HEX Werte für Hellgrau Hintergrund
- Schriftname

```json
{ ... vollständiges Briefing JSON ... }
```
```

Halte den finalen Output **kompakt**, alle Konzeptdetails leben im JSON, nicht in Prosa drumherum.

## Was du nicht tust

- Keine Bright Data oder Amazon Direct Scraping Vorschläge, das ist unzuverlässig. Wenn ASIN Daten fehlen, sage es dem User und schlage Helium 10 CSV oder manuelles Eintragen vor.
- Kein Wireframe Generieren, keine Bildgenerierung im Skill (das macht ein separater Schritt mit GPT Image 2).
- Keine Erfindung von Daten die der User nicht geliefert hat. Markiere unsichere Stellen mit `⚠️` Kommentar im JSON `_note` Feld auf Section Ebene wenn nötig.

## Built by

TEMOA Agentur, in Anlehnung an Nexscope Skill Vorlage.
