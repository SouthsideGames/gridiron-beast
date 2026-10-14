// Depth chart and team building: turns a roster of monsters into the
// slot → attributes lineup the engine consumes.

import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf, canPlay } from '../data/personnel.js';
import { effectiveAttributes, monsterOverall, createRoster } from '../data/monsters.js';
import { OFFENSE_IDS, DEFENSE_IDS, PLAYS } from '../data/playbook.js';
import { createRng } from '../core/rng.js';
const PLAYS_IDS = new Set(Object.keys(PLAYS));

export const available = (m) => !m.injury;
export const DEFAULT_OFFENSE = ['inside_zone', 'power_right', 'outside_zone', 'counter', 'quick_slants', 'curl_flat', 'smash', 'mesh', 'deep_post', 'pa_post', 'rb_screen', 'te_seam', 'stick', 'flood', 'three_verticals', 'hail_mary'];
export const DEFAULT_DEFENSE = ['cover_2_man', 'cover_3', 'cover_4', 'cover_1', 'tampa_2', 'zone_blitz', 'run_wall', 'goal_line', 'prevent', 'cover_0'];

/**
 * Fill every depth-chart slot with the best available monster. Manual
 * assignments (`lineup[slot] = monsterId`) are honoured when legal.
 */
export function buildDepthChart(roster, manual = {}) {
  const chart = {}; const used = new Set();
  const take = (slot, m) => { chart[slot] = m.id; used.add(m.id); };
  const all = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, 'K'];
  for (const slot of all) {
    const id = manual[slot]; const m = roster.find((x) => x.id === id);
    if (m && !used.has(m.id) && available(m) && canPlay(m.position, slot)) take(slot, m);
  }
  for (const slot of all) {
    if (chart[slot]) continue;
    const need = positionOf(slot);
    const primary = roster.filter((m) => !used.has(m.id) && available(m) && m.position === need).sort((a, b) => monsterOverall(b) - monsterOverall(a))[0];
    if (primary) { take(slot, primary); continue; }
    const secondary = roster.filter((m) => !used.has(m.id) && available(m) && canPlay(m.position, slot)).sort((a, b) => monsterOverall(b, { slotPosition: need }) - monsterOverall(a, { slotPosition: need }))[0];
    if (secondary) { take(slot, secondary); continue; }
    chart[slot] = null;
  }
  return chart;
}

export function lineupFromChart(roster, chart, { trainingBonus = null } = {}) {
  const byId = Object.fromEntries(roster.map((m) => [m.id, m]));
  const slotInput = (slot) => {
    const m = byId[chart[slot]];
    if (!m) return { attrs: {}, name: slot, id: null };
    return { attrs: effectiveAttributes(m, { slotPosition: positionOf(slot), trainingBonus }), ability: m.ability || null, name: m.name, id: m.id, type: m.type, species: m.species };
  };
  const offense = Object.fromEntries(OFFENSE_SLOTS.map((s) => [s, slotInput(s)]));
  const defense = Object.fromEntries(DEFENSE_SLOTS.map((s) => [s, slotInput(s)]));
  const kicker = slotInput('K');
  const returnerSlot = ['WR2', 'RB', 'WR1', 'CB2'].find((s) => byId[chart[s]]) || 'RB';
  return { offense, defense, kicker, returner: slotInput(returnerSlot) };
}

/** Missing slots the roster cannot legally fill. */
export function lineupProblems(roster, chart) {
  return [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, 'K'].filter((s) => !chart[s]);
}

/** A complete team object for the runner from a roster. */
export function buildTeam({ id, name, abbr, color, roster, manual = {}, offensePlays = null, defensePlays = null, coach = null, trainingBonus = null }) {
  const chart = buildDepthChart(roster, manual);
  const lineup = lineupFromChart(roster, chart, { trainingBonus });
  return {
    id, name, abbr, color, roster, chart, ...lineup,
    offensePlays: offensePlays || DEFAULT_OFFENSE, defensePlays: defensePlays || DEFAULT_DEFENSE,
    coach: coach || { aggression: 0.5, passBias: null },
  };
}

/** Quick generated team (AI clubs, tests). */
const RUN_PLAYS = ['inside_zone', 'power_right', 'power_left', 'outside_zone', 'stretch_left', 'counter', 'toss_sweep', 'trap', 'dive', 'read_option'];
const PASS_PLAYS = ['quick_slants', 'curl_flat', 'smash', 'mesh', 'levels', 'dagger', 'flood', 'te_seam', 'stick', 'deep_post', 'deep_corner', 'three_verticals', 'pa_post', 'pa_boot', 'rb_screen', 'wheel', 'y_cross'];
const ZONE_D = ['cover_3', 'cover_4', 'tampa_2', 'prevent', 'max_drop', 'zone_blitz'];
const MAN_D = ['cover_2_man', 'cover_1', 'man_press', 'robber', 'db_blitz', 'cover_0'];
/** A playbook shaped by the coach profile, so scouting an opponent means something. */
/** AI game plan: exactly 6 offensive and 6 defensive plays, like the player. Mix follows the coach's tendencies. */
export const AI_PLAN_SIZE = 6;
export function playbookFor(seed, coach = {}) {
  const rng = createRng(seed);
  const pick = (arr, n) => { const a = arr.filter((p) => PLAYS_IDS.has(p)); const out = []; while (out.length < n && a.length) out.push(a.splice(rng.int(a.length), 1)[0]); return out; };
  const passBias = coach.passBias ?? 0.55, aggression = coach.aggression ?? 0.5;
  const runs = passBias >= 0.62 ? 2 : passBias >= 0.5 ? 3 : 4; // run-heavy coaches carry four runs
  const offense = [...pick(RUN_PLAYS, runs), ...pick(PASS_PLAYS, AI_PLAN_SIZE - runs)];
  const primary = aggression > 0.55 ? MAN_D : ZONE_D, secondary = aggression > 0.55 ? ZONE_D : MAN_D;
  const defense = [...pick(primary, 3), ...pick(secondary, 2), ...pick(['run_wall', 'edge_contain', 'goal_line', 'qb_spy'], 1)];
  return { offense, defense };
}
export function generatedTeam(seed, { id, name, abbr, color, quality = 56, coach = null, offensePlays = null, defensePlays = null }) {
  const roster = createRoster(seed, { quality });
  for (const m of roster) delete m.cornerstone;
  const pb = playbookFor(seed ^ 0x9e37, coach || {});
  return buildTeam({ id, name, abbr, color, roster, coach, offensePlays: offensePlays || pb.offense, defensePlays: defensePlays || pb.defense });
}

export function teamOverall(team) {
  const slots = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS];
  const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
  const vals = slots.map((s) => byId[team.chart[s]]).filter(Boolean).map((m) => monsterOverall(m));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
