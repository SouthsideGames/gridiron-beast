import test from 'node:test';
import assert from 'node:assert/strict';
import { franchiseLegacyIndex, franchiseSeasonHistory, historicalAwards, historicalHallOfFame } from '../src/franchise/legacy-index.js';

test('history index is derived without mutating save or retaining detailed logs', () => {
  const f = { club: 'A', history: [
    { year: 2, club: 'A', champion: 'B', record: { w: 5, l: 4 }, leagueStats: { giant: { secret: 1 } }, awards: { mvp: [{ id: 'm2', name: 'Two', team: 'B' }] } },
    { year: 1, club: 'A', champion: 'A', record: { w: 7, l: 2 }, schedule: [{ id: 'g' }], awards: { mvp: [{ id: 'm1', name: 'One', team: 'A' }] } },
  ], monsterHallOfFame: { elections: [{ year: 4, ballot: [{ id: 'm1' }], inductees: [{ id: 'm1', name: 'One' }] }] } };
  const original = JSON.stringify(f);
  const index = franchiseLegacyIndex(f);
  assert.deepEqual(index.seasons.map((s) => s.year), [1, 2]);
  assert.equal(index.ownerTitles, 1);
  assert.equal(index.championships.length, 2);
  assert.equal(index.awards.length, 2);
  assert.equal(index.hallOfFame.inductees.length, 1);
  assert.equal(JSON.stringify(index).includes('secret'), false);
  assert.equal(JSON.stringify(index).includes('schedule'), false);
  assert.equal(JSON.stringify(f), original);
});
test('empty and partial legacy saves are readable', () => {
  assert.deepEqual(franchiseSeasonHistory({}), []);
  assert.deepEqual(historicalAwards({}), []);
  assert.deepEqual(historicalHallOfFame({}).inductees, []);
});
