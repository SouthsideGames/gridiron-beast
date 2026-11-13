import test from 'node:test';
import assert from 'node:assert/strict';
import { franchiseHistoryView, historicalRecords, monsterRecordHonours } from '../src/franchise/task9-history.js';

test('integrated history exposes seasons, awards, records and annual Hall voting', () => {
  const f = {
    history: [{ year: 3, club: 'A', champion: 'A', awards: { league: {
      mvp: { id: 'm1', name: 'Ace', team: 'A' },
    } } }],
    records: { game: { passYds: { value: 400, id: 'm1', name: 'Ace',
      team: 'A', year: 3, prev: { value: 350, id: 'm2', year: 2 } } } },
    monsterHallOfFame: { candidates: [{ id: 'm1', name: 'Ace', retiredYear: 3 }],
      elections: [{ year: 6, ballot: [{ id: 'm1', votes: 15 }],
        inductees: [{ id: 'm1', name: 'Ace', inductedYear: 6 }] }] },
  };
  const before = JSON.stringify(f);
  const view = franchiseHistoryView(f);
  assert.equal(view.completedSeasons, 1);
  assert.equal(view.ownerTitles, 1);
  assert.equal(view.awards[0].id, 'm1');
  assert.equal(view.hallOfFame.elections[0].ballot[0].votes, 15);
  assert.equal(view.hallOfFame.candidates[0].inducted, true);
  assert.equal(view.records.find((s) => s.scope === 'game')
    .rows.find((r) => r.category === 'passYds').record.previous.value, 350);
  assert.equal(monsterRecordHonours(f, 'm1').length, 1);
  assert.equal(monsterRecordHonours(f, 'm2').length, 0);
  assert.equal(JSON.stringify(f), before);
});

test('records gracefully handle missing saved sections', () => {
  const sections = historicalRecords({});
  assert.deepEqual(sections.map((s) => s.scope), ['game', 'season', 'team']);
  assert.ok(sections.every((s) => s.rows.every((r) => r.record === null)));
});
