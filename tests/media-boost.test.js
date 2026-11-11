// Media day (GDD §15): answers no longer boost monsters by nature (retired, N7c B14). After the comedy overhaul (2026-11-11)
// the four response styles are flavour; the only gameplay effects left are the two older ones, rival hype and the spotlight.
// Deterministic: the week's questions are fixed by the save, and every combination of styles is tried.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';

function franchiseOnMediaDay() {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 55 });
  F.hireDefaultStaff(f); f.season.day = 5; return f;
}

test('media day: no combination of response styles gives a nature boost; the result carries only hype and star', () => {
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) for (let c = 0; c < 4; c++) {
    const f = franchiseOnMediaDay(); const qs = F.mediaQuestions(f);
    const r = F.answerMedia(f, [a, b, c]);
    assert.deepEqual(r.boosts, {}, `styles ${a},${b},${c}: nature boosts are retired (N7c B14)`);
    assert.deepEqual(f.week.media.boosts, {});
    assert.equal(r.hype, [a, b, c].some((k, i) => !!qs[i].a[k].hype), 'hype only when a hype answer was chosen');
    assert.equal(!!r.star, [a, b, c].some((k, i) => !!qs[i].a[k].star), 'spotlight only when a spotlight answer was chosen');
    assert.equal(f.rattled ?? false, false, 'nothing is settled before Sunday');
  }
});
