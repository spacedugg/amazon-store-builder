import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { claudePrompt, newStory, validateStory } from '../src/brandStoryModel.mjs';

test('project prompt explicitly invokes the organization skill without duplicating its method or schema', () => {
  const s = newStory('Klare Marke');
  s.context = { audience: 'Pendler', products: 'Maske B012345678', destinations: 'https://www.amazon.de/stores/page/existing' };
  s.planning = { mode: 'store', goal: 'Hero erklären', categories: [], focusProducts: [{ asin: 'B012345678', reason: 'explain' }], includeFocusGrid: true };
  const prompt = claudePrompt(s);
  for (const value of ['Amazon Brand Story', 'Pendler', 'B012345678', 'https://www.amazon.de/stores/page/existing', 'Hero erklären']) assert(prompt.includes(value), value);
  assert(prompt.length - JSON.stringify(s, null, 2).length < 1600);
  assert(!prompt.includes('$schema'));
  assert(!prompt.includes('3660'));
  assert(!prompt.includes('Beispielstruktur'));
  assert.match(prompt, /schemaVersion.*1/);
  assert.match(prompt, /IDs.*fileKey/);
});
test('schema preserves version one with optional editable planning and shared cards', async () => {
  const { STORY_SCHEMA, CLAUDE_SKILL, STORY_EXAMPLE } = await import('../src/brandStoryPrompt.mjs');
  assert.equal(STORY_SCHEMA.properties.cards.maxItems, 19);
  assert(!STORY_SCHEMA.required.includes('planning'));
  const planning = STORY_SCHEMA.properties.planning;
  assert.deepEqual(planning.properties.mode.enum, ['store', 'manual']);
  assert.equal(planning.additionalProperties, true);
  assert.deepEqual(planning.required, ['mode', 'storeUrl', 'goal', 'categories', 'focusProducts', 'includeFocusGrid']);
  assert.equal(planning.properties.categories.maxItems, 100);
  assert.equal(planning.properties.categories.items.properties.asins.maxItems, 4);
  assert.equal(planning.properties.focusProducts.maxItems, 19);
  assert.deepEqual(STORY_EXAMPLE.planning, { mode: 'manual', storeUrl: '', goal: '', categories: [], focusProducts: [], includeFocusGrid: false });
  assert.equal(planning.properties.categories.items.properties.selected.type, 'boolean');
  assert.equal(planning.properties.focusProducts.items.properties.reason.type, 'string');
  assert.equal(planning.properties.includeFocusGrid.type, 'boolean');
  validateStory(STORY_EXAMPLE);
  assert.equal(await readFile(new URL('../public/brand-story-claude/SKILL.md', import.meta.url), 'utf8'), CLAUDE_SKILL);
  assert.match(CLAUDE_SKILL, /^---\nname: Amazon Brand Story/m);
  assert.match(CLAUDE_SKILL, /references\/story-patterns\.md/);
  assert.match(CLAUDE_SKILL, /references\/story-schema\.json/);
  assert(!/"(?:mobileCards|desktopCards)"\s*:/.test(JSON.stringify(STORY_SCHEMA)));
});
test('seven reference stories use separate assets and real four-image grids; OmniRelexx follows delivered previews', async () => {
  const data = JSON.parse(await readFile(new URL('../public/brand-story-examples/stories.json', import.meta.url), 'utf8'));
  assert.equal(data.stories.length, 7);
  for (const s of data.stories) { validateStory(s); assert(s.background.desktop.url); assert(s.cards.length > 3); assert(s.cards.some(c => c.type === 'grid' && c.slots.every(slot => slot.image.url))); }
  const omni = data.stories.find(s => s.brandName === 'OmniRelexx');
  assert.deepEqual(omni.cards.map(c => c.type), ['media', 'media', 'media', 'media', 'grid', 'grid', 'media', 'media', 'media']);
});

test('Futum reconstructs the delivered eleven-card sequence with original assets and no invented links', async () => {
  const data = JSON.parse(await readFile(new URL('../public/brand-story-examples/stories.json', import.meta.url), 'utf8'));
  const story = data.stories.find(s => s.brandName === 'Futum');
  validateStory(story);
  assert.equal(story.background.mobile, null);
  assert.deepEqual(story.cards.map(c => c.type), ['media', 'media', 'media', 'grid', 'media', 'grid', 'media', 'grid', 'media', 'grid', 'media']);
  const expected = (name) => `https://brand-store-preview.temoa.de/brand-story-examples/futum-assets/${name}`;
  assert.equal(story.background.desktop.url, expected('desktop-background.jpg'));
  const images = [story.background.desktop];
  for (const [i, card] of story.cards.entries()) {
    const number = String(i + 1).padStart(2, '0');
    assert.equal(card.fileKey, `card-${number}`);
    assert.equal(card.shopUrl, '');
    if (card.type === 'media') {
      assert.equal(card.image.url, expected(`card-${number}.jpg`));
      assert.deepEqual([card.image.width, card.image.height], [814, 1019]);
      images.push(card.image);
    } else {
      assert.equal(card.slots.length, 4);
      for (const [quadrant, slot] of card.slots.entries()) {
        assert.equal(slot.image.url, expected(`card-${number}-${String(quadrant + 1).padStart(2, '0')}.jpg`));
        assert.deepEqual([slot.image.width, slot.image.height], [1328, 1456]);
        assert.equal(slot.asin, '');
        assert.equal(slot.url, '');
        assert.equal(slot.productImage, null);
        images.push(slot.image);
      }
    }
  }
  assert.deepEqual([story.background.desktop.width, story.background.desktop.height], [3660, 1563]);
  assert.equal(images.length, 24);
  assert.equal(new Set(images.map(img => img.url)).size, 24);
  for (const img of images) {
    const localPath = new URL(`../public${new URL(img.url).pathname}`, import.meta.url);
    const bytes = await readFile(localPath);
    assert.equal(bytes.byteLength, img.size);
    assert.deepEqual([...bytes.subarray(0, 2)], [0xff, 0xd8]);
  }
});
test('Claude import contract describes grid modes and per-slot sources without mixing copy and briefs', async () => {
  const {STORY_SCHEMA,CLAUDE_SKILL,STORY_EXAMPLE}=await import('../src/brandStoryPrompt.mjs');
  const card=STORY_SCHEMA.properties.cards.items, slot=card.properties.slots.items;
  assert.deepEqual(card.properties.gridMode.enum,['individual','composite']);
  assert.deepEqual(slot.properties.imageMode.enum,['product','custom']);
  assert.equal(slot.properties.brief.type,'string');
  assert.equal(STORY_EXAMPLE.cards[1].gridMode,'individual');
  assert.match(CLAUDE_SKILL,/slot\.brief/);assert.match(CLAUDE_SKILL,/imageMode/);assert.match(CLAUDE_SKILL,/gridMode/);
  assert.match(CLAUDE_SKILL,/Produkt-URLs/);assert.match(CLAUDE_SKILL,/exakten sichtbaren Text/);
});

test('handoff removes non-commerce destinations and explicitly invites further ideas without reinstalling the organization skill',()=>{
 const s=newStory('Marke');s.planning={mode:'store',storeUrl:'https://www.amazon.de/stores/brand',goal:'',categories:[{name:'Homepage',url:'https://www.amazon.de/stores/brand',selected:true},{name:'Über uns',url:'https://www.amazon.de/stores/brand/page/about',selected:true},{name:'Schlaf',url:'https://www.amazon.de/stores/brand/page/sleep',selected:true}],focusProducts:[],includeFocusGrid:false};
 const prompt=claudePrompt(s),data=JSON.parse(prompt.slice(prompt.indexOf('{')));
 assert.deepEqual(data.planning.categories.map(c=>c.name),['Schlaf']);assert.equal(s.planning.categories.length,3);
 for(const text of ['Kategorie-Einstiegskarten','Gesamtmotive','Unternehmensgeschichten','Startpunkt','Nie Homepage','Bestseller und Sale']) assert(prompt.includes(text));
});
