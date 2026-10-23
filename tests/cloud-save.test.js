// Cloud mirror, one tab (GDD §43.8): snapshots are written whole and never overwritten, the reader takes the newest complete
// and valid one, writes are serialised, offline failures are reported and recover, legacy v39.0/v39.1 copies are read on first
// run, documents stay under the platform limits, and a full cloud is handled without touching the device's save.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSim } from './helpers/cloud-sim.js';

const sim = createCloudSim(); sim.install('viewer-1');
const C = await import('../src/franchise/cloud-save.js');
let n = 0; const ident = () => { n++; return { uid: `s${n}`, createdAt: `2026-02-${String(n).padStart(2, '0')}T00:00:00.000Z` }; };
const big = (id, savedAt, tag, size = 1000) => ({ schemaVersion: 6, ...id, savedAt, tag, pad: 'x'.repeat(size) });
const settle = async () => { for (let i = 0; i < 2000 && C.cloudFlush(); i++) await new Promise((r) => setTimeout(r, 5)); await C.cloudFlush(); };
const tagOf = async (dev) => (await C.cloudLoad(dev))?.tag ?? null;
const U = '/data/users/viewer-1/';
const legacyPut = (f, { gen = null, chunks = 1 } = {}) => { const s = JSON.stringify(f); const per = Math.ceil(s.length / chunks); for (let i = 0; i < chunks; i++) sim.docs.set(`data/users/viewer-1/${gen ? `save_${gen}_c${i}` : `save_c${i}`}`, JSON.stringify({ s: s.slice(i * per, (i + 1) * per) })); sim.docs.set('data/users/viewer-1/save_meta', JSON.stringify({ chunks, savedAt: f.savedAt, schemaVersion: 6, ...(gen ? { gen } : {}) })); };

test('cloud: writes never overlap, the newest state wins, and a large franchise round-trips in chunks', async () => {
  sim.reset(); sim.hooks.latency = () => 1 + Math.random() * 4; const id = ident();
  for (let i = 1; i <= 6; i++) C.cloudSave(big(id, 1000 + i, `s${i}`, 400_000 + i * 1000), { immediate: true });
  await settle();
  assert.equal(sim.stats.maxInFlight, 1, 'one document write at a time');
  const f = await C.cloudLoad(id); assert.equal(f.tag, 's6'); assert.equal(f.savedAt, 1006); assert.equal(f.pad.length, 406_000);
  assert.ok(C.cloudUsage.chunks >= 4, 'chunked'); assert.equal(C.cloudStatus().error, null);
});
test('cloud: an older state is never written over a newer one from this session', async () => {
  const id = ident(); sim.reset();
  C.cloudSave(big(id, 5000, 'newer'), { immediate: true }); await settle();
  C.cloudSave(big(id, 4000, 'older'), { immediate: true }); await settle();
  assert.equal(await tagOf(id), 'newer');
});
test('cloud: offline writes fail visibly and the next write after reconnecting succeeds', async () => {
  sim.reset(); const id = ident();
  sim.hooks.offline = true; C.cloudSave(big(id, 2000, 'offline'), { immediate: true }); await settle();
  assert.ok(C.cloudStatus().error, 'the failure is reported');
  sim.hooks.offline = false; C.cloudSave(big(id, 2001, 'back'), { immediate: true }); await settle();
  assert.equal(await tagOf(id), 'back'); assert.equal(C.cloudStatus().error, null);
});
test('cloud: a throttled upload carries the state authorised at the time, never later changes to the object', async () => {
  sim.reset(); const id = ident();
  const f = big(id, 5000, 'A'); C.cloudSave(f); f.tag = 'B-unauthorised'; f.savedAt = 5001;
  await settle(); const got = await C.cloudLoad(id); assert.equal(got.tag, 'A'); assert.equal(got.savedAt, 5000);
});

// ------------------------------------------------------------ recovery
test('recovery: an incomplete, corrupted or interrupted snapshot never hides the newest valid one', async () => {
  sim.reset(); const id = ident();
  C.cloudSave(big(id, 100, 'good-1', 300_000), { immediate: true }); await settle();
  C.cloudSave(big(id, 200, 'good-2', 300_000), { immediate: true }); await settle();
  const snaps = sim.keys('/cloud/snaps/').filter((k) => !k.endsWith('~w'));
  const newest = snaps[snaps.length - 1].split('/').pop();
  // the newest snapshot's middle chunk is damaged: the reader falls back to the previous complete snapshot, never to nothing
  const ck = `data/users/viewer-1/cloud/chunks/${newest}_c1`; const body = JSON.parse(sim.docs.get(ck)); body.s = `${body.s.slice(0, -5)}XXXXX`; sim.docs.set(ck, JSON.stringify(body));
  assert.equal(await tagOf(id), 'good-1', 'a corrupted chunk fails the checksum');
  sim.docs.delete(ck); assert.equal(await tagOf(id), 'good-1', 'a missing chunk too');
  // an upload interrupted after its intent and some chunks (the tab closed) is ignored
  sim.docs.set('data/users/viewer-1/cloud/snaps/zzzzzzzzzz-interrupt~w', JSON.stringify({ gen: 'zzzzzzzzzz-interrupt', ...id, savedAt: 9e12, n: 3, at: 1 }));
  sim.docs.set('data/users/viewer-1/cloud/chunks/zzzzzzzzzz-interrupt_c0', JSON.stringify({ gen: 'zzzzzzzzzz-interrupt', i: 0, n: 3, ...id, savedAt: 9e12, s: '{"x":' }));
  assert.equal(await tagOf(id), 'good-1');
});
test('recovery: a network error while reading reports a problem; it never falls back to an older copy', async () => {
  sim.reset(); const id = ident();
  C.cloudSave(big(id, 100, 'older'), { immediate: true }); await settle();
  C.cloudSave(big(id, 200, 'newest'), { immediate: true }); await settle();
  const newest = sim.keys('/cloud/snaps/').filter((k) => !k.endsWith('~w')).pop().split('/').pop();
  sim.hooks.failGet = (path) => (path.includes(newest) ? Object.assign(new Error('flaky'), { code: 'unavailable' }) : null);
  assert.equal(await C.cloudLoad(id), null); assert.equal(C.cloudStatus().error, 'unavailable');
  sim.hooks.failGet = null; assert.equal(await tagOf(id), 'newest');
});
test('recovery: a device is never switched to another franchise; an empty device gets the newest valid franchise', async () => {
  sim.reset(); const a = ident(); const b = ident();
  C.cloudSave(big(a, 100, 'A'), { immediate: true }); await settle();
  C.cloudSave(big(b, 900, 'B-newer'), { immediate: true }); await settle();
  assert.equal(await tagOf(a), 'A', 'the device playing A only ever gets A');
  assert.equal(await tagOf(null), 'B-newer', 'an empty device recovers the most recent franchise');
  assert.equal(await tagOf({ uid: 'other' }), null, 'a franchise with no cloud copy gets nothing');
});
test('recovery: a franchise is the same when either its uid or its creation time matches; missing fields never match', async () => {
  sim.reset(); const id = ident();
  C.cloudSave(big({ uid: null, createdAt: id.createdAt }, 300, 'fallback-mode'), { immediate: true }); await settle(); // no uid (fallback storage)
  assert.equal(await tagOf(id), 'fallback-mode', 'matched by creation time');
  C.cloudSave(big({ uid: null, createdAt: null }, 301, 'anonymous'), { immediate: true }); await settle();
  assert.equal(await tagOf(id), 'fallback-mode', 'a newer copy with neither field is never taken for this franchise');
});

// ------------------------------------------------------------ v39.0 / v39.1 copies (first run of the update)
test('legacy: a v39.0/v39.1 cloud copy is read on first run, for the device franchise or an empty device', async () => {
  sim.reset(); const id = ident();
  legacyPut({ schemaVersion: 6, createdAt: id.createdAt, savedAt: 1234, tag: 'v39.1-copy' }, { chunks: 2 });
  assert.equal(await tagOf({ uid: 'migrated-uid', createdAt: id.createdAt }), 'v39.1-copy', 'the migrated franchise (new uid, same creation time) finds it');
  assert.equal(await tagOf(null), 'v39.1-copy', 'an empty device finds it');
  assert.equal(await tagOf({ uid: 'x', createdAt: 'another' }), null, 'another franchise does not');
  legacyPut({ schemaVersion: 6, createdAt: id.createdAt, savedAt: 1235, tag: 'dev-layout' }, { gen: 'abc123', chunks: 1 });
  assert.equal(await tagOf(id), 'dev-layout', 'the unreleased dev layout with gen is read too');
});
test('legacy: once the franchise has a v39.2 snapshot, the old copy (written by an old cached tab) is ignored and left in place', async () => {
  sim.reset(); const id = ident();
  C.cloudSave(big(id, 5000, 'v39.2'), { immediate: true }); await settle();
  legacyPut({ schemaVersion: 6, ...id, savedAt: 99_999, tag: 'old-tab-fresh-timestamp' });
  assert.equal(await tagOf(id), 'v39.2'); assert.ok(sim.docs.has('data/users/viewer-1/save_meta'), 'never deleted by an upload');
});
test('legacy: an old cached tab writing or deleting its own keys cannot touch any snapshot', async () => {
  sim.reset(); const id = ident();
  C.cloudSave(big(id, 6000, 'safe'), { immediate: true }); await settle();
  const before = sim.keys('/cloud/');
  legacyPut({ schemaVersion: 6, ...id, savedAt: 7000, tag: 'v39.1' }, { chunks: 3 }); sim.docs.delete('data/users/viewer-1/save_meta'); // v39.1 save, then v39.1 delete
  assert.deepEqual(sim.keys('/cloud/'), before); assert.equal(await tagOf(id), 'safe');
});

// ------------------------------------------------------------ limits
test('limits: every document stays under 256 KiB, even for worst-case text (quotes, backslashes, accents, emoji)', async () => {
  sim.reset(); const id = ident();
  const nasty = '"\\'.repeat(60_000) + 'é漢字🏈'.repeat(20_000); // escaping can double these
  C.cloudSave({ ...big(id, 8000, 'nasty'), text: nasty }, { immediate: true }); await settle();
  assert.equal(C.cloudStatus().error, null); assert.ok(sim.stats.maxDocBytes < 256 * 1024, `largest document ${sim.stats.maxDocBytes} bytes`);
  const back = await C.cloudLoad(id); assert.equal(back.text, nasty, 'non-ASCII text round-trips exactly');
});
test('limits: a 20-season franchise (~3 MB) stays within limits, and 40 uploads leave only the two newest snapshots', async () => {
  sim.reset(); const id = ident(); const pad = '{"k":"v","n":[1,2,3]},'.repeat(130_000); // ~2.9 MB, quote-heavy like a real save
  for (let i = 1; i <= 40; i++) { C.cloudSave({ ...big(id, 10_000 + i, `u${i}`), pad }, { immediate: i % 10 === 0 }); if (i % 10 === 0) await settle(); }
  await settle();
  assert.ok(sim.stats.maxDocBytes < 256 * 1024, `largest document ${sim.stats.maxDocBytes} bytes`);
  const commits = sim.keys('/cloud/snaps/').filter((k) => !k.endsWith('~w'));
  assert.equal(commits.length, 2, 'two committed snapshots kept');
  const perSnap = commits.map((k) => JSON.parse(sim.docs.get(k)).n); const chunks = sim.keys('/cloud/chunks/');
  assert.equal(chunks.length, perSnap[0] + perSnap[1], `only the kept snapshots' chunks remain (${chunks.length})`); assert.ok(perSnap[0] <= 40);
  assert.equal(await tagOf(id), 'u40');
});
test('limits: a full cloud keeps the newest copy, frees older ones and retries once; the device save is untouched', async () => {
  sim.reset(); const a = ident(); const b = ident();
  for (const t of [100, 200]) { C.cloudSave(big(b, t, `B${t}`), { immediate: true }); await settle(); } // another franchise, 2 snapshots
  for (const t of [300, 400]) { C.cloudSave(big(a, t, `A${t}`), { immediate: true }); await settle(); }
  let full = true; const deletes0 = sim.stats.deletes; let freed = false;
  // the store is full until some documents are deleted
  sim.hooks.failSet = (path) => { if (sim.stats.deletes > deletes0) { full = false; freed = true; } return full && path.includes('/cloud/') ? Object.assign(new Error('full'), { code: 'quota_exceeded' }) : null; };
  C.cloudSave(big(a, 500, 'A500'), { immediate: true }); await settle();
  assert.ok(freed, 'older snapshots were removed'); assert.equal(await tagOf(a), 'A500');
  assert.equal(await tagOf(b), 'B200', 'the other franchise keeps its newest copy');
  // still full after freeing: reported, nothing more deleted
  sim.hooks.failSet = (path) => (path.includes('/cloud/') ? Object.assign(new Error('full'), { code: 'quota_exceeded' }) : null);
  C.cloudSave(big(a, 600, 'A600'), { immediate: true }); await settle();
  assert.equal(C.cloudStatus().error, 'quota_exceeded'); assert.equal(await tagOf(a), 'A500'); assert.equal(await tagOf(b), 'B200');
});
