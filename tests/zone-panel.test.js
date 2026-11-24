// Owner 2026-11-24: the Zones panel says what the zone does, and names any combination a spot would make and what it does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { zonePlannerHtml, zoneEffectText, comboEffectText } from '../src/ui/zone-planner.js';
import { RECIPES } from '../src/sim/t8/fields.js';

const plan = (over = {}) => ({ key: 'a|PSY|0', name: 'Mind Bend', remaining: 3, type: 'Psychic', picked: 'auto',
  placementOptions: [{ id: 'left', label: 'Left', overlaps: [] }, { id: 'mid', label: 'Middle', overlaps: [{ name: 'Mindstorm', parents: ['Psychic', 'Electric'], remaining: 2 }] }, { id: 'right', label: 'Right', overlaps: [] }], ...over });

test('the panel explains the zone instead of the rules for moving it', () => {
  const html = zonePlannerHtml([plan()]);
  assert.doesNotMatch(html, /move with the line/, 'the old policy line is gone');
  assert.match(html, /Psychic zone: Pulls opponents hard toward the middle of the zone\./);
});
test('a spot that would make a combination zone names it, its parents and what it does', () => {
  const html = zonePlannerHtml([plan()]);
  assert.match(html, /Middle makes Mindstorm \(Psychic \+ Electric\): Your runners leave an echo/);
  assert.match(zonePlannerHtml([plan({ placementOptions: [{ id: 'mid', label: 'Middle', overlaps: [{ name: 'Mindstorm', parents: ['Psychic', 'Electric'], remaining: 2, cross: true }] }] })]), /hits both teams/, 'mixing with the other club\'s zone says it hits both');
  assert.doesNotMatch(html, /Left makes|Right makes/, 'spots without a combination say nothing extra');
  assert.match(zonePlannerHtml([plan({ picked: 'mid' })]), /zone-combo picked/, 'the chosen spot\'s combination stands out');
});
test('every zone type and every combination has a description', () => {
  for (const t of ['Fire', 'Water', 'Nature', 'Electric', 'Earth', 'Ice', 'Wind', 'Psychic', 'Dark', 'Light', 'Metal', 'Dragon']) assert.ok(zoneEffectText(t), t);
  for (const r of RECIPES) { assert.ok(comboEffectText(r.parents), r.hybrid); assert.equal(comboEffectText([...r.parents].reverse()), comboEffectText(r.parents)); }
});
