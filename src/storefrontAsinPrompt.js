// Team-provided collection recipe. This is guidance for the browser-enabled chat,
// not an automatic crawl or a guarantee that a particular chat exports files.
export const STOREFRONT_ASIN_PROMPT = String.raw`Durchsuche dieses Amazon.de-Schaufenster (Seller-Storefront) und gib mir alle Parent-ASINs mit Titel als CSV-Datei aus:

<URL einfügen, z. B. https://www.amazon.de/s?me=SELLERID&marketplaceID=A1PA6795UKMFR9>

Vorgehen:

1. Nutze den eingebauten Browser und öffne die URL. Arbeite im Browser per JavaScript mit fetch (credentials: 'include') und DOMParser, nicht per Screenshots oder Klicks.
2. Alle Angebote sammeln: Blättere über den URL-Parameter &page=N, immer in Batches von 6 Seiten parallel. Lies pro Seite die Elemente [data-component-type="s-search-result"][data-asin] aus. Höre erst auf, wenn eine Seite 0 Treffer liefert. Verlasse dich nicht auf die angezeigte Ergebniszahl, sie ist nur eine Schätzung und wächst beim Blättern.
3. Parent-ASIN ermitteln: Rufe für jede gefundene ASIN die Produktseite /dp/<ASIN> ab (10–12 parallele Worker, keine Pausen). Lies die Parent-ASIN per Regex "parentAsin"\s*:\s*"([A-Z0-9]{10})" aus. Gibt es keinen Treffer, ist die ASIN selbst ein Einzelartikel ohne Variationen. Den Titel nimmst du aus id="productTitle". Bei einer Captcha-Seite wartest du kurz und versuchst es erneut. Bleibt eine Seite gesperrt oder fehlerhaft, melde die Lücke ausdrücklich; eine Captcha-Seite ist keine leere Ergebnisseite und kein Beleg für einen Einzelartikel.
4. Dedupliziere nach Parent-ASIN, sodass jede Parent-ASIN nur einmal vorkommt. Wandle HTML-Entities im Titel in normale Zeichen um (html.unescape). Merke pro Parent, ob mindestens eine zugehörige gefundene ASIN davon abweicht.
5. Übertrage die Ergebnisse in die Sandbox und erstelle die CSV-Datei. Falls diese Umgebung den Padding-Trick unterstützt: Gib JSON.stringify(...) plus 'x'.repeat(120000) aus und lies die gespeicherte Ausgabe in Python ein. Eine automatische Dateispeicherung ist umgebungsabhängig; nutze andernfalls den verfügbaren Datei-Export und melde, falls kein Export möglich ist.

CSV-Format:

- Dateiname: parent_asins_schaufenster_<SELLERID>.csv
- Trennzeichen Semikolon, alle Felder in Anführungszeichen, Kodierung UTF-8 mit BOM (utf-8-sig), damit Excel Umlaute richtig anzeigt
- Kopfzeile: Parent ASIN;Titel;Hat Variationen
- Spalte "Hat Variationen": "ja", wenn die Parent-ASIN von mindestens einer gefundenen ASIN abweicht, sonst "nein"
- Der Titel ist der Titel der gelisteten Variante, nicht des Parents

Gib mir die Datei als Download aus und schreibe mir danach kurz auf Deutsch: Anzahl der Angebote, Anzahl der eindeutigen Parent-ASINs und wie viele davon Variationen haben. Melde fehlende oder gesperrte Seiten und bezeichne ein unvollständiges Ergebnis nicht als vollständig.`;
