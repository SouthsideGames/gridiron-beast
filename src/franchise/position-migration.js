// The final single-position rule for existing saves (owner approval 2026-11-05, section 11; supersedes D6's "existing monsters keep
// their position"): every monster takes its species family's canonical position, once per save, at the next offseason boundary
// (the close of the season in progress, or at load when the save is already in an offseason). Identity, species, attributes,
// abilities, evolution, contract, salary and history are untouched; only `position` changes, so the position-weighted overall is
// recalculated by the game as usual. The owner's lineup is repaired (illegal manual entries removed); AI clubs refill through their
// own roster management at the season start. Nothing is deleted. The owner gets a report.
import { resolveSpecies } from '../data/monsters.js';
import { hasLeague, leagueClubs, clubRoster } from './league-registry.js';
import { repairLineups } from './fa-state.js';
import { buildDepthChart, lineupProblems } from './roster.js';
import { AMBITIONS, assignAmbition } from './ambition.js';

/** The family position of a monster, or null when its species is unknown (left alone). */
export const familyPosition = (m) => resolveSpecies(m?.species)?.position || null;
const offFamily = (m) => { const p = familyPosition(m); return !!p && m.position !== p; };

/** Every monster the save holds: the owner's roster, the AI clubs, the pools, the waivers, the market's extras, the draft class. */
function everyMonster(f) {
  const out = (f.roster || []).map((m) => ({ m, where: 'owner' }));
  if (hasLeague(f)) for (const c of leagueClubs(f)) for (const m of clubRoster(f, c)) out.push({ m, where: c });
  for (const [region, list] of Object.entries(f.pool || {})) for (const m of list || []) out.push({ m, where: `pool:${region}` });
  for (const m of f.league?.waivers || []) out.push({ m, where: 'waivers' });
  for (const m of f.freeAgency?.extra || []) out.push({ m, where: 'market' });
  for (const m of f.draft?.class || []) out.push({ m, where: 'draft' });
  return out;
}
/** Does this save still need the migration? (A save made by this build never does: monsters are generated at their family position.) */
export function migrationDue(f) { return !f.positionMigration && everyMonster(f).some(({ m }) => offFamily(m)); }

/** Migrate once (idempotent). Returns the report, or null when nothing was due. */
export function migratePositions(f, { year = f.season?.year ?? 1 } = {}) {
  if (f.positionMigration) return null;
  const moved = []; const seen = new Set();
  for (const { m, where } of everyMonster(f)) { if (seen.has(m)) continue; seen.add(m); if (!offFamily(m)) continue; const from = m.position; m.position = familyPosition(m); m.positionMigrated = { from, year }; moved.push({ id: m.id, name: m.name, where, from, to: m.position }); }
  const repairs = repairLineups(f);
  const ownerHoles = lineupProblems(f.roster, buildDepthChart(f.roster, f.lineupManual, f.depth));
  const aiHoles = hasLeague(f) ? leagueClubs(f).map((c) => ({ club: c, holes: lineupProblems(clubRoster(f, c), buildDepthChart(clubRoster(f, c))) })).filter((x) => x.holes.length) : [];
  f.positionMigration = { year, moved: moved.length, owner: moved.filter((x) => x.where === 'owner'), ownerHoles, aiClubsWithHoles: aiHoles.length, repairs: repairs.removed.length };
  return f.positionMigration;
}

/**
 * The hidden Ambition for existing saves (owner 2026-11-05 §1B, §9): every monster the save holds without one gets his permanent
 * Ambition, once, from his id (ambition.js), so the same save always receives the same Ambitions; nothing else about a monster changes.
 * Recorded in `f.ambitionMigration` the first time; later calls only fill monsters that somehow lack one (idempotent, never a reroll).
 */
export function migrateAmbitions(f) {
  let n = 0; const seen = new Set();
  const all = [...everyMonster(f).map((x) => x.m), ...(hasLeague(f) ? Object.values(f.league.monsters || {}) : [])];
  for (const m of all) { if (!m || seen.has(m)) continue; seen.add(m); if (!AMBITIONS.includes(m.ambition)) { assignAmbition(m); n++; } }
  if (!f.ambitionMigration) f.ambitionMigration = { at: f.season?.year ?? 1, assigned: n };
  return n;
}
