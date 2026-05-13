# Hero Archetype Vokabular (offene Liste, waechst mit Analysen)

Dieses Dokument haelt die bekannten Werte fuer das Feld `heroArchetype`
im v4 Schema (`docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md` Paragraf 24).

Regeln:

- Nur fuer Module mit `designIntent: emotional_hook` und `layoutType`
  beginnt mit `hero_`. Sonst Wert null.
- Wenn ein bestehender Wert passt, diesen verwenden.
- Wenn keiner passt, neuen Begriff einfuehren und unten ergaenzen mit
  Definitionssatz, Quelle (Brand und Page) und einem konkreten
  Beispielsatz aus dem Hero.
- Schreibung: snake_case, englisch, max 4 bis 5 Worte.
- Werte sind Beobachtungen, keine Wertungen. "premium" oder "high_end"
  sind keine Hero Archetypen, das ist Tonalitaet (gehoert in
  voiceMarkers).

## Bekannte Werte

(Wird waehrend der Analysen gefuellt. Initial leer, damit nichts
vorgewichtet ist und die Werte tatsaechlich aus den Stores emergieren.)
