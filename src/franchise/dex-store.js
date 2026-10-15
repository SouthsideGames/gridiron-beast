// The player's Beast Dex, kept outside any franchise (GDD §15.1): species seen
// and signed across every franchise this player has run. localStorage is the
// primary copy; inside claude.ai it is also mirrored to the per-viewer cloud
// document `dex`. Franchises keep their own f.dex too (for "on your roster"
// and per-franchise milestones); the Beast Dex screen shows the union.

export const DEX_KEY = 'gridiron-beast-dex';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

let dex = null; // { seen: {id: stamp}, signed: {id: stamp}, franchises: n, updatedAt }
let mirror = null; // (dex) => void, set by the cloud layer

const blank = () => ({ seen: {}, signed: {}, franchises: 0, updatedAt: 0 });
function load() {
  if (dex) return dex;
  const s = storage();
  try { const raw = s?.getItem(DEX_KEY); dex = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); } catch { dex = blank(); }
  return dex;
}
function persist() {
  dex.updatedAt = Date.now();
  const s = storage(); try { s?.setItem(DEX_KEY, JSON.stringify(dex)); } catch { /* full or blocked */ }
  if (mirror) { try { mirror(dex); } catch { /* ignore */ } }
}

export function dexData() { return load(); }
export function setDexMirror(fn) { mirror = fn; }

/** Record a species as seen or signed (first time only). `stamp` is {year, week, club}. */
export function dexRecordGlobal(id, how, stamp) {
  const d = load(); let changed = false;
  if (!d.seen[id]) { d.seen[id] = stamp; changed = true; }
  if (how === 'signed' && !d.signed[id]) { d.signed[id] = stamp; changed = true; }
  if (changed) persist();
  return changed;
}
/** Merge another dex (a franchise's, or the cloud copy) into this one; earliest stamps win. */
export function mergeDex(other) {
  if (!other) return; const d = load(); let changed = false;
  for (const k of ['seen', 'signed']) for (const [id, stamp] of Object.entries(other[k] || {})) if (!d[k][id]) { d[k][id] = stamp; changed = true; }
  if ((other.franchises || 0) > d.franchises) { d.franchises = other.franchises; changed = true; }
  if (changed) persist();
}
export function dexStatusGlobal(id) { const d = load(); return d.signed[id] ? 'signed' : d.seen[id] ? 'seen' : 'unknown'; }
export function dexCountsGlobal() { const d = load(); return { seen: Object.keys(d.seen).length, signed: Object.keys(d.signed).length, franchises: d.franchises }; }
export function noteNewFranchise() { const d = load(); d.franchises += 1; persist(); }
/** Developer tool / tests: wipe the player's dex. */
export function resetDex() { dex = blank(); persist(); }
