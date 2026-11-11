// The store's save queue never wedges (docs/task8/RENDER_OPT.md, found while fixing the end-of-play save hitch).
// A debounced request taken by the running write (drain picks up whatever is pending when a write finishes) used to leave its
// timer armed; when that timer then fired with nothing pending, drain() finished synchronously and `writing = drain()` stored
// the settled promise after drain had already cleared `writing`. From then on no save was ever written again in that session
// (every later request, immediate ones included, only queued; flush() returned at once), until the unload journal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, memoryBackend } from '../src/franchise/store.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const within = (p, ms) => Promise.race([p, sleep(ms).then(() => ({ timedOut: true }))]);
let t = 1.7e12; const now = () => (t += 1000);
const franchise = (n) => ({ schemaVersion: 6, createdAt: 1, seed: 7, uid: 'u-test', club: 'Test', owner: { first: 'A', last: 'B' }, season: { year: 1, week: n, day: 0, records: {} }, roster: [{ id: 'm1', species: 'emberfox', n }], settings: {}, history: [], draftResults: null });

test('a debounced request taken by the running write leaves no timer behind that could wedge the queue', async () => {
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, now, debounce: 120 });
  await store.open();
  const f = franchise(1);
  const a = store.save(f, { immediate: true }); // A is being written...
  f.season.week = 2; const b = store.save(f); //   ...B is requested meanwhile (debounce timer armed); drain takes B right after A
  assert.equal((await within(a, 3000)).ok, true);
  assert.equal((await within(b, 3000)).ok, true, 'B is written by the running drain, before its timer');
  await sleep(250); // B's timer (120 ms) has fired by now, with nothing pending
  assert.equal(store.busy(), false, 'nothing queued, nothing being written, no timer: the queue is idle');
  f.season.week = 3; const c = await within(store.save(f, { immediate: true }), 3000);
  assert.ok(!c.timedOut, 'a later immediate save is written (the queue did not wedge)'); assert.equal(c.ok, true);
  f.season.week = 4; const d = await within(store.save(f), 3000);
  assert.ok(!d.timedOut, 'a later debounced save is written too'); assert.equal(d.ok, true);
  const m = await store.readManifest(); const back = await store.loadManifest(m);
  assert.equal(back.season.week, 4, 'the last request is the committed state');
});

test('flush and a timer firing with nothing pending never leave the queue looking busy', async () => {
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, now, debounce: 60 });
  await store.open();
  const f = franchise(1);
  const a = store.save(f); await store.flush(); assert.equal((await a).ok, true);
  await sleep(120); assert.equal(store.busy(), false);
  f.season.week = 9; assert.equal((await within(store.save(f, { immediate: true }), 3000)).ok, true);
});
