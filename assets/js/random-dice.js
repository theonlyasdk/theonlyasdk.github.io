/* ==========================================================================
   Discovery Dice ("I'm Feeling Curious")
   Tactile game roll, pip scramble, Web Audio chime, inline pill morph & 3D confetti.
   ========================================================================== */

(function () {
  'use strict';

  /* Built-in fallback catalog ensuring instant response even before curious.json loads */
  var FALLBACK_TARGETS = [
    { title: 'Redmi Note 8 Gingko Unbrick Guide', url: '/posts/redmi-note-8-ginkgo-custom-rom-unbrick-guide/', type: 'post' },
    { title: 'Redmi 9 Bootloader Unlocking Guide', url: '/posts/redmi-9-india-cattail-bootloader-unlocking-guide/', type: 'post' },
    { title: 'Optimizing KDE Plasma 6 on CachyOS', url: '/posts/optimizing-kde-plasma-6-on-cachyos/', type: 'post' },
    { title: 'SSH into Termux over USB', url: '/posts/ssh-into-termux-over-usb/', type: 'post' },
    { title: 'PNPM for NPM Users', url: '/posts/pnpm-for-npm-users/', type: 'post' },
    { title: 'Cellular Automaton', url: '/goodies/cellular-automaton/index.html', type: 'goodie' },
    { title: 'Procedural Terrain', url: '/goodies/procedural-terrain/index.html', type: 'goodie' },
    { title: 'Sorting Visualizer', url: '/goodies/sorting-visualizer/index.html', type: 'goodie' },
    { title: 'Fractal Viewer', url: '/goodies/fractal-viewer/index.html', type: 'goodie' }
  ];

  var targets = FALLBACK_TARGETS.slice();
  var isLoaded = false;
  var isRolling = false;
  var isMorphed = false;
  var pendingUrl = null;
  var navTimer = null;
  var audioCtx = null;

  /* Lazy-fetch full targets list from generated curious.json */
  function fetchTargets() {
    if (isLoaded) return;
    isLoaded = true;

    var url = '/assets/js/data/curious.json';
    if (window.siteUrl && typeof window.siteUrl === 'function') {
      url = window.siteUrl(url);
    }

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) {
          targets = data;
        }
      })
      .catch(function () {
        /* Silently retain fallback targets */
      });
  }

  /* Web Audio synthesizer for tactile mechanical ticks and victory chime */
  function playAudioEffects() {
    try {
      var AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      var now = audioCtx.currentTime;

      function createTick(time, freq) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.025);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.03);
      }

      /* Micro mechanical ticks during the tumble */
      createTick(now + 0.02, 360);
      createTick(now + 0.13, 500);
      createTick(now + 0.25, 660);

      /* Victory chime when settling and morphing */
      var chimeOsc = audioCtx.createOscillator();
      var chimeGain = audioCtx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(880, now + 0.36); /* A5 */
      chimeOsc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.44); /* E6 */
      chimeGain.gain.setValueAtTime(0.06, now + 0.36);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
      chimeOsc.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chimeOsc.start(now + 0.36);
      chimeOsc.stop(now + 0.62);
    } catch (e) {
      /* Audio blocked or unsupported; silent fallback */
    }
  }

  /* Spawn joyful 3D confetti burst */
  function spawnConfetti() {
    var stage = document.getElementById('dice-confetti-stage');
    if (!stage) return;
    stage.innerHTML = '';

    var colors = [
      '#ff3b30', '#ff9500', '#ffcc00', '#34c759',
      '#00c7be', '#007aff', '#5856d6', '#af52de', '#ff2d55'
    ];
    var pieceCount = 34;

    for (var i = 0; i < pieceCount; i++) {
      var piece = document.createElement('span');
      piece.className = 'confetti-piece';

      /* Varied shapes: ribbons, circles, and diamonds */
      var shapeChoice = i % 3;
      var width = 7;
      var height = 4;
      var borderRadius = '1px';

      if (shapeChoice === 0) {
        width = 8 + Math.floor(Math.random() * 4);
        height = 4 + Math.floor(Math.random() * 2);
        borderRadius = '1px';
      } else if (shapeChoice === 1) {
        width = 5 + Math.floor(Math.random() * 2);
        height = width;
        borderRadius = '50%';
      } else {
        width = 6;
        height = 6;
        borderRadius = '2px';
      }

      /* Radial angle with upward and lateral bias */
      var angle = (i / pieceCount) * (Math.PI * 2) + (Math.random() * 0.3 - 0.15);
      var distance = 35 + Math.random() * 45;
      var tx = Math.cos(angle) * distance;
      /* Gravity bias pulling slightly downward at apex */
      var ty = Math.sin(angle) * distance + (Math.random() * 12);

      var rx = (Math.random() * 720 + 360) + 'deg';
      var ry = (Math.random() * 720 + 360) + 'deg';
      var rz = (Math.random() * 360 - 180) + 'deg';
      var duration = (0.75 + Math.random() * 0.3) + 's';
      var color = colors[i % colors.length];

      piece.style.width = width + 'px';
      piece.style.height = height + 'px';
      piece.style.borderRadius = borderRadius;
      piece.style.backgroundColor = color;
      piece.style.setProperty('--tx', tx + 'px');
      piece.style.setProperty('--ty', ty + 'px');
      piece.style.setProperty('--rx', rx);
      piece.style.setProperty('--ry', ry);
      piece.style.setProperty('--rz', rz);
      piece.style.setProperty('--duration', duration);

      stage.appendChild(piece);
    }

    /* Clean up confetti DOM after animation */
    setTimeout(function () {
      stage.innerHTML = '';
    }, 1100);
  }

  /* Set specific pip face class (1 through 6) */
  function setDiceFace(btn, face) {
    for (var f = 1; f <= 6; f++) {
      btn.classList.remove('dice-face-' + f);
    }
    btn.classList.add('dice-face-' + face);
  }

  /* Execute the roll sequence and morph in place */
  function rollDice() {
    /* If already morphed, clicking again navigates immediately */
    if (isMorphed && pendingUrl) {
      if (navTimer) clearTimeout(navTimer);
      window.location.href = pendingUrl;
      return;
    }

    if (isRolling) return;
    isRolling = true;

    var btn = document.getElementById('random-dice-btn');
    var topbar = document.getElementById('topbar');
    var msgTitle = document.getElementById('dice-msg-title');

    if (!btn) {
      isRolling = false;
      return;
    }

    /* Choose destination (filtering out current URL) */
    var currentPath = window.location.pathname.replace(/\/+$/, '');
    var candidates = targets.filter(function (t) {
      var targetPath = t.url.replace(/\/+$/, '');
      return targetPath !== currentPath && targetPath !== '';
    });

    if (candidates.length === 0) candidates = targets;
    var chosen = candidates[Math.floor(Math.random() * candidates.length)];
    var finalFace = Math.floor(Math.random() * 6) + 1;
    pendingUrl = chosen.url;

    /* Start rolling animation */
    btn.classList.add('is-rolling');
    playAudioEffects();

    /* Rapid pip scrambling during tumble */
    var scrambleInterval = setInterval(function () {
      var randomFace = Math.floor(Math.random() * 6) + 1;
      setDiceFace(btn, randomFace);
    }, 45);

    /* Settle, burst confetti, and morph in-place into the found message */
    setTimeout(function () {
      clearInterval(scrambleInterval);
      setDiceFace(btn, finalFace);

      btn.classList.remove('is-rolling');
      if (msgTitle) {
        msgTitle.textContent = chosen.title;
      }
      btn.classList.add('is-morphed');
      isMorphed = true;
      isRolling = false;

      if (topbar) {
        topbar.classList.add('dice-morph-active');
      }

      /* Trigger colorful 3D confetti burst */
      spawnConfetti();

      /* Give reader comfortable window to enjoy confetti & title before navigating */
      navTimer = setTimeout(function () {
        window.location.href = chosen.url;
      }, 1050);
    }, 400);
  }

  /* Initialize DOM bindings */
  function initRandomDice() {
    var btn = document.getElementById('random-dice-btn');
    if (!btn) return;

    /* Prefetch targets when user hovers or focuses the button */
    btn.addEventListener('mouseenter', fetchTargets);
    btn.addEventListener('focus', fetchTargets);

    /* Click triggers the roll / morph / navigation */
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      fetchTargets();
      rollDice();
    });

    /* Global keyboard shortcut: pressing R or r triggers roll */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'r' || e.key === 'R') {
        var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement && document.activeElement.isContentEditable)) {
          return;
        }
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          fetchTargets();
          rollDice();
        }
      }
    });

    /* Coordinate with mobile search toggle so dice gracefully hides during mobile search */
    var searchTrigger = document.getElementById('search-trigger');
    var searchCancel = document.getElementById('search-cancel');

    if (searchTrigger) {
      searchTrigger.addEventListener('click', function () {
        var container = btn.closest('.dice-container') || btn;
        container.classList.add('d-none');
      });
    }
    if (searchCancel) {
      searchCancel.addEventListener('click', function () {
        var container = btn.closest('.dice-container') || btn;
        container.classList.remove('d-none');
      });
    }

    /* Eagerly prefetch data after browser settles */
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(fetchTargets, { timeout: 3000 });
    } else {
      setTimeout(fetchTargets, 2500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRandomDice);
  } else {
    initRandomDice();
  }
})();
