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

    let initialized = false;
    let itemNodes = [];
    const emptyState = document.createElement('div');
    emptyState.className = options.emptyColClass;
    emptyState.style.display = 'none';
    emptyState.innerHTML = `<div class="${options.emptyClass}">${EMPTY_ICON}<p><strong>${options.emptyTitle}</strong></p><p class="small mb-0">${options.emptyHint}</p></div>`;

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
      
      if (initialized && next.length === currentList.length &&
          next.every((item, index) => currentList[index] === item)) return;
      
      currentList = next;
      
      if (!initialized) {
        grid.style.position = 'relative';
        grid.replaceChildren();
        
        itemNodes = items.map((item, index) => {
          const col = document.createElement('div');
          col.className = 'col d-flex flex-column';
          const card = options.buildCard(item, index);
          if (options.onOpen) {
            card.addEventListener('click', () => options.onOpen(item));
            card.addEventListener('keydown', event => {
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); options.onOpen(item); }
            });
          }
          col.appendChild(card);
          grid.appendChild(col);
          
          return { item, col, card, visible: true };
        });
        
        grid.appendChild(emptyState);
        initialized = true;
        
        if (!currentList.length) {
          itemNodes.forEach(node => { 
            node.col.classList.remove('d-flex');
            node.col.classList.add('d-none');
            node.visible = false; 
          });
          emptyState.style.display = '';
        } else {
          itemNodes.forEach(node => {
            if (!currentList.includes(node.item)) {
              node.col.classList.remove('d-flex');
              node.col.classList.add('d-none');
              node.visible = false;
            }
          });
        }
        return;
      }
      
      // Filter change AFTER initialization
      // Clear original entrance animation to prevent replay
      itemNodes.forEach(node => {
        node.card.style.animation = 'none';
        node.card.style.opacity = '1';
      });

      // Record FIRST state (for currently visible elements)
      const firstRects = new Map();
      itemNodes.forEach(node => {
        if (node.visible) {
          firstRects.set(node, node.card.getBoundingClientRect());
        }
      });
      
      // Toggle visibility based on new list
      itemNodes.forEach(node => {
        const shouldBeVisible = currentList.includes(node.item);
        
        if (node.visible && !shouldBeVisible) {
          // Ghost for fading out
          const rect = firstRects.get(node);
          const ghost = node.card.cloneNode(true);
          ghost.style.position = 'absolute';
          ghost.style.margin = '0';
          ghost.style.left = (rect.left + window.scrollX) + 'px';
          ghost.style.top = (rect.top + window.scrollY) + 'px';
          ghost.style.width = rect.width + 'px';
          ghost.style.height = rect.height + 'px';
          ghost.style.pointerEvents = 'none';
          ghost.style.zIndex = '100';
          ghost.style.animation = 'none'; // Force kill CSS animations so they don't fight the fade out
          ghost.style.transition = 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1)'; // No transform scale
          
          document.body.appendChild(ghost);
          
          // Trigger reflow
          void ghost.offsetWidth;
          
          requestAnimationFrame(() => {
            ghost.style.opacity = '0';
          });
          
          setTimeout(() => {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
          }, 300);
        }
        
        if (!node.visible && shouldBeVisible) {
           node.isEntering = true;
        } else {
           node.isEntering = false;
        }
        
        if (shouldBeVisible) {
          node.col.classList.add('d-flex');
          node.col.classList.remove('d-none');
        } else {
          node.col.classList.remove('d-flex');
          node.col.classList.add('d-none');
        }
        
        node.visible = shouldBeVisible;
      });
      
      // Empty state handling
      emptyState.style.display = currentList.length ? 'none' : '';
      if (!currentList.length) {
        const svg = emptyState.querySelector('svg');
        if (svg) {
          svg.style.animation = 'none';
          void svg.offsetWidth;
          svg.style.animation = '';
        }
      }
      
      // Apply FLIP and entrance animations
      itemNodes.forEach(node => {
        if (!node.visible) return;
        
        if (node.isEntering) {
          node.card.style.transition = 'none';
          node.card.style.transform = 'scale(0.97)';
          node.card.style.opacity = '0';
          
          requestAnimationFrame(() => {
            node.card.style.transition = 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1), transform 250ms cubic-bezier(0.22, 1, 0.36, 1)';
            node.card.style.opacity = '1';
            node.card.style.transform = 'scale(1)';
          });
        } else {
          // Element was visible and is STILL visible: calculate FLIP Invert
          const lastRect = node.card.getBoundingClientRect();
          const firstRect = firstRects.get(node);
          
          const dx = firstRect.left - lastRect.left;
          const dy = firstRect.top - lastRect.top;
          
          if (dx !== 0 || dy !== 0) {
            node.card.style.transition = 'none';
            node.card.style.transform = `translate(${dx}px, ${dy}px)`;
            
            requestAnimationFrame(() => {
              node.card.style.transition = 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1)';
              node.card.style.transform = 'translate(0, 0)';
              
              // Clean up transition property after animation completes
              setTimeout(() => {
                if (node.card.style.transform === 'translate(0px, 0px)' || node.card.style.transform === 'translate(0, 0)') {
                  node.card.style.transition = '';
                  node.card.style.transform = '';
                }
              }, 400);
            });
          } else {
            node.card.style.transition = '';
            node.card.style.transform = '';
          }
        }
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
