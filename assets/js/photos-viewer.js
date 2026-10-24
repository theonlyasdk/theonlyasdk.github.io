/**
 * Photos-style hero image viewer
 *
 * Takes over the GLightbox `.popup` anchors by intercepting clicks in the
 * capture phase, then animates the tapped image from its exact on-screen
 * rectangle into a full-screen carousel (Google/Apple Photos style):
 *   - hero zoom on open, flying back into the cell on dismiss
 *   - vertical drag to dismiss with 1:1 follow
 *   - horizontal swipe for prev/next (axis-locked, never conflated)
 *   - click-to-zoom on desktop, pinch-to-zoom on touch, drag to pan
 *   - double-tap to zoom on touch (toggles between fit and 2.5x)
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
  var closeBtn = null;

  var items = [];
  var index = 0;
  var state = 'idle';
  var gesture = null;
  var chromeShown = false;
  var hiddenThumb = null;

  /* Zoom: `zoom` is the live transform of the current image, expressed in
     the same translate-then-scale space the hero animation uses (the image
     box is already positioned at its fitted rect, transform-origin is 0 0). */
  var MAX_ZOOM = 4;
  var TAP_ZOOM = 2.5;
  var zoom = { s: 1, tx: 0, ty: 0 };
  var pointers = [];
  var pinch = null;

  /* Double-tap to zoom (touch only): a lone tap still toggles the chrome,
     but delayed ~DBL_TAP_MS until we know no second tap is coming; two
     quick taps land on the same spot and zoom toward them. */
  var DBL_TAP_MS = 320;
  var lastTap = null;
  var tapTimer = null;

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
    closeBtn = document.createElement('button');
    closeBtn.id = 'pv-close';
    closeBtn.className = 'pv-close';
    closeBtn.setAttribute('aria-label', 'Close viewer');
    closeBtn.addEventListener('click', function () {
      dismissToCell();
    });

    viewer.appendChild(backdrop);
    viewer.appendChild(track);
    viewer.appendChild(prevBtn);
    viewer.appendChild(nextBtn);
    viewer.appendChild(closeBtn);
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
    /* A resize invalidates the zoom transform, so drop back to fit. */
    zoom.s = 1;
    zoom.tx = 0;
    zoom.ty = 0;
    setZoomAttr();
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
    if (items.length) {
      hideActiveThumb(items[i]);
    }
  }

  /* Only the active image's anchor is hidden from the page (visibility
     keeps its layout size). Hiding the whole anchor rather than the bare
     img also takes away the theme's shimmer placeholder, which would
     otherwise blink through under the dim in the empty cell while the hero
     flies back into it. */
  function hideActiveThumb(it) {
    if (hiddenThumb && hiddenThumb !== it.anchor) {
      hiddenThumb.classList.remove('pv-thumb-hidden');
    }
    hiddenThumb = it.anchor;
    it.anchor.classList.add('pv-thumb-hidden');
  }

  function revealThumb() {
    if (hiddenThumb) {
      hiddenThumb.classList.remove('pv-thumb-hidden');
    }
    hiddenThumb = null;
  }

  function openViewer(anchor) {
    var anchors = currentAnchors();
    var start = anchors.indexOf(anchor);
    if (start < 0) {
      return false;
    }
    ensureOverlay();
    fillTrack(anchors);
    /* Sweep stray markers from any previous interrupted session before the
       fresh take-over. */
    document
      .querySelectorAll('.pv-thumb-hidden')
      .forEach(function (el) {
        el.classList.remove('pv-thumb-hidden');
      });
    setCurrent(start);

    /* setCurrent hides the active image's page copy here; the rest of the
       gallery stays visible in the grid. */
    var it = items[index];
    var r0 = it.thumb.getBoundingClientRect();
    layoutAll();
    pointers = [];
    pinch = null;
    setZoomAttr();

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
    if (state !== 'open' || pinch) {
      return;
    }
    var next = index + delta;
    if (next < 0 || next >= items.length) {
      return;
    }
    resetZoom(false);
    setCurrent(next);
    applyTrack(true);
    itResetTransform(items[index].img);
  }

  function itResetTransform(img) {
    img.style.transition = '';
    img.style.transform = '';
    img.style.borderRadius = '0';
  }

  /* --- Zoom -------------------------------------------------------------- */

  function isZoomed() {
    return zoom.s > 1.001;
  }

  function setZoomAttr() {
    if (viewer) {
      viewer.setAttribute('data-zoom', isZoomed() ? 'out' : 'in');
    }
  }

  /* Keep the zoomed image inside the viewport: centre it on an axis where it
     is smaller than the screen, otherwise clamp its overscroll. */
  function clampZoom() {
    var fit = items[index].fit;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var w = fit.w * zoom.s;
    var h = fit.h * zoom.s;
    if (w <= vw) {
      zoom.tx = (vw - w) / 2 - fit.left;
    } else {
      zoom.tx = Math.min(-fit.left, Math.max(vw - w - fit.left, zoom.tx));
    }
    if (h <= vh) {
      zoom.ty = (vh - h) / 2 - fit.top;
    } else {
      zoom.ty = Math.min(-fit.top, Math.max(vh - h - fit.top, zoom.ty));
    }
  }

  function applyZoom(animate) {
    var it = items[index];
    if (!it || !it.fit) {
      return;
    }
    it.img.style.transition = animate ? 'transform 0.28s ' + EASE : 'none';
    it.img.style.transform =
      'translate(' + zoom.tx + 'px, ' + zoom.ty + 'px) scale(' + zoom.s + ')';
    setZoomAttr();
  }

  function resetZoom(animate) {
    zoom.s = 1;
    zoom.tx = 0;
    zoom.ty = 0;
    var it = items[index];
    if (it && it.fit) {
      it.img.style.transition = animate ? 'transform 0.28s ' + EASE : '';
      it.img.style.transform = '';
      it.img.style.borderRadius = '0';
    }
    setZoomAttr();
  }

  /* Zoom to `scale` keeping the given screen point anchored under the
     cursor/fingers, then clamp back into the viewport. */
  function zoomTo(scale, cx, cy) {
    var fit = items[index].fit;
    var lx = (cx - fit.left - zoom.tx) / zoom.s;
    var ly = (cy - fit.top - zoom.ty) / zoom.s;
    zoom.s = scale;
    zoom.tx = cx - fit.left - scale * lx;
    zoom.ty = cy - fit.top - scale * ly;
    clampZoom();
    applyZoom(true);
  }

  function toggleZoomAt(cx, cy) {
    if (isZoomed()) {
      resetZoom(true);
    } else {
      zoomTo(TAP_ZOOM, cx, cy);
    }
  }

  function clearTapPending() {
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
    }
    lastTap = null;
  }

  /* Decides what a completed tap does. On a mouse, clicks zoom straight
     away. On touch the second quick tap wins the double-tap zoom; the
     lone tap's chrome toggle is deferred until the window closes. */
  function handleTap(x, y, ts, pointerType) {
    if (pointerType === 'mouse') {
      toggleZoomAt(x, y);
      return;
    }
    if (
      lastTap &&
      ts - lastTap.t <= DBL_TAP_MS &&
      Math.abs(x - lastTap.x) < 40 &&
      Math.abs(y - lastTap.y) < 40
    ) {
      clearTapPending();
      zoomTo(isZoomed() ? 1 : TAP_ZOOM, x, y);
      return;
    }
    clearTapPending();
    lastTap = { x: x, y: y, t: ts };
    tapTimer = setTimeout(function () {
      tapTimer = null;
      showChrome(!chromeShown);
    }, DBL_TAP_MS);
  }

  /* Settle after a pinch/pan: fall back to the fitted rect when the user
     pinched all the way out, otherwise keep the clamped zoom. */
  function settleZoom() {
    if (state !== 'open' || !items[index]) {
      return;
    }
    if (zoom.s <= 1.02) {
      resetZoom(true);
    } else {
      clampZoom();
      applyZoom(true);
    }
  }

  function pinchGeometry() {
    var a = pointers[0];
    var b = pointers[1];
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return {
      dist: Math.max(1, Math.sqrt(dx * dx + dy * dy)),
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2
    };
  }

  function startPinch() {
    var g = pinchGeometry();
    var fit = items[index].fit;
    pinch = {
      dist0: g.dist,
      s0: zoom.s,
      /* Image-local point that must stay under the pinch midpoint. */
      localX: (g.x - fit.left - zoom.tx) / zoom.s,
      localY: (g.y - fit.top - zoom.ty) / zoom.s
    };
    items[index].img.style.transition = 'none';
  }

  function removePointer(pid) {
    pointers = pointers.filter(function (p) {
      return p.id !== pid;
    });
  }

  /* --- Gestures --------------------------------------------------------- */

  function onPointerDown(e) {
    if (state !== 'open') {
      return;
    }
    if (e.target.closest && e.target.closest('.pv-nav, .pv-close')) {
      return;
    }
    pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    try {
      viewer.setPointerCapture(e.pointerId);
    } catch (err) {
      /* capture is best-effort */
    }

    if (pointers.length === 2) {
      /* Second finger: drop whatever the first one started and pinch. */
      clearTapPending();
      if (gesture) {
        if (gesture.axis === 'y') {
          springBack();
        } else if (gesture.axis === 'x') {
          applyTrack(true);
        }
        gesture = null;
      }
      startPinch();
      return;
    }
    if (pointers.length > 2 || pinch) {
      return;
    }

    gesture = {
      id: e.pointerId,
      pointerType: e.pointerType || 'mouse',
      x0: e.clientX,
      y0: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: e.timeStamp,
      vx: 0,
      vy: 0,
      /* While zoomed a drag pans the zoomed image instead of dismissing or
         flipping pages. */
      axis: isZoomed() ? 'pan' : null,
      tx0: zoom.tx,
      ty0: zoom.ty
    };
  }

  function onPointerMove(e) {
    var i;
    for (i = 0; i < pointers.length; i++) {
      if (pointers[i].id === e.pointerId) {
        pointers[i].x = e.clientX;
        pointers[i].y = e.clientY;
      }
    }

    if (state !== 'open') {
      return;
    }

    if (pinch) {
      var g = pinchGeometry();
      var s = Math.min(MAX_ZOOM, Math.max(1, pinch.s0 * g.dist / pinch.dist0));
      var fit = items[index].fit;
      zoom.s = s;
      zoom.tx = g.x - fit.left - s * pinch.localX;
      zoom.ty = g.y - fit.top - s * pinch.localY;
      clampZoom();
      applyZoom(false);
      return;
    }

    if (gesture === null || e.pointerId !== gesture.id) {
      return;
    }
    var dx = e.clientX - gesture.x0;
    var dy = e.clientY - gesture.y0;

    if (gesture.axis === 'pan') {
      zoom.tx = gesture.tx0 + dx;
      zoom.ty = gesture.ty0 + dy;
      clampZoom();
      applyZoom(false);
      return;
    }

    if (gesture.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        return;
      }
      gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      /* A drag is no tap: cancel any deferred chrome toggle. */
      clearTapPending();
      if (gesture.axis === 'y') {
        items[index].img.style.transition = 'none';
        /* Hide the chrome right away: caption and arrows must not float
           over an in-flight image while the drag is held. */
        showChrome(false);
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
    removePointer(e.pointerId);

    if (pinch) {
      if (pointers.length >= 2) {
        /* Lifted one of three+ fingers: re-baseline the remaining pinch. */
        startPinch();
        return;
      }
      pinch = null;
      gesture = null;
      settleZoom();
      return;
    }

    if (gesture === null || e.pointerId !== gesture.id) {
      return;
    }
    var g = gesture;
    gesture = null;
    if (state !== 'open' || g.axis === null) {
      if (g.axis === null && state === 'open' && e.type !== 'pointercancel') {
        /* Pointer capture retargets pointerup to the viewer, so hit-test
           the real element under the finger: a click on the open image
           zooms toward it (mouse, the cursor advertises it) or toggles the
           chrome (touch); anything outside dismisses with the hero flight. */
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        if (hit && items[index].fig && items[index].fig.contains(hit)) {
          handleTap(e.clientX, e.clientY, e.timeStamp, g.pointerType);
        } else {
          dismissToCell();
        }
      }
      return;
    }

    if (g.axis === 'pan') {
      var pdx = e.clientX - g.x0;
      var pdy = e.clientY - g.y0;
      /* A pan that never really moved is a click: zoom back out (mouse) or
         toggle the chrome (touch) on the image; anything outside dismisses.
         Same hit-test as the unzoomed tap: pointer capture retargets the
         pointerup, so e.target can't be trusted. */
      if (Math.abs(pdx) < 6 && Math.abs(pdy) < 6 && e.type !== 'pointercancel') {
        var hit = document.elementFromPoint(e.clientX, e.clientY);
        if (hit && items[index].fig && items[index].fig.contains(hit)) {
          handleTap(e.clientX, e.clientY, e.timeStamp, g.pointerType);
        } else {
          dismissToCell();
        }
        return;
      }
      settleZoom();
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
      if (target !== index) {
        resetZoom(false);
      }
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
    showChrome(true);
  }

  /* Fly the open image back into its originating grid cell (hero-out), or
     fall away and fade when the cell is off-screen. */
  function dismissToCell() {
    if (state !== 'open') {
      return;
    }
    state = 'closing';
    viewer.setAttribute('data-state', 'closing');
    showChrome(false);
    /* A zoomed image can't fly back to its cell from a scaled state, so snap
       the transform to the fitted rect first and let the flight take over. */
    if (isZoomed()) {
      resetZoom(false);
    }

    var it = items[index];
    var r0 = it.thumb.getBoundingClientRect();
    var img = it.img;
    var finished = false;

    function finish() {
      if (finished) {
        return;
      }
      finished = true;
      closeDone();
    }

    if (r0.width > 2 && r0.bottom > 0 && r0.top < window.innerHeight) {
      var dx = r0.left - it.fit.left;
      var dy = r0.top - it.fit.top;
      var s = r0.width / it.fit.w;
      /* Land with the same corner rounding the page copy renders with, so
         the final overlay-to-page swap is invisible. */
      var pageRadius = window.getComputedStyle(it.thumb).borderRadius;
      img.style.transition =
        'transform 0.35s ' + EASE + ', border-radius 0.35s ease';
      img.style.borderRadius = pageRadius;
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

    /* Unmount only after the flight actually paints its last frame; a
       fixed timer can fire a frame early on slow renders and flash at the
       landing cell. */
    img.addEventListener('transitionend', function (ev) {
      if (ev.propertyName === 'transform') {
        finish();
      }
    });
    window.setTimeout(finish, 450);
  }

  function closeDone() {
    state = 'idle';
    viewer.hidden = true;
    viewer.setAttribute('data-state', 'idle');
    showChrome(false);
    document.removeEventListener('keydown', onKey);
    /* Reveal the page's own copy now that the overlay has landed on it. */
    revealThumb();
    track.innerHTML = '';
    items = [];
    gesture = null;
    pinch = null;
    pointers = [];
    clearTapPending();
    zoom.s = 1;
    zoom.tx = 0;
    zoom.ty = 0;
    if (viewer) {
      viewer.removeAttribute('data-zoom');
    }
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
