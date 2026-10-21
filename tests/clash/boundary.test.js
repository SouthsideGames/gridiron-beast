// Beast Clash isolation: the engine imports nothing from the football sim, franchise, calendar or save code, and nothing
// there imports it; the engine files contain no randomness, clock, DOM or storage access; the save schema is untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = new URL('../../', import.meta.url).pathname;
const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(path.join(dir, d.name)) : [path.join(dir, d.name)])).filter((f) => f.endsWith('.js'));
const imports = (f) => [...fs.readFileSync(path.join(ROOT, f), 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => path.normalize(path.join(path.dirname(f), m[1])));

// Franchise integration (owner authorization 2026-10-21, GDD §26): src/franchise/clash-link.js is the ONE franchise file that imports the
// engine, and franchise.js imports only that adapter. The football sim, the core and the save/cloud code still never touch src/clash.
test('boundary: src/clash imports only core/rng, data and itself; src/sim and src/core never import src/clash; in src/franchise only clash-link.js does', () => {
  for (const f of files('src/clash')) for (const i of imports(f)) assert.ok(i.startsWith('src/clash/') || i === 'src/core/rng.js' || i.startsWith('src/data/'), `${f} imports ${i}`);
  for (const dir of ['src/sim', 'src/core']) for (const f of files(dir)) for (const i of imports(f)) assert.ok(!i.startsWith('src/clash'), `${f} imports ${i}`);
  for (const f of files('src/franchise')) for (const i of imports(f)) if (f !== 'src/franchise/clash-link.js') assert.ok(!i.startsWith('src/clash'), `${f} imports ${i} (only clash-link.js may)`);
  assert.ok(imports('src/franchise/clash-link.js').includes('src/clash/index.js'), 'the adapter imports the public surface only');
  assert.ok(imports('src/franchise/clash-link.js').every((i) => !i.startsWith('src/clash/') || i === 'src/clash/index.js'));
  // The move data imports nothing, and species.js does not know about clash.
  assert.deepEqual(imports('src/data/clash-moves.js'), []); assert.ok(!imports('src/data/species.js').some((i) => i.includes('clash')));
});

test('engine purity: no Math.random, Date, performance, DOM, storage, fetch or timers inside src/clash', () => {
  for (const f of files('src/clash')) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    for (const bad of [/Math\.random/, /Date\.now|new Date/, /performance\.now/, /\bdocument\b/, /\bwindow\b/, /localStorage|sessionStorage|indexedDB/, /\bfetch\(/, /setTimeout|setInterval|requestAnimationFrame/, /Math\.(hypot|exp|pow|sin|cos|tan|log)\b/]) assert.ok(!bad.test(src), `${f} matches ${bad}`); }
});

test('the save schema, save keys and cloud code are unchanged (no clash references in the save, sim or progression code)', async () => {
  for (const f of ['src/franchise/save.js', 'src/franchise/cloud-save.js', 'src/franchise/progression.js', 'src/data/calendar.js', 'src/sim/engine.js', 'src/sim/game-runner.js']) { const src = fs.readFileSync(path.join(ROOT, f), 'utf8'); assert.ok(!/clash|Clash/.test(src), `${f} mentions clash`); }
  const save = fs.readFileSync(path.join(ROOT, 'src/franchise/save.js'), 'utf8'); assert.ok(!/schema\s*[:=]\s*7|save7_|gridiron-beast-v7/.test(save), 'no schema 7');
});
