/* ==========================================================================
   Wikipedia-Style Tech Jargon Hover Cards
   - Scans .content on post layouts to wrap first mention per section in <dfn>.
   - Displays anchored floating preview card on hover (desktop) or tap (mobile).
   - Skips headings, code blocks, existing links, and handles bounds clamping.
   ========================================================================== */

(function () {
  'use strict';

  var activeTrigger = null;
  var cardEl = null;
  var titleEl = null;
  var badgeEl = null;
  var summaryEl = null;
  var linkEl = null;
  var linkTextEl = null;
  var closeBtnEl = null;

  var openTimer = null;
  var closeTimer = null;
  var cachedGlossary = null;

  /* Helper to escape regex special characters */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* Create and append floating preview card to document.body */
  function ensureCardElement() {
    if (cardEl) return cardEl;

    var container = document.createElement('div');
    container.id = 'jargon-hovercard';
    container.className = 'jargon-hovercard place-above';
    container.setAttribute('role', 'dialog');
    container.setAttribute('aria-hidden', 'true');
    container.setAttribute('tabindex', '-1');

    container.innerHTML =
      '<div class="jargon-hovercard-arrow" aria-hidden="true"></div>' +
      '<div class="jargon-hovercard-inner">' +
        '<div class="jargon-hovercard-header">' +
          '<div class="jargon-hovercard-title-wrap">' +
            '<h3 class="jargon-hovercard-title"></h3>' +
            '<span class="jargon-hovercard-badge"></span>' +
          '</div>' +
          '<button type="button" class="jargon-hovercard-close" aria-label="Close term explanation">' +
            '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">' +
              '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 0 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="jargon-hovercard-body">' +
          '<p class="jargon-hovercard-summary"></p>' +
        '</div>' +
        '<div class="jargon-hovercard-footer">' +
          '<a class="jargon-hovercard-link" href="#" target="_blank" rel="noopener noreferrer">' +
            '<span class="jargon-hovercard-link-text">Learn more</span>' +
            '<svg class="jargon-hovercard-link-icon" viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">' +
              '<path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>' +
              '<path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>' +
            '</svg>' +
          '</a>' +
        '</div>' +
      '</div>';

    document.body.appendChild(container);

    cardEl = container;
    titleEl = container.querySelector('.jargon-hovercard-title');
    badgeEl = container.querySelector('.jargon-hovercard-badge');
    summaryEl = container.querySelector('.jargon-hovercard-summary');
    linkEl = container.querySelector('.jargon-hovercard-link');
    linkTextEl = container.querySelector('.jargon-hovercard-link-text');
    closeBtnEl = container.querySelector('.jargon-hovercard-close');

    /* Mouse enter on the card preserves visibility for reading/clicking link */
    cardEl.addEventListener('mouseenter', function () {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    });

    /* Mouse leave on card initiates close grace period */
    cardEl.addEventListener('mouseleave', function () {
      scheduleClose();
    });

    /* Close button handler */
    closeBtnEl.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      hideCard();
      if (activeTrigger) {
        activeTrigger.focus();
      }
    });

    /* Keyboard navigation inside card */
    cardEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        hideCard();
        if (activeTrigger) {
          activeTrigger.focus();
        }
      }
    });

    return cardEl;
  }

  /* Schedule card reveal with delay to avoid flicker when pointer brushes past */
  function scheduleOpen(triggerEl, termKey) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (openTimer) {
      clearTimeout(openTimer);
    }
    openTimer = window.setTimeout(function () {
      showCard(triggerEl, termKey);
    }, 120);
  }

  /* Schedule card dismissal with grace delay */
  function scheduleClose() {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    if (closeTimer) {
      clearTimeout(closeTimer);
    }
    closeTimer = window.setTimeout(function () {
      hideCard();
    }, 220);
  }

  /* Position and reveal the hover card */
  function showCard(triggerEl, termKey) {
    if (!cachedGlossary || !cachedGlossary[termKey]) return;
    var data = cachedGlossary[termKey];

    ensureCardElement();

    /* Populate content */
    titleEl.textContent = data.term || termKey;
    if (data.category) {
      badgeEl.textContent = data.category;
      badgeEl.style.display = 'inline-block';
    } else {
      badgeEl.style.display = 'none';
    }
    summaryEl.textContent = data.summary || '';

    if (data.url) {
      linkEl.href = data.url;
      linkEl.style.display = 'inline-flex';
      var isWiki = data.url.indexOf('wikipedia.org') !== -1;
      linkTextEl.textContent = isWiki ? 'Wikipedia article' : 'Official documentation';
    } else {
      linkEl.style.display = 'none';
      linkEl.removeAttribute('href');
    }

    if (activeTrigger && activeTrigger !== triggerEl) {
      activeTrigger.setAttribute('aria-expanded', 'false');
    }
    activeTrigger = triggerEl;
    triggerEl.setAttribute('aria-expanded', 'true');

    /* Measuring layout */
    cardEl.classList.remove('is-visible', 'place-above', 'place-below');
    cardEl.classList.add('is-measuring');

    var rect = triggerEl.getBoundingClientRect();
    var cardW = cardEl.offsetWidth || 330;
    var cardH = cardEl.offsetHeight || 160;
    var viewW = window.innerWidth;
    var viewH = window.innerHeight;
    var gap = 10;
    var margin = 12;

    /* Determine vertical placement: prefer above, flip below if cramped */
    var spaceAbove = rect.top;
    var spaceBelow = viewH - rect.bottom;
    var placeAbove = true;

    if (spaceAbove < cardH + gap + margin && spaceBelow > spaceAbove) {
      placeAbove = false;
    }

    var top = 0;
    if (placeAbove) {
      top = rect.top - cardH - gap;
      cardEl.classList.add('place-above');
    } else {
      top = rect.bottom + gap;
      cardEl.classList.add('place-below');
    }

    /* Horizontal clamping */
    var triggerCenter = rect.left + rect.width / 2;
    var idealLeft = triggerCenter - cardW / 2;
    var left = Math.max(margin, Math.min(idealLeft, viewW - cardW - margin));

    /* Arrow horizontal offset pointing at trigger center */
    var arrowOffset = triggerCenter - left;
    arrowOffset = Math.max(16, Math.min(arrowOffset, cardW - 16));

    cardEl.style.setProperty('--arrow-offset-x', arrowOffset + 'px');
    cardEl.style.left = left + 'px';
    cardEl.style.top = top + 'px';

    /* Make card visible */
    cardEl.classList.remove('is-measuring');
    cardEl.classList.add('is-visible');
    cardEl.setAttribute('aria-hidden', 'false');
  }

  /* Hide the hover card */
  function hideCard() {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (activeTrigger) {
      activeTrigger.setAttribute('aria-expanded', 'false');
      activeTrigger = null;
    }
    if (cardEl) {
      cardEl.classList.remove('is-visible');
      cardEl.setAttribute('aria-hidden', 'true');
    }
  }

  /* Scan DOM within .content, wrapping first occurrence per section in <dfn> */
  function scanContent(contentEl, glossary) {
    if (!contentEl || contentEl.dataset.glossaryScanned === 'true') return;
    contentEl.dataset.glossaryScanned = 'true';

    /* Build phrase mapping and master regex */
    var phraseMap = {};
    var phrases = [];

    var keys = Object.keys(glossary);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var entry = glossary[key];
      if (!entry) continue;

      var termPhrases = [key];
      if (entry.term) termPhrases.push(entry.term);
      if (Array.isArray(entry.aliases)) {
        for (var a = 0; a < entry.aliases.length; a++) {
          termPhrases.push(entry.aliases[a]);
        }
      }

      for (var p = 0; p < termPhrases.length; p++) {
        var rawPhrase = termPhrases[p];
        if (!rawPhrase || typeof rawPhrase !== 'string') continue;
        var trimmed = rawPhrase.trim();
        if (trimmed.length < 2) continue;
        var lower = trimmed.toLowerCase();
        if (!phraseMap[lower]) {
          phraseMap[lower] = key;
          phrases.push(trimmed);
        }
      }
    }

    if (phrases.length === 0) return;

    /* Sort phrases by length descending so multi-word phrases match first */
    phrases.sort(function (a, b) {
      return b.length - a.length;
    });

    var regexParts = [];
    for (var r = 0; r < phrases.length; r++) {
      var ph = phrases[r];
      var escaped = escapeRegExp(ph);
      if (/^\w/.test(ph)) escaped = '\\b' + escaped;
      if (/\w$/.test(ph)) escaped = escaped + '\\b';
      regexParts.push(escaped);
    }

    var masterRegex = new RegExp(regexParts.join('|'), 'gi');
    var seenInCurrentSection = new Set();

    /* Process a single Text node */
    function processTextNode(textNode) {
      var text = textNode.textContent;
      if (!text || text.trim().length === 0) return;

      masterRegex.lastIndex = 0;
      var match = masterRegex.exec(text);

      while (match) {
        var matchedText = match[0];
        var matchIndex = match.index;
        var lookupKey = matchedText.toLowerCase();
        var termKey = phraseMap[lookupKey];
        var termDef = glossary[termKey];

        if (termDef) {
          /* Check exact_case if required */
          var isCaseValid = true;
          if (termDef.exact_case && matchedText !== termDef.term) {
            isCaseValid = false;
          }

          if (isCaseValid && !seenInCurrentSection.has(termKey)) {
            seenInCurrentSection.add(termKey);

            var matchNode = textNode.splitText(matchIndex);
            var restNode = matchNode.splitText(matchedText.length);

            var dfn = document.createElement('dfn');
            dfn.className = 'jargon-term';
            dfn.setAttribute('data-jargon', termKey);
            dfn.setAttribute('tabindex', '0');
            dfn.setAttribute('role', 'button');
            dfn.setAttribute('aria-haspopup', 'dialog');
            dfn.setAttribute('aria-expanded', 'false');
            dfn.textContent = matchedText;

            matchNode.parentNode.replaceChild(dfn, matchNode);

            /* Attach interactive events to the newly created <dfn> */
            attachTriggerEvents(dfn, termKey);

            /* Recurse on the remaining text slice */
            processTextNode(restNode);
            return;
          }
        }

        match = masterRegex.exec(text);
      }
    }

    /* Depth-first walker tracking section boundaries */
    function walk(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        var tag = node.tagName.toUpperCase();

        /* Headings H2, H3, H4 delimit sections */
        if (tag === 'H2' || tag === 'H3' || tag === 'H4') {
          seenInCurrentSection.clear();
          return; /* Skip scanning inside heading text */
        }

        /* Skip headings, links, code blocks, form elements, svg, and existing dfns */
        if (tag === 'H1' || tag === 'H5' || tag === 'H6' ||
            tag === 'A' || tag === 'PRE' || tag === 'CODE' ||
            tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' ||
            tag === 'SVG' || tag === 'MATH' || tag === 'BUTTON' ||
            tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
            tag === 'DFN') {
          return;
        }

        if (node.classList && (
            node.classList.contains('jargon-term') ||
            node.classList.contains('no-glossary') ||
            node.classList.contains('highlight') ||
            node.classList.contains('rouge-code'))) {
          return;
        }

        var child = node.firstChild;
        while (child) {
          var next = child.nextSibling;
          walk(child);
          child = next;
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
      }
    }

    walk(contentEl);
  }

  /* Attach hover, tap, and keyboard events to <dfn> elements */
  function attachTriggerEvents(dfn, termKey) {
    /* Pointer / mouse hover entry */
    dfn.addEventListener('mouseenter', function () {
      scheduleOpen(dfn, termKey);
    });

    /* Pointer / mouse hover exit */
    dfn.addEventListener('mouseleave', function () {
      scheduleClose();
    });

    /* Keyboard focus */
    dfn.addEventListener('focus', function () {
      scheduleOpen(dfn, termKey);
    });

    /* Keyboard blur */
    dfn.addEventListener('blur', function (e) {
      if (cardEl && cardEl.contains(e.relatedTarget)) {
        return;
      }
      scheduleClose();
    });

    /* Keyboard activation */
    dfn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        showCard(dfn, termKey);
        if (closeBtnEl) {
          closeBtnEl.focus();
        }
      } else if (e.key === 'Escape') {
        hideCard();
      }
    });

    /* Click / Touch tap toggle */
    dfn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (activeTrigger === dfn && cardEl && cardEl.classList.contains('is-visible')) {
        hideCard();
      } else {
        showCard(dfn, termKey);
      }
    });
  }

  /* Global listener to dismiss hovercard when tapping outside or scrolling */
  function setupGlobalDismiss() {
    /* Dismiss on click/touch outside */
    document.addEventListener('pointerdown', function (e) {
      if (!cardEl || !cardEl.classList.contains('is-visible')) return;
      if (cardEl.contains(e.target) || (e.target.closest && e.target.closest('.jargon-term'))) {
        return;
      }
      hideCard();
    });

    /* Dismiss on page scroll so floating card never detaches from its anchor */
    window.addEventListener('scroll', function () {
      if (cardEl && cardEl.classList.contains('is-visible')) {
        hideCard();
      }
    }, { passive: true });

    /* Dismiss on window resize to avoid stale coordinates */
    window.addEventListener('resize', function () {
      if (cardEl && cardEl.classList.contains('is-visible')) {
        hideCard();
      }
    }, { passive: true });
  }

  /* Initialize the glossary scan on the page */
  function init() {
    var contentEl = document.querySelector('.content');
    if (!contentEl) return;

    setupGlobalDismiss();

    /* Check for embedded glossary data in HTML */
    var embeddedScript = document.getElementById('glossary-data');
    if (embeddedScript && embeddedScript.textContent) {
      try {
        var parsed = JSON.parse(embeddedScript.textContent);
        if (parsed && typeof parsed === 'object') {
          cachedGlossary = parsed;
          scanContent(contentEl, cachedGlossary);
          return;
        }
      } catch (err) {
        /* Fallback to fetch if parse fails */
      }
    }

    /* Fetch fallback from assets/js/data/glossary.json */
    var url = '/assets/js/data/glossary.json';
    if (window.siteUrl && typeof window.siteUrl === 'function') {
      url = window.siteUrl(url);
    }

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Glossary load failed');
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data === 'object') {
          cachedGlossary = data;
          scanContent(contentEl, cachedGlossary);
        }
      })
      .catch(function () {
        /* Silently fail if glossary cannot be fetched */
      });
  }

  /* Run once DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
