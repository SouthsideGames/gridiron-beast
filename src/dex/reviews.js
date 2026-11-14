import { dexContent } from './content.js';
import { familyById, formById, formsOf, abilitiesOf } from '../data/beast-dex.js';
import { SPECIES_DEX } from '../data/species.js';
import { evolvedSpec } from '../data/monsters.js';
import { SPECS } from '../sim/abilities/review-texts.js';
import { cryRecipe } from '../audio/monster-cries.js';
import { dexMotion } from '../ui/dex-motion.js';
export const REVIEW_COMPONENTS = Object.freeze(['visuals', 'audio', 'lore', 'football', 'clash', 'progression']);
const KEY = 'gridiron-beast-dex-reviews-v1';
const memory = {};
const record = value => value && typeof value === 'object' && !Array.isArray(value);
const speciesById = new Map(SPECIES_DEX.map(s => [s.id, s]));

// Compact content-revision digest (not a security primitive). Avoid storing entire
// biographies and ability contracts six times per form in limited device storage.
export function reviewDigest(text) {
  let a = 1779033703, b = 3144134277, c = 1013904242, d = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    a = b ^ Math.imul(a ^ k, 597399067); b = c ^ Math.imul(b ^ k, 2869860233);
    c = d ^ Math.imul(c ^ k, 951274213); d = a ^ Math.imul(d ^ k, 2716044179);
  }
  a = Math.imul(c ^ (a >>> 18), 597399067); b = Math.imul(d ^ (b >>> 22), 2869860233);
  c = Math.imul(a ^ (c >>> 17), 951274213); d = Math.imul(b ^ (d >>> 19), 2716044179);
  return 'v2:' + [a ^ b ^ c ^ d, b ^ a, c ^ a, d ^ a].map(n => (n >>> 0).toString(16).padStart(8, '0')).join('');
}
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
  const form = formById(id); if (!form || !REVIEW_COMPONENTS.includes(component)) return null;
  const family = familyById(form.familyId), content = dexContent(form.familyId, form.stage);
  let payload;
  switch (component) {
    case 'audio': payload = cryRecipe(id); break;
    case 'visuals': payload = { appearance: evolvedSpec(speciesById.get(form.familyId), form.stage), reactions: content.reactions, motion: dexMotion(form.familyId, form.stage), version: 2 }; break; // the portrait motion is part of what a visuals verdict approves
    case 'football': case 'clash': payload = { form, ability: abilitiesOf(form.familyId)?.[component], scouting: content.scouting, ...(component === 'football' ? { explanation: SPECS[form.familyId] } : {}) }; break;
    case 'progression': payload = { forms: formsOf(form.familyId).map(x => ({ id: x.id, name: x.name, level: x.evolutionLevel })), development: content.development, lore: content.lore, thresholds: [5,15,30], shared: true }; break;
    case 'lore': payload = { biography: content.biography, personality: content.personality, habitat: content.habitat, facts: content.funFacts, relationships: content.relationships, lore: content.lore }; break;
  }
  return reviewDigest(JSON.stringify(payload));
}
export function dexReviewStatus(id, component, snapshot = null) {
  const row = (snapshot || dexReviews())[id]?.[component];
  if (!row) return 'pending';
  const fingerprint = reviewFingerprint(id, component);
  return fingerprint && row?.fingerprint === fingerprint && ['pending', 'approved', 'revision'].includes(row.status) ? row.status : 'pending';
}
export function saveDexReview(id, component, status, notes = '') {
  if (!formById(id) || !REVIEW_COMPONENTS.includes(component) || !['pending', 'approved', 'revision'].includes(status)) return false;
  const reviews = dexReviews();
  const row = { status, notes: String(notes).slice(0, 4000), fingerprint: reviewFingerprint(id, component), updatedAt: Date.now() };
  (reviews[id] ||= {})[component] = row;
  (memory[id] ||= {})[component] = row;
  try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(KEY, JSON.stringify(reviews)); return true; } catch { return false; }
}
