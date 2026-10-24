// Cloud mirror with three slots (GDD §42.8, decision O as approved): every slot's franchise is protected; an archive is
// uploaded once and kept as one verified copy with no further uploads; a wiped device is offered the cloud's franchises for
// its empty slots and never silently loads one another slot already holds; deletion markers still apply.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install('viewer-1');
const [T1, T2] = await Promise.all([1, 2].map((i) => import(`../src/franchise/cloud-save.js?slots=${i}`)));
let k = 0; const ident = () => { k++; return { uid: `s${k}`, createdAt: `2026-08-${String(k).padStart(2, '0')}T00:00:00.000Z` }; };
const fr = (id, savedAt, tag, extra = {}) => ({ schemaVersion: 6, ...id, savedAt, tag, club: `Club ${id.uid}`, owner: { first: 'A', last: 'B' }, season: { year: 3, week: 2, records: { [`Club ${id.uid}`]: { w: 4, l: 1 } } }, history: [{}, {}], pad: 'x'.repeat(200_000), ...extra });
const done = async (...tabs) => { for (let i = 0; i < 3000; i++) { let busy = false; for (const t of tabs) if (t.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 5)); } };
const commitsOf = (id) => sim.keys('/cloud/snaps/').filter((x) => !x.endsWith('~w') && JSON.parse(sim.docs.get(x)).uid === id.uid);

test('three slots: each franchise keeps its own cloud copies; saving one never touches the others', async () => {
  sim.reset(); const [a, b, c] = [ident(), ident(), ident()];
  for (const [id, t] of [[a, 100], [b, 100], [c, 100]]) { T1.cloudSave(fr(id, t, 'v1'), { immediate: true }); await done(T1); }
  const before = JSON.stringify([...commitsOf(b), ...commitsOf(c)].map((x) => sim.docs.get(x)));
  for (const t of [200, 300, 400]) { T1.cloudSave(fr(a, t, `a${t}`), { immediate: true }); await done(T1); }
  assert.equal(JSON.stringify([...commitsOf(b), ...commitsOf(c)].map((x) => sim.docs.get(x))), before, 'b and c untouched');
  assert.equal(commitsOf(a).length, 2, 'a keeps its two newest');
  assert.equal((await T2.cloudLoad(a)).tag, 'a400'); assert.equal((await T2.cloudLoad(b)).tag, 'v1');
  const list = await T2.cloudFranchises(); assert.deepEqual(list.map((x) => x.uid).sort(), [a.uid, b.uid, c.uid].sort());
  assert.equal(list.find((x) => x.uid === a.uid).meta.club, `Club ${a.uid}`, 'the list carries display fields');
});

test('archive once: a retired franchise is uploaded as one archived copy; its older snapshots go; nothing uploads again', async () => {
  sim.reset(); const a = ident();
  for (const t of [100, 200]) { T1.cloudSave(fr(a, t, `a${t}`), { immediate: true }); await done(T1); }
  const archived = fr(a, 300, 'archive', { lifecycle: { status: 'retired', legacy: { v: 1 } } });
  T1.cloudSave(archived, { immediate: true, archive: true }); await done(T1);
  const commits = commitsOf(a); assert.equal(commits.length, 1, 'one copy: the archive'); assert.equal(JSON.parse(sim.docs.get(commits[0])).archive, true);
  assert.equal((await T2.cloudLoad(a)).tag, 'archive');
  const sets = sim.stats.sets; T1.cloudSave(archived, { immediate: true, archive: true }); await done(T1);
  assert.equal(sim.stats.sets, sets, 'the same archive is not uploaded twice');
  assert.equal((await T2.cloudFranchises()).find((x) => x.uid === a.uid).archive, true);
});

test('quota pressure never removes an archive (the newest copy of a franchise is always kept)', async () => {
  sim.reset(); const a = ident(); const b = ident();
  T1.cloudSave(fr(a, 100, 'archive-a', { lifecycle: { status: 'fired', legacy: {} } }), { immediate: true, archive: true }); await done(T1);
  for (const t of [100, 200]) { T1.cloudSave(fr(b, t, `b${t}`), { immediate: true }); await done(T1); }
  const d0 = sim.stats.deletes; sim.hooks.failSet = (p) => (p.includes('/cloud/') && sim.stats.deletes === d0 ? Object.assign(new Error('full'), { code: 'quota_exceeded' }) : null);
  T1.cloudSave(fr(b, 300, 'b300'), { immediate: true }); await done(T1);
  assert.equal((await T2.cloudLoad(a)).tag, 'archive-a', 'the archive survived the eviction'); assert.equal((await T2.cloudLoad(b)).tag, 'b300');
});

test('a wiped device: an empty slot is offered the cloud franchises, but never one another slot on this device already holds', async () => {
  sim.reset(); const a = ident(); const b = ident();
  T1.cloudSave(fr(a, 100, 'A'), { immediate: true }); await done(T1); T1.cloudSave(fr(b, 900, 'B-newer'), { immediate: true }); await done(T1);
  assert.equal((await T2.cloudLoad(null, { exclude: [{ uid: b.uid }] })).tag, 'A', 'slot 2 holds B already: the empty slot gets A');
  assert.equal(await T2.cloudLoad(null, { exclude: [{ uid: a.uid }, { uid: b.uid }] }), null, 'both held: nothing is loaded silently');
  assert.equal((await T2.cloudLoad(null)).tag, 'B-newer', 'nothing held: the newest');
});

test('deleting a franchise from one slot removes it from the cloud list and voids its copies, other slots unaffected', async () => {
  sim.reset(); const a = ident(); const b = ident();
  T1.cloudSave(fr(a, 100, 'A'), { immediate: true }); await done(T1); T1.cloudSave(fr(b, 100, 'B'), { immediate: true }); await done(T1);
  await T1.cloudClear({ ...a, savedAt: 100 });
  assert.deepEqual((await T2.cloudFranchises()).map((x) => x.uid), [b.uid]); assert.equal(await T2.cloudLoad(a), null); assert.equal((await T2.cloudLoad(b)).tag, 'B');
});
