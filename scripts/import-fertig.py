"""Import the Year 2 datasets downloaded through Zen and their referenced images."""
import ssl, certifi
import concurrent.futures, hashlib, json, pathlib, shutil, urllib.parse, urllib.request
ROOT = pathlib.Path(__file__).resolve().parents[1]
DOWNLOADS = pathlib.Path.home() / 'Downloads'
DEST = ROOT / 'lib/question-banks'
ASSETS = ROOT / 'public/question-banks'
ASSETS.mkdir(parents=True, exist_ok=True)
rawdir = DEST / 'originals'
rawdir.mkdir(exist_ok=True)
files = {'ds':'ds','dccn':'dccn','dsco':'dcso','dms':'dms','daa':'daa','ai':'ai','os':'os','dbs':'dbs','po':'po'}
tests = {'ds':'dstest','dccn':'dccntest','dsco':'dscotest','daa':'daatest','ai':'aitest','os':'ostest','dbs':'dbstest','po':'p&otext'}
assets = {}
def image_url(value):
 value = urllib.parse.unquote(value.strip())
 if value.startswith(('https://','http://')): return value
 value = value.lstrip('/')
 if value.startswith('data/'): value = value[5:]
 if not value.startswith(('question_images/','answer_images/')): value = 'question_images/' + value
 return 'https://fertig-flax.vercel.app/' + urllib.parse.quote(value, safe='/')
def local_images(images):
 result=[]
 for value in images or []:
  url=image_url(value)
  ext=pathlib.PurePosixPath(urllib.parse.urlparse(url).path).suffix or '.png'
  name=hashlib.sha256(url.encode()).hexdigest()[:20]+ext
  assets[url]=name
  result.append('/question-banks/'+name)
 return result
for key, source in files.items():
 path=DOWNLOADS/(source+'.json')
 if not path.exists(): raise RuntimeError('Missing browser download: '+str(path))
 raw=json.loads(path.read_text())
 shutil.copy(path,rawdir/(source+'.json'))
 bank={'source':f'https://fertig-flax.vercel.app/II/ds.html?key=2ndyear:{source}','questions':[]}
 for i,q in enumerate(raw):
  images=local_images(q.get('images',[]))
  bank['questions'].append({'id':f'{key}-{i+1}','year':str(q.get('source_year',q.get('year',''))),'difficulty':str(q.get('difficulty','')).title(),'text':q.get('question_text',q.get('question',q.get('text',''))),'solution':q.get('solution',''),'hasImage':bool(images),'needsSource':False,'images':images})
 (DEST/(key+'.json')).write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
for key, source in tests.items():
 path=DOWNLOADS/(source+'.json')
 raw=json.loads(path.read_text())
 shutil.copy(path,rawdir/(source+'.json'))
 for q in raw:q['images']=local_images(q.get('images',[]))
 (DEST/(key+'-tests.json')).write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n')
def download(item):
 url,name=item;path=ASSETS/name
 if path.exists() and path.stat().st_size:return
 browser_copy = DOWNLOADS / name
 if browser_copy.exists() and browser_copy.read_bytes().startswith(b'\x89PNG\r\n\x1a\n'):
  shutil.copy(browser_copy,path)
  return
 req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
 try:
  with urllib.request.urlopen(req,timeout=45,context=ssl.create_default_context(cafile=certifi.where())) as r:path.write_bytes(r.read())
 except urllib.error.HTTPError:
  fallback=url.replace('/question_images/','/answer_images/')
  if fallback == url: raise
  req=urllib.request.Request(fallback,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=45,context=ssl.create_default_context(cafile=certifi.where())) as r:path.write_bytes(r.read())
failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 futures={pool.submit(download,item):item[0] for item in assets.items()}
 for future in concurrent.futures.as_completed(futures):
  try:future.result()
  except Exception as e:failures.append({'url':futures[future],'error':str(e)})
(DEST/'asset-manifest.json').write_text(json.dumps({'assets':assets,'failures':failures},indent=2)+'\n')
for dataset in DEST.glob('*.json'):
 if dataset.name == 'asset-manifest.json': continue
 data=json.loads(dataset.read_text())
 questions=data.get('questions',[]) if isinstance(data,dict) else data
 for q in questions:
  missing=[image for image in q.get('images',[]) if not (ROOT/'public'/image.lstrip('/')).exists()]
  if missing:
   q['images']=[image for image in q['images'] if image not in missing]
   q['needsSource']=True
   q['missingImages']=True
 dataset.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(files)} banks, {len(tests)} test datasets, {len(assets)-len(failures)}/{len(assets)} images')
if failures: print(json.dumps(failures,indent=2));raise SystemExit(1)
