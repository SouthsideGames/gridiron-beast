// Task 8 M2: the approved activity rewards (spec §6; R1 items 9-12) through the reward ledger (spec §15). Level XP stops at 50; the
// shared training bar continues at level 50 and banks one point per full bar; offseason points are a separate award.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterGame, applyAward, offseason } from '../src/franchise/progression.js';
import { practiceAfterGame } from '../src/franchise/development.js';
import { createRewardLedger } from '../src/franchise/reward-ledger.js';
import { generateMonster, raiseToLevel } from '../src/data/monsters.js';
import { createRng } from '../src/core/rng.js';
import * as FR from '../src/core/fraction.js';

const mk = (position, seed = 1, opts = {}) => generateMonster(createRng(seed), { position, quality: 58, age: 22, yearsPro: 0, ...opts });
const bar = (m) => FR.toNumber(m.dev.bar) + FR.toNumber(m.dev.bank);

test('football: full participation earns 50 level XP and 25% of a training bar; partial snaps scale both; a kicker needs one kick', () => {
  const qb = mk('QB', 1), rb = mk('RB', 2), k = mk('K', 3), k0 = mk('K', 4);
  const ev = afterGame([qb, rb, k], { QB: qb.id, RB: rb.id, K: k.id }, { QB: { snapsOff: 40 }, RB: { snapsOff: 5 }, K: { fga: 1 } }, createRng(9), { autoEvolve: false });
  const row = (m) => ev.find((e) => e.kind === 'xp' && e.id === m.id);
  assert.equal(row(qb).amount, 50); assert.equal(row(qb).training, 0.25);
  assert.equal(row(rb).amount, 25, 'five live snaps: half'); assert.equal(row(rb).training, 0.125);
  assert.equal(row(k).amount, 50, 'one kick qualifies a kicker');
  const ev0 = afterGame([k0], { K: k0.id }, { QB: { snapsOff: 40 }, K: {} }, createRng(9), { autoEvolve: false });
  assert.equal(ev0.find((e) => e.kind === 'xp').amount, 0, 'a kicker with no kick earns nothing');
});

test('aggregated by monster, not slot: a monster in two slots is awarded once, from his combined snaps', () => {
  const m = mk('WR', 5);
  const ev = afterGame([m], { WR1: m.id, WR2: m.id }, { WR1: { snapsOff: 4 }, WR2: { snapsOff: 3 } }, createRng(1), { autoEvolve: false });
  const rows = ev.filter((e) => e.kind === 'xp'); assert.equal(rows.length, 1); assert.equal(rows[0].amount, 35); assert.equal(rows[0].training, 0.175);
});

test('level 50: level XP stops (MAX, nothing converted) and training continues, banking one point per full bar with the excess carried', () => {
  const m = mk('QB', 7); raiseToLevel(m, 50); const bank0 = FR.toNumber(m.dev.bank);
  for (let g = 0; g < 5; g++) { const ev = afterGame([m], { QB: m.id }, { QB: { snapsOff: 40 } }, createRng(g), { autoEvolve: false }); const r = ev.find((e) => e.kind === 'xp'); assert.equal(r.amount, 0); assert.equal(r.max, true); assert.equal(r.training, 0.25); }
  assert.equal(m.dev.level, 50); assert.equal(m.xp, 0);
  assert.equal(FR.toNumber(m.dev.bank), bank0 + 1, 'four bars of 25% made one point'); assert.equal(FR.toNumber(m.dev.bar), 0.25, 'the fifth quarter carries');
});

test('once per activity and monster through the ledger: a replayed game awards nothing more', () => {
  const m = mk('RB', 8); const L = createRewardLedger(); const args = [[m], { RB: m.id }, { RB: { snapsOff: 30 } }];
  afterGame(...args, createRng(1), { autoEvolve: false, ledger: L, activityId: 'fb:1:w1:r:Test' }); const after = JSON.stringify([m.xp, m.dev.bar, m.dev.level]);
  const again = afterGame(...args, createRng(1), { autoEvolve: false, ledger: L, activityId: 'fb:1:w1:r:Test' });
  assert.equal(again.filter((e) => e.kind === 'xp').length, 0); assert.equal(JSON.stringify([m.xp, m.dev.bar, m.dev.level]), after);
});

test('reserve development: 12.5 level XP and 6.25% of a bar; never for a monster who played; at level 50 training only', () => {
  const a = mk('LB', 11), b = mk('LB', 12), c = mk('LB', 13); raiseToLevel(c, 50);
  const ev = practiceAfterGame([a, b, c], [a.id, b.id, c.id], new Set([b.id]), createRng(1), { autoSpend: false, autoEvolve: false });
  const row = (m) => ev.find((e) => e.kind === 'practice' && e.id === m.id);
  assert.equal(row(a).amount, 12.5); assert.equal(row(a).training, 0.0625);
  assert.equal(row(b), undefined, 'no double starter/reserve award');
  assert.equal(row(c).amount, 0); assert.equal(row(c).training, 0.0625);
});

test('the offseason award is separate: 2 banked points, the training bar untouched', () => {
  const m = mk('S', 21); applyAward(m, { xp: 0, training: FR.frac(1, 4) }, createRng(1)); const bar0 = JSON.stringify(m.dev.bar); const bank0 = FR.toNumber(m.dev.bank);
  offseason([m], createRng(2), { autoAllocate: false });
  assert.equal(FR.toNumber(m.dev.bank), bank0 + 2); assert.equal(JSON.stringify(m.dev.bar), bar0);
  assert.ok(bar(m) > 2);
});
