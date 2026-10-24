// The player's achievements, kept outside any franchise (GDD §21.4): an
// achievement belongs to the player, not to one save. localStorage is the
// primary copy; inside claude.ai it is mirrored to the per-viewer cloud
// document `achievements`. Each entry remembers the first time it was earned
// (club, league year, difficulty, date), how many franchises have earned it,
// and the cutscene exactly as it played, so the main menu can replay it.

export const ACH_KEY = 'gridiron-beast-achievements';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
let data = null; let mirror = null;
const blank = () => ({ earned: {}, updatedAt: 0 });
function load() {
  if (data) return data;
  try { const raw = storage()?.getItem(ACH_KEY); data = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); } catch { data = blank(); }
  return data;
}
function persist() {
  data.updatedAt = Date.now();
  try { storage()?.setItem(ACH_KEY, JSON.stringify(data)); } catch { /* full or blocked */ }
  if (mirror) { try { mirror(data); } catch { /* ignore */ } }
}
export function achievementsData() { return load(); }
export function setAchievementMirror(fn) { mirror = fn; }
/** Record an achievement for the player. `stamp`: {club, owner, year, difficulty, franchise, scene}. Returns true the first time ever. */
export function recordAchievementGlobal(id, stamp) {
  const d = load(); const e = d.earned[id];
  if (!e) { d.earned[id] = { ...stamp, at: Date.now(), count: 1, franchises: [stamp.franchise] }; persist(); return true; }
  if (stamp.franchise != null && !(e.franchises || []).includes(stamp.franchise)) { e.franchises = [...(e.franchises || []), stamp.franchise]; e.count = e.franchises.length; persist(); }
  return false;
}
/** Merge another copy (the cloud's, or a franchise's own list); earliest first-earn wins, franchise lists union. */
export function mergeAchievements(other) {
  if (!other?.earned) return; const d = load(); let changed = false;
  for (const [id, e] of Object.entries(other.earned)) {
    const mine = d.earned[id];
    if (!mine) { d.earned[id] = { ...e }; changed = true; continue; }
    const fr = [...new Set([...(mine.franchises || []), ...(e.franchises || [])])];
    if ((e.at || Infinity) < (mine.at || Infinity)) { d.earned[id] = { ...e, franchises: fr, count: fr.length }; changed = true; }
    else if (fr.length !== (mine.franchises || []).length) { mine.franchises = fr; mine.count = fr.length; changed = true; }
  }
  if (changed) persist();
}
export function resetAchievements() { data = blank(); persist(); }
/**
 * Older entries name franchises by seed; link the one that belongs to `uid` (GDD §42.3). A seed is replaced by the uid only
 * in entries that list that seed; nothing else changes, and counts stay the same. Returns how many entries were linked.
 */
export function linkAchievements({ uid, seed }) {
  if (!uid || seed == null) return 0; const d = load(); let n = 0;
  for (const e of Object.values(d.earned)) { const fr = e.franchises || []; if (fr.includes(seed) && !fr.includes(uid)) { e.franchises = fr.map((x) => (x === seed ? uid : x)); if (e.franchise === seed) e.franchise = uid; n++; } }
  if (n) persist(); return n;
}
/** The achievements one franchise earned, by its permanent uid. */
export function achievementsFor(uid) { const d = load(); return Object.entries(d.earned).filter(([, e]) => (e.franchises || []).includes(uid)).map(([id]) => id); }
