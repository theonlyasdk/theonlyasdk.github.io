---
# the default layout is 'page'
icon: fas fa-book-open
order: 5
---

<style>
  /* Show "Resources" heading in mobile view for resources page: big font, centered */
  @media all and (max-width: 849px) {
    h1.dynamic-title {
      display: block !important;
      text-align: center;
      font-size: 2.25rem;
      font-weight: 700;
      margin-top: 1.25rem;
      margin-bottom: 1.5rem;
    }
    #topbar-title {
      visibility: hidden;
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
    overflow: hidden;
    animation: gbZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
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
  .guestbook-success-state {
    padding: 2rem 1rem;
    text-align: center;
    animation: gbZoomIn 0.3s ease-out both;
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
</style>

<marquee class="fading-marquee" behavior="scroll" direction="left" scrollamount="6"><span class="star-edge">★</span> Welcome to my Resources page ★ Cheatsheets, tutorials and curated collections ★ New links added regularly ★ Don't forget to sign the guestbook <span class="star-edge">★</span></marquee>

<p class="text-center">
  <span class="post-tag">printer-friendly</span>
  <span class="post-tag">hand-curated</span>
  <span class="post-tag">bookmark-worthy</span>
</p>

<p class="text-center">You are visitor <strong>#<span id="hit-count">1</span></strong>. <em>Last updated: {{ 'now' | date: '%B %d, %Y' }}.</em></p>

<script>
  // Global hit counter (CountAPI, no signup) with per-browser fallback.
  (function () {
    var el = document.getElementById('hit-count');
    function localFallback() {
      try {
        var n = parseInt(localStorage.getItem('resources-hits') || '0', 10) + 1;
        localStorage.setItem('resources-hits', String(n));
        el.textContent = n;
      } catch (e) { el.textContent = '1'; }
    }
    fetch('https://countapi.mileshilliard.com/api/v1/hit/theonlyasdk-resources')
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (d) {
        if (d && typeof d.value === 'number') el.textContent = d.value;
        else localFallback();
      })
      .catch(localFallback);
  })();
</script>

> Pardon our dust — the Tutorials wing is still under construction!
{: .prompt-warning }

## ✦ Printables

Short, print-friendly references for the desk or the workshop wall.

- 🖨 **[Printable Page Borders](/resources/page-designs/)** — Solid fills, bordered pages, PAL test chart - print-ready PDF downloads!<span class="post-tag shake-new">NEW!</span>
- ★ **[Linux Command Cheatsheet](#)** — the 20% of commands that cover 80% of terminal work.
- ★ **[Git Survival Sheet](#)** — init to rebase, plus how to undo almost anything.
- ★ **[Regex Quick Reference](#)** — character classes, quantifiers and lookarounds on one page.

## ✦ Tutorials

Longer guides worth working through end to end.

- ★ **[Terminal Basics](#)** — from zero to comfortable on the command line. <span class="post-tag shake-new">NEW!</span>
- ★ **[Dotfiles From Scratch](#)** — version-control your setup like a grown-up.
- ★ **[Self-Hosting 101](#)** — put your own services on your own hardware.

## ✦ Collections

Curated piles of links for rabbit-hole days.

- ★ **[Awesome Self-Hosted](#)** — community-maintained list of self-hostable software.
- ★ **[Awesome Command Line](#)** — tools, dotfiles and reading for terminal enjoyers.
- ★ **[My Reading Shelf](#)** — essays and docs I re-read every year.

## ✦ Tools & References

Bookmark-grade utilities and lookup pages.

- ★ **[Explainshell](#)** — paste a command, learn what each flag does.
- ★ **[DevDocs](#)** — offline-capable API documentation in one place.
- ★ **[Can I Use](#)** — browser support tables for web features.

---

<p class="text-center">.:*~*:._.:*~*:<strong>THANKS FOR THE VISIT</strong>:*~*:._.:*~*:.</p>

<p class="text-center"><a href="#">&larr; prev</a> | <a href="#">random</a> | <a href="#">ring index</a> | <a href="#">next &rarr;</a></p>

<p class="text-center"><button type="button" class="guestbook-trigger" onclick="openGuestbook()">&#9998; Sign my guestbook</button> — tell me where you came from!</p>

<div id="guestbook-modal" class="guestbook-overlay" onclick="closeGuestbook(event)">
  <div class="guestbook-dialog" role="dialog" aria-modal="true" aria-labelledby="guestbook-title" onclick="event.stopPropagation()">
    <div class="guestbook-header">
      <h4 id="guestbook-title">Sign the Guestbook</h4>
      <button type="button" class="guestbook-close-btn" aria-label="Close" onclick="closeGuestbook(event, true)">&times;</button>
    </div>
    <div class="guestbook-body" id="guestbook-body">
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
            <input type="radio" name="source" value="Other">
            <span>Somewhere else</span>
          </label>
        </div>
        <label for="guestbook-msg" style="display: block; font-size: 0.9rem; margin-bottom: 0.35rem; color: var(--text-muted-color);">Leave a quick hello or note (optional):</label>
        <textarea id="guestbook-msg" class="guestbook-msg-input" rows="3" placeholder="What brought you here or what did you like?"></textarea>
        <button type="submit" class="guestbook-submit-btn">Submit</button>
      </form>
    </div>
  </div>
</div>

<script>
  function openGuestbook() {
    var modal = document.getElementById('guestbook-modal');
    if (!modal) return;
    modal.classList.remove('closing');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeGuestbook(e, force) {
    var modal = document.getElementById('guestbook-modal');
    if (!modal) return;
    if (force || e.target === modal) {
      modal.classList.add('closing');
      setTimeout(function () {
        modal.classList.remove('active', 'closing');
        document.body.style.overflow = '';
      }, 200);
    }
  }

  function submitGuestbook(e) {
    e.preventDefault();
    var body = document.getElementById('guestbook-body');
    if (!body) return;
    body.innerHTML = `
      <div class="guestbook-success-state">
        <svg class="guestbook-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div class="guestbook-success-msg">Thank you for your feedback!</div>
        <div class="guestbook-success-sub">Your note has been received with thanks.</div>
        <button type="button" class="guestbook-submit-btn" style="max-width: 160px; margin: 0 auto; display: block;" onclick="closeGuestbook(event, true)">Close</button>
      </div>
    `;
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('guestbook-modal');
      if (modal && modal.classList.contains('active')) {
        closeGuestbook(e, true);
      }
    }
  });
</script>
