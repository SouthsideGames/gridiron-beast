// The slot manager over one database (GDD §42.5, §42.9): migration of a v39.0 device straight into slot 1 of three, resumed
// if interrupted; a Phase 1 device unchanged; summaries read from storage; a fourth franchise refused; undo delete for one launch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import { memoryBackend, createStore } from '../src/franchise/store.js';
import { createSlotManager, ACTIVE_SLOT_KEY } from '../src/franchise/slots.js';
import { memoryLocalStorage } from './helpers/cloud-sim.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 });
let clock = 1_800_000_000_000; const now = () => (clock += 1000);
const mgr = (backend, ls) => createSlotManager({ backend, localStorage: ls, now, debounce: 0 });
const fresh = (club) => { const f = Save.migrate(fixture()); f.club = club; f.createdAt = `2026-09-0${club.length % 9 + 1}T00:00:00.000Z`; delete f.uid; return f; };

test('migration: a v39.0 device (localStorage save, no database) comes up as slot 1 active, slots 2 and 3 empty; the old save is untouched', async () => {
  const ls = memoryLocalStorage(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend(); const m = mgr(backend, ls);
  assert.equal(m.activeSlot(), 1, 'no pointer yet: slot 1');
  const r = await m.store(1).open(); assert.equal(r.mode, 'ready'); assert.equal(r.source, 'migrated');
  const list = await m.summaries(); assert.deepEqual(list.map((s) => s.state), ['active', 'empty', 'empty']);
  assert.equal(list[0].meta.club, r.franchise.club); assert.equal(list[0].uid, r.franchise.uid); assert.ok(list[0].meta.record, 'the record is on the card');
  assert.equal(ls.getItem(Save.SAVE_KEY), legacyText(), 'the legacy save is kept');
  assert.equal(JSON.stringify(Save.migrate(JSON.parse(legacyText())).roster), JSON.stringify(r.franchise.roster), 'the roster migrated byte for byte');
});

test('migration: interrupted after the backup copy, the next start resumes into slot 1 without duplicating anything', async () => {
  const ls = memoryLocalStorage(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend();
  backend.fail('manifest-written'); // the first start dies while the migrated save is being committed
  await assert.rejects(createStore({ backend, localStorage: ls, now, debounce: 0, slot: 1 }).migrateLegacy({ legacyText: legacyText() }));
  const m = mgr(backend, ls); const list0 = await m.summaries(); assert.equal(list0[0].state, 'migrating', 'the slot says the migration is unfinished');
  const r = await m.store(1).open(); assert.equal(r.mode, 'ready'); assert.equal(r.source, 'migrated');
  const list = await m.summaries(); assert.deepEqual(list.map((s) => s.state), ['active', 'empty', 'empty']);
  assert.equal([...backend.data.saves.keys()].length, 1, 'one live save'); assert.equal(backend.data.slots.get(1).migration.step, 'done');
});

test('a Phase 1 device (slot 1 already in the database, no pointer) opens its franchise in slot 1 unchanged', async () => {
  const ls = memoryLocalStorage(); const backend = memoryBackend();
  const p1 = createStore({ backend, localStorage: ls, now, debounce: 0 }); await p1.open(); const f = (await p1.replace(fresh('Phase One'), null, {})).franchise; // Phase 1's single store
  const before = JSON.stringify(backend.data.saves.get('slot1'));
  const m = mgr(backend, ls); const r = await m.store(m.activeSlot()).open();
  assert.equal(r.mode, 'ready'); assert.equal(r.franchise.uid, f.uid); assert.equal(JSON.stringify(backend.data.saves.get('slot1')), before, 'nothing rewritten by opening');
});

test('capacity: with three franchises there is no empty slot; a franchise already in a slot is found by uid', async () => {
  const ls = memoryLocalStorage(); const backend = memoryBackend(); const m = mgr(backend, ls); const made = [];
  for (const n of m.SLOTS) { await m.store(n).open(); made.push((await m.store(n).replace(fresh(`Team ${n}`), null, {})).franchise); }
  const r = await m.slotFor(); assert.equal(r.full, true); assert.deepEqual(r.empty, []);
  assert.equal((await m.slotFor({ uid: made[1].uid })).same, 2);
  assert.deepEqual((await m.summaries()).map((s) => s.meta.club), ['Team 1', 'Team 2', 'Team 3']);
});

test('summaries: an archived slot reports its status and Legacy headline without unpacking the save', async () => {
  const ls = memoryLocalStorage(); const backend = memoryBackend(); const m = mgr(backend, ls);
  const st = m.store(2); await st.open(); const f = (await st.replace(fresh('Archive FC'), null, {})).franchise;
  // make it look like a settled, retired franchise for the manifest (the lifecycle module's own tests cover the real steps)
  f.lifecycle = { status: 'retired', legacy: { v: 1, seasonsCompleted: 20, record: { w: 120, l: 60, t: 0 }, titles: 3, playoffAppearances: 12, reason: 'retired' }, seasonsCompleted: 20, retiredAt: now() };
  assert.ok((await st.save(f, { immediate: true })).ok);
  const s = (await m.summaries())[1]; assert.equal(s.state, 'retired'); assert.equal(s.lifecycle.legacyHeadline.record, '120-60'); assert.equal(s.lifecycle.legacyHeadline.titles, 3); assert.equal(s.lifecycle.legacy, undefined);
});

test('undo delete: offered during the launch that deleted, withdrawn at the next launch; the deleted copy stays as a backup', async () => {
  const ls = memoryLocalStorage(); const backend = memoryBackend(); const m = mgr(backend, ls); m.newLaunch();
  const st = m.store(3); await st.open(); const f = (await st.replace(fresh('Gone FC'), null, {})).franchise;
  await st.remove(f); const del = (await st.listBackups()).find((b) => b.kind === 'deleted'); assert.ok(del, 'a deleted copy is kept');
  m.noteDeletion({ slot: 3, backupId: del.id, uid: f.uid, club: f.club });
  assert.equal(m.pendingUndo()?.slot, 3); assert.equal((await m.summaries())[2].state, 'empty'); assert.ok((await m.summaries())[2].backups > 0);
  const back = await st.restore(del.id); assert.equal(back.ok, true); assert.equal(back.franchise.club, 'Gone FC'); m.clearUndo(); assert.equal(m.pendingUndo(), null);
  await st.remove(back.franchise); const del2 = (await st.listBackups()).find((b) => b.kind === 'deleted'); m.noteDeletion({ slot: 3, backupId: del2.id, uid: f.uid, club: f.club });
  const m2 = mgr(backend, ls); m2.newLaunch(); assert.equal(m2.pendingUndo(), null, 'a new launch withdraws the offer');
  assert.ok((await m2.store(3).listBackups()).some((b) => b.kind === 'deleted'), 'the backup itself remains for Restore a backup');
});

test('the active-slot pointer: set and read back; an invalid value falls back to slot 1', async () => {
  const ls = memoryLocalStorage(); const m = mgr(memoryBackend(), ls);
  m.setActiveSlot(2); assert.equal(m.activeSlot(), 2); ls.setItem(ACTIVE_SLOT_KEY, '9'); assert.equal(m.activeSlot(), 1);
  assert.throws(() => m.setActiveSlot(4), /No such save slot/); assert.throws(() => m.store(0), /No such save slot/);
});
