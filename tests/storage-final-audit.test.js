// Final Phase 1 audit of the save system (GDD §43.13, third round). Each test reproduces a confirmed data-loss or misleading-
// status scenario found by the independent audit of f7ba186, with deterministic barriers where a race is involved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import { createStore, memoryBackend, JOURNAL_KEY } from '../src/franchise/store.js';
import { replaceThenAdopt } from '../src/franchise/activation.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 });
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, m }; };
let clock = 1_800_000_000_000; const now = () => (clock += 1000);
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
const tab = (backend, ls, o = {}) => createStore({ backend, localStorage: ls, now, debounce: 0, ...o });
async function setup() { const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend(); const store = tab(backend, ls); const { franchise: f } = await store.open(); return { ls, backend, store, f }; }
const journalKeys = (ls) => [...ls.m.keys()].filter((k) => k.startsWith(JOURNAL_KEY));

// ------------------------------------------------------------ audit 1: an idle tab must not lock out the tab being played
test('multi-tab: an idle second tab that saves nothing new does not take the franchise away from the tab being played', async () => {
  const { backend, ls, store: A, f: a } = await setup();
  a.owner.first = 'A1'; assert.ok((await A.save(a)).ok);
  const B = tab(backend, ls); const b = (await B.open()).franchise;
  const rb = await B.save(b, { immediate: true }); // B is hidden: its leave handler saves an unchanged franchise
  assert.equal(rb.ok, true); assert.equal(rb.unchanged, true, 'nothing was written');
  a.owner.first = 'A2-real-progress'; const ra = await A.save(a);
  assert.equal(ra.ok, true, `the active tab keeps saving (got ${ra.error?.code})`);
  assert.equal((await tab(backend, ls).open()).franchise.owner.first, 'A2-real-progress');
});
test('multi-tab: a tab can tell at once that another tab changed the franchise (checked when it comes back to the front)', async () => {
  const { backend, ls, store: A, f: a } = await setup();
  const B = tab(backend, ls); const b = (await B.open()).franchise;
  assert.equal(await A.isStale(), false);
  b.owner.first = 'ChangedInB'; await B.save(b);
  assert.equal(await A.isStale(), true, 'A knows before the player plays on');
  assert.equal(await B.isStale(), false);
  void a;
});

// ------------------------------------------------------------ audit 2 and 3: the unload journal
test('journal: a journal written while an earlier save of the same tab was still committing is recovered at the next start', async () => {
  const { backend, ls, store, f } = await setup();
  const run = backend.run.bind(backend); const gates = [];
  backend.run = async (s, mode, fn) => { if (mode === 'readwrite' && s.includes('saves')) { const g = gates.shift(); if (g) { g.reached.resolve(); await g.open.promise; } } return run(s, mode, fn); };
  const g0 = { reached: deferred(), open: deferred() }; const g1 = { reached: deferred(), open: deferred() }; gates.push(g0, g1);
  f.owner.first = 'T0'; const p0 = store.save(f, { immediate: true }); await g0.reached.promise;
  f.owner.first = 'T1-unsaved'; store.save(f, { immediate: true }); assert.ok(store.journal(f));
  g0.open.resolve(); await p0; await g1.reached.promise; // T0 committed; T1's commit never happens (the page is killed)
  backend.run = run;
  const r = await tab(backend, ls).open();
  assert.equal(r.source, 'journal'); assert.equal(r.franchise.owner.first, 'T1-unsaved');
});
test('journal: each tab keeps its own journal, so a stale tab closing afterwards cannot erase the live tab\'s queued progress', async () => {
  const { backend, ls } = await setup();
  const B = tab(backend, ls, { debounce: 60_000 }); const b = (await B.open()).franchise;
  const A = tab(backend, ls, { debounce: 60_000 }); const a = (await A.open()).franchise;
  a.owner.first = 'A-saved'; await A.save(a, { immediate: true }); await A.flush(); // A owns the save; B is now stale
  a.owner.first = 'A-unsaved-progress'; A.save(a); assert.ok(A.journal(a));
  b.owner.first = 'B-stale'; B.save(b); B.journal(b);
  assert.equal(journalKeys(ls).length >= 1, true);
  const r = await tab(backend, ls).open();
  assert.equal(r.source, 'journal'); assert.equal(r.franchise.owner.first, 'A-unsaved-progress');
  assert.equal(journalKeys(ls).length, 0, 'the adopted and the rejected journals are both cleared');
});

// ------------------------------------------------------------ audit 5: an old cached v39.1 tab
test('legacy: a v39.1 tab writing the old save after migration never replaces newer progress; both are kept', async () => {
  const { backend, ls, store, f } = await setup();
  for (const n of ['P1', 'P2', 'P3-weeks-of-progress']) { f.owner.first = n; await store.save(f); }
  const old = JSON.parse(ls.getItem(Save.SAVE_KEY)); old.savedAt = clock + 50_000; old.owner.first = 'OldTab'; ls.setItem(Save.SAVE_KEY, JSON.stringify(old));
  const r = await tab(backend, ls).open();
  assert.equal(r.source, 'indexeddb'); assert.equal(r.franchise.owner.first, 'P3-weeks-of-progress', 'the newer IndexedDB progress stays live');
  assert.ok(r.notes.includes('legacy-newer kept'));
  const kept = (await store.listBackups()).filter((b) => b.kind === 'legacy-newer'); assert.equal(kept.length, 1); assert.ok(kept[0].ok);
  assert.equal((await store.readBackup(kept[0].id)).owner.first, 'OldTab', 'the old tab\'s save is restorable by choice');
  assert.equal((await tab(backend, ls).open()).notes.includes('legacy-newer kept'), false, 'kept once, not on every start');
});
test('legacy: when keeping the old tab\'s save fails, nothing changes and it is tried again at the next start', async () => {
  const { backend, ls, store, f } = await setup();
  f.owner.first = 'P3'; await store.save(f);
  const old = JSON.parse(ls.getItem(Save.SAVE_KEY)); old.savedAt = clock + 50_000; old.owner.first = 'OldTab'; ls.setItem(Save.SAVE_KEY, JSON.stringify(old));
  const run = backend.run.bind(backend); let armed = true;
  backend.run = (s, mode, fn) => (armed && mode === 'readwrite' && s.includes('backups') && !s.includes('saves') ? (armed = false, Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' }))) : run(s, mode, fn));
  const r = await tab(backend, ls).open(); assert.equal(r.franchise.owner.first, 'P3');
  backend.run = run;
  const again = await tab(backend, ls).open(); assert.equal(again.franchise.owner.first, 'P3'); assert.ok(again.notes.includes('legacy-newer kept'));
});

// ------------------------------------------------------------ audit 6: a tab that started on an empty slot
test('multi-tab: a tab that opened on an empty slot cannot overwrite a franchise another tab created meanwhile', async () => {
  const ls = mkLs(); const backend = memoryBackend();
  const A = tab(backend, ls), B = tab(backend, ls); assert.equal((await A.open()).mode, 'empty'); assert.equal((await B.open()).mode, 'empty');
  const x = Save.migrate(fixture()); x.owner.first = 'X'; assert.ok((await A.save(x)).ok);
  const y = Save.migrate(fixture()); y.owner.first = 'Y'; const rb = await B.save(y);
  assert.equal(rb.ok, false); assert.equal(rb.error.code, 'newer-elsewhere');
  assert.equal((await tab(backend, ls).open()).franchise.owner.first, 'X');
  x.owner.first = 'X2'; assert.ok((await A.save(x)).ok, 'the tab that owns it keeps saving');
});
test('multi-tab: after deleting in this tab, a new franchise here saves normally (the empty slot is this tab\'s own)', async () => {
  const { backend, ls, store, f } = await setup();
  await store.remove(f);
  const n = Save.migrate(fixture()); n.owner.first = 'New'; assert.ok((await store.save(n)).ok);
  assert.equal((await tab(backend, ls).open()).franchise.owner.first, 'New');
});

// ------------------------------------------------------------ audit 7: a cloud copy taken on an empty device
test('cloud on an empty device: if a franchise appears during the commit, the cloud copy is not adopted', async () => {
  const ls = mkLs(); const backend = memoryBackend(); const store = tab(backend, ls); await store.open();
  const cloud = Save.migrate(fixture()); cloud.owner.first = 'Cloud';
  const run = backend.run.bind(backend); const g = { reached: deferred(), open: deferred() }; let armed = true;
  backend.run = async (s, mode, fn) => { if (armed && mode === 'readwrite' && s.includes('saves')) { armed = false; g.reached.resolve(); await g.open.promise; } return run(s, mode, fn); };
  const app = { f: null }; const adopted = [];
  const p = replaceThenAdopt({ store, current: null, franchise: cloud, copyKind: 'pre-cloud', guard: () => app.f === null, adopt: (x) => { adopted.push(x); app.f = x; } });
  await g.reached.promise;
  const fresh = Save.migrate(fixture()); fresh.owner.first = 'FreshOnboarded'; app.f = fresh; // something put a franchise in memory
  g.open.resolve(); const r = await p;
  assert.equal(r.ok, false); assert.equal(r.stage, 'superseded'); assert.deepEqual(adopted, []); assert.equal(app.f, fresh);
});

// ------------------------------------------------------------ audit 8: the status after a restore
test('status: after a restore drops a late save of the replaced franchise, the status says saved, not "Saving…"', async () => {
  const { store, f } = await setup();
  for (const n of ['A', 'B', 'C']) { f.owner.first = n; await store.save(f); }
  const pr = store.restore('1:roll0', f); f.owner.first = 'late'; const ps = store.save(f);
  const r = await pr; const s = await ps;
  assert.ok(r.ok); assert.equal(s.error.code, 'stale');
  assert.equal(store.busy(), false); assert.equal(store.status().state, 'saved');
});
