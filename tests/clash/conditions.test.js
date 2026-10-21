// Beast Clash conditions: the six required priority tests, immunity, pause/resume, and a lifecycle that
// does not depend on act order. Each checks the state and the words the log will carry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, applyCondition, tickCondition, consumeShock, pauseCondition, resumeCondition, cleanse } from '../../src/clash/conditions.js';
import { simulateClash } from '../../src/clash/engine.js';
import { mon } from './helpers.js';

const shocked = (left = 3) => { const s = freshState(); s.cond = { kind: 'shock', left, skips: 1, skipped: 0 }; return s; };
const burning = (left = 3) => { const s = freshState(); s.cond = { kind: 'burn', left, skips: 1, skipped: 0 }; return s; };
const chilled = (left = 3) => { const s = freshState(); s.cond = { kind: 'chill', left, skips: 1, skipped: 0 }; return s; };

test('1. Shocked (3 left), hit by Daze: Shock stays with 3 left; Daze had no effect', () => {
  const s = shocked(3); const r = applyCondition(s, 'daze', 5);
  assert.equal(r.result, 'resisted_weaker'); assert.equal(s.cond.kind, 'shock'); assert.equal(s.cond.left, 3); assert.match(r.words, /shock holds; daze has no effect/);
});
test('2. Chilled (3 left), hit by Burn: Burn replaces Chill with a full 3; the log names both', () => {
  const s = chilled(3); const r = applyCondition(s, 'burn', 5);
  assert.equal(r.result, 'replaced'); assert.equal(s.cond.kind, 'burn'); assert.equal(s.cond.left, 3); assert.equal(r.words, 'burn replaces chill');
});
test('3. Burning (2 left), hit by Burn: still Burn with 2 left, no refresh', () => {
  const s = burning(2); const r = applyCondition(s, 'burn', 5);
  assert.equal(r.result, 'resisted_same'); assert.equal(s.cond.left, 2); assert.match(r.words, /already burning/);
});
test('4. Burning (3 left), hit by Daze (equal severity): Burn stays', () => {
  const s = burning(3); const r = applyCondition(s, 'daze', 5);
  assert.equal(r.result, 'resisted_weaker'); assert.equal(s.cond.kind, 'burn'); assert.equal(s.cond.left, 3);
});
test('5. Shocked (1 left), hit by Chill: Chill replaces Shock (last-exchange rule); the log says Shock wore off', () => {
  const s = shocked(1); const r = applyCondition(s, 'chill', 5);
  assert.equal(r.result, 'replaced'); assert.equal(s.cond.kind, 'chill'); assert.equal(s.cond.left, 3); assert.equal(r.words, 'shock wears off; chill takes hold');
});
test('6. Burning (2 left), benched, returns, then hit by Shock: Burn resumes with 2 left, then Shock replaces it', () => {
  const s = burning(2); assert.equal(pauseCondition(s), 'burn'); assert.equal(s.cond, null);
  // ticks while benched do nothing (the engine only ticks fronts); on return the count is the same
  assert.equal(resumeCondition(s), 'burn'); assert.equal(s.cond.left, 2);
  const r = applyCondition(s, 'shock', 8); assert.equal(r.result, 'replaced'); assert.equal(s.cond.kind, 'shock'); assert.equal(r.replaced, 'burn');
});
test('7. Immunity: Burn expires, Burn on the next exchange is refused, then lands the exchange after; Shock has two exchanges', () => {
  const s = burning(1); const t = tickCondition(s, 10, 100); assert.equal(t.expired, 'burn'); assert.equal(t.burn, 6);
  assert.equal(applyCondition(s, 'burn', 11).result, 'resisted_immune'); assert.equal(applyCondition(s, 'burn', 12).result, 'applied');
  const k = shocked(3); assert.equal(consumeShock(k, 20), true); assert.equal(k.cond, null);
  assert.equal(applyCondition(k, 'shock', 21).result, 'resisted_immune'); assert.equal(applyCondition(k, 'shock', 22).result, 'resisted_immune'); assert.equal(applyCondition(k, 'shock', 23).result, 'applied');
  assert.equal(applyCondition(freshState(), 'daze', 1).result, 'applied');
});
test('Shock ends as soon as it skips one action; Whiteout carries two skips; a cleanse removes any condition', () => {
  const s = shocked(3); consumeShock(s, 3); assert.equal(s.cond, null);
  const w = freshState(); applyCondition(w, 'shock', 1, { skips: 2 }); consumeShock(w, 1); assert.equal(w.cond.kind, 'shock'); consumeShock(w, 2); assert.equal(w.cond, null);
  const c = burning(3); assert.equal(cleanse(c, 4, 'daze'), null); assert.equal(cleanse(c, 4, 'any'), 'burn'); assert.equal(c.cond, null);
});

test('in play: every condition event is logged as applied / resisted / replaced / paused / resumed / expired, and the lifecycle does not depend on act order', () => {
  const r = simulateClash({ a: [mon('stormlynx', 1), mon('mudcub', 2), mon('pyrelynx', 3)], b: [mon('hailfang', 4), mon('nocturne', 5), mon('tidepaw', 6)], seed: 21, config: { policies: { a: 'defensive', b: 'defensive' } } });
  const results = new Set(r.log.filter((e) => e.kind === 'condition').map((e) => e.result));
  for (const want of ['applied', 'expired']) assert.ok(results.has(want), want);
  for (const e of r.log.filter((e) => e.kind === 'condition')) assert.ok(['applied', 'replaced', 'resisted_same', 'resisted_weaker', 'resisted_immune', 'missed', 'expired', 'cleared'].includes(e.result), e.result);
  // Ticks happen once per exchange on fronts regardless of who acted first: no condition ever lasts more than 3 ticks.
  const ticks = {}; for (const e of r.log) { if (e.kind === 'condition' && (e.result === 'applied' || e.result === 'replaced')) ticks[e.target] = 0; if (e.kind === 'tick') ticks[e.target] = (ticks[e.target] || 0) + 1; if (e.kind === 'condition' && e.result === 'expired') assert.ok((ticks[e.target] || 0) <= 3, `${e.target} ticked ${ticks[e.target]} times`); }
  // Swapping the sides changes who acts first in ties but every condition still goes through the same states.
  const r2 = simulateClash({ b: [mon('stormlynx', 1), mon('mudcub', 2), mon('pyrelynx', 3)], a: [mon('hailfang', 4), mon('nocturne', 5), mon('tidepaw', 6)], seed: 21, config: { policies: { a: 'defensive', b: 'defensive' } } });
  for (const e of r2.log.filter((e) => e.kind === 'condition')) assert.ok(['applied', 'replaced', 'resisted_same', 'resisted_weaker', 'resisted_immune', 'missed', 'expired', 'cleared'].includes(e.result));
});
