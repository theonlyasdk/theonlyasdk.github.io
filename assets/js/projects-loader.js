const projects_list_container = document.getElementById("projects-list");
const filter_by_tag_container = document.getElementById("filter-by-tag");
const searchBox = document.querySelector('.projects-search-box');
let logger = new Logger("LibASDK Projects Loader");
let current_filter_tag = "";
let projects_data_url = "/assets/data/projects.json";

document.addEventListener('mousemove', (e) => {
  if (!searchBox) return;
  const rect = searchBox.getBoundingClientRect();
  searchBox.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
  searchBox.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
});

if (!projects_list_container) {
  logger.error("Fatal error: Unable to find projects list container!");
}

const create_load_error_html = (msg) => `
  <div class="error-loading-projects">
      <i class="bi bi-exclamation-circle-fill" style="font-size: 5em;"></i>
    <h1>Oops! Couldn't load projects</h1>
    <p>Sorry, the project showcase did not load properly.<br>
      This could be due to a network issue or a problem with the server.<br>
      Please <a href="#" onclick="location.reload()" title="Click here to refresh the page">refresh the page</a>, or come back later.
    </p>
    <details style="margin-top:1em;">
      <summary style="cursor:pointer;">Show technical details</summary>
      <pre class="error-message" style="padding:0.5em;border-radius:4px;"><code>${msg}</code></pre>
    </details>
    <p style="margin-top:1em;">
      If this keeps happening, please <a href="https://github.com/theonlyasdk/theonlyasdk.github.io/issues" target="_blank" rel="noopener">report the issue on GitHub</a>.
    </p>
  </div>
`;

function try_load_projects() {
  fetch(projects_data_url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((json) => render_projects(json))
    .catch((error) => {
      logger.error(`Couldn't fetch ${projects_data_url}: ${error}`);
      render_projects(null);
    });
}

function render_projects(projects_list) {
  if (!projects_list) {
    projects_list_container.innerHTML = create_load_error_html("ERR_NULL_LIST");
    logger.error("Rendering failed: projects_list is null");
    return;
  }

  /* Since the projects list has the last item as the most recent item, we need
     to reverse the list so our CSS fade in animation works properly. */
  projects_list.reverse();

  (async function render_each_item() {
    let i = 0;
    for (let element of projects_list) {
      i++;
      let name = element['name'];
      let description = element['description'];
      let url = element['url'];
      let tags = element['tags'].split(",");
      let demo_url = ('demo_url' in element) ? element['demo_url'] : "";
      let should_show_demo_btn = ('demo_url' in element);

      if (!name || !description || !url || !tags) {
        logger.warn(`Skipping project due to missing fields: ${JSON.stringify(element)}`);
        continue;
      }

      /* The wrapper is the flat pointer-tracking surface and owns the entry
         animation; the inner card owns the tilt. Keeping them on separate
         elements means the two transforms never collide. */
      const projectCard = document.createElement('div');
      projectCard.classList.add('project-card', 'fade-in', 't-tilt-card');

      let tag_elements = tags.map(tag =>
        `<a href="#${tag}" onclick="filter_by_tag('${tag}')" class="category project-tag">${tag}</a>`
      ).join('');

      let btn_demo = should_show_demo_btn
        ? `<a href="${demo_url}" target="_blank" class="button demo-button" title="Click to see a demo of this project (usually a web app)">Demo</a>`
        : "";

      projectCard.innerHTML = `
      <div class="project-card-body">
        <h1 class="project-card-title"><a href="${url}">${name}</a></h1>
        <p class="project-card-content">${description}</p>
      </div>
      <div class="project-card-bottom">
        <div class="project-card-tags categories">
          <i class="fa-solid fa-tag category project-tag project-tag-icon" title="Project tags"></i>
          ${tag_elements}
        </div>
        ${btn_demo}
      </div>
      <div class="t-tilt-glare" aria-hidden="true"></div>
    `;

      const projectCardWrap = document.createElement('div');
      projectCardWrap.classList.add('project-card-wrap', 't-tilt', 'fade-in');
      projectCardWrap.style.setProperty('--anim-delay', `${i * 0.1}s`);
      projectCardWrap.append(projectCard);

      projects_list_container.append(projectCardWrap);
      setup_project_card_tilt(projectCardWrap, projectCard);
    }

    const no_results = document.createElement('div');
    no_results.id = 'projects-no-results';
    no_results.className = 'projects-no-results d-none';
    no_results.style.display = 'none';
    no_results.innerHTML = `
      <i class="fa-solid fa-magnifying-glass"></i>
      <p>No results found</p>
    `;
    projects_list_container.append(no_results);
  })();

  const loadingIndicator = document.querySelector(".projects-loading");
  if (loadingIndicator) {
    loadingIndicator.remove();
  }

  const project_search_box = document.querySelector("#projects-search-box");
  const clear_btn = document.querySelector("#projects-search-clear");

  const update_clear_btn = () => {
    if (!clear_btn || !project_search_box) return;
    if (project_search_box.value.length > 0) {
      clear_btn.classList.remove('is-dissolving');
      clear_btn.classList.add('is-visible');
    } else {
      clear_btn.classList.remove('is-visible');
    }
  };

  const handle_search_clear = () => {
    if (!project_search_box) return;
    if (clear_btn) {
      clear_btn.classList.add('is-dissolving');
      clear_btn.classList.remove('is-visible');
    }
    project_search_box.value = '';
    filter_by_value_fuzzy('');
    project_search_box.focus();
  };

  if (clear_btn) {
    clear_btn.onclick = (e) => {
      e.preventDefault();
      handle_search_clear();
    };
  }

  const search_box_filter_event = () => {
    if (project_search_box) {
      filter_by_value_fuzzy(project_search_box.value);
    }
    update_clear_btn();
  };

  if (project_search_box) {
    project_search_box.oninput = search_box_filter_event;
    project_search_box.onchange = search_box_filter_event;
    project_search_box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        handle_search_clear();
        project_search_box.blur();
      }
    });
    update_clear_btn();
  }
}

/* Card hover tilt (transitions.dev pattern).
 *
 * The pointer is tracked on the outer `.t-tilt` wrapper, which never
 * transforms. The previous version tracked and rotated the card itself, so its
 * own edges rotated out from under the cursor near the borders and the hover
 * flickered on and off. The inner card only ever receives custom properties -
 * no inline transform - so the CSS owns the motion and the entry animation
 * cannot fight it.
 */
const TILT_MAX = 5; // peak tilt in degrees at the card edges - subtle lean only
const TILT_PROX_RADIUS = 320; // px from a card edge where the lean starts
const TILT_PROX_STRENGTH = 0.7; // far lean is 70% of the edge peak

/* Every tilt card registers here; one window-level pointer loop drives them
   all so cards lean in as the cursor approaches, not just while hovered. */
const tiltRegistry = [];
let tiltPointer = null;
let tiltRaf = 0;
let tiltGlobalInstalled = false;

function tiltReset(entry) {
  entry.wrap.classList.remove('is-hover');
  entry.wrap.classList.remove('is-near');
  entry.card.classList.remove('is-tilting');
  entry.card.style.setProperty('--tilt-rx', '0deg');
  entry.card.style.setProperty('--tilt-ry', '0deg');
  entry.card.style.removeProperty('--tilt-shadow');
  if (entry.glare) entry.glare.style.opacity = '';
}

/* Shadow follows the cursor like a light source: the closer the pointer, the
   deeper the shadow, offset away from it. ux/uy is the unit vector from the
   card centre toward the pointer, influence is 0..1. */
function tiltShadow(card, ux, uy, influence) {
  const x = (-ux * influence * 10).toFixed(1);
  const y = (influence * 18).toFixed(1);
  const blur = Math.round(12 + influence * 24);
  const alpha = (0.15 + influence * 0.35).toFixed(2);
  card.style.setProperty(
    '--tilt-shadow',
    `${x}px ${y}px ${blur}px -12px rgba(0, 0, 0, ${alpha})`
  );
}

function tiltUpdateAll() {
  tiltRaf = 0;
  if (!tiltPointer) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const px0 = tiltPointer.x;
  const py0 = tiltPointer.y;
  const isMouse = tiltPointer.type === 'mouse' || !tiltPointer.type;
  for (let i = tiltRegistry.length - 1; i >= 0; i--) {
    const entry = tiltRegistry[i];
    if (!entry.wrap.isConnected) {
      tiltRegistry.splice(i, 1);
      continue;
    }
    if (reduce) {
      tiltReset(entry);
      continue;
    }
    const r = entry.wrap.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const inside =
      px0 >= r.left && px0 <= r.right && py0 >= r.top && py0 <= r.bottom;
    if (inside) {
      const px = (px0 - r.left) / r.width;
      const py = (py0 - r.top) / r.height;
      entry.wrap.classList.add('is-hover');
      entry.wrap.classList.remove('is-near');
      entry.card.classList.add('is-tilting');
      entry.card.style.setProperty('--tilt-ry', ((px - 0.5) * TILT_MAX).toFixed(2) + 'deg');
      entry.card.style.setProperty('--tilt-rx', ((0.5 - py) * TILT_MAX).toFixed(2) + 'deg');
      entry.card.style.setProperty('--tilt-gx', (px * 100).toFixed(1) + '%');
      entry.card.style.setProperty('--tilt-gy', (py * 100).toFixed(1) + '%');
      /* Let the hover CSS own the glare opacity. */
      if (entry.glare) entry.glare.style.opacity = '';
      const cx0 = r.left + r.width / 2;
      const cy0 = r.top + r.height / 2;
      const ilen = Math.hypot(px0 - cx0, py0 - cy0) || 1;
      tiltShadow(entry.card, (px0 - cx0) / ilen, (py0 - cy0) / ilen, 1);
      continue;
    }
    /* Outside the card: lean toward the cursor with distance falloff. */
    if (!isMouse) {
      tiltReset(entry);
      continue;
    }
    const dx = Math.max(r.left - px0, 0, px0 - r.right);
    const dy = Math.max(r.top - py0, 0, py0 - r.bottom);
    const d = Math.hypot(dx, dy);
    if (d >= TILT_PROX_RADIUS) {
      tiltReset(entry);
      continue;
    }
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const vx = px0 - cx;
    const vy = py0 - cy;
    const len = Math.hypot(vx, vy) || 1;
    const influence = Math.pow(1 - d / TILT_PROX_RADIUS, 1.5);
    const mag = influence * TILT_MAX * TILT_PROX_STRENGTH;
    entry.wrap.classList.remove('is-hover');
    entry.wrap.classList.add('is-near');
    entry.card.classList.add('is-tilting');
    entry.card.style.setProperty('--tilt-ry', ((vx / len) * mag).toFixed(2) + 'deg');
    entry.card.style.setProperty('--tilt-rx', ((-(vy / len)) * mag).toFixed(2) + 'deg');
    tiltShadow(entry.card, vx / len, vy / len, influence);
    /* Unclamped on purpose: the gradient centre tracks the real cursor, even
       past the card edge, so one continuous light sweeps the whole stack
       instead of each card snapping its own hotspot to its border. Opacity
       ramps with distance for the same reason - no pop at the radius edge. */
    entry.card.style.setProperty('--tilt-gx', (((px0 - r.left) / r.width) * 100).toFixed(1) + '%');
    entry.card.style.setProperty('--tilt-gy', (((py0 - r.top) / r.height) * 100).toFixed(1) + '%');
    if (entry.glare) entry.glare.style.opacity = (influence * 0.5).toFixed(2);
  }
}

function tiltSchedule() {
  if (!tiltRaf) tiltRaf = requestAnimationFrame(tiltUpdateAll);
}

function tiltInstallGlobal() {
  if (tiltGlobalInstalled) return;
  tiltGlobalInstalled = true;
  window.addEventListener(
    'pointermove',
    (e) => {
      tiltPointer = { x: e.clientX, y: e.clientY, type: e.pointerType };
      tiltSchedule();
    },
    { passive: true }
  );
  window.addEventListener(
    'scroll',
    () => {
      if (tiltPointer) tiltSchedule();
    },
    { passive: true, capture: true }
  );
  document.addEventListener('pointerleave', () => {
    tiltPointer = null;
    tiltRegistry.forEach(tiltReset);
  });
  window.addEventListener('blur', () => {
    tiltPointer = null;
    tiltRegistry.forEach(tiltReset);
  });
}

function setup_project_card_tilt(wrap, card) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  /* The wrap carries the entry animation (slideIn, fill forwards). A filled
     animation keeps overriding the `transform` property forever, which would
     pin the tilt flat - so clear it the moment the entry finishes.
     `animationcancel` matters too: setting animation:none mid-flight (as the
     layout morph does) cancels rather than ends it, so without this the
     settle would never run. */
const settleWrap = () => {
    wrap.style.animation = 'none';
    wrap.style.opacity = '1';
  };
  wrap.addEventListener('animationend', settleWrap, { once: true });
  wrap.addEventListener('animationcancel', settleWrap, { once: true });
  tiltRegistry.push({ wrap: wrap, card: card, glare: wrap.querySelector('.t-tilt-glare') });
  tiltInstallGlobal();

  wrap.addEventListener('pointerdown', (e) => {
    /* Touch and pen: capture so a drag keeps targeting the card even if the
       finger drifts past its edge. */
    if (e.pointerType !== 'mouse') {
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch (err) {
        /* capture is best-effort */
      }
    }
  });

  wrap.addEventListener('pointerup', () => {
    const entry = tiltRegistry.find((t) => t.wrap === wrap);
    if (entry) tiltReset(entry);
    tiltSchedule();
  });
  wrap.addEventListener('pointercancel', () => {
    const entry = tiltRegistry.find((t) => t.wrap === wrap);
    if (entry) tiltReset(entry);
    tiltSchedule();
  });
  wrap.addEventListener('pointerleave', () => {
    /* No direct reset: the global loop re-ranks this card as near or far from
       the last known pointer, so leaving eases into a slight lean instead of
       snapping flat. */
    tiltSchedule();
  });
}

/* Projects filter transitions - ported from assets/js/collection-grid.js (the
 * goodies grid): FLIP for cards that stay visible, a fading ghost where a card
 * used to be, and a scale+fade entrance for cards that come back.
 *
 * Every filter funnels through apply_projects_visibility() so all three entry
 * points (search, tag, demo) animate identically.
 */
const projects_seen_visible = new Set();
let projects_filter_seeded = false;

function apply_projects_visibility(predicate) {
  const container = document.getElementById('projects-list');
  if (!container) return;
  const wraps = Array.from(container.querySelectorAll('.project-card-wrap'));

  /* The entry animation is fill:forwards, so its transform would pin every
     card in place and fight the FLIP below. Kill it up front. */
  wraps.forEach(w => {
    w.style.animation = 'none';
    w.style.opacity = '1';
  });

  /* Seed from what is on screen now, so the first real filter animates cards
     out (rather than popping every card in) instead of replaying the entrance. */
  if (!projects_filter_seeded) {
    wraps.forEach(w => {
      if (!w.classList.contains('d-none')) projects_seen_visible.add(w);
    });
    projects_filter_seeded = true;
  }

  const nextVisible = new Set(wraps.filter(predicate));

  /* Same set as last time: bail out. Otherwise every keystroke in the search
     box would re-animate the whole stack. */
  if (
    nextVisible.size === projects_seen_visible.size &&
    wraps.every(w => nextVisible.has(w) === projects_seen_visible.has(w))
  ) {
    return;
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* FIRST: where everything currently sits. */
  const firstRects = new Map();
  if (!reduce) {
    wraps.forEach(w => {
      if (projects_seen_visible.has(w)) firstRects.set(w, w.getBoundingClientRect());
    });
  }

  container.style.position = 'relative';
  wraps.forEach(w => w.classList.toggle('d-none', !nextVisible.has(w)));
  check_no_results();

  projects_seen_visible.clear();
  nextVisible.forEach(w => projects_seen_visible.add(w));

  if (reduce) return;

  const DUR = '250ms';
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

  wraps.forEach(w => {
    const wasVisible = firstRects.has(w);
    const isVisible = nextVisible.has(w);

    if (wasVisible && !isVisible) {
      /* Ghost: a frozen copy at the old spot that fades out, so the card
         doesn't simply blink out of existence. */
      const rect = firstRects.get(w);
      const ghost = w.cloneNode(true);
      ghost.style.position = 'absolute';
      ghost.style.margin = '0';
      ghost.style.left = rect.left + window.scrollX + 'px';
      ghost.style.top = rect.top + window.scrollY + 'px';
      ghost.style.width = rect.width + 'px';
      ghost.style.height = rect.height + 'px';
      ghost.style.pointerEvents = 'none';
      ghost.style.zIndex = '100';
      ghost.style.animation = 'none';
      ghost.style.transition = `opacity ${DUR} ${EASE}`;
      document.body.appendChild(ghost);
      void ghost.offsetWidth;
      requestAnimationFrame(() => {
        ghost.style.opacity = '0';
      });
      setTimeout(() => {
        if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
      }, 300);
      return;
    }

    if (isVisible && !wasVisible) {
      /* Entering: pop in slightly undersized. */
      w.style.transition = 'none';
      w.style.transform = 'scale(0.97)';
      w.style.opacity = '0';
      requestAnimationFrame(() => {
        w.style.transition = `opacity ${DUR} ${EASE}, transform ${DUR} ${EASE}`;
        w.style.opacity = '1';
        w.style.transform = 'scale(1)';
      });
      setTimeout(() => {
        w.style.transition = '';
        w.style.transform = '';
      }, 300);
      return;
    }

    if (!isVisible || !wasVisible) return;

    /* Stayed visible: FLIP - invert onto the old position, then play to the new. */
    const first = firstRects.get(w);
    const last = w.getBoundingClientRect();
    const dx = first.left - last.left;
    const dy = first.top - last.top;
    if (!dx && !dy) return;
    w.style.transition = 'none';
    w.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(() => {
      w.style.transition = `transform ${DUR} ${EASE}`;
      w.style.transform = 'translate(0, 0)';
      setTimeout(() => {
        w.style.transition = '';
        w.style.transform = '';
      }, 400);
    });
  });
}

/* Grid <-> list morph.
 *
 * A real FLIP (translate only) is wrong here: a grid cell is ~270px wide and a
 * list row ~1144px, so the cards also have to RESIZE. Scaling instead would
 * stretch the text, so this animates each card's actual width and height
 * alongside its position - the text reflows naturally and the card genuinely
 * morphs from one box into the other.
 *
 * Note we kill the entry animation up front. That animation is
 * `slideIn ... forwards`, and it is the fill:forwards that holds opacity at 1;
 * once it is gone the wrapper falls back to the stylesheet's `opacity: 0`, so
 * every card must carry an explicit inline opacity from here on.
 */
/* Pending cleanup for the morph below. Held at module scope so an interrupted
   run can be cancelled - otherwise its timer fires mid-way through the next
   run and wipes the live animation's inline width/height/transform. */
let projects_morph_timer = 0;

function animate_projects_layout_change(applyChange) {
  const container = document.getElementById('projects-list');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wraps = container
    ? Array.from(container.querySelectorAll('.project-card-wrap')).filter(
        w => !w.classList.contains('d-none')
      )
    : [];

  /* Drop any previous run's pending cleanup before touching the DOM. */
  if (projects_morph_timer) {
    clearTimeout(projects_morph_timer);
    projects_morph_timer = 0;
  }

  if (reduce || !wraps.length) {
    applyChange();
    return;
  }

  /* FIRST: the box each card occupies right now.
     getBoundingClientRect() includes transforms and interpolated width, so if
     a morph is already in flight this captures where the card currently LOOKS
     - which is what makes interrupting seamless instead of a jump. Measure
     before cancelling, since cancelling snaps the card to its end state.
     Measure every card before cancelling any: cancelling one card's width
     transition resizes its grid row, which shifts every card below it. */
  const firsts = new Map();
  wraps.forEach(w => {
    w.style.animation = 'none';
    w.style.opacity = '1';
    const r = w.getBoundingClientRect();
    firsts.set(w, { x: r.left, y: r.top, w: r.width, h: r.height });
  });

  /* Cancel the in-flight transitions AND drop the inline geometry they were
     driving. This second step is what makes an interrupted morph keep its
     width animation: without it the cards still carry the previous run's
     width/height when the layout flips, so the destination measurement below
     reads that stale value instead of the new layout's natural box - and the
     morph then animates toward the size it was already leaving.
     Nothing paints between here and the invert below, so the cards stay
     visually pinned at their captured boxes throughout. */
  wraps.forEach(w => {
    if (w.getAnimations) w.getAnimations().forEach(a => a.cancel());
    w.style.transition = '';
    w.style.width = '';
    w.style.height = '';
    w.style.transform = '';
  });

  applyChange();

  /* Destination boxes, now measured against the real new layout. */
  const targets = new Map();
  wraps.forEach(w => {
    const r = w.getBoundingClientRect();
    targets.set(w, { x: r.left, y: r.top, w: r.width, h: r.height });
  });

  const DUR = 420;
  const EASE = 'cubic-bezier(0.32, 0.9, 0.24, 1)';
  const STAGGER = 14;
  const staggerFor = i => (i % 12) * STAGGER;

  /* INVERT: pin every card to its old box. Explicit heights resize the grid
     rows, which moves the cards again - so translate is applied in a second
     pass, once the browser has actually laid the pinned boxes out. */
  wraps.forEach(w => {
    const f = firsts.get(w);
    w.style.transition = 'none';
    w.style.width = f.w + 'px';
    w.style.height = f.h + 'px';
  });
  void container.offsetWidth;
  wraps.forEach(w => {
    const f = firsts.get(w);
    const r = w.getBoundingClientRect();
    w.style.transform = `translate(${f.x - r.left}px, ${f.y - r.top}px)`;
  });
  void container.offsetWidth;

  /* PLAY: animate box + position to the destination, staggered by index. */
  wraps.forEach((w, i) => {
    const t = targets.get(w);
    const delay = staggerFor(i);
    w.style.transition =
      `width ${DUR}ms ${EASE} ${delay}ms, ` +
      `height ${DUR}ms ${EASE} ${delay}ms, ` +
      `transform ${DUR}ms ${EASE} ${delay}ms`;
    w.style.width = t.w + 'px';
    w.style.height = t.h + 'px';
    w.style.transform = 'translate(0, 0)';
  });

  projects_morph_timer = setTimeout(() => {
    projects_morph_timer = 0;
    wraps.forEach(w => {
      /* Only clean up if this run is still the live one. A newer run would
         have replaced the timer id, and cancelling it is what keeps the two
         from fighting over the same inline styles. */
      w.style.transition = '';
      w.style.transform = '';
      w.style.width = '';
      w.style.height = '';
      /* Stay at opacity 1 explicitly - the entry animation that used to
         guarantee this is gone (see the note above). */
      w.style.opacity = '1';
    });
  }, DUR + STAGGER * 11 + 80);
}

function check_no_results() {
  const no_results = document.getElementById('projects-no-results');
  if (!no_results) return;

  /* Query the wrapper, not the card: the wrapper is the grid/flex child, so it
     is what has to be hidden. Hiding only the card would leave an empty gap. */
  const projects = document.querySelectorAll('#projects-list .project-card-wrap');
  let has_visible = false;
  projects.forEach(task => {
    if (!task.classList.contains('d-none')) {
      has_visible = true;
    }
  });

  if (!has_visible && projects.length > 0) {
    no_results.classList.remove('d-none');
    no_results.style.display = 'flex';
  } else {
    no_results.classList.add('d-none');
    no_results.style.display = 'none';
  }
}

function filter_by_value_fuzzy(filter_val) {
  const fuzzify = (text) => text.toLowerCase().replace(/\s+/g, "");
  const query = fuzzify(filter_val);
  apply_projects_visibility(wrap => {
    const titleEl = wrap.querySelector('.project-card-title a');
    const title = titleEl ? fuzzify(titleEl.innerText) : "";
    return title.includes(query);
  });
}

function set_filter_tag_text_and_visibility(visible, tag_name) {
  if (!filter_by_tag_container) return;
  let elem_filter_text = filter_by_tag_container.querySelector("span");

  if (visible) {
    filter_by_tag_container.classList.remove('d-none');
    filter_by_tag_container.classList.add('active-tag');
    if (elem_filter_text) elem_filter_text.innerHTML = tag_name;
  } else {
    filter_by_tag_container.classList.remove('active-tag');
    filter_by_tag_container.classList.add('d-none');
    if (elem_filter_text) elem_filter_text.innerHTML = '';
  }
}

function filter_by_tag(tag_name) {
  const wrapper = document.querySelector('#projects-filter-wrapper');
  if (wrapper && !wrapper.classList.contains('is-open')) {
    toggle_projects_filter();
  }

  set_filter_tag_text_and_visibility(tag_name !== '', tag_name);

  /* Keep the All / Has demo toggle honest: a tag filter is neither of them. */
  if (window.set_projects_filter_tab) {
    window.set_projects_filter_tab(tag_name === '' ? 'all' : null);
  }

  apply_projects_visibility(wrap => {
    const tagsEl = wrap.querySelector('.project-card-tags');
    const tags = tagsEl ? tagsEl.innerText : "";
    return tags.includes(tag_name);
  });

  if (tag_name === '') {
    window_scroll_to_top();
  }
}

function filter_by_demo() {
  set_filter_tag_text_and_visibility(false, '');
  if (window.set_projects_filter_tab) window.set_projects_filter_tab('demo');
  apply_projects_visibility(wrap => !!wrap.querySelector('.demo-button'));
}

function window_scroll_to_top() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

function toggle_projects_filter() {
  const wrapper = document.querySelector('#projects-filter-wrapper');
  const filterBtn = document.querySelector('.btn-search-filter');
  if (wrapper) {
    const isOpen = wrapper.classList.toggle('is-open');
    if (filterBtn) {
      filterBtn.classList.toggle('active', isOpen);
      filterBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }
}

function setup_projects_view_toggle() {
  /* Scoped to .layout-toggle, not .view-toggle: the All / Has demo filter is also
     a .view-toggle and lives in this same bar, so the looser selector would only
     work by virtue of DOM order. */
const bar = document.querySelector('.projects-top-bar .layout-toggle');
  const container = document.getElementById('projects-list');
  if (!bar || !container) return;

  const pill = bar.querySelector('.t-tabs-pill');
  const tabs = Array.from(bar.querySelectorAll('.t-tab'));
  const activeTab = () => tabs.find(t => t.getAttribute('aria-pressed') === 'true') || tabs[0];

  function moveTo(tab, animate) {
    if (!pill || !tab) return;
    if (!animate) {
      const prev = pill.style.transition;
      pill.style.transition = 'none';
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
      void pill.offsetWidth;
      pill.style.transition = prev;
    } else {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    }
  }

  function applyView(view) {
    const isList = view === 'list';
    /* Already showing this view: re-running the morph would pin every card,
       animate it to the box it is already in, and cancel any morph the user
       had just interrupted. Do nothing instead. */
    if (container.classList.contains('list-view') === isList) {
      return;
    }
    animate_projects_layout_change(() => {
      container.classList.toggle('list-view', isList);
      container.classList.toggle('grid-view', !isList);
    });
    try {
      localStorage.setItem('projects-view', view);
    } catch (e) {
      /* ignore storage quota/security errors */
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.setAttribute('aria-pressed', t === tab ? 'true' : 'false'));
      moveTo(tab, true);
      applyView(tab.dataset.view);
    });
  });

  bar.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const current = activeTab();
    const idx = tabs.indexOf(current);
    const nextIdx = (idx + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIdx];
    nextTab.focus();
    nextTab.click();
    event.preventDefault();
  });

  let savedView = null;
  try {
    savedView = localStorage.getItem('projects-view');
  } catch (e) {}

  const initialTab = tabs.find(t => t.dataset.view === savedView) || tabs[0];
  tabs.forEach(t => t.setAttribute('aria-pressed', t === initialTab ? 'true' : 'false'));
  applyView(initialTab.dataset.view);

  requestAnimationFrame(() => moveTo(initialTab, false));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => moveTo(activeTab(), false));
  }
  window.addEventListener('resize', () => moveTo(activeTab(), false));
}

/* All / Has demo segmented toggle. Motion comes from the shared RubberSegment
   engine (assets/js/rubber-segment.js); this function only routes selection to
   the matching filter and mirrors state back into aria-pressed. */
function setup_projects_filter_toggle() {
  const bar = document.querySelector('.filter-toggle');
  if (!bar || !window.RubberSegment) return;

  const pill = bar.querySelector('.t-tabs-pill');
  const tabs = Array.from(bar.querySelectorAll('.t-tab'));

  const segment = window.RubberSegment.create({
    track: bar,
    pill: pill,
    items: tabs,
    inset: 3,
    stretch: 100,
    squash: 3,
    speed: 1,
    glide: 75,
    draggable: true,
    onChange: index => {
      if (index === 1) {
        filter_by_demo();
      } else if (index === 0) {
        filter_by_tag('');
      }
    }
  });

  /* Reflect filter state in the toggle. `null` presses neither tab, which is
     what a tag filter needs - otherwise "All" would stay lit while a tag was
     actually filtering, which reads as a lie. */
  window.set_projects_filter_tab = function (name) {
    if (!name) {
      tabs.forEach(t => t.setAttribute('aria-pressed', 'false'));
      if (pill) pill.style.opacity = '0';
      return;
    }
    const index = name === 'demo' ? 1 : 0;
    tabs.forEach((t, i) => t.setAttribute('aria-pressed', i === index ? 'true' : 'false'));
    if (pill) pill.style.opacity = '1';
    segment.animateTo(index);
  };
}

try {
  try_load_projects();
  set_filter_tag_text_and_visibility(false, '');
  setup_projects_view_toggle();
  setup_projects_filter_toggle();
} catch (err) {
  projects_list_container.innerHTML = create_load_error_html('An error happened while trying to load projects: ' + err);
}