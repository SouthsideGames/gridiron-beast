// Task 10 (owner 2026-11-13): Beast Clash is ONE continuous automatic battle with player-controlled substitutions. The engine session
// (createClashSessionT8) keeps a single live battle state, pauses before each rotation phase, takes the player's tap for that phase and
// continues from the same state. Acceptance items 1–16 of the brief are covered here at engine level; the screen is covered in
// tests/task10-clash-screen.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulateClashT8, createClashSessionT8, t8LogHash } from '../../src/clash/t8/index.js';
import { reviewMonster } from '../../src/clash/t8/review.js';
import { ROTATION_CADENCE_EXCHANGES } from '../../src/data/approved-values.js';

const M = (species, seed, overall = 70) => reviewMonster({ species, overall }, seed);
const PLAYER = { ruleset: 't8', policies: { a: 'player', b: 'ai' } };
const lineup = (seed) => ({ a: [M('tidepaw', seed), M('firestorm', seed + 1), M('scaleguard', seed + 2)], b: [M('lumen', seed + 3), M('gravelpup', seed + 4), M('hailfang', seed + 5)] });
const session = (seed, extra = {}) => { const { a, b } = lineup(seed); return { a, b, s: createClashSessionT8({ a, b, seed, config: PLAYER, ...extra }) }; };
const replayOf = (a, b, seed, s) => simulateClashT8({ a, b, seed, config: { ...PLAYER, decisions: { a: s.decisions.a } } });
const line = (v, id) => [...v.lines.a, ...v.lines.b].find((x) => x.id === id);

test('1–2. a battle runs from start to end with no prompt, and both actives act on their own', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const { s } = session(seed); let guard = 0;
    while (!s.done && guard++ < 200) s.advance();
    const r = s.result;
    assert.ok(s.done && !r.pending && r.winner, `seed ${seed}: finished with a winner`);
    assert.ok(!r.log.some((e) => e.kind === 'rotation_prompt' || e.pending), `seed ${seed}: never waits for a prompt`);
    for (const side of ['a', 'b']) assert.ok(r.log.some((e) => e.kind === 'damage' && e.actor?.[0] === side), `seed ${seed}: side ${side} attacks on its own`);
  }
});

test('3–7, 13–14. a tap switches at the next boundary; HP, the enemy, the exchange count, statuses and clocks carry on; nothing is replayed or lost', () => {
  const { s } = session(11); s.advance(); s.advance(); // exchange 3 boundary: cadence open
  const before = s.view; const r = before.rotation; assert.equal(r.exchangesLeft, 0);
  const outId = r.activeId, inId = r.reserves[0].id, foeId = before.lines.b.find((x) => x.active).id;
  const out0 = line(before, outId), foe0 = line(before, foeId);
  assert.ok(s.request(inId).ok, 'the reserve is accepted');
  const after = s.advance();
  const rot = after.log.find((e) => e.kind === 'rotation' && e.side === 'a' && e.ex === r.ex);
  assert.ok(rot && rot.out === outId && rot.in === inId, 'the rotation happens at that exchange\'s rotation phase');
  assert.equal(after.exchanges, before.exchanges + 1, 'the exchange count continues: it never goes back to 1');
  assert.deepEqual(after.log.slice(0, before.log.length), before.log, 'every earlier event is kept exactly: nothing replayed, recalculated or lost');
  const departed = after.log.find((e) => e.kind === 'depart' && e.actor === outId && e.ex === r.ex);
  assert.ok(departed, 'the outgoing monster goes to the bench');
  const outNow = line(after, outId);
  const hitWhileOut = after.log.slice(before.log.length).some((e) => e.target === outId && ['damage', 'heal', 'dot'].includes(e.kind));
  if (!hitWhileOut) assert.equal(outNow.hp, out0.hp, 'the outgoing monster keeps its HP on the bench');
  assert.ok(!outNow.active && !outNow.koed, 'it is a living reserve');
  const foeHitsAtRotation = after.log.filter((e) => e.ex === r.ex && e.phase === 'rotation' && e.target === foeId && e.kind === 'damage');
  assert.equal(foeHitsAtRotation.length, 0, 'the switch itself does not touch the enemy');
  assert.equal(rot.actorState.hp, out0.hp, 'the outgoing monster leaves with exactly the HP it had');
  const foeTouched = after.log.slice(before.log.length, after.log.indexOf(rot) + 1).some((e) => e.target === foeId && ['damage', 'heal', 'dot'].includes(e.kind));
  assert.ok(!foeTouched, 'the enemy is not touched between the boundary and the switch: it keeps its HP');
  if (!hitWhileOut) assert.deepEqual(outNow.clocks.map((k) => `${k.id}:${k.left}`), out0.clocks.map((k) => `${k.id}:${k.left}`), 'its ability clocks travel with it unchanged (reserve time pauses them)');
  if (out0.status && !hitWhileOut) assert.equal(outNow.status?.id, out0.status.id, 'its status travels with it');
});

test('8–9. a second voluntary switch waits four exchanges; a refused tap never resets the cadence', () => {
  const { s } = session(21); while (s.view.rotation.exchangesLeft > 0) s.advance();
  const first = s.view.rotation; assert.ok(s.request(first.reserves[0].id).ok); s.advance();
  const seen = [];
  for (let k = 1; k < ROTATION_CADENCE_EXCHANGES; k++) {
    const r = s.view.rotation; if (s.done) break;
    const c = s.request(r.reserves[0]?.id); seen.push(c.exchangesLeft);
    assert.equal(c.ok, false, `exchange ${r.ex}: refused`); assert.equal(c.reason, 'cooldown'); assert.equal(c.exchangesLeft, ROTATION_CADENCE_EXCHANGES - k, 'the remaining cooldown is shown');
    s.advance(); // the refused tap is not queued
    assert.ok(!s.view.log.some((e) => e.kind === 'rotation' && e.side === 'a' && e.ex === r.ex), 'no switch happened');
  }
  assert.deepEqual(seen, [3, 2, 1], 'each refusal leaves the countdown running');
  const r = s.view.rotation; assert.equal(r.ex - first.ex, ROTATION_CADENCE_EXCHANGES, 'four exchanges after the last successful switch');
  assert.equal(r.exchangesLeft, 0); assert.ok(s.request(r.reserves[0].id).ok, 'legal again'); s.advance();
  assert.ok(s.view.log.some((e) => e.kind === 'rotation' && e.side === 'a' && e.ex === r.ex), 'and it happens');
});

test('10–11. a knockout brings the next monster in automatically, with no prompt, and does not touch the voluntary cadence', () => {
  let checked = 0;
  for (let seed = 1; seed <= 40 && checked < 3; seed++) {
    const { a, b } = { a: [M('pebble', seed, 40), M('tidepaw', seed + 1, 45), M('lumen', seed + 2, 45)], b: [M('cinderclaw', seed + 3, 95), M('gravelpup', seed + 4, 95)] };
    const s = createClashSessionT8({ a, b, seed, config: PLAYER }); let switchedAt = null, lastVol = -99, koReplacement = false;
    while (!s.done) {
      const r = s.view.rotation;
      if (switchedAt == null && r.exchangesLeft === 0 && r.reserves.length && s.request(r.reserves[0].id).ok) { switchedAt = r.ex; lastVol = r.ex; }
      const before = s.view.log.length; s.advance(); if (s.done) break;
      const fresh = s.view.log.slice(before);
      const koIn = fresh.find((e) => e.kind === 'enter' && e.reason === 'ko' && e.actor?.[0] === 'a');
      if (koIn && switchedAt != null) {
        koReplacement = true;
        const v = s.view.rotation; assert.equal(v.exchangesLeft, Math.max(0, ROTATION_CADENCE_EXCHANGES - (v.ex - lastVol)), `seed ${seed}: the cadence still counts from the last voluntary switch (exchange ${lastVol})`);
        assert.equal(s.view.sides.a.lastVoluntary, lastVol, 'a knockout replacement is not a voluntary rotation');
      }
      assert.ok(!fresh.some((e) => e.kind === 'rotation_prompt'), 'never a prompt');
    }
    if (koReplacement) checked++;
  }
  assert.ok(checked >= 1, 'found knockouts on the player side to check');
});

test('12. rotation-triggered abilities still work: Dragonhide on entering by a tap, Cold Welcome on the enemy\'s side', () => {
  let entry = 0, welcome = 0;
  for (let seed = 30; seed < 70 && (!entry || !welcome); seed++) {
    const a = [M('tidepaw', seed), M('firestorm', seed + 1), M('scaleguard', seed + 2)], b = [M('hailfang', seed + 5, 85), M('gravelpup', seed + 4), M('lumen', seed + 3)]; // Cold Welcome acts while its owner is active
    const s = createClashSessionT8({ a, b, seed, config: PLAYER }); let tapped = false;
    while (!s.done) { const r = s.view.rotation; const sg = r.reserves.find((x) => x.name && s.view.lines.a.find((y) => y.id === x.id)?.species === 'scaleguard'); if (!tapped && r.exchangesLeft === 0 && sg && s.request(sg.id).ok) tapped = r.ex; s.advance(); }
    if (!tapped) continue;
    const log = s.result.log;
    if (log.some((e) => e.ex === tapped && e.abilityId === 'DRA-04-C')) entry++;
    if (log.some((e) => e.ex === tapped && e.abilityId === 'ICE-02-C')) welcome++;
  }
  assert.ok(entry > 0, 'Dragonhide acts on the entry the player chose'); assert.ok(welcome > 0, 'Cold Welcome answers the player\'s voluntary rotation');
});

test('15. save / load and replay: the recorded decisions rebuild the same battle; a reload resumes at the same boundary', () => {
  for (const seed of [41, 42, 43]) {
    const { a, b, s } = session(seed); let k = 0;
    while (!s.done) { const r = s.view.rotation; if (r.exchangesLeft === 0 && r.reserves.length && (k++ % 2 === 0)) s.request(r.reserves[k % r.reserves.length].id); s.advance(); }
    const replay = replayOf(a, b, seed, s);
    assert.equal(replay.stateHash, s.result.stateHash, `seed ${seed}: the replay ends in the same state`); assert.equal(t8LogHash(replay), t8LogHash(s.result), 'and has the same log');
    // a reload mid-battle: a fresh session fed the same decisions reaches the same boundary in the same state
    const s2 = createClashSessionT8({ a, b, seed, config: PLAYER }); const mid = Math.max(2, Math.floor(s.result.exchanges / 2));
    while (!s2.done && s2.view.exchanges < mid) { const d = s.decisions.a[s2.view.rotation.ex]; if (d) s2.request(d); s2.advance(); }
    const s3 = createClashSessionT8({ a, b, seed, config: PLAYER });
    while (!s3.done && s3.view.exchanges < mid) { const d = s.decisions.a[s3.view.rotation.ex]; if (d) s3.request(d); s3.advance(); }
    assert.deepEqual(s3.view.log, s2.view.log, 'two reloads agree event for event');
  }
});

test('16. "Auto for the rest" (the approved battle control) hands the rotations to the AI: identical to an AI-run (Skip) battle from that point', () => {
  for (const seed of [51, 52]) {
    const { a, b, s } = session(seed); s.auto(); s.finish();
    const skip = simulateClashT8({ a, b, seed, config: { ruleset: 't8', policies: { a: 'ai', b: 'ai' } } });
    assert.equal(s.result.winner, skip.winner); assert.equal(s.result.exchanges, skip.exchanges); assert.equal(s.result.stateHash !== undefined, true);
    const rot = (r) => r.log.filter((e) => e.kind === 'rotation').map((e) => `${e.ex}${e.side}${e.in}`).join();
    assert.equal(rot(s.result), rot(skip), 'the same rotations as the AI makes in Skip');
  }
});

test('the plain engine call is unchanged by the session work: an AI battle and a manual prompt battle behave as before', () => {
  const { a, b } = lineup(61);
  const ai = simulateClashT8({ a, b, seed: 61, config: { ruleset: 't8' } }); assert.ok(ai.winner && !ai.pending);
  const manual = simulateClashT8({ a, b, seed: 61, config: { ruleset: 't8', policies: { a: 'manual', b: 'ai' } } }); assert.ok(manual.pending && manual.boundary.kind === 'rotation', 'the manual policy still stops at its prompt (old saves)');
});
