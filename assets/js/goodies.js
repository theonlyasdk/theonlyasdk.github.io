(function () {
  'use strict';

  const data = document.getElementById('goodies-data');
  const GOODIES = data ? JSON.parse(data.textContent) : [];
  const siteUrl = window.siteUrl || (path => path);
  let currentOpenGoodie = null;

  const $ = id => document.getElementById(id);
  const spinner = `<svg class="goodie-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="60" height="60" style="shape-rendering: auto; display: block; background: transparent; color: var(--text-color);"><g><g transform="rotate(0 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.9166666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(30 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.8333333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(60 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.75s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(90 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(120 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5833333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(150 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(180 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.4166666666666667s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(210 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(240 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.25s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(270 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.16666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(300 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.08333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(330 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" dur="1s" begin="0s" repeatCount="indefinite"></animate></rect></g></g></svg>`;

  function imageFallback(image) {
    image.hidden = true;
    const container = image.closest('.card-cover') || image.parentElement;
    const fallback = document.createElement('div');
    fallback.className = 'goodie-image-fallback';
    fallback.textContent = 'Preview unavailable. The goodie is still available.';
    container.appendChild(fallback);
  }

  function buildGoodieCard(goodie, index) {
    const card = document.createElement('div'); card.className = 'goodie-card'; card.tabIndex = 0; card.setAttribute('role', 'button'); card.style.setProperty('--anim-delay', `${((index + 1) * .1).toFixed(1)}s`);
    const cover = document.createElement('div'); cover.className = 'card-cover';
    /* Previews ship in three flavours: a 480px WebP thumbnail for cards,
       a 960px WebP for large viewports, and the original PNG as last
       resort. <picture> picks the first supported format; if a WebP file
       were ever missing the browser just falls through to the PNG src. */
    const thumb = siteUrl(goodie.image.replace(/\.png$/, '.480.webp'));
    const fullWebp = siteUrl(goodie.image.replace(/\.png$/, '.webp'));
    const picture = document.createElement('picture');
    const sources = [
      { srcset: thumb, media: '(max-width: 576px)' },
      { srcset: `${thumb} 480w, ${fullWebp} 960w`, sizes: '(min-width: 577px) 400px' }
    ];
    sources.forEach(({ srcset, ...rest }) => {
      const source = document.createElement('source');
      source.type = 'image/webp';
      source.srcset = srcset;
      Object.entries(rest).forEach(([k, v]) => source.setAttribute(k, v));
      picture.appendChild(source);
    });
    const image = document.createElement('img'); image.src = siteUrl(goodie.image); image.alt = goodie.name; image.loading = 'lazy'; image.decoding = 'async'; image.width = 400; image.height = 200; image.addEventListener('error', () => imageFallback(image), { once: true }); picture.appendChild(image); cover.appendChild(picture);
    if (goodie.credits) { const info = document.createElement('button'); info.type = 'button'; info.className = 'goodie-info-btn'; info.title = 'View credits & license'; info.setAttribute('aria-label', 'View credits and license'); info.innerHTML = '<svg class="goodie-info-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path d="M0 0h1024v1024H0z" fill="none" /><path fill="currentColor" d="M448 224a64 64 0 1 0 128 0a64 64 0 1 0-128 0m96 168h-64c-4.4 0-8 3.6-8 8v464c0 4.4 3.6 8 8 8h64c4.4 0 8-3.6 8-8V400c0-4.4-3.6-8-8-8" /></svg><span class="goodie-info-text">Credits</span>'; info.addEventListener('click', event => { event.stopPropagation(); openCreditsDialog(goodie.name); }); cover.appendChild(info); }
    const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = goodie.name;
    const description = document.createElement('p'); description.className = 'text-muted small'; description.textContent = goodie.description;
    card.append(cover, title, description);
    return card;
  }

  /* Grid <-> list morph for the goodies cards, ported from
     assets/js/projects-loader.js.

     A translate-only FLIP is wrong here: a grid cell is ~300px wide and a list
     row ~620px, so the cards also have to RESIZE. Scaling the card would stretch
     the text, so this animates each column's real width and height alongside its
     position - the text reflows as the box genuinely morphs from one shape into
     the other.

     The pill is draggable and commits live, so the view can change again a few
     frames after a morph started. Three things make that read as one continuous
     motion instead of a stutter:
       - a retarget runs shorter and unstaggered, because it continues the move
         already on screen rather than restarting a full-length one,
       - cleanup is driven by an exact timer rather than by the browser
         declaring the animation finished, which in a throttled tab it does
         immediately instead of at the declared duration,
       - a run clears the inline geometry of EVERY column, not just the ones it
         pinned, so a column a filter hid mid-morph cannot be orphaned. */
  const MORPH_DUR = 420;
  const MORPH_DUR_RETARGET = 230;
  const MORPH_EASE = 'cubic-bezier(0.32, 0.9, 0.24, 1)';
  const MORPH_STAGGER = 14;
  const MORPH_STAGGER_SLOTS = 12;

  const HAS_WA = typeof Element.prototype.getAnimations === 'function';

  /* 0 means nothing is animating, which is how a retarget is recognised. */
  let goodies_morph_gen = 0;
  let goodies_morph_timer = 0;
  let goodies_morph_settle = null;

  /* Hand a set of columns back to the stylesheet. */
  function clearGoodiesMorphGeometry(cols) {
    cols.forEach(col => {
      col.style.transition = '';
      col.style.width = '';
      col.style.height = '';
      col.style.transform = '';
    });
  }

  function animateGoodiesLayoutChange(applyChange) {
    const grid = $('goodies-grid');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const allCols = grid
      ? [...grid.children].filter(el => el.classList.contains('col'))
      : [];
    const cols = allCols.filter(el => !el.classList.contains('d-none'));

    /* A morph already on screen means this is a retarget, not a new move. */
    const retarget = goodies_morph_gen !== 0;
    goodies_morph_gen += 1;
    const gen = goodies_morph_gen;
    clearTimeout(goodies_morph_timer);
    goodies_morph_timer = 0;
    /* Detach the superseded run's resize hook here. It cannot do it from its own
       settle(), because that bails out on the generation guard first - without
       this, every retarget would strand one listener for the life of the page. */
    if (goodies_morph_settle) {
      window.removeEventListener('resize', goodies_morph_settle);
      goodies_morph_settle = null;
    }

    if (reduce || !cols.length) {
      /* Snap, and take any in-flight morph's pinned geometry with us - under
         reduced motion or an empty result there is nothing to animate and a
         stale pin would just be wrong. */
      goodies_morph_gen = 0;
      clearGoodiesMorphGeometry(allCols);
      applyChange();
      return;
    }

    /* Snap a still-running card entry animation to its end with finish(), never
       cancel(). slideIn is fill:forwards, so cancelling reverts the card to the
       stylesheet's resting opacity:0 - which is what forced the previous version
       into a permanent inline opacity:1 just to keep the cards visible.
       finish() leaves the animation in place at its end state and writes no
       inline style at all. Only that named animation is touched: the
       CollectionGrid filter FLIP runs as a transition on the same card and has
       to keep going. */
    cols.forEach(col => {
      const card = col.querySelector('.goodie-card');
      if (!card) return;
      if (HAS_WA) {
        card.getAnimations().forEach(a => {
          if (a.animationName === 'slideIn' && a.playState === 'running') a.finish();
        });
      } else {
        /* No Web Animations to finish, so nothing holds the card off its
           resting opacity:0. Pin it visible instead. */
        card.style.opacity = '1';
      }
    });

    /* FIRST: the box each column occupies right now. getBoundingClientRect()
       includes transforms and interpolated width, so a retarget captures where
       the column currently LOOKS - which is what makes interrupting it seamless
       instead of a jump. Measure before cancelling, since cancelling snaps the
       column back to its end state. Measure every column before cancelling any:
       cancelling one column's width transition resizes its flow, which shifts
       every column below it. */
    const firsts = new Map();
    cols.forEach(col => {
      const r = col.getBoundingClientRect();
      firsts.set(col, { x: r.left, y: r.top, w: r.width, h: r.height });
    });

    /* Stop the in-flight transitions and drop the inline geometry they were
       driving, so the destination measurement below reads the new layout's
       natural box instead of a stale pinned value. Nothing paints between here
       and the invert, so the columns stay visually pinned throughout. */
    cols.forEach(col => {
      if (HAS_WA) col.getAnimations().forEach(a => a.cancel());
      col.style.transition = '';
      col.style.width = '';
      col.style.height = '';
      col.style.transform = '';
    });

    applyChange();

    /* Destination boxes, now measured against the real new layout. */
    const targets = new Map();
    cols.forEach(col => {
      const r = col.getBoundingClientRect();
      targets.set(col, { x: r.left, y: r.top, w: r.width, h: r.height });
    });

    const dur = retarget ? MORPH_DUR_RETARGET : MORPH_DUR;
    const stagger = retarget ? 0 : MORPH_STAGGER;

    /* INVERT: pin every column to its old box. Explicit heights resize the
       column flow, which moves the boxes again - so the translate is computed in
       a second pass, once the browser has laid the pinned boxes out. Every rect
       is read before any transform is written; interleaving the two forces a
       synchronous layout per column. */
    cols.forEach(col => {
      const f = firsts.get(col);
      col.style.transition = 'none';
      col.style.width = f.w + 'px';
      col.style.height = f.h + 'px';
    });
    void grid.offsetWidth;

    const pins = [];
    cols.forEach(col => {
      const f = firsts.get(col);
      const r = col.getBoundingClientRect();
      pins.push([col, f.x - r.left, f.y - r.top]);
    });
    pins.forEach(([col, dx, dy]) => { col.style.transform = `translate(${dx}px, ${dy}px)`; });
    void grid.offsetWidth;

    /* PLAY: animate box + position to the destination. A retarget drops the
       stagger so a fast drag moves the whole grid as one block instead of
       restarting a per-column cascade it is already halfway through. */
    cols.forEach((col, i) => {
      const t = targets.get(col);
      const delay = (i % MORPH_STAGGER_SLOTS) * stagger;
      col.style.transition =
        `width ${dur}ms ${MORPH_EASE} ${delay}ms, ` +
        `height ${dur}ms ${MORPH_EASE} ${delay}ms, ` +
        `transform ${dur}ms ${MORPH_EASE} ${delay}ms`;
      col.style.width = t.w + 'px';
      col.style.height = t.h + 'px';
      col.style.transform = 'translate(0, 0)';
    });

    /* Give the columns back to the stylesheet once this run is over. Every path
       goes through the generation guard, so a superseded run can never wipe the
       geometry of the run that replaced it. */
    const settle = () => {
      if (goodies_morph_gen !== gen) return;
      goodies_morph_gen = 0;
      clearTimeout(goodies_morph_timer);
      goodies_morph_timer = 0;
      window.removeEventListener('resize', settle);
      goodies_morph_settle = null;
      /* Sweep every column, not just this run's set. A filter can hide a column
         mid-morph, and the next morph only captures the visible ones - so a
         hidden one would keep a stale width, height and offset forever and
         render wrong the moment the filter lets it back in. */
      clearGoodiesMorphGeometry(allCols);
    };

    /* Cleanup runs off a timer, deliberately NOT off the transitions' own
       `finished` promises. Those resolve as soon as the browser decides the
       animation is over, which in a suspended, throttled or just-not-yet-painted
       tab is immediately rather than at the declared duration - settling then
       yanks the columns out from under a morph that is still meant to be on
       screen, which is the stutter this whole path exists to avoid. The end of
       the run is known exactly here: dur plus the last column's stagger delay,
       plus a frame of slack. */
    const lastDelay = stagger * Math.min(MORPH_STAGGER_SLOTS - 1, cols.length - 1);
    goodies_morph_timer = setTimeout(settle, dur + lastDelay + 60);

    /* A resize mid-morph leaves px-pinned boxes fighting a re-wrapped row. Land
       the morph immediately rather than animating to numbers that no longer
       match the layout. */
    goodies_morph_settle = settle;
    window.addEventListener('resize', settle);
  }

  function setupCollection() {
    window.CollectionGrid({
      items: GOODIES,
      gridId: 'goodies-grid',
      filterId: 'goodie-filter',
      searchId: 'goodie-search',
      clearId: 'goodie-search-clear',
      filterBtnClass: 'goodie-filter-btn',
      emptyColClass: 'goodie-empty-col',
      emptyClass: 'goodie-empty',
      emptyTitle: 'No goodies found',
      emptyHint: 'No goodies match your search. Try a different keyword or category.',
      buildCard: buildGoodieCard,
      onOpen: goodie => openMinigame(goodie.name)
    });
  }

  function setupViewToggle() {
    const bar = document.querySelector('.view-toggle');
    if (!bar) return;
    const grid = $('goodies-grid');
    if (!grid) return;
    const tabs = [...bar.querySelectorAll('.t-tab')];

    function applyView(view, animate) {
      const isList = view === 'list';
      /* Already showing this view: re-running the morph would pin every column,
         animate it to the box it is already in, and cancel any morph the user
         had just interrupted. Do nothing instead. */
      if (grid.classList.contains('list-view') === isList) return;
      const change = () => grid.classList.toggle('list-view', isList);
      if (animate === false) change();
      else animateGoodiesLayoutChange(change);
      try { localStorage.setItem('goodie-view', view); } catch (err) {}
    }

    const active = () => tabs.find(t => t.getAttribute('aria-pressed') === 'true') || tabs[0];

    let saved = null;
    try { saved = localStorage.getItem('goodie-view'); } catch (err) {}
    const initialTab = tabs.find(t => t.dataset.view === saved) || tabs[0];
    const initialIndex = Math.max(0, tabs.indexOf(initialTab));

    /* Restore the saved layout without animating - the morph should only run
       on an actual view change, not on first paint. */
    tabs.forEach((t, i) => t.setAttribute('aria-pressed', i === initialIndex ? 'true' : 'false'));
    applyView(initialTab.dataset.view, false);

    /* Same draggable segmented engine as the projects list view switcher:
       click, arrow keys, Home/End, flick momentum and a rubber-band drag,
       living in the shared .t-tabs-pill markup. */
    const segment = window.RubberSegment
      ? window.RubberSegment.create({
          track: bar,
          pill: bar.querySelector('.t-tabs-pill'),
          items: tabs,
          inset: 3,
          stretch: 100,
          squash: 3,
          speed: 1,
          glide: 75,
          draggable: true,
          onChange: index => {
            const tab = tabs[index];
            if (!tab) return;
            /* The engine owns the thumb, not the ARIA state - the active tab
               highlight is CSS-driven off [aria-pressed], so move it here or a
               drag would slide the pill and light up nothing. */
            tabs.forEach((t, i) => t.setAttribute('aria-pressed', i === index ? 'true' : 'false'));
            applyView(tab.dataset.view);
          }
        })
      : null;

    /* Jump the thumb to the restored slot with no animation. */
    if (segment) segment.setValue(initialIndex);
    if (segment && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => segment.measure());
    }

    // Phones are always list view (the toggle is hidden there).
    const phone = window.matchMedia('(max-width: 576px)');
    const applyResponsive = (animate) => {
      const isList = phone.matches || active().dataset.view === 'list';
      if (grid.classList.contains('list-view') === isList) return;
      const change = () => grid.classList.toggle('list-view', isList);
      if (animate === false) change();
      else animateGoodiesLayoutChange(change);
    };
    /* Animate when the breakpoint is crossed with the page live, but not on the
       initial call - that would morph the layout on first paint. */
    if (phone.addEventListener) phone.addEventListener('change', () => applyResponsive(true));
    else if (phone.addListener) phone.addListener(() => applyResponsive(true));
    applyResponsive(false);
  }

  function setupFilterScroll() {
    const filter = $('goodie-filter');
    if (!filter) return;
    const update = () => {
      filter.classList.toggle('can-scroll-left', filter.scrollLeft > 4);
      filter.classList.toggle('can-scroll-right',
        filter.scrollLeft + filter.clientWidth < filter.scrollWidth - 4);
    };
    filter.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
    requestAnimationFrame(update);
  }

  // Removing (not just hiding) the loader: Bootstrap's `.d-flex`
  // (display:flex !important) overrides the UA `[hidden]` rule, so
  // `loader.hidden = true` would leave the spinner visible forever.
  function hideModalLoader() {
    const loader = $('modal-iframe-loader');
    if (loader) loader.remove();
  }

  function openMinigame(name) {
    const goodie = GOODIES.find(item => item.name === name); if (!goodie) return;
    currentOpenGoodie = goodie; const modal = $('custom-minigame-modal'); const body = $('modal-body-content'); const title = $('custom-modal-title'); const demoLink = $('custom-modal-demo-link');
    title.textContent = goodie.name; demoLink.hidden = !goodie.iframe_url;
    if (goodie.iframe_url) { demoLink.href = siteUrl(goodie.iframe_url); body.className = 'modal-placeholder position-relative'; body.style.cssText = 'width:100%;height:100%;'; body.innerHTML = `<div id="modal-iframe-loader" class="d-flex flex-column align-items-center justify-content-center w-100 h-100 position-absolute top-0 start-0" role="status">${spinner}<span class="text-muted small mt-2">Loading demo...</span></div><iframe class="modal-iframe" src="${siteUrl(goodie.iframe_url)}" title="${goodie.name}" allow="fullscreen" onload="this.style.opacity='1'; if (window.hideModalLoader) window.hideModalLoader();" style="opacity:0;transition:opacity .3s ease;position:relative;z-index:2"></iframe>`; const iframe = body.querySelector('iframe'); setTimeout(() => { if (currentOpenGoodie !== goodie || !$('modal-iframe-loader')) return; hideModalLoader(); iframe.style.opacity = '1'; console.warn('Goodie demo is taking unusually long to load: ' + goodie.name); }, 20000);
    iframe.addEventListener('error', () => { body.innerHTML = `<div class="modal-placeholder"><h2 class="h3">Demo unavailable</h2><p class="text-muted">This demo could not be loaded here.</p><button type="button" class="btn btn-link goodie-error-link" onclick="closeMinigame(event, true)">Back to goodies</button></div>`; }, { once: true }); }
    else { body.className = 'modal-placeholder d-flex flex-column align-items-center justify-content-center w-100 h-100'; body.style.cssText = ''; body.innerHTML = `${spinner}<h2 class="h3 mt-3 mb-1 fw-bold">${goodie.name}</h2><p class="text-muted italic small mb-0">Stay tuned, the engine is charging up!</p><button type="button" class="btn btn-link goodie-error-link" onclick="closeMinigame(event, true)">Back to goodies</button>`; }
    modal.classList.remove('closing'); modal.style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active'))); document.body.style.overflow = 'hidden';
  }

  function closeMinigame(event, force) { const modal = $('custom-minigame-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none'; $('modal-body-content').replaceChildren(); document.body.style.overflow = ''; currentOpenGoodie = null; }, 260); }
  function openCreditsDialog(name) { const goodie = GOODIES.find(item => item.name === name); if (!goodie || !goodie.credits) return; const c = goodie.credits, modal = $('custom-credits-modal'); $('credits-modal-body-content').innerHTML = `<div class="mb-3"><h5 class="fw-bold mb-1">${c.title}</h5><p class="text-muted small mb-0">${c.description}</p></div><div class="list-group list-group-flush rounded border"><div class="list-group-item">Author: <a href="https://github.com/${c.github_user}" target="_blank" rel="noopener noreferrer">${c.author} (@${c.github_user})</a></div><div class="list-group-item">Repository: <a href="${c.repo_url}" target="_blank" rel="noopener noreferrer">${c.repo_url}</a></div><div class="list-group-item">License: <a href="${c.license_url}" target="_blank" rel="noopener noreferrer">${c.license}</a></div></div>`; modal.classList.remove('closing'); modal.style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active'))); document.body.style.overflow = 'hidden'; }
  function closeCreditsDialog(event, force) { const modal = $('custom-credits-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none'; if (!$('custom-minigame-modal').classList.contains('active')) document.body.style.overflow = ''; }, 260); }
  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target && event.target.tagName || '')) return;
    if (event.key !== 'Escape') return;
    if ($('custom-credits-modal').classList.contains('active')) closeCreditsDialog(null, true); else if ($('custom-minigame-modal').classList.contains('active')) closeMinigame(null, true);
  });
  window.openCreditsDialogCurrent = () => currentOpenGoodie && openCreditsDialog(currentOpenGoodie.name);
  window.openCreditsDialog = openCreditsDialog; window.closeCreditsDialog = closeCreditsDialog; window.closeMinigame = closeMinigame; window.hideModalLoader = hideModalLoader;
  setupCollection();
  setupViewToggle();
  setupFilterScroll();
})();
