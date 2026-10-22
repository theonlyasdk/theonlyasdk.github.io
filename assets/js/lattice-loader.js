/* LatticeLoader (React Bits) as a dependency-free module. The patterns, marks,
   timings and CSS class names are the component's own; the React wrapper is
   replaced with a data-attribute mount so the Jekyll site needs no React. */
(() => {
  'use strict';

  const PATTERNS = {
    arrow: { 3: { cells: [1, 2, 3, 0, 1, 2, 1, 2, 3], loop: 7.2, scale: 1 } },
    dots: { 3: { cells: [0, 1, 2, 0, 1, 2, 0, 1, 2], loop: 3, scale: 2.4 } },
    ripple: { 3: { cells: [2, 1, 2, 1, 0, 1, 2, 1, 2], loop: 4.8, scale: 1.5 } },
    spiral: { 3: { cells: [0, 1, 2, 7, 8, 3, 6, 5, 4], loop: 9, scale: 1.2, lit: 0.35 } },
    orbit: {
      3: { cells: [0, 1, 2, 7, null, 3, 6, 5, 4], loop: 8, scale: 1.2 },
      4: { cells: [0, 1, 2, 3, 11, null, null, 4, 10, null, null, 5, 9, 8, 7, 6], loop: 6, scale: 1.2, lit: 0.45 }
    },
    snake: {
      3: { cells: [0, 1, 2, 5, 4, 3, 6, 7, 8], loop: 9, scale: 1, lit: 0.35 },
      4: { cells: [0, 1, 2, 3, 7, 6, 5, 4, 8, 9, 10, 11, 15, 14, 13, 12], loop: 16, scale: 1, lit: 0.25 }
    },
    sweep: { 4: { cells: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], loop: 5, scale: 1, lit: 0.45 } },
    spin: { 4: { cells: [0, 0, 1, 1, 0, 0, 1, 1, 3, 3, 2, 2, 3, 3, 2, 2], loop: 4, scale: 1.6, lit: 0.35 } },
    rain: { 4: { cells: [0, 2, 1, 3, 1, 3, 2, 4, 2, 4, 3, 5, 3, 5, 4, 6], loop: 4, scale: 1.2, lit: 0.35 } },
    pulse: { 4: { cells: [2, 1, 1, 2, 1, 0, 0, 1, 1, 0, 0, 1, 2, 1, 1, 2], loop: 2.4, scale: 2.5, lit: 0.45 } }
  };
  const DEFAULT_PATTERN = { 3: 'orbit', 4: 'sweep' };
  const MARKS = {
    3: { done: [2, 3, 5, 7], error: [0, 2, 4, 6, 8] },
    4: { done: [7, 8, 10, 13], error: [0, 3, 5, 6, 9, 10, 12, 15] }
  };

  const resolvePattern = (pattern, grid) => {
    if (typeof pattern === 'string') {
      const named = PATTERNS[pattern];
      return (named && named[grid]) || PATTERNS[DEFAULT_PATTERN[grid]][grid];
    }
    const cells = Array.from({ length: grid * grid }, (_, i) => pattern.cells[i] ?? null);
    const max = Math.max(0, ...cells.filter(value => value != null));
    return { cells, loop: pattern.loop ?? max + 4.2, scale: pattern.scale ?? 1, lit: pattern.lit ?? 0.62 };
  };

  const fmt = ds => (ds < 600 ? `${(ds / 10).toFixed(1)}s` : `${Math.floor(ds / 600)}m ${((ds % 600) / 10).toFixed(1)}s`);
  const spoken = ds =>
    ds < 600
      ? `${(ds / 10).toFixed(1)} seconds`
      : `${Math.floor(ds / 600)} minutes ${((ds % 600) / 10).toFixed(1)} seconds`;

  const readNumber = (element, name, fallback) => {
    const value = parseFloat(element.dataset[name]);
    return Number.isFinite(value) ? value : fallback;
  };

  const readBoolean = (element, name, fallback) => {
    const value = element.dataset[name];
    if (value === undefined) return fallback;
    return value !== 'false' && value !== '0';
  };

  const mount = root => {
    if (!root) return null;
    if (root.__latticeLoader) return root.__latticeLoader;

    const n = readNumber(root, 'grid', 3) === 4 ? 4 : 3;
    const pattern = resolvePattern(root.dataset.pattern || 'orbit', n);
    const marks = MARKS[n];
    const shape = root.dataset.shape === 'square' ? 'square' : 'round';
    const label = root.dataset.label || 'Thinking';
    const doneLabel = root.dataset.doneLabel || 'Done in';
    const errorLabel = root.dataset.errorLabel || 'Failed after';
    const doneColor = root.dataset.doneColor || '#22c55e';
    const errorColor = root.dataset.errorColor || '#ef4444';
    const cellSize = readNumber(root, 'cellSize', 6);
    const gap = readNumber(root, 'gap', 2);
    const fontSize = readNumber(root, 'fontSize', 14);
    const step = readNumber(root, 'step', 90);
    const idleOpacity = readNumber(root, 'idleOpacity', 0.15);
    const color = root.dataset.color || 'currentColor';
    const glow = readBoolean(root, 'glow', false);
    const glowColor = root.dataset.glowColor || '';
    const showTimer = readBoolean(root, 'showTimer', true);

    const spacing = step * pattern.scale;
    const cycle = Math.round(pattern.loop * spacing);

    root.classList.add('lattice-loader');
    root.setAttribute('role', 'status');
    root.dataset.status = 'working';
    root.dataset.shape = shape;
    if (glow) root.dataset.glow = '';
    root.style.setProperty('--ll-n', String(n));
    root.style.setProperty('--ll-cell', `${cellSize}px`);
    root.style.setProperty('--ll-gap', `${gap}px`);
    root.style.setProperty('--ll-font', `${fontSize}px`);
    root.style.setProperty('--ll-color', color);
    root.style.setProperty('--ll-mark', doneColor);
    root.style.setProperty('--ll-idle', String(idleOpacity));
    root.style.setProperty('--ll-glow', glowColor || color);
    root.style.setProperty('--ll-mark-glow', glowColor || doneColor);
    root.style.setProperty('--ll-cycle', `${cycle}ms`);

    const grid = document.createElement('span');
    grid.className = 'lattice-loader__grid';
    grid.setAttribute('aria-hidden', 'true');

    const run = document.createElement('span');
    run.className = 'lattice-loader__layer lattice-loader__run';
    const markLayer = document.createElement('span');
    markLayer.className = 'lattice-loader__layer lattice-loader__mark';

    const runCells = pattern.cells.map(unit => {
      const cell = document.createElement('span');
      cell.className = 'lattice-loader__cell';
      if (unit == null) {
        cell.setAttribute('data-hole', '');
      } else {
        if (pattern.lit && pattern.lit !== 0.62) cell.setAttribute('data-lit', String(Math.round(pattern.lit * 100)));
        cell.style.animationDelay = `${Math.round(unit * spacing)}ms`;
      }
      return cell;
    });
    const markCells = pattern.cells.map(() => {
      const cell = document.createElement('span');
      cell.className = 'lattice-loader__cell';
      return cell;
    });
    run.append(...runCells);
    markLayer.append(...markCells);
    grid.append(run, markLayer);

    const labelEl = document.createElement('span');
    labelEl.className = 'lattice-loader__label';
    labelEl.setAttribute('aria-hidden', 'true');
    const texts = [
      { kind: 'working', text: label },
      { kind: 'done', text: doneLabel },
      { kind: 'error', text: errorLabel }
    ].map(entry => {
      const span = document.createElement('span');
      span.className = 'lattice-loader__text';
      span.textContent = entry.text;
      if (entry.kind === 'working') span.setAttribute('data-active', '');
      labelEl.append(span);
      return { kind: entry.kind, span };
    });

    const meta = document.createElement('span');
    meta.className = 'lattice-loader__meta';
    meta.append(labelEl);

    let timerEl = null;
    if (showTimer) {
      timerEl = document.createElement('span');
      timerEl.className = 'lattice-loader__timer';
      timerEl.setAttribute('aria-hidden', 'true');
      timerEl.textContent = '0.0s';
      meta.append(timerEl);
    }

    const sr = document.createElement('span');
    sr.className = 'lattice-loader__sr';
    sr.textContent = `${label}, in progress`;

    if (!root.childElementCount) root.append(grid, meta, sr);

    let status = 'working';
    let lastMark = 'done';
    let elapsed = 0;
    let startedAt = performance.now();
    let ticker = 0;

    const paintTime = ds => {
      elapsed = ds;
      if (timerEl) timerEl.textContent = fmt(ds);
    };

    const startClock = () => {
      stopClock();
      startedAt = performance.now();
      paintTime(0);
      ticker = setInterval(() => paintTime(Math.floor((performance.now() - startedAt) / 100)), 100);
    };

    const stopClock = () => {
      if (!ticker) return;
      clearInterval(ticker);
      ticker = 0;
    };

    const paintMark = () => {
      const active = status === 'working' ? lastMark : status;
      if (status !== 'working') lastMark = status;
      const on = marks[active] || [];
      markCells.forEach((cell, index) => {
        if (on.indexOf(index) !== -1) cell.setAttribute('data-on', '');
        else cell.removeAttribute('data-on');
      });
    };

    const api = {
      element: root,
      get elapsed() {
        return elapsed / 10;
      },
      setStatus(next) {
        if (next !== 'working' && next !== 'done' && next !== 'error') return api;
        status = next;
        root.dataset.status = status;
        root.style.setProperty('--ll-mark', status === 'error' ? errorColor : doneColor);
        root.style.setProperty('--ll-mark-glow', glowColor || (status === 'error' ? errorColor : doneColor));
        texts.forEach(entry => {
          if (entry.kind === status) entry.span.setAttribute('data-active', '');
          else entry.span.removeAttribute('data-active');
        });
        if (status === 'working') {
          startClock();
          sr.textContent = `${label}, in progress`;
        } else {
          paintTime(Math.floor((performance.now() - startedAt) / 100));
          stopClock();
          sr.textContent = `${status === 'done' ? doneLabel : errorLabel}${showTimer ? ` ${spoken(elapsed)}` : ''}`;
        }
        paintMark();
        return api;
      },
      destroy() {
        stopClock();
        delete root.__latticeLoader;
      }
    };

    paintMark();
    if (status === 'working') startClock();
    root.__latticeLoader = api;
    return api;
  };

  const autoMount = () => {
    document.querySelectorAll('[data-lattice-loader]').forEach(element => mount(element));
  };

  window.LatticeLoader = { mount, autoMount };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoMount);
  } else {
    autoMount();
  }
})();
