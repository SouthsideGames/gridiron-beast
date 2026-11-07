import test from 'node:test';
import assert from 'node:assert/strict';
import * as Fd from '../src/sim/t8/fields.js';

test('geometry: inward shift keeps width, length clips at playable bounds, never wider than the field', () => {
  const r = Fd.placeRect({ id: 'a', type: 'Fire', createdAt: 1, centerLat: 25, yardFrom: 105, yardTo: 115, width: 8 });
  assert.equal(+(r.lat[1] - r.lat[0]).toFixed(6), 8); assert.ok(r.lat[1] <= Fd.PLAYABLE.latMax + 1e-9); assert.deepEqual(r.yard, [105, 110]);
  const full = Fd.placeRect({ id: 'b', type: 'Water', createdAt: 1, centerLat: 3, yardFrom: 40, yardTo: 45, width: 999 });
  assert.deepEqual(full.lat.map((v) => +v.toFixed(4)), [-26.6667, 26.6667]);
});

test('overlaps: strongest same-type, approved recipes only, oldest pair for 3+ types, parents exempt, same-type neutrality', () => {
  const R = (id, type, t, s = 10) => Fd.placeRect({ id, type, createdAt: t, centerLat: 0, yardFrom: 40, yardTo: 50, width: 10, strength: s });
  assert.deepEqual(Fd.effectsAt([R('f1', 'Fire', 1, 15), R('f2', 'Fire', 2, 20)], 45, 0, 'Water').base.map((b) => b.strength), [20]);
  const steam = Fd.effectsAt([R('f', 'Fire', 1), R('w', 'Water', 2)], 45, 0, 'Nature'); assert.equal(steam.hybrid.name, 'Steam'); assert.equal(steam.base.length, 0);
  assert.equal(Fd.effectsAt([R('f', 'Fire', 1), R('w', 'Water', 2)], 45, 0, 'Fire').hybrid, null); // parent type exempt
  const unlisted = Fd.effectsAt([R('f', 'Fire', 1), R('i', 'Ice', 2)], 45, 0, 'Nature'); assert.equal(unlisted.hybrid, null); assert.equal(unlisted.base.length, 2);
  // Psychic + Electric (Mindstorm, formed at 3) vs Electric + Metal (Magnetic Storm, formed at 5): oldest pair wins; Metal stays base
  const three = Fd.effectsAt([R('p', 'Psychic', 1), R('e', 'Electric', 3), R('m', 'Metal', 5)], 45, 0, 'Fire');
  assert.equal(three.hybrid.name, 'Mindstorm'); assert.deepEqual(three.base.map((b) => b.type), ['Metal']);
  assert.equal(Fd.effectsAt([R('w', 'Wind', 1)], 45, 0, 'Wind').base.length, 0); // same-type neutrality
  assert.equal(Fd.effectsAt([R('d', 'Dragon', 1)], 45, 0, 'Fire').base.length, 0);
  assert.equal(Fd.combineMaxSpeed([-15, -10]), -25); assert.equal(Fd.combineMaxSpeed([-60, -40]), -75); assert.equal(Fd.combineMaxSpeed([30, 30]), 50); assert.equal(Fd.combineMaxSpeed([-15, 15]), 0);
});
