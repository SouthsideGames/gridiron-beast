#!/usr/bin/env node
// Task 10 ability census (measurement only): whole games between generated clubs exactly as the game builds them (every monster
// with his own ability). Per family: how many game appearances (a monster of that family in a starting lineup or kicking), his
// executions per appearance and the share of appearances with none. Complements tools/task10-ability-strength.mjs, where only
// one monster has an ability and so nothing can react to another ability.
//   node tools/task10-ability-census.mjs [--games=200] [--json=out.json]
import { writeFileSync } from 'node:fs';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { generatedTeam } from '../src/franchise/roster.js';
import * as R from '../src/sim/rules.js';
import { step, aiController, newTendencies } from '../src/sim/game-runner.js';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const G = Number(args.games || 200); const cat = reviewCatalog(); const T = new Map(cat.map((c) => [c.family, { app: 0, ex: 0, none: 0 }]));
for (let g = 0; g < G; g++) {
  const teams = { home: generatedTeam(5000 + g * 2, { id: 'H', name: 'Home', abbr: 'HOM' }), away: generatedTeam(5001 + g * 2, { id: 'A', name: 'Away', abbr: 'AWY' }) };
  const state = R.newGame({ home: teams.home, away: teams.away, seed: 9000 + g }); const ctrl = { home: aiController('home'), away: aiController('away') }; const tend = { home: newTendencies(), away: newTendencies() };
  for (let i = 0; i < 2500 && !state.finished; i++) if (!step(state, teams, ctrl, tend, {})) break;
  for (const t of [teams.home, teams.away]) { const seen = new Set(); for (const m of [...Object.values(t.offense), ...Object.values(t.defense), t.kicker]) { if (!m?.species || seen.has(m.id) || !T.has(m.species)) continue; seen.add(m.id); const x = T.get(m.species); const e = state.t8?.mastery?.[m.id]?.executions || 0; x.app++; x.ex += e; if (!e) x.none++; } }
}
const rows = cat.map((c) => { const x = T.get(c.family); return { family: c.family, ability: c.name, position: c.position, rarity: c.rarity, element: c.element, appearances: x.app, exPerGame: x.app ? +(x.ex / x.app).toFixed(2) : null, noExecutionPct: x.app ? +(100 * x.none / x.app).toFixed(1) : null }; }).sort((a, b) => (a.exPerGame ?? -1) - (b.exPerGame ?? -1));
for (const r of rows) console.log(JSON.stringify(r)); if (args.json) writeFileSync(String(args.json), JSON.stringify({ games: G, rows }));
