#!/usr/bin/env node
// Task 6 Phase C closeout (owner 2026-11-02): why the hands-off owner's team falls behind in seasons 6-8 (planning tool; changes nothing).
// Plays the drift configuration (persistent league, board reset, hands-off owner from tools/franchise-soak.mjs) on a build and records,
// at each season's end after the offseason is settled, what the owner's roster is made of and how it changed.
//   node tools/task6-owner-drift-diag.mjs --root=TREE --difficulty=rookie --seeds=1-12 --seasons=8 --json=out.json
import fs from 'node:fs';
import path from 'node:path';
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v = '1'] = a.replace(/^--/, '').split('='); return [k, v]; }));
const ROOT = path.resolve(args.root || '.');
const F = await import(path.join(ROOT, 'src/franchise/franchise.js'));
const { runFranchise, invariants } = await import(path.join(ROOT, 'tools/franchise-soak.mjs'));
const { withBoardReset } = await import(path.join(ROOT, 'tools/league-soak.mjs'));
const { teamOverall, buildDepthChart } = await import(path.join(ROOT, 'src/franchise/roster.js'));
const { monsterOverall } = await import(path.join(ROOT, 'src/data/monsters.js'));
const { ALL_TEAMS } = await import(path.join(ROOT, 'src/data/league.js'));
const CURVE = { RB: 27, WR: 28, CB: 28, LB: 29, S: 29, DL: 29, TE: 29, OL: 30, QB: 30, K: 32 };
const pubOnset = (m) => (CURVE[m.position] || 28) + ((m.durPeak ?? m.attributes?.durability ?? 60) >= 75 ? 1 : (m.durPeak ?? m.attributes?.durability ?? 60) <= 45 ? -1 : 0);
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const [s0, s1] = String(args.seeds || '1-12').split('-').map(Number); const seasons = Number(args.seasons || 8); const difficulty = args.difficulty || 'rookie';
const out = { root: ROOT, difficulty, seasons, runs: [] };
for (let seed = s0; seed <= s1; seed++) {
  let prev = null; const rows = [];
  runFranchise(seed, { seasons, difficulty, check: withBoardReset(invariants), onSeason: (f) => {
    const y = f.season.year; const chart = buildDepthChart(f.roster, f.lineupManual, f.depth); const st = new Set(Object.values(chart).filter(Boolean));
    const starters = f.roster.filter((m) => st.has(m.id)); const ids = new Set(f.roster.map((m) => m.id));
    const retiredIds = new Set((f.retirementsLast?.year === y ? f.retirementsLast.owner : []).map((x) => x.id));
    const retiredStarters = (f.retirementsLast?.year === y ? f.retirementsLast.owner : []).filter((x) => x.starter).length;
    const gone = prev ? prev.ids.filter((id) => !ids.has(id)) : []; const fresh = prev ? f.roster.filter((m) => !prev.idSet.has(m.id)) : [];
    const myPicks = (f.draft?.picks || []).filter((p) => p.team === f.club && !p.passed);
    const clubs = ALL_TEAMS.filter((c) => c !== f.club);
    rows.push({ year: y, w: f.season.records[f.club].w, l: f.season.records[f.club].l, mine: teamOverall(F.playerTeam(f)), aiEnd: mean(clubs.map((c) => teamOverall(F.aiTeam(f, c, y)))),
      starterOvr: mean(starters.map((m) => monsterOverall(m))), starterAge: mean(starters.map((m) => m.age)), startersPastOnset: starters.filter((m) => m.age > pubOnset(m)).length,
      roster: f.roster.length, capRoom: F.salarySummary(f).remaining,
      retired: retiredIds.size, retiredStarters, walkedOrReleased: gone.filter((id) => !retiredIds.has(id)).length,
      drafted: fresh.filter((m) => m.drafted?.club === f.club).length, signed: fresh.filter((m) => m.drafted?.club !== f.club).length,
      signedOvr: mean(fresh.filter((m) => m.drafted?.club !== f.club).map((m) => monsterOverall(m))),
      pickOveralls: myPicks.map((p) => p.overall), pickOvr: mean(myPicks.map((p) => p.ovr)),
      starterSources: { initial: starters.filter((m) => !m.drafted && (m.joined ?? 1) <= 1).length, drafted: starters.filter((m) => m.drafted?.club === f.club).length, other: starters.filter((m) => !(m.drafted?.club === f.club) && !(!m.drafted && (m.joined ?? 1) <= 1)).length } });
    prev = { ids: [...ids], idSet: ids };
  } });
  out.runs.push({ seed, rows });
}
if (args.json) fs.writeFileSync(args.json, JSON.stringify(out));
console.log('seeds', out.runs.length);
