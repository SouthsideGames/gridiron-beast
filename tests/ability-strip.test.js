// Balance audit R-3 (2026-11-25): the study tools' "abilities off" control must remove abilities from every player source a built
// team carries (slots, kicker, returner, bench and the rotation pool), so the control group fields no ability at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import { generatedTeam } from '../src/franchise/roster.js';
import { playGame } from '../src/sim/game-runner.js';
import { stripTeam, assertStripped, allPlayers, replacePlayer } from '../tools/lib/ability-strip.mjs';

const OFF = { species: null, form: null, ability: null };

test('stripTeam clears every source, keeps ids, and rebuilds the rotation pool from the stripped objects', () => {
  const t = generatedTeam(41, { id: 'h', name: 'Home' });
  assert.ok(allPlayers(t).some((p) => p.species), 'the generated club fields species with abilities');
  const s = stripTeam(t, OFF);
  assertStripped(s, 'stripped');
  assert.deepEqual(allPlayers(s).map((p) => p.id).sort(), allPlayers(t).map((p) => p.id).sort());
  const qb = s.offense.QB; assert.ok(s.rotationInputs.includes(qb), 'the rotation pool holds the same stripped object as the slot');
  assert.ok(allPlayers(t).some((p) => p.species), 'the original team is not mutated');
});

test('an abilities-off game executes no ability, with the rotation running', () => {
  let events = 0;
  const home = stripTeam(generatedTeam(43, { id: 'h', name: 'Home' }), OFF), away = stripTeam(generatedTeam(44, { id: 'a', name: 'Away' }), OFF);
  const s = playGame({ home, away, seed: 45, quarterLength: 180, otPeriods: 1, onStep: (ev) => { events += (ev?.sim?.events || []).filter((e) => e.kind === 'ability').length; } });
  assert.ok(s.finished);
  assert.equal(events, 0);
});

test('stripTeam can limit the strip to one group, and replacePlayer swaps a subject into every source', () => {
  const t = generatedTeam(47, { id: 'h', name: 'Home' });
  const isDef = (p) => ['DL', 'LB', 'CB', 'S'].includes(p.position);
  const s = stripTeam(t, OFF, isDef);
  assertStripped(s, 'defence', isDef);
  const qb = s.offense.QB; const subject = { ...qb, id: 'subject0', name: 'Subject' };
  replacePlayer(s, qb.id, subject);
  assert.equal(s.offense.QB, subject); assert.ok(s.rotationInputs.includes(subject)); assert.ok(!s.rotationInputs.some((p) => p.id === qb.id));
});
