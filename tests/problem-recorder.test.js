import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecorder, RECORDER_KEY, LIMITS } from '../src/testing/recorder.js';
import { withTrace, trace } from '../src/testing/trace.js';
import { checkPlay } from '../src/testing/checks.js';
import { newGame } from '../src/sim/rules.js';
import { aiController, newTendencies, step } from '../src/sim/game-runner.js';
import { lineup } from './tools/lineup.js';
import { applyStatus } from '../src/sim/t8/status-runtime.js';
import { createFieldPlay } from '../src/sim/t8/field-effects.js';
const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k), setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };
const make = (store = memory()) => createRecorder({ storage: () => store, now: () => 123456, build: { version: 'test', branch: 'test' } });
const state = () => ({ seed: 7, phase: 'scrimmage', clock: 100, ballOn: 40, score: { home: 0, away: 0 } });
function fixture() {
  const L = lineup(); const team = (name) => ({ name, abbr: name, ...structuredClone(L), offensePlays: ['mesh', 'inside_zone'], defensePlays: ['cover_3'], kicker: { attrs: { kicking: 70 } } });
  const teams = { home: team('H'), away: team('A') }, s = newGame({ ...teams, seed: 701, quarterLength: 60 });
  return { teams, s, tendencies: { home: newTendencies(), away: newTendencies() }, controllers: { home: aiController('home'), away: aiController('away') } };
}
test('off means no snapshots, tracing, storage writes or changes to simulation inputs', () => {
  let writes = 0; const r = make({ getItem: () => null, setItem: () => writes++ });
  const s = state(); assert.equal(r.runStep(s, {}, {}, {}, () => 42), 42); assert.equal(s.t8, undefined); assert.equal(writes, 0); assert.equal(r.report(), null);
});
test('recorded and unrecorded real game steps have identical full state and events; replay inputs reproduce a step', () => {
  const a = fixture(), b = fixture(); const r = make(); r.start();
  for (let i = 0; i < 12 && !a.s.finished; i++) {
    const ev = r.runStep(a.s, a.teams, a.tendencies, {}, () => step(a.s, a.teams, a.controllers, a.tendencies), 'ai');
    const plain = step(b.s, b.teams, b.controllers, b.tendencies);
    assert.deepEqual(ev, plain); assert.deepEqual(a.s, b.s); assert.deepEqual(a.tendencies, b.tendencies);
  }
  const report = r.report(); assert.equal(report.findings.length, 0, JSON.stringify(report.findings));
  const p = report.plays.at(-1); assert.ok(p.replay, p.replayOmitted);
  const replay = structuredClone(p.replay); const ev = step(replay.state, replay.teams, b.controllers, replay.tendencies, replay.choices);
  assert.equal(ev.text, p.result.text); assert.equal(replay.state.rngState, p.after.rngState); assert.deepEqual(replay.state.score, p.after.score); r.stop();
});
test('reports survive reload and stop; deleting them leaves other storage intact', () => {
  const store = memory(), r = make(store); store.setItem('franchise', 'keep'); r.start(); r.record('action', { action: 'training' }); r.flag('Zone looked wrong'); r.stop();
  const restored = make(store); assert.equal(restored.active(), false); assert.equal(restored.report().findings[0].evidence.note, 'Zone looked wrong');
  restored.clear(); assert.equal(store.getItem('franchise'), 'keep'); assert.equal(store.getItem(RECORDER_KEY), undefined);
});
test('same-build active session resumes; changed build retains report but stops recording', () => {
  const store = memory(), r = make(store); r.start(); r.flush(); assert.equal(make(store).active(), true);
  const changed = createRecorder({ storage: () => store, build: { version: 'other' } }); assert.equal(changed.active(), false); assert.match(changed.status().stoppedReason, /build changed/); r.stop();
});
test('quota failures do not affect gameplay or erase the in-memory report', () => {
  const r = make({ getItem: () => null, setItem: () => { throw Error('quota'); } }); r.start();
  const s = state(); assert.equal(r.runStep(s, {}, {}, {}, () => ({ kind: 'period' })).kind, 'period'); r.flag('still exportable');
  assert.match(r.status().storageError, /could not be saved/); assert.equal(r.report().findings.at(-1).evidence.note, 'still exportable'); r.stop();
});
test('trace scopes clean up after exceptions and trace listener failures cannot break abilities', () => {
  const t8 = {}; assert.throws(() => withTrace(t8, () => {}, () => { throw Error('test'); }));
  const seen = []; trace(t8, 'outside', {}); withTrace(t8, (k) => seen.push(k), () => trace(t8, 'inside', {})); assert.deepEqual(seen, ['inside']);
  withTrace(t8, () => { throw Error('observer'); }, () => assert.doesNotThrow(() => trace(t8, 'status', {})));
});
test('status evidence includes blocked reasons and checks only flag accepted but missing effects', () => {
  const t8 = { status: {} }, seen = []; withTrace(t8, (kind, data) => seen.push({ kind, ...data }), () => {
    applyStatus({ t8 }, 'target', { id: 'stunned', strength: 10, duration: 1, abilityId: 'TEST' });
    applyStatus({ t8 }, 'target', { id: 'slowed', strength: 10, duration: 1, abilityId: 'TEST' });
  });
  assert.equal(seen[0].accepted, true); assert.equal(seen[1].accepted, false); assert.ok(seen[1].reason);
  assert.equal(checkPlay({}, state(), {}, seen).length, 0);
  assert.equal(checkPlay({}, state(), {}, [{ kind: 'status', requested: 'stunned', actual: null, accepted: true }])[0].code, 'status-not-applied');
});
test('real field telemetry records applied slow and same-type neutrality without changing field effects', () => {
  const actor = (id, type) => ({ mid: id, slot: id, name: id, type, team: 'off', x: 0, y: 0, vx: 0, vy: 0, maxSpeed: 8, attrs: { awareness: 60, catching: 60, blocking: 60 } });
  const t8 = {}, seen = [], actors = [actor('a', 'Water'), actor('b', 'Fire')];
  withTrace(t8, (kind, data) => seen.push({ kind, ...data }), () => {
    const fx = createFieldPlay({ t8, fields: [{ id: 'f', type: 'Fire', strength: 25, lat: [-10, 10], yard: [-10, 10] }], actors }); fx.tick(.05); fx.tick(.1);
  });
  assert.equal(seen.length, 2, 'record transitions, not every tick'); assert.equal(seen[0].actual, -25); assert.equal(seen[1].actual, 0);
  assert.equal(checkPlay({}, state(), {}, seen).length, 0);
});
test('bounded rings preserve flagged play evidence and say when replay inputs are too large', () => {
  const r = make(); r.start(); const s = state();
  r.runStep(s, { oversized: 'x'.repeat(LIMITS.replayChars + 1) }, {}, {}, () => ({ kind: 'play', text: 'first' })); r.flag('first play');
  for (let i = 0; i < 20; i++) r.runStep(s, {}, {}, {}, () => ({ kind: 'play', text: 'later' }));
  for (let i = 0; i < 1000; i++) r.record('action', { i });
  const report = r.report(); assert.equal(report.plays.length, LIMITS.plays); assert.equal(report.events.length, LIMITS.events);
  assert.equal(report.findings[0].playEvidence.result.text, 'first'); assert.ok(JSON.stringify(report).length < LIMITS.storedChars + 2000); r.stop();
});
test('failed saves, duplicate ids and numeric errors are findings; normal superseding is not', () => {
  const r = make(); r.start(); r.observeSave({ ok: false, error: { code: 'superseded' } }); assert.equal(r.report().findings.length, 0);
  r.observeSave({ ok: false, error: { code: 'quota' } }); r.observeFranchise({ roster: [{ id: 'a', attributes: { speed: NaN } }, { id: 'a' }] });
  assert.deepEqual(r.report().findings.map((x) => x.code), ['save-failed', 'roster-number', 'roster-id']); r.stop();
});
test('full franchise save is included only on explicit export; snapshots do not reference live objects', () => {
  const r = make(); r.start(); const f = { club: 'test', roster: [] }; r.observeFranchise(f);
  const a = r.report({ franchise: f }); assert.equal(a.franchiseSave, undefined);
  const b = r.report({ franchise: f, includeSave: true }); f.club = 'changed'; assert.equal(b.franchiseSave.club, 'test'); r.stop();
});

test('captured human-controller inputs replay with the same human timeout and kneel rules', async () => {
  const { replayRecordedPlay } = await import('../src/testing/replay.js');
  const a = fixture(), r = make(); r.start();
  a.controllers.home = { ...a.controllers.home, timeoutOnDefense: () => false, timeoutOnOffense: () => false, kneel: () => false, spike: () => false, tempo: () => 'normal' };
  for (let i = 0; i < 4; i++) r.runStep(a.s, a.teams, a.tendencies, {}, () => step(a.s, a.teams, a.controllers, a.tendencies), { mode: 'human', playerSide: 'home', tempo: 'normal' });
  const p = r.report().plays.at(-1); const replay = replayRecordedPlay(p); assert.equal(replay.reproduced, true, JSON.stringify(replay.differences));
  assert.throws(() => replayRecordedPlay({}), /no retained replay/); r.stop();
});
test('test session screen escapes player notes and clearly labels opt-in save exports and limited detection', async () => {
  const { recorder } = await import('../src/testing/recorder.js');
  const { registerTestSession } = await import('../src/ui/screens/test-session.js');
  let screen; registerTestSession({ registerScreen: (name, value) => { assert.equal(name, 'test-session'); screen = value; } }, {});
  recorder.start(); recorder.flag('<script>alert(1)</script>');
  const html = screen.render(); assert.ok(html.includes('&lt;script&gt;')); assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Include current franchise save')); assert.ok(html.includes('cannot identify every')); recorder.clear();
});

test('a failed simulation preserves its inputs and rethrows the original exception', () => {
  const r = make(); r.start(); const error = new Error('failed simulation');
  assert.throws(() => r.runStep(state(), {}, {}, {}, () => { throw error; }, 'ai'), (e) => e === error);
  const report = r.report(); assert.ok(report.plays[0].replay); assert.equal(report.findings[0].code, 'simulation-exception'); assert.equal(report.findings[0].playId, report.plays[0].id); r.stop();
});
test('a field modifier stored without updating effective maximum speed is flagged', () => {
  const found = checkPlay({}, state(), {}, [{ kind: 'field-speed', expected: -25, actual: -25, expectedMax: 6, actualMax: 8 }]);
  assert.equal(found[0].code, 'field-speed-not-applied');
});

test('a report sheet can preserve its original play while auto-play advances the recent ring', () => {
  const r = make(); r.start(); const s = state();
  r.runStep(s, {}, {}, {}, () => ({ kind: 'play', text: 'the flagged play' })); const captured = r.lastPlay();
  for (let i = 0; i < LIMITS.plays + 1; i++) r.runStep(s, {}, {}, {}, () => ({ kind: 'play', text: 'later' }));
  r.flag('Something looked wrong', captured.id, captured);
  assert.equal(r.report().findings[0].playEvidence.result.text, 'the flagged play'); r.stop();
});
test('real field and ability simulation is unchanged with tracing, including all frames', async () => {
  const { simulatePlay } = await import('../src/sim/engine.js'); const { PLAYS } = await import('../src/data/playbook.js');
  const L = lineup(); L.offense.QB = { ...L.offense.QB, id: 'q', species: 'lumen', form: 'lumen:0', type: 'Light', mastery: 0 };
  const field = { id: 'f', type: 'Fire', strength: 25, lat: [-26, 26], yard: [-10, 20], ability: 'FIR-06-F', owner: 'creator' };
  const run = (t8) => simulatePlay({ offensePlay: PLAYS.mesh, defensePlay: PLAYS.cover_3, offense: L.offense, defense: L.defense, seed: 87, ballOn: 40, options: { t8, fields: [field] } });
  const a = { status: {} }, b = { status: {} }, r = make(), s = { ...state(), t8: a }; r.start();
  const ev = r.runStep(s, {}, {}, {}, () => ({ kind: 'play', sim: run(a) })); const plain = run(b);
  assert.deepEqual(ev.sim, plain); assert.deepEqual(a, b); assert.ok(r.report().plays[0].trace.some((x) => x.kind === 'field-speed'));
  assert.equal(r.report().findings.length, 0, JSON.stringify(r.report().findings)); r.stop();
});

test('browser hooks capture declared actions and failures, ignore typed values, and detach cleanly', async () => {
  const { installRecorder } = await import('../src/testing/browser.js'); const { recorder } = await import('../src/testing/recorder.js');
  const win = new EventTarget(), doc = new EventTarget(); doc.visibilityState = 'visible'; recorder.start();
  const detach = installRecorder({ app: { f: null }, currentScreen: () => ({ name: 'hq' }), win, doc });
  const click = new Event('click'); Object.defineProperty(click, 'target', { value: { closest: () => ({ dataset: { action: 'training', id: 'm1' }, value: 'never collect this typed value' }) } }); doc.dispatchEvent(click);
  const error = new Event('error'); Object.assign(error, { message: 'test runtime failure', filename: 'game.js', lineno: 4 }); win.dispatchEvent(error);
  assert.equal(recorder.report().findings[0].code, 'runtime-error'); assert.ok(recorder.report().events.some((x) => x.data?.action === 'training')); assert.ok(!JSON.stringify(recorder.report()).includes('never collect this typed value'));
  detach(); const count = recorder.report().findings[0].count; win.dispatchEvent(error); assert.equal(recorder.report().findings[0].count, count); recorder.clear();
});

test('large action contexts cannot produce a persisted report too large to restore', () => {
  const store = memory(), r = make(store); r.start(); r.setContext({ screen: 'x'.repeat(5000) });
  for (let i = 0; i < LIMITS.events; i++) r.record('large', { value: 'y'.repeat(5000) });
  r.flush(); assert.ok(store.getItem(RECORDER_KEY).length <= LIMITS.storedChars); assert.equal(make(store).active(), true); r.stop();
});
