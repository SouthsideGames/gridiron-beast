import test from 'node:test';
import assert from 'node:assert/strict';
import { franchiseHistoryView, careerProfile, historicalAwards,
  historicalHallOfFame, monsterRecordHonours } from '../src/franchise/task9-history.js';
import { recordRetiredMonsterCandidates, electMonsterHallOfFame } from '../src/franchise/monster-hof-voting.js';

function longFranchise(years = 35) {
  const f = { club: 'A', history: [], records: { game: {}, season: {}, team: {} },
    monsterHallOfFame: { v: 1, candidates: [], elections: [] } };
  for (let year = 1; year <= years; year++) {
    f.history.push({ year, club: 'A', tier: 'top',
      record: { w: year % 2 ? 9 : 7, l: year % 2 ? 3 : 5 },
      champion: year % 5 === 0 ? 'A' : 'B',
      awards: { league: { mvp: { id: `player-${year}`, name: `Player ${year}`, team: 'A' } } },
      schedule: [{ huge: `season-${year}` }],
    });
    // These records represent verified, compact snapshots of actual retirees.
    const id = `retired-${year}`;
    f.monsterHallOfFame.candidates.push({ id, name: `Veteran ${year}`,
      position: 'QB', retiredYear: year, seasons: 10, games: 120,
      honours: { titles: 2, awards: 4, records: 1 } });
    const result = electMonsterHallOfFame(f.monsterHallOfFame.candidates, year,
      f.monsterHallOfFame.elections);
    f.monsterHallOfFame.elections = result.history;
  }
  return f;
}

test('35 seasons remain individually addressable after JSON save/load roundtrip', () => {
  const original = longFranchise();
  const before = JSON.stringify(original);
  const restored = JSON.parse(before);
  const view = franchiseHistoryView(restored);
  assert.equal(view.completedSeasons, 35);
  assert.equal(view.seasons.length, 35);
  assert.equal(view.ownerTitles, 7);
  assert.equal(view.awards.length, 35);
  assert.equal(view.hallOfFame.elections.length, 35);
  assert.equal(view.seasons[0].year, 1);
  assert.equal(view.seasons[34].year, 35);
  assert.equal(view.awards[0].year, 35);
  assert.equal(view.awards[34].year, 1);
  assert.equal(JSON.stringify(view).includes('huge'), false);
  assert.equal(JSON.stringify(restored), before);
});

test('old and recent retired candidates are independently accessible', () => {
  const f = longFranchise();
  for (const year of [1, 2, 12, 25, 35]) {
    const p = careerProfile(f, `retired-${year}`);
    assert.equal(p.id, `retired-${year}`);
    assert.equal(p.kind, 'snapshot');
    assert.equal(p.complete, false);
    assert.equal(p.stats.games, 120);
  }
  assert.equal(careerProfile(f, 'nonexistent'), null);
  assert.equal(historicalHallOfFame(f).candidates.length, 35);
  assert.equal(historicalAwards(f, 'mvp').length, 35);
});

test('retirement capture requires verified IDs, not just old legend stubs', () => {
  const f = { league: { legends: {
    retired: { id: 'retired', name: 'Retired', position: 'LB',
      seasons: [{ year: 2, reg: { games: 12 } }], ev: [] },
    released: { id: 'released', name: 'Released', position: 'LB',
      seasons: [], ev: [] },
  } } };
  recordRetiredMonsterCandidates(f, { owner: [{ id: 'retired' }],
    league: [], unsignedIds: [] }, 2);
  assert.deepEqual(f.monsterHallOfFame.candidates.map((c) => c.id), ['retired']);
  assert.equal(f.monsterHallOfFame.candidates[0].games, 12);
});

test('history screens use consistent current record holder IDs', () => {
  const f = longFranchise(12);
  f.records.season.passYds = { id: 'retired-1', name: 'Veteran 1',
    year: 1, value: 5000, prev: { id: 'other', value: 4800, year: 0 } };
  const view = franchiseHistoryView(f, 'retired-1');
  assert.equal(view.selectedMonster.p.id, 'retired-1');
  assert.equal(view.selectedMonster.historicalRecognition.retirementYear, 1);
  assert.equal(monsterRecordHonours(f, 'retired-1')[0].value, 5000);
  assert.equal(view.records.find((s) => s.scope === 'season')
    .rows.find((r) => r.category === 'passYds').record.id, 'retired-1');
});
