import test from 'node:test';
import assert from 'node:assert/strict';
import { generateLeagueArchive, validateLeagueArchive } from '../src/franchise/preleague-history.js';

const fixture = () => ({
  seed: 42, club: 'test-club',
  roster: [{ id: 'v1', name: 'Veteran', position: 'QB', age: 29, yearsPro: 8 }],
  league: { clubs: {}, monsters: {} },
});
test('preleague history is deterministic and internally consistent', () => {
  const a = generateLeagueArchive(fixture());
  assert.deepEqual(a, generateLeagueArchive(fixture()));
  assert.equal(a.seasons.length, 8);
  assert.equal(a.careers.v1.seasons.length, 8);
  assert.deepEqual(validateLeagueArchive(a), []);
});
test('rookies have no fabricated professional career', () => {
  const f = fixture();
  f.roster[0].yearsPro = 0;
  assert.equal(Object.keys(generateLeagueArchive(f).careers).length, 0);
});
test('archive validation catches tampered career totals', () => {
  const a = generateLeagueArchive(fixture());
  a.careers.v1.totals.games++;
  assert.ok(validateLeagueArchive(a).some(e => e.includes('Career mismatch')));
});

test('historical standings balance and playoff champion matches final', () => {
  const archive = generateLeagueArchive(fixture());
  for (const season of archive.seasons) {
    assert.equal(season.standings.length, 16);
    assert.equal(season.standings.reduce((n, t) => n + t.w, 0), season.standings.reduce((n, t) => n + t.l, 0));
    assert.equal(season.playoffs.length, 3);
    assert.equal(season.playoffs[2].games[0].winner, season.champion);
    assert.notEqual(season.champion, season.runnerUp);
  }
});
test('historical award winners have matching season books', () => {
  const f = fixture();
  f.roster.push({ id: 'd1', name: 'Defender', position: 'DL', age: 28, yearsPro: 6 });
  const archive = generateLeagueArchive(f);
  assert.deepEqual(validateLeagueArchive(archive), []);
  assert.ok(archive.seasons.some(s => s.awards.league.dpoy?.id === 'd1'));
});
