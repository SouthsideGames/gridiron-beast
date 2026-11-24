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
  { id: 'hc_flint', substitution: 'starters', name: 'Marcus Flint', role: 'head_coach', overall: 82, style: $t('data.physical'), strength: $t('data.power_running_and_toughness'), salary: 108000, identity: { offense: 'run', defense: 'pressure', aggression: 0.65, passBias: 0.42 } },
  { id: 'hc_vale', substitution: 'balanced', name: 'Avery Vale', role: 'head_coach', overall: 80, style: $t('data.balanced'), strength: $t('data.adaptable_game_plans'), salary: 96000, identity: { offense: 'balanced', defense: 'balanced', aggression: 0.5, passBias: 0.55 } },
  { id: 'hc_reyes', substitution: 'heavy', name: 'Jordan Reyes', role: 'head_coach', overall: 84, style: $t('data.speed'), strength: $t('data.tempo_and_passing_preparation'), salary: 117000, identity: { offense: 'pass', defense: 'coverage', aggression: 0.55, passBias: 0.66 } },
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

// Coach names (owner's lists, 2026-11-23): 400 first and 400 last names. Used for the name suggested when you create your coach
// and for the other clubs' head coaches in franchises created after this change (f.coachNames === 2); older franchises keep the
// names they were created with (src/franchise/awards.js).
/** First names, one word each. */
export const COACH_FIRST_NAMES = Object.freeze(`Aaron Adrian Aiden Akira Alejandro Alex Alexander Alexis Amara Amir Andre Andrew Angel Anthony Archer Aria Asher Atlas Austin
Avery Axel Bailey Blake Brandon Brayden Brianna Bryce Caleb Cameron Carlos Carter Chase Chloe Christian Christopher Clara Cody
Cole Connor Cooper Damian Daniel Dante Darius David Declan Derek Devin Diego Dominic Donovan Dylan Easton Elijah Elliot Emily
Emma Enzo Eric Ethan Evan Ezra Felix Finn Gabriel Gavin Grayson Harper Hassan Hayden Henry Hudson Hugo Hunter Ian Isaac Isaiah
Ivan Ivy Jace Jack Jackson Jacob Jade Jalen James Jasmine Jason Javier Jayden Jeremiah Jesse Jordan Joseph Joshua Julian Kai
Kareem Kayden Keira Kenji Kevin Kieran Kingston Knox Kobe Kyle Landon Layla Leo Leon Levi Liam Logan Lorenzo Luca Lucas Luis
Luna Malik Marcus Mason Mateo Maya Micah Michael Miles Milo Morgan Nadia Naomi Nathan Nico Noah Nolan Nori Nova Oliver Omar
Orion Oscar Owen Parker Patrick Phoenix Quentin Rafael Ray Remy Riley River Roman Rowan Ryan Ryder Sage Samuel Santiago Savannah
Sebastian Seth Silas Skylar Sofia Stephanie Sterling Theo Thomas Tobias Tristan Troy Tyler Valentina Victor Vincent Violet
Wesley William Wyatt Xavier Yasmin Zane Zion Zoe Ace Apollo Ash Blaze Brock Caspian Dash Drake Ember Flint Jett Koda Onyx Raven
Rex Storm Adam Albert Alfred Arthur Benjamin Bernard Bradley Brian Bruce Charles Colin Curtis Dennis Donald Douglas Edward Edwin
Francis Frank Frederick George Gerald Graham Harold Harrison Harvey Hugh Jeffrey Jeremy Jonathan Kenneth Lawrence Louis Malcolm
Martin Matthew Nicholas Peter Richard Robert Adonis Anderson Ashton Beckett Beckham Bentley Bodhi Boston Branson Brooks Bryson
Callum Camden Cannon Cash Cayden Colton Crew Cruz Daxton Denver Edison Ellis Emerson Everett Ford Gage Greyson Hendrix Holden
Houston Jaxon Kaden Kayson Keaton Maddox Maverick Paxton Rylan Weston Abigail Ada Addison Alice Amelia Andrea Anna Ariana Aubrey
Aurora Autumn Bella Blair Brooke Camila Carmen Cassidy Celeste Charlotte Daisy Dakota Delilah Eden Eleanor Elena Elizabeth Ella
Evelyn Faith Gabriella Grace Hannah Hazel Isabella Julia Kennedy Lily Mila Olivia Willow Abdul Ahmed Akio Alonzo Andres Antonio
Arjun Arturo Aziz Cesar Chidi Cristiano Daichi Eduardo Emilio Esteban Fabian Fernando Franco Gael Haruto Ibrahim Idris Iker
Jamal Joaquin Jorge Karim Khalil Kwame Leonardo Luciano Manuel Matias Miguel Mustafa Pablo Ren Riku Yuto Aero Aries Arrow Aster
Bear Blade Bolt Boulder Bronx Cinder Clay Cliff Colt Comet Creed Dagger Dune Echo Falcon Fang Flash Hawk Jet Knight Legend Lynx
Mars Mercury Neo Noble Oak Ranger Reign Ridge Rocky Rogue Slate Talon Titan Wolf`.split(/\s+/));
/** Last names, one word each. */
export const COACH_LAST_NAMES = Object.freeze(`Adams Aguilar Alexander Allen Alvarez Anderson Armstrong Austin Bailey Baker Banks Barnes Barrett Bell Bennett Bishop Black
Boone Brooks Brown Bryant Butler Campbell Carter Castillo Chavez Clark Cole Coleman Collins Cooper Cortez Cruz Cunningham
Daniels Davis Dawson Delgado Diaz Dixon Douglas Drake Edwards Ellis Evans Fields Fisher Flores Ford Foster Fox Franklin Freeman
Garcia Gardner Gibson Gomez Gonzalez Gordon Graham Grant Gray Green Griffin Hall Hamilton Harris Harrison Hayes Henderson
Hernandez Hill Hoffman Holmes Howard Hughes Hunter Jackson James Jenkins Johnson Jones Jordan Kareem Kelly Kennedy Kim King
Knight Lee Lewis Lopez Marshall Martin Martinez Mason Matthews Mendoza Miller Mitchell Moore Morales Morgan Morris Murphy Naomi
Nelson Nguyen Nori Ortiz Owens Palmer Parker Patel Patterson Perez Perry Peterson Phillips Pierce Porter Powell Price Ramirez
Reed Reyes Reynolds Richards Rivera Roberts Robinson Rodriguez Rogers Romero Ross Russell Sanchez Sanders Scott Shaw Simmons
Singh Smith Spencer Stephanie Stevens Stewart Stone Sullivan Taylor Thomas Thompson Torres Turner Vargas Vasquez Walker Wallace
Ward Warren Washington Watson Wells West White Williams Wilson Wright Young Zhang Ashford Ashwood Blackwell Blackwood Brightwood
Cross Crowe Frost Gale Hawthorne Ironwood Lockwood Moon Nightfall North Oakley Redwood Rivers Silver Steel Storm Summers Thorne
Vale Wilder Winter Wolfe Wolfwood Evergreen Fairchild Abbott Atkins Baldwin Barton Bates Benson Blake Bradley Briggs Burke Burns
Burton Chambers Chandler Chapman Clayton Crawford Curtis Davidson Dean Duncan Dunn Elliott Ferguson Fletcher Fowler Gilbert
Goodman Graves Hardy Hart Hawkins Higgins Hopkins Hudson Lawson Little Lucas Pearson Sutton Acosta Alvarado Arias Bautista
Benitez Cabrera Calderon Campos Cardenas Carrasco Castro Cervantes Contreras Dominguez Espinoza Estrada Fernandez Figueroa
Fuentes Galindo Guerrero Guzman Herrera Ibarra Jimenez Leon Luna Marquez Medina Mendez Miranda Molina Montoya Moreno Navarro
Nunez Ortega Pacheco Rojas Salazar Abbas Ahmed Ali Amin Anand Aziz Bhandari Chen Choi Das Dubois Fischer Gupta Hassan Ibrahim
Ito Khan Kumar Laurent Lin Liu Malik Mehta Nakamura Okafor Okoro Park Rossi Sato Shah Sharma Silva Suzuki Tanaka Wang Watanabe
Wong Yamamoto Yilmaz Yusuf Archer Banner Beck Bentley Bishopson Bond Bowman Branch Bridges Brock Buckley Cannon Carson Cash
Chance Chase Cobb Conrad Crosby Dallas Dalton Diamond Duke Easton Finch Flynn Forbes Garrison Gates Glass Gold Hartley Hendrix
Houston Kingston Maddox Maxwell Nash Rhodes Royal Amberstone Ashborne Blackthorn Bloodstone Bluewater Boulder Brightstar Cloud
Coldwater Copperfield Darkwood Dawn Daybreak Emberstone Firestone Flame Foxwood Frostborn Goldleaf Goldstone Granite Grimwood
Highwind Hollow Ironclaw Ironheart Lightfoot Longshadow Moonstone Nightshade Oakheart Rain Ravenwood Rockwell Shadow Silverwood
Snow Starfall Thunder Windfall`.split(/\s+/));
