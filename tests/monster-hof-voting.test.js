import test from 'node:test';
import assert from 'node:assert/strict';
import { monsterHofBallot, electMonsterHallOfFame, monsterHofInductees, WAIT_SEASONS } from '../src/franchise/monster-hof-voting.js';

const star = { id: 'retired-1', name: 'Star', position: 'QB', retiredYear: 5, seasons: 12, games: 110, honours: { titles: 3, awards: 4, records: 2 } };
const peer = { id: 'retired-2', name: 'Peer', position: 'LB', retiredYear: 5, seasons: 11, games: 90, honours: { titles: 2, awards: 3, records: 1 } };

test('requires three fully completed seasons since retirement', () => {
  assert.equal(WAIT_SEASONS, 3);
  assert.equal(monsterHofBallot([star], 7).length, 0);
  assert.equal(monsterHofBallot([star], 8).length, 1);
});
test('ballots are deterministic, independent of input order, and do not mutate candidates', () => {
  const before = JSON.stringify([star, peer]);
  const a = monsterHofBallot([star, peer], 9);
  assert.deepEqual(a, monsterHofBallot([peer, star], 9));
  assert.equal(JSON.stringify([star, peer]), before);
  assert.equal(a[0].voters, 15);
});
test('elections are idempotent and past inductees cannot be inducted twice', () => {
  const first = electMonsterHallOfFame([star, peer], 9);
  assert.equal(first.created, true);
  assert.equal(electMonsterHallOfFame([star, peer], 9, first.history).created, false);
  const second = electMonsterHallOfFame([star, peer], 10, first.history);
  const ids = monsterHofInductees(second.history).map((c) => c.id);
  assert.equal(ids.length, new Set(ids).size);
});
test('never invents candidates or inducts active monsters', () => {
  assert.equal(monsterHofBallot([], 20).length, 0);
  assert.equal(monsterHofBallot([{ ...star, retiredYear: undefined }], 20).length, 0);
});
