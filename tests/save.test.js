import { test } from 'node:test';
import assert from 'node:assert/strict';

// Fake claude.use('db'/'user') backed by a Map, to exercise the chunked cloud mirror.
function fakeClaude() {
  const store = new Map();
  const docRef = (path) => ({
    get: async () => ({ exists: store.has(path), data: () => store.get(path) }),
    set: async (d) => { store.set(path, JSON.parse(JSON.stringify(d))); },
    delete: async () => { store.delete(path); },
  });
  const db = { collection: (p) => ({ doc: (k) => docRef(`${p}/${k}`) }) };
  const user = { id: async () => 'viewer1' };
  globalThis.claude = { use: async (n) => (n === 'db' ? db : n === 'user' ? user : null) };
  return store;
}

test('cloud save round-trips a large franchise in chunks and rejects torn writes', async () => {
  const store = fakeClaude();
  const C = await import('../src/franchise/cloud-save.js');
  const f = { schemaVersion: 6, savedAt: 123, blob: 'x'.repeat(500_000) };
  C.cloudSave(f, { immediate: true });
  await new Promise((r) => setTimeout(r, 50));
  assert.ok(store.get('data/users/viewer1/save_meta').chunks >= 3);
  const back = await C.cloudLoad();
  assert.equal(back.blob.length, 500_000);
  const meta = store.get('data/users/viewer1/save_meta'); // v39.2 uploads use generation-specific chunk keys (GDD §43.8)
  store.delete(`data/users/viewer1/${meta.gen ? `save_${meta.gen}_c1` : 'save_c1'}`);
  assert.equal(await C.cloudLoad(), null, 'a missing chunk invalidates the cloud copy');
  delete globalThis.claude;
});
