(function () {
  'use strict';

  const designsEl = document.getElementById('pdesigns-data');
  const foldersEl = document.getElementById('pfolders-data');
  const ALL_DESIGNS = designsEl ? JSON.parse(designsEl.textContent) : [];
  const FOLDERS_CONFIG = foldersEl ? JSON.parse(foldersEl.textContent) : [];
  const siteUrl = window.siteUrl || (path => path);

  const $ = id => document.getElementById(id);

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  /* Group designs into folders and identify root-level standalone items */
  const foldersMap = new Map();

  /* Seed configured folders so order and metadata are maintained */
  FOLDERS_CONFIG.forEach(cfg => {
    foldersMap.set(cfg.name, {
      isFolder: true,
      name: cfg.name,
      folderSlug: cfg.slug || slugify(cfg.name),
      category: cfg.category || 'Templates',
      description: cfg.description || '',
      items: []
    });
  });

  const rootStandalone = [];

  ALL_DESIGNS.forEach(design => {
    if (design.folder) {
      let folder = foldersMap.get(design.folder);
      if (!folder) {
        folder = {
          isFolder: true,
          name: design.folder,
          folderSlug: slugify(design.folder),
          category: design.category || 'Templates',
          description: `Collection of ${design.folder} templates.`,
          items: []
        };
        foldersMap.set(design.folder, folder);
      }
      folder.items.push(design);
    } else {
      rootStandalone.push(design);
    }
  });

  /* Keep only folders that have items and build searchable terms */
  const folderList = Array.from(foldersMap.values()).filter(folder => folder.items.length > 0);
  folderList.forEach(folder => {
    folder.searchTerms = folder.items.map(d => `${d.name} ${d.description || ''}`).join(' ');
  });

  const ROOT_ITEMS = [...folderList, ...rootStandalone];

  let currentFolder = null;
  let gridInstance = null;

  /* Breadcrumb & Title Elements */
  const breadcrumb = $('breadcrumb');
  const defaultBreadcrumbHtml = breadcrumb ? breadcrumb.innerHTML : '';
  const topbarTitle = $('topbar-title');
  const defaultTopbarTitle = topbarTitle ? topbarTitle.textContent : '';
  const defaultDocTitle = document.title;
  const siteTitle = (defaultDocTitle.split('|').pop() || '').trim() || 'TheOnlyASDK';

  function imageFallback(image) {
    image.hidden = true;
    const fallback = document.createElement('div');
    fallback.className = 'pdesign-image-fallback';
    fallback.textContent = 'Preview unavailable. The PDF is still available below.';
    image.parentElement.appendChild(fallback);
  }

  /* Card Builder for Folders */
  function buildFolderCard(folder, index) {
    const card = document.createElement('div');
    card.className = 'pdesign-card is-folder';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    const count = folder.items.length;
    const countLabel = `${count} ${count === 1 ? "template" : "templates"}`;
    card.setAttribute("aria-label", `Open folder ${folder.name} with ${countLabel}`);
    card.style.setProperty('--anim-delay', `${((index + 1) * 0.1).toFixed(1)}s`);

    const cover = document.createElement('div');
    cover.className = 'pdesign-cover pdesign-folder-cover';

    const stack = document.createElement('div');
    stack.className = 'pdesign-stack';

    /* Render preview sheets from folder items */
    const previews = folder.items.slice(0, 3);
    const sheetClasses = ['pdesign-stack-sheet-1', 'pdesign-stack-sheet-2', 'pdesign-stack-sheet-3'];

    /* Stack from back to front so stack-sheet-1 is on top */
    for (let i = previews.length - 1; i >= 0; i--) {
      const item = previews[i];
      const sheet = document.createElement('div');
      sheet.className = `pdesign-stack-sheet ${sheetClasses[i] || 'pdesign-stack-sheet-3'}`;
      const img = document.createElement('img');
      img.src = siteUrl(item.image);
      img.alt = '';
      img.loading = 'lazy';
      img.width = 400;
      img.height = 200;
      sheet.appendChild(img);
      stack.appendChild(sheet);
    }

    const pill = document.createElement('div');
    pill.className = 'pdesign-folder-pill';
    pill.innerHTML = `
      <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13" aria-hidden="true">
        <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H7.414a1.5 1.5 0 0 1-1.06-.44L5.06 2.757A1.5 1.5 0 0 0 4 2.343H1.5z"/>
      </svg>
      <span>${countLabel}</span>
    `;

    cover.append(stack, pill);

    const title = document.createElement('h5');
    title.className = 'card-title pdesign-folder-title';
    title.innerHTML = `
      <span>${escapeHtml(folder.name)}</span>
      <svg class="pdesign-folder-arrow" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M6 12l4-4-4-4"/>
      </svg>
    `;

    const description = document.createElement('p');
    description.className = 'text-muted small';
    description.textContent = folder.description;

    card.append(cover, title, description);
    return card;
  }

  /* Card Builder for Individual Designs */
  function buildDesignCard(design, index) {
    const card = document.createElement('div');
    card.className = 'pdesign-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Preview ' + design.name);
    card.style.setProperty('--anim-delay', `${((index + 1) * 0.1).toFixed(1)}s`);

    const cover = document.createElement('div');
    cover.className = 'pdesign-cover';

    const image = document.createElement('img');
    image.src = siteUrl(design.image);
    image.alt = design.name;
    image.loading = 'lazy';
    image.width = 400;
    image.height = 200;
    image.addEventListener('error', () => imageFallback(image), { once: true });
    cover.appendChild(image);

    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = design.name;

    const description = document.createElement('p');
    description.className = 'text-muted small';
    description.textContent = design.description;

    card.append(cover, title, description);
    return card;
  }

  function buildItemCard(item, index) {
    if (item.isFolder) {
      return buildFolderCard(item, index);
    }
    return buildDesignCard(item, index);
  }

  function handleOpen(item) {
    if (item.isFolder) {
      navigateToFolder(item.folderSlug);
    } else {
      openDesign(item.name);
    }
  }

  /* Main Topbar Breadcrumbs Bar Synchronization */
  function updateBreadcrumbs(folder) {
    if (!breadcrumb) return;

    if (folder) {
      const spans = Array.from(breadcrumb.querySelectorAll('span'));
      const homeSpan = spans[0] ? spans[0].outerHTML : `<span><a href="${siteUrl('/')}">Home</a></span>`;
      const collSpan = spans[1] ? spans[1].outerHTML : `<span><a href="${siteUrl('/collections/')}">Collections</a></span>`;
      const rootUrl = siteUrl('/collections/page-designs/');

      breadcrumb.innerHTML = `
        ${homeSpan}
        ${collSpan}
        <span><a href="${rootUrl}" id="pdesign-bc-root">Printable Page Templates</a></span>
        <span aria-current="page">${escapeHtml(folder.name)}</span>
      `;

      const rootLink = $('pdesign-bc-root');
      if (rootLink) {
        rootLink.addEventListener('click', event => {
          event.preventDefault();
          navigateToFolder(null);
        });
      }

      if (topbarTitle) topbarTitle.textContent = folder.name;
      document.title = `${folder.name} - Printable Page Templates | ${siteTitle}`;
    } else {
      breadcrumb.innerHTML = defaultBreadcrumbHtml;
      if (topbarTitle) topbarTitle.textContent = defaultTopbarTitle;
      document.title = defaultDocTitle;
    }
  }

  /* In-Page Header Banner Synchronization */
  function updateFolderHeader(folder) {
    const header = $('pdesign-folder-header');
    const lead = $('pdesign-page-lead');
    const mainTitle = $('pdesign-main-title');
    const desc = $('pdesign-folder-desc');
    const badge = $('pdesign-folder-count-badge');

    if (mainTitle) {
      mainTitle.textContent = folder ? folder.name : 'Printable Page Templates';
    }

    if (!header) return;

    if (folder) {
      if (desc) desc.textContent = folder.description;
      if (badge) badge.textContent = `${folder.items.length} ${folder.items.length === 1 ? 'template' : 'templates'}`;
      header.style.display = 'flex';
      if (lead) lead.style.display = 'none';
    } else {
      header.style.display = 'none';
      if (lead) lead.style.display = '';
    }
  }

  /* Folder Navigation & URL Synchronization */
  function navigateToFolder(slug, pushHistory) {
    if (pushHistory === undefined) pushHistory = true;

    if (slug) {
      const folder = folderList.find(f => f.folderSlug === slug || f.name.toLowerCase() === slug.toLowerCase());
      if (folder) {
        currentFolder = folder;
        if (pushHistory) {
          const newUrl = `${window.location.pathname}?folder=${encodeURIComponent(folder.folderSlug)}`;
          window.history.pushState({ folder: folder.folderSlug }, '', newUrl);
        }
        updateBreadcrumbs(folder);
        updateFolderHeader(folder);
        if (gridInstance) gridInstance.setItems(folder.items);
        return;
      }
    }

    currentFolder = null;
    if (pushHistory && window.location.search) {
      window.history.pushState({}, '', window.location.pathname);
    }
    updateBreadcrumbs(null);
    updateFolderHeader(null);
    if (gridInstance) gridInstance.setItems(ROOT_ITEMS);
  }

  function setupCollection() {
    /* Wire back button in folder header */
    const backBtn = $('pdesign-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => navigateToFolder(null));
    }

    /* Check initial URL for deep-linked folder */
    const params = new URLSearchParams(window.location.search);
    const initialSlug = params.get('folder') || window.location.hash.replace(/^#\/?/, '').replace(/^folder=/, '');
    const initialFolder = initialSlug ? folderList.find(f => f.folderSlug === initialSlug || f.name.toLowerCase() === initialSlug.toLowerCase()) : null;

    currentFolder = initialFolder;
    const initialItems = initialFolder ? initialFolder.items : ROOT_ITEMS;

    gridInstance = window.CollectionGrid({
      items: initialItems,
      gridId: 'pdesigns-grid',
      filterId: 'pdesign-filter',
      searchId: 'pdesign-search',
      clearId: 'pdesign-search-clear',
      filterBtnClass: 'pdesign-filter-btn',
      emptyColClass: 'pdesign-empty-col',
      emptyClass: 'pdesign-empty',
      emptyTitle: 'No templates found',
      emptyHint: 'Nothing matches your search. Try a different keyword or category.',
      buildCard: buildItemCard,
      onOpen: handleOpen
    });

    if (initialFolder) {
      updateBreadcrumbs(initialFolder);
      updateFolderHeader(initialFolder);
    }

    /* Popstate listener for browser Back & Forward navigation */
    window.addEventListener('popstate', () => {
      const urlParams = new URLSearchParams(window.location.search);
      const slug = urlParams.get('folder') || window.location.hash.replace(/^#\/?/, '').replace(/^folder=/, '');
      navigateToFolder(slug, false);
    });
  }

  function openDesign(name) {
    const design = ALL_DESIGNS.find(item => item.name === name);
    if (!design) return;

    const modal = $('pdesign-modal');
    $('pdesign-modal-title-text').textContent = design.name;
    const url = siteUrl(design.pdf);
    const download = $('pdesign-modal-download');
    download.href = url;
    const openLink = $('pdesign-modal-open');
    openLink.href = url;
    $('pdesign-modal-body').innerHTML = `<iframe class="pdesign-iframe" src="${url}" title="${design.name}"></iframe>`;
    modal.classList.remove('closing');
    modal.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add('active')));
    document.body.style.overflow = 'hidden';
  }

  function closeDesignPreview(event, force) {
    const modal = $('pdesign-modal');
    if (!force && (!event || event.target !== modal)) return;
    modal.classList.add('closing');
    setTimeout(() => {
      modal.classList.remove('active', 'closing');
      modal.style.display = 'none';
      $('pdesign-modal-body').replaceChildren();
      document.body.style.overflow = '';
    }, 260);
  }

  document.addEventListener('keydown', event => {
    if (/^(INPUT|TEXTAREA)$/.test(event.target && event.target.tagName || '')) return;
    if (event.key === 'Escape') {
      const modal = $('pdesign-modal');
      if (modal && modal.classList.contains('active')) {
        closeDesignPreview(null, true);
      } else if (currentFolder) {
        navigateToFolder(null);
      }
    }
  });

  window.closeDesignPreview = closeDesignPreview;
  setupCollection();
})();
