// Coordinated state invariants (GDD §43.13, second review of PR #43). Races are reproduced with deterministic barriers: a
// gate holds a chosen IndexedDB transaction until the test releases it, so an interleaving happens exactly where intended,
// with no timing sleeps.
//   A  an unsuccessful local save never authorises a cloud upload
//   B  a failed restore or replacement never changes the active franchise
//   C  a stale tab never recreates deleted or superseded state
//   D  two exclusive storage operations never overlap
//   E  a successful storage operation never references missing or corrupted parts
//   F  newer local progress is never silently replaced by older cloud progress
//   G  a failed backup never disables ordinary saving
//   H  no failed operation reports success
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';
import { replaceThenAdopt, shouldMirror } from '../src/franchise/activation.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 });
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
let clock = 1_800_000_000_000; const now = () => ++clock;
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
async function setup({ debounce = 0 } = {}) {
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText());
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: ls, now, debounce });
  const { franchise: f } = await store.open();
  for (const n of ['A', 'B', 'C']) { f.owner.first = n; assert.ok((await store.save(f)).ok); } // live C, roll0 B, roll1 A
  return { ls, backend, store, f };
}
const reopen = (backend, ls) => createStore({ backend, localStorage: ls, now, debounce: 0 }).open();
/**
 * Instrument a backend: every read-write transaction is logged (start/end, its stores, `label` of the operation running it), and
 * `gate(pred)` holds the next matching transaction until `release()` is called.
 */
function instrument(backend) {
  const run = backend.run.bind(backend); const log = []; const gates = [];
  backend.run = async (stores, mode, fn) => {
    if (mode === 'readwrite') {
      const g = gates.find((x) => !x.used && x.pred(stores)); if (g) { g.used = true; g.reached.resolve(); await g.open.promise; }
      const id = log.length; log.push({ ev: 'start', id, stores: stores.join(',') });
      try { return await run(stores, mode, fn); } finally { log.push({ ev: 'end', id, stores: stores.join(',') }); }
    }
    return run(stores, mode, fn);
  };
  return {
    log,
    gate(pred) { const g = { pred, used: false, reached: deferred(), open: deferred() }; gates.push(g); return { reached: g.reached.promise, release: () => g.open.resolve() }; },
    maxConcurrent() { let n = 0, m = 0; for (const e of log) { n += e.ev === 'start' ? 1 : -1; m = Math.max(m, n); } return m; },
  };
}
const isCopy = (s) => s.length === 1 && s[0] === 'backups';
const isCommit = (s) => s.includes('saves') && s.includes('parts');

// ------------------------------------------------------------ finding r4359520490: invariant C and E
test('C/E: after another tab deletes the franchise, a stale tab cannot recreate it or write a manifest with missing parts', async () => {
  const { backend, ls } = await setup();
  const tabA = createStore({ backend, localStorage: ls, now, debounce: 0 }); const a = (await tabA.open()).franchise;
  const tabB = createStore({ backend, localStorage: ls, now, debounce: 0 }); const b = (await tabB.open()).franchise;
  await tabA.remove(a);
  b.owner.first = 'Ghost'; const r = await tabB.save(b);
  assert.equal(r.ok, false, 'H: the stale save does not report success'); assert.equal(r.error.code, 'newer-elsewhere'); assert.match(r.error.message, /deleted|changed/);
  assert.equal(backend.data.saves.size, 0, 'no manifest was written'); assert.equal((await reopen(backend, ls)).mode, 'empty', 'the franchise stays deleted');
  const kept = (await tabA.listBackups()).filter((x) => x.kind === 'deleted'); assert.equal(kept.length, 1); assert.ok(kept[0].ok, 'the deleted copy is intact');
  assert.equal((await tabA.readBackup(kept[0].id)).owner.first, 'C');
});
test('E: a cached part that has disappeared is written again rather than referenced, so the save reads back whole', async () => {
  const { backend, store, f, ls } = await setup();
  const m = await store.readManifest(); backend.data.parts.delete(m.parts.history.sum); // gone (another tab's clean-up, eviction)
  f.owner.first = 'CoreOnly'; const r = await store.save(f); // only the core changed: the history part would be "reused"
  assert.equal(r.ok, true);
  const back = await reopen(backend, ls); assert.equal(back.mode, 'ready'); assert.equal(back.franchise.owner.first, 'CoreOnly');
  assert.equal(JSON.stringify(back.franchise.history), JSON.stringify(f.history));
});

// ------------------------------------------------------------ finding r4359520509: invariant D
test('D: a restore and a deletion requested while an ordinary save is in flight never overlap; only the first changes storage', async () => {
  const { backend, store, f, ls } = await setup();
  const ins = instrument(backend);
  const slow = ins.gate((s) => isCommit(s)); f.owner.first = 'Slow'; const saving = store.save(f);
  await slow.reached; // the ordinary save is now mid-write
  const restoring = store.restore('1:roll1', f); const deleting = store.remove(f).then(() => ({ ok: true }), (e) => ({ ok: false, error: e }));
  slow.release();
  const [s, r, d] = await Promise.all([saving, restoring, deleting]);
  assert.equal(s.ok, true, 'the ordinary save that was in flight completes');
  assert.equal(r.ok, true, 'the restore ran'); assert.equal(d.ok, false, 'the deletion of the franchise the restore replaced is refused');
  assert.equal(ins.maxConcurrent(), 1, 'no two write transactions overlapped');
  const live = await reopen(backend, ls); assert.equal(live.mode, 'ready'); assert.equal(live.franchise.owner.first, 'B', 'only the restore changed storage (roll1 at its turn: the in-flight save had rotated C → roll0, B → roll1)');
  r.franchise.owner.first = 'AfterBoth'; assert.ok((await store.save(r.franchise)).ok, 'ordinary saving still works');
});
test('D: two restores requested together run one after the other; the second, of a franchise already replaced, changes nothing', async () => {
  const { backend, store, f, ls } = await setup();
  const ins = instrument(backend); const hold = ins.gate((s) => isCopy(s));
  const r1 = store.restore('1:roll1', f); const r2 = store.restore('1:roll0', f);
  await hold.reached; hold.release();
  const [a, b] = await Promise.all([r1, r2]);
  assert.equal(a.ok, true); assert.equal(b.ok, false); assert.equal(b.error.code, 'stale');
  assert.equal(ins.maxConcurrent(), 1);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'A');
});
test('D/G: the lock is released after a failure; the next exclusive operation and ordinary saving proceed', async () => {
  const { backend, store, f, ls } = await setup();
  const run = backend.run.bind(backend); let armed = true;
  backend.run = (s, mode, fn) => (armed && mode === 'readwrite' && isCopy(s) ? (armed = false, Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' }))) : run(s, mode, fn));
  const first = await store.restore('1:roll1', f); assert.equal(first.ok, false); assert.equal(first.stage, 'copy');
  f.owner.first = 'Saving'; assert.ok((await store.save(f)).ok, 'G: ordinary saving works after the failed backup');
  const second = await store.restore('1:roll1', f); assert.ok(second.ok, 'the lock was released');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, second.franchise.owner.first);
});
test('D: ordinary saves requested during an exclusive operation wait for it and are not stranded', async () => {
  const { backend, store, f, ls } = await setup();
  const ins = instrument(backend); const hold = ins.gate((s) => isCopy(s));
  const incoming = JSON.parse(JSON.stringify(f)); incoming.owner.first = 'Incoming';
  const rep = store.replace(incoming, null, { copyKind: 'replaced' }); await hold.reached;
  incoming.owner.first = 'Incoming'; // the game keeps saving the new franchise only after adopting it; here an unrelated save of it waits
  const waiting = store.save(f); // a save of the old object, requested while the replacement holds the queue
  hold.release(); const [r, w] = await Promise.all([rep, waiting]);
  assert.ok(r.ok); assert.equal(typeof w.ok, 'boolean', 'the waiting save was resolved, not stranded');
  assert.equal(ins.maxConcurrent(), 1);
  void ls;
});

// ------------------------------------------------------------ finding r4359520503: invariant F (and B, G)
test('F: local progress made while a cloud replacement waits for its safety copy is kept; the older cloud state is not adopted', async () => {
  const { backend, store, f, ls } = await setup();
  const cloud = JSON.parse(JSON.stringify(f)); cloud.owner.first = 'Cloud'; cloud.savedAt = f.savedAt + 1;
  const ins = instrument(backend); const hold = ins.gate((s) => isCopy(s));
  const app = { f }; const localAt = f.savedAt; const adopted = [];
  const p = replaceThenAdopt({ store, current: f, franchise: cloud, copyKind: 'pre-cloud', guard: () => app.f === f && f.savedAt === localAt, adopt: (g) => { adopted.push(g); app.f = g; } });
  await hold.reached;
  f.owner.first = 'Advanced'; const s = store.save(f); // the player plays on during the wait
  hold.release();
  const r = await p; await s;
  assert.equal(r.ok, false); assert.equal(r.stage, 'superseded'); assert.deepEqual(adopted, [], 'B: the cloud state was not adopted');
  assert.equal(app.f.owner.first, 'Advanced');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'Advanced', 'the newer local progress is what is stored');
  f.owner.first = 'Continues'; assert.ok((await store.save(f)).ok, 'saving continues normally');
});
test('F: local progress made while the cloud copy is being committed is put back as the live save; the cloud state is not adopted', async () => {
  const { backend, store, f, ls } = await setup();
  const cloud = JSON.parse(JSON.stringify(f)); cloud.owner.first = 'Cloud';
  const ins = instrument(backend); const hold = ins.gate((s) => isCommit(s));
  const app = { f }; const localAt = f.savedAt; const adopted = [];
  const p = replaceThenAdopt({ store, current: f, franchise: cloud, copyKind: 'pre-cloud', guard: () => app.f === f && f.savedAt === localAt, adopt: (g) => { adopted.push(g); app.f = g; } });
  await hold.reached; f.owner.first = 'AdvancedDuringCommit'; const s = store.save(f); hold.release();
  const r = await p; await s;
  assert.equal(r.ok, false); assert.equal(r.stage, 'superseded'); assert.deepEqual(adopted, []);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'AdvancedDuringCommit');
  assert.ok((await store.listBackups()).some((b) => b.kind === 'roll0'), 'the cloud copy that was briefly live is still in the backups');
});
test('F/G: when the safety copy fails, the cloud copy is not adopted and the local franchise keeps saving', async () => {
  const { backend, store, f, ls } = await setup();
  const cloud = JSON.parse(JSON.stringify(f)); cloud.owner.first = 'Cloud';
  const run = backend.run.bind(backend); let armed = true;
  backend.run = (s, mode, fn) => (armed && mode === 'readwrite' && isCopy(s) ? (armed = false, Promise.reject(new Error('IndexedDB transaction aborted'))) : run(s, mode, fn));
  const app = { f }; const r = await replaceThenAdopt({ store, current: f, franchise: cloud, copyKind: 'pre-cloud', guard: () => true, adopt: (g) => { app.f = g; } });
  assert.equal(r.ok, false); assert.equal(r.stage, 'copy'); assert.equal(app.f, f);
  f.owner.first = 'LocalOn'; assert.ok((await store.save(f)).ok); assert.equal((await reopen(backend, ls)).franchise.owner.first, 'LocalOn');
});

// ------------------------------------------------------------ invariant A at the store boundary
test('A/H: only a committed save authorises the cloud, and it carries exactly the committed state, not later changes', async () => {
  const { backend, store, f, ls } = await setup();
  f.owner.first = 'Committed'; const r = await store.save(f);
  assert.ok(shouldMirror(r)); assert.ok(r.snapshot && typeof r.snapshot.json === 'function', 'the result carries the committed snapshot');
  f.owner.first = 'LaterUnsaved'; // changed after the commit
  const snap = JSON.parse(r.snapshot.json()); assert.equal(snap.owner.first, 'Committed'); assert.equal(snap.savedAt, r.savedAt);
  const { savedAt: _a, ...x } = snap; const { savedAt: _b, ...y } = (await reopen(backend, ls)).franchise; assert.equal(JSON.stringify(Object.keys(x).sort()), JSON.stringify(Object.keys(y).sort()));
  for (const code of ['quota', 'abort', 'newer-elsewhere', 'stale', 'legacy']) assert.equal(shouldMirror({ ok: false, error: { code } }), false, `A: ${code}`);
});
