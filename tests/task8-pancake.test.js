import test from 'node:test';
import assert from 'node:assert/strict';
import * as PC from '../src/sim/t8/pancake.js';
import { createRng } from '../src/core/rng.js';

const ol = { strength: 70, blocking: 75, tackling: 40, awareness: 60 }, dl = { strength: 60, agility: 65, tackling: 50 };
test('B1/B2 formulas: worked example, positive advantage required, bounds enforced', () => {
  assert.equal(PC.shedScore(dl, 'DL'), 60.5); assert.equal(PC.shedScore(dl, 'LB'), 0.5 * 60 + 0.3 * 65 + 0.2 * 50);
  const A = PC.advantage(ol, dl, 'DL'); assert.equal(+A.toFixed(3), 0.125);
  assert.equal(+PC.opportunityChance(A).toFixed(4), 0.125); assert.equal(+PC.successChance(ol, dl).toFixed(2), 0.41); assert.equal(+PC.recoveryChance(ol).toFixed(3), 0.842);
  assert.equal(PC.opportunityChance(0), 0); assert.equal(PC.opportunityChance(-0.2), 0);
  assert.throws(() => PC.pancakeConstants({ a0: -0.01 })); assert.throws(() => PC.pancakeConstants({ qmax: 0.3 }));
  assert.equal(PC.pancakeConstants({ qmax: 0.2 }).qmax, 0.2);
});
test('one opportunity per OL per play: outcome frequencies match the formulas', () => {
  const rng = createRng(5); const N = 60000; const n = { none: 0, pancake: 0, recovered: 0, lostBlock: 0 };
  for (let i = 0; i < N; i++) n[PC.resolvePancakeOpportunity(rng, ol, dl, 'DL').outcome]++;
  const q = 0.125, p = 0.41, r = 0.60 + 0.40 * 60 / 99;
  assert.ok(Math.abs(n.pancake / N - q * p) < 0.004); assert.ok(Math.abs(n.lostBlock / N - q * (1 - p) * (1 - r)) < 0.003);
});
