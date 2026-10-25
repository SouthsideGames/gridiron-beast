#!/usr/bin/env node
// Release stamp (v42.4.1): writes the release number from src/version.js into index.html — the ?v= on the stylesheet and on
// src/main.js, and an import map (<script type="importmap" id="gb-modules">) that sends every game module, however deeply it is
// imported, to its ?v=<release> URL. A phone that cached an older release then fetches every changed file instead of mixing old
// and new modules. Run after bumping src/version.js; tests/release-stamp.test.js fails if index.html is out of date.
//   node tools/stamp-release.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_RE = /(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
/** Every module reachable from src/main.js (static and dynamic imports), as paths relative to the root. */
export function gameModules(root = ROOT) {
  const seen = new Set(); const stack = ['src/main.js'];
  while (stack.length) {
    const f = stack.pop(); if (seen.has(f) || !fs.existsSync(path.join(root, f))) continue; seen.add(f);
    for (const m of fs.readFileSync(path.join(root, f), 'utf8').matchAll(IMPORT_RE)) { const spec = m[1] || m[2] || m[3]; if (spec.startsWith('.')) stack.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), spec.split('?')[0]))); }
  }
  return [...seen].sort();
}
export async function releaseNumber(root = ROOT) { const { BUILD } = await import(path.join(root, 'src/version.js')); return BUILD.version.replace(/^v/, '').split('-')[0]; }
export function stampedIndex(html, v, modules) {
  const map = JSON.stringify({ imports: Object.fromEntries(modules.map((m) => [`./${m}`, `./${m}?v=${v}`])) });
  let out = html.replace(/styles\/app\.css\?v=[\w.]+/, `styles/app.css?v=${v}`).replace(/src\/main\.js\?v=[\w.]+/, `src/main.js?v=${v}`);
  out = out.replace(/<script type="importmap" id="gb-modules">[\s\S]*?<\/script>\n?/, '').replace(/<script type="module" src="src\/fresh\.js[^"]*"><\/script>\n?/, '');
  return out.replace(/(<script type="module" src="src\/main\.js)/, `<script type="importmap" id="gb-modules">${map}</script>\n<script type="module" src="src/fresh.js?v=${v}"></script>\n$1`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const v = await releaseNumber(); const file = path.join(ROOT, 'index.html'); const html = fs.readFileSync(file, 'utf8');
  const next = stampedIndex(html, v, gameModules());
  if (process.argv.includes('--check')) { console.log(next === html ? `index.html is stamped for ${v}` : `index.html is NOT stamped for ${v}`); process.exit(next === html ? 0 : 1); }
  fs.writeFileSync(file, next); console.log(`stamped index.html for ${v}: ${gameModules().length} modules`);
}
