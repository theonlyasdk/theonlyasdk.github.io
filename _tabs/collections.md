---
# the default layout is 'page'
icon: fas fa-book-open
order: 5
---

<style>
  /* Show "Collections" heading in mobile view for collections page: big font, centered */
  @media (max-width: 849px) {
    h1.dynamic-title {
      display: block !important;
      text-align: center;
      font-size: calc(2.25rem + 8px);
      font-weight: 700;
      margin-top: 3.25rem;
      margin-bottom: 1.5rem;
    }
  }

  .shake-new {
    display: inline-block;
  }
  .shake-new:hover {
    animation: new-shake 0.4s ease-in-out;
  }
  @keyframes new-shake {
    0%, 100% { transform: rotate(0deg); }
    20% { transform: rotate(-12deg) scale(1.1); }
    40% { transform: rotate(10deg) scale(1.1); }
    60% { transform: rotate(-6deg); }
    80% { transform: rotate(4deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .shake-new:hover { animation: none; }
  }
  .fading-marquee {
    -webkit-mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
    mask-image: linear-gradient(to right, transparent, #000 12%, #000 88%, transparent);
  }
  .star-edge {
    color: #ffd60a;
  }
  .guestbook-trigger {
    cursor: pointer;
    color: var(--link-color);
    text-decoration: underline;
    text-underline-offset: 3px;
    background: none;
    border: none;
    padding: 0;
    font: inherit;
  }
  .guestbook-trigger:hover {
    color: var(--link-color);
    opacity: 0.85;
  }
  .guestbook-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    z-index: 9999;
    display: none;
    opacity: 0;
    transition: opacity 0.25s ease-out;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    box-sizing: border-box;
  }
  .guestbook-overlay.active {
    display: flex;
    opacity: 1;
  }
  .guestbook-overlay.closing {
    opacity: 0;
    pointer-events: none;
  }
  .guestbook-dialog {
    background: var(--card-bg, var(--main-bg));
    width: 100%;
    max-width: 480px;
    border-radius: 16px;
    border: 1px solid var(--main-border-color);
    box-shadow: var(--card-shadow, 0 16px 36px rgba(0, 0, 0, 0.25));
    display: flex;
    flex-direction: column;
    /* Visible, not hidden: the DodgeField close button flees outside this box.
       The overlay is position:fixed and the body is scroll-locked while the
       dialog is open, so escaping never produces a scrollbar. */
    overflow: visible;
    animation: gbZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    transition: height 0.35s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: height;
  }
  /* overflow is visible now, so round the header itself to keep the corner
     border from overshooting the dialog's radius. */
  .guestbook-header {
    border-radius: 15px 15px 0 0;
  }
  .guestbook-overlay.closing .guestbook-dialog {
    animation: gbFadeOut 0.2s ease-out both;
  }
  @keyframes gbZoomIn {
    from { opacity: 0; transform: scale(0.92); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes gbFadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.92); }
  }
  .guestbook-content-pane {
    transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1), filter 0.22s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, filter;
  }
  .guestbook-content-pane.is-crossfading-out {
    opacity: 0;
    filter: blur(8px);
    pointer-events: none;
  }
  .guestbook-content-pane.is-crossfading-in {
    opacity: 0;
    filter: blur(8px);
  }
  .guestbook-header {
    padding: 1.1rem 1.25rem 0.9rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--main-border-color);
  }
  .guestbook-header h4 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 600;
    font-family: Lato, 'Microsoft Yahei', sans-serif;
    color: var(--heading-color, var(--text-color));
  }
  .guestbook-close-btn {
    background: none;
    border: none;
    font-size: 1.4rem;
    line-height: 1;
    color: var(--text-muted-color);
    cursor: pointer;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    transition: color 0.15s ease, background-color 0.15s ease;
  }
  .guestbook-close-btn:hover {
    color: var(--text-color);
    background-color: var(--sidebar-hover-bg, rgba(128, 128, 128, 0.12));
  }
  .guestbook-body {
    padding: 1.25rem;
    color: var(--text-color);
  }
  .guestbook-options {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin: 1rem 0 1.25rem;
  }
  .guestbook-opt-label {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.55rem 0.85rem;
    border-radius: 8px;
    border: 1px solid var(--btn-border-color);
    background: var(--button-bg);
    cursor: pointer;
    font-size: 0.95rem;
    color: var(--text-color);
    transition: background 0.15s, border-color 0.15s;
    user-select: none;
  }
  .guestbook-opt-label:hover {
    background: var(--card-bg-active, var(--sidebar-hover-bg));
    border-color: var(--link-color);
  }
  .guestbook-opt-label input[type="radio"] {
    accent-color: var(--link-color);
    margin: 0;
  }
  .guestbook-other-wrap {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .guestbook-other-wrap.is-visible {
    grid-template-rows: 1fr;
  }
  .guestbook-other-inner {
    overflow: hidden;
    padding: 0;
  }
  .guestbook-other-field {
    margin-top: 0.5rem;
    padding-left: 0.25rem;
    padding-right: 0.25rem;
    opacity: 0;
    filter: blur(4px);
    transform: translateY(-4px);
    transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1), filter 0.22s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .guestbook-other-wrap.is-visible .guestbook-other-field {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
  .guestbook-other-input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--btn-border-color);
    background: var(--main-bg, var(--card-bg));
    color: var(--text-color);
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    font-family: inherit;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .guestbook-other-input:focus {
    border-color: var(--link-color);
    box-shadow: 0 0 0 2px var(--input-focus-border-color, rgba(138, 180, 248, 0.25));
  }
  .guestbook-msg-input {
    width: 100%;
    border-radius: 8px;
    border: 1px solid var(--btn-border-color);
    background: var(--main-bg, var(--card-bg));
    color: var(--text-color);
    padding: 0.6rem 0.8rem;
    font-size: 0.95rem;
    font-family: inherit;
    resize: none;
    box-sizing: border-box;
    outline: none;
    margin-bottom: 1.25rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .guestbook-msg-input:focus {
    border-color: var(--link-color);
    box-shadow: 0 0 0 2px var(--input-focus-border-color, rgba(138, 180, 248, 0.25));
  }
  .guestbook-submit-btn {
    width: 100%;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: var(--link-color);
    color: #ffffff !important;
    border: none;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
  }
  .guestbook-submit-btn:hover {
    filter: brightness(1.1);
  }
  .guestbook-submit-btn:active {
    transform: scale(0.98);
  }
  /* The post-submit Close button wears the same primary look as Submit.
     Capped short of full width so it has somewhere to run - a full-width
     button has no room to dodge inside a dialog-sized field.
     Only `filter` transitions here on purpose: the DodgeField owns `transform`,
     and a transform transition would fight the dodge glide. */
  .guestbook-dodge-btn {
    display: block;
    width: 100%;
    max-width: 200px;
    margin: 0 auto;
    padding: 0.65rem 1rem;
    border-radius: 8px;
    background: var(--link-color);
    color: #ffffff !important;
    border: none;
    font-family: inherit;
    font-weight: 600;
    font-size: 0.95rem;
    line-height: 1.25rem;
    cursor: pointer;
    transition: filter 0.15s;
  }
  .guestbook-dodge-btn:hover {
    filter: brightness(1.1);
  }
  .guestbook-dodge-btn[data-caught='true'] {
    background: var(--text-color);
    color: var(--main-bg, #18181b) !important;
  }
  .guestbook-success-state {
    padding: 1.5rem 1rem;
    text-align: center;
  }
  .guestbook-success-icon {
    width: 3.5rem;
    height: 3.5rem;
    color: var(--prompt-tip-icon-color, #28a745);
    margin-bottom: 0.75rem;
  }
  .guestbook-success-msg {
    font-size: 1.25rem;
    font-weight: 600;
    font-family: Lato, 'Microsoft Yahei', sans-serif;
    color: var(--heading-color, var(--text-color));
    margin-bottom: 0.35rem;
  }
  .guestbook-success-sub {
    font-size: 0.95rem;
    color: var(--text-muted-color);
    margin-bottom: 1.5rem;
  }
  /* Segmented Collection Tabs */
  .collection-tabs-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
    margin: 1.75rem auto 1.5rem auto;
  }
  .collection-tab-bar {
    position: relative;
    display: inline-flex;
    align-items: center;
    background: var(--card-header-bg, rgba(120, 120, 120, 0.1));
    border: 1px solid var(--btn-border-color, rgba(120, 120, 120, 0.18));
    border-radius: 9999px;
    padding: 3px;
    gap: 3px;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.04);
    max-width: 100%;
    user-select: none;
    touch-action: pan-y;
  }
  .collection-tab-pill {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 0;
    right: 0;
    height: auto;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--btn-border-color, rgba(120, 120, 120, 0.15));
    border-radius: 9999px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
    z-index: 0;
    pointer-events: none;
    will-change: left, right;
  }
  .collection-tab-btn {
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.45rem 1.35rem;
    min-height: 38px;
    border: none;
    background: transparent;
    border-radius: 9999px;
    color: var(--text-muted-color);
    font-size: 0.92rem;
    font-weight: 600; /* Identical font-weight across both states so text never shifts */
    font-family: inherit;
    cursor: pointer;
    outline: none;
    white-space: nowrap;
    opacity: 0.75;
    transition: color 0.22s ease, opacity 0.22s ease;
    -webkit-tap-highlight-color: transparent;
    transform: none !important; /* Strictly no scale animation on text */
  }
  .collection-tab-btn i {
    font-size: 0.9rem;
    color: inherit;
    opacity: 0.8;
    transition: color 0.22s ease, opacity 0.22s ease;
    transform: none !important; /* Strictly no scale animation on icons */
  }
  .collection-tab-btn:hover {
    color: var(--text-color);
    opacity: 0.95;
  }
  .collection-tab-btn:hover i {
    opacity: 1;
  }
  .collection-tab-btn[aria-selected="true"] {
    color: var(--heading-color, var(--text-color));
    opacity: 1;
    font-weight: 600;
  }
  .collection-tab-btn[aria-selected="true"] i {
    opacity: 1;
    color: var(--link-color);
    transform: none !important;
  }
  .collection-tab-btn:focus-visible {
    outline: 2px solid var(--link-color);
    outline-offset: 2px;
  }
  @media all and (max-width: 560px) {
    .collection-tabs-wrapper {
      margin: 1.25rem 0 1.25rem 0;
    }
    .collection-tab-bar {
      width: 100%;
    }
    .collection-tab-btn {
      flex: 1 1 0;
      padding: 0.5rem 0.6rem;
      font-size: 0.85rem;
      gap: 0.35rem;
    }
  }

  /* Collection Tab Panels - CSS Grid Overlay (Zero layout jump) */
  .collection-tab-panels {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    width: 100%;
    position: relative;
  }
  .collection-tab-panel {
    grid-area: 1 / 1 / 2 / 2;
    display: none;
    opacity: 0;
    transform: translateX(0);
    filter: blur(0);
    transition:
      opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      filter 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    will-change: opacity, transform, filter;
  }
  .collection-tab-panel.is-active {
    display: block;
    opacity: 1;
    transform: translateX(0);
    filter: blur(0);
  }
  .collection-tab-panel.is-entering-right {
    display: block;
    opacity: 0;
    transform: translateX(6px);
    filter: blur(2px);
  }
  .collection-tab-panel.is-entering-left {
    display: block;
    opacity: 0;
    transform: translateX(-6px);
    filter: blur(2px);
  }
  .collection-tab-panel.is-exiting-left {
    display: block;
    opacity: 0;
    transform: translateX(-6px);
    filter: blur(2px);
  }
  .collection-tab-panel.is-exiting-right {
    display: block;
    opacity: 0;
    transform: translateX(6px);
    filter: blur(2px);
  }
  @media (prefers-reduced-motion: reduce) {
    .collection-tab-pill,
    .collection-tab-panel,
    .collection-tab-btn,
    .collection-tab-btn i {
      transition: none !important;
      transform: none !important;
      filter: none !important;
    }
  }
</style>

<marquee class="fading-marquee" behavior="scroll" direction="left" scrollamount="6"><span class="star-edge">★</span> Welcome to my Collections page ★ Cheatsheets, tutorials and curated collections ★ New links added regularly ★ Don't forget to sign the guestbook <span class="star-edge">★</span></marquee>

<p class="text-center">
  <span class="post-tag">printer-friendly</span>
  <span class="post-tag">hand-curated</span>
  <span class="post-tag">bookmark-worthy</span>
</p>

<p class="text-center">Page updated <em>{{ 'now' | date: '%B %d, %Y' }}</em>. You've visited this page <strong id="collections-visits-count"><span id="collections-visits">1</span> time</strong> from this browser.</p>

<script>
  /* Not a global hit counter. Counts only this browser's visits to the
     Collections page, kept in localStorage so the number stays honest. */
  (function () {
    var el = document.getElementById('collections-visits');
    var countEl = document.getElementById('collections-visits-count');
    if (!el) return;
    try {
      var n = parseInt(localStorage.getItem('collections-visits') || '0', 10) + 1;
      localStorage.setItem('collections-visits', String(n));
      el.textContent = n;
      if (countEl) {
        countEl.innerHTML = '<span id="collections-visits">' + n + '</span> ' + (n === 1 ? 'time' : 'times');
      }
    } catch (e) {
      el.textContent = '1';
    }
  })();
</script>

<div class="collection-tabs-wrapper">
  <div class="collection-tab-bar" role="tablist" aria-label="Collection categories">
    <span class="collection-tab-pill" aria-hidden="true"></span>
    <button type="button" class="collection-tab-btn" role="tab" id="tab-my-collections" aria-selected="true" aria-controls="tabpanel-my-collections" data-tab="my-collections" tabindex="0">
      <i class="fa-solid fa-folder-open"></i>
      <span>My Collections</span>
    </button>
    <button type="button" class="collection-tab-btn" role="tab" id="tab-other-collections" aria-selected="false" aria-controls="tabpanel-other-collections" data-tab="other-collections" tabindex="-1">
      <i class="fa-solid fa-compass"></i>
      <span>Other Cool Collections</span>
    </button>
  </div>
</div>

<div class="collection-tab-panels">

<div id="tabpanel-my-collections" class="collection-tab-panel is-active" role="tabpanel" aria-labelledby="tab-my-collections" markdown="1">

> Pardon our dust — the Tutorials wing is still under construction!
{: .prompt-warning }

## ✦ Printables

Short, print-friendly references for the desk or the workshop wall.

- 🖨 **[Printable Page Templates](/collections/page-designs/)** — Solid fills, bordered pages, assignment trackers, PAL test chart - print-ready PDF downloads!<span class="post-tag shake-new">NEW!</span>
- ★ <span class="text-muted">**Linux Command Cheatsheet**</span> <span class="post-tag">Coming Soon</span> — the 20% of commands that cover 80% of terminal work.
- ★ <span class="text-muted">**Git Survival Sheet**</span> <span class="post-tag">Coming Soon</span> — init to rebase, plus how to undo almost anything.
- ★ <span class="text-muted">**Regex Quick Reference**</span> <span class="post-tag">Coming Soon</span> — character classes, quantifiers and lookarounds on one page.

## ✦ Tutorials

Longer guides worth working through end to end.

- ★ <span class="text-muted">**Terminal Basics**</span> <span class="post-tag">Coming Soon</span> — from zero to comfortable on the command line.
- ★ <span class="text-muted">**Dotfiles From Scratch**</span> <span class="post-tag">Coming Soon</span> — version-control your setup like a grown-up.
- ★ <span class="text-muted">**Self-Hosting 101**</span> <span class="post-tag">Coming Soon</span> — put your own services on your own hardware.

## ✦ Reading Shelf

- ★ <span class="text-muted">**My Reading Shelf**</span> <span class="post-tag">Coming Soon</span> — essays and docs I re-read every year.

</div>

<div id="tabpanel-other-collections" class="collection-tab-panel" role="tabpanel" aria-labelledby="tab-other-collections" hidden markdown="1">

## ✦ Curated Collections

Curated piles of links for rabbit-hole days.

- ★ **[Awesome Self-Hosted](https://github.com/awesome-selfhosted/awesome-selfhosted){:target="_blank" rel="noopener"}** — community-maintained list of self-hostable software.
- ★ **[Awesome Command Line](https://github.com/alebcizr/awesome-cli){:target="_blank" rel="noopener"}** — tools, dotfiles and reading for terminal enjoyers.

## ✦ Tools & References

Bookmark-grade utilities and lookup pages.

- ★ **[Explainshell](https://explainshell.com/){:target="_blank" rel="noopener"}** — paste a command, learn what each flag does.
- ★ **[DevDocs](https://devdocs.io/){:target="_blank" rel="noopener"}** — offline-capable API documentation in one place.
- ★ **[Can I Use](https://caniuse.com/){:target="_blank" rel="noopener"}** — browser support tables for web features.

</div>

</div>

{% comment %} Loaded synchronously: the inline orchestration below runs immediately
   and must find window.RubberSegment already defined. {% endcomment %}
<script src="{{ '/assets/js/rubber-segment.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
<script>
  /* Collection Tabs Orchestration */
  (function () {
    var bar = document.querySelector('.collection-tab-bar');
    if (!bar) return;
    var pill = bar.querySelector('.collection-tab-pill');
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.collection-tab-btn'));
    var panels = {
      'my-collections': document.getElementById('tabpanel-my-collections'),
      'other-collections': document.getElementById('tabpanel-other-collections')
    };

    var currentTabId = 'my-collections';
    var switchTimer = null;

    /* Pill motion is delegated to the shared RubberSegment engine (dilate ->
       land handoff, trailing-edge squash, rubber drag, flick momentum). Only
       the panel switching below is still orchestrated here. */
    var segment = null;
    if (window.RubberSegment) {
      segment = window.RubberSegment.create({
        track: bar,
        pill: pill,
        items: tabs,
        inset: 3,
        stretch: 100,
        squash: 3,
        speed: 1,
        glide: 75,
        draggable: true,
        onChange: function (index) {
          var el = tabs[index];
          if (!el) return;
          var id = el.getAttribute('data-tab');
          switchTab(id, true, true);
          if (history.replaceState) {
            history.replaceState(null, '', '#' + id);
          }
        }
      });
    }

    /* `fromSegment` marks changes the pill engine initiated, so the pill is not
       driven a second time from here (it is already animating). */
    function switchTab(newTabId, animate, fromSegment) {
      if (newTabId === currentTabId && animate) return;
      var newTab = bar.querySelector('[data-tab="' + newTabId + '"]');
      if (!newTab) return;

      if (switchTimer) {
        clearTimeout(switchTimer);
        switchTimer = null;
      }

      var oldTabId = currentTabId;
      var oldPanel = panels[oldTabId];
      var newPanel = panels[newTabId];

      var oldIndex = tabs.indexOf(bar.querySelector('[data-tab="' + oldTabId + '"]'));
      var newIndex = tabs.indexOf(newTab);
      var movingRight = newIndex >= oldIndex;

      currentTabId = newTabId;

      tabs.forEach(function (t) {
        var isSelected = t.getAttribute('data-tab') === newTabId;
        t.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        t.setAttribute('tabindex', isSelected ? '0' : '-1');
      });

      if (!fromSegment && segment) segment.animateTo(newIndex);

      try {
        localStorage.setItem('collections-active-tab', newTabId);
      } catch (e) {}

      if (!animate || !oldPanel || !newPanel) {
        if (oldPanel) {
          oldPanel.className = 'collection-tab-panel';
          oldPanel.hidden = true;
          oldPanel.style.display = 'none';
        }
        if (newPanel) {
          newPanel.className = 'collection-tab-panel is-active';
          newPanel.hidden = false;
          newPanel.style.display = 'block';
        }
        return;
      }

      /* Both panels occupy grid-area: 1/1 during transition — ZERO vertical pushing or layout jumping */
      oldPanel.className = 'collection-tab-panel ' + (movingRight ? 'is-exiting-left' : 'is-exiting-right');

      newPanel.hidden = false;
      newPanel.style.display = 'block';
      newPanel.className = 'collection-tab-panel ' + (movingRight ? 'is-entering-right' : 'is-entering-left');
      void newPanel.offsetWidth; /* Force reflow before transition */

      requestAnimationFrame(function () {
        newPanel.className = 'collection-tab-panel is-active';
      });

      switchTimer = setTimeout(function () {
        if (oldPanel && currentTabId !== oldTabId) {
          oldPanel.className = 'collection-tab-panel';
          oldPanel.hidden = true;
          oldPanel.style.display = 'none';
        }
        switchTimer = null;
      }, 300);
    }

    /* Keyboard, click and drag are all owned by the pill engine now (it calls
       switchTab through onChange). Keeping parallel handlers here would drive
       the pill twice and fire switchTab twice per interaction. */

    /* Read initial tab from URL hash or localStorage */
    var initialTab = 'my-collections';
    var hash = window.location.hash.replace('#', '');
    if (hash === 'other-collections') {
      initialTab = 'other-collections';
    } else if (hash === 'my-collections') {
      initialTab = 'my-collections';
    } else {
      try {
        var saved = localStorage.getItem('collections-active-tab');
        if (saved && panels[saved]) initialTab = saved;
      } catch (e) {}
    }

    switchTab(initialTab, false);
    var activeBtn = bar.querySelector('[data-tab="' + initialTab + '"]');
    if (segment) segment.setValue(tabs.indexOf(activeBtn));
  })();
</script>

---

<p class="text-center">.:*~*:._.:*~*:<strong>THANKS FOR THE VISIT</strong>:*~*:._.:*~*:.</p>

<!-- The webring nav is decorative: this site is not in a ring (yet). The toast
     library turns each link into an honest note. See assets/js/toast.js. -->
<p class="text-center"><a href="#" data-toast-title="There is no previous site" data-toast-description="This is the first, last and only entry in the ring.">&larr; prev</a> | <a href="#" data-toast-title="Random did not help" data-toast-description="A ring of one means &quot;random&quot; always lands you right back here.">random</a> | <a href="#" data-toast-title="Ring index: 1 site" data-toast-description="This one. That is the entire list.">ring index</a> | <a href="#" data-toast-title="There is no next site" data-toast-description="The ring is a closed loop of exactly one, so you have seen all of it.">next &rarr;</a></p>

<p class="text-center"><button type="button" class="guestbook-trigger" onclick="openGuestbook()">&#9998; Sign my guestbook</button> — tell me where you came from!</p>

<div id="guestbook-modal" class="guestbook-overlay" onclick="closeGuestbook(event)">
  <div class="guestbook-dialog" role="dialog" aria-modal="true" aria-labelledby="guestbook-title" onclick="event.stopPropagation()">
    <div class="guestbook-header">
      <h4 id="guestbook-title">Sign the Guestbook</h4>
      <button type="button" class="guestbook-close-btn" aria-label="Close" onclick="closeGuestbook(event, true)">&times;</button>
    </div>
    <div class="guestbook-body" id="guestbook-body">
      <div class="guestbook-content-pane">
        <form id="guestbook-form" onsubmit="submitGuestbook(event)">
          <p style="margin: 0; font-size: 0.95rem;">Where did you drop in from?</p>
          <div class="guestbook-options">
            <label class="guestbook-opt-label">
              <input type="radio" name="source" value="GitHub / Repositories" checked>
              <span>GitHub / Repositories</span>
            </label>
            <label class="guestbook-opt-label">
              <input type="radio" name="source" value="Search Engine (Google/DuckDuckGo)">
              <span>Search Engine (Google/DuckDuckGo)</span>
            </label>
            <label class="guestbook-opt-label">
              <input type="radio" name="source" value="Friend / Shared Link">
              <span>Friend / Shared Link</span>
            </label>
            <label class="guestbook-opt-label">
              <input type="radio" name="source" value="Other" onchange="toggleGuestbookOther(this)">
              <span>Somewhere else</span>
            </label>
          </div>
          <div id="guestbook-other-wrap" class="guestbook-other-wrap" aria-hidden="true">
            <div class="guestbook-other-inner">
              <div class="guestbook-other-field">
                <label for="guestbook-other-input" style="display: block; font-size: 0.85rem; margin-bottom: 0.25rem; color: var(--text-muted-color);">Please specify where you came from:</label>
                <input id="guestbook-other-input" name="other_source" class="guestbook-other-input" type="text" placeholder="e.g. Mastodon, Substack, LinkedIn, blog mention...">
              </div>
            </div>
          </div>
          <label for="guestbook-msg" style="display: block; font-size: 0.9rem; margin-top: 1rem; margin-bottom: 0.35rem; color: var(--text-muted-color);">Leave a quick hello or note (optional):</label>
          <textarea id="guestbook-msg" class="guestbook-msg-input" rows="3" placeholder="What brought you here or what did you like?"></textarea>
          <button type="submit" class="guestbook-submit-btn">Submit</button>
        </form>
      </div>
    </div>
  </div>
</div>

<script>
  function toggleGuestbookOther(radio) {
    var wrap = document.getElementById('guestbook-other-wrap');
    var input = document.getElementById('guestbook-other-input');
    if (!wrap) return;
    if (radio && radio.value === 'Other' && radio.checked) {
      wrap.classList.add('is-visible');
      wrap.setAttribute('aria-hidden', 'false');
      if (input) {
        setTimeout(function () { input.focus(); }, 120);
      }
    } else {
      wrap.classList.remove('is-visible');
      wrap.setAttribute('aria-hidden', 'true');
    }
  }

  function setupGuestbookSourceListeners() {
    var form = document.getElementById('guestbook-form');
    if (!form) return;
    var radios = form.querySelectorAll('input[name="source"]');
    radios.forEach(function (radio) {
      radio.addEventListener('change', function () {
        toggleGuestbookOther(this);
      });
    });
  }

  function openGuestbook() {
    var modal = document.getElementById('guestbook-modal');
    if (!modal) return;
    var dialog = modal.querySelector('.guestbook-dialog');
    if (dialog) {
      dialog.style.height = '';
    }
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setupGuestbookSourceListeners();
  }

  function closeGuestbook(e, force) {
    var modal = document.getElementById('guestbook-modal');
    if (!modal) return;
    if (force || e.target === modal) {
      modal.classList.add('closing');
      setTimeout(function () {
        modal.classList.remove('active', 'closing');
        document.body.style.overflow = '';
        var dialog = modal.querySelector('.guestbook-dialog');
        if (dialog) dialog.style.height = '';
      }, 200);
    }
  }

  function submitGuestbook(e) {
    e.preventDefault();
    var modal = document.getElementById('guestbook-modal');
    if (!modal) return;
    var dialog = modal.querySelector('.guestbook-dialog');
    var body = document.getElementById('guestbook-body');
    if (!dialog || !body) return;

    var startHeight = dialog.getBoundingClientRect().height;
    dialog.style.height = startHeight + 'px';

    var currentPane = body.querySelector('.guestbook-content-pane') || body;
    currentPane.classList.add('is-crossfading-out');

    setTimeout(function () {
      body.innerHTML = `
        <div class="guestbook-content-pane is-crossfading-in">
          <div class="guestbook-success-state">
            <svg class="guestbook-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div class="guestbook-success-msg">Thank you for your feedback!</div>
            <div class="guestbook-success-sub">Your note has been received with thanks.</div>
            <button type="button" class="guestbook-dodge-btn" id="guestbook-dodge-btn">Close</button>
          </div>
        </div>
      `;

      var newPane = body.querySelector('.guestbook-content-pane');
      dialog.style.height = 'auto';
      /* The Close button only exists from here on, so the dodge field can only
         be attached once the success state is in the DOM. */
      attachGuestbookDodge();
      var targetHeight = dialog.getBoundingClientRect().height;
      dialog.style.height = startHeight + 'px';

      /* Force layout reflow before tweening height and crossfading in */
      dialog.offsetHeight;

      dialog.style.height = targetHeight + 'px';

      requestAnimationFrame(function () {
        if (newPane) {
          newPane.classList.remove('is-crossfading-in');
        }
      });
    }, 220);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('guestbook-modal');
      if (modal && modal.classList.contains('active')) {
        closeGuestbook(e, true);
      }
    }
  });

  /* The post-submit Close button runs away from the pointer. The dialog itself
     is the field, and `escape` lets it travel past the dialog edges without ever
     producing a scrollbar. See assets/js/dodge-field.js. The button only exists
     after submit, so the field is attached when the success state renders. */
  function attachGuestbookDodge() {
    var dialog = document.querySelector('#guestbook-modal .guestbook-dialog');
    var btn = document.getElementById('guestbook-dodge-btn');
    if (!dialog || !btn) return;

    if (window.guestbookDodge) {
      window.guestbookDodge.destroy();
      window.guestbookDodge = null;
    }

    if (!window.DodgeField) {
      btn.addEventListener('click', function (e) { closeGuestbook(e, true); });
      return;
    }

    window.guestbookDodge = DodgeField.create(dialog, btn, {
      escape: 56,
      /* Softer than the demo's 2: on a wide button the default curve is so flat
         at mid distances that the button shifts only a few px and the cursor
         stays on it. */
      falloff: 1.2,
      inkColor: 'var(--text-color)',
      contrastColor: 'var(--main-bg, #18181b)',
      onCatch: function () { closeGuestbook(null, true); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachGuestbookDodge);
  } else {
    attachGuestbookDodge();
  }
</script>

<script src="{{ '/assets/js/toast.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/dodge-field.js' | relative_url }}" defer></script>
