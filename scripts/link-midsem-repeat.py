"""Include the free practice papers in Repeat's midsem AI exam workspace."""
from pathlib import Path
import json,fitz,hashlib
root=Path('public/repeat-v2');index=json.loads((root/'index.json').read_text());curated=[]
for f in sorted(Path('public/midsem/papers').glob('*.json')):
 p=json.loads(f.read_text());folder=root/'assets'/p['id'];folder.mkdir(exist_ok=True)
 pages=[]
 pdf_path=Path('public'+p['paperUrl'].split('?')[0])
 version=hashlib.sha256(pdf_path.read_bytes()).hexdigest()[:12]
 with fitz.open(pdf_path) as doc:
  for i,page in enumerate(doc):
   pix=page.get_pixmap(matrix=fitz.Matrix(1.7,1.7));name=f'page-{i+1}-{version}.jpg';pix.save(folder/name)
   pages.append({'number':i+1,'image':f'/repeat-v2/assets/{p["id"]}/{name}','width':pix.width,'height':pix.height,'method':'direct-visual-transcription','status':'complete'})
 membership={'academicYear':2,'semester':'Semester 3','branch':'CSE','examType':'MIDSEM','subject':p['subject']}
 record={**membership,'id':p['id'],'name':p['subjectCode']+' Midsem practice · '+p['authorLabel'],'subjectCode':p['subjectCode'],'examYear':None,'href':p['paperUrl'],'sourceFiles':[{'href':p['paperUrl'],'name':p['subject']}],'memberships':[membership],'pageCount':len(pages),'questionCount':len(p['questions']),'status':'complete','authorLabel':p['authorLabel'],'provenance':p['provenance']}
 qs=[{'id':q['id'],'number':q['number'],'type':q['type'],'markdown':q['markdown'],'marks':q['marks'],'pageNumbers':[page['number'] for page in pages],'diagrams':[],'sourceImages':[],'confidence':'high','reviewNotes':[p['provenance']],'preparedSolution':q['solution']} for q in p['questions']]
 (root/'papers'/f'{p["id"]}.json').write_text(json.dumps({**record,'questions':qs,'pages':pages,'warnings':[p['scopeNote']]},ensure_ascii=False,indent=2));curated.append(record)
ids={p['id'] for p in curated};index['papers']=[p for p in index['papers'] if p['id'] not in ids]+curated
index['stats']['uniquePapers']=len(index['papers']);index['stats']['questions']=sum(p['questionCount'] for p in index['papers']);index['stats']['pages']=sum(p['pageCount'] for p in index['papers']);index['stats']['completePapers']=sum(p['status']=='complete' for p in index['papers'])
(root/'index.json').write_text(json.dumps(index,ensure_ascii=False,indent=2));print('Linked ten practice papers into the AI exam workspace.')
