// The store's optional 'prehistory' part: the pre-franchise league archive (f.preLeagueHistory) saved apart from `core`, so the
// 440 KB that never change are packed and compressed once instead of on every save. These tests cover the new layout, the
// three-part layout it replaces (saves written before it, and every franchise without an archive), the move between them, a
// read-only archive that must never be re-laid-out, backups, the unload journal and what a save actually writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as L from '../src/franchise/lifecycle.js';
import * as Save from '../src/franchise/save.js';
import { createStore, memoryBackend, encodePart, decodePart, exportFranchise, validateImport, JOURNAL_KEY } from '../src/franchise/store.js';
import { validateLeagueArchive } from '../src/franchise/preleague-history.js';
import { runFranchise } from '../tools/franchise-soak.mjs';

let clock = 1_900_000_000_000; const now = () => ++clock;
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, m }; };
const make = (extra = {}) => F.createFranchise({ owner: { first: 'Store', last: 'GM', background: 'player' }, club: 'Ember City Beasts', seed: 312, ...extra });
// Loading runs the save migration, which adds a few empty fields to a brand-new franchise: start from a loaded one so a
// reopened franchise can be compared byte for byte.
const base = Save.migrate(JSON.parse(JSON.stringify(make()))); const bare = Save.migrate(JSON.parse(JSON.stringify(make({ leagueArchive: false }))));
const clone = (x) => JSON.parse(JSON.stringify(x));
const text = (f) => { const { savedAt, ...rest } = f; return JSON.stringify(rest); };
const fresh = async (f, { ls = null, debounce = 0 } = {}) => { const backend = memoryBackend(); const store = createStore({ backend, localStorage: ls, now, debounce }); await store.open(); const r = await store.replace(clone(f), null, {}); assert.ok(r.franchise, 'stored'); return { backend, store, f: r.franchise, ls }; };
const reopen = (backend, ls = null) => createStore({ backend, localStorage: ls, now, debounce: 0 }).open();
const manifest = (backend) => backend.data.saves.get([...backend.data.saves.keys()][0]);
const partCount = (backend) => backend.data.parts.size;
/** Rewrite a stored save into the layout every build before this one wrote: the archive inside `core`, three parts. */
async function toThreePartLayout(backend) {
  const key = [...backend.data.saves.keys()][0]; const m = backend.data.saves.get(key); assert.ok(m.parts.prehistory, 'the save is in the split layout');
  const core = await decodePart(backend.data.parts.get(m.parts.core.sum), m.parts.core.sum); const archive = await decodePart(backend.data.parts.get(m.parts.prehistory.sum), m.parts.prehistory.sum);
  const merged = {}; for (const k of m.order) { if (k === 'preLeagueHistory') merged[k] = archive; else if (k in core) merged[k] = core[k]; } for (const k of Object.keys(core)) if (!(k in merged)) merged[k] = core[k];
  const enc = await encodePart(merged); backend.data.parts.set(enc.part.sum, enc.part);
  const { prehistory, ...three } = m.parts; backend.data.saves.set(key, { ...m, parts: { ...three, core: enc.entry } });
  backend.data.parts.delete(m.parts.core.sum); backend.data.parts.delete(m.parts.prehistory.sum);
  return backend.data.saves.get(key);
}

test('a franchise with an archive is saved in four parts and comes back identical, key order included', async () => {
  const { backend, f } = await fresh(base); const m = manifest(backend);
  assert.deepEqual(Object.keys(m.parts).sort(), ['core', 'draft', 'history', 'prehistory']);
  const core = await decodePart(backend.data.parts.get(m.parts.core.sum), m.parts.core.sum); assert.ok(!('preLeagueHistory' in core), 'the archive is still inside core');
  assert.deepEqual(await decodePart(backend.data.parts.get(m.parts.prehistory.sum), m.parts.prehistory.sum), base.preLeagueHistory);
  const again = (await reopen(backend)).franchise;
  assert.equal(text(again), text(f), 'the reopened franchise differs'); assert.deepEqual(Object.keys(again), Object.keys(f), 'key order changed');
  assert.equal(JSON.stringify(again.preLeagueHistory), JSON.stringify(base.preLeagueHistory)); assert.deepEqual(validateLeagueArchive(again.preLeagueHistory), []);
  assert.ok(m.parts.prehistory.rawBytes > 300_000 && m.parts.core.rawBytes < JSON.stringify(base).length - 300_000, 'core no longer carries the archive');
});

test('a franchise without an archive keeps the three-part format exactly', async () => {
  const { backend, f } = await fresh(bare); const m = manifest(backend);
  assert.deepEqual(Object.keys(m.parts).sort(), ['core', 'draft', 'history'], 'a save without an archive gained a part');
  const core = await decodePart(backend.data.parts.get(m.parts.core.sum), m.parts.core.sum); const { history, draftResults, savedAt, ...expected } = f;
  assert.equal(JSON.stringify(core), JSON.stringify(expected), 'core is what it always was');
  assert.equal(text((await reopen(backend)).franchise), text(f));
});

test('later saves reuse the archive part: only what changed is written, and a save that changes nothing writes nothing', async () => {
  const { backend, store, f } = await fresh(base); const sum = manifest(backend).parts.prehistory.sum; const stored = backend.data.parts.get(sum);
  for (let i = 0; i < 4; i++) {
    const before = backend.puts.parts; f.news.push({ text: `note ${i}` }); f.roster[0].xp = (f.roster[0].xp || 0) + 1;
    const r = await store.save(f, { immediate: true }); assert.equal(r.ok, true);
    assert.equal(backend.puts.parts - before, 1, 'one part (core) was written'); assert.equal(manifest(backend).parts.prehistory.sum, sum); assert.equal(backend.data.parts.get(sum), stored, 'the archive part was rewritten');
  }
  const before = backend.puts.parts; const r = await store.save(f, { immediate: true }); assert.equal(r.unchanged, true); assert.equal(backend.puts.parts, before);
  assert.equal(text((await reopen(backend)).franchise), text(f));
  // the history and draft parts keep their own lives
  const coreSum = manifest(backend).parts.core.sum; f.history.push({ year: 1, record: { w: 5, l: 4 } }); assert.ok((await store.save(f, { immediate: true })).ok);
  assert.notEqual(manifest(backend).parts.history.sum, undefined); assert.equal(manifest(backend).parts.prehistory.sum, sum, 'a new season in the history rewrote the archive'); assert.equal(backend.data.parts.get(sum), stored); assert.ok(coreSum);
});

test('a save in the old three-part layout opens unchanged, stays as it is until something changes, then moves to four parts', async () => {
  const { backend, f } = await fresh(base); const old = await toThreePartLayout(backend); assert.deepEqual(Object.keys(old.parts).sort(), ['core', 'draft', 'history']);
  const store = createStore({ backend, localStorage: null, now, debounce: 0 }); const opened = await store.open();
  assert.equal(opened.mode, 'ready'); const g = opened.franchise; assert.equal(text(g), text(f), 'an old-layout save reads differently'); assert.deepEqual(Object.keys(g), Object.keys(f));
  const puts = backend.puts.parts; const same = await store.save(g, { immediate: true }); assert.equal(same.ok, true); assert.equal(same.unchanged, true, 'saving what was loaded is a no-op');
  assert.equal(backend.puts.parts, puts); assert.equal(manifest(backend).parts.prehistory, undefined, 'the layout changed without a change to save');
  g.news.push({ text: 'first real change' }); const moved = await store.save(g, { immediate: true }); assert.equal(moved.ok, true);
  assert.deepEqual(Object.keys(manifest(backend).parts).sort(), ['core', 'draft', 'history', 'prehistory']);
  const after = (await reopen(backend)).franchise; assert.equal(text(after), text(g)); assert.equal(JSON.stringify(after.preLeagueHistory), JSON.stringify(base.preLeagueHistory)); assert.deepEqual(Object.keys(after), Object.keys(g));
  // the previous version is in the rolling backups in its own (three-part) layout and still restores with its archive
  const roll = (await store.listBackups()).find((b) => b.id.endsWith(':roll0')); assert.ok(roll?.ok, 'the three-part version is a valid backup');
  const back = await store.readBackup(roll.id); assert.equal(JSON.stringify(back.preLeagueHistory), JSON.stringify(base.preLeagueHistory)); assert.ok(!back.news.some((n) => n.text === 'first real change'));
});

test('a retired franchise stored in the old layout is never re-laid-out: it opens, re-saves as a no-op, exports, and still refuses changes', async () => {
  const { f: played } = runFranchise(41, { seasons: 1, difficulty: 'rookie' }); while (played.scenes?.length) F.dismissScene(played);
  assert.ok(played.preLeagueHistory, 'the franchise has an archive'); const h = played.history[0]; while (played.history.length < 20) played.history.unshift({ ...h, year: played.history[0].year - 1 });
  assert.ok(L.finalizeArchive(played, { reason: 'season-cap' }).ok); assert.equal(L.isArchived(played), true);
  const { backend } = await fresh(played); await toThreePartLayout(backend); const sums = JSON.stringify(manifest(backend).parts);
  const store = createStore({ backend, localStorage: null, now, debounce: 0 }); const opened = await store.open();
  assert.equal(opened.mode, 'ready', `a retired franchise did not open: ${opened.error?.message || ''}`);
  const g = opened.franchise; assert.equal(L.isArchived(g), true);
  const r = await store.save(g, { immediate: true }); assert.equal(r.ok, true, `re-saving a retired franchise failed: ${r.error?.message}`); assert.equal(r.unchanged, true);
  assert.equal(JSON.stringify(manifest(backend).parts), sums, 'a read-only archive was rewritten in another layout');
  g.owner.first = 'Tampered'; const bad = await store.save(g, { immediate: true }); assert.equal(bad.ok, false); assert.equal(bad.error?.code, 'read-only');
  assert.equal(JSON.stringify(manifest(backend).parts), sums);
});

test('backups carry the archive: a kept copy, the rolling versions and a restore', async () => {
  const { backend, store, f } = await fresh(base);
  f.owner.first = 'One'; assert.ok((await store.save(f, { immediate: true })).ok); await store.keepCopy(f, 'weekly');
  f.owner.first = 'Two'; assert.ok((await store.save(f, { immediate: true })).ok); f.owner.first = 'Three'; assert.ok((await store.save(f, { immediate: true })).ok);
  const list = await store.listBackups(); assert.ok(list.length >= 3); assert.ok(list.every((b) => b.ok), JSON.stringify(list.filter((b) => !b.ok)));
  for (const b of list) { const g = await store.readBackup(b.id); assert.equal(JSON.stringify(g.preLeagueHistory), JSON.stringify(base.preLeagueHistory), `${b.kind} lost or changed the archive`); }
  const weekly = backend.data.backups.get(list.find((b) => b.kind === 'weekly').id); assert.ok(weekly.embedded.prehistory, 'a kept copy embeds its own archive part');
  const restored = await store.restore(list.find((b) => b.id.endsWith(':roll0')).id, f); assert.ok(restored.ok); assert.equal(restored.franchise.owner.first, 'Two'); assert.equal(JSON.stringify(restored.franchise.preLeagueHistory), JSON.stringify(base.preLeagueHistory));
  // every part still referenced is present; the shared archive part is stored once
  const m = manifest(backend); for (const n of Object.keys(m.parts)) assert.ok(backend.data.parts.has(m.parts[n].sum));
  assert.equal([...backend.data.parts.values()].filter((p) => p.sum === m.parts.prehistory.sum).length, 1);
});

test('the unload journal no longer carries the archive, and a journalled change is recovered with the archive intact', async () => {
  const ls = mkLs(); const { backend, f } = await fresh(base, { ls });
  const tab = createStore({ backend, localStorage: ls, now, debounce: 10_000 }); const g = (await tab.open()).franchise;
  g.owner.first = 'Journalled'; tab.save(g); assert.ok(tab.journal(g), 'a queued save was journalled');
  const key = [...ls.m.keys()].find((k) => k.startsWith(JOURNAL_KEY)); const body = JSON.parse(ls.getItem(key)).body; const j = JSON.parse(body);
  assert.equal(j.parts.prehistory, undefined, 'the journal copied the archive'); assert.ok(j.base.prehistory, 'it points at the stored archive part'); assert.ok(j.parts.core, 'the changed core is journalled'); assert.equal(JSON.parse(j.parts.core).preLeagueHistory, undefined, 'the journalled core carries the archive');
  assert.ok(body.length < JSON.stringify(j.parts.core).length + 20_000, 'the journal holds more than the changed part');
  const r = await reopen(backend, ls); assert.equal(r.franchise.owner.first, 'Journalled'); assert.equal(JSON.stringify(r.franchise.preLeagueHistory), JSON.stringify(base.preLeagueHistory));
  assert.equal(text(r.franchise), text({ ...g, savedAt: undefined }) , 'the recovered franchise is the journalled one');
});

test('export and import are unchanged by the layout: the file holds the whole franchise', async () => {
  const { backend, f } = await fresh(base); const v = validateImport(exportFranchise((await reopen(backend)).franchise));
  assert.ok(v.ok, v.problems?.[0]); assert.equal(JSON.stringify(v.franchise.preLeagueHistory), JSON.stringify(f.preLeagueHistory));
});

test('usage and status report the archive part with the save', async () => {
  const { backend, store } = await fresh(base); const m = manifest(backend); const u = await store.usage();
  const total = Object.values(m.parts).reduce((a, p) => a + p.bytes, 0); assert.equal(u.save, total, 'storage use leaves out a part'); assert.equal(u.raw, Object.values(m.parts).reduce((a, p) => a + p.rawBytes, 0));
  assert.equal(store.status().bytes, total);
});

// Code from before the fourth part deletes it as unreferenced and loads the franchise without its archive (checked with two real
// browser tabs, old code beside new). The database version is what shuts that code out, so it must never go back below 2.
test('the database version shuts out code that does not know the archive part', async () => {
  const { DB_VERSION } = await import('../src/franchise/store.js'); assert.ok(DB_VERSION >= 2, `DB_VERSION is ${DB_VERSION}`);
});
