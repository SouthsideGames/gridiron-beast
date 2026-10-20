// Player statistics and season awards (GDD §16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { recordGame, ensureStats, withDerived, passerRating, derive, leaders, monsterLine, rolloverMonster, addInto } from '../src/franchise/stats.js';
import { computeAwards, eligibleRows } from '../src/franchise/awards.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { playGame } from '../src/sim/game-runner.js';

const mk = (seed = 71) => { const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed }); F.hireDefaultStaff(f); return f; };
const sum = (obj, k) => Object.values(obj).reduce((a, p) => a + (p[k] || 0), 0);

test('stat accounting: the sim books add up and the same code serves played and simulated games', () => {
  const A = generatedTeam(5, { id: 'A', name: 'A', abbr: 'A', color: '#fff' }), B = generatedTeam(9, { id: 'B', name: 'B', abbr: 'B', color: '#000' });
  const g = playGame({ home: A, away: B, seed: 3 });
  for (const side of ['home', 'away']) {
    const P = g.stats[side].players, S = g.stats[side];
    assert.equal(sum(P, 'passYds'), S.passYards, 'passer yards equal team passing yards');
    assert.equal(sum(P, 'recYds'), S.passYards, 'receiver yards equal passer yards');
    assert.equal(sum(P, 'rushYds'), S.rushYards, 'rushing yards add up');
    assert.equal(sum(P, 'comp'), S.passComp); assert.equal(sum(P, 'att'), S.passAtt);
    assert.equal(sum(P, 'passTd'), sum(P, 'recTd'), 'one passing TD is one receiving TD');
    assert.equal(sum(P, 'rec'), sum(P, 'comp'), 'every completion has a receiver');
    assert.ok(sum(P, 'targets') >= sum(P, 'rec'), 'targets include incompletions');
    const opp = g.stats[side === 'home' ? 'away' : 'home'].players;
    assert.equal(sum(opp, 'sacks'), sum(P, 'sacked'), 'sacks taken equal sacks made by the other side');
    assert.ok(sum(P, 'sacksAllowed') <= sum(P, 'sacked'), 'a sack is charged to a blocker only when one was beaten');
    assert.equal(sum(P, 'intThrown'), sum(opp, 'int'), 'interceptions thrown equal interceptions caught');
    assert.ok(sum(P, 'fumLost') <= sum(P, 'fum'));
    for (const p of Object.values(P)) { assert.ok(!('yards' in p), 'no legacy yards key'); if (p.att) assert.ok(p.snapsOff > 0); }
    assert.ok(sum(opp, 'recAllowed') <= sum(P, 'rec'), 'coverage never charges more catches than were made (open zones charge nobody)');
  }
  // Determinism: the same seed gives the same lines (played and simulated share this path).
  const g2 = playGame({ home: A, away: B, seed: 3 });
  assert.deepEqual(g2.stats.home.players, g.stats.home.players);
});

test('derived rates come from totals and are null without a denominator', () => {
  assert.equal(passerRating({ att: 0 }), null);
  assert.equal(passerRating({ att: 30, comp: 20, passYds: 300, passTd: 3, intThrown: 0 }), 132.6);
  assert.equal(passerRating({ att: 20, comp: 5, passYds: 30, passTd: 0, intThrown: 4 }), 0);
  const d = derive({});
  for (const k of ['compPct', 'ypa', 'ypc', 'ypr', 'catchPct', 'blockWinPct', 'ydsPerTarget', 'fgPct']) assert.equal(d[k], null, `${k} is null, not 0`);
  // Season percentage = sum of games, not average of game percentages.
  const line = addInto(addInto({}, { att: 10, comp: 10 }), { att: 40, comp: 10 });
  assert.equal(derive(line).compPct, 40);
  assert.equal(addInto(addInto({}, { longRush: 12 }), { longRush: 7 }).longRush, 12, 'long is a maximum');
});

test('recordGame: regular season and playoffs stay apart, a game is booked once, careers and logs fill, rollover archives', () => {
  const f = mk(71);
  F.autoRunToSunday(f); const g = F.simulatePlayerGame(f); F.finishSunday(f, g);
  const qb = f.roster.find((m) => m.position === 'QB' && monsterLine(m).att);
  assert.ok(qb, 'the starting quarterback has pass attempts');
  const L = monsterLine(qb, 'season', 'reg');
  assert.ok(L.games === 1 && L.passYds > 0 && L.att > 0, 'season line has games, yards and attempts');
  assert.deepEqual(monsterLine(qb, 'season', 'post'), {}, 'no playoff stats yet');
  assert.equal(qb.stats.log.length, 1); assert.equal(qb.stats.log[0].week, 1); assert.ok(qb.stats.log[0].line.att > 0);
  assert.ok(withDerived(L).rating != null && withDerived(L).compPct != null);
  // Booking the same game again does nothing.
  const before = JSON.stringify(f.season.leagueStats);
  const teams = { home: F.playerTeam(f), away: F.aiTeam(f, 'Bayou Stalkers') };
  const key = f.season.recorded[0]; const [, , home, away] = key.split('|');
  assert.equal(recordGame(f, g, { home: { ...teams.home, name: home }, away: { ...teams.away, name: away } }, { playoff: false, week: 1 }), false, 'the same game is not booked twice');
  assert.equal(JSON.stringify(f.season.leagueStats), before, 'duplicate booking rejected');
  // Playoff booking lands in the playoff table and the post bucket, never the regular one.
  const pg = playGame({ home: teams.home, away: teams.away, seed: 4 });
  const reg = JSON.stringify(f.season.leagueStats);
  assert.equal(recordGame(f, pg, teams, { playoff: true, week: 11 }), true);
  assert.equal(JSON.stringify(f.season.leagueStats), reg, 'regular table untouched by a playoff game');
  assert.ok(Object.keys(f.season.playoffStats).length === 2);
  assert.ok((monsterLine(qb, 'season', 'post').games || 0) === 1 && monsterLine(qb, 'season', 'reg').games === 1);
  assert.equal(monsterLine(qb, 'career', 'post').games, 1);
  // Rollover archives the season under its year and starts clean.
  rolloverMonster(qb, { year: 2, team: f.club });
  assert.equal(qb.stats.seasons.length, 1); assert.equal(qb.stats.seasons[0].year, 1); assert.ok(qb.stats.seasons[0].reg.passYds > 0 && qb.stats.seasons[0].post.games === 1);
  assert.deepEqual(qb.stats.season.reg, {}); assert.equal(qb.stats.log.length, 0); assert.equal(qb.stats.season.year, 2);
  assert.equal(monsterLine(qb, 'career', 'reg').games, 1, 'career keeps the total');
});

test('legacy saves migrate: old stats and season objects become v2 lines, yearsPro derives from age', () => {
  const m = { id: 'x', name: 'Old', position: 'QB', age: 27, stats: { games: 12, yards: 300, td: 4, tackles: 0, sacks: 0, int: 0, catches: 0 }, season: { games: 3, yards: 50, rushYds: 20, recYds: 30, passYds: 700, td: 5, tackles: 0, sacks: 0, int: 0, catches: 0 } };
  const s = ensureStats(m, 1);
  assert.equal(s.v, 2); assert.equal(s.career.reg.games, 12); assert.equal(s.career.reg.td, 4); assert.equal(s.season.reg.passYds, 700); assert.equal(s.season.year, 1); assert.ok(!('season' in m));
  const f = mk(5); for (const x of f.roster) delete x.yearsPro; F.startNextSeason; // the start-season path fills yearsPro
  for (const x of f.roster) x.yearsPro = undefined;
  F.startSeason(f, 1); for (const x of f.roster) assert.ok(Number.isInteger(x.yearsPro) && x.yearsPro >= 0);
});

// ------------------------------------------------------------ award scenarios
const row = (o) => ({ id: o.id || o.name, name: o.name, type: 'Fire', species: 'emberfox', position: o.position, age: o.age ?? 26, yearsPro: o.yearsPro ?? 3, team: o.team, games: o.games ?? 9, starts: o.games ?? 9, snapsOff: o.position === 'QB' || o.position === 'RB' || o.position === 'WR' || o.position === 'TE' || o.position === 'OL' ? (o.games ?? 9) * 30 : 0, snapsDef: ['DL', 'LB', 'CB', 'S'].includes(o.position) ? (o.games ?? 9) * 30 : 0, ...o.line });
/** A believable 16-club background: average starters at every position, so the standouts are measured against real peers. */
function league(extra = [], recs = {}) {
  const table = {}; const records = {};
  const teams = Array.from({ length: 16 }, (_, i) => `Club ${i + 1}`);
  const base = { QB: { att: 220, comp: 135, passYds: 1700, passTd: 12, intThrown: 7, passFd: 70, sacked: 10 }, RB: { rush: 110, rushYds: 480, rushTd: 4, rushFd: 22, targets: 20, rec: 14, recYds: 110 }, WR: { targets: 60, rec: 36, recYds: 480, recTd: 3, recFd: 20, yac: 150 }, TE: { targets: 40, rec: 26, recYds: 280, recTd: 2, pbSnaps: 60, rbSnaps: 60, blocksLost: 40 }, OL: { pbSnaps: 160, rbSnaps: 110, blocksLost: 120, sacksAllowed: 3, pressuresAllowed: 12 }, DL: { tackles: 18, assists: 8, tfl: 5, sacks: 3, pressures: 18, ff: 0 }, LB: { tackles: 40, assists: 15, tfl: 4, sacks: 1, pressures: 5, int: 1, pd: 3, covTargets: 25, recAllowed: 16, ydsAllowed: 180 }, CB: { tackles: 22, assists: 6, int: 1, pd: 6, covTargets: 50, recAllowed: 30, ydsAllowed: 380, tdAllowed: 2 }, S: { tackles: 30, assists: 10, int: 1, pd: 4, covTargets: 30, recAllowed: 18, ydsAllowed: 220, tdAllowed: 1 } };
  let n = 0;
  for (const t of teams) { table[t] = {}; records[t] = recs[t] || { w: 4, l: 5, t: 0, pf: 180, pa: 180 }; for (const [pos, line] of Object.entries(base)) for (let k = 0; k < (pos === 'OL' || pos === 'DL' || pos === 'LB' || pos === 'CB' || pos === 'WR' ? 2 : 1); k++) { const jitter = 0.85 + ((n++ * 37) % 30) / 100; const l = Object.fromEntries(Object.entries(line).map(([a, b]) => [a, Math.round(b * jitter)])); const r = row({ name: `${pos}${k}-${t}`, position: pos, team: t, line: l }); table[t][r.id] = r; } }
  for (const e of extra) { const r = row(e); (table[r.team] ||= {})[r.id] = r; if (e.record) records[r.team] = e.record; }
  return { table, records };
}
const expectations = (records) => Object.fromEntries(Object.keys(records).map((t) => [t, { talent: 60, expectedWinPct: 0.5, lastWinPct: 0.5 }]));
const run = (extra, recs) => { const { table, records } = league(extra, recs); return computeAwards({ table, records, expectations: expectations(records), n: 5 }); };

test('awards: an elite quarterback on a winning club is MVP, but a dominant back can beat an ordinary one', () => {
  const r = run([
    { name: 'Ace QB', position: 'QB', team: 'Club 1', record: { w: 8, l: 1, t: 0, pf: 260, pa: 150 }, line: { att: 240, comp: 170, passYds: 2600, passTd: 26, intThrown: 3, passFd: 110, sacked: 6 } },
  ]);
  assert.equal(r.mvp[0].name, 'Ace QB'); assert.equal(r.opoy[0].name, 'Ace QB', 'the MVP is not excluded from OPOY');
  assert.ok(/QB/.test(r.mvp[0].why) && r.mvp[0].record === '8-1');
  const r2 = run([
    { name: 'Workhorse', position: 'RB', team: 'Club 2', record: { w: 7, l: 2, t: 0, pf: 230, pa: 160 }, line: { rush: 200, rushYds: 1250, rushTd: 16, rushFd: 60, targets: 40, rec: 32, recYds: 300, recTd: 3 } },
  ]);
  assert.equal(r2.mvp[0].name, 'Workhorse', 'a dominant running back wins MVP over average quarterbacks');
  assert.ok(r2.mvp[0].components.versatility, 'versatility noted');
});

test('awards: an exceptional pass rusher and a shutdown corner with few interceptions both have a path to DPOY', () => {
  const r = run([{ name: 'Edge', position: 'DL', team: 'Club 3', line: { tackles: 30, assists: 10, tfl: 14, sacks: 12, pressures: 45, ff: 3, fr: 1 } }]);
  assert.equal(r.dpoy[0].name, 'Edge');
  const r2 = run([{ name: 'Island', position: 'CB', team: 'Club 4', line: { tackles: 28, assists: 6, int: 2, pd: 15, covTargets: 55, recAllowed: 18, ydsAllowed: 160, tdAllowed: 0, ff: 1 } }]);
  assert.equal(r2.dpoy[0].name, 'Island', 'coverage carries a corner with only two interceptions');
  assert.ok(/coverage/.test(r2.dpoy[0].why));
});

test('awards: rookies use experience not age, can win the big awards, and a few great snaps never beat a full season', () => {
  const r = run([
    { name: 'Young Vet', position: 'WR', team: 'Club 5', age: 21, yearsPro: 2, line: { targets: 100, rec: 70, recYds: 1100, recTd: 11, recFd: 50, yac: 400 } },
    { name: 'Old Rookie', position: 'WR', team: 'Club 6', age: 27, yearsPro: 0, line: { targets: 90, rec: 60, recYds: 900, recTd: 8, recFd: 40, yac: 300 } },
    { name: 'Cameo', position: 'WR', team: 'Club 7', games: 2, yearsPro: 0, line: { targets: 6, rec: 6, recYds: 190, recTd: 3 } },
  ]);
  assert.equal(r.opoy[0].name, 'Young Vet');
  assert.equal(r.oroy[0].name, 'Old Rookie', 'rookie of the year by experience, not age');
  assert.ok(!r.oroy.some((x) => x.name === 'Young Vet'), 'a 21-year-old in his third season is not a rookie');
  assert.ok(!r.opoy.some((x) => x.name === 'Cameo') && !r.oroy.some((x) => x.name === 'Cameo'), 'two games do not qualify');
  const r2 = run([{ name: 'Phenom', position: 'QB', team: 'Club 8', yearsPro: 0, record: { w: 8, l: 1, t: 0, pf: 250, pa: 140 }, line: { att: 250, comp: 180, passYds: 2800, passTd: 28, intThrown: 2, passFd: 120, sacked: 5 } }]);
  assert.equal(r2.mvp[0].name, 'Phenom'); assert.equal(r2.oroy[0].name, 'Phenom', 'a rookie may win MVP and OROY');
  // A productive rookie on a losing club still wins OROY.
  const r3 = run([{ name: 'Bright Spot', position: 'RB', team: 'Club 9', yearsPro: 0, record: { w: 1, l: 8, t: 0, pf: 120, pa: 260 }, line: { rush: 190, rushYds: 1000, rushTd: 9, rushFd: 50, targets: 30, rec: 24, recYds: 200 } }]);
  assert.equal(r3.oroy[0].name, 'Bright Spot');
});

test('awards: Coach of the Year rewards the turnaround against a recorded forecast; ties break deterministically', () => {
  const { table, records } = league([], { 'Club 10': { w: 7, l: 2, t: 0, pf: 220, pa: 170 }, 'Club 11': { w: 7, l: 2, t: 0, pf: 240, pa: 150 } });
  const ex = expectations(records); ex['Club 10'] = { talent: 54, expectedWinPct: 0.35, lastWinPct: 0.2 }; ex['Club 11'] = { talent: 70, expectedWinPct: 0.75, lastWinPct: 0.8 };
  const r = computeAwards({ table, records, expectations: ex, coachOf: (t) => `Coach ${t}`, n: 3 });
  assert.equal(r.coy[0].team, 'Club 10', 'the club that beat its forecast wins over the talented club that met it');
  assert.ok(/forecast/.test(r.coy[0].why) && r.coy[0].coach === 'Coach Club 10');
  const twice = computeAwards({ table, records, expectations: ex, n: 3 });
  assert.deepEqual(twice.coy.map((x) => x.team), r.coy.map((x) => x.team), 'deterministic');
  // Equal scores: production, then games, then name.
  const a = run([{ name: 'Zed', position: 'WR', team: 'Club 12', line: { targets: 80, rec: 50, recYds: 700, recTd: 6 } }, { name: 'Abe', position: 'WR', team: 'Club 13', line: { targets: 80, rec: 50, recYds: 700, recTd: 6 } }]);
  const i = a.opoy.findIndex((x) => x.name === 'Abe'), j = a.opoy.findIndex((x) => x.name === 'Zed'); assert.ok(i >= 0 && j >= 0 && i < j, 'alphabetical on a dead heat');
});

test('awards freeze when the playoffs are drawn and a full season books leaders and history', () => {
  const f = mk(71);
  for (let guard = 0; guard < 40 && !f.season.finished; guard++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  assert.ok(f.season.finished && f.season.awardsFinal, 'season done, awards frozen');
  assert.equal(f.season.awardsFinal.year, 1);
  const w = f.season.awardsFinal.winners; assert.ok(w.mvp && w.opoy && w.dpoy && w.coy, 'all major awards have winners');
  assert.ok(w.mvp.why && w.mvp.record, 'winner explains itself');
  assert.deepEqual(f.season.awards.league.mvp, w.mvp, 'end-of-season awards use the frozen result');
  assert.ok(Object.keys(f.season.playoffStats).length >= 2, 'playoff table filled');
  const regGames = Math.max(...F.Stats.leagueRows(f.season.leagueStats).map((r) => r.games)); assert.ok(regGames <= 9, 'regular-season games never include playoffs');
  assert.ok(f.history[0].awards.leaders.passYds?.length, 'history keeps the season leaders');
  assert.ok(leaders(f.season.leagueStats, 'rating', { n: 3 }).every((r) => r.att >= 10), 'rate leaders meet the minimum');
  // Careers advance at the rollover.
  const starter = f.roster.find((m) => (monsterLine(m, 'season', 'reg').games || 0) >= 5); const yp = starter.yearsPro;
  if (f.postseason && !f.postseason.resolved) F.resolvePostseason(f, F.postseasonEvent(f).options[0].id);
  if (f.legendPick && !f.legendPick.resolved) F.chooseLegendTrack(f, F.legendChoices(f)[0]?.id);
  for (const i of F.offseasonPending(f)) F.resolveContract(f, i.id, 'sign');
  { const b = F.beginDraft(f); assert.ok(b.ok, b.reason); let guard = 0; while (!f.draft.done && guard++ < 60) { if (F.onTheClock(f) === f.club) F.passDraftPick(f); else break; } }
  assert.equal(F.startNextSeason(f).ok, true, F.startNextSeason(f).reason);
  assert.equal(starter.yearsPro, yp + 1, 'a season of experience');
  assert.equal(starter.stats.seasons.length, 1); assert.equal(starter.stats.season.year, 2); assert.deepEqual(starter.stats.season.reg, {});
  assert.ok(monsterLine(starter, 'career', 'reg').games >= 5, 'career totals survive');
  assert.ok(f.season.expectations['Ember City Beasts'].lastWinPct != null, 'next season remembers last season for COY');
});

test('records book: single-game, team and season records are written and only improve', async () => {
  const { ensureRecords, careerLeaders } = await import('../src/franchise/stats.js');
  const f = mk(71);
  F.autoRunToSunday(f); F.finishSunday(f, F.simulatePlayerGame(f));
  const R = ensureRecords(f);
  assert.ok(R.game.passYds?.value > 0 && R.game.passYds.year === 1 && R.game.passYds.week === 1);
  assert.ok(R.team.points?.value >= 0 && R.team.points.team);
  const was = R.game.passYds.value; R.game.passYds.value = 9999; F.autoRunToSunday(f); F.finishSunday(f, F.simulatePlayerGame(f)); assert.equal(R.game.passYds.value, 9999, 'a record only improves');
  R.game.passYds.value = was;
  const L = careerLeaders(f.roster); assert.ok(L.passYds?.[0]?.value > 0);
  for (let guard = 0; guard < 40 && !f.season.finished; guard++) { F.autoRunToSunday(f); if (F.isBye(f)) F.takeBye(f); else if (F.playerAlive(f)) F.finishSunday(f, F.simulatePlayerGame(f)); else F.skipPlayoffs(f); }
  assert.ok(R.season.passYds?.value > 0 && R.season.passYds.year === 1, 'season record written at season end');
});
