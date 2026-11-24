// Coach names (owner 2026-11-23): the owner's 400 first and 400 last names feed the name dice in setup and the other clubs'
// head coaches of new franchises. Franchises created before keep the coaches they had, through save and load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as Save from '../src/franchise/save.js';
import { headCoachName } from '../src/franchise/awards.js';
import { ALL_TEAMS } from '../src/data/league.js';
import { GYM_BY_CLUB } from '../src/data/gyms.js';
import { COACH_FIRST_NAMES, COACH_LAST_NAMES } from '../src/data/staff.js';
import { randomCoachName } from '../src/ui/screens/onboarding.js';

test('the lists hold 400 distinct one-word names each', () => {
  for (const xs of [COACH_FIRST_NAMES, COACH_LAST_NAMES]) { assert.equal(xs.length, 400); assert.equal(new Set(xs).size, 400); assert.ok(xs.every((x) => /^[A-Z][a-z]+$/.test(x)), 'one capitalised word'); }
  assert.ok(COACH_FIRST_NAMES.includes('Kareem') && COACH_LAST_NAMES.includes('Windfall'));
});
test('the name dice draws from the lists and never repeats the name on screen', () => {
  let i = 0; const seq = [0.1, 0.1, 0.1, 0.1, 0.5, 0.9]; const random = () => seq[i++ % seq.length];
  const a = randomCoachName({}, random), b = randomCoachName(a, random);
  assert.ok(COACH_FIRST_NAMES.includes(a.first) && COACH_LAST_NAMES.includes(a.last));
  assert.notDeepEqual(a, b);
});
test('a new franchise\'s clubs are coached from the new lists, every coach distinct', () => {
  const f = F.createFranchise({ owner: { first: 'N', last: 'C' }, club: 'Riverbend Rapids', seed: 4242 });
  assert.equal(f.coachNames, 2);
  const coaches = ALL_TEAMS.filter((c) => c !== f.club && !GYM_BY_CLUB[c]).map((c) => F.coachNameOf(f, c));
  assert.equal(new Set(coaches).size, coaches.length);
  for (const n of coaches) { const [first, ...rest] = n.split(' '); assert.ok(COACH_FIRST_NAMES.includes(first) && COACH_LAST_NAMES.includes(rest.join(' ')), n); }
  const back = Save.importJson(Save.exportJson(f)); assert.equal(back.coachNames, 2); assert.equal(F.coachNameOf(back, 'Harbor Anchors'), F.coachNameOf(f, 'Harbor Anchors'));
});
test('a franchise created before keeps every club\'s coach, through save and load', () => {
  const f = F.createFranchise({ owner: { first: 'O', last: 'C' }, club: 'Riverbend Rapids', seed: 4242 }); delete f.coachNames; // as written by v43.44 and earlier
  const before = ALL_TEAMS.map((c) => F.coachNameOf(f, c));
  assert.deepEqual(before, ALL_TEAMS.map((c) => headCoachName(c, { seed: 4242, playerClub: f.club, playerCoach: F.coachNameOf(f, f.club) })), 'the original lists');
  const back = Save.importJson(Save.exportJson(f)); assert.equal(back.coachNames, undefined);
  assert.deepEqual(ALL_TEAMS.map((c) => F.coachNameOf(back, c)), before);
});
