# Übergabe-Dokument für nächste Session

## Was gebaut werden muss

### 1. Schritt-für-Schritt Generierungsprozess (UI + System)

Der gesamte Generierungsflow wird in einzelne Schritte aufgeteilt.
Jeder Schritt:
- Zeigt dem User die Ergebnisse
- Lässt den User ändern/bestätigen
- Speichert den Zustand (Tab schließen + später weitermachen möglich)
- Erst nach Bestätigung geht es weiter

**Schritte:**

SCHRITT 0: Eingabe
- Brand, ASINs, Website-URL, Logo, Fonts, Farben, Ton-Beispiele
- Start-Button → automatisches Scraping beginnt

SCHRITT 1: Scraping (automatisch, kein Checkpoint)
- Jede ASIN einzeln scrapen (BrightData)
- Website scrapen (alle Seiten)
- CI-Analyse (Bilder pro Produkt an Gemini)
- Fortschritt im Log anzeigen

SCHRITT 2: Brand Analyse (CHECKPOINT)
- Zeigt: Core Values, Brand Voice, CI-Farben, USPs, Store-Typ-Tendenz
- Store-Typ ist ein HINWEIS, keine Vorschrift. Beeinflusst Tendenz aber nicht Regeln.
- User kann alles anpassen
- "Weiter" → Kategorisierung startet

SCHRITT 3: Kategorien (CHECKPOINT)
- Zeigt: welche Kategorien, welche ASINs wo
- User kann: Kategorien umbenennen, ASINs verschieben, Kategorien hinzufügen/entfernen
- JEDE ASIN muss in mindestens einer Kategorie sein
- "Weiter" → Content-Erstellung startet

SCHRITT 4: Content (CHECKPOINT)
- Zeigt pro Seite: Texte, USPs, Bildideen, CTAs
- User kann direkt in den Feldern editieren
- Hier werden KEINE Layouts entschieden — nur Inhalt
- "Weiter" → Seitenstruktur wird aus Content abgeleitet

SCHRITT 5: Seitenstruktur (CHECKPOINT)
- Zeigt pro Seite: Sections, Layouts, Tile Types
- Referenz-Stores liefern Inspiration (nicht Vorschrift)
- User kann Sections verschieben, Layouts ändern, Tiles anpassen
- "Generieren" → automatische Seitengenerierung

SCHRITT 6: Generierung (automatisch)
- Jede Seite einzeln generiert (1 API-Call pro Seite)
- Fortschritt anzeigen
- Am Ende: fertiger Store

### 2. Terminologie (konsistent im gesamten Code)

- **Page/Seite** = eine Unterseite im Store
- **Section** = ein horizontaler Block auf einer Seite (NICHT "Modul")
- **Layout** = Anordnung der Kacheln in einer Section (bestimmt Anzahl)
- **Tile/Kachel** = ein einzelnes Element im Layout
- **Tile Type** = image, shoppable_image, product_grid, video, text
- **Image Category** = lifestyle, creative, product, text_image, benefit

### 3. Wissensdatenbank (23 Stores)

Muss AKTIV genutzt werden:
- Konkrete Section-Beispiele vorschlagen (nicht nur Text-Kontext)
- "Für USPs nutzen 70% der Stores ein 2x2wide Layout mit 4 Benefit-Kacheln"
- "Für Kategorie-Navigation nutzen 60% std-2equal mit Creative Images"
- Die Datenbank muss nach Content-Typ abrufbar sein

### 4. Store-Typ

Ist ein Hinweis, keine Vorschrift:
- product-showcase: Viele Produkte vorstellen (Supplements, Kosmetik)
- feature-explanation: Produkt-Features erklären (Möbel, Technik)
- variant-store: Farben/Geschmäcker zeigen (Fashion, Food)
- category-navigation: Großsortiment navigieren (100+ Produkte)
- Meist Kombination aus mehreren

Darf NICHT zu starren Regeln führen:
- Seitenanzahl kommt aus Produkten/Kategorien, nicht aus Store-Typ
- Layouts kommen aus Content, nicht aus Store-Typ
- Alles individuell pro Marke

### 5. Speichern/Fortsetzen

Bei jedem Checkpoint wird der Zustand in die Turso-Datenbank gespeichert.
User kann Tab schließen und später genau dort weitermachen.

### 6. Kritische Bugs aus v2 Audit

- 21 von 49 ASINs fehlen (43%)
- 8 ERFUNDENE ASINs (Claude erfindet ASIN-Nummern!)
- Kein Layout gesetzt (alle "(none)")
- Homepage hat 0 Produkte
- Wissensdatenbank hat 0 Einfluss
- Bestehender Store: 44 Bilder gefunden, nur 1 analysiert
- Identische Benefit-Banner auf jeder Seite (Copy-Paste)

### 7. User-Regeln (aus allen Feedback-Runden)

- Keine Hard Rules. Alles individuell pro Marke.
- Content bestimmt Layout, nicht umgekehrt (aber beides beeinflusst sich)
- Keine Mega-Prompts. Alles einzeln, nacheinander, gespeichert.
- Jede ASIN muss irgendwo auftauchen. Keine erfundenen ASINs.
- Designer Briefs: 10-20 Wörter, nur die Bildidee. Keine Stimmung/Licht/Kamera.
- USPs von der Website, nicht erfunden.
- Alle Texte in Store-Sprache (außer Briefs: Englisch).
- Referenz-Stores als Inspiration, nicht als Template.
