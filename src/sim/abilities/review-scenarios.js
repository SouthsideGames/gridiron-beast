// Task 8 M3: the Ability Reviewer's deterministic scenarios (owner requirement: every football ability can be tested directly on the
// actual engine; a natural-game search stays as the optional demonstration). One entry per Dex family, keyed by family, so the ability
// modules stay untouched. review.js `reviewScenario` runs an entry on the real rules.js game and engine:
//
//   unit      'offense' | 'defense' | 'kick'   the subject's side for the snaps (his club is home; possession follows the unit)
//   calls     [[offensePlayId, defensePlayId], ...]   the plays called, cycled snap by snap (a kicker entry uses `kick` instead)
//   kick      'fg' | 'punt' | 'kickoff' | 'xp'  a kicker's formula kick (or the live kickoff) instead of scrimmage calls
//   target    true: the quarterback throws to the subject (engine `forcedTarget`, the tools' chosen-target read)
//   ballOn    the snap spot (the offense's yards from its own goal); every snap is staged back to it when `reset` is set
//   prime     (form, mastery) -> the subject's game-scope state at the start (the contract's build-up done, as its conditions say)
//   everySnap (api) -> void   re-prime before each snap (e.g. keep a bar full: a staged condition, not a played one)
//   setup     (api) -> void   arrange the clubs or the field before the first snap (an opposing monster, a reserve playbook, a field)
//   options   (api) -> engine options for each snap (forcedTarget, ...), merged into rules.js runScrimmagePlay's options
//   seeds     how many fixed seeds are tried in order (seed0, seed0 + 1, ...; seed0 defaults to 1); snaps: how many snaps per seed. All are fixed, so the scenario is
//             deterministic: the same seed and snap always execute, and the result is identical on every run.
//   staged    a note shown in the reviewer when the scenario stages conditions that released gameplay does not reach today
//   how       one line: how the scenario stages the contract's conditions (shown in the reviewer and the M3 report)
//
// The rest of both clubs carry no ability (species removed) unless the entry places one, so only the subject's contract acts.
// Nothing here writes progression; values, triggers and rules come from the contracts unchanged.
import { REVIEW_ONLY } from '../engine.js';

const PASS_O = [['quick_slants', 'cover_3'], ['deep_post', 'cover_2_man'], ['smash', 'cover_4'], ['curl_flat', 'man_press'], ['te_seam', 'cover_3'], ['dagger', 'zone_blitz']];
const RUN_O = [['inside_zone', 'cover_3'], ['power_right', 'cover_2_man'], ['outside_zone', 'cover_4'], ['counter', 'run_wall'], ['dive', 'man_press'], ['toss_sweep', 'cover_3']];
const MIX_O = [['inside_zone', 'cover_3'], ['quick_slants', 'cover_2_man'], ['power_right', 'run_wall'], ['deep_post', 'cover_3'], ['outside_zone', 'cover_4'], ['smash', 'man_press']];
const DEF_RUN = [['inside_zone', 'run_wall'], ['power_right', 'cover_3'], ['outside_zone', 'cover_2_man'], ['dive', 'goal_line'], ['counter', 'cover_4'], ['toss_sweep', 'zone_blitz']];
const DEF_PASS = [['quick_slants', 'cover_3'], ['deep_post', 'cover_2_man'], ['smash', 'man_press'], ['curl_flat', 'cover_4'], ['mesh', 'cover_1'], ['dagger', 'cover_3']];
const DEF_MIX = [['inside_zone', 'cover_3'], ['quick_slants', 'cover_2_man'], ['power_right', 'run_wall'], ['deep_post', 'cover_3'], ['outside_zone', 'zone_blitz'], ['smash', 'man_press']];

export const SCENARIOS = {
  // ---------------------------------------------------------------------------------------------------------------- Fire
  emberfox: { unit: 'offense', calls: RUN_O, prime: () => ({ charges: 0, ignited: true }), how: 'ignition primed (3 charges done); a rushing carry at his next snap' },
  ashkit: { unit: 'defense', calls: DEF_RUN, prime: () => ({ bar: 2, queued: false }), snaps: 24, how: 'bar primed at 2 of 3; run plays until his credited tackle fills it, and the zone is created at his next defensive snap' },
  firestorm: { unit: 'offense', calls: [['deep_post', 'cover_3'], ['deep_corner', 'cover_2_man'], ['three_verticals', 'cover_4']], target: 'WR1', how: 'ready; a 15+ yd aim to WR1 (chosen target) commits at the release' },
  cinderclaw: { unit: 'defense', calls: DEF_RUN, how: 'ready; run plays at his front until his first blocking engagement (natural trigger, nothing primed)' },
  pyrelynx: { unit: 'defense', calls: DEF_PASS, how: 'passive aura; pass plays put receivers near him' },
  pyroclast: { unit: 'offense', calls: [['stick', 'cover_3'], ['y_cross', 'cover_4'], ['flood', 'cover_2_man'], ['te_seam', 'cover_3']], target: true, snaps: 24, how: 'passes to him (chosen target) until a catch-and-run of 5+ yards after the catch earns the Burning Wake; it is created at his next offensive snap' },
  // ---------------------------------------------------------------------------------------------------------------- Water
  tidepaw: { seed0: 6, unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays into his coverage until his personal pass breakup creates the Water patch (natural trigger)' },
  mudcub: { unit: 'offense', calls: PASS_O, how: 'ready; pass-protection snaps: the automatic snap activation takes two engagements (natural trigger)' },
  reefclaw: { unit: 'defense', calls: DEF_MIX, how: 'ready; mixed snaps until his first block engagement drains the blocker (natural trigger)' },
  tidefin: { seed0: 3, unit: 'offense', calls: [['quick_slants', 'cover_3'], ['curl_flat', 'cover_2_man'], ['smash', 'cover_4']], target: 'WR1', how: 'ready; passes to him (chosen target) until one he reaches falls' },
  wavehorn: { unit: 'offense', calls: RUN_O, how: 'passive aura; run plays give him a blocking assignment with opponents inside the aura (natural trigger)' },
  tsunarok: { seed0: 5, unit: 'defense', calls: [['deep_post', 'cover_3'], ['three_verticals', 'cover_3'], ['dagger', 'cover_4']], target: 'WR1', seeds: 24, snaps: 24,
    setup: ({ teams }) => { const qb = teams.away.offense.QB; qb.attrs = { ...qb.attrs, accuracy: 5, awareness: 5 }; },
    how: 'ready; an inaccurate opposing QB throws deep middle into his zone until he secures an interception' },
  // ---------------------------------------------------------------------------------------------------------------- Nature
  thornkit: { unit: 'offense', calls: PASS_O, target: 'WR1', how: 'ready; passes to him (chosen target): his designated route cut earns the next-play patches (natural trigger)' },
  mossclaw: { unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays: his first single-block engagement while rushing the QB' },
  rootram: { unit: 'offense', calls: RUN_O, how: 'ready; run-blocking snaps until his first block engagement roots him (natural trigger)' },
  leafhorn: { unit: 'defense', calls: DEF_MIX, how: 'every defensive snap: the random teammate protection before the snap (natural trigger)' },
  thornback: { unit: 'offense', calls: [['stick', 'cover_3'], ['y_cross', 'cover_4'], ['flood', 'cover_2_man'], ['te_seam', 'cover_3']], target: true, snaps: 24, how: 'ready; passes to him (chosen target) until he breaks a tackle after the catch' },
  elderoot: { unit: 'defense', calls: DEF_RUN, how: 'ready; a ready defensive scrimmage snap raises the extra defender (natural trigger)' },
  // ---------------------------------------------------------------------------------------------------------------- Electric
  flicker: { unit: 'offense', calls: [['bunch_snag', 'cover_3'], ['bunch_whip', 'cover_2_man'], ['bunch_flood', 'cover_4'], ['bunch_verticals', 'cover_3']], staged: 'staged: conditions not reached in released gameplay (no callable play aligns two route runners within 5 yd; the reserve bunch plays are called)', how: 'reserve bunch plays called (two route runners within 5 yd at the snap)' },
  voltfin: { unit: 'offense', calls: RUN_O, how: 'ready; rushing carries until a rushing first down earns the token; the field is created at his next offensive snap' },
  voltfang: { unit: 'offense', calls: PASS_O, target: 'WR1', how: 'ready; route snaps with passes to him: the collision-and-jam bypass at a ready route snap (natural trigger)' },
  stormlynx: { unit: 'defense', calls: DEF_PASS, how: 'ready; a ready defensive pre-play raises the safety field (natural trigger)' },
  joltrex: { unit: 'defense', calls: DEF_MIX, how: 'ready; mixed snaps until his ordinary block shed arcs to a nearby engaged blocker (natural trigger)' },
  stormcrown: { unit: 'offense', calls: PASS_O, how: 'ready; called passing plays raise the two temporary pass blockers (natural trigger)' },
  // ---------------------------------------------------------------------------------------------------------------- Ice
  snowmoth: { unit: 'kick', kick: 'fg', ballOn: 85, how: 'a 32 yd field goal attempt (his club on 4th down at the opponent 15) until one is made and banks the Ice patch' },
  hailfang: { unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays until his tracked receiver reaches two yards of separation before the release (natural trigger)' },
  frostclaw: { unit: 'defense', calls: DEF_RUN, prime: () => ({ bar: 3 }), how: 'bar primed full (3 low-yardage plays done); his next defensive snap summons the snowballs' },
  icehorn: { seed0: 4, unit: 'defense', calls: DEF_MIX, how: 'ready; mixed snaps until his personal tackle for loss or sack banks the zone; it is created at his next defensive pre-play' },
  glaciron: { unit: 'offense', calls: PASS_O, setup: ({ place }) => { place('away', 'defense', 'DL1', { species: 'mossclaw' }); place('away', 'defense', 'DL2', { species: 'mossclaw' }); },
    how: 'ready; two opposing Vine Vault DLs (ready) rush on pass plays: the first new activation attempt inside his 3 yd aura while he is block-engaged is suppressed' },
  glacivern: { unit: 'kick', kick: 'fg', ballOn: 52, how: 'a 65 yd field goal attempt until the first miss (retried at once)' },
  // ---------------------------------------------------------------------------------------------------------------- Wind
  gustling: { unit: 'offense', calls: PASS_O, target: 'WR1', how: 'ready; offensive snaps with passes to him: the pre-choice Wind corridor at his next offensive snap (natural trigger)' },
  breezefang: { unit: 'offense', calls: RUN_O, prime: () => ({ charges: 3 }), how: 'bar primed full (3 broken tackles done); a rushing carry crosses the LOS' },
  skywarden: { unit: 'defense', calls: DEF_PASS, prime: () => ({ charges: 3 }), how: 'bar primed full (3 PBUs done); a catch by the receiver he guards' },
  windlynx: { unit: 'defense', calls: DEF_PASS, prime: () => ({ charges: 2 }), how: 'bar primed full (2 PBUs done); lanes at the next defensive pre-play' },
  zephyr: { unit: 'offense', calls: [['pa_post', 'cover_3'], ['power_right', 'cover_2_man'], ['dive', 'cover_4'], ['pa_boot', 'cover_3']], setup: ({ place }) => { for (const s of ['LG', 'RG', 'C']) place('home', 'offense', s, { species: 'rootram' }, `scenario_ol_${s}`); },
    everySnap: ({ state }) => { for (const s of ['LG', 'RG', 'C']) state.t8.ability[`scenario_ol_${s}`] = { cd: 3, fresh: false }; },
    how: 'ready; his blockers are Deep Roots OL (Nature) with a running cooldown (3 plays) at each snap: the nearest within his radius gets one extra unit removed at the whistle' },
  tempestra: { unit: 'offense', calls: PASS_O, target: 'WR1', how: 'passes to him (chosen target): three receptions fill the bar and the next reception creates the tornado (played, nothing primed)' },
  // ---------------------------------------------------------------------------------------------------------------- Earth
  pebble: { unit: 'offense', calls: RUN_O, prime: () => ({ banked: true }), how: 'a guarantee banked (an earlier ordinary pancake); his next pancake opportunity' },
  rockram: { unit: 'defense', calls: DEF_PASS, how: 'pass plays: three low-yardage defensive plays bank the guarantee and the next legal forward pass falls incomplete (played, nothing primed)' },
  boulderox: { unit: 'offense', calls: RUN_O, how: 'ready; designed rushing carries until a defender stands three yards ahead (natural trigger)' },
  stoneguard: { unit: 'kick', kick: 'punt', ballOn: 30, how: 'punts until one is caught and returned (the first of the game)' },
  terrabull: { unit: 'offense', calls: [['te_seam', 'cover_3'], ['y_cross', 'cover_4'], ['pa_shot', 'cover_2_man'], ['flood', 'cover_3']], target: true, how: 'ready; passes to him (chosen target) until a secure reception 5+ yards beyond the line' },
  titanolith: { unit: 'offense', calls: RUN_O, how: 'run-blocking snaps: the first eligible offensive snap of the possession slams the rock wall (natural trigger)' },
  // ---------------------------------------------------------------------------------------------------------------- Dark
  shadowkit: { seed0: 6, unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays into his coverage until his own pass breakup banks the Dark field; created at his next defensive snap' },
  nightowl: { unit: 'defense', calls: DEF_MIX, setup: ({ addField }) => addField({ type: 'Dark', strength: 25, centerLat: 0, width: 53.3, yardFrom: 0, yardTo: 100, ownerTeam: 'away', ability: 'scenario-dark' }),
    how: 'an opposing Dark base field placed over the whole field (natural: only an opposing Nocturne or an allied Shadowkit makes one): a non-Dark ally inside his radius stands in it' },
  duskrunner: { unit: 'offense', calls: RUN_O, how: 'ready; rushing carries until his first ordinary juke after the mastery-required rushing yards (natural trigger)' },
  mireclaw: { unit: 'defense', calls: DEF_MIX, how: 'mixed defensive snaps: three plays allowing 4 yards or less fill the bar and the next snap launches the claw (played, nothing primed)' },
  nocturne: { unit: 'offense', calls: PASS_O, how: 'ready; pass plays until a completion of 15+ yards banks the field; created at his next offensive snap' },
  nyxshade: { unit: 'defense', prime: () => ({ charges: 2 }),
    calls: [['fade_out', 'cover_2_man', 'WR1'], ['corner_arrow', 'cover_2_man', 'WR2'], ['pa_slant_post', 'cover_2_man', 'WR1'], ['tight_slant_flat', 'cover_2_man', 'TE'], ['yankee', 'cover_2_man', 'WR1'], ['max_shot', 'tampa_2', 'WR1']],
    staged: 'staged: conditions not reached in released gameplay (at the release an ally is almost never within 3 yd of the catch point and within swap range of him; here reserve opposing plays thrown at chosen targets against cover_2_man put one there)',
    how: 'bar primed full (2 PBUs done); reserve opposing pass plays thrown at chosen targets so that at the release an ally is within 3 yd of the catch point, closer than him and within his swap range' },
  // ---------------------------------------------------------------------------------------------------------------- Light
  glimmer: { unit: 'offense', calls: PASS_O, target: 'WR1', how: 'ready; passes to him (chosen target) until a receiving first down banks the Light field; created at his next offensive snap' },
  sunwhistle: { unit: 'kick', kick: 'xp', how: 'an extra point (his club\'s try) banks the support, then his own kickoff plays with Quickened coverage' },
  lumen: { unit: 'offense', calls: [['stick', 'cover_3', 'TE'], ['curl_flat', 'cover_3', 'RB'], ['pa_boot', 'cover_3', 'TE'], ['curl_flat', 'cover_3', 'TE'], ['stick', 'cover_3', 'RB']],
    how: 'ready; short released throws (stick, curl-flat, the bootleg) to the TE or RB, so the reception is within his radius of the line-of-scrimmage spot (owner N8a)' },
  prism: { unit: 'defense', calls: DEF_MIX, prime: () => ({ charges: 3, noCharge: false }), setup: ({ addField }) => addField({ type: 'Wind', strength: 20, centerLat: 0, width: 12, yardFrom: 40, yardTo: 50, ownerTeam: 'away', ability: 'scenario-wind' }),
    how: 'bar primed full (3 charges); an enemy Wind zone placed on the field: removed at his next defensive pre-choice point' },
  halofang: { unit: 'defense', calls: DEF_RUN, how: 'run plays: the mastery-required rushing tackles arm the next defensive snap (played, nothing primed)' },
  aurelion: { unit: 'offense', calls: [['quick_slants', 'cover_3'], ['curl_flat', 'cover_4'], ['smash', 'cover_2_man']], target: true, setup: ({ state }) => { state.t8.touchdowns = { home: 0, away: 2 }; },
    how: 'two opposing touchdowns in the game ledger (both charges); passes to him (chosen target) until a live reception' },
  // ---------------------------------------------------------------------------------------------------------------- Metal
  ironcub: { unit: 'offense', calls: RUN_O, how: 'ready; run-blocking snaps until his first engagement whose defender begins an ordinary push (natural trigger)' },
  steelpaw: { unit: 'defense', calls: DEF_MIX, how: 'passive; allies within 3 yards at the snap, every second qualifying play reduces the stamina drain (natural trigger)' },
  gearwing: { unit: 'kick', kick: 'punt', ballOn: 30, how: 'punts from his own 30 until one nets 35+ yards without a touchback and banks the Metal field' },
  ironjaw: { unit: 'defense', calls: DEF_RUN, prime: () => ({ token: true }), snaps: 24, how: 'token primed (an earlier own sack); run plays until his successful normal tackle whose first fumble check did not fumble' },
  metalhorn: { unit: 'offense', calls: [['stick', 'cover_3'], ['y_cross', 'cover_4'], ['flood', 'cover_2_man'], ['te_seam', 'cover_3']], target: true, toGo: 2, how: 'ready; 1st and 2: passes to him (chosen target) until his own receiving first down' },
  aegistron: { unit: 'defense', calls: [['inside_zone', 'edge_contain'], ['quick_slants', 'edge_contain'], ['power_right', 'edge_contain']], prime: () => ({ count: 3, armed: true, usedDrive: null }),
    how: 'bar primed full (3 plays allowing 3 yd or less done), use unspent this possession; the edge_contain front, where the panels have safe ground at every mastery width' },
  // ---------------------------------------------------------------------------------------------------------------- Psychic
  mindwing: { unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays until his tackle or assist after a completion banks the Psychic zone; created at the next defensive pre-choice' },
  shadewisp: { unit: 'defense', calls: DEF_PASS, how: 'ready; pass plays in man coverage until his receiver\'s first route cut in range (natural trigger)' },
  cerebrix: { unit: 'offense', calls: [['quick_slants', 'double_a_mug'], ['inside_zone', 'goal_line'], ['smash', 'goal_line_man'], ['deep_post', 'double_a_mug']], how: 'ready; the defense calls the fronts that align an LB within 3 yd of the line (double_a_mug, goal_line, goal_line_man) until the marked LB blitzes' },
  echolot: { unit: 'kick', kick: 'kickoff', how: 'his own kickoffs until one is caught and returned without a touchdown and banks the Psychic field' },
  enigmane: { unit: 'offense', calls: [['y_cross', 'cover_2_man'], ['stick', 'man_press'], ['flood', 'cover_1'], ['te_seam', 'cover_2_man']], prime: () => ({ bar: 4 }), how: 'bar primed full (4 plays without a reception done); man coverage on him until his first route cut with his man within 2 yd' },
  astralux: { unit: 'offense', calls: RUN_O, how: 'ready (once per game); rushing carries until 8 net yards and a new tackle attempt trigger the teleport' },
  // ---------------------------------------------------------------------------------------------------------------- Dragon
  drakeling: { unit: 'offense', calls: RUN_O, how: 'rushing carries until an ordinary juke or broken tackle prepares the pounce for the next tackle attempt (natural trigger)' },
  wyrmkit: { unit: 'offense', calls: RUN_O, how: 'three offensive plays fill the bar and his next offensive snap pulses (played, nothing primed)' },
  sablewing: { unit: 'defense', calls: [['quick_slants', 'cover_2_man'], ['curl_flat', 'man_press'], ['stick', 'cover_1']], target: 'WR1', snaps: 24,
    options: () => ({ [REVIEW_ONLY]: { fumbleOnTackle: true } }),
    how: 'dev-only engine option (review only): every ordinary tackle of the ball carrier fumbles; passes to the receiver he covers until he is the ordinary recoverer' },
  scaleguard: { unit: 'offense', calls: RUN_O, how: 'run-blocking snaps: three plays finishing engaged fill the bar; the next engagement with a DL stomps (played, nothing primed)' },
  vyrnax: { unit: 'kick', kick: 'fg', ballOn: 70, signature: true, how: 'the player\'s Dragon Roar call on a 47 yd field goal (the AI\'s own call is not needed)' },
  aurodrax: { unit: 'offense', calls: PASS_O, how: 'pass plays until three consecutive qualifying completions charge the protection, then a would-be interception (played, nothing primed)' },
};
