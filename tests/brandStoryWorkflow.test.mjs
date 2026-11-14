import test from 'node:test';
import assert from 'node:assert/strict';
import { newStory, newCard, validateStory, customerStory } from '../src/brandStoryModel.mjs';
import * as workflow from '../src/brandStoryWorkflow.mjs';
const { normalizeStory, backgroundBrief, designerStory, prepareStoryImport, storySummary } = workflow;

const image = { url: 'https://example.com/art.jpg', width: 814, height: 1019, size: 1000 };
test('legacy backgrounds remain editable without losing the original brief and copy', () => {
  const s = newStory('Alt'); s.background = { desktop: image, mobile: null, brief: 'Original brief', copy: 'Original copy' };
  const n = normalizeStory(s);
  assert.equal(backgroundBrief(n, 'desktop'), 'Original brief');
  assert.equal(backgroundBrief(n, 'mobile'), 'Original brief');
  n.background.mobileBrief = 'Mobile composition';
  assert.equal(backgroundBrief(n, 'desktop'), 'Original brief');
  assert.equal(backgroundBrief(n, 'mobile'), 'Mobile composition');
  assert.equal(s.background.mobileBrief, undefined);
});
test('reordered imports preserve images and stable delivery paths, changed ASIN resets product image', () => {
  const s = newStory('Marke'); const a = newCard('media'), g = newCard('grid', [a]);
  a.image = image; g.slots[0].asin = 'B012345678'; g.slots[0].productImage = { url: image.url }; g.slots[0].image = image;
  s.cards = [a, g]; s.background.desktop = image;
  const incoming = structuredClone(s); incoming.cards.reverse(); incoming.cards[0].slots[0].asin = 'B087654321';
  delete incoming.cards[1].image; delete incoming.cards[1].assetFile;
  delete incoming.cards[0].slots[0].image; delete incoming.cards[0].slots[0].productImage; incoming.background.desktop = null;
  const result = prepareStoryImport(JSON.stringify(incoming), s);
  assert.equal(result.foreign, false);
  assert.deepEqual(result.story.cards[1].image, image);
  assert.equal(result.story.cards[1].assetFile, a.assetFile);
  assert.deepEqual(result.story.cards[0].slots[0].image, image);
  assert.equal(result.story.cards[0].slots[0].productImage, null);
  assert.deepEqual(result.story.background.desktop, image);
  assert.match(result.summary, /2 Karten/);
});
test('foreign imports never inherit current assets or private brand context', () => {
  const s = newStory('Alt'); s.context = { audience: 'PRIVATE' }; s.background.desktop = image;
  const incoming = newStory('Neu'); incoming.cards = [newCard('media')];
  const result = prepareStoryImport('```json\n' + JSON.stringify(incoming) + '\n```', s);
  assert.equal(result.foreign, true); assert.equal(result.story.background.desktop, null);
  assert(!JSON.stringify(result.story).includes('PRIVATE'));
});
test('19 mixed cards are accepted, 20 or separate mobile cards are rejected', () => {
  const s = newStory('Marke'); for (let i = 0; i < 19; i++) s.cards.push(newCard(i % 2 ? 'grid' : 'media', s.cards));
  validateStory(s); s.cards.push(newCard('media', s.cards)); assert.throws(() => validateStory(s), /19/);
  s.cards.pop(); s.mobileCards = []; assert.throws(() => validateStory(s), /gemeinsame/);
});
test('invalid internal card names are rejected before rendering a concept', () => {
  const s = newStory('Marke'); s.cards = [newCard('media')]; s.cards[0].title = { unexpected: 'object' };
  assert.throws(() => validateStory(s), /Kartenfelder/);
});
test('designer and customer projections omit all internal context; customers retain reconstruction fields', () => {
  const s = newStory('Marke'); s.context = { audience: 'PRIVATE_AUDIENCE', products: 'PRIVATE_PRODUCTS' };
  s.brandFacts = 'PRIVATE_FACTS'; s.instructions = 'PRIVATE_INSTRUCTIONS';
  s.background.desktopBrief = 'DESIGNER_BACKGROUND'; const c = newCard('media');
  c.brief = 'DESIGNER_CARD'; c.copy = 'Public image text'; s.cards = [c];
  c.title = 'INTERNAL_CARD_RATIONALE';
  const d = designerStory(s), p = customerStory(s);
  assert(!JSON.stringify(d).includes('PRIVATE')); assert.match(JSON.stringify(d), /DESIGNER_BACKGROUND/);
  assert(!JSON.stringify(p).includes('PRIVATE')); assert(!JSON.stringify(p).includes('DESIGNER'));
  assert(!JSON.stringify(p).includes('INTERNAL_CARD_RATIONALE'));
  assert.equal(p.cards[0].assetFile, c.assetFile); assert.equal(p.cards[0].copy, c.copy);
});
test('import identity is compared to the saved project even after context renames it', () => {
  const editing = newStory('Neue Marke'); editing.cards = [newCard('media')];
  const result = prepareStoryImport(JSON.stringify(editing), editing, { brandName: 'Gespeicherte Marke', marketplace: 'de' });
  assert.equal(result.foreign, true);
});
test('reordered grid slots recover their artwork by stable delivery path', () => {
  const s = newStory('Marke'), c = newCard('grid'); s.cards = [c];
  c.slots[0].image = { ...image, url: 'https://example.com/a.jpg' }; c.slots[1].image = { ...image, url: 'https://example.com/b.jpg' };
  const incoming = structuredClone(s); [incoming.cards[0].slots[0], incoming.cards[0].slots[1]] = [incoming.cards[0].slots[1], incoming.cards[0].slots[0]];
  incoming.cards[0].slots.forEach(slot => { slot.image = null; });
  const result = prepareStoryImport(JSON.stringify(incoming), s).story;
  assert.equal(result.cards[0].slots[0].image.url, 'https://example.com/b.jpg');
  assert.equal(result.cards[0].slots[1].image.url, 'https://example.com/a.jpg');
});
test('designer upload payload contains only changed positions, never untouched snapshot images', () => {
  const old = newStory('Marke'); old.cards = [newCard('media')]; old.cards[0].image = image; old.background.desktop = image;
  const next = structuredClone(old); next.background.desktop = { ...image, url: 'https://example.com/new-bg.jpg' };
  assert.deepEqual(workflow.changedStoryAssets(old, next), [{ kind: 'desktop', image: next.background.desktop }]);
  assert.deepEqual(workflow.changedStoryAssets(old, structuredClone(old)), []);
});
test('project summaries expose counts and thumbnail data without sharing tokens or briefs', () => {
  const s = newStory('Marke'); s.context = { audience: 'SECRET' }; s.background.desktop = image;
  s.cards = [newCard('media'), newCard('grid')]; s.cards[0].brief = 'INTERNAL';
  const result = storySummary(s);
  assert.equal(result.cardCount, 2); assert.equal(result.mediaCount, 1); assert.equal(result.gridCount, 1);
  assert.equal(result.preview.background, image.url); assert(!JSON.stringify(result).includes('SECRET')); assert(!JSON.stringify(result).includes('INTERNAL'));
});
