// Developer reviews (GDD §23.6–23.7): the owner marks each signature ability
// and each play Approved or Needs work, with a note and a "gameplay change"
// flag. localStorage is the instant copy; inside claude.ai each review is
// mirrored to the shared artifact database (`ability_reviews/<id>`,
// `play_reviews/<id>`), where the developer reads them. Newest `updatedAt`
// wins. Each review keeps the item's fingerprint (`fp`) at the time, so a
// later change to the item can ask for a fresh look.

import { cloudLoadReviews, cloudSaveReview } from './cloud-save.js';

const NS = { ability: { key: 'gridiron-beast-ability-reviews', col: 'ability_reviews' }, play: { key: 'gridiron-beast-play-reviews', col: 'play_reviews' } };
const cache = {};
const listeners = new Set();

function readLocal(ns) { try { return JSON.parse(localStorage.getItem(NS[ns].key) || '{}') || {}; } catch { return {}; } }
function writeLocal(ns, all) { try { localStorage.setItem(NS[ns].key, JSON.stringify(all)); } catch { /* storage blocked: the cloud copy still holds it */ } }
function emit() { for (const fn of listeners) { try { fn(); } catch { /* ignore */ } } }

export function reviews(ns = 'ability') {
  if (!cache[ns]) { cache[ns] = readLocal(ns); if (ns === 'play') migrateOldPlayNotes(cache[ns]); }
  return cache[ns];
}
export function onReviews(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** The Playbook Audit used to keep its own notes (v6); carry them over once. */
function migrateOldPlayNotes(all) {
  let old; try { old = JSON.parse(localStorage.getItem('gridiron-beast-audit-v6') || 'null'); } catch { old = null; }
  if (!old || localStorage.getItem('gridiron-beast-audit-v6-migrated')) return;
  for (const [id, n] of Object.entries(old)) {
    if (all[id]) continue;
    const status = n.status === 'approved' ? 'approved' : n.status === 'rework' ? 'needs_work' : null;
    if (status || (n.text || '').trim()) all[id] = { status, note: n.text || '', gameplay: false, fp: null, updatedAt: Date.parse(n.savedAt) || Date.now() };
  }
  writeLocal('play', all); try { localStorage.setItem('gridiron-beast-audit-v6-migrated', '1'); } catch { /* ignore */ }
}

/** Pull the cloud copy once per namespace and merge (newest wins); local-only reviews are pushed up. */
export async function syncReviews(ns = 'ability') {
  const local = reviews(ns); const cloud = await cloudLoadReviews(NS[ns].col); if (!cloud) return false;
  const merged = { ...local };
  for (const [id, r] of Object.entries(cloud)) if (!merged[id] || (r.updatedAt || 0) > (merged[id].updatedAt || 0)) merged[id] = r;
  for (const [id, r] of Object.entries(merged)) if (!cloud[id] || (cloud[id].updatedAt || 0) < (r.updatedAt || 0)) cloudSaveReview(NS[ns].col, id, r);
  cache[ns] = merged; writeLocal(ns, merged); emit(); return true;
}

/**
 * Update a review. Any of status ('approved' | 'needs_work' | null), note, gameplay (bool), mismatch (bool: the card says something the game does not do).
 * `fp` is the item's current fingerprint: a verdict is always about the version on screen.
 * Clearing status and note removes the review. Resolves true when the cloud took it.
 */
export function setReview(ns, id, { status, note, gameplay, mismatch, proposal } = {}, fp = null) {
  const all = reviews(ns); const prev = all[id] || { status: null, note: '', gameplay: false };
  const next = {
    status: status === undefined ? prev.status : status,
    note: note === undefined ? prev.note || '' : String(note).slice(0, 2000),
    gameplay: gameplay === undefined ? !!prev.gameplay : !!gameplay,
    mismatch: mismatch === undefined ? !!prev.mismatch : !!mismatch,
    proposal: proposal === undefined ? prev.proposal || null : proposal, // 'approved' | 'rejected' | null: the owner's call on a proposed new card
    fp: fp ?? prev.fp ?? null, updatedAt: Date.now(),
  };
  if (!next.status && !next.note.trim() && !next.gameplay && !next.mismatch && !next.proposal) delete all[id]; else all[id] = next;
  writeLocal(ns, all); emit();
  return cloudSaveReview(NS[ns].col, id, all[id] || null);
}
