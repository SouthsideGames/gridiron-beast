// Task 8 Clash ability presentation (docs/task8/FX_CLASH_MATRIX.md): for every approved Clash ability at every form and mastery tier,
// the presentation descriptors are built from the recorded engine-side reviewer scenario (src/clash/t8/review.js, the real t8 engine)
// exactly as the Clash Ability Reviewer builds them, and every presentation phase (anticipation, activation, movement, impact,
// affected-target feedback, persistence, cleanup) has evidence in them or is declared not applicable by the look (its Dex visual has
// no such phase). The ability's span is drawn every 0.1 s at full, low and min quality without a NaN, with a bounded element count.
// Fire to Wind here; Earth to Dragon in task8-fx-clash-b.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalog, runElement, LOOKS } from './helpers/fx-clash.js';

const ELEMENTS_A = ['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind'];
const CAT = catalog(ELEMENTS_A);
test('this half covers 36 Clash abilities, each with its own look', () => { assert.equal(CAT.length, 36); for (const c of CAT) assert.ok(LOOKS[c.id], `${c.id} has a look`); });
for (const el of ELEMENTS_A) test(`${el}: every Clash ability x form x mastery shows every presentation phase (or declares it n/a) and draws cleanly at every quality`, () => { const n = runElement(el, CAT); assert.ok(n >= 24, `${el}: ${n} variants`); });
