// Task 8 M4 S7, batch B (protection and self / team statuses, 13): acceptance contract cases on the real engine, every Dex form x mastery
// tier, plus the B12 frozen-tolerance run for Snowbank Shot's 80% launch accuracy. Provisional readings are excluded (owner ruling
// 2026-11-09 rule 1): Forge Swipe at Developing / Mastered and Fortress's capped payout are accepted by their `awaiting ruling` report;
// their provisional cases are in tests/clash/t8-provisional-b.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { simulateClashT8 } from '../../src/clash/t8/engine.js';
import { toleranceFor } from '../../src/clash/t8/tolerances.js';
import { reviewMonster } from '../../src/clash/t8/review.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['WAT-03-C', 'NAT-05-C', 'EAR-06-C', 'ICE-03-C', 'ICE-04-C', 'ICE-05-C', 'WIN-05-C', 'MET-01-C', 'MET-02-C', 'MET-05-C', 'MET-06-C', 'PSY-02-C', 'DRA-04-C']);

test('B12 (frozen before this test): Snowbank Shot launch accuracy 80% within the frozen tolerance over the frozen sample size', () => {
  const t = toleranceFor('snowbank-launch'); assert.equal(t.p, 0.8); assert.equal(t.h, 0.03);
  let launched = 0, rolls = 0;
  for (let i = 0; i < t.n; i++) {
    const r = simulateClashT8({ a: [reviewMonster({ species: 'frostclaw' }, 1)], b: [reviewMonster({ species: 'gravelpup', overall: 99 }, 2)], seed: 10_000 + i, config: { ruleset: 't8', policies: { a: 'none', b: 'none' } }, log: 'full', stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] });
    const roll = r.log.find((e) => e.kind === 'roll' && e.abilityId === 'ICE-03-C'); if (!roll) continue; rolls += 1; if (roll.success) launched += 1;
  }
  assert.equal(rolls, t.n, 'one launch roll per battle');
  const p = launched / rolls; assert.ok(Math.abs(p - t.p) <= t.h, `observed ${p.toFixed(4)} vs ${t.p} +/- ${t.h} (N = ${t.n})`);
});
