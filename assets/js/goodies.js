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
    const fallback = document.createElement('div');
    fallback.className = 'goodie-image-fallback';
    fallback.textContent = 'Preview unavailable. The goodie is still available.';
    image.parentElement.appendChild(fallback);
  }

  function buildGoodieCard(goodie, index) {
    const card = document.createElement('div'); card.className = 'goodie-card'; card.tabIndex = 0; card.setAttribute('role', 'button'); card.style.setProperty('--anim-delay', `${((index + 1) * .1).toFixed(1)}s`);
    const cover = document.createElement('div'); cover.className = 'card-cover';
    const image = document.createElement('img'); image.src = siteUrl(goodie.image); image.alt = goodie.name; image.loading = 'lazy'; image.addEventListener('error', () => imageFallback(image), { once: true }); cover.appendChild(image);
    if (goodie.credits) { const info = document.createElement('button'); info.type = 'button'; info.className = 'goodie-info-btn'; info.title = 'View credits & license'; info.setAttribute('aria-label', 'View credits and license'); info.innerHTML = '<svg class="goodie-info-icon" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path d="M0 0h1024v1024H0z" fill="none" /><path fill="currentColor" d="M448 224a64 64 0 1 0 128 0a64 64 0 1 0-128 0m96 168h-64c-4.4 0-8 3.6-8 8v464c0 4.4 3.6 8 8 8h64c4.4 0 8-3.6 8-8V400c0-4.4-3.6-8-8-8" /></svg><span class="goodie-info-text">Credits</span>'; info.addEventListener('click', event => { event.stopPropagation(); openCreditsDialog(goodie.name); }); cover.appendChild(info); }
    const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = goodie.name;
    const description = document.createElement('p'); description.className = 'text-muted small'; description.textContent = goodie.description;
    card.append(cover, title, description);
    return card;
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
    const pill = bar.querySelector('.t-tabs-pill');
    const tabs = [...bar.querySelectorAll('.t-tab')];
    const grid = $('goodies-grid');
    const active = () => tabs.find(t => t.getAttribute('aria-pressed') === 'true') || tabs[0];

    function moveTo(tab, animate) {
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
      grid.classList.toggle('list-view', view === 'list');
      try { localStorage.setItem('goodie-view', view); } catch (err) {}
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.setAttribute('aria-pressed', t === tab ? 'true' : 'false'));
        moveTo(tab, true);
        applyView(tab.dataset.view);
      });
    });

    bar.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const i = tabs.indexOf(active());
      const next = tabs[(i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus(); next.click(); event.preventDefault();
    });

    let saved = null;
    try { saved = localStorage.getItem('goodie-view'); } catch (err) {}
    const initial = tabs.find(t => t.dataset.view === saved) || tabs[0];
    tabs.forEach(t => t.setAttribute('aria-pressed', t === initial ? 'true' : 'false'));
    applyView(initial.dataset.view);
    requestAnimationFrame(() => moveTo(initial, false));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => moveTo(active(), false));
    }
    window.addEventListener('resize', () => moveTo(active(), false));

    // Phones are always list view (the toggle is hidden there).
    const phone = window.matchMedia('(max-width: 576px)');
    const applyResponsive = () => {
      grid.classList.toggle('list-view', phone.matches || active().dataset.view === 'list');
    };
    if (phone.addEventListener) phone.addEventListener('change', applyResponsive);
    else if (phone.addListener) phone.addListener(applyResponsive);
    applyResponsive();
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
