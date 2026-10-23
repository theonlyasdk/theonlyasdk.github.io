/**
 * Photos-style hero image viewer
 *
 * Takes over the GLightbox `.popup` anchors by intercepting clicks in the
 * capture phase, then animates the tapped image from its exact on-screen
 * rectangle into a full-screen carousel (Google/Apple Photos style):
 *   - hero zoom on open, flying back into the cell on dismiss
 *   - vertical drag to dismiss with 1:1 follow
 *   - horizontal swipe for prev/next (axis-locked, never conflated)
 */
(function () {
  'use strict';

  var SELECTOR = 'a.popup';
  var EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';

  var viewer = null;
  var backdrop = null;
  var track = null;
  var caption = null;
  var prevBtn = null;
  var nextBtn = null;

  var items = [];
  var index = 0;
  var state = 'idle';
  var gesture = null;
  var chromeShown = false;

  function isDark() {
    var mode = document.documentElement.getAttribute('data-mode');
    if (mode) {
      return mode === 'dark';
    }
    try {
      mode = sessionStorage.getItem('mode');
    } catch (err) {
      mode = null;
    }
    if (mode) {
      return mode === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function currentAnchors() {
    var dark = isDark();
    return Array.prototype.filter.call(
      document.querySelectorAll(SELECTOR),
      function (a) {
        return (
          a.querySelector('img') !== null &&
          !(dark ? a.classList.contains('light') : a.classList.contains('dark'))
        );
      }
    );
  }

  function ensureOverlay() {
    if (viewer) {
      return;
    }
    viewer = document.createElement('div');
    viewer.id = 'photos-viewer';
    viewer.hidden = true;
    viewer.setAttribute('data-state', 'idle');

    backdrop = document.createElement('div');
    backdrop.id = 'pv-backdrop';

    track = document.createElement('div');
    track.id = 'pv-track';

    caption = document.createElement('div');
    caption.id = 'pv-caption';

    prevBtn = document.createElement('button');
    prevBtn.id = 'pv-prev';
    prevBtn.className = 'pv-nav';
    prevBtn.setAttribute('aria-label', 'Previous image');

    nextBtn = document.createElement('next-placeholder');
    nextBtn = document.createElement('button');
    nextBtn.id = 'pv-next';
    nextBtn.className = 'pv-nav';
    nextBtn.setAttribute('aria-label', 'Next image');

    prevBtn.addEventListener('click', function () {
      navigate(-1);
    });
    nextBtn.addEventListener('click', function () {
      navigate(1);
    });

    viewer.appendChild(backdrop);
    viewer.appendChild(track);
    viewer.appendChild(prevBtn);
    viewer.appendChild(nextBtn);
    viewer.appendChild(caption);
    document.body.appendChild(viewer);

    viewer.addEventListener('wheel', function (e) {
      e.preventDefault();
    }, { passive: false });

    viewer.addEventListener('pointerdown', onPointerDown);
    viewer.addEventListener('pointermove', onPointerMove);
    viewer.addEventListener('pointerup', onPointerUp);
    viewer.addEventListener('pointercancel', onPointerUp);

    window.addEventListener('resize', onResize);
  }

  function fillTrack(anchors) {
    track.innerHTML = '';
    items = anchors.map(function (a) {
      var thumb = a.querySelector('img');
      var src = thumb.getAttribute('src');
      var img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.draggable = false;

      var nw = thumb.naturalWidth || thumb.getAttribute('width') || 1600;
      var nh = thumb.naturalHeight || thumb.getAttribute('height') || 900;
      img.setAttribute('width', nw);
      img.setAttribute('height', nh);

      var fig = document.createElement('figure');
      fig.className = 'pv-item';
      fig.appendChild(img);
      track.appendChild(fig);

      return {
        anchor: a,
        thumb: thumb,
        src: src,
        alt: thumb.getAttribute('alt') || '',
        fig: fig,
        img: img,
        fit: null
      };
    });
  }

  /* Place every image in its fitted, centered box for the current viewport. */
  function layoutAll() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    items.forEach(function (it, i) {
      it.fig.style.left = (i * 100) + '%';
      var nw = it.img.naturalWidth || it.img.getAttribute('width') || 1600;
      var nh = it.img.naturalHeight || it.img.getAttribute('height') || 900;
      var k = Math.min(vw / nw, (vh * 0.96) / nh);
      var w = Math.round(nw * k);
      var h = Math.round(nh * k);
      it.fit = { left: Math.round((vw - w) / 2), top: Math.round((vh - h) / 2), w: w, h: h };
      var img = it.img;
      var saved = img.style.transition;
      img.style.transition = 'none';
      img.style.left = it.fit.left + 'px';
      img.style.top = it.fit.top + 'px';
      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.transform = '';
      img.style.borderRadius = '0';
      img.style.opacity = '';
      void img.offsetWidth;
      img.style.transition = saved;
    });
    applyTrack(false);
  }

  function applyTrack(animate) {
    track.style.transition = animate ? 'transform 0.35s ' + EASE : 'none';
    track.style.transform = 'translateX(-' + (index * 100) + '%)';
  }

  function setCurrent(i) {
    items.forEach(function (it, j) {
      it.fig.classList.toggle('pv-item-current', j === i);
    });
    index = i;
    caption.textContent = items[i].alt;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === items.length - 1;
  }

  function openViewer(anchor) {
    var anchors = currentAnchors();
    var start = anchors.indexOf(anchor);
    if (start < 0) {
      return false;
    }
    ensureOverlay();
    fillTrack(anchors);
    setCurrent(start);

    /* The viewer's images take over the page's own copies: hide those (they
       keep their layout size) so the flying image never doubles with the
       original during translucent-dim dismissals. */
    document
      .querySelectorAll('.pv-thumb-hidden')
      .forEach(function (el) {
        el.classList.remove('pv-thumb-hidden');
      });
    items.forEach(function (it) {
      it.thumb.classList.add('pv-thumb-hidden');
    });

    var it = items[index];
    var r0 = it.thumb.getBoundingClientRect();
    layoutAll();

    state = 'opening';
    viewer.hidden = false;
    viewer.setAttribute('data-state', 'opening');
    viewer.removeAttribute('data-chrome');
    chromeShown = false;
    backdrop.style.transition = 'opacity 0.38s ' + EASE;
    backdrop.style.opacity = '0';

    document.addEventListener('keydown', onKey);

    var dx = r0.left - it.fit.left;
    var dy = r0.top - it.fit.top;
    var s = r0.width / it.fit.w;
    it.img.style.transform =
      'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        it.img.style.transition = 'transform 0.38s ' + EASE;
        it.img.style.transform = 'translate(0, 0) scale(1)';
        backdrop.style.opacity = '1';
        window.setTimeout(function () {
          if (state !== 'opening') {
            return;
          }
          state = 'open';
          viewer.setAttribute('data-state', 'open');
          showChrome(true);
        }, 400);
      });
    });
    return true;
  }

  function showChrome(show) {
    chromeShown = show;
    if (show) {
      viewer.setAttribute('data-chrome', 'show');
    } else {
      viewer.removeAttribute('data-chrome');
    }
  }

  function navigate(delta) {
    if (state !== 'open') {
      return;
    }
    var next = index + delta;
    if (next < 0 || next >= items.length) {
      return;
    }
    setCurrent(next);
    applyTrack(true);
    itResetTransform(items[index].img);
  }

  function itResetTransform(img) {
    img.style.transition = '';
    img.style.transform = '';
    img.style.borderRadius = '0';
  }

  /* --- Gestures --------------------------------------------------------- */

  function onPointerDown(e) {
    if (state !== 'open' || gesture !== null) {
      return;
    }
    if (e.target.closest && e.target.closest('.pv-nav')) {
      return;
    }
    gesture = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: e.timeStamp,
      vx: 0,
      vy: 0,
      axis: null
    };
    try {
      viewer.setPointerCapture(e.pointerId);
    } catch (err) {
      /* capture is best-effort */
    }
  }

  function onPointerMove(e) {
    if (gesture === null || e.pointerId !== gesture.id || state !== 'open') {
      return;
    }
    var dx = e.clientX - gesture.x0;
    var dy = e.clientY - gesture.y0;

    if (gesture.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (gesture.axis === 'y') {
        items[index].img.style.transition = 'none';
        /* Dim follows the finger 1:1 while dragging. */
        backdrop.style.transition = 'none';
      } else if (gesture.axis === 'x') {
        track.style.transition = 'none';
      }
    }

    var dt = e.timeStamp - gesture.lastT;
    if (dt > 0) {
      var vx = (e.clientX - gesture.lastX) / dt;
      var vy = (e.clientY - gesture.lastY) / dt;
      gesture.vx = gesture.vx * 0.6 + vx * 0.4;
      gesture.vy = gesture.vy * 0.6 + vy * 0.4;
      gesture.lastX = e.clientX;
      gesture.lastY = e.clientY;
      gesture.lastT = e.timeStamp;
    }

    if (gesture.axis === 'x') {
      /* Horizontal swipe = carousel navigation with edge rubber-banding. */
      var off = dx;
      if ((index === 0 && dx > 0) || (index === items.length - 1 && dx < 0)) {
        off = dx * 0.35;
      }
      track.style.transform =
        'translateX(' + (-index * window.innerWidth + off) + 'px)';
    } else {
      /* Vertical drag = dismiss; upward is resisted, downward follows. */
      var dyE = dy < 0 ? dy * 0.2 : dy;
      var p = Math.min(1, Math.abs(dyE) / (window.innerHeight * 0.45));
      var img = items[index].img;
      img.style.transform =
        'translate(0, ' + dyE + 'px) scale(' + (1 - 0.12 * p) + ')';
      img.style.borderRadius = (14 * p) + 'px';
      backdrop.style.opacity = String(1 - p * 0.9);
    }
  }

  function onPointerUp(e) {
    if (gesture === null || e.pointerId !== gesture.id) {
      return;
    }
    var g = gesture;
    gesture = null;
    if (state !== 'open' || g.axis === null) {
      if (g.axis === null && state === 'open') {
        /* Plain tap: toggle the chrome, like Photos. */
        showChrome(!chromeShown);
      }
      return;
    }

    var dx = e.clientX - g.x0;
    var dy = e.clientY - g.y0;

    if (g.axis === 'x') {
      var target = Math.abs(dx) > window.innerWidth * 0.2 ||
        (Math.abs(dx) > 40 && Math.abs(g.vx) > 0.5)
        ? index + (dx < 0 ? 1 : -1)
        : index;
      target = Math.max(0, Math.min(items.length - 1, target));
      setCurrent(target);
      applyTrack(true);
    } else {
      var dismiss =
        dy > window.innerHeight * 0.22 || (dy > 40 && g.vy > 0.6);
      if (dismiss) {
        dismissToCell();
      } else {
        springBack();
      }
    }
  }

  function springBack() {
    var img = items[index].img;
    img.style.transition =
      'transform 0.32s ' + EASE + ', border-radius 0.32s ease';
    img.style.transform = 'translate(0, 0) scale(1)';
    img.style.borderRadius = '0';
    backdrop.style.transition = 'opacity 0.32s ' + EASE;
    backdrop.style.opacity = '1';
  }

  /* Fly the open image back into its originating grid cell (hero-out), or
     fall away and fade when the cell is off-screen. */
  function dismissToCell() {
    state = 'closing';
    viewer.setAttribute('data-state', 'closing');
    showChrome(false);

    var it = items[index];
    var r0 = it.thumb.getBoundingClientRect();
    var img = it.img;

    if (r0.width > 2 && r0.bottom > 0 && r0.top < window.innerHeight) {
      var dx = r0.left - it.fit.left;
      var dy = r0.top - it.fit.top;
      var s = r0.width / it.fit.w;
      img.style.transition =
        'transform 0.35s ' + EASE + ', border-radius 0.35s ease';
      img.style.borderRadius = '0';
      img.style.transform =
        'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
    } else {
      img.style.transition =
        'transform 0.3s ease-in, opacity 0.3s ease-in';
      img.style.transform =
        'translate(0, ' + (window.innerHeight * 0.25) + 'px) scale(0.9)';
      img.style.opacity = '0';
    }
    backdrop.style.transition = 'opacity 0.35s ' + EASE;
    backdrop.style.opacity = '0';

    window.setTimeout(closeDone, 380);
  }

  function closeDone() {
    state = 'idle';
    viewer.hidden = true;
    viewer.setAttribute('data-state', 'idle');
    showChrome(false);
    document.removeEventListener('keydown', onKey);
    /* Reveal the page's own images now that the overlay has landed on them. */
    document
      .querySelectorAll('.pv-thumb-hidden')
      .forEach(function (el) {
        el.classList.remove('pv-thumb-hidden');
      });
    track.innerHTML = '';
    items = [];
    gesture = null;
    backdrop.style.opacity = '0';
  }

  /* --- Global wiring ----------------------------------------------------- */

  function onKey(e) {
    if (state !== 'open') {
      if (e.key === 'Escape' && state === 'opening') {
        e.preventDefault();
        return;
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      dismissToCell();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigate(1);
    }
  }

  function onResize() {
    if (state === 'open') {
      layoutAll();
    }
  }

  /* Intercept .popup clicks in the capture phase so GLightbox — bound on the
     anchors themselves — never sees them; the viewer takes over instead. */
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) {
      return;
    }
    var a = e.target.closest(SELECTOR);
    if (!a) {
      return;
    }
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (!a.querySelector('img')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    openViewer(a);
  }, true);
})();
