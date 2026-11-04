/**
 * Scroll Restoration for blog post navigation.
 *
 * Remembers the visitor's scroll position when navigating from the
 * post listing (home page or paginated pages) into a blog post, and
 * restores that exact scroll position when returning via the browser Back
 * button, back gesture, or header/sidebar navigation.
 */
(function () {
  'use strict';

  var PREFIX = 'asdk_scroll_';
  var NAV_KEY = 'asdk_nav_from';

  function isListingPage(path) {
    if (!path) return false;
    /* Main home page or paginated page (e.g. /, /index.html, /page2/, /page2/index.html) */
    return path === '/' || path === '/index.html' || /^\/page\d+(\/|$)/.test(path);
  }

  function isPostPage(path) {
    if (!path) return false;
    return path.indexOf('/posts/') !== -1;
  }

  function saveCurrentScroll() {
    try {
      var path = window.location.pathname;
      if (!isListingPage(path)) return;
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      sessionStorage.setItem(PREFIX + path, String(Math.round(y)));
    } catch (err) {
      /* SessionStorage might be unavailable or quota exceeded */
    }
  }

  /* Listen to clicks on links: if clicking into a post from a listing page,
     save scroll position immediately and flag the origin. */
  document.addEventListener(
    'click',
    function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || !a.href) return;

      var currentPath = window.location.pathname;
      if (!isListingPage(currentPath)) return;

      if (a.origin === window.location.origin) {
        saveCurrentScroll();
        try {
          sessionStorage.setItem(NAV_KEY, currentPath);
        } catch (err) {}
      }
    },
    true
  );

  /* Continuously keep the scroll position up to date with a throttled scroll listener */
  var scrollTicking = false;
  window.addEventListener(
    'scroll',
    function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(function () {
          saveCurrentScroll();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  /* Save when leaving page */
  window.addEventListener('pagehide', saveCurrentScroll);
  window.addEventListener('beforeunload', saveCurrentScroll);

  function shouldRestore() {
    var path = window.location.pathname;
    if (!isListingPage(path)) return false;

    /* 1. Browser traversal / back-forward navigation */
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'back_forward') return true;
    } catch (err) {}

    try {
      if (
        window.navigation &&
        window.navigation.activation &&
        window.navigation.activation.navigationType === 'traverse'
      ) {
        return true;
      }
    } catch (err) {}

    /* 2. Returning from a post (e.g. Back button, or clicking Home / logo) */
    var referrer = document.referrer || '';
    if (isPostPage(referrer)) return true;

    try {
      var lastNav = sessionStorage.getItem(NAV_KEY);
      if (lastNav && lastNav === path) return true;
    } catch (err) {}

    return false;
  }

  function restoreScroll() {
    if (!shouldRestore()) return;

    var path = window.location.pathname;
    var savedY = null;
    try {
      savedY = sessionStorage.getItem(PREFIX + path);
    } catch (err) {}

    var targetY = parseInt(savedY, 10);
    if (isNaN(targetY) || targetY <= 0) return;

    /* Tell browser history to not fight manual scroll restoration */
    if ('scrollRestoration' in history) {
      try {
        history.scrollRestoration = 'manual';
      } catch (err) {}
    }

    var attempts = 0;
    var maxAttempts = 80; /* ~1.3s maximum */
    var userInteracted = false;

    function onUserInteraction() {
      userInteracted = true;
      cleanup();
    }

    function cleanup() {
      window.removeEventListener('wheel', onUserInteraction, { passive: true });
      window.removeEventListener('touchstart', onUserInteraction, { passive: true });
      window.removeEventListener('pointerdown', onUserInteraction, { passive: true });
      window.removeEventListener('keydown', onUserInteraction, { passive: true });
    }

    window.addEventListener('wheel', onUserInteraction, { passive: true });
    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('pointerdown', onUserInteraction, { passive: true });
    window.addEventListener('keydown', onUserInteraction, { passive: true });

    function step() {
      if (userInteracted) return;

      window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

      var currentY = window.scrollY || document.documentElement.scrollTop || 0;
      if (Math.abs(currentY - targetY) <= 3) {
        cleanup();
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        window.requestAnimationFrame(step);
      } else {
        cleanup();
      }
    }

    step();
  }

  /* Trigger restoration at earliest lifecycle moments */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreScroll);
  } else {
    restoreScroll();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted || shouldRestore()) {
      restoreScroll();
    }
  });

  if ('onpagereveal' in window) {
    window.addEventListener('pagereveal', function (e) {
      if (e.viewTransition && e.viewTransition.ready) {
        e.viewTransition.ready.then(restoreScroll, restoreScroll);
      } else {
        restoreScroll();
      }
    });
  }
})();
