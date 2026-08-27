# Sidebar Library

A lightweight, dependency-free sidebar library providing the canonical iOS FLIP modal spring expand/collapse animation, morphing toggle button, glassmorphic styling, and full keyboard/touch accessibility.

## Files

- `sidebar.css` – Core styles (glassmorphism panel, collapsed 2.75rem pill state, morph buttons, typography, custom scrollbar).
- `sidebar.js` – `Sidebar` class providing FLIP spring physics transitions and event bindings.

## Installation

Copy the `sidebar-lib` folder into your project (e.g., `goodies/sidebar-lib/`). Then include the assets:

```html
<link rel="stylesheet" href="../sidebar-lib/sidebar.css">
<script src="../sidebar-lib/sidebar.js"></script>
```

## HTML Structure

```html
<aside id="left-hud" class="left-hud-sidebar glass-panel">
  <div class="hud-header">
    <div class="hud-title-row">
      <span class="hud-title">My Goodie Title</span>
    </div>
    <div class="hud-top-actions">
      <!-- Quick Action buttons (e.g., Sound, Info) -->
      <button id="btn-info" class="icon-btn" title="Help"><i class="bi bi-info-circle"></i></button>
      
      <!-- Morph Collapse/Expand Toggle Button -->
      <button id="btn-collapse-hud" class="icon-btn hud-morph-btn" title="Toggle UI panel" aria-label="Toggle UI panel">
        <span class="morph-icon-open">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </span>
        <span class="morph-icon-closed">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect><line x1="9" y1="3" x2="9" y2="21"></line><path d="M14 9l3 3-3 3"></path></svg>
        </span>
      </button>
    </div>
  </div>

  <!-- Sections & Controls -->
  <div class="hud-group-title">Settings</div>
  <div class="hud-section">
    <!-- Controls... -->
  </div>
</aside>
```

## JavaScript API

```js
// Initialize sidebar
const sidebar = new Sidebar({
  sidebarSelector: '#left-hud',
  collapseTriggerSelector: '#btn-collapse-hud'
});

// Programmatic control
sidebar.expand();   // opens sidebar
sidebar.collapse(); // collapses sidebar to 2.75rem morph button
sidebar.toggle();   // toggles open/collapse
```

## Customization

Adjust the sidebar width, background, transition timing, etc. by overriding the CSS variables or editing `sidebar.css`:

```css
.sidebar {
  width: 280px;               /* change width */
  background: #fff;           /* change background */
  transition: transform 0.4s ease; /* change animation */
}
```

## Browser Support

- IE11+ (with classList polyfill if needed)
- Modern browsers (Chrome, Firefox, Safari, Edge)

## License

MIT – feel free to use and modify.