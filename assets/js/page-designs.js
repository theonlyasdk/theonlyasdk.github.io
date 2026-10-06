(function () {
  'use strict';

  const data = document.getElementById('pdesigns-data');
  const DESIGNS = data ? JSON.parse(data.textContent) : [];
  const siteUrl = window.siteUrl || (path => path);

  const $ = id => document.getElementById(id);

  function imageFallback(image) {
    image.hidden = true;
    const fallback = document.createElement('div');
    fallback.className = 'pdesign-image-fallback';
    fallback.textContent = 'Preview unavailable. The PDF is still available below.';
    image.parentElement.appendChild(fallback);
  }

  function buildDesignCard(design, index) {
    const card = document.createElement('div'); card.className = 'pdesign-card'; card.tabIndex = 0; card.setAttribute('role', 'button'); card.setAttribute('aria-label', 'Preview ' + design.name); card.style.setProperty('--anim-delay', `${((index + 1) * .1).toFixed(1)}s`);
    const cover = document.createElement('div'); cover.className = 'pdesign-cover';
    const image = document.createElement('img'); image.src = siteUrl(design.image); image.alt = design.name; image.loading = 'lazy'; image.addEventListener('error', () => imageFallback(image), { once: true }); cover.appendChild(image);
    const title = document.createElement('h5'); title.className = 'card-title'; title.textContent = design.name;
    const description = document.createElement('p'); description.className = 'text-muted small'; description.textContent = design.description;
    card.append(cover, title, description);
    return card;
  }

  function setupCollection() {
    window.CollectionGrid({
      items: DESIGNS,
      gridId: 'pdesigns-grid',
      filterId: 'pdesign-filter',
      searchId: 'pdesign-search',
      clearId: 'pdesign-search-clear',
      filterBtnClass: 'pdesign-filter-btn',
      emptyColClass: 'pdesign-empty-col',
      emptyClass: 'pdesign-empty',
      emptyTitle: 'No designs found',
      emptyHint: 'Nothing matches your search. Try a different keyword or category.',
      buildCard: buildDesignCard,
      onOpen: design => openDesign(design.name)
    });
  }

  function openDesign(name) {
    const design = DESIGNS.find(item => item.name === name); if (!design) return;
    const modal = $('pdesign-modal');
    $('pdesign-modal-title-text').textContent = design.name;
    const url = siteUrl(design.pdf);
    const download = $('pdesign-modal-download'); download.href = url;
    const openLink = $('pdesign-modal-open'); openLink.href = url;
    $('pdesign-modal-body').innerHTML = `<iframe class="pdesign-iframe" src="${url}" title="${design.name}"></iframe>`;
    modal.classList.remove('closing'); modal.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active')));
    document.body.style.overflow = 'hidden';
  }

  function closeDesignPreview(event, force) {
    const modal = $('pdesign-modal');
    if (!force && (!event || event.target !== modal)) return;
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing'); modal.style.display = 'none';
      $('pdesign-modal-body').replaceChildren();
      document.body.style.overflow = '';
    }, 260);
  }

  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target && event.target.tagName || '')) return;
    if (event.key !== 'Escape') return;
    if ($('pdesign-modal').classList.contains('active')) closeDesignPreview(null, true);
  });

  window.closeDesignPreview = closeDesignPreview;
  setupCollection();
})();
