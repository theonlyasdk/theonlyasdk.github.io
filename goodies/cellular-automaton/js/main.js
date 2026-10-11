/**
 * Cellular Automaton — Conway's Game of Life and seven other universes
 * Canvas engine, pattern stamping, HUD wiring and state persistence.
 * Depends on: ../sidebar-lib/sidebar.js (Sidebar), ../shared/js/goodie-ui.js (GoodieUI, GoodieStorage)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cellular-automaton-settings';

  /* ── Rule presets: birth / survive neighbour counts ── */
  var RULES = {
    conway: { birth: [3], survive: [2, 3] },
    highlife: { birth: [3, 6], survive: [2, 3] },
    seeds: { birth: [2], survive: [] },
    daynight: { birth: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] },
    maze: { birth: [3], survive: [1, 2, 3, 4, 5] },
    mazectric: { birth: [3], survive: [1, 2, 3, 4] },
    coral: { birth: [3], survive: [4, 5, 6, 7, 8] },
    anneal: { birth: [4, 6, 7, 8], survive: [3, 5, 6, 7, 8] }
  };

  /* ── Age-bucketed palettes, newborn → ancient ── */
  var THEMES = {
    cyan: { colors: ['#f0f9ff', '#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#075985'], glow: 'rgba(56, 189, 248, 0.45)' },
    emerald: { colors: ['#ecfdf5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981', '#065f46'], glow: 'rgba(52, 211, 153, 0.45)' },
    sunset: { colors: ['#fff7ed', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#c2410c'], glow: 'rgba(251, 146, 60, 0.45)' },
    mono: { colors: ['#ffffff', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569'], glow: 'rgba(226, 232, 240, 0.35)' }
  };

  /* ── Patterns as ASCII bitmaps (O = live cell) ── */
  var PATTERN_ASCII = {
    glider: ['.O.', '..O', 'OOO'],
    lwss: ['.O..O', 'O....', 'O...O', 'OOOO.'],
    pulsar: [
      '..OOO...OOO..',
      '.............',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '..OOO...OOO..',
      '.............',
      '..OOO...OOO..',
      'O....O.O....O',
      'O....O.O....O',
      'O....O.O....O',
      '.............',
      '..OOO...OOO..'
    ],
    gun: [
      '........................O...........',
      '......................O.O...........',
      '............OO......OO............OO',
      '...........O...O....OO............OO',
      'OO........O.....O...OO..............',
      'OO........O...O.OO....O.O...........',
      '..........O.....O.......O...........',
      '...........O...O....................',
      '............OO......................'
    ],
    rpent: ['.OO', 'OO.', '.O.'],
    acorn: ['.O.....', '...O...', 'OO..OOO'],
    diehard: ['......O.', 'OO......', '.OO...OO'],
    penta: ['..O....O..', 'OO.OOOO.OO', '..O....O..'],
    infinite: ['OOO.O', 'O....', '...OO', '.OO.O', 'O.O.O']
  };

  var PATTERNS = {};
  Object.keys(PATTERN_ASCII).forEach(function (key) {
    var rowsMap = PATTERN_ASCII[key];
    var coords = [];
    for (var y = 0; y < rowsMap.length; y++) {
      for (var x = 0; x < rowsMap[y].length; x++) {
        if (rowsMap[y].charAt(x) === 'O') coords.push([x, y]);
      }
    }
    PATTERNS[key] = { cells: coords, w: rowsMap[0].length, h: rowsMap.length };
  });

  /* ── Persisted settings ── */
  var defaults = {
    rule: 'conway', theme: 'cyan', pattern: 'draw',
    speed: 12, cellSize: 10, density: 25,
    wrap: true, gridLines: false, glow: true, telemetryOn: true
  };
  var state = GoodieStorage.load(STORAGE_KEY, defaults);
  if (!RULES[state.rule]) state.rule = defaults.rule;
  if (!THEMES[state.theme]) state.theme = defaults.theme;
  if (state.pattern !== 'draw' && !PATTERNS[state.pattern]) state.pattern = defaults.pattern;
  state.speed = Math.min(60, Math.max(1, state.speed || defaults.speed));
  state.cellSize = Math.min(24, Math.max(5, state.cellSize || defaults.cellSize));
  state.density = Math.min(80, Math.max(5, state.density || defaults.density));

  function persist(key, val) {
    GoodieStorage.updateKey(STORAGE_KEY, key, val);
  }

  /* ── DOM handles ── */
  var canvas = document.getElementById('render-canvas');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var els = {
    play: document.getElementById('btn-play'),
    step: document.getElementById('btn-step'),
    randomize: document.getElementById('btn-randomize'),
    clear: document.getElementById('btn-clear'),
    save: document.getElementById('btn-save'),
    stampCenter: document.getElementById('btn-stamp-center'),
    telemetryToggle: document.getElementById('btn-telemetry-toggle'),
    telemetryHud: document.getElementById('telemetry-hud'),
    generation: document.getElementById('stat-generation'),
    population: document.getElementById('stat-population'),
    turnover: document.getElementById('stat-turnover'),
    grid: document.getElementById('stat-grid'),
    rule: document.getElementById('stat-rule')
  };

  /* ── Simulation state ── */
  var viewW = 0, viewH = 0;
  var cols = 0, rows = 0;
  var cells = null, next = null, age = null, ageNext = null;
  var birthTable = new Uint8Array(9);
  var surviveTable = new Uint8Array(9);
  var running = false;
  var needsRedraw = true;
  var generation = 0, births = 0, deaths = 0, population = 0;
  var renderBuckets = [[], [], [], [], [], []];

  function buildRuleTables() {
    birthTable.fill(0);
    surviveTable.fill(0);
    var r = RULES[state.rule];
    for (var i = 0; i < r.birth.length; i++) birthTable[r.birth[i]] = 1;
    for (var j = 0; j < r.survive.length; j++) surviveTable[r.survive[j]] = 1;
  }

  function ruleString() {
    var r = RULES[state.rule];
    return 'B' + r.birth.join('') + '/S' + r.survive.join('');
  }

  function rebuildGrid(preserve) {
    viewW = canvas.clientWidth || window.innerWidth;
    viewH = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(viewW * dpr);
    canvas.height = Math.round(viewH * dpr);
    var newCols = Math.max(8, Math.floor(viewW / state.cellSize));
    var newRows = Math.max(8, Math.floor(viewH / state.cellSize));
    var nc = new Uint8Array(newCols * newRows);
    var na = new Uint16Array(newCols * newRows);
    if (preserve && cells) {
      var dx = Math.floor((newCols - cols) / 2);
      var dy = Math.floor((newRows - rows) / 2);
      for (var y = 0; y < rows; y++) {
        var ty = y + dy;
        if (ty < 0 || ty >= newRows) continue;
        for (var x = 0; x < cols; x++) {
          var tx = x + dx;
          if (tx < 0 || tx >= newCols) continue;
          var i = y * cols + x;
          if (cells[i]) {
            nc[ty * newCols + tx] = 1;
            na[ty * newCols + tx] = age[i] || 1;
          }
        }
      }
    }
    cols = newCols;
    rows = newRows;
    cells = nc;
    next = new Uint8Array(cols * rows);
    age = na;
    ageNext = new Uint16Array(cols * rows);
    updatePopulation();
    needsRedraw = true;
  }

  function updatePopulation() {
    var p = 0;
    for (var i = 0; i < cells.length; i++) p += cells[i];
    population = p;
  }

  function step() {
    var wrap = state.wrap;
    var birthsNow = 0, deathsNow = 0, pop = 0;
    for (var y = 0; y < rows; y++) {
      var yUp = y === 0 ? (wrap ? rows - 1 : -1) : y - 1;
      var yDn = y === rows - 1 ? (wrap ? 0 : -1) : y + 1;
      for (var x = 0; x < cols; x++) {
        var xLf = x === 0 ? (wrap ? cols - 1 : -1) : x - 1;
        var xRt = x === cols - 1 ? (wrap ? 0 : -1) : x + 1;
        var n = 0;
        if (yUp >= 0) {
          if (xLf >= 0 && cells[yUp * cols + xLf]) n++;
          if (cells[yUp * cols + x]) n++;
          if (xRt >= 0 && cells[yUp * cols + xRt]) n++;
        }
        if (xLf >= 0 && cells[y * cols + xLf]) n++;
        if (xRt >= 0 && cells[y * cols + xRt]) n++;
        if (yDn >= 0) {
          if (xLf >= 0 && cells[yDn * cols + xLf]) n++;
          if (cells[yDn * cols + x]) n++;
          if (xRt >= 0 && cells[yDn * cols + xRt]) n++;
        }
        var i = y * cols + x;
        if (cells[i]) {
          if (surviveTable[n]) {
            next[i] = 1;
            ageNext[i] = age[i] < 65535 ? age[i] + 1 : age[i];
            pop++;
          } else {
            next[i] = 0;
            deathsNow++;
          }
        } else if (birthTable[n]) {
          next[i] = 1;
          ageNext[i] = 1;
          birthsNow++;
          pop++;
        } else {
          next[i] = 0;
          ageNext[i] = 0;
        }
      }
    }
    var swapCells = cells; cells = next; next = swapCells;
    var swapAge = age; age = ageNext; ageNext = swapAge;
    generation++;
    births = birthsNow;
    deaths = deathsNow;
    population = pop;
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, viewW, viewH);
    var cs = state.cellSize;
    var theme = THEMES[state.theme];

    if (state.gridLines) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var gx = 0; gx <= cols; gx++) {
        ctx.moveTo(gx * cs + 0.5, 0);
        ctx.lineTo(gx * cs + 0.5, rows * cs);
      }
      for (var gy = 0; gy <= rows; gy++) {
        ctx.moveTo(0, gy * cs + 0.5);
        ctx.lineTo(cols * cs, gy * cs + 0.5);
      }
      ctx.stroke();
    }

    for (var b = 0; b < 6; b++) renderBuckets[b].length = 0;
    for (var y = 0; y < rows; y++) {
      var rowBase = y * cols;
      var py = y * cs;
      for (var x = 0; x < cols; x++) {
        var i = rowBase + x;
        if (!cells[i]) continue;
        var a = age[i];
        var bk = a <= 1 ? 0 : a === 2 ? 1 : a <= 4 ? 2 : a <= 9 ? 3 : a <= 19 ? 4 : 5;
        renderBuckets[bk].push(x * cs, py);
      }
    }

    if (state.glow) {
      ctx.fillStyle = theme.glow;
      for (var g = 0; g < 2; g++) {
        var glowArr = renderBuckets[g];
        if (!glowArr.length) continue;
        ctx.globalAlpha = g === 0 ? 0.55 : 0.3;
        ctx.beginPath();
        for (var k = 0; k < glowArr.length; k += 2) {
          ctx.rect(glowArr[k] - 1.5, glowArr[k + 1] - 1.5, cs + 3, cs + 3);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    var pad = cs >= 7 ? 1 : 0;
    for (var b2 = 5; b2 >= 0; b2--) {
      var arr = renderBuckets[b2];
      if (!arr.length) continue;
      ctx.fillStyle = theme.colors[b2];
      ctx.beginPath();
      for (var k2 = 0; k2 < arr.length; k2 += 2) {
        ctx.rect(arr[k2] + pad * 0.5, arr[k2 + 1] + pad * 0.5, cs - pad, cs - pad);
      }
      ctx.fill();
    }
  }

  /* ── Telemetry (throttled DOM writes) ── */
  var lastTelemetry = 0;

  function updateTelemetry(force) {
    var now = performance.now();
    if (!force && now - lastTelemetry < 250) return;
    lastTelemetry = now;
    els.generation.textContent = generation.toLocaleString();
    els.population.textContent = population.toLocaleString();
    els.turnover.textContent = births.toLocaleString() + ' / ' + deaths.toLocaleString();
    els.grid.textContent = cols + ' × ' + rows;
    els.rule.textContent = ruleString();
  }

  /* ── Population editing ── */
  var painting = false;
  var paintingValue = 1;

  function paintAt(x, y) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return;
    var i = y * cols + x;
    var v = paintingValue;
    if (v) {
      if (!cells[i]) population++;
      cells[i] = 1;
      age[i] = 1;
    } else if (cells[i]) {
      cells[i] = 0;
      age[i] = 0;
      population--;
    }
    needsRedraw = true;
  }

  function stampPattern(key, cx, cy) {
    var pat = PATTERNS[key];
    if (!pat) return;
    var ox = cx - Math.floor(pat.w / 2);
    var oy = cy - Math.floor(pat.h / 2);
    for (var i = 0; i < pat.cells.length; i++) {
      var px = pat.cells[i][0] + ox;
      var py = pat.cells[i][1] + oy;
      if (state.wrap) {
        px = ((px % cols) + cols) % cols;
        py = ((py % rows) + rows) % rows;
      } else if (px < 0 || px >= cols || py < 0 || py >= rows) {
        continue;
      }
      var idx = py * cols + px;
      cells[idx] = 1;
      age[idx] = 1;
    }
    updatePopulation();
    needsRedraw = true;
  }

  function randomize() {
    var d = state.density / 100;
    for (var i = 0; i < cells.length; i++) {
      if (Math.random() < d) {
        cells[i] = 1;
        age[i] = 1;
      } else {
        cells[i] = 0;
        age[i] = 0;
      }
    }
    generation = 0;
    births = 0;
    deaths = 0;
    updatePopulation();
    needsRedraw = true;
  }

  function clearGrid() {
    cells.fill(0);
    age.fill(0);
    generation = 0;
    births = 0;
    deaths = 0;
    population = 0;
    needsRedraw = true;
  }

  /* ── Pointer interaction ── */
  function cellFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    return [
      Math.floor((e.clientX - rect.left) / state.cellSize),
      Math.floor((e.clientY - rect.top) / state.cellSize)
    ];
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    var pos = cellFromEvent(e);
    if (state.pattern !== 'draw') {
      stampPattern(state.pattern, pos[0], pos[1]);
      updateTelemetry(true);
      return;
    }
    painting = true;
    paintingValue = (e.button === 2 || e.altKey) ? 0 : 1;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pointer capture is best-effort */ }
    paintAt(pos[0], pos[1]);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (!painting) return;
    var pos = cellFromEvent(e);
    paintAt(pos[0], pos[1]);
  });

  window.addEventListener('pointerup', function () {
    painting = false;
  });

  canvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });

  /* ── Execution controls ── */
  function setRunning(v) {
    running = v;
    els.play.innerHTML = v ? '<i class="bi bi-pause-fill"></i> Pause' : '<i class="bi bi-play-fill"></i> Start';
    els.play.classList.toggle('running', v);
  }

  els.play.addEventListener('click', function () {
    setRunning(!running);
  });

  els.step.addEventListener('click', function () {
    setRunning(false);
    step();
    updateTelemetry(true);
    needsRedraw = true;
  });

  els.randomize.addEventListener('click', function () {
    randomize();
    updateTelemetry(true);
  });

  els.clear.addEventListener('click', function () {
    clearGrid();
    updateTelemetry(true);
  });

  els.save.addEventListener('click', function () {
    var a = document.createElement('a');
    a.download = 'cellular-automaton.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  });

  els.stampCenter.addEventListener('click', function () {
    if (state.pattern === 'draw') return;
    stampPattern(state.pattern, Math.floor(cols / 2), Math.floor(rows / 2));
    updateTelemetry(true);
  });

  /* ── Telemetry HUD toggle ── */
  function applyTelemetryVisibility() {
    els.telemetryHud.classList.toggle('hidden', !state.telemetryOn);
    els.telemetryToggle.classList.toggle('active', state.telemetryOn);
  }

  els.telemetryToggle.addEventListener('click', function () {
    state.telemetryOn = !state.telemetryOn;
    applyTelemetryVisibility();
    persist('telemetryOn', state.telemetryOn);
  });

  /* ── Universe controls (sliders/selects first get persisted values, then bind) ── */
  document.getElementById('select-rule').value = state.rule;
  document.getElementById('select-pattern').value = state.pattern;
  document.getElementById('slider-speed').value = state.speed;
  document.getElementById('slider-cell-size').value = state.cellSize;
  document.getElementById('slider-density').value = state.density;
  document.getElementById('toggle-wrap').checked = state.wrap;
  document.getElementById('toggle-glow').checked = state.glow;
  document.getElementById('toggle-grid').checked = state.gridLines;

  var themeButtons = document.querySelectorAll('#theme-control .seg-btn');
  themeButtons.forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === state.theme);
  });

  GoodieUI.bindStepper('btn-rule-prev', 'btn-rule-next', 'select-rule', function (v) {
    state.rule = v;
    buildRuleTables();
    updateTelemetry(true);
    persist('rule', v);
  });

  GoodieUI.bindStepper('btn-pattern-prev', 'btn-pattern-next', 'select-pattern', function (v) {
    state.pattern = v;
    persist('pattern', v);
  });

  GoodieUI.bindSlider('slider-speed', 'label-speed', function (v) {
    return Math.round(v) + ' gen/s';
  }, function (v) {
    state.speed = Math.round(v);
    persist('speed', state.speed);
  });

  GoodieUI.bindSlider('slider-cell-size', 'label-cell-size', function (v) {
    return Math.round(v) + ' px';
  }, function (v) {
    state.cellSize = Math.round(v);
    rebuildGrid(true);
    persist('cellSize', state.cellSize);
  });

  GoodieUI.bindSlider('slider-density', 'label-density', function (v) {
    return Math.round(v) + '%';
  }, function (v) {
    state.density = Math.round(v);
    persist('density', state.density);
  });

  document.getElementById('toggle-wrap').addEventListener('change', function (e) {
    state.wrap = e.target.checked;
    persist('wrap', state.wrap);
  });

  document.getElementById('toggle-glow').addEventListener('change', function (e) {
    state.glow = e.target.checked;
    needsRedraw = true;
    persist('glow', state.glow);
  });

  document.getElementById('toggle-grid').addEventListener('change', function (e) {
    state.gridLines = e.target.checked;
    needsRedraw = true;
    persist('gridLines', state.gridLines);
  });

  GoodieUI.bindSegmented('#theme-control', 'data-theme', function (v) {
    state.theme = v;
    needsRedraw = true;
    persist('theme', v);
  });

  /* ── Info modal & shortcuts ── */
  var infoModal = GoodieUI.setupModal({
    modalId: 'instructions-modal',
    openBtnId: 'btn-info',
    closeBtnId: 'btn-close-info'
  });

  function toggleCheckbox(id, stateKey) {
    var box = document.getElementById(id);
    box.checked = !box.checked;
    state[stateKey] = box.checked;
    persist(stateKey, box.checked);
    if (stateKey !== 'wrap') needsRedraw = true;
  }

  window.addEventListener('keydown', function (e) {
    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        setRunning(!running);
        break;
      case 's':
      case 'S':
        setRunning(false);
        step();
        updateTelemetry(true);
        needsRedraw = true;
        break;
      case 'r':
      case 'R':
        randomize();
        updateTelemetry(true);
        break;
      case 'c':
      case 'C':
        clearGrid();
        updateTelemetry(true);
        break;
      case 'g':
      case 'G':
        toggleCheckbox('toggle-grid', 'gridLines');
        break;
      case 'w':
      case 'W':
        toggleCheckbox('toggle-wrap', 'wrap');
        break;
      case 'i':
      case 'I':
        if (infoModal) infoModal.open();
        break;
      default:
        break;
    }
  });

  /* ── Resize handling ── */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      rebuildGrid(true);
      updateTelemetry(true);
    }, 150);
  });

  /* ── Boot ── */
  new Sidebar();
  buildRuleTables();
  applyTelemetryVisibility();
  rebuildGrid(false);
  randomize();
  updateTelemetry(true);
  setRunning(true);

  var lastT = 0;
  var acc = 0;
  requestAnimationFrame(function frame(t) {
    var dt = lastT ? Math.min(t - lastT, 100) : 0;
    lastT = t;
    if (running) {
      acc += dt;
      var interval = 1000 / state.speed;
      var guard = 0;
      while (acc >= interval && guard < 8) {
        step();
        acc -= interval;
        guard++;
      }
      if (guard >= 8) acc = 0;
      updateTelemetry(false);
    }
    if (running || needsRedraw) {
      render();
      needsRedraw = false;
    }
    requestAnimationFrame(frame);
  });
})();
