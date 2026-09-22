#!/usr/bin/env python3
"""Import the hash-checked, OCR-reviewed midsems. Originals are never modified.

Usage: python3 scripts/import-second-year-midsems.py --ece <folder> --cse <folder>
Requires PyMuPDF. Review decisions and OCR coverage are in the adjacent JSON.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import fitz

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ece', type=Path, required=True)
parser.add_argument('--cse', type=Path, required=True)
args = parser.parse_args()
review = json.loads((ROOT / 'scripts/second-year-midsem-review.json').read_text())
folder = ROOT / 'public/midsem/imported'
folder.mkdir(parents=True, exist_ok=True)
# Validate every input before writing any assets.
for paper in review['papers']:
    for source in paper['sources']:
        path = getattr(args, paper['branch'].lower()) / source['relativePath']
        if hashlib.sha256(path.read_bytes()).hexdigest() != source['sha256']:
            raise ValueError(f'Unreviewed or changed source: {path}')
papers = []
labels = {'question': 'Question paper', 'solutions': 'Solutions', 'combined': 'Paper + solutions'}
for paper in review['papers']:
    files = []
    sources = []
    for source in paper['sources']:
        path = getattr(args, paper['branch'].lower()) / source['relativePath']
        name = f"{paper['id']}-{source['kind']}-{source['sha256'][:12]}.pdf"
        shutil.copyfile(path, folder / name)
        href = '/midsem/imported/' + name
        sources.append({**source, 'href': href})
        files.append({'kind': source['kind'], 'label': labels[source['kind']], 'href': href, 'pageCount': source['pageCount']})
    questions = [f for f in files if f['kind'] == 'question']
    if len(questions) > 1:
        combined = fitz.open()
        for file in questions:
            with fitz.open(ROOT / 'public' / file['href'].lstrip('/')) as doc:
                combined.insert_pdf(doc)
        data = combined.tobytes(garbage=4, deflate=True, no_new_id=True)
        name = f"{paper['id']}-question-{hashlib.sha256(data).hexdigest()[:12]}.pdf"
        (folder / name).write_bytes(data)
        files = [{'kind':'question','label':'Question paper','href':'/midsem/imported/'+name,'pageCount':len(combined)}] + [f for f in files if f['kind'] != 'question']
        combined.close()
    papers.append({**paper, 'sources': sources, 'files': files})
index = {'version':1, 'reviewedAt':review['reviewedAt'], 'sourceCount':37, 'sourcePages':275, 'papers':papers}
(ROOT / 'public/midsem/second-year-index.json').write_text(json.dumps(index, indent=2)+'\n')
subprocess.run(['node', 'scripts/sync-second-year-midsems.cjs'], cwd=ROOT, check=True)
print(f'Imported {len(papers)} exam sets from 37 reviewed PDFs.')
