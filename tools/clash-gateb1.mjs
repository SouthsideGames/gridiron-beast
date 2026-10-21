#!/usr/bin/env node
// Beast Clash Gate B.1 run: species viability audit, candidate move patches, voluntary-swap cost models and the 3v3
// sudden-death start. Usage: node tools/clash-gateb1.mjs [--quick] [--section=audit,patches,swap,sd,package] [--package=patchA,patchB]
// Baseline is the Gate B working direction: back row E, Shock as is, O1/O2/O3 off, duration C6, sudden death E/F.
// Everything runs in the Lab's 50-battle seeded chunks; nothing in the defaults changes.
import fs from 'node:fs';
import path from 'node:path';
import { runFamilyChunked, VALUES_VERSION } from '../src/clash/batch.js';
import { CLASH_VALUES, battleConfig, activeExperiments } from '../src/clash/values.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { archetypeOf } from '../src/clash/stats.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const quick = !!args.quick; const scale = quick ? 0.15 : 1; const only = args.section ? String(args.section).split(',') : ['audit', 'patches', 'swap', 'sd'];
const outDir = args.out || 'tools/out/gateb1'; fs.mkdirSync(outDir, { recursive: true });
const BASE = { duration: 'C6' }; const base = (extra = {}) => battleConfig({ ...BASE, ...extra });
const ARCH = ['Tank', 'Striker', 'Support', 'Disruptor', 'Balanced'];
const t0 = Date.now(); const rows = []; let battles = 0;
const run = (section, label, fam, cfg, tag = 'baseline') => { const n = Math.max(50, Math.round(fam.n * scale)); const t = Date.now(); const r = runFamilyChunked({ ...fam, n, config: cfg }); battles += n; const x = activeExperiments(cfg); rows.push({ section, label, tag, configLabel: x.length ? x.join(' + ') : 'baseline', ...r, ms: Date.now() - t }); process.stderr.write(`${section} | ${label} | ${tag} | n=${n} | A ${r.aWin[0]}% | ${Date.now() - t} ms\n`); return r; };

if (only.includes('audit')) {
  for (const sp of SPECIES_DEX) {
    const S = `species:${sp.id}`; const a3 = [S, 'random', 'random'];
    run('audit', `${sp.id} | solo3`, { a: a3, b: 'random', size: 3, n: 600, shuffle: true }, base(), sp.id);
    run('audit', `${sp.id} | solo5`, { a: [S, 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 400, shuffle: true }, base(), sp.id);
    for (const k of ARCH) run('audit', `${sp.id} | with2 ${k}`, { a: [S, k, k], b: 'random', size: 3, n: 400, shuffle: true }, base(), sp.id);
    for (const k of ARCH) run('audit', `${sp.id} | vs ${k}`, { a: a3, b: k, size: 3, n: 300, shuffle: true }, base(), sp.id);
  }
}
if (only.includes('patches')) {
  const want = args.patches ? String(args.patches).split(',') : null;
  for (const [id, P] of Object.entries(CLASH_VALUES.movePatches).filter(([k, v]) => v && typeof v === 'object' && (!want || want.includes(k)))) {
    const S = `species:${P.species}`; const a3 = [S, 'random', 'random'];
    for (const [tag, cfg] of [['before', base()], ['after', base({ patches: [id] })]]) {
      run('patches', `${id} | solo3`, { a: a3, b: 'random', size: 3, n: 1200, shuffle: true }, cfg, tag);
      run('patches', `${id} | solo5`, { a: [S, 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 800, shuffle: true }, cfg, tag);
      for (const k of ARCH) run('patches', `${id} | vs ${k}`, { a: a3, b: k, size: 3, n: 400, shuffle: true }, cfg, tag);
      run('patches', `${id} | random 3v3`, { a: 'random', b: 'random', size: 3, n: 2000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
      run('patches', `${id} | random 5v5`, { a: 'random', b: 'random', size: 5, n: 1200, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    }
  }
}
if (only.includes('swap')) {
  for (const cost of ['action', 'half', 'free']) {
    const cfg = (pa, pb) => base({ swapCost: cost, policies: { a: pa, b: pb } });
    run('swap', 'Random 3v3, balanced both', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, cfg('balanced', 'balanced'), cost);
    run('swap', 'Random 3v3, balanced v none', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg('balanced', 'none'), cost);
    run('swap', 'Random 3v3, defensive both', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true }, cfg('defensive', 'defensive'), cost);
    run('swap', 'Random 3v3, defensive v none', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg('defensive', 'none'), cost);
    run('swap', 'Random 3v3, type v none', { a: 'random', b: 'random', size: 3, n: 1500, shuffle: true, sidesAlternate: false }, cfg('type', 'none'), cost);
    run('swap', 'Random 5v5, balanced both', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true }, cfg('balanced', 'balanced'), cost);
    run('swap', 'Random 5v5, balanced v none', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true, sidesAlternate: false }, cfg('balanced', 'none'), cost);
    run('swap', 'Random 5v5, defensive v none', { a: 'random', b: 'random', size: 5, n: 1000, shuffle: true, sidesAlternate: false }, cfg('defensive', 'none'), cost);
    run('swap', '5 Tanks (defensive) v 5 Strikers', { a: 'Tank', b: 'Striker', size: 5, n: 800, sidesAlternate: false }, cfg('defensive', 'none'), cost);
    run('swap', '3 Supports (balanced) v 3 Strikers', { a: 'Support', b: 'Striker', size: 3, n: 800, sidesAlternate: false }, cfg('balanced', 'none'), cost);
    run('swap', '5 Supports (balanced) v 5 Tanks (balanced)', { a: 'Support', b: 'Tank', size: 5, n: 800 }, cfg('balanced', 'balanced'), cost);
  }
}
if (only.includes('sd')) {
  for (const from of [12, 15, 18, 99]) {
    const cfg = base({ sdFromE: from }); const tag = `from ${from}`;
    run('sd', 'Random 3v3', { a: 'random', b: 'random', size: 3, n: 3000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    run('sd', '3 Tanks mirror', { a: 'Tank', b: 'Tank', size: 3, n: 1000 }, cfg, tag);
    run('sd', '3 Supports mirror', { a: 'Support', b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('sd', 'Mixed defense v 3 Strikers', { a: 'mixedDefense', b: 'Striker', size: 3, n: 1000 }, cfg, tag);
    run('sd', '3 Tanks v 3 Supports', { a: 'Tank', b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('sd', '3 Strikers v 3 Supports', { a: 'Striker', b: 'Support', size: 3, n: 1000 }, cfg, tag);
    run('sd', '3 Disruptors v random', { a: 'Disruptor', b: 'random', size: 3, n: 1000 }, cfg, tag);
    run('sd', 'Random 2v2', { a: 'random', b: 'random', size: 2, n: 1500, shuffle: true }, cfg, tag);
  }
}
if (only.includes('package')) {
  const ids = String(args.package || '').split(',').filter(Boolean);
  for (const [tag, cfg] of [['before', base()], ['after', base({ patches: ids })]]) {
    run('package', 'Random 3v3', { a: 'random', b: 'random', size: 3, n: 4000, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    run('package', 'Random 5v5', { a: 'random', b: 'random', size: 5, n: 2500, overall: 62, overallSpread: 7, shuffle: true }, cfg, tag);
    for (const [x, y] of [['Tank', 'Striker'], ['Tank', 'Support'], ['Tank', 'Disruptor'], ['Tank', 'Balanced'], ['Striker', 'Support'], ['Striker', 'Disruptor'], ['Striker', 'Balanced'], ['Support', 'Disruptor'], ['Support', 'Balanced'], ['Disruptor', 'Balanced']]) {
      run('package', `${x} v ${y} 3v3`, { a: x, b: y, size: 3, n: 1000 }, cfg, tag); run('package', `${x} v ${y} 5v5`, { a: x, b: y, size: 5, n: 800 }, cfg, tag);
    }
    run('package', '5 Supports mirror', { a: 'Support', b: 'Support', size: 5, n: 800 }, cfg, tag);
    run('package', 'Mixed defense v 5 Strikers', { a: 'mixedDefense', b: 'Striker', size: 5, n: 1000 }, cfg, tag);
    for (const sp of ids.map((id) => CLASH_VALUES.movePatches[id].species)) { const S = `species:${sp}`; run('package', `${sp} | solo3`, { a: [S, 'random', 'random'], b: 'random', size: 3, n: 1200, shuffle: true }, cfg, tag); run('package', `${sp} | solo5`, { a: [S, 'random', 'random', 'random', 'random'], b: 'random', size: 5, n: 800, shuffle: true }, cfg, tag); }
  }
}
const report = { values: VALUES_VERSION, engine: CLASH_VALUES.engineVersion, quick, sections: only, ms: Date.now() - t0, battles, species: SPECIES_DEX.map((s) => ({ id: s.id, name: s.name, element: s.element, rarity: s.rarity, archetype: archetypeOf(s.id) })), rows };
const file = path.join(outDir, `gateb1-${only.join('-')}${args.package ? '-pkg' : ''}${args.patches ? '-r2' : ''}.json`);
fs.writeFileSync(file, JSON.stringify(report));
console.log(`${rows.length} rows, ${battles} battles, ${Math.round(report.ms / 1000)} s → ${file}`);
