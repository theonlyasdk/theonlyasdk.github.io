#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const siteDir = process.argv[2] || path.join(__dirname, '..', '_site');

if (!fs.existsSync(siteDir)) {
  console.error(`Error: Directory not found: ${siteDir}`);
  process.exit(1);
}

let checkedScripts = 0;
let errors = 0;

function walkDir(dir) {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (item.endsWith('.html')) {
      checkHtmlFile(fullPath);
    }
  }
}

function checkHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;

  while ((match = scriptRegex.exec(content)) !== null) {
    count++;
    const attrs = match[1] || '';
    const body = match[2].trim();

    // Skip external scripts and JSON blocks
    if (attrs.includes('src=') ||
        attrs.includes('application/ld+json') ||
        attrs.includes('application/json') ||
        body.length === 0) {
      continue;
    }

    checkedScripts++;
    try {
      new vm.Script(body);
    } catch (err) {
      errors++;
      const relPath = path.relative(path.join(__dirname, '..'), filePath);
      console.error(`[SYNTAX ERROR] ${relPath} (Script #${count}): ${err.message}`);
    }
  }
}

walkDir(siteDir);

if (errors > 0) {
  console.error(`\nFailed: Found ${errors} inline script syntax error(s) across ${checkedScripts} scripts checked.`);
  process.exit(1);
} else {
  console.log(`Success: Verified ${checkedScripts} inline scripts across generated HTML with 0 errors.`);
  process.exit(0);
}
