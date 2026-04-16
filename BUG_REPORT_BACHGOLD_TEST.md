# Bug Report: E2E Test mit Bachgold am 16.04.2026

Dieser Report fasst alle Findings aus dem vollständigen Testlauf des Amazon Store Builders mit der Marke Bachgold zusammen. Der Test wurde auf dem produktiven Vercel Deployment durchgeführt mit dem Commit 76b294a (Variante A aktiv).

## Testumgebung

- URL: https://amazon-store-builder.vercel.app
- Branch: main, Commit 76b294a
- Vercel Deployment: dpl_9vGRe4rWLjD73ZUfLtLRQUY9aXdA, Status READY
- Testmarke: Bachgold (13 ASINs, Wasserfilter, amazon.de)
- Bestehender Brand Store URL eingegeben: ja
- Marken Website URL eingegeben: nein (bewusst leer gelassen zur Vermeidung von BUG 2)

## Verwendete ASINs

B0BHRHXVS9, B0FL3XVWSZ, B0FQJ9FH3N, B0DJ3BBXN5, B0FL3PDMJ7, B0BK6GNRLC, B0CP62M8TH, B0FQJ9CR8Y, B0D9QG98MX, B0CP63GVJJ, B0BK6H8YR2, B0FMB8SM1R, B0GHX9CYZN

## Bug Liste (aktueller Stand)

### BUG 1 (gelöst): Checkbox "Vorhandene Texte übernehmen" zu grob

Der pauschale Boolean `adoptExistingContent` führte dazu, dass entweder alle Texte kopiert oder alle Texte neu geschrieben wurden. Gelöst durch Variante A: Die Checkbox wurde entfernt, der Pipeline Prompt entscheidet pro Element (Headline, USP, CTA), ob ein starker vorhandener Text beibehalten oder ein schwacher Text umgeschrieben wird.

Status: gefixt in Commit 76b294a, deployed auf Vercel.

### BUG 2 (offen): Wizard State Contamination zwischen Brands

Die Server side Wizard Persistence in `api/wizard-state.js` speichert Drafts ohne DELETE Endpoint. Beim Wechsel zwischen Marken kann eine alte Draft mit falscher `websiteUrl` einer anderen Marke geladen werden. Im Test mit Bachgold versuchte eine frühere Draft die Website `juskys.de` zu scrapen.

Status: offen. Workaround: immer einen frischen Wizard über "Generate" starten, keine alte Draft wieder aufnehmen.

Empfohlener Fix: DELETE Endpoint für Drafts, plus Bindung der Draft ID an die Marke, plus Bestätigungsdialog beim Resume einer alten Draft.

### BUG 3 (offen): Brand Analysis läuft mit irrelevantem Website Scrape

Eng verwandt mit BUG 2. Wenn eine kontaminierte Draft geladen wird, läuft die Brand Analysis mit Inhalten einer anderen Marke.

Status: offen. Wird mit dem Fix von BUG 2 mit adressiert.

### BUG 4 (offen): fehlende ASINs werden nicht im Log benannt

Im Scraping Log erschien nur die Meldung "9 von 13 Produkte gescrapt". Welche 4 ASINs konkret nicht gescrapt werden konnten, wurde nicht ausgegeben. Der Code in `api/amazon-search.js` Zeile 82 filtert Einträge mit `error` Feld stillschweigend heraus.

Status: offen.

Empfohlener Fix: Vor dem Filter die fehlenden ASINs sammeln, ihre Fehlermeldung zurückgeben, im Wizard Log explizit mit ASIN und Grund ausgeben.

Konkret in diesem Testlauf fehlten nach Abgleich mit Phase 3: B0D9QG98MX, B0CP63GVJJ, B0BK6H8YR2, B0FMB8SM1R.

### BUG 5 (offen): USPs enthalten verbotene Bindestriche

Die Brand Analysis lieferte folgende USPs:

1. "Weltweit erster Selfpress Wasserfilter - keine zusätzlichen Komponenten nötig" → Hyphen als Satzverbinder
2. "99,99 Prozent aller Bakterien, Viren und Protozoen in Sekunden entfernt"
3. "0,2 µm Hohlfasermembran filtert bis zu 1500 Liter"
4. "Ultraleicht mit nur 83-100g - perfekt für jedes Outdoor-Abenteuer" → zwei Bindestriche
5. "All-in-One System: Flasche, Squeeze Filter und Trinkhalm in einem" → zwei Bindestriche in "All-in-One"
6. "Designt und entwickelt in der Schweiz für höchste Qualität"

Status: offen.

Empfohlener Fix: Bindestrichverbot als harte Prompt Anweisung in `src/contentPipeline.js` und `src/storeBuilder.js` in alle Content und USP Generation Prompts aufnehmen. Zusätzlich ein Post Processing Step der Bindestriche in generierten Texten erkennt und durch Umformulierung ersetzt.

### BUG 6 (klärungsbedürftig): Marken USPs mit produktspezifischen Zahlen

Fünf von sechs USPs tragen das Label "product" statt "derived". Sie enthalten produktspezifische Werte (1500 Liter Filtergrenze, 83 bis 100 Gramm Gewicht, All in One Flaschenkonzept). Weil das Portfolio mehrere Varianten enthält (Flaschen, Straw Filter, Wechselfilter, Komplettsysteme), treffen diese Aussagen nicht auf jedes Produkt zu.

Klärung durch User: USPs dürfen produktbezogen sein, wenn sie später auf Produktseiten oder Produktunterkategorien landen. Sie dürfen nicht auf Markenebene erscheinen, wenn sie nicht für alle Produkte gelten.

Status: abhängig vom weiteren Testlauf. Wenn die USPs später in Homepage oder Brand Voice generisch verwendet werden, liegt ein Bug vor. Wenn sie nur im Produktkontext erscheinen, ist alles in Ordnung.

Empfohlener Fix: Trennung zwischen Brand USPs (generisch, gelten für alle Produkte) und Product USPs (spezifisch, nur Produktseiten) im Prompt und Datenmodell. Im Wizard UI zwei getrennte Listen oder zwei Tabs.

### BUG 7 (offen): Tonalität Feld leer

Die Brand Voice Sektion zeigt Kommunikationsstil "informell" und Ansprache "du", aber das Feld "Tonalität" ist leer. Der Prompt scheint dieses Feld nicht oder nicht zuverlässig zu befüllen.

Status: offen.

Empfohlener Fix: Im Brand Analysis Prompt in `src/contentPipeline.js` explizit drei bis fünf Tonalitätsadjektive verlangen, mit Beispielen wie "sachlich, technisch, ermutigend" oder "freundlich, nahbar, begeistert".

### BUG 8 (Verdacht): Typische Phrasen zu produktspezifisch

Das Feld "Typische Phrasen" enthält eine einzige sehr lange Phrase: "99,99 Prozent aller Bakterien, Protozoen und andere Krankheitserreger, innerhalb weniger Sekunden einsatzbereit, weltweit erster Selfpress W...". Das wirkt wie eine einzige kopierte Bullet Point aus einem Produktlisting, nicht wie eine Liste typischer Phrasen der Marke.

Status: Verdacht, Beobachtung im weiteren Lauf nötig.

### BUG 9 (offen): Brand Story leer trotz Amazon Quellen

Das Feld Brand Story / Markengeschichte ist komplett leer. Die Marke Bachgold hat jedoch:

1. Auf jeder Produktdetailseite eine "From the Brand" oder "Aus der Markenwelt" Section mit Gründergeschichte und Markenwerten.
2. Im bestehenden Amazon Brand Store eine dedizierte "Über uns" Seite mit Unternehmensgeschichte, Gründergeschichte, Werten.

Der Code in `api/scrape-website.js` extrahiert Brand Story nur aus der externen Marken Website (Zeile 471). Da diese URL hier bewusst leer gelassen wurde, gibt es keine Story.

Die Amazon internen Quellen werden aktuell ignoriert:

- `api/amazon-search.js` Zeile 105 bis 109 extrahiert aus `from_the_brand` nur die Bild URLs, nicht den Text.
- Der bestehende Brand Store wird offenbar nicht rekursiv auf Unterseiten gecrawlt.

Status: offen, hohe Priorität.

Empfohlener Fix: siehe BUG 11 und BUG 12.

### BUG 10 (offen): Kategorienamen und Beschreibungen mit Bindestrichen

In Phase 3 Categories erscheinen folgende Kategorienamen:

- "Wasserfilter-Flaschen"
- "Ultraleichte Wasserfilter" (ok)
- "Selfpress-Technologie Filter"
- "Komplettsysteme & Notfall-Filter"

Die Beschreibungen enthalten:

- "Professionelle Outdoor-Wasserfilter in Flaschenform"
- "Besonders leichte und kompakte Wasserfilter für Outdoor-Aktivitäten und Survival"
- "Innovative Wasserfilter mit fortschrittlicher Selfpress-Technologie"
- "Vollständige 3-in-1 Filtersysteme und spezialisierte Notfall-Wasserfilter für Survival-Situationen"

Fast jeder Kategorieabschnitt enthält mindestens einen Bindestrich.

Status: offen.

Empfohlener Fix: Bindestrichverbot auch im Category Generation Prompt aufnehmen.

### BUG 11 (offen, kritisch): Bestehender Brand Store wird nicht vollständig gecrawlt

Der User hat betont, dass jede Unterseite eines bestehenden Brand Stores gecrawlt werden muss. Die URLs folgen keiner logischen Struktur und können nicht erraten werden.

Aktueller Code holt nur die Startseite oder oberflächliche Daten. Die Bachgold "Über uns" Seite mit der wertvollsten Brand Story wird nicht erfasst.

Status: offen, kritisch.

Empfohlener Fix:

1. Startseite per Web Unlocker gerendert laden.
2. Alle internen Store Links extrahieren (Pattern `amazon.de/stores/page/...`).
3. Duplikate filtern.
4. Jede eindeutige Unterseite einzeln crawlen.
5. Rekursion in die Tiefe bis Tiefenlimit oder keine neuen Seiten.
6. Jede Unterseite strukturiert zurückgeben mit Seitentyp Erkennung (Homepage, Über uns, Produkt, Kategorie).

Implementierungsort: `api/crawl-brand-store.js` oder neuer Endpoint `api/crawl-brand-store-full.js`.

### BUG 12 (offen, kritisch): Produktbilder werden nicht per Vision analysiert

Der User hat klargestellt, dass Vision Bildanalyse ein Kernbestandteil des Tools ist. Aktuell nutzt der Code Gemini Vision nur für eine Farbpalettenanalyse aus den ersten paar Produktbildern. Die eigentlichen Bilder aus `from_the_brand` und `product_description` mit eingebettetem Text (USPs als Grafik, Markengeschichte als Bildserie) werden nicht inhaltlich ausgewertet.

Status: offen, kritisch.

Empfohlener Fix:

1. Jedes Produktbild, jedes `from_the_brand` Bild und jedes `product_description` Bild durch ein Vision Modell schicken.
2. Vision Prompt extrahiert: sichtbarer Text, dargestellte USPs, Claims, Zertifikate, Symbole, visuelle Deskriptoren.
3. Ergebnis landet in einem neuen Feld `imageInsights` oder `visualBrandSignals` der Brand Analysis.
4. Der Brand Analysis Prompt in `src/contentPipeline.js` nutzt diese Signale als zusätzliche Quelle für Brand Story, USPs, Tonalität.
5. Visuelle Deskriptoren (Setting, Stimmung) fließen zurück in die Bildauswahl für den neuen Store.

Implementierungsort: neuer Endpoint `api/analyze-product-images.js` plus Integration in Wizard Phase 1 zwischen Scraping und Brand Analysis.

## Offene Fragen und Entscheidungen

### Frage 1: 4 ungescrapte ASINs im aktuellen Testlauf

Phase 3 blockiert mit der Meldung "4 ASINs noch keiner Kategorie zugeordnet". Die 4 betroffenen ASINs haben keine Produktdaten (Scraping fehlgeschlagen). Optionen:

a) Die 4 ASINs aus dem Wizard entfernen und Phase 4 starten.
b) Die 4 ASINs in eine Auffangkategorie schieben, um zu beobachten wie das System mit datenlosen ASINs umgeht.
c) Zuerst den ASIN Fallback Fix einbauen (Retry plus Parent und Child Resolution), dann neu starten.

Entscheidung offen, Empfehlung a für den aktuellen Testlauf.

### Frage 2: Reihenfolge der Codefixes

Die Fixes für BUG 5, 10, 11, 12 hängen zusammen:

- BUG 11 und 12 liefern mehr und bessere Quelldaten.
- BUG 5 und 10 sind Prompt Disziplin auf der Textseite.

Empfohlene Reihenfolge: zuerst BUG 11 und BUG 12 (Datenquellen erweitern), dann BUG 5 und BUG 10 (Prompts disziplinieren), zuletzt BUG 7 und BUG 8 (Brand Voice Präzision).

## Aktueller Teststand

Phase | Status | Findings
:--- | :--- | :---
0 Input | durchlaufen | ok
1 Scraping und CI Analyse | durchlaufen | 9 von 13 ASINs, BUG 4
2 Brand Analysis | durchlaufen mit Checkpoint | BUG 5, 6, 7, 8, 9
3 Categories | durchlaufen, 4 ASINs entfernt | BUG 10, BUG 13
4 Content | durchlaufen, Output komplett kaputt | BUG 14 bis BUG 19
5 Structure | ausstehend |
6 Generation | ausstehend |
7 Done | ausstehend |

## Phase 4 Findings (Content Step)

Beobachtet am Homepage Tab und am Tab "Wasserfilter-Flaschen".

### BUG 13: Kategorienamen, mögliche Redundanz und Strukturqualität prüfen

Nach Klärung der Bindestrich Regel sind die gefundenen Kompositum Bindestriche wie `Wasserfilter-Flaschen`, `Selfpress-Technologie`, `Outdoor-Aktivitäten`, `Notfall-Filter`, `3-in-1` alle zulässig.

Was aber zu prüfen bleibt: die **Qualität** der Kategoriebildung. Bei nur neun gescrapten Produkten fünf Kategorien zu bilden, davon eine mit nur zwei Produkten und eine mit drei, ist zu kleinteilig. Eine gute Kategorisierung eines Bachgold Stores würde eher zwei bis drei Kategorien bilden (zum Beispiel Flaschenfilter, Squeeze Systeme, Notfall und Komplettsysteme).

Quelle: Der Prompt für Kategorienvorschlag in `src/contentPipeline.js` erzeugt zu feingranulare Cluster.

### BUG 14: Hero Headline ist nur der Seitenname

Auf der Homepage zeigt das Feld "Hero Headline" den Wert `Homepage`. Auf der Kategorie Seite zeigt das Feld `Wasserfilter-Flaschen`. Das sind Seitennamen, keine Marketing Headlines.

Soll: Auf der Homepage eine starke Marketing Headline, zum Beispiel "Natürliches Quellwasser aus jedem Gewässer". Auf der Kategorie Seite eine Kategorie bezogene Headline, zum Beispiel "Leichte Filterflaschen für jede Tour".

Ursache: Der Prompt für Content Generation setzt vermutlich `headline = page.name` als Default oder der Prompt versteht den Unterschied zwischen Seitenname und Hero Headline nicht.

### BUG 15: Hero Subline und CTA leer auf allen Seiten

Homepage und alle Kategorien haben leere Hero Subline und leeren CTA Text. Das sind Pflichtfelder für einen Amazon Brand Store und dürfen niemals leer sein.

Ursache: Die AI Generation schreibt in diese Felder nichts hinein. Möglicherweise weil der Prompt nur USPs und Bild Ideen erzeugt und die anderen Felder als optional behandelt.

### BUG 16: USPs sind englische Layout Beschreibungen

Homepage USPs (Ist Zustand):
1. `Hero banner with brand logo and main USP - Weltweit erster Selfpress Wasserfilter`
2. `Trust bar with key benefits - 99,99% Filtration, 0,2 μm Hohlfasermembran, Ultraleicht 83-100g`
3. `Trust elements and quality assurance closing banner`

Probleme:
- Sprache ist Englisch, Regel 6 verletzt
- Einträge beschreiben LAYOUT und SEKTIONEN, nicht USPs ("Hero banner with ...", "Trust bar with ...", "Trust elements and ...")
- Der deutsche Teil nach dem Bindestrich enthält echte USP Inhalte, aber eingebettet in englische Strukturbeschreibung
- Bindestrich mit Leerzeichen als Satzstil nach "main USP" und "key benefits" (verletzt Regel 1)
- USPs sind viel zu lang, ein USP ist ein kurzer griffiger Claim, kein Fließtext
- Enthält produktspezifische Werte "83-100g" auf der Homepage, obwohl Homepage auf Markenebene arbeitet

Ursache: Der Prompt vermischt Layout Beschreibung und USP Inhalt. Wahrscheinlich wird das Ergebnis eines Layout Ideen Prompts in das USP Feld gemappt.

### BUG 17: Kategorie Seiten haben 0 USPs

Die Kategorie "Wasserfilter-Flaschen" hat keine USPs auf der Content Seite. Homepage hat 3 (kaputte) USPs. Die Verteilung ist willkürlich.

Soll: Jede Seite muss mindestens 2 bis 3 USPs haben die zur Seite passen. Homepage bekommt Marken USPs, Kategorie Seiten bekommen Kategorie USPs, Produkt Seiten bekommen Produkt USPs.

### BUG 18: Bild Ideen sind englische Platzhalter

Homepage Bild Idee: `Hero banner with brand logo and main USP - Weltweit erster Selfpress Wasserfilter` (identisch zum ersten USP, englisch, Layout Beschreibung).

Kategorie "Wasserfilter-Flaschen" Bild Idee: `Category hero showcasing bottle filter systems` (englisch, generisch).

Ursache: Der Prompt fragt offenbar eine englische Beschreibung an, oder die Felder werden aus einem englischen Layout Template übernommen.

### BUG 19: Alle Seiten zeigen "0 ASINs" in der Sidebar

Sidebar Einträge:
- `Homepage · 0 ASINs`
- `Wasserfilter-Flaschen · 0 ASINs`
- `Ultraleichte Wasserfilter · 0 ASINs`
- `Selfpress-Technologie Filter · 0 ASINs`
- `Komplettsysteme & Notfall-Filter · 0 ASINs`

Tatsache: Die Kategorien in Phase 3 haben 2 bis 3 ASINs jeweils. Die ASINs werden also nicht von Phase 3 in Phase 4 propagiert, oder nur das Anzeige Feld zählt falsch.

Mögliche Ursache:
- Datenmodell Bruch zwischen Categories State und Pages State
- Pages werden neu aus Kategorien abgeleitet, aber ohne die ASIN Referenzen

Das ist ein Showstopper, weil die Content Generation ohne Produkt Kontext keine sinnvollen Texte produzieren kann. Deshalb sind die USPs generisch und die Headlines Platzhalter.

### BUG 20: UI Text der Seite (kein Bug nach Klarstellung)

Die UI Labels in der Admin Maske wie "Hero-Claim-Stile", "Benefit-Claim", "Text-CTA", "Bild-Ideen", "KB-Patterns", "Premium-Stores" sind interne Generator Oberfläche und nicht Teil des kundensichtbaren Brand Store Outputs. Unter der geklärten Regel 1 sind sie zulässig.

Dieser Eintrag ist als Erinnerung gespeichert, dass wir die Regel 1 auf den Output anwenden, nicht auf die Steuerungs UI.

## Zusammenfassung Ursachen Analyse Phase 4

1. **Content Generation Prompt ist strukturell falsch gebaut**: Er liefert englische Layout Beschreibungen statt deutsche Marketing Texte, und vermischt Layout Feld und USP Feld.
2. **ASIN Referenzen gehen zwischen Phase 3 und Phase 4 verloren**: Content ohne Produktdaten erzeugt nur generische Texte.
3. **Pflichtfelder Subline und CTA werden gar nicht bedient**.
4. **Bindestrich Regel nicht im Prompt**.
5. **Seitenname landet als Hero Headline**: entweder Default Wert oder Prompt Missverständnis.

## Nächste Schritte

1. Entscheidung des Users: Phase 4 Output komplett verwerfen und Codefix vorziehen, oder trotzdem durch Phase 5 bis 7 durchlaufen und beobachten.
2. Falls Codefix zuerst: Inspektion der Content Generation Funktion in `src/contentPipeline.js` oder `src/storeBuilder.js`.
3. Falls weiterlaufen: Phase 5 Structure beobachten und prüfen ob das kaputte Content Feld auf der Structure Seite überlebt oder überschrieben wird.
4. Generierten Store in Phase 6 inspizieren auf Bindestriche, USP Platzierung, Brand Story Präsenz.
5. Bug Report mit allen weiteren Findings komplettieren.
6. Codefixes priorisieren und umsetzen.
