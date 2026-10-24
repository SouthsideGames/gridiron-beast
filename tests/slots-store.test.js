// Three independent save slots over one database (GDD §42.5, Phase 2). Each slot has its own store instance; saving,
// backing up, restoring, deleting or migrating in one slot never touches another.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as Save from '../src/franchise/save.js';
import { createStore, memoryBackend } from '../src/franchise/store.js';

const fixture = () => JSON.parse(fs.readFileSync(new URL('./fixtures/save-v31-season2.json', import.meta.url), 'utf8')).franchise;
const legacyText = () => JSON.stringify({ ...Save.migrate(fixture()), savedAt: 1_790_000_000_000 });
const mkLs = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; }, m }; };
let clock = 1_800_000_000_000; const now = () => (clock += 1000);
const tab = (backend, ls, slot, o = {}) => createStore({ backend, localStorage: ls, now, debounce: 0, slot, ...o });
const fresh = (club) => { const f = Save.migrate(fixture()); f.club = club; f.createdAt = new Date(Date.UTC(2026, 6, 1) + ([...club].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 86_400_000, 7))).toISOString(); delete f.uid; return f; }; // distinct clubs, distinct creation stamps: a franchise without a uid is identified by stamp and seed (GDD §47.4)

test('slots: the legacy v39.0 save migrates into slot 1 only; slots 2 and 3 open empty and never read it', async () => {
  const ls = mkLs(); ls.setItem(Save.SAVE_KEY, legacyText()); const backend = memoryBackend();
  const r1 = await tab(backend, ls, 1).open(); assert.equal(r1.mode, 'ready'); assert.equal(r1.source, 'migrated');
  const r2 = await tab(backend, ls, 2).open(); assert.equal(r2.mode, 'empty'); assert.equal(r2.franchise, null);
  const r3 = await tab(backend, ls, 3).open(); assert.equal(r3.mode, 'empty');
  assert.equal(ls.getItem(Save.SAVE_KEY), legacyText(), 'the legacy save is untouched');
  assert.equal(backend.data.slots.get(2), undefined, 'slot 2 wrote no record by opening');
});

test('slots: three franchises save, back up and reload independently; a save in one slot changes nothing in the others', async () => {
  const ls = mkLs(); const backend = memoryBackend();
  const stores = [1, 2, 3].map((n) => tab(backend, ls, n)); const fs3 = [];
  for (const [i, st] of stores.entries()) { await st.open(); const f = fresh(`Club ${i + 1}`); const r = await st.replace(f, null, {}); assert.ok(r.ok, `slot ${i + 1} created`); fs3.push(r.franchise); }
  const uids = new Set(fs3.map((f) => f.uid)); assert.equal(uids.size, 3, 'three distinct permanent ids');
  const before = (n) => JSON.stringify([backend.data.saves.get(`slot${n}`), backend.data.slots.get(n)]);
  const s2 = before(2), s3 = before(3);
  for (let i = 0; i < 4; i++) { fs3[0].owner.first = `Edit${i}`; assert.ok((await stores[0].save(fs3[0], { immediate: true })).ok); }
  assert.equal(before(2), s2, 'slot 2 unchanged'); assert.equal(before(3), s3, 'slot 3 unchanged');
  const b1 = await stores[0].listBackups(); assert.ok(b1.some((b) => b.kind === 'roll0'), 'slot 1 has rolling backups');
  assert.deepEqual((await stores[1].listBackups()).map((b) => b.id).filter((id) => !id.startsWith('2:')), [], 'slot 2 lists only its own backups');
  // a fresh set of stores (a new tab) reloads each slot's own franchise
  for (const [i, n] of [1, 2, 3].entries()) { const r = await tab(backend, ls, n).open(); assert.equal(r.mode, 'ready'); assert.equal(r.franchise.club, `Club ${i + 1}`); assert.equal(r.franchise.uid, fs3[i].uid); }
});

test('slots: deleting slot 2 keeps slots 1 and 3 whole, and a restore in slot 1 cannot pick a backup of slot 3', async () => {
  const ls = mkLs(); const backend = memoryBackend();
  const stores = [1, 2, 3].map((n) => tab(backend, ls, n)); const fs3 = [];
  for (const [i, st] of stores.entries()) { await st.open(); const r = await st.replace(fresh(`Team ${i + 1}`), null, {}); fs3.push(r.franchise); }
  fs3[2].owner.first = 'Third-v2'; await stores[2].save(fs3[2], { immediate: true }); // slot 3 has a roll0 backup now
  const s1 = JSON.stringify(backend.data.saves.get('slot1')), s3 = JSON.stringify(backend.data.saves.get('slot3'));
  await stores[1].remove(fs3[1]);
  assert.equal(backend.data.saves.get('slot2'), undefined); assert.equal(backend.data.slots.get(2).state, 'empty');
  assert.equal(JSON.stringify(backend.data.saves.get('slot1')), s1); assert.equal(JSON.stringify(backend.data.saves.get('slot3')), s3);
  assert.equal((await tab(backend, ls, 3).open()).franchise.club, 'Team 3', 'slot 3 still loads');
  const foreign = (await stores[2].listBackups()).find((b) => b.kind === 'roll0'); assert.ok(foreign);
  await assert.rejects(stores[0].readBackup(foreign.id), /another franchise slot/);
});

test('slots: each slot keeps its own unload journal; adopting one never clears another slot\'s', async () => {
  const ls = mkLs(); const backend = memoryBackend();
  const A = tab(backend, ls, 1, { debounce: 60_000 }); const B = tab(backend, ls, 2, { debounce: 60_000 });
  await A.open(); await B.open();
  const a = (await A.replace(fresh('Alpha'), null, {})).franchise; const b = (await B.replace(fresh('Beta'), null, {})).franchise;
  a.owner.first = 'A-unsaved'; A.save(a); assert.ok(A.journal(a)); b.owner.first = 'B-unsaved'; B.save(b); assert.ok(B.journal(b));
  const r1 = await tab(backend, ls, 1).open(); assert.equal(r1.source, 'journal'); assert.equal(r1.franchise.owner.first, 'A-unsaved');
  const r2 = await tab(backend, ls, 2).open(); assert.equal(r2.source, 'journal', 'slot 2 journal survived slot 1 adopting its own'); assert.equal(r2.franchise.owner.first, 'B-unsaved');
});

test('slots: usage is reported per slot', async () => {
  const ls = mkLs(); const backend = memoryBackend();
  const S1 = tab(backend, ls, 1); const S2 = tab(backend, ls, 2); await S1.open(); await S2.open();
  await S1.replace(fresh('One'), null, {}); const u2empty = await S2.usage(); assert.equal(u2empty.save, 0, 'an empty slot owns no bytes');
  await S2.replace(fresh('Two'), null, {}); const u1 = await S1.usage(); const u2 = await S2.usage(); assert.ok(u1.save > 0 && u2.save > 0);
});
