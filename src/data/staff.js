// Coaching staff: five mandatory hires with real effects.
//  - Head coach: identity (affects AI aggression/pass bias for suggestions) and a small
//    execution bonus from scheme alignment with the coordinators.
//  - Coordinators: the play catalog the owner can equip from.
//  - Scout: biome accuracy for prospect discovery and attribute reveals.
//  - Trainer: Wednesday training focus strength.

export const STAFF_ROLES = ['head_coach', 'offensive_coordinator', 'defensive_coordinator', 'head_scout', 'monster_trainer'];
export const ROLE_LABEL = Object.freeze({ head_coach: 'Head Coach', offensive_coordinator: 'Offensive Coordinator', defensive_coordinator: 'Defensive Coordinator', head_scout: 'Head Scout', monster_trainer: 'Monster Trainer' });

export const PLAYBOOKS = Object.freeze({
  oc_swift: ['quick_slants', 'stick', 'curl_flat', 'smash', 'mesh', 'levels', 'dagger', 'three_verticals', 'deep_post', 'deep_corner', 'slot_fade', 'bubble_screen', 'rb_screen', 'double_move', 'inside_zone', 'qb_draw', 'hail_mary'],
  oc_brock: ['inside_zone', 'power_right', 'power_left', 'dive', 'outside_zone', 'stretch_left', 'counter', 'toss_sweep', 'trap', 'read_option', 'pa_post', 'pa_boot', 'pa_shot', 'te_seam', 'flood', 'quick_slants', 'hail_mary'],
  oc_park: ['inside_zone', 'power_right', 'outside_zone', 'counter', 'jet_sweep', 'qb_draw', 'quick_slants', 'stick', 'curl_flat', 'smash', 'y_cross', 'flood', 'te_seam', 'deep_post', 'pa_boot', 'rb_screen', 'wheel', 'hail_mary'],
  dc_stone: ['cover_1', 'cover_0', 'db_blitz', 'zone_blitz', 'fire_zone', 'safety_blitz', 'double_a_mug', 'corner_blitz', 'all_out', 'edge_contain', 'man_press', 'qb_spy', 'bear_front', 'goal_line', 'run_wall', 'cover_2_man', 'cover_3', 'prevent'],
  dc_ice: ['cover_2_zone', 'cover_3', 'cover_4', 'cover_6', 'tampa_2', 'max_drop', 'prevent', 'robber', 'zone_blitz', 'corner_blitz', 'bracket_left', 'run_wall', 'goal_line', 'qb_spy', 'edge_contain', 'cover_2_man', 'cover_1', 'fire_zone'],
  dc_fox: ['cover_2_man', 'man_press', 'cover_1', 'cover_0', 'bracket_left', 'robber', 'db_blitz', 'safety_blitz', 'double_a_mug', 'goal_line_man', 'qb_spy', 'edge_contain', 'bear_front', 'goal_line', 'run_wall', 'cover_3', 'tampa_2', 'fire_zone', 'prevent'],
});

export const STAFF = Object.freeze([
  { id: 'hc_flint', name: 'Marcus Flint', role: 'head_coach', overall: 82, style: 'Physical', strength: 'Power running and toughness', salary: 180000, identity: { offense: 'run', defense: 'pressure', aggression: 0.65, passBias: 0.42 } },
  { id: 'hc_vale', name: 'Avery Vale', role: 'head_coach', overall: 80, style: 'Balanced', strength: 'Adaptable game plans', salary: 160000, identity: { offense: 'balanced', defense: 'balanced', aggression: 0.5, passBias: 0.55 } },
  { id: 'hc_reyes', name: 'Jordan Reyes', role: 'head_coach', overall: 84, style: 'Speed', strength: 'Tempo and passing preparation', salary: 195000, identity: { offense: 'pass', defense: 'coverage', aggression: 0.55, passBias: 0.66 } },
  { id: 'oc_swift', name: 'Elena Swift', role: 'offensive_coordinator', overall: 86, style: 'Air Raid', strength: 'Passing and receiver development', salary: 150000, scheme: 'pass' },
  { id: 'oc_brock', name: 'Tobias Brock', role: 'offensive_coordinator', overall: 83, style: 'Ground Attack', strength: 'Power and outside runs', salary: 130000, scheme: 'run' },
  { id: 'oc_park', name: 'Nia Park', role: 'offensive_coordinator', overall: 80, style: 'Balanced', strength: 'Flexible run-pass approach', salary: 125000, scheme: 'balanced' },
  { id: 'dc_stone', name: 'Darius Stone', role: 'defensive_coordinator', overall: 84, style: 'Blitz Heavy', strength: 'Quarterback pressure', salary: 145000, scheme: 'pressure' },
  { id: 'dc_ice', name: 'Iris Frost', role: 'defensive_coordinator', overall: 85, style: 'Zone Control', strength: 'Deep pass defense', salary: 155000, scheme: 'coverage' },
  { id: 'dc_fox', name: 'Ronan Fox', role: 'defensive_coordinator', overall: 81, style: 'Man Coverage', strength: 'One-on-one coverage', salary: 120000, scheme: 'man' },
  { id: 'sc_tide', name: 'Marina Tide', role: 'head_scout', overall: 88, style: 'Water Specialist', strength: 'Coastal scouting', salary: 125000, biomes: { water: 95, fire: 10, forest: 42, ice: 72 } },
  { id: 'sc_ash', name: 'Ash Calder', role: 'head_scout', overall: 86, style: 'Fire Specialist', strength: 'Volcanic scouting', salary: 120000, biomes: { water: 12, fire: 95, forest: 45, ice: 24 } },
  { id: 'sc_moss', name: 'Rowan Moss', role: 'head_scout', overall: 80, style: 'Generalist', strength: 'Consistent across all biomes', salary: 110000, biomes: { water: 65, fire: 65, forest: 65, ice: 65 } },
  { id: 'tr_speed', name: 'Sera Dash', role: 'monster_trainer', overall: 84, style: 'Speed & Agility', strength: 'Best at Rushing and Coverage focus', salary: 115000, bonus: { rushing: 5, coverage: 4, passing: 2, pass_rush: 2 } },
  { id: 'tr_power', name: 'Bram Forge', role: 'monster_trainer', overall: 83, style: 'Power & Contact', strength: 'Best at Pass Rush and Rushing focus', salary: 110000, bonus: { pass_rush: 5, rushing: 4, coverage: 2, passing: 2 } },
  { id: 'tr_focus', name: 'Nia Focus', role: 'monster_trainer', overall: 86, style: 'Technique', strength: 'Best at Passing and Coverage focus', salary: 125000, bonus: { passing: 5, coverage: 4, rushing: 2, pass_rush: 2 } },
]);
export const staffById = (id) => STAFF.find((s) => s.id === id) || null;

/** Scheme alignment 0–100 between the head coach identity and a coordinator. */
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
  passing: { label: 'Passing', attrs: ['accuracy', 'catching', 'awareness'], text: 'Quarterback accuracy, receiver hands and reads.' },
  rushing: { label: 'Rushing', attrs: ['blocking', 'strength', 'agility'], text: 'Run blocking, power and cuts.' },
  coverage: { label: 'Coverage', attrs: ['coverage', 'awareness', 'speed'], text: 'Pass defense and reaction.' },
  pass_rush: { label: 'Pass Rush', attrs: ['strength', 'tackling', 'agility'], text: 'Getting to the quarterback and finishing tackles.' },
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
