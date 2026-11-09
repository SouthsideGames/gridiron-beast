// Task 8 football ability presentation (docs/task8/FX_FOOTBALL_MATRIX.md): for every approved ability at every form and mastery tier,
// the presentation descriptors are built from the recorded reviewer sequence exactly as the Ability Reviewer builds them, and every
// presentation phase (anticipation, activation, movement, impact, affected-target feedback, persistence, cleanup) has evidence in
// them or is declared not applicable by the look (its Dex visual has no such phase). The activation play is drawn every 0.1 s at
// full, low and min quality without a NaN, with a bounded element count. Earth to Dragon in task8-fx-football-b.test.js.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { LOOKS } from '../src/ui/fx/looks/index.js';
import { prepare, phasesOf, drawPlay, PHASES } from './helpers/fx-football.js';

const ELEMENTS = ['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind'];
const CAT = reviewCatalog().filter((c) => ELEMENTS.includes(c.element));
export const MAX_FX_ELEMENTS = 60; // per frame, every Task 8 effect together (a frame is ~1,300 elements without effects)

test('this half covers 36 football abilities, each with its own look', () => { assert.equal(CAT.length, 36); for (const c of CAT) assert.ok(LOOKS[c.abilityId], `${c.abilityId} has a look`); });
for (const el of ELEMENTS) {
  test(`${el}: every ability x form x mastery shows every presentation phase (or declares it n/a) and draws cleanly at every quality`, () => {
    let n = 0;
    for (const c of CAT.filter((x) => x.element === el)) for (const form of c.forms) for (const mastery of c.tiers) {
      const tag = `${c.abilityId} ${form} m${mastery}`; const r = reviewSequence({ family: c.family, form, mastery }); assert.ok(r.ok, `${tag}: the reviewer sequence completes`);
      const P = prepare(r, c); const ev = phasesOf(r, c, P);
      for (const ph of PHASES) assert.ok(ev[ph], `${tag}: no evidence for the ${ph} phase`);
      const act = P[r.activation]?.fx ? P[r.activation] : P.find((x) => x.fx && x.fx.t8.items.some((it) => it.id === c.abilityId));
      for (const X of [act, P.find((x, i) => i > r.activation && x.fx)].filter(Boolean)) { const d = drawPlay(X); assert.equal(d.bad, null, `${tag}: ${d.bad}`); assert.ok(d.maxEl <= MAX_FX_ELEMENTS, `${tag}: ${d.maxEl} effect elements in one frame`); }
      n += 1;
    }
    assert.ok(n >= 24, `${el}: ${n} variants`);
  });
}
