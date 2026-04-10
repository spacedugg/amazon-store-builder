# Brand Store Audit: True Nature

## Auftrag

Du analysierst einen generierten Amazon Brand Store für "True Nature" (Nahrungsergänzungsmittel). Vergleiche den generierten Store mit dem echten Online-Shop (truenature.de) und dem echten Amazon Brand Store. Dokumentiere JEDEN Fehler.

## Vergleichsquellen

1. **Generierter Store**: Wird dir vom User gezeigt/geteilt
2. **Echter Online-Shop**: https://truenature.de
3. **Echter Amazon Brand Store**: https://www.amazon.de/stores/page/B4CF1B6D-F601-4927-B82F-8FD07CF887DC

Öffne alle drei und vergleiche.

## Was du analysieren sollst

### A. ASIN-Kategorisierung
- Prüfe JEDE ASIN auf JEDER Unterseite
- Vergleiche mit den Kategorien im echten Online-Shop
- Markiere JEDE falsche Zuordnung (z.B. Flohsamenschalen in "Schlaf")
- Liste die korrekte Kategorie daneben

### B. ASIN-Brief-Konsistenz
- Prüfe ob die im Designer-Brief erwähnten Produkte auch als ASIN verlinkt sind
- Wenn Brief sagt "Bio Flohsamenschalen und Bio Hagebutten arrangiert" aber die verlinkte ASIN ist "Taurin" — das ist ein kritischer Fehler
- Dokumentiere JEDEN Mismatch: welcher Brief, welche ASIN erwartet, welche ASIN tatsächlich verlinkt

### C. USPs
- Echte USPs von truenature.de:
  - 98% Produktzufriedenheit
  - Von Ernährungswissenschaftlern entwickelt
  - Made in Germany
  - 365 Tage Zufriedenheitsgarantie
  - Natürlichkeit: ohne Laktose, Farbstoffe, Gentechnik, Gluten, Konservierungsstoffe
- Welche davon fehlen im generierten Store?
- Welche USPs wurden erfunden?
- Wo stehen USPs die so auf der Website gar nicht existieren?

### D. Designer Briefings
- Sind sie kurz und knapp (Bildidee + Elemente)?
- Oder sind sie zu detailliert (Filmregie: "cinematic wide shot", Lichtverhältnisse, Stimmung)?
- Dokumentiere Beispiele für zu detaillierte Briefs
- Dokumentiere Beispiele für gute Briefs (falls vorhanden)

### E. Unterseiten-Qualität
- Hat jede Unterseite individuelle, spezifische Inhalte?
- Oder sind die Texte generisch und austauschbar?
- Sind Extra-Seiten (Neuheiten, Über uns, Bestseller, Produktauswahl) leer oder mit Inhalt?
- Wie viele Module hat jede Seite? Zu wenig? Zu viel?

### F. Inhaltliche Logik
- Ergibt das Bestseller-Produkt auf der Homepage Sinn?
- Passen die Lifestyle-Beschreibungen zu den Produkten? (z.B. Ashwagandha = Schlafbeere, aber Lifestyle zeigt "Energie tanken am Morgen")
- Werden Produkte in Kontexten gezeigt die inhaltlich falsch sind?

### G. CI-Konsistenz
- Stimmen die generierten Farben mit der echten True Nature CI überein?
- Sind die generierten USPs konsistent formuliert über alle Seiten?

### H. Wireframes (falls vorhanden)
- Zeigen sie Produkte die zur Marke gehören?
- Ist die CI erkennbar?
- Oder sind es random-generierte Bilder?

## Output

Erstelle einen detaillierten Report mit:
1. Gesamtbewertung (1-10)
2. Kritische Fehler (priorisiert)
3. ASIN-Fehlzuordnungen (Tabelle)
4. Brief-ASIN-Mismatches (Tabelle)
5. Fehlende/falsche USPs
6. Unterseiten-Qualität pro Seite
7. Konkrete Verbesserungsvorschläge für den Generierungsprozess
