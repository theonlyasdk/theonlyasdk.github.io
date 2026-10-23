/* Shared filter + search + card-grid engine for collection pages
   (Goodies, Page Designs). Page scripts supply the items and a card
   builder; this module owns the pills, the search box, same-set render
   skipping and the empty state. Must load before the page scripts. */
(function () {
  'use strict';

  const EMPTY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/><path d="M8.5 8.5l5 5M13.5 8.5l-5 5"/></svg>';

  /* One live MediaQueryList for the module. A snapshot boolean goes stale the
     moment the user changes the OS setting; a per-call matchMedia() would
     allocate on every keystroke, because render() runs on search input.

     Every transition below is written as an INLINE style, and an inline
     declaration beats any stylesheet rule that is not !important - including the
     @media (prefers-reduced-motion: reduce) blocks the pages already ship for
     .goodie-card and .pdesign-card. Those guards cannot see this code, so the
     gate has to live here. It also could not live in that CSS: suppressing the
     transition would leave the fade-out ghost sitting at full opacity on top of
     the grid until its removal timer fires, which is a worse pop than the one
     being removed. */
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

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
      // Let the page land any layout animation it owns before we measure.
      if (options.beforeRender) options.beforeRender();

      const reduce = REDUCE_MOTION.matches;
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

      // Reduced motion: the cards still have to appear and disappear, they just
      // do not travel. Everything past this point - measuring every card,
      // cloning a ghost, writing a transition, timing it out - exists only to
      // make that change gradual, so stop here and let the class toggles do it.
      //
      // Deliberately placed AFTER the entrance reset above, which is the one
      // part of this function that must still run: that loop is what pins
      // opacity to 1 and keeps the cards visible.
      if (reduce) {
        itemNodes.forEach(node => {
          const shouldBeVisible = currentList.includes(node.item);
          if (shouldBeVisible) {
            node.col.classList.add('d-flex');
            node.col.classList.remove('d-none');
          } else {
            node.col.classList.remove('d-flex');
            node.col.classList.add('d-none');
          }
          node.visible = shouldBeVisible;
        });

        emptyState.style.display = currentList.length ? 'none' : '';
        return;
      }

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
          /* The column is about to go display:none, which would pop the card out
             of existence. Clone it into <body> at its exact page coordinates
             first and fade the clone, so the card appears to leave rather than
             blink.

             <body> rather than the grid: the view-toggle morph enumerates
             grid.children as columns, and a clone sitting in there would be
             measured and pinned as if it were a real column. */
          const rect = firstRects.get(node);
          if (rect) {
            const ghost = node.card.cloneNode(true);
            ghost.style.position = 'absolute';
            ghost.style.margin = '0';
            ghost.style.left = (rect.left + window.scrollX) + 'px';
            ghost.style.top = (rect.top + window.scrollY) + 'px';
            ghost.style.width = rect.width + 'px';
            ghost.style.height = rect.height + 'px';
            ghost.style.pointerEvents = 'none';
            ghost.style.zIndex = '100';

            /* The clone carries .goodie-card, so it re-runs that class's entrance
               animation from the start - which ends it at the animation's resting
               state instead of at the fade we want. Kill it.

               Opacity only, no scale: the ghost is pinned to the card's real
               width, and scaling it would stretch the text for the whole fade. */
            ghost.style.animation = 'none';
            ghost.style.transition = 'opacity 250ms cubic-bezier(0.22, 1, 0.36, 1)';

            /* cloneNode copies attributes, and the card is tabindex=0 role=button
               with a click handler that did not come along. pointer-events:none
               blocks the mouse but NOT the tab order, so without this the clone
               is a focusable dead end - reachable by keyboard, announced by a
               screen reader, and sitting outside the grid's aria-live region. */
            ghost.setAttribute('aria-hidden', 'true');
            ghost.tabIndex = -1;

            document.body.appendChild(ghost);

            /* Commit the clone's starting opacity before asking for the fade.
               Without this reflow the next write lands in the same style
               recalculation, the transition has nothing to interpolate from, and
               the card simply vanishes. */
            void ghost.offsetWidth;

            requestAnimationFrame(() => {
              ghost.style.opacity = '0';
            });

            /* Removed on a timer longer than the transition, never on
               transitionend: in a backgrounded or throttled tab the browser
               considers the transition over immediately rather than at 250ms, and
               deleting the clone then would pop it out mid-fade. */
            setTimeout(() => {
              if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
            }, 300);
          }
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
          if (!firstRect) return;
          
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
