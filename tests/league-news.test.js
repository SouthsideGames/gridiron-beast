// League News (GDD §39), the defensive Coach's Suggestion repeat fix, and the records book's previous holder (v38.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import * as AI from '../src/sim/coach-ai.js';
import { newTendencies } from '../src/sim/game-runner.js';
import { generatedTeam } from '../src/franchise/roster.js';
import { resultsNews, playoffNews, championNews, raceNews, recordNews, addLeagueNews, ensureLeagueNews, newsByWeek, recordsFrom, poss, backfillLeagueNews, HEADLINES_PER_WEEK } from '../src/franchise/league-news.js';
import { updateGameRecords, ensureRecords } from '../src/franchise/stats.js';

const home = generatedTeam(1, { id: 'h', name: 'Ember City Beasts', abbr: 'EMB' });
const away = generatedTeam(2, { id: 'a', name: 'Stonehaven Titans', abbr: 'STO' });
function scrimmage(over = {}) {
  const s = R.newGame({ home, away, seed: 5, coinWinner: 'home', choice: 'receive' });
  s.phase = 'scrimmage'; s.possession = 'away'; s.ballOn = 30; s.down = 1; s.toGo = 10; s.clockRunning = false;
  return Object.assign(s, over);
}

test('defense: the Coach\'s Suggestion reads the defending club\'s own recent calls, so it rotates instead of sticking to one play', () => {
  const s = scrimmage(); const plan = home.defensePlays; const theirs = newTendencies(); const mine = newTendencies();
  const seen = [];
  for (let i = 0; i < 6; i++) { const id = AI.suggestPlay(s, home, plan, 'defense', theirs, away, mine); seen.push(id); mine.recentDefense.push(id); }
  assert.ok(new Set(seen).size >= 2, `the same defensive call six times running: ${seen.join(', ')}`);
  // The offense's history does not count as the defense's repeats (the pre-v38.1 behaviour).
  const fresh = AI.suggestPlay(s, home, plan, 'defense', theirs, away, newTendencies());
  const otherSide = newTendencies(); otherSide.recentDefense = [fresh, fresh, fresh, fresh];
  assert.equal(AI.suggestPlay(s, home, plan, 'defense', otherSide, away, newTendencies()), fresh);
  // The AI's own random call takes the same penalty.
  const w0 = Object.fromEntries(AI.weighDefense(s, home, plan, theirs, away, newTendencies()));
  const rep = newTendencies(); rep.recentDefense = [fresh, fresh];
  const w1 = Object.fromEntries(AI.weighDefense(s, home, plan, theirs, away, rep));
  assert.ok(Math.abs(w1[fresh] - w0[fresh] * 0.25) < 1e-9, 'two recent repeats quarter the weight');
});

const G = (week, home, away, hs, as, x = {}) => ({ week, home, away, homeScore: hs, awayScore: as, ot: false, winner: hs > as ? home : as > hs ? away : null, clash: null, ...x });

test('results news: a full scoreboard with your game and the rival marked, and headlines most important first, within the cap', () => {
  const res = [];
  for (let w = 1; w <= 4; w++) { res.push(G(w, 'Alpha', 'Bravo', 21, 7)); res.push(G(w, 'Delta', 'Charlie', 3, 10)); }
  res.push(G(5, 'Bravo', 'Alpha', 13, 10)); // 0-4 Bravo beats 4-0 Alpha: upset and a perfect start ending
  res.push(G(5, 'Charlie', 'Delta', 14, 14, { ot: true, clash: { size: 3 }, winner: 'Charlie' }));
  const items = resultsNews({ year: 1, week: 5, results: res, club: 'Alpha', rival: 'Delta' });
  const sc = items[0]; assert.equal(sc.kind, 'scores'); assert.equal(sc.games.length, 2);
  assert.ok(sc.games[0].mine && !sc.games[0].rival); assert.ok(sc.games[1].rival);
  const kinds = items.slice(1).map((x) => x.kind);
  assert.equal(kinds[0], 'upset'); assert.ok(kinds.includes('unbeaten'));
  assert.match(items.find((x) => x.kind === 'unbeaten').text, /Alpha's perfect start ends at 4-0/);
  assert.match(items.find((x) => x.kind === 'overtime').text, /Charlie beat Delta in a 3v3 Beast Clash after a 14-14 tie/);
  assert.ok(items.length - 1 <= HEADLINES_PER_WEEK);
  assert.ok(items.every((x) => x.year === 1 && x.week === 5 && !/undefined|NaN/.test(x.text || '')));
});

test('results news: streaks are mentioned at 4, 6 and 8, not every week they grow; "Beasts\'" not "Beasts\'s"', () => {
  const res = []; const lines = [];
  for (let w = 1; w <= 8; w++) { res.push(G(w, 'Ember City Beasts', 'Bravo', 14, 0)); res.push(G(w, 'Delta', 'Charlie', 3, 10)); lines.push(resultsNews({ year: 1, week: w, results: res }).filter((x) => /in a row/.test(x.text)).length); }
  assert.deepEqual(lines, [0, 0, 0, 2, 0, 2, 0, 2]); // Bravo and Delta at 4, 6, 8
  const shut = resultsNews({ year: 1, week: 1, results: res }).find((x) => x.kind === 'shutout');
  assert.match(shut.text, /^Ember City Beasts' defense shuts out Bravo/);
  assert.equal(poss('Thunder Mesa'), "Thunder Mesa's");
  assert.deepEqual(recordsFrom(res).Bravo, { w: 0, l: 8, t: 0, streak: -8 });
});

test('playoffs and the champion; award races report a change of leader', () => {
  const pr = [{ round: 1, home: 'A', away: 'B', homeScore: 20, awayScore: 21, winner: 'B' }, { round: 3, home: 'B', away: 'C', homeScore: 14, awayScore: 7, winner: 'B' }];
  const p = playoffNews({ year: 2, week: 11, round: 1, results: pr });
  assert.equal(p[0].kind, 'scores'); assert.match(p[1].text, /B beat A 21-20 and advance to the Conference finals/);
  assert.match(championNews({ year: 2, week: 13, final: pr[1] })[0].text, /B win the Beast Bowl, beating C 14-7/);
  const meta = { leaders: {} }; const races = (name) => ({ mvp: [{ id: name, name, team: 'X' }, { id: 'z', name: 'Zed', team: 'Y' }] });
  assert.equal(raceNews({ year: 2, week: 2, races: races('Ann'), meta }).length, 0, 'not before week 3');
  assert.equal(raceNews({ year: 2, week: 3, races: races('Ann'), meta }).length, 1);
  const flip = raceNews({ year: 2, week: 4, races: races('Bo'), meta });
  assert.ok(flip.some((x) => x.kind === 'race_lead' && /Bo \(X\) takes the lead from Ann/.test(x.text)));
});

test('records book: a broken record keeps the mark it beat (once per week), and League News reports it only from season two', () => {
  const f = { season: { year: 1, week: 1 } }; ensureRecords(f);
  const teams = { home: { name: 'A', offense: { QB: { id: 'q', name: 'Quill', position: 'QB' } }, defense: {} }, away: { name: 'B', offense: {}, defense: {} } };
  const st = (yds) => ({ score: { home: 7, away: 0 }, stats: { home: { players: { QB: { passYds: yds } }, yards: yds }, away: { players: {}, yards: 0 } } });
  updateGameRecords(f, st(100), teams, { year: 1, week: 1 });
  assert.equal(f.records.game.passYds.prev, null);
  updateGameRecords(f, st(150), teams, { year: 2, week: 3 });
  updateGameRecords(f, st(160), teams, { year: 2, week: 3 }); // broken twice in one week: the old mark is still the one from before the week
  assert.deepEqual({ v: f.records.game.passYds.value, prev: f.records.game.passYds.prev.value }, { v: 160, prev: 100 });
  const news = recordNews({ year: 2, week: 3, records: f.records, seasonsInBook: 1 });
  assert.ok(news.some((x) => /single-game mark for passing yards with 160 against B\. The old mark: 100 by Quill \(1201\)/.test(x.text)));
  assert.equal(recordNews({ year: 2, week: 3, records: f.records, seasonsInBook: 0 }).length, 0);
});

test('the feed: deduplicated, newest week first, this season and the last only (old scoreboards dropped)', () => {
  const f = {}; ensureLeagueNews(f);
  const it = (year, week, kind = 'upset', id = `${year}|${week}|${kind}`) => ({ id, year, week, kind, tier: 'info', icon: '', text: `${year}/${week}`, games: [] });
  assert.equal(addLeagueNews(f, [it(1, 1, 'scores'), it(1, 1)]), 2);
  assert.equal(addLeagueNews(f, [it(1, 1)]), 0, 'same id twice');
  addLeagueNews(f, [it(1, 2, 'scores'), it(1, 2)]);
  assert.deepEqual(newsByWeek(f.leagueNews).map((g) => g.week), [2, 1]);
  assert.equal(f.leagueNews[0].kind, 'scores', 'inside a week the written order stays');
  addLeagueNews(f, [it(2, 1, 'scores')]);
  assert.ok(!f.leagueNews.some((x) => x.year === 1 && x.kind === 'scores'), 'last season keeps headlines, not scoreboards');
  addLeagueNews(f, [it(3, 1, 'scores')]);
  assert.ok(!f.leagueNews.some((x) => x.year === 1), 'two seasons back is gone');
});

test('backfill: an older save gets this season\'s scoreboards from its results, once', () => {
  const results = [G(1, 'A', 'B', 7, 3, { player: true }), G(1, 'C', 'D', 0, 9), G(2, 'B', 'A', 10, 14, { player: true })];
  const f = { club: 'A', tier: 't', rivals: { t: { team: 'C' } }, season: { year: 4, results } };
  assert.equal(backfillLeagueNews(f), newsByWeek(f.leagueNews).flatMap((g) => g.items).length);
  assert.deepEqual(newsByWeek(f.leagueNews).map((g) => g.week), [2, 1]);
  assert.equal(backfillLeagueNews(f), 0);
});
