# Bug-Fix Priority List

Priorities use the following scale:

- **P0 — Blocker:** The site or deployment is unavailable.
- **P1 — High:** A prominent feature is broken for many visitors.
- **P2 — Medium:** A feature works with limitations or fails in specific cases.
- **P3 — Low:** Minor polish, cleanup, or future hardening.

## P0 — Blocker

### Verify GitHub Pages deployment health

- Check the latest `Deploy Jekyll site to Pages` workflow run after every release.
- Confirm `/about/`, `/assets/img/goodies/`, and `/goodies/` return successful responses from the deployed site.
- Keep the workflow build and deployment jobs visible through the repository status badge.

## P1 — High

### Goodies must render on the deployed About page

- Keep local image and demo URLs generated with Jekyll URL filters.
- Confirm the generated production HTML contains the expected site URL and base path.
- Add an image error handler and an in-card fallback so one missing asset does not make a card appear broken.
- Test the page as both a root/user Pages site and a path-based project Pages site.

### Prevent stale service-worker content

- Verify that a new deployment updates the service-worker cache manifest or cache version.
- Exclude rapidly changing page assets from the cache where appropriate.
- Test with an existing installed PWA, not only a fresh browser session.

### Keep embedded demos usable

- Show an error state when an iframe does not load within a reasonable timeout.
- Provide a direct-link fallback for external demos that reject iframe embedding.
- Confirm modal scrolling and closing behavior on mobile viewport sizes.

## P2 — Medium

### Improve modal accessibility

- Close the active modal with Escape.
- Move focus into the modal and return it to the triggering card on close.
- Add labels to icon-only controls.
- Prevent background content from being announced or selected while a modal is open.

### Handle reduced-motion preferences

- Disable or shorten card and modal animations when `prefers-reduced-motion: reduce` is enabled.
- Ensure cards remain visible if an animation is unsupported or interrupted.

### Validate local references in CI

- Add a script that checks every local image, stylesheet, script, and iframe path used by the site.
- Run the check before `jekyll build` in the Pages workflow.
- Fail with the exact missing path and source file.

### Fix build portability

- Make the post-last-modified hook work consistently on Windows and Linux.
- Avoid shell-specific command assumptions in Jekyll plugins.
- Run a clean production build in CI with the same Ruby and Bundler versions documented for contributors.

## P3 — Low

### Reduce asset size

- Convert large goodies preview PNGs to optimized WebP or AVIF versions.
- Keep PNG originals only when transparency or lossless quality is required.

### Reduce inline page complexity

- Move About-page styles and JavaScript into dedicated assets.
- Add focused tests for goodies rendering, modal opening, credits, and keyboard interaction.

### Correct minor markup and content issues

- Keep heading nesting valid and sequential.
- Review external links and licenses periodically.
- Add alt text guidance for future goodies.
