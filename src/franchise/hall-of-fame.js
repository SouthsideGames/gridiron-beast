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
