#!/usr/bin/env node
// Beast Clash Gate B.2 run. Usage: node tools/clash-gateb2.mjs --section=buffs|redesign|dominant|swap|final[,...] [--final=<patch ids>] [--quick]
// Baseline: Gate B working direction (back row E, Shock as is, O1-O3 off, C6, sudden death E/F from 12). All switches off unless a row says so.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../src/clash/values.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { archetypeOf } from '../src/clash/stats.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const scale = quick ? 0.15 : 1; const only = String(args.section || 'buffs').split(',');
const outDir = args.out || 'tools/out/gateb2'; fs.mkdirSync(outDir, { recursive: true });
const BASE = { duration: 'C6' }; const base = (extra = {}) => battleConfig({ ...BASE, ...extra });
const ARCH = ['Tank', 'Striker', 'Support', 'Disruptor', 'Balanced'];
const PAIRS = [['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']];
const BUFFS = ['zephiro_tailwind_combo', 'elderoot_grove_12', 'scorchulk_maul_first', 'tsunarok_undertow_hit', 'aeralis_downdraft_hit', 'lumini_mend_10', 'zippit_charge_40', 'nocturne_eclipse_2'];
const B1 = [...BUFFS, 'wispira_veil_every4', 'duskyre_cut_every3', 'florant_shade_every3', 'galyx_updraft_14', 'coglet_gearshot_heavy', 'cerebrix_foresight_hit_every1'];
const sp = (id) => CLASH_VALUES.movePatches[id].species; const S = (id) => `species:${id}`;
const t0 = Date.now(); const rows = []; let battles = 0;
const run = (section, label, fam, cfg, tag) => { const n = Math.max(50, Math.round(fam.n * scale)); const t = Date.now(); const r = runFamilyChunked({ ...fam, n, config: cfg }); battles += n; const x = activeExperiments(cfg); rows.push({ section, label, tag, configLabel: x.length ? x.join(' + ') : 'baseline', ...r, ms: Date.now() - t }); process.stderr.write(`${section} | ${label} | ${tag} | n=${n} | A ${r.aWin[0]}% | ${Date.now() - t} ms\n`); return r; };
const speciesSet = (section, cfg, tag, ids, n3 = 1000, n5 = 700) => { for (const id of ids) { run(section, `${id} | solo3`, { a: [S(id), 'random', 'random'], b: 'random', size: 3, n: n3, shuffle: true }, cfg, tag); run(section, `${id} | solo5`, { a: [S(id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: n5, shuffle: true }, cfg, tag); } };
const core = (section, cfg, tag, { n3 = 3000, n5 = 2000, matrix = true } = {}) => {
  run(section, 'Random 3v3', { a: 'random', b: 'random', size: 3, n: n3, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
  run(section, 'Random 5v5', { a: 'random', b: 'random', size: 5, n: n5, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
  if (matrix) for (const [x, y] of PAIRS) { run(section, `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, tag); run(section, `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, tag); }
};

if (only.includes('buffs')) {
  for (const [tag, cfg] of [['before', base()], ['all 8', base({ patches: BUFFS })]]) {
    core('buffs', cfg, tag, { matrix: false }); speciesSet('buffs', cfg, tag, BUFFS.map(sp));
    // adjusted monsters together, and pairs that could compete for the same slot
    run('buffs', 'Zephiro + Scorchulk + random v random', { a: [S('zephyr'), S('cinderclaw'), 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('buffs', 'Elderoot + Lumini + Zippit v random', { a: [S('elderoot'), S('glimmer'), S('flicker')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('buffs', 'Tsunarok + Aeralis + Nocturne v random', { a: [S('tsunarok'), S('skywarden'), S('nocturne')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('buffs', 'All eight + 2 random v random 5v5 (Zephiro, Elderoot, Scorchulk, Tsunarok, Aeralis)', { a: [S('zephyr'), S('elderoot'), S('cinderclaw'), S('tsunarok'), S('skywarden')], b: 'random', size: 5, n: 800, shuffle: true }, cfg, tag);
    run('buffs', 'Ripplet + 2 random v random (indirect)', { a: [S('tidefin'), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('buffs', 'Spriglet + 2 random v random (indirect)', { a: [S('thornkit'), 'random', 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
  }
}
if (only.includes('redesign')) {
  const ids = args.ids ? String(args.ids).split(',') : ['coglet_gearshot_heavy', 'coglet_gearshot_pierce', 'coglet_gearshot_break', 'coglet_gearshot_pierce_break', 'coglet_gearshot_break_11', 'cerebrix_foresight_hit_every1', 'cerebrix_foresight_front', 'cerebrix_foresight_front_hit', 'cerebrix_foresight_refused_daze', 'cerebrix_foresight_front_refused_daze', 'tsunarok_undertow_hit', 'tsunarok_undertow_chill', 'tsunarok_undertow_hit08', 'tsunarok_undertow_hit_chill', 'tsunarok_undertow_refused_hit'];
  for (const s of args.ids ? [] : ['gearwing', 'cerebrix', 'tsunarok']) { const cfg = base(); run('redesign', `${s} | solo3`, { a: [S(s), 'random', 'random'], b: 'random', size: 3, n: 1200, shuffle: true }, cfg, 'before'); run('redesign', `${s} | solo5`, { a: [S(s), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 800, shuffle: true }, cfg, 'before'); for (const k of ARCH) run('redesign', `${s} | vs ${k}`, { a: [S(s), 'random', 'random'], b: k, size: 3, n: 400, shuffle: true }, cfg, 'before'); run('redesign', `${s} | +2 Tanks`, { a: [S(s), 'Tank', 'Tank'], b: 'random', size: 3, n: 600, shuffle: true }, cfg, 'before'); run('redesign', `${s} | +2 Strikers`, { a: [S(s), 'Striker', 'Striker'], b: 'random', size: 3, n: 600, shuffle: true }, cfg, 'before'); }
  for (const id of ids) { const s = sp(id); const cfg = base({ patches: [id] }); run('redesign', `${s} | solo3`, { a: [S(s), 'random', 'random'], b: 'random', size: 3, n: 1200, shuffle: true }, cfg, id); run('redesign', `${s} | solo5`, { a: [S(s), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 800, shuffle: true }, cfg, id); for (const k of ARCH) run('redesign', `${s} | vs ${k}`, { a: [S(s), 'random', 'random'], b: k, size: 3, n: 400, shuffle: true }, cfg, id); run('redesign', `${s} | +2 Tanks`, { a: [S(s), 'Tank', 'Tank'], b: 'random', size: 3, n: 600, shuffle: true }, cfg, id); run('redesign', `${s} | +2 Strikers`, { a: [S(s), 'Striker', 'Striker'], b: 'random', size: 3, n: 600, shuffle: true }, cfg, id); run('redesign', `${s} | random 3v3`, { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7, shuffle: true }, cfg, id); }
}
if (only.includes('dominant')) {
  const sets = [['before', []], ['W4 + D3', ['wispira_veil_every4', 'duskyre_cut_every3']], ['W4 + D3 + Florant every3', ['wispira_veil_every4', 'duskyre_cut_every3', 'florant_shade_every3']], ['W4 + D3 + Florant 14%', ['wispira_veil_every4', 'duskyre_cut_every3', 'florant_shade_14']], ['W3 + D3', ['wispira_veil_every3', 'duskyre_cut_every3']]];
  for (const [tag, ids] of sets) { const cfg = base({ patches: ids }); core('dominant', cfg, tag); speciesSet('dominant', cfg, tag, ['shadewisp', 'duskrunner', 'leafhorn', 'windlynx'], 1200, 800); run('dominant', '5 Supports mirror', { a: 'Support', b: 'Support', size: 5, n: 800 }, cfg, tag); run('dominant', 'Wispira + Florant + Galyx v random', { a: [S('shadewisp'), S('leafhorn'), S('windlynx')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag); run('dominant', 'Wispira + Duskyre + random v random', { a: [S('shadewisp'), S('duskrunner'), 'random'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag); for (const k of ARCH) { run('dominant', `Wispira team vs ${k}`, { a: [S('shadewisp'), 'random', 'random'], b: k, size: 3, n: 400, shuffle: true }, cfg, tag); run('dominant', `Duskyre team vs ${k}`, { a: [S('duskrunner'), 'random', 'random'], b: k, size: 3, n: 400, shuffle: true }, cfg, tag); } }
}
if (only.includes('swap')) {
  for (const cost of ['action', 'half']) {
    const cfg = (pa, pb) => base({ swapCost: cost, policies: { a: pa, b: pb } });
    for (const pol of ['balanced', 'defensive', 'smart']) { run('swap', `Random 3v3, ${pol} v none`, { a: 'random', b: 'random', size: 3, n: 2000, shuffle: true, sidesAlternate: false }, cfg(pol, 'none'), cost); run('swap', `Random 5v5, ${pol} v none`, { a: 'random', b: 'random', size: 5, n: 1200, shuffle: true, sidesAlternate: false }, cfg(pol, 'none'), cost); run('swap', `Random 3v3, ${pol} both`, { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, cfg(pol, pol), cost); }
    run('swap', 'Random 3v3, smart v balanced', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg('smart', 'balanced'), cost);
    run('swap', 'Random 5v5, smart both', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, cfg('smart', 'smart'), cost);
    run('swap', '3 Supports (smart) v 3 Strikers', { a: 'Support', b: 'Striker', size: 3, n: 800, sidesAlternate: false }, cfg('smart', 'none'), cost);
    run('swap', '5 Tanks (smart) v 5 Strikers', { a: 'Tank', b: 'Striker', size: 5, n: 800, sidesAlternate: false }, cfg('smart', 'none'), cost);
    run('swap', '5 Supports v 5 Tanks, smart both', { a: 'Support', b: 'Tank', size: 5, n: 800 }, cfg('smart', 'smart'), cost);
    run('swap', 'Mixed defense (smart) v 5 Disruptors', { a: 'mixedDefense', b: 'Disruptor', size: 5, n: 800, sidesAlternate: false }, cfg('smart', 'none'), cost);
    run('swap', '2 Supports + Tank (smart) v 3 Strikers', { a: ['Support', 'Support', 'Tank'], b: 'Striker', size: 3, n: 800, sidesAlternate: false }, cfg('smart', 'none'), cost);
  }
}
if (only.includes('final')) {
  const FINAL = String(args.final || '').split(',').filter(Boolean);
  const mix = (arch, k, size) => [...Array(k).fill(arch), ...Array(size - k).fill('random')];
  for (const [tag, ids] of [['baseline', []], ['B.1 package', B1], ['B.2 final', FINAL]]) {
    const cfg = base({ patches: ids });
    core('final', cfg, tag, { n3: 4000, n5: 2500 });
    run('final', 'Random 3v3, fixed order', { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7, shuffle: false }, cfg, tag);
    run('final', 'Random 5v5, fixed order', { a: 'random', b: 'random', size: 5, n: 1500, overall: 62, overallSpread: 7, shuffle: false }, cfg, tag);
    for (const k of ARCH) { run('final', `1 ${k} + 2 random v random`, { a: mix(k, 1, 3), b: 'random', size: 3, n: 1500, shuffle: true }, cfg, tag); run('final', `2 ${k} + 3 random v random 5v5`, { a: mix(k, 2, 5), b: 'random', size: 5, n: 1000, shuffle: true }, cfg, tag); }
    run('final', '5 Supports mirror', { a: 'Support', b: 'Support', size: 5, n: 1000 }, cfg, tag); run('final', '5 Tanks mirror', { a: 'Tank', b: 'Tank', size: 5, n: 800 }, cfg, tag); run('final', '3 Tanks + 2 Supports mirror', { a: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], b: ['Tank', 'Tank', 'Tank', 'Support', 'Support'], size: 5, n: 800 }, cfg, tag); run('final', '3 Supports mirror 3v3', { a: 'Support', b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('final', 'Mixed defense v 5 Strikers', { a: 'mixedDefense', b: 'Striker', size: 5, n: 1000 }, cfg, tag); run('final', 'Mixed defense v 5 Disruptors', { a: 'mixedDefense', b: 'Disruptor', size: 5, n: 1000 }, cfg, tag);
    // specialised counter teams
    run('final', 'Striker, Striker, Tank v 3 Supports', { a: ['Striker', 'Striker', 'Tank'], b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('final', 'Duskyre + Scorchulk + Tank v 3 Supports', { a: [S('duskrunner'), S('cinderclaw'), 'Tank'], b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('final', 'Flurrit + Ferrhorn + Enigmane v 3 Tanks', { a: [S('snowmoth'), S('metalhorn'), S('enigmane')], b: 'Tank', size: 3, n: 1000 }, cfg, tag);
    run('final', 'Wispira + Florant + Galyx v random', { a: [S('shadewisp'), S('leafhorn'), S('windlynx')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Nyxshade + 2 Tanks v random', { a: [S('nyxshade'), 'Tank', 'Tank'], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Nyxshade + 2 Tanks v 3 Strikers', { a: [S('nyxshade'), 'Tank', 'Tank'], b: 'Striker', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Adjusted trio: Zephiro + Scorchulk + Elderoot v random', { a: [S('zephyr'), S('cinderclaw'), S('elderoot')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Adjusted trio: Tsunarok + Cerebrix + Coglet v random', { a: [S('tsunarok'), S('cerebrix'), S('gearwing')], b: 'random', size: 3, n: 1000, shuffle: true }, cfg, tag);
    run('final', 'Random 3v3, balanced both (swap frequency)', { a: 'random', b: 'random', size: 3, n: 1000, shuffle: true }, battleConfig({ ...BASE, patches: ids, policies: { a: 'balanced', b: 'balanced' } }), tag);
    run('final', 'Random 5v5, smart both, half cost', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, battleConfig({ ...BASE, patches: ids, swapCost: 'half', policies: { a: 'smart', b: 'smart' } }), tag);
    if (tag !== 'B.1 package') for (const s of SPECIES_DEX) { run('final', `${s.id} | solo3`, { a: [S(s.id), 'random', 'random'], b: 'random', size: 3, n: 600, shuffle: true }, cfg, tag); run('final', `${s.id} | solo5`, { a: [S(s.id), 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 400, shuffle: true }, cfg, tag); }
  }
}
const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, quick, sections: only, ms: Date.now() - t0, battles, species: SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, archetype: archetypeOf(s.id) })), rows };
const file = path.join(outDir, `gateb2-${only.join('-')}${args.ids ? '-r2' : ''}.json`); fs.writeFileSync(file, JSON.stringify(report));
console.log(`${rows.length} rows, ${battles} battles, ${Math.round(report.ms / 1000)} s → ${file}`);
