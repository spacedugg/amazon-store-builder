import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createClient } from '@libsql/client';
import { newStory, newCard } from '../src/brandStoryModel.mjs';
import { exampleData } from '../src/brandStoryExamples.mjs';
const require = createRequire(import.meta.url);
const image = { url: 'https://example.com/image.jpg', width: 3660, height: 1563, size: 5000 };
function fixture() {
  const story = newStory('Testmarke');
  story.background.desktop = image;
  story.cards = [newCard('media')];
  story.cards.push(newCard('grid', story.cards));
  story.cards[0].image = image;
  story.cards[1].headline = 'Unsere Produkte';
  story.cards[1].slots.forEach(slot => { slot.image = image; slot.imageMode = 'custom'; });
  return story;
}
test('examples require complete artwork and discard private planning and designer instructions', () => {
  const story = fixture();
  story.instructions = 'SECRET'; story.background.brief = 'SECRET'; story.cards[0].brief = 'SECRET';
  story.context = { audience: 'SECRET' };
  story.background.desktop = { ...image, privateNote: 'SECRET' };
  const clean = exampleData(story);
  assert(!JSON.stringify(clean).includes('SECRET'));
  assert.equal(clean.cards[1].slots.length, 4);
  assert.equal(clean.background.mobile, null);
  assert.throws(() => exampleData({ ...story, cards: [] }), /Mindestens/);
  assert.throws(() => exampleData({ ...story, background: { desktop: null } }), /Desktop/);
  story.cards[1].slots[2].image = null;
  assert.throws(() => exampleData(story), /vier/);
  story.cards[1].slots[2].image = image;
  story.cards[0].image = { ...image, url: 'data:image/png;base64,secret' };
  assert.throws(() => exampleData(story), /Kartenfelder/);
});
test('custom examples persist separately, expose artwork only and reject stale revisions', async () => {
  const db = createClient({ url: ':memory:' });
  const dbPath = require.resolve('../api/_db.js');
  const handlerPath = require.resolve('../api/brand-story-examples.js');
  const previous = require.cache[dbPath];
  require.cache[dbPath] = { exports: { getClient: () => db } };
  delete require.cache[handlerPath];
  const handler = require(handlerPath);
  async function request(method, body) {
    const res = { code: 200, setHeader() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await handler({ method, body }, res); return res;
  }
  try {
    const data = fixture(); data.instructions = 'PRIVATE';
    const created = await request('POST', { data, purpose: 'Zusammenhängende Motive' });
    assert.equal(created.code, 200);
    const list = (await request('GET')).body.examples;
    assert.equal(list.length, 1); assert.equal(list[0].id, created.body.id);
    assert(!JSON.stringify(list).includes('PRIVATE'));
    assert.equal((await request('POST', { ...list[0], purpose: 'Geändert' })).body.revision, 2);
    assert.equal((await request('POST', list[0])).code, 409);
    assert.equal((await request('GET')).body.examples[0].purpose, 'Geändert');
    assert.equal((await request('POST', { data: { ...data, cards: [] }, purpose: '' })).code, 400);
    assert.equal((await request('DELETE')).code, 405);
  } finally { db.close(); if (previous) require.cache[dbPath] = previous; else delete require.cache[dbPath]; delete require.cache[handlerPath]; }
});
