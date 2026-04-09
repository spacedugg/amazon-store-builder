# Brand Store Generation Process — Final Design

## Übersicht

Dieses Dokument beschreibt den optimalen Prozess zur Generierung eines Amazon Brand Stores.
Jeder Schritt baut auf dem vorherigen auf. Nichts wird parallel generiert, wenn
Abhängigkeiten bestehen. Qualität vor Geschwindigkeit.

---

## PHASE 0: REFERENZ-DATENBANK (einmalig, nicht pro Store)

### Status Quo
- 23 Stores analysiert, aber **nur Homepages** (1 von ~5-24 Seiten pro Store)
- CI-Daten vorhanden (Farben, Stil, Tonality)
- 130 Module, 221 Tiles erfasst mit Beschreibungen
- `visualConnection` bei 84% der Module vorhanden
- `designRationale` bei nur 6% der Module vorhanden
- Gemini V3 Enrichment fehlgeschlagen (alle "fetch failed")
- **Modul-Beziehungen und Sequenzen nicht analysiert**

### Was fehlt und gemacht werden muss

**0.1 — Alle Seiten aller 23 Stores crawlen**
- Aktuell: nur Homepage pro Store
- Nötig: ALLE Unterseiten (Kategorie-Seiten, Über-uns, Bestseller, etc.)
- Pro Seite: Module → Layouts → Tile-Typen → Bild-URLs → Texte
- Ergebnis: Vollständige Modul-Bibliothek über ~200+ Seiten

**0.2 — Bild-Inhaltsanalyse via Gemini Vision**
- Jedes Bild aus den Stores durch Gemini beschreiben lassen:
  - Was ist auf dem Bild zu sehen? (Szene, Personen, Produkte, Grafiken)
  - Wie ist die Stimmung, der Stil?
  - Wie ist das Verhältnis von Bild zu Text?
  - Welche Texte sind auf dem Bild?
- Alle Beschreibungen zusammenfassen als Referenz-Bibliothek:
  - "In Lifestyle-Bildern für Supplements zeigen Stores typisch..."
  - "Creative-Bilder für Küchengeräte enthalten typisch..."

**0.3 — Modul-Beziehungs-Analyse**
- Welche Module stehen typisch nebeneinander? (Paare)
- Welche 3-5 Modul-Sequenzen bilden zusammen thematische Blöcke?
- Was steht NIE nebeneinander? (Anti-Patterns)
- Wie unterscheiden sich Homepage-Aufbauten von Kategorie-Seiten?
- Pro Modul: WARUM dieses Layout, WARUM diese Reihenfolge (designRationale)
- Wie stehen zwei übereinanderliegende Full-Width-Bilder in Beziehung?
  (Gesamtgrafik, thematische Fortsetzung, Kontrast)

---

## PHASE 1: EINGABE + DATENSAMMLUNG

### 1.1 — Erweiterte Eingabemaske

**Pflichtfelder:**
- Brand Name
- Marketplace (de/com/fr/etc.)
- ASINs (manuell oder Amazon-Suche)
- Zweck: Neukonzeptionierung oder Optimierung
  - Bei Optimierung: Granulare Optionen:
    - Menüstruktur beibehalten oder ändern?
    - Welche Seiten beibehalten / welche neu?
    - Nur bestimmte Seiten optimieren?

**Optionale Felder (verbessern Qualität drastisch):**
- Logo-Upload (spart fehleranfälliges Scraping)
- Schriftarten (Name oder Datei — Scraping erkennt Fonts unzuverlässig)
- Markenfarben (Hex-Codes, falls bekannt)
- Website-URL
- Bestehender Brand Store URL
- Ziel-Komplexität (Minimal / Standard / Premium)
- Spezielle Anweisungen (Freitext)
- Brand-Ton-Beispiele (2-3 Beispielsätze von der Marke, z.B. aus
  Amazon Listings oder Website, damit das System den Stil übertragen kann
  ohne ihn 1:1 zu kopieren)

### 1.2 — Amazon Product Scraping (einzeln pro ASIN)

Pro ASIN wird gescraped:
- Titel
- Rating, Bewertungsanzahl
- **ALLE 7 Produktbilder** (MAIN, PT01-PT06)
- Alle 5 Bullet Points
- Produktbeschreibung (HTML + Text)
- A+ Content (Bilder + Texte, falls vorhanden)
- Kategorie-Breadcrumb
- Verfügbar seit (für Neuheiten-Erkennung)
- Bestseller-Rang (für Bestseller-Erkennung)

Einzeln pro ASIN, nicht als Batch, weil:
- Batch verliert Details (A+ Content, alle Bilder)
- Fehler bei einem Produkt blockiert nicht die anderen
- Preis ist irrelevant und wird nicht gescraped

### 1.3 — Website Scraping (falls URL vorhanden)

**ALLE Seiten** der Website scrapen, nicht nur Startseite und Über-uns:
- Startseite, Über-uns, Kontakt
- ALLE Produktseiten
- ALLE Kategorie-Seiten
- Blog/News (falls vorhanden)
- FAQ, Qualität, Zertifikate, etc.

Pro Seite:
- Texte (Headlines, Body, About-Texte)
- Bilder (Hero, Produkt, Lifestyle)
- Farben, Fonts
- Navigation/Kategorien
- Produktzuordnungen zu Kategorien

Nur so entsteht ein vollständiges Bild der Marke.

### 1.4 — Bestehender Brand Store (falls URL vorhanden)

Wichtig: Der Grundsatz ist immer, den bestmöglichen Brand Store zu bauen.

Bei **Neukonzeptionierung**:
- Bestehender Store ist Referenz, aber kein Template
- Seitenstruktur wird NEU gedacht
- Inhalte können als Inspiration dienen

Bei **Optimierung** — granulare Abfrage:
- Menüstruktur beibehalten oder ändern?
- Welche Seiten bleiben, welche werden neu konzipiert?
- Welche Module/Bilder sollen übernommen werden?
- Was funktioniert gut? (als Basis behalten)
- Was fehlt oder ist schwach? (verbessern)

---

## PHASE 2: ANALYSE (sequentiell, jeder Schritt baut auf dem vorherigen auf)

### 2.1 — Produkt-Analyse (Claude)

Input: Alle Produktdaten aus 1.2

Die reine Mustererkennung (zählen welche USPs am häufigsten vorkommen) reicht
NICHT aus. Beispiel: Eine Nahrungsergänzungsmittel-Marke hat bei 20 Produkten
wahrscheinlich 20 verschiedene USPs, wovon keine doppelt vorkommt. Eine
Gartenmarke mit 300 Produkten hat USPs von "BPA-frei" bis "App-Steuerung".

Stattdessen muss echte KI-Analyse stattfinden:

- Produkte in Kategorien clustern (Titel, Beschreibung, Breadcrumb)
- Pro Kategorie:
  - Name, Produktanzahl
  - Bestseller identifizieren (höchste Bewertungen)
  - Neuheiten identifizieren (neuestes Verfügbar-seit)
  - Gemeinsame Features über alle Produkte der Kategorie
- USPs analysieren und KATEGORISIEREN:
  - **Marken-USPs**: Gelten für ALLE Produkte (z.B. "Made in Germany", "Familienunternehmen")
  - **Kategorie-USPs**: Gelten für eine Produktkategorie (z.B. "Bio-Zutaten" nur bei Supplements)
  - **Produkt-USPs**: Gelten nur für ein Produkt (z.B. "30g Protein" nur beim Proteinpulver)
- Welche Themen/Pain Points deckt die Marke ab?
- Was zeichnet diese Marke gegenüber generischen Produkten aus?

### 2.2 — CI-Analyse (Gemini Vision + Claude)

Input: Alle Produktbilder, Logo, Website-Bilder, Website-Farben/Fonts

**Gemini** beschreibt erst mal JEDES Bild einzeln:
- Was ist auf dem Bild zu sehen?
- Stimmung, Stil, Farbgebung
- Verhältnis Bild zu Text
- Texte auf dem Bild

**Dann** Zusammenfassung aller Bildbeschreibungen:
- Farbpalette: Primär, Sekundär, Akzent, Hintergrund
- Farbverwendung: Einheitlich oder produktspezifisch?
- Typografie-Stil
- Fotografie-Stil
- Wiederkehrende Elemente (Icons, Muster, Badges)
- Visual Mood (Premium, natürlich, technisch, verspielt, minimalistisch)
- Hintergrund-Muster

Kooperation Gemini + Claude nötig:
- Gemini analysiert die Bilder (Vision)
- Claude bekommt die Listing-Daten (Texte, Bullets)
- Zusammen entsteht ein vollständiges CI-Profil

### 2.3 — Brand Voice Analyse

Input: Website-Texte, Bullet Points, A+ Content, Produktbeschreibungen

Frage: Wie zuverlässig ist automatische Ton-Analyse?
→ Nicht 100% zuverlässig, daher:

- Automatische Analyse als VORSCHLAG generieren
- Ergänzt durch die Beispiel-Sätze aus der Eingabemaske (1.1)
- Beispiele werden nicht 1:1 kopiert, sondern als Stil-Referenz genutzt
  ("Die Marke schreibt so: [Beispiel]. Übertrage diesen Stil auf neue Texte.")
- Ergebnis: Kommunikationsstil, Ton, typische Wörter, CTA-Stil

Nicht nötig:
- Zielgruppen-Analyse (die existiert bereits durch die Marke selbst)
- Wettbewerbspositionierung (beeinflusst den Store-Aufbau nicht)

### 2.4 — Content-Strategie

Input: Produkt-Profil, CI-Profil, Brand Voice, Website-Struktur,
**Referenz-Datenbank** (Best Practices aus den 23 analysierten Stores)

Die Referenz-Datenbank fließt hier ein durch:
- Typische Seitenstrukturen für diese Kategorie (z.B. Supplements-Stores
  haben typisch X Seiten mit Y Aufbau)
- Modul-Sequenzen die in Top-Stores (Quality 5) vorkommen
- Layout-Verteilungen die bei erfolgreichen Stores funktionieren
- Anti-Patterns die vermieden werden sollen

Aufgabe:
- Seitenstruktur festlegen (welche Seiten, welche Hierarchie)
- Pro Seite: Thematischer Fokus und Aufbauplan
  - Welche Themen in welcher Reihenfolge?
  - Welche Produkte wo zeigen?
  - Cross-Links zwischen Seiten
  - Was macht jede Seite einzigartig?
- Beispiel Kategorie-Seite:
  - Cool starten mit einem Lifestyle-Bild
  - Bestseller der Kategorie vorstellen (ggf. als Shoppable Full-Width)
  - Informationen: Was zeichnet diese Kategorie aus? Welche Mehrwerte?
  - Unterkategorien aufzeigen (falls vorhanden)
  - Creative-Bilder: Wo kann Produkt/Kategorie eingeordnet werden?
    USPs, Pain Points, Anwendungsszenarien
  - Zwischenüberschriften als Strukturgeber
  - Produktgrid am Ende

NICHT in diesem Schritt: Konkrete Layouts, finale Texte, Bildbeschreibungen.
KEINE starre Narrative oder Storyline erzwingen. Thematische Abgrenzung und
sinnvolle Reihenfolge ja, aber keine erzwungene "Story" pro Seite.

---

## PHASE 3: TEXT-ERSTELLUNG (vor der Layout-Generierung!)

### 3.1 — Textbausteine generieren (Claude)

Input: Content-Strategie, Brand Voice, Produkt-Profil, Original-Texte

Pro Seite alle Text-Elemente erstellen:
- Hero Banner Text (Slogan/Claim)
- Kategorie-Überschriften
- USP-Formulierungen
- Produkt-Highlights
- CTA-Texte
- Benefit-Texte
- Zwischenüberschriften
- About/Brand-Story (falls relevant)

Regeln:
- Alle Texte in Store-Sprache
- Wording muss Brand Voice entsprechen
- Keine generischen Platzhalter
- Sich am Besten bedienen: Wording aus Website, Listings, Brand Store

NICHT: Starre USP-Formulierungen die überall identisch wiederholt werden.
USPs können auf verschiedenen Seiten unterschiedlich formuliert sein, solange
sie inhaltlich konsistent sind.

### 3.2 — Text-Review (nach der vollständigen Store-Generierung)

Statt eines separaten Review-Schritts VOR der Generierung:
→ NACH der Generierung des gesamten Stores werden alle Texte überflogen.
→ Wenn sich Texte inhaltlich zu >90% ähneln, aber verschiedene Wortwahl
  nutzen, werden sie angeglichen (an die bessere der beiden Optionen).
→ Konsistenz-Check über den ganzen Store.

Kein Zielgruppen-Check nötig — die Texte basieren bereits auf CI und
Original-Texten der Marke.

---

## PHASE 4: STORE-GENERIERUNG (Inhalt bestimmt das Modul, nicht umgekehrt)

### Grundprinzip

Der Inhalt wird ZUERST erstellt (Texte, Bildideen, Themen). DANN wird
entschieden, welches Modul/Layout am besten dazu passt.

NICHT: Module vorgeben und dann mit Inhalt füllen.
NICHT: Starre Alternierung von Full-Width und Grid erzwingen.
NICHT: Jede Sektion muss ihre Nachbarsektion referenzieren.

Auf Basis der Inhalte wird pro Sektion das passende Layout gewählt.

### 4.1 — Seiten generieren (Claude, sequentiell pro Seite)

Input pro Seite:
- Content-Strategie für diese Seite
- Finalisierte Texte für diese Seite
- CI-Profil, Brand Voice
- Produkt-Profil (relevante Produkte)
- Referenz-Datenbank (typische Strukturen für diese Art Seite)
- Bei Kategorie-Seiten: Wissen darüber, welche Seiten VORHER generiert
  wurden (verhindert Dopplungen, stellt sicher dass sich Seiten ergänzen)

WICHTIG: Homepage und Zusatzseiten (Über-uns, etc.) sind INDIVIDUELL
aufgebaut und haben nichts mit dem Aufbau der Kategorie-Seiten zu tun.
Das Homepage-Layout ist KEIN Template für andere Seiten.

Briefs (Design-Anweisungen):
- IMMER auf Englisch
- textOverlay-Inhalte NICHT im Brief wiederholen
- Beschreiben die IDEE des Bildes und die wichtigsten Elemente
- Keine Mood-Beschreibungen, keine Farb/Stil-Anweisungen
- Der Designer arbeitet autark auf Basis der CI

Lifestyle-Briefs:
- Spezifische Szene beschreiben (wer, wo, was, wie das Produkt genutzt wird)
- Keine Stimmungs-Adjektive ("warm", "moody") — der Designer entscheidet
- GOOD: "Woman mid-30s drinking from bottle after outdoor jog, park setting"
- BAD: "Person using product, warm lighting, satisfied mood"

Creative-Briefs:
- Bildidee und wichtigste Elemente/Fakten die zu sehen sein sollen
- Was soll am Ende rüberkommen?
- GOOD: "Split composition: product hero left, three ingredient icons right"
- BAD: "Creative image with product and benefits on brand-colored background"

### 4.2 — Post-Processing (lokal)

- Deduplikation (ASINs, Links, Texte)
- Link-Validierung
- Text-Konsistenz-Check (Schritt 3.2)

---

## PHASE 5: REFERENZBILDER + WIREFRAMES

### 5.1 — Referenzbilder automatisch zuordnen

Pro Tile: Passende Bilder von der Marke selbst zuordnen:
- Produktbilder von Amazon (MAIN, PT01-PT06)
- Website-Bilder, A+ Content Bilder
- Screenshots von Website-Sections als Inspiration

→ In tile.referenceImages speichern
→ Designer bekommt visuelle Inspiration die DIREKT von der Marke stammt
→ CI ist in diesen Bildern bereits sichtbar

### 5.2 — Store-weites Design-System (Gemini)

Ein einziger Call der den GESAMTEN Store sieht:
- Definiert EIN konsistentes Design-System
- Hintergrund, Illustration-Stil, Typografie, Akzentfarben
- Wird an JEDEN Wireframe-Call als Kontext übergeben

### 5.3 — Bildbeschreibungen pro Seite (Gemini, sequentiell)

- Design-System als Basis
- Vollständiger Seiten- und Sektions-Kontext
- Referenzbilder der Tiles als visueller Kontext
- Sequentiell pro Seite, damit Stil konsistent bleibt

### 5.4 — Wireframes generieren (Imagen, sequentiell)

- Pro Tile ein Imagen-Call
- Seitenweise, damit Stil konsistent bleibt
- Design-System als Klammer über alles

---

## API-Calls Übersicht (für Store mit 5 Seiten, ~40 Tiles)

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
| 4.2 | Text-Review | Claude | 1 |
| 5.2 | Design-System | Gemini | 1 |
| 5.3 | Bildbeschreibungen | Gemini | 1 pro Seite |
| 5.4 | Wireframes | Imagen | 1 pro Tile |

Total: ~12 Claude + ~7 Gemini + ~40 Imagen + Scraping

API-Kosten sind kein Limit mehr. Qualität des Outputs hat Priorität.
