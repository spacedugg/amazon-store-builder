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

export const CLAUDE_WORKFLOW = `Entwickle eine Amazon Brand Story für das temoa Brand Story Builder Tool.

1. MARKENBASIS
Prüfe Markeninformationen, Zielgruppe, zentrale Aussage, belegbare Vorteile, verfügbare Fotos/Logos sowie gewünschte Produkte und Unterseiten. Stelle gezielte Rückfragen, wenn wichtige Fakten oder Ziele fehlen. Ein einzelnes Produkt ist zulässig. Keine Fakten oder ASINs erfinden.

2. KONZEPT
Schlage eine nachvollziehbare Kartenfolge vor. Begründe kurz Inhalt, Motiv und Reihenfolge jeder Karte. Lege dar, was auf dem Desktop-Hintergrund zu sehen ist und wie es für den Mobilhintergrund adaptiert wird. Nutze einen kurzen, konkreten Markeneinstieg, authentische Menschen/Orte, soweit als Material belegt, und passende Produktverbindungen. Keine starre Drei-Karten-Regel. Kläre das Konzept im Gespräch, bevor du finales JSON erzeugst.

3. JSON
Gib nach inhaltlicher Bestätigung ausschließlich ein vollständiges JSON gemäß dem beigefügten Schema aus. Erhalte bei Änderungen bestehende IDs, fileKey-Werte, Dateipfade und Bildobjekte. Erzeuge neue eindeutige IDs und unbenutzte card-NN-Dateischlüssel nur für neue Karten. Nutze title für einen kurzen internen Kartennamen, brief für konkrete englische Inhalts-/Motivvorgaben und copy für den exakten sichtbaren Bildtext.
Nutze background.desktopBrief / desktopCopy und mobileBrief / mobileCopy für die zwei Hintergründe. Verwende nur eine cards-Liste. Unfertige Bilder sind null, keine Beispiel-URLs einsetzen.
Brand Media Assets erhalten stabile assetFile-Pfade nach „Brand Media Assets/media asset image N.jpg“. Grids erhalten für ihre vier slots stabile Pfade „ASIN Grids/ASIN image Na.jpg“ bis „Nd.jpg“, in der Reihenfolge oben links, oben rechts, unten links, unten rechts. Zähle Bildkarten und Grid-Dateisätze unabhängig; IDs und Pfade bleiben beim Umsortieren gleich. Hintergründe: „Hintergrund/Hintergrund_Desktop.jpg“ und „Hintergrund/Hintergrund_Mobile.jpg“. „Preview Neu“ enthält nur Vergleichsbilder und ist keine Bildquelle für Karten.
Setze headline und shopUrl für jedes Grid aus dem abgestimmten Konzept. Jeder der vier Plätze besitzt asin und optional url; eine URL ersetzt das ASIN-Ziel. Wenn Ziele fehlen, lasse sie leer und benenne die offene Frage vor der finalen Ausgabe.

${DESIGN_RULES}`;

export const STORY_EXAMPLE = {
  schemaVersion: 1, brandName: 'Deine Marke', marketplace: 'de', language: 'de', brandFacts: '', instructions: '',
  context: { audience: '', message: '', benefits: '', materials: '', products: '', destinations: '', cardCount: '' },
  background: { desktop: null, mobile: null, desktopBrief: '', mobileBrief: '', desktopCopy: '', mobileCopy: '' },
  cards: [
    { id: 'story-intro', fileKey: 'card-01', type: 'media', title: 'Markeneinstieg', assetFile: 'Brand Media Assets/media asset image 1.jpg', brief: 'Describe the agreed subject here.', copy: '', image: null, slots: [] },
    { id: 'story-products', fileKey: 'card-02', type: 'grid', title: 'Produktauswahl', brief: 'Describe the four agreed product images or one composite motif.', copy: '', image: null, headline: '', shopUrl: '', slots: ['a', 'b', 'c', 'd'].map(letter => ({ asin: '', url: '', assetFile: `ASIN Grids/ASIN image 1${letter}.jpg`, image: null, productImage: null })) },
  ], references: [],
};

export function claudePrompt(story) {
  return `${CLAUDE_WORKFLOW}\n\nVERBINDLICHES JSON-SCHEMA\n${JSON.stringify(STORY_SCHEMA, null, 2)}\n\nAKTUELLER PROJEKTSTAND UND MARKENANGABEN\n${JSON.stringify(story, null, 2)}\n\nBeispielstruktur (nur Schemahilfe, keine Inhalte oder Produkte übernehmen):\n${JSON.stringify(STORY_EXAMPLE, null, 2)}`;
}

export const CLAUDE_SKILL = `---\nname: temoa-brand-story\ndescription: Entwickle Amazon Brand Stories aus Markeninformationen, Produkten und vorhandenen Materialien für den temoa Brand Story Builder. Nutze diesen Skill für Story-Konzepte, konkrete Hintergrund- und Kartenbriefings sowie den zugehörigen JSON-Import.\n---\n\n# temoa Brand Story\n\n${CLAUDE_WORKFLOW}\n\n## JSON-Schema\n\n\`\`\`json\n${JSON.stringify(STORY_SCHEMA, null, 2)}\n\`\`\`\n\n## Beispielstruktur\n\nNur als Formatbeispiel verwenden. Produktziele und endgültigen Wortlaut aus den tatsächlichen Markenangaben entwickeln.\n\n\`\`\`json\n${JSON.stringify(STORY_EXAMPLE, null, 2)}\n\`\`\`\n`;
