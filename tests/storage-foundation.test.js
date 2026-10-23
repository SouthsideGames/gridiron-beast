// Storage foundation (GDD §43, Phase 1): lossless packing, the IndexedDB store (through the in-memory backend, which has the
// same all-or-nothing transactions and injectable failures), migration of the v39.1 localStorage save, ordering, backups,
// recovery, quota failures, the unload journal and export integrity. The real IndexedDB is exercised by tools/storage-check.py.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import * as F from '../src/franchise/franchise.js';
import { pack, unpack, checksum } from '../src/franchise/pack.js';
import { createStore, memoryBackend, exportFranchise, validateImport, JOURNAL_KEY, STORAGE_VERSION } from '../src/franchise/store.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 }); // a v39.1 save exactly as localStorage holds it (v39.1 always stamped savedAt)
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let clock = 1_800_000_000_000; const now = () => ++clock;
async function migrated({ quota } = {}) {
  const ls = mkLs(); const text = legacyText(); ls.setItem(Save.SAVE_KEY, text);
  const backend = memoryBackend({ quota }); const store = createStore({ backend, localStorage: ls, now, debounce: 0 });
  const r = await store.open(); return { ls, text, backend, store, r, f: r.franchise };
}
const reopen = (backend, ls) => createStore({ backend, localStorage: ls, now, debounce: 0 }).open();

// ------------------------------------------------------------ packing
test('pack: exact round trip on a real save, key order included, and smaller', () => {
  const f = fixture(); const raw = JSON.stringify(f); const p = JSON.stringify(pack(f));
  assert.equal(JSON.stringify(unpack(JSON.parse(p))), raw);
  assert.ok(p.length < raw.length * 0.7, `packed ${p.length} vs ${raw.length}`);
});
test('pack: escapes, sentinels and JSON edge cases survive unchanged', () => {
  const v = { '~': 1, '~0': '~0', '~*0': ['~*0', 1, 2], a: [undefined, NaN, Infinity, null, () => 1], b: undefined, 10: 'x', 2: 'y',
    rows: Array.from({ length: 5 }, (_, i) => ({ id: `m_${i}`, team: 'Stonehaven Titans', yds: i, '~x': '~~' })), deep: { d: new Date(0), s: 'Stonehaven Titans', t: 'Stonehaven Titans', u: 'Stonehaven Titans' } };
  assert.equal(JSON.stringify(unpack(JSON.parse(JSON.stringify(pack(v))))), JSON.stringify(v));
  const odd = JSON.parse('{"r":[{"a\\u0000b":1,"c":2,"d":3},{"a\\u0000b":4,"c":5,"d":6},{"__proto__":{"x":1},"c":1,"d":2}]}');
  assert.equal(JSON.stringify(unpack(JSON.parse(JSON.stringify(pack(odd))))), JSON.stringify(odd), 'NUL in keys and __proto__ keys');
  for (const x of [null, 0, 'str', [], {}, [[[]]], { a: { b: { c: [1, { d: 2 }] } } }]) assert.equal(JSON.stringify(unpack(pack(x))), JSON.stringify(x));
});
test('pack: a corrupted payload is refused, never half-read', () => {
  const p = pack({ rows: [{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }], s: ['Stonehaven Titans', 'Stonehaven Titans', 'Stonehaven Titans'] });
  assert.throws(() => unpack({ ...p, fmt: 'zzz' }));
  assert.throws(() => unpack({ ...p, s: [] }), /unknown code/);
  assert.throws(() => unpack({ ...p, h: [] }), /shaped/);
});

// ------------------------------------------------------------ migration
test('migration: the v39.1 save moves to IndexedDB, reads back identically, gains a uid, and the original is untouched', async () => {
  const { ls, text, store, r, f, backend } = await migrated();
  assert.equal(r.mode, 'ready'); assert.equal(r.source, 'migrated');
  assert.equal(ls.getItem(Save.SAVE_KEY), text, 'the legacy save is never modified or deleted');
  assert.match(f.uid, /^[0-9a-f-]{36}$/); assert.deepEqual(f.lifecycle, { status: 'active', seasonsCompleted: f.history.length });
  const { uid, lifecycle, ...rest } = f; assert.ok(same(rest, JSON.parse(text)), 'nothing but the uid and lifecycle was added');
  const slot = backend.data.slots.get(1); assert.equal(slot.state, 'active'); assert.equal(slot.migration.step, 'done');
  const m = await store.readManifest(); assert.equal(m.storage, STORAGE_VERSION); assert.equal(m.uid, f.uid); assert.ok(m.parts.core.sum && m.parts.history.sum);
  const again = await reopen(backend, ls); assert.equal(again.source, 'indexeddb'); assert.ok(same(again.franchise, f));
  const orig = (await store.listBackups()).find((b) => b.kind === 'legacy-original'); assert.ok(orig?.ok, 'the protected copy is restorable');
  assert.ok(same(await store.readBackup(orig.id), Save.migrate(JSON.parse(text))));
});
test('migration: interrupted at every step, the next start finishes it with the same franchise id and no duplicate', async () => {
  for (const point of ['migrate-copied', 'parts-written', 'manifest-written', 'migrate-switch']) {
    const ls = mkLs(); const text = legacyText(); ls.setItem(Save.SAVE_KEY, text); const backend = memoryBackend();
    backend.fail(point);
    const first = await createStore({ backend, localStorage: ls, now, debounce: 0 }).open();
    assert.equal(first.mode, 'legacy', `${point}: the game falls back to the untouched v39.1 save`); assert.equal(ls.getItem(Save.SAVE_KEY), text);
    const uidAfterFail = backend.data.slots.get(1)?.migration?.uid;
    const second = await reopen(backend, ls);
    assert.equal(second.source, 'migrated', point); assert.equal(backend.data.saves.size, 1, `${point}: one franchise`);
    if (uidAfterFail) assert.equal(second.franchise.uid, uidAfterFail, `${point}: the id is reused`);
    assert.equal(backend.data.slots.get(1).migration.attempts, uidAfterFail ? 2 : 1);
    const { uid, lifecycle, ...rest } = second.franchise; assert.ok(same(rest, JSON.parse(text)), `${point}: no progress lost`);
  }
});
test('migration: progress written later by an older copy of the game is adopted, never ignored, and the IndexedDB copy is kept', async () => {
  const { ls, f, backend, store } = await migrated();
  const old = JSON.parse(ls.getItem(Save.SAVE_KEY)); old.savedAt = clock + 10_000; old.owner.first = 'Later'; ls.setItem(Save.SAVE_KEY, JSON.stringify(old)); clock += 20_000;
  const r = await reopen(backend, ls); assert.equal(r.source, 'legacy-newer'); assert.equal(r.franchise.owner.first, 'Later');
  const kept = (await store.listBackups()).find((b) => b.kind === 'pre-legacy'); assert.ok(kept?.ok); assert.equal((await store.readBackup(kept.id)).owner.first, f.owner.first);
});
test('migration: saves past season 20 are preserved unchanged (no season limit is enforced)', async () => {
  const ls = mkLs(); const g = Save.migrate(fixture());
  for (let y = 0; y < 22; y++) g.history.push({ ...g.history[0], year: 100 + y }); ls.setItem(Save.SAVE_KEY, JSON.stringify(g));
  const r = await createStore({ backend: memoryBackend(), localStorage: ls, now, debounce: 0 }).open();
  assert.equal(r.franchise.history.length, g.history.length); assert.equal(r.franchise.lifecycle.seasonsCompleted, g.history.length);
});

// ------------------------------------------------------------ saving
test('saves: every request resolves after its commit; the last state wins; saves never interleave', async () => {
  const { store, f, backend, ls } = await migrated();
  let open = 0, max = 0; const run = backend.run.bind(backend);
  backend.run = async (s, mode, fn) => { if (mode === 'readwrite') { open++; max = Math.max(max, open); } try { return await run(s, mode, fn); } finally { if (mode === 'readwrite') open--; } };
  const ps = []; for (let i = 0; i < 25; i++) { f.owner.first = `Owner${i}`; ps.push(store.save(f)); }
  const res = await Promise.all(ps); assert.ok(res.every((r) => r.ok)); assert.equal(max, 1, 'one write transaction at a time');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'Owner24');
});
test('saves: a stale manifest from the same writer is refused, so an older save can never replace a newer one', async () => {
  const { store, f, backend } = await migrated();
  await store.save(f); const m = await store.readManifest();
  await assert.rejects(backend.run(['saves'], 'readwrite', async (t) => { const cur = await t.get('saves', 'slot1'); if (cur.writer === m.writer && cur.seq > m.seq - 1) throw Object.assign(new Error('stale'), { code: 'stale' }); }), /stale/);
  const before = await store.readManifest(); f.owner.first = 'Newer'; await store.save(f);
  assert.ok((await store.readManifest()).seq > before.seq);
});
test('saves: another tab that saved the franchise more recently is never overwritten by this tab\'s older state, whatever the clocks say', async () => {
  const { backend, ls } = await migrated();
  const tabA = createStore({ backend, localStorage: ls, now, debounce: 0 }); const a = (await tabA.open()).franchise;
  const tabB = createStore({ backend, localStorage: ls, now, debounce: 0 }); const b = (await tabB.open()).franchise;
  b.owner.first = 'TabB'; assert.ok((await tabB.save(b)).ok);
  a.owner.first = 'TabA-older'; const r = await tabA.save(a); // later on the clock, but based on what tab B has replaced
  assert.equal(r.ok, false); assert.equal(r.error.code, 'newer-elsewhere');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'TabB');
});
test('a stale tab can neither adopt its journal over newer progress nor delete it', async () => {
  const { backend, ls } = await migrated();
  const tabA = createStore({ backend, localStorage: ls, now, debounce: 10_000 }); const a = (await tabA.open()).franchise;
  const tabB = createStore({ backend, localStorage: ls, now, debounce: 0 }); const b = (await tabB.open()).franchise;
  b.owner.first = 'B1'; await tabB.save(b); b.owner.first = 'B2'; await tabB.save(b);
  a.owner.first = 'A-stale'; tabA.save(a); assert.ok(tabA.journal(a), 'tab A is hidden with its stale state queued');
  const r = await reopen(backend, ls); assert.equal(r.source, 'indexeddb'); assert.equal(r.franchise.owner.first, 'B2', 'the journal was not built on the live save');
  await assert.rejects(tabA.remove(a), /another tab/); assert.equal((await reopen(backend, ls)).franchise.owner.first, 'B2');
});
test('copies of a kind keep their three most recent, so a second replacement never erases the first', async () => {
  const { store, f } = await migrated();
  for (const n of ['R1', 'R2', 'R3', 'R4']) { f.owner.first = n; await store.keepCopy(f, 'replaced'); }
  const names = []; for (const b of (await store.listBackups()).filter((x) => x.kind === 'replaced')) names.push((await store.readBackup(b.id)).owner.first);
  assert.deepEqual(names.sort(), ['R2', 'R3', 'R4']);
});
test('saves: only changed parts are written (the archive is not re-written every save)', async () => {
  const { store, f, backend } = await migrated();
  const parts0 = backend.puts.parts; f.news.push({ text: 'core only' }); await store.save(f);
  assert.equal(backend.puts.parts - parts0, 1, 'just the core part');
  f.history[0].note = 'archive change'; await store.save(f); assert.equal(backend.puts.parts - parts0, 2, 'then only the history part');
  const r0 = JSON.stringify(backend.data.backups.get('1:roll0')); await store.save(f); // nothing changed but the time
  assert.equal(backend.puts.parts - parts0, 2, 'an unchanged save writes no part'); assert.equal(JSON.stringify(backend.data.backups.get('1:roll0')), r0, 'and rotates no backup');
  assert.equal((await store.readManifest()).savedAt, f.savedAt, 'its time is still recorded');
});
test('saves: a failure inside the transaction leaves the previous save whole; the error is reported and retry works', async () => {
  const { store, f, backend, ls } = await migrated();
  f.owner.first = 'Committed'; assert.ok((await store.save(f)).ok);
  f.owner.first = 'Lost?'; backend.fail('manifest-written');
  const bad = await store.save(f); assert.equal(bad.ok, false); assert.equal(store.status().state, 'error');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'Committed', 'all or nothing');
  assert.equal(f.owner.first, 'Lost?', 'the game state in memory is untouched');
  assert.ok((await store.save(f)).ok); assert.equal((await reopen(backend, ls)).franchise.owner.first, 'Lost?');
});
test('saves: running out of quota fails honestly and keeps the last good save', async () => {
  const { store, f, backend, ls } = await migrated();
  backend.quota = backend.bytes() + 1000; // the next real write cannot fit
  f.history.push(...JSON.parse(JSON.stringify(f.history))); const r = await store.save(f);
  assert.equal(r.ok, false); assert.equal(r.error.code, 'quota'); assert.match(r.error.message, /storage space/);
  assert.equal((await reopen(backend, ls)).franchise.history.length, f.history.length / 2);
});

// ------------------------------------------------------------ backups and recovery
test('backups: the two latest verified versions rotate; a damaged version is never rotated in', async () => {
  const { store, f, backend } = await migrated();
  for (const n of ['A', 'B', 'C']) { f.owner.first = n; await store.save(f); }
  const list = await store.listBackups(); const by = Object.fromEntries(list.map((b) => [b.kind, b]));
  assert.equal((await store.readBackup(by.roll0.id)).owner.first, 'B'); assert.equal((await store.readBackup(by.roll1.id)).owner.first, 'A');
  const m = await store.readManifest(); const p = backend.data.parts.get(m.parts.core.sum); p.data = p.data.slice(0, -5); // damage the live save's core
  f.owner.first = 'D'; await store.save(f);
  assert.equal((await store.readBackup('1:roll0')).owner.first, 'B', 'the damaged C was not rotated over B');
});
test('recovery: a corrupt save stops the game at recovery, lists valid backups, and restores only what the player picks', async () => {
  const { store, f, backend, ls } = await migrated();
  f.owner.first = 'Good'; await store.save(f); f.owner.first = 'Latest'; await store.save(f);
  const m = await store.readManifest(); const p = backend.data.parts.get(m.parts.core.sum); p.data = new Uint8Array(p.data.length);
  const r = await reopen(backend, ls);
  assert.equal(r.mode, 'recovery'); assert.equal(r.franchise, null); assert.equal(r.error.code, 'checksum');
  assert.ok(r.backups.some((b) => b.kind === 'roll0' && b.ok)); assert.ok(backend.data.backups.has('1:quarantine'), 'the damaged save is kept');
  const st2 = createStore({ backend, localStorage: ls, now, debounce: 0 }); await st2.open();
  const res = await st2.restore('1:roll0'); assert.ok(res.ok); assert.equal(res.franchise.owner.first, 'Good');
  const after = await reopen(backend, ls); assert.equal(after.mode, 'ready'); assert.equal(after.franchise.owner.first, 'Good');
  assert.ok(after.franchise.savedAt > f.savedAt, 'the restored state is stamped newest, so no older copy overrides it');
});
test('restore and delete keep what they replace: pre-restore and deleted copies', async () => {
  const { store, f, ls, backend } = await migrated();
  f.owner.first = 'One'; await store.save(f); f.owner.first = 'Two'; await store.save(f);
  const r = await store.restore('1:roll0', f); assert.equal(r.franchise.owner.first, 'One');
  assert.equal((await store.readBackup((await store.listBackups()).find((b) => b.kind === 'pre-restore').id)).owner.first, 'Two');
  await store.remove(r.franchise);
  const e = await reopen(backend, ls); assert.equal(e.mode, 'empty'); assert.equal(ls.getItem(Save.SAVE_KEY) !== null, true, 'the legacy save is still not deleted');
  assert.equal((await store.readBackup((await store.listBackups()).find((b) => b.kind === 'deleted').id)).owner.first, 'One');
});
test('weekly backup: an independent copy that survives damage to the live save, and the v39.1 weekly backup carries over', async () => {
  const ls = mkLs(); const text = legacyText(); ls.setItem(Save.SAVE_KEY, text); const wk = JSON.parse(text); wk.owner.first = 'LastWeek'; ls.setItem(Save.BACKUP_KEY, JSON.stringify(wk));
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: ls, now, debounce: 0 }); const { franchise: f } = await store.open();
  assert.equal((await store.readBackup('1:weekly')).owner.first, 'LastWeek');
  await store.keepCopy(f, 'weekly'); for (const p of backend.data.parts.values()) p.data = 'x';
  assert.equal((await store.readBackup('1:weekly')).owner.first, f.owner.first);
});

// ------------------------------------------------------------ the unload journal
test('journal: a save still queued when the page goes away is recovered at the next start; a foreign or older journal is ignored', async () => {
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend();
  const store = createStore({ backend, localStorage: ls, now, debounce: 10_000 }); const { franchise: f } = await store.open();
  f.owner.first = 'Unsaved'; store.save(f); assert.ok(store.journal(f)); // the page is hidden before the debounce fires
  const j = JSON.parse(ls.getItem(JOURNAL_KEY)); assert.ok(!JSON.parse(j.body).parts.history, 'only changed parts are journaled');
  const r = await reopen(backend, ls); assert.equal(r.source, 'journal'); assert.equal(r.franchise.owner.first, 'Unsaved'); assert.equal(ls.getItem(JOURNAL_KEY), null);
  const body = JSON.stringify({ v: 2, uid: 'someone-else', savedAt: clock + 99_999, order: [], base: {}, parts: {} }); ls.setItem(JOURNAL_KEY, JSON.stringify({ sum: checksum(body), body }));
  assert.equal((await reopen(backend, ls)).source, 'indexeddb'); assert.equal(ls.getItem(JOURNAL_KEY), null);
});

// ------------------------------------------------------------ export and import
test('export: complete and verifiable; tampering, truncation and foreign files are refused; older .json exports still import', async () => {
  const { f } = await migrated();
  const text = exportFranchise(f); const v = validateImport(text);
  assert.ok(v.ok, v.problems.join()); assert.ok(same(v.franchise, f)); assert.equal(v.format, 'gbfranchise'); assert.equal(v.uid, f.uid);
  const env = JSON.parse(text); assert.equal(env.format, 'gridiron-beast-franchise'); assert.equal(env.storage, 7); assert.equal(env.meta.club, f.club);
  assert.equal(validateImport(text.replace(`"first":"${f.owner.first}"`, '"first":"Edited"')).ok, false);
  assert.equal(validateImport(text.slice(0, -100)).ok, false);
  assert.equal(validateImport('{"hello":1}').ok, false); assert.equal(validateImport('not json').ok, false);
  const legacyExport = validateImport(Save.exportJson(f)); assert.ok(legacyExport.ok); assert.match(legacyExport.warnings[0], /older export/);
  const dup = JSON.parse(text); dup.franchise.roster[1].id = dup.franchise.roster[0].id; delete dup.checksum; assert.equal(validateImport(JSON.stringify(dup)).ok, false);
});

// ------------------------------------------------------------ preservation
test('preservation: careers, timelines, Hall of Fame snapshots, awards, history and draft results survive every path byte for byte', async () => {
  const { store, f, backend, ls } = await migrated();
  f.draftResults = f.draftResults || { 'Stonehaven Titans': [] };
  const careers = JSON.stringify(f.roster.map((m) => [m.id, m.career, m.stats])); const history = JSON.stringify(f.history); const draft = JSON.stringify(f.draftResults);
  await store.save(f); await store.keepCopy(f, 'weekly');
  for (const g of [(await reopen(backend, ls)).franchise, await store.readBackup('1:weekly'), validateImport(exportFranchise(f)).franchise]) {
    assert.equal(JSON.stringify(g.roster.map((m) => [m.id, m.career, m.stats])), careers); assert.equal(JSON.stringify(g.history), history); assert.equal(JSON.stringify(g.draftResults), draft);
  }
});
test('a new franchise gets its uid from the store at its first save, from the platform, never from the game RNG', async () => {
  const opts = { owner: { first: 'A', last: 'B' }, club: 'Stonehaven Titans', cornerstoneOffense: 'Pyronix', cornerstoneDefense: 'Granigor', seed: 77 };
  const a = F.createFranchise(opts), b = F.createFranchise(opts); const rng = a.rngState;
  const store = createStore({ backend: memoryBackend(), localStorage: mkLs(), now, debounce: 0 }); assert.equal((await store.open()).mode, 'empty');
  assert.ok((await store.save(a)).ok); await store.save(b);
  assert.match(a.uid, /^[0-9a-f-]{36}$/); assert.notEqual(a.uid, b.uid); assert.equal(a.rngState, rng, 'the game RNG is untouched');
});
