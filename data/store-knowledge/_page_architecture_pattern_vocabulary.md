# Page-Architecture-Pattern Vokabular (offene Liste, waechst mit Analysen)

Dieses Dokument haelt die bekannten **strukturell-uebertragbaren** Page-Architecture-Pattern, die aus der Cross-Store-Analyse (Stand 2026-05-23) hervorgegangen sind. Pattern sind reine Modul-Sequenz-Muster ohne brand-spezifische Inhalte und koennen von der Generierungs-Pipeline als Templates fuer neue Marken verwendet werden.

Verbindung zu anderen Schemas:
- `voiceMarkers` in `_voice_marker_vocabulary.md`
- `heroArchetype` in `_hero_archetype_vocabulary.md`
- Module-Layout-Vokabular in `docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md` (Paragraf 17 layoutType-Enum)

Regeln zur Erweiterung:

- Wenn ein bestehender Pattern passt, diesen wiederverwenden.
- Wenn keiner passt, neuen Pattern einfuehren und unten ergaenzen mit
  Definitionssatz, beobachteten Quellen (Brand und Page) und einer
  abstrakten Sequenz-Beschreibung.
- Schreibung: snake_case, deutsch, max 6 Worte.
- Wichtig: Beobachtete Quellen sind Belege, keine Vorlagen. Die
  Pipeline darf nur die abstrakte Sequenz uebernehmen, nicht die
  konkrete Brand-Implementierung (siehe CLAUDE.md Paragraf 0).

## Page-Level-Pattern

### `alternierendes_tile_row_plus_video_modul_sortimentsrhythmus`

Hauptverteiler-Architektur einer Startseite mit 4-6 vollstaendigen Wiederholungen aus Tile-Row (3-5 Tiles) plus Video-Modul (1-2 Videos). Setzt visuell rhythmisierten Wechsel zwischen Sortiments-Verteiler und Demo. Endet meistens mit einem ProductGrid plus Trust-Anker.

- Quelle: night-cat Startseite (5 Wiederholungen ueber 11.792 px Page-Hoehe).
- Sequenz: Header > Hero > [Tile-Row + Video-Modul] x N > ProductGrid > Award/Press-Band > Footer.
- Wann verwenden: Outdoor-, Action- oder Lifestyle-Marken mit 5+ Sortimentsfamilien wo Video-Demo staerker konvertiert als reine Tile-Grids.

### `section_intro_getriebene_startseite_5_plus_paare`

Section-Intro plus ProductGrid (3 oder 4 ASINs) als wiederholtes Pattern auf Startseite mit 5 bis 7 Section-Intro-getriebenen Sortiments-Cluster-Paaren. Section-Intros dienen als visuelle Marker zwischen Sortiments-Clustern.

- Quelle: gritin Startseite (10.961 px hoch, 19 logische Module, 5x Section-Intro + ProductGrid).
- Sequenz: Header > Hero > Tile-Row-Verteiler > [Section-Intro + ProductGrid 3-4] x N > Image-Closing > Footer.
- Wann verwenden: Multi-Kategorie-Tech-Stores mit hoher Sortimentsvielfalt wo Tile-Rows fuer Sub-Kategorien plus ProductGrids fuer Featured-Produkte parallel laufen.

### `extreme_multi_video_carousel_sequenz_6_plus_module`

6 bis 8 Multi-Video-Carousels in Folge (je 6-10 Videos), als sequenzieller Varianten-Showcase. Page hat keinen ProductGrid am Ende, die Konversion erfolgt implizit ueber Click-out aus den Carousel-ASIN-Karten.

- Quelle: gritin Clip-on-Buchlampe (8x Multi-Video-Carousel, 80 Videos total, 12.264 px).
- Sequenz: Header > Hero > [Multi-Video-Carousel 6-10 Videos] x 6-8 > Footer.
- Wann verwenden: Tech-Produkte mit hoher Variantenvielfalt wo Video die wichtigste Konversions-Treiber ist.

### `video_modul_mit_2_asin_karten_kompakte_variant_konversion`

Wiederkehrendes Modul-Muster auf Produkt-Pages: Single-Video plus 2 begleitende ASIN-Karten als kompakte Variant-Konversion, oft mehrfach hintereinander vor einem grossen Multi-Video-Carousel.

- Quelle: night-cat Haengemattenzelt, Kuppelzelt, Wurfzelt, Strandzelt (2-3 Wiederholungen pro Page).
- Sequenz: Header > [Video-Modul mit 2 ASINs] x 2-3 > Multi-Video-Carousel > ProductCarousel > Footer.
- Wann verwenden: Produkt-Pages mit 2-3 Hauptvarianten plus erweitertem Sortiment im Carousel.

### `produkt_grid_direkt_nach_nav_ohne_page_hero`

Sub-Category-Page springt direkt mit massivem ProductGrid 25+ ASINs in die Konversion, ohne separaten Page-Hero. Page-Identifikation erfolgt allein ueber die Amazon-Navigation.

- Quelle: blackroll Trainingsbaender (28 ASINs direkt nach Nav, 8.619 px Page-Hoehe).
- Sequenz: Header > ProductGrid 25-30 ASINs > grosses Tile-Grid 60+ Tiles > Tile-Cluster > Video > Image-Hero > Press-Logos > Sub-Verteiler > Footer.
- Wann verwenden: Sub-Hubs mit grossem Modell-Sortiment, wo der Hero keine Information hinzufuegen wuerde.

### `tile_row_20_fach_modell_auswahl_grid`

Tile-Row 20-fach (alternativ 15-25 Tiles) als Modell-Auswahl-Grid innerhalb einer Produktlinie. Jeder Tile zeigt ein einzelnes Modell mit Variante-Bezeichnung. Hauptverteiler innerhalb einer Produktlinie wenn Modell-Vergleich der primaere Anwendungsfall ist.

- Quelle: kaercher Hochdruckreiniger-Hub (20-fach Modell-Auswahl, 1.187 px hoch in einem Modul).
- Sequenz: Header > Section > Tile-Row 20 > Section > Image-Modul > Tile-Row 4 > Image > Video > Tile-Pair > Footer.
- Wann verwenden: Produktlinien mit hoher Modell-Vielfalt (K2, K3, K4, K5, K7 etc.) wo Vergleich der Hauptanwendungsfall ist.

### `voll_sortiments_product_grid_50_plus_asins`

ProductGrid oder ProductCollection mit 50-60 ASINs als Vollkatalog-Aufzaehlung am Page-Ende eines Hub. Wird verwendet wenn ein Hub das komplette Sortiment einer Kategorie zeigt.

- Quelle: kaercher Garten-Hub (54 ASINs), kaercher Auto-Hub (59 ASINs).
- Sequenz: Header > Section > Hero > Tile-Row 3-4 (Sub-Hub-Verteiler) > Spacer > Section > ProductGrid 50-60 > Tile-Pair > Footer.
- Wann verwenden: Multi-Level-Hub-Architekturen mit grossem Sortiment pro Hub.

### `lange_tile_row_sequenz_14_plus_zubehoer_aufzaehlung`

Sehr lange Sequenz aus 14+ Tile-Rows verschiedener Groessen (3- bis 6-fach) hintereinander als sehr ausfuehrliche Zubehoer- oder Sub-Kategorien-Aufzaehlung. Mit 2-3 Section-Intros als visuelle Trennung.

- Quelle: kaercher HD-Zubehoer-und-Reinigungsmittel (14 Tile-Rows, 14.445 px Page-Hoehe).
- Sequenz: Header > Section + Tile-Row-Cluster > Video > Section + Tile-Row-Cluster > Section + Tile-Row + Tile-Pair > Footer.
- Wann verwenden: Zubehoer-Sub-Hubs mit hoher Sortimentsbreite.

### `reine_tile_row_wiederholungs_page_ohne_hero`

Page besteht aus reiner Wiederholung von Tile-Row-4-fach Modulen (5-7 Wiederholungen) ohne Hero und ohne ProductGrid. Reine Sub-Sub-Kategorien-Liste.

- Quelle: kaercher Mobile Reinigung (6x identische Tile-Row 4-fach, 8.925 px Page-Hoehe).
- Sequenz: Header > Section-Separator > [Tile-Row 4-fach] x 5-7 > Tile-Pair > Footer.
- Wann verwenden: Sortimentskategorien wo der ganze Seitenwert in der Strukturierung der Sub-Sub-Kategorien liegt.

### `saisonale_promo_minimal_single_banner`

Saisonale Aktions-Page mit nur einem Promo-Banner zwischen Header und Footer. Der eigentliche Inhalt ist Amazon-native Aktions-Listing, Brand-Module sind reduziert auf den Banner.

- Quelle: kaercher Home Garden Week (1 Banner, 6.084 px), gritin Alle Angebote (1 Closing-Banner, 5.823 px).
- Sequenz: Header > Promo-Banner > Footer.
- Wann verwenden: Saisonale Aktions-Pages, Event-Landings, Sale-Pages wo der Mehrwert ueber Amazon-native Funktionalitaet entsteht.

### `minimal_landing_hero_plus_single_video`

Sehr knappe Kategorie-Landing mit nur Hero plus Single-Video, keine ProductGrids oder Carousels.

- Quelle: gritin Sport (3.461 px Page-Hoehe, 4 Module).
- Sequenz: Header > Hero > Single-Video > Footer.
- Wann verwenden: Sortimentskategorien mit wenigen Produkten und starkem Bild-Storytelling.

### `doppeltes_press_logo_band_auf_about_page`

Ueber-uns-Page mit zwei separaten Press-Logo-Baendern (oben plus mitte) als doppelter Trust-Anker. Verstaerkt die Marken-Validierung durch redundante Press-Mentions.

- Quelle: blackroll Ueber-BLACKROLL (Vorkommen 1 nach Page-Hero, Vorkommen 2 nach Brand-Story-Modulen).
- Sequenz: Header > Page-Hero > Press-Logos > Brand-Story-Split > Brand-Story-Split > Editorial-Banner > Press-Logos > Image-Hero > Section Closing > Footer.
- Wann verwenden: About-Pages bei Marken mit starken Press-Mentions wo die Validierung der zentrale Trust-Treiber ist.

### `multi_video_demo_18_plus_videos_in_einem_modul`

Ein einzelnes Modul mit auffaellig hoher Video-Anzahl (15-20 Videos) plus 25-35 Bildern als Interactive-Demo oder Shoppable-Carousel.

- Quelle: blackroll Massagepistole (18 Videos plus 29 Bilder, 577 px hoch), night-cat Ultraleichtes-Zelt (18 Videos in einem Carousel).
- Wann verwenden: Demo-getriebene Produkte (Massagepistolen, Zelt-Aufbau, Multi-Funktions-Tools) wo Video die wichtigste Feature-Kommunikation ist.

### `grosses_tile_grid_60_plus_tiles_sub_variantenverteiler`

Tile-Grid mit 60+ Tiles (4-Spalten-Grid, 60-65 Tiles total) als Sub-Variantenverteiler nach dem ProductGrid auf Sub-Category-Pages. Zeigt alle Varianten einer Produktlinie als visuelles Mosaik.

- Quelle: blackroll Faszienrollen (62 Tiles), blackroll Baelle-und-Trigger (64 Tiles), blackroll Trainingsbaender (63 Tiles).
- Wann verwenden: Sub-Hubs mit sehr hoher Variantenvielfalt (Farbe, Groesse, Set-Variante) wo der Variantenscan ueber visuelles Mosaik schneller ist als ueber ASIN-Detailbloecke.

### `multi_section_intro_sequenz_5_plus_marker`

Sequenz aus 5 hintereinander geschalteten Section-Intros (mit oder ohne ProductGrid dazwischen). Verwendet Section-Intros als visuell rhythmisierender Page-Strukturierer.

- Quelle: kaercher Hochdruckreiniger-Katalog (5 Section-Intros plus 2 Video-Module plus Tile-Rows, 8.067 px).
- Wann verwenden: Katalog- oder Featured-Sortiments-Pages wo die visuelle Trennung in Themen-Cluster der wichtigste Strukturgeber ist.

### `hero_banner_lead_asin_plus_product_grid_varianten`

Sub-Category-Page mit Hero-Banner als Lead-ASIN-Showcase plus ProductGrid mit allen Varianten der Linie plus 2 Schluss-Bridges. Sehr konsistentes Sub-Category-Pattern fuer Linien-Detail-Pages.

- Quelle: esn Designer Whey, Isoclear, Flexpresso, IsoWhey Hardcore (4 Pages identisches Pattern).
- Sequenz: Header > Hero-with-Lead-ASIN > ProductGrid Varianten > Bridge-Banner > Bridge-Banner > Footer.
- Wann verwenden: Multi-Varianten-Produktlinien wo das Lead-ASIN im Hero als Anker dient und Varianten direkt darunter konvertieren.

### `hero_video_plus_product_grid_voll_sortiment_24_asins`

Hub-Page mit Hero-Video plus Vollkatalog-ProductGrid 24+ ASINs. Anders als die Hub-zu-Sub-Linien-Variante zeigt dieses Pattern direkt das ganze Sortiment.

- Quelle: esn VITALSTOFFE, esn PERFORMANCE.
- Sequenz: Header > Hero-Video > ProductGrid voll-sortiment 24+ ASINs > Bridges > Footer.
- Wann verwenden: Kategorien mit hoher Produktvielfalt und ohne hierarchische Sub-Linien-Struktur.

### `hub_zu_sub_linien_tile_quad_verteiler`

Hub-Page mit Hero plus Tile-Quad als Sub-Linien-Verteiler statt ProductGrid. Jedes Tile fuehrt zu einer Sub-Linien-Page mit eigenem Hero und Varianten-Grid.

- Quelle: esn PROTEINE Hub.
- Sequenz: Header > Hero > Tile-Quad als Sub-Linien-Verteiler > Bridges > Footer.
- Wann verwenden: Kategorien mit klarer 4-Linien-Hierarchie wo der Verteiler-Klick wichtiger ist als die direkte Produkt-Konversion.

### `spezies_hub_tile_row_avalanche_plus_full_collection`

Spezies-Hub-Page (Hund, Katze, Kleintier) mit 6 hintereinander geschalteten Tile-Rows (8-5-8-8-6-9 Tiles) ohne Hero, gefolgt von ProductCollection 40+ ASINs.

- Quelle: feandrea FUR HUNDE.
- Sequenz: Header > Tile-Row x6 > ProductCollection 40+ ASINs > Footer.
- Wann verwenden: Spezies- oder Mega-Kategorie-Hubs mit sehr vielen Sub-Kategorien wo der Tile-Avalanche-Effekt die Sortimentsbreite betont.

### `alternierendes_image_plus_tile_pair_sequenz`

Sub-Category-Page mit 3-fachem alternierenden Wechsel aus Image-Modul plus Tile-Pair (2 ASINs) plus ProductGrid am Ende.

- Quelle: feandrea Hundebetten.
- Sequenz: Header > Hero > [Image-Modul + Tile-Pair] x3 > ProductGrid > Footer.
- Wann verwenden: Sub-Kategorien mit 6-8 Featured-Produkten wo der Wechsel Lifestyle-Bild-Featured-Pair eine narrative Struktur statt simplem Grid bietet.

### `sub_category_single_hero_product_with_multi_video_demo`

Ungewoehnliche Sub-Category-Page mit nur einem einzigen Featured-Produkt im Hero plus 10-Video-Multi-Demo statt klassischem Grid. Sehr kompakte Page (unter 4.000 px).

- Quelle: feandrea Reisen (Katzen).
- Sequenz: Header > Hero mit Single-ASIN > Multi-Video-Demo 10 Videos > Footer.
- Wann verwenden: Single-Featured-Produkt-Pages wo das eine Hero-Produkt durch intensive Video-Demo verkauft wird.

### `multi_featured_asin_showcase_sequence`

Page mit 2-3 hintereinander geschalteten Featured-ASIN-Showcases ohne grossen ProductGrid am Ende. Jeder Showcase zeigt 1 Featured-Produkt mit Bild, Headline, USP-Bullets und CTA.

- Quelle: hansegruen Spar-Sets (3x Featured), hansegruen Neuheiten (2x Featured), hansegruen Ingwer-Shots (2x Featured).
- Sequenz: Header > Hero plus Sub-Banner > [Featured-ASIN-Showcase] x2-3 > Bridges > Footer.
- Wann verwenden: Sub-Kategorien mit 2-3 strategischen Hero-Produkten wo jedes einzelne mehr Aufmerksamkeit verdient als ein gemeinsames Grid.

### `pair_sequence_only_no_hero`

Startseite ohne Hero, ohne Manifesto, ohne Brand-Section. Reine 8-fache Tile-Pair-Sequenz direkt nach Header. Ungewoehnliches Anti-Hero-Pattern.

- Quelle: masterchef Startseite (8 Tile-Pair-Sequenzen nach Header, keine Manifesto- oder Brand-Module).
- Sequenz: Header > [Tile-Pair] x8 > Footer.
- Wann verwenden: Marken mit sehr vielen Sub-Kollektionen oder Sub-Linien wo der direkte Verteiler-Zugriff wichtiger ist als ein Brand-Statement.

### `inverse_grid_first`

Page mit umgekehrter Reihenfolge: ProductGrid am Anfang, Hero erst unten. Anti-Pattern zum Default-Architecture wo Hero immer oben steht.

- Quelle: holy-energy Shaker-Page (ProductGrid vor Hero, 3 Module).
- Sequenz: Header > ProductGrid > Hero > Footer.
- Wann verwenden: Sub-Kategorien wo die Produktvielfalt selbsterklaerend ist und der Hero als emotionaler Page-Abschluss statt als Page-Auftakt dient.

### `bestseller_carousel_first_plus_triade`

Bestseller-Page-Architektur mit Amazon-nativem Carousel direkt nach Header, dann 3 Section-Intros mit Featured-ASIN-Showcase je Section.

- Quelle: holy-energy Bestseller.
- Sequenz: Header > Carousel > [Section-Intro + Featured-Showcase] x3 > Footer.
- Wann verwenden: Bestseller-Pages mit klarer Top-3-Featured-Hierarchie wo das Carousel die volle Bestseller-Liste zeigt und die Triade die echten Top-3 narrativ inszeniert.

### `featured_deal_sequence`

Sub-Category-Page mit mehreren hintereinander geschalteten Featured-Deal-ASIN-Showcases (Bildgalerie 20+ Bilder plus eingebettetes Video plus Sterne-Bewertungen plus Akkordeon-Info) statt klassischem Hero plus Grid.

- Quelle: more-nutrition PROTEIN ICED COFFEE (3 aufeinanderfolgende FeaturedDeal-Showcases).
- Sequenz: Header > [FeaturedDeal-Showcase] x3 > Footer.
- Wann verwenden: Sub-Kategorien mit 2-3 Lead-Produkten die wie Mini-Detailpages innerhalb des Stores praesentiert werden sollen.

### `category_distributor_5tile_asymmetric_hero`

Startseiten-Pattern mit 1-2 asymmetrischen 5-Tile-Hub-Heros als Kategorien-Verteiler ohne separates Hero-Banner.

- Quelle: trixie Startseite (2x 5-Tile-Cluster: HUND und KATZE).
- Sequenz: Header > [5-Tile-Asymmetric-Hub-Hero] x1-2 > weitere Verteiler > Footer.
- Wann verwenden: Marken mit 2-3 grossen Spezies-/Hauptkategorien wo der visuelle Verteiler statt eines klassischen Hero-Banners die Page-Eingang dominiert.

### `brand_series_sub_minimal_headerless`

Brand-Serien-Sub-Page komplett ohne Hero und ohne Manifesto. BrandHeader geht direkt in ProductGrid ueber.

- Quelle: trixie BE ECO, trixie BOHO, trixie DOG ACTIVITY.
- Sequenz: Header > ProductGrid > Footer.
- Wann verwenden: Brand-Serien-Sub-Pages wo die Serie selbst der Hero ist (Branding lebt im Header) und keine zusaetzliche Hero-Inszenierung nötig ist.

### `dual_product_grid_promo`

Promo-/Sale-Page mit zwei aufeinanderfolgenden ProductGrids (50 und 48 ASINs) plus Spacer-Modul dazwischen.

- Quelle: feandrea Sonderangebote.
- Sequenz: Header > Hero > ProductGrid 50 > Spacer > ProductGrid 48 > Footer.
- Wann verwenden: Sale-Pages mit sehr grosser ASIN-Liste wo eine logische Trennung (z.B. Top-Deals oben, weitere Deals unten) sinnvoller ist als ein einziges riesiges Grid.

### `brand_story_plus_application_recipe`

Zweiteiliges Editorial-Modul: oben "UNSER X" Brand-Story-Headline plus 6-8 USP-Bullets, unten ein Anwendungs-Rezept oder Use-Case-Block mit Schritt-Anleitung. Zwei narrative Schichten in einem einzigen Modul.

- Quelle: more-nutrition ZERUP (Modul 7: "UNSER ZERUP" Brand-Story mit 7 USP-Bullets plus "ORANGE BASIL FIZZ REZEPT" mit Schritt-Anleitung darunter).
- Sequenz innerhalb des Moduls: Brand-Story-Headline > USP-Bullets > Rezept-/Use-Case-Headline > Schritt-Anleitung.
- Wann verwenden: Featured-ASIN- oder Sub-Category-Pages wo das Produkt eine Anwendungs-Storyline transportiert (Cocktails, Rezepte, Smoothie-Bowls, Workouts) und gleichzeitig die Brand-USP-Story erzaehlt werden soll.

### `how_to_guide_tile_quad`

4-Schritt-Anwendungsguide als nummeriertes Tile-Quad mit Lifestyle-Foto pro Schritt plus kurzer Schritt-Beschreibung. Anders als ein Brand-Story-Banner zeigt dieses Pattern den konkreten Produkt-Use im Lifestyle-Kontext.

- Quelle: hansegruen Startseite Modul 10 (1. Pulver aus Dose entnehmen, 2. Pulver einfuellen, 3. Kurz schuetteln, 4. Geniessen und wohlfuehlen) - im urspruenglichen Blueprint faelschlich als `product_showcase` klassifiziert.
- Sequenz innerhalb des Moduls: Section-Headline > 4 nummerierte Tiles mit Lifestyle-Foto + kurzem Action-Text.
- Wann verwenden: Produkte mit nicht-selbsterklaerender Anwendung (Pulver, Konzentrate, Powder-to-Drink, DIY-Sets) wo die Pipeline visuell die Hemmschwelle nehmen muss.

### `brand_story_trio_trenner`

Drei kurze Brand-Story-Tile-Pair-Trenner mit unterschiedlichen Text-Typen (Mission, Sortimentsbreite, Promise) als Soft-Bridges zwischen Sortiment-Modulen. Visuell als Body-Copy-Cards mit Brand-Foto und kurzem Statement, kein Produkt.

- Quelle: trixie Startseite (3x Tile-Pair-Trenner mit Mission "Friends for Life", Sortiments-Body-Copy "6500 vielfaeltige Artikel", Brand-Promise).
- Sequenz: nach jedem 2-3 Sortiment-Modulen ein Tile-Pair-Trenner mit jeweils anderem Text-Typ.
- Wann verwenden: Grosse Verteiler-Startseiten mit vielen Sortiments-Modulen wo Brand-Anker zwischen den Modulen verhindern dass die Page rein verkauft-orientiert wirkt.

## Verwendung in der Generierungs-Pipeline

Wenn die Pipeline aus den Store-Analysen ein Brand-Store-Konzept fuer eine neue Marke erzeugt, kann sie:

1. Anhand des Brand-Briefings (Vertikalsegment, Sortimentsbreite, Pos-Strategie) die passenden Page-Architecture-Pattern aus dieser Liste vorschlagen.
2. Die abstrakte Modul-Sequenz uebernehmen (Modul-Typen plus Modul-Funktion plus Position).
3. Brand-spezifische Inhalte (Visuals, Headlines, Sublines, CTAs, Awards) frisch generieren, ohne sie aus den Quell-Stores zu kopieren.

Beispiel: Eine neue Outdoor-Marke kann das `alternierendes_tile_row_plus_video_modul_sortimentsrhythmus` Pattern von night-cat als abstrakte Sequenz uebernehmen, ohne dass die night-cat-spezifischen Outdoor-Camp-Visuals (Wald, See, Berg) mit-kopiert werden. Die neuen Visuals muessen zur neuen Outdoor-Marken-Bildwelt passen.
