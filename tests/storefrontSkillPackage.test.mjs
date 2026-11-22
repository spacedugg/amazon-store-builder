import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('portable Claude skill contains canonical instructions and its complete local knowledge base', () => {
  const result = JSON.parse(execFileSync('python3', ['-c', `import zipfile,json,sys
from pathlib import Path
root=Path(sys.argv[1])
with zipfile.ZipFile(root/'public/brand-store-claude/amazon-storefront-design.zip') as z:
 assert z.testzip() is None
 prefix='amazon-storefront-design/'
 assert all(n.startswith(prefix) and '..' not in n.split('/') for n in z.namelist())
 assert z.read(prefix+'SKILL.md') == (root/'.claude/skills/amazon-storefront-design/SKILL.md').read_bytes()
 for name in ['CLAUDE.md','docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md','scripts/read-reference-pages.py']:
  assert z.read(prefix+name) == (root/name).read_bytes()
 knowledge=root/'data/store-knowledge'
 files=[knowledge/name for name in ['_voice_marker_vocabulary.md','_hero_archetype_vocabulary.md','_page_architecture_pattern_vocabulary.md','_reference_style_profiles.json']]
 files+=sorted((knowledge/'rerun-v4').glob('*_analysis.json'))
 files+=sorted((knowledge/'rerun-v4/blueprints').glob('*.json'))
 parts=sorted((knowledge/'reference-pages').glob('part-*.json'))
 assert len(parts)==12
 files+=parts
 assert 0<len(z.namelist())<=200
 assert not any('/raw-dom/' in name or '/page-lists/' in name for name in z.namelist())
 for p in files:
  assert z.read(prefix+p.relative_to(root).as_posix()) == p.read_bytes()
 print(json.dumps({'files':len(files),'entries':len(z.namelist())}))
`, fileURLToPath(new URL('../', import.meta.url))], { encoding: 'utf8' }));
  assert.ok(result.files > 0);
  assert.ok(result.entries <= 200, 'Claude rejects more than 200 files');
  assert.equal(result.entries, result.files + 4);
});
