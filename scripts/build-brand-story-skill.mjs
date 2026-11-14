import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CLAUDE_SKILL, STORY_PATTERNS, STORY_SCHEMA } from '../src/brandStoryPrompt.mjs';
import { execFileSync } from 'node:child_process';

const dir = new URL('../public/brand-story-claude/', import.meta.url);
const schema = JSON.stringify(STORY_SCHEMA, null, 2) + '\n';
await mkdir(new URL('references/', dir), { recursive: true });
await writeFile(new URL('SKILL.md', dir), CLAUDE_SKILL);
await writeFile(new URL('references/story-patterns.md', dir), STORY_PATTERNS);
await writeFile(new URL('references/story-schema.json', dir), schema);
// Keep the existing direct schema download URL compatible.
await writeFile(new URL('story-schema.json', dir), schema);
execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'amazon-brand-story.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in ['SKILL.md','references/story-patterns.md','references/story-schema.json']:
  info=zipfile.ZipInfo('amazon-brand-story/'+name,date_time=(2026,1,1,0,0,0))
  info.compress_type=zipfile.ZIP_DEFLATED
  info.create_system=3
  info.external_attr=0o100644 << 16
  z.writestr(info,(p/name).read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
`, dir.pathname]);
// Preserve the existing download URL for previously shared links.
await writeFile(new URL('temoa-brand-story.zip', dir), await readFile(new URL('amazon-brand-story.zip', dir)));
process.stdout.write('Claude organization skill, references and deterministic portable package generated.\n');
