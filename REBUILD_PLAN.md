# REBUILD_PLAN — Store Builder Architektur Reset

Plan für das Neuaufsetzen der Generierungs-Pipeline des Amazon Store Builders.
Branch: `claude/reset-store-builder-arch-iSfLs`.

---

## 1. Ziel

Generierte Stores sollen strukturell nicht mehr von echten Brand-Referenzen
unterscheidbar sein. Heute sehen sie trotz 20 verfügbarer Blueprint-Referenzen
immer ähnlich aus, weil die Skeleton-Generierung hartkodierte Modulfolgen
nutzt und die Blueprints nicht datengetrieben auswertet.

**Leitprinzip:** Jede strukturelle Entscheidung (Modulanzahl, Layout pro Slot,
Reihenfolge, Bildkategorie-Mix, Textdichte) wird aus den 20 Blueprints
statistisch abgeleitet, nicht erfunden.

---

## 2. Ausgangslage

### 2.1 Was funktioniert und bleibt unverändert

| Bereich | Datei | Warum bleibt |
|---|---|---|
| Layout-Katalog | `src/constants.js` (`LAYOUTS`, `LAYOUT_TILE_DIMS`, `TILE_TYPES`, `DIMENSION_PRESETS`) | Grundwahrheit für Desktop und Mobile. Wird nicht geändert. |
| Blueprints | `public/data/reference-stores/*.json` | 20 reale Stores, die Datenbasis für die Grammatik. |
| Refine-Flow | `aiRefineStore` (storeBuilder.js:1484), `applyOperations` | Wird aus App.jsx:1408 aktiv genutzt. |
| Wireframes | `generateWireframesForPage`, `deleteWireframesForPage` | Wird aus App.jsx:174,207 und BriefingView genutzt. |
| Storage | `api/_db.js`, `api/stores.js`, `api/wizard-state.js`, `api/timer.js` | Persistenz bleibt. Siehe aber Punkt 5.6. |
| Export | `src/exportPackage.js`, `src/exportZip.js` | Funktioniert. |
| UI-Kern | `App.jsx` Layout, `StorePreview`, `ModuleEditor` | Kein Umbau geplant. |
| Scraping | `api/amazon-search.js`, Bright-Data-Integration | Bleibt. Bug-Fix siehe Punkt 5.7. |

### 2.2 Was heute kaputt oder tot ist

| Symptom | Ort | Status |
|---|---|---|
| Alte Generate-Pipeline dead code | `storeBuilder.js:1780 generateStore` wird in `App.jsx:897` mit Kommentar `Old generateStore() pipeline removed, replaced by Content-First v2 above` bereits ausgehängt. | Noch im Repo, aber nicht mehr aufgerufen. |
| Helfer der toten Pipeline | `storeBuilder.js:523 aiAnalyzeProducts`, `storeBuilder.js:699 aiGeneratePageLayout`, diverse `fallback*`-Funktionen | Nur intern von `generateStore` gerufen, also tot. |
| Blueprints werden beim Generieren ignoriert | Content-First v2 in App.jsx | Skeleton kommt aus LLM-Freitext statt aus Blueprint-Grammatik. |
| Wizard-State-Drafts lassen sich nicht löschen | `api/wizard-state.js` hat GET und POST, aber kein DELETE. | Führt zu Kreuzkontamination zwischen Brands. |
| Admin-Knowledge-Base parallel zu statischen Blueprints | `api/reference-stores.js` plus `src/components/AdminAnalyze.jsx` doppeln die Blueprint-Logik über die DB. | Entscheidung siehe Punkt 8. |

---

## 3. Zielarchitektur

Die neue Pipeline läuft deterministisch in dieser Reihenfolge:

```
1. Ingest
   - ASINs scrapen (mit Retry + Parent/Child-Fallback, CLAUDE.md Punkt 3)
   - Existierenden Brand Store crawlen (rekursiv, CLAUDE.md Punkt 4)
   - Website-Content laden

2. Brand Signals
   - Brand Analysis (Text-Quellen)
   - Image Vision Analysis aller Produkt- und From-the-Brand-Bilder
     (CLAUDE.md Punkt 5)
   - Ergebnis: brandSignals { voice, usps, story, visualInsights }

3. Struktur
   - Page Type Classifier mappt jede Zielseite auf einen Typ
     (home, category, about, sustainability, bestsellers,
      new_arrivals, product_lines, brand_story)
   - Skeleton Builder zieht aus Blueprint Grammar ein konkretes
     Modulgerüst (Anzahl, Layouts, Reihenfolge)

4. Content
   - Content Generator erzeugt Slot-Inhalte (Headlines, Sublines,
     USPs, Bildauswahl, CTAs)
   - Slot Filler weist Inhalte den Tiles zu, basierend auf
     LAYOUT_TILE_DIMS aus constants.js

5. Assembly
   - Store-Objekt wird zusammengebaut (bestehendes Schema)
   - Wireframes generieren (bestehende Funktion)

6. Refine (on demand)
   - aiRefineStore + applyOperations wie bisher, Prompts angepasst
```

---

## 4. Neue Module

### 4.1 Blueprint Grammar Extractor
**Datei:** `src/blueprintGrammar.js` (neu), plus Build-Script
`scripts/build-blueprint-grammar.mjs`.

Einmalig offline ausgeführt. Liest alle 20 Blueprints aus
`public/data/reference-stores/*.json` und schreibt
`public/data/blueprint-grammar.json`. Pro Seitentyp berechnet:

- Verteilung der Modulanzahl (Median, P25, P75)
- Layout-Häufigkeit pro Position (Position 1 bis Position N)
- Häufige Modulsequenzen (Bigramme und Trigramme von Layout-IDs)
- Bildkategorie-Mix (Lifestyle, Produkt-Freisteller, Brand-Story, Icon)
- Textdichte-Verteilung pro Tile-Typ
- Tile-Type-Häufigkeit pro Layout-Slot

Wird im Build-Schritt von Vercel oder lokal neu erzeugt, sobald ein
Blueprint hinzukommt.

### 4.2 Page Type Classifier
**Datei:** `src/pageTypeClassifier.js` (neu).

Regelbasierter Classifier, kein LLM-Call. Eingabe: Zielseite (Name, vom
User benannte Rolle, Produktmenge, vom User eingegebene Intent-Stichworte).
Ausgabe: Seitentyp-Label. Homepage ist fix. Für Unterseiten gilt eine
Entscheidungsmatrix aus Namensmustern (`Über uns`, `Nachhaltigkeit`,
`Neu`, `Bestseller`, `Geschichte`, …). Wenn kein Muster greift, fällt
der Classifier auf `category` zurück.

### 4.3 Skeleton Builder
**Datei:** `src/skeletonBuilder.js` (neu).

Nimmt Seitentyp, Produktanzahl, gewünschte Content-Slot-Anzahl und
zieht aus der Grammar-Verteilung ein konkretes Gerüst. Nicht rein
deterministisch, sondern Sampling innerhalb der beobachteten Spannweite,
damit zwei Brands nicht das gleiche Gerüst bekommen.

Ausgabe ist ein Store-Modulbaum mit leeren Tile-Slots, passend zum
bestehenden Store-Schema.

### 4.4 Content Generator
**Datei:** `src/contentGenerator.js` (neu, zieht Logik aus
`contentPipeline.js` um).

Erzeugt pro Seitentyp und pro benötigtem Slot konkrete Inhalte. Nutzt
brandSignals als Quelle. Prompts enthalten explizit die CLAUDE.md-Regeln
1 und 2 (keine Em- oder En-Dashes im Output, keine produktspezifischen
Zahlen in Marken-USPs).

### 4.5 Slot Filler
**Datei:** `src/slotFiller.js` (neu).

Deterministische Zuweisung. Kein LLM. Liest für jedes Modul des Skeletons
die Tile-Struktur aus `LAYOUT_TILE_DIMS` und weist passende Content-Slots
zu. Bildauswahl respektiert Tile-Aspect-Ratio und Kategorie-Mix.

### 4.6 Wiring
**Datei:** `src/pipelineV2.js` oder Umbau von `src/contentPipeline.js`.

Ersetzt die aktuelle Content-First-v2-Pipeline in `App.jsx`. Orchestriert
die Schritte 1 bis 5 aus Abschnitt 3.

---

## 5. Aufräumarbeiten

### 5.1 Löschen in `src/storeBuilder.js`
- `generateStore` (Zeile 1780 bis Dateiende der Funktion)
- `aiAnalyzeProducts` (Zeile 523 …)
- `aiGeneratePageLayout` (Zeile 699 …)
- `fallbackAnalysis`, `fallbackHomepage`, `fallbackCategoryPage`
  und weitere `fallback*`-Helfer
- Alle Hartkodierungen von Modulanzahl, Bildzahl, Layout-Sequenzen

**Was bleibt in storeBuilder.js:** `aiRefineStore`, `applyOperations`,
`generateWireframesForPage`, `deleteWireframesForPage`, sowie gemeinsam
genutzte Utility-Funktionen.

### 5.2 Löschen in `src/App.jsx`
- Überbleibsel der alten Pipeline um Zeile 897
- Aufrufe der in 5.1 gelöschten Funktionen

### 5.3 Entscheidungsoffen (siehe Punkt 8)
- `api/reference-stores.js`
- `src/components/AdminAnalyze.jsx`
- DB-Knowledge-Base insgesamt

### 5.4 DELETE-Endpoint für Wizard-State
In `api/wizard-state.js` ergänzen:
```
DELETE /api/wizard-state?id=xxx
  → DELETE FROM stores WHERE id = ?
  (oder, weniger destruktiv:
   UPDATE stores SET generation_state = NULL, generation_step = NULL WHERE id = ?)
```
Entscheidung zwischen harter und weicher Löschung: weich, weil der
Store ansonsten aus `api/stores.js` verschwinden würde.

### 5.5 ASIN-Scraping (CLAUDE.md Punkt 3)
In `api/amazon-search.js` Zeile 82 wird die Filterung
`.filter(function(p) { return p && !p.error; })` entfernt. Statt dessen:

1. Retry einmal bei Error.
2. Bei anhaltendem Error: Parent-ASIN prüfen, Varianten expandieren.
3. Bei endgültigem Fehlschlag: ASIN explizit als fehlend an Frontend melden,
   nicht verwerfen.

### 5.6 Brand-Store-Crawling (CLAUDE.md Punkt 4)
`api/crawl-brand-store.js` rekursiv machen. Alle entdeckten
Store-URLs crawlen, nicht nur die Startseite. Duplikate über URL
entdubbeln. Keine hartkodierten Suffixe wie `/page/about`.

### 5.7 Vision-Analyse (CLAUDE.md Punkt 5)
Alle Produktbilder, `from_the_brand`-Bilder und
`product_description`-Bilder werden durch Claude Vision oder Gemini
Vision geschickt. Ergebnis fließt in `brandSignals.visualInsights`.
Cache pro ASIN plus Bild-URL-Hash, damit nicht bei jedem Lauf neu
analysiert wird.

---

## 6. Umsetzungsreihenfolge (Wellen)

Jede Welle ist ein eigener Commit und ein Review-Punkt.

### Welle 1, Aufräumen
- Dead Code aus `storeBuilder.js` und `App.jsx` entfernen (5.1, 5.2)
- DELETE-Endpoint in `wizard-state.js` ergänzen (5.4)
- Ergebnis: Repo ist schlanker, kein Funktionsverlust.

### Welle 2, Grammar
- `scripts/build-blueprint-grammar.mjs` schreiben
- `public/data/blueprint-grammar.json` erzeugen und committen
- Sanity-Check: Verteilungen plausibel, seltene Seitentypen markiert
- Ergebnis: Datengetriebene Grammatik im Repo abgelegt.

### Welle 3, Classifier + Skeleton Builder
- `pageTypeClassifier.js`
- `skeletonBuilder.js`
- Unit-Tests gegen Blueprints: Reklassifizierung muss ≥ 90 Prozent treffen
- Ergebnis: Aus Input und Grammar wird ein leeres aber plausibles Gerüst.

### Welle 4, Content + Slot Filler
- `contentGenerator.js`
- `slotFiller.js`
- Vision-Analyse voll eingebunden
- ASIN-Scraping-Fix aus 5.5
- Ergebnis: End-zu-End-Lauf erzeugt einen befüllten Store.

### Welle 5, Refine anpassen
- `aiRefineStore`-Prompts an die neue Struktur anpassen
- `applyOperations` gegen neue Gerüste testen
- Ergebnis: Refine macht Stores besser, nicht schlechter.

### Welle 6, Crawling
- `api/crawl-brand-store.js` rekursiv (5.6)
- Ergebnis: Bestehender Brand Store liefert vollständigen Input.

---

## 7. Akzeptanzkriterien

1. **Struktureller Blind-Test.** Für 5 Brands werden je 3 generierte und
   2 echte Blueprint-Stores in zufälliger Reihenfolge gezeigt. Eine
   dritte Person trifft die richtige Einordnung in unter 70 Prozent
   der Fälle.
2. **Keine Klone.** Zwei Stores aus demselben Lauf mit verschiedenen
   Brands haben nicht die gleiche Modulsequenz.
3. **ASIN-Vollständigkeit.** Jeder eingelieferte ASIN landet im Store
   oder wird explizit im Log als nicht verarbeitbar gemeldet
   (CLAUDE.md Punkt 3).
4. **Marken-USP-Sauberkeit.** Keine produktspezifischen Zahlenwerte in
   Marken-USPs, wenn mehrere Produktvarianten vorliegen
   (CLAUDE.md Punkt 2).
5. **Vision-Pflicht.** Alle gelieferten Bilder sind vor der
   Content-Generierung durch Vision gelaufen, Ergebnis im State sichtbar
   (CLAUDE.md Punkt 5).
6. **Typografie-Regel.** Kein Em-Dash, kein En-Dash in kundensichtbarem
   Output. Grep gegen Export-JSON liefert 0 Treffer für U+2013 und U+2014
   (CLAUDE.md Punkt 1).
7. **Draft-Hygiene.** Wizard-State-Drafts lassen sich löschen, keine
   Brand-Kreuzkontamination.
8. **Blueprint-Abdeckung.** Page Type Classifier klassifiziert
   bestehende Blueprint-Seiten zu mindestens 90 Prozent korrekt
   (Ground Truth ist der Dateipfad bzw. Seitenname im Blueprint).

---

## 8. Offene Fragen an den User

1. **Admin-Knowledge-Base löschen?** `api/reference-stores.js` und
   `src/components/AdminAnalyze.jsx` werden überflüssig, sobald die
   statischen Blueprints unter `public/data/reference-stores/*.json`
   die alleinige Quelle sind. Vorschlag: löschen, DB-Tabellen behalten.
2. **Seitentyp-Inventar.** Reichen die acht vorgeschlagenen Typen
   (home, category, about, sustainability, bestsellers, new_arrivals,
   product_lines, brand_story)? Alles andere fällt auf `category`
   zurück.
3. **Vision-Provider.** Claude Vision oder Gemini Vision als Default?
   Claude hat bessere Textkonsistenz, Gemini ist günstiger.
4. **Sampling-Determinismus.** Soll der Skeleton Builder pro Brand
   einen festen Seed nutzen (damit ein erneuter Lauf dasselbe Gerüst
   liefert), oder jedes Mal neu samplen?

---

## 9. Risiken

- **Dünne Statistik bei seltenen Seitentypen.** `sustainability` hat nur
  3 Beispiele in den Blueprints. Mitigation: seltene Typen bekommen
  Mindestsample-Warnung und greifen im Zweifel auf die Homepage-
  oder Category-Verteilung zurück.
- **Refine-Regression.** Der aktuelle Refine-Flow arbeitet auf
  freier Store-Struktur. Wenn Welle 3 die Struktur ändert, kann Welle 5
  nicht verschoben werden.
- **Vision-Kosten.** Pro Store ggf. 30 bis 80 Bilder. Mitigation: Cache
  pro ASIN plus Bild-URL-Hash.
- **Bright-Data-Flakiness.** Bot-Detection kann ganze Batches killen.
  Mitigation: Retry-Logik aus 5.5, klare Fehlermeldung an den User.

---

## 10. Nicht-Ziele

- Kein Umbau des Layout-Katalogs in `constants.js`.
- Keine neue UI-Library, kein neues State-Management.
- Keine Migration der DB-Struktur.
- Kein neues Export-Format.
