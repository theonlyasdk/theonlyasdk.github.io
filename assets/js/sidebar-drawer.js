/*
 * Overlay-drawer interactions for the site sidebar on mobile (< 850px,
 * the same bound the panel's own media query uses):
 *   1. Drag-to-close — the open drawer can be dragged left with touch OR
 *      mouse. The drawer tracks the finger 1:1; the dim scrim follows it
 *      proportionally. Past the threshold (or with a leftward flick) the
 *      release completes the close; otherwise the drawer springs back open.
 *   2. Overscroll stretch — rubber-band overshoot: pulling the open drawer
 *      in the "open further" direction (rightward) has nowhere to go, so
 *      the panel stretches instead of moving. The growth is real box
 *      width; the content wrapper stays pinned at its natural width and
 *      the aside's own align-items: flex-end keeps it flush with the
 *      widening right edge, so the content rides right rigidly and the
 *      empty pad opens between the viewport edge and the content.
 *      Nothing ever overhangs the panel, so no overflow clipping or
 *      phantom horizontal scroll can occur. Release springs the panel
 *      back to its natural width.
 *   3. Same slide-out for every close path — links tapped inside the drawer
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
    var contentEl = sidebar.querySelector ? sidebar.querySelector('.sidebar-zoom') : null;
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
      sidebar.style.width = '';
      if (contentEl) {
        contentEl.style.transition = '';
        contentEl.style.transform = '';
        contentEl.style.width = '';
      }
      if (scrim) {
        scrim.style.transition = '';
        scrim.style.opacity = '';
      }
    }

    /* --- 2. overscroll stretch (paint-only, no layout) -------------------- */

    /* Rubber-band profile: responds immediately and saturates well before
       the panel would reach mid-page. The cap (~15% of the panel, about
       39px at 260px wide) keeps the deformation subtle. */
    function stretchFor(pull, panelWidth) {
      var cap = panelWidth * 0.15;
      var soft = panelWidth * 0.35;
      return cap * pull / (pull + soft);
    }

    /* The stretch is real box growth: the panel's inline width grows by the
       rubber-band amount while the content wrapper stays pinned at its
       natural width. The aside's own align-items: flex-end then holds the
       wrapper flush against the widening right edge, so the content rides
       right rigidly and the pad opens between the viewport edge and the
       content. Nothing overhangs the panel box, so there is no clipping. */
    function setStretch(px, panelWidth) {
      if (px > 0 && panelWidth > 0) {
        sidebar.style.width = (panelWidth + px) + 'px';
        sidebar.style.transform = '';
        if (contentEl) {
          contentEl.style.width = panelWidth + 'px';
        }
        if (scrim) {
          scrim.style.opacity = '';
        }
      } else {
        sidebar.style.width = '';
        if (contentEl) {
          contentEl.style.width = '';
        }
      }
    }

    var spring = null; /* active stretch spring-back, if any */

    function endStretchSpring() {
      if (!spring) {
        return;
      }
      if (spring.onEnd) {
        sidebar.removeEventListener('transitionend', spring.onEnd);
      }
      if (spring.timer) {
        window.clearTimeout(spring.timer);
      }
      spring = null;
      sidebar.style.width = '';
      sidebar.style.transition = '';
      if (contentEl) {
        contentEl.style.width = '';
      }
    }

    function startStretchSpring(panelWidth) {
      var reduce = false;
      try {
        reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (err) {
        /* treat as motion-capable */
      }
      if (reduce) {
        sidebar.style.width = '';
        if (contentEl) {
          contentEl.style.width = '';
        }
        return;
      }
      /* Same duration/easing family as the drawer slide; the earlier clear
         already removed per-move values, so this transition starts from the
         current stretched width. Only the panel tweens — the wrapper is
         re-pinned at its natural width so the content rides rigidly via
         align-items: flex-end. */
      sidebar.style.transition = 'width 0.4s var(--spring-ease)';
      sidebar.style.width = panelWidth + 'px';
      if (contentEl) {
        contentEl.style.width = panelWidth + 'px';
      }
      spring = {
        timer: null,
        onEnd: function (ev) {
          if (ev && ev.propertyName !== 'width') {
            return;
          }
          endStretchSpring();
        }
      };
      sidebar.addEventListener('transitionend', spring.onEnd);
      spring.timer = window.setTimeout(endStretchSpring, 600);
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
      endStretchSpring(); /* grabbing mid-spring takes over the motion */
      drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        lastX: e.clientX,
        lastT: e.timeStamp,
        vx: 0,
        axis: null,
        maxStretch: 0,
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

      /* Biomechanics: leftward travel slides the drawer toward closed, so it
         is real movement (translate + dim). Rightward travel has nowhere to
         go — the panel is fully open — so it stretches the panel instead.
         Both share the same x0, so sweeping from one side to the other
         crosses over continuously at dx = 0. */
      if (dx > 0) {
        var st = stretchFor(dx, drag.w);
        setStretch(st, drag.w);
        if (st > drag.maxStretch) {
          drag.maxStretch = st;
        }
      } else {
        setStretch(0); /* melt any stretch from earlier in this gesture */
        var off = Math.min(0, dx);
        var progress = off < 0 ? Math.min(1, -off / drag.w) : 0;
        sidebar.style.transform = 'translateX(' + off + 'px)';
        if (scrim) {
          /* The dim follows the drawer's slide amount proportionally. */
          scrim.style.transition = 'none';
          scrim.style.opacity = (0.5 * (1 - progress)).toFixed(3);
        }
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
      } else if (d.maxStretch > 1) {
        /* Overshoot release: the panel eases back to its natural width;
           the pinned content rides it. */
        startStretchSpring(d.w);
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
