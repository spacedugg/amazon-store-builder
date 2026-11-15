import { SPECS, newStory, validateStory, gridMode, slotImageMode, slotDisplayImage, productAsin, productUrl } from './brandStoryModel.mjs';

export const CONTEXT_FIELDS = [
  ['audience', 'Zielgruppe'],
  ['message', 'Kernaussage der Marke'],
  ['benefits', 'Belegbare Vorteile'],
  ['materials', 'Vorhandene Fotos, Logos und Materialien'],
  ['products', 'Gewünschte Produkte und ASINs'],
  ['destinations', 'Brand Store und gewünschte Unterseiten'],
  ['cardCount', 'Gewünschte Kartenanzahl (optional)'],
];

export function stripBriefSpecifications(value) {
  if(typeof value!=='string')return value;
  const pairs=Object.values(SPECS).map(([w,h])=>`${w}\\s*[x×]\\s*${h}`).join('|');
  const pattern=new RegExp(`(?:\\b(?:size|dimensions|format|abmessungen|größe)\\s*:\\s*)?\\b(?:${pairs})\\s*(?:px|pixels?)\\b`,'gi');
  let result=value;
  for(const match of [...value.matchAll(pattern)].reverse()){
    let left=result.slice(0,match.index).replace(/[ \t]+$/,''),right=result.slice(match.index+match[0].length).replace(/^[ \t]+/,'');
    if(left && /[,;:]$/.test(left) && right[0]===left.at(-1))right=right.slice(1).replace(/^[ \t]+/,'');
    if(!left)right=right.replace(/^[.,;:][ \t]*/,'');
    const gap=left&&right&&!/[\r\n]$/.test(left)&&!/[.,;:\r\n]/.test(right[0])?' ':'';
    result=left+gap+right;
  }
  return result;
}
export function normalizeStory(story) {
  const s = structuredClone(story);
  s.context = { ...Object.fromEntries(CONTEXT_FIELDS.map(([key]) => [key, ''])), ...s.context };
  s.background = { ...newStory().background, ...s.background };
  for (const kind of ['desktop', 'mobile']) {
    s.background[kind + 'Brief'] = stripBriefSpecifications(s.background[kind + 'Brief'] ?? s.background.brief ?? '');
    s.background[kind + 'Copy'] ??= s.background.copy || '';
  }
  s.references ||= [];
  s.background.brief=stripBriefSpecifications(s.background.brief);
  for (const card of s.cards) {
    card.brief=stripBriefSpecifications(card.brief);
    if (card.type === 'grid') {
      card.gridMode = gridMode(card);
      for (const slot of card.slots) { slot.imageMode = slotImageMode(slot, card); slot.brief = stripBriefSpecifications(slot.brief ?? ''); }
    }
  }
  return s;
}

export function backgroundBrief(s, kind) {
  return s.background[kind + 'Brief'] ?? s.background.brief ?? '';
}

export function designerStory(s) {
  const { context, instructions, brandFacts, planning, ...visible } = s;
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
        images: (c.slots || []).map(slot => slotDisplayImage(slot, c)?.url || ''),
      })),
    },
  };
}

export function prepareStoryImport(text, current, projectIdentity = current) {
  const raw = JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
  validateStory(raw);
  const next = normalizeStory(raw);
  const foreign = !!projectIdentity && (next.brandName.trim().toLowerCase() !== projectIdentity.brandName.trim().toLowerCase() || next.marketplace !== projectIdentity.marketplace);
  if (current && !foreign) {
    next.context = { ...normalizeStory(current).context, ...raw.context };
    next.brandFacts = raw.brandFacts ?? current.brandFacts ?? '';
    next.instructions = raw.instructions ?? current.instructions ?? '';
    next.planning = raw.planning ?? current.planning;
    for (const kind of ['desktop', 'mobile']) next.background[kind] ||= current.background[kind];
    next.references = raw.references ?? current.references ?? [];
    for (const c of next.cards) {
      const old = current.cards.find(o => o.id === c.id && o.type === c.type);
      if (!old) continue;
      c.assetFile ||= old.assetFile;
      c.image ||= old.image;
      if (c.type === 'grid') c.slots.forEach((slot, i) => {
        const previous = old.slots.find(o => slot.assetFile && o.assetFile === slot.assetFile) || old.slots[i];
        slot.assetFile ||= previous.assetFile;
        slot.image ||= previous.image;
        const rawSlot = raw.cards.find(item => item.id === c.id)?.slots?.[i];
        if (rawSlot?.imageMode === undefined && !rawSlot?.image) slot.imageMode = slotImageMode(previous);
        const target = value => {
          const url = productUrl({ url: value.url }, next.marketplace);
          return url ? productAsin({ url }, next.marketplace) || url : productAsin(value, next.marketplace);
        };
        const sameTarget = !!target(slot) && target(slot) === target(previous);
        // Imported assets belong to the imported target; only inherited images need a match.
        slot.productImage = slot.productImage || (sameTarget ? previous.productImage : null);
      });
    }
  }
  for (const card of next.cards) if(card.type==='grid' && gridMode(card)==='composite') card.slots.forEach(slot=>{slot.imageMode='custom';});
  validateStory(next);
  const stats = storySummary(next);
  return { story: next, foreign, summary: `${stats.cardCount} Karten · ${stats.mediaCount} Brand Media Assets · ${stats.gridCount} ASIN-Grids${foreign ? ' · wird als neue Brand Story angelegt' : ''}` };
}

export function changedStoryAssets(before, next) {
  const assets = [];
  const changed = (a, b) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
  for (const kind of ['desktop', 'mobile']) if (changed(before.background[kind], next.background[kind])) assets.push({ kind, image: next.background[kind] });
  for (const c of next.cards) {
    const old = before.cards.find(o => o.id === c.id);
    if (!old) continue;
    if (c.type === 'media' && changed(old.image, c.image)) assets.push({ kind: 'media', cardId: c.id, image: c.image });
    if (c.type === 'grid') c.slots.forEach((slot, i) => { if (changed(old.slots[i].image, slot.image)) assets.push({ kind: 'product', cardId: c.id, slot: i, image: slot.image }); });
  }
  return assets;
}
