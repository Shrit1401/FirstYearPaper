"""Create a minimal, credential-free upload folder from explicit inputs."""
from pathlib import Path
import json,shutil,tempfile
root=Path.cwd(); dest=Path(tempfile.mkdtemp(prefix='papers-vercel-release-'))
assets=json.loads((root/'lib/convex-asset-map.json').read_text())
for directory in ['app','components','convex','hooks','lib','types','tests','scripts','docs']:
 shutil.copytree(root/directory,dest/directory,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
for filename in ['package.json','package-lock.json','next.config.ts','next-env.d.ts','tsconfig.json','postcss.config.mjs','eslint.config.mjs','proxy.ts','instrumentation-client.ts','components.json','.vercelignore']:
 shutil.copy2(root/filename,dest/filename)
for source in (root/'public').rglob('*'):
 if not source.is_file() or source.name=='.DS_Store': continue
 relative=source.relative_to(root/'public')
 if '/'+relative.as_posix() in assets: continue
 target=dest/'public'/relative;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
(dest/'.vercel').mkdir();shutil.copy2(root/'.vercel/repo.json',dest/'.vercel/repo.json')
files=[p for p in dest.rglob('*') if p.is_file()]
assert not any(p.name.startswith('.env') for p in files)
assert not (dest/'public/repeat-v2/assets').exists()
assert sum(p.stat().st_size for p in files)<200_000_000
(root/'output/vercel-release-path.txt').write_text(str(dest))
print(json.dumps({'directory':str(dest),'files':len(files),'bytes':sum(p.stat().st_size for p in files)}))
