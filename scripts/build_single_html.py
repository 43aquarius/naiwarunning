#!/usr/bin/env python3
"""生成奶蛙桌宠单文件 HTML：将 atlas webp + 2 个 mp3 base64 注入模板。"""
import base64
from pathlib import Path

SRC = Path('/home/z/my-project/public/assets/pet')
TEMPLATE = Path('/home/z/my-project/scripts/naiwa-pet.html.template')
OUT = Path('/home/z/my-project/export/naiwa-pet/single-html/naiwa-pet.html')

def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode('ascii')

html = TEMPLATE.read_text(encoding='utf-8')
html = html.replace('__ATLAS_B64__', b64(SRC / 'naiwa-pet-atlas.webp'))
html = html.replace('__SMILE_B64__', b64(SRC / 'smile.mp3'))
html = html.replace('__LAUGH_B64__', b64(SRC / 'laugh.mp3'))

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding='utf-8')
size_mb = OUT.stat().st_size / 1024 / 1024
print(f'已生成 {OUT}（{size_mb:.2f} MB）')
assert '__ATLAS_B64__' not in html and '__SMILE_B64__' not in html and '__LAUGH_B64__' not in html
print('占位符全部替换完成')
