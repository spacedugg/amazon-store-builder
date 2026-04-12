# Audit v2 Results + User Feedback (April 12, 2026)

## Gesamtbewertung: 1/10 (schlechter als v1 die 2/10 war)

## Kritische Fehler

1. 21 von 49 ASINs (43%) fehlen komplett im Store
2. 8 FAKE ASINs auf Neuheiten + Bestseller (erfundene ASIN-Nummern)
3. Kein einziges Layout gesetzt (alle "(none)")
4. Homepage hat 0 Produkte, 0 Verlinkungen
5. Kategorie "Fahrradzubehör" bei Supplements-Brand
6. Wissensdatenbank (23 Stores) hat 0 Einfluss auf Output
7. Nur 1 von 44 Bildern des bestehenden Stores analysiert
8. text_image Tile-Typ ungültig auf 3 Seiten
9. Identische Benefit-Banner auf jeder Seite (Copy-Paste)
10. Produktfinder hat 0 Produkte, nicht-funktionierende Links
11. Manuell eingegebene Menüstruktur ignoriert

## User-Anforderungen für Rebuild

### Interaktiver Prozess mit Checkpoints
- Nach Analyse: Kategorien werden vorgeschlagen → User kann ändern → erst dann weiter
- Nach Seitenplanung: Aufbau wird gezeigt (ggf. 3 Varianten) → User wählt → erst dann weiter
- Jeder Schritt sichtbar, prüfbar, änderbar
- Kein Riesen-Prompt, auch keine automatische Kette die alles nacheinander macht ohne Check

### CI-Analyse und Produkt-Analyse zusammenlegen
- Produktbilder werden sowieso CI-analysiert → diese Daten gleich für Inhalte nutzen
- Nicht zweimal das gleiche Produkt analysieren

### Wissensdatenbank muss AKTIV genutzt werden
- Konkrete Module aus den 23 Stores vorschlagen
- Konkrete Sektions-Kombinationen vorschlagen
- Nicht nur als Text-Kontext in Prompt, sondern als strukturierte Beispiele

### Content-Tiefe auf Unterseiten
- Kategorie-Seiten: Bestseller-Bereich, Kategorie-USPs, mehr Module
- Produktfinder: echte Fragen mit echten Antworten die zu echten Produkten führen
- Über uns: keine Emojis, durchdachter Content
- Bestseller: echte Bestseller-ASINs (höchste Bewertungen/Verkäufe), keine erfundenen

### Begriffe prüfen: Sektion vs. Modul
- Im Code müssen beide Begriffe konsistent das gleiche bedeuten
- Keine Situation wo nach "Modul" gesucht wird aber "Sektion" gemeint ist

### Bestehender Store Crawling
- 44 Bilder gefunden aber nur 1 analysiert → muss alle analysieren
