#!/usr/bin/env node
// v42.2.0 release check for existing franchises (GDD §49.5), on disposable saves only.
//   node tools/partnerships-release-check.mjs --old=DIR      (DIR = a v42.1.0 checkout, e.g. a worktree at 606bd62)
// 1. The OLD build plays a franchise into its third season (mid-season, week 5) and exports it: a real v42.1.0 save.
// 2. This build imports it: the franchise is byte-identical after load (ids, levels, attributes, evolution, career stats,
//    achievements, the league's clubs, rosters, schedules, standings, history); no partnership data appears.
// 3. Captains are chosen at once (the one-time selection), mid-season, without restarting it; no chemistry is fabricated.
// 4. A game interrupted half-way (saved and reloaded mid-game, as the live match does) finishes with the same chemistry
//    as the same game played straight through, and committing it again adds nothing.
// 5. The franchise plays on to the end of the season and into the next: the season continues, captains named again.
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
if (!args.old) { console.log('--old=DIR (a v42.1.0 checkout) is required'); process.exit(2); }
const OLD = path.resolve(args.old); const problems = []; const check = (c, m) => { if (!c) problems.push(m); return !!c; };
const report = {};
// 1. a v42.1.0 save, made by v42.1.0
const oldSoak = await import(path.join(OLD, 'tools/franchise-soak.mjs')); const oldSave = await import(path.join(OLD, 'src/franchise/save.js'));
const oldF = await import(path.join(OLD, 'src/franchise/franchise.js')); const oldVer = (await import(path.join(OLD, 'src/version.js'))).BUILD.version;
const o = oldSoak.runFranchise(Number(args.seed || 12), { seasons: 2, difficulty: 'pro' }).f; oldF.startNextSeason(o);
let g = 0; while (o.season.week < 5 && g++ < 40) { let d = 0; while (o.season.day < 6 && d++ < 10) { if (!oldF.autoRunToSunday(o).ok) break; } if (oldF.isBye(o)) { oldF.takeBye(o); continue; } oldF.finishSunday(o, oldF.simulatePlayerGame(o)); }
const oldText = oldSave.exportJson(o); report.old = { build: oldVer, year: o.season.year, week: o.season.week, bytes: oldText.length, hasPartnerships: !!o.partnerships };
// 2. this build loads it unchanged
const Save = await import('../src/franchise/save.js'); const F = await import('../src/franchise/franchise.js'); const CP = await import('../src/franchise/partnerships.js');
const { BUILD } = await import('../src/version.js'); report.build = BUILD.version;
const f = Save.importJson(oldText); const oldBack = oldSave.importJson(oldText);
check(JSON.stringify(f) === JSON.stringify(oldBack), 'this build loads the v42.1.0 save byte-identical to v42.1.0 itself');
check(f.partnerships === undefined, 'no partnership data on load');
const ident = (x) => ({ uid: x.uid, createdAt: x.createdAt, seed: x.seed, club: x.club, year: x.season.year, week: x.season.week, roster: x.roster.map((m) => [m.id, m.level, m.stage, JSON.stringify(m.attributes), JSON.stringify(m.stats)]), league: Object.fromEntries(Object.entries(x.league.clubs).map(([c, r]) => [c, r.roster.join(',')])), monsters: Object.keys(x.league.monsters).length, records: JSON.stringify(x.season.records), schedule: JSON.stringify(x.season.schedule), history: JSON.stringify(x.history), achievements: JSON.stringify(x.achievements || {}) });
const before = JSON.stringify(ident(f));
check(before === JSON.stringify(ident(o)), 'identity, roster, league, standings, schedule, history and achievements match the old build');
// 3. immediate initial selection, mid-season
check(F.initialCaptainsDue(f), 'the one-time captain selection is offered at once');
const s = F.suggestedCaptains(f); const r = F.chooseInitialCaptains(f, { offense: [s.offense.a, s.offense.b], defense: [s.defense.a, s.defense.b] });
check(r.ok, `captains chosen mid-season (${r.reason || 'ok'})`);
check(Object.values(f.partnerships.pairs).every((p) => p.n === 0), 'no fabricated chemistry: every pair starts at 0');
check(JSON.stringify(ident(f)) === before, 'choosing captains changed nothing else (season, roster, league, history)');
check(!F.initialCaptainsDue(Save.importJson(Save.exportJson(f))), 'reloading does not reopen the one-time selection');
// 4. a game interrupted and resumed vs. played straight
const R = await import('../src/sim/rules.js'); const GR = await import('../src/sim/game-runner.js'); const { rngFromState } = await import('../src/core/rng.js');
let d = 0; while (f.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(f).ok) break; } if (F.isBye(f)) { F.takeBye(f); d = 0; while (f.season.day < 6 && d++ < 10) { if (!F.autoRunToSunday(f).ok) break; } }
F.ensureCaptains(f); const m = F.sundayMatchup(f); const toss = F.pregamePossession(f); const seed = rngFromState(f.rngState).seed();
const mk = () => R.newGame({ home: m.home, away: m.away, venue: F.gameVenue(f, m.home.name), seed, quarterLength: f.settings.quarterLength, coinWinner: toss.coinWinner, choice: toss.choice, comeback: F.comebackRule(f), otPeriods: F.OT_PERIODS });
const ctl = { home: GR.aiController('home'), away: GR.aiController('away') };
const straight = mk(); { const t = { home: GR.newTendencies(), away: GR.newTendencies() }; let n = 0; while (!straight.finished && n++ < 2000) GR.step(straight, { home: m.home, away: m.away }, ctl, t); }
let resumed = mk(); let tend = { home: GR.newTendencies(), away: GR.newTendencies() }; let n = 0;
while (!resumed.finished && n++ < 2000) { GR.step(resumed, { home: m.home, away: m.away }, ctl, tend); if (n === 60) { const saved = JSON.parse(JSON.stringify({ state: resumed, tend })); resumed = saved.state; tend = saved.tend; } }
check(JSON.stringify(resumed.score) === JSON.stringify(straight.score) && JSON.stringify(resumed.partnerCredits) === JSON.stringify(straight.partnerCredits), 'a game saved and reloaded mid-way ends with the same score and the same chemistry tally');
report.game = { score: straight.score, credits: straight.partnerCredits };
const total = () => Object.values(f.partnerships.pairs).reduce((a, p) => a + p.n, 0); const t0 = total();
F.finishSunday(f, resumed); const t1 = total(); check(t1 > t0, 'the game committed chemistry');
const ledgerYear = f.partnerships.credited[f.season.year]; const ownerId = Object.keys(ledgerYear).find((id) => id.includes(`|${m.home.name}|${m.away.name}`));
check(!!ownerId, 'the owner\'s game is in the ledger under its own id');
const [y, , home, away] = ownerId.split('|'); check(CP.commitGame(f, resumed, { year: Number(y), gameId: ownerId, clubs: { home, away } }).length === 0 && total() === t1, 'committing the same game again adds nothing');
const reloaded = Save.importJson(Save.exportJson(f)); check(JSON.stringify(reloaded.partnerships) === JSON.stringify(f.partnerships), 'chemistry survives save and reload unchanged');
// 5. on to the end of the season and into the next
g = 0; while (!f.season.finished && g++ < 40) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } let dd = 0; while (f.season.day < 6 && dd++ < 10) { if (!F.autoRunToSunday(f).ok) break; } if (f.week.commissioner) { F.commissionerRelease(f, f.week.commissioner.names[0]); continue; } if (F.isBye(f)) { F.takeBye(f); continue; } const mm = F.sundayMatchup(f); if (mm?.forfeit) { F.forfeitSunday(f); continue; } F.finishSunday(f, F.simulatePlayerGame(f)); }
check(f.season.finished, 'the season finishes');
report.endOfSeason = { year: f.season.year, champion: f.season.champion, pairs: Object.keys(f.partnerships.pairs).length, chemistry: total(), playoffGames: Object.keys(f.partnerships.credited[f.season.year]).filter((id) => /\|p\d\|/.test(id)).length };
check(report.endOfSeason.playoffGames >= 7, 'playoff games earned chemistry');
check(CP.partnershipProblems(f).length === 0, 'valid partnership state');
console.log(JSON.stringify({ ...report, problems }, null, 1));
console.log(problems.length ? 'RELEASE CHECK FAILED' : 'RELEASE CHECK PASSED');
process.exit(problems.length ? 1 : 0);
