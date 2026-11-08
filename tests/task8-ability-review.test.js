// Task 8 M3: the runtime-backed football reviewer (engine side, src/sim/abilities/review.js). Every scenario runs on the real game
// runner and engine, and nothing it does reaches a franchise.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog, reviewAbility, subjectSlot } from '../src/sim/abilities/review.js';
import { registeredFamilies } from '../src/sim/abilities/registry.js';

test('catalog: every Dex football ability is listed with its forms and four mastery tiers; registration is reported', () => {
  const cat = reviewCatalog(); assert.equal(cat.length, 72, '72 football abilities');
  for (const c of cat) { assert.ok(c.forms.length >= 1, c.family); assert.deepEqual(c.tiers, [0, 1, 2, 3]); assert.ok(subjectSlot(c.position), `${c.family} has a slot (${c.position})`); }
  for (const f of registeredFamilies()) assert.ok(cat.find((c) => c.family === f).registered, f);
});

test('Blazing Resolve (primed) and Beacon Lane execute on the real engine in a review; the scenario is deterministic', () => {
  for (const family of ['emberfox', 'glimmer']) {
    const r = reviewAbility({ family, seed: 1, games: 4 }); assert.ok(r.found, `${family}: ${r.reason}`); assert.ok(r.executed || r.events.length, family);
    const again = reviewAbility({ family, seed: 1, games: 4 }); assert.equal(again.step, r.step); assert.equal(again.game, r.game); assert.deepEqual(again.after, r.after);
  }
  const p = reviewAbility({ family: 'emberfox', form: 'emberfox:2', mastery: 3 }); assert.equal(p.primed, true); assert.equal(p.before.ignited, true); assert.equal(p.after.ignited, false, 'the ignition was spent');
  assert.ok(p.sim && p.sim.frames.length, 'the executing play carries frames for the replay');
});

test('a review writes nothing outside its own game: no franchise, save or storage modules are reachable from it', async () => {
  const fs = await import('node:fs'); const src = fs.readFileSync(new URL('../src/sim/abilities/review.js', import.meta.url), 'utf8');
  for (const bad of ['save', 'storage', 'franchise.js', 'progression', 'reward-ledger', 'localStorage']) assert.ok(!new RegExp(`from '[^']*${bad}`).test(src), bad);
  const r = reviewAbility({ family: 'nonexistent' }); assert.equal(r.found, false);
});

test('reviewer staging: abilities the AI or the base playbook never reaches are staged on the real engine (Crossed Wires, Dragon Roar as the player call, Night Watch)', () => {
  for (const family of ['flicker', 'vyrnax', 'nightowl']) { const r = reviewAbility({ family, seed: 1, games: 3 }); assert.ok(r.found, `${family}: ${r.reason}`); assert.equal(r.primed, true); }
});

test('a review stops only on the subject\'s own recorded execution (never a charge or ready cue, never an opposing monster of the same family)', () => {
  for (const family of ['mudcub', 'mireclaw', 'ashkit']) { // these used to stop on a cue or on the opponent's monster (M3_RARE_ACTIVATIONS.md)
    const r = reviewAbility({ family, seed: 1, games: 4 }); assert.ok(r.found, `${family}: ${r.reason}`); assert.equal(r.executed, true);
    for (const e of r.events) { assert.ok(e.by == null || e.by === r.slot, `${family}: a cue from his slot only`); }
  }
});
