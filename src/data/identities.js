// Task 8 D7: persistent AI club identities (owner rulings N8a item 4 and N8b K / D7, 2026-11-08; proposal docs/task8/AI_IDENTITIES.md
// §3-§4, approved as proposed). Each AI club holds one fixed offensive and one fixed defensive identity for the whole franchise. The
// identity is derived from the club name alone (no stored state), so every save, old or new, has it without a migration.
//
// What an identity does (legal choices only, never a boost to any rating):
//   coach      an ordinary club's head coach is still drawn per season (coaches may change, N8b), but his pass/run bias and
//              aggression are centred on the identity; a gym keeps its named coach (src/data/gyms.js), unchanged
//   playbook   the AI's 6 + 6 plays lean to the identity (pass/run split, coverage family, the gyms' passing / running style)
//   lineup     among position-legal candidates, a starter suited to the identity's scheme (fitsIdentity) is preferred by LINEUP_FIT
//              overall points
//   draft, free agency, trades   a tie-break-scale tilt (IDENTITY_TILT) toward identity positions and scheme fits, added to the
//              existing mode weights
//   training   the identity's attributes are ranked first among the position's OVR attributes in the approved AI allocation
// The player's club has no identity (clubIdentity returns null for it). Results are not equalised.
//
// Every number below is PROVISIONAL: the ruling approves the mechanism and the table, not values.
import { schemePreferences, schemeAttributes } from './monsters.js';
import { GYM_BY_CLUB } from './gyms.js';

/** Scheme ids (monsters.js FIT_KEYS / SCHEME_LABEL): offence pass (Air Raid), run (Ground Attack), balanced; defence pressure (Blitz Heavy), coverage (Zone Control), man (Man Coverage). */
// `passStyle` / `runStyle`: the playbook tags a gym's (or club's) approved strategy leans to; `positions`: where its acquisition tilt applies.
export const IDENTITIES = Object.freeze({
  // ---- gyms (AI_IDENTITIES.md §3). Schemes follow the approved strategy column; where the column names no side, the gym coach's scheme (gyms.js).
  'Harbor Sentinels': { offense: 'balanced', defense: 'coverage', label: 'Ball-hawk zone defence, ball-control offence', runStyle: 'inside', positions: ['CB', 'S'] },
  'Sunfire Lions': { offense: 'pass', defense: 'coverage', label: 'Air Raid with Light cooldown fields', passStyle: 'vertical', positions: ['QB', 'WR'] },
  'Thunder Mesa': { offense: 'pass', defense: 'pressure', label: 'Quick passing behind extra protection, blitzing defence', passStyle: 'quick', positions: ['QB', 'WR', 'OL', 'DL', 'LB'] },
  'Canyon Crushers': { offense: 'run', defense: 'pressure', label: 'Ground attack, physical run front', runStyle: 'inside', runFront: true, positions: ['RB', 'OL', 'TE', 'DL'] },
  'Eastport Phantoms': { offense: 'pass', defense: 'man', label: 'Man-coverage tricks, Dark fields', positions: ['CB', 'S'] },
  'Frostpeak Howlers': { offense: 'balanced', defense: 'coverage', label: 'Field position: bend-don\'t-break zone, reliable kicking', positions: ['K', 'CB', 'S'] },
  'Ironpeak Rams': { offense: 'run', defense: 'pressure', label: 'Run-stuffing blitz front, power runs', runStyle: 'inside', runFront: true, positions: ['RB', 'OL', 'DL', 'LB'] },
  'Palmetto Vipers': { offense: 'pass', defense: 'man', label: 'Aggressive vertical passing, man coverage', passStyle: 'vertical', positions: ['QB', 'WR', 'CB', 'S'] },
  // ---- ordinary clubs (AI_IDENTITIES.md §4): offence / defence exactly as the table
  'Ember City Beasts': { offense: 'pass', defense: 'pressure', label: 'Air Raid, Blitz Heavy', passStyle: 'vertical' },
  'Stonehaven Titans': { offense: 'run', defense: 'coverage', label: 'Ground Attack, Zone Control' },
  'Glacier Guardians': { offense: 'balanced', defense: 'coverage', label: 'Balanced, Zone Control' },
  'Stormport Bolts': { offense: 'pass', defense: 'man', label: 'Air Raid, Man Coverage' },
  'Northstar Wolves': { offense: 'run', defense: 'pressure', label: 'Ground Attack, Blitz Heavy' },
  'Sundown Drakes': { offense: 'pass', defense: 'coverage', label: 'Air Raid, Zone Control', passStyle: 'vertical' },
  'Ashford Hawks': { offense: 'balanced', defense: 'man', label: 'Balanced, Man Coverage' },
  'Bayou Stalkers': { offense: 'run', defense: 'man', label: 'Ground Attack, Man Coverage', runStyle: 'option' },
});
/** Default acquisition positions of a scheme, for a club whose entry names none (an ordinary club). Balanced names none. */
export const SCHEME_POSITIONS = Object.freeze({ pass: ['QB', 'WR'], run: ['RB', 'OL', 'TE'], balanced: [], pressure: ['DL', 'LB'], coverage: ['CB', 'S'], man: ['CB', 'S'] });

/** PROVISIONAL weights (OVR points; the gym element tie-breaks are 1.5, R4 / N8a). */
export const IDENTITY_TILT = Object.freeze({ position: 0.75, fit: 0.75 }); // draft, free agency and upgrades: at most 1.5, a tie-break
export const LINEUP_FIT = 1;                     // lineup: a scheme fit starts over a non-fit within one overall point at the same position
/** PROVISIONAL: an ordinary coach's tendencies, centred on the identity, varied per season by ±COACH_SPREAD (coaches may change, N8b). */
export const COACH_CENTRE = Object.freeze({ passBias: { pass: 0.64, balanced: 0.54, run: 0.42 }, aggression: { pressure: 0.66, man: 0.56, coverage: 0.42 } });
export const COACH_SPREAD = 0.06;

/** The fixed identity of a club (by name), or null. Does not know which club the owner runs: use clubIdentity(f, club) in the game. */
export function identityFor(club) {
  const e = IDENTITIES[club]; if (!e) return null;
  return { club, gym: !!GYM_BY_CLUB[club], ...e, positions: e.positions || [...new Set([...SCHEME_POSITIONS[e.offense], ...SCHEME_POSITIONS[e.defense]])] };
}
const CACHE = new Map();
/** The identity of an AI club in franchise `f`: null for the owner's club (it has no identity) and for an unknown club. */
export function clubIdentity(f, club) {
  if (!club || (f && club === f.club)) return null;
  if (!CACHE.has(club)) CACHE.set(club, identityFor(club));
  return CACHE.get(club);
}
/**
 * Does `m` suit the identity's scheme on his side? The game's own scheme reading (monsters.js schemePreferences, the card's "prefers"):
 * the identity's scheme is the one he clears by the widest margin (ties count). This reads his profile, not his level: the plain
 * schemeFit bar (top 40% at the position) is met by nearly every good monster under every scheme, so it would only repeat overall.
 * A kicker suits no scheme.
 */
export function fitsIdentity(m, id) {
  if (!id || !m) return false; const p = schemePreferences(m); if (!p?.best) return false;
  const want = p.side === 'offense' ? id.offense : id.defense; const mine = p.schemes.find((x) => x.scheme === want);
  return !!mine && mine.margin >= p.best.margin;
}
/** The tie-break tilt (OVR-equivalent points) an identity gives `m` in acquisition: an identity position, and a scheme fit. */
export function identityTilt(id, m) {
  if (!id || !m) return 0;
  return (id.positions.includes(m.position) ? IDENTITY_TILT.position : 0) + (fitsIdentity(m, id) ? IDENTITY_TILT.fit : 0);
}
/** The lineup preference buildDepthChart adds to a candidate's overall (null without an identity): LINEUP_FIT for a scheme fit. A
 *  protected monster (a gym legendary, the rival's signature) always counts as a fit, so the preference never benches him. */
export function lineupPreference(id) {
  if (!id) return null;
  return (m) => (m.legendary || m.signature || fitsIdentity(m, id) ? LINEUP_FIT : 0);
}
/** Training priority: { position: [attributes] } the identity ranks first (only the position's OVR attributes; never a kicker). */
const TRAIN = new WeakMap();
export function trainingPriority(id) {
  if (!id) return null; if (TRAIN.has(id)) return TRAIN.get(id); const out = {}; TRAIN.set(id, out);
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'OL']) out[pos] = schemeAttributes(id.offense, pos);
  for (const pos of ['DL', 'LB', 'CB', 'S']) out[pos] = schemeAttributes(id.defense, pos);
  return out;
}
/** An ordinary club's tendencies for a season from the coach hash `h` (the same hash as before; a new coach each season). */
export function identityCoach(id, h) {
  const v = (shift) => (((h >>> shift) % 13) - 6) / 100 * (COACH_SPREAD / 0.06);
  const round = (x) => Math.round(x * 100) / 100;
  return { passBias: round(COACH_CENTRE.passBias[id.offense] + v(16)), aggression: round(COACH_CENTRE.aggression[id.defense] + v(8)) };
}
