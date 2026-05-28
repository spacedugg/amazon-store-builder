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
- `freundlich` - duzt-Variante mit positiv-warmer Tonalitaet, weniger reduziert als `direkt`. Beobachtet bei gritin Startseite mit Sortiments-Cluster-Sprache fuer breite Konsumenten-Zielgruppe.
- `abenteuerlich` - Outdoor-/Action-Register mit Aufforderung zur Entdeckung. Beobachtet bei night-cat ueber alle 10 Pages, Tagline "Catch Outdoors Fun".
- `jung_lebendig` - duzt mit Pop-Culture-Bezuegen, alliterative Wortspiele, kreatives Naming-System. Beobachtet bei holy-energy ueber alle 10 Pages mit Tier-Themen-Flavor-Namen wie "Strawberry Shark", "Watermelon Whale", "Pomegranate Piranha".
- `expert_endorsement` - sachlich-kompetenter Ton mit Berufung auf Expertise, Studien oder prominente Endorsements. Beobachtet bei hansegruen mit Vanessa-Blumhagen-Endorsement und naturwissenschaftlichen Hochzahlen.

## sentencePattern, bekannte Werte

- `kurze_aussage` - eine Aussage, ein Punkt, kein Komma
- `frage_pattern` - Headline als Frage formuliert
- `komma_erklaerung` - "Wort, Erklaerung" Pattern
- `befehl` - Imperativ, "Probier", "Hol dir", "Spar dir"
- `paradox` - Gegensatzpaar, "klein aber gross"
- `datenpunkt` - Headline ist Zahl, Prozent, Wertangabe
- `listen_aufzaehlung` - mehrere Begriffe Komma getrennt
- `steigerung_mit_punkten` - drei oder mehr eigenstaendige Worte mit Punkten als Steigerung. Beispiel "Gut. Besser. Lyocell." (twentythree Bettwaesche)

## vocabularyField, bekannte Werte

- `kulinarisch` - Geschmack, Zutaten, Genuss Wortfeld
- `klinisch` - Wirkung, Studie, Praeparat Wortfeld
- `sportlich` - Performance, Training, Ergebnis Wortfeld
- `naturwissenschaftlich` - molekular, Mineral, Substanz Wortfeld
- `lifestyle` - Alltag, Routine, Wohlfuehlen Wortfeld
- `traditionell` - Handwerk, Herkunft, Generation Wortfeld
- `industriell` - Praezision, Maschine, Effizienz Wortfeld
- `familiaer` - geteilt, gemeinsam, Mehrgenerationen Wortfeld
- `technisch` - Geraete, Specs, Schnittstellen Wortfeld. Beobachtet bei Tech-Gadget- und Reinigungsgeraete-Marken (kaercher, gritin Produkt-Pages).
- `outdoor` - Natur, Camp, Trekking, Wildnis Wortfeld. Beobachtet bei night-cat ueber alle Pages mit Zelt-, Rucksack-, Wathose-Sortiment.
- `alltagspraktisch` - Haushalts- und Gebrauchs-Wortfeld ohne starke Tech- oder Lifestyle-Praegung. Beobachtet bei gritin Startseite und gritin "Alle Angebote" als Verteiler-Sprache.
- `premium_lifestyle` - Luxus-, Genuss- und Status-Wortfeld. Vokabular wie "Atelier", "Origin", "Barista", "Master". Beobachtet bei nespresso ueber alle 10 Pages mit Kaffee-Maschinen-Sortiment, deutlich oberhalb von `kulinarisch` und `lifestyle` positioniert.
- `nachhaltig` - Eco-, Bio-, Recycling- und Zertifikats-Wortfeld. FSC, GRS, Bio-Siegel, recycelte Materialien als persistente Pattern-Annotation. Beobachtet bei trixie BE ECO Serie und feandrea Sustainability-Chips ueber 10 Pages.
- `gastronomie` - Profi-Kueche, Kochkunst und Handwerks-Wortfeld. Begriffe wie "Kollektion", "Essential", "Professional", Verb-Imperative wie "Frittieren", "Wiegen". Beobachtet bei masterchef ueber alle 10 Pages.

## claimType, bekannte Werte

- `benefit_funktional` - Was tut es, Wirkung
- `benefit_emotional` - Wie fuehlt es sich an
- `social_proof` - Reviews, Anzahl Kunden, Awards
- `expertise_signal` - Forschung, Apotheke, Test Sieger
- `herkunft_prozess` - Wo kommt es her, wie wird es gemacht
- `ergebnis_versprechen` - Was bekommst du am Ende
- `zugehoerigkeit` - "fuer Menschen die ...", Identitaet
- `naming_signature` - Kreative Naming-Konvention als Brand-Differenzierung. Beobachtet bei holy-energy mit alliterativen Tier-Themen-Flavor-Namen (Strawberry Shark, Watermelon Whale) und bei more-nutrition mit CHUNKY FLAVOUR, ZERUP, CLEAR GLOW PEPTIDES.
- `certified_sustainability` - explizite Zertifikats-Bezuege wie FSC, GRS, Bio, Nachhaltigeres Beforsten als Vertrauenssignal pro Produkt. Beobachtet bei feandrea als per-Tile-Annotation cross-page.
- `tv_show_heritage` - Berufung auf eine TV-Show oder VIP-Kuration als Trust-Anker. Beispiele: "VON MASTERCHEF GENEHMIGT", "Genehmigt vom MasterChef-Team und getragen von den Teilnehmern der 12. Staffel". Beobachtet bei masterchef als Brand-Heritage-Claim ueber alle Pages.
- `charity_partnership` - explizite Charity- oder Spendenpartnerschaft als Trust-Marker am Sub-Header oder Tile. Beispiel: "SAVE THE OCEAN" Badge bei trixie BE NORDIC. Anders als `certified_sustainability` (Zertifikat fuer Material) referenziert dieser claimType eine Geldspende oder gesellschaftliche Initiative.

## rhetoricalDevice, bekannte Werte

- `alliteration` - Anlautwiederholung
- `kontrast` - Gegensatzpaar
- `metapher` - Bildhafte Uebertragung
- `konkrete_zahl` - "99 Prozent", "in 30 Sekunden"
- `namens_callout` - Markenname oder Produktname als Wort im Satz
- `wiederholung_anapher` - Wort am Satzanfang wiederholt
- `none` - kein erkennbares Stilmittel
- `wortspiel_hyphenation` - kompletter Satzteil durch Bindestriche zu einem Adjektiv komprimiert. Beispiel "Der Wie-fuer-dich-gemachte Stoff." (twentythree Bettwaesche)
- `wortspiel_markenname` - Markenname verschmilzt mit Adjektiv oder Phrase. Beispiel "FOLGE UNS FUER MORE NEUIGKEITEN" (more-nutrition: "more" als Adjektiv und Markenname zugleich).
- `verb_imperative_section` - Page-Sektionen mit Verb-Imperativen als Headlines. Beispiel "FRITTIEREN", "WIEGEN" als Section-Heads auf masterchef Kuechengeraete.

## Erweiterungs Log

### 2026-05-10, Probe-Run kloster-kitchen (drei Pages)

**Verwendet, bestehende Werte stabil:**

- Startseite: voiceRegister `direkt`, sentencePattern `kurze_aussage`, vocabularyField `naturwissenschaftlich`, claimType `expertise_signal`, rhetoricalDevice `kontrast`. Beispielsatz "Trink, was dir gut tut. Nicht, was nur gut klingt."
- Ingwer Shots: voiceRegister `direkt`, sentencePattern `kurze_aussage`, vocabularyField `kulinarisch`, claimType `benefit_funktional`, rhetoricalDevice `kontrast`. Beispielsatz "Unsere grosse 360ml Flasche mit 12 Shots fuer fast zwei Wochen. Oder die kleine 30ml Flasche fuer den Frischekick to go."
- Ueber Uns: voiceRegister `nahbar`, sentencePattern `komma_erklaerung`, vocabularyField `traditionell`, claimType `herkunft_prozess`, rhetoricalDevice `metapher`. Beispielsatz "DIE WURZEL DES GUTEN GESCHMACKS: Es war Liebe auf der ersten Kick."

**Vorschlaege aus dem Probe-Run, noch nicht offiziell aufgenommen,
warten auf User-Review:**

- sentencePattern `doppelpunkt_erklaerung`. Variante zu `komma_erklaerung`,
  bei der das Trennzeichen ein Doppelpunkt ist statt Komma. Pattern Tag
  in Versalien, Doppelpunkt, Erklaersatz. Beispiel
  "DIE WURZEL DES GUTEN GESCHMACKS: Es war Liebe auf der ersten Kick."
  Aktuell wurde `komma_erklaerung` als naechstliegender Wert gesetzt,
  weil das Pattern Tag-plus-Erklaerung am ehesten abdeckt. Wenn der
  Doppelpunkt fuer dich semantisch ein eigener Voice-Marker ist, sollten
  wir den neuen Wert offiziell aufnehmen.

- vocabularyField Mischtonalitaet als systematisches Phaenomen. Auf
  Startseite Mischung naturwissenschaftlich plus kulinarisch (Mikronaehrstoffe
  plus Saftkur, Smoothie). Auf Ueber-Uns Mischung traditionell plus
  familiaer (Klosterkueche plus Teamgeist). v4-Schema verlangt aktuell
  einen dominanten Wert plus openQuestion-Notiz. Falls Mischtonalitaet
  haeufig genug auftritt, koennte ein zweites optionales Feld
  vocabularyFieldSecondary die Mischung sauber abbilden.

### 2026-05-13, Voll-Run kloster-kitchen plus twentythree (15 Pages)

**Neu aufgenommene Werte (offiziell ab dieser Iteration):**

- sentencePattern `steigerung_mit_punkten` - drei oder mehr eigenstaendige
  Worte mit Punkten als Steigerung. Beobachtet bei twentythree Bettwaesche
  Section-Intro "Gut. Besser. Lyocell.".
- rhetoricalDevice `wortspiel_hyphenation` - ein kompletter Satzteil durch
  Bindestriche zu einem zusammengesetzten Adjektiv komprimiert. Beobachtet
  bei twentythree Bettwaesche Section-Intro "Der Wie-fuer-dich-gemachte Stoff."

**Beobachtete Tonalitaets-Patterns ueber Kategorie-Pages:**

- kloster-kitchen: Page-spezifische Tonalitaets-Differenzierung pro
  Produktlinie. Mikronaehrstoffe naturwissenschaftlich-expertise_signal,
  Saftkuren kulinarisch-konkrete_zahl, Shot Kur kulinarisch-kontrast,
  Spar-Abo industriell-wiederholung_anapher (NIE WIEDER, JEDERZEIT, JEDERZEIT).
- twentythree: Marken-Tagline-Anker "Spuere den Unterschied." wiederholt
  sich quer ueber alle 5 Pages. Sub-Category-Pages nutzen sehr knappes
  Section-Intro im professionell-herkunft_prozess Schema.

### 2026-05-23, Per-Page-Iteration blackroll + gritin + night-cat + kaercher (37 Pages)

**Neu aufgenommene Werte (offiziell ab dieser Iteration):**

- voiceRegister `freundlich` - duzt-Variante mit positiv-warmer Tonalitaet,
  weniger reduziert als `direkt`. Beobachtet bei gritin Startseite und
  Produkt-Pages mit Sortiments-Cluster-Sprache fuer breite Konsumenten-Zielgruppe.
- voiceRegister `abenteuerlich` - Outdoor-/Action-Register mit Aufforderung
  zur Entdeckung. Beobachtet bei night-cat ueber alle 10 Pages mit
  Outdoor-Camping-Sortiment.
- vocabularyField `technisch` - Geraete-, Specs-, Schnittstellen-Wortfeld.
  Beobachtet bei kaercher (Reinigungstechnik mit Modell-Bezeichnungen, Specs)
  und gritin Produkt-Pages (LED-Helligkeit, Akku-Werte).
- vocabularyField `outdoor` - Natur-, Camp-, Trekking-, Wildnis-Wortfeld.
  Beobachtet bei night-cat mit Zelt-, Rucksack-, Wathose-Sortiment.
- vocabularyField `alltagspraktisch` - Haushalts- und Gebrauchs-Wortfeld
  ohne starke Tech- oder Lifestyle-Praegung. Beobachtet bei gritin
  Startseite als Verteiler-Sprache.

**Beobachtete Tonalitaets-Patterns ueber 4 weitere Stores:**

- blackroll: Marken-Tagline "Dein Leben kennt keine Grenzen" als
  Sticky-Hero-Anker auf allen 8 Pages, voiceRegister konsistent `direkt`
  und vocabularyField `sportlich`. Bestseller-Page wechselt zu
  social_proof statt benefit_funktional als claimType. Ueber-uns wechselt
  zu emotional + herkunft_prozess + metapher.
- gritin: Startseite mit freundlich-alltagspraktisch als Multi-Kategorie-
  Verteiler. Produkt-Pages wechseln zu freundlich-technisch oder
  freundlich-alltagspraktisch je nach Produkt-Tiefe. Sport-Page als
  einzige mit vocabularyField `sportlich`.
- night-cat: Sehr konsistent abenteuerlich-outdoor ueber alle 10 Pages.
  Campingzubehoer als einzige mit sentencePattern `listen_aufzaehlung`
  fuer breites Sortiment.
- kaercher: Sehr konsistent professionell-industriell-expertise_signal
  ueber Hub-Pages. Saisonale Pages (Home-Garden-Week, Neuheiten)
  wechseln zu voiceRegister `saisonal` + claimType `ergebnis_versprechen`.
  Hochdruckreiniger-Katalog wechselt zu claimType `social_proof` als
  Modell-Vergleichs-Anker.

### 2026-05-23, 8-Stores-Marathon Welle 2 (esn, feandrea, hansegruen, holy-energy, masterchef, more-nutrition, nespresso, trixie - 80 Pages)

**Neu aufgenommene Werte (offiziell ab dieser Iteration):**

- voiceRegister `jung_lebendig` - duzt mit Pop-Culture-Bezuegen, alliterative
  Wortspiele, kreatives Naming-System. Beobachtet bei holy-energy mit
  Tier-Themen-Flavor-Namen.
- voiceRegister `expert_endorsement` - sachlich-kompetenter Ton mit Berufung
  auf Expertise, Studien oder prominente Endorsements. Beobachtet bei
  hansegruen mit Vanessa-Blumhagen-Endorsement.
- vocabularyField `premium_lifestyle` - Luxus-, Genuss- und Status-Wortfeld.
  Beobachtet bei nespresso ueber alle 10 Pages.
- vocabularyField `nachhaltig` - Eco-, Bio-, Recycling- und Zertifikats-
  Wortfeld. Beobachtet bei trixie BE ECO und feandrea Sustainability-Chips.
- vocabularyField `gastronomie` - Profi-Kueche, Kochkunst, Handwerks-Wortfeld.
  Beobachtet bei masterchef.
- claimType `naming_signature` - kreative Naming-Konvention als Brand-
  Differenzierung. Beobachtet bei holy-energy und more-nutrition.
- claimType `certified_sustainability` - explizite Zertifikats-Bezuege.
  Beobachtet bei feandrea cross-page.
- rhetoricalDevice `wortspiel_markenname` - Markenname verschmilzt mit
  Adjektiv. Beispiel "MORE NEUIGKEITEN" (more-nutrition).
- rhetoricalDevice `verb_imperative_section` - Section-Headlines als Verben.
  Beispiel "FRITTIEREN", "WIEGEN" (masterchef).

**Beobachtete Tonalitaets-Patterns ueber 8 weitere Stores:**

- esn: voiceRegister `direkt` plus vocabularyField `sportlich` plus claimType
  `benefit_funktional` durchgehend, Wechsel zu professionell-naturwissenschaftlich-
  expertise_signal auf VITALSTOFFE-Pages.
- feandrea: voiceRegister `freundlich` plus vocabularyField `lifestyle`/
  `alltagspraktisch` plus claimType `benefit_funktional`/`certified_sustainability`.
- hansegruen: voiceRegister `direkt` plus vocabularyField `naturwissenschaftlich`
  plus claimType `benefit_funktional` plus rhetoricalDevice `konkrete_zahl`.
  Signature-Claims: "Superfoodpulver im Shotformat", "100 Prozent echte Zutaten".
- holy-energy: voiceRegister `jung_lebendig` plus vocabularyField `lifestyle`
  plus claimType `naming_signature` durchgehend.
- masterchef: voiceRegister `professionell` plus vocabularyField `gastronomie`
  plus claimType `benefit_funktional` durchgehend, mit rhetoricalDevice
  `verb_imperative_section` als Page-Strukturierung.
- more-nutrition: voiceRegister `direkt` plus vocabularyField `sportlich` plus
  claimType `benefit_funktional`. Brand-Wortspiel "MORE NEUIGKEITEN" als
  rhetoricalDevice `wortspiel_markenname`.
- nespresso: voiceRegister `professionell` plus vocabularyField `premium_lifestyle`
  plus claimType `expertise_signal`/`herkunft_prozess`. Atelier-Page mit
  reinem video_only_premium_showcase ohne Produktgrid.
- trixie: voiceRegister `freundlich` plus vocabularyField `lifestyle`/
  `nachhaltig` plus claimType `benefit_funktional`. BE-ECO-/BE-NORDIC-/BOHO-
  Sub-Pages mit unterschiedlichen Visual-Codes pro Serie.
