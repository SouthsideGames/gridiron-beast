// Task 9: Hall of Fame Day. The election is sealed when the season closes; the result is shown nowhere until the ceremony is
// held; holding it records the year and writes one League News item, once; and nothing else in the franchise moves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hallCeremony, hallCeremonyDue, hallCeremonyHeld, sealedElectionYear, revealedElections, completeHallCeremony, hallNews } from '../src/franchise/hall-ceremony.js';
import { electMonsterHallOfFame, MAX_NOMINEES } from '../src/franchise/monster-hof-voting.js';
import { historicalHallOfFame, monsterHallStatus, careerProfile, careerPage } from '../src/franchise/task9-history.js';
import { importJson, exportJson } from '../src/franchise/save.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { yearOf } from '../src/data/calendar.js';

const { registerHallCeremony, ceremonyStages, careerLine } = await import('../src/ui/screens/hall-ceremony.js');
const { registerHistoryScreens } = await import('../src/ui/screens/history.js');
const screens = new Map(); const app = { f: null, settings: {}, saves: 0, save() { this.saves++; } }; const went = [];
const Router = { registerScreen: (n, s) => screens.set(n, s), currentScreen: () => null, go: (...a) => went.push(a), render() {} };
registerHallCeremony(Router, app); registerHistoryScreens(Router, app);

/** A franchise in its offseason after season `year`, with `n` retired monsters of whom the first `great` have decisive cases. */
function offseason({ year = 9, n = 20, great = 2 } = {}) {
  const f = { club: 'Ember City Beasts', settings: {}, season: { year, finished: true }, history: Array.from({ length: year }, (_, i) => ({ year: i + 1 })), league: { legends: {} }, leagueNews: [], roster: [], monsterHallOfFame: { v: 1, candidates: [], elections: [] } };
  for (let i = 0; i < n; i++) { const id = `r${i}`; const g = i < great;
    f.league.legends[id] = { id, name: `Vet ${String(i).padStart(2, '0')}`, species: 'duskrunner', stage: 0, position: i % 2 ? 'QB' : 'K', lastClub: f.club, left: 2, history: [{ club: 'Bayou Stalkers', from: 1, to: 1 }, { club: f.club, from: 2, to: 2 }], career: i % 2 ? { passYds: 9000 + i, passTd: 80, intThrown: 20 } : { fgm: 100 + i, fga: 120, fgLong: 55, xpm: 200 } };
    f.monsterHallOfFame.candidates.push({ id, name: `Vet ${String(i).padStart(2, '0')}`, position: i % 2 ? 'QB' : 'K', retiredYear: 2, seasons: 10, games: 100, honours: { titles: 1, awards: g ? 3 : 0, records: g ? 1 : 0 }, awardsBy: g ? { mvp: 2, opoy: 1 } : {}, recordsBy: g ? { season: 1 } : {}, prod: 100 + i }); }
  for (let y = 1; y <= year; y++) f.monsterHallOfFame.elections = electMonsterHallOfFame(f.monsterHallOfFame.candidates.filter((c) => c.retiredYear <= y), y, f.monsterHallOfFame.elections).history;
  return f;
}
const ids = (xs) => xs.map((x) => String(x.id)).sort();

test('the result of the season just finished is sealed: no screen, profile or status shows it before the ceremony', () => {
  const f = offseason({ year: 5 });   // retired in 2: first eligible in the election of year 5
  const e = f.monsterHallOfFame.elections.find((x) => x.year === 5); assert.deepEqual(ids(e.inductees), ['r0', 'r1'], 'the Board elected the two great careers');
  assert.equal(sealedElectionYear(f), 5); assert.equal(hallCeremonyDue(f), true); assert.equal(hallCeremonyHeld(f, 5), false);
  assert.deepEqual(revealedElections(f).map((x) => x.year), [1, 2, 3, 4]);
  const hall = historicalHallOfFame(f); assert.deepEqual(hall.inductees, []); assert.equal(hall.elections.some((x) => x.year === 5), false); assert.ok(hall.candidates.every((c) => !c.inducted));
  assert.equal(monsterHallStatus(f, 'r0').induction, null); assert.deepEqual(monsterHallStatus(f, 'r0').ballots, [], 'not even his place on the ballot');
  assert.equal(careerPage(f, 'r0').historicalRecognition.induction, null); assert.equal(careerPage(f, 'r0').facts.hof, false);
  const html = screens.get('monsterhof').render({ f, params: {} }); assert.match(html, /hof-sealed/); assert.match(html, new RegExp(`The ${yearOf(5)} result is sealed`)); assert.equal(html.includes('hof-plaque'), false);
  for (const view of ['elections', 'candidates']) { const h = screens.get('monsterhof').render({ f, params: { view } }); assert.equal(h.includes('Inducted') && h.includes('🏛️ Inducted'), false, view); assert.equal(/Class of/.test(h), false, view); }
});

test('holding the ceremony reveals the class, writes one League News item and records the year: once', () => {
  const f = offseason({ year: 5 }); const before = JSON.parse(JSON.stringify(f));
  const r = completeHallCeremony(f, 5); assert.deepEqual(r, { ok: true, first: true });
  assert.equal(hallCeremonyDue(f), false); assert.equal(sealedElectionYear(f), null); assert.equal(hallCeremonyHeld(f, 5), true);
  assert.deepEqual(ids(historicalHallOfFame(f).inductees), ['r0', 'r1']); assert.equal(monsterHallStatus(f, 'r0').induction.inductedYear, 5); assert.equal(careerPage(f, 'r1').facts.hof, true);
  assert.equal(f.leagueNews.length, 1); const item = f.leagueNews[0];
  assert.equal(item.id, '5|hof'); assert.equal(item.kind, 'hof'); assert.equal(item.text, 'Hall of Fame Day: the Board inducts 2 monsters'); assert.equal(item.tk, 'franchise.hall_of_fame_day_the_board_inducts');
  assert.deepEqual(item.lines.map((l) => l.mid).sort(), ['r0', 'r1']); assert.match(item.lines[0].text, /^Vet 0\d \((K|QB)\) · \d+ of 15 Board votes$/);
  // nothing else moved
  const rest = (x) => { const { leagueNews, leagueNewsMeta, monsterHallOfFame, ...o } = x; const { ceremonySeenYears, ...hof } = monsterHallOfFame; return JSON.stringify([o, hof]); };
  assert.equal(rest(f), rest(before)); assert.deepEqual(f.monsterHallOfFame.ceremonySeenYears, [5]);
  // a replay, a save and a reload: the same election, the same single item
  const again = completeHallCeremony(f, 5); assert.deepEqual(again, { ok: true, first: false });
  const g = JSON.parse(JSON.stringify(f)); assert.deepEqual(completeHallCeremony(g, 5), { ok: true, first: false });
  assert.equal(g.leagueNews.length, 1); assert.deepEqual(g.monsterHallOfFame, f.monsterHallOfFame);
  assert.deepEqual(hallCeremony(g, 5), hallCeremony(f, 5), 'the ceremony shows the same result after a reload');
  assert.deepEqual(completeHallCeremony(f, 77), { ok: false, first: false }, 'no election, no ceremony');
});

test('the sealed result cannot be changed by reloading before the ceremony', () => {
  const f = offseason({ year: 5 }); const sealed = JSON.stringify(f.monsterHallOfFame.elections);
  for (let i = 0; i < 3; i++) { const g = JSON.parse(JSON.stringify(f)); const r = electMonsterHallOfFame(g.monsterHallOfFame.candidates, 5, g.monsterHallOfFame.elections); assert.equal(r.created, false); assert.equal(JSON.stringify(r.history), sealed); assert.deepEqual(hallCeremony(g, 5).inductees.map((x) => [x.id, x.votes]), hallCeremony(f, 5).inductees.map((x) => [x.id, x.votes])); }
});

test('the ceremony: nominees in name order with no votes shown, one reveal per inductee, and short ceremonies for empty years', () => {
  const f = offseason({ year: 5 }); const c = hallCeremony(f, 5);
  assert.equal(c.nominees.length, MAX_NOMINEES, 'fifteen of the twenty eligible careers'); assert.equal(c.seats, 15); assert.equal(c.sealed, true); assert.equal(c.held, false); assert.equal(c.membersBefore, 0);
  assert.deepEqual(c.nominees.map((m) => m.name), c.nominees.map((m) => m.name).slice().sort(), 'name order gives nothing away');
  assert.ok(c.nominees.every((m) => !('votes' in m)), 'no vote is attached to a nominee');
  assert.ok(c.inductees.every((m) => m.votes >= 11 && m.voters === 15 && m.species === 'duskrunner' && m.clubs.length === 2 && m.case.total > 100));
  assert.deepEqual(ceremonyStages(c), ['opening', 'nominees', 'board', 'reveal:0', 'reveal:1', 'class']);
  const render = (step, held = f) => screens.get('hofceremony').render({ f: held, params: { year: 5, step } });
  const nominees = render(1); assert.equal((nominees.match(/class="hofd-nominee"/g) || []).length, 15); assert.equal(/of 15 votes|Board votes/.test(nominees), false, 'the nominee list shows no votes'); assert.equal(nominees.includes('data-career'), false);
  const board = render(2); assert.equal((board.match(/class="hofd-seat"/g) || []).length, 15); assert.match(board, /names and their ballots are never disclosed/); assert.match(board, /No coach and no owner has a vote/); assert.match(board, /Open the Sealed Result/);
  const reveal = render(3); assert.match(reveal, /INDUCTEE 1 OF 2/); assert.match(reveal, new RegExp(`Class of ${yearOf(5)}`)); assert.match(reveal, /2× Most Valuable|MVP|Most Valuable/i); assert.match(reveal, /Bayou Stalkers · Ember City Beasts/);
  const cls = render(5); assert.equal((cls.match(/class="hof-plaque static"/g) || []).length, 2); assert.match(cls, /Finish the Ceremony/); assert.match(cls, /League News/);
  for (let s = 0; s < 6; s++) assert.equal(/undefined|NaN|\[object Object\]/.test(render(s)), false, `stage ${s}`);
  assert.match(render(99), /Finish the Ceremony/, 'a step past the end shows the last stage');
  // nobody reached the standard
  const none = offseason({ year: 5, great: 0 }); const cn = hallCeremony(none, 5); assert.equal(cn.inductees.length, 0); assert.equal(cn.nominees.length, 15);
  assert.deepEqual(ceremonyStages(cn), ['opening', 'nominees', 'board', 'none', 'class']);
  assert.match(screens.get('hofceremony').render({ f: none, params: { year: 5, step: 3 } }), /No nominee reached the Board’s standard this year/);
  assert.equal(hallNews(none, 5)[0].text, 'Hall of Fame Day: no nominee reached the Board’s standard'); assert.deepEqual(hallNews(none, 5)[0].lines, []);
  // nobody was eligible
  const early = offseason({ year: 3 }); const ce = hallCeremony(early, 3); assert.deepEqual([ce.nominees.length, ce.inductees.length], [0, 0]);
  assert.deepEqual(ceremonyStages(ce), ['opening', 'none', 'class']); assert.equal(hallCeremonyDue(early), true, 'the day is still held');
  assert.match(screens.get('hofceremony').render({ f: early, params: { year: 3, step: 1 } }), /No retired monster was eligible this year/);
  assert.equal(hallNews(early, 3)[0].text, 'Hall of Fame Day: no retired monster was eligible this year');
  assert.match(screens.get('hofceremony').render({ f: early, params: { year: 44 } }), /No Hall of Fame election was held/);
  // reduced motion is carried by the screen
  assert.match(screens.get('hofceremony').render({ f: { ...f, settings: { reducedMotion: true } }, params: { year: 5 } }), /class="hofd reduced"/);
});

test('the Finish button holds the ceremony once and saves once; a replay saves nothing', () => {
  const f = offseason({ year: 5 }); app.f = f; app.saves = 0; went.length = 0;
  const handlers = {}; const root = { addEventListener: (type, fn) => { handlers[type] = fn; }, contains: () => true };
  const params = { year: 5, step: 0 }; screens.get('hofceremony').mount(root, { params });
  const click = (action) => handlers.click({ target: { closest: (sel) => (sel.includes('data-action') ? { dataset: { action }, getAttribute: () => action, hasAttribute: () => false, disabled: false } : null) }, preventDefault() {}, stopPropagation() {} });
  for (let i = 0; i < 5; i++) click('hofd-next');
  assert.equal(params.step, 5); assert.equal(hallCeremonyDue(f), true, 'not held until Finish'); assert.equal(app.saves, 0);
  click('hofd-next'); assert.equal(hallCeremonyDue(f), false); assert.equal(app.saves, 1); assert.equal(f.leagueNews.length, 1); assert.equal(went[went.length - 1][0], 'hq');
  params.step = 5; click('hofd-next'); assert.equal(app.saves, 1, 'a replay is not saved again'); assert.equal(f.leagueNews.length, 1);
  click('hofd-prev'); assert.equal(params.step, 4);
});

test('a past ceremony can be shown again; a season in play has nothing sealed; an archived franchise shows everything', () => {
  const f = offseason({ year: 6 }); completeHallCeremony(f, 6);
  const past = hallCeremony(f, 5); assert.equal(past.held, false); assert.equal(past.sealed, false); assert.equal(past.inductees.length, 2);
  assert.equal(hallCeremony(f, 6).membersBefore, 2);
  const playing = offseason({ year: 5 }); playing.season = { year: 6, finished: false };   // the next season began without the ceremony (a hands-off run)
  assert.equal(sealedElectionYear(playing), null); assert.deepEqual(ids(historicalHallOfFame(playing).inductees), ['r0', 'r1']);
  const archived = offseason({ year: 5 }); archived.lifecycle = { status: 'retired', legacy: { headline: {} } };
  assert.equal(hallCeremonyDue(archived), false); assert.deepEqual(ids(historicalHallOfFame(archived).inductees), ['r0', 'r1']);
  assert.equal(careerProfile(archived, 'r0').name, 'Vet 00');
});

test('career lines read each position from its own totals', () => {
  assert.equal(careerLine({ position: 'QB', career: { passYds: 28857, passTd: 294, intThrown: 49 } }), '28,857 passing yards · 294 TD · 49 INT');
  assert.equal(careerLine({ position: 'K', career: { fgm: 167, fga: 187, fgLong: 80 } }), '167 of 187 field goals · long 80');
  assert.equal(careerLine({ position: 'OL', career: { starts: 141, sacksAllowed: 1 } }), '141 starts · 1 sacks allowed');
  assert.equal(careerLine({ position: 'S', career: { tackles: 284, int: 0, pd: 12 } }), '284 tackles · 0 INT · 12 passes defended');
  assert.equal(careerLine({ position: 'QB', career: null }), '');
});

test('a real franchise: attending the ceremony each offseason changes nothing but the record of it', { timeout: 900000 }, () => {
  const fixture = () => { const x = importJson(readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8')); return x.franchise || x.f || x; };
  const seen = [];
  const attend = runFranchise(1, { from: fixture(), seasons: 3, onOffseason: (f) => { const held = f.monsterHallOfFame.elections.some((e) => e.year === f.season.year);   // the fixture's own finished season predates Task 9 and has no election
    assert.equal(hallCeremonyDue(f), held, 'Hall of Fame Day is due in every offseason that follows an election'); if (!held) return;
    const r = completeHallCeremony(f); assert.equal(r.first, true); assert.equal(hallCeremonyDue(f), false); seen.push(f.season.year); } }).f;
  const skip = runFranchise(1, { from: fixture(), seasons: 3 }).f;
  assert.ok(seen.length >= 1); assert.deepEqual(attend.monsterHallOfFame.ceremonySeenYears, seen);
  assert.equal((skip.monsterHallOfFame.ceremonySeenYears || []).length, 0);
  const strip = (f) => { const { leagueNews, leagueNewsMeta, monsterHallOfFame, createdAt, uid, ...o } = f; const { ceremonySeenYears, ...hof } = monsterHallOfFame; return JSON.stringify([o, hof], (k, v) => (['tk', 'tv', 'tp'].includes(k) || /^(why|line|label|clue|text|tag|streak|scheme|modeWhy|awardLine)L$/.test(k) ? undefined : v)); };
  assert.equal(strip(attend), strip(skip), 'rosters, contracts, results, the draft, the cap and every other saved value are the same');
  const hof = (f) => (f.leagueNews || []).filter((x) => x.kind === 'hof').map((x) => x.id);
  assert.deepEqual(hof(skip), []); assert.ok(hof(attend).length >= 1 && new Set(hof(attend)).size === hof(attend).length, 'one item per ceremony');
  const again = importJson(exportJson(attend)); assert.deepEqual((again.franchise || again.f || again).monsterHallOfFame, attend.monsterHallOfFame);
});
