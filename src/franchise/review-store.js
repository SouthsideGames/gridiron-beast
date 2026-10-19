// Ability Audit reviews (GDD §23.6): the owner marks each signature ability
// Approved or Needs work and can leave a note. localStorage is the instant
// copy; inside claude.ai each review is mirrored to the shared artifact
// database (`ability_reviews/<speciesId>`), where the developer reads them.
// Newest `updatedAt` wins when the two disagree.

import { cloudLoadReviews, cloudSaveReview } from './cloud-save.js';

const KEY = 'gridiron-beast-ability-reviews';
let cache = null;
const listeners = new Set();

function readLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
function writeLocal(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage blocked: the cloud copy still holds it */ } }
function emit() { for (const fn of listeners) { try { fn(cache); } catch { /* ignore */ } } }

export function reviews() { if (!cache) cache = readLocal(); return cache; }
export function onReviews(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Pull the cloud copy once and merge (newest wins); local-only reviews are pushed up. */
export async function syncReviews() {
  const local = reviews(); const cloud = await cloudLoadReviews(); if (!cloud) return false;
  const merged = { ...local };
  for (const [id, r] of Object.entries(cloud)) if (!merged[id] || (r.updatedAt || 0) > (merged[id].updatedAt || 0)) merged[id] = r;
  for (const [id, r] of Object.entries(merged)) if (!cloud[id] || (cloud[id].updatedAt || 0) < (r.updatedAt || 0)) cloudSaveReview(id, r);
  cache = merged; writeLocal(cache); emit(); return true;
}

/** status: 'approved' | 'needs_work' | null. note: string. Clearing both removes the review. */
export function setReview(id, { status, note } = {}) {
  const all = reviews(); const prev = all[id] || { status: null, note: '' };
  const next = { status: status === undefined ? prev.status : status, note: note === undefined ? prev.note : String(note).slice(0, 2000), updatedAt: Date.now() };
  if (!next.status && !next.note.trim()) delete all[id]; else all[id] = next;
  writeLocal(all); emit();
  return cloudSaveReview(id, all[id] || null);
}

/** Plain-text summary for copying (outside claude.ai, where there is no shared database). */
export function reviewsText(entries) {
  const all = reviews(); const lines = [];
  for (const e of entries) { const r = all[e.sp.id]; if (!r) continue; lines.push(`${r.status === 'approved' ? 'APPROVED' : r.status === 'needs_work' ? 'NEEDS WORK' : 'NOTE'}: ${e.sp.name} (${e.eff?.name})${r.note ? `: ${r.note.trim()}` : ''}`); }
  return lines.join('\n');
}
