// Page Type Classifier
//
// Mapt rohe Seitennamen (aus Blueprints oder aus Nutzer-Input) auf kanonische
// Seitentypen, die der Skeleton Builder in der Blueprint Grammar nachschlagen
// kann. Regex-basiert, kein LLM-Aufruf.
//
// Die gleichen Regeln werden auch vom Grammar Extractor
// (scripts/build-blueprint-grammar.mjs) verwendet, damit Klassifikation bei
// Extraktion und Generierung identisch ist.

export const PAGE_TYPE_RULES = [
  { type: 'home',             test: /^(startseite|home|homepage)$/ },
  { type: 'about',            test: /^(über|ueber|about|unsere mission|mission)\b/ },
  { type: 'bestsellers',      test: /(bestseller|bestselling)/ },
  { type: 'new_arrivals',     test: /(neu(heiten|igkeiten)?|new|arrivals?)/ },
  { type: 'sustainability',   test: /(nachhaltigkeit|sustainab|umwelt)/ },
  { type: 'product_lines',    test: /(produktlinien?|productlines?|kollektion)/ },
  { type: 'product_selector', test: /(produktselektor|selektor|selector|finder)/ },
  { type: 'all_products',     test: /^(alle produkte|all products|angebote|sale|offers?)$/ },
  { type: 'brand_story',      test: /(geschichte|story|unsere geschichte|brandstory)/ },
];

export const PAGE_TYPES = [
  'home', 'category', 'about', 'bestsellers', 'new_arrivals',
  'sustainability', 'product_lines', 'product_selector',
  'all_products', 'brand_story',
];

export function classifyPageType(pageName, userIntent) {
  if (userIntent) {
    const hint = String(userIntent).toLowerCase().trim();
    for (const rule of PAGE_TYPE_RULES) {
      if (rule.test.test(hint)) return rule.type;
    }
  }
  const n = String(pageName || '').toLowerCase().trim();
  if (!n) return 'category';
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.test.test(n)) return rule.type;
  }
  return 'category';
}
