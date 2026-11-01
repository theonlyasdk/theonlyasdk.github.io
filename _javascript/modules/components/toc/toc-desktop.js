export class TocDesktop {
  /* Tocbot options Ref: https://github.com/tscanlin/tocbot#usage */
  static options = {
    tocSelector: '#toc',
    contentSelector: '.content',
    ignoreSelector: '[data-toc-skip]',
    headingSelector: 'h2, h3, h4',
    orderedList: false,
    scrollSmooth: false,
    // tocbot 4 defaults collapseDepth to 0 (collapse everything); 6
    // effectively disables collapsing for h2/h3/h4 outlines.
    collapseDepth: 6,
    headingsOffset: 16 * 2 // 2rem
  };

  static refresh() {
    tocbot.refresh(this.options);
  }

  static init() {
    tocbot.init(this.options);
  }
}
