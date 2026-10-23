// Cloud mirror (GDD §43.6): writes are serialised (a later write starts only after the earlier one finished), the meta always
// vouches for exactly the chunks written with it, an older state never replaces a newer one, offline failures are reported
// and recover on reconnect, and a deleted franchise is not brought back by a throttled write.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const docs = new Map(); let online = true; let inFlight = 0, maxInFlight = 0; const log = [];
const delay = () => new Promise((r) => setTimeout(r, 2 + Math.random() * 6));
const col = { doc: (id) => ({
  async get() { await delay(); if (!online) throw Object.assign(new Error('offline'), { code: 'unavailable' }); return { exists: docs.has(id), data: () => JSON.parse(docs.get(id)) }; },
  async set(v) { inFlight++; maxInFlight = Math.max(maxInFlight, inFlight); try { await delay(); if (!online) throw Object.assign(new Error('offline'), { code: 'unavailable' }); docs.set(id, JSON.stringify(v)); log.push(id); } finally { inFlight--; } },
  async delete() { await delay(); docs.delete(id); },
}) };
globalThis.claude = { use: async (n) => (n === 'db' ? { collection: () => col } : { id: async () => 'viewer-1' }) };
const C = await import('../src/franchise/cloud-save.js');
const big = (n, savedAt, tag) => ({ schemaVersion: 6, uid: 'u1', savedAt, tag, pad: 'x'.repeat(n) });
const settle = async () => { for (let i = 0; i < 50 && (C.cloudFlush() || inFlight); i++) await new Promise((r) => setTimeout(r, 20)); await C.cloudFlush(); };

test('cloud: writes never overlap, and the stored copy is always consistent and the newest', async () => {
  for (let i = 1; i <= 6; i++) C.cloudSave(big(400_000 + i * 1000, 1000 + i, `s${i}`), { immediate: true });
  await settle();
  assert.equal(maxInFlight, 1, 'one document write at a time');
  const f = await C.cloudLoad(); assert.equal(f.tag, 's6'); assert.equal(f.savedAt, 1006);
  const meta = JSON.parse(docs.get('save_meta')); assert.equal(meta.chunks, 3); assert.equal(meta.uid, 'u1'); assert.equal(meta.storage, 7);
  assert.equal(C.cloudUsage.documents, 4); assert.ok(C.cloudUsage.chars > 400_000);
});
test('cloud: an older state is never written over a newer one from this session', async () => {
  C.cloudSave(big(1000, 900, 'older'), { immediate: true }); await settle();
  assert.equal((await C.cloudLoad()).tag, 's6');
});
test('cloud: offline writes fail visibly and the next write after reconnecting succeeds', async () => {
  online = false; C.cloudSave(big(1000, 2000, 'offline'), { immediate: true }); await settle();
  assert.ok(C.cloudStatus().error, 'the failure is reported');
  online = true; C.cloudSave(big(1000, 2001, 'back'), { immediate: true }); await settle();
  assert.equal((await C.cloudLoad()).tag, 'back'); assert.equal(C.cloudStatus().error, null);
});
test('cloud: a torn write (chunks without matching meta) is ignored rather than loaded', async () => {
  docs.set('save_c0', JSON.stringify({ s: '{"savedAt":5,"tag":"torn"' }));
  assert.equal(await C.cloudLoad(), null);
  C.cloudSave(big(1000, 3000, 'fixed'), { immediate: true }); await settle(); assert.equal((await C.cloudLoad()).tag, 'fixed');
});
test('cloud: deleting the franchise drops a throttled write so it cannot come back', async () => {
  C.cloudSave(big(1000, 4000, 'pending')); // throttled, not yet written
  await C.cloudClear(); await new Promise((r) => setTimeout(r, 30));
  assert.equal(await C.cloudLoad(), null); assert.ok(!docs.has('save_meta'));
});
