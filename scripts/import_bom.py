"""Read a supplied workbook without modifying it; retain row provenance."""
import json, sys, hashlib
from pathlib import Path
import openpyxl
source = Path(sys.argv[1])
sheet = openpyxl.load_workbook(source, read_only=True, data_only=True)['BOM Data']
products, materials, lines, excluded = {}, {}, [], []
for number, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 2):
    pid, description, mid, material, quantity = row
    if not all(x is not None for x in row) or not isinstance(quantity, (int, float)) or quantity <= 0:
        excluded.append({'row': number, 'values': list(row)})
        continue
    pid, mid = str(pid), str(mid)
    products[pid] = {'id': pid, 'name': description}
    materials[mid] = {'id': mid, 'name': material, 'unit': 'pcs'}
    lines.append({'productId': pid, 'materialId': mid, 'quantity': quantity, 'sourceRow': number})
result = {'source': source.name, 'sheet': sheet.title, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'products': list(products.values()), 'materials': list(materials.values()), 'lines': lines, 'excluded': excluded}
destination = Path(__file__).resolve().parents[1] / 'data' / 'bom.json'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Imported {len(products)} products, {len(materials)} materials, {len(lines)} BOM lines. Excluded {len(excluded)} non-data rows.')
