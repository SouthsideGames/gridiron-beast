// PR #43 safety corrections (GDD §43.6): a restore never makes the backup the live franchise, or touches the cloud, before it
// is committed; a failed safety copy or commit leaves the current franchise live and saveable without a reload; rolling backups
// never promote a damaged generation over a good one. Each test reproduces a review finding (Codex threads r4356667058,
// r4356667063, r4356667067) and the failures around it: quota, another tab saving first, transaction aborts, corrupt backups.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';
import { restoreThenAdopt, replaceThenAdopt, legacyReplaceThenAdopt, shouldMirror } from '../src/franchise/activation.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 });
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
let clock = 1_800_000_000_000; const now = () => ++clock;
async function setup() {
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText());
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: ls, now, debounce: 0 });
  const { franchise: f } = await store.open();
  for (const n of ['A', 'B', 'C']) { f.owner.first = n; assert.ok((await store.save(f)).ok); } // live C, roll0 B, roll1 A
  return { ls, backend, store, f };
}
const reopen = (backend, ls) => createStore({ backend, localStorage: ls, now, debounce: 0 }).open();
/** Make the next read-write transaction that touches `store` fail as a full device would. */
function failNextWrite(backend, storeName, err = Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) {
  const run = backend.run.bind(backend); let armed = true;
  backend.run = (stores, mode, fn) => { if (armed && mode === 'readwrite' && stores.includes(storeName)) { armed = false; return Promise.reject(err); } return run(stores, mode, fn); };
}
const roll = (backend, k) => backend.data.backups.get(`1:${k}`);
const damageOnlyPart = (backend, sum) => { const p = backend.data.parts.get(sum); p.data = p.data instanceof Uint8Array ? new Uint8Array(p.data.length) : 'x'.repeat(p.data.length); };

// ------------------------------------------------------------ finding 2 (r4356667063): retire only after the safety copy
test('restore: when the pre-restore safety copy fails, the current franchise stays live and keeps saving without a reload', async () => {
  const { backend, store, f, ls } = await setup();
  failNextWrite(backend, 'backups'); // the safety copy of the current franchise cannot be written
  const r = await store.restore('1:roll1', f).catch((e) => ({ ok: false, error: e }));
  assert.equal(r.ok, false, 'the restore reports failure'); assert.equal(r.stage, 'copy'); assert.equal(r.error.code, 'quota');
  f.owner.first = 'StillPlaying'; const s = await store.save(f);
  assert.equal(s.ok, true, `the current franchise must still save (got ${s.error?.code})`);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'StillPlaying');
});
test('restore: a transaction abort while committing the restored franchise leaves the current franchise live and saveable', async () => {
  const { backend, store, f, ls } = await setup();
  backend.fail('manifest-written');
  const r = await store.restore('1:roll1', f).catch((e) => ({ ok: false, error: e }));
  assert.equal(r.ok, false);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'C', 'nothing was committed');
  f.owner.first = 'AfterAbort'; assert.equal((await store.save(f)).ok, true);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'AfterAbort');
});
test('restore: quota while committing the restored franchise: nothing changes, the current franchise keeps saving', async () => {
  const { backend, store, f, ls } = await setup();
  const run = backend.run.bind(backend); let n = 0;
  backend.run = (stores, mode, fn) => (mode === 'readwrite' && stores.includes('saves') && n++ === 0 ? Promise.reject(Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError' })) : run(stores, mode, fn));
  const r = await store.restore('1:roll1', f).catch((e) => ({ ok: false, error: e }));
  assert.equal(r.ok, false); assert.equal(r.error?.code, 'quota'); assert.equal(r.stage, 'commit');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'C');
  f.owner.first = 'AfterQuota'; assert.equal((await store.save(f)).ok, true);
});
test('restore: another tab saved first: the restore is refused, nothing changes, and this tab is told to reload', async () => {
  const { backend, store, f, ls } = await setup();
  const other = createStore({ backend, localStorage: ls, now, debounce: 0 }); const g = (await other.open()).franchise;
  g.owner.first = 'OtherTab'; await other.save(g);
  const r = await store.restore('1:roll1', f).catch((e) => ({ ok: false, error: e }));
  assert.equal(r.ok, false); assert.equal(r.error?.code, 'newer-elsewhere');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'OtherTab', 'the other tab\'s progress is intact');
});
test('restore: a corrupt backup is refused before anything is touched', async () => {
  const { backend, store, f, ls } = await setup();
  damageOnlyPart(backend, roll(backend, 'roll1').parts.core.sum);
  const r = await store.restore('1:roll1', f).catch((e) => ({ ok: false, error: e }));
  assert.equal(r.ok, false);
  assert.ok(![...backend.data.backups.keys()].some((k) => k.startsWith('1:pre-restore')), 'no safety copy was even needed');
  f.owner.first = 'AfterCorrupt'; assert.equal((await store.save(f)).ok, true);
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'AfterCorrupt');
});
test('restore: on success the restored franchise is committed first, the old one is kept, and saves still queued for the old one are dropped', async () => {
  const { backend, store, f, ls } = await setup();
  const r = await store.restore('1:roll1', f);
  assert.equal(r.ok, true); assert.equal(r.franchise.owner.first, 'A');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'A');
  f.owner.first = 'OldObject'; const late = await store.save(f); assert.equal(late.ok, false, 'a late save of the replaced object is ignored');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'A');
  r.franchise.owner.first = 'Continued'; assert.equal((await store.save(r.franchise)).ok, true, 'ordinary saving continues on the restored franchise');
});

// ------------------------------------------------------------ finding 1 (r4356667058): adopt and mirror only after the commit
test('activation: a failed restore never replaces the active franchise or reaches the cloud; a successful one adopts, then mirrors', async () => {
  for (const failure of ['copy', 'commit', 'corrupt', 'none']) {
    const { backend, store, f } = await setup();
    if (failure === 'copy') failNextWrite(backend, 'backups');
    if (failure === 'commit') backend.fail('manifest-written');
    if (failure === 'corrupt') damageOnlyPart(backend, roll(backend, 'roll1').parts.core.sum);
    const app = { f }; const events = [];
    const r = await restoreThenAdopt({ store, current: app.f, id: '1:roll1', adopt: (g) => { events.push('adopt'); app.f = g; }, mirror: () => events.push('mirror') });
    if (failure === 'none') { assert.equal(r.ok, true); assert.deepEqual(events, ['adopt', 'mirror']); assert.equal(app.f.owner.first, 'A'); }
    else { assert.equal(r.ok, false, failure); assert.deepEqual(events, [], `${failure}: nothing adopted or mirrored`); assert.equal(app.f, f); assert.equal((await store.save(f)).ok, true, `${failure}: still saves`); }
  }
});

// ------------------------------------------------------------ finding 3 (r4356667067): never promote a damaged roll0
test('rotation: a damaged roll0 is not promoted over a valid roll1; the newest valid points are kept', async () => {
  const { backend, store, f } = await setup();
  const r1Before = roll(backend, 'roll1'); damageOnlyPart(backend, roll(backend, 'roll0').parts.core.sum); // B's core is used only by roll0
  f.owner.first = 'D'; assert.ok((await store.save(f)).ok);
  assert.equal(roll(backend, 'roll1').seq, r1Before.seq, 'roll1 (A) is kept, not replaced by the damaged B');
  assert.equal((await store.readBackup('1:roll1')).owner.first, 'A');
  assert.equal((await store.readBackup('1:roll0')).owner.first, 'C');
  f.owner.first = 'E'; await store.save(f);
  assert.equal((await store.readBackup('1:roll0')).owner.first, 'D'); assert.equal((await store.readBackup('1:roll1')).owner.first, 'C');
});
test('rotation: corruption in each generation, shared and unshared parts: never a good point lost to a bad one, always something to recover', async () => {
  // live damaged (unshared core): not rotated in; roll0 and roll1 stay
  { const { backend, store, f } = await setup(); damageOnlyPart(backend, (await store.readManifest()).parts.core.sum);
    f.owner.first = 'D'; await store.save(f); assert.equal((await store.readBackup('1:roll0')).owner.first, 'B'); assert.equal((await store.readBackup('1:roll1')).owner.first, 'A'); }
  // roll1 damaged: replaced by the valid roll0 as usual
  { const { backend, store, f } = await setup(); damageOnlyPart(backend, roll(backend, 'roll1').parts.core.sum);
    f.owner.first = 'D'; await store.save(f); assert.equal((await store.readBackup('1:roll1')).owner.first, 'B'); assert.equal((await store.readBackup('1:roll0')).owner.first, 'C'); }
  // a shared part (history, used by live and both rolls) damaged: nothing verifies, nothing valid is overwritten, recovery
  // still has the independent copies (the protected original)
  { const { backend, store, f, ls } = await setup(); damageOnlyPart(backend, (await store.readManifest()).parts.history.sum);
    const r0 = roll(backend, 'roll0').seq, r1 = roll(backend, 'roll1').seq;
    f.history[0].touched = true; f.owner.first = 'D'; assert.ok((await store.save(f)).ok, 'the new save writes a fresh history part');
    assert.equal(roll(backend, 'roll0').seq, r0); assert.equal(roll(backend, 'roll1').seq, r1, 'damaged generations are left as they are, not shuffled');
    const back = await reopen(backend, ls); assert.equal(back.mode, 'ready'); assert.equal(back.franchise.owner.first, 'D');
    assert.ok((await store.listBackups()).some((b) => b.kind === 'legacy-original' && b.ok)); }
});

// ------------------------------------------------------------ the wider audit (GDD §43.6)
test('import and other replacements: committed before adoption; a failed safety copy or commit changes nothing', async () => {
  for (const failure of ['copy', 'commit', 'none']) {
    const { backend, store, f, ls } = await setup();
    const incoming = JSON.parse(JSON.stringify(f)); incoming.owner.first = 'Imported'; delete incoming.uid;
    if (failure === 'copy') failNextWrite(backend, 'backups');
    if (failure === 'commit') backend.fail('manifest-written');
    const app = { f }; const events = [];
    const r = await replaceThenAdopt({ store, current: f, franchise: incoming, copyKind: 'replaced', adopt: (g) => { events.push('adopt'); app.f = g; }, mirror: () => events.push('mirror') });
    if (failure === 'none') { assert.ok(r.ok); assert.deepEqual(events, ['adopt', 'mirror']); assert.equal((await reopen(backend, ls)).franchise.owner.first, 'Imported'); assert.ok((await store.listBackups()).some((b) => b.kind === 'replaced')); }
    else { assert.equal(r.ok, false); assert.deepEqual(events, []); assert.equal(app.f, f); f.owner.first = `after-${failure}`; assert.ok((await store.save(f)).ok); assert.equal((await reopen(backend, ls)).franchise.owner.first, `after-${failure}`); }
  }
});
test('fallback storage: a replacement is written first and adopted only if the write succeeded', () => {
  const cur = { owner: 'cur' }; const next = { owner: 'next', savedAt: 5 }; const app = { f: cur }; const ev = [];
  const bad = legacyReplaceThenAdopt({ write: () => false, franchise: next, adopt: (g) => { app.f = g; ev.push('adopt'); }, mirror: () => ev.push('mirror') });
  assert.equal(bad.ok, false); assert.equal(app.f, cur); assert.deepEqual(ev, []); assert.equal(next.savedAt, 5);
  const good = legacyReplaceThenAdopt({ write: () => true, franchise: next, adopt: (g) => { app.f = g; ev.push('adopt'); }, mirror: () => ev.push('mirror') });
  assert.ok(good.ok); assert.equal(app.f, next); assert.deepEqual(ev, ['adopt', 'mirror']);
});
test('cloud mirror policy: never ahead of the local attempt, never a stale tab or a replaced franchise; device failures still mirrored', async () => {
  assert.equal(shouldMirror({ ok: true }), true);
  for (const code of ['stale', 'newer-elsewhere', 'none', 'starting']) assert.equal(shouldMirror({ ok: false, error: { code } }), false, code);
  for (const code of ['quota', 'abort', 'legacy', 'checksum']) assert.equal(shouldMirror({ ok: false, error: { code } }), true, code);
  // a stale tab's save is refused locally, so its state is not mirrored either
  const { backend, store, f, ls } = await setup();
  const other = createStore({ backend, localStorage: ls, now, debounce: 0 }); const g = (await other.open()).franchise; g.owner.first = 'Other'; await other.save(g);
  f.owner.first = 'Stale'; const r = await store.save(f); assert.equal(shouldMirror(r), false);
});
test('after a failed restore the player keeps playing and saving from the original verified state, then a later restore works', async () => {
  const { backend, store, f, ls } = await setup();
  failNextWrite(backend, 'backups'); assert.equal((await store.restore('1:roll1', f)).ok, false);
  backend.fail('manifest-written'); assert.equal((await store.restore('1:roll1', f)).ok, false);
  for (const n of ['P1', 'P2', 'P3']) { f.owner.first = n; assert.ok((await store.save(f)).ok, n); }
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'P3');
  const r = await store.restore('1:roll0', f); assert.ok(r.ok); assert.equal(r.franchise.owner.first, 'P2');
  assert.equal((await reopen(backend, ls)).franchise.owner.first, 'P2');
});
test('delete holds the queue: a save queued for the franchise while it is being deleted cannot bring it back', async () => {
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend();
  const store = createStore({ backend, localStorage: ls, now, debounce: 5 }); const { franchise: f } = await store.open();
  const del = store.remove(f); f.owner.first = 'Ghost'; const late = store.save(f);
  await del; const lr = await late; assert.equal(lr.ok, false);
  await new Promise((r) => setTimeout(r, 30)); assert.equal((await reopen(backend, ls)).mode, 'empty');
});
