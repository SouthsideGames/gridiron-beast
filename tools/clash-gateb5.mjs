#!/usr/bin/env node
// Beast Clash Gate B.5 run. Usage: node tools/clash-gateb5.mjs --section=<names> [--ids=<patches>] [--seed=<base>] [--tag=<t>] [--species=<ids>] [--k=<scale>]
// Sections: screen | confirm | sud | counters | final | audit. Reference = the exact Gate B.4 combined configuration from
// src/clash/balance-manifest.js (gateConfig('B.4')); a candidate replaces its species' patch in that configuration and nothing else.
// The fixed comparison suite is the Gate B.4 audit's 24 contexts (same labels, sizes and seeds); exploratory rows are tagged 'explore'.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../src/clash/values.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { archetypeOf } from '../src/clash/stats.js';
import { gateConfig, GATE_PATCHES, B4_PATCHES } from '../src/clash/balance-manifest.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const only = String(args.section || '').split(',').filter(Boolean); const K = Number(args.k || 1);
const baseSeed = Number(args.seed || 4242); const outDir = args.out || 'tools/out/gateb5'; fs.mkdirSync(outDir, { recursive: true });
const P = CLASH_VALUES.movePatches;
const ARCH = ['Tank', 'Striker', 'Support', 'Disruptor', 'Balanced'];
const S = (id) => `species:${id}`; const POOL = (...ids) => `pool:${ids.join('|')}`;
export const withPatch = (base, id) => { const sp = P[id].species; return [...base.filter((x) => P[x].species !== sp), id]; };
const cfgWith = (patches, extra = {}) => battleConfig({ ...gateConfig('B.4'), patches, ...extra });
const t0 = Date.now(); const rows = []; let battles = 0;
const run = (section, label, fam, cfg, tag, explore = false) => { const n = Math.max(50, Math.round(fam.n * K)); const t = Date.now(); const r = runFamilyChunked({ ...fam, n, config: cfg }, 50, baseSeed); battles += n; const x = activeExperiments(cfg); rows.push({ section, label, tag, explore, configLabel: x.length ? x.join(' + ') : 'baseline', ...r, ms: Date.now() - t }); process.stderr.write(`${section} | ${label} | ${tag} | n=${n} | A ${r.aWin[0]}% | ${Date.now() - t} ms\n`); return r; };

// ---- the fixed 24-context suite (identical to the Gate B.4 audit: labels, lineups, n)
const SHIELD_SUP = POOL('metalhorn', 'snowmoth');
const HEALERS = POOL('tidepaw', 'leafhorn', 'sunwhistle', 'lumen', 'mindwing', 'windlynx', 'elderoot', 'glimmer');
const HEXERS = POOL('pyrelynx', 'mudcub', 'stormlynx', 'hailfang', 'nyxshade', 'prism', 'enigmane');
export const STACK = [S('shadewisp'), S('leafhorn'), S('windlynx')];
const EXT = {
  'v shield wall (T + shield Support + T)': { b: ['Tank', SHIELD_SUP, 'Tank'], size: 3, n: 400 },
  'v healer line (3 healing Supports)': { b: HEALERS, size: 3, n: 400 },
  'v Wispira + Florant + Galyx': { b: STACK, size: 3, n: 400 },
  'v condition line (3 hex Disruptors)': { b: HEXERS, size: 3, n: 400 },
  'v Striker + Striker + Tank': { b: ['Striker', 'Striker', 'Tank'], size: 3, n: 400 },
  '5v5 v shield wall (3 T + 2 shield Supports)': { b: ['Tank', 'Tank', 'Tank', SHIELD_SUP, SHIELD_SUP], size: 5, n: 250 },
};
const PARTNERS = { '+2 Tanks': ['Tank', 'Tank'], '+2 Strikers': ['Striker', 'Striker'], '+2 Supports': ['Support', 'Support'], '+Tank +Striker': ['Tank', 'Striker'], '+Tank +Support': ['Tank', 'Support'], '+Striker +Support': ['Striker', 'Support'] };
export function suite24(section, id, cfg, tag, k = 1) {
  run(section, `${id} | solo3`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: Math.round(1000 * k), shuffle: true }, cfg, tag);
  run(section, `${id} | solo5`, { a: [S(id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: Math.round(600 * k), shuffle: true }, cfg, tag);
  for (const a of ARCH) { run(section, `${id} | v ${a}`, { a: [S(id), 'random', 'random'], b: a, size: 3, n: Math.round(400 * k), shuffle: true }, cfg, tag); run(section, `${id} | 5v5 v ${a}`, { a: [S(id), 'random', 'random', 'random', 'random'], b: a, size: 5, n: Math.round(250 * k), shuffle: true }, cfg, tag); }
  for (const [pl, ks] of Object.entries(PARTNERS)) run(section, `${id} | ${pl}`, { a: [S(id), ...ks], b: 'random', size: 3, n: Math.round(500 * k), shuffle: true }, cfg, tag);
  for (const [w, e] of Object.entries(EXT)) run(section, `${id} | ${w}`, { a: [S(id), ...Array(e.size - 1).fill('random')], b: e.b, size: e.size, n: Math.round(e.n * k), shuffle: true }, cfg, tag);
}
// ---- exploratory contexts for the eight (Disruptor counterplay, team roles); not part of the fixed suite
const DISR_PARTNERS = { '+2 Disruptors v 3 Supports': [['Disruptor', 'Disruptor'], 'Support', 3], '+Disruptor +Striker v 3 Supports': [['Disruptor', 'Striker'], 'Support', 3], '+4 Disruptors v 5 Supports': [['Disruptor', 'Disruptor', 'Disruptor', 'Disruptor'], 'Support', 5], '+2 Disruptors +Striker +Tank v 5 Supports': [['Disruptor', 'Disruptor', 'Striker', 'Tank'], 'Support', 5] };
function explore(section, id, cfg, tag, k = 1) {
  for (const [pl, [ks, opp, size]] of Object.entries(DISR_PARTNERS)) run(section, `${id} | ${pl}`, { a: [S(id), ...ks], b: opp, size, n: Math.round((size === 3 ? 400 : 250) * k), shuffle: true }, cfg, tag, true);
  run(section, `${id} | +2 random v stack, smart both`, { a: [S(id), 'random', 'random'], b: STACK, size: 3, n: Math.round(400 * k), shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag, true);
  run(section, `${id} | solo3 smart both`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: Math.round(600 * k), shuffle: true }, battleConfig({ ...cfg, policies: { a: 'smart', b: 'smart' } }), tag, true);
  run(section, `${id} | solo3 fixed front`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: Math.round(600 * k) }, cfg, tag, true);
}
const randomPair = (section, cfg, tag, k = 1) => { run(section, 'Random 3v3', { a: 'random', b: 'random', size: 3, n: Math.round(3000 * k), overall: 62, overallSpread: 7, shuffle: true }, cfg, tag); run(section, 'Random 5v5', { a: 'random', b: 'random', size: 5, n: Math.round(2000 * k), overall: 62, overallSpread: 7, shuffle: true }, cfg, tag); };

export const EIGHT = ['ironcub', 'terrabull', 'nocturne', 'tempestra', 'wavehorn', 'skywarden', 'echolot', 'ashkit'];
export const VARIANTS5 = {
  ironcub: ['ferrcub_temper', 'ferrcub_temper_big', 'ferrcub_forge_quick2'],
  terrabull: ['terrabull_quake_shatter', 'terrabull_quake_sap', 'terrabull_quake_shatter_hex', 'terrabull_quake_sap_hex', 'terrabull_quake_ground'],
  nocturne: ['nocturne_eclipse_opening', 'nocturne_eclipse_dim', 'nocturne_eclipse_opening_dim', 'nocturne_eclipse_opening3', 'nocturne_eclipse_opening3_80'],
  tempestra: ['tempestra_cyclone_eye', 'tempestra_cyclone_storm'],
  wavehorn: ['tideram_riptide_above', 'tideram_riptide_crash', 'tideram_riptide_still'],
  skywarden: ['aeralis_downdraft_hurt', 'aeralis_downdraft_refused_daze', 'aeralis_downdraft_tailwind', 'aeralis_downdraft_anywhere', 'aeralis_downdraft_anywhere_tailwind'],
  echolot: ['echolot_echo_flat', 'echolot_echo_strong'],
  ashkit: ['cindruff_tumble_75', 'cindruff_tumble_any', 'cindruff_tumble_always'],
};

// ---- screen: each species' B.4 version and its candidates on identical seeds (fixed suite + exploratory rows + random pools)
if (only.includes('screen')) {
  const sp = args.species ? String(args.species).split(',') : EIGHT; const want = args.ids ? String(args.ids).split(',') : null;
  for (const id of sp) {
    if (!args.nobase) { suite24('screen', id, gateConfig('B.4'), 'B.4'); explore('screen', id, gateConfig('B.4'), 'B.4'); }
    for (const v of VARIANTS5[id].filter((x) => !want || want.includes(x))) { const cfg = cfgWith(withPatch(B4_PATCHES, v)); suite24('screen', id, cfg, v); explore('screen', id, cfg, v); randomPair('screen', cfg, v, 0.5); }
  }
  if (!args.nobase && !args.species) randomPair('screen', gateConfig('B.4'), 'B.4', 0.5);
  if (args.basepair) randomPair('screen', gateConfig('B.4'), 'B.4', 0.5);
}
// ---- confirm: chosen candidates against B.4 on fresh seeds (pass --seed), 1.5x samples
if (only.includes('confirm')) {
  const done = new Set();
  for (const v of String(args.ids || '').split(',').filter(Boolean)) { const id = P[v].species; if (!done.has(id) && !args.nobase) { done.add(id); suite24('confirm', id, gateConfig('B.4'), 'B.4', 1.5); explore('confirm', id, gateConfig('B.4'), 'B.4', 1.5); } const cfg = cfgWith(withPatch(B4_PATCHES, v)); suite24('confirm', id, cfg, v, 1.5); explore('confirm', id, cfg, v, 1.5); }
}
// ---- Support v Disruptor counterplay: Disruptor-led teams v pure Support teams, 3v3 and 5v5, three policies; --gates=B.4,B.5
const POL = { 'no swaps': null, 'controlled (smart v none)': { a: 'smart', b: 'none' }, 'competent both (smart v smart)': { a: 'smart', b: 'smart' } };
if (only.includes('sud')) {
  const gates = String(args.gates || 'B.4').split(',');
  const ORD = (a) => `ordinary:${a}`;
  const TEAMS3 = {
    '3 Disruptors': ['Disruptor', 'Disruptor', 'Disruptor'], '2 Disruptors + Support': ['Disruptor', 'Disruptor', 'Support'], '2 Disruptors + Striker': ['Disruptor', 'Disruptor', 'Striker'], '2 Disruptors + Tank': ['Disruptor', 'Disruptor', 'Tank'],
    '2 Disruptors + Striker (accessible)': [ORD('Disruptor'), ORD('Disruptor'), ORD('Striker')], '2 Disruptors + Tank (accessible)': [ORD('Disruptor'), ORD('Disruptor'), ORD('Tank')], 'Disruptor + Striker + Tank (accessible)': [ORD('Disruptor'), ORD('Striker'), ORD('Tank')],
  };
  const TEAMS5 = {
    '5 Disruptors': Array(5).fill('Disruptor'), '4 Disruptors + Support': ['Disruptor', 'Disruptor', 'Disruptor', 'Disruptor', 'Support'], '4 Disruptors + Striker': ['Disruptor', 'Disruptor', 'Disruptor', 'Disruptor', 'Striker'], '4 Disruptors + Tank': ['Disruptor', 'Disruptor', 'Disruptor', 'Disruptor', 'Tank'],
    '3 Disruptors + Striker + Tank': ['Disruptor', 'Disruptor', 'Disruptor', 'Striker', 'Tank'], '3 Disruptors + 2 Strikers (accessible)': [ORD('Disruptor'), ORD('Disruptor'), ORD('Disruptor'), ORD('Striker'), ORD('Striker')], '3 Disruptors + Striker + Tank (accessible)': [ORD('Disruptor'), ORD('Disruptor'), ORD('Disruptor'), ORD('Striker'), ORD('Tank')],
  };
  for (const g of gates) {
    for (const [name, ks] of Object.entries(TEAMS3)) for (const [pt, pol] of Object.entries(POL)) for (const [opp, ob] of [['3 Supports', 'Support'], ['3 Supports (accessible)', ORD('Support')]]) {
      if (opp.includes('accessible') && pt !== 'competent both (smart v smart)') continue;
      run('sud', `${name} v ${opp} 3v3 | ${pt}`, { a: ks, b: ob, size: 3, n: 600, shuffle: !name.startsWith('3 Disruptors') ? true : false, sidesAlternate: true }, gateConfig(g, pol ? { policies: pol } : {}), g);
    }
    for (const [name, ks] of Object.entries(TEAMS5)) for (const [pt, pol] of Object.entries(POL)) for (const [opp, ob] of [['5 Supports', 'Support'], ['5 Supports (accessible)', ORD('Support')]]) {
      if (opp.includes('accessible') && pt !== 'competent both (smart v smart)') continue;
      run('sud', `${name} v ${opp} 5v5 | ${pt}`, { a: ks, b: ob, size: 5, n: 400, shuffle: !name.startsWith('5 Disruptors'), sidesAlternate: true }, gateConfig(g, pol ? { policies: pol } : {}), g);
    }
    // lineup order: the Striker or Tank anchor in front v at the back (fixed order, no shuffle)
    for (const [name, ks] of Object.entries({ 'Striker front, 2 Disruptors behind': ['Striker', 'Disruptor', 'Disruptor'], 'Tank front, 2 Disruptors behind': ['Tank', 'Disruptor', 'Disruptor'], '2 Disruptors front, Striker last': ['Disruptor', 'Disruptor', 'Striker'], '2 Disruptors front, Tank last': ['Disruptor', 'Disruptor', 'Tank'] }))
      run('sud', `${name} v 3 Supports 3v3 (fixed order) | competent both (smart v smart)`, { a: ks, b: 'Support', size: 3, n: 600 }, gateConfig(g, { policies: { a: 'smart', b: 'smart' } }), g);
    // generalisation: the hybrid teams against the other archetypes and random (competent both)
    for (const [name, ks] of Object.entries({ '2 Disruptors + Striker': TEAMS3['2 Disruptors + Striker'], '2 Disruptors + Tank': TEAMS3['2 Disruptors + Tank'], '2 Disruptors + Support': TEAMS3['2 Disruptors + Support'] })) {
      for (const opp of ['Tank', 'Striker', 'Balanced', 'Disruptor', 'random']) run('sud', `${name} v ${opp === 'random' ? 'random' : '3 ' + opp} 3v3 | competent both (smart v smart)`, { a: ks, b: opp, size: 3, n: 400, shuffle: true }, gateConfig(g, { policies: { a: 'smart', b: 'smart' } }), g);
    }
  }
}
// ---- counters: named teams (JSON file) v the Wispira + Florant + Galyx stack, four policy pairings, plus generalisation; --gates
if (only.includes('counters')) {
  const teams = JSON.parse(fs.readFileSync(String(args.teams), 'utf8')); const gates = String(args.gates || 'B.4').split(',');
  for (const g of gates) for (const [name, ks] of Object.entries(teams)) {
    for (const [pt, pol] of [['none/none', null], ['counter smart/stack none', { a: 'smart', b: 'none' }], ['none/stack smart', { a: 'none', b: 'smart' }], ['smart/smart', { a: 'smart', b: 'smart' }]]) run('counters', `${name} v stack | ${pt}`, { a: ks.map(S), b: STACK, size: 3, n: 600, shuffle: true, sidesAlternate: false }, gateConfig(g, pol ? { policies: pol } : {}), g);
    run('counters', `${name} v random`, { a: ks.map(S), b: 'random', size: 3, n: 600, shuffle: true }, gateConfig(g), g);
    for (const a of ARCH) run('counters', `${name} v 3 ${a}`, { a: ks.map(S), b: a, size: 3, n: 300, shuffle: true }, gateConfig(g), g);
  }
}
// ---- final: the five configurations on the same fixed scenarios (+ all-species solos for B.4 and B.5)
const PAIRS = [['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']];
if (only.includes('final')) {
  const gates = String(args.gates || 'Gate B,B.2,B.3,B.4,B.5').split(',');
  for (const g of gates) { const cfg = gateConfig(g); const smart = gateConfig(g, { policies: { a: 'smart', b: 'smart' } });
    run('final', 'Random 3v3', { a: 'random', b: 'random', size: 3, n: 4000, overall: 62, overallSpread: 7, shuffle: true }, cfg, g);
    run('final', 'Random 5v5', { a: 'random', b: 'random', size: 5, n: 2500, overall: 62, overallSpread: 7, shuffle: true }, cfg, g);
    run('final', 'Random 3v3, fixed order', { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7 }, cfg, g);
    for (const [x, y] of PAIRS) { run('final', `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, g); run('final', `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, g); }
    for (const m of ['Tank', 'Support']) run('final', `5 ${m}s mirror`, { a: m, b: m, size: 5, n: 800 }, cfg, g);
    run('final', 'Wispira + Florant + Galyx v random', { a: STACK, b: 'random', size: 3, n: 1500, shuffle: true }, cfg, g);
    run('final', 'Wispira + Florant + Galyx v random, smart both', { a: STACK, b: 'random', size: 3, n: 1500, shuffle: true }, smart, g);
    run('final', 'Random 3v3, smart both', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, smart, g);
    run('final', 'Random 5v5, smart both', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, smart, g);
    if (g === 'B.4' || g === 'B.5' || g === 'Final') for (const s of SPECIES_DEX) { run('final', `${s.id} | solo3`, { a: [S(s.id), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, g); run('final', `${s.id} | solo5`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 600, shuffle: true }, cfg, g); }
  }
}
// ---- audit: every species in the 22 non-solo contexts of the fixed suite under a gate (solos come from 'final'); --gate, --species
if (only.includes('audit')) {
  const g = String(args.gate || 'B.5'); const cfg = gateConfig(g); const list = args.species ? String(args.species).split(',') : SPECIES_DEX.map((s) => s.id);
  for (const id of list) {
    for (const a of ARCH) { run('audit', `${id} | v ${a}`, { a: [S(id), 'random', 'random'], b: a, size: 3, n: 400, shuffle: true }, cfg, g); run('audit', `${id} | 5v5 v ${a}`, { a: [S(id), 'random', 'random', 'random', 'random'], b: a, size: 5, n: 250, shuffle: true }, cfg, g); }
    for (const [pl, ks] of Object.entries(PARTNERS)) run('audit', `${id} | ${pl}`, { a: [S(id), ...ks], b: 'random', size: 3, n: 500, shuffle: true }, cfg, g);
    for (const [w, e] of Object.entries(EXT)) run('audit', `${id} | ${w}`, { a: [S(id), ...Array(e.size - 1).fill('random')], b: e.b, size: e.size, n: e.n, shuffle: true }, cfg, g);
  }
}

if (only.length) {
  const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, baseSeed, k: K, sections: only, gatePatches: GATE_PATCHES, ms: Date.now() - t0, battles, species: SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, archetype: archetypeOf(s.id) })), rows };
  const file = path.join(outDir, `gateb5-${only.join('-')}${args.tag ? '-' + args.tag : ''}.json`); fs.writeFileSync(file, JSON.stringify(report));
  console.log(`${rows.length} rows, ${battles} battles, ${Math.round(report.ms / 1000)} s → ${file}`);
}
