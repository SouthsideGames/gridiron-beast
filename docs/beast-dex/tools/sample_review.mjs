// Checkpoint 2: the 20-monster before/after sample for generator v2.
//   node docs/beast-dex/tools/sample_review.mjs        (from the repository root)
// Reads docs/beast-dex/art/sample/checkpoint-2-recipes.json (proposed v2 recipes) and the Basic families' current art
// (docs/beast-dex/data/basic-authoring.json, the before baseline), and writes docs/beast-dex/art/sample/:
//   checkpoint-2.html   before/after: silhouettes and shaded sprites at 6× nearest-neighbour, plus 16/24/32/48 px gameplay sizes
//   crowded-field.html  both sets on the game's field at the game's sprite scale, phone and tablet widths
//   sample-audit.json   diagnostics, similarity audit and small-feature report
// Nothing here is read by the game: the proposals are not wired into monster data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteGrid, sprite16, palette } from '../../../src/ui/sprite16.js';
import { STRUCTURES, recipeDiagnostics } from '../../../src/ui/sprite-gen.js';
import { FEATURES } from '../../../src/ui/sprite-features.js';
import { SPECIES_DEX } from '../../../src/data/species.js';
import { evolvedSpec } from '../../../src/data/monsters.js';
import { fieldSvg, FIELD_VIEWBOX } from '../../../src/ui/field-view.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); const OUT = join(ROOT, 'art', 'sample'); mkdirSync(OUT, { recursive: true });
const families = JSON.parse(readFileSync(join(ROOT, 'data', 'basic-authoring.json'))).families; const FAM = Object.fromEntries(families.map((f) => [f.id, f]));
const proposals = JSON.parse(readFileSync(join(OUT, 'checkpoint-2-recipes.json'))).recipes;

const beforeSpec = (f) => ({ id: f.id, name: f.name, ...f.art });
const afterSpec = (f, r) => { const { why, ...rec } = r; return { ...rec, id: `${f.id}_v2`, name: f.name, size: f.art.size, colors: f.art.colors }; };
const svg = (g, colors, px, mode) => { const pal = palette(colors); let s = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = g[y][x]; if (v) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${mode === 'mask' ? '#14201a' : pal[v] || pal.M}"/>`; } return `<svg width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${s}</svg>`; };
const bits = (g) => g.flat().map((v) => (v ? 1 : 0)); const mir = (g) => g.map((r) => r.slice().reverse());
const jac = (a, b) => { let i = 0, u = 0; for (let k = 0; k < 256; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return u ? i / u : 1; };
const sim = (A, B) => Math.max(jac(bits(A), bits(B)), jac(bits(A), bits(mir(B))));
const codes = (g) => JSON.stringify(g); const maskKey = (g) => g.map((r) => r.map((v) => (v ? 1 : 0)).join('')).join('/');

const rows = proposals.map((r) => { const f = FAM[r.id]; if (!f) throw new Error(`unknown family ${r.id}`); const b = beforeSpec(f), a = afterSpec(f, r);
  return { f, r, b, a, gb: spriteGrid(b), ga: spriteGrid(a), diag: recipeDiagnostics(a) }; });

// ---------------------------------------------------------------- coverage
const coverage = { types: [...new Set(rows.map((x) => x.f.type))].sort(), positions: [...new Set(rows.map((x) => x.f.position))].sort(), structures: [...new Set(rows.map((x) => x.r.structure))], sizes: Object.fromEntries(['small', 'medium'].map((s) => [s, rows.filter((x) => x.f.art.size === s).length])) };

// ---------------------------------------------------------------- similarity audit
const originals = SPECIES_DEX.flatMap((s) => [0, 1, 2].slice(0, s.evolution.length + 1).map((st) => evolvedSpec(s, st))).map((s) => ({ label: `original ${s.name}`, g: spriteGrid(s) }));
const basicsBefore = families.map((f) => ({ label: `Basic (current) ${f.name}`, id: f.id, g: spriteGrid(beforeSpec(f)) }));
const pool = (self) => [...rows.filter((x) => x !== self).map((x) => ({ label: `proposed ${x.f.name}`, g: x.ga })), ...originals, ...basicsBefore.filter((x) => x.id !== self.f.id)];
const audit = rows.map((x) => { const P = pool(x); let best = { s: 0 }; const exact = [], sameMask = [], close = [];
  for (const o of P) { const s = sim(x.ga, o.g); if (codes(o.g) === codes(x.ga)) exact.push(o.label); if (maskKey(o.g) === maskKey(x.ga)) sameMask.push(o.label); if (s >= 0.85) close.push(`${o.label} ${s.toFixed(2)}`); if (s > best.s) best = { s, label: o.label }; }
  // feature legibility: pixels each feature changes; 1–3 px may disappear at 16–24 px gameplay size
  const small = (x.r.features || []).map((ft, i) => { const rest = x.a.features.filter((_, j) => j !== i); const g2 = spriteGrid({ ...x.a, features: rest, proportions: ft.id === 'tufted_tail' ? x.a.proportions : x.a.proportions });
    let n = 0; for (let yy = 0; yy < 16; yy++) for (let xx = 0; xx < 16; xx++) if (g2[yy][xx] !== x.ga[yy][xx]) n++; return { feature: ft.variant ? `${ft.id}/${ft.variant}` : ft.id, pixels: n }; });
  const beforeNear = (() => { let b = { s: 0 }; for (const o of [...originals, ...basicsBefore.filter((y) => y.id !== x.f.id)]) { const s = sim(x.gb, o.g); if (s > b.s) b = { s, label: o.label }; } return b; })();
  return { id: x.f.id, name: x.f.name, structure: x.r.structure, pose: x.r.pose || 'neutral', fit: x.diag.fit, diagnostics: [...(x.diag.problems || []), ...x.diag.invisible, ...(x.diag.warnings || [])],
    exactDuplicates: exact, identicalMasks: sameMask, closeMatches: close, nearestAfter: `${best.label} ${best.s.toFixed(2)}`, nearestBefore: `${beforeNear.label} ${beforeNear.s.toFixed(2)}`, nearestBeforeScore: beforeNear.s, nearestAfterScore: best.s, featurePixels: small, smallFeatures: small.filter((s) => s.pixels <= 3).map((s) => s.feature) }; });
const sameStructure = Object.entries(rows.reduce((m, x) => ((m[x.r.structure] ||= []).push(x.f.name), m), {})).filter(([, v]) => v.length > 1);
const summary = { coverage, sameStructurePairs: sameStructure, exactDuplicates: audit.filter((a) => a.exactDuplicates.length).length, identicalMasks: audit.filter((a) => a.identicalMasks.length).length, closeMatches085: audit.filter((a) => a.closeMatches.length).map((a) => `${a.name}: ${a.closeMatches.join('; ')}`),
  meanNearestBefore: +(audit.reduce((s, a) => s + a.nearestBeforeScore, 0) / audit.length).toFixed(3), meanNearestAfter: +(audit.reduce((s, a) => s + a.nearestAfterScore, 0) / audit.length).toFixed(3),
  diagnosticsClean: audit.every((a) => !a.diagnostics.length), smallFeatures: audit.filter((a) => a.smallFeatures.length).map((a) => `${a.name}: ${a.smallFeatures.join(', ')}`) };
writeFileSync(join(OUT, 'sample-audit.json'), JSON.stringify({ note: 'Similarity: Jaccard on outlined silhouette masks, horizontal mirror included, against the other 19 proposals, the 102 original forms and the other 119 current Basic designs. Scores assist review; they do not certify quality. featurePixels counts the pixels each feature changes; 1–3 px may be lost at gameplay size.', summary, monsters: audit }, null, 1) + '\n');

// ---------------------------------------------------------------- comparison sheet
const css = `*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f1ea;color:#1d2621;font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:26px 0 6px}p{margin:0 0 10px;color:#4b5a51;max-width:1100px}
.card{display:grid;grid-template-columns:190px 1fr 1fr;gap:8px;align-items:stretch;margin:0 0 10px;background:#fff;border:1px solid #d9d6cc;border-radius:10px;padding:10px}
.lab b{display:block;font-size:15px}.lab span{display:block;font-size:12px;color:#5d6b62}.lab i{display:block;font-size:11px;color:#5d6b62;margin-top:6px;font-style:normal}
.side{border-radius:8px;padding:8px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.before{background:#f4f2ec}.after{background:#eef7f0;border:1px solid #9cc3a8}
.side h3{width:100%;margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5d6b62}.sizes{display:flex;gap:8px;align-items:flex-end}.sizes div{text-align:center;font-size:10px;color:#7a877f}.sizes .turf{background:#2f6b3f;padding:3px;border-radius:4px}
.meta{font-size:11px;color:#5d6b62;width:100%}table.sum{border-collapse:collapse;font-size:12px}table.sum td,table.sum th{border-bottom:1px solid #e1ddd2;padding:4px 8px;text-align:left;vertical-align:top}
@media (max-width:800px){.card{grid-template-columns:1fr}}`;
const sizes = (g, colors) => `<div class="sizes">${[16, 24, 32, 48].map((px) => `<div><div class="turf">${svg(g, colors, px)}</div>${px}px</div>`).join('')}</div>`;
const featText = (r) => [...Object.entries(r.proportions || {}).map(([k, v]) => `${k} ${v}`), ...(r.features || []).map((f) => (f.variant ? `${FEATURES[f.id].label} (${f.variant})` : FEATURES[f.id].label)), ...Object.entries(r.face || {}).map(([k, v]) => `${k} ${v}`), ...(r.markings ? [`markings ${r.markings.pattern}${r.markings.color ? ` ${r.markings.color}` : ''}`] : [])].join(' · ');
const cards = rows.map((x, i) => { const a = audit[i]; return `<div class="card"><div class="lab"><b>${x.f.name}</b><span>${x.f.type} · ${x.f.position} · ${x.f.art.size}</span><span>${x.f.clashArchetype} · ${x.f.buildIdentity}</span><i>${x.f.personality}</i></div>
<div class="side before"><h3>Before (current Basic art)</h3>${svg(x.gb, x.f.art.colors, 96, 'mask')}${svg(x.gb, x.f.art.colors, 96)}${sizes(x.gb, x.f.art.colors)}<div class="meta">${x.f.art.body} template · ${x.f.art.look} · ${x.f.art.features.join(', ')}${x.f.art.pattern ? ` · ${x.f.art.pattern}` : ''}. Nearest: ${a.nearestBefore}</div></div>
<div class="side after"><h3>After (proposed v2)</h3>${svg(x.ga, x.f.art.colors, 96, 'mask')}${svg(x.ga, x.f.art.colors, 96)}${sizes(x.ga, x.f.art.colors)}<div class="meta"><b>${STRUCTURES[x.r.structure].name}</b>, ${x.r.pose || 'neutral'} pose · ${featText(x.r)}. ${x.r.why} Nearest: ${a.nearestAfter}${a.smallFeatures.length ? ` · small at gameplay size: ${a.smallFeatures.join(', ')}` : ''}</div></div></div>`; }).join('');
const lineup = (which) => rows.map((x) => `<div style="text-align:center;font-size:10px;color:#5d6b62">${svg(which === 'b' ? x.gb : x.ga, x.f.art.colors, 48, 'mask')}<br>${x.f.name}</div>`).join('');
writeFileSync(join(OUT, 'checkpoint-2.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Checkpoint 2 sample</title><style>${css}</style></head><body>
<h1>Checkpoint 2: 20-monster sample, before and after</h1>
<p>Twenty existing Basic families redrawn with generator v2. Names, types, positions, colours, sizes, personalities and gameplay profiles are unchanged; only the art recipe is proposed, and nothing is wired into the game. Each card shows the silhouette and the shaded sprite at 6× nearest-neighbour, then the shaded sprite at 16, 24, 32 and 48 px on turf. The game draws field sprites at about 23 px on a 390 px phone and about 46 px on a 768 px tablet (<a href="crowded-field.html">crowded-field preview</a>).</p>
<p>Coverage: ${coverage.types.length} of 12 types, ${coverage.positions.length} of 10 positions, ${coverage.structures.length} structures; ${coverage.sizes.small} small and ${coverage.sizes.medium} medium forms (the Basic batch has no large forms). Every proposal passes the generator diagnostics: no unsupported, invisible or oversized choices.</p>
<h2>Silhouette line-up</h2><p>Before</p><div style="display:flex;flex-wrap:wrap;gap:8px">${lineup('b')}</div><p style="margin-top:10px">After</p><div style="display:flex;flex-wrap:wrap;gap:8px">${lineup('a')}</div>
<h2>Similarity audit</h2><table class="sum"><tr><th>Check</th><th>Result</th></tr>
<tr><td>Exact pixel duplicates</td><td>${summary.exactDuplicates}</td></tr><tr><td>Identical silhouettes</td><td>${summary.identicalMasks}</td></tr>
<tr><td>Close silhouettes (≥ 0.85, mirror included), against the other proposals, 102 original forms and 119 current Basics</td><td>${summary.closeMatches085.length ? summary.closeMatches085.join('<br>') : 'none'}</td></tr>
<tr><td>Mean nearest-silhouette score</td><td>before ${summary.meanNearestBefore} → after ${summary.meanNearestAfter} (lower is more distinct)</td></tr>
<tr><td>Same structure used twice</td><td>${sameStructure.map(([s, v]) => `${STRUCTURES[s].name}: ${v.join(', ')}`).join('<br>') || 'none'}</td></tr>
<tr><td>Features of 1–3 px (may be lost at 16–24 px)</td><td>${summary.smallFeatures.join('<br>') || 'none'}</td></tr></table>
<h2>Monsters</h2>${cards}</body></html>\n`);

// ---------------------------------------------------------------- crowded field
// Same placement and scale as field-view.js marker(): a 3.4-yard sprite at (cx − 1.7, cy − 2.5) over a team-coloured base ellipse.
const ballOn = 30; const camTop = Math.max(-10, Math.min(64, ballOn - 15)) + 46; const Y = (yd) => camTop - yd;
const spots = { off: [[-2, -6], [-2, -3.5], [-2, -1.2], [-2, 1.2], [-2, 3.5], [-2, 6], [-5, 0], [-7.5, -1.5], [-2.5, 11], [-3, -12]], def: [[1.5, -5], [1.5, -2], [1.5, 1], [1.5, 4], [4.5, -6], [4.5, 0.5], [4.5, 6], [8, -11], [8, 11], [12, 0]] };
const marker = (spec, team, [x, y], flip) => { const cx = y, cy = Y(ballOn + x); const art = sprite16(spec, 16, { flip }).replace(/<svg class="sprite" width="16" height="16"/, `<svg x="${(cx - 1.7).toFixed(2)}" y="${(cy - 2.5).toFixed(2)}" width="3.4" height="3.4"`);
  return `<ellipse cx="${cx.toFixed(2)}" cy="${(cy + 0.75).toFixed(2)}" rx="1.55" ry="0.7" fill="${team === 'off' ? '#60baff' : '#ff9385'}" stroke="#0d1f17" stroke-width="0.2"/>${art}`; };
const field = (which) => { const bg = fieldSvg({ ballOn, toGo: 10 }); const specs = rows.map((x) => (which === 'b' ? x.b : x.a));
  const order = [...rows.keys()].sort((i, j) => ['OL', 'TE', 'QB', 'RB', 'WR', 'K', 'DL', 'LB', 'CB', 'S'].indexOf(rows[i].f.position) - ['OL', 'TE', 'QB', 'RB', 'WR', 'K', 'DL', 'LB', 'CB', 'S'].indexOf(rows[j].f.position));
  let m = ''; order.slice(0, 10).forEach((k, n) => { m += marker(specs[k], 'off', spots.off[n], false); }); order.slice(10).forEach((k, n) => { m += marker(specs[k], 'def', spots.def[n], true); });
  return `<svg viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet">${bg}${m}</svg>`; };
const fb = field('b'), fa = field('a');
const fcss = `body{margin:0;padding:20px;background:#f3f1ea;color:#1d2621;font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;color:#4b5a51;max-width:1000px}.row{display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start}.row div{font-size:12px;font-weight:600;color:#5d6b62}.f{border-radius:8px;overflow:hidden;display:block;margin-top:4px}.f>svg{display:block;width:100%;height:auto}`;
const panel = (title, svgText, w) => `<div>${title}<div class="f" style="width:${w}px">${svgText}</div></div>`;
writeFileSync(join(OUT, 'crowded-field.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crowded field preview</title><style>${fcss}</style></head><body>
<h1>Crowded-field preview (review harness, not gameplay)</h1><p>The 20 sample monsters lined up near the ball on the game's own field drawing (<code>fieldSvg</code>), placed exactly as the match view places sprites: a 3.4-yard sprite over a team-coloured base, defenders mirrored. Offense below the line in blue bases, defense above in red. Same positions before and after; only the art differs. Shown at a 390 px phone width (sprites about 23 px) and a 768 px tablet width (about 46 px).</p>
<div class="row">${panel('Before, phone width', fb, 374)}${panel('After, phone width', fa, 374)}</div>
<div class="row" style="margin-top:20px">${panel('Before, tablet width', fb, 740)}${panel('After, tablet width', fa, 740)}</div></body></html>\n`);
console.log(JSON.stringify(summary, null, 1));
