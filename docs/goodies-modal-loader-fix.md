# Goodies Modal Loader Fix

**Date:** 2026-09-21 · **File changed:** `assets/js/goodies.js` · **Commit:** `a450795`

## ELI5

Imagine you put a "please wait…" sticky note on the TV while your show loads.
When the show starts, you tell someone "make the note invisible."
But the note was written with a magic marker labeled **ALWAYS VISIBLE** —
so your instruction is ignored and the note stays stuck on the screen forever,
even though the show is playing fine behind it.

That is exactly what happened: the "Loading demo…" spinner was the sticky note,
Bootstrap's `d-flex` class was the magic marker (`display: flex !important`),
and the browser's `hidden = true` instruction lost the fight.
Every goodie demo actually loaded fine — users just couldn't see past the spinner.
The fix: instead of asking the note to hide, we **throw it in the bin**
(`loader.remove()`), which no marker can argue with.

## Symptom

- On the live site (`/about/`), clicking any goodie card opened the modal,
  but it showed "Loading demo…" forever.
- The Terminal emulator looked "broken": its prompt was visible *underneath*
  the stuck "Loading demo…" text.
- No red errors in the console. Worked in older local builds.

## Root cause

`openMinigame()` in `assets/js/goodies.js` rendered the loader as:

```html
<div id="modal-iframe-loader" class="d-flex ...">…Loading demo…</div>
```

and hid it on iframe load with:

```js
document.getElementById('modal-iframe-loader').hidden = true;
```

Bootstrap 5's `.d-flex` rule (verified in the deployed CSS) is:

```css
.d-flex{display:flex !important}
```

The browser's built-in `[hidden] { display: none }` rule has **no**
`!important`, so it loses to `.d-flex`. The loader could never hide —
on any browser, local or deployed. (The `Permissions-Policy` console
warnings reported alongside were unrelated third-party noise; GitHub Pages
sends no such header on any of our URLs — verified via response headers.)

## Fix

1. Added a `hideModalLoader()` helper that **removes** the loader node
   instead of hiding it, and exposed it as `window.hideModalLoader`
   so the iframe's inline `onload` handler can call it:

   ```js
   onload="this.style.opacity='1'; if (window.hideModalLoader) window.hideModalLoader();"
   ```

2. Added a 20-second safety net: if `load` never fires, the loader is
   removed anyway, the iframe is revealed, and a `console.warn` is emitted.
   It is guarded by `currentOpenGoodie` so reopening another goodie can't
   cross-fire. The existing "Open demo in a new tab" header link remains
   the escape hatch for genuinely unloadable demos.

3. Left untouched: `demoLink.hidden` and `image.hidden` also use the
   `hidden` attribute, but those elements carry no Bootstrap display-utility
   class, so `hidden` works fine for them.

## Verification

- `node --check assets/js/goodies.js` — pass (same check CI runs).
- `JEKYLL_ENV=production bundle exec jekyll build` — pass; built
  `_site/assets/js/goodies.js` contains the fix, zero traces of the old pattern.
- `ruby tools/validate_site.rb` — pass (6 goodies, all local references).
- All 9 local goodie URLs in built `/about/` resolve to files in `_site`.
- `htmlproofer` could not run on Windows (missing `libcurl` system DLL —
  fails at require time, unrelated to this change); CI on Ubuntu runs it.

## Lesson for future goodies

Never rely on the `hidden` attribute on an element that also has a
Bootstrap display-utility class (`d-flex`, `d-block`, `d-none`, …):
the utility's `!important` always wins. Either remove the node,
toggle the utility class itself, or add an explicit
`[hidden] { display: none !important }` override.
