// Sprite generator v2 library review: demonstration fixtures for the 60 features, the required three-shape variant sets, the
// proportion controls, face and marking controls, and the compatibility matrices (30 structures × 5 poses).
//   node docs/beast-dex/tools/library_review.mjs        (from the repository root)
// Writes docs/beast-dex/art/generator/{features,controls,face-markings}.html and library-checks.json. Exit 1 when a fixture fails.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spriteGrid, palette } from '../../../src/ui/sprite16.js';
import { STRUCTURES, STRUCTURE_IDS, POSES, CONTROLS, recipeDiagnostics } from '../../../src/ui/sprite-gen.js';
import { FEATURES, FEATURE_IDS, FACE, MARKINGS } from '../../../src/ui/sprite-features.js';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'art', 'generator'); mkdirSync(OUT, { recursive: true });
const C = ['#7f9c8c', '#e2b65a']; const pal = palette(C);
const svg = (g, px, mode) => { let r = ''; for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = g[y][x]; if (v) r += `<rect x="${x}" y="${y}" width="1" height="1" fill="${mode === 'mask' ? '#14201a' : pal[v] || pal.M}"/>`; } return `<svg width="${px}" height="${px}" viewBox="0 0 16 16" shape-rendering="crispEdges">${r}</svg>`; };
const key = (g) => JSON.stringify(g);
const PREF = ['compact_quadruped', 'compact_upright', 'heavy_quadruped', 'amphibian', 'perching_avian', 'running_avian', 'hopping', 'knuckle_walker', 'heavy_upright', 'floating', 'shelled', 'crustacean', 'long_limbed_upright', 'insectoid', 'coiled_serpent', 'burrowing'];
const status = (r) => { const d = recipeDiagnostics(r); return d.problems.length ? 'unsupported' : d.invisible.length ? 'invisible' : d.warnings.length ? 'too_big' : 'ok'; };
const checks = { featureFixtures: {}, variantSets: {}, controls: {}, face: {}, markings: {}, failures: [] };

// 60 feature fixtures: the first preferred structure where the feature is supported, visible and fits
const featureRows = [];
for (const id of FEATURE_IDS) {
  const d = FEATURES[id]; const variant = d.variants?.[0];
  // the first preferred structure that shows every variant visibly and distinctly; otherwise the one that shows the most
  const score = (s) => { const vs = d.variants || [null]; const gs = vs.map((x) => { const r = { structure: s, features: [x ? { id, variant: x } : { id }] }; return status(r) === 'ok' ? key(spriteGrid({ ...r, colors: C })) : null; }); return gs.every(Boolean) ? new Set(gs).size : gs.filter(Boolean).length ? 0.5 : 0; };
  let st = null, best = 0; for (const s of [...PREF, ...STRUCTURE_IDS.filter((x) => !PREF.includes(x))]) { const sc = score(s); if (sc > best) { best = sc; st = s; } if (sc === (d.variants || [null]).length) break; }
  if (!st) { checks.failures.push(`feature ${id}: no visible demonstration fixture`); continue; }
  checks.featureFixtures[id] = { structure: st, variant: variant || null };
  const base = spriteGrid({ structure: st, colors: C }); const vars = d.variants || [null];
  const cells = vars.map((v) => { const r = { structure: st, colors: C, features: [v ? { id, variant: v } : { id }] }; const s = status(r); return { v, g: spriteGrid(r), s }; });
  if (d.variants) { // required three-shape sets must give distinct renders on a compatible structure
    const distinct = new Set(cells.filter((x) => x.s === 'ok').map((x) => key(x.g))).size; checks.variantSets[id] = { structure: st, distinctVisible: distinct, of: vars.length };
    if (['ears', 'horns', 'antlers', 'crest', 'frill', 'shell', 'claws', 'pincers', 'antennae', 'feathered_wings', 'membrane_wings', 'insect_wings', 'tufted_tail'].includes(id) && distinct < 3) checks.failures.push(`feature ${id}: only ${distinct} distinct visible variants on ${st}`);
  }
  featureRows.push(`<tr><td class="lab"><b>${d.label}</b><span>${d.group} · ${d.layer}</span><span>on ${STRUCTURES[st].name}</span></td><td>${svg(base, 64)}<span>without</span></td>${cells.map((x) => `<td class="${x.s}">${svg(x.g, 64, 'mask')}${svg(x.g, 64)}<span>${x.v || 'with'}${x.s !== 'ok' ? ` · ${x.s}` : ''}</span></td>`).join('')}</tr>`);
}
// proportion controls: every value on a structure that supports it
const controlRows = [];
for (const [k, def] of Object.entries(CONTROLS)) {
  const vals = Object.keys(def.values); const extra = k === 'tailCurve' ? [{ id: 'tufted_tail' }] : k === 'wingFold' ? [{ id: 'feathered_wings', variant: undefined }] : k === 'shellShape' ? [] : [];
  const feat = extra.map((f) => (f.variant === undefined && f.id === 'feathered_wings' ? { id: 'feathered_wings' } : f));
  const st = [...PREF, ...STRUCTURE_IDS].find((s) => vals.slice(1).every((v) => status({ structure: s, proportions: { [k]: v }, ...(feat.length ? { features: feat } : {}) }) === 'ok')
    && new Set(vals.map((v) => key(spriteGrid({ structure: s, colors: C, proportions: { [k]: v }, ...(feat.length ? { features: feat } : {}) })))).size === vals.length);
  if (!st) { checks.failures.push(`control ${k}: no structure shows every value`); continue; }
  const gs = vals.map((v) => spriteGrid({ structure: st, colors: C, proportions: { [k]: v }, ...(feat.length ? { features: feat } : {}) }));
  const distinct = new Set(gs.map(key)).size; checks.controls[k] = { structure: st, values: vals.length, distinct }; if (distinct < vals.length) checks.failures.push(`control ${k}: values collapse on ${st}`);
  controlRows.push(`<tr><td class="lab"><b>${k}</b><span>on ${STRUCTURES[st].name}</span></td>${gs.map((g, i) => `<td>${svg(g, 64, 'mask')}${svg(g, 64)}<span>${vals[i]}${i === 0 ? ' (default)' : ''}</span></td>`).join('')}</tr>`);
}
// face and markings
const fmRows = [];
for (const [k, vals] of Object.entries(FACE)) { const st = k === 'eyeSpacing' ? 'compact_upright' : 'compact_upright'; const gs = vals.map((v) => spriteGrid({ structure: st, colors: C, face: { [k]: v } })); const d = new Set(gs.map(key)).size; checks.face[k] = { structure: st, values: vals.length, distinct: d }; if (d < vals.length) checks.failures.push(`face ${k}: values collapse`);
  fmRows.push(`<tr><td class="lab"><b>face ${k}</b></td>${gs.map((g, i) => `<td>${svg(g, 64)}<span>${vals[i]}</span></td>`).join('')}</tr>`); }
{ const vals = MARKINGS.pattern; const st = 'compact_quadruped'; const gs = vals.map((v) => spriteGrid({ structure: st, colors: C, markings: { pattern: v } })); const d = new Set(gs.map(key)).size; checks.markings.pattern = { structure: st, values: vals.length, distinct: d }; if (d < vals.length) checks.failures.push('markings: patterns collapse');
  fmRows.push(`<tr><td class="lab"><b>markings</b></td>${gs.map((g, i) => `<td>${svg(g, 64)}<span>${vals[i]}</span></td>`).join('')}</tr>`); }
// compatibility matrices: every feature (first variant) and every non-default control value, on every structure and pose
const matrix = { features: {}, controls: {} }; const tally = { features: {}, controls: {} };
for (const st of STRUCTURE_IDS) for (const pose of POSES) {
  for (const id of FEATURE_IDS) { const v = FEATURES[id].variants?.[0]; const s = status({ structure: st, pose, features: [v ? { id, variant: v } : { id }] }); ((matrix.features[id] ||= {})[st] ||= {})[pose] = s; tally.features[s] = (tally.features[s] || 0) + 1; }
  for (const [k, def] of Object.entries(CONTROLS)) for (const val of Object.keys(def.values).slice(1)) { const s = status({ structure: st, pose, proportions: { [k]: val } }); ((matrix.controls[`${k}=${val}`] ||= {})[st] ||= {})[pose] = s; tally.controls[s] = (tally.controls[s] || 0) + 1; }
}
checks.compatibilityTally = tally;
writeFileSync(join(OUT, 'compatibility.json'), JSON.stringify({ note: 'Status of every feature (first variant) and every non-default proportion value on every structure and pose: ok | unsupported (rejected with a diagnostic) | invisible (changes no pixel; rejected by recipeDiagnostics) | too_big (fits only by shrinking below 88%). tailCurve and wingFold need a tail or wing feature and are unsupported alone.', tally, ...matrix }, null, 0) + '\n');
writeFileSync(join(OUT, 'library-checks.json'), JSON.stringify(checks, null, 1) + '\n');
const css = `body{margin:0;padding:24px;background:#f3f1ea;color:#1d2621;font:14px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}h1{font-size:22px;margin:0 0 4px}p{margin:0 0 12px;color:#4b5a51;max-width:1000px}table{border-collapse:separate;border-spacing:5px}td{background:#fff;border:1px solid #d9d6cc;border-radius:7px;padding:5px;text-align:center;vertical-align:middle}td span{display:block;font-size:10px;color:#5d6b62}td svg{margin:0 1px}.lab{background:none;border:none;text-align:left;width:150px}.lab b{display:block;font-size:12px}.invisible,.too_big,.unsupported{background:#fbeee8;border-color:#e0b7a6}`;
const page = (t, intro, rows) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t}</title><style>${css}</style></head><body><h1>${t}</h1><p>${intro}</p><table>${rows.join('')}</table></body></html>\n`;
writeFileSync(join(OUT, 'features.html'), page('Generator v2: the 60 features', 'Each feature on a structure where it is supported and visible (chosen automatically), without and with it; features with shape variants show each variant (silhouette, then colour). Neutral demonstration palette. Pink cells would mark a variant that is invisible or too big on that structure.', featureRows));
writeFileSync(join(OUT, 'controls.html'), page('Generator v2: proportion controls', 'Every value of every control on a structure that supports all its values (default first). tailCurve is shown with a tufted tail and wingFold with feathered wings, since they shape those features.', controlRows));
writeFileSync(join(OUT, 'face-markings.html'), page('Generator v2: face and marking controls', 'Eye shape, eye spacing and mouth on a compact upright; marking layouts on a compact quadruped. Secondary to silhouette.', fmRows));
console.log(JSON.stringify({ featureFixtures: Object.keys(checks.featureFixtures).length, variantSets: checks.variantSets, controls: Object.fromEntries(Object.entries(checks.controls).map(([k, v]) => [k, `${v.distinct}/${v.values} on ${v.structure}`])), face: checks.face, markings: checks.markings, tally, failures: checks.failures }, null, 1));
process.exit(checks.failures.length ? 1 : 0);
