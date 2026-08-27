# Goodie Creation Guide

This document outlines the conventions and requirements for creating new "goodies" (interactive demos) in this repository.

## General Rules

1. **No Telemetry Header in Top‑Right Panel**  
   - Do **not** place a telemetry header or any telemetry read‑outs in the fixed top‑right corner of the viewport.  
   - Telemetry information (if needed) should be displayed inside the goodie’s own UI (e.g., within the sidebar, a dedicated panel, or overlay) rather than as a global header.

2. **Use the Shared Sidebar Library**  
   - All goodies that require a collapsible side panel **must** use the reusable sidebar library located at `goodies/sidebar-lib/`.  
   - The library provides:
     - Consistent slide‑in/out animation with configurable easing.  
     - Margin, border‑radius, and backdrop styling.  
     - A toggle button that appears when the sidebar is closed.  
     - A simple JavaScript API (`new Sidebar()`, `.show()`, `.hide()`).  
   - **How to use:**  
     ```html
     <!-- In <head> -->
     <link rel="stylesheet" href="sidebar-lib/sidebar.css">

     <!-- Before closing </body> -->
     <script src="sidebar-lib/sidebar.js"></script>
     <script>
       document.addEventListener('DOMContentLoaded', function () {
         const sidebar = new Sidebar(); // uses defaults (.sidebar, .sidebar-backdrop)
         sidebar.show(); // start open if desired
         // optional: expose toggle button logic if you need a custom open button
       });
     </script>
     ```
   - Ensure the sidebar element has the class `sidebar` (and any additional theme classes you need, e.g., `glass-panel`).  
   - Use `data-toggle="sidebar"` on buttons that should open the sidebar and `data-dismiss="sidebar"` on buttons that should close it.

3. **Styling & Theming**  
   - Keep goodie‑specific styles in the goodie’s own `css/` folder.  
   - If you need to adjust the sidebar’s width, colors, or animation, override the library’s CSS **after** importing `sidebar.css` or edit the variables in `sidebar-lib/sidebar.css` (prefer overriding in your goodie’s stylesheet to keep the library reusable).

4. **Accessibility**  
   - Label all interactive controls with meaningful `aria-label` or `title` attributes.  
   - Ensure keyboard navigation works (Escape to close sidebar, Tab order logical).  
   - Provide sufficient contrast for text and icons.

5. **Performance**  
   - Minimize DOM changes during animation loops.  
   - Use `requestAnimationFrame` for any canvas/WebGL rendering.  
   - Avoid heavy computations on the main thread; offload to Web Workers if needed.

6. **File Structure**  
   Each goodie should reside under `goodies/<goodie-name>/` with at least:
   - `index.html` – entry point.  
   - `css/` – stylesheet(s).  
   - `js/` – script(s).  
   - Optional `assets/` – images, data, etc.  
   - Do **not** place files outside the goodie’s folder unless they are truly shared (e.g., the sidebar library).

7. **Testing**  
   - Verify the goodie works in the latest versions of Chrome, Firefox, Safari, and Edge.  
   - Check that the sidebar opens/closes correctly, the toggle button appears/disappears, and no global telemetry header is present.

## Example Minimal Goodie Skeleton

```
goodies/my-goodie/
├── index.html
├── css/
│   └── style.css
└── js/
    └── main.js
```

**index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Goodie</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <link rel="stylesheet" href="sidebar-lib/sidebar.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Main content (canvas, etc.) -->
  <div id="content">
    <!-- ... -->
  </div>

  <!-- Sidebar using the library -->
  <button class="sidebar-toggle-btn" data-toggle="sidebar" aria-label="Open sidebar">
    <i class="bi bi-list"></i>
  </button>

  <aside id="goodie-sidebar" class="sidebar">
    <div class="sidebar-header">
      <h5>Controls</h5>
      <button type="button" class="btn-close" data-dismiss="sidebar" aria-label="Close"></button>
    </div>
    <div class="sidebar-body">
      <!-- Controls go here -->
    </div>
  </aside>

  <script src="sidebar-lib/sidebar.js"></script>
  <script src="js/main.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const sidebar = new Sidebar();
      sidebar.show(); // start open
      // toggle button logic is handled via data-toggle attribute
    });
  </script>
</body>
</html>
```

Following these guidelines ensures a consistent look, feel, and behavior across all goodies while keeping the codebase maintainable.

--- 

*Happy coding!*