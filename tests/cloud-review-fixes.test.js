// Findings of the independent review of the snapshot implementation (GDD §43.13), each reproduced here before it was fixed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim, memoryLocalStorage } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install('viewer-1');
const shared = memoryLocalStorage(); globalThis.localStorage = shared; // two tabs of one browser share it
const [T1, T2, T3] = await Promise.all([1, 2, 3].map((i) => import(`../src/franchise/cloud-save.js?fix=${i}`)));
let k = 0; const ident = () => { k++; return { uid: `f${k}`, createdAt: `2026-05-${String(k).padStart(2, '0')}T00:00:00.000Z` }; };
const fr = (id, savedAt, tag, n = 300_000) => ({ schemaVersion: 6, ...id, savedAt, tag, pad: 'x'.repeat(n) });
const done = async (...tabs) => { for (let i = 0; i < 3000; i++) { let busy = false; for (const t of tabs) if (t.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 5)); } };
const tagOf = async (tab, dev) => (await tab.cloudLoad(dev))?.tag ?? null;
const quota = () => Object.assign(new Error('full'), { code: 'quota_exceeded' });

test('a franchise with neither a uid nor a creation time is not uploaded (it could never be cleaned up or deleted)', async () => {
  sim.reset();
  for (let i = 1; i <= 4; i++) { T1.cloudSave(fr({ uid: null, createdAt: null }, 100 + i, `anon${i}`), { immediate: true }); await done(T1); }
  assert.equal(sim.keys('/cloud/').length, 0, 'nothing stored'); assert.equal(T1.cloudStatus().error, 'unidentified');
});

test('a full cloud hit in the middle of an upload frees that attempt and retries successfully', async () => {
  sim.reset(); const id = ident();
  for (const t of [100, 200]) { T1.cloudSave(fr(id, t, `A${t}`, 1000), { immediate: true }); await done(T1); } // small earlier copies
  // room for one more snapshot and a bit: the new upload fails on its 3rd chunk, and only space freed lets the retry fit
  const limit = sim.keys('/cloud/').length + 3; let first = true;
  sim.hooks.failSet = (path) => { const n = sim.keys('/cloud/').length; if (path.includes('/cloud/') && !sim.docs.has(path) && n >= limit) { first = false; return quota(); } return null; };
  T1.cloudSave(fr(id, 300, 'A300'), { immediate: true }); await done(T1);
  assert.equal(first, false, 'the store did run out of room');
  assert.equal(await tagOf(T2, id), 'A300', 'the newest progress was mirrored after freeing space');
});

test('under quota pressure every franchise keeps its newest copy; the uploading one ends with its new copy and the previous one', async () => {
  sim.reset(); const a = ident(); const b = ident();
  for (const t of [100, 200]) { T1.cloudSave(fr(b, t, `B${t}`), { immediate: true }); await done(T1); }
  for (const t of [300, 400]) { T1.cloudSave(fr(a, t, `A${t}`), { immediate: true }); await done(T1); }
  const deletes = sim.stats.deletes; sim.hooks.failSet = (path) => (path.includes('/cloud/') && sim.stats.deletes === deletes ? quota() : null);
  T1.cloudSave(fr(a, 500, 'A500'), { immediate: true }); await done(T1);
  const commitsOf = (id) => sim.keys('/cloud/snaps/').filter((x) => !x.endsWith('~w') && JSON.parse(sim.docs.get(x)).uid === id.uid).length;
  assert.equal(commitsOf(b), 1, 'the other franchise was trimmed to its newest copy'); assert.equal(await tagOf(T2, b), 'B200');
  assert.equal(commitsOf(a), 2, 'the uploading franchise keeps two'); assert.equal(await tagOf(T2, a), 'A500');
});

test('two tabs of one browser: a deletion recorded offline by one tab is not lost when the other tab records its own', async () => {
  sim.reset(); const a = ident(); const b = ident();
  for (const [id, t] of [[a, 100], [b, 100]]) { T1.cloudSave(fr(id, t, `${id.uid}`), { immediate: true }); await done(T1); }
  await T2.cloudClear({ uid: 'unrelated', createdAt: 'x', savedAt: 1 }); // tab 2 has used its deletion list this session
  sim.hooks.offline = true; await T1.cloudClear({ ...a, savedAt: 100 }); sim.hooks.offline = false; // tab 1 deletes A offline
  await T2.cloudClear({ ...b, savedAt: 100 }); // tab 2 deletes B online: it must keep (and write) tab 1's record too
  assert.equal(await tagOf(T3, a), null, 'A stays deleted for every device'); assert.equal(await tagOf(T3, b), null);
  assert.equal(sim.keys('/cloud/deleted/').length, 3, 'all three markers are in the cloud');
});

test('two tabs of one browser: after one tab deletes the franchise, the other does not adopt another one from the cloud', async () => {
  sim.reset(); const a = ident(); const b = ident();
  T1.cloudSave(fr(b, 50, 'older-franchise'), { immediate: true }); await done(T1);
  T1.cloudSave(fr(a, 100, 'A'), { immediate: true }); await done(T1); // T2 also uploaded something earlier this session:
  T2.cloudSave(fr(a, 101, 'A2'), { immediate: true }); await done(T2);
  await T1.cloudClear({ ...a, savedAt: 101 });
  assert.equal(await tagOf(T2, null), null, 'the other tab sees the device just deleted its franchise');
});

test('first run: a v39.0/v39.1 copy without a creation time is still offered to the device (the game compares dates)', async () => {
  sim.reset();
  sim.docs.set('data/users/viewer-1/save_c0', JSON.stringify({ s: JSON.stringify({ schemaVersion: 6, savedAt: 777, tag: 'old-no-createdAt' }) }));
  sim.docs.set('data/users/viewer-1/save_meta', JSON.stringify({ chunks: 1, savedAt: 777 }));
  assert.equal(await tagOf(T3, { uid: 'migrated', createdAt: null }), 'old-no-createdAt');
});

test('the leftover sweep removes chunks whose writer stopped after its intent was removed, and nothing else', async () => {
  sim.reset(); const id = ident();
  for (const t of [100, 200, 300]) { T1.cloudSave(fr(id, t, `g${t}`), { immediate: true }); await done(T1); }
  const orphan = { gen: '0000000001-orphan00', i: 0, n: 2, ...id, savedAt: 1, s: 'x' }; // older than two newer commits, no intent
  sim.docs.set(`data/users/viewer-1/cloud/chunks/${orphan.gen}_c0`, JSON.stringify(orphan));
  const before = sim.keys('/cloud/chunks/').length;
  T3.cloudSave(fr(id, 400, 'g400'), { immediate: true }); await done(T3); // a fresh session: its first clean-up sweeps once
  assert.ok(!sim.keys('/cloud/chunks/').some((x) => x.includes('orphan')), 'the orphan chunk is gone');
  assert.equal(await tagOf(T2, id), 'g400'); assert.ok(sim.keys('/cloud/chunks/').length <= before);
});
