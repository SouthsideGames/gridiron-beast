// Task 9: the player-facing history screens (Franchise History, Award History, Records, Monster Hall of Fame) and the
// helpers behind them. The screens are rendered to HTML from a 35-season franchise record and checked for what they must
// show, what they must not invent, how they link to career profiles and that they stay short on a long franchise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { monsterHallStatus, franchiseTotals, historicalHallOfFame, careerPage, WAIT_SEASONS } from '../src/franchise/task9-history.js';
import { electMonsterHallOfFame } from '../src/franchise/monster-hof-voting.js';
import { yearOf } from '../src/data/calendar.js';

const { registerHistoryScreens, historyNavHtml } = await import('../src/ui/screens/history.js');
const screens = new Map(); const went = [];
registerHistoryScreens({ registerScreen: (n, s) => screens.set(n, s), currentScreen: () => ({ name: 'history' }), go: (...a) => went.push(a), render() {} }, { f: null, settings: {} });
const render = (name, f, params = {}) => screens.get(name).render({ f, params });

/** A long franchise built only from the kinds of facts the game saves. */
function franchise(years = 35) {
  const f = { club: 'Ember City Beasts', owner: { first: 'Ada', last: 'Stone', hometown: '' }, badges: { challenger: 1, vanguard: 0, sovereign: 0 }, settings: {},
    history: [], season: { year: years + 1, finished: false }, league: { legends: {} },
    records: { game: { passYds: { value: 406, id: 'p2', name: 'Pyronix', position: 'QB', species: 'firestorm', type: 'Fire', team: 'Ashford Hawks', opp: 'Stormport Bolts', year: 2, week: 3, playoff: false, prev: { value: 381, name: 'Lumen', team: 'Sunfire Lions', year: 1, id: 'p1' } } },
      season: { rushYds: { value: 1900, id: 'retired-4', name: 'Veteran 4', position: 'RB', species: 'duskrunner', type: 'Dark', team: 'Ember City Beasts', year: 3, prev: null } },
      team: { points: { value: 55, team: 'Ember City Beasts', opp: 'Ashford Hawks', year: 2, week: 10, playoff: true, score: '55-21', prev: { value: 42, name: null, team: 'Ashford Hawks', year: 2 } } } },
    monsterHallOfFame: { v: 1, candidates: [], elections: [] } };
  for (let year = 1; year <= years; year++) {
    const mine = year % 5 === 0;
    f.history.push({ year, club: f.club, tier: 'challenger', record: { w: mine ? 9 : 6, l: mine ? 0 : 3, t: 0 }, place: mine ? 1 : 7, champion: mine ? f.club : 'Bayou Stalkers', playoffs: year % 2 === 0,
      awards: { mvp: { id: `club-${year}`, name: `Club Star ${year}` }, league: {
        mvp: { id: year % 3 ? 'star-a' : `star-${year}`, name: year % 3 ? 'Aurelion' : `Star ${year}`, species: 'aurelion', position: 'WR', team: year % 4 ? 'Sunfire Lions' : f.club, why: 'Elite impact' },
        coy: { team: 'Frostpeak Howlers', coach: 'Sigrid Hale', name: 'Sigrid Hale', record: '8-1' } } } });
    const id = `retired-${year}`; const great = year % 4 === 0;
    f.league.legends[id] = { id, name: `Veteran ${year}`, species: 'duskrunner', stage: 0, position: 'RB', lastClub: f.club, left: year };
    f.monsterHallOfFame.candidates.push({ id, name: `Veteran ${year}`, position: 'RB', retiredYear: year, seasons: 8, games: 90, honours: great ? { titles: 3, awards: 2, records: 1 } : { titles: 0, awards: 0, records: 0 }, ...(great ? { awardsBy: { mvp: 1, opoy: 1 }, recordsBy: { season: 1 } } : {}) });
    f.monsterHallOfFame.elections = electMonsterHallOfFame(f.monsterHallOfFame.candidates, year, f.monsterHallOfFame.elections).history;
  }
  return f;
}
const clean = (html, where) => { for (const bad of ['undefined', 'NaN', '[object Object]', 'null']) assert.equal(html.includes(bad), false, `${where} shows "${bad}"`); };
const links = (html) => [...html.matchAll(/data-career="([^"]+)"/g)].map((m) => m[1]);

test('the four history screens are registered and each carries the strip that joins them', () => {
  assert.deepEqual([...screens.keys()].sort(), ['awardhistory', 'history', 'monsterhof', 'records']);   // Hall of Fame Day is its own screen (tests/hall-of-fame-day.test.js)
  const f = franchise();
  for (const name of screens.keys()) {
    const html = render(name, f); clean(html, name);
    for (const s of ['history', 'awardhistory', 'records', 'monsterhof']) assert.match(html, new RegExp(`data-action="hnav" data-screen="${s}"`), `${name} links to ${s}`);
    assert.match(html, new RegExp(`hh-nav-btn on" data-action="hnav" data-screen="${name}"`), `${name} marks itself`);
  }
  assert.equal((historyNavHtml('records').match(/aria-current="page"/g) || []).length, 1);
  assert.equal(render('history', null).includes('hh-nav'), false, 'no franchise open: no history');
});

test('Franchise History: totals from the saved seasons, every season reachable, folded by decade', () => {
  const f = franchise(35); const html = render('history', f); const tot = franchiseTotals(f);
  assert.deepEqual({ seasons: tot.seasons, w: tot.w, l: tot.l, titles: tot.titleYears.length, playoffs: tot.playoffs }, { seasons: 35, w: 7 * 9 + 28 * 6, l: 28 * 3, titles: 7, playoffs: 17 });
  assert.deepEqual(tot.best.record, { w: 9, l: 0, t: 0 }); assert.equal(tot.best.year, 5, 'the earliest of equal best seasons');
  assert.equal(tot.clubAwards.length, f.history.filter((h) => h.awards.league.mvp.team === f.club).length, 'only awards won by a monster of this club');
  assert.equal(tot.recordsHeld.length, 2, 'the two records the club holds');
  assert.equal((html.match(/class="hh-decade"/g) || []).length, 4, '35 seasons fold into four groups');
  assert.equal((html.match(/<details class="hh-decade" data-group="\d" open>/g) || []).length, 1, 'only the newest group is open');
  assert.equal((html.match(/hh-season /g) || []).length, 35, 'every season has its row');
  for (const y of [1, 12, 35]) assert.ok(html.includes(`<span class="mono">${yearOf(y)}</span>`), `season ${y}`);
  assert.equal((html.match(/class="hh-champ /g) || []).length, 35); assert.equal((html.match(/hh-champ mine/g) || []).length, 7);
  assert.ok(links(html).includes('star-a') && links(html).includes('club-35'), 'league and club MVPs open profiles');
  assert.equal(html.includes('schedule'), false);
  const second = render('history', f, { open: 2 }); assert.match(second, /data-group="2" open/);
  const none = render('history', { ...f, history: [], records: { game: {}, season: {}, team: {} }, monsterHallOfFame: { v: 1, candidates: [], elections: [] } }); clean(none, 'empty history'); assert.equal(none.includes('hh-season '), false);
});

test('Award History: by season and by award, real winners only, Coach of the Year without a profile link', () => {
  const f = franchise(12);
  const bySeason = render('awardhistory', f); clean(bySeason, 'awards by season');
  assert.equal((bySeason.match(/class="hh-decade"/g) || []).length, 12);
  const byAward = render('awardhistory', f, { mode: 'award', kind: 'mvp' }); clean(byAward, 'awards by award');
  assert.deepEqual([...byAward.matchAll(/data-action="akind" data-v="(\w+)"/g)].map((m) => m[1]), ['mvp', 'coy'], 'only awards that have a recorded winner');
  assert.equal((byAward.match(/class="item static/g) || []).length, 12, 'one MVP a season, none twice');
  assert.match(byAward, /Aurelion<\/button> ×8/, 'the most frequent winner, counted from the record');
  const coy = render('awardhistory', f, { mode: 'award', kind: 'coy' });
  assert.equal(links(coy).length, 0, 'a coach has no monster profile'); assert.match(coy, /Sigrid Hale/);
  const live = render('awardhistory', { ...f, season: { year: 13, finished: false, awardsFinal: { year: 13, winners: { mvp: { id: 'now', name: 'Current Star', team: 'Sunfire Lions' } } } } });
  assert.match(live, /Current Star/);
  assert.match(render('awardhistory', { ...f, history: [] }), /hh-empty/);
});

test('Records: holders link to profiles, a previous holder shows only when the book kept one, nothing is invented', () => {
  const f = franchise(6);
  const game = render('records', f); clean(game, 'records game');
  assert.match(game, /data-career="p2"/); assert.match(game, /hh-prev[^]*?381[^]*?data-career="p1"/, 'the previous holder and his mark');
  assert.equal((game.match(/hh-prev/g) || []).length, 1, 'one record has a previous holder');
  assert.match(game, /1 of 12 records set/);
  const season = render('records', f, { tab: 'season' }); assert.match(season, /data-career="retired-4"/); assert.equal(season.includes('hh-prev'), false, 'no previous holder was kept');
  const team = render('records', f, { tab: 'team' }); clean(team, 'records team'); assert.match(team, /55-21/); assert.match(team, /hh-prev[^]*?42[^]*?Ashford Hawks/); assert.equal(links(team).length, 0, 'a team record has no monster');
  assert.match(team, /item static hh-record mine/, 'the club’s own record is marked');
  const before = JSON.stringify(f); render('records', f); render('records', f, { tab: 'career' }); assert.equal(JSON.stringify(f), before, 'the screen writes nothing');
  const bare = { ...f }; delete bare.records; clean(render('records', bare), 'no record book'); assert.equal('records' in bare, false, 'a missing record book is not created by looking at it');
});

test('Monster Hall of Fame: plaques for inductees, elections and candidates stay short on a long franchise', () => {
  const f = franchise(35); const hall = historicalHallOfFame(f);
  assert.ok(hall.inductees.length >= 5, `${hall.inductees.length} inductees`);
  const html = render('monsterhof', f); clean(html, 'hall');
  assert.equal((html.match(/class="hof-plaque/g) || []).length, hall.inductees.length);
  assert.deepEqual(links(html).sort(), hall.inductees.map((x) => String(x.id)).sort(), 'every plaque opens its monster, and only inductees have one');
  for (const x of hall.inductees) assert.ok(x.inductedYear - x.retiredYear >= WAIT_SEASONS);
  assert.match(html, /the 15 strongest eligible careers are nominated, and an anonymous Board of 15 votes in private: 70% is needed, and at most 3 monsters/);
  const el = render('monsterhof', f, { view: 'elections' }); clean(el, 'elections');
  assert.equal((el.match(/data-action="hall-year"/g) || []).length, hall.elections.filter((e) => e.ballot.length).length, 'every election with a ballot can be opened');
  assert.equal((el.match(/hof-quiet/g) || []).length, hall.elections.filter((e) => !e.ballot.length).length);
  assert.ok((el.match(/class="item static hof-ballot/g) || []).length <= 8, 'one ballot open, shortened');
  assert.match(el, /data-action="hall-all" data-v="1"/);
  const whole = render('monsterhof', f, { view: 'elections', all: '1' }); const last = hall.elections[hall.elections.length - 1];
  assert.equal((whole.match(/class="item static hof-ballot/g) || []).length, last.ballot.length, 'the whole ballot on request');
  const old = render('monsterhof', f, { view: 'elections', year: 8 }); assert.match(old, new RegExp(`hof-election on"><button class="hof-election-h" data-action="hall-year" data-year="8"`));
  const cand = render('monsterhof', f, { view: 'candidates' }); clean(cand, 'candidates');
  assert.equal(links(cand).length, 30, 'the 30 most recent first'); assert.match(cand, /Show All 35 Candidates/);
  assert.equal(links(render('monsterhof', f, { view: 'candidates', all: '1' })).length, 35);
  assert.match(cand, new RegExp(`First ballot: ${yearOf(35 + WAIT_SEASONS)}`), 'a new retiree shows when he becomes eligible');
  const empty = render('monsterhof', { ...f, monsterHallOfFame: { v: 1, candidates: [], elections: [] } }); clean(empty, 'empty hall'); assert.match(empty, /hh-empty/);
  assert.equal(html.includes('data-action="vote"'), false, 'no player vote');
});

test('monsterHallStatus: inducted, on the ballot, waiting, and unknown', () => {
  const f = franchise(12); const hall = historicalHallOfFame(f);
  const inn = hall.inductees[0]; const st = monsterHallStatus(f, inn.id);
  assert.equal(st.induction.inductedYear, inn.inductedYear); assert.equal(st.eligibleYear, inn.retiredYear + WAIT_SEASONS); assert.ok(st.ballots.length >= 1);
  const waiting = monsterHallStatus(f, 'retired-12'); assert.equal(waiting.induction, null); assert.equal(waiting.lastBallot, null); assert.equal(waiting.eligibleYear, 15);
  const onBallot = monsterHallStatus(f, 'retired-1'); assert.equal(onBallot.induction, null); assert.equal(onBallot.ballots.length, 12 - 4 + 1, 'on every ballot since his fourth year out'); assert.equal(onBallot.lastBallot.year, 12);
  assert.equal(monsterHallStatus(f, 'nobody'), null); assert.equal(monsterHallStatus(f, null), null);
  // an inductee whose candidate row is gone is still known from the election
  const lost = JSON.parse(JSON.stringify(f)); lost.monsterHallOfFame.candidates = [];
  assert.equal(monsterHallStatus(lost, inn.id).induction.inductedYear, inn.inductedYear); assert.equal(monsterHallStatus(lost, 'retired-12'), null);
});

test('a career page carries the Hall status and the standing records of its monster, and agrees with the Hall and the record book', () => {
  const f = franchise(12); const hall = historicalHallOfFame(f);
  const inn = hall.inductees.find((x) => x.id === 'retired-4'); assert.ok(inn, 'the decorated retiree of year 4 was inducted');
  const pg = careerPage(f, 'retired-4');
  assert.equal(pg.historicalRecognition.induction.inductedYear, inn.inductedYear); assert.equal(pg.historicalRecognition.hall.induction.votes, inn.votes);
  assert.equal(pg.historicalRecognition.retirementYear, 4); assert.equal(pg.facts.hof, true);
  assert.deepEqual(pg.historicalRecognition.records.map((r) => [r.scope, r.category, r.value]), [['season', 'rushYds', 1900]], 'the record the book credits to him');
  const plain = careerPage(f, 'retired-11'); assert.equal(plain.historicalRecognition.induction, null); assert.equal(plain.historicalRecognition.hall.eligibleYear, 14); assert.deepEqual(plain.historicalRecognition.records, []);
});
