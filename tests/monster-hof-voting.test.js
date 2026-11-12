import test from 'node:test';
import assert from 'node:assert/strict';
import { monsterHofBallot, electMonsterHallOfFame, monsterHofInductees, recordRetiredMonsterCandidates, WAIT_SEASONS } from '../src/franchise/monster-hof-voting.js';

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

test('records only retired monsters with preserved evidence, never a generic leaver', () => {
  const f = { league: { legends: {
    'retired-1': { name: 'Star', position: 'QB', left: 5, seasons: [{ year: 5, reg: { games: 8 } }], ev: [{ t: 'award' }] },
    'released': { name: 'Released', position: 'WR', left: 5, seasons: [] },
  } } };
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'retired-1' }], league: [] }, 5);
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'retired-1' }], league: [] }, 5);
  assert.equal(f.monsterHallOfFame.candidates.length, 1);
  assert.equal(f.monsterHallOfFame.candidates[0].retiredYear, 5);
  assert.equal(f.monsterHallOfFame.candidates[0].honours.awards, 1);
  assert.equal(f.monsterHallOfFame.candidates[0].games, 8);
  assert.equal(monsterHofBallot(f.monsterHallOfFame.candidates, 8).length, 1);
});

test('historical elections survive JSON save and reload unchanged', () => {
  const f = { monsterHallOfFame: { v: 1, candidates: [star, peer], elections: [] } };
  const first = electMonsterHallOfFame(f.monsterHallOfFame.candidates, 8);
  f.monsterHallOfFame.elections = first.history;
  const loaded = JSON.parse(JSON.stringify(f));
  assert.deepEqual(loaded.monsterHallOfFame, f.monsterHallOfFame);
  const repeated = electMonsterHallOfFame(loaded.monsterHallOfFame.candidates, 8, loaded.monsterHallOfFame.elections);
  assert.equal(repeated.created, false);
  assert.deepEqual(repeated.history, first.history);
});
test('missing or malformed candidate arrays are repaired without inventing candidates', () => {
  const f = { league: { legends: {} }, monsterHallOfFame: { candidates: null, elections: null } };
  recordRetiredMonsterCandidates(f, { owner: [], league: [] }, 8);
  assert.deepEqual(f.monsterHallOfFame.candidates, []);
  assert.deepEqual(f.monsterHallOfFame.elections, []);
});

test('decorated unsigned retirees are captured only when retirement pass verifies their IDs', () => {
  const f = { league: { legends: {
    'unsigned-1': { name: 'Veteran', position: 'WR', seasons: [{ reg: { games: 12 } }],
      ev: [{ t: 'award' }] },
    'released-1': { name: 'Released', position: 'WR', seasons: [], ev: [] },
  } } };
  recordRetiredMonsterCandidates(f, {
    owner: [], league: [], unsigned: 1, unsignedIds: [{ id: 'unsigned-1' }],
  }, 10);
  assert.deepEqual(f.monsterHallOfFame.candidates.map((c) => c.id), ['unsigned-1']);
  assert.equal(f.monsterHallOfFame.candidates[0].games, 12);
  assert.equal(f.monsterHallOfFame.candidates[0].honours.awards, 1);
});
