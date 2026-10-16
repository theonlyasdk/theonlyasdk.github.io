/**
 * Hero title transition - desktop.
 *
 * Names the post title a visitor is heading for, so the cross-document view
 * transition (_sass/base/_view-transition.scss) can morph it out of the card
 * title they clicked instead of just swapping the page.
 *
 * The name has to be on the element while the *old* page is being snapshotted,
 * and that happens when the navigation starts: after `pointerdown`, before
 * `click`. So the name is set from a `pointerdown` listener rather than from
 * the link's own click handler.
 *
 * Desktop only - the mobile transition slides the whole page instead, and a
 * named element would fight that. The media query is re-checked on every press
 * rather than once at load, so a window resized across the breakpoint still
 * behaves.
 *
 * Loaded by `_layouts/home.html`.
 */
(() => {
  'use strict';

  const NAME = 'post-hero';
  const DESKTOP = window.matchMedia('(min-width: 769px)');

  /** The element currently carrying the name, if any. */
  let named = null;

  /**
   * Moves the name onto `el`, clearing it from whatever held it before. A name
   * may only be on one element at a time, and a stale one would animate the
   * wrong card.
   */
  function name(el) {
    if (named === el) return;

    if (named) named.style.viewTransitionName = '';
    named = el;

    if (el) el.style.viewTransitionName = NAME;
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      /* Pressing anywhere on a post card counts - the whole card is one link -
         but the name goes on its title, since that is the thing that flies. */
      const link = DESKTOP.matches ? target.closest('a') : null;

      name(link ? link.querySelector('.card-title') : null);
    },
    true
  );

  /* Keyboard activation never fires pointerdown, so name the card the same way
     when Enter is pressed on a focused link - and clear the name when it is
     pressed anywhere else, since a name with no counterpart on the new page
     would ghost the card title across the navigation. */
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key !== 'Enter' || event.repeat) return;

      const target = event.target;
      const link = DESKTOP.matches && target instanceof Element ? target.closest('a') : null;

      name(link ? link.querySelector('.card-title') : null);
    },
    true
  );

  /* A bfcache restore brings the page back exactly as it was left, name
     included - which is what makes going back morph the title home again. A
     fresh load starts clean. */
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) name(null);
  });
})();
