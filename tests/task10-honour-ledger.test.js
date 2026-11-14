// Decision E (owner 2026-11-14): awards, championships and records are kept in each monster's honour ledger (`careerHonours`),
// independently of the optional career timeline. Saves from before the ledger keep every honour: the ledger is seeded from the
// timeline the first time it is written, and every reader (retirement news, legend records, Hall of Fame case facts) merges both.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runFranchise } from '../tools/franchise-soak.mjs';
import * as Save from '../src/franchise/save.js';
import { addEvent, honourEvents, mergeHonours, setCareerEnabled } from '../src/franchise/career.js';
import { honoursData, honoursText } from '../src/franchise/league.js';
import { legendStub } from '../src/franchise/league-registry.js';
import { caseFacts } from '../src/franchise/monster-hof-voting.js';

const HON = (m) => (m.career?.ev || []).filter((e) => ['award', 'champion', 'record'].includes(e.t)).length;
let base = null;
const franchise = () => (base ||= Save.exportJson(runFranchise(9, { difficulty: 'pro', seasons: 2, check: () => [] }).f));

test('the ledger holds every award, championship and record the timeline holds, and survives save/load', { timeout: 900000 }, () => {
  const f = Save.importJson(franchise()); const all = [...Object.values(f.league.monsters), ...f.roster];
  const decorated = all.filter((m) => HON(m) > 0); assert.ok(decorated.length > 5, 'honours were won in two seasons');
  for (const m of decorated) {
    const fromTimeline = (m.career.ev || []).filter((e) => ['award', 'champion', 'record'].includes(e.t)).map((e) => e.k).sort();
    assert.deepEqual((m.careerHonours || []).map((e) => e.k).sort(), fromTimeline, `${m.name}: the ledger matches the timeline`);
  }
  const g = Save.importJson(Save.exportJson(f)); const m2 = [...Object.values(g.league.monsters), ...g.roster].find((x) => x.id === decorated[0].id);
  assert.deepEqual(m2.careerHonours, decorated[0].careerHonours, 'the ledger is saved and loaded unchanged');
});

test('a save from before the ledger: one new honour never hides the old ones (news, legend record, Hall case)', { timeout: 900000 }, () => {
  const f = Save.importJson(franchise()); const all = [...Object.values(f.league.monsters), ...f.roster];
  for (const m of all) delete m.careerHonours; // as an older build wrote it: honours only in the timeline
  const m = all.sort((a, b) => HON(b) - HON(a))[0]; const before = honoursData(f, m); const factsBefore = caseFacts(legendStub(m, { year: 3, club: 'X' }));
  assert.ok(before.titles + before.records + Object.keys(before.awards).length >= 2, `${m.name} is decorated`);
  addEvent(m, { k: 'award:opoy:99', t: 'award', y: 99, c: 'X', x: { key: 'opoy' } }); // a new honour after the update
  const after = honoursData(f, m);
  assert.equal(after.titles, before.titles, 'championships kept'); assert.equal(after.records, before.records, 'records kept');
  for (const [k, n] of Object.entries(before.awards)) assert.equal(after.awards[k], n + (k === 'opoy' ? 1 : 0), `${k} awards kept`);
  assert.equal(after.awards.opoy, (before.awards.opoy || 0) + 1, 'and the new one added');
  assert.equal(m.careerHonours.length, HON(m), 'the ledger was seeded from his timeline, then the new honour appended once');
  const stub = legendStub(m, { year: 3, club: 'X' }); const facts = caseFacts(stub);
  for (const [k, n] of Object.entries(factsBefore.awardsBy)) assert.ok(facts.awardsBy[k] >= n, `Hall case keeps ${k}`);
  assert.deepEqual(facts.recordsBy, factsBefore.recordsBy, 'Hall case keeps every record');
  assert.ok(stub.ev.some((e) => e.t === 'champion') === before.titles > 0, 'the legend record keeps his championships');
  // a legend preserved by an older save (no careerHonours on the stub) still makes its case from its timeline
  const oldStub = { ...stub }; delete oldStub.careerHonours; assert.deepEqual(caseFacts(oldStub), facts);
});

test('honour helpers and wording', () => {
  assert.deepEqual(mergeHonours([{ k: 'a', t: 'award' }], [{ k: 'a', t: 'award', y: 1 }, { k: 'b', t: 'record' }, { k: 'c', t: 'milestone' }]).map((e) => e.k), ['a', 'b'], 'merged by key; only honours');
  assert.deepEqual(honourEvents({ career: { ev: [{ k: 'x', t: 'champion' }] } }).map((e) => e.k), ['x'], 'an older monster with no ledger');
  assert.equal(honoursText({ awards: { opoy: 2, mvp: 1, smoy: 3 }, titles: 0, records: 0 }).includes('two-time Offensive'), true, 'two awards read "two-time"');
  assert.match(honoursText({ awards: { smoy: 3 } }), /^three-time /);
});

test('with the timeline writers off, retirement honours and the Hall of Fame candidates come out exactly the same', { timeout: 1200000 }, () => {
  const on = runFranchise(9, { difficulty: 'pro', seasons: 4, check: () => [] }).f; // four seasons: honoured monsters retire and reach the Hall ballot
  setCareerEnabled(false); let off; try { off = runFranchise(9, { difficulty: 'pro', seasons: 4, check: () => [] }).f; } finally { setCareerEnabled(true); }
  const retire = (f) => (f.league?.events || []).filter((e) => e.kind === 'retire').map((e) => [e.year, e.id ?? e.name, honoursText(e.honours)]);
  const r1 = retire(on), r2 = retire(off);
  assert.ok(r1.length > 0 && r1.some(([, , t]) => t), 'monsters with honours retired in these seasons');
  assert.deepEqual(r2, r1, 'every retirement news line carries the same honours');
  const hof = (f) => (f.monsterHallOfFame?.candidates || []).map((c) => JSON.stringify(c, (k, v) => (k === 'ev' || k === 'career' ? undefined : v)));
  assert.ok(hof(on).length > 0, 'there are Hall of Fame candidates'); assert.deepEqual(hof(off), hof(on), 'Hall of Fame candidates (scores, awards, records) are identical');
  assert.ok(off.roster.every((m) => !m.career?.ev?.length), 'and nothing was written to the timeline with the writers off');
});
