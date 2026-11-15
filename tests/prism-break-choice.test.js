// Owner revision 2026-11-15 (Prism Break, LIG-04-F): with two or more enemy zones the coach picks which one shatters.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineup } from './tools/lineup.js';
import * as R from '../src/sim/rules.js';
import { placeRect } from '../src/sim/t8/fields.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';

function game() {
  const club = (side, seed) => { const t = lineup(seed, 60); for (const unit of ['offense', 'defense']) for (const [slot, m] of Object.entries(t[unit])) Object.assign(m, { id: `${side}_${unit}_${slot}`, type: 'Dragon', species: null }); return { ...t, id: side, name: side, kicker: { id: `${side}_K`, kick: 60 }, punter: { id: `${side}_P`, kick: 60 } }; };
  const teams = { home: club('home', 11), away: club('away', 12) };
  const state = R.newGame({ ...teams, seed: 7, quarterLength: 900, coinWinner: 'home', choice: 'receive' });
  Object.assign(state, { phase: 'scrimmage', possession: 'home', ballOn: 35, ballLat: 0, t8: { status: {}, fields: { list: [], pending: [], seq: 0 } } });
  const p = teams.away.defense.FS; Object.assign(p, { species: 'prism', form: 'prism:0', type: 'Light' }); state.t8.ability = { [p.id]: { charges: 3, noCharge: false } };
  const add = (f) => { const b = state.t8.fields; const r = placeRect({ id: `Z${++b.seq}`, createdAt: 0, owner: null, ...f });
    b.list.push({ ...r, lat: [...r.lat], yard: [...r.yard], ability: f.ability, payload: null, ownerTeam: 'home', remaining: 999, clock: 'scrimmageAny', clearsAtHalftime: false, createdThisPlay: false }); };
  add({ type: 'Wind', strength: 20, centerLat: 0, width: 12, yardFrom: 40, yardTo: 50, ability: 'w' });
  add({ type: 'Fire', strength: 20, centerLat: 18, width: 8, yardFrom: 22, yardTo: 28, ability: 'f' });
  return { state, teams, p };
}
const types = (s) => s.t8.fields.list.map((z) => z.type).sort();

test('the defending coach is offered every enemy zone, nearest first, and nothing is removed before the pick', () => {
  const { state, teams } = game();
  R.preparePreChoice(state, teams, {}, { chooser: 'away' });
  const c = state.t8.preChoice.prismChoice; assert.ok(c); assert.equal(c.options.length, 2);
  assert.ok(c.options[0].dist <= c.options[1].dist);
  assert.deepEqual(types(state), ['Fire', 'Wind']);
});
test('picking the farther zone removes only that zone and spends the charges', () => {
  const { state, teams, p } = game();
  R.preparePreChoice(state, teams, {}, { chooser: 'away' });
  const far = state.t8.preChoice.prismChoice.options[1];
  R.choosePrismTarget(state, teams, far.id);
  assert.equal(state.t8.preChoice.prismChoice, undefined); assert.equal(state.t8.ability[p.id].charges, 0);
  assert.deepEqual(types(state), [far.type === 'Fire' ? 'Wind' : 'Fire']);
});
test('snapping without a pick breaks the nearest zone (Auto)', () => {
  const { state, teams } = game();
  R.preparePreChoice(state, teams, {}, { chooser: 'away' });
  const near = state.t8.preChoice.prismChoice.options[0];
  R.runScrimmagePlay(state, teams, 'inside_zone', 'cover_3');
  assert.ok(!state.t8.fields.list.some((z) => z.id === near.id));
});
test('an AI Prismara (no human chooser) never waits: it fires on the nearest zone straight away', () => {
  const { state, teams } = game();
  R.preparePreChoice(state, teams, {}, { chooser: 'home' });
  assert.equal(state.t8.preChoice.prismChoice, undefined); assert.equal(state.t8.fields.list.length, 1);
});
test('the reviewer shows the zone breaking, and the chosen-zone variant breaks the coach\'s pick', () => {
  assert.equal(reviewSequence({ family: 'prism' }).ok, true);
  assert.equal(reviewSequence({ family: 'prism', variant: 'interaction-chosen-zone' }).ok, true);
});
