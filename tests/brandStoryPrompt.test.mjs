import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { claudePrompt, newStory, validateStory } from '../src/brandStoryModel.mjs';

test('project prompt explicitly invokes the organization skill without duplicating its method or schema', () => {
  const s = newStory('Klare Marke');
  s.context = { audience: 'Pendler', products: 'Maske B012345678', destinations: 'https://www.amazon.de/stores/page/existing' };
  s.planning = { mode: 'store', goal: 'Hero erklären', categories: [], focusProducts: [{ asin: 'B012345678', reason: 'explain' }], includeFocusGrid: true };
  const prompt = claudePrompt(s);
  for (const value of ['temoa-brand-story', 'Pendler', 'B012345678', 'https://www.amazon.de/stores/page/existing', 'Hero erklären']) assert(prompt.includes(value), value);
  assert(prompt.length - JSON.stringify(s, null, 2).length < 1000);
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
  assert.match(CLAUDE_SKILL, /^---\nname: temoa-brand-story/m);
  assert.match(CLAUDE_SKILL, /references\/story-patterns\.md/);
  assert.match(CLAUDE_SKILL, /references\/story-schema\.json/);
  assert(!/"(?:mobileCards|desktopCards)"\s*:/.test(JSON.stringify(STORY_SCHEMA)));
});
test('six reference stories use separate assets and real four-image grids; OmniRelexx follows delivered previews', async () => {
  const data = JSON.parse(await readFile(new URL('../public/brand-story-examples/stories.json', import.meta.url), 'utf8'));
  assert.equal(data.stories.length, 6);
  for (const s of data.stories) { validateStory(s); assert(s.background.desktop.url); assert(s.cards.length > 3); assert(s.cards.some(c => c.type === 'grid' && c.slots.every(slot => slot.image.url))); }
  const omni = data.stories.find(s => s.brandName === 'OmniRelexx');
  assert.deepEqual(omni.cards.map(c => c.type), ['media', 'media', 'media', 'media', 'grid', 'grid', 'media', 'media', 'media']);
});
