#!/usr/bin/env node
// Task 6 planning diagnostics (read only). Plays a franchise with the game's own functions (tools/franchise-soak.mjs runFranchise, the
// hands-off owner of the benchmarks) and, at every season end, snapshots every AI monster (id, club, position, age, overall, level,
// potential, starter by overall, protected, how he joined), so season-to-season changes can be followed per monster:
//   ageing curve by age band and position, starters against reserves; who replaces an old starter; draftees against the starter they
//   would have to beat; reserve XP and levels; gym against ordinary clubs (anchor, team overall, where starters came from, legendaries).
// Nothing is written to the franchise; no save is written.
//   node tools/task6-diagnostics.mjs [--root=DIR] [--seed=106] [--seasons=20] [--json=out.json]
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || path.join(path.dirname(new URL(import.meta.url).pathname), '..'));
const imp = (p) => import(path.join(ROOT, p));
const F = await imp('src/franchise/franchise.js'); const R = await imp('src/franchise/league-registry.js');
const { GROUP_SLOTS, teamOverall } = await imp('src/franchise/roster.js'); const { monsterOverall } = await imp('src/data/monsters.js');
const { GYM_BY_CLUB } = await imp('src/data/gyms.js');
const { runFranchise } = await imp('tools/franchise-soak.mjs'); const { leagueInvariants, withBoardReset } = await imp('tools/league-soak.mjs');
const seed = Number(args.seed || 106), seasons = Number(args.seasons || 20);
const snaps = []; // per season: { year, clubs: { club: { gym, quality, target, teamOvr, slowed, boosted, monsters: [...] } } }
const onSeason = (f) => {
  const year = f.season.year; const clubs = {};
  for (const c of R.leagueClubs(f)) {
    const roster = R.clubRoster(f, c); const st = new Set();
    for (const [pos, slots] of Object.entries(GROUP_SLOTS)) for (const m of roster.filter((x) => x.position === pos).sort((a, b) => monsterOverall(b) - monsterOverall(a)).slice(0, slots.length)) st.add(m.id);
    const rec = R.clubRecord(f, c);
    clubs[c] = { gym: !!GYM_BY_CLUB[c], quality: F.clubQuality(f, c, year), target: rec.strategy?.today ?? null, teamOvr: teamOverall(F.aiTeam(f, c, year)), slowed: rec.strategy?.slow || 0, boosted: rec.strategy?.boost || 0, w: f.season.records[c]?.w,
      monsters: roster.map((m) => { const stint = [...(m.history || [])].reverse().find((h) => h.club === c); return { id: m.id, pos: m.position, age: m.age, ovr: monsterOverall(m), lvl: m.level, pot: m.potential ?? null, st: st.has(m.id) ? 1 : 0, prot: R.isProtected(m) ? 1 : 0, via: stint?.reason || 'unknown', drafted: m.drafted?.club === c ? m.drafted.year : null, round: m.drafted?.club === c ? m.drafted.round : null }; }) };
  }
  snaps.push({ year, clubs });
};
runFranchise(seed, { seasons, check: withBoardReset(leagueInvariants), onSeason });
const out = { root: ROOT, seed, seasons, snaps };
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out));
console.log(JSON.stringify({ seed, seasons: snaps.length, monsters: snaps.reduce((s, x) => s + Object.values(x.clubs).reduce((a, c) => a + c.monsters.length, 0), 0) }));
