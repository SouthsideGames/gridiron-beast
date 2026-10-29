#!/usr/bin/env node
// Roster-size trace for one AI club (Task 5 follow-up). Replays a benchmark seed (optionally with a stress scenario) and prints every
// change in the club's roster size at the game's own check points, with the arrivals and departures that caused it.
//   node tools/roster-trace.mjs --seed=1 --club="Sundown Drakes" --scenario=expiring --seasons=6 [--root=DIR] [--years=4-5]
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const imp = (p) => import(path.join(ROOT, p));
const F = await imp('src/franchise/franchise.js'); const { runFranchise } = await imp('tools/franchise-soak.mjs');
const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs'); const REG = await imp('src/franchise/league-registry.js');
const LS = await imp('src/franchise/league-season.js'); const { GROUP_SLOTS } = await imp('src/franchise/roster.js');
const { monsterOverall, ROSTER_MIN } = await imp('src/data/monsters.js'); const { ALL_TEAMS } = await imp('src/data/league.js');
const SC = args.scenario ? (await import(path.join(path.dirname(new URL(import.meta.url).pathname), 'ai-benchmark-scenarios.mjs'))).SCENARIOS[args.scenario] : null;
const [y0, y1] = (args.years || '1-99').split('-').map(Number);
const seed = +args.seed || 1; const club = args.club; let applied = false; let prev = null; let prevKey = '';
const base = withBoardReset(leagueInvariants);
const check = (f, where) => {
  if (SC && !applied && F.hasLeague(f)) { SC.apply(f, { REG, LS, monsterOverall, GROUP_SLOTS, ALL_TEAMS }); applied = true; }
  const p = base(f, where); if (!F.hasLeague(f)) return p;
  const roster = REG.clubRoster(f, club); const ids = new Map(roster.map((m) => [m.id, m]));
  const y = f.season.year; const key = `${y}|${f.season.week}|${f.season.finished}|${!!f.offseason}|${where}`;
  if (prev && y >= y0 && y <= y1 && (ids.size !== prev.size || [...ids.keys()].some((i) => !prev.has(i)))) {
    const gone = [...prev.values()].filter((m) => !ids.has(m.id)).map((m) => `${m.position}${monsterOverall(m)}${m.age >= 0 ? '/a' + m.age : ''}[${(m.history || []).slice(-1)[0]?.reason || '?'}]`);
    const came = [...ids.values()].filter((m) => !prev.has(m.id)).map((m) => `${m.position}${monsterOverall(m)}`);
    console.log(`y${y} wk${f.season.week} fin=${f.season.finished} off=${!!f.offseason} @${where}: ${prev.size}→${ids.size} (min ${ROSTER_MIN})  out: ${gone.join(' ') || '-'}  in: ${came.join(' ') || '-'}`);
  }
  prev = ids; prevKey = key; return p;
};
runFranchise(seed, { seasons: +args.seasons || 6, check, onSeason: () => {} });
console.log('done');
