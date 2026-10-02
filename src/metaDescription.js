// Meta Descriptions fuer Amazon Brand Store Seiten.
//
// Eine Quelle fuer die Designer Ansicht und den DOCX Export (vorher zweimal kopiert).
//
// Regeln, nach denen der Text gebaut wird:
//  - Laenge hoechstens META_MAX Zeichen (Google zeigt ca. 155 Zeichen am Desktop, mobil weniger:
//    das Wichtigste steht deshalb in den ersten ~120 Zeichen). Es wird nie mitten im Wort oder
//    mit "..." abgeschnitten, lieber wird ein optionaler Teil weggelassen.
//  - Jede Seite bekommt einen eigenen Text. Doppelte Texte schreibt Google haeufig um.
//  - Inhalt statt Zaehler: Marke, Seitenthema, echte Kategorien der Produkte, Kachel Ueberschriften.
//    Keine Angaben wie "12 Produkte".
//  - Keine Werbeversprechen, die Amazon in Stores untersagt oder die Google schlecht bewertet:
//    keine Preise/Rabatte/Gratis, keine Superlative ("beste", "Nr. 1", "Testsieger"), keine
//    Kundenbewertungen, keine URLs/Telefonnummern, keine Anfuehrungszeichen oder Sonderzeichen.
//  - Natuerliche Saetze, die Marke vorn, ein zurueckhaltender Handlungsaufruf am Ende.
//
// Die genaue Zeichengrenze des Meta Description Felds im Amazon Stores Builder ist nicht
// oeffentlich verlaesslich dokumentiert: META_MAX bei Bedarf hier an einer Stelle anpassen.

export var META_MAX = 155;
var META_TARGET_MIN = 100;

var TEXTS = {
  de: {
    and: 'und',
    home: ['{brand} auf Amazon: {topics}. Entdecke das Sortiment im offiziellen Store.',
           '{brand} im offiziellen Amazon Store: {topics}. Jetzt Produkte entdecken.'],
    homeNoTopics: ['{brand} im offiziellen Amazon Store: Das ganze Sortiment der Marke auf einen Blick.'],
    withHeadline: ' {headline}.',
    about: ['Über {brand}: Geschichte, Werte und Menschen hinter der Marke. Jetzt im offiziellen Amazon Store kennenlernen.'],
    aboutTone: ['Über {brand}: {tone}. Geschichte und Werte der Marke im offiziellen Amazon Store.'],
    popular: ['Beliebte Produkte von {brand} auf Amazon{in_cat}. Jetzt im offiziellen Store entdecken.'],
    newest: ['Neuheiten von {brand}{in_cat}. Jetzt die neuen Produkte im offiziellen Amazon Store entdecken.'],
    category: ['{topic} von {brand}{about_cat}. Jetzt im offiziellen Amazon Store entdecken.',
               '{brand} {topic}{about_cat}: Auswahl im offiziellen Amazon Store ansehen.'],
    inCat: ': {cat}', aboutCat: ' ({cat})', glance: ' Alle Produkte auf einen Blick.',
  },
  en: {
    and: 'and',
    home: ['{brand} on Amazon: {topics}. Explore the range in the official store.',
           '{brand} official Amazon Store: {topics}. Discover the products now.'],
    homeNoTopics: ['{brand} official Amazon Store: the full range of the brand at a glance.'],
    withHeadline: ' {headline}.',
    about: ['About {brand}: the story, values and people behind the brand. Get to know us in the official Amazon Store.'],
    aboutTone: ['About {brand}: {tone}. The story and values of the brand in the official Amazon Store.'],
    popular: ['Popular {brand} products on Amazon{in_cat}. Explore them in the official store.'],
    newest: ['New from {brand}{in_cat}. Discover the latest products in the official Amazon Store.'],
    category: ['{topic} by {brand}{about_cat}. Explore the selection in the official Amazon Store.',
               '{brand} {topic}{about_cat}: see the range in the official Amazon Store.'],
    inCat: ': {cat}', aboutCat: ' ({cat})', glance: ' All products at a glance.',
  },
  fr: {
    and: 'et',
    home: ['{brand} sur Amazon : {topics}. Découvrez la gamme dans la boutique officielle.',
           '{brand}, boutique officielle Amazon : {topics}. Découvrez les produits.'],
    homeNoTopics: ['{brand}, boutique officielle Amazon : toute la gamme de la marque en un coup d’œil.'],
    withHeadline: ' {headline}.',
    about: ['À propos de {brand} : histoire, valeurs et équipe derrière la marque. À découvrir dans la boutique officielle Amazon.'],
    aboutTone: ['À propos de {brand} : {tone}. Histoire et valeurs de la marque dans la boutique officielle Amazon.'],
    popular: ['Les produits {brand} les plus appréciés sur Amazon{in_cat}. À découvrir dans la boutique officielle.'],
    newest: ['Nouveautés {brand}{in_cat}. Découvrez les derniers produits dans la boutique officielle Amazon.'],
    category: ['{topic} de {brand}{about_cat}. À découvrir dans la boutique officielle Amazon.',
               '{brand} {topic}{about_cat} : la sélection dans la boutique officielle Amazon.'],
    inCat: ' : {cat}', aboutCat: ' ({cat})', glance: ' Tous les produits en un coup d’œil.',
  },
  es: {
    and: 'y',
    home: ['{brand} en Amazon: {topics}. Descubre la gama en la tienda oficial.'],
    homeNoTopics: ['{brand}, tienda oficial en Amazon: toda la gama de la marca de un vistazo.'],
    withHeadline: ' {headline}.',
    about: ['Conoce {brand}: historia, valores y equipo de la marca. Descúbrela en la tienda oficial de Amazon.'],
    aboutTone: ['Conoce {brand}: {tone}. Historia y valores de la marca en la tienda oficial de Amazon.'],
    popular: ['Productos populares de {brand} en Amazon{in_cat}. Descúbrelos en la tienda oficial.'],
    newest: ['Novedades de {brand}{in_cat}. Descubre los últimos productos en la tienda oficial de Amazon.'],
    category: ['{topic} de {brand}{about_cat}. Descubre la selección en la tienda oficial de Amazon.'],
    inCat: ': {cat}', aboutCat: ' ({cat})', glance: ' Todos los productos de un vistazo.',
  },
};

// Marketplace Schluessel des Tools (de, com, co.uk, fr; es/at/it vorsorglich) -> Textsprache
function langFor(marketplace) {
  var m = String(marketplace || 'de').toLowerCase();
  if (m === 'de' || m === 'at') return 'de';
  if (m === 'fr') return 'fr';
  if (m === 'es') return 'es';
  return 'en';
}

// Formulierungen, die in Amazon Stores nicht stehen sollen bzw. bei Google als Werbesprache gelten.
// Treffer in Ueberschriften/Kategorien: der Teil wird nicht uebernommen.
var BANNED = new RegExp([
  'beste[rnms]?', 'bester', 'günstig\\w*', 'billig\\w*', 'preis\\w*', 'rabatt\\w*', 'angebot\\w*', 'sale', 'gratis', 'kostenlos\\w*',
  'testsieger', 'nr\\.?\\s*1', '#\\s*1', 'number\\s*1', 'bestseller\\w*', 'garantie\\w*', 'deal\\w*', 'aktion\\w*', 'bewertung\\w*',
  'best\\b', 'cheap\\w*', 'discount\\w*', 'free\\b', 'guarantee\\w*', 'top[- ]rated', 'price\\w*', 'offer\\w*', 'review\\w*',
  'meilleur\\w*', 'pas cher', 'promo\\w*', 'gratuit\\w*', 'garantie',
  'mejor\\w*', 'barato\\w*', 'oferta\\w*',
  'https?:', 'www\\.', '\\d+\\s*%', '[€$£]\\s*\\d', '\\d\\s*[€$£]',
].join('|'), 'i');

function clean(text) {
  return String(text == null ? '' : text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[“”„"«»‹›'`´]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsablePhrase(s, maxLen) {
  if (!s || s.length < 4 || s.length > (maxLen || 60)) return false;
  if (BANNED.test(s)) return false;
  var letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length >= 4 && letters === letters.toUpperCase()) return false; // GROSSGESCHRIEBEN
  if ((s.match(/[!?]/g) || []).length > 0) return false;
  return true;
}

function stripEnd(s) { return String(s).replace(/[\s.,;:!?\-–—]+$/, ''); }

function capitalizeFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

function pickVariant(list, seed) {
  var h = 0;
  for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

function joinList(items, and) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' ' + and + ' ' + items[items.length - 1];
}

function fill(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, function(_, k) { return vars[k] != null ? vars[k] : ''; });
}

// ASINs einer Seite -> Produkte -> haeufigste spezifische Kategorie
function pageCategory(page, store) {
  var asins = {};
  (page.sections || []).forEach(function(sec) {
    (sec.tiles || []).forEach(function(t) {
      (t.asins || []).forEach(function(a) { asins[a] = true; });
      if (t.linkAsin) asins[t.linkAsin] = true;
      (t.hotspots || []).forEach(function(h) { if (h && h.asin) asins[h.asin] = true; });
    });
  });
  var count = {};
  (store.products || []).forEach(function(p) {
    if (!p || !asins[p.asin]) return;
    var cats = Array.isArray(p.categories) ? p.categories.slice() : [];
    var name = cats.length ? cats[cats.length - 1] : p.category;
    if (name && typeof name === 'object') name = name.name;
    name = clean(name);
    if (isUsablePhrase(name, 40)) count[name] = (count[name] || 0) + 1;
  });
  var names = Object.keys(count).sort(function(a, b) { return count[b] - count[a]; });
  return names[0] || '';
}

function pageHeadline(page) {
  var found = '';
  (page.sections || []).some(function(sec) {
    return (sec.tiles || []).some(function(t) {
      var h = (t.textOverlay && typeof t.textOverlay === 'object') ? clean(t.textOverlay.heading) : '';
      if (isUsablePhrase(h, 55)) { found = stripEnd(h); return true; }
      return false;
    });
  });
  return found;
}

var HOME_RE = /^(home|homepage|startseite|accueil|inicio|start)$/i;
var ABOUT_RE = /(about|über uns|ueber uns|über|story|geschichte|marke|brand story|à propos|a propos|nosotros)/i;
var POPULAR_RE = /(bestseller|best seller|beliebt|favorit|top|meistverkauf|les plus)/i;
var NEW_RE = /(neu|new|novelt|nouveau|nouveaut|novedad)/i;

function pageKind(name) {
  var n = name.trim();
  if (!n || HOME_RE.test(n)) return 'home';
  if (ABOUT_RE.test(n) && n.length < 40) return 'about';
  if (POPULAR_RE.test(n)) return 'popular';
  if (NEW_RE.test(n) && n.length < 24) return 'newest';
  return 'category';
}

// Haengt `extra` nur an, wenn der Text danach noch in META_MAX passt.
function addIfFits(base, extra) {
  return extra && (base + extra).length <= META_MAX ? base + extra : base;
}

function finish(text) {
  var t = clean(text).replace(/\s+([.,;:])/g, '$1').replace(/\.{2,}/g, '.');
  if (t.length > META_MAX) {
    // Notfall: an der letzten Satzgrenze, sonst am letzten Wort ohne "..." kuerzen
    var cut = t.slice(0, META_MAX);
    var sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '));
    if (sentence >= META_TARGET_MIN) cut = cut.slice(0, sentence + 1);
    else cut = stripEnd(cut.slice(0, cut.lastIndexOf(' ')));
    t = cut;
  }
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

export function generateMetaDescription(page, store) {
  store = store || {};
  page = page || {};
  var lang = langFor(store.marketplace);
  var T = TEXTS[lang];
  var brand = clean(store.brandName) || 'Brand';
  var pageName = clean(page.name);
  var kind = pageKind(pageName);
  var seed = brand + '|' + pageName;
  var cat = pageCategory(page, store);
  var headline = pageHeadline(page);
  var vars = { brand: brand };

  if (kind === 'home') {
    // Die anderen Seiten des Stores sind die Themen: "Blumenerde, Rasendünger und Pflanzenschutz"
    var topics = [];
    (store.pages || []).forEach(function(p) {
      if (!p || p === page) return;
      var n = clean(p.name);
      var k = pageKind(n);
      if (k !== 'category' && k !== 'newest') return;
      if (k === 'newest') return;
      if (isUsablePhrase(n, 36) && topics.indexOf(n) < 0) topics.push(n);
    });
    topics = topics.slice(0, 3);
    var base;
    if (topics.length) {
      vars.topics = joinList(topics, T.and);
      base = fill(pickVariant(T.home, seed), vars);
    } else {
      base = fill(pickVariant(T.homeNoTopics, seed), vars);
      if (cat) base = addIfFits(stripEnd(base) + '.', ' ' + capitalizeFirst(cat) + '.');
    }
    if (base.length < META_TARGET_MIN && headline) base = addIfFits(base, fill(T.withHeadline, { headline: headline }));
    return finish(base);
  }

  if (kind === 'about') {
    var tone = clean(store.brandTone);
    if (isUsablePhrase(tone, 60)) {
      vars.tone = stripEnd(tone);
      return finish(fill(pickVariant(T.aboutTone, seed), vars));
    }
    return finish(fill(pickVariant(T.about, seed), vars));
  }

  if (kind === 'popular' || kind === 'newest') {
    vars.in_cat = cat ? fill(T.inCat, { cat: cat.replace(/\s*&\s*/g, ' ' + T.and + ' ') }) : '';
    return finish(fill(pickVariant(T[kind], seed), vars));
  }

  // Kategorie / Themenseite
  var topic = pageName;
  if (topic.toLowerCase().indexOf(brand.toLowerCase()) === 0) topic = topic.slice(brand.length).replace(/^[\s\-–:]+/, '');
  if (!isUsablePhrase(topic, 50)) topic = cat || pageName || brand;
  vars.topic = topic;
  var sameAsTopic = cat && (cat.toLowerCase() === topic.toLowerCase() || topic.toLowerCase().indexOf(cat.toLowerCase()) >= 0);
  vars.about_cat = cat && !sameAsTopic ? fill(T.aboutCat, { cat: cat.replace(/\s*&\s*/g, ' ' + T.and + ' ') }) : '';
  var desc = fill(pickVariant(T.category, seed), vars);
  if (desc.length < META_TARGET_MIN && headline && headline.toLowerCase() !== topic.toLowerCase()) {
    desc = addIfFits(desc, fill(T.withHeadline, { headline: headline }));
  }
  if (desc.length < META_TARGET_MIN) desc = addIfFits(desc, T.glance);
  return finish(desc);
}

// Pruefung eines (auch handgeschriebenen) Textes: leere Liste = in Ordnung.
export function metaDescriptionIssues(text) {
  var issues = [];
  var t = String(text || '');
  if (t.length > META_MAX) issues.push('länger als ' + META_MAX + ' Zeichen');
  if (t.length < 70) issues.push('sehr kurz (unter 70 Zeichen)');
  if (BANNED.test(t)) issues.push('enthält Werbe- oder Preisaussagen, die Amazon in Stores nicht erlaubt');
  if (/["„“”]/.test(t)) issues.push('enthält Anführungszeichen');
  if (/\.\.\.|…/.test(t)) issues.push('endet mit Auslassungspunkten');
  return issues;
}
