#!/usr/bin/env python3
"""
Generate responsive WebP variants (480w and 720w) for blog post covers.
Usage:
    python tools/generate_cover_variants.py
"""

import os
import glob
from PIL import Image

def generate_cover_variants():
    posts_dir = os.path.join('assets', 'img', 'posts')
    if not os.path.isdir(posts_dir):
        print(f"Directory not found: {posts_dir}")
        return

    pattern = os.path.join(posts_dir, '*-cover.webp')
    cover_files = [f for f in glob.glob(pattern) if not f.endswith(('-480w.webp', '-720w.webp'))]

    print(f"Found {len(cover_files)} post cover(s) to process:")

    for cover_path in sorted(cover_files):
        base, _ = os.path.splitext(cover_path)
        # Look for the highest-resolution source image (e.g. original .png or .jpg)
        source_path = cover_path
        for candidate_ext in ['.png', '.jpg', '.jpeg']:
            candidate = base + candidate_ext
            if os.path.exists(candidate):
                try:
                    with Image.open(candidate) as cand_im:
                        with Image.open(source_path) as curr_im:
                            if cand_im.size[0] > curr_im.size[0]:
                                source_path = candidate
                except Exception:
                    pass

        with Image.open(source_path) as im:
            # Ensure RGB mode (discard alpha if unused or convert to RGB)
            if im.mode in ('RGBA', 'LA') and not any(pixel[3] < 255 for pixel in im.getdata() if len(pixel) > 3):
                im = im.convert('RGB')
            elif im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGB')

            w, h = im.size
            aspect = h / float(w)
            print(f"\nProcessing {os.path.basename(cover_path)} (source: {os.path.basename(source_path)}, {w}x{h}):")

            for target_w in [480, 720]:
                target_h = int(round(target_w * aspect))
                out_path = f"{base}-{target_w}w.webp"
                resized = im.resize((target_w, target_h), Image.Resampling.LANCZOS)
                resized.save(out_path, 'WEBP', quality=82, method=6)
                out_size = os.path.getsize(out_path)
                print(f"  -> Generated {os.path.basename(out_path)}: {target_w}x{target_h} ({out_size:,} bytes)")

    print("\nResponsive cover generation complete.")

if __name__ == '__main__':
    generate_cover_variants()
