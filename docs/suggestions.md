# Site Suggestions

This document contains proposed improvements for theonlyasdk.github.io. Suggestions are grouped by impact rather than implementation order.

## User experience

- Add a visible fallback message when a goodie image or embedded demo fails to load.
- Add a short “Open demo in a new tab” action for iframe-based goodies.
- Add filtering or categories when the number of goodies grows.
- Add a loading state that respects `prefers-reduced-motion`.
- Add a custom 404 link back to the relevant section when a goodie URL is missing.

## Accessibility

- Ensure every interactive card has a visible focus style and announces its action clearly to screen readers.
- Add an accessible label to modal close buttons and trap focus while a modal is open.
- Support closing both modals with the Escape key.
- Use semantic buttons for actions instead of clickable `div` elements where possible.
- Check color contrast for muted text and controls in both light and dark themes.

## Reliability and maintainability

- Move the goodies data and rendering code out of `_tabs/about.html` into a dedicated JavaScript module.
- Store image paths, demo paths, descriptions, and credits in `_data/goodies.yml`.
- Add a small validation script that checks every referenced image, demo, and local asset before deployment.
- Add automated checks for Jekyll builds, JavaScript syntax, broken internal links, and missing assets.
- Keep deployment-specific URL handling centralized so future pages use the same `relative_url` or `absolute_url` convention.

## Performance

- Resize and compress the large preview PNGs, preferably serving WebP or AVIF variants.
- Keep lazy loading on below-the-fold preview images and avoid loading iframe demos until a user opens them.
- Consider a thumbnail-sized image for each card instead of using full-resolution artwork.
- Review the service-worker cache when adding or renaming goodies so stale deployments do not hide updates.

## Content and discoverability

- Add a short description and status for unfinished goodies.
- Include keyboard instructions for interactive demos.
- Add page metadata or structured links for individual goodies if they become important destinations.
