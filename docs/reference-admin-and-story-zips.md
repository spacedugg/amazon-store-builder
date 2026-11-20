# Beispiele verwalten und Brand Stories per ZIP importieren

## Brand-Store-Beispiele

Im Headquarter den Store Builder mit einem persönlichen Admin-Konto öffnen, dann **Store-Beispiele → Beispiel hinzufügen**. Einen direkten Homepage-Link eintragen, optional die Marke benennen. Das Tool prüft den Store über die vorhandene Amazon-Abrufanbindung und fordert eine PNG-Aufnahme über Bright Datas `data_format: screenshot` an. Link und Status werden dauerhaft gespeichert; bei Fehlern bleibt eine ältere erfolgreiche Aufnahme erhalten. In der Detailansicht kann ein Admin die Aufnahme erneut auslösen. Die gemeinsame Ansicht für Designer enthält diese Verwaltungsfunktionen nicht.

Aufnahmen liegen in Vercel Blob, Metadaten in `store_reference_captures`. Die Galerie zeigt maximal drei Spalten und die natürlichen Bildhöhen. Logos und archivierte Einzelmotive ersetzen keine Homepage-Aufnahme. Aufnahmedatum und Quell-Link bleiben sichtbar. Keine automatische monatliche Ausführung; Aktualisierung erfolgt auf Knopfdruck.

Admin-Schreibzugriffe benötigen ein 120 Sekunden gültiges, signiertes Ticket vom Headquarter. `STORE_REFERENCE_ADMIN_SECRET` ist ein eigener Signaturschlüssel in beiden Projekten und darf niemals im Browser, in einer URL oder in Git liegen. Der Nachrichtenkanal ist an den konfigurierten Builder-Frame und die exakten Herkünfte gebunden. Ohne persönliche Anmeldung bzw. Admin-Rolle gibt es kein Ticket für Store-Änderungen.

Provider-Dokumentation: https://docs.brightdata.com/api-reference/rest-api/unlocker/unlock-website

## Brand-Story-ZIP

**Brand Stories → Beispiele → ZIP importieren**. Vorhandene Originalordner werden erkannt:

- `Background` / `Hintergrund`: ein Desktop-Bild, optional ein anhand des Namens als mobil gekennzeichnetes Bild.
- `Brand Media Assets`: je Datei eine Full-Image-Karte.
- `ASIN Grids`: numerisch sortierte Vierergruppen, Reihenfolge oben links, oben rechts, unten links, unten rechts. Auch zusammenhängende Motive liegen in vier Dateien vor.
- `Preview` / `Vorschau`: Gesamtansichten der fertigen Story, in numerischer Scroll-Reihenfolge.

Die ZIP wird im Browser entpackt (maximal 80 MB komprimiert, 100 MB entpackt, 200 Einträge). Originale werden unverändert in den bestehenden Bildspeicher geladen. Die Bildanalyse nutzt Gemini und bei Ablehnung oder Ausfall die vorhandene OpenAI-Anbindung (`CHATGPT_API_KEY`, Modell `STORY_ZIP_OPENAI_MODEL` oder `gpt-5.4-mini`). Sie erhält verkleinerte Vorschauen und ein beschriftetes Kontaktblatt der Kandidaten. Sie rekonstruiert Kartenfolge, sichtbare Grid-Überschriften und die Unterscheidung Einzelmotive/Gesamtmotiv. Jede Kandidatenkarte muss genau einmal vorkommen; eine unvollständige Analyse wird nicht übernommen.

Die Bildanalyse setzt eine persönliche Mitarbeiter-Anmeldung im Headquarter voraus. Ein Mitgliederticket darf ausschließlich die ZIP-Analyse verwenden, keine Store-Beispiele anlegen oder Screenshots aktualisieren. Fehlen Vorschauen oder scheitert die Analyse, bleiben die Originalbilder als bearbeitbarer Entwurf erhalten; Reihenfolge und fehlende Überschriften müssen dann vor dem Speichern geprüft bzw. ergänzt werden.

ASINs und Shop-Links sind nicht aus JPG-Dateien zuverlässig rekonstruierbar und werden nicht erfunden. Für eine visuelle Referenz sind Produktziele optional. Fertige Bildtexte sind bereits Teil der Originalbilder; native Grid-Überschriften werden aus den Gesamtvorschauen gelesen und bleiben bearbeitbar. Eine ZIP ohne ausreichend erkennbare Überschriften erfordert diese kurze Ergänzung. Import speichert nie ungeprüft automatisch: anschließend Vorschau prüfen und **Beispiel speichern** klicken.
