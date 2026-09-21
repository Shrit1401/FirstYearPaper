"""Refresh hosted-asset inventory for practice papers without touching archives.

Run after exporting/linking midsem content, then upload-convex-assets.mjs to
upload new hashes and refresh the local asset map before the app is deployed.
"""
from pathlib import Path
import hashlib
import json

root = Path(__file__).resolve().parents[1]
public = root / 'public'
inventory_path = root / 'output/asset-inventory.json'
inventory = json.loads(inventory_path.read_text())
paper_ids = [p['id'] for p in json.loads((public / 'midsem/index.json').read_text())['papers']]
folders = ['midsem'] + ['repeat-v2/assets/' + name for name in paper_ids]
prefixes = tuple('/' + folder + '/' for folder in folders)
inventory = [entry for entry in inventory if not entry['path'].startswith(prefixes)]
for folder in folders:
    for source in sorted((public / folder).rglob('*')):
        if not source.is_file() or source.suffix == '.json' or source.name == '.DS_Store':
            continue
        data = source.read_bytes()
        inventory.append({
            'path': '/' + source.relative_to(public).as_posix(),
            'sha256': hashlib.sha256(data).hexdigest(),
            'size': len(data),
        })
inventory_path.write_text(json.dumps(inventory))
print('Refreshed asset inventory for the ten practice papers.')
