#!/usr/bin/env node
// QB decision study (GDD §53): passing outcomes from the engine at --root (default this checkout), for before/after comparisons.
//   1. Full games: --games headless games between generated clubs (completion %, yards per attempt, interceptions, sacks,
//      scrambles, throw-aways, primary-target share, points).
//   2. Awareness sweep: every non-screen pass play against every base defense, one lineup, QB Awareness 50 / 75 / 95
//      (target distribution, completion, interceptions, sacks, scrambles, throw-aways, decision time; with the read log, when the
//      engine records one: forced throws, missed open receivers, decision quality).
//   node tools/qb-study.mjs [--root=DIR] [--games=24] [--seeds=4]
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const { simulatePlay } = await import(path.join(ROOT, 'src/sim/engine.js'));
const { PLAYS, OFFENSE_IDS, DEFENSE_IDS } = await import(path.join(ROOT, 'src/data/playbook.js'));
const { playGame } = await import(path.join(ROOT, 'src/sim/game-runner.js'));
const { generatedTeam } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const { lineup } = await import(path.join(ROOT, 'tests/tools/lineup.js'));
const pc = (x, y) => (y ? Math.round(1000 * x / y) / 10 : null);
const isPass = (id) => PLAYS[id]?.type === 'pass' && !PLAYS[id].tags.includes('screen');
function tally(m, sim, offId) {
  if (!isPass(offId)) return; m.dropbacks++;
  const ev = sim.events; const thr = ev.find((e) => e.kind === 'throw');
  if (sim.result === 'sack') m.sacks++; if (sim.result === 'throwaway') m.throwaways++; if (ev.some((e) => e.kind === 'scramble')) m.scrambles++;
  if (!thr) return; m.att++; const prim = PLAYS[offId].primary; if (thr.target === prim) m.primary++;
  const caught = sim.stats.receiver != null && sim.result !== 'interception'; if (caught) { m.comp++; m.yds += sim.yards; } if (sim.result === 'interception') m.int++;
  m.tSum += thr.t; (m.byPlay[offId] ||= {}); m.byPlay[offId][thr.target] = (m.byPlay[offId][thr.target] || 0) + 1;
  const d = ev.find((e) => e.kind === 'qb_decision'); if (d) { m.logged++; if (d.forced) m.forced++; if (d.missed) m.missed++; m.qSum += d.trueQ ?? 0; m.bestSum += d.bestTrueQ ?? 0; }
}
const blank = () => ({ dropbacks: 0, att: 0, comp: 0, yds: 0, int: 0, sacks: 0, scrambles: 0, throwaways: 0, primary: 0, tSum: 0, byPlay: {}, logged: 0, forced: 0, missed: 0, qSum: 0, bestSum: 0 });
const summary = (m) => { const conc = Object.values(m.byPlay).map((t) => { const v = Object.values(t); const s = v.reduce((a, b) => a + b, 0); return s >= 8 ? Math.max(...v) / s : null; }).filter((x) => x != null);
  return { dropbacks: m.dropbacks, attempts: m.att, completionPct: pc(m.comp, m.att), yardsPerAttempt: m.att ? +(m.yds / m.att).toFixed(2) : null, intPct: pc(m.int, m.att), sackPct: pc(m.sacks, m.dropbacks), scramblePct: pc(m.scrambles, m.dropbacks), throwAwayPct: pc(m.throwaways, m.dropbacks), primaryShare: pc(m.primary, m.att), topTargetShareByPlay: conc.length ? pc(conc.reduce((a, b) => a + b, 0), conc.length) : null, avgThrowTime: m.att ? +(m.tSum / m.att).toFixed(2) : null,
    ...(m.logged ? { forcedThrowPct: pc(m.forced, m.logged), missedOpenPct: pc(m.missed, m.logged), decisionQuality: +(m.qSum / m.logged).toFixed(3), bestAvailableQuality: +(m.bestSum / m.logged).toFixed(3) } : {}) }; };
const out = { root: ROOT };
// 1. full games
const G = Number(args.games ?? 24); if (G) { const m = blank(); let pts = 0;
  for (let i = 1; i <= G; i++) { const s = playGame({ home: generatedTeam(500 + i, { id: 'h', name: 'H' }), away: generatedTeam(700 + i, { id: 'a', name: 'A' }), seed: 900 + i, onStep: (ev) => { if (ev?.kind === 'play' && ev.sim) tally(m, ev.sim, ev.offensePlayId); } }); pts += (s.score?.home || 0) + (s.score?.away || 0); }
  out.games = { n: G, pointsPerGame: +(pts / G / 2).toFixed(1), ...summary(m) }; }
// 2. awareness sweep
const S = Number(args.seeds ?? 4); const pass = OFFENSE_IDS.filter(isPass); out.awareness = {};
for (const aw of [50, 75, 95]) { const L = lineup(11, 62); L.offense.QB.attrs = { ...L.offense.QB.attrs, awareness: aw }; const m = blank();
  for (const o of pass) for (const d of DEFENSE_IDS) for (let s = 1; s <= S; s++) tally(m, simulatePlay({ offensePlay: PLAYS[o], defensePlay: PLAYS[d], ballOn: 35, seed: s * 101 + d.length * 7 + o.length, offense: L.offense, defense: L.defense }), o);
  out.awareness[aw] = summary(m); }
console.log(JSON.stringify(out, null, 1));
