// Cloud mirror under concurrency (Codex review of 7e73413, finding r4360695494). Two tabs or devices upload at the same
// time. The store is last-writer-wins with no transactions; its documented single-writer primitive is a cooperative lease
// (`doc.acquire`). Two independent instances of the cloud module (two "tabs") share one simulated store. Gates hold chosen
// writes, so the interleavings are deterministic.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const docs = new Map(); const leases = new Map(); const gates = [];
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
/** Hold the next write whose document id and body match `pred` until released. */
const gate = (pred) => { const g = { pred, used: false, reached: deferred(), open: deferred() }; gates.push(g); return { reached: g.reached.promise, release: () => g.open.resolve() }; };
const col = { get: async () => ({ docs: [...docs.keys()].map((id) => ({ id, data: () => JSON.parse(docs.get(id)) })) }), doc: (id) => ({
  async get() { await null; return { exists: docs.has(id), data: () => JSON.parse(docs.get(id)) }; },
  async set(v) { const body = JSON.stringify(v); const g = gates.find((x) => !x.used && x.pred(id, body)); if (g) { g.used = true; g.reached.resolve(); await g.open.promise; } docs.set(id, body); },
  async delete() { await null; docs.delete(id); },
  // As documented: set-if-not-busy, renewable by the same holder, expiring on its own (ttl clamped to at least 1 s); `data` is
  // merged into the document body only when the lease is granted. The grant is decided when the request arrives (after a gate).
  async acquire({ holder, ttlMs = 30000, data }) {
    await null;
    if (data) { const body = JSON.stringify(data); const g = gates.find((x) => !x.used && x.pred(id, body)); if (g) { g.used = true; g.reached.resolve(); await g.open.promise; } }
    const l = leases.get(id); const t = Date.now(); if (l && l.holder !== holder && l.until > t) return { acquired: false, expiresAt: new Date(l.until).toISOString() };
    leases.set(id, { holder, until: t + Math.max(1000, ttlMs) });
    if (data) docs.set(id, JSON.stringify({ ...(docs.has(id) ? JSON.parse(docs.get(id)) : {}), ...data }));
    return { acquired: true, holder };
  },
}) };
globalThis.claude = { use: async (n) => (n === 'db' ? { collection: () => col } : { id: async () => 'viewer-1' }) };
const tab1 = await import('../src/franchise/cloud-save.js?tab=1');
const tab2 = await import('../src/franchise/cloud-save.js?tab=2');
const fr = (savedAt, tag, n = 400_000) => ({ schemaVersion: 6, uid: 'u1', savedAt, tag, pad: 'x'.repeat(n) });
const done = async (...m) => { for (let i = 0; i < 600; i++) { let busy = false; for (const x of m) if (x.cloudFlush()) busy = true; if (!busy) return; await new Promise((r) => setTimeout(r, 10)); } };
const LEASE = 'save_meta'; // the upload lease is held on the meta document
const reset = () => { docs.clear(); leases.clear(); gates.length = 0; };

test('cloud concurrency: an older upload that started first and finishes last never replaces a newer one', async () => {
  reset();
  const hold = gate((id, body) => id.includes('_c') && body.includes('older')); // the older upload stalls mid-chunks
  tab2.cloudSave(fr(8000, 'older'), { immediate: true }); await hold.reached;
  tab1.cloudSave(fr(9000, 'newer'), { immediate: true });
  await new Promise((r) => setTimeout(r, 30)); // tab 1 gets as far as it can while tab 2 is stalled
  hold.release(); await done(tab1, tab2);
  const got = await tab1.cloudLoad(); assert.ok(got, 'the cloud copy is readable'); assert.equal(got.tag, 'newer'); assert.equal(got.savedAt, 9000);
});
test('cloud concurrency: chunks of two uploads never mix; the cloud copy is always one whole, readable generation', async () => {
  reset();
  const hold = gate((id, body) => /_c1$/.test(id) && body.includes('A'.repeat(50))); // upload A stalls after its first chunk
  const a = fr(10_000, 'A'); a.pad = 'A'.repeat(400_000); const b = fr(11_000, 'B'); b.pad = 'B'.repeat(400_000);
  tab1.cloudSave(a, { immediate: true }); await hold.reached;
  tab2.cloudSave(b, { immediate: true }); await new Promise((r) => setTimeout(r, 30));
  hold.release(); await done(tab1, tab2);
  const got = await tab2.cloudLoad(); assert.ok(got, 'never torn'); assert.equal(got.tag, 'B'); assert.ok(/^B+$/.test(got.pad), 'no chunk from A');
});
test('cloud concurrency: old generations are cleaned up, so long careers do not pile up documents', async () => {
  reset();
  for (let i = 1; i <= 5; i++) { tab1.cloudSave(fr(20_000 + i, `g${i}`), { immediate: true }); await done(tab1); }
  const chunkDocs = [...docs.keys()].filter((k) => k.includes('_c')); const meta = JSON.parse(docs.get('save_meta'));
  assert.equal(chunkDocs.length, meta.chunks, `only the live generation's chunks remain (${chunkDocs.join(',')})`);
  assert.equal((await tab1.cloudLoad()).tag, 'g5');
});
test('cloud concurrency: a copy written by v39.1 (no generation, plain chunk keys) is still read, and then superseded cleanly', async () => {
  reset();
  const old = JSON.stringify(fr(30_000, 'v39.1', 1000)); docs.set('save_c0', JSON.stringify({ s: old })); docs.set('save_meta', JSON.stringify({ chunks: 1, savedAt: 30_000, schemaVersion: 6 }));
  assert.equal((await tab1.cloudLoad()).tag, 'v39.1');
  tab1.cloudSave(fr(30_001, 'v39.2'), { immediate: true }); await done(tab1);
  assert.equal((await tab1.cloudLoad()).tag, 'v39.2');
});
test('cloud concurrency: an upload whose lease expired never publishes or cleans up over the new lease holder (r4361544378)', async () => {
  reset();
  const pub1 = gate((id, body) => id === 'save_meta' && body.includes('"savedAt":40000')); // tab 1 is about to publish
  tab1.cloudSave(fr(40_000, 'T1'), { immediate: true }); await pub1.reached;
  leases.delete(LEASE); // tab 1 stalled past its lease; it is free again
  const pub2 = gate((id, body) => id === 'save_meta' && body.includes('"savedAt":41000')); // tab 2 has written its chunks
  tab2.cloudSave(fr(41_000, 'T2'), { immediate: true }); await pub2.reached;
  pub1.release(); await new Promise((r) => setTimeout(r, 200)); // tab 1 resumes: it must notice it lost the lease
  pub2.release(); await done(tab1, tab2);
  const got = await tab2.cloudLoad(); assert.ok(got, 'the cloud copy is readable (no chunks of the new holder were deleted)'); assert.equal(got.tag, 'T2');
});

// Codex review of da63189.
test('cloud concurrency: an upload stalled past its lease while publishing never overwrites the newer copy published meanwhile (r4362010448)', async () => {
  reset();
  // tab 1 has renewed its lease and sent its publish, but the request stalls past the lease ...
  const pub1 = gate((id, body) => id === 'save_meta' && body.includes('"savedAt":50000'));
  tab1.cloudSave(fr(50_000, 'T1-older'), { immediate: true }); await pub1.reached;
  leases.delete(LEASE); // ... so the lease lapses and tab 2 uploads newer progress, start to finish
  tab2.cloudSave(fr(51_000, 'T2-newer'), { immediate: true }); await done(tab2);
  assert.equal((await tab2.cloudLoad()).tag, 'T2-newer');
  pub1.release(); await done(tab1, tab2); // only now does tab 1's stalled publish arrive
  const got = await tab2.cloudLoad(); assert.ok(got, 'the cloud copy is readable'); assert.equal(got.tag, 'T2-newer', 'the newer copy survives');
});
test('cloud concurrency: deleting the franchise cancels an upload waiting to retry after the lease was busy (r4362010441)', async () => {
  reset();
  // tab 1 loses the lease to another device after its first chunk, so its upload stops and is scheduled to retry
  const c0 = gate((id, body) => /_c0$/.test(id) && body.includes('doomed'));
  tab1.cloudSave(fr(60_000, 'doomed'), { immediate: true }); await c0.reached;
  leases.set(LEASE, { holder: 'other-device', until: Date.now() + 60_000 }); c0.release(); await done(tab1);
  assert.ok(!docs.has('save_meta'), 'nothing was published');
  await tab1.cloudClear(); // the player deletes the franchise
  leases.delete(LEASE); // the other device finishes; the lease is free again
  await new Promise((r) => setTimeout(r, 5600)); await done(tab1); // past the retry delay
  assert.ok(!docs.has('save_meta'), 'the deleted franchise was not uploaded again');
});
