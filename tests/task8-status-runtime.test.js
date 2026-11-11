// Task 8 M2: the shared status slot in a football game (spec §10; B18). Synthetic producers stand in for abilities (M3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../src/sim/rules.js';
import * as S from '../src/sim/t8/status-runtime.js';
import { lineup } from './tools/lineup.js';
import { OFFENSE_IDS, DEFENSE_IDS } from '../src/data/playbook.js';

const team = (name, L) => ({ id: name, name, offense: L.offense, defense: L.defense, kicker: { attrs: { kicking: 70 } }, returner: { attrs: { speed: 70, agility: 70 } } });
const withIds = (L, tag) => { for (const side of ['offense', 'defense']) for (const [slot, x] of Object.entries(L[side])) x.id = `${tag}_${side}_${slot}`; return L; };

test('the shared gate: one slot per monster; the application play does not count; participation clocks; within-play statuses clear at the whistle', () => {
  const st = {}; assert.equal(S.applyStatus(st, 'm1', { id: 'slowed', strength: 1, duration: 2 }).accepted, true);
  assert.equal(S.applyStatus(st, 'm1', { id: 'weakened', strength: 1, duration: 2 }).accepted, false, 'a different status is blocked');
  S.afterPlay(st, ['m1']); assert.equal(S.statusOf(st, 'm1').remaining, 2, 'the application play is not counted');
  S.afterPlay(st, ['m2']); assert.equal(S.statusOf(st, 'm1').remaining, 2, 'a play he did not take part in is not counted');
  S.afterPlay(st, ['m1']); S.afterPlay(st, ['m1']); assert.equal(S.statusOf(st, 'm1'), null, 'expired after two participated plays');
  S.applyStatus(st, 'm3', { id: 'stumbled', strength: 1, duration: 0, restOfPlay: true }); S.afterPlay(st, ['m3']); assert.equal(S.statusOf(st, 'm3'), null, 'Stumbled clears at the whistle');
  S.applyStatus(st, 'm4', { id: 'healingReduced', strength: 1, duration: 2 }); assert.equal(S.statusOf(st, 'm4'), null, 'Clash-only statuses never apply in football');
});

test('a counted Stunned carried into a play keeps him out of that whole play; the game end clears every status', () => {
  const H = withIds(lineup(11, 60), 'h'), A = withIds(lineup(12, 64), 'a');
  const g = R.newGame({ home: team('Home', H), away: team('Away', A), seed: 5, quarterLength: 120 });
  const teams = { home: team('Home', H), away: team('Away', A) }; R.doKickoff(g, teams); assert.equal(g.phase, 'scrimmage');
  const qb = teams[g.possession].offense.QB.id;
  S.applyStatus(g, qb, { id: 'stunned', strength: 1, duration: 1 }); S.afterPlay(g, [qb]); // carried: one counted play left
  assert.equal(S.sitsOutPlay(g, qb), true);
  const { sim } = R.runScrimmagePlay(g, teams, OFFENSE_IDS[0], DEFENSE_IDS[0]);
  assert.ok(sim); assert.equal(S.statusOf(g, qb), null, 'the Stunned play counted and expired');
  S.applyStatus(g, qb, { id: 'slowed', strength: 1, duration: 5 }); S.atGameEnd(g); assert.equal(S.statusOf(g, qb), null);
});

test('stamina (spec §12): capacity equals permanent Durability; each played play drains 1; halftime restores half; at zero the monster is exhausted for the game and his attributes are halved', async () => {
  const K = await import('../src/sim/t8/stamina-runtime.js'); const FR = await import('../src/core/fraction.js');
  const st = {}; const x = { id: 'm1', attrs: { durability: 70 }, permDurability: 3 };
  K.afterPlay(st, [x, x]); assert.equal(FR.toNumber(st.t8.stamina.m1.stamina), 2, 'one drain per play, however many slots');
  K.afterPlay(st, [x]); K.afterPlay(st, [x]); assert.equal(st.t8.stamina.m1.exhausted, true); assert.ok(K.exhaustedSet(st).has('m1'));
  K.halftime(st); assert.equal(FR.toNumber(st.t8.stamina.m1.stamina), 1.5); assert.equal(st.t8.stamina.m1.exhausted, true, 'halftime never erases exhaustion');
  const { simulatePlay } = await import('../src/sim/engine.js'); const { PLAYS } = await import('../src/data/playbook.js');
  const L = lineup(11, 60); const rb = { ...L.offense.RB, id: 'rb1' };
  const a = simulatePlay({ offensePlay: PLAYS.dive, defensePlay: PLAYS.cover_3, offense: { ...L.offense, RB: rb }, defense: lineup(12, 64).defense, ballOn: 30, seed: 4, options: { trace: true } });
  const b = simulatePlay({ offensePlay: PLAYS.dive, defensePlay: PLAYS.cover_3, offense: { ...L.offense, RB: rb }, defense: lineup(12, 64).defense, ballOn: 30, seed: 4, options: { trace: true, exhausted: new Set(['rb1']) } });
  assert.notDeepEqual(a.frames, b.frames, 'the exhausted running back plays on halved attributes');
});
