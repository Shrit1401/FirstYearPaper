"""Deduplicate original PDFs without breaking URLs; inventory Convex assets."""
from pathlib import Path
import hashlib,json,shutil
root=Path('public'); backup=Path('output/duplicate-pdfs'); aliases={}; hashes={}
mapfile=Path('lib/pdf-aliases.json')
if mapfile.exists(): aliases=json.loads(mapfile.read_text())
for p in sorted(root.rglob('*.pdf')):
 if 'midsem' in p.parts: continue
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 url='/'+p.relative_to(root).as_posix()
 if digest in hashes:
  aliases[url]=hashes[digest]
  target=backup/p.relative_to(root); target.parent.mkdir(parents=True,exist_ok=True)
  shutil.move(str(p),str(target))
 else: hashes[digest]=url
mapfile.write_text(json.dumps(aliases,indent=2)+'\n')
assets=[]
for folder in ['repeat-v2/assets','midsem']:
 for p in sorted((root/folder).rglob('*')):
  if not p.is_file() or p.suffix=='.json': continue
  assets.append({'path':'/'+p.relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size':p.stat().st_size})
Path('output/asset-inventory.json').write_text(json.dumps(assets))
unique={x['sha256']:x['size'] for x in assets}
print(json.dumps({'pdfAliases':len(aliases),'uniqueOriginalPdfs':len(hashes),'convexPaths':len(assets),'convexUniqueFiles':len(unique),'convexBytes':sum(unique.values())}))
