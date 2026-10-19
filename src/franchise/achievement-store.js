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
