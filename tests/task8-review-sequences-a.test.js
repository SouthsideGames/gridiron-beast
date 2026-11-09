// Task 8 Reviewer v2 (spec §25 "Both ability reviewers"): every approved football ability, at every form and every mastery tier,
// demonstrates its complete interaction on the first run: one call of reviewSequence plays the staged scenario on the real engine
// to the activation and on through follow-up plays, and all four phases (trigger met -> ability activated -> effect resolved ->
// cleanup) carry evidence from that run's engine records (tests/helpers/review-v2.js). Elements Fire to Wind here; Earth to Dragon in
// task8-review-sequences-b.test.js. Determinism: one variant per family is run twice and gives identical events.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reviewCatalog } from '../src/sim/abilities/review.js';
import { reviewSequence } from '../src/sim/abilities/review-sequence.js';
import { assertComplete, digestOf } from './helpers/review-v2.js';

const ELEMENTS = ['Fire', 'Water', 'Nature', 'Electric', 'Ice', 'Wind'];
const CAT = reviewCatalog().filter((c) => ELEMENTS.includes(c.element));

test('this half covers its elements\' football abilities', () => { assert.equal(CAT.length, 36); });
for (const el of ELEMENTS) {
  test(`${el}: every ability x form x mastery tier shows all four phases on the first run, with cleanup after follow-up plays`, () => {
    let n = 0;
    for (const c of CAT.filter((x) => x.element === el)) for (const form of c.forms) for (const mastery of c.tiers) {
      const tag = `${c.family} ${form} m${mastery}`; const r = reviewSequence({ family: c.family, form, mastery });
      assertComplete(r, tag); assert.equal(r.form, form, tag); assert.equal(r.mastery, mastery, tag); assert.equal(r.abilityId, c.abilityId, tag); n += 1;
      if (form === c.forms[0] && mastery === 0) assert.equal(digestOf(reviewSequence({ family: c.family, form, mastery })), digestOf(r), `${tag}: identical events on a second run`);
    }
    assert.ok(n >= 24, `${el}: ${n} variants`);
  });
}
