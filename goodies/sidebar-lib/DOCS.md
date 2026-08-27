# Sidebar Library Documentation

## Overview

The Sidebar Library provides a reusable off‑canvas panel with a slide‑in animation. It includes:

- CSS for the sidebar, backdrop, and open/closed states.
- A lightweight JavaScript class (`Sidebar`) that handles toggling via data attributes or direct method calls.

## Getting Started

1. **Add the library files** to your project:

   ```html
   <link rel="stylesheet" href="goodies/sidebar-lib/sidebar.css">
   <script src="goodies/sidebar-lib/sidebar.js"></script>
   ```

2. **Markup** – place the sidebar and backdrop in your HTML (the backdrop will be auto‑created if omitted).

   ```html
   <div class="sidebar-backdrop"></div>

   <aside class="sidebar">
     <div class="sidebar-header">
       <h5>My Sidebar</h5>
       <button type="button" class="btn-close" data-dismiss="sidebar" aria-label="Close"></button>
     </div>
     <div class="sidebar-body">
       <!-- Your content -->
     </div>
   </aside>

   <button type="button" data-toggle="sidebar" class="btn btn-outline-secondary">
     Toggle Sidebar
   </button>
   ```

3. **Initialize** – the library works automatically with the data attributes; you can also create an instance for programmatic control:

   ```html
   <script>
     // optional: keep a reference if you need to call show()/hide() from elsewhere
     const sidebar = new Sidebar();
   </script>
   ```

## Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `sidebarSelector` | CSS selector for the sidebar element | `.sidebar` |
| `backdropSelector` | CSS selector for the backdrop element | `.sidebar-backdrop` |
| `openTriggerSelector` | Selector for elements that open the sidebar | `[data-toggle="sidebar"]` |
| `closeTriggerSelector` | Selector for elements that close the sidebar | `[data-dismiss="sidebar"]` |

**Example with custom selectors:**

```js
const sidebar = new Sidebar({
  sidebarSelector: '.my-sidebar',
  backdropSelector: '.my-backdrop',
  openTriggerSelector: '[data-open-sidebar]',
  closeTriggerSelector: '[data-close-sidebar]'
});
```

## Styling

All visual aspects are controlled via CSS. To customize:

- **Width:** change `.sidebar { width: ... }`
- **Background / color:** adjust `.sidebar`, `.sidebar-header`, `.sidebar-footer`
- **Animation speed / easing:** modify the `transition` property on `.sidebar`
- **Backdrop opacity:** alter `.sidebar-backdrop { background: rgba(0,0,0,.5) }`

Override these rules in your own stylesheet **after** importing `sidebar.css` or edit the file directly.

## API

### `new Sidebar(options?)`

Creates a sidebar instance.

- `options` – optional object (see Configuration).

### `.show()`

Adds the `.open` class to the sidebar and `.show` to the backdrop, triggering the slide‑in animation.

### `.hide()`

Removes the open/show classes, sliding the sidebar out.

### `.toggle()`

Convenience method that calls `show()` if closed, otherwise `hide()`.

### Properties

- `.isOpen` – boolean reflecting current state.

## Events

The library does not emit custom events; you can listen to standard DOM events on the sidebar or backdrop if needed:

```js
document.querySelector('.sidebar').addEventListener('transitionend', e => {
  if (e.propertyName === 'transform') {
    console.log('Sidebar animation finished');
  }
});
```

## Browser Support

- Chrome, Firefox, Safari, Edge – full support.
- Internet Explorer 11 – supported with a `classList` polyfill (included by default in most modern build setups).

## Changelog

### v1.0.0
- Initial release: core CSS, JavaScript class, data‑attribute API.

## License

MIT License – see the accompanying `LICENSE` file (if present) or assume permissive use.

--- 

*Happy coding!*