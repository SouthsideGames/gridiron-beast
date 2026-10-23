// Codex review of 21c0829 (r4363406184, r4363406198, r4363406205), each reproduced here before it was fixed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim, memoryLocalStorage } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install('viewer-1');
const shared = memoryLocalStorage(); globalThis.localStorage = shared;
const [T1, T2, T3, T4] = await Promise.all([1, 2, 3, 4].map((i) => import(`../src/franchise/cloud-save.js?cx=${i}`)));
let k = 0; const ident = () => { k++; return { uid: `x${k}`, createdAt: `2026-06-${String(k).padStart(2, '0')}T00:00:00.000Z` }; };
const fr = (id, savedAt, tag, n = 300_000) => ({ schemaVersion: 6, ...id, savedAt, tag, pad: 'x'.repeat(n) });
const done = async (...tabs) => { for (let i = 0; i < 3000; i++) { let busy = false; for (const t of tabs) if (t.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 5)); } };
const tagOf = async (tab, dev) => (await tab.cloudLoad(dev))?.tag ?? null;

test('r4363406184: the deletion is recorded on the device at once, even while an upload in this tab is stalled', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 100, 'before'), { immediate: true }); await done(T1);
  const stall = sim.gate('set', (p) => p.includes('/chunks/') && p.endsWith('_c1'));
  T1.cloudSave(fr(id, 200, 'stalled'), { immediate: true }); await stall.reached;
  void T1.cloudClear({ ...id, savedAt: 200 }); // waits for the stalled upload ... and the page is closed meanwhile
  const rec = JSON.parse(shared.getItem('gridiron-beast-v7-cloud-deletions') || '[]');
  assert.ok(rec.some((d) => d.uid === id.uid && !d.written), 'recorded before waiting'); assert.equal(shared.getItem('gridiron-beast-v7-cloud-noadopt'), '1');
  // the next start (a new page) writes the marker; the franchise stays deleted everywhere
  assert.equal(await tagOf(T3, null), null, 'not adopted on this device');
  assert.equal(sim.keys('/cloud/deleted/').length, 1, 'the marker reached the cloud');
  assert.equal(await tagOf(T4, id), null, 'deleted for every device');
  stall.release(); await done(T1);
});

test('r4363406198: a deletion that lands while a reader is assembling a snapshot makes the reader return nothing', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 100, 'about-to-be-deleted'), { immediate: true }); await done(T1);
  const read = sim.gate('get', (p) => p.includes('/chunks/') && p.endsWith('_c0')); // the reader pauses on its first chunk
  const reading = T2.cloudLoad(null); await read.reached;
  const del = sim.gate('delete', () => true); // the deleting device's clean-up is slow
  const clearing = T3.cloudClear({ ...id, savedAt: 100 });
  for (let i = 0; i < 200 && !sim.keys('/cloud/deleted/').length; i++) await new Promise((r) => setTimeout(r, 5)); // the marker is durable
  read.release();
  assert.equal((await reading)?.tag ?? null, null, 'the deleted franchise is not returned');
  del.release(); await clearing;
});

test('r4363406205: when the retry after a full cloud also fails, its partial snapshot is removed too', async () => {
  sim.reset(); const id = ident();
  T1.cloudSave(fr(id, 100, 'kept', 1000), { immediate: true }); await done(T1);
  sim.hooks.failSet = (p) => (p.includes('/chunks/') && p.endsWith('_c1') ? Object.assign(new Error('full'), { code: 'quota_exceeded' }) : null);
  T1.cloudSave(fr(id, 200, 'never-fits'), { immediate: true }); await done(T1);
  assert.equal(T1.cloudStatus().error, 'quota_exceeded');
  const left = sim.keys('/cloud/').filter((p) => /\/(snaps|chunks)\//.test(p) && JSON.parse(sim.docs.get(p)).savedAt === 200);
  assert.deepEqual(left, [], 'no intent or chunk of the failed attempts remains');
  sim.hooks.failSet = null; assert.equal(await tagOf(T2, id), 'kept');
});
