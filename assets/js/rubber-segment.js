/* RubberSegment - vanilla JS port of the React Bits component.
 *
 * Reproduces the *motion* of the original (reactbits.dev, RubberSegment): the
 * two-edge "blob stick" thumb, the dilate-then-land handoff, the trailing-edge
 * squash, rubber-band resistance while dragging, and flick momentum with glide.
 *
 * Deliberate scope: this repo has no React/bundler, so the physics are ported
 * to plain JS driving the EXISTING pill markup and CSS. It changes no colors,
 * sizes, or typography - only how the pill moves and that it can be dragged.
 * The original's "riding label" (a duplicate label clipped inside the thumb) is
 * intentionally omitted: both call sites already colour the active label via
 * CSS, and adding a second copy would change the look, which we must not do.
 *
 * Spring math: analytic damped harmonic oscillator. `duration` calibrates the
 * angular frequency so a critically damped (bounce 0) spring settles in ~that
 * time; `bounce` lowers the damping ratio to add overshoot. Matches the feel of
 * Motion's { type: spring, duration, bounce }.
 */
(function () {
  'use strict';

  /* ---- tuning constants (verbatim from the component) ---- */
  var EASE_OUT = [0.23, 1, 0.32, 1];
  var DILATE = 0.19; // tap: dilate duration
  var HANDOFF = 0.15; // tap: dilate -> land handoff
  var FLICK = 110; // velocity that counts as a flick
  var MAX_VELOCITY = 2000;
  var DEADZONE = 4; // px before a drag goes live
  var SLOP = 10; // px still considered a tap
  var RUBBER = 0.55;
  var SPRING_UI = { duration: 0.3, bounce: 0 };
  var SPRING_MOMENTUM = { duration: 0.4, bounce: 0.2 };
  var SPRING_RELAX = { duration: 0.16, bounce: 0 };

  /* ---- helpers (verbatim from the component) ---- */
  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  function rubber(over, dim) {
    return ((over * dim * RUBBER) / (dim + RUBBER * Math.abs(over)));
  }
  function project(v, glide) {
    var d = 1 - 0.1 * Math.pow(0.05, glide / 100);
    return ((v / 1000) * d) / (1 - d);
  }
  function velocityOf(hist, now) {
    var recent = hist.filter(function (p) {
      return now - p[0] <= 100;
    });
    if (recent.length < 2) return 0;
    var a = recent[0];
    var b = recent[recent.length - 1];
    return b[0] - a[0] >= 8 ? ((b[1] - a[1]) / (b[0] - a[0])) * 1000 : 0;
  }
  function nearestSlot(slots, x) {
    var best = 0;
    for (var i = 1; i < slots.length; i++) {
      if (
        Math.abs((slots[i].l + slots[i].r) / 2 - x) <
        Math.abs((slots[best].l + slots[best].r) / 2 - x)
      ) {
        best = i;
      }
    }
    return best;
  }

  /* Spring calibration: critical damping reaches ~0.5% of its start error at
     omega*t ~= 7.5, so omega = 7.5/duration lands "settled" on the duration. */
  function springOmega(duration) {
    return 7.5 / Math.max(0.016, duration);
  }

  /* Cubic bezier easing (for the dilate tween). Newton + bisection fallback. */
  function bezier(p1x, p1y, p2x, p2y) {
    function A(a, b) {
      return 1 - 3 * b + 3 * a;
    }
    function B(a, b) {
      return 3 * b - 6 * a;
    }
    function C(a) {
      return 3 * a;
    }
    function calc(t, a, b) {
      return ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
    }
    function slope(t, a, b) {
      return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
    }
    function tForX(x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(t, p1x, p2x);
        if (s === 0) break;
        var e = calc(t, p1x, p2x) - x;
        if (Math.abs(e) < 1e-5) return t;
        t -= e / s;
      }
      var lo = 0;
      var hi = 1;
      t = x;
      for (var j = 0; j < 24; j++) {
        var v = calc(t, p1x, p2x);
        if (Math.abs(v - x) < 1e-5) return t;
        if (v > x) hi = t;
        else lo = t;
        t = (lo + hi) / 2;
      }
      return t;
    }
    return function (x) {
      return calc(tForX(x), p1y, p2y);
    };
  }
  var easeOut = bezier(EASE_OUT[0], EASE_OUT[1], EASE_OUT[2], EASE_OUT[3]);

  /* ---- rAF scheduler shared by every instance ---- */
  var ticking = false;
  var lastNow = 0;
  var instances = [];

  /* True only between a pointerup and the click it synthesises. The browser
     fires pointerup -> mouseup -> click in one input batch, so clearing it on a
     macrotask is exactly "this click came from a tap", which is what stops the
     keyboard click handler below from handling the same gesture twice. */
  var pointerTap = false;

  function requestTick() {
    if (ticking) return;
    ticking = true;
    lastNow = 0;
    requestAnimationFrame(tick);
  }
  function tick(now) {
    var dt = lastNow ? Math.min((now - lastNow) / 1000, 1 / 30) : 1 / 60;
    lastNow = now;
    var active = false;
    for (var i = 0; i < instances.length; i++) {
      if (instances[i].advance(dt)) active = true;
    }
    if (active) {
      requestAnimationFrame(tick);
    } else {
      ticking = false;
    }
  }

  /* A single animatable edge of the thumb (position + velocity + animation). */
  function makeEdge(initial) {
    return {
      v: initial || 0,
      vel: 0,
      prev: initial || 0,
      anim: null,
      spring: null,
      tween: null
    };
  }

  function RubberSegment(options) {
    var track = options.track;
    var pill = options.pill;
    var items = options.items.slice();
    var inset = options.inset != null ? options.inset : 3;
    var stretch = options.stretch != null ? options.stretch : 100;
    var squash = options.squash != null ? options.squash : 3;
    var speed = options.speed != null ? options.speed : 1;
    var glide = options.glide != null ? options.glide : 75;
    var draggable = options.draggable !== false;
    var disabled = !!options.disabled;
    var onChange = options.onChange;

    var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function reduced() {
      return reduceQuery.matches;
    }

    var slots = [];
    var innerW = 0;
    var box = null;
    var borderLeft = 0;
    var committed = 0;
    var handoff = 0;
    var drag = null;
    var gen = 0;
    var alive = true;
    var resizeObserver = null;

    var edgeL = makeEdge(0);
    var edgeR = makeEdge(0);

    function t(sec) {
      return sec / speed;
    }

    /* Write the two edges to the pill. Two coordinate spaces are in play:
       - slots are measured inset-relative to the track's BORDER box
       - the pill is absolutely positioned, so its `left` is relative to the
         track's PADDING box
       A border therefore shifts every pill by its own width: the resource tab
       bar has a 1px border, the projects toggles have none. */
function paint() {
  var left = edgeL.v + inset - borderLeft;
      var width = Math.max(0, edgeR.v - edgeL.v);
      pill.style.transition = 'none';
      pill.style.left = left.toFixed(2) + 'px';
      pill.style.width = width.toFixed(2) + 'px';
      pill.style.right = 'auto';
      pill.style.transform = 'none';
    }

    /* Animate one edge with a tween. */
    function tweenEdge(edge, to, dur) {
      edge.tween = { from: edge.v, to: to, elapsed: 0, dur: Math.max(0.001, dur) };
      edge.spring = null;
      edge.anim = 'tween';
    }

    /* Animate one edge with a spring; calls onDone when it settles. */
    function springEdge(edge, to, cfg, v0, onDone) {
      edge.tween = null;
      edge.spring = {
        to: to,
        omega: springOmega(t(cfg.duration)),
        zeta: 1 - cfg.bounce,
        vel0: v0 || 0,
        elapsed: 0,
        onDone: onDone || null
      };
      edge.anim = 'spring';
    }

    function stopEdge(edge) {
      edge.anim = null;
      edge.tween = null;
      edge.spring = null;
    }

    function jumpTo(i) {
      var s = slots[i];
      if (!s) return;
      clearTimeout(handoff);
      gen += 1;
      stopEdge(edgeL);
      stopEdge(edgeR);
      edgeL.v = s.l;
      edgeR.v = s.r;
      edgeL.vel = 0;
      edgeR.vel = 0;
      edgeL.prev = s.l;
      edgeR.prev = s.r;
      paint();
    }

    function measure() {
      if (!alive || !track) return;
      var rect = track.getBoundingClientRect();
      box = rect;
      /* clientLeft is the border+scrollbar offset of the padding box, which is
         exactly what absolutely-positioned children are laid out against. */
      borderLeft = track.clientLeft || 0;
      slots = items.map(function (el) {
        if (!el) return { l: 0, r: 0 };
        var r = el.getBoundingClientRect();
        return { l: r.left - rect.left - inset, r: r.right - rect.left - inset };
      });
      innerW = rect.width - inset * 2;
      jumpTo(committed);
    }

    /* Critically damped follow used while the thumb is being dragged. Runs every
       frame toward the detent target rather than jumping straight to the
       pointer, so the thumb settles into a slot on its own while the finger is
       still down. Sub-stepped because the outer dt can be large (throttled
       tabs) and explicit integration would go unstable. */
    function stepEdge(edge, target, dt) {
      var K = 400;
      var C = 2 * Math.sqrt(K) * 0.92;
      var steps = Math.min(6, Math.max(1, Math.ceil(dt * 240)));
      var h = dt / steps;
      for (var i = 0; i < steps; i++) {
        edge.vel += (K * (target - edge.v) - C * edge.vel) * h;
        edge.v += edge.vel * h;
      }
    }

    /* Advance all edges one frame. Returns true if anything is still moving. */
    function advance(dt) {
      if (!alive) return false;

      /* A live drag owns the edges outright: no tween or spring is running
         while the thumb is held. */
      if (drag && drag.live) {
        stepEdge(edgeL, drag.tL, dt);
        stepEdge(edgeR, drag.tR, dt);
        paint();
        return true;
      }

      var moving = false;

      [edgeL, edgeR].forEach(function (edge) {
        if (!edge.anim) return;
        moving = true;
        if (edge.anim === 'tween') {
          var tw = edge.tween;
          tw.elapsed += dt;
          var p = clamp(tw.elapsed / tw.dur, 0, 1);
          edge.v = tw.from + (tw.to - tw.from) * easeOut(p);
          /* Track velocity (px/s; dt is already in seconds) so the handoff
             spring can inherit momentum. */
          edge.vel = (edge.v - edge.prev) / dt;
          edge.prev = edge.v;
          if (p >= 1) {
            edge.v = tw.to;
            edge.anim = null;
            edge.tween = null;
          }
        } else {
          var sp = edge.spring;
          sp.elapsed += dt;
          var omega = sp.omega;
          var zeta = clamp(sp.zeta, 0, 1);
          var y0 = edge.v - sp.to; // displacement from target
          /* Use the captured (clamped) launch velocity, NOT edge.vel - that is
             still the outgoing tween's raw velocity and blows the spring up. */
          var v0 = sp.vel0;
          var time = sp.elapsed;
          var y, v;
          if (zeta >= 1) {
            var e = Math.exp(-omega * time);
            var c1 = y0;
            var c2 = v0 + omega * y0;
            y = (c1 + c2 * time) * e;
            v = (c2 - omega * (c1 + c2 * time)) * e;
          } else {
            var wd = omega * Math.sqrt(1 - zeta * zeta);
            var ee = Math.exp(-zeta * omega * time);
            var a1 = y0;
            var a2 = (v0 + zeta * omega * y0) / wd;
            var cos = Math.cos(wd * time);
            var sin = Math.sin(wd * time);
            y = (a1 * cos + a2 * sin) * ee;
            v =
              (-zeta * omega * (a1 * cos + a2 * sin) +
                wd * (-a1 * sin + a2 * cos)) * ee;
          }
          edge.v = sp.to + y;
          edge.vel = v;
          // Settled when displacement and velocity are both negligible.
          if (Math.abs(y) < 0.05 && Math.abs(v) < 0.5 && time > 0.05) {
            edge.v = sp.to;
            edge.vel = 0;
            var done = sp.onDone;
            edge.anim = null;
            edge.spring = null;
            if (done) done();
          }
        }
      });

      if (moving) paint();
      return moving;
    }

    /* --- the phase machine, mirroring the component --- */

    function commit(i) {
      committed = i;
      if (onChange) onChange(i, items[i]);
    }

    function land(to, v, flick, withSquash) {
      var b = slots[to];
      if (!b) return;
      var g = ++gen;
      var dir = Math.sign((b.l + b.r) / 2 - (edgeL.v + edgeR.v) / 2) || 1;
      var lead = dir > 0 ? edgeR : edgeL;
      var leadTo = dir > 0 ? b.r : b.l;
      var trail = dir > 0 ? edgeL : edgeR;
      var trailTo = dir > 0 ? b.l : b.r;

      function velOf(mv) {
        return clamp(v == null ? mv.vel : v, -MAX_VELOCITY, MAX_VELOCITY);
      }

      springEdge(
        lead,
        leadTo,
        flick ? SPRING_MOMENTUM : SPRING_UI,
        velOf(lead)
      );

      var tv = velOf(trail);
      if (!withSquash || squash <= 0) {
        springEdge(trail, trailTo, SPRING_UI, tv);
      } else {
        springEdge(trail, trailTo + dir * squash, SPRING_UI, tv, function () {
          if (gen === g) springEdge(trail, trailTo, SPRING_RELAX, 0);
        });
      }
      requestTick();
    }

    function travel(from, to) {
      var a = slots[from];
      var b = slots[to];
      if (!a || !b) return;
      clearTimeout(handoff);
      gen += 1;
      if (reduced()) {
        jumpTo(to);
        return;
      }
      var u = stretch / 100;
      tweenEdge(edgeL, b.l + (Math.min(a.l, b.l) - b.l) * u, t(DILATE));
      tweenEdge(edgeR, b.r + (Math.max(a.r, b.r) - b.r) * u, t(DILATE));
      paint();
      handoff = setTimeout(function () {
        land(to, null, false, true);
      }, t(HANDOFF) * 1000);
      requestTick();
    }

    function localX(e) {
      return e.clientX - (box ? box.left : 0) - inset;
    }

    function onPointerDown(e, i) {
      if (disabled || drag || e.button !== 0) return;
      box = track.getBoundingClientRect();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture is best-effort */
      }
      var x = localX(e);
      var onThumb = draggable && x >= edgeL.v && x <= edgeR.v;
      drag = {
        id: e.pointerId,
        x0: x,
        slot: i,
        onThumb: onThumb,
        live: false,
        offset: 0,
        w: 0,
        tL: 0,
        tR: 0,
        committedIndex: committed,
        hist: [[e.timeStamp, x]]
      };
      if (onThumb) {
        clearTimeout(handoff);
        gen += 1;
        stopEdge(edgeL);
        stopEdge(edgeR);
        drag.tL = edgeL.v;
        drag.tR = edgeR.v;
      }
    }

    function onPointerMove(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id || !d.onThumb) return;
      var x = localX(e);
      d.hist.push([e.timeStamp, x]);
      if (d.hist.length > 8) d.hist.shift();
      if (!d.live) {
        if (Math.abs(x - d.x0) < DEADZONE) return;
        d.live = true;
        d.offset = x - edgeL.v;
        d.w = edgeR.v - edgeL.v;
        /* Zero both velocities. They can differ after an interrupted
           animation, and the two edges are integrated independently toward
           targets a constant apart - mismatched initial velocity makes the
           thumb visibly wobble in width while being dragged. */
        edgeL.vel = 0;
        edgeR.vel = 0;
        d.tL = edgeL.v;
        d.tR = edgeR.v;
      }
      var width = innerW;
      var l = x - d.offset;

      /* Detent. Without it the thumb tracks the finger 1:1 and only ever
         settles when released. Resisting travel away from a slot's centre
         makes it snap back into place under the finger, and crossing a
         midpoint hands it to the next slot. Extra travel past DETENT is
         rubber-banded, so the pull grows the further you drag. */
      if (!reduced()) {
        var centre = l + d.w / 2;
        var slot = slots[nearestSlot(slots, centre)];
        if (slot) {
          var sc = (slot.l + slot.r) / 2;
          var detent = Math.max(6, d.w * 0.16);
          var off = centre - sc;
          var absOff = Math.abs(off);
          if (absOff > detent) {
            var resisted = detent + rubber(absOff - detent, d.w);
            off = (off < 0 ? -1 : 1) * resisted;
          }
          l = sc + off - d.w / 2;
        }
      }

      var maxL = width - d.w;
      if (reduced()) {
        var c = clamp(l, 0, maxL);
        d.tL = c;
        d.tR = c + d.w;
      } else if (l < 0) {
        /* Past the track edge the thumb compresses instead of leaving. */
        d.tL = 0;
        d.tR = d.w - rubber(-l, d.w);
      } else if (l > maxL) {
        d.tR = width;
        d.tL = maxL + rubber(l - maxL, d.w);
      } else {
        d.tL = l;
        d.tR = l + d.w;
      }

      /* Commit as soon as a slot is reached, so the target changes while the
         finger is still down - no release needed to see the result. */
      var near = nearestSlot(slots, (d.tL + d.tR) / 2);
      if (near !== d.committedIndex) {
        d.committedIndex = near;
        if (near !== committed) commit(near);
      }
      requestTick();
    }

    function releaseDrag() {
      var d = drag;
      drag = null;
      return d;
    }

    function onPointerUp(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      releaseDrag();
      pointerTap = true;
      setTimeout(function () {
        pointerTap = false;
      }, 0);
      var x = localX(e);
      if (!d.live) {
        /* Always commit on tap, even for the current slot. The call sites use
           onChange to reset their own filter, so re-selecting the already
           active tab must still fire (e.g. clearing a tag filter back to
           "All"). travel() with from === to is a harmless re-dilate. */
        var from = committed;
        commit(d.slot);
        travel(from, d.slot);
        return;
      }
      var v = velocityOf(d.hist, e.timeStamp);
      var flick = Math.abs(v) > FLICK;
      var to = nearestSlot(slots, (edgeL.v + edgeR.v) / 2 + project(v, glide));
      if (flick && to === committed) {
        to = clamp(to + Math.sign(v), 0, items.length - 1);
      }
      commit(to);
      if (reduced()) jumpTo(to);
      else land(to, v, flick, flick);
    }

    function onPointerCancel(e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      releaseDrag();
      if (!d.live) return;
      if (reduced()) jumpTo(committed);
      else land(committed, null, false, false);
    }

    /* ---- keyboard: animate via travel (the component jumps; we glide so
       arrow keys feel the same as tap/drag) ---- */
    function onKeyDown(e) {
      if (disabled) return;
      var last = items.length - 1;
      var next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(last, committed + 1);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, committed - 1);
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = last;
      if (next === null) return;
      e.preventDefault();
      if (next === committed) return;
      var from = committed;
      commit(next);
      travel(from, next);
      if (items[next] && items[next].focus) items[next].focus();
    }

    /* ---- public API ---- */
    function select(i, animate) {
      if (i == null || i < 0 || i >= items.length) return;
      if (i === committed) return;
      var from = committed;
      committed = i;
      if (onChange) onChange(i, items[i]);
      if (animate === false || reduced()) jumpTo(i);
      else travel(from, i);
    }

    /* Animate to a slot without firing onChange (for external state sync). */
    function animateTo(i) {
      if (i == null || i < 0 || i >= items.length) return;
      if (i === committed) return;
      var from = committed;
      committed = i;
      travel(from, i);
    }

    function setValue(i) {
      if (i == null) return;
      committed = clamp(i, 0, items.length - 1);
      jumpTo(committed);
    }

    function destroy() {
      alive = false;
      clearTimeout(handoff);
      if (resizeObserver) resizeObserver.disconnect();
      var idx = instances.indexOf(api);
      if (idx > -1) instances.splice(idx, 1);
    }

    /* ---- init ---- */
    function init() {
      measure();
      if (typeof ResizeObserver !== 'undefined' && track) {
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(track);
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      window.addEventListener('resize', measure);
      var onReduceChange = function () {
        if (reduced()) jumpTo(committed);
      };
      if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange);
      else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);
    }

    items.forEach(function (el, i) {
      if (!el) return;
      el.addEventListener('pointerdown', function (e) {
        onPointerDown(e, i);
      });
      el.addEventListener('keydown', onKeyDown);
      /* Keyboard activation. Enter/Space on a focused <button> fires click with
         no pointer event at all, so a pointer-only engine would silently ignore
         it. The arrow-key listener next to this one would still work, but Enter
         would not, and a button that does nothing on Enter is a bug, not a
         preference. Mirrors the tap branch of onPointerUp, including committing
         the already-current slot: the call sites use onChange to reset their own
         filter. */
      el.addEventListener('click', function () {
        if (pointerTap) return;
        var from = committed;
        commit(i);
        travel(from, i);
      });
    });
    track.addEventListener('pointermove', onPointerMove);
    track.addEventListener('pointerup', onPointerUp);
    track.addEventListener('pointercancel', onPointerCancel);
    track.addEventListener('lostpointercapture', onPointerCancel);

    var api = {
      select: select,
      animateTo: animateTo,
      setValue: setValue,
      measure: measure,
      destroy: destroy,
      /* The shared rAF scheduler calls this on every registered instance. It
         must be reachable from here or the loop throws and latches off. */
      advance: advance,
      get committed() {
        return committed;
      }
    };

    /* Must come after api is assigned - the shared rAF loop advances whatever
       is in this array. */
    instances.push(api);

    init();
    return api;
  }

  window.RubberSegment = {
    create: function (options) {
      return new RubberSegment(options);
    }
  };
})();