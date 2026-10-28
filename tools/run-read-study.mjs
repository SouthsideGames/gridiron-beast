#!/usr/bin/env node
// Run-read study (Phase A, v42.14, GDD §53.5j): the evidence for the observable run read. Real engine, plain 65s (Attribute Lab
// setup), the same seeds for every level, so a difference between levels is the rating's (or the ability's) alone.
//   node tools/run-read-study.mjs [--root=DIR] [--only=awareness,pa,misdirection,abilities,spread] [--n=40] [--json=FILE]
// Sections
//   awareness     every defender's Awareness 50..95 (steps of 5) against the base runs, by call group: yards per carry, 10+ share,
//                 recognition (seconds from the handoff to a linebacker's commitment), linebacker distance to the carrier 0.5 s
//                 after the handoff, adjacent-level differences and the largest step (a cliff), and inversions (not forced away)
//   pa            play-action against run fronts and zone calls, coverage Awareness 50 vs 95: completion, yards per attempt, how
//                 many underneath defenders committed to the fake before the throw, and how long they stayed committed
//   misdirection  Counter, Trap and the Fault Line legendary run against run fronts and zone calls, Awareness 50 vs 95: yards,
//                 10+ share, and how often a defender was reading conflicting cues (the line one way, the back the other)
//   abilities     each read-related ability with and without (one monster carries it, the same seeds): Echo Read, Ancient Grove,
//                 Cold Read, Sharp Eyes, Permafrost, Crushing Rush (the no-bite effect is on no current card)
//   spread        unpredictability: per-cell spread of outcomes across seeds (a strong defense still allows long runs, a favorable
//                 offense still gets stopped), and reproducibility of the same seed
import path from 'node:path';
import fs from 'node:fs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const N = Number(args.n) || 40; const only = args.only ? String(args.only).split(',') : null; const want = (k) => !only || only.includes(k);
const T = await import(path.join(ROOT, 'src/lab/attr-trials.js')); const { PLAYS, OFFENSE_IDS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const r2 = (x) => (x == null || !Number.isFinite(x) ? null : +x.toFixed(2));
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const pct = (xs) => (xs.length ? +(100 * xs.filter(Boolean).length / xs.length).toFixed(1) : null);
const seeds = (base, n = N) => Array.from({ length: n }, (_, i) => base + i);
const RUNS = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'run');
const GROUPS = { 'run fronts': ['bear_front', 'run_wall', 'goal_line', 'goal_line_man', 'edge_contain'], 'zone calls': ['cover_3', 'cover_2_zone', 'tampa_2', 'cover_4'], 'man calls': ['cover_1', 'man_press'] };
const isLB = (s) => /^LB/.test(s);
const out = { root: ROOT, n: N };
const log = (...a) => { if (!args.quiet) console.log(...a); };

/** Seconds from the handoff (or keep) to each linebacker's commitment, and linebacker distance to the carrier 0.5 s after it. */
function readTiming(sim) {
  const h = sim.events.find((e) => e.kind === 'handoff' || e.kind === 'keep'); if (!h || !sim.frames[0]?.dbg) return { rec: [], dist: [] };
  const car = sim.stats.carrier; const first = {}; const rec = [], dist = [];
  for (const f of sim.frames) { if (!f.dbg) continue; for (const e of f.dbg) if (isLB(e[0]) && first[e[0]] == null && e[8]?.state === 'run') first[e[0]] = f.t; }
  for (const [s, t] of Object.entries(first)) rec.push(t - h.t);
  const f5 = sim.frames.find((f) => f.t >= h.t + 0.5 - 1e-6); const c = f5 && (f5.off.find((p) => p[0] === car));
  if (c) for (const d of f5.def) if (isLB(d[0])) dist.push(Math.hypot(d[1] - c[1], d[2] - c[2]));
  return { rec, dist };
}

if (want('awareness')) {
  const levels = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95]; out.awareness = {};
  for (const [g, calls] of Object.entries(GROUPS)) {
    const rows = levels.map((v) => { const ys = [], rec = [], dist = [];
      for (const def of calls) for (const off of RUNS) for (const s of seeds(70000)) { const sim = T.play({ off, def, defSubjects: [...PLAYS[def].onField], attr: 'awareness', value: v, seed: s, options: { trace: true } }); ys.push(sim.yards); const rt = readTiming(sim); rec.push(...rt.rec); dist.push(...rt.dist); }
      return { v, ypc: r2(mean(ys)), ten: pct(ys.map((y) => y >= 10)), recognition: r2(mean(rec)), lbDistance: r2(mean(dist)), carries: ys.length }; });
    const steps = rows.slice(1).map((r, i) => r2(r.ypc - rows[i].ypc));
    out.awareness[g] = { rows, steps, largestStep: Math.max(...steps.map(Math.abs)), inversions: steps.filter((x) => x > 0.25).length, total: r2(rows.at(-1).ypc - rows[0].ypc) };
    log(`== awareness · ${g}`); for (const r of rows) log(`  ${r.v}: ${r.ypc} yd  10+ ${r.ten}%  recognition ${r.recognition} s  LB distance ${r.lbDistance} yd`);
    log(`  steps ${steps.join(' ')}  largest ${out.awareness[g].largestStep}  inversions (> +0.25) ${out.awareness[g].inversions}  total ${out.awareness[g].total}`);
  }
}

const PA = OFFENSE_IDS.filter((k) => ['play_action', 'boot'].includes(PLAYS[k].assignments.QB?.a));
const covSlots = (def) => PLAYS[def].onField.filter((s) => ['man', 'zone', 'spy'].includes(PLAYS[def].assignments[s]?.a));
/** Underneath defenders committed to the run before the throw, and how long the longest commitment lasted. */
function biteOf(sim, def) {
  const th = sim.events.find((e) => e.kind === 'throw'); if (!th || !sim.frames[0]?.dbg) return null; const under = covSlots(def).filter((s) => !(PLAYS[def].assignments[s].a === 'zone' && PLAYS[def].assignments[s].role === 'deep'));
  const span = {}; for (const f of sim.frames) { if (!f.dbg || f.t > th.t) continue; for (const e of f.dbg) if (under.includes(e[0]) && e[8]?.state === 'run') span[e[0]] = (span[e[0]] || 0) + 0.05; }
  return { bit: Object.keys(span).length / Math.max(1, under.length), longest: Math.max(0, ...Object.values(span)) };
}
if (want('pa')) {
  out.pa = {};
  for (const [g, calls] of [['run fronts', GROUPS['run fronts']], ['zone calls', GROUPS['zone calls']], ['man calls', GROUPS['man calls']]]) for (const v of [50, 95]) {
    const comp = [], ypa = [], bit = [], longest = [], sack = [];
    for (const off of PA) for (const def of calls) for (const s of seeds(71000)) { const sim = T.play({ off, def, defSubjects: covSlots(def), attr: 'awareness', value: v, seed: s, options: { trace: true } });
      sack.push(sim.result === 'sack'); const thrown = sim.events.some((e) => e.kind === 'throw'); if (!thrown) continue; comp.push(!!sim.stats.receiver); ypa.push(sim.yards); const b = biteOf(sim, def); if (b) { bit.push(b.bit); longest.push(b.longest); } }
    (out.pa[g] ||= {})[v] = { comp: pct(comp), ypa: r2(mean(ypa)), sack: pct(sack), bitShare: r2(mean(bit)), longestBite: r2(mean(longest)), thrown: comp.length };
    log(`== play-action vs ${g} · coverage Awareness ${v}:`, JSON.stringify(out.pa[g][v]));
  }
}

if (want('misdirection')) {
  out.misdirection = {}; const plays = ['counter', 'trap', 'lp_fault_line'].filter((k) => PLAYS[k]);
  for (const off of plays) for (const [g, calls] of [['run fronts', GROUPS['run fronts']], ['zone calls', GROUPS['zone calls']]]) for (const v of [50, 95]) {
    const ys = [], conflict = [];
    for (const def of calls) for (const s of seeds(72000)) { const sim = T.play({ off, def, defSubjects: [...PLAYS[def].onField], attr: 'awareness', value: v, seed: s, options: { trace: true } }); ys.push(sim.yards);
      conflict.push(sim.frames.some((f) => f.dbg && f.dbg.some((e) => e[8]?.conflict))); }
    ((out.misdirection[off] ||= {})[g] ||= {})[v] = { ypc: r2(mean(ys)), ten: pct(ys.map((y) => y >= 10)), conflictPlays: pct(conflict) };
    log(`== misdirection ${off} vs ${g} · Awareness ${v}:`, JSON.stringify(out.misdirection[off][g][v]));
  }
}

if (want('abilities')) {
  // One monster carries the ability (species id), the same seeds with and without. Scenarios chosen where the ability can act.
  const CASES = [
    { ability: 'Echo Read', species: 'echolot', slot: 'LB1', off: PA, def: ['cover_3', 'tampa_2', 'run_wall', 'bear_front'], kind: 'pa' },
    { ability: 'Ancient Grove', species: 'elderoot', slot: 'LB1', off: PA, def: ['cover_3', 'tampa_2', 'run_wall', 'bear_front'], kind: 'pa' },
    { ability: 'Ancient Grove (misdirection)', species: 'elderoot', slot: 'LB1', off: ['counter', 'trap'], def: ['cover_3', 'run_wall', 'bear_front'], kind: 'run' },
    { ability: 'Cold Read', species: 'frostclaw', slot: 'LB1', off: RUNS, def: ['cover_3', 'run_wall', 'bear_front'], kind: 'run' },
    { ability: 'Sharp Eyes', species: 'nightowl', slot: 'LB1', off: RUNS, def: ['cover_3', 'run_wall', 'bear_front'], kind: 'run' },
    { ability: 'Permafrost', species: 'icehorn', slot: 'DL2', off: RUNS, def: ['cover_3', 'run_wall', 'bear_front'], kind: 'run' },
    { ability: 'Crushing Rush', species: 'stoneguard', slot: 'DL2', off: RUNS, def: ['cover_3', 'run_wall', 'bear_front'], kind: 'run' },
  ];
  out.abilities = {};
  for (const c of CASES) {
    const res = {};
    for (const withIt of [false, true]) {
      const ys = [], comp = [], rec = [], fired = [], bit = [];
      for (const off of c.off) for (const def of c.def) { if (!PLAYS[def].onField.includes(c.slot)) continue; for (const s of seeds(73000, Math.max(12, Math.round(N / 2)))) {
        const sim = T.play({ off, def, attr: 'speed', value: 65, seed: s, options: { trace: true }, extra: withIt ? (o, d) => { d[c.slot].species = c.species; } : null });
        ys.push(sim.yards); fired.push(sim.events.some((e) => e.kind === 'ability' && e.by === c.slot));
        if (c.kind === 'pa') { if (sim.events.some((e) => e.kind === 'throw')) comp.push(!!sim.stats.receiver); const b = biteOf(sim, def); if (b) bit.push(b.bit); }
        else { const rt = readTiming(sim); rec.push(...rt.rec); }
      } }
      res[withIt ? 'with' : 'without'] = { plays: ys.length, yards: r2(mean(ys)), ten: pct(ys.map((y) => y >= 10)), fired: pct(fired), ...(c.kind === 'pa' ? { comp: pct(comp), bitShare: r2(mean(bit)) } : { recognition: r2(mean(rec)) }) };
    }
    out.abilities[c.ability] = { carrier: `${c.species} at ${c.slot}`, ...res, dYards: r2(res.with.yards - res.without.yards) };
    log(`== ability ${c.ability} (${c.species} at ${c.slot}): without ${JSON.stringify(res.without)} | with ${JSON.stringify(res.with)}`);
  }
}

if (want('spread')) {
  out.spread = {};
  const cells = [['inside_zone', 'run_wall'], ['dive', 'goal_line'], ['power_right', 'bear_front'], ['inside_zone', 'cover_3'], ['outside_zone', 'bear_front'], ['toss_sweep', 'cover_2_zone'], ['counter', 'bear_front'], ['stretch_left', 'edge_contain']];
  for (const [off, def] of cells) {
    const ys = seeds(74000, 200).map((s) => T.play({ off, def, attr: 'speed', value: 65, seed: s }).yards).sort((a, b) => a - b);
    const q = (p) => ys[Math.min(ys.length - 1, Math.floor(p * ys.length))];
    out.spread[`${off} vs ${def}`] = { mean: r2(mean(ys)), p10: q(0.1), median: q(0.5), p90: q(0.9), max: ys.at(-1), min: ys[0], lossShare: pct(ys.map((y) => y <= 0)), tenPlus: pct(ys.map((y) => y >= 10)), twentyPlus: pct(ys.map((y) => y >= 20)) };
    log(`== spread ${off} vs ${def}:`, JSON.stringify(out.spread[`${off} vs ${def}`]));
  }
  const a = T.play({ off: 'inside_zone', def: 'cover_3', attr: 'speed', value: 65, seed: 4242, options: { trace: true } }), b = T.play({ off: 'inside_zone', def: 'cover_3', attr: 'speed', value: 65, seed: 4242 });
  out.spread.reproducible = JSON.stringify(a.frames.map((f) => [f.off, f.def, f.ball])) === JSON.stringify(b.frames.map((f) => [f.off, f.def, f.ball])) && a.yards === b.yards;
  log('== same seed, trace on and off, identical play:', out.spread.reproducible);
}
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out, null, 1));
