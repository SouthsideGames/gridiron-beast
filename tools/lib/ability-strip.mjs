// Shared "abilities off" control for study tools (balance audit R-3, 2026-11-25).
// A built team carries its players in several places since the coaching-substitution change (PR #125): the starting slots
// (offense, defense), the kicker and returner, the bench, and the rotation pool (`rotationInputs`) that substitutions.js
// fields players from. Stripping the slots alone let the rotation bring abilities back. This strips every source and rebuilds
// the rotation pool from the stripped objects (same ids), so a player who rotates out and back in stays stripped.
const SLOT_SIDES = ['offense', 'defense'];

/** A copy of `team` with `patch` (e.g. { species: null, form: null, ability: null }) on every player in every source; `only(p)` limits it (e.g. defenders). */
export function stripTeam(team, patch, only = null) {
  const byId = new Map();
  const fix = (p) => {
    if (!p || typeof p !== 'object') return p;
    if (p.id != null && byId.has(p.id)) return byId.get(p.id);
    const q = !only || only(p) ? { ...p, ...patch } : p; if (p.id != null) byId.set(p.id, q); return q;
  };
  const out = { ...team };
  for (const side of SLOT_SIDES) if (team[side]) out[side] = Object.fromEntries(Object.entries(team[side]).map(([k, m]) => [k, fix(m)]));
  out.kicker = fix(team.kicker); out.returner = fix(team.returner);
  out.bench = (team.bench || []).map(fix);
  out.rotationInputs = (team.rotationInputs || [...Object.values(out.offense || {}), ...Object.values(out.defense || {}), ...out.bench, out.kicker]).filter((p) => p?.id).map(fix);
  return out;
}

/** Replace one player (by id) in every source of a team with `subject` (used by tools that place a test subject). */
export function replacePlayer(team, oldId, subject) {
  const swap = (p) => (p && p.id === oldId ? subject : p);
  for (const side of SLOT_SIDES) if (team[side]) for (const k of Object.keys(team[side])) team[side][k] = swap(team[side][k]);
  team.kicker = swap(team.kicker); team.returner = swap(team.returner);
  if (team.bench) team.bench = team.bench.map(swap);
  if (team.rotationInputs) { team.rotationInputs = team.rotationInputs.map(swap); if (!team.rotationInputs.some((p) => p?.id === subject.id)) team.rotationInputs.push(subject); }
  return team;
}

/** Every player a team could field, for checks. */
export const allPlayers = (team) => [...new Map([...SLOT_SIDES.flatMap((s) => Object.values(team[s] || {})), team.kicker, team.returner, ...(team.bench || []), ...(team.rotationInputs || [])].filter((p) => p?.id != null).map((p) => [p.id, p])).values()];

/** Throws if a control team still has a player carrying an ability (species or ability set). */
export function assertStripped(team, label = 'team', only = null) {
  const bad = allPlayers(team).filter((p) => (!only || only(p)) && (p.species || p.ability));
  if (bad.length) throw new Error(`abilities-off control contaminated: ${label} still fields ${bad.length} player(s) with an ability (${bad.slice(0, 3).map((p) => p.name || p.id).join(', ')})`);
}
