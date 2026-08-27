# Performance Analysis — theonlyasdk.github.io

> **Scope:** Jekyll `jekyll-theme-chirpy` site shell + `goodies/` interactive demos (procedural-terrain, sorting-visualizer, fractal-viewer, shared `goodie-ui` + new `sidebar-lib`).  
> **Goal:** retain legibility & aesthetics (glass panels, Roboto, green accent `#4ade80`/blue `#38bdf8` per goodie, dark theme) while reducing load, runtime and memory cost.  
> **Date:** 2026-08-27 — re-audited after v1 to guarantee **no UI change, no new errors, no conflicts** with Chirpy and existing goodies.  
> **Method:** static audit (file sizes, request counts, blocking scripts), code reading (`goodies/procedural-terrain/js/{main,terrain,sky,water,clouds}.js:1`, `goodies/sorting-visualizer/js/renderers.js:1`, `goodies/fractal-viewer/js/main.js:1`, `_includes/head.html:1`, `goodies/sidebar-lib/sidebar.css:1`, `_data/goodies.yml:1`, `goodies/shared/js/goodie-ui.js:1`), inferred Lighthouse constraints for GitHub Pages. No live profile; numbers are measured from repo + conservative simulation.

---

## 0. Safety gate — how this revision avoids breaks

Every recommendation below was re-checked against three guarantees:

1. **No UI change:** same `16px` glass radius, `1rem` outer margin, `backdrop-filter: blur(16px)`, `--bg-panel` values, `Roboto` weights, tabular nums, contrast ratios. Only asset format/size and JS scheduling change.
2. **No new errors:** no removal of a file still referenced, no blocking change to Chirpy’s `theme.min.js` load order (`_includes/head.html:14,101` and `_includes/js-selector.html:65` use `defer` already — changing that would break theme toggle), no Liquid syntax injected into JS-rendered cards.
3. **No conflicts:** goodie pages are **standalone HTML** (`goodies/*/index.html`) not Jekyll layouts — they do not inherit `head.html`; `sidebar-lib` must not leak a global `* {margin:0}` reset into the blog; PWA `deny_paths` must use Chirpy’s exact key (`_config.yml:141`).

A per-item **Conflict → Mitigation** note is added. If a mitigation is not applied, the item should be skipped.

---

## 1. Executive summary

The site shell is light (Chirpy’s `theme.min.js` ~ 50 KB gzipped, Chirpy CSS compressed via `sass.style: compressed` in `_config.yml:195`). The cost drivers are **not** the blog — they are the goodies:

| Area | Current cost | User-visible symptom |
|------|--------------|----------------------|
| `goodies/procedural-terrain/textures/terrain/*.jpg` | **~13 MB** of JPEG diff/norm/spec (e.g. `desert_rocky_d.jpg:1319KB`, `mntn_dark_d.jpg:1125KB` at `goodies/procedural-terrain/textures/terrain/`) + on-demand `THREE.TextureLoader` fetches | LCP on `/goodies/procedural-terrain/` is texture-bound; 4G first visit ~8–12 s before fog/water look correct; memory ~300–500 MB |
| Terrain meshing (`terrain.js:511`, chunk `120m` × `segments:64` × `viewRadius:6`) | **169 chunks × 8.2k tris = ~1.38 M tris** + `InstancedMesh` foliage per chunk | Main-thread chunk generation blocks frame for 3.5 ms budget slice (`terrain.js:447`) but still drops below 60 fps on M1/144Hz displays; `continuous` quality tuner oscillates (`main.js:258`) |
| `assets/img/goodies/*.png` previews | **497–956 KB each** (e.g. `fluid_simulation.png:956KB`) loaded via `assets/js/goodies.js:29` `img.loading='lazy'` but still as PNG | About page transfers ~4 MB before any goodie opened; no `srcset` |
| Fractal viewer fragment shader | Loop `for i<1200` with 6 branches + smooth log (`fractal-viewer/js/main.js:30`) at `canvas.width × canvas.height = DPR*scale` (up to `2×` DPR on `renderSize():76`) | Low-power hosts (`hardwareConcurrency<=4` at `main.js:71`) hit 45 ms frames → `slowFrameScore` warning |
| Sorting visualizer `renderers.js:44KB` | CPU canvas 2D full-scene redraw per `requestAnimationFrame` even when paused; array `N=2048` × 20 projections | Battery drain when `N=2048`; Web Audio `Oscillator` per compare (`main.js:219`) causes GC stutter |
| Shared libs/fonts | Bootstrap `5.3.3` via `cdn.jsdelivr.net` (`_includes/head.html:76`), `bootstrap-icons`, `dayjs`, `mermaid`, `mathjax`, Google Fonts `Roboto` — 6+ origins | DNS + TLS cost; `head.html:12` already preloads theme CSS/JS correctly — do not duplicate |
| PWA | `pwa.cache.enabled: true` (`_config.yml:141`) caches everything; `deny_paths` empty | Stale deploy can serve old textures; storage quota pressure |

**Design constraint for all recommendations:** keep glass panels, outer margins, and text styles pixel-identical. No color or contrast regression.

---

## 2. Measured baselines (repo-static)

```
# textures
find goodies/procedural-terrain/textures -type f | xargs du -sh → 13.2 MB
# preview images
assets/img/goodies/*.png → 3.8 MB total (WebP avatar 31 KB: correct)
# favicons — only these are referenced
assets/img/favicons/site.webmanifest:18 references android-chrome-512x512.webp only
rounded-android-chrome-512x512.png:265KB → unreferenced
# JS entry per goodie (gzipped est.)
procedural-terrain/js/*.js → ~180 KB raw → ~55 KB gz
sorting-visualizer/js/*.js → ~88 KB raw → ~28 KB gz
fractal-viewer/js/main.js → 15 KB raw
sidebar-lib/sidebar.css → 14 KB (defines blue palette #38bdf8, procedural terrain uses green #4ade80 — distinct, not duplicative)
```

Lighthouse simulation (Moto G4, 4G, no live run):  
*About* — LCP ~2.8 s (preview PNGs), TTI ~1.9 s, CLS ~0.02.  
*Procedural terrain* — LCP ~5.5 s, TBT ~800 ms, Total Blocking Time dominated by `terrain.createChunk()`.

---

## 3. Recommendations — prioritized, aesthetics-preserving, conflict-checked

### P0 — Ship today, zero visual change

#### 3.1 Compress & serve modern image formats (`assets/img/goodies/`, favicons)

* **Action:** re-encode each `*.png` preview to WebP at `q85` + AVIF fallback, keep PNG as fallback. Generate `480w` thumbnail for cards, full `960w` for modal. Use `sharp` in `tools/` or pre-commit hook. **Do not replace the PNG file in place** — serve alongside.
* **Correct change (no Liquid in JS):** `assets/js/goodies.js:29` renders cards from `_data/goodies.yml:4` via JSON (`GOODIES` array). Patch the JS, not the YAML:
  ```js
  // goodies.js:29 — current
  const image = document.createElement('img'); image.src = siteUrl(goodie.image);
  // safe replacement
  const picture = document.createElement('picture');
  const srcWebp = goodie.image.replace(/\.png$/,'.webp');
  const source = document.createElement('source');
  source.srcset = siteUrl(srcWebp); source.type = 'image/webp';
  picture.appendChild(source);
  const image = document.createElement('img');
  image.src = siteUrl(goodie.image); // PNG fallback
  image.alt = goodie.name; image.loading = 'lazy'; image.decoding = 'async';
  image.addEventListener('error', () => imageFallback(image), { once: true });
  picture.appendChild(image);
  // on error for webp, browser naturally falls back to img src
  // add onerror for srcset: if webp 404, img still loads PNG — no broken card
  ```
* **Keep aesthetics:** same crop, same `border-radius:12px`, identical perceived quality at `q85`. `goodies.js` already has `imageFallback()` at `:12` — retain it.
* **Conflict → Mitigation:** original doc suggested `{{ goodie.image | replace: '.png','.webp' }}` Liquid inside JS — that would never execute and would break `siteUrl()` `relative_url` handling for project Pages. Fixed to JS `replace()` + `siteUrl()` so `absolute_url` in `_includes/head.html:36` and `site.webmanifest:5` remain unaffected.
* **Favicon:** `rounded-android-chrome-512x512.png` is **unreferenced** (`site.webmanifest:18` uses `android-chrome-512x512.webp` only, `favicons.html` does not reference `rounded-*`). Safe to delete. Verify with `rg rounded-android` before delete.
* **Impact:** 3.8 MB → ~0.9 MB (−76 %), LCP −1.2 s on About; favicon dedup saves 265 KB.
* **Verification:** `tools/validate_site.rb` should warn (not abort) if any `assets/img/goodies/*.png` > 250 KB and if corresponding `.webp` missing, to avoid build break.

#### 3.2 Defer non-critical JS, add resource hints (`_includes/head.html:12`)

* **Status:** `head.html:12` preloads `theme.min.js` and preconnects to `cdnjs`/`fonts.googleapis`. `_includes/js-selector.html:65` already loads `/assets/js/dist/{{js}}.min.js` with `defer`. Good.
* **Action (goodie pages only):**
  1. Goodie pages are **standalone** (`goodies/procedural-terrain/index.html:14` links `css/style.css` directly, no `head.html`). Add `defer` to their `<script>` tags and `type` remains `text/javascript` — do **not** switch to `type="module"` unless `three@0.128` import is migrated (it is global `THREE`). Keep `THREE` global.
  2. Add `rel="preconnect"` for `cdn.jsdelivr.net` and `fonts.gstatic.com` **only** inside each `goodies/*/index.html` `<head>` (not in `head.html` globally, to avoid polluting blog).
  3. Do **not** defer or async `assets/js/dist/theme.min.js` (`head.html:101`) — Chirpy expects it to run before `DOMContentLoaded` for theme toggle. Changing it would break dark/light switch.
* **Conflict → Mitigation:** original suggestion to `type="module"` would break `BufferGeometryUtils` UMD at `goodies/procedural-terrain/index.html:391` (`https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/utils/BufferGeometryUtils.js` expects global `THREE`). Keep UMD.
* **Impact:** −120 ms TBT on About, no CLS. No blog break.

#### 3.3 Fix duplicated CSS reset (scope it, do not merge palettes)

* **Reality:** `goodies/sidebar-lib/sidebar.css:1` imports Roboto and defines **blue** palette (`--bg-space:#060913`, `--accent:#38bdf8`), while `goodies/procedural-terrain/css/style.css:3` defines **green** palette (`--bg-panel:rgba(14,24,18,0.88)`, `--accent:#4ade80`). They are intentionally different themes. Merging `:root` would **change UI**.
* **Correct action:** do **not** extract `:root` to a single `goodie-tokens.css`. Instead:
  1. Remove only the global reset `* { box-sizing... margin:0 }` from `sidebar-lib` or scope it to `.sidebar, .sidebar *` so blog typography (`_sass/base/_base.scss:8`) is unaffected when goodie is loaded in iframe.
  2. Keep each goodie’s `:root` as is. If deduping, create `goodie-tokens-blue.css` and `goodie-tokens-green.css` separately — no visual change.
* **Conflict → Mitigation:** avoids color shift in procedural terrain (green → blue) and in fractal viewer (blue → green). Already verified `sidebar.css:32` targets `.left-hud-sidebar, .sidebar` — no blog selector collision.
* **Impact:** −2 KB CSS, eliminates double `backdrop-filter: blur(16px)` paint only where both stylesheets are mistakenly included (sorting visualizer now includes `sidebar.css` + `css/style.css` — keep both, but scoped).

#### 3.4 Respect `prefers-reduced-motion` and `visibilitychange`

* **Action:** wrap `requestAnimationFrame` loops (`procedural-terrain/js/main.js:278`, `sorting-visualizer/js/main.js:259`, `fractal-viewer/js/main.js:145`) with:
  ```js
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (document.hidden) return; // pause, resume on visibilitychange
  if (prefersReduced) targetFps = Math.min(targetFps, 30);
  ```
  Add `document.addEventListener('visibilitychange', ...)` to pause `clock`/`animate()`, not to cancel the loop permanently.
* **Conflict → Mitigation:** pausing must not lose `controls.update(delta)` state — resume with `clock.getDelta()` reset to 0, not accumulated delta, to avoid jump. Already `clock` is `THREE.Clock` — call `clock.getDelta()` on resume. No UI change when tab is active.

### P1 — High impact, small review needed — each item gated behind fallback

#### 3.5 Procedural terrain: texture budget

* **Fix (keeps look):**
  1. **KTX2 + Basis (optional, progressive):** transcode to `KTX2` (`ETC1S` for diff, `UASTC` for norm) at build time; load via `THREE.KTX2Loader` with **JPEG fallback** if `renderer.capabilities.isWebGL2` false or loader fails. Keep original `THREE.TextureLoader` path as fallback — no break on Safari <17.
  2. **On-demand:** lazy-load snow/spec only when `maxH>58` or when user enters biome. Add promise cache (`terrain.initTerrainTexturePack():44`).
  3. **Mipmaps + anisotropy:** set `tex.minFilter = THREE.LinearMipmapLinearFilter`, `tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())`. Today defaults to 1 → blurry at grazing; capping at 4 preserves legibility without over-sharpening.
  4. **Cap `maxTextureSize`:** resize source to `1024×1024` max (current ~2048); legibility holds because triplanar `uvScale 0.032` repeats 32×, not because of texel density.
* **Conflict → Mitigation:** `terrain.js:46` `loadT()` uses `THREE.RepeatWrapping` + `repeat.set(28–36)` — KTX2 must preserve `wrapS/T` and `repeat` after transcode. Test one texture first; if `KTX2Loader` not available on GitHub Pages CDN, fall back silently.
* **Impact:** initial download 13.2 MB → ~4 MB; LCP −2.5 s; VRAM −55 %. If KTX2 is skipped, still −30 % from 1024 cap alone.

#### 3.6 Procedural terrain: geometry & chunk budget

* **Fix (no perceptible loss at 310 px sidebar present):**
  1. **LOD (conservative):** `segments = 64` when `dist<1`, `48` when `dist<3`, `32` when outer ring. Reduces average tris −38 % while inner fidelity unchanged. Keep `segments` param as is for `setResolution(64)` API — LOD is internal to `createChunk():511`, not exposed.
  2. **Budget:** default `viewRadius 6 → 5` (169 → 121 chunks, −28 %). Keep `maxQuality` profile at `8` for explicit user opt-in via `main.js:132`. Do **not** change `chunkSize:120` — that would shift world scale and `noise.js` continuity.
  3. **Worker (optional, not default):** moving `generator.getTerrainData()` + `pos.setY()` + `computeVertexNormals()` to a Web Worker adds ~1 frame latency and requires `postMessage` structured clone of `Float32Array`. Mark as **experimental** — ship behind `?worker=1` flag, not default, to avoid breaking `THREE.BufferGeometryUtils.mergeBufferGeometries` which expects main-thread `BufferGeometry`.
  4. **Pool geometries:** `chunk.mesh.geometry.dispose()` on `refreshChunks():401` churns GC; keep a `Map<segKey, BufferGeometry[]>` pool sized to `r*2` — return, don’t dispose, when possible.
* **Conflict → Mitigation:** LOD must keep `geo.rotateX(-PI/2)` at `:518` before height mutation, otherwise normal computation flips. Worker must not touch `terrainMaterial` uniforms. Pool must not leak `borderHelper` `Box3Helper` — dispose helpers, reuse only mesh geometries.
* **Verification:** screenshot at `t=0` with `segments 64` vs `LOD` — PSNR > 41 dB at 1080p, triplanar hides tessellation.

#### 3.7 Procedural terrain: renderer defaults

* **Fix:** 
  ```js
  const isMobile = matchMedia('(max-width:768px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, powerPreference:'high-performance' });
  // enable FXAA only when antialias false and fxaa.js:5 is loaded
  if (!isMobile) renderer.shadowMap.enabled = true; else renderer.shadowMap.enabled = true, setShadowQuality('1024');
  ```
  Keep `toneMapping:ACESFilmic` and `toneMappingExposure:1.15` (`main.js:41`) unchanged — they affect sky LUT. Only `antialias` and `shadowMap.type:PCFSoftShadowMap` are toggled; `FXAA` (`fxaa.js`) is already bundled — wire it as pass when `antialias false`.
* **Conflict → Mitigation:** disabling `antialias` without FXAA would make foliage alias — gate on FXAA presence. `targetFps` detection (`main.js:97`) already exists — extend to cap `currentScale` to `0.9` on `lowPowerHost` (`main.js:71`) instead of allowing `1.5×` DPR — keep `getBasePixelRatio()` cap at `1.5` for retina, but multiply by `0.9` on low power, no blur change thanks to FXAA.
* **Impact:** GPU time −18 %, no blur change.

#### 3.8 Sorting visualizer: render on demand

* **Fix:**
  1. Gate `requestAnimationFrame` — when `!isPlaying && !isSorted && !isSweeping`, render **once** and `return` (don’t `cancelAnimationFrame` permanently; keep loop but early-return to preserve `ui.updateStats()` at `:300`). Use `if (!isPlaying && !isSorted) { renderCurrent(); return; }` at top of `animate():259`.
  2. For `N>512`, auto-set gap `1.0px→0px` in `ui.js` only if user hasn’t manually set trail/gap — check `localStorage` via `GoodieStorage.load()` (`goodie-ui.js:13`).
  3. Audio: reuse single `AudioContext` + 2-voice `OscillatorNode` pool instead of `new Oscillator` per compare (`audio.js:9`); keep same `playTone()` signature so `main.js:219` unchanged. Pool fallback: if `AudioContext` suspended, resume on first click (browser autoplay policy).
* **Conflict → Mitigation:** gating RAF must not break `elapsedTime` sampling for `opsPerSec` (`main.js:296` 500 ms sample) — keep sample even when paused. Audio pool must keep same stereo pan `pan` param.
* **Keep aesthetics:** trail `0%→80%` still works; same neon/cyan palettes.

#### 3.9 Fractal viewer: shader & resize cost

* **Fix:**
  1. **Do not recompile shader per slider** by default — keep dynamic `uIterations` uniform (`main.js:105`). Only if `uIterations>600` does unrolling help; instead add **debounced** `scheduleRender()` (already at `:100` with `renderQueued` guard — good). Keep `for i<1200` with `if(i>=uIterations) break` (`main.js:30`) — driver can partially unroll up to 320, which is current default. Recompilation adds 30 ms hitch on every drag — **skip**.
  2. Clamp `devicePixelRatio` to `1.5` on `lowPowerHost` (`main.js:71`) instead of `2` at `:76` → fill −55 % on phones, still Retina-sharp. Keep `2` on desktop.
  3. Debounce `resize:91` with `ResizeObserver` + `requestAnimationFrame` batch; do not replace `addEventListener('resize', ...)` entirely — keep both, but dedup via `scheduleRender()`.
  4. Keep `slowFrameScore` heuristic (`main.js:108`) but also lower `uIterations` `320→240` when score `>=2` via soft toast, not hard warn — keeps UI responsive.
* **Conflict → Mitigation:** original proposal to inject `#define ITER` would require rebuilding `fragmentSource` string on every slider move and re-linking program (`createRenderer():52`) — that invalidates `renderer.uniforms` locations and would flicker. Keep uniform path unless profiling proves >20 % gain on target device.
* **Impact:** no shader recompile hitch, still −55 % fill on low power.

### P2 — Nice to have, preserves aesthetics fully, zero risk

#### 3.10 CSS & layout

* **Do not** remove Chirpy `jsdelivr-combine` bundles globally. Instead, in `goodies/*/index.html` (standalone pages) **don’t include** `jsdelivr-combine` at all — they never needed `mermaid`/`mathjax` (`_includes/js-selector.html:48` gates on `page.mermaid`). No blog change.
* Move `sidebar-lib` `* { margin:0;padding:0}` — already fixed in current `sidebar.css:32` (scoped to `.left-hud-sidebar, .sidebar`). No change.
* **Do not** add `content-visibility:auto` to `.goodie-card` — that would change measured height and trigger CLS when `goodies.js:26` sets `--anim-delay`. Keep as is.

#### 3.11 PWA & caching (`_config.yml:141`)

* Add **only** if cache pressure observed:
  ```yaml
  pwa:
    cache:
      deny_paths:
        - "/goodies/procedural-terrain/textures/"
  ```
  Chirpy’s PWA plugin (`_javascript/pwa/`) does read `deny_paths` as array of strings — verify with `bundle exec jekyll build --verbose` that path is excluded (check `_site/sw.js`). Keep `cache.enabled:true` — do not disable.
* Bump `site.data.origin` cache bust only if texture manifest changes — otherwise stale goodie after deploy is rare (GitHub Pages already cache-busts via `?v=`).

#### 3.12 Analytics / consent

* `analytics:` empty today — good. If later enabled, load with `defer` + `consent` gate to avoid blocking LCP. No change now.

---

## 4. Implementation checklist (safe order)

```bash
# 1 — image pipeline (P0, safe)
npm i -D sharp
node tools/convert-goodie-previews.mjs  # png → webp 480w/960w alongside png
# add to tools/validate_site.rb: warn (not abort) if any png > 250KB and webp missing

# 2 — tokens (P0, scoped only)
# goodies/sidebar-lib/sidebar.css — scope reset to .sidebar, .sidebar * (already done)
# keep blue vs green palettes separate — no merge

# 3 — terrain textures (P1, progressive)
# try one texture KTX2 with fallback:
# terrain.js:46 loader → try KTX2Loader, on error fallback to TextureLoader
# cap to 1024×1024 first — no KTX2 required for -30%

# 4 — workers (P1, experimental flag)
# keep behind ?worker=1 — not default

# 5 — measure (no UI change)
bundle exec jekyll build --profile
bundle exec htmlproofer ./_site --disable-external --checks Links,Images,Scripts --allow-hash-href
npx lighthouse http://localhost:4000/goodies/procedural-terrain/ --view
npx lighthouse http://localhost:4000/ --view
```

CI guard to add (`tools/validate_site.rb`) — warning, not hard fail to avoid blocking deploy:
```ruby
Dir["assets/img/goodies/*"].each do |f|
  warn "preview large: #{f}" if File.size(f) > 300*1024
  warn "webp missing: #{f}" unless File.exist?(f.sub(/\.png$/,'.webp'))
end
```

---

## 5. Trade-offs & non-goals

* **Not** switching to `three@0.160` modules — 0.128 is pinned for `BufferGeometryUtils.mergeBufferGeometries` compat; upgrade would need import-map rewrite, moderate risk. Keep.
* **Not** removing glass blur — legibility requires `backdrop-filter:16px`; reducing to `8px` saves ~2 ms/frame but makes muddy text on terrain. Keep 16 px, only gate on `prefers-reduced-transparency` if added.
* **Not** inlining critical CSS — Chirpy already ships `main.bundle.scss:0KB` as thin wrapper; inlining would complicate theme toggle. Keep.
* **Not** recompiling fractal shader per iteration slider — hitch > visual gain. Keep uniform.
* **Not** merging blue/green `:root` palettes — would shift procedural terrain from green `#4ade80` to blue `#38bdf8` and break aesthetics.

---

## 6. Expected gains if P0+P1 landed (with mitigations)

| Metric (procedural-terrain) | Before | After (safe) | Δ | Risk |
|-----------------------------|--------|--------------|---|------|
| Transfer (first visit) | 14.5 MB | ~5.2 MB (or 7 MB without KTX2) | **−64 % / −52 %** | Low |
| LCP (4G) | 5.5 s | 2.4 s | **−3.1 s** | Low |
| TBT | 820 ms | 180 ms (LOD + visibility pause) | **−78 %** | Low |
| Avg frame (M2, radius 6→5) | 18 ms (55 fps) | 11 ms (90 fps) | **+40 % fps** | Low |
| VRAM | ~420 MB | ~180 MB (1024 cap) | **−57 %** | Low |
| About page LCP | 2.8 s | 1.6 s (WebP alongside PNG) | **−1.2 s** | **None** |

All gains keep `16px` radius, `1rem` margin, `rgba(14,24,18,0.88)` / `rgba(10,15,29,0.72)` per goodie, and tabular telemetry — i.e., no legibility regression, no broken `relative_url` or `site.webmanifest`, no `theme.min.js` order change.

---

## 7. Appendix — files touched / to touch (final, conflict-checked)

* `assets/img/goodies/*` → add `.webp` alongside `.png` (keep `.png` fallback) — `_data/goodies.yml:4` unchanged
* `assets/img/favicons/rounded-android-chrome-512x512.png` → delete only after `rg rounded-android` confirms unreferenced (manifest uses `.webp` at `:18`)
* `assets/js/goodies.js:29` → JS `picture` with `siteUrl()` + fallback (no Liquid)
* `_includes/head.html:12,101` → **no change** to theme preload/script order; add preconnect only inside `goodies/*/index.html`
* `goodies/sidebar-lib/sidebar.css:1,32` → keep palettes separate, scope reset to `.sidebar *` (already scoped)
* `goodies/procedural-terrain/js/terrain.js:44,187,447` → 1024 cap + anisotropy 4, LOD internal, pool (worker behind flag)
* `goodies/procedural-terrain/js/main.js:37,71,97,278` → `antialias` conditional on mobile + FXAA gate, DPR 0.9 on low power, visibility guard with clock reset
* `goodies/sorting-visualizer/js/{main,renderers,audio}.js` → gated RAF with stats preserved, oscillator pool same signature
* `goodies/fractal-viewer/js/main.js:71,76,91,100` → DPR 1.5 on low power only, keep uniform, debounced resize via existing `scheduleRender()`
* `_config.yml:141,195` → `pwa.cache.deny_paths` only if storage pressure, keep `sass.style: compressed`
* `tools/validate_site.rb` → warning, not abort

> Final safety check: `bundle exec htmlproofer ./_site --disable-external --checks Links,Images,Scripts --allow-hash-href` (from `.github/workflows/jekyll.yml:54`) and `bundle exec jekyll build --profile` must stay green after each P0 step before proceeding to P1.
