// Checkpoint 1 review sheets for the sprite generator upgrade (SPRITE_GENERATOR_BRIEF.md): the 30 body structures as solid
// silhouettes and in one neutral palette, the five poses on representative anatomies, and the full 150-combination test grid.
//   node docs/beast-dex/tools/structure_review.mjs           (from the repository root)
// Writes docs/beast-dex/art/generator/*.html and structure-checks.json. Exit 1 when a combination fails a check.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteGrid, palette } from '../../../src/ui/sprite16.js';
import { STRUCTURES, STRUCTURE_IDS, POSES } from '../../../src/ui/sprite-gen.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art', 'generator'); mkdirSync(OUT, { recursive: true });
const NEUTRAL = ['#8f9a94', '#c9d1cc'];
const pal = palette(NEUTRAL);
const svg = (grid, px, mode) => { let r = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = grid[y][x]; if (!v) continue; r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${mode === 'mask' ? '#14201a' : pal[v] || pal.M}"/>`; } return `<svg width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${r}</svg>`; };
const mask = (g) => g.map((r) => r.map((v) => (v ? 1 : 0)).join('')).join('/');
const grids = {}; const checks = { combinations: 0, problems: [], identicalMasks: [], poseCollapses: [] };
for (const id of STRUCTURE_IDS) for (const pose of POSES) {
  checks.combinations++;
  try {
    const g = spriteGrid({ structure: id, pose, colors: NEUTRAL }); grids[`${id}/${pose}`] = g;
    const filled = g.flat().filter(Boolean).length; if (filled < 40) checks.problems.push(`${id}/${pose}: only ${filled} pixels`);
    if (g.length !== 16 || g.some((r) => r.length !== 16)) checks.problems.push(`${id}/${pose}: not 16×16`);
    const v = g.flat(); if (v.some((c) => c && !(c in pal))) checks.problems.push(`${id}/${pose}: unknown palette code`);
    const body = (c) => c && c !== 'O'; const top = g[0].some(body), left = g.some((r) => body(r[0])), right = g.some((r) => body(r[15]));
    if (top || left || right) checks.problems.push(`${id}/${pose}: body touches the frame edge (clipped outline)`);
  } catch (e) { checks.problems.push(`${id}/${pose}: ${e.message}`); }
}
// silhouette uniqueness: across structures (neutral pose) and across the poses of one structure
const byMask = {}; for (const [k, g] of Object.entries(grids)) (byMask[mask(g)] ||= []).push(k);
checks.identicalMasks = Object.values(byMask).filter((v) => v.length > 1);
for (const id of STRUCTURE_IDS) { const ms = new Set(POSES.map((p) => mask(grids[`${id}/${p}`]))); if (ms.size < 5) checks.poseCollapses.push(`${id}: ${ms.size} distinct pose silhouettes`); }
// nearest neutral-pose neighbours by silhouette (Jaccard on outlined masks, with horizontal mirror)
const bits = (g) => g.flat().map((v) => (v ? 1 : 0)); const mir = (g) => g.map((r) => r.slice().reverse());
const jac = (a, b) => { let i = 0, u = 0; for (let k = 0; k < 256; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return i / u; };
const near = [];
for (let i = 0; i < STRUCTURE_IDS.length; i++) for (let j = i + 1; j < STRUCTURE_IDS.length; j++) {
  const A = grids[`${STRUCTURE_IDS[i]}/neutral`], B = grids[`${STRUCTURE_IDS[j]}/neutral`];
  near.push([Math.max(jac(bits(A), bits(B)), jac(bits(A), bits(mir(B)))), STRUCTURE_IDS[i], STRUCTURE_IDS[j]]);
}
near.sort((a, b) => b[0] - a[0]); checks.closestNeutralPairs = near.slice(0, 10).map(([s, a, b]) => ({ a, b, jaccard: Math.round(s * 1000) / 1000 }));
writeFileSync(join(OUT, 'structure-checks.json'), JSON.stringify(checks, null, 1) + '\n');

const css = `body{margin:0;padding:24px;background:#f3f1ea;color:#1d2621;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 16px;color:#4b5a51;max-width:980px}
.grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.cell{background:#fff;border:1px solid #d9d6cc;border-radius:8px;padding:10px;text-align:center}.cell svg{display:block;margin:0 auto 6px;background:#fff}
.cell b{display:block;font-size:13px}.cell span{font-size:11px;color:#5d6b62;display:block}.pair{display:flex;gap:6px;justify-content:center}.row{display:grid;grid-template-columns:150px repeat(5,1fr);gap:8px;align-items:center;margin-bottom:8px}
.row .lab{font-size:12px;font-weight:600}.hdr{font-size:12px;color:#5d6b62;text-align:center}.sm svg{width:64px;height:64px}`;
const page = (title, intro, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${css}</style></head><body><h1>${title}</h1><p>${intro}</p>${body}</body></html>\n`;
const num = (id) => String(STRUCTURE_IDS.indexOf(id) + 1).padStart(2, '0');
writeFileSync(join(OUT, 'structures.html'), page('Checkpoint 1: the 30 body structures',
  'Neutral pose, comparable framing (large size, ground on the bottom row). Left: solid silhouette. Right: one neutral palette with the generator\'s own shading and outline. No features, markings or type colours are applied: shape and anatomy only. Native 16×16 pixels shown at 6×.',
  `<div class="grid">${STRUCTURE_IDS.map((id) => `<div class="cell"><div class="pair">${svg(grids[`${id}/neutral`], 96, 'mask')}${svg(grids[`${id}/neutral`], 96)}</div><b>${num(id)} ${STRUCTURES[id].name}</b><span>${STRUCTURES[id].anatomy}</span></div>`).join('')}</div>`));
const REP = ['compact_upright', 'knuckle_walker', 'compact_quadruped', 'long_necked_quadruped', 'running_avian', 'batlike', 'coiled_serpent', 'crustacean', 'floating', 'hopping', 'tentacled', 'construct'];
const poseRows = (ids, mode) => `<div class="row"><div></div>${POSES.map((p) => `<div class="hdr">${p}</div>`).join('')}</div>` + ids.map((id) => `<div class="row sm"><div class="lab">${num(id)} ${STRUCTURES[id].name}</div>${POSES.map((p) => `<div class="cell">${svg(grids[`${id}/${p}`], 64, mode)}</div>`).join('')}</div>`).join('');
writeFileSync(join(OUT, 'poses.html'), page('Checkpoint 1: five poses on representative anatomies',
  'Neutral, alert, braced, forward-ready and expressive on 12 of the 30 structures (upright, knuckle-walker, quadrupeds, avians, winged, serpent, crustacean, floating, hopping, tentacled and construct). Poses change posture within each anatomy; floating and winged bodies adapt rather than gain legs. All 150 combinations are in the full grid.', poseRows(REP)));
writeFileSync(join(OUT, 'all-150.html'), page('All 150 structure/pose combinations (test grid)', 'Every structure in every pose, solid silhouettes, as tested.', poseRows(STRUCTURE_IDS, 'mask')));
console.log(JSON.stringify({ combinations: checks.combinations, problems: checks.problems, identicalMasks: checks.identicalMasks, poseCollapses: checks.poseCollapses, closest: checks.closestNeutralPairs.slice(0, 5) }, null, 1));
process.exit(checks.problems.length || checks.identicalMasks.length ? 1 : 0);
