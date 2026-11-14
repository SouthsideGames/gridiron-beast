// The player's Beast Dex, kept outside any franchise (GDD §15.1): species seen
// and signed across every franchise this player has run. localStorage is the
// primary copy; inside claude.ai it is also mirrored to the per-viewer cloud
// document `dex`. Franchises keep their own f.dex too (for "on your roster"
// and per-franchise milestones); the Beast Dex screen shows the union.

export const DEX_KEY = 'gridiron-beast-dex';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

let dex = null; // { seen: {id: stamp}, signed: {id: stamp}, franchises: n, updatedAt }
let mirror = null; // (dex) => void, set by the cloud layer

const blank = () => ({ seen: {}, signed: {}, forms: {}, knowledge: {}, franchises: 0, updatedAt: 0 });
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
/** The shared Dex's key for one franchise game. Franchise saves keep the bare activity id ("fb:…"); the shared Dex adds the franchise. */
export const knowledgeEventId = (franchise, act) => (String(act).startsWith('fb:') ? `${franchise}:${act}` : String(act));
/** Merge another Dex (cloud copy, or a franchise's own `f.dex` with `{ franchise }`) into this device's Dex by union. A franchise's bare
 *  game ids are only counted when the franchise is named; without it they cannot be told apart from another franchise's games. */
export function mergeDex(other, { franchise = null } = {}) {
  if (!other) return; const d = load(); let changed = false;
  for (const k of ['seen', 'signed']) for (const [id, stamp] of Object.entries(other[k] || {})) if (!d[k][id]) { d[k][id] = stamp; changed = true; }
  d.forms ||= {}; for (const [id, st] of Object.entries(other.forms || {})) if ((d.forms[id] || 0) < st) { d.forms[id] = st; changed = true; }
  d.knowledge ||= {};
  for (const [id, events] of Object.entries(other.knowledge || {})) { const own = d.knowledge[id] ||= {}; for (const raw of Object.keys(events || {})) { if (raw.startsWith('fb:') && !franchise) continue; const key = knowledgeEventId(franchise, raw); if (!own[key]) { own[key] = true; changed = true; } } }
  if ((other.franchises || 0) > d.franchises) { d.franchises = other.franchises; changed = true; }
  if (changed) persist();
}
/** Record an evolved form seen (stage 1 or 2). */
export function dexFormGlobal(id, stage) { const d = load(); d.forms ||= {}; if ((d.forms[id] || 0) < stage) { d.forms[id] = stage; persist(); } }
export function dexFormsGlobal() { return load().forms || {}; }
export function dexStatusGlobal(id) { const d = load(); return d.signed[id] ? 'signed' : d.seen[id] ? 'seen' : 'unknown'; }
export function dexCountsGlobal() { const d = load(); return { seen: Object.keys(d.seen).length, signed: Object.keys(d.signed).length, franchises: d.franchises }; }
export function noteNewFranchise() { const d = load(); d.franchises += 1; persist(); }
/** Developer tool / tests: wipe the player's dex. */
export function resetDex() { dex = blank(); persist(); }


export const LORE_THRESHOLDS = Object.freeze([5, 15, 30]);
/** A family earns one discovery credit per completed owner game, across all its individuals.
 * Event identities make replay, save reload, and cloud merging idempotent. No simulation RNG. */
export function dexKnowledgeGame(familyIds, eventId) {
  if (!eventId) return false;
  const d = load(); d.knowledge ||= {}; let changed = false;
  for (const id of new Set(familyIds.filter(Boolean))) {
    const events = d.knowledge[id] ||= {};
    if (!events[eventId]) { events[eventId] = true; changed = true; }
  }
  if (changed) persist();
  return changed;
}
export function dexKnowledge(id) {
  const games = Object.keys(load().knowledge?.[id] || {}).length;
  return { games, unlocked: LORE_THRESHOLDS.filter(n => games >= n), next: LORE_THRESHOLDS.find(n => games < n) ?? null };
}
