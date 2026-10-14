// Persistence: localStorage key `gridiron-beast-v6`, JSON export/import and
// a one-way import of the v5 (11v11) prototype's owner, club, staff, rival
// and records. The legacy key is never modified.

import { SCHEMA_VERSION, createFranchise } from './franchise.js';
import { hashString } from '../core/rng.js';

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
  if (f.schemaVersion !== SCHEMA_VERSION) return null; // future versions migrate here
  f.news ||= []; f.history ||= []; f.lineupManual ||= {}; f.settings ||= {};
  return f;
}
export function exportJson(f) { return JSON.stringify({ app: 'gridiron-beast', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), franchise: f }, null, 0); }
export function importJson(text) {
  const obj = JSON.parse(text);
  const f = obj?.franchise || obj;
  const ok = migrate(f);
  if (!ok) throw new Error('Not a Gridiron Beast v6 save.');
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
    cornerstoneOffense: s.starters.offense || 'Firestorm', cornerstoneDefense: s.starters.defense || 'Stoneguard',
    seed: hashString(JSON.stringify(legacy.coach)),
  });
  for (const [role, id] of Object.entries(s.staff)) if (typeof id === 'string') f.staff[role] = id;
  if (s.badges) f.badges = { challenger: s.badges.challenger || 0, vanguard: s.badges.vanguard || 0, sovereign: s.badges.sovereign || 0 };
  for (const h of legacy.franchise?.seasonHistory || []) f.history.push({ year: h.season, club: s.club, tier: h.tier || 'challenger', record: h.record || { w: 0, l: 0 }, place: null, champion: null, playoffs: false, schedule: h.schedule || [], rival: h.rival || null, legacy: true });
  if (f.history.length) { const last = Math.max(...f.history.map((h) => h.year)); f.season.year = last + 1; }
  f.importedFromLegacy = true;
  return f;
}
