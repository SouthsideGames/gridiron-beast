#!/usr/bin/env node
// QB decision quality against the defense (v42.10 review): run once per engine tree with the same teams, plays and seeds.
// Part A, matched single plays: every pass play in the book against every defensive call, several seeds, the test lineup, the
// real AI quarterback. Part B, full games between generated clubs. For each throw: the decision's quality share (true quality of
// the chosen receiver / best available, from the QB read record), whether he took the best, how open his target was when the ball
// left (distance to the nearest defender) against the most open eligible receiver, whether he threw to a COVERED receiver (under
// 1.5 yd) while another had 3+ yd, and, in games, whether he went back to the same covered receiver on the team's next pass.
//   node tools/qb-quality-compare.mjs [--root=DIR] [--seeds=4] [--games=60] [--json=FILE]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const HERE = path.resolve(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const ROOT = path.resolve(args.root || HERE);
const { simulatePlay } = await import(path.join(ROOT, 'src/sim/engine.js'));
const { PLAYS, OFFENSE_IDS, DEFENSE_IDS, eligibleReceivers } = await import(path.join(ROOT, 'src/data/playbook.js'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const { lineup } = await import(path.join(HERE, 'tests/tools/lineup.js'));
const SEEDS = Number(args.seeds) || 4, G = Number(args.games) || 60;
const mean = (xs) => (xs.length ? +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(3) : null); const pct = (a, b) => (b ? +(100 * a / b).toFixed(1) : null);

/** One throw's facts, or null when there was no throw. */
function throwFacts(sim) {
  const th = sim.events.find((e) => e.kind === 'throw'); const d = sim.qb?.decision; if (!th || !d || !sim.stats.target) return null;
  const f = sim.frames.find((x) => x.t >= th.t - 1e-6) || sim.frames.at(-1);
  const open = (slot) => { const r = f.off.find((p) => p[0] === slot); return r ? Math.min(...f.def.map((q) => Math.hypot(q[1] - r[1], q[2] - r[2]))) : null; };
  const op = typeof sim.offensePlay === 'string' ? PLAYS[sim.offensePlay] : sim.offensePlay; const elig = eligibleReceivers(op).filter((s) => f.off.some((p) => p[0] === s));
  const seps = Object.fromEntries(elig.map((s) => [s, open(s)])); const tSep = seps[sim.stats.target]; const others = elig.filter((s) => s !== sim.stats.target).map((s) => seps[s]);
  return { target: sim.stats.target, qShare: d.bestTrueQ ? d.trueQ / d.bestTrueQ : null, best: d.bestTrueQ ? d.trueQ >= d.bestTrueQ - 1e-3 : null, tSep, maxSep: Math.max(tSep, ...others),
    covered: tSep < 1.5 && others.some((x) => x >= 3), complete: !!sim.stats.receiver, int: !!sim.stats.interceptor, read: d.read };
}
function summarize(rows) {
  const bucket = (lo, hi) => { const r = rows.filter((x) => x.tSep >= lo && x.tSep < hi); return { throws: r.length, completionPct: pct(r.filter((x) => x.complete).length, r.length) }; };
  return { throws: rows.length, decisionQualityShare: mean(rows.map((r) => r.qShare).filter((x) => x != null)), choseBestPct: pct(rows.filter((r) => r.best).length, rows.length), targetSepAtThrow: mean(rows.map((r) => r.tSep)), mostOpenSepAtThrow: mean(rows.map((r) => r.maxSep)), coveredWhileOpenAvailablePct: pct(rows.filter((r) => r.covered).length, rows.length), firstReadPct: pct(rows.filter((r) => r.read === 0).length, rows.length), completionPct: pct(rows.filter((r) => r.complete).length, rows.length), intPct: pct(rows.filter((r) => r.int).length, rows.length), byTargetSep: { 'under 1.5 yd': bucket(0, 1.5), '1.5-3 yd': bucket(1.5, 3), '3+ yd': bucket(3, 99) } };
}
// Part A: matched plays
const L = lineup(11, 60); const plays = {}; const A = [];
const passOffs = OFFENSE_IDS.filter((k) => PLAYS[k].type === 'pass');
for (const o of passOffs) for (const dId of DEFENSE_IDS) for (let s = 1; s <= SEEDS; s++) {
  const sim = simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[dId], ballOn: 35, seed: 7000 + s, offense: L.offense, defense: L.defense });
  const t = throwFacts(sim); if (!t) continue; A.push(t); plays[`${o}|${dId}|${s}`] = { target: t.target, tSep: +t.tSep.toFixed(2), complete: t.complete };
}
// Part B: full games, abilities on
const B = []; let pairs = 0, repeatCovered = 0, repeat = 0;
for (let i = 1; i <= G; i++) {
  const last = {};
  playGame({ home: generatedTeam(500 + i, { id: 'h', name: 'H' }), away: generatedTeam(700 + i, { id: 'a', name: 'A' }), seed: 900 + i, onStep: (ev) => {
    const sim = ev?.sim; if (ev?.kind !== 'play' || !sim) return; const t = throwFacts(sim); if (!t) return; B.push(t);
    const k = sim.names?.off?.QB || '?'; const who = sim.names?.off?.[t.target] || t.target;
    if (last[k]) { pairs++; if (last[k].who === who) { repeat++; if (last[k].covered && t.covered) repeatCovered++; } } last[k] = { who, covered: t.covered };
  } });
}
const out = { root: ROOT, matchedPlays: { ...summarize(A), plays }, games: { ...summarize(B), sameReceiverAsLastPassPct: pct(repeat, pairs), sameCoveredReceiverTwiceInARowPct: pct(repeatCovered, pairs) } };
if (args.json) fs.writeFileSync(String(args.json), JSON.stringify(out));
const { plays: _p, ...brief } = out.matchedPlays; console.log(JSON.stringify({ root: ROOT, matchedPlays: brief, games: out.games }, null, 1));
