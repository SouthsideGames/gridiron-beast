// Attribute trials (GDD §8.2 audit, v42.6): controlled comparisons on the REAL football engine, shared by the Attribute Testing
// Lab (Developer Tools) and tools/attr-study.mjs. Every monster on the field is a plain BASE (65) in every attribute, no species
// ability and no elemental type (type edges are exactly 1.0); only the subject's one attribute changes; every level plays the same
// seeds, so a difference between levels is that attribute's alone. Pure: generated slots only, never a franchise or a save.
import { simulatePlay } from '../sim/engine.js';
import { PLAYS } from '../data/playbook.js';
import * as ST from '../sim/special-teams.js';
import { afterGame } from '../franchise/progression.js';
import { createRng } from '../core/rng.js';
import { ATTR_ORDER } from '../data/stat-guide.js';

export const N = 300;
export const LEVELS = [50, 75, 95];
export const BASE = 65;

const plain = (name) => ({ attrs: Object.fromEntries(ATTR_ORDER.map((k) => [k, BASE])), ability: null, type: null, name, id: null });
/** Slots for a play: every monster plain; `subjects` (slot list) get `attr` = value. */
export function side(playId, subjects = [], attr = null, value = BASE) {
  const out = {};
  for (const s of PLAYS[playId].onField) { out[s] = plain(s); if (subjects.includes(s) && attr) out[s].attrs[attr] = value; }
  return out;
}
/** What the last play() set up (the Lab marks the subjects on the field). */
export const lastSetup = { offSubjects: [], defSubjects: [], off: null, def: null };
export function play({ off, def, offSubjects = [], defSubjects = [], attr, value, seed, options = {}, ballOn = 30, extra = null }) {
  Object.assign(lastSetup, { offSubjects, defSubjects, off, def });
  const offense = side(off, offSubjects, attr, value), defense = side(def, defSubjects, attr, value);
  if (extra) extra(offense, defense);
  return simulatePlay({ offensePlay: PLAYS[off], defensePlay: PLAYS[def], offense, defense, ballOn, ballLat: 0, seed, options: { frameEvery: 1, ...options } });
}
// ---- measurements from a play
const posOf = (f, team, slot) => f[team].find((p) => p[0] === slot);
const first = (sim, kind) => sim.events.find((e) => e.kind === kind) || null;
const count = (sim, kind) => sim.events.filter((e) => e.kind === kind).length;
/** A route runner's timing: seconds to 10 and 20 yards downfield of his alignment, peak speed, time to his final waypoint. */
export function runnerTiming(sim, slot) {
  const fs = sim.frames.filter((f) => f.t >= 0); const p0 = posOf(fs[0], 'off', slot); let t10 = null, t20 = null, peak = 0, prev = null;
  for (const f of fs) { const p = posOf(f, 'off', slot); if (!p) break; if (t10 == null && p[1] - p0[1] >= 10) t10 = f.t; if (t20 == null && p[1] - p0[1] >= 20) t20 = f.t; if (prev && f.t > prev.t) peak = Math.max(peak, Math.hypot(p[1] - prev.p[1], p[2] - prev.p[2]) / (f.t - prev.t)); prev = { t: f.t, p }; }
  return { t10, t20, peak: +peak.toFixed(2) };
}
/** Separation (yards) between an offensive slot and the nearest unengaged defender at time t. */
export function separationAt(sim, slot, t) {
  const f = sim.frames.find((x) => x.t >= t - 1e-6) || sim.frames.at(-1); const p = posOf(f, 'off', slot); if (!p) return null;
  return Math.min(...f.def.filter((d) => !d[3]).map((d) => Math.hypot(d[1] - p[1], d[2] - p[2])));
}
/** Seconds until an unengaged defender is within 3.2 yards of the quarterback while he still holds the ball (the engine's pressure distance). */
export function pressureAt(sim) {
  for (const f of sim.frames) { if (f.t < 0) continue; if (f.holder !== 'QB') return null; const q = posOf(f, 'off', 'QB'); if (f.def.some((d) => !d[3] && Math.hypot(d[1] - q[1], d[2] - q[2]) < 3.2)) return f.t; }
  return null;
}
/** A real forced throw: the Lab's human decision mode throws to `target` at `at` seconds whatever the coverage (forcedTarget is the old AI read, which refuses a covered throw). */
const forced = (target, at) => ({ qb: { mode: 'human', at, action: 'throw', target } });
/** Where the target was when the ball arrived: yards past the landing spot along the field, and his distance to the ball (the deep-lead diagnostic). */
export function arrivalGap(sim, slot) {
  const th = first(sim, 'throw'); if (!th) return { overrun: null, toBall: null }; const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > th.t); if (!arr) return { overrun: null, toBall: null };
  const f = sim.frames.find((x) => x.t >= arr.t - 1e-6) || sim.frames.at(-1); const w = posOf(f, 'off', slot); return { overrun: +(w[1] - f.ball[0]).toFixed(2), toBall: +Math.hypot(w[1] - f.ball[0], w[2] - f.ball[1]).toFixed(2) };
}
const mean = (xs) => { const v = xs.filter((x) => x != null && Number.isFinite(x)); return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) : null; };
const rate = (xs) => mean(xs.filter((x) => x != null).map((x) => (x ? 1 : 0))); // null = not applicable to this play

// ---- trials: id, attribute, who, what is measured, run(value, seed) → sim, measure(sim) → { metric: number|boolean }
export const TRIALS = [
  { id: 'speed_wr_go', attr: 'speed', pos: 'WR', label: 'WR1 go route vs man coverage (QB holds): time to 10 / 20 yards, peak yd/s, separation at 2.5 s', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', offSubjects: ['WR1'], attr: 'speed', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4.5 } }), measure: (sim) => ({ ...runnerTiming(sim, 'WR1'), sep25: separationAt(sim, 'WR1', 2.5) }) },
  { id: 'speed_wr_deep', attr: 'speed', pos: 'WR', label: 'WR1 go route, ball forced to him: completion, separation when the ball arrives, yards', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', offSubjects: ['WR1'], attr: 'speed', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR1', arriveSep: sim.stats.arriveSep, yards: sim.yards, int: sim.result === 'interception', ...arrivalGap(sim, 'WR1') }) },
  { id: 'speed_wr_lead', attr: 'speed', pos: 'WR', label: 'Deep-lead diagnostic: WR1 go route vs cover 4 (nobody near), ball forced at 2.4 s: yards the receiver is PAST the ball when it arrives, distance to the ball, catch rate', run: (v, s) => play({ off: 'three_verticals', def: 'cover_4', offSubjects: ['WR1'], attr: 'speed', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ ...arrivalGap(sim, 'WR1'), caught: sim.stats.receiver === 'WR1' }) },
  { id: 'speed_wr_ai', attr: 'speed', pos: 'WR', label: 'WR1 go route with the real AI quarterback (three verticals vs cover 3): how often he is targeted, completion when targeted, yards', run: (v, s) => play({ off: 'three_verticals', def: 'cover_3', offSubjects: ['WR1'], attr: 'speed', value: v, seed: s }), measure: (sim) => ({ targeted: sim.stats.target === 'WR1', completeWhenTargeted: sim.stats.target === 'WR1' ? sim.stats.receiver === 'WR1' : null, yards: sim.stats.target === 'WR1' ? sim.yards : null }) },
  { id: 'speed_rb', attr: 'speed', pos: 'RB', label: 'RB outside zone vs cover 3: yards per carry, 15+ yard runs', run: (v, s) => play({ off: 'outside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'speed', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, breakaway: sim.yards >= 15, td: sim.touchdown }) },
  { id: 'speed_dl', attr: 'speed', pos: 'DL', label: 'Both DL rushing (QB holds 4 s): seconds to pressure, sack rate', run: (v, s) => play({ off: 'deep_post', def: 'cover_3', defSubjects: ['DL1', 'DL2'], attr: 'speed', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ pressureAt: pressureAt(sim), sack: sim.result === 'sack' }) },
  { id: 'speed_cb', attr: 'speed', pos: 'CB', label: 'CB1 in man on a go route, ball forced: separation at arrival, completion allowed', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', defSubjects: ['CB1'], attr: 'speed', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1', int: sim.result === 'interception' }) },
  { id: 'speed_s_pursuit', attr: 'speed', pos: 'S', label: 'FS + LBs chasing an outside zone run: yards allowed, 15+ runs allowed', run: (v, s) => play({ off: 'outside_zone', def: 'cover_3', defSubjects: ['FS', 'LB1', 'LB2'], attr: 'speed', value: v, seed: s }), measure: (sim) => ({ yardsAllowed: sim.yards, breakaway: sim.yards >= 15 }) },

  { id: 'agility_wr_cut', attr: 'agility', pos: 'WR', label: 'WR2 curl (speed fixed 65): time to 10 yards, time to the break, separation at 2.0 s', run: (v, s) => play({ off: 'curl_flat', def: 'cover_1', offSubjects: ['WR2'], attr: 'agility', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ ...runnerTiming(sim, 'WR2'), sep20: separationAt(sim, 'WR2', 2.0) }) },
  { id: 'agility_wr_catch', attr: 'agility', pos: 'WR', label: 'WR2 curl, ball forced (catch radius): completion', run: (v, s) => play({ off: 'curl_flat', def: 'cover_3', offSubjects: ['WR2'], attr: 'agility', value: v, seed: s, options: forced('WR2', 1.8) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR2', yards: sim.yards }) },
  { id: 'agility_rb', attr: 'agility', pos: 'RB', label: 'RB inside zone: jukes, broken tackles, yards', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'agility', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, jukes: count(sim, 'juke'), broken: count(sim, 'broken_tackle') }) },
  { id: 'agility_qb', attr: 'agility', pos: 'QB', label: 'QB vs all-out blitz (holds 4 s): sack rate, escapes', run: (v, s) => play({ off: 'deep_post', def: 'all_out', offSubjects: ['QB'], attr: 'agility', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ sack: sim.result === 'sack', escapes: count(sim, 'escape') }) },
  { id: 'speed_vs_agility_rb', attr: 'speed', pos: 'RB', label: 'Control for the agility RB trial: the same carries with RB Speed changed instead', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'speed', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, jukes: count(sim, 'juke'), broken: count(sim, 'broken_tackle') }) },

  { id: 'strength_ol', attr: 'strength', pos: 'OL', label: 'Both guards (blocking fixed 65) vs 2 rushers, QB holds 4 s: seconds to pressure, sheds, sacks', run: (v, s) => play({ off: 'deep_post', def: 'cover_3', offSubjects: ['LG', 'RG'], attr: 'strength', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ pressureAt: pressureAt(sim), sheds: count(sim, 'shed'), sack: sim.result === 'sack' }) },
  { id: 'strength_rb', attr: 'strength', pos: 'RB', label: 'RB inside zone: broken tackles, yards', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'strength', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, broken: count(sim, 'broken_tackle'), fumble: count(sim, 'fumble') > 0 }) },
  { id: 'strength_dl', attr: 'strength', pos: 'DL', label: 'Both DL (tackling, agility fixed): sheds, seconds to pressure, sacks', run: (v, s) => play({ off: 'deep_post', def: 'cover_3', defSubjects: ['DL1', 'DL2'], attr: 'strength', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ sheds: count(sim, 'shed'), pressureAt: pressureAt(sim), sack: sim.result === 'sack' }) },
  { id: 'strength_lb', attr: 'strength', pos: 'LB', label: 'LBs + FS (tackling fixed 65) vs inside zone: broken tackles allowed, yards', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'strength', value: v, seed: s }), measure: (sim) => ({ yardsAllowed: sim.yards, brokenAllowed: count(sim, 'broken_tackle') }) },

  { id: 'awareness_rb', attr: 'awareness', pos: 'RB', label: 'RB inside zone (vision): yards, cutbacks, stuffed runs (≤1 yard)', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, cutback: sim.events.some((e) => e.kind === 'cutback'), stuffed: sim.yards <= 1 }) },
  { id: 'awareness_rb_power', attr: 'awareness', pos: 'RB', label: 'RB power vs cover 3 (vision): yards, cutbacks, stuffed runs', run: (v, s) => play({ off: 'power_right', def: 'cover_3', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, cutback: sim.events.some((e) => e.kind === 'cutback'), stuffed: sim.yards <= 1 }) },
  { id: 'awareness_rb_toss', attr: 'awareness', pos: 'RB', label: 'RB toss sweep vs cover 3 (vision): yards, cutbacks, stuffed runs', run: (v, s) => play({ off: 'toss_sweep', def: 'cover_3', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, cutback: sim.events.some((e) => e.kind === 'cutback'), stuffed: sim.yards <= 1 }) },
  { id: 'awareness_rb_cover2', attr: 'awareness', pos: 'RB', label: 'RB inside zone vs cover 2 zone (vision): yards, cutbacks, 10+ runs', run: (v, s) => play({ off: 'inside_zone', def: 'cover_2_zone', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, cutback: sim.events.some((e) => e.kind === 'cutback'), breakaway: sim.yards >= 10 }) },
  { id: 'awareness_rb_yac', attr: 'awareness', pos: 'RB', label: 'RB flat route, ball forced (open-field vision): yards after the catch', run: (v, s) => play({ off: 'curl_flat', def: 'cover_3', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s, options: forced('RB', 1.2) }), measure: (sim) => ({ yac: sim.stats.receiver === 'RB' ? sim.stats.yac : null }) },
  { id: 'awareness_rb_outside', attr: 'awareness', pos: 'RB', label: 'RB outside zone (vision): yards, plays whose outcome differs at all from the 50 run', run: (v, s) => play({ off: 'outside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, endLat: sim.endLat }) },
  { id: 'awareness_lb_run', attr: 'awareness', pos: 'LB', label: 'LBs + FS vs inside zone (run recognition, pursuit): yards allowed', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ yardsAllowed: sim.yards, breakaway: sim.yards >= 10 }) },
  { id: 'awareness_lb_pa', attr: 'awareness', pos: 'LB', label: 'LBs + FS vs play-action post (biting on the fake): completion allowed, yards', run: (v, s) => play({ off: 'pa_post', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ completeAllowed: !!sim.stats.receiver, yardsAllowed: sim.yards, sack: sim.result === 'sack' }) },
  { id: 'awareness_def_juke', attr: 'awareness', pos: 'LB', label: 'LBs + FS vs outside zone (jukes are agility vs awareness): jukes allowed, yards', run: (v, s) => play({ off: 'outside_zone', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ jukesAllowed: count(sim, 'juke'), yardsAllowed: sim.yards }) },
  { id: 'awareness_qb', attr: 'awareness', pos: 'QB', label: 'QB (read progression) on a curl/flat concept vs cover 3: completion, decision quality share, sacks', run: (v, s) => play({ off: 'curl_flat', def: 'cover_3', offSubjects: ['QB'], attr: 'awareness', value: v, seed: s }), measure: (sim) => ({ complete: !!sim.stats.receiver, yards: sim.yards, sack: sim.result === 'sack', int: sim.result === 'interception', qShare: sim.qb?.decision?.bestTrueQ ? sim.qb.decision.trueQ / sim.qb.decision.bestTrueQ : null, decidedAt: sim.qb?.decision?.t ?? null }) },

  { id: 'catching_wr_open', attr: 'catching', pos: 'WR', label: 'WR2 curl vs cover 4 (open), ball forced: completion, drops', run: (v, s) => play({ off: 'curl_flat', def: 'cover_4', offSubjects: ['WR2'], attr: 'catching', value: v, seed: s, options: forced('WR2', 1.8) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR2', yards: sim.yards }) },
  { id: 'catching_wr_contested', attr: 'catching', pos: 'WR', label: 'WR1 go vs press man, ball forced (contested): completion, interceptions', run: (v, s) => play({ off: 'three_verticals', def: 'man_press', offSubjects: ['WR1'], attr: 'catching', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR1', int: sim.result === 'interception', contested: !!first(sim, 'catch')?.contested }) },
  { id: 'catching_rb_fumble', attr: 'catching', pos: 'RB', label: 'RB inside zone (ball security): fumbles per carry', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['RB'], attr: 'catching', value: v, seed: s }), measure: (sim) => ({ fumble: count(sim, 'fumble') > 0 }) },
  { id: 'catching_cb_pick', attr: 'catching', pos: 'CB', label: 'CB1 in man, ball forced into his coverage: interceptions', run: (v, s) => play({ off: 'three_verticals', def: 'man_press', defSubjects: ['CB1'], attr: 'catching', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ int: sim.result === 'interception', completeAllowed: sim.stats.receiver === 'WR1' }) },

  { id: 'arm_deep', attr: 'arm', pos: 'QB', label: 'QB (accuracy fixed 65), go route forced: completion, air yards, flight time (throw → arrival)', run: (v, s) => play({ off: 'three_verticals', def: 'cover_4', offSubjects: ['QB'], attr: 'arm', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => { const th = first(sim, 'throw'); const arr = sim.events.find((e) => ['catch', 'incomplete', 'interception'].includes(e.kind) && e.t > (th?.t ?? 0)); return { complete: sim.stats.receiver === 'WR1', airYards: sim.stats.airYards, flight: th && arr ? +(arr.t - th.t).toFixed(2) : null, thrownAt: th?.t ?? null }; } },
  { id: 'arm_progression', attr: 'arm', pos: 'QB', label: 'QB (read progression) on three verticals vs cover 4: completion, yards, deep attempts (20+ air)', run: (v, s) => play({ off: 'three_verticals', def: 'cover_4', offSubjects: ['QB'], attr: 'arm', value: v, seed: s }), measure: (sim) => ({ complete: !!sim.stats.receiver, yards: sim.yards, deepAttempt: (sim.stats.airYards || 0) >= 20, sack: sim.result === 'sack' }) },
  { id: 'accuracy_short', attr: 'accuracy', pos: 'QB', label: 'QB (arm fixed 65), curl forced vs cover 4: completion, interceptions', run: (v, s) => play({ off: 'curl_flat', def: 'cover_4', offSubjects: ['QB'], attr: 'accuracy', value: v, seed: s, options: forced('WR2', 1.8) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR2', int: sim.result === 'interception' }) },
  { id: 'accuracy_deep', attr: 'accuracy', pos: 'QB', label: 'QB (arm fixed 65), go route forced vs cover 1: completion, interceptions', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', offSubjects: ['QB'], attr: 'accuracy', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR1', int: sim.result === 'interception' }) },
  { id: 'arm_vs_accuracy', attr: 'arm', pos: 'QB', label: 'Cross-check: the deep forced throw of the accuracy trial with Arm changed instead (accuracy fixed)', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', offSubjects: ['QB'], attr: 'arm', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ complete: sim.stats.receiver === 'WR1', int: sim.result === 'interception' }) },

  { id: 'blocking_pass', attr: 'blocking', pos: 'OL', label: 'Both guards (strength fixed 65) in pass protection, QB holds 4 s: seconds to pressure, sheds, sacks', run: (v, s) => play({ off: 'deep_post', def: 'cover_3', offSubjects: ['LG', 'RG'], attr: 'blocking', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ pressureAt: pressureAt(sim), sheds: count(sim, 'shed'), sack: sim.result === 'sack' }) },
  { id: 'blocking_run', attr: 'blocking', pos: 'OL', label: 'Both guards + TE run blocking on inside zone: yards per carry', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', offSubjects: ['LG', 'RG', 'TE'], attr: 'blocking', value: v, seed: s }), measure: (sim) => ({ yards: sim.yards, stuffed: sim.yards <= 1 }) },
  { id: 'blocking_vs_strength', attr: 'blocking', pos: 'OL', label: 'Control: the pass-protection trial with Strength (not Blocking) at the level', run: (v, s) => play({ off: 'deep_post', def: 'cover_3', offSubjects: ['LG', 'RG'], attr: 'strength', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ pressureAt: pressureAt(sim), sheds: count(sim, 'shed') }) },

  { id: 'tackling_lb', attr: 'tackling', pos: 'LB', label: 'LBs + FS (strength fixed) vs inside zone: broken tackles allowed, yards', run: (v, s) => play({ off: 'inside_zone', def: 'cover_3', defSubjects: ['LB1', 'LB2', 'FS'], attr: 'tackling', value: v, seed: s }), measure: (sim) => ({ brokenAllowed: count(sim, 'broken_tackle'), yardsAllowed: sim.yards, breakaway: sim.yards >= 10 }) },
  { id: 'tackling_cb_open', attr: 'tackling', pos: 'CB', label: 'CB1 tackling after a completed flat route (open field): yards after catch, broken tackles', run: (v, s) => play({ off: 'curl_flat', def: 'cover_1', defSubjects: ['CB1', 'CB2', 'FS', 'LB1', 'LB2'], attr: 'tackling', value: v, seed: s, options: forced('RB', 1.2) }), measure: (sim) => ({ yac: sim.stats.receiver ? sim.stats.yac : null, brokenAllowed: count(sim, 'broken_tackle') }) },
  { id: 'tackling_dl_sack', attr: 'tackling', pos: 'DL', label: 'Both DL (strength fixed) finishing sacks vs an all-out hold: sack rate, escapes', run: (v, s) => play({ off: 'deep_post', def: 'all_out', defSubjects: ['DL1', 'DL2', 'DL3'], attr: 'tackling', value: v, seed: s, options: { qb: { mode: 'hold' }, maxTime: 4 } }), measure: (sim) => ({ sack: sim.result === 'sack', escapes: count(sim, 'escape') }) },

  { id: 'coverage_cb_man', attr: 'coverage', pos: 'CB', label: 'CB1 man vs a go route, ball forced: separation at arrival, completion allowed, interceptions', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', defSubjects: ['CB1'], attr: 'coverage', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1', int: sim.result === 'interception' }) },
  { id: 'coverage_cb_cut', attr: 'coverage', pos: 'CB', label: 'CB1 man vs a comeback (reacting to the cut), ball forced: separation at arrival, completion allowed', run: (v, s) => play({ off: 'curl_flat', def: 'cover_1', defSubjects: ['CB1'], attr: 'coverage', value: v, seed: s, options: forced('WR1', 1.9) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1', sepAtBreak: separationAt(sim, 'WR1', 1.8), sepAfterBreak: separationAt(sim, 'WR1', 2.6) }) },
  { id: 'coverage_zone', attr: 'coverage', pos: 'S', label: 'All zone defenders vs curl/flat (QB progression): completion allowed, yards', run: (v, s) => play({ off: 'curl_flat', def: 'cover_3', defSubjects: ['CB1', 'CB2', 'FS', 'LB1', 'LB2'], attr: 'coverage', value: v, seed: s }), measure: (sim) => ({ completeAllowed: !!sim.stats.receiver, yardsAllowed: sim.yards, int: sim.result === 'interception' }) },
  { id: 'coverage_vs_speed_cb', attr: 'coverage', pos: 'CB', label: 'Control: the man go-route trial with CB1 Speed (not Coverage) at the level', run: (v, s) => play({ off: 'three_verticals', def: 'cover_1', defSubjects: ['CB1'], attr: 'speed', value: v, seed: s, options: forced('WR1', 2.4) }), measure: (sim) => ({ arriveSep: sim.stats.arriveSep, completeAllowed: sim.stats.receiver === 'WR1' }) },
];

// ---- durability and kicking are not plays: measured on their own functions
export function durabilityStudy(n = N, levelList = LEVELS) {
  const out = {};
  for (const v of levelList) {
    const inj = [], fat = []; const rng = createRng(77);
    for (let i = 0; i < n; i++) {
      const m = { id: 'm', name: 'M', position: 'RB', level: 5, xp: 0, fatigue: 30, injury: null, attributes: Object.fromEntries(ATTR_ORDER.map((k) => [k, k === 'durability' ? v : BASE])), species: null };
      afterGame([m], { RB: 'm' }, {}, rng, { snaps: 45 }); // the real fatigue and injury roll after one game (progression.js)
      inj.push(!!m.injury); fat.push(m.fatigue - 30);
    }
    out[v] = { injuryRate: rate(inj), fatigueGain: mean(fat) };
  }
  return { id: 'durability_game', attr: 'durability', pos: 'RB', label: 'One game at fatigue 30: injury rate, fatigue gained (progression.js afterGame)', levels: out };
}
export function kickingStudy(n = N, levelList = LEVELS) {
  const out = {};
  for (const v of levelList) {
    const k = { attrs: { kicking: v } }; const rng = createRng(78); const punts = [], kos = [], fg45 = [], fg52 = [];
    for (let i = 0; i < n; i++) { punts.push(ST.punt(rng, { ballOn: 30, kicker: k, returner: { attrs: {} }, rushPressure: 0 }).distance); const ko = ST.kickoff(rng, { kicker: k, returner: { attrs: {} } }); kos.push(ko.touchback); fg45.push(ST.attemptFieldGoal(rng, 100 - 45 + 17, k).good); fg52.push(ST.attemptFieldGoal(rng, 100 - 52 + 17, k).good); }
    out[v] = { fg35: +ST.fieldGoalChance(35, v).toFixed(3), fg45: +ST.fieldGoalChance(45, v).toFixed(3), fg52: +ST.fieldGoalChance(52, v).toFixed(3), range: ST.fieldGoalRange(v), puntAvg: mean(punts), kickoffTouchback: rate(kos), made45: rate(fg45), made52: rate(fg52) };
  }
  return { id: 'kicking', attr: 'kicking', pos: 'K', label: 'Field goal odds at 35/45/52, coach range, punt average, kickoff touchbacks (special-teams.js)', levels: out };
}

export function runTrial(trial, n = N, levelList = LEVELS) {
  const levels = {};
  for (const v of levelList) {
    const rows = [];
    for (let i = 0; i < n; i++) rows.push(trial.measure(trial.run(v, 1000 + i)));
    const keys = Object.keys(rows[0]); levels[v] = {};
    for (const k of keys) { const xs = rows.map((r) => r[k]); levels[v][k] = typeof xs.find((x) => x != null) === 'boolean' ? rate(xs) : mean(xs); }
  }
  return { id: trial.id, attr: trial.attr, pos: trial.pos, label: trial.label, n, levels };
}

/** Plain-language names and units for the measured metrics (the Lab's results table). */
export const METRIC = Object.freeze({
  t10: ['Time to 10 yards', 's'], t20: ['Time to 20 yards', 's'], peak: ['Peak speed', 'yd/s'], sep25: ['Separation at 2.5 s', 'yd'], sep20: ['Separation at 2.0 s', 'yd'],
  complete: ['Completion', '%'], completeAllowed: ['Completion allowed', '%'], completeWhenTargeted: ['Completion when targeted', '%'], targeted: ['Targeted', '%'], caught: ['Caught', '%'],
  arriveSep: ['Separation when the ball arrives', 'yd'], yards: ['Yards', 'yd'], yardsAllowed: ['Yards allowed', 'yd'], int: ['Interception', '%'], breakaway: ['Breakaway run', '%'], td: ['Touchdown', '%'],
  pressureAt: ['Time to pressure', 's'], sack: ['Sack', '%'], sheds: ['Blocks shed per play', ''], escapes: ['Escapes per play', ''], jukes: ['Jukes per play', ''], broken: ['Broken tackles per play', ''], brokenAllowed: ['Broken tackles allowed per play', ''], jukesAllowed: ['Jukes allowed per play', ''], cutback: ['Cut back before contact', '%'],
  fumble: ['Fumble', '%'], stuffed: ['Stuffed (1 yard or less)', '%'], contested: ['Contested catch', '%'], airYards: ['Air yards', 'yd'], flight: ['Flight time', 's'], thrownAt: ['Thrown at', 's'], deepAttempt: ['Deep attempt (20+ air)', '%'],
  qShare: ['Decision quality share', ''], decidedAt: ['Decided at', 's'], yac: ['Yards after catch', 'yd'], sepAtBreak: ['Separation at the break', 'yd'], sepAfterBreak: ['Separation after the break', 'yd'], overrun: ['Receiver past the ball at arrival', 'yd'], toBall: ['Receiver to the ball at arrival', 'yd'], endLat: ['End lateral position', 'yd'],
  injuryRate: ['Injured in one game', '%'], fatigueGain: ['Fatigue gained', ''], fg35: ['35-yard field goal odds', '%'], fg45: ['45-yard field goal odds', '%'], fg52: ['52-yard field goal odds', '%'], range: ['Coach\'s range', 'yd'], puntAvg: ['Punt average', 'yd'], kickoffTouchback: ['Kickoff touchbacks', '%'], made45: ['45-yarders made', '%'], made52: ['52-yarders made', '%'],
});
/** Trial categories for the Lab's menu (GDD §8.2 audit brief). */
export const CATEGORY = Object.freeze({ speed: 'Speed trials', agility: 'Agility trials', strength: 'Contact trials', blocking: 'Contact trials', tackling: 'Contact trials', arm: 'Passing and catching trials', accuracy: 'Passing and catching trials', catching: 'Passing and catching trials', coverage: 'Passing and catching trials', awareness: 'Decision trials', durability: 'Condition and special teams trials', kicking: 'Condition and special teams trials' });
