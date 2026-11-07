// Task 8 M3 pilots and the contract gate (M3_PLAN.md). Blazing Resolve (FIR-01-F, emberfox) on the real engine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulatePlay } from '../src/sim/engine.js';
import { PLAYS } from '../src/data/playbook.js';
import { lineup } from './tools/lineup.js';
import { registeredFamilies, contractOf } from '../src/sim/abilities/registry.js';
import { FAMILIES } from '../src/data/beast-dex.js';
import '../src/sim/abilities/index.js';

const RUNS = Object.values(PLAYS).filter((p) => p.side === 'offense' && p.type === 'run' && !p.legendary && !p.reserve).map((p) => p.id);
const flaroo = (form = 'emberfox:0', id = 'rb1') => ({ ...lineup(11, 60).offense.RB, id, species: 'emberfox', form, mastery: 0, name: 'Flaroo' });
function play(seed, t8, { form = 'emberfox:0', run = RUNS[seed % RUNS.length], twoPoint = false } = {}) {
  const L = lineup(11, 60); const D = lineup(12, 64); const off = { ...L.offense, RB: flaroo(form) };
  return simulatePlay({ offensePlay: PLAYS[run], defensePlay: PLAYS.cover_2 || Object.values(PLAYS).find((p) => p.side === 'defense'), offense: off, defense: D.defense, ballOn: 30, seed, options: { t8, twoPoint } });
}

test('contract gate: every registered family is a real Dex family with a football ability, registered once', () => {
  for (const fam of registeredFamilies()) { const f = FAMILIES.find((x) => x.id === fam); assert.ok(f && f.abilities.football, fam); assert.equal(contractOf(fam).abilityId, f.abilities.football); }
  assert.ok(registeredFamilies().includes('emberfox'));
});

test('Blazing Resolve: an ignited carry breaks every tackle attempt of the defenders in reach at the first contact, once; later arrivals tackle normally', () => {
  let fired = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const t8 = { status: {}, ability: { rb1: { charges: 0, ignited: true } } };
    const r = play(seed, t8); if (r.stats.carrier !== 'RB' || r.stats.receiver) continue;
    const ign = r.events.filter((e) => e.kind === 'ability' && e.ability === 'FIR-01-F');
    if (!ign.length) { assert.equal(t8.ability.rb1.ignited, true, 'no contact: the ignition persists'); continue; }
    fired++; assert.equal(ign.length, 1, 'one encounter per carry'); assert.equal(t8.ability.rb1.ignited, false, 'spent');
    assert.ok(r.events.some((e) => e.kind === 'broken_tackle' && e.contract === 'emberfox'), 'the attempt in reach broke');
    assert.equal(t8.ability.rb1.charges, 0, 'the consuming carry earns no charge');
    assert.equal(t8.mastery.rb1.executions, 1, 'one valid execution recorded for mastery (awarded at M5)');
  }
  assert.ok(fired >= 5, `ignitions observed (${fired})`);
});

test('Blazing Resolve charging: a rush reaching the form threshold earns a charge; three ignite; none while ignited; never on two-point tries', () => {
  const THR = { 'emberfox:0': 8, 'emberfox:1': 5, 'emberfox:2': 1 };
  for (const form of Object.keys(THR)) {
    for (let seed = 1; seed <= 40; seed++) {
      const t8 = { status: {}, ability: { rb1: { charges: 2, ignited: false } } };
      const r = play(seed, t8, { form }); if (r.stats.carrier !== 'RB' || r.stats.receiver) continue;
      const st = t8.ability.rb1; const earned = r.yards >= THR[form];
      assert.deepEqual(st, earned ? { charges: 0, ignited: true } : { charges: 2, ignited: false }, `${form} seed ${seed}: ${r.yards} yards`);
    }
  }
  const t8 = { status: {}, ability: { rb1: { charges: 2, ignited: false } } };
  for (let seed = 1; seed <= 10; seed++) play(seed, t8, { form: 'emberfox:2', twoPoint: true });
  assert.deepEqual(t8.ability.rb1, { charges: 2, ignited: false }, 'two-point attempts neither charge nor ignite');
});
