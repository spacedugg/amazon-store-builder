# Reference Store Analysis — Changelog

## Datum: 2026-04-01
## Branch: claude/analyze-store-data-fQiEd

---

## Phase 1: Store-Analyse (23 Stores)

### Neue Dateien: `data/reference-stores/*.json`

Alle 23 Amazon Brand Stores aus `seedStores.js` wurden manuell im Chrome-Browser geöffnet, vollständig analysiert und als strukturierte JSON-Dateien gespeichert.

| # | Brand | Datei | Kategorie | Quality | Seiten | Besonderheiten |
|---|-------|-------|-----------|---------|--------|----------------|
| 1 | SNOCKS | snocks.json | fashion | 5 | 24 | Mega-Store, beste Fashion-Referenz |
| 2 | The North Face | the-north-face.json | outdoor | 5 | 18 | Premium Outdoor, saisonale Kollektion |
| 3 | ESN | esn.json | supplements | 5 | 22 | Fitness-Supplements, dunkle Ästhetik |
| 4 | AG1 | ag1.json | supplements | 5 | 5 | Educational Funnel, wissenschaftlich |
| 5 | Bears with Benefits | bears-with-benefits.json | supplements | 2 | 3 | Minimal Store |
| 6 | MORE Nutrition | more-nutrition.json | supplements | 4 | 16 | Extrem bunt, einzigartige Kategoriefarben |
| 7 | Hansegrün | hansegruen.json | home_kitchen | 4 | 8 | Bestes Storytelling, natürlich-premium |
| 8 | Nespresso | nespresso.json | home_kitchen | 5 | 40+ | Ultra-Premium, Marmor/Gold |
| 9 | HOLY Energy | holy-energy.json | food | 4 | 13 | Gen-Z Pop-Art, Cartoon-Maskottchen |
| 10 | Kärcher | kaercher.json | household | 5 | 45+ | Größter Store, gelbe Labels |
| 11 | BLACKROLL | blackroll.json | fitness | 5 | 8 | Testsieger, App-Promotion |
| 12 | Manscaped | manscaped.json | beauty | 4 | 6 | Dark/Gold maskulin, Produktvergleich |
| 13 | Desktronic | desktronic.json | office | 4 | 7 | Video-Content, Lila CTAs |
| 14 | Cloudpillo | cloudpillo.json | home_kitchen | 4 | 5 | Wolken-Konzept, CHIP-Siegel |
| 15 | twenty:three | twentythree.json | home_kitchen | 3 | 4 | Minimal, elegante Serif |
| 16 | Bedsure | bedsure.json | home_kitchen | 4 | 8 | Viele Produkt-Sektionen, Test-Siegel |
| 17 | Gritin | gritin.json | home_kitchen | 3 | 5 | China-Brand, Orange CI |
| 18 | MasterChef | masterchef.json | home_kitchen | 2 | 4 | Nur Product Grids, minimal |
| 19 | Feandrea | feandrea.json | pets | 4 | 8 | Illustrationen, UGC-Galerie, Social Proof |
| 20 | TRIXIE | trixie.json | pets | 3 | 9 | Line-Art Icons, Polaroid-Stil, Video |
| 21 | Night Cat | nightcat.json | sports | 2 | 10 | China-Brand, gute Outdoor-Fotos |
| 22 | the nu company | nucompany.json | food | 4 | 3 | Bestes Purpose-Storytelling, Gen-Z |
| 23 | Kloster Kitchen | klosterkitchen.json | food | 4 | 10 | Awards, wissenschaftliches Copywriting |

### JSON-Schema pro Store:
```
{
  brandName, storeUrl, category, qualityScore, analyzedAt,
  ci: { primaryColors, accentColors, imageStyle, typographyStyle, tonality, ciConsistency, consistencyNotes },
  navigation: { pageCount, structurePrinciple, pages[] },
  heroImage: { url, description, textOnImage, colorMood, designElements },
  pages[]: {
    name, url, moduleCount,
    modules[]: { type, layoutId, position, tileCount, visualConnection, tiles[] },
    pageTexts: { headlines[], descriptions[], ctas[], nativeTexts[] }
  },
  analysis: { ciImplementation, imageLanguage, storytelling, moduleFlow, subpageLogic, conversionElements[], copywritingAnalysis, strengths[], weaknesses[] }
}
```

---

## Phase 2: Cross-Store Summary

### Neue Datei: `data/reference-stores/_summary.json`

Enthält aggregierte Insights aus allen 23 Stores:

- **whatMakesGreatStores**: Tier 5 und Tier 4 Patterns, häufige Schwächen
- **layoutUsagePatterns**: Meistgenutzte Layouts mit Beispielen, Layout-Kombinationen (Storytelling, Katalog, Premium, Minimal)
- **imageStrategies**: Lifestyle-vs-Produkt-Ratios, einzigartige visuelle Konzepte, Farbpaletten nach Kategorie, Hero-Image-Patterns
- **copywritingPatterns**: Claim-Styles (Zwei-Wort, Kontrast, Emotional, Purpose, Provokant), Headline-Patterns (5 Typen), CTA-Patterns, Tonality nach Kategorie
- **ciImplementationPatterns**: 4 Konsistenz-Level mit Markenbeispielen, Branding-Elemente
- **conversionElementPatterns**: Social Proof (Testsiegel, Zahlen, Amazon-Badges, UGC), CTA-Platzierung, Special Elements
- **storytellingArchetypes**: 5 Archetypen (Educational Funnel, Category Navigator, Purpose Story, Product Showcase, Seasonal Hook)
- **subpageStrategies**: Empfehlungen nach Seitenanzahl, Special Pages
- **recommendationsForStoreBuilder**: Konkrete Verbesserungsvorschläge für Prompts, Image Briefings, Copywriting

---

## Phase 3: Code-Verbesserungen

### 3a: `src/referenceStoreService.js` — Erweitert

**Neue Funktionen:**
- `loadStaticReferenceData(category)` — Lädt `_summary.json` und extrahiert kategoriespezifische Patterns
- `formatStaticReferenceContext(category)` — Formatiert statische Referenzdaten als AI-Prompt-Sektion (funktioniert OHNE Live-Crawling)
- `formatDefaultReferenceContext(category)` — Fallback wenn `_summary.json` nicht verfügbar

**Verbesserte Funktionen:**
- `formatReferenceStoreContext()` — Jetzt mit Visual Flow, CI-Insights, Copywriting-Beispielen
- `formatKnowledgeBaseContext()` — Gruppiert nach Kategorie, zeigt Module/Layouts/Farben

### 3b+c: `src/App.jsx` — Generation Pipeline erweitert

**Neue Pipeline-Steps:**
- Step 1.5b: Existing Store mit Gemini Vision analysieren (wenn URL angegeben)
- Step 1.7: Statische Referenzdaten aus `_summary.json` laden (IMMER verfügbar)
- Step 1.8: Storytelling-Typ als Direktive injizieren
- Step 1.9: CI-Detection-Modus aktivieren (extrahiert Farben, Typo, Fotostil)

### 3d: `src/components/GenerateModal.jsx` — Neue UI-Felder

**Neue Formularfelder (alle auf Deutsch):**
- **Referenz-Kategorie** Dropdown: 12 Produktkategorien (supplements, food, home_kitchen, fashion, fitness, beauty, office, pets, sports, household, electronics, tools)
- **CI-Erkennung** Checkbox: Aktiviert automatische Corporate Identity Extraktion aus Website-Daten
- **Storytelling-Typ** Dropdown: 6 Optionen (Automatisch, Educational Funnel, Category Navigator, Purpose Story, Product Showcase, Seasonal Hook)

### 3e: Gemini Vision Integration

- Existing Store URL wird jetzt mit Gemini Vision analysiert (Crawl + Image Analysis)
- CI-Daten (Farben, Stil, Komposition) werden aus dem bestehenden Store extrahiert
- Ergebnisse fließen als Kontext in die AI-Generierung ein

---

## Zusammenfassung der Änderungen

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `data/reference-stores/*.json` (23 Dateien) | NEU | Strukturierte Analyse aller 23 Brand Stores |
| `data/reference-stores/_summary.json` | NEU | Cross-Store Insights und Patterns |
| `data/reference-stores/_changelog.md` | NEU | Diese Dokumentation |
| `src/referenceStoreService.js` | ERWEITERT | 3 neue Funktionen + 2 verbesserte Funktionen |
| `src/components/GenerateModal.jsx` | ERWEITERT | 3 neue UI-Felder (Kategorie, CI, Storytelling) |
| `src/App.jsx` | ERWEITERT | 4 neue Pipeline-Steps (1.5b, 1.7, 1.8, 1.9) |

### Impact:
- Das Tool kann jetzt **ohne Live-Crawling** auf Best Practices aus 23 realen Stores zugreifen
- **Kategoriespezifische** Empfehlungen für Farben, Layouts, Copywriting, Storytelling
- **5 Storytelling-Archetypen** als wählbare Option im UI
- **CI-Detection** extrahiert automatisch die Markenidentität
- **Gemini Vision** analysiert bestehende Stores für CI-Extraktion
