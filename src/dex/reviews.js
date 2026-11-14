import { dexContent } from './content.js';
import { familyById, formById, abilitiesOf } from '../data/beast-dex.js';
import { cryRecipe } from '../audio/monster-cries.js';
export const REVIEW_COMPONENTS = Object.freeze(['visuals', 'audio', 'lore', 'football', 'clash', 'progression']);
const KEY = 'gridiron-beast-dex-reviews-v1';
const memory = {};
const record = value => value && typeof value === 'object' && !Array.isArray(value);
export function dexReviews() {
  let stored = {};
  try { const parsed = JSON.parse(globalThis.localStorage?.getItem(KEY) || '{}'); if (record(parsed)) stored = parsed; } catch { /* preserve session feedback */ }
  for (const [id, components] of Object.entries(memory)) {
    if (!record(stored[id])) stored[id] = {};
    for (const [component, review] of Object.entries(components)) if (!stored[id][component] || review.updatedAt >= stored[id][component].updatedAt) stored[id][component] = review;
  }
  return stored;
}
export function reviewFingerprint(id, component) {
  const form = formById(id); if (!form) return null;
  const family = familyById(form.familyId), content = dexContent(form.familyId, form.stage);
  const payload = component === 'audio' ? cryRecipe(id) : component === 'visuals' ? { appearance: family.appearance, stage: form.stage, version: 1 } : component === 'football' || component === 'clash' ? { form, ability: abilitiesOf(form.familyId)?.[component], scouting: content.scouting } : content;
  // Keep the exact reviewed payload: comparisons cannot accidentally approve a changed revision.
  return JSON.stringify(payload);
}
export function dexReviewStatus(id, component) {
  const row = dexReviews()[id]?.[component];
  return row?.fingerprint === reviewFingerprint(id, component) && ['pending', 'approved', 'revision'].includes(row.status) ? row.status : 'pending';
}
export function saveDexReview(id, component, status, notes = '') {
  if (!formById(id) || !REVIEW_COMPONENTS.includes(component) || !['pending', 'approved', 'revision'].includes(status)) return false;
  const reviews = dexReviews();
  const row = { status, notes: String(notes).slice(0, 4000), fingerprint: reviewFingerprint(id, component), updatedAt: Date.now() };
  (reviews[id] ||= {})[component] = row;
  (memory[id] ||= {})[component] = row;
  try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(KEY, JSON.stringify(reviews)); return true; } catch { return false; }
}
