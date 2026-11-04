'use strict';
(function () {
  function init() {
    var sidebar = document.getElementById('sidebar');
    var trigger = document.getElementById('sidebar-trigger');
    var scrim = document.getElementById('sidebar-scrim');
    if (!sidebar || !trigger || sidebar.dataset.drawerInit) {
      return;
    }
    sidebar.dataset.drawerInit = '1';
    var isDrawerMode = window.matchMedia('(max-width: 849px)');

    function drawerIsOpen() {
      return document.body.hasAttribute('sidebar-display');
    }

    function primaryButton(e) {
      return e.button === undefined || e.button === 0;
    }

    function dragPointer(e) {
      return drag && e.pointerId === drag.id;
    }

    function slideProgress(dx, panelWidth) {
      var off = Math.min(0, dx);
      return panelWidth > 1 ? Math.min(1, -off / panelWidth) : 0;
    }

    function unstretch() {
      sidebar.style.width = '';
      sidebar.style.transform = '';
    }

    function clearInlineMotion() {
      sidebar.style.transition = '';
      sidebar.style.transform = '';
      sidebar.style.userSelect = '';
      unstretch();
      if (scrim) {
        scrim.style.transition = '';
        scrim.style.opacity = '';
      }
    }

    function stretchFor(pull, panelWidth) {
      var cap = panelWidth * 0.15;
      var soft = panelWidth * 0.35;
      return cap * pull / (pull + soft);
    }

    function setStretch(px, panelWidth) {
      if (px > 0 && panelWidth > 0) {
        sidebar.style.width = (panelWidth + px) + 'px';
        sidebar.style.transform = 'translateX(0px)';
        if (scrim) {
          scrim.style.opacity = '';
        }
      } else {
        unstretch();
      }
    }

    var spring = null;

    function endStretchSpring() {
      if (!spring) {
        return;
      }
      sidebar.removeEventListener('transitionend', spring.onEnd);
      window.clearTimeout(spring.timer);
      spring = null;
      sidebar.style.transition = '';
      unstretch();
    }

    function startStretchSpring(panelWidth) {
      var reduce = false;
      try {
        reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (err) {}
      if (reduce) {
        unstretch();
        return;
      }
      sidebar.style.transition = 'width 0.4s var(--spring-ease)';
      sidebar.style.transform = 'translateX(0px)';
      sidebar.style.width = panelWidth + 'px';
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

    var drag = null;
    var suppressClick = false;

    sidebar.addEventListener('pointerdown', function (e) {
      if (!isDrawerMode.matches || !drawerIsOpen() || drag ||
          (e.pointerType === 'touch' && e.isPrimary === false) ||
          !primaryButton(e)) {
        return;
      }
      endStretchSpring();
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
    });

    sidebar.addEventListener('pointermove', function (e) {
      if (!dragPointer(e)) {
        return;
      }
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;

      if (!drag.axis) {
        if (Math.abs(dx) < 7 && Math.abs(dy) < 7) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          try {
            if (sidebar.hasPointerCapture && sidebar.hasPointerCapture(drag.id)) {
              sidebar.releasePointerCapture(drag.id);
            }
          } catch (err) {}
          drag = null;
          return;
        }
        drag.axis = 'x';
        suppressClick = true;
        sidebar.style.transition = 'none';
        sidebar.style.userSelect = 'none';
        try {
          sidebar.setPointerCapture(drag.id);
        } catch (err) {}
      }

      if (dx > 0) {
        var st = stretchFor(dx, drag.w);
        setStretch(st, drag.w);
        if (st > drag.maxStretch) {
          drag.maxStretch = st;
        }
      } else {
        setStretch(0);
        sidebar.style.transform = 'translateX(' + Math.min(0, dx) + 'px)';
        if (scrim) {
          scrim.style.transition = 'none';
          scrim.style.opacity = (0.5 * (1 - slideProgress(dx, drag.w))).toFixed(3);
        }
      }

      var dt = e.timeStamp - drag.lastT;
      if (dt > 0) {
        drag.vx = drag.vx * 0.6 + ((e.clientX - drag.lastX) / dt) * 0.4;
        drag.lastX = e.clientX;
        drag.lastT = e.timeStamp;
      }
    });

    function onRelease(e) {
      if (!dragPointer(e)) {
        return;
      }
      var d = drag;
      drag = null;

      try {
        if (sidebar.hasPointerCapture && sidebar.hasPointerCapture(d.id)) {
          sidebar.releasePointerCapture(d.id);
        }
      } catch (err) {}

      var progress = slideProgress(e.clientX - d.x0, d.w);
      clearInlineMotion();

      if (drawerIsOpen() && (progress >= 0.3 || (progress > 0.08 && d.vx <= -0.35))) {
        trigger.click();
      } else if (d.maxStretch > 1) {
        startStretchSpring(d.w);
      }

      window.setTimeout(function () {
        suppressClick = false;
      }, 60);
    }

    sidebar.addEventListener('pointerup', onRelease);
    sidebar.addEventListener('pointercancel', onRelease);

    sidebar.addEventListener('click', function (e) {
      if (suppressClick) {
        e.preventDefault();
        e.stopImmediatePropagation();
        suppressClick = false;
      }
    }, true);

    /* Links inside drawer: slide drawer closed first, then navigate */
    sidebar.addEventListener('click', function (e) {
      if (!isDrawerMode.matches || !drawerIsOpen() || suppressClick || e.defaultPrevented ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !primaryButton(e)) {
        return;
      }
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !a.href) {
        return;
      }
      if (a.target && a.target !== '_self') {
        return;
      }
      var hrefAttr = a.getAttribute('href') || '';
      if (hrefAttr.startsWith('#') || hrefAttr.startsWith('javascript:')) {
        return;
      }
      var target;
      try {
        target = new URL(a.href, location.href);
      } catch (err) {
        return;
      }
      if (target.origin !== location.origin) {
        return;
      }

      e.preventDefault();
      trigger.click();

      if (target.pathname + target.search === location.pathname + location.search) {
        return;
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
      window.setTimeout(go, 550);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
