#!/usr/bin/env python
"""Convert goodie preview PNGs to WebP alongside the originals (PNG kept as fallback).

Generates:
  <name>.webp            full-width preview (max 960w, q85)
  <name>.480.webp        card-size thumbnail (480w, q85)

Idempotent: skips conversion unless the source PNG is newer than the WebP.
"""
from pathlib import Path
from PIL import Image

DIR = Path(__file__).resolve().parents[1] / 'assets' / 'img' / 'goodies'

def main():
    for png in sorted(DIR.glob('*.png')):
        base = png.stem
        src = Image.open(png).convert('RGB')
        w, h = src.size
        targets = [('webp', 960), ('480.webp', 480)]
        for suffix, max_w in targets:
            out = DIR / f'{base}.{suffix}'
            if out.exists() and out.stat().st_mtime >= png.stat().st_mtime:
                continue
            if w > max_w:
                ratio = max_w / w
                im = src.resize((max_w, round(h * ratio)), Image.LANCZOS)
            else:
                im = src.copy()
            im.save(out, 'WEBP', quality=85, method=4)
            print(f'{out.name}: {out.stat().st_size // 1024} KB  (from {png.name} {png.stat().st_size // 1024} KB)')

if __name__ == '__main__':
    main()
