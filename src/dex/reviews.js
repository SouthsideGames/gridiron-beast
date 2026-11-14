export const REVIEW_COMPONENTS = Object.freeze(['visuals', 'audio', 'lore', 'football', 'clash', 'progression']);
const KEY = 'gridiron-beast-dex-reviews-v1';
let memory = {};
export function dexReviews() {
  try { memory = JSON.parse(globalThis.localStorage?.getItem(KEY) || JSON.stringify(memory)); } catch { /* retain session feedback */ }
  return memory;
}
export function saveDexReview(id, component, status, notes = '') {
  if (!id || !REVIEW_COMPONENTS.includes(component) || !['pending', 'approved', 'revision'].includes(status)) return false;
  const reviews = dexReviews();
  (reviews[id] ||= {})[component] = { status, notes: String(notes).slice(0, 4000), updatedAt: Date.now() };
  try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(KEY, JSON.stringify(reviews)); return true; } catch { return false; }
}
