// Task 6 Phase A-2: draft-class scaling (D9), the gym growth plateau (D10a) and the ordinary clubs' slowdown and runaway bands (D10b).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateDraftClass, classQualityOffset, CLASS_GROWTH_CAP } from '../src/franchise/draft.js';
import { gymGrowth, GYM_GROWTH_PER_SEASON, ORDINARY_GROWTH_PER_SEASON } from '../src/data/gyms.js';
import { ORDINARY_SLOW_BAND, ORDINARY_RUNAWAY_BAND, BAND } from '../src/franchise/league-season.js';
import { monsterOverall } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';

test('D9 class growth is retired (owner N8b, D2): every season class is drawn alike, with the same draws and mix', () => {
  for (const y of [1, 2, 11, 21, 40]) assert.equal(classQualityOffset(y), 0); assert.equal(CLASS_GROWTH_CAP, 0);
  const a = generateDraftClass(createRng(77), { year: 1 }), b = generateDraftClass(createRng(77), { year: 11 });
  assert.equal(a.length, b.length); assert.deepEqual(a.map((m) => m.position).sort(), b.map((m) => m.position).sort());
  assert.deepEqual(a.map((m) => m.potential), b.map((m) => m.potential), 'the same seed draws the same class in any season');
});

test('D10a: gyms grow +1.5 a season through season 10, then +0.5', () => {
  assert.equal(gymGrowth(0), 0); assert.equal(gymGrowth(9), 9 * GYM_GROWTH_PER_SEASON, 'season 10 (9 seasons of growth): unchanged');
  assert.equal(gymGrowth(10) - gymGrowth(9), ORDINARY_GROWTH_PER_SEASON); assert.equal(gymGrowth(19), 13.5 + 10 * 0.5, 'season 20: 18.5 instead of 28.5');
});

test('D10b: the ordinary bands are separate constants, aligned, at today\'s +4 until the owner chooses a width; the lift is unchanged', () => {
  assert.equal(BAND, 4); assert.equal(ORDINARY_SLOW_BAND, 4); assert.equal(ORDINARY_RUNAWAY_BAND, ORDINARY_SLOW_BAND, 'aligned');
});
