// Owner 2026-11-24: sideline markers stand halfway between the numbered lines (the 5, 15, 25, 35 and 45 of both halves), on both
// sidelines at the same yard, never in an end zone: gym leaders' looks and the plain textures. Home grass has none (owner, 2026-11-26).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LOOKS, edgeSvg, markerYards } from '../src/ui/stadium-fx.js';
import { turfSvg } from '../src/ui/stadium-art.js';
import { ENVIRONMENTS, venueFor } from '../src/data/stadiums.js';
import { lookFor } from '../src/ui/stadium-fx.js';
import { CLUB_NAMES } from '../src/data/club-identity.js';
import { fieldSvg } from '../src/ui/field-view.js';

const HALVES = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
const BASE = 100000, SCALE = 1000; // a huge scale, so every drawn y names the yard it belongs to (decoration offsets are a few units)
const Y = (yard) => BASE - yard * SCALE;
const yardsDrawn = (svg) => new Set([...svg.matchAll(/(?:\bcy|\by)="(-?[\d.]+)"|M-?[\d.]+ (-?[\d.]+)/g)].map((m) => Math.round((BASE - Number(m[1] ?? m[2])) / SCALE)));
const whole = { bottom: -10, top: 110 };

test('marker yards: the 5s between the numbers, both halves, stopping at the 5', () => {
  assert.deepEqual(markerYards(whole), HALVES);
  assert.deepEqual(markerYards({ bottom: 22, top: 58 }), [25, 35, 45, 55]);
  assert.deepEqual(markerYards({ bottom: 88, top: 110 }), [95], 'nothing in the end zone');
});
test('every gym leader look puts its markers on the 5s, the same yard on both sidelines', () => {
  for (const id of Object.keys(LOOKS)) {
    const svg = edgeSvg(id, whole, 26, Y, 120 * SCALE); if (!svg) continue;
    assert.deepEqual([...yardsDrawn(svg)].filter((y) => !HALVES.includes(y)), [], `${id}: something drawn off the 5s`);
    for (const y of HALVES) assert.ok(yardsDrawn(svg).has(y), `${id}: a marker at the ${y > 50 ? 100 - y : y}`);
  }
});
test('home grass stadiums: no sideline markers (owner play test 2026-11-26; a Gym Leader\'s look keeps its own)', () => {
  let seen = 0;
  for (const club of Object.keys(CLUB_NAMES)) {
    const venue = venueFor(club, 'k'); if (venue.env !== 'grass') continue; seen++;
    const over = turfSvg(venue, whole, 26, 120 * SCALE, Y).over;
    assert.ok(!over.includes('home-edge'), `${club}: no regional markers`);
    assert.deepEqual([...yardsDrawn(over)].filter((y) => HALVES.includes(y)), [], `${club}: nothing drawn at the marker yards`);
  }
  assert.ok(seen > 0, 'some club plays on home grass');
});
test('every stadium is covered: each non-grass environment has a look', () => {
  assert.deepEqual(Object.keys(ENVIRONMENTS).filter((e) => e !== 'grass' && !lookFor(e)), []);
});
