// Task 10 (owner 2026-11-13): the five coach identities (Air Raid, Ground & Pound, Trickster, Balanced, Tempo). Every AI club has one,
// consistent with its fixed offensive identity; it only shapes which plays of the released book the AI's 6 + 6 leans to; the
// released reserve plays are AI-callable through it; held-back, red-zone-only and desperation calls are never in a base plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITIES, COACH_STYLES, identityFor, coachStyleOf } from '../src/data/identities.js';
import { playbookFor, AI_PLAN_SIZE } from '../src/franchise/roster.js';
import { PLAYS, OFFENSE_IDS, RESERVE_OFFENSE_IDS } from '../src/data/playbook.js';
import { aiCoach } from '../src/franchise/franchise.js';

const STYLES = ['air_raid', 'ground_pound', 'trickster', 'balanced', 'tempo'];
const coachOf = (club) => { const id = identityFor(club); return { passBias: 0.55, aggression: 0.5, identity: { offense: id.offense, defense: id.defense, passStyle: id.passStyle, runStyle: id.runStyle, runFront: id.runFront, style: id.style } }; };

test('every AI club has one of the five coach identities, consistent with its offense; all five are used', () => {
  assert.deepEqual(Object.keys(COACH_STYLES).sort(), [...STYLES].sort());
  for (const [club, e] of Object.entries(IDENTITIES)) {
    assert.ok(STYLES.includes(e.style), `${club}: ${e.style}`);
    if (e.style === 'air_raid' || e.style === 'tempo') assert.equal(e.offense, 'pass', `${club}: an ${e.style} club throws`);
    if (e.style === 'ground_pound') assert.equal(e.offense, 'run', `${club}: a Ground & Pound club runs`);
    assert.ok(COACH_STYLES[e.style].label.length > 2);
  }
  assert.deepEqual([...new Set(Object.values(IDENTITIES).map((e) => e.style))].sort(), [...STYLES].sort(), 'all five appear in the league');
  const f = { club: 'Ember City Beasts', seed: 1, difficulty: 'pro' };
  assert.equal(coachStyleOf(f, 'Ember City Beasts'), null, "the owner's club has no coach identity");
  assert.equal(coachStyleOf(f, 'Canyon Crushers'), 'ground_pound');
  assert.equal(aiCoach(f, 'Canyon Crushers', 1).identity.style, 'ground_pound', 'a gym coach carries his club\'s style');
  assert.equal(aiCoach(f, 'Bayou Stalkers', 1).identity.style, 'trickster', 'an ordinary club\'s coach carries it too');
});

test('each identity\'s 6 + 6 leans to its style, draws on the released book, and never carries a held, red-zone or desperation call', () => {
  const share = {};
  for (const club of Object.keys(IDENTITIES)) {
    const c = coachOf(club); const S = COACH_STYLES[c.identity.style]; const tags = [...S.runTags, ...S.passTags];
    let hit = 0, n = 0, released = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const pb = playbookFor(seed * 7919, c);
      assert.equal(pb.offense.length, AI_PLAN_SIZE); assert.equal(new Set(pb.offense).size, AI_PLAN_SIZE);
      for (const p of pb.offense) {
        assert.ok(OFFENSE_IDS.includes(p), `${p} is in the live book`); assert.ok(!RESERVE_OFFENSE_IDS.includes(p), `${p} is held back`);
        assert.ok(!PLAYS[p].tags.includes('redzone') && !PLAYS[p].tags.includes('desperation'), `${club}: ${p} is not a base call`);
        n++; if (PLAYS[p].reserve) released++; if (tags.length && PLAYS[p].tags.some((t) => tags.includes(t))) hit++;
      }
    }
    assert.ok(released / n > 0.3, `${club}: the released plays are AI-callable (${released}/${n})`);
    (share[c.identity.style] ||= []).push(hit / n);
  }
  // the style's tags are drawn more often than the whole book carries them (the tie of a Balanced coach is the book itself)
  for (const st of STYLES.filter((s) => s !== 'balanced')) {
    const tags = [...COACH_STYLES[st].runTags, ...COACH_STYLES[st].passTags];
    const base = OFFENSE_IDS.filter((p) => !PLAYS[p].tags.includes('redzone') && !PLAYS[p].tags.includes('desperation') && PLAYS[p].tags.some((t) => tags.includes(t))).length / OFFENSE_IDS.length;
    const mean = share[st].reduce((a, b) => a + b, 0) / share[st].length;
    assert.ok(mean > base * 1.3, `${st}: ${(mean * 100).toFixed(0)}% of calls carry its tags, the book ${(base * 100).toFixed(0)}%`);
  }
});
