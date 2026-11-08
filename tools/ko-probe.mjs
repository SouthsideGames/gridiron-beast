// Dev probe (Task 8 M2 live kickoffs): live return averages against the formula's, over generated clubs.
// node tools/ko-probe.mjs [N]
import * as R from '../src/sim/rules.js';
import * as ST from '../src/sim/special-teams.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { createRng } from '../src/core/rng.js';

const N = +process.argv[2] || 300;
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0).toFixed(1);
const live = { tb: 0, ret: [], end: [], td: 0, lost: 0, res: {}, t: [] };
for (let i = 1; i <= N; i++) {
  const home = generatedTeam(10 + (i % 7), { id: 'h', name: 'H' }), away = generatedTeam(50 + (i % 5), { id: 'a', name: 'A' });
  const s = R.newGame({ home, away, seed: i, coinWinner: 'home', choice: 'receive' });
  const out = R.doKickoff(s, { home, away });
  if (!out.sim) { live.tb++; continue; }
  live.res[out.sim.result] = (live.res[out.sim.result] || 0) + 1;
  if (out.res.touchdown) live.td++; if (out.res.recoveredByKicking || out.res.kickingTouchdown) live.lost++;
  if (!out.res.touchdown) { live.ret.push(out.res.returnYards); live.end.push(out.res.ballOn); }
  live.t.push(out.sim.elapsed);
}
console.log('live', { N, touchbacks: live.tb, returns: live.ret.length + live.td, meanReturn: mean(live.ret), meanStart: mean(live.end), td: live.td, lostFumbles: live.lost, results: live.res, meanElapsed: mean(live.t) });
const rng = createRng(5); const f = { n: 0, ret: [], end: [], td: 0 };
for (let i = 1; i <= N; i++) {
  const home = generatedTeam(10 + (i % 7), { id: 'h', name: 'H' }), away = generatedTeam(50 + (i % 5), { id: 'a', name: 'A' });
  const k = ST.kickoff(rng, { kicker: home.kicker, returner: away.returner }); if (k.touchback) continue; f.n++;
  if (k.touchdown) f.td++; else { f.ret.push(k.returnYards); f.end.push(k.ballOn); }
}
console.log('formula', { returns: f.n, meanReturn: mean(f.ret), meanStart: mean(f.end), td: f.td });
