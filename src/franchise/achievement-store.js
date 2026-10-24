// The player's achievements, kept outside any franchise (GDD §21.4): an
// achievement belongs to the player, not to one save. localStorage is the
// primary copy; inside claude.ai it is mirrored to the per-viewer cloud
// document `achievements`. Each entry remembers the first time it was earned
// (club, league year, difficulty, date), how many franchises have earned it,
// and the cutscene exactly as it played, so the main menu can replay it.

export const ACH_KEY = 'gridiron-beast-achievements';
const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
let data = null; let mirror = null;
const blank = () => ({ earned: {}, links: {}, updatedAt: 0 });
// `links` maps an old seed (how pre-v40 entries name a franchise) to the franchise's permanent uid, once linked. Every copy
// merged in later (the cloud's, another device's, a franchise's own list) is read through it, so a seed and its uid never
// count as two franchises (GDD §47.4).
const canon = (d, x) => { for (let i = 0; i < 4 && x != null && d.links?.[String(x)] && d.links[String(x)] !== x; i++) x = d.links[String(x)]; return x; }; // a seed, or a uid replaced by the cloud's (relinkAchievements)
const canonList = (d, fr) => [...new Set((fr || []).map((x) => canon(d, x)))];
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
  const d = load(); const e = d.earned[id]; const who = canon(d, stamp.franchise);
  if (!e) { d.earned[id] = { ...stamp, franchise: who, at: Date.now(), count: 1, franchises: [who] }; persist(); return true; }
  if (who != null && !(e.franchises || []).includes(who)) { e.franchises = canonList(d, [...(e.franchises || []), who]); e.count = e.franchises.length; persist(); }
  return false;
}
/** Merge another copy (the cloud's, or a franchise's own list); earliest first-earn wins, franchise lists union (through `links`). */
export function mergeAchievements(other) {
  if (!other?.earned) return; const d = load(); let changed = false;
  for (const [seed, uid] of Object.entries(other.links || {})) if (uid && !d.links?.[seed]) { (d.links ||= {})[seed] = uid; changed = true; }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const [id, e] of Object.entries(other.earned)) {
    const mine = d.earned[id];
    if (!mine) { const fr = canonList(d, e.franchises); d.earned[id] = { ...e, franchise: canon(d, e.franchise), ...(e.franchises ? { franchises: fr, count: fr.length } : {}) }; changed = true; continue; }
    const fr = canonList(d, [...(mine.franchises || []), ...(e.franchises || [])]);
    if ((e.at || Infinity) < (mine.at || Infinity)) { d.earned[id] = { ...e, franchise: canon(d, e.franchise), franchises: fr, count: fr.length }; changed = true; }
    else if (!same(fr, mine.franchises || []) || mine.count !== fr.length || canon(d, mine.franchise) !== mine.franchise) { mine.franchises = fr; mine.count = fr.length; mine.franchise = canon(d, mine.franchise); changed = true; }
  }
  if (changed) persist();
}
export function resetAchievements() { data = blank(); persist(); }
/**
 * Older entries name franchises by seed; link the one that belongs to `uid` (GDD §42.3). The link is remembered in `links`
 * so later merges translate the seed too; a seed is replaced by the uid only in entries that list that seed, and an entry
 * that already lists both (a merge before this fix) keeps the uid once, its count corrected. Returns how many entries changed.
 */
export function linkAchievements({ uid, seed }) {
  if (!uid || seed == null) return 0; const d = load(); let n = 0; let linked = false;
  const had = (d.links ||= {})[String(seed)]; if (had && canon(d, had) !== uid) return 0; // a seed already linked is never re-linked to another franchise
  if (!had) { d.links[String(seed)] = uid; linked = true; }
  for (const e of Object.values(d.earned)) {
    const fr = e.franchises || []; if (!fr.includes(seed) && e.franchise !== seed) continue;
    e.franchises = canonList(d, fr); if (e.franchise === seed) e.franchise = uid; if (e.franchises.length) e.count = e.franchises.length; n++;
  }
  if (n || linked) persist(); return n;
}
/**
 * The same franchise known by two uids (a device migrated its own v39 copy, then adopted the cloud copy another device had
 * already uploaded, matched by creation stamp): every record under `from` moves to `to`, and later merges translate `from`
 * too. Returns how many entries changed.
 */
export function relinkAchievements({ from, to }) {
  if (!from || !to || from === to) return 0; const d = load(); d.links ||= {}; let n = 0;
  for (const [k, v] of Object.entries(d.links)) if (v === from) d.links[k] = to;
  d.links[String(from)] = to;
  for (const e of Object.values(d.earned)) { const fr = canonList(d, e.franchises); const who = canon(d, e.franchise); if (JSON.stringify(fr) !== JSON.stringify(e.franchises || []) || who !== e.franchise) { e.franchises = fr; e.franchise = who; if (fr.length) e.count = fr.length; n++; } }
  persist(); return n;
}
/** The achievements one franchise earned, by its permanent uid. */
export function achievementsFor(uid) { const d = load(); return Object.entries(d.earned).filter(([, e]) => (e.franchises || []).includes(uid)).map(([id]) => id); }
