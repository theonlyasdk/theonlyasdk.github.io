/**
 * DodgeField - a pointer-averse runner, ported from the React Bits component.
 *
 * The original is a React component built on `motion/react`. This site is plain
 * Jekyll with no bundler (`_javascript/` is unused Rollup source, see
 * `assets/js/logger.js`), so this is a dependency-free vanilla port that keeps
 * the original's behaviour and tuning constants:
 *
 *   COUNT_LINE 0.55, DEAD_ZONE 6, CAUGHT_HOLD_MS 760, INSET 12
 *   the same default taunts, reach/radius/falloff/durations/patience
 *   the same bearing, dampening and wall logic
 *
 * Differences from the original, all deliberate:
 * - `animate()` from motion is replaced by a small critically-tunable spring
 *   integrator (see stepSpring) that reproduces the same `duration` + `bounce`
 *   feel: bounce 0 is critically damped (no overshoot), higher values wobble.
 * - `useMotionTemplate` becomes a direct `transform` write.
 * - `room` is derived from the mover's real offset inside the field rather than
 *   assuming it is centred, so the field can be any element. When the mover IS
 *   centred this reduces to exactly the original symmetric formula.
 * - `escape` lets the mover travel beyond the field's own edges, which is what
 *   the guestbook close button uses to flee outside its dialog.
 *
 * Usage:
 *   const field = DodgeField.create(fieldEl, moverEl, options);
 *   field.destroy();
 *
 * Styling lives in `_sass/components/_dodge-field.scss`.
 */

(function () {
  'use strict';

  const COUNT_LINE = 0.55;
  const DEAD_ZONE = 6;
  const CAUGHT_HOLD_MS = 760;
  const INSET = 12;
  const DEFAULT_TAUNTS = ['Catch me', 'Nope', 'Too slow', 'Almost', 'Okay, okay'];

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Matches the site's `sm` breakpoint. Below it the dodge is switched off. */
  const mobileQuery = window.matchMedia('(max-width: 575px)');

  const clamp = (t, lo, hi) => Math.min(hi, Math.max(lo, t));

  /** Fold overflow back inside the walls, or stop dead at them. */
  function wallIt(t, room, wall) {
    if (wall === 'bounce') {
      if (t > room.max) return Math.max(room.min, 2 * room.max - t);
      if (t < room.min) return Math.min(room.max, 2 * room.min - t);
      return t;
    }
    return clamp(t, room.min, room.max);
  }

  /** Unit vector from the field's centre toward the pointer. */
  function bearingOf(dx, dy, d, axis) {
    if (axis === 'x') return { x: Math.sign(dx) || 1, y: 0 };
    if (axis === 'y') return { x: 0, y: Math.sign(dy) || 1 };
    return { x: dx / d, y: dy / d };
  }

  /* ------------------------------------------------------------------ spring */

  /* Reproduces motion's `{ type: 'spring', duration, bounce }`. Duration is
     the settle time in seconds; bounce 0 is critically damped, 0.1 a hair of
     overshoot, 0.3 a visible wobble - matching the documented feel. */
  function makeSpring(initial) {
    return { value: initial || 0, velocity: 0, target: initial || 0, omega: 20, zeta: 1 };
  }

  function aimSpring(spring, target, seconds, bounce) {
    spring.target = target;
    spring.omega = (2 * Math.PI) / Math.max(0.016, seconds);
    spring.zeta = clamp(1 - bounce, 0.05, 1);
  }

  /* Explicit (semi-implicit) Euler goes unstable once omega*dt approaches 1.
     The flee spring is stiff (fleeDuration 130ms -> omega ~= 48), so a single
     33ms frame would give omega*dt ~= 1.6 and the value would explode to
     millions of pixels. Integrating in fixed sub-steps keeps it stable no
     matter how long the frame took. */
  const SUBSTEP = 1 / 240;

  function stepSpring(spring, dt) {
    const k = spring.omega * spring.omega;
    const c = 2 * spring.zeta * spring.omega;
    let remaining = dt;
    while (remaining > 0) {
      const h = remaining > SUBSTEP ? SUBSTEP : remaining;
      const accel = -k * (spring.value - spring.target) - c * spring.velocity;
      spring.velocity += accel * h;
      spring.value += spring.velocity * h;
      remaining -= h;
    }
  }

  /* ---------------------------------------------------------------- instance */

  function create(field, mover, options) {
    const opts = options || {};
    const api = {};
    const taunts = opts.taunts || DEFAULT_TAUNTS;
    const ink = opts.inkColor || '#f5f5f5';
    const contrast = opts.contrastColor || '#18181b';
    const baseReach = opts.reach !== undefined ? opts.reach : 72;
    /* `reach` is how far the mover bolts, tuned in the original for a ~120px
       pill. A wide button would just slide under the cursor and stay easy to
       click, so scale the travel with the mover's own size: it has to clear
       roughly half its own width to get the pointer off it. */
    let reach = baseReach;
    const baseRadius = opts.radius !== undefined ? opts.radius : 120;
    /* `radius` is how close the pointer must get before it reacts. Left at the
       demo's 120px, the outer edges of a wide button sit outside it entirely
       and stay a guaranteed-catch zone. Grow it with the mover too. */
    let radius = baseRadius;
    const falloff = opts.falloff !== undefined ? opts.falloff : 2;
    const fleeDuration = opts.fleeDuration !== undefined ? opts.fleeDuration : 130;
    const returnDuration = opts.returnDuration !== undefined ? opts.returnDuration : 620;
    const returnBounce = opts.returnBounce !== undefined ? opts.returnBounce : 0.1;
    const axis = opts.axis || 'both';
    const wall = opts.wall || 'clamp';
    const patience = Math.max(1, opts.patience !== undefined ? opts.patience : 4);
    const disabled = !!opts.disabled;
    const notice = opts.notice || '';
    /* Extra travel allowed past each field edge. */
    const escape = opts.escape !== undefined ? opts.escape : 0;

    const state = {
      dodges: 0,
      gave: false,
      caught: false,
      inside: false,
      reduce: motionQuery.matches,
      /* A dodge needs a cursor to dodge. Touch devices never get one, and on
         small screens a fleeing button just looks like a glitch. */
      fine: finePointer.matches && !mobileQuery.matches
    };
    const still = () =>
      state.gave || state.caught || disabled || state.reduce || !state.fine;

    const pointer = { current: null };
    const bearing = { x: 1, y: 0 };
    const armed = { current: true };
    const room = { x: { min: 0, max: 0 }, y: { min: 0, max: 0 } };
    const home = { x: 0, y: 0 };
    const box = { w: -1, h: -1 };
    let raf = 0;
    let last = 0;
    let hold = 0;
    let disposed = false;

    const sx = makeSpring(0);
    const sy = makeSpring(0);

    if (getComputedStyle(field).position === 'static') {
      field.style.position = 'relative';
    }

    /* ----------------------------------------------------------- measuring */

    /* The original measures the pointer against the field's centre, which only
       works because its mover sits dead centre. Here the mover can be anywhere
       (the guestbook button is in the top-right corner), so `home` is the
       mover's own resting centre and the distance - and therefore `radius` -
       is measured from the thing that actually flees. When the mover is
       centred, home equals the field centre and this is the original maths. */
    /* A field that starts hidden (a `display: none` dialog) measures as 0x0, so
       `home` and `room` would both be wrong until something forced a resize.
       Re-measuring whenever the box changes makes the first frame after the
       field becomes visible correct, without depending on ResizeObserver
       timing. */
    /* The mover may sit several levels down, and an intermediate element can be
       the positioned `offsetParent` (the guestbook's content pane is). Using
       mover.offsetLeft directly would measure from the wrong ancestor, so walk
       the offset chain up to the field. Offsets ignore transforms, so this stays
       correct mid-dodge. */
    function moverOffsetInField() {
      let x = 0;
      let y = 0;
      let el = mover;
      while (el && el !== field) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent;
      }
      return el === field ? { x: x, y: y } : null;
    }

    function measure() {
      const off = moverOffsetInField();
      if (!off) return;
      const w = mover.offsetWidth;
      const h = mover.offsetHeight;
      const cx = off.x + w / 2;
      const cy = off.y + h / 2;
      home.x = cx;
      home.y = cy;
      /* Scale both the trigger radius and the bolt with the mover, so a wide
         button has no dead edges and still gets out from under the cursor
         instead of sliding along inside it. */
      const span = Math.max(w, h);
      radius = Math.max(baseRadius, span * 0.5);
      reach = Math.max(baseReach, span * 0.75);
      room.x.min = -(cx - INSET) - escape;
      room.x.max = field.clientWidth - cx - INSET + escape;
      room.y.min = -(cy - INSET) - escape;
      room.y.max = field.clientHeight - cy - INSET + escape;
      box.w = field.clientWidth;
      box.h = field.clientHeight;
    }

    function ensureMeasured() {
      if (field.clientWidth !== box.w || field.clientHeight !== box.h) measure();
    }

    /* --------------------------------------------------------- rendering */

    function render() {
      mover.style.transform = 'translate3d(' + sx.value + 'px, ' + sy.value + 'px, 0)';
      mover.dataset.fled = state.inside && !still() ? 'true' : 'false';
      mover.dataset.relented = state.gave ? 'true' : 'false';
      mover.dataset.caught = state.caught ? 'true' : 'false';
      const index =
        state.gave || state.caught
          ? taunts.length - 1
          : Math.min(state.dodges, Math.max(0, taunts.length - 2));
      const labels = mover.querySelectorAll('.dodge-field__label');
      for (let i = 0; i < labels.length; i++) {
        labels[i].dataset.active = i === index ? 'true' : 'false';
      }
    }

    function announce(next) {
      /* Only touch keys that were actually supplied - otherwise a partial
         update like { inside: true } would blank out dodges/gave/etc. */
      if (next.dodges !== undefined && next.dodges !== state.dodges) {
        state.dodges = next.dodges;
        if (state.dodges && opts.onDodge) opts.onDodge(state.dodges);
      }
      if (next.gave !== undefined && next.gave !== state.gave) {
        state.gave = next.gave;
        if (state.gave && opts.onRelent) opts.onRelent();
      }
      if (next.caught !== undefined) state.caught = next.caught;
      if (next.inside !== undefined) state.inside = next.inside;
      if (next.reduce !== undefined) state.reduce = next.reduce;
      if (next.fine !== undefined) state.fine = next.fine;
      render();
    }

    /* -------------------------------------------------------------- frame */

    function frame(now) {
      raf = 0;
      if (disposed) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      ensureMeasured();

      const p = pointer.current;
      const rect = field.getBoundingClientRect();
      const zoom = rect.width / (field.offsetWidth || rect.width) || 1;
      /* Pointer position in field-local pixels, relative to the mover's home. */
      const dx = p ? (p.x - rect.left) / zoom - home.x : Infinity;
      const dy = p ? (p.y - rect.top) / zoom - home.y : Infinity;
      const d = Math.hypot(dx, dy);
      const isInside = d <= radius;

      // Nothing more to react to; coast home until the springs settle.
      if (!isInside && !state.inside) {
        stepSpring(sx, dt);
        stepSpring(sy, dt);
        if (Math.abs(sx.value) < 0.05 && Math.abs(sy.value) < 0.05) {
          sx.value = 0;
          sy.value = 0;
          sx.velocity = 0;
          sy.velocity = 0;
          render();
          return;
        }
        render();
        schedule();
        return;
      }

      if (!still()) {
        if (d < radius * COUNT_LINE) {
          if (armed.current) {
            armed.current = false;
            announce({ dodges: state.dodges + 1, gave: state.dodges + 1 >= patience });
          }
        } else if (d > radius) {
          armed.current = true;
        }
      }

      if (Number.isFinite(d) && d > DEAD_ZONE) {
        const b = bearingOf(dx, dy, d, axis);
        bearing.x = b.x;
        bearing.y = b.y;
      }

      const flee = isInside && !still() ? Math.pow(1 - d / radius, falloff) : 0;

      if (state.reduce) {
        sx.value = 0;
        sy.value = 0;
        sx.velocity = 0;
        sy.velocity = 0;
      } else {
        const seconds = (flee > 0 ? fleeDuration : returnDuration) / 1000;
        const bounce = flee > 0 ? 0 : returnBounce;
        aimSpring(sx, wallIt(-bearing.x * flee * reach, room.x, wall), seconds, bounce);
        aimSpring(sy, wallIt(-bearing.y * flee * reach, room.y, wall), seconds, bounce);
        stepSpring(sx, dt);
        stepSpring(sy, dt);
      }

      announce({ inside: isInside });
      render();

      /* Keep integrating until the springs are actually at rest. Returning
         early the moment the pointer leaves would freeze the card mid-glide,
         because here the rAF loop *is* the animation. */
      const atRest = Math.abs(sx.value) < 0.05 && Math.abs(sy.value) < 0.05;
      if (atRest && !isInside) {
        sx.value = 0;
        sy.value = 0;
        sx.velocity = 0;
        sy.velocity = 0;
        render();
        return;
      }
      schedule();
    }

    function schedule() {
      if (!raf && !disposed) raf = requestAnimationFrame(frame);
    }

    /* -------------------------------------------------------------- events */

    function onMove(e) {
      if (e.pointerType === 'touch') return;
      pointer.current = { x: e.clientX, y: e.clientY };
      schedule();
    }

    function onLeave() {
      pointer.current = null;
      schedule();
    }

    function onVisibility() {
      announce({
        fine: finePointer.matches && !mobileQuery.matches,
        reduce: motionQuery.matches
      });
      schedule();
    }

    /* On the mover, not the field: the field here is the dialog itself, so a
       field-level listener would close the dialog on any click in the form. */
    mover.addEventListener('click', handleClick);

    function handleClick() {
      announce({ caught: true });
      if (opts.onCatch) opts.onCatch();
      clearTimeout(hold);
      hold = setTimeout(() => {
        announce({ caught: false, dodges: 0 });
        armed.current = false;
        schedule();
      }, CAUGHT_HOLD_MS);
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    finePointer.addEventListener('change', onVisibility);
    mobileQuery.addEventListener('change', onVisibility);
    motionQuery.addEventListener('change', onVisibility);

    const observer = new ResizeObserver(measure);
    observer.observe(field);
    observer.observe(mover);

    /* ------------------------------------------------------------- content */

    function buildPill() {
      // childNodes, not childElementCount: a <button> holding only text (the
      // guestbook ×) has zero element children but is not empty.
      if (mover.childNodes.length) return;
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'dodge-field__pill';
      pill.setAttribute('aria-label', taunts[0]);
      const wrap = document.createElement('span');
      wrap.className = 'dodge-field__labels';
      taunts.forEach((taunt, i) => {
        const span = document.createElement('span');
        span.className = 'dodge-field__label';
        span.dataset.active = i === 0 ? 'true' : 'false';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = taunt;
        wrap.appendChild(span);
      });
      pill.appendChild(wrap);
      mover.appendChild(pill);
    }

    /* Mirror the React default: the built-in pill only renders when no children
       were supplied AND the mover is genuinely empty. The guestbook passes an
       existing button, so it must keep its own content. */
    const buildDefault = opts.children === undefined && mover.childNodes.length === 0;
    if (buildDefault) buildPill();

    /* The `dodge-field` / `dodge-field__mover` classes carry the demo's own
       layout - `display: grid; place-items: center; height: var(--df-height)`.
       Applying them to a caller's field (the guestbook uses the whole dialog)
       would collapse that dialog to 240px and wreck its layout. They exist to
       style the built-in pill, so only add them when one was actually built. */
    if (buildDefault) {
      field.classList.add('dodge-field');
      mover.classList.add('dodge-field__mover');
    }
    /* Promote the mover to its own layer so the dodge stays smooth, without
       imposing any layout on it. */
    mover.style.willChange = 'transform';

    field.style.setProperty('--df-ink', ink);
    field.style.setProperty('--df-contrast', contrast);
    if (opts.fieldHeight) field.style.setProperty('--df-height', opts.fieldHeight + 'px');
    if (opts.className) field.classList.add(opts.className);
    if (!state.fine) field.dataset.coarse = '';
    if (notice && !state.fine) {
      const p = document.createElement('p');
      p.className = 'dodge-field__notice';
      p.textContent = notice;
      field.appendChild(p);
    }

    measure();
    announce({});
    schedule();

    /* ------------------------------------------------------------ teardown */

    api.destroy = function () {
      disposed = true;
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(hold);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', schedule, { capture: true });
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      finePointer.removeEventListener('change', onVisibility);
      mobileQuery.removeEventListener('change', onVisibility);
      motionQuery.removeEventListener('change', onVisibility);
      mover.removeEventListener('click', handleClick);
      mover.style.transform = '';
      delete field.dataset.coarse;
    };

    /* ------------------------------------------------------------- debug */

    api.debug = function () {
      return {
        home: { x: home.x, y: home.y },
        room: { x: { min: room.x.min, max: room.x.max }, y: { min: room.y.min, max: room.y.max } },
        box: { w: box.w, h: box.h },
        client: { w: field.clientWidth, h: field.clientHeight },
        state: {
          dodges: state.dodges,
          gave: state.gave,
          caught: state.caught,
          inside: state.inside,
          fine: state.fine,
          reduce: state.reduce
        },
        pointer: pointer.current,
        sx: { value: sx.value, target: sx.target },
        sy: { value: sy.value, target: sy.target },
        offsetLeft: mover.offsetLeft,
        offsetTop: mover.offsetTop,
        offsetParent: mover.offsetParent ? mover.offsetParent.className : null
      };
    };

    return api;
  }

  window.DodgeField = { create: create };
})();
