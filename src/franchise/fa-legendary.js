// Task 7 — the legendary limit (specification "Legendary policy"; decisions 18, 20–22; audit resolutions 2 and 3; owner D1, D5).
//
// Every club, the owner's and each AI club, may hold at most ONE offensive and ONE defensive legendary, across every way a monster
// arrives (draft, trade, free agency, Beast Clash recruitment, Legend Tracks, AI pool and waiver signings). A legendary's side is fixed
// by his species' one position (canonical primary), never by his live position, a lineup slot or a trade; no legendary is a kicker or
// special-teams monster (no such species exists, and `legendSide` refuses one). A protected gym legendary occupies its side for good.
// Saves from before Task 7 keep any excess (nothing is deleted) but cannot add to an over-limit side; compliance is required before
// the season that follows the first complete Task 7 offseason (fa-state.js holds that deadline).
import { SPECIES_BY_ID, resolveSpecies } from '../data/monsters.js';
import { OFFENSE_GROUPS, DEFENSE_GROUPS } from './roster.js';

export const LEGEND_LIMIT = Object.freeze({ offense: 1, defense: 1 });

function speciesOf(m) { if (!m) return null; try { return SPECIES_BY_ID[m.species] || resolveSpecies(m); } catch { return null; } }
/** 'offense' | 'defense' for a legendary monster (from his species' position), null for anyone else. */
export function legendSide(m) {
  const sp = speciesOf(m); if (!sp || (sp.rarity !== 'legendary' && !m.legendary)) return null;
  const pos = sp.position;
  if (OFFENSE_GROUPS.includes(pos)) return 'offense';
  if (DEFENSE_GROUPS.includes(pos)) return 'defense';
  return null; // a kicker can never be a legendary (no legendary special teams)
}
export const isLegend = (m) => legendSide(m) != null;
/** A club's legendaries by side. */
export function legendsBySide(roster) {
  const out = { offense: [], defense: [] };
  for (const m of roster || []) { const s = legendSide(m); if (s) out[s].push(m); }
  return out;
}
/** How far over the limit a roster is, by side ({ offense: n, defense: n }, 0 = within). */
export function overLimit(roster) { const b = legendsBySide(roster); return { offense: Math.max(0, b.offense.length - LEGEND_LIMIT.offense), defense: Math.max(0, b.defense.length - LEGEND_LIMIT.defense) }; }

/**
 * May `roster` take legendary `m`? Returns { ok, side, reason, replace } where `replace` lists the same-side legendaries that must
 * leave first (decision 20: a club at the limit may negotiate a replacement, but the contract is official only once the existing
 * same-side legendary is gone; the caller checks again at finalisation with `final: true`). A protected gym legendary never leaves,
 * so his side is closed; a legacy club already over the limit on a side can add nobody there until it complies (decision 22).
 */
export function legendCheck(roster, m, { final = false } = {}) {
  const side = legendSide(m); if (!side) return { ok: true, side: null, replace: [] };
  const held = legendsBySide(roster)[side].filter((x) => x.id !== m.id);
  if (final) return held.length + 1 <= LEGEND_LIMIT[side] ? { ok: true, side, replace: [] } : { ok: false, side, replace: held.map((x) => x.id), reason: `The club already holds ${side === 'offense' ? 'an offensive' : 'a defensive'} legendary (${held.map((x) => x.name).join(', ')}). He must leave before this signing becomes official.` };
  if (held.length + 1 <= LEGEND_LIMIT[side]) return { ok: true, side, replace: [] };
  const protectedHeld = held.filter((x) => x.legendary || x.signature);
  if (protectedHeld.length) return { ok: false, side, replace: [], reason: `${protectedHeld[0].name} is bound to the club for good, so it cannot take another ${side === 'offense' ? 'offensive' : 'defensive'} legendary.` };
  if (held.length > LEGEND_LIMIT[side]) return { ok: false, side, replace: held.map((x) => x.id), overLimit: true, reason: `The club is over the limit of one ${side === 'offense' ? 'offensive' : 'defensive'} legendary (${held.map((x) => x.name).join(', ')}): no further ${side} legendary can join until it complies.` };
  // a club exactly at the limit may negotiate a replacement; the signing is official only once the other has left (`final`)
  return { ok: true, side, replace: held.map((x) => x.id), conditional: true };
}
