(function () {
  'use strict';

  const data = document.getElementById('goodies-data');
  const GOODIES = data ? JSON.parse(data.textContent) : [];
  const siteUrl = window.siteUrl || (path => path);
  let currentOpenGoodie = null;
  let currentList = GOODIES;

  const $ = id => document.getElementById(id);
  const spinner = `<svg class="goodie-spinner" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid" width="60" height="60" style="shape-rendering: auto; display: block; background: transparent; color: var(--text-color);"><g><g transform="rotate(0 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.9166666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(30 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.8333333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(60 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.75s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(90 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.6666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(120 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5833333333333334s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(150 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.5s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(180 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.4166666666666667s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(210 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.3333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(240 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.25s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(270 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.16666666666666666s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(300 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" keyTimes="0;1" dur="1s" begin="-0.08333333333333333s" repeatCount="indefinite"></animate></rect></g><g transform="rotate(330 50 50)"><rect x="49" y="24" rx="1" ry="1" width="2" height="12" fill="currentColor"><animate attributeName="opacity" values="1;0" dur="1s" begin="0s" repeatCount="indefinite"></animate></rect></g></g></svg>`;

  function imageFallback(image) {
    image.hidden = true;
    const fallback = document.createElement('div');
    fallback.className = 'goodie-image-fallback';
    fallback.textContent = 'Preview unavailable. The goodie is still available.';
    image.parentElement.appendChild(fallback);
  }

  function renderGoodies(category) {
    const grid = $('goodies-grid');
    grid.replaceChildren();
    currentList = GOODIES.filter(item => !category || item.category === category);
    currentList.forEach((goodie, index) => {
      const col = document.createElement('div'); col.className = 'col d-flex flex-column';
      const card = document.createElement('div'); card.className = 'goodie-card'; card.tabIndex = 0; card.setAttribute('role', 'button'); card.style.setProperty('--anim-delay', `${((index + 1) * .1).toFixed(1)}s`);
      card.addEventListener('click', () => openMinigame(goodie.name));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') openMinigame(goodie.name); });
      const cover = document.createElement('div'); cover.className = 'card-cover';
      const image = document.createElement('img'); image.src = siteUrl(goodie.image); image.alt = goodie.name; image.loading = 'lazy'; image.addEventListener('error', () => imageFallback(image), { once: true }); cover.appendChild(image);
      if (goodie.credits) { const info = document.createElement('button'); info.type = 'button'; info.className = 'goodie-info-btn'; info.title = 'View credits & license'; info.setAttribute('aria-label', 'View credits and license'); info.innerHTML = '<svg class="goodie-info-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path d="M0 0h1024v1024H0z" fill="none" /><path fill="currentColor" d="M448 224a64 64 0 1 0 128 0a64 64 0 1 0-128 0m96 168h-64c-4.4 0-8 3.6-8 8v464c0 4.4 3.6 8 8 8h64c4.4 0 8-3.6 8-8V400c0-4.4-3.6-8-8-8" /></svg><span class="goodie-info-text">Credits</span>'; info.addEventListener('click', event => { event.stopPropagation(); openCreditsDialog(goodie.name); }); cover.appendChild(info); }
      const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = goodie.name;
      const description = document.createElement('p'); description.className = 'text-muted small'; description.textContent = goodie.description;
      card.append(cover, title, description); col.appendChild(card); grid.appendChild(col);
    });
  }

  function setupFilters() {
    const filter = $('goodie-filter');
    ['All', ...new Set(GOODIES.map(item => item.category))].forEach(category => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-search-filter goodie-filter-btn'; button.textContent = category; button.setAttribute('aria-pressed', category === 'All' ? 'true' : 'false');
      if (category === 'All') button.classList.add('active');
      button.addEventListener('click', () => { filter.querySelectorAll('button').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); }); renderGoodies(category === 'All' ? '' : category); });
      filter.appendChild(button);
    });
    renderGoodies('');
  }

  // Removing (not just hiding) the loader: Bootstrap's `.d-flex`
  // (display:flex !important) overrides the UA `[hidden]` rule, so
  // `loader.hidden = true` would leave the spinner visible forever.
  function hideModalLoader() {
    const loader = $('modal-iframe-loader');
    if (loader) loader.remove();
  }

  function playNavRipple(layer, rect, x, y) {
    const dot = document.createElement('div');
    dot.className = 'goodie-ripple';
    const size = 48;
    dot.style.width = size + 'px';
    dot.style.height = size + 'px';
    dot.style.left = x + 'px';
    dot.style.top = y + 'px';
    layer.appendChild(dot);
    const maxDist = Math.max(
      Math.hypot(x, y),
      Math.hypot(x - rect.width, y),
      Math.hypot(x, y - rect.height),
      Math.hypot(x - rect.width, y - rect.height)
    );
    const target = (maxDist / (size / 2)) + 0.2;
    const anim = dot.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.55 },
        { transform: 'translate(-50%, -50%) scale(' + target + ')', opacity: 0 }
      ],
      { duration: 650, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
    );
    anim.onfinish = () => dot.remove();
  }

  function navGoodie(dir, x, y) {
    edgeSuppress = true;
    const list = currentList.length ? currentList : GOODIES;
    if (!list.length) return;
    const origin = currentOpenGoodie ? currentOpenGoodie.name : null;
    let idx = list.findIndex(item => origin && item.name === origin);
    if (idx < 0) idx = dir > 0 ? -1 : 0;
    const target = list[(idx + dir + list.length) % list.length];
    const layer = $('goodie-ripple-layer');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (layer && !reduce) {
      const rect = layer.parentElement.getBoundingClientRect();
      playNavRipple(layer, rect, x == null ? (dir > 0 ? rect.width - 28 : 28) : x, y == null ? rect.height / 2 : y);
    }
    setTimeout(() => { if (currentOpenGoodie && currentOpenGoodie.name === origin) openMinigame(target.name); }, reduce ? 0 : 220);
  }

  function openMinigame(name) {
    const goodie = GOODIES.find(item => item.name === name); if (!goodie) return;
    if (modalContentEl) modalContentEl.classList.remove('has-xframe');
    hideEdges();
    currentOpenGoodie = goodie; updateEdgeTitles(); const modal = $('custom-minigame-modal'); const body = $('modal-body-content'); const title = $('custom-modal-title'); const demoLink = $('custom-modal-demo-link');
    title.textContent = goodie.name; demoLink.hidden = !goodie.iframe_url;
    if (goodie.iframe_url) { demoLink.href = siteUrl(goodie.iframe_url); body.className = 'modal-placeholder position-relative'; body.style.cssText = 'width:100%;height:100%;'; body.innerHTML = `<div id="modal-iframe-loader" class="d-flex flex-column align-items-center justify-content-center w-100 h-100 position-absolute top-0 start-0" role="status">${spinner}<span class="text-muted small mt-2">Loading demo...</span></div><iframe class="modal-iframe" src="${siteUrl(goodie.iframe_url)}" title="${goodie.name}" allow="fullscreen" onload="this.style.opacity='1'; if (window.hideModalLoader) window.hideModalLoader();" style="opacity:0;transition:opacity .3s ease;position:relative;z-index:2"></iframe>`; const iframe = body.querySelector('iframe'); setTimeout(() => { if (currentOpenGoodie !== goodie || !$('modal-iframe-loader')) return; hideModalLoader(); iframe.style.opacity = '1'; console.warn('Goodie demo is taking unusually long to load: ' + goodie.name); }, 20000);     iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) throw new Error('unavailable');
        doc.addEventListener('pointermove', evt => { const r = iframe.getBoundingClientRect(); trackEdge(r.left + evt.clientX, r.top + evt.clientY); });
        doc.addEventListener('pointerleave', hideEdges);
      } catch (err) { if (modalContentEl) modalContentEl.classList.add('has-xframe'); }
      hideEdges();
    }, { once: true });
    iframe.addEventListener('error', () => { body.innerHTML = `<div class="modal-placeholder"><h2 class="h3">Demo unavailable</h2><p class="text-muted">This demo could not be loaded here.</p><a class="goodie-error-link" href="#goodies">Back to goodies</a></div>`; }, { once: true }); }
    else { body.className = 'modal-placeholder d-flex flex-column align-items-center justify-content-center w-100 h-100'; body.style.cssText = ''; body.innerHTML = `${spinner}<h2 class="h3 mt-3 mb-1 fw-bold">${goodie.name}</h2><p class="text-muted italic small mb-0">Stay tuned, the engine is charging up!</p><a class="goodie-error-link" href="#goodies">Back to goodies</a>`; }
    modal.classList.remove('closing'); modal.style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active'))); document.body.style.overflow = 'hidden';
  }

  function closeMinigame(event, force) { const modal = $('custom-minigame-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none'; $('modal-body-content').replaceChildren(); document.body.style.overflow = ''; currentOpenGoodie = null; }, 260); }
  function openCreditsDialog(name) { const goodie = GOODIES.find(item => item.name === name); if (!goodie || !goodie.credits) return; const c = goodie.credits, modal = $('custom-credits-modal'); $('credits-modal-body-content').innerHTML = `<div class="mb-3"><h5 class="fw-bold mb-1">${c.title}</h5><p class="text-muted small mb-0">${c.description}</p></div><div class="list-group list-group-flush rounded border"><div class="list-group-item">Author: <a href="https://github.com/${c.github_user}" target="_blank" rel="noopener noreferrer">${c.author} (@${c.github_user})</a></div><div class="list-group-item">Repository: <a href="${c.repo_url}" target="_blank" rel="noopener noreferrer">${c.repo_url}</a></div><div class="list-group-item">License: <a href="${c.license_url}" target="_blank" rel="noopener noreferrer">${c.license}</a></div></div>`; modal.classList.remove('closing'); modal.style.display = 'flex'; requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active'))); document.body.style.overflow = 'hidden'; }
  function closeCreditsDialog(event, force) { const modal = $('custom-credits-modal'); if (!force && (!event || event.target !== modal)) return; modal.classList.add('closing'); setTimeout(() => { modal.classList.remove('active', 'closing'); modal.style.display = 'none'; if (!$('custom-minigame-modal').classList.contains('active')) document.body.style.overflow = ''; }, 260); }
  const modalContentEl = document.querySelector('#custom-minigame-modal .custom-modal-content');
  const modalBodyEl = document.querySelector('#custom-minigame-modal .custom-modal-body');
  const edgePrevBtn = $('goodie-edge-prev');
  const edgeNextBtn = $('goodie-edge-next');
  const EDGE_RANGE = 120;
  let edgeSuppress = false;

  function edgeModalActive() {
    return $('custom-minigame-modal').classList.contains('active');
  }

  function setEdge(btn, opacity, y, h, scale) {
    if (!btn) return;
    btn.style.opacity = opacity.toFixed(2);
    btn.classList.toggle('is-visible', opacity > 0.02);
    if (y != null && h != null) paintHump(btn, y, h, scale);
  }

  // Bell-curve bulge (MIUI back-gesture style): the hump swells to its
  // widest at the pointer height and tapers off above and below.
  // `scale` (0..1) grows the hump with pointer proximity to the edge.
  function humpPaths(c, h, scale, mirror) {
    const peak = 36 * scale, sigma = 58 * (0.5 + 0.5 * scale), step = 8, cap = 48, w = 48;
    const raw = y => Math.min(cap, peak * Math.exp(-((y - c) * (y - c)) / (2 * sigma * sigma)));
    // Right edge: flip geometry so the straight edge hugs the dialog edge.
    const x = mirror ? y => w - raw(y) : raw;
    const ex = (mirror ? w : 0).toFixed(1);
    const ys = [];
    for (let y = 0; y < h; y += step) ys.push(y);
    ys.push(h);
    let fill = 'M' + ex + ',0L' + ex + ',' + h.toFixed(1);
    let edge = '';
    for (let i = ys.length - 1; i >= 0; i--) {
      const xx = x(ys[i]).toFixed(1);
      const yy = ys[i].toFixed(1);
      fill += 'L' + xx + ',' + yy;
      edge += (edge ? 'L' : 'M') + xx + ',' + yy;
    }
    return { fill: fill + 'Z', edge };
  }

  function paintHump(btn, c, h, scale) {
    const svg = btn.querySelector('.hump-svg');
    if (!svg) return;
    const p = humpPaths(c, h, scale == null ? 1 : scale, btn.classList.contains('goodie-edge-next'));
    const fill = svg.querySelector('.hump-fill');
    const edge = svg.querySelector('.hump-edge');
    if (fill) fill.setAttribute('d', p.fill);
    if (edge) edge.setAttribute('d', p.edge);
    const wrap = btn.querySelector('.hump-chevron-wrap');
    if (wrap) wrap.style.top = c + 'px';
  }

  function centerHump(btn) {
    if (!modalBodyEl) return;
    const h = modalBodyEl.getBoundingClientRect().height;
    if (h > 0) paintHump(btn, h / 2, h, 1);
  }

  function updateEdgeTitles() {
    if (!edgePrevBtn || !edgeNextBtn) return;
    const list = currentList.length ? currentList : GOODIES;
    if (!list.length) return;
    const idx = list.findIndex(item => currentOpenGoodie && item.name === currentOpenGoodie.name);
    const prev = list[(idx < 0 ? 0 : idx - 1 + list.length) % list.length];
    const next = list[(idx < 0 ? 0 : idx + 1) % list.length];
    edgePrevBtn.title = 'Previous: ' + prev.name;
    edgeNextBtn.title = 'Next: ' + next.name;
  }

  function hideEdges() {
    setEdge(edgePrevBtn, 0);
    setEdge(edgeNextBtn, 0);
  }

  function trackEdge(clientX, clientY) {
    if (!edgeModalActive() || !modalBodyEl) return;
    const rect = modalBodyEl.getBoundingClientRect();
    const dL = clientX - rect.left;
    const dR = rect.right - clientX;
    // Outside the dialog body: reset everything, including the post-click latch.
    if (clientY < rect.top || clientY > rect.bottom || dL < 0 || dR < 0) {
      edgeSuppress = false;
      hideEdges();
      return;
    }
    // After a navigation click the arrows stay faded until the pointer
    // fully leaves the edge zones and comes back.
    if (edgeSuppress) {
      if (Math.min(dL, dR) > EDGE_RANGE) edgeSuppress = false;
      else { hideEdges(); return; }
    }
    const prox = d => (d >= 0 && d <= EDGE_RANGE ? 1 - d / EDGE_RANGE : 0);
    const y = Math.min(Math.max(clientY - rect.top, 90), Math.max(90, rect.height - 90));
    setEdge(edgePrevBtn, prox(dL), y, rect.height, prox(dL));
    setEdge(edgeNextBtn, prox(dR), y, rect.height, prox(dR));
  }

  function contentPoint(event) {
    const rect = $('goodie-ripple-layer').parentElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  if (modalContentEl && modalBodyEl && edgePrevBtn && edgeNextBtn) {
    modalContentEl.addEventListener('pointermove', event => trackEdge(event.clientX, event.clientY));
    modalContentEl.addEventListener('pointerleave', () => { edgeSuppress = false; hideEdges(); });
    // Touch has no hover: a tap near the edge reveals the arrow, tapping the arrow travels.
    let edgeFlashTimer = null;
    modalBodyEl.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !edgeModalActive()) return;
      const rect = modalBodyEl.getBoundingClientRect();
      const d = Math.min(event.clientX - rect.left, rect.right - event.clientX);
      if (d >= 0 && d <= 56) {
        edgeSuppress = false;
        trackEdge(event.clientX, event.clientY);
        if (edgeFlashTimer) clearTimeout(edgeFlashTimer);
        edgeFlashTimer = setTimeout(hideEdges, 1500);
      }
    });
    const clickNav = dir => event => {
      event.stopPropagation();
      const p = contentPoint(event);
      navGoodie(dir, p.x, p.y);
    };
    edgePrevBtn.addEventListener('click', clickNav(-1));
    edgeNextBtn.addEventListener('click', clickNav(1));
    // Deterministic pressed state (pure :active can be swallowed by the
    // opacity fade / navigation swap, so drive it from pointer events).
    const pressOn = event => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.currentTarget.classList.add('is-pressed');
    };
    const pressOff = event => event.currentTarget.classList.remove('is-pressed');
    [edgePrevBtn, edgeNextBtn].forEach(btn => {
      btn.addEventListener('pointerdown', pressOn);
      btn.addEventListener('pointerup', pressOff);
      btn.addEventListener('pointercancel', pressOff);
      btn.addEventListener('pointerleave', pressOff);
    });
    edgePrevBtn.addEventListener('focus', () => centerHump(edgePrevBtn));
    edgeNextBtn.addEventListener('focus', () => centerHump(edgeNextBtn));
  }

  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target && event.target.tagName || '')) return;
    if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && !event.metaKey && !event.ctrlKey && !event.altKey && $('custom-minigame-modal').classList.contains('active')) {
      event.preventDefault();
      navGoodie(event.key === 'ArrowRight' ? 1 : -1, null, null);
      return;
    }
    if (event.key !== 'Escape') return;
    if ($('custom-credits-modal').classList.contains('active')) closeCreditsDialog(null, true); else if ($('custom-minigame-modal').classList.contains('active')) closeMinigame(null, true);
  });
  window.openCreditsDialogCurrent = () => currentOpenGoodie && openCreditsDialog(currentOpenGoodie.name);
  window.openCreditsDialog = openCreditsDialog; window.closeCreditsDialog = closeCreditsDialog; window.closeMinigame = closeMinigame; window.hideModalLoader = hideModalLoader;
  setupFilters();
})();
