// The three-slot save manager (GDD §42.5, Phase 2). One store per slot over one database; each slot is independent: saving,
// backing up, deleting or restoring one never touches another. The active slot (the one the game plays) is a small pointer in
// localStorage; everything else is read from the slot records and manifests, never from a cache.

import { createStore, SLOT } from './store.js';
import { isArchivedManifest } from './lifecycle.js';

export const SLOT_COUNT = 3;
export const ACTIVE_SLOT_KEY = 'gridiron-beast-v7-active-slot';
export const UNDO_KEY = 'gridiron-beast-v7-undo-delete';
export const LAUNCH_KEY = 'gridiron-beast-v7-launch';
export const SLOTS = Object.freeze([1, 2, 3]);

export function createSlotManager({ backend, localStorage: ls = (() => { try { return globalThis.localStorage || null; } catch { return null; } })(), now = () => Date.now(), debounce, writer } = {}) {
  const stores = new Map();
  const get = (k) => { try { return ls?.getItem(k) ?? null; } catch { return null; } };
  const set = (k, v) => { try { if (v == null) ls?.removeItem(k); else ls?.setItem(k, String(v)); } catch { /* blocked: the pointer is a convenience */ } };
  /** The store for a slot, created on first use (same backend, same writer id for the journal). */
  function store(slot) {
    if (!SLOTS.includes(slot)) throw new TypeError(`No such save slot: ${slot}`);
    if (!stores.has(slot)) stores.set(slot, createStore({ backend, slot, localStorage: ls, now, ...(debounce != null ? { debounce } : {}), ...(writer ? { writer } : {}) }));
    return stores.get(slot);
  }
  /** Which slot the game plays: the pointer, else slot 1 (where the Phase 1 and legacy saves live). */
  function activeSlot() { const n = Number(get(ACTIVE_SLOT_KEY)); return SLOTS.includes(n) ? n : SLOT; }
  function setActiveSlot(slot) { if (!SLOTS.includes(slot)) throw new TypeError(`No such save slot: ${slot}`); set(ACTIVE_SLOT_KEY, slot); }

  /**
   * What each slot holds, read from the stored records (never from memory): { slot, state, uid, meta, lifecycle, savedAt,
   * bytes, backups }. `state`: 'empty' | 'active' | 'retired' | 'fired' | 'migrating' | 'damaged' (a record says active but
   * the save cannot be read: recovery). Never throws for one bad slot: that slot is reported 'damaged'.
   */
  async function summaries() {
    const out = [];
    for (const slot of SLOTS) {
      try {
        const [rec, m, backupKeys] = await backend.run(['slots', 'saves', 'backups'], 'readonly', async (t) => [await t.get('slots', slot), await t.get('saves', `slot${slot}`), (await t.keys('backups')).filter((k) => typeof k === 'string' && k.startsWith(`${slot}:`))]);
        const backups = backupKeys.length;
        if (!m) { out.push({ slot, state: rec?.state === 'migrating' ? 'migrating' : rec?.state === 'active' ? 'damaged' : 'empty', uid: rec?.uid ?? null, meta: null, lifecycle: null, savedAt: rec?.savedAt ?? null, bytes: 0, backups }); continue; }
        const state = isArchivedManifest(m) ? m.lifecycle.status : 'active';
        const bytes = ['core', 'history', 'draft'].reduce((a, n) => a + (m.parts?.[n]?.bytes || 0), 0);
        out.push({ slot, state, uid: m.uid ?? rec?.uid ?? null, meta: m.meta || null, lifecycle: m.lifecycle || null, savedAt: m.savedAt ?? null, bytes, backups });
      } catch (e) { out.push({ slot, state: 'damaged', uid: null, meta: null, lifecycle: null, savedAt: null, bytes: 0, backups: 0, error: e?.message || String(e) }); }
    }
    return out;
  }
  const emptySlots = (list) => list.filter((s) => s.state === 'empty').map((s) => s.slot);
  /** A new franchise or an import needs an empty slot (GDD §42.1 rule 2). */
  async function slotFor({ uid = null } = {}) {
    const list = await summaries();
    const same = uid ? list.find((s) => s.uid === uid && s.state !== 'empty') : null;
    return { list, empty: emptySlots(list), same: same?.slot ?? null, full: emptySlots(list).length === 0 };
  }

  // ---- undo delete (decision N): the deleted copy is a backup of its slot; the undo offer lasts for the launch that deleted it
  function launchId() { let id = get(LAUNCH_KEY); if (!id) { id = `${now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; set(LAUNCH_KEY, id); } return id; }
  /** Called once at start: a new launch. The undo offer of an earlier launch is withdrawn (the backup itself stays). */
  function newLaunch() { set(LAUNCH_KEY, null); const id = launchId(); const u = pendingUndo(); if (u && u.launch !== id) set(UNDO_KEY, null); return id; }
  function noteDeletion({ slot, backupId, uid, club, meta }) { set(UNDO_KEY, JSON.stringify({ slot, backupId, uid, club, meta: meta || null, at: now(), launch: launchId() })); }
  function pendingUndo() { try { const u = JSON.parse(get(UNDO_KEY) || 'null'); return u && SLOTS.includes(u.slot) ? u : null; } catch { return null; } }
  function clearUndo() { set(UNDO_KEY, null); }

  return { store, stores, activeSlot, setActiveSlot, summaries, slotFor, emptySlots, newLaunch, noteDeletion, pendingUndo, clearUndo, SLOTS, SLOT_COUNT };
}
