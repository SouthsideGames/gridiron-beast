// Phase 2 flows across the store (GDD §42.5, §42.9, §42.10): voluntary retirement; an archive exported and imported back
// intact and still read-only; a failed archive write that leaves the franchise active and stored as it was; two tabs on
// different slots and on the same slot; a corrupted import refused with no slot changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../src/franchise/franchise.js';
import * as L from '../src/franchise/lifecycle.js';
import { createStore, memoryBackend, exportFranchise, validateImport } from '../src/franchise/store.js';
import { createSlotManager } from '../src/franchise/slots.js';
import { runFranchise } from '../tools/franchise-soak.mjs';
import { memoryLocalStorage } from './helpers/cloud-sim.js';

const settled = (seed) => { const { f, problems } = runFranchise(seed, { seasons: 1, difficulty: 'rookie' }); assert.deepEqual(problems, []); while (f.scenes?.length) F.dismissScene(f); return f; };
let clock = 1_850_000_000_000; const now = () => (clock += 1000);
const eligible = (f) => { const goals = F.hallOfFameProgress(f).rows; f.campaign ||= { badges: {}, gymWins: {}, titles: 0, wins: 0, awards: 0 }; for (const r of goals) { if (r.key === 'badges') { for (let i = 0; i < r.goal; i++) f.campaign.badges[`club-${i}`] = { year: 1 }; } else f.campaign[r.key] = r.goal; } return f; };

test('voluntary retirement: requested mid-season it waits; after the season it archives with a Hall of Fame card when eligible', () => {
  const f = eligible(settled(31));
  const mid = structuredClone(f); mid.season.finished = false; L.requestRetirement(mid); assert.equal(L.retirementDue(mid), null, 'waits for the season'); assert.equal(L.finalizeArchive(mid).ok, false);
  L.requestRetirement(f); assert.equal(L.retirementDue(f), 'voluntary');
  const card = F.retire(f); assert.ok(card.ok, 'eligible: a card is written (decision L)');
  const r = L.finalizeArchive(f, { reason: 'voluntary', hofCard: card.card }); assert.ok(r.ok); assert.equal(f.lifecycle.status, 'retired'); assert.equal(f.lifecycle.legacy.hallOfFame, card.card.id); assert.equal(f.lifecycle.pendingRetirement, undefined);
});

test('export and import: a complete franchise and an archive round-trip through the file; the archive stays read-only', async () => {
  const backend = memoryBackend(); const ls = memoryLocalStorage(); const m = createSlotManager({ backend, localStorage: ls, now, debounce: 0 });
  const active = settled(32); const s1 = m.store(1); await s1.open(); const live = (await s1.replace(active, null, {})).franchise;
  const text = exportFranchise(live); const v = validateImport(text); assert.ok(v.ok, v.problems?.[0]); assert.equal(v.franchise.uid, live.uid);
  assert.equal(JSON.stringify(v.franchise.roster), JSON.stringify(live.roster), 'the roster comes back byte for byte'); assert.equal(JSON.stringify(v.franchise.history), JSON.stringify(live.history));
  const s2 = m.store(2); await s2.open(); const copy = (await s2.replace({ ...v.franchise, uid: 'copy-uid' }, null, {})).franchise; assert.equal(copy.club, live.club); assert.equal((await m.slotFor({ uid: live.uid })).same, 1, 'the original is found by uid');
  // an archive: retire slot 1, export it, import into slot 3; it arrives archived and refuses changes
  const f = live; const h = f.history[0]; while (f.history.length < 20) f.history.unshift({ ...h, year: f.history[0].year - 1 });
  assert.ok(L.finalizeArchive(f, { reason: 'season-cap' }).ok); assert.ok((await s1.save(f, { immediate: true })).ok);
  const t2 = exportFranchise(f); const v2 = validateImport(t2); assert.ok(v2.ok, v2.problems?.[0]); assert.equal(v2.franchise.lifecycle.status, 'retired'); assert.ok(v2.franchise.lifecycle.legacy, 'the Legacy travels with the file');
  const s3 = m.store(3); await s3.open(); const imported = (await s3.replace({ ...v2.franchise, uid: 'archive-copy' }, null, {})).franchise;
  assert.equal(L.isArchived(imported), true); assert.throws(() => F.startNextSeason(imported), /read-only/);
  imported.owner.first = 'Tampered'; const r = await s3.save(imported, { immediate: true }); assert.equal(r.ok, false); assert.equal(r.error?.code, 'read-only');
  assert.deepEqual((await m.summaries()).map((s) => s.state), ['retired', 'active', 'retired']);
});

test('corrupted imports are refused with the reason, and no slot changes', async () => {
  const backend = memoryBackend(); const m = createSlotManager({ backend, localStorage: memoryLocalStorage(), now, debounce: 0 });
  const f = settled(33); const s1 = m.store(1); await s1.open(); await s1.replace(f, null, {}); const before = JSON.stringify([...backend.data.saves.entries()]);
  const good = exportFranchise(f);
  for (const [name, bad] of [['truncated', good.slice(0, good.length - 2000)], ['edited', (() => { const i = good.lastIndexOf('"club":"'); return `${good.slice(0, i + 8)}X${good.slice(i + 8)}`; })()], ['wrong format', JSON.stringify({ app: 'x', franchise: {} })], ['not json', 'hello']]) {
    const v = validateImport(bad); assert.equal(v.ok, false, `${name} accepted`); assert.ok(v.problems?.length, `${name}: no reason given`);
  }
  assert.equal(JSON.stringify([...backend.data.saves.entries()]), before);
});

test('a failed archive write leaves the stored save active and the franchise playable', async () => {
  const backend = memoryBackend(); const store = createStore({ backend, localStorage: null, debounce: 0 }); await store.open();
  const f = settled(34); const h = f.history[0]; while (f.history.length < 20) f.history.unshift({ ...h, year: f.history[0].year - 1 });
  assert.ok((await store.replace(f, null, {})).ok);
  const before = structuredClone(f); assert.ok(L.finalizeArchive(f, { reason: 'season-cap' }).ok);
  backend.fail('commit'); const r = await store.save(f, { immediate: true }); assert.equal(r.ok, false, 'the write failed');
  // what the app does on that failure (main.js archive): restore the in-memory franchise
  for (const k of Object.keys(f)) if (!(k in before)) delete f[k]; Object.assign(f, before);
  assert.equal(L.isArchived(f), false); assert.equal((await store.loadManifest(await store.readManifest())).lifecycle.status, 'active');
  const again = await store.save(f, { immediate: true }); assert.ok(again.ok || again.unchanged, 'the active franchise still saves');
});

test('two tabs: different slots save independently; the same slot refuses the tab that is behind', async () => {
  const backend = memoryBackend(); const ls = memoryLocalStorage();
  const tabA = createSlotManager({ backend, localStorage: ls, now, debounce: 0, writer: 'tabA' }); const tabB = createSlotManager({ backend, localStorage: ls, now, debounce: 0, writer: 'tabB' });
  const a1 = tabA.store(1); await a1.open(); const f1 = (await a1.replace(settled(35), null, {})).franchise;
  const b2 = tabB.store(2); await b2.open(); const f2 = (await b2.replace(settled(36), null, {})).franchise;
  f1.owner.first = 'A-edit'; f2.owner.first = 'B-edit';
  const [ra, rb] = await Promise.all([a1.save(f1, { immediate: true }), b2.save(f2, { immediate: true })]);
  assert.ok(ra.ok && rb.ok, 'different slots never conflict');
  // the same slot from tab B: it loads slot 1, tab A saves again, tab B's older state is refused
  const b1 = tabB.store(1); const g = (await b1.open()).franchise; assert.equal(g.owner.first, 'A-edit');
  f1.owner.first = 'A-newer'; assert.ok((await a1.save(f1, { immediate: true })).ok);
  g.owner.first = 'B-stale'; const rs = await b1.save(g, { immediate: true }); assert.equal(rs.ok, false); assert.equal(rs.error?.code, 'newer-elsewhere');
  assert.equal((await tabA.store(1).loadManifest(await a1.readManifest())).owner.first, 'A-newer');
});
