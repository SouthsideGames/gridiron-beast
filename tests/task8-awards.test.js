import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/core/fraction.js';
import * as A from '../src/franchise/t8/awards.js';
test('award amounts: football/Clash/reserve/partial/kicker/bonus as approved, exact', () => {
  assert.deepEqual(A.footballAward({ position: 'RB', liveSnaps: 30 }).training, F.frac(1, 4));
  assert.deepEqual(A.footballAward({ position: 'RB', liveSnaps: 30 }).xp, F.frac(50));
  assert.deepEqual(A.footballAward({ position: 'RB', liveSnaps: 4 }).xp, F.frac(20));
  assert.deepEqual(A.footballAward({ position: 'K', kicks: 1 }).participation, F.ONE);
  assert.deepEqual(A.footballAward({ position: 'K', kicks: 0 }).participation, F.ZERO);
  assert.deepEqual(A.performanceBonus(0.10), F.frac(25, 1000)); // +10% grade → +2.5 points
  assert.deepEqual(A.performanceBonus(0.40), F.frac(5, 100)); assert.deepEqual(A.performanceBonus(-0.1), F.ZERO);
  assert.deepEqual(A.footballAward({ position: 'WR', liveSnaps: 5, gradeAdj: 0.2 }).training, F.mul(F.frac(30, 100), F.frac(1, 2)));
  assert.deepEqual(A.clashAward({}).training, F.frac(1, 4)); assert.deepEqual(A.clashAward({ gradeAdj: 0.2, involved: false }).xp, F.frac(25));
  assert.deepEqual(A.reserveAward(), { xp: F.frac(25, 2), training: F.frac(1, 16) });
});
