// Media day (GDD §15): boosts of one nature add up across the week's answers, up to MEDIA_CAP. Deterministic: the week's
// questions are fixed and the answers chosen, so the check never depends on which questions a seed happens to draw.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import { QUESTIONS, isSituational } from '../src/data/media.js';

function franchiseOnMediaDay() {
  const f = F.createFranchise({ owner: { first: 'A', last: 'B', gender: 'Male', portrait: 0, hometown: '' }, club: 'Ember City Beasts', cornerstoneOffense: 'Voltfang', cornerstoneDefense: 'Frostclaw', seed: 55 });
  F.hireDefaultStaff(f); f.season.day = 5; return f;
}
/** Three non-situational questions that each offer an answer of nature `t`, and that answer's index in each. */
function questionsFor(t, n = 3) {
  const out = []; for (const [i, q] of QUESTIONS.entries()) { if (isSituational(q)) continue; const k = q.a.findIndex((a) => a.t === t); if (k >= 0) out.push([i, k]); if (out.length === n) break; }
  return out;
}

test('media day: answers of the same nature accumulate, one MEDIA_BOOST each, never above MEDIA_CAP', () => {
  const t = QUESTIONS.find((q) => !isSituational(q)).a[0].t;
  for (const count of [1, 2, 3]) {
    const f = franchiseOnMediaDay(); const qs = questionsFor(t, 3); assert.equal(qs.length, 3, `three questions offer ${t}`);
    f.week.mediaQs = qs.map(([i]) => i);
    // `count` answers speak for t; the rest pick an answer of another nature
    const answers = qs.map(([i, k], j) => (j < count ? k : QUESTIONS[i].a.findIndex((a) => a.t !== t)));
    const r = F.answerMedia(f, answers);
    assert.equal(r.boosts[t], Math.min(F.MEDIA_CAP, count * F.MEDIA_BOOST), `${count} answer(s) of ${t}`);
  }
});
