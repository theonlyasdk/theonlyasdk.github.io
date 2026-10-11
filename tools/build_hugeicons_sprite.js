/**
 * Builds the vendored Hugeicons status sprite used by assets/js/toast.js.
 *
 * Source of truth is the `@hugeicons/core-free-icons` npm package (MIT,
 * https://github.com/hugeicons/hugeicons). We vendor the handful of icons the
 * site needs as plain SVGs rather than pulling a CDN at runtime, so the toasts
 * have no third-party network dependency.
 *
 * Usage:
 *   npm pack @hugeicons/core-free-icons
 *   tar -xzf hugeicons-core-free-icons-*.tgz
 *   node tools/build_hugeicons_sprite.js <path-to-extracted-package>
 */

const fs = require('fs');
const path = require('path');

const pkgDir = process.argv[2] || path.join(process.cwd(), 'hugedl', 'package');
const SRC = path.join(pkgDir, 'dist', 'esm');
const OUT = path.join(__dirname, '..', 'assets', 'icons', 'hugeicons.svg');

/* status -> source module in @hugeicons/core-free-icons */
const ICONS = {
  success: 'CheckmarkCircle02Icon',
  error: 'CancelCircleIcon',
  warning: 'AlertCircleIcon',
  info: 'InformationCircleIcon',
  loading: 'Loading01Icon'
};

/* Parse the package's `[["path", { d, ...attrs }], ...]` array literal.
   The keys are unquoted JS identifiers, so quote them before JSON.parse. */
function parseIcon(file) {
  const src = fs.readFileSync(path.join(SRC, file + '.js'), 'utf8');
  const body = src.slice(src.indexOf('['), src.indexOf('];') + 1);
  const quoted = body.replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*):/g, '$1"$2"$3:');
  const attrs = JSON.parse(quoted.replace(/,(\s*\])\s*$/, '$1'));
  return attrs.map(([tag, a]) => {
    const { key, ...rest } = a;
    // React-style camelCase props must be kebab-cased for raw SVG output.
    const pairs = Object.entries(rest)
      .map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())}="${v}"`)
      .join(' ');
    return `      <${tag} ${pairs} />`;
  });
}

const symbols = Object.entries(ICONS).map(([name, file]) => {
  const body = parseIcon(file).join('\n');
  return `  <symbol id="hugeicons-${name}" viewBox="0 0 24 24">\n${body}\n  </symbol>`;
});

const sprite = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Hugeicons status icons, vendored from @hugeicons/core-free-icons (MIT).
  https://github.com/hugeicons/hugeicons
  Regenerate: node tools/build_hugeicons_sprite.js <extracted-package-dir>
-->
<svg xmlns="http://www.w3.org/2000/svg" style="display: none">
${symbols.join('\n')}
</svg>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, sprite, 'utf8');
console.log('Wrote ' + OUT);
