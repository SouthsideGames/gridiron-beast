// Persistence: localStorage key `gridiron-beast-v6`, JSON export/import and
// a one-way import of the v5 (11v11) prototype's owner, club, staff, rival
// and records. The legacy key is never modified.

import { SCHEMA_VERSION, LEGACY_SCHEMA_VERSION, createFranchise, dexRecord } from './franchise.js';
import { verifyLeague, hasLeague } from './league-registry.js';
import { backfillCareer } from './career.js';
import { backfillLeagueNews } from './league-news.js';
import { hashString } from '../core/rng.js';
import { migrateTips } from './assist.js';
import { resolveSpecies, SPECIES_BY_ID } from '../data/monsters.js';

export const SAVE_KEY = 'gridiron-beast-v6';
export const LEGACY_KEY = 'gridiron-beast-p1';

const storage = () => { try { return globalThis.localStorage || null; } catch { return null; } };

export function load() {
  const s = storage(); if (!s) return null;
  try { const raw = s.getItem(SAVE_KEY); if (!raw) return null; const f = JSON.parse(raw); return migrate(f); } catch { return null; }
}
export const BACKUP_KEY = 'gridiron-beast-v6-backup';
export function save(f) {
  f.savedAt = Date.now();
  const s = storage(); if (!s) return false;
  try { s.setItem(SAVE_KEY, JSON.stringify(f)); return true; } catch { return false; }
}
/** Weekly safety copy (taken after each Sunday) so a bad state can be rolled back. */
export function backup(f) { const s = storage(); if (!s) return; try { s.setItem(BACKUP_KEY, JSON.stringify(f)); } catch { /* full */ } }
export function loadBackup() { const s = storage(); if (!s) return null; try { const raw = s.getItem(BACKUP_KEY); return raw ? migrate(JSON.parse(raw)) : null; } catch { return null; } }
export function clear() { const s = storage(); if (s) { s.removeItem(SAVE_KEY); s.removeItem(BACKUP_KEY); } }
export function migrate(f) {
  if (!f || typeof f !== 'object') return null;
  // Schema 6 (every save before Phase 3) and schema 8 (with the league registry, GDD §42.6) are both read; a 6 becomes an 8 the
  // first time the game opens it (franchise.ensureLeague, verified on the copy), never here, so backups and cloud copies are shown as they are.
  if (f.schemaVersion !== LEGACY_SCHEMA_VERSION && f.schemaVersion !== SCHEMA_VERSION) return null;
  if (f.schemaVersion === SCHEMA_VERSION && !hasLeague(f)) return null; // an 8 without its registry is not a save this game wrote
  if (hasLeague(f)) { const p = verifyLeague(f); if (p.length) throw Object.assign(new Error(`The league registry is damaged: ${p[0]}`), { code: 'league', problems: p }); }
  f.news ||= []; f.history ||= []; f.lineupManual ||= {}; f.depth ||= {}; f.settings ||= {}; f.week ||= {}; f.campaign ||= { badges: {}, gymWins: {}, titles: f.badges ? Object.values(f.badges).reduce((a, b) => a + b, 0) : 0, wins: 0, awards: 0 };
  migrateSpecies(f);
  dedupeRosterNames(f);
  migrateTips(f); // Coach Assist (GDD §27.3): older tip names carry over
  for (const m of f.roster || []) backfillCareer(f, m); // Career Timeline (GDD §38): older saves rebuilt once from what they prove
  // League News (GDD §39): the current season's scoreboards rebuilt once from its results; level-ups and rival scores leave the
  // club log (they live after the game, on the Career Timeline and on the League News scoreboard now).
  if (!Array.isArray(f.leagueNews)) backfillLeagueNews(f);
  f.news = f.news.filter((n) => !/ reached level \d+/.test(n?.text || '') && !/^Rival watch: /.test(n?.text || ''));
  return f;
}
/** Saves from before the duplicate-name fix (2026-10-22) may hold two roster monsters with one name: the later one gets a numeral. Stats and history are keyed by id, so nothing else changes. */
export function dedupeRosterNames(f) {
  const all = new Set((f.roster || []).map((m) => m.name)); const kept = new Set();
  for (const m of f.roster || []) {
    if (!kept.has(m.name)) { kept.add(m.name); continue; }
    const base = String(m.name).replace(/ (II|III|IV|V|VI|\d+)$/, '');
    const free = (c) => !all.has(c) && !kept.has(c);
    let cand = ['II', 'III', 'IV', 'V', 'VI'].map((n) => `${base} ${n}`).find(free);
    for (let k = 7; !cand; k++) if (free(`${base} ${k}`)) cand = `${base} ${k}`;
    m.name = cand; kept.add(cand); all.add(cand);
  }
}
/** Saves from before the species dex stored old display names: map every monster onto a dex species and rename it (numerals kept). */
export function migrateSpecies(f) {
  const fix = (m) => {
    if (!m || typeof m !== 'object') return;
    if (SPECIES_BY_ID[m.species]) return;
    const sp = resolveSpecies(m); const suffix = String(m.name || '').match(/ (II|III|IV|V|VI|\d+)$/)?.[0] || '';
    const old = m.species || String(m.name || '').replace(/ (II|III|IV|V|VI|\d+)$/, '');
    m.species = sp.id; m.type = sp.element; if (!m.name || m.name.startsWith(old)) m.name = sp.name + suffix;
  };
  for (const m of f.roster || []) fix(m);
  for (const p of f.week?.prospects || []) fix(p.monster);
  if (!f.dex) { f.dex = { seen: {}, signed: {} }; for (const m of f.roster || []) dexRecord(f, m, 'signed'); }
}
export function exportJson(f) { return JSON.stringify({ app: 'gridiron-beast', schemaVersion: f?.schemaVersion ?? SCHEMA_VERSION, exportedAt: new Date().toISOString(), franchise: f }, null, 0); }
export function importJson(text) {
  const obj = JSON.parse(text);
  const f = obj?.franchise || obj;
  const ok = migrate(f);
  if (!ok) throw new Error('Not a Gridiron Beast save this version can read.');
  return ok;
}

/** Read the legacy prototype save, if any, without touching it. */
export function readLegacy() {
  const s = storage(); if (!s) return null;
  try { const raw = s.getItem(LEGACY_KEY); if (!raw) return null; return JSON.parse(raw); } catch { return null; }
}
export function legacySummary(legacy) {
  if (!legacy?.coach?.team) return null;
  const fr = legacy.franchise || {};
  return { owner: `${legacy.coach.first || ''} ${legacy.coach.last || ''}`.trim(), club: String(legacy.coach.team).replace(/ \(.*$/, ''), season: fr.season || 1, week: fr.week || 1, record: fr.record || { w: 0, l: 0 }, staff: legacy.staff || {}, rival: fr.rivals?.challenger?.team || null, badges: fr.championshipBadges || null, starters: { offense: fr.starterOffense, defense: fr.starterDefense } };
}
/** Build a v6 franchise from a legacy save (owner, club, staff, rival, cornerstones, records/history). */
export function importLegacy(legacy) {
  const s = legacySummary(legacy); if (!s) throw new Error('No legacy franchise found.');
  const legacyRivalOk = s.rival && !/^(Vanguard|Sovereign) /.test(s.rival) ? s.rival : null;
  const f = createFranchise({
    owner: { first: legacy.coach.first || 'New', last: legacy.coach.last || 'Owner', gender: legacy.coach.gender || 'Male', portrait: legacy.coach.portrait || 0, hometown: legacy.coach.city || '' },
    club: s.club, rival: legacyRivalOk,
    cornerstoneOffense: s.starters.offense || 'Pyronix', cornerstoneDefense: s.starters.defense || 'Granigor',
    seed: hashString(JSON.stringify(legacy.coach)),
  });
  for (const [role, id] of Object.entries(s.staff)) if (typeof id === 'string') f.staff[role] = id;
  if (s.badges) f.badges = { challenger: s.badges.challenger || 0, vanguard: s.badges.vanguard || 0, sovereign: s.badges.sovereign || 0 };
  for (const h of legacy.franchise?.seasonHistory || []) f.history.push({ year: h.season, club: s.club, tier: h.tier || 'challenger', record: h.record || { w: 0, l: 0 }, place: null, champion: null, playoffs: false, schedule: h.schedule || [], rival: h.rival || null, legacy: true });
  if (f.history.length) { const last = Math.max(...f.history.map((h) => h.year)); f.season.year = last + 1; }
  f.importedFromLegacy = true;
  return f;
}
