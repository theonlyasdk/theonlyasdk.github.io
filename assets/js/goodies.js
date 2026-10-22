(function () {
  'use strict';

  const data = document.getElementById('goodies-data');
  const GOODIES = data ? JSON.parse(data.textContent) : [];
  const siteUrl = window.siteUrl || (path => path);
  let currentOpenGoodie = null;

  const $ = id => document.getElementById(id);

  /* The page's loading state: the lattice status row above the grid, mounted by
     assets/js/lattice-loader.js. It runs from the moment this script starts and
     settles once the cards are built, reporting the frozen time either way. */
  const goodiesLoaderHost = $('goodies-loading');
  const goodiesLoader = window.LatticeLoader
    ? window.LatticeLoader.mount(document.querySelector('[data-lattice-loader]'))
    : null;
  const goodiesLoaderStartedAt = performance.now();

  function settleGoodiesLoader(failed) {
    if (!goodiesLoader) return;
    if (failed) {
      goodiesLoader.setStatus('error');
      return;
    }
    /* Hold the fetch state long enough to read, then show the stopwatch stopped
       on the done mark before the row collapses out of the flow. */
    const hold = Math.max(0, 520 - (performance.now() - goodiesLoaderStartedAt));
    setTimeout(() => {
      goodiesLoader.setStatus('done');
      setTimeout(() => {
        if (!goodiesLoaderHost) return;
        goodiesLoaderHost.classList.add('is-finished');
        setTimeout(() => { goodiesLoaderHost.hidden = true; }, 400);
      }, 700);
    }, hold);
  }

  function runGoodiesBuild(build) {
    try {
      build();
      settleGoodiesLoader(false);
    } catch (err) {
      settleGoodiesLoader(true);
      console.error('Failed to build the goodies grid:', err);
    }
  }
  const spinner = `<svg class="goodie-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="60" height="60" style="shape-rendering: auto; display: block; background: transparent; color: var(--text-color);"><g><g transform="rotate(0 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.9166666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(30 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.8333333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(60 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.75s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(90 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(120 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5833333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(150 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(180 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.4166666666666667s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(210 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(240 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.25s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(270 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.16666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(300 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.08333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(330 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" dur="1s" begin="0s" repeatCount="indefinite"></animate></rect></g></g></svg>`;

  function imageFallback(image) {
    image.hidden = true;
    const container = image.closest('.card-cover') || image.parentElement;
    const fallback = document.createElement('div');
    fallback.className = 'goodie-image-fallback';
    fallback.textContent = 'Preview unavailable. The goodie is still available.';
    container.appendChild(fallback);
  }

  /* The two corner icons, both in a 24x24 box on currentColor so they inherit
     the pill's colour and follow the theme like everything else here. Info is
     the description of the goodie itself; Credits is the open book that stands
     for attribution and licence. */
  /* Each glyph sits in a span that fills the collapsed pill and centres the
     drawing inside it. The span is the sizing layer, not the svg: an svg with a
     viewBox and a CSS width stretches to fill whatever box it is given, so
     `font-size` on it would change nothing and the icon has to be sized by the
     box it is placed in. */
  const ICON_INFO = '<span class="goodie-action-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>';
  const ICON_CREDITS = '<span class="goodie-action-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>';

  /* One pill, two labels. Info and Credits are the same control in every visual
     respect - same size, same reveal, same icon slot - so they are built here
     once and told apart by a variant class that only sets the hover width,
     since the two words are different lengths. */
  function buildActionButton(opts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `goodie-action-btn is-${opts.variant}`;
    button.title = opts.title;
    button.setAttribute('aria-label', opts.ariaLabel);
    button.innerHTML = `${opts.icon}<span class="goodie-action-text">${opts.label}</span>`;
    /* The card underneath is itself a button, so without this the click would
       open the goodie as well as the dialog. */
    button.addEventListener('click', event => { event.stopPropagation(); opts.onClick(); });
    return button;
  }

  /* Everything from the data file lands in a dialog, so every field is escaped
     on the way in. The records are author-controlled today, but the escape
     costs nothing and takes the question off the table. */
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    /* Info is on every card - it carries the description, so it is meaningful
       even for a goodie that ships with a full credits block. Credits is added
       only when there is an author and a licence to show, so third-party work
       carries both and original work carries just the one. */
    const actions = document.createElement('div'); actions.className = 'goodie-actions';
    actions.appendChild(buildActionButton({ variant: 'info', label: 'Info', title: 'About this goodie', ariaLabel: 'View information about this goodie', icon: ICON_INFO, onClick: () => openInfoDialog(goodie.name) }));
    if (goodie.credits) actions.appendChild(buildActionButton({ variant: 'credits', label: 'Credits', title: 'View credits & license', ariaLabel: 'View credits and license', icon: ICON_CREDITS, onClick: () => openCreditsDialog(goodie.name) }));
    cover.appendChild(actions);
    const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = goodie.name;
    const description = document.createElement('p'); description.className = 'text-muted small'; description.textContent = goodie.description;
    card.append(cover, title, description);
    return card;
  }

  /* Grid <-> list morph for the goodies cards, ported from
     assets/js/projects-loader.js.

     A translate-only FLIP is wrong here: a grid cell is ~300px wide and a list
     row ~620px, so the cards also have to RESIZE. The resize is done with
     scale, not with width/height - animating either one relayouts every column
     below the one being resized, on every frame. Scale is a pure compositor
     operation, so the morph never touches the layout path.

     The card's contents cross-dissolve across that swap instead. Scale would
     otherwise squash the 2rem title horizontally and stretch it vertically, and
     `display` plus the text's grid column cannot be transitioned anyway, so they
     flip in a single frame. The box keeps stretching; a copy of the card as it
     looked before the swap is laid over the live one and blurred and dissolved
     away. See the is-layout-from rules in _tabs/goodies.html.

     Easing is a plain ease-out on purpose. This is a discrete layout change
     driven by a click or a pill commit, not a continuous drag, so there is no
     release velocity to hand off - the gesture physics live in
     assets/js/rubber-segment.js, which drives the pill. What matters here is
     that a retarget reads as one continuous move rather than a stutter:
       - a retarget runs shorter and unstaggered, because it continues the move
         already on screen rather than restarting a full-length one. It starts
         from the column's CURRENT visual box, which a scale-based FLIP gets
         for free out of getBoundingClientRect(), so position stays continuous,
       - cleanup is driven by an exact timer rather than by the browser
         declaring the animation finished, which in a throttled tab it does
         immediately instead of at the declared duration,
       - a run clears the inline geometry of EVERY column, not just the ones it
         pinned, so a column a filter hid mid-morph cannot be orphaned. */
  const MORPH_DUR = 420;
  const MORPH_DUR_RETARGET = 230;
  const MORPH_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const MORPH_STAGGER = 14;
  const MORPH_STAGGER_SLOTS = 12;

  const HAS_WA = typeof Element.prototype.getAnimations === 'function';

  /* 0 means nothing is animating, which is how a retarget is recognised. */
  let goodies_morph_gen = 0;
  let goodies_morph_timer = 0;
  let goodies_morph_settle = null;
  let goodies_morph_from = [];

  /* Flags the grid while a morph is on screen, which promotes the columns for its
     duration only. See the is-layout-morphing rule in _tabs/goodies.html. */
  function setLayoutMorphing(on) {
    const grid = $('goodies-grid');
    if (grid) grid.classList.toggle('is-layout-morphing', on);
  }

  /* Build one "before" layer: a copy of the card as it looks right now, laid out
     at the size the card used to be and scaled to the size it is going to be. The
     column's transform then maps both of those back onto the box the card used to
     occupy, so on the first frame the copy is the old card exactly - same size,
     same place, same internal layout - and the new proportions creep in as the
     copy dissolves.

     Getting that first frame right is the whole reason for the sizing. The copy
     has to live inside the card, which is the only way to keep it clipped and
     welded to a box that is changing size underneath it, but the card's box has
     already been swapped for the new layout's by the time this runs. Laid out in
     that box, a grid card's 200px cover would come out stretched over the whole
     tile and its title pushed off the bottom - a jump at t=0 in place of the jump
     the copy exists to remove. Laying it out at the old size and scaling by the
     inverse of the column's stretch cancels that out to the pixel.

     `size.kx/ky` is that inverse, taken from the COLUMN rather than the card. The
     card sits inside the column's gutters, so the two do not scale by quite the
     same ratio, and using the card's own sizes would leave the copy a few percent
     out in each axis for the whole run. */
  function buildMorphFrom(card, wasList, size) {
    const from = card.cloneNode(true);
    from.classList.add('is-layout-from');
    if (wasList) from.classList.add('is-layout-from-list');
    from.setAttribute('aria-hidden', 'true');
    from.tabIndex = -1;
    const ow = size && size.w ? size.w : card.offsetWidth;
    const oh = size && size.h ? size.h : card.offsetHeight;
    const kx = size && size.kx ? size.kx : 1;
    const ky = size && size.ky ? size.ky : 1;
    from.style.width = ow + 'px';
    from.style.height = oh + 'px';
    from.style.transform = `scale(${kx}, ${ky})`;
    if (size) {
      from.style.left = (size.ox || 0) + 'px';
      from.style.top = (size.oy || 0) + 'px';
    }
    /* Written inline so the fade below has a committed value to interpolate from.
       The stylesheet pins the same value for the same reason: the base .goodie-card
       rule is `opacity: 0` and relies on slideIn's fill to reach 1, and the copy
       cancels that animation. The filter is written for the same reason again -
       left unset, the computed value is `none`, which is not a blur to interpolate
       from. */
    from.style.transition = 'none';
    from.style.opacity = '1';
    from.style.filter = 'blur(0px)';
    return from;
  }

  /* Lay a copy of each card - as it looked a moment ago - over the live one and
     fade it out across the run. That copy IS the cross-fade.

     A single element cannot cross-fade. It can only dim to nothing and come back,
     and there is a stretch in the middle where neither the old layout nor the new
     one is on screen; no amount of easing hides that, which is why the earlier
     attempts read as a blink. With a copy on top the composite is opaque for the
     whole run: the live contents are never hidden at all, they are simply revealed
     as the copy above them dissolves.

     The copy is appended INTO the card rather than parked on <body>. The column is
     what carries the scale, so a copy inside it is warped by exactly the same
     matrix as the live card, and the card's own `overflow: hidden` keeps it
     inside the card's silhouette for the whole run. A copy at absolute page
     coordinates drifts away from a card that is changing size under it and ends up
     spread across its neighbours.

     cloneNode copies tabindex and role, and none of the click handlers come with
     it, so the copy is pulled out of the tab order and the accessibility tree -
     otherwise every toggle announces a dead button to a screen reader.

     `wasList` is read by the caller BEFORE applyChange(), never here: by the time
     this runs the class has already flipped, and asking now would describe the
     layout being arrived at rather than the one being left. */
  function captureMorphFrom(cols, opts) {
    const { fadeMs, wasList, sizes } = opts;

    /* A retarget keeps the copies already on screen instead of replacing them.
       They are the state the interruption continues from, and rebuilding them
       would blink the old layout away and back. Keyed by card, not by column
       index, so a copy stays with its card. */
    const carried = new Map();
    goodies_morph_from.forEach(from => {
      const card = from.parentNode;
      if (card) carried.set(card, from);
    });

    const next = [];
    cols.forEach(col => {
      const card = col.querySelector('.goodie-card');
      if (!card) return;
      let from = carried.get(card);
      if (from) {
        carried.delete(card);
      } else {
        from = buildMorphFrom(card, wasList, sizes.get(col));
        card.appendChild(from);
      }
      next.push(from);
    });

    /* Copies whose card this run does not cover - filtered away, or hidden while
       the morph was in flight - go now rather than lingering over a card that is
       no longer part of the move. */
    carried.forEach(from => {
      if (from.parentNode) from.parentNode.removeChild(from);
    });
    goodies_morph_from = next;

    /* Commit every copy at the value it currently has - rest for a fresh one, less
       for a carried one, which is already part-way down its fade and its blur and
       must not be restarted at the top or the old layout flashes back into focus.
       Without a reflow between the two writes the fade lands in the same style
       recalculation and has nothing to interpolate from. */
    goodies_morph_from.forEach(from => {
      const at = getComputedStyle(from);
      const blur = at.filter === 'none' ? 'blur(0px)' : at.filter;
      const opacity = at.opacity;
      from.style.transition = 'none';
      from.style.opacity = opacity;
      from.style.filter = blur;
    });
    goodies_morph_from.forEach(from => { void from.offsetWidth; });
    goodies_morph_from.forEach(from => {
      from.style.transition = `opacity ${fadeMs}ms ${MORPH_DISSOLVE_EASE}, filter ${fadeMs}ms ${MORPH_DISSOLVE_EASE}`;
      from.style.opacity = '0';
      from.style.filter = `blur(${MORPH_DISSOLVE_BLUR}px)`;
    });
  }

  function dropMorphFrom() {
    goodies_morph_from.forEach(from => {
      if (from && from.parentNode) from.parentNode.removeChild(from);
    });
    goodies_morph_from = [];
  }

  /* The card box stretches - that is the morph, and it is wanted. The contents
     are what must not be seen doing it, and must not vanish while it happens
     either. So the box stretches behind a cross-dissolve: a copy of the old
     contents fades out over the run while the new contents sit at full opacity
     underneath it. Linear, because a dissolve is a linear mix of two layers - an
     ease here would unbalance the mix and put the dip back, just smaller. */
  const MORPH_DISSOLVE_EASE = 'linear';

  /* ...and the outgoing contents soften as they go. At the halfway point the two
     layers are at equal strength, and an opacity mix alone leaves the eye reading
     both layouts at once - clear enough to look like a rendering fault rather
     than a transition. Taking the outgoing one out of focus gives the dissolve
     somewhere to go and hands attention to the layer that is arriving.

     Standard deviation, which is what CSS blur() takes. The peak is only ever
     reached at zero opacity, so what is actually on screen is the first half of
     it - around 5px while the copy is still half visible. */
  const MORPH_DISSOLVE_BLUR = 10;

  /* Land any morph in flight right now, handing every column back to the
     stylesheet. The filter engine measures cards to place its fade-out ghosts,
     and a column that is still carrying an in-flight transform reports a box
     that matches no real layout - the ghost then appears at a phantom offset
     and size, and overlapping ones stack on each other. The morph is landed on
     its real destination rather than frozen part-way, so the grid never sits
     still while something else animates. Called from CollectionGrid before it
     measures, via the `beforeRender` option. */
  function settleMorphNow() {
    if (goodies_morph_settle) {
      window.removeEventListener('resize', goodies_morph_settle);
      goodies_morph_settle = null;
    }
    goodies_morph_gen = 0;
    clearTimeout(goodies_morph_timer);
    goodies_morph_timer = 0;
    dropMorphFrom();
    setLayoutMorphing(false);
    const grid = $('goodies-grid');
    if (!grid) return;
    clearGoodiesMorphGeometry([...grid.children].filter(el => el.classList.contains('col')));
  }

  /* Hand a set of columns back to the stylesheet. Transform only - the morph
     writes nothing else. */
  function clearGoodiesMorphGeometry(cols) {
    cols.forEach(col => {
      col.style.transition = '';
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

    /* Which layout we are LEAVING, read here because applyChange() flips the
       class further down and the "from" copies are frozen in it. */
    const wasListView = grid.classList.contains('list-view');

    /* A morph already on screen means this is a retarget, not a new move. */
    const retarget = goodies_morph_gen !== 0;
    goodies_morph_gen += 1;
    const gen = goodies_morph_gen;
    clearTimeout(goodies_morph_timer);
    goodies_morph_timer = 0;
    /* The superseded run's copies are deliberately NOT dropped here.
       captureMorphFrom carries them into the new run and re-fades them from
       wherever they had got to, which is what makes an interrupted dissolve
       continue instead of restarting. Dropping them here would blink the old
       layout away and back on every retarget - the very thing they exist to
       prevent. */
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
      dropMorphFrom();
      setLayoutMorphing(false);
      applyChange();
      return;
    }

    /* FIRST: the box each column occupies right now. getBoundingClientRect()
       includes transforms, so a retarget captures where the column currently
       LOOKS - which is what makes interrupting it seamless instead of a jump.
       Measure every column before cancelling any: cancelling one column's
       transform moves the columns below it. */
    const firsts = new Map();
    cols.forEach(col => {
      const r = col.getBoundingClientRect();
      firsts.set(col, { x: r.left, y: r.top, w: r.width, h: r.height });
    });

    /* The card's own layout box and position as they are right now, which is still
       the old layout's - the swap happens further down. The "before" layers are
       laid out at that size and offset onto that position, see buildMorphFrom.
       offsetWidth/Height rather than a rect for the size: that is the layout box
       whether or not a transform is on the column, which is what a retarget needs. */
    const sizes = new Map();
    cols.forEach(col => {
      const card = col.querySelector('.goodie-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      sizes.set(col, { w: card.offsetWidth, h: card.offsetHeight, x: r.left, y: r.top });
    });

    /* Stop the in-flight transition and drop the transform it was driving, so
       the destination measurement below reads the new layout's natural box
       instead of a stale pinned value. Nothing paints between here and the
       invert, so the columns stay visually pinned throughout. */
    cols.forEach(col => {
      if (HAS_WA) col.getAnimations().forEach(a => a.cancel());
      col.style.transition = '';
      col.style.transform = '';
    });

    /* Arm the promotion before the swap. The class and the .list-view toggle land
       in the same style recalculation, so this frame is already the new layout. */
    setLayoutMorphing(true);

    applyChange();

    /* Destination boxes, now measured against the real new layout. The card's own
       box is read alongside: the "before" layer is anchored to the card, and it has
       to be placed so that it lands on the box the card used to occupy, which is
       not the same thing - the card sits inside the column's gutters, and those
       change between the two layouts. */
    const targets = new Map();
    const toCards = new Map();
    cols.forEach(col => {
      const r = col.getBoundingClientRect();
      targets.set(col, { x: r.left, y: r.top, w: r.width, h: r.height });
      const card = col.querySelector('.goodie-card');
      if (card) {
        const cr = card.getBoundingClientRect();
        toCards.set(col, { x: cr.left, y: cr.top });
      }
    });

    /* Three numbers the "before" layer needs, all derived from the two boxes and
       the strip of stretch between them:

         kx/ky  the inverse of the stretch the transform below is about to apply,
                so the layer can cancel it on the first frame and let it creep in
                as it dissolves. Taken from the COLUMN, not the card, because the
                card sits inside the column's gutters and the two do not scale by
                quite the same ratio.
         ox/oy  where inside the card the layer has to sit. Solving for the local
                offset that puts it on the OLD card's box once the transform has
                been applied is one division by the stretch, minus where the card
                itself now starts. It has to be solved rather than assumed to be
                zero: the gutters are not related by the stretch factor, so the
                card's own corner is not where the old card's corner was. */
    cols.forEach(col => {
      const f = firsts.get(col);
      const t = targets.get(col);
      const size = sizes.get(col);
      const tc = toCards.get(col);
      if (!size || !f || !t || !tc || !f.w || !f.h || !t.w || !t.h) return;
      const sx = f.w / t.w;
      const sy = f.h / t.h;
      size.kx = t.w / f.w;
      size.ky = t.h / f.h;
      size.ox = (size.x - f.x) / sx - (tc.x - t.x);
      size.oy = (size.y - f.y) / sy - (tc.y - t.y);
    });

    const dur = retarget ? MORPH_DUR_RETARGET : MORPH_DUR;
    const stagger = retarget ? 0 : MORPH_STAGGER;

    /* INVERT: scale and translate every column so it LOOKS like it is still
       at its old box, now that the layout underneath has already jumped to the
       new one. This is the matrix3d FLIP from the parallel-animations
       reference, reduced to 2D:

         sx = first.w / target.w        dx = first.x - target.x
         sy = first.h / target.h        dy = first.y - target.y

       `transform-origin: 0 0` (see _tabs/goodies.html) makes that algebra
       exact: scaling about the top-left corner maps the destination box onto
       the source box, and the translate moves that corner back onto the source
       position. No width or height is written anywhere in this function.

       Every rect was read before any transform is written, and the invert
       needs no second measurement pass - nothing about the layout changes when
       a transform is applied, so there is nothing to re-read. */
    cols.forEach(col => {
      const f = firsts.get(col);
      const t = targets.get(col);
      if (!f || !t || !t.w || !t.h) return;
      col.style.transition = 'none';
      col.style.transform = `translate3d(${f.x - t.x}px, ${f.y - t.y}px, 0) scale(${f.w / t.w}, ${f.h / t.h})`;
    });
    void grid.offsetWidth;

    /* PLAY: animate the transform to identity, which lands the column exactly on
       its destination box. A retarget drops the stagger so a fast drag moves the
       whole grid as one block instead of restarting a per-column cascade it is
       already halfway through. */
    cols.forEach((col, i) => {
      const delay = (i % MORPH_STAGGER_SLOTS) * stagger;
      col.style.transition = `transform ${dur}ms ${MORPH_EASE} ${delay}ms`;
      col.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
    });

    /* How long the whole move takes: the longest column's delay plus its own
       duration. The dissolve is given this same span, so the old card is still
       partly on screen right up to the frame the new one lands on. */
    const run = dur + stagger * Math.min(MORPH_STAGGER_SLOTS - 1, Math.max(0, cols.length - 1));

    /* Two layers on screen for the whole run. The copies go in on top of their
       cards here, before this frame paints, while the live contents are left
       alone underneath - so there is no moment where neither layout is visible,
       which is what the dim-and-return version could never avoid. The dissolve
       gets the whole run on the same clock as the stretch it is covering. */
    captureMorphFrom(cols, { fadeMs: run, wasList: wasListView, sizes });

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
      setLayoutMorphing(false);
      /* The copies go with the run, so one can never outlive the morph that made
         it. The dissolve is `run` long and this timer fires 60ms later. */
      dropMorphFrom();
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
    /* Goodies are appended to _data/goodies.yml in chronological order (oldest
       first, newest last), so reverse here to surface the most recent ones
       first - mirroring the projects list convention. */
    runGoodiesBuild(() => window.CollectionGrid({
      items: [...GOODIES].reverse(),
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
      onOpen: goodie => openMinigame(goodie.name),
      /* Land a view morph before this render measures, or the fade-out ghosts
         get placed from column boxes that are mid-flight. */
      beforeRender: settleMorphNow
    }));
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

  function closeMinigame(event, force) { const modal = $('custom-minigame-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none';    $('modal-body-content').replaceChildren(); releaseScrollLockIfIdle(); currentOpenGoodie = null; }, 260); }
  /* Several dialogs share the one body scroll lock, and each may only give it
     back when nothing else is still covering the page. Released unconditionally,
     closing a dialog behind another would hand scrolling back to a page that is
     still hidden underneath. */
  function releaseScrollLockIfIdle() {
    const open = ['custom-goodie-info-modal', 'custom-credits-modal', 'custom-minigame-modal']
      .some(id => { const el = $(id); return el && el.classList.contains('active'); });
    if (!open) document.body.style.overflow = '';
  }

  /* Build the Info dialog's contents from whatever the record actually carries.
     Every block is optional, so a goodie with nothing but its one-line
     `description` still renders a sensible sheet, and richer records fill out
     as far as the data goes. */
  function renderInfoBody(goodie, info, summary) {
    const parts = [];
    parts.push('<div class="goodie-info-head"><h5 class="fw-bold mb-0">' + escapeHtml(goodie.name) + '</h5>');
    if (goodie.category) parts.push('<span class="goodie-info-kicker">' + escapeHtml(goodie.category) + '</span>');
    parts.push('</div>');
    if (summary) parts.push('<p class="goodie-info-lead">' + escapeHtml(summary) + '</p>');
    if (info.controls) parts.push('<div class="goodie-info-section"><h6>How to use</h6><p>' + escapeHtml(info.controls) + '</p></div>');
    const tech = Array.isArray(info.tech) ? info.tech.filter(Boolean) : [];
    if (tech.length) {
      const chips = tech.map(item => '<span class="goodie-info-chip">' + escapeHtml(item) + '</span>').join('');
      parts.push('<div class="goodie-info-section"><h6>Built with</h6><div class="goodie-info-chips">' + chips + '</div></div>');
    }
    return '<div class="goodie-info-body">' + parts.join('') + '</div>';
  }

  function openInfoDialog(name) {
    const goodie = GOODIES.find(item => item.name === name);
    const modal = $('custom-goodie-info-modal');
    if (!goodie || !modal) return;
    const info = goodie.info || {};
    $('goodie-info-modal-body-content').innerHTML = renderInfoBody(goodie, info, info.summary || goodie.description || '');
    modal.classList.remove('closing');
    modal.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active')));
    document.body.style.overflow = 'hidden';
  }

  function closeInfoDialog(event, force) {
    const modal = $('custom-goodie-info-modal');
    if (!modal || (!force && (!event || event.target !== modal))) return;
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      modal.style.display = 'none';
      releaseScrollLockIfIdle();
    }, 260);
  }

  function openCreditsDialog(name) { const goodie = GOODIES.find(item => item.name === name); if (!goodie || !goodie.credits) return; const c = goodie.credits, modal = $('custom-credits-modal'); $('credits-modal-body-content').innerHTML = `<div class="mb-3"><h5 class="fw-bold mb-1">${c.title}</h5><p class="text-muted small mb-0">${c.description}</p></div><div class="list-group list-group-flush rounded border"><div class="list-group-item">Author: <a href="https://github.com/${c.github_user}" target="_blank" rel="noopener noreferrer">${c.author} (@${c.github_user})</a></div><div class="list-group-item">Repository: <a href="${c.repo_url}" target="_blank" rel="noopener noreferrer">${c.repo_url}</a></div><div class="list-group-item">License: <a href="${c.license_url}" target="_blank" rel="noopener noreferrer">${c.license}</a></div></div>`; modal.classList.remove('closing'); modal.style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active'))); document.body.style.overflow = 'hidden'; }
  function closeCreditsDialog(event, force) { const modal = $('custom-credits-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none'; releaseScrollLockIfIdle(); }, 260); }
  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target && event.target.tagName || '')) return;
    if (event.key !== 'Escape') return;
    if ($('custom-goodie-info-modal').classList.contains('active')) closeInfoDialog(null, true); else if ($('custom-credits-modal').classList.contains('active')) closeCreditsDialog(null, true); else if ($('custom-minigame-modal').classList.contains('active')) closeMinigame(null, true);
  });
  window.openCreditsDialogCurrent = () => currentOpenGoodie && openCreditsDialog(currentOpenGoodie.name);
  window.openCreditsDialog = openCreditsDialog; window.closeCreditsDialog = closeCreditsDialog; window.openInfoDialog = openInfoDialog; window.closeInfoDialog = closeInfoDialog; window.closeMinigame = closeMinigame; window.hideModalLoader = hideModalLoader;
  setupCollection();
  setupViewToggle();
  setupFilterScroll();
})();
