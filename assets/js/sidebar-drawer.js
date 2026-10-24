/*
 * Overlay-drawer interactions for the site sidebar on mobile (< 850px,
 * the same bound the panel's own media query uses):
 *   1. Drag-to-close — the open drawer can be dragged left with touch OR
 *      mouse. The drawer tracks the finger 1:1; the dim scrim follows it
 *      proportionally. Past the threshold (or with a leftward flick) the
 *      release completes the close; otherwise the drawer springs back open.
 *   2. Same slide-out for every close path — links tapped inside the drawer
 *      are intercepted while it is open: the drawer performs the standard
 *      0.4s eased slide-out (identical to the open animation) BEFORE the
 *      navigation happens. Without this, cross-document view transitions
 *      capture the open drawer and dismiss it with their own quick morph /
 *      instant swap instead of a slide.
 *
 * The theme's own hamburger/mask toggles already animate symmetrically; this
 * script keeps their state machine (body[sidebar-display], .z-2, mask) in
 * control by closing through the real trigger button.
 */
'use strict';

(function () {
  'use strict';

  function init() {
    var sidebar = document.getElementById('sidebar');
    var trigger = document.getElementById('sidebar-trigger');
    var scrim = document.getElementById('sidebar-scrim');
    if (!sidebar || !trigger || sidebar.dataset.drawerInit) {
      return;
    }
    sidebar.dataset.drawerInit = '1';

    /* Mirrors the panel's own bound: @media all and (max-width: 850px - 1px). */
    var isDrawerMode = window.matchMedia('(max-width: 849px)');

    function drawerIsOpen() {
      return document.body.hasAttribute('sidebar-display');
    }

    /* A drag marks the drawer's inline motion; clearing the values lets the
       stylesheet transition retarget from the last dragged position with the
       same duration/easing the open toggle uses. */
    function clearInlineMotion() {
      sidebar.style.transition = '';
      sidebar.style.transform = '';
      sidebar.style.userSelect = '';
      if (scrim) {
        scrim.style.transition = '';
        scrim.style.opacity = '';
      }
    }

    /* --- 1. drag to close ------------------------------------------------- */

    var drag = null;
    var suppressClick = false;

    sidebar.addEventListener('pointerdown', function (e) {
      if (!isDrawerMode.matches || !drawerIsOpen() || drag) {
        return;
      }
      if (e.pointerType === 'touch' && e.isPrimary === false) {
        return; /* second finger: not a drag */
      }
      if (e.button !== undefined && e.button !== 0) {
        return; /* right/middle click */
      }
      drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        lastX: e.clientX,
        lastT: e.timeStamp,
        vx: 0,
        axis: null,
        w: sidebar.getBoundingClientRect().width || sidebar.clientWidth || 260
      };
      try {
        sidebar.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture is best-effort */
      }
    });

    sidebar.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;

      if (!drag.axis) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          /* Vertical intent: hand the gesture back so the drawer can scroll
             its contents (touch-action: pan-y keeps this native). */
          try {
            sidebar.releasePointerCapture(drag.id);
          } catch (err) {
            /* best-effort */
          }
          drag = null;
          return;
        }
        drag.axis = 'x';
        suppressClick = true;
        sidebar.style.transition = 'none';
        sidebar.style.userSelect = 'none';
      }

      /* The drawer only ever travels left while closing; movement to the
         right is a no-op (it is already fully open). */
      var off = Math.min(0, dx);
      var progress = off < 0 ? Math.min(1, -off / drag.w) : 0;
      sidebar.style.transform = 'translateX(' + off + 'px)';
      if (scrim) {
        /* The dim follows the drawer's slide amount proportionally. */
        scrim.style.transition = 'none';
        scrim.style.opacity = (0.5 * (1 - progress)).toFixed(3);
      }

      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) {
        var vx = (e.clientX - drag.lastX) / dt;
        drag.vx = drag.vx * 0.6 + vx * 0.4;
        drag.lastX = e.clientX;
        drag.lastT = e.timeStamp;
      }
    });

    function onRelease(e) {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      var d = drag;
      drag = null;

      var off = Math.min(0, e.clientX - d.x0);
      var progress = d.w > 1 ? Math.min(1, -off / d.w) : 0;

      /* Hand the motion back to CSS first: the slide continues from wherever
         the finger left the drawer, on the standard eased animation. */
      clearInlineMotion();

      /* Threshold close: enough travel (about a third of the drawer) or any
         meaningful leftward flick. Below it, the attribute stays set and the
         cleared inline transform springs back to the open position. */
      if (drawerIsOpen() && (progress >= 0.3 || (progress > 0.08 && d.vx <= -0.35))) {
        trigger.click(); /* the theme toggle: attribute off + standard slide-out */
      }

      window.setTimeout(function () {
        suppressClick = false;
      }, 60);
    }
    sidebar.addEventListener('pointerup', onRelease);
    sidebar.addEventListener('pointercancel', onRelease);

    /* A completed drag must not also click its way into a link on release. */
    sidebar.addEventListener('click', function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressClick = false;
      }
    }, true);

    /* --- 2. links inside the drawer close it first, then navigate --------- */

    sidebar.addEventListener('click', function (e) {
      if (!isDrawerMode.matches || !drawerIsOpen() || suppressClick) {
        return;
      }
      if (e.defaultPrevented) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      if (e.button !== undefined && e.button !== 0) {
        return;
      }
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !a.href) {
        return;
      }
      if (a.target && a.target !== '_self') {
        return;
      }

      e.preventDefault();
      trigger.click(); /* standard close, same animation as the open toggle */

      var target = new URL(a.href, location.href);
      if (target.pathname + target.search === location.pathname + location.search) {
        return; /* same page: the drawer closes, nothing else to do */
      }

      var done = false;
      var go = function () {
        if (done) {
          return;
        }
        done = true;
        window.location.assign(a.href);
      };
      var onSlideOut = function (ev) {
        if (ev.propertyName !== 'transform') {
          return;
        }
        sidebar.removeEventListener('transitionend', onSlideOut);
        go();
      };
      sidebar.addEventListener('transitionend', onSlideOut);
      window.setTimeout(go, 550); /* fallback if transitionend never fires */
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
