// Activating a different franchise (GDD §43.6): restoring a backup, importing a file, taking the cloud copy. The order is
// always the same: the new franchise is committed to local storage first (with a safety copy of the current one before it),
// and only after that commit succeeds does the game adopt it in memory and mirror it to the cloud. On any failure the current
// franchise stays active, saveable and mirrored as it was. Kept free of the DOM so it is tested directly.

import { classify } from './store.js';

const fail = (e) => ({ ok: false, error: e?.code && e?.message ? e : classify(e) });

/** Restore backup `id` in place of `current`; `adopt(f)` and `mirror(f)` run only after the restore is committed. */
export async function restoreThenAdopt({ store, current, id, adopt, mirror = () => {} }) {
  let r; try { r = await store.restore(id, current); } catch (e) { return fail(e); }
  if (!r?.ok) return r?.error ? r : fail(r);
  adopt(r.franchise); mirror(r.franchise); return r;
}
/** Commit `franchise` in place of `current` (keeping a `copyKind` copy of it), then adopt and mirror it. */
export async function replaceThenAdopt({ store, current, franchise, copyKind = 'replaced', adopt, mirror = () => {} }) {
  let r; try { r = await store.replace(franchise, current, { copyKind }); } catch (e) { return fail(e); }
  if (!r?.ok) return r?.error ? r : fail(r);
  adopt(r.franchise); mirror(r.franchise); return r;
}
/** Fallback storage (no IndexedDB): write synchronously first, adopt and mirror only if the write succeeded. */
export function legacyReplaceThenAdopt({ write, franchise, adopt, mirror = () => {} }) {
  const before = franchise.savedAt;
  let ok = false; try { ok = write(franchise); } catch { ok = false; }
  if (!ok) { franchise.savedAt = before; return { ok: false, error: { code: 'legacy', message: 'Saving to this device failed (browser storage is full or blocked). Nothing was changed.' } }; }
  adopt(franchise); mirror(franchise); return { ok: true, franchise, savedAt: franchise.savedAt };
}

/**
 * Whether an ordinary save's state may go to the cloud mirror once the local attempt has finished. Never before the local
 * attempt, and never for a state this tab must not write: a replaced franchise ('stale') or one another tab has saved since
 * ('newer-elsewhere'). When the device itself failed (full, blocked, aborted), the cloud still receives the progress, as in
 * v39.1: it is then the only copy of it, and the next start keeps the device's copy as a backup before using it.
 */
export function shouldMirror(r) {
  if (r?.ok) return true;
  return !['stale', 'newer-elsewhere', 'none', 'starting'].includes(r?.error?.code);
}
