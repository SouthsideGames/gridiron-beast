// The Hall of Fame (GDD §15.9): cards for every GM career the player has
// retired, kept outside any franchise like the dex (localStorage key
// gridiron-beast-hof, mirrored to the per-viewer cloud doc `hof`).

export const HOF_KEY = 'gridiron-beast-hof';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
let cards = null; let mirror = null;

function load() {
  if (cards) return cards;
  try { const raw = storage()?.getItem(HOF_KEY); cards = raw ? JSON.parse(raw) : []; } catch { cards = []; }
  if (!Array.isArray(cards)) cards = [];
  return cards;
}
function persist() { try { storage()?.setItem(HOF_KEY, JSON.stringify(cards)); } catch { /* full or blocked */ } if (mirror) { try { mirror(cards); } catch { /* ignore */ } } }

export function hallOfFame() { return load().slice().sort((a, b) => (b.retiredAt || 0) - (a.retiredAt || 0)); }
export function setHofMirror(fn) { mirror = fn; }
export function addHofCard(card) { load(); if (!cards.some((c) => c.id === card.id)) { cards.push(card); persist(); } return card; }
/** Merge cards from another copy (the cloud); ids decide. */
export function mergeHof(other) { if (!Array.isArray(other)) return; load(); let changed = false; for (const c of other) if (c?.id && !cards.some((x) => x.id === c.id)) { cards.push(c); changed = true; } if (changed) persist(); }
export function resetHof() { cards = []; persist(); }
/** The cards of one franchise, by its permanent uid (GDD §42.3). Older cards name only a seed: see `linkHofCards`. */
export function hofCardsFor(uid) { return uid ? hallOfFame().filter((c) => c.uid === uid) : []; }
/**
 * Link older cards (written before franchises had a uid) to the franchise that wrote them: a card whose id carries that
 * franchise's seed and has no uid gets its uid. Records from different franchises never mix: a card already linked, or one
 * naming another seed, is left alone. Returns how many cards were linked.
 */
export function linkHofCards({ uid, seed }) {
  if (!uid || seed == null) return 0; load(); let n = 0;
  for (const c of cards) if (!c.uid && (c.seed === seed || String(c.id || '').startsWith(`hof_${seed}_`))) { c.uid = uid; if (c.seed == null) c.seed = seed; n++; }
  if (n) persist(); return n;
}
/** The same franchise known by two uids (see relinkAchievements): its cards move from `from` to `to`. Returns how many moved. */
export function relinkHofCards({ from, to }) {
  if (!from || !to || from === to) return 0; load(); let n = 0;
  for (const c of cards) if (c.uid === from) { c.uid = to; n++; }
  if (n) persist(); return n;
}
