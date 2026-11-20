# Eigene Brand-Story-Beispiele

Im internen Brand Story Builder: **Beispiele → Beispiel hinzufügen**.

1. Marke und bei Bedarf eine kurze Beschreibung eingeben.
2. Desktop-Hintergrund hochladen. Ein eigener Mobil-Hintergrund ist optional; ohne ihn bleibt die mobile Vorschau deaktiviert.
3. Karten in der gewünschten Reihenfolge ergänzen (maximal 19). Brand Media Asset: eine fertige Bilddatei. ASIN-Grid: Überschrift und vier fertige Bilddateien, oben links/rechts und unten links/rechts. Auch Gesamtmotive werden in vier Dateien hochgeladen. Der Shop-Link ist für Referenzbeispiele optional.
4. Über die Pfeile die Reihenfolge anpassen, in der Vorschau Desktop/Mobil prüfen und **Beispiel speichern** klicken.

Dateien: JPG/PNG, maximal 2 MB pro Bild. Die empfohlenen Abmessungen werden neben jedem Upload dauerhaft angezeigt. Abweichende Auflösung oder Bildproportionen werden als Hinweis angezeigt; Referenzen aus älteren Produktionen bleiben möglich.

Die Bilddateien liegen im bestehenden Vercel-Blob-Speicher. Die Beispiel-Metadaten liegen in der separaten Tabelle `brand_story_examples`, nicht im Browser und nicht unter den Kundenprojekten. Die sieben mitgelieferten Beispiele bleiben erhalten. Eigene Beispiele können nachträglich bearbeitet werden; Versionskonflikte verhindern das Überschreiben paralleler Änderungen.

Die gemeinsame Bibliothek ist auch über die Designeransicht erreichbar. Dort werden keine Buttons zum Hinzufügen oder Bearbeiten angezeigt. Dies ist dieselbe bestehende Zugriffskonvention wie beim Builder, keine neue serverseitige Mitarbeiter-Authentifizierung. Designer-Briefings, interne Markeninformationen und Planungsdaten werden beim Speichern nicht übernommen. Nur zur Weitergabe freigegebene Bilder hochladen.
