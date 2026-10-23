// Regression tests for the three problems confirmed in cd1a849 (Codex review of cd1a849, r4362538310 and r4362538321, and a
// delayed publish found while checking them). They describe behaviour only, not the storage layout, so they ran (and failed)
// on cd1a849 unchanged and pass on the snapshot design (GDD §43.8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install();
const tab1 = await import('../src/franchise/cloud-save.js?reg=1');
const tab2 = await import('../src/franchise/cloud-save.js?reg=2');
let ID = null; let k = 0; // each test plays its own franchise (a deletion in one test stays recorded, as on a real device)
const fresh = () => { k++; ID = { uid: `u${k}`, createdAt: `2026-01-0${k}T00:00:00.000Z` }; };
const fr = (savedAt, tag, n = 400_000) => ({ schemaVersion: 6, ...ID, savedAt, tag, pad: 'x'.repeat(n) });
const done = async (...m) => { for (let i = 0; i < 1000; i++) { let busy = false; for (const x of m) if (x.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 10)); } };
/** The final write that makes an upload visible: the old pointer (`save_meta`) or a snapshot's commit. */
const isPublish = (path) => /\/save_meta$/.test(path) || (/\/cloud\/snaps\/[^/~]+$/.test(path));

test('a delayed publish of an older copy, arriving after the newer upload finished and released everything, never replaces it', async () => {
  sim.reset(); fresh();
  const pub1 = sim.gate('set', (path, body) => isPublish(path) && body.includes('"savedAt":70000'));
  tab1.cloudSave(fr(70_000, 'T1-older'), { immediate: true }); await pub1.reached; // tab 1's final request stalls
  sim.leases.clear(); // its lease (if any) lapses
  tab2.cloudSave(fr(71_000, 'T2-newer'), { immediate: true }); await done(tab2);
  await new Promise((r) => setTimeout(r, 1200)); // tab 2 is finished and any lease it held has expired
  pub1.release(); await done(tab1, tab2); // only now does tab 1's stalled request arrive
  const got = await tab2.cloudLoad(ID); assert.equal(got?.tag ?? null, 'T2-newer', 'the newer copy is the one read');
});

test('deleting the franchise in one tab is not undone by an upload already in flight in another tab (r4362538310)', async () => {
  sim.reset(); fresh();
  tab1.cloudSave(fr(80_000, 'before'), { immediate: true }); await done(tab1);
  const c1 = sim.gate('set', (path) => /_c1$/.test(path)); // tab 2's upload of the same franchise is mid-way
  tab2.cloudSave(fr(80_500, 'in-flight'), { immediate: true }); await c1.reached;
  await tab1.cloudClear({ ...ID, savedAt: 80_500 }); // the player deletes the franchise in tab 1
  c1.release(); await done(tab1, tab2);
  assert.equal((await tab1.cloudLoad(ID))?.tag ?? null, null, 'the deleted franchise did not come back');
  assert.equal((await tab2.cloudLoad({}))?.tag ?? null, null, 'not even on an empty device');
});

test('a reader whose copy is replaced and cleaned up while it reads tries again and finds the newer copy (r4362538321)', async () => {
  sim.reset(); fresh();
  tab1.cloudSave(fr(90_000, 'old'), { immediate: true }); await done(tab1);
  let once = true; // while tab 2 reads the old copy's first chunk, tab 1 uploads twice more and cleans the old copy up
  sim.hooks.beforeGet = async (path) => { if (once && /_c0$/.test(path)) { once = false; for (const [t, tag] of [[91_000, 'new1'], [92_000, 'new2']]) { tab1.cloudSave(fr(t, tag), { immediate: true }); await done(tab1); } } };
  const got = await tab2.cloudLoad(ID);
  assert.equal(got?.tag ?? null, 'new2', 'a complete newer copy exists, so the reader must not report an empty cloud');
});
