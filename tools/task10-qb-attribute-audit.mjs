#!/usr/bin/env node
// Task 10 quarterback pressure audit (owner 2026-11-13: audit the existing Awareness, Speed, Agility and Strength contributions before
// any new pressure mechanic). Controlled comparisons on the real engine (src/lab/attr-trials.js): every monster is a plain 65, no ability,
// no type; ONLY the quarterback's one attribute changes (40 / 65 / 90); every level plays the same plays, defenses and seeds.
// Two conditions: neutral (everyone 65) and pressure (the defense's linemen and linebackers rush at 85 Speed and Strength).
//   node tools/task10-qb-attribute-audit.mjs [--seeds=3] [--json=out.json]
import { writeFileSync } from 'node:fs';
import { play } from '../src/lab/attr-trials.js';
import { PLAYS, OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SEEDS = Number(args.seeds || 3); const LEVELS = [40, 65, 90]; const ATTRS = ['awareness', 'speed', 'agility', 'strength'];
const PASS = OFFENSE_IDS.filter((id) => !PLAYS[id].reserve && PLAYS[id].type === 'pass' && !PLAYS[id].tags.includes('screen')); // the original live pass plays
const DEFS = ['cover_1', 'cover_2_zone', 'cover_3', 'cover_4', 'zone_blitz', 'fire_zone', 'db_blitz', 'all_out', 'safety_blitz', 'qb_spy'].filter((d) => PLAYS[d]);
const rushUp = (offense, defense) => { for (const [s, m] of Object.entries(defense)) if (/^(DL|LB)/.test(s)) { m.attrs.speed = 85; m.attrs.strength = 85; } };

function measure(attr, value, pressure) {
  const m = { n: 0, sacks: 0, throws: 0, comp: 0, int: 0, scrambles: 0, scrYds: 0, scrStopped: 0, decT: [], pressured: 0, pressSacks: 0, escapes: 0, sackAttempts: 0, qbTackleTries: 0, qbBroken: 0, worse: 0, hot: 0, missedOpen: 0 };
  for (const off of PASS) for (const def of DEFS) for (let s = 1; s <= SEEDS; s++) {
    const sim = play({ off, def, offSubjects: ['QB'], attr, value, seed: 7000 + s * 131 + off.length * 7 + def.length, extra: pressure ? rushUp : null, options: { frameEvery: 8 } });
    m.n++; const ev = sim.events; const sack = sim.result === 'sack' || ev.some((e) => e.kind === 'sack');
    const thr = ev.find((e) => e.kind === 'throw'); const scr = ev.some((e) => e.kind === 'scramble');
    if (sack) m.sacks++;
    if (thr) { m.throws++; if (ev.some((e) => e.kind === 'catch')) m.comp++; if (ev.some((e) => e.kind === 'interception')) m.int++; }
    const dec = sim.qb?.decision; if (dec?.t != null) m.decT.push(dec.t);
    if (dec?.action === 'throw' && dec.bestTrueQ != null && dec.trueQ != null && dec.bestTrueQ - dec.trueQ > 0.2) m.worse++; // threw to a clearly worse option than the best available
    if (dec?.missed) m.missedOpen++;
    if (sim.stats?.pressure) { m.pressured++; if (sack) m.pressSacks++; }
    const esc = ev.filter((e) => e.kind === 'escape').length; m.escapes += esc; m.sackAttempts += esc + (ev.some((e) => e.kind === 'sack') ? 1 : 0);
    if (scr && !thr) { m.scrambles++; m.scrYds += sim.yards ?? 0; if ((sim.yards ?? 0) <= 0) m.scrStopped++; }
    if (sim.stats?.carrier === 'QB' && !sack) { m.qbBroken += sim.stats.brokenTackles || 0; m.qbTackleTries += (sim.stats.brokenTackles || 0) + (sim.result === 'tackle' || sim.result === 'fumble' ? 1 : 0); }
  }
  const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null); const avg = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2) : null);
  return { attr, value, pressure, plays: m.n, sackPct: pct(m.sacks, m.n), pressuredPct: pct(m.pressured, m.n), sackPctWhenPressured: pct(m.pressSacks, m.pressured), escapePctOfSackAttempts: pct(m.escapes, m.sackAttempts), sackAttempts: m.sackAttempts,
    throwPct: pct(m.throws, m.n), completionPct: pct(m.comp, m.throws), intPct: pct(m.int, m.throws), decisionTime: avg(m.decT), worseTargetPct: pct(m.worse, m.throws), missedOpenPct: pct(m.missedOpen, m.n),
    scramblePct: pct(m.scrambles, m.n), scrambleYds: m.scrambles ? +(m.scrYds / m.scrambles).toFixed(2) : null, scrambleStoppedPct: pct(m.scrStopped, m.scrambles), brokenTacklePct: pct(m.qbBroken, m.qbTackleTries), qbTackleTries: m.qbTackleTries };
}
const rows = [];
for (const pressure of [false, true]) for (const attr of ATTRS) for (const v of LEVELS) { const r = measure(attr, v, pressure); rows.push(r); console.log(JSON.stringify(r)); }
if (args.json) writeFileSync(String(args.json), JSON.stringify({ seeds: SEEDS, passPlays: PASS.length, defenses: DEFS, rows }));
