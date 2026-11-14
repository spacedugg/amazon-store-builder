import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { CLAUDE_SKILL, STORY_PATTERNS, STORY_SCHEMA } from '../src/brandStoryPrompt.mjs';
const root = new URL('../', import.meta.url);

test('portable Claude package includes deterministic skill and both loaded references', async () => {
  execFileSync('node', ['scripts/build-brand-story-skill.mjs'], { cwd: root });
  const archive = new URL('../public/brand-story-claude/amazon-brand-story.zip', import.meta.url);
  const before = await readFile(archive);
  const entries = JSON.parse(execFileSync('python3', ['-c', 'import json,zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({n:z.read(n).decode() for n in z.namelist()}))', archive.pathname], { encoding: 'utf8' }));
  assert.deepEqual(Object.keys(entries), ['amazon-brand-story/SKILL.md', 'amazon-brand-story/references/story-patterns.md', 'amazon-brand-story/references/story-schema.json']);
  assert.equal(entries['amazon-brand-story/SKILL.md'], CLAUDE_SKILL);
  assert.equal(entries['amazon-brand-story/references/story-patterns.md'], STORY_PATTERNS);
  assert.deepEqual(JSON.parse(entries['amazon-brand-story/references/story-schema.json']), STORY_SCHEMA);
  execFileSync('node', ['scripts/build-brand-story-skill.mjs'], { cwd: root });
  assert.deepEqual(await readFile(archive), before);
});

test('reference patterns explain all six brands in their original assignment context', () => {
  for (const brand of ['MyPuzzle', 'PROCREA', 'IGLIANOS', 'OMNI RELAX', 'Bachgold', 'Sanquell']) assert(STORY_PATTERNS.includes(brand));
  assert.match(STORY_PATTERNS, /Fotopuzzle/);
  assert.match(STORY_PATTERNS, /kleines Sortiment/);
  assert.match(CLAUDE_SKILL, /Quelle, Zeitraum, Marktplatz und Messgröße/);
  assert.match(CLAUDE_SKILL, /Designer entscheidet/);
  assert(!CLAUDE_SKILL.includes('"$schema"'));
});
