// Statistics filters (2026-10-22): Season (this season, past seasons, career) × Game type (regular season, playoffs, both) for a
// monster and for the league tables; past seasons' tables archived in the history; nothing fabricated or double counted.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { ensureStats, monsterLine, monsterSeasons, combinedTable, seasonTables, leagueSeasons, leaders, ARCHIVE_SEASONS, archiveSeasonTables } from '../src/franchise/stats.js';
import { newFranchise } from '../tools/franchise-soak.mjs';

function playSeason(f) { F.chooseGoal(f, 'wins'); let g = 0; while (!f.season.finished && g++ < 40) { if (F.inPlayoffs(f) && !F.playoffFixture(f)) { F.skipPlayoffs(f); continue; } F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); } }
function offseason(f) { if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id); if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id); for (const it of F.offseasonPending(f)) { if (!F.resolveContract(f, it.id, 'sign').ok) F.resolveContract(f, it.id, 'walk'); } F.beginDraft(f); let d = 0; while (!f.draft.done && d++ < 80) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; } let fa = 0; while (f.roster.length < F.ROSTER_MIN && fa++ < 20) { const mk = F.offseasonMarket(f).map((x) => x.monster).sort((a, b) => a.salary - b.salary); if (!mk[0] || !F.signFreeAgent(f, mk[0].id).ok) break; } const r = F.startNextSeason(f); assert.ok(r.ok, r.reason); }
const withGames = (f) => f.roster.find((m) => (ensureStats(m).season.reg.games || 0) >= 3);

test('a monster\'s current season is a filter of its own and updates as games are played; past seasons and the career are the others', () => {
  const f = newFranchise(77, { difficulty: 'rookie' }); F.chooseGoal(f, 'wins');
  F.autoRunToSunday(f); F.finishSunday(f, F.simulatePlayerGame(f)); F.autoRunToSunday(f); if (!F.isBye(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.takeBye(f);
  const m = f.roster.find((x) => ensureStats(x).season.reg.games);
  assert.deepEqual(monsterSeasons(m, f.season.year), [1], 'season 1 is listed while it is being played');
  const g1 = monsterLine(m, 'season', 'reg').games; assert.ok(g1 >= 1); assert.equal(monsterLine(m, 1, 'reg').games, g1, 'the current year and "season" are the same book');
  F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f));
  assert.ok(monsterLine(m, 'season', 'reg').games >= g1, 'updates as games complete');
});

test('season × game type: playoff totals live in the playoff bucket of their own season, "both" adds the two without double counting, the career sums the seasons', () => {
  const f = newFranchise(77, { difficulty: 'rookie' }); playSeason(f);
  const m = withGames(f); const s = ensureStats(m); const post1 = s.season.post.games || 0;
  assert.ok(Object.values(f.season.playoffs?.seeds || {}).flat().includes(f.club) ? post1 > 0 : post1 === 0);
  offseason(f); F.chooseGoal(f, 'wins'); F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else F.finishSunday(f, F.simulatePlayerGame(f));
  assert.deepEqual(monsterSeasons(m, f.season.year), [2, 1]);
  assert.equal(monsterLine(m, 1, 'post').games || 0, post1, 'season 1 playoffs are read from the archive');
  assert.equal(monsterLine(m, 'season', 'post').games || 0, 0, 'season 2 has no playoff games yet');
  const reg1 = monsterLine(m, 1, 'reg'), all1 = monsterLine(m, 1, 'all'); assert.equal(all1.games, (reg1.games || 0) + post1);
  for (const k of ['rushYds', 'recYds', 'passYds', 'tacklesTotal']) if (reg1[k] || all1[k]) assert.equal(all1[k] || 0, (reg1[k] || 0) + (monsterLine(m, 1, 'post')[k] || 0), k);
  const career = monsterLine(m, 'career', 'all'); assert.equal(career.games, all1.games + (monsterLine(m, 'season', 'all').games || 0));
  assert.deepEqual(monsterLine(m, 'career', 'post'), s.career.post);
  assert.deepEqual(monsterLine(m, 1999, 'reg'), {}, 'an unknown year is empty, never invented');
});

test('league tables: past seasons are archived at season end, selectable with the current one, and "both" merges rows by player', () => {
  const f = newFranchise(78, { difficulty: 'pro' }); playSeason(f);
  const regRows = Object.values(f.season.leagueStats).flatMap((T) => Object.values(T)); assert.ok(regRows.length > 100);
  const top = leaders(f.season.leagueStats, 'passYds', { n: 1 })[0];
  offseason(f);
  assert.deepEqual(leagueSeasons(f), [2, 1]);
  const T1 = seasonTables(f, 1); assert.equal(T1.archived, true); assert.equal(leaders(T1.reg, 'passYds', { n: 1 })[0].passYds, top.passYds, 'the archived table is the season\'s table');
  assert.ok(Object.keys(T1.post).length > 0, 'the playoff table is archived too');
  const T2 = seasonTables(f, 2); assert.equal(T2.current, true); assert.deepEqual(T2.reg, f.season.leagueStats); assert.deepEqual(leaders(T2.post, 'passYds'), [], 'a new season has no playoff leaders yet (the screen says so)');
  const both = combinedTable(T1.reg, T1.post); const qb = Object.values(both).flatMap((T) => Object.values(T)).find((r) => (T1.post[r.team]?.[r.id]?.games || 0) > 0);
  assert.ok(qb, 'a playoff player'); assert.equal(qb.games, (T1.reg[qb.team][qb.id].games || 0) + T1.post[qb.team][qb.id].games); assert.equal(qb.passYds || 0, (T1.reg[qb.team][qb.id].passYds || 0) + (T1.post[qb.team][qb.id].passYds || 0));
  // Every number, for every player with playoff games, is regular season + playoffs exactly (not only the first one found).
  for (const [team, T] of Object.entries(T1.post)) for (const [id, p] of Object.entries(T)) { const reg = T1.reg[team]?.[id] || {}; const b = both[team][id]; for (const k of ['games', 'passYds', 'rushYds', 'recYds', 'tackles', 'sacks']) assert.equal(b[k] || 0, (reg[k] || 0) + (p[k] || 0), `${p.name} ${k}`); }
  const regCount = Object.values(T1.reg).flatMap((T) => Object.values(T)).length; assert.ok(Object.values(both).flatMap((T) => Object.values(T)).length >= regCount, 'nobody is dropped or duplicated');
});

test('archive pruning keeps the last ARCHIVE_SEASONS tables and never touches records or awards; older saves without archives still load', () => {
  const f = newFranchise(79, { difficulty: 'rookie' }); f.history = []; f.season.year = 20;
  for (let y = 1; y <= 12; y++) f.history.push({ year: y, club: f.club, record: { w: 5, l: 4 }, awards: { league: {} }, leagueStats: { x: {} }, playoffStats: {} });
  f.history.push({ year: 20, club: f.club, record: { w: 5, l: 4 } }); f.season.leagueStats = { T: { p1: { id: 'p1', name: 'P', team: 'T', games: 1 } } }; f.season.playoffStats = {};
  archiveSeasonTables(f);
  const kept = f.history.filter((h) => h.leagueStats).map((h) => h.year); assert.equal(kept.length, ARCHIVE_SEASONS); assert.ok(kept.includes(20) && kept.includes(12) && !kept.includes(1));
  assert.ok(f.history.every((h) => h.record && h.year), 'records stay');
  const g = Save.importJson(Save.exportJson(f)); assert.deepEqual(leagueSeasons(g), kept.sort((a, b) => b - a));
  const old = newFranchise(80); const back = Save.importJson(Save.exportJson(old)); assert.deepEqual(leagueSeasons(back), [1]); assert.equal(seasonTables(back, 1).current, true);
});
