import { test } from 'node:test';
import assert from 'node:assert/strict';

// The chunked cloud mirror against the shared simulated store (tests/helpers/cloud-sim.js; the full suites are
// tests/cloud-save.test.js, tests/cloud-concurrency.test.js and tests/cloud-regressions.test.js).
test('cloud save round-trips a large franchise in chunks and rejects torn writes', async () => {
  const { createCloudSim } = await import('./helpers/cloud-sim.js');
  const sim = createCloudSim(); sim.install('viewer1');
  const C = await import('../src/franchise/cloud-save.js');
  const f = { schemaVersion: 6, uid: 'u-save', createdAt: '2026-04-01T00:00:00.000Z', savedAt: 123, blob: 'x'.repeat(500_000) };
  C.cloudSave(f, { immediate: true }); await C.cloudFlush();
  const commit = sim.keys('/cloud/snaps/').find((k) => !k.endsWith('~w')); assert.ok(JSON.parse(sim.docs.get(commit)).n >= 4);
  const back = await C.cloudLoad({ uid: 'u-save' });
  assert.equal(back.blob.length, 500_000);
  sim.docs.delete(sim.keys('/cloud/chunks/')[1]);
  assert.equal(await C.cloudLoad({ uid: 'u-save' }), null, 'a missing chunk invalidates the cloud copy');
  delete globalThis.claude;
});
