// Beast Dex collection counts (owner ruling 2026-11-07, display fix 2026-11-08): the original 72 families, the 120 Basics and
// all 192 are tallied separately, by family; an evolved form counts once, as its family.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FAMILIES, formsOf } from '../src/data/beast-dex.js';
import { SPECIES_DEX } from '../src/data/species.js';
import { DEX_GROUPS, dexCounts, dexFamilyOf, dexRecord } from '../src/franchise/franchise.js';
import { resetDex } from '../src/franchise/dex-store.js';

const blankFranchise = () => ({ dex: { seen: {}, signed: {} }, season: { year: 1, week: 1 }, club: 'Test Club' });
const fresh = () => { resetDex(); return blankFranchise(); };

test('the three collection groups: 72 original, 120 Basic, 192 in all, disjoint and complete', () => {
  assert.equal(DEX_GROUPS.original.length, 72);
  assert.equal(DEX_GROUPS.basic.length, 120);
  assert.equal(DEX_GROUPS.all.length, 192);
  const o = new Set(DEX_GROUPS.original); const b = new Set(DEX_GROUPS.basic);
  assert.ok(DEX_GROUPS.basic.every((id) => !o.has(id)), 'no family is both original and Basic');
  assert.deepEqual(new Set(DEX_GROUPS.all), new Set([...o, ...b]));
  assert.deepEqual(new Set(DEX_GROUPS.all), new Set(FAMILIES.map((x) => x.id)), 'the groups are the Dex families');
  for (const s of SPECIES_DEX) assert.equal(o.has(s.id), s.rarity !== 'basic', `${s.id} grouped by its rarity`);
});

test('every form (id or name) belongs to exactly its own family', () => {
  let forms = 0;
  for (const fam of FAMILIES) for (const fm of formsOf(fam.id)) {
    forms++;
    assert.equal(dexFamilyOf(fm.id), fam.id, fm.id);
    assert.equal(dexFamilyOf(fm.name), fam.id, fm.name);
    assert.equal(dexFamilyOf({ species: fam.id, stage: fm.stage }), fam.id);
  }
  assert.equal(forms, 222, 'the Dex has 222 forms');
});

test('evolutions do not add family counts: every form of one family counts once', () => {
  const f = fresh(); const fam = FAMILIES.find((x) => formsOf(x.id).length === 3 && x.rarity !== 'basic');
  for (const fm of formsOf(fam.id)) dexRecord(f, { species: fam.id, stage: fm.stage, name: fm.name }, 'seen');
  dexRecord(f, fm3(fam), 'signed');
  const c = dexCounts(f);
  assert.deepEqual([c.original.seen, c.basic.seen, c.all.seen], [1, 0, 1]);
  assert.equal(c.all.signed, 1);
  assert.deepEqual(Object.keys(f.dex.seen), [fam.id], 'recorded under the family id only');
});
const fm3 = (fam) => ({ species: fam.id, stage: 2 });

test('original, Basic and all tally separately and the top-level numbers are the all-192 tally', () => {
  const f = fresh();
  const orig = DEX_GROUPS.original.slice(0, 5); const basic = DEX_GROUPS.basic.slice(0, 7);
  for (const id of orig) dexRecord(f, { species: id }, 'seen');
  for (const id of basic) dexRecord(f, { species: id }, 'signed');
  const c = dexCounts(f);
  assert.deepEqual(c.original, { seen: 5, signed: 0, total: 72 });
  assert.deepEqual(c.basic, { seen: 7, signed: 7, total: 120 });
  assert.deepEqual(c.all, { seen: 12, signed: 7, total: 192 });
  assert.equal(c.seen, 12); assert.equal(c.signed, 7);
});

test('recording every form of every family fills each group exactly, never past its total', () => {
  const f = fresh();
  for (const fam of FAMILIES) for (const fm of formsOf(fam.id)) dexRecord(f, { species: fam.id, stage: fm.stage }, 'seen');
  const c = dexCounts(f);
  assert.deepEqual([c.original.seen, c.basic.seen, c.all.seen], [72, 120, 192]);
});

test('the career collection (another franchise) counts by family too', () => {
  const a = fresh(); dexRecord(a, { species: DEX_GROUPS.original[0], stage: 2 }, 'seen'); dexRecord(a, { species: DEX_GROUPS.basic[0] }, 'seen');
  const b = blankFranchise(); // a second franchise: it sees the player's career collection
  const c = dexCounts(b);
  assert.deepEqual([c.original.seen, c.basic.seen, c.all.seen], [1, 1, 2]);
  const none = dexCounts(null);
  assert.deepEqual([none.original.seen, none.basic.seen, none.all.seen], [1, 1, 2], 'no franchise open: the career collection');
  resetDex();
});
