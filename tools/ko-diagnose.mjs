// Dev diagnostic (Task 8 M2 live kickoffs, owner 2026-11-07 18:20): before any tuning of return blocking, check that the return
// unit's blockers acquire legal targets, the returner follows usable lanes, coverage starts correctly and plays do not end
// prematurely; report the return distribution and touchdowns. Read-only; uses the game's own kickoff.
//   node tools/ko-diagnose.mjs [N=1000]
import * as R from '../src/sim/rules.js';
import { generatedTeam } from '../src/franchise/roster.js';

const N = +process.argv[2] || 1000;
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : null; };
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null);
const out = { kicks: 0, touchbacks: 0, live: 0, noCatch: 0, coverageStartOk: 0, coverageLanes: new Set(), returnerStart: [], catchT: [],
  blockers: 0, blockersEngaged: 0, engagementsFromBehind: 0, engagementsTotal: 0, firstEngageAfterCatch: [], noBlockerEngagedAtTackle: 0,
  lateral: [], gain2s: [], afterCatch: [], endsWithin1s: 0, results: {}, tacklers: {}, returns: [], td: 0, fumbles: 0, contacts: [] };
for (let i = 1; i <= N; i++) {
  const home = generatedTeam(10 + (i % 7), { id: 'h', name: 'H' }), away = generatedTeam(50 + (i % 5), { id: 'a', name: 'A' });
  const s = R.newGame({ home, away, seed: i, coinWinner: 'home', choice: 'receive' }); out.kicks++;
  const o = R.doKickoff(s, { home, away }); if (!o.sim) { out.touchbacks++; continue; }
  out.live++; const sim = o.sim; const F = sim.frames; const f0 = F[0];
  const ret = sim.stats.carrier || o.res.returner || null;
  // coverage: every coverage player within a yard behind the kick line at the start, spread over lanes
  if (f0.def.every((p) => p[1] >= 0 && p[1] <= 1.5)) out.coverageStartOk++; for (const p of f0.def) out.coverageLanes.add(p[2]);
  const r0 = f0.off.find((p) => p[0] === ret); if (r0) out.returnerStart.push(r0[1]);
  const catchEv = sim.events.find((e) => e.kind === 'kick_catch'); if (!catchEv) { out.noCatch++; continue; }
  const tc = catchEv.t; out.catchT.push(tc);
  const at = (t) => F.reduce((b, fr) => (Math.abs(fr.t - t) < Math.abs(b.t - t) ? fr : b), F[0]);
  const cf = at(tc); const rc = cf.off.find((p) => p[0] === ret);
  // blockers: engaged at least once; engagement direction (the coverage player in front of the blocker, toward the kicking team)
  const blockers = f0.off.filter((p) => p[0] !== ret).map((p) => p[0]); out.blockers += blockers.length;
  for (const b of blockers) {
    let first = null, prev = 0;
    for (const fr of F) { const p = fr.off.find((x) => x[0] === b); if (!p) continue; if (p[3] === 1 && !prev) { out.engagementsTotal++; const near = fr.def.reduce((best, d) => { const dd = Math.hypot(d[1] - p[1], d[2] - p[2]); return dd < best.dd ? { d, dd } : best; }, { d: null, dd: 1e9 }); if (near.d && near.d[1] < p[1] - 0.6) out.engagementsFromBehind++; if (first === null) first = fr.t; } prev = p[3] === 1 ? 1 : 0; }
    if (first !== null) { out.blockersEngaged++; out.firstEngageAfterCatch.push(+(first - tc).toFixed(2)); }
  }
  // the returner after the catch: lateral movement, yards in the first 2 s, time to the end
  const end = F[F.length - 1]; const re = end.off.find((p) => p[0] === ret) || end.def.find((p) => p[0] === ret);
  const r2 = at(tc + 2).off.find((p) => p[0] === ret);
  if (rc && re) { out.lateral.push(+Math.abs(re[2] - rc[2]).toFixed(1)); if (r2) out.gain2s.push(+(r2[1] - rc[1]).toFixed(1)); }
  const dur = end.t - tc; out.afterCatch.push(+dur.toFixed(2)); if (dur < 1) out.endsWithin1s++;
  const engagedAtEnd = end.off.some((p) => p[0] !== ret && p[3] === 1); if (!engagedAtEnd && sim.result === 'tackle') out.noBlockerEngagedAtTackle++;
  out.results[sim.result] = (out.results[sim.result] || 0) + 1;
  const tk = sim.stats.tackler; if (tk) out.tacklers[tk] = (out.tacklers[tk] || 0) + 1;
  if (o.res.touchdown) out.td++; if (sim.turnover) out.fumbles++;
  if (!o.res.touchdown) out.returns.push(o.res.returnYards);
}
const rep = { N: out.kicks, touchbacks: out.touchbacks, liveReturns: out.live, noCatch: out.noCatch,
  coverage: { startedWithinAYardBehindTheKick: `${out.coverageStartOk}/${out.live}`, lanesY: [...out.coverageLanes].sort((a, b) => a - b) },
  returnerStartX: { min: Math.min(...out.returnerStart), max: Math.max(...out.returnerStart) }, catchTime: { mean: mean(out.catchT), min: Math.min(...out.catchT), max: Math.max(...out.catchT) },
  blockers: { engagedAtLeastOnce: `${out.blockersEngaged}/${out.blockers} (${(100 * out.blockersEngaged / out.blockers).toFixed(1)}%)`, engagements: out.engagementsTotal, fromBehindPct: +(100 * out.engagementsFromBehind / Math.max(1, out.engagementsTotal)).toFixed(1), firstEngageAfterCatchS: { p10: pct(out.firstEngageAfterCatch, 0.1), p50: pct(out.firstEngageAfterCatch, 0.5), p90: pct(out.firstEngageAfterCatch, 0.9) } },
  returner: { lateralYds: { p50: pct(out.lateral, 0.5), p90: pct(out.lateral, 0.9) }, gainFirst2s: { p10: pct(out.gain2s, 0.1), p50: pct(out.gain2s, 0.5), p90: pct(out.gain2s, 0.9) } },
  playEnd: { secondsAfterCatch: { p10: pct(out.afterCatch, 0.1), p50: pct(out.afterCatch, 0.5), p90: pct(out.afterCatch, 0.9) }, endedWithin1sOfCatch: out.endsWithin1s, tackledWithNoBlockEngaged: out.noBlockerEngagedAtTackle, results: out.results, tacklers: out.tacklers },
  returns: { mean: mean(out.returns), p10: pct(out.returns, 0.1), p25: pct(out.returns, 0.25), p50: pct(out.returns, 0.5), p75: pct(out.returns, 0.75), p90: pct(out.returns, 0.9), max: Math.max(...out.returns), over30: out.returns.filter((x) => x > 30).length, over40: out.returns.filter((x) => x > 40).length, touchdowns: out.td, turnovers: out.fumbles } };
console.log(JSON.stringify(rep, null, 1));
