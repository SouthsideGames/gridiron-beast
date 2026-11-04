#!/usr/bin/env node
// Offseason-opening offer check (Task 5.5, diagnostic only). GDD §19.6 / trades.js CALL_CHANCE: a club may call the owner each week of
// weeks 2–8 "and once when the offseason opens". franchise.js maybeTradeCall records every attempt in f.callsMade under a stamp
// (`wk:<year>:<week>` in season, `off:<year>` when the offseason opens). This plays franchises with the game's own functions and lists
// the stamps attempted, so two trees can be compared: an `off:` stamp means the offseason call was at least attempted.
//   node tools/offseason-call-check.mjs [--root=DIR] [--seeds=51-53] [--seasons=2]
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const { runFranchise } = await import(path.join(ROOT, 'tools/franchise-soak.mjs'));
const { leagueInvariants, withBoardReset } = await import(path.join(ROOT, 'tools/league-soak.mjs'));
const [s0, s1] = String(args.seeds || '51-53').split('-').map(Number); const seasons = Number(args.seasons || 2);
const out = [];
for (let seed = s0; seed <= (s1 || s0); seed++) {
  let calls = 0, last = null; const check = (f, where) => { const c = f.tradeCall; const k = c ? `${c.expires}|${c.team}` : null; if (k && k !== last) calls++; last = k; return withBoardReset(leagueInvariants)(f, where); };
  const { f } = runFranchise(seed, { seasons, check });
  const stamps = Object.keys(f.callsMade || {}); out.push({ seed, inSeasonAttempts: stamps.filter((s) => s.startsWith('wk:')).length, offseasonAttempts: stamps.filter((s) => s.startsWith('off:')).length, callsSeen: calls });
}
console.log(JSON.stringify({ root: ROOT, seasons, seeds: out, offseasonAttempts: out.reduce((s, x) => s + x.offseasonAttempts, 0), seasonsPlayed: out.length * seasons }));
