// Task 8 M4 S9, batch D (reactions, counters, explicit misses, survival, 13): acceptance contract cases on the real engine, every Dex
// form x mastery tier, plus the B12 frozen-tolerance runs (rows frozen in src/clash/t8/tolerances.js before these tests were written):
// Heat Mirage 30/35/40/45%, Shadow Pounce 15/20%, Mind Game 15%. One roll per whole attack is asserted exactly. Provisional readings
// (Stone Divide's contested strikes; Mind Game's D5 perk) are excluded: tests/clash/t8-provisional-d.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { simulateClashT8 } from '../../src/clash/t8/engine.js';
import { toleranceFor } from '../../src/clash/t8/tolerances.js';
import { reviewMonster } from '../../src/clash/t8/review.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['FIR-01-C', 'FIR-04-C', 'FIR-05-C', 'DAR-01-C', 'PSY-05-C', 'ELE-02-C', 'EAR-02-C', 'ELE-05-C', 'ELE-06-C', 'EAR-05-C', 'EAR-03-C', 'NAT-03-C', 'EAR-01-C']);

/** First-roll frequency of `abilityId` for a defender of `species` (stage, tier) hit first by a Basic attacker; one roll per battle. */
function firstRolls(species, { stage = 0, tier = 0 }, abilityId, n, seed0) {
  let rolls = 0, hits = 0;
  for (let i = 0; i < n; i++) {
    const r = simulateClashT8({ a: [reviewMonster({ species: 'kindlet', overall: 50 }, 3)], b: [reviewMonster({ species, stage, tier, overall: 99 }, 4)], seed: seed0 + i, config: { ruleset: 't8', policies: { a: 'none', b: 'none' } }, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] });
    const rs = r.log.filter((e) => e.kind === 'roll' && e.abilityId === abilityId);
    assert.ok(rs.length <= 1, 'one roll per whole attack'); if (!rs.length) continue; rolls += 1; if (rs[0].success) hits += 1;
  }
  return { rolls, p: hits / rolls };
}
const within = (id, got) => { const t = toleranceFor(id); assert.equal(got.rolls, t.n, `${id}: N`); assert.ok(Math.abs(got.p - t.p) <= t.h, `${id}: observed ${got.p.toFixed(4)} vs ${t.p} +/- ${t.h} (N = ${t.n})`); };

test('B12: Heat Mirage diversion 30 / 35 / 40 / 45% by mastery within the frozen tolerances', () => {
  for (let tier = 0; tier < 4; tier++) { const t = toleranceFor(`heat-mirage-t${tier}`); within(`heat-mirage-t${tier}`, firstRolls('pyrelynx', { tier }, 'FIR-05-C', t.n, 20_000 + tier * 10_000)); }
});
test('B12: Shadow Pounce explicit dodge 15% (Umbrikit) / 20% (Obscurat) within the frozen tolerances', () => {
  within('shadow-pounce-umbrikit', firstRolls('shadowkit', { stage: 0 }, 'DAR-01-C', toleranceFor('shadow-pounce-umbrikit').n, 60_000));
  within('shadow-pounce-obscurat', firstRolls('shadowkit', { stage: 1 }, 'DAR-01-C', toleranceFor('shadow-pounce-obscurat').n, 70_000));
});
test('B12: Mind Game afterimage 15% within the frozen tolerance', () => {
  within('mind-game-afterimage', firstRolls('enigmane', {}, 'PSY-05-C', toleranceFor('mind-game-afterimage').n, 80_000));
});
