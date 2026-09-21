"""Export the authored LaTeX papers and worked answers as public web content.
No paid model or API is used. Run from the repository root after PDF compilation.
"""
from pathlib import Path
from datetime import date
import json,runpy,subprocess,re,shutil,fitz,hashlib
ROOT=Path.cwd();PACK=ROOT/'output/pdf/latex-papers';OUT=ROOT/'public/midsem'
for d in ['papers','solutions','figures']: (OUT/d).mkdir(parents=True,exist_ok=True)
questions=runpy.run_path(str(PACK/'build.py'))
solutions=runpy.run_path(str(PACK/'solutions/build_solutions.py'))['S']
for f in (PACK/'solutions/figures').glob('*.pdf'):
 with fitz.open(f) as doc:doc[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(OUT/'figures'/f'{f.stem}.png')
shutil.copy(PACK/'dms-graph.png',OUT/'figures/dms-graph.png')
def markdown(tex):
 tex=re.sub(r'\\VerbatimInput(?:\[[^]]*\])?\{code/([^}]+)\}',lambda m:'\\begin{verbatim}\n'+(PACK/'solutions/code'/m[1]).read_text()+'\n\\end{verbatim}',tex)
 tex=re.sub(r'\\includegraphics(?:\[[^]]*\])?\{(?:figures/)?([^}]+)\}',lambda m:r'\includegraphics{/midsem/figures/'+Path(m[1]).stem+'.png}',tex)
 tex=tex.replace(r'\renewcommand{\arraystretch}{1.2}','')
 result=subprocess.run(['pandoc','-f','latex','-t','gfm+tex_math_dollars','--wrap=none'],input=tex,text=True,capture_output=True,check=True).stdout
 # Use safe inline HTML only for no content: strip Pandoc layout wrappers; ReactMarkdown ignores them.
 result=re.sub(r'<div[^>]*>|</div>','',result).strip()
 result=result.replace('—',' - ')
 result=re.sub(r'\$`(.*?)`\$',lambda m:'$'+m[1]+'$',result,flags=re.S)
 return result
hints={
'DA':'Identify the statistic or hypothesis first. Write the formula, substitute the given values, then interpret the result in context.',
'DS':'State the input assumptions and the invariant. Trace an empty input and a boundary case before writing the final C code.',
'DCCN':'List the given quantities and convert units first. For protocols, trace the frames and acknowledgements in order.',
'DSCO':'Build a truth or state-transition table first. Derive the Boolean expressions before choosing the gates or flip-flop inputs.',
'DMS':'Write the definitions and constraints first. For a proof, identify the key property; for a count, check small cases.'}
index=[];ids=[]
for m in json.loads((PACK/'manifest.json').read_text()):
 name=m['file'];code=name.split('-')[0].upper();kind=m['set'];p=questions['papers'][code]
 raw=questions['formatted_papers'][name]
 qs=[]
 for i,(q,(label,title,answer)) in enumerate(zip(raw,solutions[name],strict=True)):
  qt=q.get('latex') or questions['tex'](q['text'])
  if q.get('image'): qt+=r'\includegraphics{dms-graph.png}'
  question_markdown=markdown(qt)
  if q['type']=='mcq':
   question_markdown=markdown(q['prompt'])+'\n\n'+'\n\n'.join(
    '**('+letter+')** '+markdown(option) for letter,option in zip('ABCD',q['options']))
  qid=name+'-'+q['id_suffix'];ids.append(qid)
  qs.append({'id':qid,'number':label,'title':title,'type':q['type'],'marks':q['marks'],'markdown':question_markdown,'solution':markdown(answer),'hint':'Choose the single correct option.' if q['type']=='mcq' else hints[code],
     'source':{'paper':q.get('source'),'question':q.get('original')} if q.get('source') else None})
 note=re.sub(r' Q1 and Q2 are assigned 6 marks each instead of the original 5 to make a 30-mark practice paper\.', '', p['note'])
 note=re.sub(r' Q9 is assigned 4 marks instead of the source 3\.', '', note)
 note=note.replace('Q10 on byte/word addressing','The question on byte/word addressing')
 note+=' Format: five MCQs worth 1 mark each, followed by 25 marks of theory questions.'
 if name=='dms-ensemble': note+=' The multipart divisibility-poset theory question carries 5 marks.'
 paper_version=hashlib.sha256((PACK/f'{name}.pdf').read_bytes()).hexdigest()[:12]
 solution_version=hashlib.sha256((PACK/'solutions'/f'{name}-solutions.pdf').read_bytes()).hexdigest()[:12]
 record={'id':name,'subject':m['subject'],'subjectCode':questions['codes'][code],'set':kind,'authorLabel':'Endsem Papers' if kind=='ensemble' else 'AI generated',
   'provenance':'Endsem Papers: theory questions adapted from existing Manipal papers, with five newly authored MCQs on selected topics. Worked solutions are AI-authored and computationally checked where applicable.' if kind=='ensemble' else 'AI generated questions and worked solutions, typeset in the Manipal practice format. Computational checks cover applicable answers.',
   'scope':p['scope'],'scopeNote':note,'marks':30,'mcqCount':5,'mcqMarks':5,'theoryMarks':25,'durationMinutes':90,'questionCount':len(qs),'paperUrl':f'/midsem/papers/{name}.pdf?v={paper_version}','solutionsUrl':f'/midsem/solutions/{name}-solutions.pdf?v={solution_version}','questions':qs}
 (OUT/'papers'/f'{name}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
 index.append({k:v for k,v in record.items() if k!='questions'})
 shutil.copy(PACK/f'{name}.pdf',OUT/'papers')
 shutil.copy(PACK/'solutions'/f'{name}-solutions.pdf',OUT/'solutions')
(OUT/'index.json').write_text(json.dumps({'papers':index,'questionCount':len(ids),'attribution':'by paper.shrit.in','generatedAt':date.today().isoformat()},ensure_ascii=False,indent=2))
(ROOT/'lib/midsem-question-ids.json').write_text(json.dumps(ids))
shutil.copy(PACK/'all-papers-and-solutions.pdf',OUT/'all-papers-and-solutions.pdf')
shutil.copy(ROOT/'output/pdf/paper-shrit-in-papers-and-solutions.zip',OUT/'latex-and-solutions.zip')
print('Exported',len(index),'papers and',len(ids),'question/answer pairs without model calls')
