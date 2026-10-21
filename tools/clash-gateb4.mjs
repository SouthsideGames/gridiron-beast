#!/usr/bin/env node
// Beast Clash Gate B.4 run. Usage: node tools/clash-gateb4.mjs --section=diag|context|screen|stack|counters|florant|confirm|final[,...] [--seed=<base>] [--ids=<patches>] [--quick]
// Reference configuration = the Gate B.3 final candidate (B.2 patches + Undercurrent 0.8x + Downdraft Daze + Umbrikit notVoluntary,
// Coglet 1.3x, half-cost swapping) on the Gate B working direction. Every row runs in the Lab's seeded 50-battle chunks.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../src/clash/values.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { archetypeOf } from '../src/clash/stats.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const scale = quick ? 0.15 : 1; const only = String(args.section || '').split(',').filter(Boolean);
const baseSeed = Number(args.seed || 4242); const outDir = args.out || 'tools/out/gateb4'; fs.mkdirSync(outDir, { recursive: true });
export const B2 = ['zephiro_tailwind_combo', 'elderoot_grove_12', 'scorchulk_maul_first', 'tsunarok_undertow_hit_chill', 'aeralis_downdraft_hit', 'lumini_mend_10', 'zippit_charge_40', 'nocturne_eclipse_2', 'coglet_gearshot_heavy_break', 'cerebrix_foresight_refused_daze', 'wispira_veil_every4', 'duskyre_cut_every3'];
export const B3 = [...B2.map((x) => (x === 'aeralis_downdraft_hit' ? 'aeralis_downdraft_daze' : x)), 'ripplet_undercurrent_08', 'umbrikit_pounce_not_voluntary'];
const ARCH = ['Tank', 'Striker', 'Support', 'Disruptor', 'Balanced'];
const PAIRS = [['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']];
const S = (id) => `species:${id}`; const POOL = (...ids) => `pool:${ids.join('|')}`;
// A patch set built on B.3: replace any patch for the same species, then add.
const withPatch = (base, id) => { const sp = CLASH_VALUES.movePatches[id].species; return [...base.filter((x) => CLASH_VALUES.movePatches[x].species !== sp), id]; };
const cfgOf = (patches, extra = {}) => battleConfig({ duration: 'C6', swapCost: 'half', patches, ...extra });
const gateB = () => battleConfig({ duration: 'C6' });
const t0 = Date.now(); const rows = []; let battles = 0;
const run = (section, label, fam, cfg, tag) => { const n = Math.max(50, Math.round(fam.n * scale)); const t = Date.now(); const r = runFamilyChunked({ ...fam, n, config: cfg }, 50, baseSeed); battles += n; const x = activeExperiments(cfg); rows.push({ section, label, tag, configLabel: x.length ? x.join(' + ') : 'baseline', ...r, ms: Date.now() - t }); process.stderr.write(`${section} | ${label} | ${tag} | n=${n} | A ${r.aWin[0]}% | ${Date.now() - t} ms\n`); return r; };

// Extended contexts (Gate B.3 tested 18; these add the strategies the eleven species were designed against)
const SHIELD_SUP = POOL('metalhorn', 'snowmoth'); // Ferrhorn, Flurrit
const HEALERS = POOL('tidepaw', 'leafhorn', 'sunwhistle', 'lumen', 'mindwing', 'windlynx', 'elderoot', 'glimmer');
const HEXERS = POOL('pyrelynx', 'mudcub', 'stormlynx', 'hailfang', 'nyxshade', 'prism', 'enigmane');
const STACK = [S('shadewisp'), S('leafhorn'), S('windlynx')];
const EXT = {
  'v shield wall (T + shield Support + T)': { b: ['Tank', SHIELD_SUP, 'Tank'], size: 3, n: 400 },
  'v healer line (3 healing Supports)': { b: HEALERS, size: 3, n: 400 },
  'v Wispira + Florant + Galyx': { b: STACK, size: 3, n: 400 },
  'v condition line (3 hex Disruptors)': { b: HEXERS, size: 3, n: 400 },
  'v Striker + Striker + Tank': { b: ['Striker', 'Striker', 'Tank'], size: 3, n: 400 },
  '5v5 v shield wall (3 T + 2 shield Supports)': { b: ['Tank', 'Tank', 'Tank', SHIELD_SUP, SHIELD_SUP], size: 5, n: 250 },
};
const extFor = (section, id, cfg, tag, which = Object.keys(EXT), k = 1) => { for (const w of which) { const e = EXT[w]; run(section, `${id} | ${w}`, { a: [S(id), ...Array(e.size - 1).fill('random')], b: e.b, size: e.size, n: Math.round(e.n * k), shuffle: true }, cfg, tag); } };
const baseSet = (section, id, cfg, tag, k = 1) => {
  run(section, `${id} | solo3`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: Math.round(1000 * k), shuffle: true }, cfg, tag);
  run(section, `${id} | solo5`, { a: [S(id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: Math.round(600 * k), shuffle: true }, cfg, tag);
  for (const a of ARCH) run(section, `${id} | v ${a}`, { a: [S(id), 'random', 'random'], b: a, size: 3, n: Math.round(400 * k), shuffle: true }, cfg, tag);
  for (const [pl, ks] of Object.entries({ '+2 Tanks': ['Tank', 'Tank'], '+2 Strikers': ['Striker', 'Striker'], '+Tank +Support': ['Tank', 'Support'] })) run(section, `${id} | ${pl}`, { a: [S(id), ...ks], b: 'random', size: 3, n: Math.round(500 * k), shuffle: true }, cfg, tag);
};
export const ELEVEN = ['rockram', 'nightowl', 'ironcub', 'gearwing', 'cerebrix', 'sablewing', 'aurodrax', 'terrabull', 'nocturne', 'scaleguard', 'thornkit'];
export const VARIANTS = {
  gearwing: ['coglet_shieldbane', 'coglet_heavy_vsshield', 'coglet_shred', 'coglet_pierce_shield', 'coglet_break_charge'],
  cerebrix: ['cerebrix_refused_daze_hit', 'cerebrix_refused_shock', 'cerebrix_strip', 'cerebrix_refused_daze_hit025', 'cerebrix_refused_shock50', 'cerebrix_refused_shock35', 'cerebrix_refused_daze_hit015'],
  rockram: ['craggo_ram_break', 'craggo_ram_every', 'craggo_ram_chill'],
  nightowl: ['noctlet_always_first', 'noctlet_swoop_surge'],
  ironcub: ['ferrcub_forge_fast', 'ferrcub_forge_long', 'ferrcub_forge_every', 'ferrcub_forge_big', 'ferrcub_forge_quick2'],
  sablewing: ['sablewing_shadow_hex', 'sablewing_shadow_two'],
  aurodrax: ['aurodrax_sovereign_surge', 'aurodrax_sovereign_sd'],
  terrabull: ['terrabull_quake_hex', 'terrabull_quake_sure'],
  nocturne: ['nocturne_eclipse_entry', 'nocturne_eclipse_every3', 'nocturne_eclipse_spread'],
  scaleguard: ['scalor_hide_quick', 'scalor_hide_mid', 'scalor_hide_15_8'],
  thornkit: ['spriglet_seed_even', 'spriglet_seed_steady', 'spriglet_seed_brace'],
};

// ---- diagnostics: every species under B.3 with the move-use tallies (shields met, conditions, refusals, knockouts)
if (only.includes('diag')) { const cfg = cfgOf(B3); for (const s of SPECIES_DEX) { run('diag', `${s.id} | solo3`, { a: [S(s.id), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, 'B.3'); run('diag', `${s.id} | solo5`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 600, shuffle: true }, cfg, 'B.3'); } }
// ---- extended contexts for every species under B.3 (medians for the new contexts)
if (only.includes('context')) { const cfg = cfgOf(B3); for (const s of SPECIES_DEX) extFor('context', s.id, cfg, 'B.3'); }
// ---- screening: each candidate against its species' B.3 version on the same seeds
if (only.includes('screen')) {
  const want = args.ids ? String(args.ids).split(',') : null;
  for (const [sp, vs] of Object.entries(VARIANTS)) {
    const list = vs.filter((v) => !want || want.includes(v)); if (!list.length && want) continue;
    if (!want) { baseSet('screen', sp, cfgOf(B3), 'B.3'); extFor('screen', sp, cfgOf(B3), 'B.3'); }
    for (const v of list) { const cfg = cfgOf(withPatch(B3, v)); baseSet('screen', sp, cfg, v); extFor('screen', sp, cfg, v); run('screen', `random 3v3 | ${sp}`, { a: 'random', b: 'random', size: 3, n: 1500, overall: 62, overallSpread: 7, shuffle: true }, cfg, v); }
  }
}
// ---- the Support stack: which single species lift a team against it (all 72, B.3 and B.3 + Florant 14%)
if (only.includes('stack')) {
  for (const [tag, ids] of [['B.3', B3], ['B.3 + Florant 14%', [...B3, 'florant_shade_14']]]) for (const s of SPECIES_DEX) run('stack', `${s.id} | +2 random v stack`, { a: [S(s.id), 'random', 'random'], b: STACK, size: 3, n: 300, shuffle: true }, cfgOf(ids), tag);
}
// ---- counter teams against the stack: listed via --teams JSON file; stack plays no-swap and smart, counter plays no-swap and smart
if (only.includes('counters')) {
  const teams = JSON.parse(fs.readFileSync(String(args.teams), 'utf8'));
  const sets = args.ids ? [['custom', String(args.ids).split(',')]] : [['B.3', B3], ['B.3 + Florant 14%', [...B3, 'florant_shade_14']]];
  for (const [tag, ids] of sets) for (const [name, ks] of Object.entries(teams)) {
    for (const [pt, pol] of [['none/none', null], ['counter smart/stack none', { a: 'smart', b: 'none' }], ['none/stack smart', { a: 'none', b: 'smart' }], ['smart/smart', { a: 'smart', b: 'smart' }]]) run('counters', `${name} v stack | ${pt}`, { a: ks.map(S), b: STACK, size: 3, n: 600, shuffle: true, sidesAlternate: false }, cfgOf(ids, pol ? { policies: pol } : {}), tag);
    run('counters', `${name} v random`, { a: ks.map(S), b: 'random', size: 3, n: 600, shuffle: true }, cfgOf(ids), tag);
    for (const a of ARCH) run('counters', `${name} v 3 ${a}`, { a: ks.map(S), b: a, size: 3, n: 300, shuffle: true }, cfgOf(ids), tag);
  }
}
// ---- Florant Test A: 17.2% v 14% across the requested contexts
if (only.includes('florant')) {
  for (const [tag, ids] of [['17.2% (B.3)', B3], ['14%', [...B3, 'florant_shade_14']]]) {
    const cfg = cfgOf(ids);
    run('florant', 'leafhorn | solo3', { a: [S('leafhorn'), 'random', 'random'], b: 'random', size: 3, n: 2000, shuffle: true }, cfg, tag);
    run('florant', 'leafhorn | solo5', { a: [S('leafhorn'), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 1200, shuffle: true }, cfg, tag);
    for (const a of ARCH) run('florant', `leafhorn | v ${a}`, { a: [S('leafhorn'), 'random', 'random'], b: a, size: 3, n: 600, shuffle: true }, cfg, tag);
    run('florant', 'stack v random', { a: STACK, b: 'random', size: 3, n: 2000, shuffle: true }, cfg, tag);
    run('florant', 'stack v random 5v5 (stack + 2 random)', { a: [...STACK, 'random', 'random'], b: 'random', size: 5, n: 1000, shuffle: true }, cfg, tag);
    for (const [x, y] of [['Tank', 'Support'], ['Striker', 'Support'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Support', 'Support']]) for (const size of [3, 5]) run('florant', `${x} v ${y} ${size}v${size}`, { a: x, b: y, size, n: size === 3 ? 1000 : 800 }, cfg, tag);
    run('florant', 'mixed Support team (2 Su + T) v random', { a: ['Support', 'Support', 'Tank'], b: 'random', size: 3, n: 1500, shuffle: true }, cfg, tag);
    run('florant', 'mixed Support team 5v5 (3 Su + 2 T) v random', { a: ['Support', 'Support', 'Support', 'Tank', 'Tank'], b: 'random', size: 5, n: 1000, shuffle: true }, cfg, tag);
    run('florant', 'defensive mirror 3 T + 2 Su', { a: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], b: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], size: 5, n: 800 }, cfg, tag);
    run('florant', 'Florant + 2 Tanks v 3 Strikers', { a: [S('leafhorn'), 'Tank', 'Tank'], b: 'Striker', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('florant', 'Florant + Striker + Tank v random', { a: [S('leafhorn'), 'Striker', 'Tank'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    for (const id of ['shadewisp', 'windlynx', 'tidepaw', 'sunwhistle', 'zephyr', 'elderoot']) { run('florant', `${id} | solo3`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag); }
    run('florant', 'Random 3v3', { a: 'random', b: 'random', size: 3, n: 3000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    run('florant', 'Random 5v5', { a: 'random', b: 'random', size: 5, n: 2000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
  }
}
// ---- confirmation on fresh seeds (pass --seed): chosen candidates v their B.3 versions, larger samples
if (only.includes('confirm')) {
  const ids = String(args.ids || '').split(',').filter(Boolean);
  for (const v of ids) { const sp = CLASH_VALUES.movePatches[v].species; baseSet('confirm', sp, cfgOf(B3), 'B.3', 1.5); extFor('confirm', sp, cfgOf(B3), 'B.3', undefined, 1.5); baseSet('confirm', sp, cfgOf(withPatch(B3, v)), v, 1.5); extFor('confirm', sp, cfgOf(withPatch(B3, v)), v, undefined, 1.5); }
}
// ---- final: Gate B v B.2 v B.3 v B.4 (all species solos, matrices, contexts for the audit)
if (only.includes('final')) {
  const FINAL = String(args.final || '').split(',').filter(Boolean);
  for (const [tag, cfg] of [['Gate B baseline', gateB()], ['B.2 provisional', cfgOf(B2)], ['B.3 candidate', cfgOf(B3)], ['B.4 combined', cfgOf(FINAL)]]) {
    run('final', 'Random 3v3', { a: 'random', b: 'random', size: 3, n: 4000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    run('final', 'Random 5v5', { a: 'random', b: 'random', size: 5, n: 2500, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    run('final', 'Random 3v3, fixed order', { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7 }, cfg, tag);
    for (const [x, y] of PAIRS) { run('final', `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, tag); run('final', `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, tag); }
    for (const m of ['Tank', 'Support']) run('final', `5 ${m}s mirror`, { a: m, b: m, size: 5, n: 800 }, cfg, tag);
    run('final', 'Wispira + Florant + Galyx v random', { a: STACK, b: 'random', size: 3, n: 1500, shuffle: true }, cfg, tag);
    run('final', 'Random 3v3, smart both', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag);
    run('final', 'Random 5v5, smart both', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag);
    if (tag === 'B.3 candidate' || tag === 'B.4 combined' || args.allsolo) for (const s of SPECIES_DEX) { run('final', `${s.id} | solo3`, { a: [S(s.id), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag); run('final', `${s.id} | solo5`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 600, shuffle: true }, cfg, tag); }
  }
}
// ---- audit: every species under the B.4 combined configuration in all 24 contexts (for the viability audit)
if (only.includes('audit')) {
  const cfg = cfgOf(String(args.final || '').split(',').filter(Boolean));
  for (const s of SPECIES_DEX) { for (const a of ARCH) { run('audit', `${s.id} | v ${a}`, { a: [S(s.id), 'random', 'random'], b: a, size: 3, n: 400, shuffle: true }, cfg, 'B.4'); run('audit', `${s.id} | 5v5 v ${a}`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: a, size: 5, n: 250, shuffle: true }, cfg, 'B.4'); }
    for (const [pl, ks] of Object.entries({ '+2 Tanks': ['Tank', 'Tank'], '+2 Strikers': ['Striker', 'Striker'], '+2 Supports': ['Support', 'Support'], '+Tank +Striker': ['Tank', 'Striker'], '+Tank +Support': ['Tank', 'Support'], '+Striker +Support': ['Striker', 'Support'] })) run('audit', `${s.id} | ${pl}`, { a: [S(s.id), ...ks], b: 'random', size: 3, n: 500, shuffle: true }, cfg, 'B.4');
    extFor('audit', s.id, cfg, 'B.4'); }
}

if (only.length) {
  const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, quick, baseSeed, sections: only, ms: Date.now() - t0, battles, species: SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, archetype: archetypeOf(s.id) })), rows };
  const file = path.join(outDir, `gateb4-${only.join('-')}${args.tag ? '-' + args.tag : ''}.json`); fs.writeFileSync(file, JSON.stringify(report));
  console.log(`${rows.length} rows, ${battles} battles, ${Math.round(report.ms / 1000)} s → ${file}`);
}
