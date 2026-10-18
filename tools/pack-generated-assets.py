#!/usr/bin/env python3
"""生成原本を変更せず、ゲーム配信用の縮小・圧縮版と一覧を作る。Pillow が必要。"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/generated'
DEST = ROOT / 'assets/runtime'
manifest = json.loads((SOURCE / 'manifest.json').read_text())
entries = []
for asset in manifest['generated']:
    category, ident = asset['category'], asset['id']
    pixel = ident in ('heroPixelStone', 'maouPixelStone')
    size = 320 if category == 'items' else 512
    source = SOURCE / asset['path']
    target = DEST / category / f'{ident}.webp'
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert('RGBA' if category == 'items' else 'RGB')
        image.thumbnail((size, size), Image.Resampling.NEAREST if pixel else Image.Resampling.LANCZOS)
        image.save(target, 'WEBP', lossless=pixel, quality=88, method=6, exact=True)
        entries.append({'id': ident, 'category': category, 'path': target.relative_to(DEST).as_posix(),
                        'dimensions': list(image.size), 'bytes': target.stat().st_size})
(DEST / 'manifest.json').write_text(json.dumps({'version': 1, 'assets': entries}, ensure_ascii=False, indent=2) + '\n')
groups = {c: [a['id'] for a in entries if a['category'] == c] for c in ('items', 'materials')}
js = '// tools/pack-generated-assets.py から生成。原本は assets/generated に保存。\n'
for category, ids in groups.items():
    js += f'export const {category.upper()}_ART = new Set({json.dumps(ids)});\n'
js += "export const artURL = (category, id) => new URL(`../../assets/runtime/${category}/${id}.webp`, import.meta.url).href;\n"
(ROOT / 'src/data/generated-art.js').write_text(js)
total = sum(a['bytes'] for a in entries)
print(f'{len(entries)} images: {total / 1024 / 1024:.2f} MiB (originals preserved)')
