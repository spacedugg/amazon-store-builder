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
 for name in ['CLAUDE.md','docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md']:
  assert z.read(prefix+name) == (root/name).read_bytes()
 files=[p for p in (root/'data/store-knowledge').rglob('*') if p.is_file()]
 for p in files:
  assert z.read(prefix+p.relative_to(root).as_posix()) == p.read_bytes()
 print(json.dumps({'files':len(files),'entries':len(z.namelist())}))
`, fileURLToPath(new URL('../', import.meta.url))], { encoding: 'utf8' }));
  assert.ok(result.files > 0);
  assert.equal(result.entries, result.files + 3);
});
