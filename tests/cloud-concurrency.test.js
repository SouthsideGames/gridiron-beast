// Cloud mirror under concurrency (GDD §43.8). Several tabs or devices share one simulated store: last-writer-wins documents,
// no transactions, requests that can be delayed, reordered or never finish. Each "tab" is an independent instance of the cloud
// module (its own memory, like a separate tab or device). Gates hold chosen requests, so the interleavings are deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install('viewer-1');
const [T1, T2, T3, T4] = await Promise.all([1, 2, 3, 4].map((i) => import(`../src/franchise/cloud-save.js?tab=${i}`)));
let k = 0; const ident = () => { k++; return { uid: `c${k}`, createdAt: `2026-03-${String(k).padStart(2, '0')}T00:00:00.000Z` }; };
const fr = (id, savedAt, tag, n = 300_000, ch = 'x') => ({ schemaVersion: 6, ...id, savedAt, tag, pad: ch.repeat(n) });
const done = async (...tabs) => { for (let i = 0; i < 3000; i++) { let busy = false; for (const t of tabs) if (t.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 5)); } };
const tagOf = async (tab, dev) => (await tab.cloudLoad(dev))?.tag ?? null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const commits = () => sim.keys('/cloud/snaps/').filter((x) => !x.endsWith('~w'));

test('two tabs uploading at once: chunks never mix and the newest whole copy is read', async () => {
  sim.reset(); const id = ident(); sim.hooks.latency = () => Math.random() * 6;
  T1.cloudSave(fr(id, 10_000, 'A', 400_000, 'A'), { immediate: true }); T2.cloudSave(fr(id, 11_000, 'B', 400_000, 'B'), { immediate: true });
  await done(T1, T2);
  const got = await T1.cloudLoad(id); assert.equal(got?.tag, 'B'); assert.ok(/^B+$/.test(got.pad), 'no chunk from A');
});

test('three tabs uploading with random delays: the copy read never goes backwards and is never missing once one exists', async () => {
  sim.reset(); const id = ident(); sim.hooks.latency = () => Math.random() * 8;
  let t = 20_000, best = 0; const tabs = [T1, T2, T3];
  for (let round = 0; round < 12; round++) {
    for (const tab of tabs) { t += 1 + Math.floor(Math.random() * 3); tab.cloudSave(fr(id, t, `r${t}`, 150_000), { immediate: Math.random() < 0.7 }); }
    await sleep(15);
    const got = await T4.cloudLoad(id);
    if (best) assert.ok(got, `round ${round}: a copy existed, so one must be read`);
    if (got) { assert.ok(got.savedAt >= best, `round ${round}: went backwards ${got.savedAt} < ${best}`); best = got.savedAt; }
  }
  await done(...tabs); const last = await T4.cloudLoad(id); assert.ok(last.savedAt >= best);
  assert.ok(commits().length <= 2 + 3, `clean-up kept the store small (${commits().length} commits)`);
});

test('a clean-up whose deletions are delayed until after newer uploads never removes the newest copy', async () => {
  sim.reset(); const id = ident();
  for (const s of [100, 200]) { T1.cloudSave(fr(id, s, `g${s}`), { immediate: true }); await done(T1); }
  // tab 2 uploads 300; its clean-up (which may remove 100) is held on its first deletion
  const del = sim.gate('delete', () => true);
  T2.cloudSave(fr(id, 300, 'g300'), { immediate: true }); await del.reached;
  for (const s of [400, 500, 600]) { T3.cloudSave(fr(id, s, `g${s}`), { immediate: true }); await done(T3); } // meanwhile three newer uploads and clean-ups
  del.release(); await done(T2); // the stale deletions finally arrive
  assert.equal(await tagOf(T4, id), 'g600');
  assert.ok(commits().length >= 2, 'the two newest commits remain');
});

test('an upload interrupted midway (the tab closed) is ignored, and cleaned up once two newer copies exist', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 1000, 'base'), { immediate: true }); await done(T1);
  const stuck = sim.gate('set', (p) => /_c1$/.test(p) && p.includes('/chunks/')); // T3's upload never gets past its second chunk
  T3.cloudSave(fr(id, 1500, 'interrupted'), { immediate: true }); await stuck.reached;
  assert.equal(await tagOf(T4, id), 'base', 'the half-written copy is ignored');
  for (const s of [2000, 3000]) { T1.cloudSave(fr(id, s, `n${s}`), { immediate: true }); await done(T1); }
  const left = sim.keys('/cloud/').filter((p) => p.includes(Math.floor(1500).toString(36).padStart(10, '0')));
  assert.deepEqual(left, [], 'its intent and chunks were removed');
  stuck.release(); await done(T3); // the tab wakes up and finishes writing an old, partly removed copy
  assert.equal(await tagOf(T4, id), 'n3000');
  T1.cloudSave(fr(id, 4000, 'n4000'), { immediate: true }); await done(T1);
  assert.equal(sim.keys('/cloud/').filter((p) => p.includes(Math.floor(1500).toString(36).padStart(10, '0'))).length, 0, 'the late leftovers are cleaned up too');
});

// ------------------------------------------------------------ deletion
test('deletion: throttled and queued uploads of this tab, and later uploads of an older state from other tabs, never bring it back', async () => {
  sim.reset(); const id = ident(); const other = ident();
  T1.cloudSave(fr(other, 500, 'other-franchise'), { immediate: true }); await done(T1);
  T1.cloudSave(fr(id, 1000, 'kept-before'), { immediate: true }); await done(T1);
  const slow = sim.gate('set', (p) => p.includes('/chunks/'));
  T1.cloudSave(fr(id, 1100, 'in-flight'), { immediate: true }); await slow.reached;
  T1.cloudSave(fr(id, 1200, 'queued'), { immediate: true }); T1.cloudSave(fr(id, 1300, 'throttled'));
  const clearing = T1.cloudClear({ ...id, savedAt: 1300 }); slow.release(); await clearing; await done(T1);
  T2.cloudSave(fr(id, 1250, 'other-tab-older'), { immediate: true }); await done(T2); // another tab still holding the franchise
  assert.equal(await tagOf(T4, id), null, 'gone for a device that still has it');
  assert.equal(await tagOf(T1, null), null, 'this device just deleted it: nothing is adopted automatically');
  assert.equal(T2.cloudStatus().error, 'deleted', 'the other tab is told it is no longer backed up');
  assert.equal(await tagOf(T4, other), 'other-franchise', 'another franchise is untouched');
  assert.equal(sim.keys('/cloud/').filter((p) => p.includes('/chunks/') && JSON.parse(sim.docs.get(p)).uid === id.uid).length, 0, 'its snapshots were removed');
});

test('deletion: a deletion made offline and written days later never wipes progress made since on another device', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 1000, 'before'), { immediate: true }); await done(T1);
  sim.hooks.offline = true; await T1.cloudClear({ ...id, savedAt: 1000 }); sim.hooks.offline = false; // laptop deletes while offline
  const later = Date.now() + 7 * 864e5; // the phone keeps playing the franchise (or restores it) and saves a week later
  T2.cloudSave(fr(id, later, 'phone-week-later'), { immediate: true }); await done(T2);
  await T1.cloudLoad(null); // the laptop comes back online: its deferred deletion marker is written now, with its original cut-off
  assert.ok(sim.keys('/cloud/deleted/').length === 1, 'the marker was written');
  assert.equal(await tagOf(T3, id), 'phone-week-later', 'the newer progress survives');
  assert.equal(await tagOf(T1, null), null, 'the laptop that deleted it does not adopt it');
});

test('deletion: a copy already in the cloud when the player deletes is invalid even if its device clock runs ahead', async () => {
  sim.reset(); const id = ident();
  T2.cloudSave(fr(id, Date.now() + 5 * 60_000, 'phone-clock-fast'), { immediate: true }); await done(T2); // saved 5 min "in the future"
  await T1.cloudClear({ ...id, savedAt: 1000 }); // the laptop never saw that progress, but the cloud did
  assert.equal(await tagOf(T3, id), null);
});

test('deletion: a deleted franchise restored from a device backup is backed up again from its next save', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 1000, 'before'), { immediate: true }); await done(T1);
  await T1.cloudClear({ ...id, savedAt: 1000 });
  T1.cloudSave(fr(id, Date.now() + 1000, 'restored'), { immediate: true }); await done(T1); // the local store stamps the restored save now
  assert.equal(await tagOf(T3, id), 'restored'); assert.equal(T1.cloudStatus().error, null);
  assert.equal(await tagOf(T1, null), 'restored', 'a franchise is active again here, so automatic recovery works again');
});

test('deletion: a marker matches the franchise by uid or by creation time, so a copy uploaded without a uid is covered too', async () => {
  sim.reset(); const id = ident();
  T2.cloudSave(fr({ uid: null, createdAt: id.createdAt }, 900, 'fallback-device'), { immediate: true }); await done(T2);
  await T1.cloudClear({ ...id, savedAt: 1000 });
  assert.equal(await tagOf(T3, { createdAt: id.createdAt }), null); assert.equal(await tagOf(T3, null), null);
});

test('deletion: the v39.1 copy of the deleted franchise is removed, and ignored whatever its timestamp', async () => {
  sim.reset(); const id = ident();
  const put = (savedAt) => { sim.docs.set('data/users/viewer-1/save_c0', JSON.stringify({ s: JSON.stringify({ createdAt: id.createdAt, savedAt, tag: 'v39.1' }) })); sim.docs.set('data/users/viewer-1/save_meta', JSON.stringify({ chunks: 1, savedAt })); };
  put(500); await T1.cloudClear({ ...id, savedAt: 1000 });
  assert.ok(!sim.docs.has('data/users/viewer-1/save_meta'), 'removed so a cached v39.0/v39.1 tab cannot adopt it');
  put(Date.now() + 864e5); // a cached v39.1 tab writes it again later, with a fresh timestamp
  assert.equal(await tagOf(T3, null), null); assert.equal(await tagOf(T3, { createdAt: id.createdAt }), null);
});

test('clean-up: two tabs cleaning at the same time, with deletions reordered, keep every franchise readable', async () => {
  sim.reset(); const a = ident(); const b = ident(); sim.hooks.latency = () => Math.random() * 5;
  for (let i = 1; i <= 4; i++) { T1.cloudSave(fr(a, 1000 + i, `a${i}`, 200_000), { immediate: true }); T2.cloudSave(fr(b, 1000 + i, `b${i}`, 200_000), { immediate: true }); T3.cloudSave(fr(a, 1000 + i, `a${i}x`, 200_000), { immediate: true }); await done(T1, T2, T3); }
  assert.ok(['a4', 'a4x'].includes(await tagOf(T4, a))); assert.equal(await tagOf(T4, b), 'b4');
});
