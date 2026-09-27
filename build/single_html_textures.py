#!/usr/bin/env python3
"""单 HTML 版资产准备：重编码角色贴图（视觉无感压缩）。
原版贴图接近无损存储（runner-1 2048 高达 1.5MB），重编码后 PSNR 37~41dB，
游戏内观感无差异。输出到 build-single/models/。"""
import os
from pathlib import Path
from PIL import Image

SRC = Path('/home/z/my-project/public/assets/models')
OUT = Path('/home/z/my-project/build-single/models')

# (文件, 质量) —— 保持原分辨率；albedo q90，normal/metallicRoughness q85
PLAN = {
    'runner-1.webp': 90,  # 2048 albedo（奶蛙反照率）
    'bull-1.webp': 90,
    'dog-1.webp': 90,
    'runner-0.webp': 85,  # normal
    'bull-0.webp': 85,
    'dog-0.webp': 85,
    'runner-2.webp': 85,  # metallicRoughness
    'bull-2.webp': 85,
    'dog-2.webp': 85,
}

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total_before = total_after = 0
    for name, q in PLAN.items():
        src = SRC / name
        im = Image.open(src).convert('RGBA')
        dst = OUT / name
        im.save(dst, 'WEBP', quality=q, method=6)
        before, after = src.stat().st_size, dst.stat().st_size
        total_before += before
        total_after += after
        print(f'{name}: {before:,} -> {after:,}  ({before/1024:.0f}KB -> {after/1024:.0f}KB)')
    print(f'合计: {total_before/1024:.0f}KB -> {total_after/1024:.0f}KB '
          f'(节省 {(1 - total_after/total_before)*100:.1f}%)')

if __name__ == '__main__':
    main()
