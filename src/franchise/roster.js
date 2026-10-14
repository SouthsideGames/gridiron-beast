// Depth chart and team building: turns a roster of monsters into the
// slot → attributes lineup the engine consumes.

import { OFFENSE_SLOTS, DEFENSE_SLOTS, positionOf, canPlay } from '../data/personnel.js';
import { effectiveAttributes, monsterOverall, createRoster } from '../data/monsters.js';
import { OFFENSE_IDS, DEFENSE_IDS, PLAYS, counterPlays } from '../data/playbook.js';
import { createRng } from '../core/rng.js';
const PLAYS_IDS = new Set(Object.keys(PLAYS));

export const available = (m) => !m.injury;
export const DEFAULT_OFFENSE = ['inside_zone', 'power_right', 'outside_zone', 'counter', 'quick_slants', 'curl_flat', 'smash', 'mesh', 'deep_post', 'pa_post', 'rb_screen', 'te_seam', 'stick', 'flood', 'three_verticals', 'hail_mary'];
export const DEFAULT_DEFENSE = ['cover_2_man', 'cover_3', 'cover_4', 'cover_1', 'tampa_2', 'zone_blitz', 'run_wall', 'goal_line', 'prevent', 'cover_0'];

/** Depth-chart slots per position group, in fill order (base starters first, then the package slot). */
export const GROUP_SLOTS = Object.freeze({ QB: ['QB'], RB: ['RB'], WR: ['WR1', 'WR2', 'WR3'], TE: ['TE'], OL: ['LG', 'RG', 'C'], DL: ['DL1', 'DL2', 'DL3'], LB: ['LB1', 'LB2'], CB: ['CB1', 'CB2'], S: ['FS', 'SS'], K: ['K'] });
export const OFFENSE_GROUPS = ['QB', 'RB', 'WR', 'TE', 'OL'];
export const DEFENSE_GROUPS = ['DL', 'LB', 'CB', 'S'];

/** The owner's order for a position group: their explicit order first, then everyone else at that position by overall. */
export function depthOrder(roster, depth, group) {
  const slot = GROUP_SLOTS[group][0];
  const explicit = (depth?.[group] || []).map((id) => roster.find((m) => m.id === id)).filter((m) => m && canPlay(m.position, slot));
  const rest = roster.filter((m) => m.position === group && !explicit.includes(m)).sort((a, b) => monsterOverall(b) - monsterOverall(a));
  return [...explicit, ...rest];
}

/**
 * Fill every depth-chart slot. Order of precedence: manual slot assignments
 * (legacy), the owner's depth order per position (injured monsters are
 * skipped, so the next one in order steps in), then the best available.
 */
export function buildDepthChart(roster, manual = {}, depth = null) {
  const chart = {}; const used = new Set();
  const take = (slot, m) => { chart[slot] = m.id; used.add(m.id); };
  const all = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS, 'K'];
  for (const slot of all) {
    const id = manual?.[slot]; const m = roster.find((x) => x.id === id);
    if (m && !used.has(m.id) && available(m) && canPlay(m.position, slot)) take(slot, m);
  }
  if (depth) {
    for (const [group, slots] of Object.entries(GROUP_SLOTS)) {
      const order = depthOrder(roster, depth, group).filter((m) => available(m) && !used.has(m.id));
      for (const slot of slots) { if (chart[slot]) continue; const m = order.shift(); if (m) take(slot, m); }
    }
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
    return { attrs: effectiveAttributes(m, { slotPosition: positionOf(slot), trainingBonus }), ability: m.ability || null, name: m.name, id: m.id, type: m.type, species: m.species, age: m.age, position: m.position };
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
export function buildTeam({ id, name, abbr, color, roster, manual = {}, depth = null, offensePlays = null, defensePlays = null, coach = null, trainingBonus = null }) {
  const chart = buildDepthChart(roster, manual, depth);
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
const ZONE_D = ['cover_3', 'cover_4', 'cover_2_zone', 'cover_6', 'tampa_2', 'max_drop', 'zone_blitz', 'corner_blitz'];
const MAN_D = ['cover_2_man', 'cover_1', 'man_press', 'robber', 'bracket_left', 'db_blitz', 'safety_blitz', 'double_a_mug', 'cover_0'];
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
  const defense = [...pick(primary, 3), ...pick(secondary, 2), ...pick(['run_wall', 'edge_contain', 'bear_front', 'goal_line', 'goal_line_man', 'qb_spy'], 1)];
  return { offense, defense };
}
/**
 * AI scouting: adapt a club's 6+6 to what the opponent has shown this season.
 * `profile` = { passRate, offense: {playId: count}, defense: {playId: count}, games }.
 * Swaps up to `swaps` plays per side for counters to the opponent's most-used calls
 * (from the play lessons) and leans the defense toward the opponent's run/pass split.
 * Deterministic for a given seed + profile. Returns { offense, defense, notes }.
 */
export function adaptPlaybook(seed, base, profile, { swaps = 2 } = {}) {
  if (!profile || !profile.games) return { ...base, notes: [] };
  const rng = createRng(seed ^ 0x5c07);
  const top = (counts, n) => Object.entries(counts || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
  const notes = [];
  const swapIn = (list, pool, oppTop, n, keepPred) => {
    const counters = counterPlays(pool.filter((id) => !list.includes(id)), oppTop).slice(0, n);
    const out = [...list];
    for (const c of counters) {
      // Replace the play in our six that counters the opponent least (never the only run / goal-line call).
      const scored = out.map((id) => ({ id, s: counterPlays([id], oppTop)[0]?.score || 0 })).filter((x) => keepPred(x.id, out));
      if (!scored.length) break;
      const weakest = scored.sort((a, b) => a.s - b.s || rng.next() - 0.5)[0];
      if (weakest.s >= c.score) break;
      out[out.indexOf(weakest.id)] = c.id; notes.push({ side: pool === OFFENSE_IDS ? 'offense' : 'defense', in: c.id, out: weakest.id, beats: c.beats });
    }
    return out;
  };
  const oppOff = top(profile.offense, 6), oppDef = top(profile.defense, 6);
  // Defense: counter their favourite offensive plays; keep at least one run-stopper.
  let defense = swapIn(base.defense, DEFENSE_IDS, oppOff, swaps, (id, out) => !(PLAYS[id].tags.includes('run') && out.filter((x) => PLAYS[x].tags.includes('run')).length <= 1));
  // Lean the defense toward their split.
  if (profile.passRate >= 0.62 && !defense.some((id) => PLAYS[id].tags.includes('blitz'))) { const b = ['fire_zone', 'zone_blitz', 'db_blitz'].find((id) => !defense.includes(id)); const r = defense.find((id) => PLAYS[id].tags.includes('run') && !PLAYS[id].tags.includes('goalline')); if (b && r && defense.filter((id) => PLAYS[id].tags.includes('run')).length > 1) { defense[defense.indexOf(r)] = b; notes.push({ side: 'defense', in: b, out: r, beats: ['a pass-heavy offense'] }); } }
  if (profile.passRate <= 0.4 && !defense.includes('run_wall') && !defense.includes('edge_contain')) { const victim = defense.find((id) => PLAYS[id].tags.includes('prevent') || PLAYS[id].tags.includes('risky')) || defense.find((id) => PLAYS[id].tags.includes('pass') && !PLAYS[id].tags.includes('blitz')); if (victim) { defense[defense.indexOf(victim)] = 'run_wall'; notes.push({ side: 'defense', in: 'run_wall', out: victim, beats: ['a run-heavy offense'] }); } }
  // Offense: counter their favourite defensive calls; keep at least two runs.
  const offense = swapIn(base.offense, OFFENSE_IDS, oppDef, swaps, (id, out) => !(PLAYS[id].type === 'run' && out.filter((x) => PLAYS[x].type === 'run').length <= 2));
  return { offense: [...new Set(offense)].slice(0, 6), defense: [...new Set(defense)].slice(0, 6), notes };
}
export function generatedTeam(seed, { id, name, abbr, color, quality = 56, coach = null, offensePlays = null, defensePlays = null, scouting = null }) {
  const roster = createRoster(seed, { quality });
  for (const m of roster) delete m.cornerstone;
  let pb = playbookFor(seed ^ 0x9e37, coach || {});
  let notes = [];
  if (scouting) { const a = adaptPlaybook(seed, pb, scouting, { swaps: scouting.swaps ?? 2 }); pb = a; notes = a.notes; }
  const team = buildTeam({ id, name, abbr, color, roster, coach, offensePlays: offensePlays || pb.offense, defensePlays: defensePlays || pb.defense });
  team.scoutingNotes = notes; return team;
}

export function teamOverall(team) {
  const slots = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS];
  const byId = Object.fromEntries(team.roster.map((m) => [m.id, m]));
  const vals = slots.map((s) => byId[team.chart[s]]).filter(Boolean).map((m) => monsterOverall(m));
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
