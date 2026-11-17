import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startGuide, guideActive, currentLesson, advanceGuide, syncGuide, guideEvent, finishIndependent, allowedScreens, LESSONS, lineupStamp, skipLesson, footballLessonKey } from '../src/franchise/guide.js';
import { t } from '../src/text/index.js';
import { createFranchise, hireDefaultStaff, assignSlot } from '../src/franchise/franchise.js';
import { migrate, exportJson, importJson } from '../src/franchise/save.js';
import { goalOffers } from '../src/franchise/board.js';
const base = createFranchise({ owner: { first: 'Guide', last: 'Test', background: 'player' }, club: 'Ember City Beasts', seed: 312 });
hireDefaultStaff(base);
const fresh = () => structuredClone(base);
function at(f, id) { startGuide(f); while (currentLesson(f)?.id !== id && guideActive(f)) advanceGuide(f); }

test('existing saves stay unenrolled; new enrollment is idempotent and consumes no game RNG', () => {
  const f = fresh(); assert.equal(guideActive(migrate(f)), false); const state = f.rngState;
  startGuide(f); const g = f.guide; startGuide(f); assert.equal(g, f.guide); assert.equal(f.rngState, state);
  assert.equal(currentLesson(f).id, 'welcome'); assert.ok(allowedScreens(f).includes('welcome'));
});
test('opening a screen cannot complete action lessons; inspecting and comparing are distinct evidence', () => {
  const f = fresh(); at(f, 'roster'); assert.equal(syncGuide(f), false);
  guideEvent(f, 'compare'); assert.equal(currentLesson(f).id, 'roster');
  guideEvent(f, 'monster'); assert.equal(currentLesson(f).id, 'beast');
  at(f, 'prospect'); guideEvent(f, 'monster'); assert.equal(currentLesson(f).id, 'prospect');
  guideEvent(f, 'compare'); assert.equal(currentLesson(f).id, 'clash');
});
test('a real successful assignment completes lineup lesson, failed assignments do not', () => {
  const f = fresh(); at(f, 'lineup'); const chart = JSON.parse(lineupStamp(f));
  assert.equal(assignSlot(f, 'QB', 'not-a-beast').ok, false); assert.equal(syncGuide(f), false);
  const choice = Object.entries(chart).flatMap(([slot, id]) => f.roster.filter(m => m.position === slot.replace(/\d+$/, '') && m.id !== id && !m.injury).map(m => ({ slot, m })))[0];
  assert.ok(choice); assert.equal(assignSlot(f, choice.slot, choice.m.id).ok, true);
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'coaches');
});
test('draft and Board goals precede Monday; day 2 recruiting precedes training', () => {
  const f = fresh(); at(f, 'draft'); assert.equal(syncGuide(f), false); f.draft.done = true;
  syncGuide(f); assert.equal(currentLesson(f).id, 'board'); assert.equal(syncGuide(f), false);
  f.board = { goal: { id: 'wins' } }; syncGuide(f); assert.equal(currentLesson(f).id, 'monday');
  f.season.day = 1; f.week.prospects = [{ monster: { id: 'scouted' } }]; syncGuide(f); assert.equal(currentLesson(f).id, 'prospect'); // Monday's scouting found someone
  guideEvent(f, 'compare'); assert.equal(syncGuide(f), false);
  f.season.day = 2; syncGuide(f); assert.equal(currentLesson(f).id, 'wednesday');
});
test('losses and byes do not force victory or prematurely finish the football lesson', () => {
  const f = fresh(); at(f, 'sunday'); f.season.week++;
  assert.equal(syncGuide(f), false, 'a bye alone does not count as playing football');
  f.guide.evidence.gameFinished = true; syncGuide(f); assert.equal(currentLesson(f).id, 'review');
});
test('independent preparation needs inspection plus a decision, and permits free navigation', () => {
  const f = fresh(); at(f, 'independent'); assert.equal(allowedScreens(f), null);
  assert.equal(finishIndependent(f, true), false); f.guide.evidence.reviewedTeam = true;
  assert.equal(finishIndependent(f), false); assert.equal(finishIndependent(f, true), true);
  assert.equal(currentLesson(f).id, 'complete'); advanceGuide(f); assert.equal(f.guide.done, true);
});
test('skip, opt out and JSON reload retain progress without enrolling another save', () => {
  const f = fresh(); startGuide(f); advanceGuide(f, { skip: true });
  const parsed = importJson(exportJson(f));
  const loaded = parsed.franchise || parsed; assert.equal(loaded.guide.index, 1); assert.deepEqual(loaded.guide.skipped, ['welcome']);
  loaded.guide.enabled = false; assert.equal(currentLesson(loaded), null); assert.equal(allowedScreens(loaded), null);
  assert.equal(fresh().guide, undefined);
});
test('forecasts display whole wins while precise internal expectations remain intact', () => {
  for (const p of [0.15, 0.3, 0.5, 0.85]) {
    const offers = goalOffers(null, { expectedWinPct: p });
    assert.match(offers[0].text, /win \d+ games/); assert.doesNotMatch(offers[0].text, /\d\.\d/);
    assert.equal(offers[0].forecastWins, +(p * 9).toFixed(1));
  }
  assert.equal(new Set(LESSONS.map(l => l.id)).size, LESSONS.length);
});

test('skipping a daily lesson unlocks navigation without spending the day or advancing the simulation', () => {
  const f = fresh(); at(f, 'monday'); const state = f.rngState;
  skipLesson(f); assert.equal(allowedScreens(f), null); assert.equal(f.season.day, 0);
  assert.equal(syncGuide(f), false); assert.equal(f.rngState, state);
  f.season.day = 1; f.week.prospects = [{monster: {id: 'test'}}]; syncGuide(f);
  assert.equal(currentLesson(f).id, 'prospect'); assert.ok(f.guide.skipped.includes('monday'));
});
test('no available prospects adapts the comparison lesson instead of trapping the player', () => {
  const f = fresh(); at(f, 'prospect'); f.season.day = 1; f.week.prospects = [];
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'clash'); assert.ok(f.guide.skipped.includes('prospect'));
});

// Found in the 2026-11-17 browser playthrough of a new franchise.
test('one save can finish two checkpoints: skipping Tuesday\'s encounter ends the prospect and Clash lessons together', () => {
  const f = fresh(); at(f, 'prospect'); f.season.day = 1; f.week.prospects = [{ monster: { id: 'scouted' } }];
  assert.equal(syncGuide(f), false, 'Tuesday has not ended yet');
  f.season.day = 2; // Skip the Encounter: Wednesday begins without a comparison or a battle
  assert.equal(syncGuide(f), true); assert.equal(currentLesson(f).id, 'wednesday', 'Wednesday\'s training is not blocked by a finished Tuesday');
  assert.deepEqual(f.guide.skipped, ['prospect']); assert.ok(f.guide.completed.includes('clash'));
  assert.ok(allowedScreens(f).includes('training'));
});
test('a forfeited Sunday keeps the football lesson for the next real game without locking the new week', () => {
  const f = fresh(); at(f, 'sunday'); f.season.day = 6;
  const sunday = allowedScreens(f);
  for (const repair of ['famarket', 'contracts', 'lineup']) assert.ok(sunday.includes(repair), `the lineup safeguard's ${repair} repair is reachable`);
  assert.ok(!sunday.includes('scout'), 'Sunday still points at the game');
  f.season.week = 2; f.season.day = 0; // forfeitSunday: the week ended without a played game
  assert.equal(syncGuide(f), false); assert.equal(currentLesson(f).id, 'sunday', 'a forfeit is not a played game');
  assert.equal(allowedScreens(f), null, 'Monday of the new week is reachable');
  f.season.day = 6; assert.ok(allowedScreens(f), 'the next Sunday leads to the game again');
  f.guide.evidence.gameFinished = true; syncGuide(f); assert.equal(currentLesson(f).id, 'review');
});
test('football lessons follow the player\'s own options: no Fourth Down or extra-point lesson on the opponent\'s snap', () => {
  const f = fresh(); at(f, 'sunday'); f.guide.moments.push('football');
  const game = (state) => { f.game = { playerSide: 'home', state: { phase: 'scrimmage', down: 1, finished: false, possession: 'home', ...state } }; return footballLessonKey(f); };
  assert.equal(game({ down: 4 }), 'fourth'); assert.equal(game({ down: 4, possession: 'away' }), 'defense');
  assert.equal(game({}), 'offense'); assert.equal(game({ possession: 'away' }), 'defense');
  assert.equal(game({ phase: 'try' }), 'kick'); assert.equal(game({ phase: 'try', possession: 'away' }), null);
  assert.equal(game({ phase: 'kickoff', possession: 'away' }), 'kick'); assert.equal(game({ finished: true }), null);
  f.guide.moments = []; assert.equal(game({ down: 4 }), 'football', 'the introduction comes first');
  assert.equal(footballLessonKey(f, (k) => k === 'football'), 'fourth', 'an introduction closed unread does not hold back the rest');
});
test('the Board forecast sentence reads cleanly with whole wins', () => {
  const line = t('hq.the_forecast_has_at_wins_against', { year: 1201, club: 'Ember City Beasts', toFixed: 3 }) + t('hq.tell_me_what_you_are_promising');
  assert.equal(line, '1201: Ember City Beasts is expected to win 3 games. Tell me what you are promising the board this year.');
  const withHistory = t('hq.the_forecast_has_at_wins_against', { year: 1202, club: 'X', toFixed: 4 }) + t('hq.last_year_you', { n: 'delivered' }) + t('hq.tell_me_what_you_are_promising');
  assert.doesNotMatch(withHistory, /\.\.|[“”]/);
});
