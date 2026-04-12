# Brand Store Audit: True Nature v2 — Analyse nach Pipeline-Rebuild

## Auftrag

Du analysierst einen generierten Amazon Brand Store für "True Nature" (Nahrungsergänzungsmittel). Dieser Store wurde mit der komplett neugebauten Content-First Pipeline generiert. Vergleiche den Output mit dem echten Online-Shop und dem echten Amazon Brand Store. Dokumentiere ALLES was falsch ist — schonungslos.

## Vergleichsquellen

1. **Generierter Store**: Wird dir vom User im Browser gezeigt
2. **Echter Online-Shop**: https://www.true-nature.de (öffne die Seite)
3. **Echter Amazon Brand Store**: https://www.amazon.de/stores/page/B4CF1B6D-F601-4927-B82F-8FD07CF887DC (öffne die Seite)

Öffne alle drei Quellen und vergleiche systematisch.

## Analyse-Bereiche

### A. PRODUKT-KATEGORISIERUNG
- Prüfe JEDE ASIN und in welcher Kategorie sie im generierten Store landet
- Vergleiche mit den echten Kategorien im Online-Shop von True Nature
- Ist "Flohsamenschalen" immer noch in "Schlaf"? Ist "Ashwagandha" korrekt zugeordnet?
- Liste JEDE Fehlzuordnung auf: ASIN, Produktname, falsche Kategorie, korrekte Kategorie

### B. ASIN-BRIEF-KONSISTENZ
- Prüfe bei JEDER Kachel: stimmt die verlinkte ASIN mit dem Inhalt des Briefings überein?
- Wenn der Brief sagt "zeige Produkt X" aber ASIN Y verlinkt ist → dokumentiere den Mismatch
- Gibt es Kacheln die ein Produkt beschreiben aber KEINE ASIN verlinkt haben?

### C. USPs
- Was sind die echten USPs von true-nature.de? (öffne die Seite und lies sie ab)
- Welche davon erscheinen im generierten Store?
- Welche fehlen komplett?
- Welche USPs im Store sind ERFUNDEN (stehen nicht auf der Website)?

### D. DESIGNER BRIEFINGS
- Sind sie kurz (10-20 Wörter, nur Bildidee)?
- Oder immer noch zu detailliert (Lichtverhältnisse, Stimmung, Kamerawinkel)?
- Sind sie auf Englisch?
- Gib 3 Beispiele für gute und 3 für schlechte Briefings

### E. TEXTE UND SPRACHE
- Sind alle textOverlay-Texte auf Deutsch?
- Gibt es englische Fragmente?
- Sind die Texte individuell pro Seite oder generischer Copy-Paste?
- Klingen die Texte wie True Nature oder wie ein Template?

### F. UNTERSEITEN
- Welche Seiten wurden generiert?
- Hat jede Seite echten Content (mindestens 2-3 Module)?
- Gibt es leere oder fast leere Seiten?
- Ergibt die Seitenstruktur Sinn für 49 Supplement-Produkte?

### G. MODULE UND LAYOUT
- Welche Layouts werden verwendet?
- Gibt es Abwechslung oder ist es immer dasselbe Layout?
- Werden Full-Width Module genutzt?
- Gibt es Text-Image Module als Strukturgeber?

### H. HOMEPAGE AUFBAU
- Erster Eindruck: macht die Homepage Lust auf mehr?
- Gibt es einen roten Faden?
- Werden alle Kategorien vorgestellt?
- Gibt es einen Bestseller-Bereich?
- Gibt es USPs/Trust-Elemente?

### I. WIREFRAMES (falls generiert)
- Passen die Bilder zum Briefing?
- Zeigen sie Produkte der Marke oder random Bilder?
- Ist die CI erkennbar?

### J. VERBESSERUNGEN GEGENÜBER v1
- Was ist BESSER geworden seit dem letzten Audit?
- Was ist SCHLECHTER geworden?
- Was ist GLEICH SCHLECHT geblieben?

## Vorheriges Audit-Ergebnis (v1)

Das letzte Audit ergab 2/10 Punkte mit diesen Hauptproblemen:
1. Tote Wissensdatenbank (inzwischen aktiviert)
2. Falsche ASIN-Zuordnung
3. Generische Texte / Website-USPs ignoriert
4. Leere Unterseiten
5. Defektes Produkt-Quiz
6. Wireframe-Fehler
7. Englische Inhalte
8. Doppelte Inhalte
9. Kein CI-Match
10. Kein roter Faden auf Homepage
11. Fehlende Verlinkungen

Prüfe ob diese 11 Probleme gelöst wurden.

## Output-Format

Erstelle einen strukturierten Report:

1. **Gesamtbewertung** (1-10, mit Begründung)
2. **Verbesserungen vs v1** (was ist besser)
3. **Verschlechterungen vs v1** (was ist schlechter)
4. **Kritische Fehler** (priorisierte Liste)
5. **ASIN-Fehlzuordnungen** (Tabelle: ASIN, Produkt, falsche Kat, richtige Kat)
6. **Brief-ASIN-Mismatches** (Tabelle)
7. **Fehlende USPs** (vs. echte Website)
8. **Erfundene USPs** (nicht auf Website)
9. **Seitenqualität pro Seite** (Name, Module, Content-Bewertung)
10. **Konkrete Code-Änderungen** die nötig sind (welche Funktion, was ändern)
