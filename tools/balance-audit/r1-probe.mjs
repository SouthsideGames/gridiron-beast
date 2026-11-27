#!/usr/bin/env node
// Balance audit R-1 probe (2026-11-25): direct measurements of the five attribute uses the audit found inert, each at five levels
// (30 / 50 / 65 / 80 / 95) with every other attribute at the Lab's base 65, using the Attribute Lab's own play() (src/lab/attr-trials.js)
// on the production engine. Unlike the Lab's original trials, each measure isolates what the attribute is meant to do:
//   dl_speed_rush      DL1-3 Speed, cover 3 vs deep post with a normal QB read: pressures by the subjects, sacks, first pressure time
//   dl_speed_hold      the same with the QB holding 4 s (the Lab's trial)
//   dl_tackling_finish DL1-3 Tackling, cover 3 with the QB holding 4 s: sack attempts by the subjects and the share they finish
//   cb_catching_pick   CB1 Catching, man press, ball forced to his receiver: interceptions per throw and per pick chance
//   s_coverage_zone    FS + SS Coverage, cover 3 / cover 2 zone, balls forced into the safeties' zones: completion, breakups
//   rb_awareness_runs  RB Awareness over six run plays against three fronts: yards per carry, stuffed (≤1 yd), 10+ runs
//   node tools/balance-audit/r1-probe.mjs [--n=300] [--json=FILE]
import fs from 'node:fs';
import { play } from '../../src/lab/attr-trials.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const N = Number(args.n) || 300; const LV = [30, 50, 65, 80, 95];
const ev = (sim, kind, slots) => sim.events.filter((e) => e.kind === kind && (!slots || slots.includes(e.by)));
const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null); const avg = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
const forced = (slot, at) => ({ qb: { mode: 'human', at, action: 'throw', target: slot } }); // the Lab's forced throw

const PROBES = {
  dl_speed_rush: (v) => { const DL = ['DL1', 'DL2', 'DL3']; let press = 0, sacks = 0, t = [], plays = 0;
    for (let s = 1; s <= N; s++) { const sim = play({ off: 'deep_post', def: 'cover_3', defSubjects: DL, attr: 'speed', value: v, seed: 7000 + s }); plays++;
      if (sim.stats?.pressure && DL.includes(sim.stats.pressureBy)) press++; const sh = ev(sim, 'shed', DL)[0]; if (sh) t.push(sh.t ?? 0);
      if (sim.result === 'sack' && DL.includes(sim.stats?.tackler)) sacks++; }
    return { plays, subjectPressurePct: pct(press, plays), subjectSackPct: pct(sacks, plays), firstShedTime: avg(t) }; },
  dl_speed_hold: (v) => { const DL = ['DL1', 'DL2', 'DL3']; let sacks = 0, t = [], plays = 0;
    for (let s = 1; s <= N; s++) { const sim = play({ off: 'deep_post', def: 'cover_3', defSubjects: DL, attr: 'speed', value: v, seed: 7400 + s, options: { qb: { mode: 'hold' }, maxTime: 4 } }); plays++;
      if (sim.result === 'sack') { sacks++; t.push(sim.stats?.duration ?? sim.time ?? 0); } }
    return { plays, sackPct: pct(sacks, plays), sackTime: avg(t) }; },
  dl_tackling_finish: (v) => { const DL = ['DL1', 'DL2', 'DL3']; let made = 0, missed = 0, plays = 0, sacks = 0;
    for (let s = 1; s <= N; s++) { const sim = play({ off: 'deep_post', def: 'cover_3', defSubjects: DL, attr: 'tackling', value: v, seed: 7800 + s, options: { qb: { mode: 'hold' }, maxTime: 4 } }); // cover 3: the three DL are the rush, so they make the attempts plays++;
      missed += ev(sim, 'escape', DL).length; const sk = ev(sim, 'sack', DL).length; made += sk; if (sim.result === 'sack') sacks++; }
    return { plays, subjectAttempts: made + missed, subjectFinishPct: pct(made, made + missed), playSackPct: pct(sacks, plays) }; },
  cb_catching_pick: (v) => { let ints = 0, throws = 0;
    for (let s = 1; s <= N; s++) { const sim = play({ off: 'three_verticals', def: 'man_press', defSubjects: ['CB1'], attr: 'catching', value: v, seed: 8200 + s, options: forced('WR1', 2.2) }); throws++;
      if (ev(sim, 'interception', ['CB1']).length) ints++; }
    return { throws, intPct: pct(ints, throws) }; },
  s_coverage_zone: (v) => { const r = { throws: 0, comp: 0, pbu: 0, yds: [] };
    for (const [off, def, tgt, at] of [['deep_post', 'cover_3', 'WR1', 2.3], ['three_verticals', 'cover_3', 'WR2', 2.4], ['smash', 'cover_2_zone', 'WR1', 2.1], ['deep_post', 'cover_2_zone', 'WR1', 2.3]]) for (let s = 1; s <= Math.ceil(N / 4); s++) {
      const sim = play({ off, def, defSubjects: ['FS', 'SS'], attr: 'coverage', value: v, seed: 8600 + s, options: forced(tgt, at) }); r.throws++;
      if (sim.stats?.receiver) { r.comp++; r.yds.push(sim.yards || 0); } else r.yds.push(0); if (sim.stats?.pbuBy && ['FS', 'SS'].includes(sim.stats.pbuBy)) r.pbu++; }
    return { throws: r.throws, completionAllowedPct: pct(r.comp, r.throws), safetyBreakupPct: pct(r.pbu, r.throws), yardsPerThrow: avg(r.yds) }; },
  rb_awareness_runs: (v) => { const y = [], plays = []; let stuffed = 0, ten = 0;
    for (const off of ['inside_zone', 'power_right', 'outside_zone', 'counter', 'toss_sweep', 'iso']) for (const def of ['cover_3', 'cover_1', 'cover_2_zone']) for (let s = 1; s <= Math.ceil(N / 18); s++) {
      let sim; try { sim = play({ off, def, offSubjects: ['RB'], attr: 'awareness', value: v, seed: 9000 + s }); } catch { continue; }
      const g = sim.yards || 0; y.push(g); plays.push(off); if (g <= 1) stuffed++; if (g >= 10) ten++; }
    return { carries: y.length, ypc: avg(y), stuffedPct: pct(stuffed, y.length), tenPlusPct: pct(ten, y.length) }; },
};
const only = args.only ? String(args.only).split(',') : Object.keys(PROBES);
const out = { tool: 'balance-audit/r1-probe', n: N, levels: LV, probes: {} };
for (const id of only) { out.probes[id] = {}; for (const v of LV) out.probes[id][v] = PROBES[id](v); console.error(id, JSON.stringify(out.probes[id])); }
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out, null, 1));
