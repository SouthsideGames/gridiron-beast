// The review inventory of the two ability reviewers (owner 2026-11-11): every implemented Football Ability and every implemented
// Beast Clash ability, read from the actual registries, never from a hard-coded list or count. A new ability enters its reviewer,
// and the review notifications, by being added to the Dex and registered; its status starts as Pending Review.
//   football: every Dex family with a football ability (src/sim/abilities/review.js reviewCatalog; `registered` says whether its
//             engine contract is registered);
//   clash:    every ability the t8 Clash engine has registered, with its forms and tiers (src/clash/t8/review.js reviewMatrix).
// Registering gives each ability its fingerprint in the shared developer-review system (src/ui/dev-review.js), under its own
// namespace: 'fbability' and 'clashability' never share a record, so approving one side never approves the other.
// No DOM here: the reviewers, the notification counts and the tests all read the same lists.
import { abilityById, familyById, ABILITIES } from '../data/beast-dex.js';
import { SPECIES_DEX } from '../data/species.js';
import { reviewCatalog } from '../sim/abilities/review.js';
import { reviewMatrix } from '../clash/t8/review.js';
import '../clash/index.js'; // registers the Clash ability contracts
import { setFootballFingerprint, setClashFingerprint } from './dev-review.js';
import { FOOTBALL_REVISION, CLASH_REVISION } from '../data/ability-review-revisions.js';

const SP = new Map(SPECIES_DEX.map((s) => [s.id, s]));

/** Football: one row per Dex football ability (see reviewCatalog). */
export function footballCatalog() { return reviewCatalog(); }

/** Clash: one row per Clash ability, with its forms and the four tiers (from the engine's matrix). */
export function clashCatalog() {
  const rows = reviewMatrix(); const byAbility = new Map();
  for (const r of rows) {
    if (!byAbility.has(r.abilityId)) { const fam = familyById(r.family); const a = abilityById(r.abilityId); byAbility.set(r.abilityId, { abilityId: r.abilityId, name: r.name, family: r.family, familyName: fam?.name || r.family, element: SP.get(r.family)?.element || fam?.type || 'Metal', archetype: fam?.clashArchetype || '', rarity: fam?.rarity || '', position: fam?.position || '', forms: [], tiers: [0, 1, 2, 3], scenarios: 0, mechanic: a?.mechanic || '', details: a?.details || '', category: a?.category || '', activation: a?.activation || '' }); }
    const c = byAbility.get(r.abilityId); if (!c.forms.some((f) => f.id === r.form)) c.forms.push({ id: r.form, name: r.formName, stage: r.stage }); c.scenarios = Math.max(c.scenarios, r.scenarios.length);
  }
  return [...byAbility.values()].sort((x, y) => x.abilityId.localeCompare(y.abilityId));
}

let done = null;
/**
 * Build both inventories and register every ability's fingerprint (idempotent). Returns { football, clash } (the catalogs).
 * The fingerprint data is exactly what the reviewers used before this module existed, so verdicts already saved stay valid.
 */
export function registerAbilityReviews() {
  if (done) return done;
  const football = footballCatalog(), clash = clashCatalog();
  for (const c of football) { const a = abilityById(c.abilityId) || {}; setFootballFingerprint(c.abilityId, [a.name, a.category, a.activation, a.mechanic, a.details, a.ruling, a.values, c.registered], { name: c.name, anchor: `fb-${c.family}`, rev: FOOTBALL_REVISION[c.abilityId] || 0 }); }
  for (const c of clash) setClashFingerprint(c.abilityId, [c.name, c.mechanic, c.details, c.category, c.activation, c.scenarios], { name: c.name, anchor: `cl-${c.abilityId}`, rev: CLASH_REVISION[c.abilityId] || 0 });
  return (done = { football, clash });
}

/**
 * Completeness check (used by the tests and the developer screen): Dex abilities of each mode that are missing from their
 * reviewer, and reviewer rows that appear twice. Both lists are empty when every ability is accounted for.
 */
export function inventoryGaps() {
  const { football, clash } = registerAbilityReviews(); const all = Array.isArray(ABILITIES) ? ABILITIES : Object.values(ABILITIES);
  const ids = (list) => list.map((c) => c.abilityId); const dup = (list) => ids(list).filter((id, i, a) => a.indexOf(id) !== i);
  const fb = new Set(ids(football)), cl = new Set(ids(clash));
  return { missingFootball: all.filter((a) => a.mode === 'football' && !fb.has(a.id)).map((a) => a.id), missingClash: all.filter((a) => a.mode === 'clash' && !cl.has(a.id)).map((a) => a.id), duplicates: [...dup(football), ...dup(clash)], notOnEngine: football.filter((c) => !c.registered).map((c) => c.abilityId) };
}
