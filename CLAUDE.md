# Projektregeln Amazon Store Builder

Dieses Projekt erzeugt Amazon Brand Stores für die Agentur TEMOA. Die folgenden Regeln gelten verbindlich für jeden Output, jeden Prompt im Code und jede Antwort von Claude.

## 1. Schreibweise und Interpunktion

### Geltungsbereich

Diese Regel gilt ausschließlich für **kundensichtbare Brand Store Inhalte**: Headlines, Sublines, USPs, CTAs, Kategorienamen, Modulnamen, Alt Texte, Bildtexte, Bildbeschriftungen, Produktkurzbeschreibungen.

Nicht betroffen sind:
- UI Labels der Generator Anwendung (zum Beispiel "Hero-Claim-Stile", "Benefit-Claim", "Text-CTA" in der Admin Maske)
- Log Meldungen an den Entwickler
- Technische Dateinamen und URLs
- Interne Dokumentation

### Em Dash und En Dash sind immer verboten

Im kundensichtbaren Output niemals verwenden:

- Em Dash `—` (U+2014)
- En Dash `–` (U+2013)

Statt dessen Komma, Punkt oder Klammer verwenden.

### Hyphen Minus: zulässig nur in zusammengesetzten Wörtern

Der Bindestrich `-` (U+002D) darf nur verwendet werden, wenn er **direkt** zwei oder mehr Wortbestandteile zu einem Kompositum verbindet. Das heißt:

- **Links und rechts vom Bindestrich steht kein Leerzeichen**
- Er verbindet Wortbestandteile zu einem einzigen Begriff

Zulässige Beispiele:
- `Wasserfilter-Flaschen`
- `Selfpress-Technologie`
- `Outdoor-Aktivitäten`
- `3-in-1 Filtersystem`
- `Notfall-Filter`
- `Coca-Cola` (Markenname)

Nicht zulässige Beispiele (Satzstil, Satz Ersatz, mit Leerzeichen):

| Nicht so | So |
|----------|-----|
| `Trust bar with key benefits - 99,99% Filtration` | `Trust bar mit 99,99 Prozent Filtration` |
| `Die Marke - ein Premium Hersteller` | `Die Marke, ein Premium Hersteller` |
| `Schritt 2 — Scraping` | `Schritt 2, Scraping` |
| `Unsere Werte – Qualität, Vertrauen` | `Unsere Werte: Qualität, Vertrauen` |

### Prüfregel für die AI in Prompts

Vor der Ausgabe prüft die AI jeden Bindestrich:

1. Hat der Bindestrich links und rechts direkt ein Zeichen (Buchstabe, Zahl) ohne Leerzeichen? Dann ist er Teil eines Kompositums und zulässig.
2. Hat der Bindestrich links oder rechts ein Leerzeichen? Dann ist er Satzstil und **nicht** zulässig, muss durch Komma, Punkt, Doppelpunkt oder Umformulierung ersetzt werden.
3. Ist der Bindestrich ein Em Dash oder En Dash? Dann ist er **niemals** zulässig.

### Umsetzung im Code

Alle Prompts in `src/contentPipeline.js`, `src/storeBuilder.js`, `src/brandAnalysis.js` und allen weiteren Prompttextquellen müssen die oben stehenden Regeln explizit enthalten. Bei jeder Änderung an Pipelineprompts diese Regel mit aufnehmen.

## 2. USPs auf Markenebene: Produktunabhängig formulieren

Wenn ein Brand Portfolio aus unterschiedlichen Produkten besteht (zum Beispiel verschiedene Füllmengen, Gewichte, Varianten, Formate), dürfen produktspezifische Merkmale **niemals** als Marken USPs dargestellt werden.

### Beispiele was vermieden werden muss

- USP auf Markenebene: "1,5 Liter Fassungsvermögen" (gilt nur für ein spezifisches Produkt)
- USP auf Markenebene: "500 Gramm Füllmenge" (trifft nicht auf alle Produkte zu)
- USP auf Markenebene: "entfernt 99,99 Prozent der Bakterien in 2 Sekunden" (wenn das nur für ein Modell gilt)

### Stattdessen

Marken USPs beschreiben **was die Marke generell auszeichnet**, unabhängig vom einzelnen Produkt:

- Gemeinsame Technologie oder Herstellungsweise
- Gemeinsame Zielgruppe oder Anwendungskontext
- Gemeinsame Markenwerte oder Qualitätsversprechen
- Zertifizierungen und Tests die für die ganze Produktlinie gelten

### Umsetzung im Code

Der Prompt für die Brand Analysis (`src/contentPipeline.js` oder entsprechende Stelle) muss Claude explizit anweisen:

> "USPs auf Markenebene dürfen NIEMALS produktspezifische Zahlenwerte enthalten (zum Beispiel Füllmengen, Gewichte, Abmessungen), wenn das Portfolio mehrere Produkte mit unterschiedlichen Werten enthält. Prüfe jeden USP Kandidaten: trifft er auf ALLE gelisteten Produkte zu? Wenn nein, formuliere ihn produktunabhängig oder verwerfe ihn."

## 3. ASIN Scraping: alle ASINs müssen ankommen

Wenn der User eine Liste von ASINs einreicht, müssen **alle** ASINs erkannt und verarbeitet werden. Aktuell filtert `api/amazon-search.js` Zeile 82 fehlerhafte Bright Data Einträge mit `.filter(function(p) { return p && !p.error; })` heraus. Das verwirft stillschweigend Produkte.

### Anforderung

Bei jedem Scrape Lauf:

1. Wenn Bright Data für einen ASIN einen Fehler zurückgibt, erst einen **Retry** mit kurzer Wartezeit starten (Bot Detection kann vorübergehend sein)
2. Wenn der Retry weiter fehlschlägt, prüfen ob der ASIN eine **Child Variant** eines Parent ASIN ist. Falls ja, den Parent ASIN scrapen und dessen Varianten expandieren
3. Wenn der ASIN ein Parent ist und der Parent failed, den ersten verfügbaren Child ASIN ermitteln und scrapen
4. Wenn alle Versuche scheitern, dem User **explizit** im Log melden welche ASINs nicht verarbeitet werden konnten und warum

Keine stillschweigende Verwerfung von ASINs mehr.

## 4. Bestehender Brand Store: vollständiges Crawling aller Unterseiten

Wenn der User einen bestehenden Amazon Brand Store angibt, muss das Tool **jede einzelne Unterseite** des Stores crawlen. Die URLs der Unterseiten folgen keiner logischen Struktur und können nicht erraten werden.

### Anforderung

1. Die Startseite des Brand Stores wird geladen und gerendert.
2. Alle Navigationspunkte und alle internen Links werden erkannt.
3. Jede entdeckte Unterseite wird einzeln gecrawlt.
4. Bei jeder Unterseite werden erfasst: sichtbarer Text, Überschriften, Modul Typen, Bilder, Bild Alt Texte.
5. Das Crawling geht rekursiv in die Tiefe, bis keine neuen Unterseiten mehr entdeckt werden oder ein Tiefenlimit erreicht ist.
6. Besonders wichtige Seitentypen wie "Über uns", "Geschichte", "Nachhaltigkeit", "Produktauswahl" werden in der Analyse mit hoher Priorität ausgewertet, weil sie Brand Story und Werte enthalten.

### Technische Umsetzung

Der Code in `api/crawl-brand-store.js` oder äquivalent muss:

1. Per Web Unlocker den gerenderten HTML Inhalt der Startseite holen.
2. Alle `href` Werte mit Amazon Store Pattern extrahieren, nicht nur Top Level Navigation.
3. Duplikate anhand der URL filtern.
4. Jede eindeutige URL einzeln crawlen und den Inhalt extrahieren.
5. Das Ergebnis strukturiert an die Brand Analysis übergeben, so dass Brand Story, "Über uns" Content und Produktseiten getrennt identifizierbar sind.

Keine Verwendung von hartkodierten URL Suffixen wie `/page/about` oder `/page/home`. Die URLs müssen dynamisch entdeckt werden.

## 5. Bildanalyse per Vision: Kernbestandteil des Tools

Wenn Bright Data Produktbilder liefert (Hauptbild, `images` Array, `from_the_brand`, `product_description`), müssen diese Bilder per Vision Modell analysiert werden. Das ist ein **Kernbestandteil** des Tools, kein Extra.

### Anforderung

1. Jedes gelieferte Produktbild wird entweder durch Claude mit Vision oder durch Gemini Vision inhaltlich analysiert.
2. Die Analyse extrahiert: sichtbarer Text auf dem Bild, dargestellte USPs, Claims, Zertifikate, visuelle Symbole, erkennbare Markenbotschaften, Kontextinformationen wie Setting, Personen, Anwendung.
3. Texte die als Bild hinterlegt sind (häufig in `from_the_brand` und `product_description`) werden per OCR oder Vision extrahiert und in die Brand Voice Analyse und in die USP Gewinnung eingespeist.
4. Die Ergebnisse der Bildanalyse fließen in die Brand Story, die Marken USPs und die Content Generation ein.
5. Wenn ein Bild keinen sichtbaren Text enthält, wird stattdessen ein visueller Deskriptor erzeugt (Szene, Stimmung, Farbgebung) der in die CI Analyse und in die Bildauswahl für den neuen Store einfließt.

### Warum

Amazon Marken versenken sehr viel Information in Bildern. "From the Brand" Sections und A Plus Content sind fast immer Bildgalerien mit eingebettetem Text. Wer diese Bilder nicht liest, verliert die Hälfte der verfügbaren Markeninformation.

### Technische Umsetzung

1. In `api/amazon-search.js` werden bereits die Bild URLs aus `images`, `from_the_brand` und `product_description` extrahiert.
2. Die Pipeline ruft für jede Bildgruppe einen Vision Endpoint auf.
3. Die extrahierten Texte und Deskriptoren landen in einem strukturierten Feld der Brand Analysis, zum Beispiel `imageInsights` oder `visualBrandSignals`.
4. Die Brand Analysis Prompts in `src/contentPipeline.js` nutzen diese Felder als zusätzliche Quelle für USP, Brand Story und Tonalität.

## 6. Versandkosten und Lieferung: niemals als Marken USP

Wir verkaufen ausschließlich auf Amazon. Versandkonditionen, Lieferzeit, Versandkostenfreiheit sind komplett **Amazon Sache**, nicht Sache der Marke. Diese Themen tauchen darum **niemals** im kundensichtbaren Brand Store Output auf.

Verboten in Headlines, Sublines, USPs, CTAs, Bildtexten, Bildbeschriftungen:

- "Versandkostenfrei", "Free Shipping", "Versandkostenfrei in Deutschland"
- "Schnelle Lieferung", "Express Versand"
- "In 24 Stunden bei dir", Lieferzeit Aussagen jeder Art
- Truck Icons als USP Symbol
- "Sofort verschickt"

Wenn die Brand Story Inhalte zur Versandlogistik enthält (Eigenversand, Logistikzentrum, etc.), erwähne im Store Konzept neutrale Werte wie "Inhabergeführt", "Aus Deutschland", "Eigenes Lager", aber **nie** mit Bezug auf Versandkonditionen oder Lieferzeit.

### Umsetzung im Code

Skill Prompt und Brand Analysis Prompt müssen Claude explizit verbieten, Versand und Lieferzeit Themen als USP zu generieren. Bei Re Generation eines bestehenden Stores: vorhandene Versand USPs werden ersatzlos gestrichen oder durch echte Marken USPs ersetzt.

## 7. Sprache

Alle User facing Texte sind Deutsch, sofern der User nicht explizit eine andere Sprache wünscht. Das gilt für Logs, Toasts, Fehlermeldungen und alle vom Generator erzeugten Brand Store Inhalte auf der Marktplatzdomain `amazon.de`.
