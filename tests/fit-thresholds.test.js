// Follow-up A-4 (owner 2026-11-26): the shipped scheme-fit threshold table equals its live derivation exactly. This is the safeguard
// that detects an outdated table: any change to generation, species or headline attributes that moves a threshold fails here.
// Regenerate with `node tools/fit-thresholds.mjs --write`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIT_THRESHOLD_TABLE, deriveFitThresholds, schemeFit, generateMonster } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';

test('the fixed scheme-fit table equals the live derivation (same keys, same order, same values)', () => {
  const live = deriveFitThresholds();
  assert.deepEqual(Object.keys(FIT_THRESHOLD_TABLE), Object.keys(live));
  for (const [k, v] of Object.entries(live)) assert.equal(FIT_THRESHOLD_TABLE[k], v, k);
  assert.ok(Object.isFrozen(FIT_THRESHOLD_TABLE));
});

test('scheme fit reads the table and stays deterministic; deriving does not change what generation produces afterwards', () => {
  const sample = (seed) => { const r = createRng(seed); return ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'].map((p) => generateMonster(r, { position: p, quality: 60 })); };
  const a = sample(41), fitsA = a.map((m) => JSON.stringify(schemeFit(m, { offense: 'pass', defense: 'man' })));
  deriveFitThresholds(); // the derivation has its own stream: it cannot move another caller's
  const b = sample(41), fitsB = b.map((m) => JSON.stringify(schemeFit(m, { offense: 'pass', defense: 'man' })));
  assert.deepEqual(b.map((m) => JSON.stringify(m)), a.map((m) => JSON.stringify(m)));
  assert.deepEqual(fitsB, fitsA);
  assert.ok(fitsA.some((x) => x !== 'null'), 'some fit is computed');
});
