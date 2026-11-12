// The single source of truth for every play: cards, field art, audit tool,
// coaching AI and the simulation all read these definitions.
//
// Coordinates are play-relative yards: x upfield from the line of scrimmage
// (offense attacks +x), y lateral (negative = offense's left).

import { OFFENSE_PACKAGES, DEFENSE_PACKAGES, offenseOnField, defenseOnField, LINEMEN, BASE_LINEMEN } from './personnel.js';
import { routePoints, ALTERNATE_ROUTES, ZONES, GAPS } from './routes.js';
import { reservePlays } from './playbook-reserve.js';
import { t as $t } from '../text/index.js';

// ---------------------------------------------------------------- formations
const OL = { LG: [-0.6, -1.7], RG: [-0.6, 1.7] };
const OL3 = { ...OL, C: [-0.4, 0] }; // tight sets bring the third lineman
export const OFFENSE_FORMATIONS = Object.freeze({
  i_pro: { pkg: 'pro', label: $t('plays.i_form'), align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro: { pkg: 'pro', label: $t('plays.gun_pro'), align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro_lt: { pkg: 'pro', label: $t('plays.gun_pro_left'), align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_spread: { pkg: 'spread', label: $t('plays.spread'), align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR1: [-0.6, -18], WR2: [-1.2, 18], WR3: [-1.2, 10] } },
  gun_trips: { pkg: 'spread', label: $t('plays.trips_left'), align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], WR1: [-0.6, -19], WR3: [-1.2, -12], WR2: [-1.2, 18] } },
  tight_i: { pkg: 'tight', label: $t('plays.tight_i'), align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.2], WR1: [-0.6, -18] } },
  tight_gun: { pkg: 'tight', label: $t('plays.tight_gun'), align: { ...OL3, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.2], WR1: [-1.2, -18] } },
  tight_wing: { pkg: 'tight', label: $t('plays.wing'), align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-1.4, 4.2], WR1: [-0.6, -18] } },
  // ---- playbook expansion: used by reserve plays only, until the owner releases them
  pistol_pro: { pkg: 'pro', label: $t('plays.pistol'), reserve: true, align: { ...OL, QB: [-3.5, 0], RB: [-6.2, 0], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  ace_twins: { pkg: 'pro', label: $t('plays.ace_twins_left'), reserve: true, align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.4], WR1: [-0.6, -19], WR2: [-1.2, -11] } },
  gun_twins_rt: { pkg: 'pro', label: $t('plays.gun_twins_right'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, -3.4], WR1: [-1.2, 11], WR2: [-0.6, 19] } },
  gun_wing: { pkg: 'pro', label: $t('plays.gun_wing'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-1.4, 4.2], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  pro_bunch: { pkg: 'pro', label: $t('plays.bunch_right'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 5.2], WR1: [-1.8, 3.6], WR2: [-1.8, 6.8] } },
  pro_trips: { pkg: 'pro', label: $t('plays.trips_right'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.4], WR1: [-1.2, 10], WR2: [-0.6, 18] } },
  pro_empty: { pkg: 'pro', label: $t('plays.empty'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-1.2, -10], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  spread_trips_rt: { pkg: 'spread', label: $t('plays.trips_right'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR3: [-1.2, 7], WR2: [-1.2, 13], WR1: [-0.6, 19] } },
  spread_bunch: { pkg: 'spread', label: $t('plays.spread_bunch'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR1: [-0.6, -18], WR3: [-0.6, 9], WR2: [-1.8, 10.8] } },
  trips_bunch: { pkg: 'spread', label: $t('plays.trips_bunch'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR3: [-0.6, 9], WR1: [-1.8, 7.2], WR2: [-1.8, 10.8] } },
  empty_2x2: { pkg: 'spread', label: $t('plays.empty_2x2'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-1.2, 10], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-0.6, 18] } },
  empty_trips: { pkg: 'spread', label: $t('plays.empty_trips'), reserve: true, align: { ...OL, QB: [-5, 0], WR1: [-0.6, -18], WR3: [-1.2, 6], RB: [-1.2, 11], WR2: [-0.6, 18] } },
  pistol_twins: { pkg: 'spread', label: $t('plays.pistol_twins'), reserve: true, align: { ...OL, QB: [-3.5, 0], RB: [-6.2, 0], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-0.6, 18] } },
  spread_left: { pkg: 'spread', label: $t('plays.spread_left'), reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-1.2, 18] } },
  tight_i_lt: { pkg: 'tight', label: $t('plays.tight_i_left'), reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, -3.2], WR1: [-0.6, 18] } },
  tight_pistol: { pkg: 'tight', label: $t('plays.tight_pistol'), reserve: true, align: { ...OL3, QB: [-3.5, 0], RB: [-6.2, 0], TE: [-0.6, 3.2], WR1: [-0.6, -18] } },
  tight_twins: { pkg: 'tight', label: $t('plays.tight_twins'), reserve: true, align: { ...OL3, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.2], WR1: [-1.2, 11] } },
  tight_flex: { pkg: 'tight', label: $t('plays.tight_flex'), reserve: true, align: { ...OL3, QB: [-5, 0], RB: [-5.2, 2.8], TE: [-1.2, 8], WR1: [-0.6, -18] } },
  goal_jumbo: { pkg: 'tight', label: $t('plays.jumbo'), reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.2], WR1: [-0.6, -7] } },
  tight_wing_lt: { pkg: 'tight', label: $t('plays.wing_left'), reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-1.4, -4.2], WR1: [-0.6, 18] } },
});

export const DEFENSE_FORMATIONS = Object.freeze({
  base: { pkg: 'base', align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, -3.5], LB2: [4.5, 3.5], CB1: [6, -17], CB2: [6, 17], FS: [12, 0] } },
  nickel: { pkg: 'nickel', align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, 0], CB1: [6, -17], CB2: [6, 17], FS: [12, -7], SS: [12, 7] } },
  heavy: { pkg: 'heavy', align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [3.5, -3.5], LB2: [3.5, 3.5], CB1: [5, -15], CB2: [5, 15] } },
  pressure: { pkg: 'pressure', align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [4, 0], CB1: [5, -16], CB2: [5, 16], FS: [10, 0] } },
  // ---- playbook expansion: reserve plays only
  base_press: { pkg: 'base', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, -3.5], LB2: [4.5, 3.5], CB1: [1.5, -17], CB2: [1.5, 17], FS: [13, 0] } },
  base_wide: { pkg: 'base', reserve: true, align: { DL1: [1, -3.4], DL2: [1, 3.4], LB1: [4.5, -2], LB2: [4.5, 2], CB1: [6, -17], CB2: [6, 17], FS: [12, 0] } },
  base_stack: { pkg: 'base', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [5, -1.8], LB2: [5, 1.8], CB1: [7, -17], CB2: [7, 17], FS: [12, 0] } },
  base_walk: { pkg: 'base', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4, -8], LB2: [4.5, 2.5], CB1: [6, -17], CB2: [6, 17], FS: [12, 0] } },
  nickel_2high: { pkg: 'nickel', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [5, 0], CB1: [7, -17], CB2: [7, 17], FS: [13, -9], SS: [13, 9] } },
  nickel_press: { pkg: 'nickel', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, 0], CB1: [1.5, -17], CB2: [1.5, 17], FS: [12, -7], SS: [12, 7] } },
  nickel_buzz: { pkg: 'nickel', reserve: true, align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, 0], CB1: [7, -17], CB2: [7, 17], FS: [13, 0], SS: [7, 9] } },
  nickel_wide: { pkg: 'nickel', reserve: true, align: { DL1: [1, -3.6], DL2: [1, 3.6], LB1: [4.5, 0], CB1: [6, -17], CB2: [6, 17], FS: [12, -7], SS: [12, 7] } },
  heavy_wide: { pkg: 'heavy', reserve: true, align: { DL1: [1, -3.4], DL3: [1, 0], DL2: [1, 3.4], LB1: [3.5, -2], LB2: [3.5, 2], CB1: [5, -15], CB2: [5, 15] } },
  heavy_stack: { pkg: 'heavy', reserve: true, align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [4.5, -1.2], LB2: [4.5, 1.2], CB1: [6, -15], CB2: [6, 15] } },
  pressure_mug: { pkg: 'pressure', reserve: true, align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [1.5, -1], CB1: [5, -16], CB2: [5, 16], FS: [11, 0] } },
  pressure_wide: { pkg: 'pressure', reserve: true, align: { DL1: [1, -4], DL3: [1, 0], DL2: [1, 4], LB1: [4, 0], CB1: [5, -16], CB2: [5, 16], FS: [11, 0] } },
});

// ------------------------------------------------------------- play builders
const R = (r) => ({ a: 'route', r });
const BLOCK = { a: 'block' }; // OL pass protection / default run block toward play side
const RUNBLOCK = (to) => ({ a: 'run_block', to }); // lead or down block toward a landmark
const STALK = (to) => ({ a: 'stalk', to }); // WR/TE blocks the nearest defender in his area
const PULL = (via, to) => ({ a: 'pull', via, to });
const CLIMB = (to) => ({ a: 'run_block', to, climb: true }); // Phase C1 (F4): works past the linemen on the line to block at the second level
const RELEASE = (to) => ({ a: 'release', to }); // lineman releases for a screen
const CARRY = (path) => ({ a: 'carry', path });
const HANDOFF = { a: 'handoff' };
const FAKE = { a: 'fake' }; // RB fakes a carry then blocks
const KEEP = (path) => ({ a: 'keep', path }); // designed QB run
const PA = (path) => ({ a: 'play_action', path });
const BOOT = (path) => ({ a: 'boot', path });

const RUSH = (gap) => ({ a: 'rush', gap });
const MAN = (key, tech) => (tech ? { a: 'man', key, tech } : { a: 'man', key }); // tech 'under': inside-underneath trail technique, for a call that puts deep help over him (Phase B)
const ZONE = (zone) => ({ a: 'zone', zone });
// Bracket (Phase B): a deep defender over the top and outside of one receiver, paired with the man defender underneath and inside
// on the same receiver; when that receiver is no vertical threat the bracket defender plays his deep zone for everyone else.
const BRACKET = (key, zone) => ({ a: 'zone', zone, bracket: key });
const SPY = { a: 'spy' };
const CONTAIN = (gap) => ({ a: 'contain', gap });

function offense(id, name, formation, assignments, opts = {}) {
  const f = OFFENSE_FORMATIONS[formation];
  if (!f) throw new Error(`${name}: unknown formation ${formation}`);
  const play = { id, name, side: 'offense', type: opts.type || 'pass', formation, pkg: f.pkg, align: { ...f.align, ...(opts.align || {}) }, assignments, primary: opts.primary || null, progression: opts.progression || [], drop: opts.drop || 'three', tags: opts.tags || [], desc: opts.desc || '' };
  if (opts.reserve) play.reserve = true; // only reserve plays carry the key, so live plays keep their review fingerprints
  if (opts.motion) play.motion = opts.motion; // pre-snap motion: { slot, to } (only plays with motion carry the key)
  if (opts.legendary) play.legendary = opts.legendary; // Legendary Plays (GDD §36): { species, slot }
  return play;
}
function defense(id, name, formation, assignments, opts = {}) {
  const f = DEFENSE_FORMATIONS[formation];
  if (!f) throw new Error(`${name}: unknown formation ${formation}`);
  const play = { id, name, side: 'defense', formation, pkg: f.pkg, align: { ...f.align, ...(opts.align || {}) }, assignments, tags: opts.tags || [], desc: opts.desc || '' };
  if (opts.reserve) play.reserve = true;
  if (opts.legendary) play.legendary = opts.legendary;
  return play;
}

// ------------------------------------------------------------- offense plays
const OFFENSE_PLAYS = [
  // ---- runs
  offense('inside_zone', $t('plays.inside_zone'), 'gun_pro', {
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-2, 0.5], [2, -1], [8, -1.5], [20, -2]]),
    LG: RUNBLOCK([2, -2]), RG: RUNBLOCK([2, 1.5]), TE: CLIMB([3, 0.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]), // Phase C1 (F3): the tight end climbs to the linebacker (the centre this was written for is not in the Pro set)
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: $t('plays.zone_blocking_the_back_reads_the') }),
  offense('power_right', $t('plays.power_right'), 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, 1.5], [1, 3], [6, 3.5], [20, 4]]),
    LG: PULL([-1.2, 0.6], [1.2, 3.4]), C: RUNBLOCK([1.5, -0.5]), // Phase C1 (F5): a tight pull, just behind the centre, so the guard reaches the hole before the back (v42.15 pulled 2 yards deep and arrived behind him)
    RG: RUNBLOCK([1.5, 2]), TE: RUNBLOCK([1.5, 4.5]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: $t('plays.guard_pulls_to_lead_through_the') }),
  offense('power_left', $t('plays.power_left'), 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, -1.5], [1, -3], [6, -3.5], [20, -4]]),
    RG: PULL([-1.2, -0.6], [1.2, -3.4]), C: RUNBLOCK([1.5, 0.5]), // Phase C1 (F5): a tight pull, so the guard leads the back through the hole
    LG: RUNBLOCK([1.5, -2]), TE: RUNBLOCK([2, 3]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: $t('plays.guard_pulls_left_tight_end_seals') }),
  offense('dive', $t('plays.hb_dive'), 'i_pro', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-2, 0.6], [2, 0.8], [20, 1]]),
    LG: RUNBLOCK([1.5, -1.6]), RG: RUNBLOCK([1.5, 1.6]), TE: CLIMB([3, 1]), WR1: STALK([4, -16]), WR2: STALK([4, 16]), // Phase C1 (F3): the tight end leads up to the linebacker
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: $t('plays.straight_ahead_behind_the_center_short') }),
  offense('outside_zone', $t('plays.outside_zone'), 'gun_pro', {
    // Phase C2 (F8): the back lines up on the play side, takes the mesh at the quarterback's hip and bends to the edge (v42.15 lined
    // him up on the far side, so he crossed behind the quarterback and reached the line at 1.6 s, a third of his runs for a loss).
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-4.6, 1.4], [-3, 4], [0, 6.5], [5, 9], [22, 11]]),
    LG: RUNBLOCK([2, 0]), TE: RUNBLOCK([1.5, 4.5]), RG: RUNBLOCK([2.5, 5]), WR2: STALK([3, 14]), WR1: STALK([4, -14]), // Phase C1 (F3): the tight end, the end man of the line, reaches the play-side edge (the reach was written for a centre the Pro set does not have)
  }, { type: 'run', tags: ['run', 'outside'], desc: $t('plays.everyone_reaches_right_the_back_bends') }),
  offense('stretch_left', $t('plays.stretch_left'), 'tight_gun', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-4.6, -1.4], [-3, -5], [0, -8], [5, -10], [22, -12]]), // Phase C1 (F1): the back takes the mesh at the quarterback's hip, then bends outside (v42.15 ran straight away from the mesh)
    RG: RUNBLOCK([2, 0]), C: RUNBLOCK([2, -2.5]), LG: RUNBLOCK([2.5, -5]), TE: RUNBLOCK([2, 2]), WR1: STALK([3, -15]),
  }, { type: 'run', tags: ['run', 'outside'], desc: $t('plays.wide_zone_to_the_left_behind') }),
  offense('counter', $t('plays.counter'), 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-5.9, 0.9], [-3.9, -1], [0, -3], [6, -3.8], [20, -4]]),
    RG: PULL([-1.2, 0], [1.2, -3.6]), TE: PULL([-1.6, 1.2], [2.5, -5]), // Phase C1 (F5): tight pulls, so guard and tight end lead the back instead of trailing him
    C: RUNBLOCK([1.5, 0.5]), LG: RUNBLOCK([1.5, -2]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: $t('plays.false_step_right_then_the_guard') }),
  offense('toss_sweep', $t('plays.toss_sweep'), 'i_pro', {
    QB: { a: 'pitch', path: [[-1.6, 0], [-3, 1.5]] }, RB: CARRY([[-6.5, 0], [-5.5, 6], [-2, 11], [4, 14], [22, 15]]),
    RG: PULL([-2, 3], [2, 9]), TE: RUNBLOCK([1.5, 1.5]), LG: RUNBLOCK([1.5, -1.5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]), // Phase C1 (F3): the tight end blocks down where the absent centre was drawn
  }, { type: 'run', tags: ['run', 'outside'], desc: $t('plays.pitch_to_the_back_the_guard') }),
  offense('trap', $t('plays.trap'), 'gun_pro', {
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-2, 1], [2, -1.5], [20, -2]]),
    RG: PULL([-1.5, 0], [1, -2.2]), TE: RUNBLOCK([1.5, 1.5]), LG: CLIMB([2.5, -0.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]), // Phase C1 (F3, F4): the left guard releases the tackle and climbs, the tight end blocks down, the right guard traps
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: $t('plays.let_the_tackle_through_then_trap') }),
  offense('qb_draw', $t('plays.qb_draw'), 'gun_pro', {
    QB: KEEP([[-5, 0], [-6, 0], [-2, 0.5], [3, 0], [20, 0]]), RB: RUNBLOCK([0, 3.5]),
    LG: RUNBLOCK([-1.5, -2]), TE: CLIMB([2.5, 1]), RG: RUNBLOCK([-1.5, 2.5]), WR1: R('go'), WR2: R('go'), // Phase C1 (F3): the tight end climbs to the linebacker (the centre this was written for is not in the Pro set)
  }, { type: 'run', tags: ['run', 'inside', 'long', 'draw'], desc: $t('plays.fake_the_drop_then_the_quarterback') }),
  offense('read_option', $t('plays.read_option'), 'gun_pro', {
    // Phase C1 (F1): the back crosses the quarterback's face, so the give is a real exchange at the mesh (v42.15's paths never
    // came within 2.8 yards: every give moved the ball 3-6 yards to a back who was never in reach).
    QB: { a: 'option', path: [[-5, 0], [-4, 2], [0, 5], [6, 9], [20, 11]] }, RB: CARRY([[-5.2, 2.8], [-4.2, 0.7], [-3, -0.8], [1, -2], [8, -3], [20, -3]]),
    LG: RUNBLOCK([2, -2]), RG: RUNBLOCK([2, 2]), TE: RUNBLOCK([1.4, 3.4]), WR1: STALK([4, -16]), WR2: STALK([4, 16]), // Phase C1 (F3): the tight end seals the keep side (the inside block was written for a centre the Pro set does not have)
  }, { type: 'run', tags: ['run', 'option'], desc: $t('plays.the_quarterback_reads_the_unblocked_edge') }),
  offense('jet_sweep', $t('plays.jet_sweep'), 'gun_trips', {
    QB: HANDOFF, WR3: CARRY([[-1.6, -4.5], [-2, -1], [-1, 6], [3, 13], [20, 16]]),
    LG: RUNBLOCK([1.5, -1]), RB: RUNBLOCK([2, 8]), RG: RUNBLOCK([2, 5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]), // Phase C1 (F3): the back leads to the edge (the centre this was written for is not in the Spread set)
  }, { type: 'run', motion: { slot: 'WR3', to: [-1.6, -4.5] }, tags: ['run', 'outside', 'misdirection'], desc: $t('plays.the_slot_receiver_takes_the_jet') }),

  // ---- quick passes
  offense('quick_slants', $t('plays.quick_slants'), 'gun_pro', {
    QB: { a: 'pass' }, WR1: R('slant'), WR2: R('slant'), RB: R('flat'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'quick', tags: ['pass', 'quick', 'short', 'two_minute'], desc: $t('plays.two_slants_with_the_back_to') }),
  offense('stick', $t('plays.stick'), 'tight_gun', {
    QB: { a: 'pass' }, TE: R('stick'), RB: R('swing'), WR1: R('hitch'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'RB', 'WR1'], drop: 'quick', tags: ['pass', 'quick', 'short'], desc: $t('plays.tight_end_sits_in_the_hole') }),
  offense('curl_flat', $t('plays.curl_flat'), 'gun_pro', {
    QB: { a: 'pass' }, WR2: R('curl'), RB: R('flat'), WR1: R('comeback'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR2', progression: ['WR2', 'RB', 'WR1'], drop: 'three', tags: ['pass', 'short', 'zone_beater'], desc: $t('plays.high_low_on_the_flat_defender') }),
  offense('bubble_screen', $t('plays.bubble_screen'), 'gun_trips', {
    QB: { a: 'pass' }, WR3: R('bubble'), WR1: STALK([2, -19]), WR2: R('go'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2'], drop: 'quick', tags: ['pass', 'screen', 'quick', 'short'], desc: $t('plays.catch_and_run_behind_the_outside') }),
  offense('rb_screen', $t('plays.rb_screen'), 'gun_pro', {
    QB: { a: 'pass', hold: 1.6 }, RB: R('screen'), WR1: R('go'), WR2: R('go'),
    LG: RELEASE([2, 6]), RG: BLOCK,
  }, { primary: 'RB', progression: ['RB'], drop: 'five', tags: ['pass', 'screen', 'long', 'blitz_beater'], desc: $t('plays.let_the_rush_in_then_dump') }),

  // ---- intermediate
  offense('smash', $t('plays.smash'), 'gun_spread', {
    QB: { a: 'pass' }, WR2: R('hitch'), WR3: R('corner'), WR1: R('dig'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: $t('plays.corner_over_hitch_stresses_the_deep') }),
  offense('mesh', $t('plays.mesh'), 'gun_trips', {
    QB: { a: 'pass' }, WR3: R('shallow'), WR2: R('drag'), WR1: R('corner'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'man_beater'], desc: $t('plays.two_crossers_rub_underneath_the_corner') }),
  offense('levels', $t('plays.levels'), 'gun_spread', {
    QB: { a: 'pass' }, WR1: R('dig'), WR3: R('slant'), WR2: R('post'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: $t('plays.in_breaking_routes_at_three_depths') }),
  offense('y_cross', $t('plays.y_cross'), 'tight_gun', {
    QB: { a: 'pass' }, TE: R('drag'), WR1: R('post'), RB: R('angle'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'medium'], desc: $t('plays.tight_end_crosses_the_field_under') }),
  offense('flood', $t('plays.flood'), 'tight_gun', {
    QB: { a: 'pass' }, WR1: R('go'), TE: R('out'), RB: R('flat'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'RB', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: $t('plays.three_levels_to_one_sideline') }),
  offense('te_seam', $t('plays.te_seam'), 'tight_gun', {
    QB: { a: 'pass' }, TE: R('seam'), WR1: R('curl'), RB: R('swing'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'medium', 'deep'], desc: $t('plays.the_tight_end_splits_the_safeties') }),
  offense('dagger', $t('plays.dagger'), 'gun_spread', {
    QB: { a: 'pass' }, WR3: R('seam'), WR1: R('dig'), WR2: R('drag'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: $t('plays.seam_clears_the_hook_zone_for') }),

  // ---- deep
  offense('three_verticals', $t('plays.three_verticals'), 'gun_spread', {
    QB: { a: 'pass' }, WR1: R('go'), WR3: R('seam'), WR2: R('fade'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: $t('plays.stretch_the_deep_coverage_with_three') }),
  offense('deep_post', $t('plays.deep_post'), 'gun_pro', {
    QB: { a: 'pass' }, WR1: R('post'), WR2: R('comeback'), RB: R('flat'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: $t('plays.shot_play_post_over_the_top') }),
  offense('deep_corner', $t('plays.deep_corner'), 'gun_pro', {
    QB: { a: 'pass' }, WR2: R('corner'), WR1: R('skinny_post'), RB: R('swing'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR2', progression: ['WR2', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long', 'redzone'], desc: $t('plays.corner_route_to_the_pylon_with') }),
  offense('slot_fade', $t('plays.slot_fade'), 'gun_spread', {
    QB: { a: 'pass' }, WR3: R('fade'), WR2: R('out'), WR1: R('drag'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'deep', 'redzone', 'man_beater'], desc: $t('plays.slot_receiver_fades_to_the_sideline') }),
  offense('wheel', $t('plays.wheel'), 'gun_pro_lt', {
    QB: { a: 'pass' }, RB: R('wheel'), WR1: R('slant'), WR2: R('post'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'RB', progression: ['RB', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'man_beater'], desc: $t('plays.the_back_wheels_up_the_sideline') }),
  offense('double_move', $t('plays.double_move'), 'gun_pro', {
    QB: { a: 'pass', hold: 1.2 }, WR1: R('double_move'), WR2: R('curl'), RB: R('flat'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: $t('plays.hitch_and_go_needs_time_to') }),

  // ---- play action
  offense('pa_post', $t('plays.pa_post'), 'tight_i', {
    QB: PA([[-1.6, 0], [-4, 0], [-6, 1]]), RB: FAKE, WR1: R('post'), TE: R('corner'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'TE'], drop: 'pa', tags: ['pass', 'deep', 'play_action'], desc: $t('plays.fake_the_dive_then_throw_the') }),
  offense('pa_boot', $t('plays.pa_boot'), 'tight_wing', {
    QB: BOOT([[-1.6, 0], [-4, 1], [-5, 6], [-3, 11]]), RB: FAKE, TE: R('flat'), WR1: R('drag'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1'], drop: 'pa', tags: ['pass', 'medium', 'play_action', 'boot'], desc: $t('plays.fake_left_roll_right_tight_end') }),
  offense('pa_shot', $t('plays.pa_shot'), 'tight_i', {
    QB: PA([[-1.6, 0], [-4, 0], [-7, 0]]), RB: FAKE, WR1: R('go'), TE: R('seam'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1'], drop: 'pa', tags: ['pass', 'deep', 'play_action', 'long'], desc: $t('plays.max_protection_two_vertical_routes') }),
  offense('hail_mary', $t('plays.hail_mary'), 'gun_spread', {
    QB: { a: 'pass', hold: 2.2 }, WR1: R('go'), WR2: R('go'), WR3: R('post'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'desperation'], desc: $t('plays.everyone_to_the_end_zone') }),
];

// ------------------------------------------------------------- defense plays
const DEFENSE_PLAYS = [
  defense('cover_2_man', $t('plays.cover_2_man'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside', 'under'), CB1: MAN('wideL', 'under'), CB2: MAN('wideR', 'under'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'man', 'balanced'], desc: $t('plays.two_deep_halves_everyone_underneath_locked') }),
  defense('cover_3', $t('plays.cover_3'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('flat_R'),
  }, { align: { SS: [5, 10] }, tags: ['pass', 'zone', 'balanced'], desc: $t('plays.three_deep_thirds_strong_safety_drops') }),
  defense('cover_4', $t('plays.cover_4'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R'),
  }, { tags: ['pass', 'zone', 'deep', 'prevent_light'], desc: $t('plays.four_deep_quarters_gives_up_the') }),
  defense('cover_1', $t('plays.cover_1'), 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['pass', 'man'], desc: $t('plays.man_across_every_receiver_and_the') }),
  defense('cover_0', $t('plays.cover_0'), 'pressure', {
    DL1: RUSH('B_L'), DL3: RUSH('A_R'), DL2: RUSH('edge_R'), LB1: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { FS: [6, 0] }, tags: ['blitz', 'man', 'risky', 'short'], desc: $t('plays.no_deep_help_four_rush_three') }),
  defense('tampa_2', $t('plays.tampa_2'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('deep_middle'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'zone'], desc: $t('plays.two_deep_with_the_linebacker_carrying') }),
  defense('qb_spy', $t('plays.qb_spy'), 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: SPY, LB2: ZONE('hook_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['pass', 'man', 'anti_scramble'], desc: $t('plays.a_linebacker_mirrors_the_quarterback') }),
  defense('db_blitz', $t('plays.db_blitz'), 'base', {
    DL1: RUSH('A_L'), DL2: RUSH('A_R'), CB1: RUSH('edge_L'), CB2: RUSH('edge_R'), LB1: MAN('wideL'), LB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { LB1: [5, -10], LB2: [5, 10], FS: [7, 0] }, tags: ['blitz', 'man', 'risky'], desc: $t('plays.both_corners_come_off_the_edge') }),
  defense('zone_blitz', $t('plays.zone_blitz'), 'base', {
    DL1: ZONE('hook_L'), DL2: RUSH('B_R'), LB1: RUSH('A_L'), LB2: RUSH('B_L'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'),
  }, { tags: ['blitz', 'zone'], desc: $t('plays.two_linebackers_come_a_lineman_drops') }),
  defense('all_out', $t('plays.all_out_pressure'), 'pressure', {
    DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), LB1: RUSH('A_R'), CB1: RUSH('edge_L'), CB2: RUSH('edge_R'), FS: RUSH('A_R'),
  }, { align: { FS: [5, 0] }, tags: ['blitz', 'risky', 'desperation'], desc: $t('plays.everybody_goes_nobody_covers') }),
  defense('edge_contain', $t('plays.edge_contain'), 'pressure', {
    DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), DL3: RUSH('A_L'), LB1: ZONE('hook_M'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { align: { DL1: [1, -5], DL2: [1, 5] }, tags: ['run', 'anti_outside', 'anti_scramble'], desc: $t('plays.ends_stay_wide_to_turn_everything') }), // Phase C2 (F8): the ends line up outside the tight end, as the call says (they lined up in the B gaps, over the guards, and were blocked at the snap)
  defense('goal_line', $t('plays.goal_line_stand'), 'heavy', {
    DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: RUSH('B_L'), LB2: ZONE('short_R'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { LB1: [2.5, -3], LB2: [2.5, 3] }, tags: ['run', 'goalline', 'short'], desc: $t('plays.everybody_in_the_box_corners_alone') }),
  defense('run_wall', $t('plays.run_wall'), 'heavy', {
    DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), CB1: ZONE('curl_L'), CB2: ZONE('curl_R'),
  }, { tags: ['run', 'short'], desc: $t('plays.three_down_linemen_linebackers_fill_the') }),
  defense('max_drop', $t('plays.max_drop'), 'nickel', {
    DL1: ZONE('hook_M'), DL2: RUSH('A_R'), LB1: ZONE('hook_L'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('hook_R'),
  }, { align: { SS: [6, 6] }, tags: ['pass', 'zone', 'long'], desc: $t('plays.one_rusher_six_in_coverage') }),
  defense('prevent', $t('plays.prevent'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_center'), SS: ZONE('deep_quarter_R'),
  }, { align: { FS: [18, -4], SS: [16, 8] }, tags: ['pass', 'deep', 'prevent'], desc: $t('plays.keep_everything_in_front_late_game') }),
  defense('man_press', $t('plays.man_press'), 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { align: { CB1: [1.5, -17], CB2: [1.5, 17] }, tags: ['pass', 'man', 'press'], desc: $t('plays.corners_jam_at_the_line_one') }),
  defense('robber', $t('plays.robber'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'), SS: ZONE('robber'),
  }, { tags: ['pass', 'man', 'trap'], desc: $t('plays.man_under_with_a_safety_lurking') }),
  defense('fire_zone', $t('plays.fire_zone'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), SS: RUSH('edge_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'),
  }, { align: { SS: [4, 7] }, tags: ['blitz', 'zone'], desc: $t('plays.safety_blitz_off_the_edge_with') }),
  defense('cover_2_zone', $t('plays.cover_2_zone'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'zone', 'balanced'], desc: $t('plays.two_deep_halves_corners_squat_in') }),
  defense('cover_6', $t('plays.cover_6'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_half_R'), CB2: ZONE('flat_R'),
  }, { align: { SS: [12, 8] }, tags: ['pass', 'zone'], desc: $t('plays.quarters_to_the_left_cover_2') }),
  defense('corner_blitz', $t('plays.corner_blitz'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), CB1: RUSH('edge_L'), LB1: ZONE('hook_M'), SS: ZONE('deep_third_L'), FS: ZONE('deep_third_M'), CB2: ZONE('deep_third_R'),
  }, { align: { CB1: [2, -12], SS: [10, -10] }, tags: ['blitz', 'zone'], desc: $t('plays.the_left_corner_comes_off_the') }),
  defense('safety_blitz', $t('plays.safety_blitz'), 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), FS: RUSH('A_L'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { FS: [7, -2] }, tags: ['blitz', 'man', 'risky', 'short'], desc: $t('plays.the_free_safety_comes_from_depth') }),
  defense('bear_front', $t('plays.bear_front'), 'heavy', {
    DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: RUSH('B_R'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { DL1: [1, -2.6], DL3: [1, 0], DL2: [1, 2.6], LB1: [3.5, -3], LB2: [3.5, 3] }, tags: ['run', 'balanced'], desc: $t('plays.a_nose_over_the_center_and') }),
  defense('double_a_mug', $t('plays.double_a_mug'), 'pressure', {
    DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), DL3: RUSH('A_L'), LB1: RUSH('A_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { DL3: [1, -0.9], LB1: [1.2, 0.9], FS: [7, 0] }, tags: ['blitz', 'man', 'risky', 'interior'], desc: $t('plays.two_rushers_mugged_up_in_the') }),
  defense('bracket_left', $t('plays.bracket_left'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL', 'under'), SS: BRACKET('wideL', 'deep_quarter_LL'), CB2: MAN('wideR'), FS: ZONE('deep_half_R'),
  }, { align: { SS: [11, -14] }, tags: ['pass', 'man', 'bracket'], desc: $t('plays.the_left_receiver_gets_a_corner') }),
  defense('goal_line_man', $t('plays.goal_line_man'), 'heavy', {
    DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { LB1: [2.5, -2], LB2: [2.5, 2] }, tags: ['goalline', 'man', 'short'], desc: $t('plays.three_in_the_gaps_everyone_else') }),
];

// ------------------------------------------------------------- compilation
// Phase C1 (F3): an assignment written for a slot the play's package does not put on the field was dropped without a word (eight
// live runs lost a blocker that way). Every play is checked as it is compiled, and validatePlaybook reports each one.
export function offFieldAssignments(play) {
  const onField = play.side === 'offense' ? offenseOnField(play.pkg) : defenseOnField(play.pkg);
  return Object.keys(play.assignments).filter((slot) => !onField.includes(slot)).map((slot) => `${$t('plays.assignment_for_who_is_not_on', { name: play.name, slot, pkg: play.pkg })}`);
}
const COMPILE_PROBLEMS = [];
function compile(play) {
  const onField = play.side === 'offense' ? offenseOnField(play.pkg) : defenseOnField(play.pkg);
  COMPILE_PROBLEMS.push(...offFieldAssignments(play));
  const compiled = { ...play, onField, assignments: {} };
  for (const slot of onField) {
    const a = play.assignments[slot] || (['TE', 'RB', 'C'].includes(slot) ? BLOCK : null);
    if (!a) throw new Error(`${play.name}: missing assignment for ${slot}`);
    const align = play.align[slot];
    if (!align) throw new Error(`${play.name}: missing alignment for ${slot}`);
    const out = { ...a };
    // Routes toward the sideline stay inside the boundary (break shortened, never clipped off-field).
    if (a.a === 'route') out.points = routePoints(a.r, align).map(([x, y]) => [x, Math.max(-25, Math.min(25, y))]);
    if (a.a === 'carry' || a.a === 'keep' || a.a === 'option' || a.a === 'play_action' || a.a === 'boot' || a.a === 'pitch') out.points = a.path.map((p) => [...p]);
    if (a.a === 'run_block' || a.a === 'stalk' || a.a === 'release') out.points = [align, a.to];
    if (a.a === 'pull') out.points = [align, a.via, a.to];
    if (a.a === 'block') out.points = play.type === 'run' ? [align, [align[0] + 2, align[1]]] : [align, [align[0] - 1.2, align[1]]];
    if (a.a === 'handoff') out.points = [align, [align[0] - 1.5, align[1] + 1]];
    if (a.a === 'fake') out.points = [align, [align[0] + 3, align[1] + 1.2]];
    if (a.a === 'pass') out.points = [align, [align[0] - (play.drop === 'quick' ? 1 : play.drop === 'five' ? 3 : 2), align[1]]];
    if (a.a === 'rush' || a.a === 'contain') out.points = [align, GAPS[a.gap]];
    if (a.a === 'zone') { const z = ZONES[a.zone]; out.points = [align, z.at]; out.role = z.role; out.at = z.at; }
    if (a.a === 'spy') out.points = [align, [-2, 0]];
    compiled.assignments[slot] = out;
  }
  return Object.freeze(compiled);
}

// Reserve plays (GDD playbook expansion): fully built and reviewed in the Playbook Audit, but no coach,
// AI club, practice field or game plan can call them until the owner releases them. They live in PLAYS
// (so the audit, art and engine can run them) and never in OFFENSE_IDS / DEFENSE_IDS, which every
// game system draws from.
// Owner ruling N8b (2026-11-08, item E): the designed bunch reserve plays that align two route runners within 5 yards are released
// into ordinary play (they make Crossed Wires, ELE-01-F, reachable in released gameplay). Their formations stay reserve formations.
export const RELEASED_RESERVE_OFFENSE = Object.freeze(['bunch_snag', 'bunch_whip', 'whip_corner', 'y_pivot', 'bunch_slant_arrow', 'bunch_scissors', 'corner_arrow', 'bunch_flood', 'post_wheel', 'bunch_verticals']);
const RELEASED = new Set(RELEASED_RESERVE_OFFENSE);
const RESERVE = reservePlays({ offense: (id, name, formation, asg, opts = {}) => offense(id, name, formation, asg, { ...opts, reserve: !RELEASED.has(id) }), defense: (id, name, formation, asg, opts = {}) => defense(id, name, formation, asg, { ...opts, reserve: true }), R, BLOCK, RUNBLOCK, STALK, PULL, RELEASE, CARRY, HANDOFF, FAKE, KEEP, PA, BOOT, RUSH, MAN, ZONE, SPY, CONTAIN, BRACKET });
// Legendary Plays (GDD §36): built on the same assignments as every play, each tied to one Legendary monster who must be on
// the field in its slot. Like reserve plays they live in PLAYS (engine, art, audit) and never in OFFENSE_IDS / DEFENSE_IDS:
// a club can call one only when it holds that Legendary and has put the play in one of its six slots.
const LEGEND = (species, slot) => ({ legendary: { species, slot } });
const LEGENDARY_OFFENSE = [
  offense('lp_dragons_gambit', $t('plays.dragons_gambit'), 'gun_pro', {
    QB: BOOT([[-5, 0], [-6, 1.5], [-6.5, 5], [-5, 9]]), RB: FAKE, WR1: R('over'), TE: R('corner'), WR2: R('comeback'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'TE', 'WR2'], drop: 'pa', tags: ['pass', 'deep', 'play_action', 'boot', 'legendary'], ...LEGEND('aurodrax', 'QB'), desc: $t('plays.run_fake_then_aurodrax_rolls_right') }),
  offense('lp_eye_of_the_storm', $t('plays.eye_of_the_storm'), 'gun_trips', {
    QB: { a: 'pass' }, WR1: R('sluggo'), WR3: R('whip'), WR2: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'long', 'legendary'], ...LEGEND('tempestra', 'WR1'), desc: $t('plays.tempestra_sells_a_slant_from_the') }),
  offense('lp_fault_line', $t('plays.fault_line'), 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-5.9, 0.9], [-4, -0.4], [0, -1.7], [6, -2.2], [20, -2.6]]),
    LG: RUNBLOCK([2.5, -2.2]), C: RUNBLOCK([1.5, 0.8]), RG: PULL([-2, 0], [1.5, -3.6]), TE: RUNBLOCK([1.5, 4.6]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'misdirection', 'goalline', 'legendary'], ...LEGEND('titanolith', 'LG'), desc: $t('plays.false_step_right_then_the_back') }),
];
const LEGENDARY_DEFENSE = [
  defense('lp_phantom_coverage', $t('plays.phantom_coverage'), 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: ZONE('robber'), FS: MAN('wideL'), CB2: MAN('wideR'), SS: ZONE('deep_middle'),
  }, { align: { CB1: [1.5, -17], FS: [10, -9], SS: [12, 5] }, tags: ['pass', 'man', 'trap', 'legendary'], ...LEGEND('nyxshade', 'CB1'), desc: $t('plays.nyxshade_shows_press_on_the_left') }),
  // lp_avalanche (Glacivern at FS) retired 2026-11-07 (owner): Glacivern is a K (B19); not every legendary has an unlocked play.
  defense('lp_rootbound', $t('plays.rootbound'), 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('short_M'), LB2: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('hook_M'),
  }, { align: { LB1: [4, 0], LB2: [4.5, 3], FS: [6.5, 0] }, tags: ['run', 'man', 'legendary', 'anti_misdirection'], ...LEGEND('elderoot', 'LB1'), desc: $t('plays.everyone_packs_inside_elderoots_grove_nobody') }),
];
export const PLAYS = Object.freeze(Object.fromEntries([...OFFENSE_PLAYS, ...DEFENSE_PLAYS, ...RESERVE.offense, ...RESERVE.defense, ...LEGENDARY_OFFENSE, ...LEGENDARY_DEFENSE].map((p) => [p.id, compile(p)])));
export const LEGENDARY_IDS = Object.freeze([...LEGENDARY_OFFENSE, ...LEGENDARY_DEFENSE].map((p) => p.id));
export const isLegendary = (id) => !!PLAYS[id]?.legendary;
export const OFFENSE_IDS = [...OFFENSE_PLAYS.map((p) => p.id), ...RESERVE.offense.filter((p) => RELEASED.has(p.id)).map((p) => p.id)]; // N8b: the released bunch plays
export const DEFENSE_IDS = DEFENSE_PLAYS.map((p) => p.id);
export const RESERVE_OFFENSE_IDS = RESERVE.offense.filter((p) => !RELEASED.has(p.id)).map((p) => p.id);
export const RESERVE_DEFENSE_IDS = RESERVE.defense.map((p) => p.id);
export const isReserve = (id) => !!PLAYS[id]?.reserve;
export const getPlay = (id) => { const p = PLAYS[id]; if (!p) throw new Error(`Unknown play ${id}`); return p; };

/** Eligible receivers for an offensive play (skill players running routes or carrying). */
export function eligibleReceivers(play) {
  return play.onField.filter((s) => s !== 'QB' && !LINEMEN.includes(s));
}

/**
 * Resolve man-coverage keys against an actual offensive alignment:
 * wideL = widest left receiver, wideR = widest right, inside = the third.
 */
/**
 * Who each man-coverage key points at: the widest receiver each side, the
 * inside receiver (slot or tight end, never a back) and the back. With only
 * three receivers the back key is empty; a defender keyed to nobody plays zone-ish.
 */
export function manKeyTargets(offensePlay) {
  const receivers = eligibleReceivers(offensePlay).map((s) => [s, offensePlay.align[s][1], offensePlay.align[s][0]]).sort((a, b) => a[1] - b[1]);
  const backs = receivers.filter(([, , x]) => x < -3).map(([s]) => s);
  const onLine = receivers.filter(([s]) => !backs.includes(s));
  const wideL = onLine[0]?.[0] || receivers[0]?.[0];
  const wideR = onLine[onLine.length - 1]?.[0] || receivers[receivers.length - 1]?.[0];
  const inside = onLine.find(([s]) => s !== wideL && s !== wideR)?.[0] || backs[0] || wideR;
  const back = backs.find((s) => s !== inside) || null;
  return { wideL, wideR, inside, back };
}

/** Colour role for play art (GDD §6). */
export function artRole(play, slot) {
  const a = play.assignments[slot];
  if (play.side === 'defense') {
    if (a.a === 'rush' || a.a === 'contain') return 'rush';
    if (a.a === 'man') return 'man';
    if (a.a === 'zone') return a.role; // deep | middle | flat
    if (a.a === 'spy') return 'middle';
    return 'middle';
  }
  if (['block', 'run_block', 'stalk', 'pull', 'release', 'fake'].includes(a.a)) return 'block';
  if (a.a === 'route') return slot === play.primary ? 'primary' : ALTERNATE_ROUTES.has(a.r) ? 'alternate' : 'secondary';
  if (a.a === 'carry' || a.a === 'keep') return 'primary';
  if (['option', 'pitch', 'handoff', 'play_action', 'boot', 'pass'].includes(a.a)) return 'alternate';
  return 'alternate';
}

/** Endpoint style: routes/paths get arrowheads, blocks get T-bars, man gets none. */
export function artEnd(play, slot) {
  const a = play.assignments[slot];
  if (['block', 'run_block', 'stalk', 'pull', 'release', 'fake'].includes(a.a)) return 'tbar';
  if (a.a === 'man' || a.a === 'zone') return 'none';
  return 'arrow';
}

/** Validate every play once; returns an array of problems (empty when valid). */
export function validatePlaybook() {
  const problems = [...COMPILE_PROBLEMS];
  for (const p of Object.values(PLAYS)) {
    if (p.onField.length !== 7) problems.push(`${p.name}: ${p.onField.length} on field`);
    if (p.side === 'offense') {
      if (!BASE_LINEMEN.every((s) => p.onField.includes(s))) problems.push(`${p.name}: missing linemen`);
      if (p.type === 'pass') {
        const routes = eligibleReceivers(p).filter((s) => p.assignments[s].a === 'route');
        if (!p.primary || !routes.includes(p.primary)) problems.push(`${p.name}: primary ${p.primary} is not a route runner`);
        if (routes.filter((s) => s === p.primary).length !== 1) problems.push(`${p.name}: primary count`);
        if (!p.progression.includes(p.primary)) problems.push(`${p.name}: primary not first in progression`);
      } else {
        const carriers = p.onField.filter((s) => ['carry', 'keep', 'option'].includes(p.assignments[s].a));
        if (carriers.length < 1) problems.push(`${p.name}: run play without a ball carrier`);
      }
    } else {
      for (const [slot, a] of Object.entries(p.assignments)) {
        if (a.a === 'man' && !['wideL', 'wideR', 'inside', 'back'].includes(a.key)) problems.push(`${p.name}: ${slot} bad man key`);
        if (a.a === 'zone' && !ZONES[a.zone]) problems.push(`${p.name}: ${slot} bad zone`);
        if ((a.a === 'rush' || a.a === 'contain') && !GAPS[a.gap]) problems.push(`${p.name}: ${slot} bad gap`);
      }
    }
    if (p.motion) {
      const m = p.motion, from = p.align[m.slot];
      if (!from) problems.push(`${p.name}: motion slot ${m.slot} not on the field`);
      else {
        if (!(m.to[0] < 0)) problems.push(`${p.name}: motion must finish behind the line`);
        if (Math.hypot(m.to[0] - from[0], m.to[1] - from[1]) > 14) problems.push(`${p.name}: motion longer than 14 yards`);
        const pts = p.assignments[m.slot].points; if (pts && (pts[0][0] !== m.to[0] || pts[0][1] !== m.to[1])) problems.push(`${p.name}: ${m.slot}'s path must start where the motion ends`);
      }
    }
    for (const [slot, a] of Object.entries(p.assignments)) {
      for (const [x, y] of a.points || []) {
        if (Math.abs(y) > 26.5) problems.push(`${p.name}: ${slot} point beyond sideline (${x},${y})`);
        if (x > 30 || x < -12) problems.push(`${p.name}: ${slot} point too deep (${x},${y})`);
      }
    }
  }
  return problems;
}

export { OFFENSE_PACKAGES, DEFENSE_PACKAGES };

/** Practice lessons: one coaching note per play, when to call it, what to watch for, and what beats it. */
export const LESSONS = Object.freeze({
  inside_zone: { when: $t('plays.your_bread_and_butter_run_on'), watch: $t('plays.the_back_reads_the_first_lineman'), beats: $t('plays.nickel_and_dime_looks'), loses: $t('plays.heavy_fronts_and_the_run_wall') },
  power_right: { when: $t('plays.short_yardage_and_goal_line_3rd'), watch: $t('plays.the_pulling_guard_the_hole_opens'), beats: $t('plays.light_boxes_goal_line_man_zone'), loses: $t('plays.all_out_pressure_and_run_wall') },
  power_left: { when: $t('plays.same_job_as_power_right_call'), watch: $t('plays.the_tight_end_seals_the_back'), beats: $t('plays.defenses_shaded_to_your_right'), loses: $t('plays.goal_line_stand_run_wall_and') },
  dive: { when: $t('plays.fast_safe_yards_when_you_need'), watch: $t('plays.hits_the_a_gap_instantly_the'), beats: $t('plays.soft_zone_shells_and_man_coverage'), loses: $t('plays.run_wall_and_stacked_boxes') },
  outside_zone: { when: $t('plays.get_the_ball_to_a_fast'), watch: $t('plays.whole_line_slides_the_back_either'), beats: $t('plays.slow_interior_linebackers_the_bear_front'), loses: $t('plays.goal_line_fronts_cover_0_all') },
  stretch_left: { when: $t('plays.outside_zone_to_the_left_use'), watch: $t('plays.if_the_corner_comes_up_hard'), beats: $t('plays.defenses_overplaying_one_side'), loses: $t('plays.edge_contain_and_blitzes_off_the') },
  counter: { when: $t('plays.after_a_few_runs_one_direction'), watch: $t('plays.fake_step_one_way_guard_pulls'), beats: $t('plays.aggressive_linebackers_who_over_pursue'), loses: $t('plays.disciplined_zone_defenses_that_stay_home') },
  toss_sweep: { when: $t('plays.your_fastest_back_against_a_slow'), watch: $t('plays.pitch_is_live_a_bad_toss'), beats: $t('plays.heavy_fronts_stacked_inside'), loses: $t('plays.edge_contain_and_fast_corners') },
  trap: { when: $t('plays.against_a_defense_that_rushes_hard'), watch: $t('plays.the_lineman_lets_the_rusher_through'), beats: $t('plays.fire_zone_and_two_deep_shells'), loses: $t('plays.goal_line_fronts_and_all_out') },
  qb_draw: { when: $t('plays.3rd_and_medium_when_the_defense'), watch: $t('plays.the_qb_shows_pass_then_takes'), beats: $t('plays.two_deep_shells_and_man_coverage'), loses: $t('plays.double_a_mug_cover_0_and') },
  read_option: { when: $t('plays.with_a_fast_smart_qb_let'), watch: $t('plays.unblocked_end_crashes_on_the_back'), beats: $t('plays.edge_rushers_who_fire_upfield'), loses: $t('plays.all_out_pressure_double_a_mug') },
  jet_sweep: { when: $t('plays.get_your_fastest_receiver_the_ball'), watch: $t('plays.timing_of_the_snap_with_the'), beats: $t('plays.heavy_packages_with_slow_corners'), loses: $t('plays.blitzes_and_goal_line_fronts_double') },
  quick_slants: { when: $t('plays.beat_the_blitz_the_ball_is'), watch: $t('plays.the_qb_throws_on_the_receivers'), beats: $t('plays.cover_0_and_db_blitz'), loses: $t('plays.robber_a_defender_sits_right_in') },
  stick: { when: $t('plays.reliable_5_7_yards_on_2nd'), watch: $t('plays.inside_receiver_settles_at_the_sticks'), beats: $t('plays.cover_3_and_soft_zones'), loses: $t('plays.tampa_2_with_a_deep_middle') },
  curl_flat: { when: $t('plays.a_steady_chain_mover_against_zone'), watch: $t('plays.curl_and_flat_stretch_one_defender'), beats: $t('plays.cover_3_2'), loses: $t('plays.cover_2_man_the_man_defender') },
  bubble_screen: { when: $t('plays.get_the_ball_to_a_receiver'), watch: $t('plays.the_blocker_must_reach_the_corner'), beats: $t('plays.cover_4_and_prevent'), loses: $t('plays.man_press_2') },
  rb_screen: { when: $t('plays.against_an_aggressive_pass_rush_especially'), watch: $t('plays.let_the_rushers_in_then_dump'), beats: $t('plays.all_out_pressure_and_cover_0'), loses: $t('plays.qb_spy_and_max_drop') },
  smash: { when: $t('plays.a_classic_cover_2_beater_on'), watch: $t('plays.corner_route_over_the_top_hitch'), beats: $t('plays.cover_2_man_and_tampa_2'), loses: $t('plays.cover_4_the_safety_takes_the') },
  mesh: { when: $t('plays.beat_man_coverage_with_two_crossers'), watch: $t('plays.the_crossers_pass_within_a_yard'), beats: $t('plays.cover_1_and_man_press'), loses: $t('plays.zone_defenses_the_crossers_run_into') },
  levels: { when: $t('plays.attack_the_middle_at_two_depths'), watch: $t('plays.read_the_linebacker_if_he_sinks'), beats: $t('plays.cover_3_and_tampa_2'), loses: $t('plays.robber_in_the_middle') },
  y_cross: { when: $t('plays.your_tight_end_or_slot_against'), watch: $t('plays.the_deep_crosser_takes_time_protect'), beats: $t('plays.cover_1_and_cover_3'), loses: $t('plays.fire_zone_pressure_not_enough_time') },
  flood: { when: $t('plays.three_receivers_to_one_side_against'), watch: $t('plays.deep_intermediate_flat_read_high_to'), beats: $t('plays.cover_3_2'), loses: $t('plays.cover_2_man_and_man_press') },
  te_seam: { when: $t('plays.hit_the_tight_end_down_the'), watch: $t('plays.the_seam_is_between_the_safeties'), beats: $t('plays.cover_2_man_and_tampa_2_2'), loses: $t('plays.cover_3_and_robber') },
  dagger: { when: $t('plays.a_deep_dig_behind_a_clear'), watch: $t('plays.the_vertical_pulls_the_safety_the'), beats: $t('plays.cover_3_and_cover_1'), loses: $t('plays.cover_4_with_four_deep') },
  three_verticals: { when: $t('plays.three_deep_against_a_single_high'), watch: $t('plays.the_safety_can_only_take_one'), beats: $t('plays.cover_3_and_cover_1'), loses: $t('plays.cover_4_prevent_and_any_blitz') },
  deep_post: { when: $t('plays.take_a_shot_at_the_middle'), watch: $t('plays.throw_it_early_to_the_post'), beats: $t('plays.cover_1_and_cover_0'), loses: $t('plays.cover_2_man_and_cover_4') },
  deep_corner: { when: $t('plays.shot_to_the_sideline_against_a'), watch: $t('plays.the_corner_route_breaks_away_from'), beats: $t('plays.cover_2_man_and_tampa_2'), loses: $t('plays.cover_4_and_prevent') },
  slot_fade: { when: $t('plays.red_zone_when_a_linebacker_or'), watch: $t('plays.back_shoulder_throw_to_the_slot'), beats: $t('plays.cover_1_and_man_press'), loses: $t('plays.cover_4_2') },
  wheel: { when: $t('plays.sneaky_deep_shot_with_the_back'), watch: $t('plays.the_back_runs_the_flat_then'), beats: $t('plays.cover_1_and_cover_2_man'), loses: $t('plays.cover_3_and_cover_4') },
  double_move: { when: $t('plays.after_hitting_several_short_routes_fake'), watch: $t('plays.needs_maximum_protection_and_a_corner'), beats: $t('plays.aggressive_corners_in_cover_2_man'), loses: $t('plays.zone_defenses_and_pressure') },
  pa_post: { when: $t('plays.after_a_successful_run_the_safety'), watch: $t('plays.run_fake_freezes_the_linebackers_the'), beats: $t('plays.run_wall_and_goal_line_stand'), loses: $t('plays.blitzes_the_fake_takes_too_long') },
  pa_boot: { when: $t('plays.run_fake_one_way_qb_rolls'), watch: $t('plays.read_the_flat_defender_throw_the'), beats: $t('plays.run_wall_and_over_pursuing_fronts'), loses: $t('plays.edge_contain_the_end_stays_home') },
  pa_shot: { when: $t('plays.your_deepest_play_action_throw_1st'), watch: $t('plays.seven_steps_and_a_fake_the'), beats: $t('plays.heavy_fronts_and_run_wall'), loses: $t('plays.any_blitz') },
  hail_mary: { when: $t('plays.end_of_a_half_or_game'), watch: $t('plays.everyone_goes_deep_your_tallest_best'), beats: $t('plays.luck_mostly'), loses: $t('plays.prevent_that_is_what_it_is') },
  cover_2_man: { when: $t('plays.your_base_call_against_a_balanced'), watch: $t('plays.corners_and_the_linebacker_trail_underneath'), beats: $t('plays.short_and_intermediate_passes_dagger_smash'), loses: $t('plays.three_verticals_and_wheel') },
  cover_3: { when: $t('plays.safe_three_deep_zone_good_on'), watch: $t('plays.four_underneath_zones_leave_the_flats'), beats: $t('plays.deep_corner_deep_post_and_double'), loses: $t('plays.y_cross_quick_slants_and_flood') },
  cover_4: { when: $t('plays.protect_against_the_deep_ball_and'), watch: $t('plays.four_deep_means_short_throws_are'), beats: $t('plays.play_action_shots_pa_post_pa'), loses: $t('plays.mesh_y_cross_quick_slants_and') },
  cover_1: { when: $t('plays.man_across_with_one_safety_deep'), watch: $t('plays.the_free_safety_must_help_on'), beats: $t('plays.the_short_game_curl_flat_stick'), loses: $t('plays.play_action_shots_slot_fade_and') },
  cover_0: { when: $t('plays.all_out_man_blitz_3rd_and'), watch: $t('plays.no_safety_one_missed_tackle_is'), beats: $t('plays.slow_developing_deep_passes'), loses: $t('plays.quick_slants_rb_screen_and_deep') },
  tampa_2: { when: $t('plays.cover_2_with_the_middle_linebacker'), watch: $t('plays.the_middle_linebacker_must_be_fast'), beats: $t('plays.te_seam_and_levels_against_a'), loses: $t('plays.stick_and_smash_on_the_outside') },
  qb_spy: { when: $t('plays.against_a_running_qb_or_when'), watch: $t('plays.one_linebacker_mirrors_the_qb_and'), beats: $t('plays.qb_draw_and_pa_boot'), loses: $t('plays.deep_passes_one_fewer_defender_in') },
  db_blitz: { when: $t('plays.surprise_pressure_from_a_corner_on'), watch: $t('plays.the_blitzing_corner_leaves_his_receiver'), beats: $t('plays.slow_seven_step_drops'), loses: $t('plays.quick_slants_and_screens') },
  zone_blitz: { when: $t('plays.blitz_a_linebacker_and_drop_a'), watch: $t('plays.the_dropping_lineman_sits_in_the'), beats: $t('plays.stick_levels_and_quick_throws_into'), loses: $t('plays.outside_runs_and_the_toss_sweep') },
  all_out: { when: $t('plays.must_have_down_everyone_comes'), watch: $t('plays.nobody_is_in_coverage_use_it'), beats: $t('plays.any_pass_that_takes_time'), loses: $t('plays.rb_screen_quick_slants_and_the') },
  edge_contain: { when: $t('plays.against_stretch_and_toss_runs_to'), watch: $t('plays.the_ends_set_the_edge_and'), beats: $t('plays.stretch_left_toss_sweep_and_pa'), loses: $t('plays.power_counter_and_qb_draw_inside') },
  goal_line: { when: $t('plays.inside_your_5_three_down_linemen'), watch: $t('plays.nothing_deep_a_play_action_pass'), beats: $t('plays.dive_power_left_and_outside_zone'), loses: $t('plays.pa_post_and_slot_fade') },
  run_wall: { when: $t('plays.short_yardage_and_obvious_run_downs'), watch: $t('plays.linebackers_fill_fast_corners_are_alone'), beats: $t('plays.inside_zone_power_and_dive'), loses: $t('plays.pa_shot_and_pa_post') },
  max_drop: { when: $t('plays.protect_a_lead_on_3rd_and'), watch: $t('plays.only_two_rushers_the_qb_has'), beats: $t('plays.three_verticals_and_dagger'), loses: $t('plays.outside_runs_toss_sweep_jet_sweep') },
  prevent: { when: $t('plays.last_plays_of_a_half_with'), watch: $t('plays.everything_underneath_is_open_tackle_in'), beats: $t('plays.hail_mary_and_deep_post'), loses: $t('plays.almost_every_short_pass') },
  man_press: { when: $t('plays.your_corners_are_physical_and_the'), watch: $t('plays.press_at_the_line_disrupts_timing'), beats: $t('plays.bubble_screen_and_quick_slants'), loses: $t('plays.double_move_slot_fade_and_mesh') },
  robber: { when: $t('plays.against_an_offense_that_keeps_hitting'), watch: $t('plays.a_safety_drops_into_the_short'), beats: $t('plays.quick_slants_levels_and_te_seam'), loses: $t('plays.deep_corner_and_outside_throws') },
  cover_2_zone: { when: $t('plays.a_sound_base_call_against_balanced'), watch: $t('plays.corners_sit_in_the_flats_safeties'), beats: $t('plays.curl_flat_bubble_screen_and_quick'), loses: $t('plays.smash_and_deep_corner_the_hole') },
  cover_6: { when: $t('plays.when_the_offense_loves_one_side'), watch: $t('plays.two_deep_defenders_on_the_left'), beats: $t('plays.deep_corner_mesh_and_slot_fade'), loses: $t('plays.three_verticals_te_seam_and_hail') },
  corner_blitz: { when: $t('plays.surprise_pressure_from_the_boundary_on'), watch: $t('plays.the_safety_has_to_rotate_over'), beats: $t('plays.pa_shot_and_y_cross_slow'), loses: $t('plays.bubble_screen_and_jet_sweep_to') },
  safety_blitz: { when: $t('plays.when_the_quarterback_holds_the_ball'), watch: $t('plays.no_deep_safety_if_the_back'), beats: $t('plays.mesh_and_y_cross_long_developing'), loses: $t('plays.slot_fade_deep_post_and_rb') },
  bear_front: { when: $t('plays.against_inside_runs_when_you_still'), watch: $t('plays.a_nose_over_the_center_and_2'), beats: $t('plays.inside_zone_dive_and_trap'), loses: $t('plays.stretch_left_outside_zone_and_the') },
  // Legendary Plays (GDD §36): beats and loses name real plays, so the coach's counter hints work for them too.
  lp_dragons_gambit: { when: $t('plays.early_downs_against_a_defense_that'), watch: $t('plays.aurodrax_rolls_right_the_left_receiver'), beats: $t('plays.bear_front_qb_spy_and_cover'), loses: $t('plays.db_blitz_corner_blitz_and_cover') },
  lp_eye_of_the_storm: { when: $t('plays.against_man_coverage_on_the_trips'), watch: $t('plays.tempestras_slant_fake_the_defender_on'), beats: $t('plays.all_out_pressure_run_wall_and'), loses: $t('plays.bear_front_goal_line_stand_and') },
  lp_fault_line: { when: $t('plays.short_yardage_and_the_goal_line'), watch: $t('plays.the_false_step_right_then_the'), beats: $t('plays.bear_front_all_out_pressure_and'), loses: $t('plays.run_wall_safety_blitz_and_goal') },
  lp_phantom_coverage: { when: $t('plays.when_the_quarterback_keeps_throwing_the'), watch: $t('plays.nyxshade_shows_press_then_drops_to'), beats: $t('plays.quick_slants_levels_mesh_and_the'), loses: $t('plays.play_action_pa_boot_pa_post') },
  lp_rootbound: { when: $t('plays.against_a_run_first_offense_that'), watch: $t('plays.the_whole_front_stays_inside_elderoots'), beats: $t('plays.toss_sweep_qb_draw_inside_zone'), loses: $t('plays.outside_runs_stretch_left_jet_sweep') },
  double_a_mug: { when: $t('plays.third_and_medium_when_the_offense'), watch: $t('plays.two_rushers_show_in_the_a'), beats: $t('plays.qb_draw_stick_and_levels_the'), loses: $t('plays.bubble_screen_and_quick_throws_outside') },
  bracket_left: { when: $t('plays.take_away_their_best_receiver_when'), watch: $t('plays.a_corner_underneath_and_inside_a'), beats: $t('plays.the_left_receiver_deep_and_over'), loses: $t('plays.the_back_on_a_wheel_rb') },
  goal_line_man: { when: $t('plays.inside_your_5_against_passing_teams'), watch: $t('plays.four_defenders_locked_in_man_with'), beats: $t('plays.slot_fade_pa_post_and_dive'), loses: $t('plays.mesh_and_power_nobody_comes_free') },
  fire_zone: { when: $t('plays.pressure_with_three_deep_behind_it'), watch: $t('plays.five_rushers_three_deep_three_under'), beats: $t('plays.y_cross_pa_shot_and_slow'), loses: $t('plays.curl_flat_and_rb_screen') },
  ...RESERVE.lessons,
});

/**
 * Coaching hints: which of `candidates` counter the scouted `opponentIds`,
 * judged from the lessons (a play that names a scouted call under "beats"
 * scores +1, under "loses to" −1). Returns ids with a positive score, best first.
 */
export function counterPlays(candidates, opponentIds) {
  const names = opponentIds.map((id) => PLAYS[id]?.name).filter(Boolean);
  const mentions = (text) => names.filter((n) => text.includes(n)).length;
  return candidates.map((id) => { const L = LESSONS[id]; return L ? { id, score: mentions(L.beats) - mentions(L.loses), beats: names.filter((n) => L.beats.includes(n)) } : { id, score: 0, beats: [] }; })
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
}
