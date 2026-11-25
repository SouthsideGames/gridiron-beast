#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): how often one defender reaches N personal pass breakups in a game. Air Brake
// (skywarden) and Crosswind Rescue (windlynx) charge on three personal breakups and lose the charge at the end of the game.
//   node tools/balance-audit/pbu-probe.mjs [--games=100]
import { playGame } from '../../src/sim/game-runner.js';
import { generatedTeam } from '../../src/franchise/roster.js';
const G = Number((process.argv.find((a) => a.startsWith('--games=')) || '--games=100').split('=')[1]);
const dist = {}; let games = 0, pbus = 0, defenderGames = 0;
for (let i = 0; i < G; i++) {
  const per = {};
  playGame({ home: generatedTeam(11000 + i, { id: 'h', name: 'H' }), away: generatedTeam(12000 + i, { id: 'a', name: 'A' }), seed: 13000 + i, quarterLength: 180, otPeriods: 1, onStep: (ev, st) => {
    const b = ev?.sim?.stats?.pbuBy; if (!b) return; const k = `${st.possession}|${b}`; per[k] = (per[k] || 0) + 1; pbus++; } });
  games++; for (const n of Object.values(per)) { dist[n] = (dist[n] || 0) + 1; defenderGames++; }
}
const atLeast3 = Object.entries(dist).filter(([n]) => +n >= 3).reduce((s, [, k]) => s + k, 0);
console.log(JSON.stringify({ games, pbusPerGame: +(pbus / games).toFixed(2), defenderGamesWithAPbu: defenderGames, byCount: dist, defenderGamesWith3Plus: atLeast3, per100TeamGames3Plus: +(100 * atLeast3 / (2 * games)).toFixed(2) }));
