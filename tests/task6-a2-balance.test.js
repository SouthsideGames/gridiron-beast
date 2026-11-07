// Task 6 Phase A-2: draft-class scaling (D9), the gym growth plateau (D10a) and the ordinary clubs' slowdown and runaway bands (D10b).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDraftClass, classQualityOffset, CLASS_GROWTH_CAP } from '../src/franchise/draft.js';
import { gymGrowth, GYM_GROWTH_PER_SEASON, ORDINARY_GROWTH_PER_SEASON } from '../src/data/gyms.js';
import { ORDINARY_SLOW_BAND, ORDINARY_RUNAWAY_BAND, BAND } from '../src/franchise/league-season.js';
import { monsterOverall } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';

test('D9: classes rise about +0.5 a season, capped at +10, with the same draws and mix', () => {
  assert.equal(classQualityOffset(1), 0); assert.equal(classQualityOffset(2), 1); assert.equal(classQualityOffset(11), 5); assert.equal(classQualityOffset(21), 10); assert.equal(classQualityOffset(40), CLASS_GROWTH_CAP);
  const a = generateDraftClass(createRng(77), { year: 1 }), b = generateDraftClass(createRng(77), { year: 11 });
  assert.equal(a.length, b.length); assert.deepEqual(a.map((m) => m.position).sort(), b.map((m) => m.position).sort());
  const mean = (c, k) => c.reduce((s, m) => s + k(m), 0) / c.length;
  // N7f (CLUB_STRENGTH_SELECTION.md): the D9 offset (kept, open owner question) now moves the target *percentile* of a
  // potential-metric selection among nine Dex candidates, so it no longer adds whole points to OVR or potential. What it must
  // still do: lift the class's potential, more at a bigger offset, without changing the mix. Measured (seed 77): potential
  // +1.1 at offset 5, +2.3 at offset 10; OVR moves < 0.5 (prospects are chosen by potential, not current rating).
  const c = generateDraftClass(createRng(77), { year: 21 });
  const dPot = mean(b, (m) => m.potential) - mean(a, (m) => m.potential), dPot10 = mean(c, (m) => m.potential) - mean(a, (m) => m.potential);
  assert.ok(dPot > 0.5, `potential +${dPot.toFixed(2)} at offset 5`); assert.ok(dPot10 > dPot + 0.5, `potential +${dPot10.toFixed(2)} at offset 10`);
  assert.ok(Math.abs(mean(b, monsterOverall) - mean(a, monsterOverall)) < 2, 'selection by potential leaves current OVR about level');
  assert.deepEqual(generateDraftClass(createRng(77), { year: 11 }).map((m) => m.id), b.map((m) => m.id), 'deterministic');
});

test('D10a: gyms grow +1.5 a season through season 10, then +0.5', () => {
  assert.equal(gymGrowth(0), 0); assert.equal(gymGrowth(9), 9 * GYM_GROWTH_PER_SEASON, 'season 10 (9 seasons of growth): unchanged');
  assert.equal(gymGrowth(10) - gymGrowth(9), ORDINARY_GROWTH_PER_SEASON); assert.equal(gymGrowth(19), 13.5 + 10 * 0.5, 'season 20: 18.5 instead of 28.5');
});

test('D10b: the ordinary bands are separate constants, aligned, at today\'s +4 until the owner chooses a width; the lift is unchanged', () => {
  assert.equal(BAND, 4); assert.equal(ORDINARY_SLOW_BAND, 4); assert.equal(ORDINARY_RUNAWAY_BAND, ORDINARY_SLOW_BAND, 'aligned');
});
