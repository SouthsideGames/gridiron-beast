#!/usr/bin/env node
// v42.2.1 snap-counter check: the same games under the v42.2.0 code (--old=DIR, a worktree of main before this PR) and this
// build, with partnerships at every level 0-4 and none: scores, play logs, team and player statistics, random state and the
// chemistry tally must be identical; the only difference allowed is the new `together` count inside the tally.
//   node tools/snap-counter-check.mjs --old=DIR [--games=6]
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const OLD = path.resolve(args.old); const G = Number(args.games || 6);
const NEWR = await import('../src/sim/game-runner.js'); const OLDR = await import(path.join(OLD, 'src/sim/game-runner.js'));
const { runFranchise } = await import('./franchise-soak.mjs'); const F = await import('../src/franchise/franchise.js');
const { f } = runFranchise(5, { seasons: 1, difficulty: 'pro' }); const cs = Object.keys(f.season.records).filter((c) => c !== f.club);
const withP = (t, level) => { if (level == null) return t; const o = t.offense, d = t.defense; return { ...t, partnership: { offense: { type: 'QB-WR', a: o.QB.id, b: o.WR1.id, level, cap: 8 }, defense: { type: 'DL-DL', a: d.DL1.id, b: d.DL2.id, level, cap: 3 } } }; };
const drop = (s) => { const c = JSON.parse(JSON.stringify(s)); for (const side of ['home', 'away']) for (const k of ['offense', 'defense']) if (c.partnerCredits?.[side]?.[k]) delete c.partnerCredits[side][k].together; for (const side of ['home', 'away']) if (c.partnerCredits?.[side]) for (const k of Object.keys(c.partnerCredits[side])) if (!c.partnerCredits[side][k].n && !c.partnerCredits[side][k].garbage && !c.partnerCredits[side][k].capped) delete c.partnerCredits[side][k]; return canon(c); };
const canon = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v)); // key order is not data
let games = 0, same = 0, togetherSeen = 0; const bad = [];
for (const level of [null, 0, 1, 2, 3, 4]) for (let i = 0; i < G; i++) {
  const home = withP(F.aiTeam(f, cs[i % cs.length]), level), away = withP(F.aiTeam(f, cs[(i + 5) % cs.length]), level); const seed = 1000 + i * 17 + (level ?? 9);
  const a = OLDR.playGame({ home, away, seed, quarterLength: 180 }); const b = NEWR.playGame({ home, away, seed, quarterLength: 180 });
  games++; if (drop(a) === drop(b)) same++; else { const ex = (s2) => { const c = JSON.parse(JSON.stringify(s2)); delete c.partnerCredits; return canon(c); }; bad.push(`level ${level} game ${i}${ex(a) === ex(b) ? ' (tally only)' : ' (FOOTBALL DIFFERS)'}`); }
  togetherSeen += ['home', 'away'].reduce((n, s) => n + (b.partnerCredits?.[s]?.offense?.together || 0), 0);
}
console.log(JSON.stringify({ games, identical: same, togetherCounted: togetherSeen, differing: bad }));
console.log(same === games && togetherSeen > 0 ? 'SNAP COUNTER CHECK PASSED' : 'SNAP COUNTER CHECK FAILED'); process.exit(same === games ? 0 : 1);
