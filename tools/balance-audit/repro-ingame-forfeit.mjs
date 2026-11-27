#!/usr/bin/env node
// Balance audit 2026-11-25 reproduction (observation only, nothing in the game is changed): what happens to a game in progress when
// a club loses its last monster at a position to an in-game injury. The injury is recorded exactly as substitutions.js records one
// (state.rotation.injuries[id]); everything else is the production runner. Prints the score before and the final result.
//   node tools/balance-audit/repro-ingame-forfeit.mjs [--seed=11]
import { step, aiController, newTendencies } from '../../src/sim/game-runner.js';
import * as R from '../../src/sim/rules.js';
import { generatedTeam } from '../../src/franchise/roster.js';
const seed = Number((process.argv.find((a) => a.startsWith('--seed=')) || '--seed=11').split('=')[1]);
const home = generatedTeam(seed, { id: 'h', name: 'Home' }), away = generatedTeam(seed + 1, { id: 'a', name: 'Away' });
const qbs = (t) => [t.offense.QB, ...(t.bench || [])].filter((p) => p?.position === 'QB');
console.log('home QBs on the game roster:', qbs(home).length, '| rotation on:', !!home.rotation);
const teams = { home, away }; const state = R.newGame({ home, away, seed, quarterLength: 180, otPeriods: 1 });
const ctl = { home: aiController('home'), away: aiController('away') }, tend = { home: newTendencies(), away: newTendencies() };
let injured = false, before = null, n = 0;
while (!state.finished && n++ < 2000) {
  if (!injured && state.quarter === 3 && state.phase === 'scrimmage') { before = { ...state.score, quarter: state.quarter, clock: state.clock };
    (state.rotation ||= { active: {}, manual: {}, injuries: {}, notices: [] }); for (const p of qbs(home)) state.rotation.injuries[p.id] = { severity: 'Minor', weeks: 1, type: 'ankle', inGame: true }; injured = true; }
  const ev = step(state, teams, ctl, tend); if (!ev) break;
}
console.log('score when every home QB was hurt:', JSON.stringify(before));
console.log('final:', JSON.stringify(state.score), 'winner', state.winner, 'forfeit', JSON.stringify(state.forfeit || null));
