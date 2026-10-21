#!/usr/bin/env node
// Beast Clash Gate B.3 run. Usage: node tools/clash-gateb3.mjs --section=coglet|ripplet|counters|species|swap|final[,...] [--final=<patch ids>] [--quick]
// Provisional baseline = the full Gate B.2 configuration (12 patches + half-cost voluntary swapping) on the Gate B working
// direction (back row E, Shock as is, O1-O3 off, duration C6, sudden death E/F from 12, forced-swap cadence unchanged).
// Every row runs in the Lab's seeded 50-battle chunks; nothing here changes a default.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../src/clash/values.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { archetypeOf } from '../src/clash/stats.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const scale = quick ? 0.15 : 1; const only = String(args.section || '').split(',').filter(Boolean); // no section = nothing runs (safe to import B2)
const outDir = args.out || 'tools/out/gateb3'; fs.mkdirSync(outDir, { recursive: true });
const ARCH = ['Tank', 'Striker', 'Support', 'Disruptor', 'Balanced'];
const PAIRS = [['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']];
export const B2 = ['zephiro_tailwind_combo', 'elderoot_grove_12', 'scorchulk_maul_first', 'tsunarok_undertow_hit_chill', 'aeralis_downdraft_hit', 'lumini_mend_10', 'zippit_charge_40', 'nocturne_eclipse_2', 'coglet_gearshot_heavy_break', 'cerebrix_foresight_refused_daze', 'wispira_veil_every4', 'duskyre_cut_every3'];
const swapIn = (ids, from, to) => ids.map((x) => (x === from ? to : x)).filter(Boolean);
// The Gate B working baseline and the B.2 provisional baseline. B.2 always carries half-cost swapping; it only matters when a side has a swap policy.
const gateB = (extra = {}) => battleConfig({ duration: 'C6', ...extra });
const b2 = (patches = B2, extra = {}) => battleConfig({ duration: 'C6', swapCost: 'half', patches, ...extra });
const S = (id) => `species:${id}`; const POOL = (...ids) => `pool:${ids.join('|')}`;
const t0 = Date.now(); const rows = []; let battles = 0;
const run = (section, label, fam, cfg, tag) => { const n = Math.max(50, Math.round(fam.n * scale)); const t = Date.now(); const r = runFamilyChunked({ ...fam, n, config: cfg }); battles += n; const x = activeExperiments(cfg); rows.push({ section, label, tag, configLabel: x.length ? x.join(' + ') : 'baseline', ...r, ms: Date.now() - t }); process.stderr.write(`${section} | ${label} | ${tag} | n=${n} | A ${r.aWin[0]}% | ${Date.now() - t} ms\n`); return r; };
const solo = (section, id, cfg, tag, n3 = 1500, n5 = 1000) => { run(section, `${id} | solo3`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: n3, shuffle: true }, cfg, tag); run(section, `${id} | solo5`, { a: [S(id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: n5, shuffle: true }, cfg, tag); };
const vsArch = (section, id, cfg, tag, n = 600) => { for (const k of ARCH) run(section, `${id} | vs ${k}`, { a: [S(id), 'random', 'random'], b: k, size: 3, n, shuffle: true }, cfg, tag); };
const randomCore = (section, cfg, tag, n3 = 3000, n5 = 2000) => { run(section, 'Random 3v3', { a: 'random', b: 'random', size: 3, n: n3, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag); run(section, 'Random 5v5', { a: 'random', b: 'random', size: 5, n: n5, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag); };
// Every multiset of archetypes of a given size, as ordinary-species slot specs (commons and uncommons only).
const multisets = (size, from = ARCH) => { const out = []; const rec = (start, cur) => { if (cur.length === size) { out.push(cur.slice()); return; } for (let i = start; i < from.length; i++) { cur.push(from[i]); rec(i, cur); cur.pop(); } }; rec(0, []); return out; };
const comp = (ks, pool = 'ordinary') => { const a = ks.map((k) => (pool ? `${pool}:${k}` : k)); return a; };
const short = { Tank: 'T', Striker: 'S', Support: 'Su', Disruptor: 'D', Balanced: 'B' };
const compLabel = (ks) => ks.map((k) => short[k]).join('+');

// ---- Coglet: 1.3x v 1.4x heavy strike, both with double shield-break and the steady roll
if (only.includes('coglet')) {
  const C13 = B2, C14 = swapIn(B2, 'coglet_gearshot_heavy_break', 'coglet_gearshot_heavy14_break');
  for (const [tag, ids] of [['B.2 (1.3x)', C13], ['B.3 (1.4x)', C14]]) {
    const cfg = b2(ids);
    solo('coglet', 'gearwing', cfg, tag, 2000, 1200); vsArch('coglet', 'gearwing', cfg, tag, 800);
    for (const k of ARCH) run('coglet', `gearwing | 5v5 vs ${k}`, { a: [S('gearwing'), 'random', 'random', 'random', 'random'], b: k, size: 5, n: 500, shuffle: true }, cfg, tag);
    const mates = { 'Tank + Support (defensive)': ['Tank', 'Support'], 'Tank + Tank (wall)': ['Tank', 'Tank'], 'Striker + Striker (offensive)': ['Striker', 'Striker'], 'Striker + Disruptor (pressure)': ['Striker', 'Disruptor'], 'Support + Support (sustain)': ['Support', 'Support'], 'ordinary Tank + ordinary Striker': ['ordinary:Tank', 'ordinary:Striker'] };
    for (const [m, ks] of Object.entries(mates)) run('coglet', `gearwing + ${m} v random`, { a: [S('gearwing'), ...ks], b: 'random', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('coglet', 'gearwing + Tank + Striker v 3 Tanks', { a: [S('gearwing'), 'Tank', 'Striker'], b: 'Tank', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('coglet', 'gearwing + Striker + Striker v 3 Supports', { a: [S('gearwing'), 'Striker', 'Striker'], b: 'Support', size: 3, n: 800, shuffle: true }, cfg, tag);
    randomCore('coglet', cfg, tag, 3000, 2000);
    for (const id of ['ironcub', 'steelpaw', 'aegistron']) solo('coglet', id, cfg, tag, 800, 500);
  }
}

// ---- Ripplet: Undercurrent's arrival hit (0.5x today from the back-row rule) at 0.65x and 0.8x, with and without the B.2 Downdraft
if (only.includes('ripplet')) {
  const NO_AER = B2.filter((x) => x !== 'aeralis_downdraft_hit');
  const variants = [
    ['B.2 (0.5x, Downdraft hit)', B2], ['B.2 minus Downdraft hit', NO_AER], ['B.2 + Downdraft Daze', swapIn(B2, 'aeralis_downdraft_hit', 'aeralis_downdraft_daze')],
    ['0.65x', [...B2, 'ripplet_undercurrent_065']], ['0.8x', [...B2, 'ripplet_undercurrent_08']],
    ['0.65x + Downdraft Daze', [...swapIn(B2, 'aeralis_downdraft_hit', 'aeralis_downdraft_daze'), 'ripplet_undercurrent_065']], ['0.8x + Downdraft Daze', [...swapIn(B2, 'aeralis_downdraft_hit', 'aeralis_downdraft_daze'), 'ripplet_undercurrent_08']],
  ];
  run('ripplet', 'tidefin | solo3', { a: [S('tidefin'), 'random', 'random'], b: 'random', size: 3, n: 2000, shuffle: true }, gateB(), 'Gate B baseline');
  run('ripplet', 'tidefin | solo5', { a: [S('tidefin'), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 1200, shuffle: true }, gateB(), 'Gate B baseline');
  for (const [tag, ids] of variants) {
    const cfg = b2(ids);
    solo('ripplet', 'tidefin', cfg, tag, 2000, 1200); vsArch('ripplet', 'tidefin', cfg, tag, 600);
    for (const id of ['skywarden', 'tsunarok', 'cerebrix']) solo('ripplet', id, cfg, tag, 1000, 700);
    run('ripplet', 'Ripplet + Tsunarok + random v random', { a: [S('tidefin'), S('tsunarok'), 'random'], b: 'random', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('ripplet', 'Ripplet + Aeralis + random v random', { a: [S('tidefin'), S('skywarden'), 'random'], b: 'random', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('ripplet', 'Ripplet + Cerebrix + random v random', { a: [S('tidefin'), S('cerebrix'), 'random'], b: 'random', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('ripplet', 'Ripplet + Tank + Striker v random', { a: [S('tidefin'), 'Tank', 'Striker'], b: 'random', size: 3, n: 800, shuffle: true }, cfg, tag);
    run('ripplet', 'Forced-swap stack 3v3 (Ripplet, Tsunarok, Cerebrix) v random', { a: [S('tidefin'), S('tsunarok'), S('cerebrix')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('ripplet', 'Forced-swap stack 5v5 (all four + Tank) v random', { a: [S('tidefin'), S('tsunarok'), S('cerebrix'), S('skywarden'), 'Tank'], b: 'random', size: 5, n: 800, shuffle: true }, cfg, tag);
    run('ripplet', 'Forced-swap stack 5v5 v 5 Tanks', { a: [S('tidefin'), S('tsunarok'), S('cerebrix'), S('skywarden'), 'Tank'], b: 'Tank', size: 5, n: 600, shuffle: true }, cfg, tag);
    randomCore('ripplet', cfg, tag, 2000, 1200);
  }
}

// ---- Counter search: every ordinary-species archetype composition against each extreme target, on the B.2 baseline
if (only.includes('counters')) {
  const cfg = b2();
  const targets3 = { '3 Tanks': 'Tank', '3 Supports': 'Support', 'Wispira + Florant + Galyx': POOL('shadewisp', 'leafhorn', 'windlynx'), '3 Disruptors': 'Disruptor', '3 Balanced': 'Balanced' };
  for (const [tl, tb] of Object.entries(targets3)) for (const ks of multisets(3)) run('counters', `${compLabel(ks)} (ordinary) v ${tl}`, { a: comp(ks), b: tb, size: 3, n: 500, shuffle: true }, cfg, 'B.2');
  const stack = [S('shadewisp'), S('leafhorn'), S('windlynx')];
  run('counters', 'any 3 Supports v Wispira + Florant + Galyx (control)', { a: 'Support', b: stack, size: 3, n: 600, shuffle: true }, cfg, 'B.2');
  for (const [tl, tb] of Object.entries({ '5 Supports': 'Support', '5 Tanks': 'Tank' })) for (const ks of multisets(5)) run('counters', `${compLabel(ks)} (ordinary) v ${tl}`, { a: comp(ks), b: tb, size: 5, n: 300, shuffle: true }, cfg, 'B.2');
}

// ---- Species-level counters: which single monster lifts a team against each extreme target (B.2 baseline)
if (only.includes('species')) {
  const cfg = b2();
  for (const s of SPECIES_DEX) {
    run('species', `${s.id} | +2 random v 3 Tanks`, { a: [S(s.id), 'random', 'random'], b: 'Tank', size: 3, n: 400, shuffle: true }, cfg, 'B.2');
    run('species', `${s.id} | +2 random v 3 Supports`, { a: [S(s.id), 'random', 'random'], b: 'Support', size: 3, n: 400, shuffle: true }, cfg, 'B.2');
    run('species', `${s.id} | +2 Disruptors v 3 Supports`, { a: [S(s.id), 'Disruptor', 'Disruptor'], b: 'Support', size: 3, n: 300, shuffle: true }, cfg, 'B.2');
    run('species', `${s.id} | +2 Disruptors v 3 Tanks`, { a: [S(s.id), 'Disruptor', 'Disruptor'], b: 'Tank', size: 3, n: 300, shuffle: true }, cfg, 'B.2');
    run('species', `${s.id} | +2 Balanced v 3 Tanks`, { a: [S(s.id), 'Balanced', 'Balanced'], b: 'Tank', size: 3, n: 300, shuffle: true }, cfg, 'B.2');
    run('species', `${s.id} | +4 random v 5 Supports`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: 'Support', size: 5, n: 300, shuffle: true }, cfg, 'B.2');
  }
}

// ---- Swapping in specialised matchups: does half-cost swapping help the disadvantaged side fairly, and can it be farmed?
if (only.includes('swap')) {
  const cases = [
    ['3 Disruptors v 3 Supports', 'Disruptor', 'Support', 3], ['3 Disruptors v 3 Tanks', 'Disruptor', 'Tank', 3], ['3 Balanced v 3 Tanks', 'Balanced', 'Tank', 3],
    ['5 Disruptors v 5 Supports', 'Disruptor', 'Support', 5], ['5 Balanced v 5 Supports', 'Balanced', 'Support', 5],
    ['Mixed (T+S+D) v 3 Supports', ['Tank', 'Striker', 'Disruptor'], 'Support', 3], ['Mixed (S+S+Su) v 3 Tanks', ['Striker', 'Striker', 'Support'], 'Tank', 3],
  ];
  for (const [label, a, b, size] of cases) {
    const n = size === 3 ? 1000 : 800;
    for (const [tag, cfg] of [['no swaps', b2(B2)], ['A smart, action cost', b2(B2, { swapCost: 'action', policies: { a: 'smart', b: 'none' } })], ['A smart, half cost', b2(B2, { policies: { a: 'smart', b: 'none' } })], ['B smart, half cost', b2(B2, { policies: { a: 'none', b: 'smart' } })], ['both smart, half cost', b2(B2, { policies: { a: 'smart', b: 'smart' } })]])
      run('swap', label, { a, b, size, n, sidesAlternate: false }, cfg, tag);
  }
  // Entry re-arming: Umbrikit's dodge and Murklaw's Ambush reset on every entry. Does a swapper farm them?
  for (const id of ['shadowkit', 'mireclaw', 'boulderox', 'nyxshade']) for (const [tag, cfg] of [['no swaps', b2(B2)], ['smart, action cost', b2(B2, { swapCost: 'action', policies: { a: 'smart', b: 'none' } })], ['smart, half cost', b2(B2, { policies: { a: 'smart', b: 'none' } })], ['smart, free (reference)', b2(B2, { swapCost: 'free', policies: { a: 'smart', b: 'none' } })]]) {
    run('swap', `${id} + 2 random v random (entry re-arm)`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg, tag);
  }
  // Condition dodging: a smart swapper against condition-heavy Disruptor lines, half v action.
  for (const [tag, cfg] of [['no swaps', b2(B2)], ['smart, action cost', b2(B2, { swapCost: 'action', policies: { a: 'smart', b: 'none' } })], ['smart, half cost', b2(B2, { policies: { a: 'smart', b: 'none' } })]]) {
    run('swap', 'random 3 v 3 Disruptors (condition dodging)', { a: 'random', b: 'Disruptor', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg, tag);
    run('swap', 'random 5 v 5 Disruptors (condition dodging)', { a: 'random', b: 'Disruptor', size: 5, n: 1000, shuffle: true, sidesAlternate: false }, cfg, tag);
  }
}

// ---- Counters, round two: full-rarity compositions and named counter teams against the two targets nothing ordinary beat
if (only.includes('counters2')) {
  const stack = [S('shadewisp'), S('leafhorn'), S('windlynx')];
  for (const [tl, tb] of Object.entries({ '3 Tanks': 'Tank', 'Wispira + Florant + Galyx': stack })) for (const ks of multisets(3)) run('counters2', `${compLabel(ks)} (any rarity) v ${tl}`, { a: ks, b: tb, size: 3, n: 500, shuffle: true }, b2(), 'B.2');
  const named = {
    'Duskyre + Scorchulk + Shardok': [S('duskrunner'), S('cinderclaw'), S('glaciron')],
    'Duskyre + Drakling + Glaciram (all ordinary)': [S('duskrunner'), S('drakeling'), S('icehorn')],
    'Scorchulk + Drakling + Pyronix (ordinary Strikers)': [S('cinderclaw'), S('drakeling'), S('firestorm')],
    'Florant + Duskyre + Tank': [S('leafhorn'), S('duskrunner'), 'Tank'],
    'Florant + 2 Strikers': [S('leafhorn'), 'Striker', 'Striker'],
    'Nyxshade + Duskyre + Shardok': [S('nyxshade'), S('duskrunner'), S('glaciron')],
    'Prismara + Scorchulk + Glaciram (ordinary)': [S('prism'), S('cinderclaw'), S('icehorn')],
    'Steelpaw + Duskyre + Tank': [S('steelpaw'), S('duskrunner'), 'Tank'],
  };
  const targets = { 'Wispira + Florant + Galyx': stack, '3 Tanks': 'Tank', '3 Supports': 'Support' };
  for (const [nl, na] of Object.entries(named)) for (const [tl, tb] of Object.entries(targets)) for (const [tag, extra] of [['no swaps', {}], ['both smart, half cost', { policies: { a: 'smart', b: 'smart' } }]])
    run('counters2', `${nl} v ${tl}`, { a: na, b: tb, size: 3, n: 800, shuffle: true }, b2(B2, extra), tag);
  // Florant options, only to show the price if the stack had no counter (owner: do not nerf automatically)
  for (const [tag, ids] of [['B.2', B2], ['+ Florant 14%', [...B2, 'florant_shade_14']], ['+ Florant every 3rd', [...B2, 'florant_shade_every3']]]) {
    run('counters2', 'Florant options | stack v random', { a: stack, b: 'random', size: 3, n: 1000, shuffle: true }, b2(ids), tag);
    run('counters2', 'Florant options | Duskyre + Scorchulk + Shardok v stack', { a: named['Duskyre + Scorchulk + Shardok'], b: stack, size: 3, n: 800, shuffle: true }, b2(ids), tag);
    run('counters2', 'Florant options | Tank v Support 3v3', { a: 'Tank', b: 'Support', size: 3, n: 1000 }, b2(ids), tag);
    run('counters2', 'Florant options | Striker v Support 3v3', { a: 'Striker', b: 'Support', size: 3, n: 1000 }, b2(ids), tag);
    solo('counters2', 'leafhorn', b2(ids), tag, 1500, 1000);
  }
}

// ---- Umbrikit entry-dodge re-arm: species-level fixes, with and without swapping
if (only.includes('umbrikit')) {
  const vs = [['B.2', B2], ['once per battle', [...B2, 'umbrikit_pounce_once']], ['not on voluntary swap-in', [...B2, 'umbrikit_pounce_not_voluntary']]];
  for (const [tag, ids] of vs) {
    for (const [pol, extra] of [['no swaps', {}], ['smart half', { policies: { a: 'smart', b: 'none' } }], ['both smart half', { policies: { a: 'smart', b: 'smart' } }]]) {
      run('umbrikit', `shadowkit + 2 random v random, ${pol}`, { a: [S('shadowkit'), 'random', 'random'], b: 'random', size: 3, n: 2000, shuffle: true, sidesAlternate: false }, b2(ids, extra), tag);
      run('umbrikit', `shadowkit + 4 random v random 5v5, ${pol}`, { a: [S('shadowkit'), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 1200, shuffle: true, sidesAlternate: false }, b2(ids, extra), tag);
    }
    vsArch('umbrikit', 'shadowkit', b2(ids), tag, 600);
  }
}

// ---- Niches under the final package: every species with two random teammates against each pure archetype, and in 5v5
if (only.includes('niche')) {
  const cfg = b2(String(args.final || '').split(',').filter(Boolean));
  for (const s of SPECIES_DEX) { vsArch('niche', s.id, cfg, 'B.3 final', 400); for (const k of ARCH) run('niche', `${s.id} | 5v5 vs ${k}`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: k, size: 5, n: 250, shuffle: true }, cfg, 'B.3 final'); }
}

// ---- Synergy under the final package: every species with realistic partner pairs, against random teams
if (only.includes('synergy')) {
  const cfg = b2(String(args.final || '').split(',').filter(Boolean));
  const partners = { '+2 Tanks': ['Tank', 'Tank'], '+2 Strikers': ['Striker', 'Striker'], '+2 Supports': ['Support', 'Support'], '+Tank +Striker': ['Tank', 'Striker'], '+Tank +Support': ['Tank', 'Support'], '+Striker +Support': ['Striker', 'Support'] };
  for (const s of SPECIES_DEX) for (const [pl, ks] of Object.entries(partners)) run('synergy', `${s.id} | ${pl}`, { a: [S(s.id), ...ks], b: 'random', size: 3, n: 500, shuffle: true }, cfg, 'B.3 final');
}

// ---- Final: Gate B baseline v B.2 provisional v B.3 recommendation
if (only.includes('final')) {
  const FINAL = String(args.final || '').split(',').filter(Boolean);
  const ALT = String(args.alt || '').split(',').filter(Boolean);
  if (ALT.length) { // optional owner variant: core, matrix and the relevant species only
    const cfg = b2(ALT), tag = 'B.3 + owner option';
    randomCore('final', cfg, tag, 4000, 2500);
    for (const [x, y] of PAIRS) { run('final', `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, tag); run('final', `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, tag); }
    run('final', 'Wispira + Florant + Galyx v random', { a: [S('shadewisp'), S('leafhorn'), S('windlynx')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    for (const id of ['leafhorn', 'shadewisp', 'windlynx', 'zephyr', 'elderoot', 'glimmer', 'flicker']) solo('final', id, cfg, tag, 1000, 600);
  }
  for (const [tag, cfg] of [['Gate B baseline', gateB()], ['B.2 provisional', b2(B2)], ['B.3 final', b2(FINAL)]]) {
    randomCore('final', cfg, tag, 4000, 2500);
    run('final', 'Random 3v3, fixed order', { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7 }, cfg, tag);
    run('final', 'Random 5v5, fixed order', { a: 'random', b: 'random', size: 5, n: 1500, overall: 62, overallSpread: 7 }, cfg, tag);
    for (const [x, y] of PAIRS) { run('final', `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, tag); run('final', `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, tag); }
    for (const m of ['Tank', 'Support', 'Striker']) run('final', `5 ${m}s mirror`, { a: m, b: m, size: 5, n: 800 }, cfg, tag);
    run('final', 'Wispira + Florant + Galyx v random', { a: [S('shadewisp'), S('leafhorn'), S('windlynx')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Random 3v3, smart both (swap frequency)', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag);
    run('final', 'Random 5v5, smart both (swap frequency)', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag);
    for (const s of SPECIES_DEX) solo('final', s.id, cfg, tag, 1000, 600);
  }
}

const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, quick, sections: only, ms: Date.now() - t0, battles, species: SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, archetype: archetypeOf(s.id) })), rows };
const file = path.join(outDir, `gateb3-${only.join('-')}.json`); fs.writeFileSync(file, JSON.stringify(report));
console.log(`${rows.length} rows, ${battles} battles, ${Math.round(report.ms / 1000)} s → ${file}`);
