"""Compile the ten standalone sources and assemble the delivery PDFs."""
from pathlib import Path
import subprocess, json
import fitz
p=Path(__file__).resolve().parent
items=json.loads((p/'manifest.json').read_text())
for item in items:
    source=p/(item['file']+'.tex')
    result=subprocess.run(['tectonic',str(source),'--keep-logs'],cwd=p,text=True,capture_output=True)
    (p/(item['file']+'.build.txt')).write_text(result.stdout+result.stderr)
    if result.returncode:raise RuntimeError(result.stdout+result.stderr)
    doc=fitz.open(source.with_suffix('.pdf'))
    print(source.stem,len(doc),'pages',flush=True)
    text=''.join(page.get_text() for page in doc)
    assert 'by paper.shrit.in' in text and 'normal' in text
    assert 2 <= len(doc) <= 3, (source,len(doc))
    log=source.with_suffix('.log').read_text()
    assert 'Missing character:' not in log, source
    assert 'Overfull' not in log, source
for name,group in [('set-a-ensemble',items[:5]),('set-b-original',items[5:]),('all-10-question-papers',items)]:
    doc=fitz.open()
    toc=[]
    for item in group:
        toc.append([1,item['subject']+' | '+item['set'],len(doc)+1])
        with fitz.open(p/(item['file']+'.pdf')) as part:doc.insert_pdf(part)
    doc.set_toc(toc)
    doc.save(p/(name+'.pdf'))
print('Combined PDFs created',flush=True)
