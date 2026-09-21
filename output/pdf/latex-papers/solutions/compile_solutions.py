from pathlib import Path
import json,subprocess
import fitz
P=Path(__file__).resolve().parent
items=json.loads((P.parent/'manifest.json').read_text())
for item in items:
    src=P/(item['file']+'-solutions.tex')
    logpath=src.with_suffix('.build.txt')
    with logpath.open('w') as log:
        r=subprocess.run(['tectonic',str(src),'--keep-logs'],cwd=P,stdout=log,stderr=subprocess.STDOUT)
    if r.returncode:raise RuntimeError(logpath.read_text())
    doc=fitz.open(src.with_suffix('.pdf'))
    for page in doc:
        t=page.get_text()
        assert 'by paper.shrit.in' in t and 'normal' in t
        assert 'PayPal' not in t
    log=src.with_suffix('.log').read_text()
    assert 'Missing character:' not in log,src
    print(src.stem,len(doc),'pages','OVERFULL' if 'Overfull' in log else 'clean',flush=True)
for name,group in [('set-a-ensemble-solutions',items[:5]),('set-b-original-solutions',items[5:]),('all-10-solutions',items)]:
    doc=fitz.open();toc=[]
    for item in group:
        toc.append([1,item['subject']+' | '+item['set'],len(doc)+1])
        with fitz.open(P/(item['file']+'-solutions.pdf')) as part:doc.insert_pdf(part)
    doc.set_toc(toc);doc.save(P/(name+'.pdf'))
print('Combined solutions complete',flush=True)
