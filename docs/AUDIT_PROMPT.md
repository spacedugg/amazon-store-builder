# Brand Store Audit: True Nature — Analyse des generierten Outputs

## Dein Auftrag

Du bekommst einen generierten Amazon Brand Store für die Marke "True Nature". Analysiere den gesamten Store kritisch und dokumentiere ALLE Probleme. Der Store wurde mit dem Brand Store Builder Tool generiert und enthält massive Qualitätsprobleme.

## Was du analysieren sollst

### 1. ASIN-Kategorisierung
- Öffne den generierten Store und prüfe JEDE Unterseite
- Liste JEDE ASIN auf und in welcher Kategorie sie gelandet ist
- Markiere FALSCH zugeordnete ASINs (z.B. "Flohsamenschalen" in "Schlaf")
- Vergleiche mit dem echten True Nature Online-Shop: https://truenature.de
- Vergleiche mit dem echten Amazon Brand Store: https://www.amazon.de/stores/page/B4CF1B6D-F601-4927-B82F-8FD07CF887DC

### 2. Designer Briefings vs. interne Bildbeschreibungen
- Prüfe ob Designer Briefings zu detailliert sind (Filmregie-artig mit "cinematic wide shot", Lichtverhältnisse, Stimmungsbeschreibungen)
- Designer Briefings sollen KURZ und KNAPP sein: Bildidee + wichtigste Elemente
- Interne Bildbeschreibungen (für Wireframe-Generierung) sollen DETAILLIERT sein
- Dokumentiere Beispiele wo die beiden vertauscht scheinen

### 3. USPs und Brand-Informationen
- Vergleiche die generierten USPs mit den echten USPs von truenature.de:
  - 98% Produktzufriedenheit
  - Von Ernährungswissenschaftlern entwickelt  
  - Made in Germany
  - 365 Tage Zufriedenheitsgarantie
  - Natürlichkeit: ohne Laktose, Farbstoffe, Gentechnik, Gluten, Konservierungsstoffe
- Welche USPs fehlen im generierten Store?
- Welche USPs wurden erfunden oder falsch dargestellt?

### 4. Unterseiten-Qualität
- Prüfe die Extra-Seiten: Neuheiten, Über uns, Bestseller, Produktauswahl
- Sind dort überhaupt Inhalte generiert worden?
- Wenn leer oder fast leer: dokumentiere das

### 5. Wireframe-Qualität (falls generiert)
- Stimmen die Wireframes inhaltlich mit den Briefings überein?
- Zeigen die Wireframes Produkte die zur Marke gehören oder random-generierte?
- Ist die CI (Farben, Stil) erkennbar?

### 6. Seitenstruktur
- Ist die Kategorisierung sinnvoll für 48 Supplement-Produkte?
- Fehlen offensichtliche Kategorien?
- Sind die Kategorienamen passend?

### 7. Modul-Aufbau pro Seite
- Wie viele Module hat jede Seite?
- Sind es zu viele, zu wenige?
- Gibt es leere oder fast leere Seiten?
- Ergibt die Reihenfolge der Module Sinn?

## Output-Format

Erstelle einen Report als JSON:
```json
{
  "overallScore": "1-10",
  "criticalIssues": [
    "Issue 1: description",
    "Issue 2: description"
  ],
  "asinMiscategorizations": [
    { "asin": "B0...", "product": "Flohsamenschalen", "wrongCategory": "Schlaf", "correctCategory": "Verdauung" }
  ],
  "missingUSPs": ["USP that should be there but isn't"],
  "inventedUSPs": ["USP that was made up"],
  "emptyPages": ["page names with no/minimal content"],
  "briefingIssues": [
    { "page": "Homepage", "section": 7, "issue": "Designer brief too detailed, reads like film direction" }
  ],
  "wireframeIssues": [
    { "page": "Homepage", "section": 6, "issue": "Shows 4 random products that don't belong to True Nature" }
  ],
  "recommendations": [
    "What needs to change in the generation process"
  ]
}
```

## Kontext

Der Brand Store Builder hat folgende Pipeline:
1. ASIN Scraping (BrightData) → nur 8 Bilder für CI-Analyse genommen statt alle
2. Website Scraping → unvollständig
3. Bestehender Store Crawling → nur 10 Pages, falsche Modul-Erkennung
4. Produkt-Analyse → falsche Kategorisierung
5. Brand Voice → scheint OK
6. Content Strategy → 6 Seiten geplant, aber USPs falsch
7. Textbausteine → basieren auf falscher Analyse
8. Store-Generierung → Designer Briefs zu detailliert, ASINs falsch zugeordnet

Sei schonungslos ehrlich in deiner Bewertung.
