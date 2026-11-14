const text = { type: 'string' };
const image = { anyOf: [{ type: 'null' }, { type: 'object', required: ['url', 'width', 'height', 'size'], properties: { url: { type: 'string', format: 'uri' }, name: text, width: { type: 'number', minimum: 0 }, height: { type: 'number', minimum: 0 }, size: { type: 'number', minimum: 0 } } }] };
const slot = { type: 'object', required: ['asin', 'url', 'image', 'productImage', 'assetFile'], properties: { asin: { type: 'string', pattern: '^$|^[A-Za-z0-9]{10}$' }, url: text, assetFile: text, image, productImage: { anyOf: [{ type: 'null' }, { type: 'object', required: ['url'], properties: { url: text } }] } } };
export const STORY_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'temoa Brand Story', type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'brandName', 'marketplace', 'language', 'background', 'cards'],
  properties: {
    schemaVersion: { const: 1 }, brandName: { type: 'string', minLength: 1 },
    marketplace: { enum: ['de', 'com', 'co.uk', 'fr', 'it', 'es', 'nl', 'se', 'pl', 'com.be'] }, language: text,
    brandFacts: text, instructions: text,
    planning: {
      type: 'object', additionalProperties: true, required: ['mode', 'storeUrl', 'goal', 'categories', 'focusProducts', 'includeFocusGrid'],
      properties: {
        mode: { enum: ['store', 'manual'] }, storeUrl: text, goal: text,
        categories: { type: 'array', maxItems: 100, items: { type: 'object', additionalProperties: true, required: ['id', 'name', 'url', 'selected', 'asins'], properties: { id: text, name: text, url: text, selected: { type: 'boolean' }, asins: { type: 'array', maxItems: 4, items: { type: 'string', pattern: '^[A-Za-z0-9]{10}$' } }, status: text } } },
        focusProducts: { type: 'array', maxItems: 19, items: { type: 'object', additionalProperties: true, required: ['asin', 'reason'], properties: { asin: { type: 'string', pattern: '^[A-Za-z0-9]{10}$' }, reason: text, note: text } } },
        includeFocusGrid: { type: 'boolean' },
      },
    },
    context: { type: 'object', additionalProperties: false, properties: Object.fromEntries(['audience', 'message', 'benefits', 'materials', 'products', 'destinations', 'cardCount'].map(k => [k, text])) },
    background: { type: 'object', required: ['desktop', 'mobile', 'desktopBrief', 'mobileBrief', 'desktopCopy', 'mobileCopy'], properties: { desktop: image, mobile: image, brief: text, copy: text, desktopBrief: text, mobileBrief: text, desktopCopy: text, mobileCopy: text } },
    cards: { type: 'array', maxItems: 19, items: {
      type: 'object', required: ['id', 'fileKey', 'type', 'brief', 'copy', 'image', 'slots'],
      properties: { id: { type: 'string', minLength: 1 }, fileKey: { type: 'string', pattern: '^card-[0-9]{2,}$' }, type: { enum: ['media', 'grid'] }, title: text, brief: text, copy: text, assetFile: text, image, headline: { type: 'string', maxLength: 30 }, shopUrl: text, slots: { type: 'array', items: slot } },
      allOf: [{ if: { properties: { type: { const: 'grid' } } }, then: { required: ['headline', 'shopUrl'], properties: { slots: { minItems: 4, maxItems: 4 } } }, else: { properties: { slots: { maxItems: 0 } } } }],
    } },
    references: { type: 'array', maxItems: 30, items: image },
  },
};

export const DESIGN_RULES = `Eine Brand Story hat einen festen Desktop-Hintergrund (3660 × 1563 px) und einen festen Mobilhintergrund (1389 × 1875 px). Sie verwendet eine gemeinsame Kartenliste für beide Ansichten. Mobil ist eine vollständige Karte sichtbar; ein komplettes Vierergrid ist eine Karte.
Maximal 19 Karten insgesamt, beliebig gemischt: Brand Media Asset (814 × 1019 px) oder ASIN-Grid mit vier eigenen Bildern (je 1328 × 1456 px), einer Überschrift (maximal 30 Zeichen) und einem Shop-/Unterseiten-Link. JPG/PNG, maximal 2 MB pro Datei. Es gibt keine getrennten mobilen Kartenbilder.
Der Hintergrund bleibt fest, die Karten bewegen sich. Plane links liegende Motive und rechts liegende Logos/Slogans so, dass ihre Überdeckung in jedem Karussellzustand sinnvoll ist. Eine Logokarte in Hintergrundfarbe scrollt mit; ein Hintergrundlogo bleibt stehen. Ein spätes Freilegen hängt von der tatsächlichen Kartenfolge ab. Vier Gridbilder dürfen zusammen ein Motiv ergeben und dieselbe ASIN verwenden; berücksichtige die Zwischenräume.
Formuliere konkrete Inhalte und Motivwünsche, keine allgemeinen Stilvorschriften. Der Designer entscheidet über die Gestaltung. Beschreibe Desktopmotiv und mobile Adaption getrennt. Alle nötigen Markenbotschaften müssen auch aus den gemeinsamen Karten verständlich sein.
Bildtexte gehören in die gestalteten Dateien. Die Gridüberschrift und der Link „Shop besuchen“ sind separate Felder. Nutze ausschließlich gelieferte ASINs und vorhandene Store-/Unterseiten-URLs; erfinde keine Ziele. Englische Motivbriefings, sichtbare Texte in der gewählten Marktplatzsprache. Keine unbelegten Claims, erfundenen Gründer, Zertifikate oder Wirkungszahlen. Versand und Lieferzeit sind keine Markenbotschaft.`;

export const CLAUDE_WORKFLOW = `Entwickle eine Amazon Brand Story für den temoa Brand Story Builder. Lies zuerst references/story-patterns.md für die auftragsbezogenen Beispiele und vor jeder JSON-Ausgabe references/story-schema.json als verbindlichen Importvertrag.

1. AUFTRAG UND BELEGE
Nutze den Projektstand und bereits bekannte Antworten. Bestimme zuerst das Ziel: breite Kategorien erschließen, ein Hero-Produkt erklären, Herkunft/Handwerk erzählen oder die Menschen hinter der Marke vorstellen. Kombinationen sind möglich; der konkrete Auftrag bestimmt den Schwerpunkt. Ein kleines Sortiment oder ein einzelnes Produkt ist zulässig. Prüfe Zielgruppe, Nutzen, Markenfakten und vorhandene Originalfotos/Logos. Bündele nur die wirklich offenen Fragen. Fehlende Quellen als offen behandeln, keine Personen, Claims, ASINs oder URLs erfinden.
Bei planning.mode=store nutze die ausgewählten Kategorien (selected=true), ihre beobachteten ASINs und echten Unterseiten-URLs. Nicht ausgewählte Kategorien werden nicht automatisch zu Karten. Discovery-Status ist eine Beobachtung, keine Verifikation von Claims oder Rang. Bei manueller Planung entwickle aus dem gelieferten Material; fülle kein kleines Sortiment künstlich mit Kategorien auf. Bewahre planning und zusätzliche Quellen-/Planungsmetadaten beim Export. Wenn planning vorhanden ist oder neu angelegt wird, müssen mode, storeUrl, goal, categories, focusProducts und includeFocusGrid vollständig vorhanden sein. Für neue manuelle Planung ohne bekannte Angaben gelten mode=manual, storeUrl=leer, goal=leer, categories=[], focusProducts=[] und includeFocusGrid=false; vorhandene vollständige Planung und ihre Angaben erhalten. Fehlende Pflichtfelder in unvollständiger Planung ergänzen, ohne übrige Werte zu überschreiben. Maximal 100 Kategorien, vier ASINs je Kategorie und 19 Fokusprodukte. goal und reason dürfen frei formulierte Strings sein; nicht ungefragt auf UI-Auswahlwerte umschreiben.
Produktfokus ist optional. Gründe können Bestseller, neu, Push-Produkt oder Erklärungsbedarf sein; reason und note liefern den Anlass. Hero ist die Rolle in der Story und kann dasselbe Produkt wie der Bestseller sein; daraus entstehen nicht automatisch zwei Karten. Ein tatsächlicher Bestseller- oder Rangclaim braucht Quelle, Zeitraum, Marktplatz und Messgröße. Bloße Store-Platzierung beweist keinen Rang. Eine vom Nutzer kuratierte Auswahl ohne Rangbeleg entsprechend neutral benennen. includeFocusGrid ist ein Wunsch nach einer zusätzlichen gemischten Produktauswahl; prüfe ihren eigenen Einkaufsnutzen und den verfügbaren Kartenplatz, keine Pflichtdopplung.

2. AUFTRAGSGERECHTES KONZEPT
Schlage eine konkrete editierbare Kartenfolge mit Rolle, Motiv, exaktem Text, belegtem Nutzen und Ziel je Karte vor. Nutze einen kurzen authentischen Markeneinstieg; danach passende Erklärung, Belege, Produkte und Cross-Sell. Keine starre Drei-Karten-Regel und keine starre Wortzahl wie maximal acht Wörter. Schreibe so knapp, dass Inhalt, Belegumfang und mobile Lesbarkeit zusammenpassen.
Breites Sortiment: Kategorie in Anwendung oder als Hero vorstellen → passendes Kategorie-Grid, wo das die Auswahl erleichtert. Produktaufbau: Mechanismus/Personalisierung erklären → Anwendung und Full-Image-Beispiele → geeignetes Grid. Herkunft: reale Orte, Menschen und Prozessschritte; persönliche Marke: belegte Gründer und deren Produktbezug. Kleine Sortimente können mit einer gezielten Produktargumentation und einem oder wenigen Grids auskommen. Viele Medienkarten oder wenige Grids sind für sich kein Qualitätsmangel. Bewerte jede Karte danach, was sie zum Auftrag beiträgt; entferne bloße Wiederholung.
Entscheide pro Grid bewusst: vier Produkte, Varianten, ein zusammengesetztes Motiv mit wiederholter ASIN oder eine hybride Produkt-/Nutzenkomposition. Vier Slots bedeuten nicht vier Produkte. Bei Mosaiken prüfe Zwischenräume, erkennbare Produktform, Lesbarkeit jedes sichtbaren Ausschnitts und tatsächliche Zielzuordnung. Der Grid-Footer führt zur passenden Kategorie-/Store-Seite; jeder Slot besitzt sein eigenes belegtes Produktziel. Wiederholte ASINs sind erlaubt. Keine URLs aus Überschriften ableiten.
Beschreibe beide Hintergründe getrennt und prüfe Überdeckung durch alle Karussellzustände. Die gemeinsamen Karten müssen einzeln mobil verständlich sein. Plane bis zu 19 Karten als Budget, nicht als Zielzahl. Lasse Konzept, Texte, Zielzuordnung und offene Fakten im Gespräch klären, bevor du finales JSON ausgibst.

3. KONKRETE DESIGNBRIEFINGS
brief ist ein englisches, konkret bearbeitbares Motivbriefing: welches belegte Produkt/welche Person, Ort oder Anwendung sichtbar sein soll, was die Szene erklärt, welche gelieferten Assets nötig sind und wie ein Grid seine vier Inhalte verbindet. copy enthält den exakten sichtbaren Text in der gewählten Marktplatzsprache; title ist nur ein kurzer interner Kartenname. Ein Briefing wie „premium lifestyle“ reicht nicht. Der Designer entscheidet über die Gestaltung; keine erfundene feste Farb-, Typografie- oder Layoutschablone. Benenne echte Produktgeometrie und nötige unveränderte Details, soweit Material vorliegt.

4. VOLLSTÄNDIGES BUILDER-JSON
Nach inhaltlicher Bestätigung ausschließlich ein vollständiges JSON gemäß references/story-schema.json ausgeben; kein Markdown und kein Patch. schemaVersion bleibt 1. Erhalte bestehende IDs, fileKey-Werte, Dateipfade, Bildobjekte und Produktbilder. Neue eindeutige IDs und unbenutzte card-NN-Schlüssel nur für neue Karten. Reihenfolge darf bearbeitet werden; IDs/Pfade hängen nicht von der aktuellen Position ab. Bewahre auch alte context-Felder und vorhandenes planning. Kein vollständiger Neuaufbau, wenn eine Teiländerung beauftragt ist.
Nutze background.desktopBrief / desktopCopy und mobileBrief / mobileCopy; nur eine cards-Liste. Fehlende Bilder sind null, keine Beispiel-URLs. Medienkarten haben slots: []; Grids exakt vier slots in Reihenfolge oben links, oben rechts, unten links, unten rechts. Jeder Slot enthält asin, url, assetFile, image, productImage; URL ersetzt gegebenenfalls das ASIN-Ziel. Grids brauchen headline (maximal 30 Zeichen) und shopUrl. Fehlende Ziele vor finalem JSON klären oder ausdrücklich abgestimmt leer lassen.
Neue Medienpfade: „Brand Media Assets/media asset image N.jpg“. Neue Grid-Dateisätze: „ASIN Grids/ASIN image Na.jpg“ bis „Nd.jpg“. Medien und Grid-Dateisätze unabhängig zählen; vorhandene Pfade unverändert lassen. Hintergründe im Export: „Hintergrund/Hintergrund_Desktop.jpg“ und „Hintergrund/Hintergrund_Mobile.jpg“. „Preview Neu“ sind Vergleichsbilder, keine Kartenbildquelle. Interne Recherche-/Planungsdaten bleiben im Builder-JSON und gehören nicht in sichtbare Bildtexte oder Kundenbriefings.

${DESIGN_RULES}`;

export const STORY_PATTERNS = `# Auftragsbezogene Brand-Story-Muster

Diese sechs Referenzen wurden am 14. November 2026 anhand von 62 gelieferten Karten visuell geprüft. Es liegen keine Conversion-, Absatz- oder Rangdaten vor. Die Motive belegen keine ASIN-/Linkziele und keine Echtheit oder Claims. Nutzerkontext zum ursprünglichen Auftrag hat Vorrang vor einer rein visuellen Kritik. Muster übertragen, niemals fremde Personen, Zahlen, Zertifikate oder Herkunftsbehauptungen übernehmen. Viele Medienkarten und wenige Grids sind nicht an sich schlecht.

## MyPuzzle — ein individuelles Fotopuzzle aufbauen
Auftrag: Das selbst gestaltbare Fotopuzzle sollte als Hero-Produkt aufgebaut werden. Erklärende Karten zur Funktionsweise und Full-Image-Beispielmotive gehören zusammen mit dem ASIN-Grid zur Produktargumentation. Der beobachtete Referenzsatz hat acht Karten (sechs Medien, zwei Grids), darunter eine Einladung zur Personalisierung und ein vierteiliges Fotopuzzle-Mosaik. Geeignete Folge je nach Material: kurzer Einstieg → Fotowahl/Personalisierung erklären → fertiges persönliches Motiv und Geschenkanlass zeigen → passendes Produktgrid. Mehrere Medien dürfen denselben Hero vertiefen, wenn sie neue Information liefern. Bestseller-/Erfahrungs-/Klimaclaims des Beispiels nicht übernehmen; Mosaik-Fugen nicht durch zentrale Gesichter oder wesentliche Produktdetails führen.

## PROCREA — breite Kategorien und bewusste Produktwahl
Elf beobachtete Karten, sechs Medien und fünf Grids. Kategorievorstellung direkt vor passendem Grid unterstützt Navigation. Pro Grid ein verständliches Auswahlprinzip entwickeln: Anwendung, Formulierung, Menge oder Material. Wesentliche Unterschiede im Motiv oder lesbaren Bildtext zeigen, statt auf winzige Verpackungstexte zu vertrauen. Kategorienamen konsistent halten und Hero-Produkt sowie anschließende Auswahl aufeinander abstimmen. Produktbezogene Leistungszahlen nur mit eigenen Belegen verwenden. Die Paarfolge ist ein hilfreiches Muster für breite Sortimente, keine Pflicht je Kategorie.

## IGLIANOS (Referenzdateien: Eglianos) — Herkunft und Handwerk
Auftrag: Geschichte griechischen Olivenöls, eigener Anbau, Handwerk und natürliche Herkunft. Der Satz umfasst elf Karten, zehn Medien und ein Grid. Der Bildanteil passt zu diesem Schwerpunkt und rechtfertigt keine pauschale Kürzung auf Shopping-Karten. Mit belegten Orten, Anbau, Händen und konkreten Prozessschritten erzählen; Bild- und Erklärungskarten können wechseln. Das Grid kann reale Packungsgrößen oder Anwendungen zugänglich machen. Nutzerangaben zum Auftrag sind keine automatische Verifikation einzelner Herkunfts-, Bio- oder Qualitätsclaims; aktuelle Nachweise und Geltungsbereich klären.

## OMNI RELAX (Referenzdateien: OmniRelexx) — zwei Menschen, kleines Sortiment
Auftrag: Zwei Personen als persönliche Markenanker und ein kleines Sortiment. Neun Karten, sieben Medien und zwei Grids; die zusammenhängenden Grid-Motive sind bewusst gewählt. Reale Gründer mit dem erlebten Problem und der konkreten Produktidee verbinden. Den tatsächlichen Produktkörper in der Anwendung zeigen. Ein Vierergrid kann ein Motiv oder eine hybride Nutzenkomposition mit derselben ASIN sein; nicht künstlich vier Artikel erfinden. Jede zusätzliche Medienkarte muss einen neuen Bezug, Kontext oder Beleg liefern. Aussagen zu Schlaf, Selbsttests oder absoluten Ergebnissen nur mit eigenem Material und zutreffendem Umfang.

## Bachgold — einzelne Produkte eines kleinen Sortiments
Auftrag: Zum damaligen Zeitpunkt kleines Sortiment, deshalb einzelne Produkte und ihre Argumentation statt breiter Kategorienavigation. Neun Karten, acht Medien und ein Grid. Herkunft als belegte Menschen + konkretes Ausgangsproblem + daraus entstandene Produktentscheidung erzählen. Produktmechanismus und tatsächliche Anwendung können getrennte Medienrollen haben; eine klare Übergabe führt zum passenden Grid. Wenige Grids sind hier kein struktureller Fehler. Numerische Leistungs-, Weltneuheits-, Bestseller- und Hilfsprojektclaims benötigen konkrete Belege; emotionale Outdoor-Fotos ersetzen sie nicht.

## Sanquell — Anwendung erklärt Kategorien und Ersatzbedarf
Vierzehn Karten, neun Medien und fünf Grids. Kategorie in tatsächlicher Einbausituation → klar benanntes passendes Grid macht ein breites Sortiment verständlich. Ersatzfilter mit belegter Kompatibilität und zugehörigem Gerät verbinden, um Cross-Sell und Nachkauf zu erleichtern. Vier Slots können Sortiment, Nutzenlayout oder ein einzelner Produkt-Hero als Mosaik sein. Gesundheits-, Sicherheits- und Normenangaben nur mit Prüfstelle, Produktumfang und Belegen; Nachweise einer Kategorie nicht stillschweigend auf alle übertragen. Lange Beleg-Einstiege nur beibehalten, wenn sie zum konkreten Auftrag und Kaufverständnis beitragen.

## Prüfung vor Ausgabe
Hat jede Karte eine nachvollziehbare Aufgabe? Unterstützt die Folge den bestätigten Schwerpunkt? Sind behauptete Fakten und Ziele tatsächlich geliefert? Ist die gemeinsame Folge mobil Karte für Karte verständlich? Sind beide Hintergründe und alle Fugen/Überdeckungen berücksichtigt? Sind wiederholte ASINs, Footer und einzelne Slotziele bewusst zugeordnet? Bleiben Motive konkret editierbar und visuelle Entscheidungen beim Designer?
`;

export const STORY_EXAMPLE = {
  schemaVersion: 1, brandName: 'Deine Marke', marketplace: 'de', language: 'de', brandFacts: '', instructions: '',
  planning: { mode: 'manual', storeUrl: '', goal: '', categories: [], focusProducts: [], includeFocusGrid: false },
  context: { audience: '', message: '', benefits: '', materials: '', products: '', destinations: '', cardCount: '' },
  background: { desktop: null, mobile: null, desktopBrief: '', mobileBrief: '', desktopCopy: '', mobileCopy: '' },
  cards: [
    { id: 'story-intro', fileKey: 'card-01', type: 'media', title: 'Markeneinstieg', assetFile: 'Brand Media Assets/media asset image 1.jpg', brief: 'Describe the agreed subject here.', copy: '', image: null, slots: [] },
    { id: 'story-products', fileKey: 'card-02', type: 'grid', title: 'Produktauswahl', brief: 'Describe the four agreed product images or one composite motif.', copy: '', image: null, headline: '', shopUrl: '', slots: ['a', 'b', 'c', 'd'].map(letter => ({ asin: '', url: '', assetFile: `ASIN Grids/ASIN image 1${letter}.jpg`, image: null, productImage: null })) },
  ], references: [],
};

export function claudePrompt(story) {
  return `Nutze den in unserer Claude-Organisation installierten Skill temoa-brand-story für dieses Projekt. Lies seine Referenzen und entwickle aus dem folgenden Projektstand ein auftragsgerechtes Konzept. Stelle nur noch offene Fragen; bestätige das Konzept vor der finalen Ausgabe.
Danach erwarte ich ausschließlich vollständiges importierbares Builder-JSON (schemaVersion 1) gemäß dem Skill-Schema. Erhalte bestehende IDs, fileKey-Werte, Dateipfade, Bildobjekte sowie Kontext und Planungsmetadaten. Vorhandene Karten sind der editierbare Projektstand. Falls der Skill nicht verfügbar ist, melde das, statt Schema oder Methodik zu erraten.

AKTUELLER PROJEKTSTAND
${JSON.stringify(story, null, 2)}`;
}

export const CLAUDE_SKILL = `---
name: temoa-brand-story
description: Entwickle und überarbeite Amazon Brand Stories für den temoa Brand Story Builder aus Markeninformationen, Store-Kategorien, ausgewählten Produkten und vorhandenen Materialien. Nutze diesen Skill bei explizitem Aufruf von temoa-brand-story, für Story-Konzepte, Karten-/Hintergrundbriefings oder einen vollständigen JSON-Import.
---

# temoa Brand Story

Einmal als Skill in der Claude-Organisation bereitstellen. Jedes Projekt ruft temoa-brand-story mit seinem aktuellen Builder-JSON auf. Dieses Paket enthält die Methode und den Importvertrag; der Projektprompt muss sie nicht wiederholen.

## Referenzen laden

Lies vor dem Konzept [Auftragsbezogene Muster](references/story-patterns.md). Lies vor der JSON-Ausgabe das vollständige [JSON-Schema](references/story-schema.json). Verwende nur diese beiden Kartenarten; A+-Vergleichstabellen sind keine zusätzliche Builder-Kartenart.

${CLAUDE_WORKFLOW}
`;
