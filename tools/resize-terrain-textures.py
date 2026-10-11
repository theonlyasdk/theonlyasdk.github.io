#!/usr/bin/env python
"""Resize procedural-terrain textures to a 1024px budget (in place, backup originals).

Perf doc: triplanar uvScale 0.032 repeats textures ~32x per 120m chunk, so
visible texel density is dominated by repeat, not source resolution. POV:
2048px sources cost 4x VRAM and 4x download for imperceptible gain.
Keeps original files as *.orig.jpg next to the new file for easy revert.
Idempotent: skips files whose non-.orig sibling already exists <= 1024px.
"""
from pathlib import Path
from PIL import Image

DIR = Path(__file__).resolve().parents[1] / 'goodies' / 'procedural-terrain' / 'textures' / 'terrain'
MAX = 1024

def main():
    for jpg in sorted(DIR.glob('*.jpg')):
        if jpg.name.endswith('.orig.jpg'):
            continue
        orig = jpg.with_suffix('.orig.jpg')
        if orig.exists():
            src_path = orig          # always source from the untouched original
        else:
            orig.write_bytes(jpg.read_bytes())
            src_path = orig
        src = Image.open(src_path)
        w, h = src.size
        if max(w, h) <= MAX:
            continue                 # already within budget
        ratio = MAX / max(w, h)
        out = src.resize((round(w * ratio), round(h * ratio)), Image.LANCZOS)
        out.save(jpg, 'JPEG', quality=85, optimize=True, progressive=True)
        new_kb = jpg.stat().st_size // 1024
        old_kb = orig.stat().st_size // 1024
        print(f'{jpg.name}: {w}x{h} -> {out.size[0]}x{out.size[1]}  {old_kb} KB -> {new_kb} KB')

if __name__ == '__main__':
    main()
