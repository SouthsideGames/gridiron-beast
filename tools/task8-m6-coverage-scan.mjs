// node kicker.mjs ROOT SEED SEASONS OUT — position coverage of every AI club at three points: the benchmark's season-end snapshot
// (before startNextSeason), right after startNextSeason (before the first game), and before every week's games.
import fs from 'node:fs'; import path from 'node:path';
const [ROOT, SEED, SEASONS, OUT] = [path.resolve(process.argv[2]), Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const { runFranchise } = await import(path.join(ROOT, 'tools/franchise-soak.mjs')); const REG = await import(path.join(ROOT, 'src/franchise/league-registry.js'));
const { buildDepthChart, lineupProblems } = await import(path.join(ROOT, 'src/franchise/roster.js')); const { tierById } = await import(path.join(ROOT, 'src/data/league.js'));
const POS = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K']; const out = { seed: SEED, snapshot: [], seasonStart: [], weekly: [], weeksChecked: 0, clubWeeks: 0, starts: 0 };
const scan = (f, where, into) => { for (const club of REG.leagueClubs(f)) { const roster = REG.clubRoster(f, club); const count = Object.fromEntries(POS.map((p) => [p, roster.filter((m) => m.position === p).length])); const healthy = Object.fromEntries(POS.map((p) => [p, roster.filter((m) => m.position === p && !m.injury).length])); const problems = lineupProblems(roster, buildDepthChart(roster));
  if (problems.length || POS.some((p) => !count[p])) into.push({ where, year: f.season.year, week: f.season.week, club, size: roster.length, capRoom: REG.clubCapRoom(f, club, tierById(f.tier).cap), count, healthy, problems }); } };
let lastYear = null;
const check = (f, label) => { if (f.board?.fired) f.board = { confidence: 0, goal: null, history: [], scoutBonusYear: null, fired: false, misses: 0 }; /* simulation only: a dismissed owner is reinstated (tools/league-soak.mjs withBoardReset) */ if (/start$/.test(label)) { out.starts++; scan(f, label, out.seasonStart); } return []; };
const beforeGame = (f) => { out.weeksChecked++; out.clubWeeks += REG.leagueClubs(f).length; scan(f, 'before kickoff', out.weekly); };
const res = runFranchise(SEED, { seasons: SEASONS, difficulty: 'pro', check, beforeGame, onSeason: (f) => scan(f, 'season-end snapshot (before startNextSeason)', out.snapshot) });
if (process.argv[6] === 'start-after') { const F = await import(path.join(ROOT, 'src/franchise/franchise.js')); if (res.f.board?.fired) res.f.board = { confidence: 0, goal: null, history: [], scoutBonusYear: null, fired: false, misses: 0 }; const n = F.startNextSeason(res.f, { acceptForfeits: true }); out.finalStart = { ok: n.ok, reason: n.reason || null, year: res.f.season.year }; if (n.ok) { out.starts++; scan(res.f, 'start after the last season', out.seasonStart); } }
out.problems = res.problems.slice(0, 5); out.labels = undefined;
fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log(JSON.stringify({ seed: SEED, snapshot: out.snapshot.length, seasonStart: out.seasonStart.length, weekly: out.weekly.length, starts: out.starts, finalStart: out.finalStart, weeksChecked: out.weeksChecked }));
