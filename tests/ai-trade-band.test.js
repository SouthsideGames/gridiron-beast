// AI–AI trade fairness (Task 5 rule, owner 2026-10-24): market value received over given within 0.85–1.15 BOTH ways. A defect in
// v42.17.0 checked only one direction (a deal at 0.85 one way is 1.176 the other); fixed with the owner's approval on 2026-11-01.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as LT from '../src/franchise/league-trades.js';
import { newFranchise } from '../tools/franchise-soak.mjs';
import { createRng } from '../src/core/rng.js';
import { tierById } from '../src/data/league.js';

const [lo, hi] = LT.AI_TRADE_RULES.band;

test('trade band boundaries: both directions must lie in 0.85–1.15', () => {
  assert.deepEqual([lo, hi], [0.85, 1.15]);
  assert.ok(LT.inBand(100, 100), 'even');
  assert.ok(LT.inBand(115, 100), '1.15 one way is 0.870 the other: inside');
  assert.ok(!LT.inBand(115.1, 100), 'just over 1.15');
  assert.ok(LT.inBand(100 / 1.15, 100), 'exactly 1/1.15 one way is 1.15 the other');
  assert.ok(!LT.inBand(86.9, 100), '0.869 one way is 1.151 the other: outside');
  assert.ok(!LT.inBand(85, 100), 'the v42.17.0 defect: 0.85 one way passed, but it is 1.176 the other');
  assert.ok(!LT.inBand(100, 85), 'and the mirror case');
  assert.ok(!LT.inBand(10, 0) && !LT.inBand(0, 10), 'nothing for something is never fair');
});

test('every AI–AI deal made in prepared windows is fair both ways (as the clubs valued it when they dealt)', () => {
  let deals = 0;
  for (const seed of [53, 54, 55, 56]) {
    const f = newFranchise(seed); f.season.finished = true; const cap = tierById(f.tier).cap;
    for (const d of LT.aiTrades(f, createRng(seed), { year: 2, cap, window: 'offseason' })) {
      deals++; const [got, paid] = d.mv; const r = got / paid;
      assert.ok(r >= lo - 0.002 && r <= hi + 0.002 && 1 / r >= lo - 0.002 && 1 / r <= hi + 0.002, `seed ${seed}: ${got} for ${paid} (${r.toFixed(3)})`); // mv is rounded to 0.1
    }
  }
  assert.ok(deals > 0, 'the windows produced deals to check');
});
