// Coaching staff: five mandatory hires with real effects.
//  - Head coach: identity (affects AI aggression/pass bias for suggestions) and a small
//    execution bonus from scheme alignment with the coordinators.
//  - Coordinators: the play catalog the owner can equip from.
//  - Scout: biome accuracy for prospect discovery and attribute reveals.
//  - Trainer: Wednesday training focus strength.
import { t as $t } from '../text/index.js';

export const STAFF_ROLES = ['head_coach', 'offensive_coordinator', 'defensive_coordinator', 'head_scout', 'monster_trainer'];
export const ROLE_LABEL = Object.freeze({ head_coach: $t('data.head_coach'), offensive_coordinator: $t('data.offensive_coordinator'), defensive_coordinator: $t('data.defensive_coordinator'), head_scout: $t('data.head_scout'), monster_trainer: $t('data.monster_trainer') });

export const PLAYBOOKS = Object.freeze({
  oc_swift: ['quick_slants', 'stick', 'curl_flat', 'smash', 'mesh', 'levels', 'dagger', 'three_verticals', 'deep_post', 'deep_corner', 'slot_fade', 'bubble_screen', 'rb_screen', 'double_move', 'inside_zone', 'qb_draw', 'hail_mary'],
  oc_brock: ['inside_zone', 'power_right', 'power_left', 'dive', 'outside_zone', 'stretch_left', 'counter', 'toss_sweep', 'trap', 'read_option', 'pa_post', 'pa_boot', 'pa_shot', 'te_seam', 'flood', 'quick_slants', 'hail_mary'],
  oc_park: ['inside_zone', 'power_right', 'outside_zone', 'counter', 'jet_sweep', 'qb_draw', 'quick_slants', 'stick', 'curl_flat', 'smash', 'y_cross', 'flood', 'te_seam', 'deep_post', 'pa_boot', 'rb_screen', 'wheel', 'hail_mary'],
  dc_stone: ['cover_1', 'cover_0', 'db_blitz', 'zone_blitz', 'fire_zone', 'safety_blitz', 'double_a_mug', 'corner_blitz', 'all_out', 'edge_contain', 'man_press', 'qb_spy', 'bear_front', 'goal_line', 'run_wall', 'cover_2_man', 'cover_3', 'prevent'],
  dc_ice: ['cover_2_zone', 'cover_3', 'cover_4', 'cover_6', 'tampa_2', 'max_drop', 'prevent', 'robber', 'zone_blitz', 'corner_blitz', 'bracket_left', 'run_wall', 'goal_line', 'qb_spy', 'edge_contain', 'cover_2_man', 'cover_1', 'fire_zone'],
  dc_fox: ['cover_2_man', 'man_press', 'cover_1', 'cover_0', 'bracket_left', 'robber', 'db_blitz', 'safety_blitz', 'double_a_mug', 'goal_line_man', 'qb_spy', 'edge_contain', 'bear_front', 'goal_line', 'run_wall', 'cover_3', 'tampa_2', 'fire_zone', 'prevent'],
});

export const STAFF = Object.freeze([
  { id: 'hc_flint', name: 'Marcus Flint', role: 'head_coach', overall: 82, style: $t('data.physical'), strength: $t('data.power_running_and_toughness'), salary: 108000, identity: { offense: 'run', defense: 'pressure', aggression: 0.65, passBias: 0.42 } },
  { id: 'hc_vale', name: 'Avery Vale', role: 'head_coach', overall: 80, style: $t('data.balanced'), strength: $t('data.adaptable_game_plans'), salary: 96000, identity: { offense: 'balanced', defense: 'balanced', aggression: 0.5, passBias: 0.55 } },
  { id: 'hc_reyes', name: 'Jordan Reyes', role: 'head_coach', overall: 84, style: $t('data.speed'), strength: $t('data.tempo_and_passing_preparation'), salary: 117000, identity: { offense: 'pass', defense: 'coverage', aggression: 0.55, passBias: 0.66 } },
  { id: 'oc_swift', name: 'Elena Swift', role: 'offensive_coordinator', overall: 86, style: $t('data.air_raid'), strength: $t('data.passing_and_receiver_development'), salary: 90000, scheme: 'pass' },
  { id: 'oc_brock', name: 'Tobias Brock', role: 'offensive_coordinator', overall: 83, style: $t('data.ground_attack'), strength: $t('data.power_and_outside_runs'), salary: 78000, scheme: 'run' },
  { id: 'oc_park', name: 'Nia Park', role: 'offensive_coordinator', overall: 80, style: $t('data.balanced'), strength: $t('data.flexible_run_pass_approach'), salary: 75000, scheme: 'balanced' },
  { id: 'dc_stone', name: 'Darius Stone', role: 'defensive_coordinator', overall: 84, style: $t('data.blitz_heavy'), strength: $t('data.quarterback_pressure'), salary: 87000, scheme: 'pressure' },
  { id: 'dc_ice', name: 'Iris Frost', role: 'defensive_coordinator', overall: 85, style: $t('data.zone_control'), strength: $t('data.deep_pass_defense'), salary: 93000, scheme: 'coverage' },
  { id: 'dc_fox', name: 'Ronan Fox', role: 'defensive_coordinator', overall: 81, style: $t('data.man_coverage'), strength: $t('data.one_on_one_coverage'), salary: 72000, scheme: 'man' },
  { id: 'sc_tide', name: 'Marina Tide', role: 'head_scout', overall: 88, style: $t('data.water_specialist'), strength: $t('data.coastal_scouting'), salary: 75000, biomes: { water: 95, fire: 10, forest: 42, ice: 72 } },
  { id: 'sc_ash', name: 'Ash Calder', role: 'head_scout', overall: 86, style: $t('data.fire_specialist'), strength: $t('data.volcanic_scouting'), salary: 72000, biomes: { water: 12, fire: 95, forest: 45, ice: 24 } },
  { id: 'sc_moss', name: 'Rowan Moss', role: 'head_scout', overall: 80, style: $t('data.generalist'), strength: $t('data.consistent_across_all_biomes'), salary: 66000, biomes: { water: 65, fire: 65, forest: 65, ice: 65 } },
  { id: 'tr_speed', name: 'Sera Dash', role: 'monster_trainer', overall: 84, style: $t('data.speed_agility'), strength: $t('data.best_at_rushing_and_coverage_focus'), salary: 69000, bonus: { rushing: 5, coverage: 4, passing: 2, pass_rush: 2 } },
  { id: 'tr_power', name: 'Bram Forge', role: 'monster_trainer', overall: 83, style: $t('data.power_contact'), strength: $t('data.best_at_pass_rush_and_rushing'), salary: 66000, bonus: { pass_rush: 5, rushing: 4, coverage: 2, passing: 2 } },
  { id: 'tr_focus', name: 'Nia Focus', role: 'monster_trainer', overall: 86, style: $t('data.technique'), strength: $t('data.best_at_passing_and_coverage_focus'), salary: 75000, bonus: { passing: 5, coverage: 4, rushing: 2, pass_rush: 2 } },
]);
export const staffById = (id) => STAFF.find((s) => s.id === id) || null;

/** Scheme alignment 0-100 between the head coach identity and a coordinator. */
export function alignment(hc, coordinator) {
  if (!hc || !coordinator) return 70;
  const h = coordinator.role === 'offensive_coordinator' ? hc.identity.offense : hc.identity.defense;
  const c = coordinator.scheme;
  if (h === c) return 100;
  if (h === 'balanced' || c === 'balanced') return 82;
  if ((h === 'pass' && c === 'run') || (h === 'run' && c === 'pass')) return 48;
  if ((h === 'pressure' && c === 'coverage') || (h === 'coverage' && c === 'pressure')) return 50;
  return 70;
}

/** Training focus → attribute bonuses applied on Sunday (temporary). */
export const TRAINING_FOCI = Object.freeze({
  passing: { label: $t('data.passing'), attrs: ['accuracy', 'catching', 'awareness'], text: $t('data.quarterback_accuracy_receiver_hands_and_reads') },
  rushing: { label: $t('data.rushing'), attrs: ['blocking', 'strength', 'agility'], text: $t('data.run_blocking_power_and_cuts') },
  coverage: { label: $t('data.coverage'), attrs: ['coverage', 'awareness', 'speed'], text: $t('data.pass_defense_and_reaction') },
  pass_rush: { label: $t('data.pass_rush'), attrs: ['strength', 'tackling', 'agility'], text: $t('data.getting_to_the_quarterback_and_finishing') },
});
export function trainingBonus(trainer, focus) {
  const f = TRAINING_FOCI[focus]; if (!f) return null;
  const amount = Math.max(1, Math.round((trainer?.bonus?.[focus] ?? 2) * ((trainer?.overall ?? 75) / 85)));
  return Object.fromEntries(f.attrs.map((k) => [k, amount]));
}

/** Scouting regions → biome and type pool. */
export const REGIONS = Object.freeze({
  'Volcanic Fields': { biome: 'fire', types: ['Fire', 'Earth', 'Dragon'] },
  'Coral Coast': { biome: 'water', types: ['Water', 'Wind', 'Light'] },
  'Emerald Wilds': { biome: 'forest', types: ['Nature', 'Electric', 'Dark'] },
  'Frostpeak Range': { biome: 'ice', types: ['Ice', 'Metal', 'Psychic'] },
  'Thunder Plains': { biome: 'fire', types: ['Electric', 'Wind', 'Fire'] },
  'Shadow Marsh': { biome: 'forest', types: ['Dark', 'Water', 'Psychic'] },
  'Iron Wastes': { biome: 'fire', types: ['Metal', 'Earth', 'Dragon'] },
  'Celestial Highlands': { biome: 'ice', types: ['Light', 'Psychic', 'Wind'] },
});

/** Owner backgrounds chosen at creation (GDD §15.13): flavour plus one small perk. */
export const BACKGROUNDS = Object.freeze({
  player: { label: $t('data.former_player'), text: $t('data.you_played_the_game_training_sessions'), perk: 'training' },
  scout: { label: $t('data.former_scout'), text: $t('data.you_know_what_to_look_for'), perk: 'scouting' },
  analyst: { label: $t('data.analyst'), text: $t('data.you_live_in_the_tape_thursday'), perk: 'analyst' },
  business: { label: $t('data.businessperson'), text: $t('data.you_know_money_the_salary_cap'), perk: 'cap' },
});
