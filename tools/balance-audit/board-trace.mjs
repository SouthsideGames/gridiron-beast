#!/usr/bin/env node
// Balance audit 2026-11-25 (observation only): the hands-off owner on the real Board (the policy tools/balance-compare.mjs uses:
// runFranchise defaults), printing the Board's own record after every season: goal, target, forecast, wins, met, miss kind,
// confidence, misses in a row, and whether the owner was fired. Nothing is changed.
//   node tools/balance-audit/board-trace.mjs --seed=1 --difficulty=pro [--seasons=5]
import { runFranchise } from '../franchise-soak.mjs';
const a = Object.fromEntries(process.argv.slice(2).map((x) => { const [k, v] = x.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const out = [];
const r = runFranchise(Number(a.seed || 1), { difficulty: a.difficulty || 'pro', seasons: Number(a.seasons || 5), check: () => [],
  beforeOffseason: (f) => { const b = f.board; const h = b.history[b.history.length - 1]; out.push({ year: f.season.year, ...h, confidenceNow: b.confidence, misses: b.misses, fired: !!b.fired }); } });
console.log(JSON.stringify({ seed: Number(a.seed || 1), difficulty: a.difficulty || 'pro', fired: r.log.fired, seasons: r.log.seasons.map((s) => `${s.w}-${s.l}`), board: out }, null, 1));
