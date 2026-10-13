// Depth chart and team building: turns a roster of monsters into the
// slot → attributes lineup the engine consumes.

import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf, canPlay } from '../data/personnel.js';
import { effectiveAttributes, monsterOverall, createRoster } from '../data/monsters.js';
import { OFFENSE_IDS, DEFENSE_IDS } from '../data/playbook.js';

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
    return { attrs: effectiveAttributes(m, { slotPosition: positionOf(slot), trainingBonus }), ability: m.ability || null, name: m.name, id: m.id };
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
export function generatedTeam(seed, { id, name, abbr, color, quality = 56, coach = null, offensePlays = null, defensePlays = null }) {
  const roster = createRoster(seed, { quality });
  for (const m of roster) delete m.cornerstone;
  return buildTeam({ id, name, abbr, color, roster, coach, offensePlays, defensePlays });
}

export function teamOverall(team) {
  const slots = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS];
  const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
  const vals = slots.map((s) => byId[team.chart[s]]).filter(Boolean).map((m) => monsterOverall(m));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
