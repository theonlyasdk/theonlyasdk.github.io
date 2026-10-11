/**
 * The canonical Logger implementation for the site.
 *
 * This is the single source of truth: `_javascript/` is a Rollup source
 * directory that is NOT copied into the built site, so every script that
 * reaches the browser must define its code here in `assets/js/`.
 *
 * Loaded as a plain (non-module) script; it defines a global `Logger`
 * that standalone scripts such as `assets/js/projects-loader.js` use.
 */
class Logger {
  constructor(prefix) {
    this.prefix = prefix;
  }

  buildString(string) { return `${this.prefix}: ${string}`; }
  error(string) { console.error(this.buildString(string)); }
  log(string) { console.log(this.buildString(string)); }
  warn(string) { console.warn(this.buildString(string)); }
}

if (typeof window !== 'undefined') {
  window.Logger = Logger;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Logger };
}
