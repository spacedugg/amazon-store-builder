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

### `kinetic_lifestyle_loop`

Schmaler Autoplay-Video-Banner unter der Menueleiste als Page-Auftakt.
Setzt Bewegung statt Statik vor der Page-Headline. Inhaltlich Lifestyle-
oder Produkt-Loop, nicht ein narratives Hero-Video.

- Quelle: kloster-kitchen, page Ingwer Shots, Modul 2 (layoutType `hero_video`).
- Beispiel: 168px hoher autoplay-Loop direkt unter der Store-Navigation auf der Ingwer-Shots-Page.

### `brand_story_video_intro`

Vollwertiges Brand-Story-Video als Page-Hero. Hochaufloesend, narrative
Imagestrecke aus Mitarbeiter-Szenen, Produktion, Markenmomenten.
Anders als `kinetic_lifestyle_loop` ist das ein erzaehlerisches Video,
nicht ein Loop.

- Quelle: kloster-kitchen, page Ueber Uns, Modul 2 (layoutType `hero_video`, 2160x1080 mp4, 593px hoch im Render).
- Beispiel: Brand-Story-Video als Auftakt der Ueber-Uns-Page.

### `atmospheric_brand_mood`

Abstrakter Video-Loop ohne sichtbares Produkt, ohne Text-Overlay. Dient
als reine Stimmungs-Atmosphaere am Page-Auftakt. Anders als
`brand_story_video_intro` keine Narrativ-Erzaehlung, anders als
`kinetic_lifestyle_loop` keine erkennbaren Lifestyle-Subjekte.

- Quelle: kloster-kitchen, page Zubehoer, Modul 2 (layoutType `hero_video`, sehr unscharfer grauer Stoff-Bokeh-Loop).
- Quelle: kloster-kitchen, page Mikronaehrstoffe, Shot Kur, Probiersets, Saftkuren je Modul 2 (Closeup-Loops einer Flasche ohne sichtbares Marken-Branding).
- Beispiel: 752 px hoher Vollflaechen-Video-Loop mit unscharfem Closeup einer Produkt-Flasche oder einer atmosphaerischen Stoff-Bokeh-Sequenz, kein Text.

### `brand_hero_with_product_lineup`

Brand-Hero-Banner, der Produkt(e) als visuelles Lead-Element zeigt UND
parallel die Marken-Wortbildmarke plus Tagline transportiert. Anders als
`product_in_setting_with_claim` (Produkt in Anwendungsumgebung) zeigt
dieser Archetyp das Produkt-Visual als reine Produkt-Komposition (eine
oder mehrere Flaschen, Karton-Box, Produkt-Reihe, Mosaik). Die
Brand-Tagline ist sichtbar im selben Modul, oft im Split-Layout (Produkt
links, Tagline rechts).

- Quelle: twentythree, Sticky-Brand-Header auf allen 5 Pages (6-Tile-Foto-Mosaik links, Wortbildmarke twenty:three plus Tagline Spuere den Unterschied. rechts).
- Quelle: kloster-kitchen, Sticky-Brand-Header auf allen 10 Pages (Person mit Glas links, Wortbildmarke KLOSTER KITCHEN plus Tagline BETTER THAN GOOD rechts auf Ingwerblatt-Hintergrund).
- Quelle: kaercher, Startseite (Hero mit Produkt-Lineup plus Wortbildmarke Kaercher).
- Beispiel: Das Sticky-Brand-Banner mit Produkt-Lineup oder Produkt-Setting in der einen Haelfte und Brand-Wortbildmarke plus Versalien-Tagline in der anderen Haelfte. Anzahl der gezeigten Produkte ist frei (1 bis viele).

### `seasonal_thematic`

Hero-Banner, der nicht primaer Produkt oder Brand transportiert sondern
ein saisonales oder thematisches Event ankuendigt (Aktionswoche, Sale,
Saison-Launch, themenbezogene Aktion). Visuelle Sprache ist meistens
saisonal (Sommerlicht, Schnee, Herbstlaub, Fruehjahr) plus Aktions-Text.

- Quelle: kaercher, Home Garden Week Page (Modul 2: Promo Image-Modul mit Headline "Home Garden Week" als saisonaler Event-Anker).
- Beispiel: Vollflaechen-Banner ueber 988 px hoch mit thematischer Bildwelt und einem Event-Namen als Headline, ohne dass ein konkretes Produkt im Fokus steht.

### `video_only_premium_showcase`

Hero-Banner als reines Brand-Video ohne nachfolgendes Sortiment-Grid.
Die Page besteht aus dem Video plus optional einem Brand-Statement-Modul.
Anders als `atmospheric_brand_mood` ist das Video hier narrativ statt
abstrakt, anders als `brand_story_video_intro` folgt KEIN Produkt-Grid
nach dem Video. Diese Hero-Form macht den Brand-Atmosphaere-Moment selbst
zum Page-Inhalt.

- Quelle: nespresso, Atelier-Page (Hero-Video als kompletter Page-Hero plus Brand-Section, kein ProductGrid).
- Beispiel: Vollflaechen-Video mit Premium-Brand-Inszenierung ohne anschliessendes Sortiment-Modul.

### `category_distributor_with_hero_tile`

Asymmetrisches 5-Tile-Cluster aus einem grossen Lead-Tile fuer eine
Kategorie (Hund, Katze, Kueche) plus 4 kleineren Sub-Tiles, die als
visueller Verteiler dienen. Statt eines klassischen Hero-Banners zeigt
dieser Archetyp eine ganze Kategorien-Landschaft auf einer Page-Ebene.
Oft 2-fach gestapelt, wenn die Startseite mehrere Spezies oder
Hauptkategorien abdeckt.

- Quelle: trixie, Startseite mit 2x 5-Tile-Cluster (1x HUND, 1x KATZE).
- Beispiel: 5-Tile-Cluster mit 1 grossem Lead-Tile plus 4 kleineren Sub-Tiles, jeweils mit eigener Headline und Link zu Sub-Kategorie-Page.

### `brand_series_distributor`

Vertikal-gestapelte Hero-Banner-Tall-Tiles als Brand-Serien-Verteiler.
Statt eines Sortiment-Grids oder eines Tile-Quad zeigt dieser Archetyp
eine Sequenz von einzelnen Brand-Linien-Heros (BE NORDIC, BE ECO, BOHO,
DOG ACTIVITY, CAT ACTIVITY), jeweils als eigenes vertikales Hero-Tile
mit Serien-Headline und eigener Visualwelt.

- Quelle: trixie, TRIXIE Serien Hub mit 5 vertikalen Hero-Banner-Tall-Tiles je Brand-Serie.
- Beispiel: Stacked Hero-Banner-Tall-Sequenz, 4-6 Tiles uebereinander, jedes mit eigener Brand-Linie und Visualwelt.

### `editorial_story_hero`

Klassischer Hero mit Headline plus Body-Copy plus Bild als Split-Layout
(Text links, Bild rechts oder umgekehrt). Anders als
`product_in_setting_with_claim` ist das Bild hier nicht ein Produkt im
Setting, sondern ein Lifestyle-Setting ohne Produktfokus. Die Headline
erzaehlt eine Mini-Geschichte oder einen Anlass.

- Quelle: trixie, Katzentoiletten-Page (Hero "Fuer ein sauberes Katzenzuhause" mit Body-Copy und Lifestyle-Bild).
- Beispiel: Split-Hero mit erzaehlerischer Headline und ergaenzendem Body-Text plus stimmungsvollem Setting-Bild.

### `interactive_hotspot_hero`

Hero-Banner mit interaktiven Hotspot-Punkten auf dem Bild, die jeweils zu
einem Produkt-Detail oder einer Sub-Page verlinken. Anders als ein klassischer
Brand-Hero ist hier das Bild selbst die Navigation, nicht ein nachfolgender
Modul-Block. Visuell oft als grosses Lifestyle-Setting oder Produkt-Lineup,
mit Dot-Markern an strategischen Punkten.

- Quelle: trixie, Neuheiten-Page (Hero mit Hotspot-Dots und CTA "Produkte ansehen").
- Quelle: esn, Startseite (Hero with Product Lineup mit 5 ASIN-Hotspots).
- Beispiel: Vollflaechen-Hero-Bild mit 3-5 sichtbaren Hotspot-Dots, jeder Dot verlinkt zu einem ASIN oder einer Sub-Page.

### `hero_with_three_usp_badges_and_lifestyle_companion`

Sub-Category-Hero mit strikt einheitlichem Pattern: Vollflaechen-Akzentfarbe
plus diagonaler dunklerer Schraegstreifen, grosse weisse Versalien-Headline
links, drei runde farbige Badge-Kreise mit Icon und kurzem Label (typischer-
weise 2-3 Worte in Versalien) als USP-Triplet, rechts ein einzelnes
Lifestyle-Foto (Person oder Drink-Glas) das den USP-Inhalt visualisiert.
Diese Architektur wiederholt sich Page-fuer-Page in einer Sub-Category-Serie
und macht die Tonalitaet jedes Sortiment-Segments sofort lesbar.

- Quelle: more-nutrition, alle 7 Sub-Pages (ZERUP, CHUNKY FLAVOUR, PROTEIN MILKSHAKE, PROTEIN ICED COFFEE, CLEAR PROTEIN, CLEAR GLOW PEPTIDES, VEGAN PROTEIN) jeweils mit eigenem Akzentfarben-Code und drei kategoriespezifischen USP-Badges.
- Beispiel: Vollflaechen-Pink mit "ZERUP" Versalien-Headline links, drei Badge-Kreise "SEHR ERGIEBIG / VEGAN / 100% GESCHMACK", rechts Frau mit Eistee. Diagonaler dunklerer Schatten als Akzentstreifen.
