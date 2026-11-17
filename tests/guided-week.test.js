import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startGuide, guideActive, currentLesson, advanceGuide, syncGuide, guideEvent, finishIndependent, allowedScreens, LESSONS, lineupStamp, skipLesson } from '../src/franchise/guide.js';
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
  f.season.day = 1; syncGuide(f); assert.equal(currentLesson(f).id, 'prospect');
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
