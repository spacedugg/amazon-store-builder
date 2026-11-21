import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Package the canonical instructions together with every referenced knowledge file.
// Keep generated archives out of git; build/test create the downloadable release.
execFileSync('python3', ['-c', `import zipfile,sys
from pathlib import Path
root=Path(sys.argv[1])
out=root/'public/brand-store-claude/amazon-storefront-design.zip'
out.parent.mkdir(parents=True,exist_ok=True)
files=[(root/'.claude/skills/amazon-storefront-design/SKILL.md','SKILL.md'),(root/'CLAUDE.md','CLAUDE.md'),(root/'docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md','docs/BLUEPRINT_EXTRACTION_PROMPT_V4.md')]
knowledge=root/'data/store-knowledge'
required=[knowledge/name for name in ['_voice_marker_vocabulary.md','_hero_archetype_vocabulary.md','_page_architecture_pattern_vocabulary.md','_reference_style_profiles.json']]
required += sorted((knowledge/'rerun-v4').glob('*_analysis.json'))
required += sorted((knowledge/'rerun-v4/blueprints').glob('*.json'))
if not list((knowledge/'rerun-v4').glob('*_analysis.json')) or not list((knowledge/'rerun-v4/blueprints').glob('*.json')):
 raise RuntimeError('The required v4 knowledge base is missing')
files += [(p,p.relative_to(root).as_posix()) for p in required]
if len(files)>200:
 raise RuntimeError('Claude skill ZIP exceeds the maximum of 200 files; curate the referenced knowledge before publishing')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for path,name in files:
  info=zipfile.ZipInfo('amazon-storefront-design/'+name,date_time=(2026,1,1,0,0,0))
  info.compress_type=zipfile.ZIP_DEFLATED
  info.create_system=3
  info.external_attr=0o100644 << 16
  z.writestr(info,path.read_bytes(),compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
print('Portable Brand Store Claude skill generated ('+str(len(files))+' files).')
`, fileURLToPath(new URL('../', import.meta.url))], { stdio: 'inherit' });
