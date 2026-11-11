import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/core/fraction.js';
import * as St from '../src/sim/t8/stamina.js';
test('stamina: 1 per play, exact Afflicted drain with denominator floor 1, exhaustion at zero survives halftime', () => {
  let s = St.startGame(4);
  s = St.drainPlay(s, { afflicted: true, effectiveDurability: 3 }); assert.deepEqual(s.stamina, F.frac(8, 3)); // 4 - 4/3
  s = St.drainPlay(s); s = St.drainPlay(s); assert.equal(s.exhausted, false); assert.ok(St.showBattery(s));
  s = St.drainPlay(s); assert.equal(s.exhausted, true); assert.deepEqual(s.stamina, F.ZERO); assert.equal(St.exhaustionFactor(s), 0.5);
  s = St.halftime(s); assert.deepEqual(s.stamina, F.frac(2)); assert.equal(s.exhausted, true);
  assert.deepEqual(St.drainPlay(St.startGame(40), { afflicted: true, effectiveDurability: 0 }).stamina, F.ZERO); // 40/max(1,0) = 40
  assert.deepEqual(St.halftime({ capacity: 10, stamina: F.frac(9), exhausted: false }).stamina, F.frac(10));
});
