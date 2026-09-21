"""Refresh the combined practice PDF and editable ZIPs after compilation."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
import shutil
import fitz

root = Path(__file__).resolve().parents[1]
pack = root / 'output/pdf/latex-papers'
items = json.loads((pack / 'manifest.json').read_text())
combined = fitz.open()
bookmarks = []
for item in items:
    title = item['subject'] + ' | ' + item['set']
    bookmarks.append([1, title, len(combined) + 1])
    for label, source in [
        ('Questions', pack / (item['file'] + '.pdf')),
        ('Solutions', pack / 'solutions' / (item['file'] + '-solutions.pdf')),
    ]:
        bookmarks.append([2, label, len(combined) + 1])
        with fitz.open(source) as part:
            combined.insert_pdf(part)
combined.set_toc(bookmarks)
combined.save(pack / 'all-papers-and-solutions.pdf')
combined.close()

destination = root / 'output/pdf/paper-shrit-in-papers-and-solutions.zip'
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for source in sorted(pack.rglob('*')):
        if not source.is_file() or '__pycache__' in source.parts:
            continue
        if source.suffix not in {'.pdf', '.tex', '.py', '.md', '.json', '.png', '.c', '.v'}:
            continue
        archive.write(source, source.relative_to(pack.parent))
shutil.copyfile(destination, root / 'output/pdf/manipal-format-10-papers.zip')
print('Updated combined questions/solutions PDF and both editable ZIPs.')
