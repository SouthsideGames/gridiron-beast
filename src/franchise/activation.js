// Activating a different franchise (GDD §43.6): restoring a backup, importing a file, taking the cloud copy. The order is
// always the same: the new franchise is committed to local storage first (with a safety copy of the current one before it),
// and only after that commit succeeds does the game adopt it in memory and mirror it to the cloud. On any failure the current
// franchise stays active, saveable and mirrored as it was. Kept free of the DOM so it is tested directly.

import { classify } from './store.js';

const fail = (e) => ({ ok: false, error: e?.code && e?.message ? e : classify(e) });

/**
 * Restore backup `id` in place of `current`. `adopt(f)` runs only after the restore is committed, and `mirror(snapshot)` gets
 * the committed snapshot (never the live object), in the same microtask chain as the commit, before any input can run.
 */
export async function restoreThenAdopt({ store, current, id, adopt, mirror = () => {} }) {
  let r; try { r = await store.restore(id, current); } catch (e) { return fail(e); }
  if (!r?.ok) return r?.error ? r : fail(r);
  adopt(r.franchise); mirror(r.snapshot); return r;
}
/**
 * Commit `franchise` in place of `current` (keeping a `copyKind` copy of it), then adopt and mirror it. `guard()`, when
 * given, is rechecked inside the store's exclusive operation right before and right after the commit: if it fails (the
 * player played on), the replacement does not happen and the newer local state stays live.
 */
export async function replaceThenAdopt({ store, current, franchise, copyKind = 'replaced', guard = null, adopt, mirror = () => {} }) {
  let r; try { r = await store.replace(franchise, current, { copyKind, guard }); } catch (e) { return fail(e); }
  if (!r?.ok) return r?.error ? r : fail(r);
  adopt(r.franchise); mirror(r.snapshot); return r;
}
/** Fallback storage (no IndexedDB): write synchronously first, adopt and mirror only if the write succeeded. */
export function legacyReplaceThenAdopt({ write, franchise, adopt, mirror = () => {} }) {
  const before = franchise.savedAt;
  let ok = false; try { ok = write(franchise); } catch { ok = false; }
  if (!ok) { franchise.savedAt = before; return { ok: false, error: { code: 'legacy', message: 'Saving to this device failed (browser storage is full or blocked). Nothing was changed.' } }; }
  const json = JSON.stringify(franchise); // the state just written, fixed now for the mirror
  const snapshot = { savedAt: franchise.savedAt, uid: franchise.uid ?? null, schemaVersion: franchise.schemaVersion ?? null, json: () => json };
  adopt(franchise); mirror(snapshot); return { ok: true, franchise, savedAt: franchise.savedAt, snapshot };
}

/**
 * Invariant A: only a committed local save authorises a cloud upload, and the upload is that save's committed snapshot. A
 * failed save, whatever the reason (full device, aborted transaction, another tab, a replaced franchise), authorises nothing.
 */
export function shouldMirror(r) { return !!r?.ok; }
