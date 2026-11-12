import test from 'node:test';
import assert from 'node:assert/strict';
import { careerProfile, retiredCandidateProfile } from '../src/franchise/career-profile.js';
import { careerPage } from '../src/franchise/career-page.js';

test('retired Hall candidates remain discoverable after detailed monster pruning', () => {
  const f = {
    roster: [], pool: {}, offseason: {}, draft: {}, draftResults: {}, history: [],
    monsterHallOfFame: {
      candidates: [{ id: 'old-qb', name: 'Old QB', position: 'QB', retiredYear: 6,
        seasons: 9, games: 90, honours: { titles: 2, awards: 3, records: 1 } }],
      elections: [{ year: 9, ballot: [], inductees: [{ id: 'old-qb', name: 'Old QB', inductedYear: 9 }] }],
    },
  };
  const before = JSON.stringify(f);
  const p = careerProfile(f, 'old-qb');
  assert.equal(p.kind, 'snapshot');
  assert.equal(p.complete, false);
  assert.equal(p.stats.games, 90);
  assert.equal(p.honours.hof, true);
  assert.equal(p.trophies.find((t) => t.kind === 'hof')?.count, 1);
  const page = careerPage(f, 'old-qb');
  assert.equal(page.historicalRecognition.retirementYear, 6);
  assert.equal(page.historicalRecognition.induction.inductedYear, 9);
  assert.equal(page.facts.hof, true);
  assert.equal(JSON.stringify(f), before);
});

test('partial retired profiles do not manufacture unrecorded details', () => {
  const p = retiredCandidateProfile({}, { id: 'a', name: 'A', position: 'LB', retiredYear: 4 });
  assert.equal(p.complete, false);
  assert.equal(p.club, null);
  assert.deepEqual(p.books, []);
  assert.equal(p.ovr, null);
});
