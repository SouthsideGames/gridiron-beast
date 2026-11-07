// Before/after comparison of revised generator structures (checkpoint 1 revisions).
//   git show <before-commit>:src/ui/sprite-gen.js > /tmp/sprite-gen-before.mjs
//   node docs/beast-dex/tools/structure_compare.mjs /tmp/sprite-gen-before.mjs <out.html> id1,id2,…
// Both versions go through the game's own shading/outline pass. Each structure gets a "before" and an "after" row of all five
// poses: solid silhouette and shaded at 6× nearest-neighbour, plus the shaded sprite at 32 and 48 CSS px (gameplay sizes).
import { writeFileSync } from 'node:fs';
import { spriteGrid, palette } from '../../../src/ui/sprite16.js';
import * as AFTER from '../../../src/ui/sprite-gen.js';

const [, , beforePath, out, idList] = process.argv;
const BEFORE = await import(beforePath);
const ids = idList.split(',');
const C = ['#8f9a94', '#c9d1cc']; const pal = palette(C);
// The legacy shading/outline pass applied to a raw grid (copied from sprite16.js so the old module's raw grid is finished identically).
const finish = (g) => { const W = 16, H = 16; const out = g.map((r) => r.slice()); const empty = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !g[y][x];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = g[y][x]; if (v !== 'M' && v !== 'A') continue; if (empty(x, y - 1)) out[y][x] = v + 'l'; else if (empty(x, y + 1) || empty(x + 1, y) && !empty(x - 1, y)) out[y][x] = v + 'd'; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (g[y][x]) continue; if (!empty(x - 1, y) || !empty(x + 1, y) || !empty(x, y - 1) || !empty(x, y + 1)) out[y][x] = 'O'; } return out; };
const svg = (g, px, mode) => { let r = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = g[y][x]; if (v) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${mode === 'mask' ? '#14201a' : pal[v] || pal.M}"/>`; } return `<svg width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${r}</svg>`; };
const bits = (g) => g.flat().map((v) => (v ? 1 : 0)); const mir = (g) => g.map((r) => r.slice().reverse());
const jac = (a, b) => { let i = 0, u = 0; for (let k = 0; k < 256; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return i / u; };
const sim = (A, B) => Math.max(jac(bits(A), bits(B)), jac(bits(A), bits(mir(B))));
const gridOf = (mod, id, pose) => (mod === AFTER ? spriteGrid({ structure: id, pose, colors: C }) : finish(mod.structureGrid({ structure: id, pose }).grid));
// nearest other structure (neutral pose) before and after
const nearest = (mod, id) => { const A = gridOf(mod, id, 'neutral'); let best = [0, '']; for (const o of mod.STRUCTURE_IDS) if (o !== id) { const s = sim(A, gridOf(mod, o, 'neutral')); if (s > best[0]) best = [s, o]; } return best; };
const css = `body{margin:0;padding:24px;background:#f3f1ea;color:#1d2621;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 4px}p{margin:0 0 10px;color:#4b5a51;max-width:1000px}
table{border-collapse:separate;border-spacing:6px}td{background:#fff;border:1px solid #d9d6cc;border-radius:8px;padding:6px;text-align:center;vertical-align:middle}th{font-size:12px;color:#5d6b62;font-weight:600}
.lab{background:none;border:none;text-align:left;font-size:12px;font-weight:700;width:70px}.pair{display:flex;gap:4px;justify-content:center}.game{display:flex;gap:8px;justify-content:center;align-items:flex-end;margin-top:4px}.game span{font-size:10px;color:#7a877f;display:block}.after td:not(.lab){background:#f6fbf7;border-color:#9cc3a8}`;
let body = '';
for (const id of ids) {
  const nb = nearest(BEFORE, id), na = nearest(AFTER, id);
  body += `<h2>${AFTER.STRUCTURES[id].name}</h2><p>${AFTER.STRUCTURES[id].anatomy}. Closest other structure (neutral silhouettes, mirror included): before ${nb[1]} ${nb[0].toFixed(2)}, after ${na[1]} ${na[0].toFixed(2)}.</p><table><tr><th></th>${AFTER.POSES.map((p) => `<th>${p}</th>`).join('')}</tr>`;
  for (const [label, mod, cls] of [['Before', BEFORE, ''], ['After', AFTER, 'after']]) {
    body += `<tr class="${cls}"><td class="lab">${label}</td>${AFTER.POSES.map((p) => { const g = gridOf(mod, id, p); return `<td><div class="pair">${svg(g, 96, 'mask')}${svg(g, 96)}</div><div class="game"><div>${svg(g, 32)}<span>32px</span></div><div>${svg(g, 48)}<span>48px</span></div></div></td>`; }).join('')}</tr>`;
  }
  body += '</table>';
}
writeFileSync(out, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checkpoint 1 revisions: before and after</title><style>${css}</style></head><body><h1>Checkpoint 1 revisions: before and after</h1><p>Every pose of each revised structure. In each cell: solid silhouette and shaded sprite at 6× nearest-neighbour, then the shaded sprite at 32 and 48 CSS pixels (gameplay sizes). Same neutral palette, the game's own shading and outline. Native 16×16.</p>${body}</body></html>\n`);
console.log(ids.map((id) => `${id}: nearest before ${nearest(BEFORE, id).join(' ')} | after ${nearest(AFTER, id).join(' ')}`).join('\n'));
