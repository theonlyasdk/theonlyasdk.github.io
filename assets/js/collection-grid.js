/* Shared filter + search + card-grid engine for collection pages
   (Goodies, Page Designs). Page scripts supply the items and a card
   builder; this module owns the pills, the search box, same-set render
   skipping and the empty state. Must load before the page scripts. */
(function () {
  'use strict';

  const EMPTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/><path d="M8.5 8.5l5 5M13.5 8.5l-5 5"/></svg>';

  function CollectionGrid(options) {
    const $ = id => document.getElementById(id);
    const grid = $(options.gridId);
    const filter = $(options.filterId);
    if (!grid || !filter) return null;

    const items = options.items || [];
    const search = options.searchId ? $(options.searchId) : null;
    const clearBtn = options.clearId ? $(options.clearId) : null;
    let currentList = [];
    let activeCategory = '';

    const readQuery = () => (search ? search.value.trim().toLowerCase() : '');

    function matchesQuery(item, query) {
      if (!query) return true;
      const haystack = `${item.name} ${item.description || ''} ${item.category || ''}`.toLowerCase();
      return query.split(/\s+/).every(term => haystack.includes(term));
    }

    function render() {
      const query = readQuery();
      const next = items.filter(item =>
        (!activeCategory || item.category === activeCategory) && matchesQuery(item, query));
      // Same result set as what's already on screen (e.g. "fl" -> "flu"):
      // skip the rebuild so cards don't replay their entrance animation.
      if (next.length === currentList.length &&
          next.every((item, index) => currentList[index] === item)) return;
      const wasEmpty = grid.querySelector('.' + options.emptyColClass) !== null;
      grid.replaceChildren();
      currentList = next;
      if (!currentList.length) {
        const empty = document.createElement('div');
        empty.className = options.emptyColClass;
        empty.innerHTML = `<div class="${options.emptyClass}">${EMPTY_ICON}<p><strong>${options.emptyTitle}</strong></p><p class="small mb-0">${options.emptyHint}</p></div>`;
        // Replay the pop only when the empty state first appears, not on every keystroke.
        if (wasEmpty) empty.querySelector('svg').style.animation = 'none';
        grid.appendChild(empty);
        return;
      }
      currentList.forEach((item, index) => {
        const col = document.createElement('div'); col.className = 'col d-flex flex-column';
        const card = options.buildCard(item, index);
        if (options.onOpen) {
          card.addEventListener('click', () => options.onOpen(item));
          card.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); options.onOpen(item); }
          });
        }
        col.appendChild(card); grid.appendChild(col);
      });
    }

    // Category pills.
    ['All', ...new Set(items.map(item => item.category))].forEach(category => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-search-filter ' + options.filterBtnClass;
      button.textContent = category;
      button.setAttribute('aria-pressed', category === 'All' ? 'true' : 'false');
      if (category === 'All') button.classList.add('active');
      button.addEventListener('click', () => {
        filter.querySelectorAll('button').forEach(el => {
          el.classList.toggle('active', el === button);
          el.setAttribute('aria-pressed', el === button ? 'true' : 'false');
        });
        activeCategory = category === 'All' ? '' : category;
        render();
      });
      filter.appendChild(button);
    });

    // Search box.
    if (search) {
      // On phones, bring the search box to the top of the viewport on focus.
      search.addEventListener('focus', () => {
        if (!window.matchMedia('(max-width: 576px)').matches) return;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const box = search.closest('[role="search"]') || search;
        const bar = document.getElementById('topbar-wrapper');
        const offset = (bar ? bar.getBoundingClientRect().height : 0) + 8;
        const top = box.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(top, 0), behavior: reduce ? 'auto' : 'smooth' });
      });
      search.addEventListener('input', () => {
        if (clearBtn) clearBtn.hidden = !search.value;
        render();
      });
      search.addEventListener('keydown', event => {
        if (event.key === 'Escape' && search.value) {
          search.value = '';
          if (clearBtn) clearBtn.hidden = true;
          render();
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (search) search.value = '';
        clearBtn.hidden = true;
        render();
        if (search) search.focus();
      });
    }

    render();
    return { render };
  }

  window.CollectionGrid = CollectionGrid;
})();
