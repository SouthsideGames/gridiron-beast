// The single source of truth for every play: cards, field art, audit tool,
// coaching AI and the simulation all read these definitions.
//
// Coordinates are play-relative yards: x upfield from the line of scrimmage
// (offense attacks +x), y lateral (negative = offense's left).

import { OFFENSE_PACKAGES, DEFENSE_PACKAGES, offenseOnField, defenseOnField, LINEMEN, BASE_LINEMEN } from './personnel.js';
import { routePoints, ALTERNATE_ROUTES, ZONES, GAPS } from './routes.js';
import { reservePlays } from './playbook-reserve.js';

// ---------------------------------------------------------------- formations
const OL = { LG: [-0.6, -1.7], RG: [-0.6, 1.7] };
const OL3 = { ...OL, C: [-0.4, 0] }; // tight sets bring the third lineman
export const OFFENSE_FORMATIONS = Object.freeze({
  i_pro: { pkg: 'pro', label: 'I-Form', align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro: { pkg: 'pro', label: 'Gun Pro', align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro_lt: { pkg: 'pro', label: 'Gun Pro Left', align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_spread: { pkg: 'spread', label: 'Spread', align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR1: [-0.6, -18], WR2: [-1.2, 18], WR3: [-1.2, 10] } },
  gun_trips: { pkg: 'spread', label: 'Trips Left', align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], WR1: [-0.6, -19], WR3: [-1.2, -12], WR2: [-1.2, 18] } },
  tight_i: { pkg: 'tight', label: 'Tight I', align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.2], WR1: [-0.6, -18] } },
  tight_gun: { pkg: 'tight', label: 'Tight Gun', align: { ...OL3, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.2], WR1: [-1.2, -18] } },
  tight_wing: { pkg: 'tight', label: 'Wing', align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-1.4, 4.2], WR1: [-0.6, -18] } },
  // ---- playbook expansion: used by reserve plays only, until the owner releases them
  pistol_pro: { pkg: 'pro', label: 'Pistol', reserve: true, align: { ...OL, QB: [-3.5, 0], RB: [-6.2, 0], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  ace_twins: { pkg: 'pro', label: 'Ace Twins Left', reserve: true, align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.4], WR1: [-0.6, -19], WR2: [-1.2, -11] } },
  gun_twins_rt: { pkg: 'pro', label: 'Gun Twins Right', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, -3.4], WR1: [-1.2, 11], WR2: [-0.6, 19] } },
  gun_wing: { pkg: 'pro', label: 'Gun Wing', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-1.4, 4.2], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  pro_bunch: { pkg: 'pro', label: 'Bunch Right', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 5.2], WR1: [-1.8, 3.6], WR2: [-1.8, 6.8] } },
  pro_trips: { pkg: 'pro', label: 'Trips Right', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.4], WR1: [-1.2, 10], WR2: [-0.6, 18] } },
  pro_empty: { pkg: 'pro', label: 'Empty', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-1.2, -10], TE: [-0.6, 3.4], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  spread_trips_rt: { pkg: 'spread', label: 'Trips Right', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR3: [-1.2, 7], WR2: [-1.2, 13], WR1: [-0.6, 19] } },
  spread_bunch: { pkg: 'spread', label: 'Spread Bunch', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR1: [-0.6, -18], WR3: [-0.6, 9], WR2: [-1.8, 10.8] } },
  trips_bunch: { pkg: 'spread', label: 'Trips Bunch', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR3: [-0.6, 9], WR1: [-1.8, 7.2], WR2: [-1.8, 10.8] } },
  empty_2x2: { pkg: 'spread', label: 'Empty 2x2', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-1.2, 10], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-0.6, 18] } },
  empty_trips: { pkg: 'spread', label: 'Empty Trips', reserve: true, align: { ...OL, QB: [-5, 0], WR1: [-0.6, -18], WR3: [-1.2, 6], RB: [-1.2, 11], WR2: [-0.6, 18] } },
  pistol_twins: { pkg: 'spread', label: 'Pistol Twins', reserve: true, align: { ...OL, QB: [-3.5, 0], RB: [-6.2, 0], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-0.6, 18] } },
  spread_left: { pkg: 'spread', label: 'Spread Left', reserve: true, align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], WR1: [-0.6, -18], WR3: [-1.2, -10], WR2: [-1.2, 18] } },
  tight_i_lt: { pkg: 'tight', label: 'Tight I Left', reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, -3.2], WR1: [-0.6, 18] } },
  tight_pistol: { pkg: 'tight', label: 'Tight Pistol', reserve: true, align: { ...OL3, QB: [-3.5, 0], RB: [-6.2, 0], TE: [-0.6, 3.2], WR1: [-0.6, -18] } },
  tight_twins: { pkg: 'tight', label: 'Tight Twins', reserve: true, align: { ...OL3, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.2], WR1: [-1.2, 11] } },
  tight_flex: { pkg: 'tight', label: 'Tight Flex', reserve: true, align: { ...OL3, QB: [-5, 0], RB: [-5.2, 2.8], TE: [-1.2, 8], WR1: [-0.6, -18] } },
  goal_jumbo: { pkg: 'tight', label: 'Jumbo', reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.2], WR1: [-0.6, -7] } },
  tight_wing_lt: { pkg: 'tight', label: 'Wing Left', reserve: true, align: { ...OL3, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-1.4, -4.2], WR1: [-0.6, 18] } },
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
  offense('inside_zone', 'Inside Zone', 'gun_pro', {
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-2, 0.5], [2, -1], [8, -1.5], [20, -2]]),
    LG: RUNBLOCK([2, -2]), C: RUNBLOCK([2, -0.5]), RG: RUNBLOCK([2, 1.5]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short'], desc: 'Zone blocking; the back reads the first lineman and cuts.' }),
  offense('power_right', 'Power Right', 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, 1.5], [1, 3], [6, 3.5], [20, 4]]),
    LG: PULL([-2, 0.5], [1.5, 3.5]), C: RUNBLOCK([1.5, -0.5]), RG: RUNBLOCK([1.5, 2]), TE: RUNBLOCK([1.5, 4.5]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Guard pulls to lead through the right B-gap.' }),
  offense('power_left', 'Power Left', 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-3, -1.5], [1, -3], [6, -3.5], [20, -4]]),
    RG: PULL([-2, -0.5], [1.5, -3.5]), C: RUNBLOCK([1.5, 0.5]), LG: RUNBLOCK([1.5, -2]), TE: RUNBLOCK([2, 3]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Guard pulls left; tight end seals the back side.' }),
  offense('dive', 'HB Dive', 'i_pro', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-2, 0.6], [2, 0.8], [20, 1]]),
    LG: RUNBLOCK([1.5, -1.6]), C: RUNBLOCK([1.5, 0]), RG: RUNBLOCK([1.5, 1.6]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'goalline'], desc: 'Straight ahead behind the center. Short yardage.' }),
  offense('outside_zone', 'Outside Zone', 'gun_pro_lt', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-3, 2], [0, 6], [5, 9], [22, 11]]),
    LG: RUNBLOCK([2, 0]), C: RUNBLOCK([2, 2.5]), RG: RUNBLOCK([2.5, 5]), WR2: STALK([3, 14]), WR1: STALK([4, -14]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Everyone reaches right; the back bends it outside or cuts back.' }),
  offense('stretch_left', 'Stretch Left', 'tight_gun', {
    QB: HANDOFF, RB: CARRY([[-5.2, -2.8], [-3, -5], [0, -8], [5, -10], [22, -12]]),
    RG: RUNBLOCK([2, 0]), C: RUNBLOCK([2, -2.5]), LG: RUNBLOCK([2.5, -5]), TE: RUNBLOCK([2, 2]), WR1: STALK([3, -15]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Wide zone to the left behind a stalk-blocking receiver.' }),
  offense('counter', 'Counter', 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-5.9, 0.9], [-3.9, -1], [0, -3], [6, -3.8], [20, -4]]),
    RG: PULL([-2, 0], [1.5, -3.8]), TE: PULL([-2.5, 1.5], [3, -5]), C: RUNBLOCK([1.5, 0.5]), LG: RUNBLOCK([1.5, -2]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: 'False step right, then the guard and tight end pull left.' }),
  offense('toss_sweep', 'Toss Sweep', 'i_pro', {
    QB: { a: 'pitch', path: [[-1.6, 0], [-3, 1.5]] }, RB: CARRY([[-6.5, 0], [-5.5, 6], [-2, 11], [4, 14], [22, 15]]),
    RG: PULL([-2, 3], [2, 9]), C: RUNBLOCK([1.5, 1.5]), LG: RUNBLOCK([1.5, -1.5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'outside'], desc: 'Pitch to the back; the guard leads around the right edge.' }),
  offense('trap', 'Trap', 'gun_pro', {
    QB: HANDOFF, RB: CARRY([[-5.2, 2.8], [-2, 1], [2, -1.5], [20, -2]]),
    RG: PULL([-1.5, 0], [1, -2.2]), C: RUNBLOCK([1.5, 1]), LG: RUNBLOCK([3, -3]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'inside', 'misdirection'], desc: 'Let the tackle through, then trap him with the pulling guard.' }),
  offense('qb_draw', 'QB Draw', 'gun_pro', {
    QB: KEEP([[-5, 0], [-6, 0], [-2, 0.5], [3, 0], [20, 0]]), RB: RUNBLOCK([0, 3.5]),
    LG: RUNBLOCK([-1.5, -2]), C: RUNBLOCK([-1, 0.5]), RG: RUNBLOCK([-1.5, 2.5]), WR1: R('go'), WR2: R('go'),
  }, { type: 'run', tags: ['run', 'inside', 'long', 'draw'], desc: 'Fake the drop, then the quarterback keeps up the middle; the back blocks.' }),
  offense('read_option', 'Read Option', 'gun_pro_lt', {
    QB: { a: 'option', path: [[-5, 0], [-4, 2], [0, 5], [6, 9], [20, 11]] }, RB: CARRY([[-5.2, -2.8], [-3, 0], [1, -2], [8, -3], [20, -3]]),
    LG: RUNBLOCK([2, -2]), C: RUNBLOCK([2, 0]), RG: RUNBLOCK([2, 2]), WR1: STALK([4, -16]), WR2: STALK([4, 16]),
  }, { type: 'run', tags: ['run', 'option'], desc: 'The quarterback reads the unblocked edge: give inside or keep outside.' }),
  offense('jet_sweep', 'Jet Sweep', 'gun_trips', {
    QB: HANDOFF, WR3: CARRY([[-1.6, -4.5], [-2, -1], [-1, 6], [3, 13], [20, 16]]),
    LG: RUNBLOCK([1.5, -1]), C: RUNBLOCK([1.5, 2]), RG: RUNBLOCK([2, 5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]),
  }, { type: 'run', motion: { slot: 'WR3', to: [-1.6, -4.5] }, tags: ['run', 'outside', 'misdirection'], desc: 'The slot receiver takes the jet motion handoff around the right end.' }),

  // ---- quick passes
  offense('quick_slants', 'Quick Slants', 'gun_pro', {
    QB: { a: 'pass' }, WR1: R('slant'), WR2: R('slant'), RB: R('flat'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'quick', tags: ['pass', 'quick', 'short', 'two_minute'], desc: 'Two slants with the back to the flat.' }),
  offense('stick', 'Stick', 'tight_gun', {
    QB: { a: 'pass' }, TE: R('stick'), RB: R('swing'), WR1: R('hitch'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'RB', 'WR1'], drop: 'quick', tags: ['pass', 'quick', 'short'], desc: 'Tight end sits in the hole; swing and hitch stretch the flat.' }),
  offense('curl_flat', 'Curl Flat', 'gun_pro', {
    QB: { a: 'pass' }, WR2: R('curl'), RB: R('flat'), WR1: R('comeback'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR2', progression: ['WR2', 'RB', 'WR1'], drop: 'three', tags: ['pass', 'short', 'zone_beater'], desc: 'High-low on the flat defender.' }),
  offense('bubble_screen', 'Bubble Screen', 'gun_trips', {
    QB: { a: 'pass' }, WR3: R('bubble'), WR1: STALK([2, -19]), WR2: R('go'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2'], drop: 'quick', tags: ['pass', 'screen', 'quick', 'short'], desc: 'Catch and run behind the outside receiver\'s block.' }),
  offense('rb_screen', 'RB Screen', 'gun_pro', {
    QB: { a: 'pass', hold: 1.6 }, RB: R('screen'), WR1: R('go'), WR2: R('go'),
    LG: RELEASE([2, 6]), C: RELEASE([1, 9]), RG: BLOCK,
  }, { primary: 'RB', progression: ['RB'], drop: 'five', tags: ['pass', 'screen', 'long', 'blitz_beater'], desc: 'Let the rush in, then dump it to the back behind two releasing linemen.' }),

  // ---- intermediate
  offense('smash', 'Smash', 'gun_spread', {
    QB: { a: 'pass' }, WR2: R('hitch'), WR3: R('corner'), WR1: R('dig'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: 'Corner over hitch stresses the deep-half safety.' }),
  offense('mesh', 'Mesh', 'gun_trips', {
    QB: { a: 'pass' }, WR3: R('shallow'), WR2: R('drag'), WR1: R('corner'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'man_beater'], desc: 'Two crossers rub underneath; the corner route clears the top.' }),
  offense('levels', 'Levels', 'gun_spread', {
    QB: { a: 'pass' }, WR1: R('dig'), WR3: R('slant'), WR2: R('post'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: 'In-breaking routes at three depths.' }),
  offense('y_cross', 'Y Cross', 'tight_gun', {
    QB: { a: 'pass' }, TE: R('drag'), WR1: R('post'), RB: R('angle'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'medium'], desc: 'Tight end crosses the field under a deep post.' }),
  offense('flood', 'Flood', 'tight_gun', {
    QB: { a: 'pass' }, WR1: R('go'), TE: R('out'), RB: R('flat'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'RB', 'WR1'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: 'Three levels to one sideline.' }),
  offense('te_seam', 'TE Seam', 'tight_gun', {
    QB: { a: 'pass' }, TE: R('seam'), WR1: R('curl'), RB: R('swing'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'medium', 'deep'], desc: 'The tight end splits the safeties up the seam.' }),
  offense('dagger', 'Dagger', 'gun_spread', {
    QB: { a: 'pass' }, WR3: R('seam'), WR1: R('dig'), WR2: R('drag'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'medium', 'zone_beater'], desc: 'Seam clears the hook zone for the deep dig.' }),

  // ---- deep
  offense('three_verticals', 'Three Verticals', 'gun_spread', {
    QB: { a: 'pass' }, WR1: R('go'), WR3: R('seam'), WR2: R('fade'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: 'Stretch the deep coverage with three vertical stems.' }),
  offense('deep_post', 'Deep Post', 'gun_pro', {
    QB: { a: 'pass' }, WR1: R('post'), WR2: R('comeback'), RB: R('flat'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: 'Shot play: post over the top with a comeback safety valve.' }),
  offense('deep_corner', 'Deep Corner', 'gun_pro', {
    QB: { a: 'pass' }, WR2: R('corner'), WR1: R('skinny_post'), RB: R('swing'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR2', progression: ['WR2', 'WR1', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long', 'redzone'], desc: 'Corner route to the pylon with a skinny post behind it.' }),
  offense('slot_fade', 'Slot Fade', 'gun_spread', {
    QB: { a: 'pass' }, WR3: R('fade'), WR2: R('out'), WR1: R('drag'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR2', 'WR1'], drop: 'five', tags: ['pass', 'deep', 'redzone', 'man_beater'], desc: 'Slot receiver fades to the sideline against man coverage.' }),
  offense('wheel', 'Wheel', 'gun_pro_lt', {
    QB: { a: 'pass' }, RB: R('wheel'), WR1: R('slant'), WR2: R('post'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'RB', progression: ['RB', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'man_beater'], desc: 'The back wheels up the sideline behind the slant.' }),
  offense('double_move', 'Double Move', 'gun_pro', {
    QB: { a: 'pass', hold: 1.2 }, WR1: R('double_move'), WR2: R('curl'), RB: R('flat'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR2', 'RB'], drop: 'five', tags: ['pass', 'deep', 'long'], desc: 'Hitch-and-go. Needs time to develop.' }),

  // ---- play action
  offense('pa_post', 'PA Post', 'tight_i', {
    QB: PA([[-1.6, 0], [-4, 0], [-6, 1]]), RB: FAKE, WR1: R('post'), TE: R('corner'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'TE'], drop: 'pa', tags: ['pass', 'deep', 'play_action'], desc: 'Fake the dive, then throw the post over the safety.' }),
  offense('pa_boot', 'PA Boot', 'tight_wing', {
    QB: BOOT([[-1.6, 0], [-4, 1], [-5, 6], [-3, 11]]), RB: FAKE, TE: R('flat'), WR1: R('drag'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1'], drop: 'pa', tags: ['pass', 'medium', 'play_action', 'boot'], desc: 'Fake left, roll right; tight end to the flat, receiver crossing deep.' }),
  offense('pa_shot', 'PA Shot', 'tight_i', {
    QB: PA([[-1.6, 0], [-4, 0], [-7, 0]]), RB: FAKE, WR1: R('go'), TE: R('seam'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'TE', progression: ['TE', 'WR1'], drop: 'pa', tags: ['pass', 'deep', 'play_action', 'long'], desc: 'Max protection, two vertical routes.' }),
  offense('hail_mary', 'Hail Mary', 'gun_spread', {
    QB: { a: 'pass', hold: 2.2 }, WR1: R('go'), WR2: R('go'), WR3: R('post'), LG: BLOCK, C: BLOCK, RG: BLOCK,
  }, { primary: 'WR3', progression: ['WR3', 'WR1', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'desperation'], desc: 'Everyone to the end zone.' }),
];

// ------------------------------------------------------------- defense plays
const DEFENSE_PLAYS = [
  defense('cover_2_man', 'Cover 2 Man', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside', 'under'), CB1: MAN('wideL', 'under'), CB2: MAN('wideR', 'under'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'man', 'balanced'], desc: 'Two deep halves; everyone underneath locked in man.' }),
  defense('cover_3', 'Cover 3', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('flat_R'),
  }, { align: { SS: [5, 10] }, tags: ['pass', 'zone', 'balanced'], desc: 'Three deep thirds, strong safety drops to the flat.' }),
  defense('cover_4', 'Cover 4', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R'),
  }, { tags: ['pass', 'zone', 'deep', 'prevent_light'], desc: 'Four deep quarters. Gives up the short stuff.' }),
  defense('cover_1', 'Cover 1', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['pass', 'man'], desc: 'Man across, every receiver and the back are covered, with one deep safety.' }),
  defense('cover_0', 'Cover 0', 'pressure', {
    DL1: RUSH('B_L'), DL3: RUSH('A_R'), DL2: RUSH('edge_R'), LB1: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { FS: [6, 0] }, tags: ['blitz', 'man', 'risky', 'short'], desc: 'No deep help. Four rush, three in man.' }),
  defense('tampa_2', 'Tampa 2', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('deep_middle'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'zone'], desc: 'Two deep with the linebacker carrying the deep middle.' }),
  defense('qb_spy', 'QB Spy', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: SPY, LB2: ZONE('hook_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['pass', 'man', 'anti_scramble'], desc: 'A linebacker mirrors the quarterback.' }),
  defense('db_blitz', 'DB Blitz', 'base', {
    DL1: RUSH('A_L'), DL2: RUSH('A_R'), CB1: RUSH('edge_L'), CB2: RUSH('edge_R'), LB1: MAN('wideL'), LB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { LB1: [5, -10], LB2: [5, 10], FS: [7, 0] }, tags: ['blitz', 'man', 'risky'], desc: 'Both corners come off the edge; linebackers and safety cover.' }),
  defense('zone_blitz', 'Zone Blitz', 'base', {
    DL1: ZONE('hook_L'), DL2: RUSH('B_R'), LB1: RUSH('A_L'), LB2: RUSH('B_L'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'),
  }, { tags: ['blitz', 'zone'], desc: 'Two linebackers come; a lineman drops into the hook.' }),
  defense('all_out', 'All-Out Pressure', 'pressure', {
    DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), LB1: RUSH('A_R'), CB1: RUSH('edge_L'), CB2: RUSH('edge_R'), FS: RUSH('A_R'),
  }, { align: { FS: [5, 0] }, tags: ['blitz', 'risky', 'desperation'], desc: 'Everybody goes. Nobody covers.' }),
  defense('edge_contain', 'Edge Contain', 'pressure', {
    DL1: CONTAIN('contain_L'), DL2: CONTAIN('contain_R'), DL3: RUSH('A_L'), LB1: ZONE('hook_M'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['run', 'anti_outside', 'anti_scramble'], desc: 'Ends stay wide to turn everything back inside.' }),
  defense('goal_line', 'Goal Line Stand', 'heavy', {
    DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: RUSH('B_L'), LB2: ZONE('short_R'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { LB1: [2.5, -3], LB2: [2.5, 3] }, tags: ['run', 'goalline', 'short'], desc: 'Everybody in the box; corners alone outside.' }),
  defense('run_wall', 'Run Wall', 'heavy', {
    DL1: RUSH('B_L'), DL3: RUSH('A_L'), DL2: RUSH('B_R'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), CB1: ZONE('curl_L'), CB2: ZONE('curl_R'),
  }, { tags: ['run', 'short'], desc: 'Three down linemen, linebackers fill the gaps.' }),
  defense('max_drop', 'Max Drop', 'nickel', {
    DL1: ZONE('hook_M'), DL2: RUSH('A_R'), LB1: ZONE('hook_L'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('hook_R'),
  }, { align: { SS: [6, 6] }, tags: ['pass', 'zone', 'long'], desc: 'One rusher, six in coverage.' }),
  defense('prevent', 'Prevent', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_center'), SS: ZONE('deep_quarter_R'),
  }, { align: { FS: [18, -4], SS: [16, 8] }, tags: ['pass', 'deep', 'prevent'], desc: 'Keep everything in front. Late-game lead.' }),
  defense('man_press', 'Man Press', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { align: { CB1: [1.5, -17], CB2: [1.5, 17] }, tags: ['pass', 'man', 'press'], desc: 'Corners jam at the line; one deep safety.' }),
  defense('robber', 'Robber', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'), SS: ZONE('robber'),
  }, { tags: ['pass', 'man', 'trap'], desc: 'Man under with a safety lurking in the middle for the in-breaker.' }),
  defense('fire_zone', 'Fire Zone', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), SS: RUSH('edge_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'),
  }, { align: { SS: [4, 7] }, tags: ['blitz', 'zone'], desc: 'Safety blitz off the edge with three deep behind it.' }),
  defense('cover_2_zone', 'Cover 2 Zone', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('flat_L'), CB2: ZONE('flat_R'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'zone', 'balanced'], desc: 'Two deep halves, corners squat in the flats, linebacker in the hook.' }),
  defense('cover_6', 'Cover 6', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_half_R'), CB2: ZONE('flat_R'),
  }, { align: { SS: [12, 8] }, tags: ['pass', 'zone'], desc: 'Quarters to the left, Cover 2 to the right. Takes away one side deep.' }),
  defense('corner_blitz', 'Corner Blitz', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), CB1: RUSH('edge_L'), LB1: ZONE('hook_M'), SS: ZONE('deep_third_L'), FS: ZONE('deep_third_M'), CB2: ZONE('deep_third_R'),
  }, { align: { CB1: [2, -12], SS: [10, -10] }, tags: ['blitz', 'zone'], desc: 'The left corner comes off the edge; the safety rotates over the top.' }),
  defense('safety_blitz', 'Safety Blitz', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), FS: RUSH('A_L'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { FS: [7, -2] }, tags: ['blitz', 'man', 'risky', 'short'], desc: 'The free safety comes from depth; man across with no deep help.' }),
  defense('bear_front', 'Bear Front', 'heavy', {
    DL1: RUSH('B_L'), DL3: RUSH('A_M'), DL2: RUSH('B_R'), LB1: ZONE('short_L'), LB2: ZONE('short_R'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { DL1: [1, -2.6], DL3: [1, 0], DL2: [1, 2.6], LB1: [3.5, -3], LB2: [3.5, 3] }, tags: ['run', 'balanced'], desc: 'A nose over the centre and a lineman in each B gap; corners alone in man.' }),
  defense('double_a_mug', 'Double A Mug', 'pressure', {
    DL1: RUSH('edge_L'), DL2: RUSH('edge_R'), DL3: RUSH('A_L'), LB1: RUSH('A_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside'),
  }, { align: { DL3: [1, -0.9], LB1: [1.2, 0.9], FS: [7, 0] }, tags: ['blitz', 'man', 'risky', 'interior'], desc: 'Two rushers mugged up in the A gaps, ends wide. Overloads the middle.' }),
  defense('bracket_left', 'Bracket Left', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL', 'under'), SS: BRACKET('wideL', 'deep_quarter_LL'), CB2: MAN('wideR'), FS: ZONE('deep_half_R'),
  }, { align: { SS: [11, -14] }, tags: ['pass', 'man', 'bracket'], desc: 'The left receiver gets a corner underneath and a safety over the top.' }),
  defense('goal_line_man', 'Goal Line Man', 'heavy', {
    DL1: RUSH('A_L'), DL3: RUSH('A_R'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: MAN('back'), CB1: MAN('wideL'), CB2: MAN('wideR'),
  }, { align: { LB1: [2.5, -2], LB2: [2.5, 2] }, tags: ['goalline', 'man', 'short'], desc: 'Three in the gaps, everyone else locked on a receiver. No safety.' }),
];

// ------------------------------------------------------------- compilation
function compile(play) {
  const onField = play.side === 'offense' ? offenseOnField(play.pkg) : defenseOnField(play.pkg);
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
const RESERVE = reservePlays({ offense: (id, name, formation, asg, opts = {}) => offense(id, name, formation, asg, { ...opts, reserve: true }), defense: (id, name, formation, asg, opts = {}) => defense(id, name, formation, asg, { ...opts, reserve: true }), R, BLOCK, RUNBLOCK, STALK, PULL, RELEASE, CARRY, HANDOFF, FAKE, KEEP, PA, BOOT, RUSH, MAN, ZONE, SPY, CONTAIN, BRACKET });
// Legendary Plays (GDD §36): built on the same assignments as every play, each tied to one Legendary monster who must be on
// the field in its slot. Like reserve plays they live in PLAYS (engine, art, audit) and never in OFFENSE_IDS / DEFENSE_IDS:
// a club can call one only when it holds that Legendary and has put the play in one of its six slots.
const LEGEND = (species, slot) => ({ legendary: { species, slot } });
const LEGENDARY_OFFENSE = [
  offense('lp_dragons_gambit', "Dragon's Gambit", 'gun_pro', {
    QB: BOOT([[-5, 0], [-6, 1.5], [-6.5, 5], [-5, 9]]), RB: FAKE, WR1: R('over'), TE: R('corner'), WR2: R('comeback'), LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'TE', 'WR2'], drop: 'pa', tags: ['pass', 'deep', 'play_action', 'boot', 'legendary'], ...LEGEND('aurodrax', 'QB'), desc: 'Run fake, then Aurodrax rolls right while the left receiver crosses the whole field deep. Sovereign Arm: the first read cannot be intercepted.' }),
  offense('lp_eye_of_the_storm', 'Eye of the Storm', 'gun_trips', {
    QB: { a: 'pass' }, WR1: R('sluggo'), WR3: R('whip'), WR2: R('dig'), RB: BLOCK, LG: BLOCK, RG: BLOCK,
  }, { primary: 'WR1', progression: ['WR1', 'WR3', 'WR2'], drop: 'five', tags: ['pass', 'deep', 'long', 'legendary'], ...LEGEND('tempestra', 'WR1'), desc: 'Tempestra sells a slant from the trips side, her Cyclone spins the man on her hip, and she turns it up the field. A deep shot: big when it hits, five-step drop when it does not.' }),
  offense('lp_fault_line', 'Fault Line', 'tight_i', {
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-5.9, 0.9], [-4, -0.4], [0, -1.7], [6, -2.2], [20, -2.6]]),
    LG: RUNBLOCK([2.5, -2.2]), C: RUNBLOCK([1.5, 0.8]), RG: PULL([-2, 0], [1.5, -3.6]), TE: RUNBLOCK([1.5, 4.6]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'inside', 'short', 'misdirection', 'goalline', 'legendary'], ...LEGEND('titanolith', 'LG'), desc: 'False step right, then the back cuts behind Titanolith at left guard while the right guard pulls to kick out the edge. Landslide: the run falls forward.' }),
];
const LEGENDARY_DEFENSE = [
  defense('lp_phantom_coverage', 'Phantom Coverage', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: ZONE('robber'), FS: MAN('wideL'), CB2: MAN('wideR'), SS: ZONE('deep_middle'),
  }, { align: { CB1: [1.5, -17], FS: [10, -9], SS: [12, 5] }, tags: ['pass', 'man', 'trap', 'legendary'], ...LEGEND('nyxshade', 'CB1'), desc: 'Nyxshade shows press on the left receiver, then vanishes into the short middle while the free safety rotates down to take his man. Night Veil: the quarterback never sees him.' }),
  defense('lp_avalanche', 'Avalanche', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), FS: RUSH('A_L'), LB1: ZONE('hook_M'), CB1: ZONE('deep_half_L'), CB2: ZONE('deep_half_R'), SS: ZONE('flat_R'),
  }, { align: { FS: [7.2, -1.8], CB1: [7, -17], CB2: [7, 17] }, tags: ['blitz', 'zone', 'legendary'], ...LEGEND('glacivern', 'FS'), desc: 'Glacivern lines up like a robber in the middle, then comes through the A gap; the corners bail to two deep halves. Whiteout freezes the first read, so the quarterback holds the ball.' }),
  defense('lp_rootbound', 'Rootbound', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('short_M'), LB2: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('hook_M'),
  }, { align: { LB1: [4, 0], LB2: [4.5, 3], FS: [6.5, 0] }, tags: ['run', 'man', 'legendary', 'anti_misdirection'], ...LEGEND('elderoot', 'LB1'), desc: 'Everyone packs inside Elderoot\'s grove: nobody bites on a fake and every defender near him reads faster. The corners are alone outside.' }),
];
export const PLAYS = Object.freeze(Object.fromEntries([...OFFENSE_PLAYS, ...DEFENSE_PLAYS, ...RESERVE.offense, ...RESERVE.defense, ...LEGENDARY_OFFENSE, ...LEGENDARY_DEFENSE].map((p) => [p.id, compile(p)])));
export const LEGENDARY_IDS = Object.freeze([...LEGENDARY_OFFENSE, ...LEGENDARY_DEFENSE].map((p) => p.id));
export const isLegendary = (id) => !!PLAYS[id]?.legendary;
export const OFFENSE_IDS = OFFENSE_PLAYS.map((p) => p.id);
export const DEFENSE_IDS = DEFENSE_PLAYS.map((p) => p.id);
export const RESERVE_OFFENSE_IDS = RESERVE.offense.map((p) => p.id);
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
  const problems = [];
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
  inside_zone: { when: 'Your bread-and-butter run on 1st and 2nd down against light boxes.', watch: 'The back reads the first lineman: if he flows wide, cut back behind him.', beats: 'Nickel and dime looks.', loses: 'Heavy fronts and the Run Wall.' },
  power_right: { when: 'Short yardage and goal line, 3rd-and-2, 2nd-and-1.', watch: 'The pulling guard: the hole opens where he kicks out the end.', beats: 'Light boxes and Cover 0.', loses: 'Goal Line Stand with a third lineman.' },
  power_left: { when: 'Same job as Power Right; call it when the defence is overloading your right side.', watch: 'The tight end seals the back side so the back can bounce.', beats: 'Defences shaded to your right.', loses: 'Edge Contain on the left.' },
  dive: { when: 'Fast, safe yards when you need a short gain to stay on schedule.', watch: 'Hits the A-gap instantly, the back must hit it before the linebackers fill.', beats: 'Pass rushes and Cover 0 blitzes.', loses: 'Run Wall and stacked boxes.' },
  outside_zone: { when: 'Get the ball to a fast back in space on early downs.', watch: 'Whole line slides; the back either turns the corner or cuts up behind the first down block.', beats: 'Slow interior linebackers.', loses: 'Edge Contain, the defence sets the edge and strings it out.' },
  stretch_left: { when: 'Outside zone to the left, use it against defences that set the right edge.', watch: 'If the corner comes up hard, the back must cut inside early.', beats: 'Defences overplaying one side.', loses: 'Edge Contain and QB Spy fronts.' },
  counter: { when: 'After a few runs one direction: the defence flows, the ball goes the other way.', watch: 'Fake step one way, guard pulls the other. Slow to develop, needs a block.', beats: 'Aggressive linebackers who over-pursue.', loses: 'Disciplined zone defences that stay home.' },
  toss_sweep: { when: 'Your fastest back against a slow defence on 1st down.', watch: 'Pitch is live, a bad toss is a fumble. Needs the edge blocked.', beats: 'Heavy fronts stacked inside.', loses: 'Edge Contain and fast corners.' },
  trap: { when: 'Against a defence that rushes hard up the middle.', watch: 'The lineman lets the rusher through, then a puller traps him from the side.', beats: 'All-Out Pressure and Fire Zone blitzes.', loses: 'Patient, read-and-react fronts.' },
  qb_draw: { when: '3rd-and-medium when the defence expects a pass and drops seven.', watch: 'The QB shows pass, then takes off. Count the rushers first.', beats: 'Max Drop and Prevent.', loses: 'QB Spy, the spy is waiting for exactly this.' },
  read_option: { when: 'With a fast, smart QB: let the end choose wrong.', watch: 'Unblocked end crashes on the back → QB keeps. End stays home → give.', beats: 'Edge rushers who fire upfield.', loses: 'Edge Contain and QB Spy.' },
  jet_sweep: { when: 'Get your fastest receiver the ball with momentum.', watch: 'Timing of the snap with the motion, the sweep lives or dies on the corner.', beats: 'Heavy packages with slow corners.', loses: 'Man Press and Edge Contain.' },
  quick_slants: { when: 'Beat the blitz: the ball is out in a second.', watch: 'The QB throws on the receiver’s third step. Hands matter more than speed.', beats: 'Cover 0 and DB Blitz.', loses: 'Robber, a defender sits right in the slant window.' },
  stick: { when: 'Reliable 5-7 yards on 2nd-and-medium.', watch: 'Inside receiver settles at the sticks; QB reads the flat defender.', beats: 'Cover 3 and soft zones.', loses: 'Tampa 2 with a deep middle linebacker.' },
  curl_flat: { when: 'A steady chain-mover against zone.', watch: 'Curl and flat stretch one defender: throw whichever he doesn’t take.', beats: 'Cover 3.', loses: 'Cover 2 Man, the man defender runs with the curl.' },
  bubble_screen: { when: 'Get the ball to a receiver in space when the corners are playing deep.', watch: 'The blocker must reach the corner; if the corner is pressed, throw it away.', beats: 'Cover 4 and Prevent.', loses: 'Man Press.' },
  rb_screen: { when: 'Against an aggressive pass rush, especially on 2nd-and-long.', watch: 'Let the rushers in, then dump it to the back behind them with blockers out front.', beats: 'All-Out Pressure and Cover 0.', loses: 'QB Spy and Max Drop.' },
  smash: { when: 'A classic Cover 2 beater on the sideline.', watch: 'Corner route over the top, hitch underneath, the cornerback can’t cover both.', beats: 'Cover 2 Man and Tampa 2.', loses: 'Cover 4, the safety takes the corner route.' },
  mesh: { when: 'Beat man coverage with two crossers that rub defenders off.', watch: 'The crossers pass within a yard of each other; whoever comes free gets the ball.', beats: 'Cover 1 and Man Press.', loses: 'Zone defences, the crossers run into zones.' },
  levels: { when: 'Attack the middle at two depths against zone.', watch: 'Read the linebacker: if he sinks, throw the shallow in; if he squats, throw behind him.', beats: 'Cover 3 and Tampa 2.', loses: 'Robber in the middle.' },
  y_cross: { when: 'Your tight end or slot against a slow linebacker.', watch: 'The deep crosser takes time; protect first, then throw it on the move.', beats: 'Cover 1 and Cover 3.', loses: 'Fire Zone pressure, not enough time.' },
  flood: { when: 'Three receivers to one side against a zone, someone comes open.', watch: 'Deep, intermediate, flat: read high to low.', beats: 'Cover 3.', loses: 'Cover 2 Man and Man Press.' },
  te_seam: { when: 'Hit the tight end down the middle against two-deep safeties.', watch: 'The seam is between the safeties. Throw it before the safety closes.', beats: 'Cover 2 Man and Tampa 2 (weak middle).', loses: 'Cover 3 and Robber.' },
  dagger: { when: 'A deep dig behind a clear-out vertical, big yards on 2nd-and-long.', watch: 'The vertical pulls the safety; the dig comes open underneath him.', beats: 'Cover 3 and Cover 1.', loses: 'Cover 4 with four deep.' },
  three_verticals: { when: 'Three deep against a single-high safety.', watch: 'The safety can only take one. Needs time, not against a blitz.', beats: 'Cover 3 and Cover 1.', loses: 'Cover 4, Prevent and any blitz.' },
  deep_post: { when: 'Take a shot at the middle of the field when you spot a single safety.', watch: 'Throw it early to the post, over the safety.', beats: 'Cover 1 and Cover 0.', loses: 'Cover 2 Man and Cover 4.' },
  deep_corner: { when: 'Shot to the sideline against a two-deep look.', watch: 'The corner route breaks away from the safety; the outside receiver needs speed.', beats: 'Cover 2 Man and Tampa 2.', loses: 'Cover 4 and Prevent.' },
  slot_fade: { when: 'Red zone, when a linebacker or safety is on your slot receiver.', watch: 'Back-shoulder throw to the slot up the seam; hands beat speed here.', beats: 'Cover 1 and Man Press.', loses: 'Cover 4.' },
  wheel: { when: 'Sneaky deep shot with the back when linebackers are in man coverage.', watch: 'The back runs the flat, then turns upfield, the linebacker is beaten if he hesitates.', beats: 'Cover 1 and Cover 2 Man.', loses: 'Cover 3 and Cover 4.' },
  double_move: { when: 'After hitting several short routes: fake the hitch, go deep.', watch: 'Needs maximum protection and a corner who bites.', beats: 'Aggressive corners in Cover 2 Man and Man Press.', loses: 'Zone defences and pressure.' },
  pa_post: { when: 'After a successful run, the safety bites on the fake.', watch: 'Run fake freezes the linebackers; the post opens behind them.', beats: 'Run Wall and Goal Line Stand.', loses: 'Blitzes, the fake takes too long.' },
  pa_boot: { when: 'Run fake one way, QB rolls the other with two options.', watch: 'Read the flat defender: throw the deep crosser or the flat.', beats: 'Run Wall and over-pursuing fronts.', loses: 'Edge Contain, the end stays home on the QB.' },
  pa_shot: { when: 'Your deepest play-action throw. 1st down after a big run.', watch: 'Seven steps and a fake, the line must hold up. Only against run-heavy looks.', beats: 'Heavy fronts and Run Wall.', loses: 'Any blitz.' },
  hail_mary: { when: 'End of a half or game, from beyond field-goal range.', watch: 'Everyone goes deep; your tallest, best-handed receiver jumps for it.', beats: 'Luck, mostly.', loses: 'Prevent, that is what it is for.' },
  cover_2_man: { when: 'Your base call against a balanced passing offence.', watch: 'Corners and the linebacker trail underneath their men, two safeties over the top. Verticals that split the safeties are the soft spot.', beats: 'Short and intermediate passes: Dagger, Smash, Y Cross and TE Seam.', loses: 'Three Verticals and Wheel.' },
  cover_3: { when: 'Safe three-deep zone; good on 2nd-and-long and vs deep shots.', watch: 'Four underneath zones leave the flats and the short middle soft.', beats: 'Deep Corner, Deep Post and Double Move.', loses: 'Y Cross, Quick Slants and Flood.' },
  cover_4: { when: 'Protect against the deep ball and still fit the run with the safeties.', watch: 'Four deep means short throws are open, tackle well.', beats: 'Play-action shots (PA Post, PA Shot), Flood and Levels.', loses: 'Mesh, Y Cross, Quick Slants and the run.' },
  cover_1: { when: 'Man across with one safety deep, your aggressive base call.', watch: 'The free safety must help on the deepest route; everyone else is on their own.', beats: 'The short game: Curl Flat, Stick, Levels and Quick Slants.', loses: 'Play-action shots, Slot Fade and Wheel.' },
  cover_0: { when: 'All-out man blitz. 3rd-and-long when you must get the QB.', watch: 'No safety. One missed tackle is a touchdown.', beats: 'Slow-developing deep passes.', loses: 'Quick Slants, RB Screen and Deep Post.' },
  tampa_2: { when: 'Cover 2 with the middle linebacker running deep, hides the seam.', watch: 'The middle linebacker must be fast and smart.', beats: 'TE Seam and Levels against a normal Cover 2.', loses: 'Stick and Smash on the outside.' },
  qb_spy: { when: 'Against a running QB or when you fear the draw.', watch: 'One linebacker mirrors the QB and nothing else.', beats: 'QB Draw, Read Option and PA Boot.', loses: 'Deep passes, one fewer defender in coverage.' },
  db_blitz: { when: 'Surprise pressure from a corner on 3rd down.', watch: 'The blitzing corner leaves his receiver, the ball must come out before it matters.', beats: 'Slow seven-step drops.', loses: 'Quick Slants and screens.' },
  zone_blitz: { when: 'Blitz a linebacker and drop a lineman, confuse the protection.', watch: 'The dropping lineman sits in the short middle.', beats: 'Stick, Levels and quick throws into the middle.', loses: 'Outside runs and the Toss Sweep.' },
  all_out: { when: 'Must-have down: everyone comes.', watch: 'Nobody is in coverage. Use it once or twice a game, not more.', beats: 'Any pass that takes time.', loses: 'RB Screen, Trap and Quick Slants.' },
  edge_contain: { when: 'Against outside zone, toss and a mobile QB.', watch: 'The ends set the edge and keep everything inside.', beats: 'Outside Zone, Toss Sweep, Read Option and PA Boot.', loses: 'Inside runs and the quick passing game.' },
  goal_line: { when: 'Inside your 5. Three down linemen, everyone close.', watch: 'Nothing deep, a play-action pass over the top is the risk.', beats: 'Power and Dive.', loses: 'PA Post and Slot Fade.' },
  run_wall: { when: 'Short yardage and obvious run downs.', watch: 'Linebackers fill fast; corners are alone.', beats: 'Inside Zone, Power and Dive.', loses: 'PA Shot and PA Post.' },
  max_drop: { when: 'Protect a lead on 3rd-and-very-long.', watch: 'Only two rushers, the QB has all day but nowhere to throw deep.', beats: 'Three Verticals and Dagger.', loses: 'QB Draw and RB Screen.' },
  prevent: { when: 'Last plays of a half with the lead, give up yards, not points.', watch: 'Everything underneath is open. Tackle in bounds and let the clock run.', beats: 'Hail Mary and Deep Post.', loses: 'Almost every short pass.' },
  man_press: { when: 'Your corners are physical and the offence loves screens and quick throws.', watch: 'Press at the line disrupts timing, but a beaten press is a touchdown.', beats: 'Bubble Screen, Jet Sweep and Quick Slants.', loses: 'Double Move, Slot Fade and Mesh.' },
  robber: { when: 'Against an offence that keeps hitting the middle.', watch: 'A safety drops into the short middle looking to jump a route.', beats: 'Quick Slants, Levels and TE Seam.', loses: 'Deep Corner and outside throws.' },
  cover_2_zone: { when: 'A sound base call against balanced offences; great against the quick game outside.', watch: 'Corners sit in the flats, safeties split the deep field. The hole is the deep sideline between them.', beats: 'Curl Flat, Bubble Screen and Quick Slants.', loses: 'Smash and Deep Corner, the hole shot.' },
  cover_6: { when: 'When the offence loves one side: quarters there, Cover 2 the other way.', watch: 'Two deep defenders on the left, a half on the right. Attack the weak-side flat.', beats: 'Deep Corner, Mesh and Slot Fade.', loses: 'Three Verticals, TE Seam and Hail Mary: verticals split the Cover 2 side.' },
  corner_blitz: { when: 'Surprise pressure from the boundary on an obvious passing down.', watch: 'The safety has to rotate over the vacated corner in time.', beats: 'PA Shot and Y Cross, slow throws from the left hash.', loses: 'Bubble Screen and Jet Sweep to the blitz side.' },
  safety_blitz: { when: 'When the quarterback holds the ball too long: pressure from a direction he never sees.', watch: 'No deep safety. If the back picks it up, every receiver is one-on-one.', beats: 'Mesh and Y Cross, long-developing crossers.', loses: 'Slot Fade, Deep Post and RB Screen.' },
  bear_front: { when: 'Against inside runs when you still need your corners honest.', watch: 'A nose over the centre and a lineman in each B gap clog the interior; the corners are alone.', beats: 'Inside Zone, Dive and Trap.', loses: 'Toss Sweep, Outside Zone and Slot Fade on the lone corners.' },
  // Legendary Plays (GDD §36): beats and loses name real plays, so the coach's counter hints work for them too.
  lp_dragons_gambit: { when: 'Early downs against a defence that crashes on the run fake.', watch: 'Aurodrax rolls right; the left receiver crosses the whole field deep, the tight end runs the corner over him.', beats: 'Bear Front, QB Spy and Cover 0, defences that crash on the fake or leave the deep field empty.', loses: 'DB Blitz, Corner Blitz and Cover 2 Zone: pressure off the edge before the crosser arrives, or two deep safeties over it.' },
  lp_eye_of_the_storm: { when: 'Against man coverage on the trips side.', watch: 'Tempestra’s slant fake: the defender on her hip spins, and she turns it up the field.', beats: 'All-Out Pressure, Run Wall and Max Drop, when nobody stays deep over her.', loses: 'Bear Front, Goal Line Stand and Goal Line Man (no room to go deep), and pressure: the five-step drop gets sacked more than any standard pass.' },
  lp_fault_line: { when: 'Short yardage and the goal line, after a few runs to the right.', watch: 'The false step right, then the cut behind Titanolith at left guard.', beats: 'Bear Front, All-Out Pressure and Cover 6: fronts that flow with the false step.', loses: 'Run Wall, Safety Blitz and Goal Line Stand: a full box that stays home or a blitzer through the gap before the pull.' },
  lp_phantom_coverage: { when: 'When the quarterback keeps throwing the in-breaker.', watch: 'Nyxshade shows press, then drops to the short middle; the free safety rotates down late to his man.', beats: 'Quick Slants, Levels, Mesh and the TE Seam into the middle.', loses: 'Play action (PA Boot, PA Post) and vertical shots (Three Verticals): the robber leaves the deep left to one late safety.' },
  lp_avalanche: { when: 'Obvious passing downs.', watch: 'Glacivern shows robber, then comes through the A gap; Whiteout freezes the first read.', beats: 'Deep Post, PA Boot and Power Left: slow plays the blitz reaches first.', loses: 'PA Shot, Levels and outside runs (Stretch Left): the blitz empties the middle and the left flat.' },
  lp_rootbound: { when: 'Against a run-first offence that lives on fakes.', watch: 'The whole front stays inside Elderoot’s grove: nobody bites on play action or misdirection.', beats: 'Toss Sweep, QB Draw, Inside Zone and play action that needs a bite.', loses: 'Outside runs (Stretch Left, Jet Sweep) and the PA Boot rollout: everyone is packed inside the grove.' },
  double_a_mug: { when: 'Third-and-medium when the offence keeps the back in to block.', watch: 'Two rushers show in the A gaps before the snap; the centre has to choose one.', beats: 'QB Draw, Stick and Levels, the middle collapses.', loses: 'Toss Sweep, Outside Zone and Bubble Screen, nobody is outside.' },
  bracket_left: { when: 'Take away their best receiver when he lines up left.', watch: 'A corner underneath and inside, a safety over the top, on the left receiver. When he runs short, the safety lets him go and plays deep. Everyone else is on their own.', beats: 'The left receiver deep and over the middle: TE Seam, Levels, Three Verticals and Deep Post.', loses: 'The back on a Wheel, RB Screen, Deep Corner to the right, and the run.' },
  goal_line_man: { when: 'Inside your 5 against passing teams. Goal Line Stand with coverage instead of a safety.', watch: 'Four defenders locked in man with three in the gaps. A rub route beats it.', beats: 'Slot Fade, PA Post and Dive.', loses: 'Mesh and Power, nobody comes free to help.' },
  fire_zone: { when: 'Pressure with three deep behind it, the aggressive yet safe blitz.', watch: 'Five rushers, three deep, three under. Open area is the flats.', beats: 'Y Cross, PA Shot and slow drops.', loses: 'Curl Flat and RB Screen.' },
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
