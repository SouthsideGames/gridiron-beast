// The single source of truth for every play: cards, field art, audit tool,
// coaching AI and the simulation all read these definitions.
//
// Coordinates are play-relative yards: x upfield from the line of scrimmage
// (offense attacks +x), y lateral (negative = offense's left).

import { OFFENSE_PACKAGES, DEFENSE_PACKAGES, offenseOnField, defenseOnField, LINEMEN } from './personnel.js';
import { routePoints, ALTERNATE_ROUTES, ZONES, GAPS } from './routes.js';

// ---------------------------------------------------------------- formations
const OL = { LG: [-0.6, -1.7], C: [-0.4, 0], RG: [-0.6, 1.7] };
export const OFFENSE_FORMATIONS = Object.freeze({
  i_pro: { pkg: 'pro', label: 'I-Form', align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro: { pkg: 'pro', label: 'Gun Pro', align: { ...OL, QB: [-5, 0], RB: [-5.2, 2.8], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_pro_lt: { pkg: 'pro', label: 'Gun Pro Left', align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], WR1: [-0.6, -18], WR2: [-1.2, 18] } },
  gun_spread: { pkg: 'spread', label: 'Spread', align: { ...OL, QB: [-5, 0], WR1: [-0.6, -18], WR2: [-1.2, 18], WR3: [-1.2, 10] } },
  gun_trips: { pkg: 'spread', label: 'Trips Left', align: { ...OL, QB: [-5, 0], WR1: [-0.6, -19], WR3: [-1.2, -12], WR2: [-1.2, 18] } },
  tight_i: { pkg: 'tight', label: 'Tight I', align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-0.6, 3.2], WR1: [-0.6, -18] } },
  tight_gun: { pkg: 'tight', label: 'Tight Gun', align: { ...OL, QB: [-5, 0], RB: [-5.2, -2.8], TE: [-0.6, 3.2], WR1: [-1.2, -18] } },
  tight_wing: { pkg: 'tight', label: 'Wing', align: { ...OL, QB: [-1.6, 0], RB: [-6.5, 0], TE: [-1.4, 4.2], WR1: [-0.6, -18] } },
});

export const DEFENSE_FORMATIONS = Object.freeze({
  base: { pkg: 'base', align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, -3.5], LB2: [4.5, 3.5], CB1: [6, -17], CB2: [6, 17], FS: [12, 0] } },
  nickel: { pkg: 'nickel', align: { DL1: [1, -1.8], DL2: [1, 1.8], LB1: [4.5, 0], CB1: [6, -17], CB2: [6, 17], FS: [12, -7], SS: [12, 7] } },
  heavy: { pkg: 'heavy', align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [3.5, -3.5], LB2: [3.5, 3.5], CB1: [5, -15], CB2: [5, 15] } },
  pressure: { pkg: 'pressure', align: { DL1: [1, -2.4], DL3: [1, 0], DL2: [1, 2.4], LB1: [4, 0], CB1: [5, -16], CB2: [5, 16], FS: [10, 0] } },
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
const MAN = (key) => ({ a: 'man', key });
const ZONE = (zone) => ({ a: 'zone', zone });
const SPY = { a: 'spy' };
const CONTAIN = (gap) => ({ a: 'contain', gap });

function offense(id, name, formation, assignments, opts = {}) {
  const f = OFFENSE_FORMATIONS[formation];
  return { id, name, side: 'offense', type: opts.type || 'pass', formation, pkg: f.pkg, align: { ...f.align, ...(opts.align || {}) }, assignments, primary: opts.primary || null, progression: opts.progression || [], drop: opts.drop || 'three', tags: opts.tags || [], desc: opts.desc || '' };
}
function defense(id, name, formation, assignments, opts = {}) {
  const f = DEFENSE_FORMATIONS[formation];
  return { id, name, side: 'defense', formation, pkg: f.pkg, align: { ...f.align, ...(opts.align || {}) }, assignments, tags: opts.tags || [], desc: opts.desc || '' };
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
    QB: HANDOFF, RB: CARRY([[-6.5, 0], [-4.5, 2], [-2, -1], [1, -3.5], [8, -4], [20, -4]]),
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
    QB: HANDOFF, WR3: CARRY([[-1.2, -12], [-2, -4], [-1, 6], [3, 13], [20, 16]]),
    LG: RUNBLOCK([1.5, -1]), C: RUNBLOCK([1.5, 2]), RG: RUNBLOCK([2, 5]), WR2: STALK([3, 17]), WR1: STALK([4, -16]),
  }, { type: 'run', tags: ['run', 'outside', 'misdirection'], desc: 'The slot receiver takes the jet motion handoff around the right end.' }),

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
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_half_L'), SS: ZONE('deep_half_R'),
  }, { tags: ['pass', 'man', 'balanced'], desc: 'Two deep halves; everyone underneath locked in man.' }),
  defense('cover_3', 'Cover 3', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'), SS: ZONE('flat_R'),
  }, { align: { SS: [5, 10] }, tags: ['pass', 'zone', 'balanced'], desc: 'Three deep thirds, strong safety drops to the flat.' }),
  defense('cover_4', 'Cover 4', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_quarter_LL'), CB2: ZONE('deep_quarter_RR'), FS: ZONE('deep_quarter_L'), SS: ZONE('deep_quarter_R'),
  }, { tags: ['pass', 'zone', 'deep', 'prevent_light'], desc: 'Four deep quarters. Gives up the short stuff.' }),
  defense('cover_1', 'Cover 1', 'base', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: RUSH('A_R'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { tags: ['pass', 'man', 'pressure_light'], desc: 'Man across with one deep safety and a linebacker added to the rush.' }),
  defense('cover_0', 'Cover 0', 'pressure', {
    DL1: RUSH('B_L'), DL3: RUSH('A_R'), DL2: RUSH('edge_R'), LB1: RUSH('A_L'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: MAN('inside'),
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
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), LB2: ZONE('hook_M'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'),
  }, { align: { CB1: [1.5, -17], CB2: [1.5, 17] }, tags: ['pass', 'man', 'press'], desc: 'Corners jam at the line; one deep safety.' }),
  defense('robber', 'Robber', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), LB1: MAN('inside'), CB1: MAN('wideL'), CB2: MAN('wideR'), FS: ZONE('deep_middle'), SS: ZONE('robber'),
  }, { tags: ['pass', 'man', 'trap'], desc: 'Man under with a safety lurking in the middle for the in-breaker.' }),
  defense('fire_zone', 'Fire Zone', 'nickel', {
    DL1: RUSH('B_L'), DL2: RUSH('B_R'), SS: RUSH('edge_R'), LB1: ZONE('hook_M'), CB1: ZONE('deep_third_L'), CB2: ZONE('deep_third_R'), FS: ZONE('deep_third_M'),
  }, { align: { SS: [4, 7] }, tags: ['blitz', 'zone'], desc: 'Safety blitz off the edge with three deep behind it.' }),
];

// ------------------------------------------------------------- compilation
function compile(play) {
  const onField = play.side === 'offense' ? offenseOnField(play.pkg) : defenseOnField(play.pkg);
  const compiled = { ...play, onField, assignments: {} };
  for (const slot of onField) {
    const a = play.assignments[slot];
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

export const PLAYS = Object.freeze(Object.fromEntries([...OFFENSE_PLAYS, ...DEFENSE_PLAYS].map((p) => [p.id, compile(p)])));
export const OFFENSE_IDS = OFFENSE_PLAYS.map((p) => p.id);
export const DEFENSE_IDS = DEFENSE_PLAYS.map((p) => p.id);
export const getPlay = (id) => { const p = PLAYS[id]; if (!p) throw new Error(`Unknown play ${id}`); return p; };

/** Eligible receivers for an offensive play (skill players running routes or carrying). */
export function eligibleReceivers(play) {
  return play.onField.filter((s) => s !== 'QB' && !LINEMEN.includes(s));
}

/**
 * Resolve man-coverage keys against an actual offensive alignment:
 * wideL = widest left receiver, wideR = widest right, inside = the third.
 */
export function manKeyTargets(offensePlay) {
  const receivers = eligibleReceivers(offensePlay).map((s) => [s, offensePlay.align[s][1]]).sort((a, b) => a[1] - b[1]);
  const wideL = receivers[0]?.[0];
  const wideR = receivers[receivers.length - 1]?.[0];
  const inside = receivers.find(([s]) => s !== wideL && s !== wideR)?.[0] || wideR;
  return { wideL, wideR, inside };
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
      if (!LINEMEN.every((s) => p.onField.includes(s))) problems.push(`${p.name}: missing linemen`);
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
        if (a.a === 'man' && !['wideL', 'wideR', 'inside'].includes(a.key)) problems.push(`${p.name}: ${slot} bad man key`);
        if (a.a === 'zone' && !ZONES[a.zone]) problems.push(`${p.name}: ${slot} bad zone`);
        if ((a.a === 'rush' || a.a === 'contain') && !GAPS[a.gap]) problems.push(`${p.name}: ${slot} bad gap`);
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
