# Brand Store Generation Process v2

## Grundprinzipien

1. **Keine Hard Rules.** Die Wissensdatenbank (data/store-knowledge.json) liefert Prinzipien und Muster aus 21 analysierten Top-Stores. Bei jeder Generierung wird individuell entschieden, was zur jeweiligen Marke passt.

2. **Inhalt zuerst, Module danach.** Zuerst werden Inhalte, Themen und Texte erarbeitet. Dann wird entschieden, welches Layout am besten dazu passt. Nicht umgekehrt.

3. **Übergreifende Wissensdatenbank.** Die Erkenntnisse aus allen 21 Stores werden übergreifend genutzt — nicht nach Kategorie gefiltert. Ein Fitness-Store kann von Nespresso-Prinzipien profitieren.

4. **Qualität vor Quantität.** 9-16 hochwertige Brand-Images schlagen 40 mittelmäßige. (Quelle: Nespresso mit 12 Bildern ist eindrucksvoller als Stores mit 40+)

5. **Sequentiell, nicht parallel.** Jeder Schritt baut auf dem vorherigen auf. Keine gleichzeitige Generierung von Dingen, die voneinander abhängen.

6. **API-Kosten kein Limit.** So viele Calls wie nötig für Qualität.

---

## PHASE 0: WISSENSDATENBANK (bereits erledigt)

21 Brand Stores analysiert über Cowork. Gespeichert in `data/store-knowledge/`.

**Übergreifende Erkenntnisse** (`data/store-knowledge.json`):
- 6 Design-Archetypen identifiziert (Premium Minimalist, Gen-Z Burst, Natur/Bio, Warm Home, Industriell, Enterprise)
- Layout-Patterns: Full-Width in 95% der Stores, std-2equal in 70%
- Modul-Flow-Patterns: Standard-Flow (12/20), Repetitive-Flow (5/20), etc.
- Hero-Strategien: Logo+Claim+Social Proof, Emotionaler Claim, Produkt-Showcase
- Copywriting-Patterns: Emotionale Claims (30%), Benefit-Claims (25%), Brand-Name als Claim (20%)
- Navigation: Micro (1-5 Seiten), Compact (6-12), Medium (13-20), Enterprise (20+)

**Diese Daten werden bei JEDER Generierung als Kontext mitgegeben — nicht als Regeln, sondern als Orientierung.**

---

## PHASE 1: EINGABE + DATENSAMMLUNG

### 1.1 — Eingabemaske

**Pflicht:**
- Brand Name
- Marketplace (de/com/fr/etc.)
- ASINs (manuell oder Amazon-Suche)

**Empfohlen:**
- Logo-Upload
- Schriftarten (Name oder Datei)
- Markenfarben (Hex-Codes)
- Website-URL
- Brand-Ton-Beispiele (2-3 Sätze von der Marke als Stil-Referenz)
- Spezielle Anweisungen (Freitext)
- Ziel-Komplexität (Minimal / Standard / Premium)

**Bei bestehendem Brand Store:**
- Store-URL
- Granulare Optionen:
  - Menüstruktur beibehalten oder ändern?
  - Welche Seiten behalten / welche neu?
  - Was funktioniert gut? Was verbessern?
- Grundsatz: Immer den bestmöglichen Store bauen.

### 1.2 — Amazon Product Scraping

Pro ASIN (einzeln, nicht Batch):
- Titel
- Rating, Bewertungsanzahl
- **Alle 7 Produktbilder** (MAIN, PT01-PT06)
- Alle 5 Bullet Points
- Produktbeschreibung
- A+ Content (Bilder + Texte, falls vorhanden)
- Kategorie-Breadcrumb
- Verfügbar seit (Neuheiten-Erkennung)
- Bestseller-Rang

### 1.3 — Website Scraping (falls URL vorhanden)

**Alle Seiten** der Website:
- Texte, Bilder, Farben, Fonts
- Navigation/Kategorien
- Produktzuordnungen
- About/Story/Qualität/Zertifikate
- Alles was zur Marke gehört

---

## PHASE 2: ANALYSE

Jeder Schritt liefert ein konkretes Ergebnis, das im nächsten Schritt verwendet wird.

### 2.1 — Produkt-Analyse (Claude)

Input: Alle Produktdaten aus 1.2

Ergebnis:
- **Produkt-Clustering**: Produkte in Kategorien gruppiert
- **Pro Kategorie**: Bestseller, Neuheiten, gemeinsame Features
- **USP-Kategorisierung** (das Wichtigste):
  - Marken-USPs (gelten für ALLE Produkte)
  - Kategorie-USPs (gelten für eine Produktgruppe)
  - Produkt-USPs (gelten nur für ein einzelnes Produkt)
- **Themen/Pain Points** die die Marke abdeckt
- **Was die Marke besonders macht** gegenüber generischen Produkten
- **Wiederkehrende Muster** über verschiedene Produkte hinweg (z.B. alle Produkte
  betonen Nachhaltigkeit, oder alle sind "Made in Germany" — das sind Marken-USPs,
  nicht durch Zählen erkannt sondern durch KI-Verständnis des Gesamtbildes)

### 2.2 — CI-Analyse (Gemini + Claude)

Input: Alle Produktbilder, Logo, Website-Bilder

**Gemini** beschreibt jedes Bild:
- Was ist zu sehen?
- Stil, Farbgebung
- Verhältnis Bild zu Text
- Texte auf dem Bild

**Claude** fasst zusammen:
- Farbpalette (Primär, Sekundär, Akzent)
- Farbverwendung: einheitlich oder produktspezifisch?
- Typografie-Stil
- Fotografie-Stil
- Wiederkehrende Elemente
- Visual Mood

### 2.3 — Brand Voice (Claude)

Input: Website-Texte, Bullet Points, A+ Content, Produktbeschreibungen,
optional: Brand-Ton-Beispiele aus der Eingabemaske

Ergebnis:
- Kommunikationsstil (formell/informell, Du/Sie)
- Ton (professionell, locker, wissenschaftlich, bold)
- Typische Wörter und Phrasen der Marke
- CTA-Stil

Die Brand-Ton-Beispiele aus der Eingabemaske werden als Stil-Referenz genutzt —
nicht 1:1 kopiert, sondern der Stil wird auf neue Kontexte übertragen.

### 2.4 — Content-Strategie (Claude)

Input: Produkt-Profil, CI-Profil, Brand Voice, Website-Struktur,
**Wissensdatenbank** (übergreifend, nicht kategorie-spezifisch)

Die Wissensdatenbank fließt als Orientierung ein:
- Welche Strukturprinzipien nutzen erfolgreiche Stores?
- Welche Modul-Kombinationen funktionieren?
- Wie viele Seiten machen Sinn für diese Sortimentsbreite?
- Welcher Design-Archetyp passt zu dieser Marke?

Ergebnis:
- **Seitenstruktur**: Welche Seiten, welche Hierarchie
- **Pro Seite — thematischer Aufbauplan**:
  - Welche Themen sollen auf dieser Seite behandelt werden?
  - Welche Produkte wo zeigen?
  - Cross-Links zwischen Seiten
  - Was macht jede Seite einzigartig?
  - Die Themen ergeben sich aus der Produkt-Analyse, der CI und den
    Besonderheiten der jeweiligen Kategorie/Seite. Hier gibt es KEIN
    festes Schema. Die Wissensdatenbank liefert Orientierung, welche
    Themen in erfolgreichen Stores vorkommen, aber jede Seite wird
    individuell aufgebaut basierend auf den tatsächlichen Inhalten.
- **ASIN-Zuordnung**: Jede ASIN wird einer oder mehreren Seiten zugeordnet.
  Am Ende muss JEDE eingegebene ASIN irgendwo im Store vorkommen (sei es
  in einem Modul, einer Kachel, oder einem Product Grid). Keine ASIN
  darf fehlen. ASINs dürfen auf mehreren Seiten auftauchen.

---

## PHASE 3: TEXT-ERSTELLUNG

### 3.1 — Textbausteine (Claude)

Input: Content-Strategie, Brand Voice, Produkt-Profil, Original-Texte der Marke

Pro Seite:
- Hero Banner Text
- Kategorie-Überschriften
- USP-Formulierungen
- Produkt-Highlights
- CTA-Texte
- Benefit-Texte
- Zwischenüberschriften

Regeln:
- Alle Texte in Store-Sprache
- Wording orientiert sich an der Marke (Website, Listings)
- Keine generischen Platzhalter
- USP-Konsistenz:
  - Wenn derselbe USP auf mehreren Seiten vorkommt, muss er IDENTISCH
    formuliert sein (z.B. "Made in Germany" ist überall "Made in Germany",
    nicht mal "Hergestellt in Deutschland" und mal "Made in Germany")
  - ABER: Nicht jede Seite soll die gleichen USPs zeigen. Die USPs
    werden pro Seite passend ausgewählt. Eine Kategorie-Seite zeigt
    Kategorie-spezifische USPs, die Homepage zeigt Marken-USPs.

---

## PHASE 4: STORE-GENERIERUNG

### Grundprinzip

Die Inhalte aus Phase 2+3 (Themen, Texte, Bildideen) werden in Module
und Layouts übersetzt. Der Inhalt bestimmt das Modul — nicht umgekehrt.

### 4.1 — Seiten generieren (Claude, sequentiell)

Pro Seite (nacheinander, nicht gleichzeitig):

**Input:**
- Content-Strategie für diese Seite (aus 2.4)
- Textbausteine für diese Seite (aus 3.1)
- CI-Profil + Brand Voice
- Produkt-Profil (relevante Produkte)
- Wissensdatenbank (Prinzipien, nicht Regeln)
- Bei Kategorie-Seiten: Wissen über bereits generierte Seiten
  (verhindert Dopplungen, stellt sicher dass sich Seiten ergänzen)

**Output pro Seite:**
- Hero Banner (Brief + Text)
- Module/Sektionen mit Layouts
- Pro Kachel: Bildkategorie, Brief, textOverlay, CTA, Verlinkung

**Sequentielle Generierung** sorgt dafür, dass:
- Seiten sich nicht doppeln
- Seiten sich ergänzen
- Eine gemeinsame Sprache gesprochen wird (Design-Konsistenz, Stil, Sprache, Bilder)
- Aber: Jede Seite ist individuell aufgebaut. Die Homepage ist KEIN Template.

**Briefs (Design-Anweisungen):**
- Immer auf Englisch
- textOverlay-Inhalte NICHT im Brief wiederholen
- Beschreiben die IDEE des Bildes und die wichtigsten Elemente
- Keine Farb/Stil/Mood-Anweisungen — der Designer arbeitet autark auf Basis der CI

**Lifestyle-Briefs:**
- Spezifische Szene (wer, wo, was, wie das Produkt genutzt wird)
- GOOD: "Woman mid-30s drinking from bottle after outdoor jog, park setting"
- BAD: "Person using product, warm lighting, satisfied mood"

**Creative-Briefs:**
- Bildidee + wichtigste Elemente die zu sehen sein sollen
- GOOD: "Split composition: product hero left, three ingredient icons right"
- BAD: "Creative image with product on brand-colored background"

### 4.2 — Post-Processing

- Link-Validierung (alle linkUrls zeigen auf existierende Seiten)
- Text-Konsistenz-Check: Wenn sich Texte inhaltlich zu >90% ähneln aber
  verschiedene Wortwahl nutzen → angleichen an die bessere Option
- **ASIN-Vollständigkeits-Check**:
  - Liste aller eingegebenen ASINs vs. wo sie im Store vorkommen
  - Pro ASIN: auf welcher Seite, in welchem Modul (Kachel, Product Grid, etc.)
  - Fehlende ASINs werden markiert und automatisch zugeordnet
  - KEINE ASIN darf fehlen

### 4.3 — ASIN-Verwaltung (im UI)

Nach der Generierung kann der Nutzer:
- **ASIN-Übersicht** sehen: welche ASIN auf welcher Seite, in welchem Modul
- **ASINs zwischen Kategorien verschieben**: Eine ASIN einer anderen Seite zuordnen
  - Option 1: ASIN wird nur ins Product Grid der neuen Seite eingefügt (einfach)
  - Option 2: Die neue Seite wird von der KI analysiert und die ASIN wird
    intelligent in den bestehenden Aufbau integriert (z.B. in ein passendes
    Modul, eine passende Kachel, oder als neuer Inhaltsbaustein)
- **Fehlende ASINs** werden angezeigt und können manuell zugeordnet werden

---

## PHASE 5: REFERENZBILDER + WIREFRAMES

### 5.1 — Referenzbilder automatisch zuordnen

Pro Kachel passende Bilder von der Marke selbst zuordnen:
- Produktbilder von Amazon (MAIN, PT01-PT06)
- Website-Bilder, A+ Content Bilder

Der Designer bekommt visuelle Inspiration direkt von der Marke.
CI ist in diesen Bildern bereits sichtbar.

### 5.2 — Store-weites Design-System (Gemini)

Ein Call der den GESAMTEN Store sieht:
- Definiert EIN konsistentes Design-System
- Hintergrund, Illustration-Stil, Typografie, Akzentfarben
- Wird an jeden weiteren Wireframe-Call als Kontext übergeben

### 5.3 — Bildbeschreibungen (Gemini, sequentiell pro Seite)

- Design-System als Basis
- Vollständiger Seiten-Kontext
- Referenzbilder als visueller Kontext
- Sequentiell damit Stil konsistent bleibt

### 5.4 — Wireframes (Imagen, sequentiell)

- Pro Kachel ein Call
- Seitenweise
- Design-System als Klammer

---

## ZUSAMMENFASSUNG: WAS PASSIERT WANN

```
EINGABE
  ↓
DATENSAMMLUNG (1.2 + 1.3 parallel)
  Amazon Scraping + Website Scraping
  ↓
ANALYSE (2.1 → 2.2 → 2.3 → 2.4 nacheinander)
  Produkte → CI → Brand Voice → Content-Strategie
  ↓
TEXTE (3.1)
  Textbausteine auf Basis von Analyse + Brand Voice
  ↓
STORE-GENERIERUNG (4.1 Seite für Seite)
  Inhalte → Module → Layouts → Briefs
  ↓
POST-PROCESSING (4.2)
  Deduplikation + Text-Review
  ↓
REFERENZBILDER + WIREFRAMES (5.1 → 5.2 → 5.3 → 5.4)
  Bilder zuordnen → Design-System → Beschreibungen → Wireframes
```

Alles sequentiell. Jeder Schritt hat den vollständigen Kontext der vorherigen Schritte.

---

## API-CALLS (für Store mit 5 Seiten, ~40 Kacheln)

| Phase | Schritt | API | Calls |
|-------|---------|-----|-------|
| 1.2 | Amazon Scraping | Bright Data | 1 pro ASIN |
| 1.3 | Website Scraping | Bright Data | Alle Seiten |
| 2.1 | Produkt-Analyse | Claude | 1 |
| 2.2 | CI-Analyse | Gemini + Claude | 2 |
| 2.3 | Brand Voice | Claude | 1 |
| 2.4 | Content-Strategie | Claude | 1 |
| 3.1 | Textbausteine | Claude | 1 |
| 4.1 | Seiten-Generierung | Claude | 1 pro Seite |
| 4.2 | Post-Processing | Claude | 1 |
| 5.2 | Design-System | Gemini | 1 |
| 5.3 | Bildbeschreibungen | Gemini | 1 pro Seite |
| 5.4 | Wireframes | Imagen | 1 pro Kachel |

~12 Claude + ~7 Gemini + ~40 Imagen + Scraping
