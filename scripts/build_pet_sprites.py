#!/usr/bin/env python3
"""奶蛙桌宠素材管线：四形态帧序列 → 单一 WebP 雪碧图。

对齐逻辑与原版桌宠 (naiwa-pet main.cpp alignToLaugh) 完全一致：
  idle / smile / laugh 均为 518×718，无需缩放；
  cry 为 389×641，按 X/Y 分别非均匀拉伸到 laugh 画框 518×718，
  保证四种形态切换时角色锚定位置不跳动。
输出：
  public/assets/pet/naiwa-pet-atlas.webp  8 列网格雪碧图（帧序 row-major）
  public/assets/pet/smile.mp3 / laugh.mp3 桌宠音效
"""
import os
import sys
import shutil
from PIL import Image

SRC = '/tmp/naiwa-pet/assets'
OUT = '/home/z/my-project/public/assets/pet'

FRAME_W, FRAME_H = 518, 718     # laugh 基准画框（对齐原版）
SCALE = 0.5                      # 输出半分辨率 259×359（显示 ≤360px 足够清晰）
COLS = 8                         # 雪碧图列数
QUALITY = 85                     # WebP 质量

FORMS = [
    ('idle',  58, True),   # (目录, 帧数, 是否循环) —— 与原版一致
    ('smile',  9, False),  # 单次 750ms = 9 × 1/12
    ('laugh', 68, False),  # 单次 5667ms = 68 × 1/12
    ('cry',   39, True),   # 循环直到状态解除
]

def load_form(name: str, count: int) -> list[Image.Image]:
    frames = []
    for i in range(1, count + 1):
        path = os.path.join(SRC, name, f'{name}_{i:02d}.png')
        img = Image.open(path).convert('RGBA')
        # 对齐 laugh 画框：非均匀拉伸到 518×718（原版 alignToLaugh 逻辑）
        if img.size != (FRAME_W, FRAME_H):
            img = img.resize((FRAME_W, FRAME_H), Image.LANCZOS)
        # 半分辨率输出
        img = img.resize((round(FRAME_W * SCALE), round(FRAME_H * SCALE)), Image.LANCZOS)
        frames.append(img)
    return frames

def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    all_frames: list[Image.Image] = []
    manifest = {}
    start = 0
    for name, count, loop in FORMS:
        frames = load_form(name, count)
        assert len(frames) == count, f'{name}: 期望 {count} 帧, 实得 {len(frames)}'
        all_frames.extend(frames)
        manifest[name] = {'start': start, 'frames': count, 'loop': loop}
        start += count
        print(f'{name:6s} {count:3d} 帧  loop={loop}  start={manifest[name]["start"]}')

    total = len(all_frames)
    rows = (total + COLS - 1) // COLS
    fw, fh = all_frames[0].size
    print(f'\n总计 {total} 帧 → {COLS} 列 × {rows} 行，单元 {fw}×{fh}，画布 {COLS*fw}×{rows*fh}')

    atlas = Image.new('RGBA', (COLS * fw, rows * fh), (0, 0, 0, 0))
    for idx, img in enumerate(all_frames):
        col, row = idx % COLS, idx // COLS
        atlas.paste(img, (col * fw, row * fh))

    atlas_path = os.path.join(OUT, 'naiwa-pet-atlas.webp')
    atlas.save(atlas_path, 'WEBP', quality=QUALITY, method=6)
    print(f'雪碧图: {atlas_path}  {os.path.getsize(atlas_path)/1024:.0f} KB')

    # 复制音效
    for s in ('smile.mp3', 'laugh.mp3'):
        src = os.path.join(SRC, 'sounds', s)
        if os.path.exists(src):
            shutil.copy(src, os.path.join(OUT, s))
            print(f'音效: {s}  {os.path.getsize(src)/1024:.0f} KB')
        else:
            print(f'警告: 缺少 {src}', file=sys.stderr)

    print('\nmanifest(嵌入 pet.ts):')
    print(f'frameW={fw} frameH={fh} fps=12 cols={COLS} total={total}')
    for k, v in manifest.items():
        print(f"  {k}: {{ start: {v['start']}, frames: {v['frames']}, loop: {str(v['loop']).lower()} }},")

if __name__ == '__main__':
    main()
