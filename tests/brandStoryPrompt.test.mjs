import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { claudePrompt, newStory, validateStory } from '../src/brandStoryModel.mjs';

test('Claude instruction contains complete brand context, two backgrounds and one shared card schema', async () => {
  const s = newStory('Klare Marke'); s.context = { audience: 'Pendler', products: 'Maske B012345678', destinations: 'https://www.amazon.de/stores/page/existing' };
  const prompt = claudePrompt(s);
  for (const value of ['Pendler', 'B012345678', 'https://www.amazon.de/stores/page/existing', 'desktopBrief', 'mobileBrief', '19', 'KONZEPT', 'JSON']) assert(prompt.includes(value), value);
  assert.match(prompt, /eine gemeinsame Kartenliste/);
  const { STORY_SCHEMA, CLAUDE_SKILL, STORY_EXAMPLE } = await import('../src/brandStoryPrompt.mjs');
  assert.equal(STORY_SCHEMA.properties.cards.maxItems, 19);
  validateStory(STORY_EXAMPLE);
  assert.equal(await readFile(new URL('../public/brand-story-claude/SKILL.md', import.meta.url), 'utf8'), CLAUDE_SKILL);
  assert.match(CLAUDE_SKILL, /^---\nname: temoa-brand-story/m);
  assert(!/"(?:mobileCards|desktopCards)"\s*:/.test(JSON.stringify(STORY_SCHEMA)));
});
test('six reference stories use separate assets and real four-image grids; OmniRelexx follows delivered previews', async () => {
  const data = JSON.parse(await readFile(new URL('../public/brand-story-examples/stories.json', import.meta.url), 'utf8'));
  assert.equal(data.stories.length, 6);
  for (const s of data.stories) { validateStory(s); assert(s.background.desktop.url); assert(s.cards.length > 3); assert(s.cards.some(c => c.type === 'grid' && c.slots.every(slot => slot.image.url))); }
  const omni = data.stories.find(s => s.brandName === 'OmniRelexx');
  assert.deepEqual(omni.cards.map(c => c.type), ['media', 'media', 'media', 'media', 'grid', 'grid', 'media', 'media', 'media']);
});
