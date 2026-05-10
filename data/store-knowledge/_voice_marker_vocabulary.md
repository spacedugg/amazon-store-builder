# Voice Marker Vokabular (offene Listen, waechst mit Analysen)

Dieses Dokument haelt die bekannten Werte fuer den `voiceMarkers` Block
im v4 Schema (`docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md` Paragraf 23).

Pro Page genau ein Tag pro Feld setzen, das die dominante Auspraegung
beschreibt. Mischtonalitaeten in `openQuestions` notieren.

Regeln zur Erweiterung:

- Wenn ein bestehender Wert passt, diesen verwenden.
- Wenn keiner passt, neuen Wert einfuehren und unten ergaenzen mit
  Definitionssatz, Quelle (Brand und Page) und einem konkreten
  Beispielsatz, der den Wert greifbar macht.
- Schreibung: snake_case, deutsch oder englisch je nach bestehender
  Konvention im Feld.

## voiceRegister, bekannte Werte

- `nahbar` - duzt, Frage Pattern erlaubt, freundliche Tonalitaet
- `direkt` - kurze Aussagen, max 4 Worte, keine Floskel
- `technisch` - Spezifikationen, Daten, Werte, sachlich
- `emotional` - Erlebnis, Gefuehl, Sinnlichkeit
- `professionell` - sachlich, kompetent, ohne Slang oder Duzen
- `saisonal` - tagesaktuelle, kalendarische Bezuege
- `autoritaer` - Aussagen mit Anspruch auf Geltung, Befehl Pattern
- `verspielt` - Wortspiele, Humor, ungewoehnliche Bilder

## sentencePattern, bekannte Werte

- `kurze_aussage` - eine Aussage, ein Punkt, kein Komma
- `frage_pattern` - Headline als Frage formuliert
- `komma_erklaerung` - "Wort, Erklaerung" Pattern
- `befehl` - Imperativ, "Probier", "Hol dir", "Spar dir"
- `paradox` - Gegensatzpaar, "klein aber gross"
- `datenpunkt` - Headline ist Zahl, Prozent, Wertangabe
- `listen_aufzaehlung` - mehrere Begriffe Komma getrennt

## vocabularyField, bekannte Werte

- `kulinarisch` - Geschmack, Zutaten, Genuss Wortfeld
- `klinisch` - Wirkung, Studie, Praeparat Wortfeld
- `sportlich` - Performance, Training, Ergebnis Wortfeld
- `naturwissenschaftlich` - molekular, Mineral, Substanz Wortfeld
- `lifestyle` - Alltag, Routine, Wohlfuehlen Wortfeld
- `traditionell` - Handwerk, Herkunft, Generation Wortfeld
- `industriell` - Praezision, Maschine, Effizienz Wortfeld
- `familiaer` - geteilt, gemeinsam, Mehrgenerationen Wortfeld

## claimType, bekannte Werte

- `benefit_funktional` - Was tut es, Wirkung
- `benefit_emotional` - Wie fuehlt es sich an
- `social_proof` - Reviews, Anzahl Kunden, Awards
- `expertise_signal` - Forschung, Apotheke, Test Sieger
- `herkunft_prozess` - Wo kommt es her, wie wird es gemacht
- `ergebnis_versprechen` - Was bekommst du am Ende
- `zugehoerigkeit` - "fuer Menschen die ...", Identitaet

## rhetoricalDevice, bekannte Werte

- `alliteration` - Anlautwiederholung
- `kontrast` - Gegensatzpaar
- `metapher` - Bildhafte Uebertragung
- `konkrete_zahl` - "99 Prozent", "in 30 Sekunden"
- `namens_callout` - Markenname oder Produktname als Wort im Satz
- `wiederholung_anapher` - Wort am Satzanfang wiederholt
- `none` - kein erkennbares Stilmittel

## Erweiterungs Log

(Wird waehrend der Analysen gefuellt: neuer Wert, Brand, Page,
Definitionssatz, Beispielsatz.)
