# Juskys Store, Feedback aus erster Tool Vorschau

Stand nach Import des ersten Briefing JSONs. Jeder Punkt unten ist ein eigener Task.

## Critical Bugs (Tool funktioniert nicht richtig)

### B1, Sub Pages werden als Top Level Pages angezeigt

Menü ist riesig lang ohne Sub Pages. Erwartet: Hauptpage in der Top Nav, Sub Pages als Dropdown unter dem Eltern Reiter.

**Vermutung**: `briefingImport.js` resolved `parentName` nicht korrekt zu `parentId`. Page Schema im Tool erwartet `parentId` für die Eltern Beziehung, der Builder schreibt aber nur `parentName` rein, das nach Resolution gelöscht werden sollte aber als Feld nicht ins Tool Schema passt.

**Fix**: Importer prüfen, sicherstellen dass `parentName` aus dem Briefing JSON in `parentId` (Page ID) übersetzt wird, dann das `parentName` Feld entfernt wird.

### B2, Link URLs sind kryptisch

Tile linkUrl ist aktuell `/page/<page-id>` mit der UID. Im Tool nicht klickbar.

**Fix**: Tool und Importer müssen sich abstimmen wie interne Page Links technisch funktionieren. Möglich:
- linkUrl bleibt menschenlesbar als `page:Name`, das Tool resolved beim Klick
- ODER linkUrl wird zur tatsächlichen Page UID, das Tool versteht UIDs

Beides muss im Tool Code gespiegelt werden, nicht nur im Importer.

### B3, Subpage Headlines doppelt sich

Aktuell: "Gartenmöbel Sets bei **Gartenmöbel Sets**", auf jeder Subpage.

**Fix Schnellweg**: Build Skript Headline Pattern ändern, z.B. einfach "Alle **Gartenmöbel Sets**" oder ähnlich.

**Fix Lang**: pro Sub eine eigene Hero Headline mit Variation, ein grünes Highlight Wort, jede Sub klingt unterschiedlich.

### B4, Image Tiles ohne imageCategory

Wenn `tile.type === 'image'` sollte automatisch eine `imageCategory` (`store_hero`, `lifestyle`, `benefit`, `creative`, `text_image`, `product`) gesetzt sein.

**Fix**: Build Skript pro Tile Typ Default Image Category setzen. Plus optional Tool seite ein Fallback.

### B5, Designer Briefs ohne ASIN plus Hauptbild

Wenn ein Tile ein konkretes Produkt zeigen soll (Hero mit Sofa Iseo, Feature Highlight Boxspring, etc.), muss ASIN plus URL Hauptbild im `brief` stehen damit der Designer direkt weiß was er rendert.

**Fix**: Build Skript Helper `briefWithProduct(asin, baseBrief)` der den Brief um "Produkt: [ASIN] - [Titel] - Hauptbild [URL]" ergänzt.

## Inhaltliche Korrekturen

### C1, "Warum diese Bestseller" Section ist unsinnig

Aktuell: Heading "Warum **diese** Bestseller", darunter "Meistgekauft" und "Inhabergeführt" als zwei Squares. Liest sich als wären das die Gründe für die Bestseller, was Quatsch ist.

**Fix**: entweder die Section komplett löschen (war ein Auffüller), oder Texte umbauen:
- Heading "Warum **Juskys** Bestseller"
- Bullet 1 "Geprüfte Qualität"
- Bullet 2 "Versandkostenfrei"

### C2, Subpage Wording einheitlich, kein Unique Content

Aktuell sind alle 42 Subpages strukturgleich (Hero, Bestseller, Vollkatalog, Cross Link). Das ist OK als Template, aber die Hero Headlines sollten variieren statt "X bei X".

**Fix**: pro Eltern Kategorie ein Headline Pattern Set. Beispiel Garten:
- Gartenmöbel Sets: "Lounge, **bereit** für die Saison"
- Sonnenschutz: "**Schatten**, wo du ihn brauchst"
- Gartenliegen: "Liegen, **lang** ausstrecken"
- etc.

## Strukturelle Verbesserungen

### S1, Bestseller Page Layout neu

Aktuell Bestseller Page:
1. Hero
2. Sub Navigator 6 Tiles (Filter Buttons je Kategorie)
3. Top 12 insgesamt
4. Top in Garten
5. Top in Möbel
6. Top in Freizeit
7. Top in Heimwerken
8. Top in Haushalt
9. Top in Tierbedarf
10. USP Leiste

Probleme:
- Section 2 (Filter Tiles) wirkt wie Doppelung zur Top Nav
- Sections 4 bis 9 sind 6 Bestseller Grids stupide untereinander, nichts visuell trennt sie

**Fix**: zwischen jeder Kategorie Bestseller Section ein Full Width Text Image oder Lifestyle Image als visueller Header. Pro Kategorie:
- Trenner Bild "Top in **Garten**" (Full Width Lifestyle oder Text Image)
- Bestseller Grid Garten ASINs

Das wiederholt sich pro Kategorie, ergibt klare visuelle Blöcke.

### S2, Subpage Cross Navigation fehlt

Aktuell: jede Subpage hat nur Hero, Bestseller, Vollkatalog, Cross Link zur Eltern Page.

**Fix**: am Ende jeder Subpage einen weiteren Section Block "Mehr aus **[Eltern]**" mit Tiles für **alle anderen** Sub Pages der gleichen Eltern Kategorie. So kann der User innerhalb der Kategorie stöbern.

### S3, Image Dimensions Mobile gleich Desktop wenn möglich

Wenn Desktop und Mobile dieselben Dimensionen haben können (Aspect Ratio passt für beide Layouts), kennzeichnen dass nur **ein** Bild produziert werden muss.

Mindestverhältnisse:
- Desktop: max 15:1 wide (Breite zu Höhe)
- Mobile: max 5:1 wide

Wenn das Desktop Bild auch unter 5:1 fällt, kann es 1 zu 1 für Mobile genutzt werden. Sonst braucht es ein eigenes Mobile Bild.

**Fix**: Build Skript Tile Field `useDesktopForMobile: true` wo Aspect passt. Tool seitig: dieser Flag wird im Designer Brief sichtbar gemacht.

## Quick Fixes heute

Folgende Fixes mache ich noch heute, weil schnell:
- B3 Subpage Headlines: Pattern Fix
- B4 imageCategory Default für image Tiles
- C1 "Warum diese Bestseller" Section umformulieren

Restliches kommt nächste Session.
