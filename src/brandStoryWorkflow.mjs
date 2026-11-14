import { newStory, validateStory } from './brandStoryModel.mjs';

export const CONTEXT_FIELDS = [
  ['audience', 'Zielgruppe'],
  ['message', 'Kernaussage der Marke'],
  ['benefits', 'Belegbare Vorteile'],
  ['materials', 'Vorhandene Fotos, Logos und Materialien'],
  ['products', 'Gewünschte Produkte und ASINs'],
  ['destinations', 'Brand Store und gewünschte Unterseiten'],
  ['cardCount', 'Gewünschte Kartenanzahl (optional)'],
];

export function normalizeStory(story) {
  const s = structuredClone(story);
  s.context = { ...Object.fromEntries(CONTEXT_FIELDS.map(([key]) => [key, ''])), ...s.context };
  s.background = { ...newStory().background, ...s.background };
  for (const kind of ['desktop', 'mobile']) {
    s.background[kind + 'Brief'] ??= s.background.brief || '';
    s.background[kind + 'Copy'] ??= s.background.copy || '';
  }
  s.references ||= [];
  return s;
}

export function backgroundBrief(s, kind) {
  return s.background[kind + 'Brief'] ?? s.background.brief ?? '';
}

export function designerStory(s) {
  const { context, instructions, brandFacts, ...visible } = s;
  return visible;
}

export function storySummary(s) {
  return {
    brandName: s.brandName,
    marketplace: s.marketplace,
    cardCount: s.cards.length,
    mediaCount: s.cards.filter(c => c.type === 'media').length,
    gridCount: s.cards.filter(c => c.type === 'grid').length,
    hasDesktop: !!s.background.desktop,
    hasMobile: !!s.background.mobile,
    preview: {
      background: s.background.desktop?.url || '',
      cards: s.cards.slice(0, 3).map(c => ({
        type: c.type,
        image: c.image?.url || '',
        images: (c.slots || []).map(slot => slot.image?.url || slot.productImage?.url || ''),
      })),
    },
  };
}

export function prepareStoryImport(text, current) {
  const raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  validateStory(raw);
  const next = normalizeStory(raw);
  const foreign = !!current && (next.brandName.trim().toLowerCase() !== current.brandName.trim().toLowerCase() || next.marketplace !== current.marketplace);
  if (current && !foreign) {
    next.context = { ...normalizeStory(current).context, ...raw.context };
    next.brandFacts = raw.brandFacts ?? current.brandFacts ?? '';
    next.instructions = raw.instructions ?? current.instructions ?? '';
    for (const kind of ['desktop', 'mobile']) next.background[kind] ||= current.background[kind];
    next.references = raw.references ?? current.references ?? [];
    for (const c of next.cards) {
      const old = current.cards.find(o => o.id === c.id && o.type === c.type);
      if (!old) continue;
      c.assetFile ||= old.assetFile;
      c.image ||= old.image;
      if (c.type === 'grid') c.slots.forEach((slot, i) => {
        slot.assetFile ||= old.slots[i].assetFile;
        slot.image ||= old.slots[i].image;
        slot.productImage = slot.asin === old.slots[i].asin ? slot.productImage || old.slots[i].productImage : null;
      });
    }
  }
  validateStory(next);
  const stats = storySummary(next);
  return { story: next, foreign, summary: `${stats.cardCount} Karten · ${stats.mediaCount} Brand Media Assets · ${stats.gridCount} ASIN-Grids${foreign ? ' · wird als neue Brand Story angelegt' : ''}` };
}
