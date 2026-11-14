import { mkdir, writeFile } from 'node:fs/promises';
import { CLAUDE_SKILL, STORY_SCHEMA } from '../src/brandStoryPrompt.mjs';
import { execFileSync } from 'node:child_process';
const dir = new URL('../public/brand-story-claude/', import.meta.url);
await mkdir(dir, { recursive: true });
await writeFile(new URL('SKILL.md', dir), CLAUDE_SKILL);
await writeFile(new URL('story-schema.json', dir), JSON.stringify(STORY_SCHEMA, null, 2) + '\n');
execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'temoa-brand-story.zip','w',zipfile.ZIP_DEFLATED) as z:
 z.write(p/'SKILL.md','temoa-brand-story/SKILL.md')
`, dir.pathname]);
process.stdout.write('Claude skill, JSON schema and portable package generated.\n');
