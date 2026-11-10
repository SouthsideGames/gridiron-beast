import test from 'node:test';
import assert from 'node:assert/strict';
import { createAbsenceTracker } from '../src/ui/fx/match-fx.js';
import { presnapLook } from '../src/ui/field-view.js';

const cb = { id: 'reload-cb', name: 'Sablewing', species: 'sablewing', position: 'CB', attrs: {} };
const teams = { home: { offense: {}, defense: {} }, away: { offense: {}, defense: { CB1: cb } } };
const look = presnapLook('cover_2_man');
const absent = { seed: 91, phase: 'scrimmage', possession: 'home', playCount: 5,
  t8: { absences: [{ mid: cb.id, serveOn: 'home', ability: 'DRA-06-F' }] } };
const served = { ...absent, playCount: 6, t8: { absences: [] } };
const roundTrip = (value) => JSON.parse(JSON.stringify(value));
const reload = (tracker, state, roster = teams) => {
  const next = createAbsenceTracker(); next.observe(state.seed, state, roster, roundTrip(tracker.snapshot())); return next;
};

test('reload after an absent screen preserves the served defender return without mutating simulation state', () => {
  const before = JSON.stringify({ absent, served, teams });
  const first = createAbsenceTracker(); first.observe(91, absent, teams);
  assert.deepEqual(first.frame(absent, teams, look, 100).vacant, ['CB1']);
  // The play finished and the saved match no longer contains an outstanding absence. Its saved presentation identifiers
  // still establish that this defender is returning, even though the UI object itself was lost on reload.
  const restored = reload(first, served);
  const frame = restored.frame(served, teams, look, 500);
  assert.equal(frame.staged[0]?.kind, 'dragon_return');
  assert.equal(frame.returning[0]?.monster, cb);
  assert.equal(JSON.stringify({ absent, served, teams }), before);
});

test('a return waiting through the other possession survives reload and starts at the next eligible formation', () => {
  const tracker = createAbsenceTracker(); tracker.observe(91, absent, teams);
  const otherBall = { ...served, possession: 'away' }; tracker.observe(91, otherBall, teams);
  assert.deepEqual(tracker.frame(otherBall, teams, look, 200).staged, []);
  const restored = reload(tracker, otherBall);
  const later = { ...served, playCount: 9 }; restored.observe(91, later, teams);
  assert.equal(restored.frame(later, teams, look, 1000).staged[0]?.kind, 'dragon_return');
});

test('reload after the return started does not repeat its animation or lose its informational chip', () => {
  const tracker = createAbsenceTracker(); tracker.observe(91, absent, teams); tracker.observe(91, served, teams);
  assert.equal(tracker.frame(served, teams, look, 100).staged[0]?.kind, 'dragon_return');
  const restored = reload(tracker, served);
  const frame = restored.frame(served, teams, look, 0);
  assert.deepEqual(frame.staged, []); assert.equal(frame.until, 0); assert.equal(frame.returning.length, 1);
  const next = { ...served, playCount: 7 }; restored.observe(91, next, teams);
  assert.deepEqual(restored.frame(next, teams, look, 1).returning, []);
});

test('restoring an unserved absence preserves the empty spot and reduced motion suppresses the later animation', () => {
  const tracker = createAbsenceTracker(); tracker.observe(91, absent, teams);
  const restored = reload(tracker, absent);
  assert.deepEqual(restored.frame(absent, teams, look, 10).vacant, ['CB1']);
  restored.observe(91, served, teams);
  const frame = restored.frame(served, teams, look, 20, false);
  assert.deepEqual(frame.staged, []); assert.equal(frame.returning.length, 1);
  assert.deepEqual(reload(restored, served).frame(served, teams, look, 30).staged, []);
});

test('presentation snapshots contain no roster copies, timestamps, infinities or simulation payloads', () => {
  const tracker = createAbsenceTracker(); tracker.observe(91, absent, teams); tracker.observe(91, served, teams);
  tracker.frame(served, teams, look, 123456);
  const saved = tracker.snapshot(); assert.deepEqual(roundTrip(saved), saved);
  const text = JSON.stringify(saved);
  assert.ok(!/attrs|startedAt|123456|Infinity|rngState|mastery/.test(text));
});

test('another game, missing monsters, invalid versions and finished games cannot resurrect old return effects', () => {
  const tracker = createAbsenceTracker(); tracker.observe(91, absent, teams);
  const otherGame = { ...served, seed: 92 };
  assert.deepEqual(reload(tracker, otherGame).frame(otherGame, teams, look, 0).staged, []);
  const emptyTeams = { home: { defense: {} }, away: { defense: {} } };
  assert.deepEqual(reload(tracker, served, emptyTeams).snapshot().back, []);
  const invalid = createAbsenceTracker(); invalid.observe(91, served, teams, { ...tracker.snapshot(), version: 2 });
  assert.deepEqual(invalid.frame(served, teams, look, 0).staged, []);
  const done = reload(tracker, { ...served, finished: true });
  assert.deepEqual(done.frame(served, teams, look, 0).returning, []);
});
