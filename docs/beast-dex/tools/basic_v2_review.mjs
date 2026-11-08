// Final review of the 120 Basic designs redrawn with generator v2 (checkpoint 3).
//   node docs/beast-dex/tools/basic_v2_review.mjs        (from the repository root)
// Reads docs/beast-dex/data/basic-art-v2.json (proposed recipes) and basic-authoring.json (identities and the current art,
// the before baseline). Writes docs/beast-dex/art/basic-v2/:
//   index.html               all 120 silhouettes by type, before and after, plus the audit summary
//   type-<type>.html         per-type sheets: silhouette and shaded at 6×, gameplay sizes 16/24/32/48 px, before and after
//   crowded-field.html       six crowded fields on the game's own field drawing and sprite placement
//   similarity.html          the closest pairs side by side, for investigation
//   audit.json               automated results (diagnostics, duplicates, similarity, small features)
// Nothing here changes the game: the proposals are not wired into monster data.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteGrid, sprite16, palette } from '../../../src/ui/sprite16.js';
import { STRUCTURES, STRUCTURE_IDS, recipeDiagnostics } from '../../../src/ui/sprite-gen.js';
import { FEATURES } from '../../../src/ui/sprite-features.js';
import { SPECIES_DEX } from '../../../src/data/species.js';
import { evolvedSpec } from '../../../src/data/monsters.js';
import { fieldSvg, FIELD_VIEWBOX } from '../../../src/ui/field-view.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); const OUT = join(ROOT, 'art', 'basic-v2'); mkdirSync(OUT, { recursive: true });
const families = JSON.parse(readFileSync(join(ROOT, 'data', 'basic-authoring.json'))).families;
const recipes = Object.fromEntries(JSON.parse(readFileSync(join(ROOT, 'data', 'basic-art-v2.json'))).recipes.map((r) => [r.id, r]));
const tuning = JSON.parse(readFileSync(join(OUT, 'tuning.json'))).changed;
const TYPES = [...new Set(families.map((f) => f.type))]; const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K'];

const beforeSpec = (f) => ({ id: f.id, name: f.name, ...f.art });
const afterSpec = (f) => ({ colors: f.art.colors, ...recipes[f.id], id: `${f.id}_v2`, name: f.name, size: f.art.size });
const svg = (g, colors, px, mode) => { const pal = palette(colors); let s = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = g[y][x]; if (v) s += `<rect x="${x}" y="${y}" width="1" height="1" fill="${mode === 'mask' ? '#14201a' : pal[v] || pal.M}"/>`; } return `<svg width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${s}</svg>`; };
const bits = (g) => g.flat().map((v) => (v ? 1 : 0)); const mir = (g) => g.map((r) => r.slice().reverse());
const jac = (a, b) => { let i = 0, u = 0; for (let k = 0; k < 256; k++) { i += a[k] & b[k]; u += a[k] | b[k]; } return u ? i / u : 1; };

const rows = families.map((f) => { if (!recipes[f.id]) throw new Error(`no v2 recipe for ${f.id}`); const b = beforeSpec(f), a = afterSpec(f); const gb = spriteGrid(b), ga = spriteGrid(a);
  return { f, r: recipes[f.id], b, a, gb, ga, colors: a.colors, diag: recipeDiagnostics(a), sb: { b: bits(gb), m: bits(mir(gb)) }, sa: { b: bits(ga), m: bits(mir(ga)) } }; });
const origs = SPECIES_DEX.flatMap((s) => [0, 1, 2].slice(0, s.evolution.length + 1).map((st) => evolvedSpec(s, st))).map((s) => { const g = spriteGrid(s); return { label: s.name, kind: 'original', g, colors: s.colors, s: { b: bits(g), m: bits(mir(g)) } }; });

// ---------------------------------------------------------------- automated audit (after = the 120 v2 designs; before = the current Basic art)
const sim = (x, y) => Math.max(jac(x.b, y.b), jac(x.b, y.m));
const codes = (g) => JSON.stringify(g); const codesM = (g) => JSON.stringify(mir(g));
const pairsFor = (key, gkey) => { const P = []; const items = [...rows.map((x) => ({ label: x.f.name, id: x.f.id, kind: 'basic', g: x[gkey], colors: x.colors, s: x[key] })), ...origs];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const A = items[i], B = items[j]; if (A.kind === 'original' && B.kind === 'original') continue;
    P.push({ s: sim(A.s, B.s), a: A, b: B, exact: codes(A.g) === codes(B.g) || codes(A.g) === codesM(B.g), mask: jac(A.s.b, B.s.b) === 1 || jac(A.s.b, B.s.m) === 1 }); }
  return P.sort((p, q) => q.s - p.s); };
const after = pairsFor('sa', 'ga'), before = pairsFor('sb', 'gb');
const nearest = (P, id) => P.find((p) => p.a.id === id || p.b.id === id);
const nearMean = (P) => +(rows.reduce((s, x) => s + nearest(P, x.f.id).s, 0) / rows.length).toFixed(3);
const smallFeatures = rows.flatMap((x) => (x.r.features || []).map((ft, i) => { const rest = x.r.features.filter((_, j) => j !== i); const g2 = spriteGrid({ ...x.a, features: rest.length ? rest : undefined });
  let n = 0; for (let y = 0; y < 16; y++) for (let xx = 0; xx < 16; xx++) if (g2[y][xx] !== x.ga[y][xx]) n++; return { id: x.f.id, name: x.f.name, feature: ft.variant ? `${ft.id}/${ft.variant}` : ft.id, pixels: n }; })).filter((s) => s.pixels <= 3);
const structureUse = Object.fromEntries(STRUCTURE_IDS.map((s) => [s, rows.filter((x) => x.r.structure === s).map((x) => x.f.name)]));
const audit = {
  note: 'Automated checks only. Similarity is Jaccard overlap of outlined 16×16 silhouette masks, the better of direct and horizontally mirrored, over every pair among the 120 Basics and between each Basic and the 102 original forms (original–original pairs excluded). Thresholds flag pairs for visual investigation; they do not certify distinctness or quality.',
  diagnostics: { clean: rows.filter((x) => !x.diag.problems?.length && !x.diag.invisible.length && !x.diag.warnings.length).length, of: rows.length, issues: rows.filter((x) => x.diag.problems?.length || x.diag.invisible.length || x.diag.warnings.length).map((x) => ({ id: x.f.id, ...x.diag })) },
  identityPreserved: { families: rows.length, idsMatch: rows.every((x) => recipes[x.f.id]), colourOverrides: rows.filter((x) => recipes[x.f.id].colors).map((x) => x.f.id) },
  coverage: { structuresUsed: Object.values(structureUse).filter((v) => v.length).length, unused: Object.entries(structureUse).filter(([, v]) => !v.length).map(([k]) => k), maxPerStructure: Math.max(...Object.values(structureUse).map((v) => v.length)), perStructure: Object.fromEntries(Object.entries(structureUse).map(([k, v]) => [k, v.length])) },
  similarity: {
    exactPixelDuplicates: after.filter((p) => p.exact).map((p) => `${p.a.label} / ${p.b.label}`), identicalSilhouettes: after.filter((p) => p.mask).map((p) => `${p.a.label} / ${p.b.label}`),
    pairsAtOrAbove085: after.filter((p) => p.s >= 0.85).map((p) => `${p.a.label} / ${p.b.label} ${p.s.toFixed(3)}`), pairsAtOrAbove080: after.filter((p) => p.s >= 0.8).length,
    before: { exactPixelDuplicates: before.filter((p) => p.exact).length, identicalSilhouettes: before.filter((p) => p.mask).length, pairsAtOrAbove085: before.filter((p) => p.s >= 0.85).length, meanNearest: nearMean(before) },
    after: { meanNearest: nearMean(after), maxNearest: +after[0].s.toFixed(3) },
    closest25: after.slice(0, 25).map((p) => ({ a: p.a.label, b: p.b.label, score: +p.s.toFixed(3), sameStructure: p.a.kind === 'basic' && p.b.kind === 'basic' && recipes[p.a.id].structure === recipes[p.b.id].structure })),
  },
  smallFeatures: { note: 'features that change only 1–3 pixels; decorative, may vanish at 16–24 px', count: smallFeatures.length, list: smallFeatures.map((s) => `${s.name}: ${s.feature} (${s.pixels} px)`) },
  tuned: Object.keys(tuning).length,
};
writeFileSync(join(OUT, 'audit.json'), JSON.stringify(audit, null, 1) + '\n');

// ---------------------------------------------------------------- pages
const css = `*{box-sizing:border-box}body{margin:0;padding:24px;background:#f3f1ea;color:#1d2621;font:14px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:24px 0 6px}p{margin:0 0 10px;color:#4b5a51;max-width:1100px}a{color:#2c6e49}
nav{margin:0 0 14px;font-size:13px}nav a{margin-right:10px}
.card{display:grid;grid-template-columns:200px 1fr 1fr;gap:8px;margin:0 0 10px;background:#fff;border:1px solid #d9d6cc;border-radius:10px;padding:10px}
.lab b{display:block;font-size:15px}.lab span{display:block;font-size:12px;color:#5d6b62}.lab i{display:block;font-size:11px;color:#5d6b62;margin-top:6px;font-style:normal}
.side{border-radius:8px;padding:8px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.before{background:#f4f2ec}.after{background:#eef7f0;border:1px solid #9cc3a8}
.side h3{width:100%;margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5d6b62}.sizes{display:flex;gap:8px;align-items:flex-end}.sizes div{text-align:center;font-size:10px;color:#7a877f}.turf{background:#2f6b3f;padding:3px;border-radius:4px;display:inline-block}
.meta{font-size:11px;color:#5d6b62;width:100%}.tune{color:#8a5a2b}.line{display:flex;flex-wrap:wrap;gap:6px}.line div{text-align:center;font-size:10px;color:#5d6b62;width:62px}
table{border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #e1ddd2;padding:4px 8px;text-align:left;vertical-align:middle}.tag{font-size:10px;padding:1px 6px;border-radius:9px;background:#e4efe7;color:#2c6e49;margin-left:6px}.tag.v{background:#f3e7d6;color:#8a5a2b}
@media (max-width:820px){.card{grid-template-columns:1fr}}`;
const head = (t) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title><style>${css}</style></head><body>`;
const nav = `<nav><a href="index.html">Overview</a>${TYPES.map((t) => `<a href="type-${t.toLowerCase()}.html">${t}</a>`).join('')}<a href="crowded-field.html">Crowded field</a><a href="similarity.html">Similarity</a></nav>`;
const sizes = (g, c) => `<div class="sizes">${[16, 24, 32, 48].map((px) => `<div><div class="turf">${svg(g, c, px)}</div>${px}px</div>`).join('')}</div>`;
const featText = (r) => [...Object.entries(r.proportions || {}).map(([k, v]) => `${k} ${v}`), ...(r.features || []).map((f) => (f.variant ? `${FEATURES[f.id].label.toLowerCase()} (${f.variant})` : FEATURES[f.id].label.toLowerCase())), ...Object.entries(r.face || {}).map(([k, v]) => `${k} ${v}`), ...(r.markings ? [`${r.markings.pattern} markings${r.markings.color ? ` (${r.markings.color})` : ''}`] : [])].join(' · ');
const card = (x) => { const na = nearest(after, x.f.id), nb = nearest(before, x.f.id); const other = (p) => (p.a.id === x.f.id ? p.b : p.a).label;
  return `<div class="card"><div class="lab"><b>${x.f.name}</b><span>${x.f.type} · ${x.f.position} · ${x.f.art.size}</span><span>${x.f.clashArchetype} · ${x.f.buildIdentity}</span><i>${x.f.personality}</i></div>
<div class="side before"><h3>Before (current Basic art)</h3>${svg(x.gb, x.f.art.colors, 96, 'mask')}${svg(x.gb, x.f.art.colors, 96)}${sizes(x.gb, x.f.art.colors)}<div class="meta">${x.f.art.body} template · ${x.f.art.features.join(', ')}. Nearest silhouette: ${other(nb)} ${nb.s.toFixed(2)}</div></div>
<div class="side after"><h3>After (generator v2)</h3>${svg(x.ga, x.colors, 96, 'mask')}${svg(x.ga, x.colors, 96)}${sizes(x.ga, x.colors)}<div class="meta"><b>${STRUCTURES[x.r.structure].name}</b>, ${x.r.pose || 'neutral'} pose${featText(x.r) ? ` · ${featText(x.r)}` : ''}. Nearest silhouette: ${other(na)} ${na.s.toFixed(2)}${x.r.colors ? ' · <b>palette lightened for field contrast</b>' : ''}${tuning[x.f.id] ? `<br><span class="tune">Adjusted from first draft: ${tuning[x.f.id].join('; ')}</span>` : ''}</div></div></div>`; };
const lineup = (list, key) => `<div class="line">${list.map((x) => `<div>${svg(x[key], key === 'gb' ? x.f.art.colors : x.colors, 48, 'mask')}<br>${x.f.name}</div>`).join('')}</div>`;
const byType = (t) => rows.filter((x) => x.f.type === t).sort((a, b) => POS.indexOf(a.f.position) - POS.indexOf(b.f.position));
for (const t of TYPES) writeFileSync(join(OUT, `type-${t.toLowerCase()}.html`), `${head(`${t} Basics v2`)}${nav}<h1>${t} Basics: before and after</h1><p>Each card: silhouette and shaded sprite at 6× nearest-neighbour, then the shaded sprite at 16, 24, 32 and 48 px on turf (the match view draws sprites at about 23 px on a 390 px phone). Identity, position, size and gameplay profile are unchanged.</p>
<h2>Silhouettes</h2><p>Before</p>${lineup(byType(t), 'gb')}<p style="margin-top:8px">After</p>${lineup(byType(t), 'ga')}<h2>Monsters</h2>${byType(t).map(card).join('')}</body></html>\n`);

const A = audit.similarity;
writeFileSync(join(OUT, 'index.html'), `${head('Basic v2 final review')}${nav}<h1>The 120 Basics redrawn with generator v2</h1>
<p>For the owner's final review. Names, IDs, types, positions, sizes, colours (one documented exception) and attribute profiles are unchanged, the 102 original forms are untouched, and nothing is wired into the game data yet. The current Basic art (baseline commit <code>6abcf3b</code>) is the "before" throughout.</p>
<h2>Automated checks</h2><table><tr><th>Check</th><th>Result</th></tr>
<tr><td>Generator diagnostics (no unsupported, invisible or oversized choice)</td><td>${audit.diagnostics.clean} / ${audit.diagnostics.of} clean</td></tr>
<tr><td>Structures used</td><td>${audit.coverage.structuresUsed} of 30 (unused: ${audit.coverage.unused.join(', ') || 'none'}); at most ${audit.coverage.maxPerStructure} monsters on one structure</td></tr>
<tr><td>Exact pixel duplicates, mirror included</td><td>before ${A.before.exactPixelDuplicates} → after ${A.exactPixelDuplicates.length}</td></tr>
<tr><td>Identical silhouettes, mirror included</td><td>before ${A.before.identicalSilhouettes} → after ${A.identicalSilhouettes.length}</td></tr>
<tr><td>Pairs at or above 0.85 similarity</td><td>before ${A.before.pairsAtOrAbove085} → after ${A.pairsAtOrAbove085.length}</td></tr>
<tr><td>Mean similarity to each Basic's nearest design</td><td>before ${A.before.meanNearest} → after ${A.after.meanNearest} (closest pair after: ${A.after.maxNearest})</td></tr>
<tr><td>Decorative features of 1–3 px</td><td>${audit.smallFeatures.count} (listed in audit.json; identity never rests on them alone, see the visual notes)</td></tr>
<tr><td>Recipes adjusted after the first draft</td><td>${audit.tuned} of 120 (each card lists the change)</td></tr></table>
<p style="margin-top:8px">Comparison set: all 120 Basics with each other and with the 102 original forms. See <a href="similarity.html">the closest pairs</a>.</p>
${TYPES.map((t) => `<h2><a href="type-${t.toLowerCase()}.html">${t}</a></h2><p>Before</p>${lineup(byType(t), 'gb')}<p style="margin-top:6px">After</p>${lineup(byType(t), 'ga')}`).join('')}</body></html>\n`);

const pairRow = (p) => { const side = (it) => `<td>${svg(it.g, it.colors, 48, 'mask')} ${svg(it.g, it.colors, 48)}<div style="font-size:11px">${it.label}${it.kind === 'original' ? '<span class="tag">original</span>' : `<span class="tag v">${STRUCTURES[recipes[it.id].structure].name}</span>`}</div></td>`; return `<tr><td>${p.s.toFixed(3)}</td>${side(p.a)}${side(p.b)}</tr>`; };
writeFileSync(join(OUT, 'similarity.html'), `${head('Basic v2 similarity')}${nav}<h1>Closest silhouette pairs</h1><p>${audit.note}</p><p>The 30 closest pairs after the revision, with silhouette and colour at 3×. Before the revision, ${A.before.pairsAtOrAbove085} pairs were at or above 0.85 and ${A.before.identicalSilhouettes} silhouettes were identical.</p><table><tr><th>Score</th><th>Design</th><th>Closest</th></tr>${after.slice(0, 30).map(pairRow).join('')}</table></body></html>\n`);

// ---------------------------------------------------------------- crowded fields: same placement and scale as field-view.js marker()
const ballOn = 30; const camTop = Math.max(-10, Math.min(64, ballOn - 15)) + 46; const Y = (yd) => camTop - yd;
const spots = { off: [[-2, -6], [-2, -3.5], [-2, -1.2], [-2, 1.2], [-2, 3.5], [-2, 6], [-5, 0], [-7.5, -1.5], [-2.5, 11], [-3, -12]], def: [[1.5, -5], [1.5, -2], [1.5, 1], [1.5, 4], [4.5, -6], [4.5, 0.5], [4.5, 6], [8, -11], [8, 11], [12, 0]] };
const ORDER = ['OL', 'TE', 'QB', 'RB', 'WR', 'K', 'DL', 'LB', 'CB', 'S'];
const marker = (spec, team, [x, y], flip) => { const cx = y, cy = Y(ballOn + x); const art = sprite16(spec, 16, { flip }).replace(/<svg class="sprite" width="16" height="16"/, `<svg x="${(cx - 1.7).toFixed(2)}" y="${(cy - 2.5).toFixed(2)}" width="3.4" height="3.4"`);
  return `<ellipse cx="${cx.toFixed(2)}" cy="${(cy + 0.75).toFixed(2)}" rx="1.55" ry="0.7" fill="${team === 'off' ? '#60baff' : '#ff9385'}" stroke="#0d1f17" stroke-width="0.2"/>${art}`; };
const field = (offT, defT, which) => { const k = which === 'b' ? 'b' : 'a'; const pick = (t) => byType(t).sort((a, b) => ORDER.indexOf(a.f.position) - ORDER.indexOf(b.f.position));
  let m = ''; pick(offT).forEach((x, n) => { m += marker(x[k], 'off', spots.off[n], false); }); pick(defT).forEach((x, n) => { m += marker(x[k], 'def', spots.def[n], true); });
  return `<svg viewBox="${FIELD_VIEWBOX}" preserveAspectRatio="xMidYMid meet">${fieldSvg({ ballOn, toGo: 10 })}${m}</svg>`; };
const matchups = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9], [10, 11]].map(([i, j]) => [TYPES[i], TYPES[j]]);
const fcss = `.row{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start;margin:0 0 18px}.row>div{font-size:12px;font-weight:600;color:#5d6b62}.f{border-radius:8px;overflow:hidden;margin-top:4px}.f>svg{display:block;width:100%;height:auto}`;
writeFileSync(join(OUT, 'crowded-field.html'), `${head('Basic v2 crowded field')}<style>${fcss}</style>${nav}<h1>Crowded-field preview (review harness, not gameplay)</h1><p>All 120 Basics, two types per field: one type's ten on offense (blue bases, below the line), the other's on defense (red bases, mirrored), clustered at the line on the game's own field drawing and placed exactly as the match view places sprites (3.4-yard sprites over a team base). Before and after at a 390 px phone width (sprites about 23 px); the first matchup also at a 768 px tablet width (about 46 px).</p>
${matchups.map(([o, d]) => `<h2>${o} offense vs ${d} defense</h2><div class="row"><div>Before<div class="f" style="width:360px">${field(o, d, 'b')}</div></div><div>After<div class="f" style="width:360px">${field(o, d, 'a')}</div></div></div>`).join('')}
<h2>${matchups[0][0]} vs ${matchups[0][1]}, tablet width</h2><div class="row"><div>Before<div class="f" style="width:740px">${field(...matchups[0], 'b')}</div></div><div>After<div class="f" style="width:740px">${field(...matchups[0], 'a')}</div></div></div></body></html>\n`);

console.log(JSON.stringify({ diagnostics: `${audit.diagnostics.clean}/${audit.diagnostics.of}`, coverage: audit.coverage.structuresUsed, unused: audit.coverage.unused, maxPer: audit.coverage.maxPerStructure, before: A.before, after: A.after, exact: A.exactPixelDuplicates, masks: A.identicalSilhouettes, ge085: A.pairsAtOrAbove085, ge080: A.pairsAtOrAbove080, closest: A.closest25.slice(0, 12), small: audit.smallFeatures.count }, null, 1));
process.exit(audit.diagnostics.clean === audit.diagnostics.of && !A.exactPixelDuplicates.length && !A.identicalSilhouettes.length ? 0 : 1);
