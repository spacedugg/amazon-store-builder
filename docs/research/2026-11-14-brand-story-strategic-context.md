# Brand Story: Auftrag vor Kartenfolge

Stand: 14. November 2026. Ergänzung zum visuellen Referenzaudit; Recherche und Empfehlung, noch keine Änderung am Builder oder Claude-Skill.

## Vom Nutzer bestätigter Entstehungskontext

- **MyPuzzle:** Das individuell gestaltbare Fotopuzzle sollte als Hero-Produkt aufgebaut werden. Erklärende Karten zur Funktionsweise und Full-Image-Beispielmotive waren Teil dieses Auftrags, zusätzlich zum ASIN-Grid. Diese Karten sind als zusammenhängende Produktargumentation zu bewerten.
- **IGLIANOS:** Der Auftrag betonte die Geschichte des griechischen Olivenöls, eigenen Anbau, Handwerk und natürliche Herkunft. Der hohe Bildanteil erklärt sich durch diesen Schwerpunkt. Diese Angaben sind Nutzerkontext; konkrete Produktclaims bleiben vor Veröffentlichung zu bestätigen. Die bisherigen Referenzdateien verwenden den Namen Eglianos.
- **OMNI RELAX:** Zwei Personen als persönliche Markenanker und ein kleines Sortiment erklären den persönlichen Einstieg sowie die bewusst zusammenhängenden Grid-Motive. Die Referenzdateien verwenden OmniRelexx.
- **Bachgold:** Zum damaligen Zeitpunkt kleines Sortiment; dementsprechend Fokus auf einzelne Produkte und deren Argumentation statt breiter Kategorienavigation.

Die visuelle Analyse allein kann den ursprünglichen Auftrag nicht rekonstruieren. Textlänge, Wiederholungen und Einkaufszugänge müssen gegen diesen Auftrag bewertet werden. Viele Medienkarten oder wenige Grids sind für sich genommen kein Qualitätsmangel.

## Prüfung der externen Quelle

Quelle: https://github.com/nexscope-ai/Amazon-Skills/blob/main/amazon-enhanced-brand-content/SKILL.md

Gelesener Blob: 76098a49dd1253638af4f9c737c23227f26aa8a0. Der geprüfte Ordner enthält nur diese Datei.

Die Datei nennt Premium A+, Brand Story, Module, Lifestyle-Bilder, Vergleichstabellen und mobile Optimierung als Fähigkeiten. Die tatsächlich dokumentierte Methode besteht aus Kontextaufnahme, einer gebündelten Rückfrage, Recherche/Analyse und konkreten strukturierten Empfehlungen. Trotz Verweis auf nachfolgende Frameworks enthält sie keine ausgearbeitete Brand-Story-Methodik, Kartenarchitektur, Beispielsammlung oder technischen Spezifikationen.

Übernehmbar sind das Wiederverwenden bereits bekannter Informationen, gebündelte gezielte Rückfragen und konkrete priorisierte Empfehlungen. Die Mehrfachauswahl ist bei einfachen Entscheidungen sinnvoll, freie Markenfakten benötigen weiterhin Freitext. Allgemeine Fähigkeitsangaben ersetzen keine Methodik. A+-Vergleichstabellen sind keine zusätzliche Kartenart unseres Builders.

## Verbesserung des eigenen Prinzips

1. **Auftrag bestimmen:** Kategorien erschließen, ein Produkt aufbauen, Herkunft/Handwerk erzählen oder Menschen hinter der Marke vorstellen. Kombinationen sind möglich; ein Schwerpunkt bestimmt die Reihenfolge. Vorliegender Projektauftrag hat Vorrang vor automatischen Vorschlägen.
2. **Store-Fakten übernehmen:** Tatsächliche Kategorien, Unterseiten und beobachtete Produkte prüfen lassen; kleine Sortimente nicht künstlich mit Kategorien auffüllen.
3. **Produktfokus mit optionalem Anlass:** Bestseller, Einführung, Push-Produkt oder erklärungsbedürftiges Produkt. Bestseller ist ein Auswahlgrund, Hero ist die Rolle in der Story. Beide können dasselbe Produkt betreffen und erzeugen nicht automatisch zwei Karten.
4. **Kartenrollen planen:** Zum Beispiel Produkt erklären → Anwendung/Beispiele zeigen → passendes Grid; oder Herkunft → Menschen/Prozess → Produktzugang. Kategorie-Hero → Kategorie-Grid bleibt ein Muster für breite Sortimente, keine allgemeine Pflicht.
5. **Motive bewusst wählen:** Bei kleinem Sortiment können vier Grid-Slots ein Motiv mit derselben ASIN bilden. Das ist eine Option, keine automatische Vorgabe. Produktdarstellung darf durch die Zwischenräume nicht unverständlich werden.
6. **Kohärenz prüfen:** Jede Karte muss einen Beitrag leisten; die Folge soll auch auf Mobil mit einer vollständigen Karte pro Ansicht verständlich bleiben. Maximal 19 gemeinsame Karten, separate Desktop- und Mobilhintergründe.
7. **Konzept vor Ausgabe:** Kartenrollen, Reihenfolge, konkrete Texte, Hintergründe, Briefings und Ziele bestätigen; anschließend das bestehende Builder-JSON erzeugen. Designer entscheidet über die Gestaltung.

Vorgeschlagene Oberfläche: Produkte optional hervorheben und pro Auswahl den Anlass angeben, statt zwei unklar abgegrenzter Schalter für Bestseller und besondere Hervorhebung. Eine zusätzliche gemischte Bestseller-Auswahl bleibt möglich, wenn sie einen eigenen Einkaufsnutzen bietet. Echte Rangbehauptungen benötigen Quelle, Zeitraum, Marktplatz und Messgröße; eine redaktionelle Auswahl muss entsprechend benannt werden.
