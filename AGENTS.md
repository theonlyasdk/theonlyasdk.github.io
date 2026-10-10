# Agent Instructions & Project Guidelines

This document outlines architectural constraints and coding rules for AI coding assistants working on this repository (`theonlyasdk.github.io`).

---

## 1. Critical Rule: Inline JavaScript & HTML Compression

> [!CAUTION]
> **NEVER use single-line comments (`// ...`) inside inline `<script>` tags in HTML, Liquid, or Markdown files.**

### Why
- In production builds (`JEKYLL_ENV=production`), the site layout uses `_layouts/compress.html` (`jekyll-compress-html`) to compress and minify HTML.
- `compress.html` strips all newlines outside `<pre>` tags and collapses whitespace onto a single line (`blanklines: false`).
- In JavaScript, `//` comments out all characters until the next newline (`\n`). When newlines are stripped, **a single `//` comments out the entire remainder of the script** up to `</script>`.
- This causes unclosed brackets/functions and results in the browser error:
  `Uncaught SyntaxError: Unexpected end of input` (typically on line 1).

### Mandatory Rules
1. **Always use block comments (`/* ... */`)** for any comments inside `<script>` tags, or place scripts in external `.js` files.
2. **Always include explicit semicolons (`;`)** at statement boundaries. Do not rely on Automatic Semicolon Insertion (ASI) across newlines that will be collapsed into single spaces.
3. This applies to all template files:
   - `_includes/**/*.html`
   - `_layouts/**/*.html`
   - `_tabs/**/*.html`, `_tabs/**/*.md`
   - `_posts/**/*.md`

---

## 2. PWA & Service Worker Caching

- PWA offline caching is disabled (`pwa.cache.enabled: false` in `_config.yml`) so that **deployments and new posts update immediately for all visitors** without stale-cache delays.
- `_includes/footer.html` emits `&register=` and purges `window.caches` so existing visitor browsers automatically unregister stale Service Workers and clear cached assets.
- PWA installability features (manifest, theme colors, home screen icons) remain fully enabled via `pwa.enabled: true`.

---

## 3. Local Testing & Verification

- To test the site locally under full production compression (reproducing the exact GitHub Pages build):
  ```bash
  cmd /c "set JEKYLL_ENV=production && bundle exec jekyll build"
  ```
- Before pushing changes to templates or inline scripts, verify that generated HTML pages in `_site/` contain no syntax errors.
