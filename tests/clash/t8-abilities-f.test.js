// Task 8 M4 S11, batch F (disruption, control and the second delayed attack, 9): acceptance contract cases on the real engine, every Dex
// form x mastery tier, plus the B12 frozen-tolerance run for Eclipse Call's application chance (rows frozen before this test).
// Provisional readings (delayed-slot for Faultline; d5-perk for Circuit Breaker) are in tests/clash/t8-provisional-f.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../../src/clash/t8/index.js';
import { simulateClashT8 } from '../../src/clash/t8/engine.js';
import { toleranceFor } from '../../src/clash/t8/tolerances.js';
import { reviewMonster } from '../../src/clash/t8/review.js';
import { contractSuite } from './t8-ability-harness.js';

contractSuite(['WAT-04-C', 'ELE-04-C', 'ICE-06-C', 'WIN-06-C', 'DAR-05-C', 'DAR-06-C', 'PSY-03-C', 'PSY-06-C', 'FIR-06-C']);

test('B12: Eclipse Call application chance 60 / 70 / 80 / 90% by mastery within the frozen tolerances (one roll per battle)', () => {
  for (let tier = 0; tier < 4; tier++) {
    const t = toleranceFor(`eclipse-call-t${tier}`); let rolls = 0, ok = 0;
    for (let i = 0; i < t.n; i++) {
      const r = simulateClashT8({ a: [reviewMonster({ species: 'gravelpup' }, 1), reviewMonster({ species: 'nocturne', tier }, 2)], b: [reviewMonster({ species: 'kindlet' }, 3)], seed: 90_000 + tier * 10_000 + i, config: { ruleset: 't8', policies: { a: 'none', b: 'none' } }, stopAt: { exchange: 1, turn: 1 } });
      const rs = r.log.filter((e) => e.kind === 'roll' && e.abilityId === 'DAR-05-C'); assert.equal(rs.length, 1, 'one roll at the first round start');
      rolls += 1; if (rs[0].success) ok += 1;
    }
    const p = ok / rolls; assert.ok(Math.abs(p - t.p) <= t.h, `tier ${tier}: observed ${p.toFixed(4)} vs ${t.p} +/- ${t.h} (N = ${t.n})`);
  }
});
