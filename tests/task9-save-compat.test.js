// Task 9 and existing saves: a save written before the Monster Hall of Fame existed opens with an empty Hall (nobody is
// inducted in retrospect), plays on, holds exactly one election per finished season however often it is saved and loaded,
// and keeps every election word for word across exports and imports.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importJson, exportJson, migrate } from '../src/franchise/save.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { franchiseHistoryView, historicalHallOfFame, careerProfile } from '../src/franchise/task9-history.js';
import { electMonsterHallOfFame } from '../src/franchise/monster-hof-voting.js';

const { registerHistoryScreens } = await import('../src/ui/screens/history.js');
const screens = new Map(); registerHistoryScreens({ registerScreen: (n, s) => screens.set(n, s), currentScreen: () => null, go() {}, render() {} }, { f: null, settings: {} });
const fixture = () => { const x = importJson(readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8')); return x.franchise || x.f || x; };

test('a save from before Task 9 opens with an empty Hall and nothing invented', () => {
  const raw = JSON.parse(readFileSync(new URL('./fixtures/save-v10-season2.json', import.meta.url), 'utf8')).franchise;
  assert.equal('monsterHallOfFame' in raw, false, 'the fixture predates Task 9');
  const f = fixture();
  assert.deepEqual(f.monsterHallOfFame, { v: 1, candidates: [], elections: [] });
  assert.equal(f.schemaVersion, raw.schemaVersion, 'the save schema is unchanged');
  const view = franchiseHistoryView(f);
  assert.equal(view.seasons.length, f.history.length); assert.deepEqual(view.hallOfFame.inductees, []);
  for (const name of screens.keys()) for (const params of [{}, { mode: 'award' }, { tab: 'season' }, { view: 'elections' }, { view: 'candidates' }]) { const html = screens.get(name).render({ f, params }); assert.equal(/undefined|NaN|\[object Object\]/.test(html), false, `${name} ${JSON.stringify(params)}`); }
  // loading again changes nothing
  const again = migrate(JSON.parse(JSON.stringify(f))); assert.deepEqual(again.monsterHallOfFame, f.monsterHallOfFame);
});

test('a damaged optional field is repaired without touching what is valid', () => {
  const f = fixture(); const election = { v: 1, year: 0,   // an earlier year: the election of the season just finished stays sealed until its ceremony
     ballot: [], inductees: [{ id: 'm_x', name: 'Old Great', position: 'QB', retiredYear: -3, inductedYear: 0, votes: 15, voters: 15, score: 90 }] };
  for (const broken of [null, 'x', 7, { candidates: 'no', elections: [election] }, { v: 1, candidates: [], elections: null }]) {
    const had = Array.isArray(broken?.elections); const g = JSON.parse(JSON.stringify(f)); g.monsterHallOfFame = broken; const m = migrate(g);
    assert.ok(Array.isArray(m.monsterHallOfFame.candidates) && Array.isArray(m.monsterHallOfFame.elections));
    if (had) { assert.deepEqual(m.monsterHallOfFame.elections, [election], 'a valid election is kept as it was'); assert.equal(careerProfile(m, 'm_x').name, 'Old Great', 'and its inductee still opens'); }
  }
});

test('playing on: one election per finished season, the same after any number of saves and loads', { timeout: 600000 }, () => {
  const before = fixture().history.length;
  const { f, problems } = runFranchise(1, { from: fixture(), seasons: 2 });
  assert.deepEqual(problems.filter((p) => !/fired|blocked/.test(p)), []);
  const played = f.history.length - before; assert.ok(played >= 1, `${played} seasons played`);
  const hall = f.monsterHallOfFame;
  assert.equal(hall.elections.length, played, 'one election for each season finished since Task 9; none for the seasons before it');
  assert.deepEqual(hall.elections.map((e) => e.year), f.history.slice(before).map((h) => h.year));
  for (const c of hall.candidates) { assert.ok(f.league.legends[c.id], `${c.name} has a preserved record`); assert.equal(f.league.legends[c.id].left, c.retiredYear); assert.ok(c.retiredYear > before, 'only retirements seen since Task 9 are candidates'); }
  // export, import, export: identical text, and holding the last election again adds nothing
  const once = exportJson(f); const back = importJson(once); const g = back.franchise || back.f || back;
  assert.deepEqual(g.monsterHallOfFame, hall);
  let h = g; for (let i = 0; i < 3; i++) { const x = importJson(exportJson(h)); h = x.franchise || x.f || x; }
  assert.deepEqual(h.monsterHallOfFame, hall, 'three more round trips');
  const last = hall.elections[hall.elections.length - 1];
  const r = electMonsterHallOfFame(h.monsterHallOfFame.candidates, last.year, h.monsterHallOfFame.elections);
  assert.equal(r.created, false); assert.equal(r.history.length, hall.elections.length, 'the election of a year is never held twice');
  assert.deepEqual(historicalHallOfFame(h), historicalHallOfFame(f));
});
