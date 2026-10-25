// QB Read Progression (GDD §53): the quarterback's model of a throw and the Awareness parameters that filter what he sees.
// Pure functions; the engine (src/sim/engine.js) measures the field and calls these. Nothing here moves a player or draws a
// random number: the engine owns its two random streams (physics, and the quarterback's perception).
//
// The engine measures, for each eligible receiver, the ARRIVAL WINDOW: where the receiver will be when a ball thrown now
// arrives, and how close each defender can get to that spot by then (reaction + closing speed, not a straight-line guess).
// The quarterback sees that window through his Awareness (noise, fixation, missed defenders), turns it into odds with
// `throwOdds`, and compares the throw's quality with a bar that falls as the play goes on and when pressure arrives.

export const QB_MODEL_VERSION = 1;
const norm = (v) => Math.max(1, Math.min(99, v)) / 99;
const sigmoid = (v) => 1 / (1 + Math.exp(-v));

/**
 * Awareness → how the quarterback processes the field. `aw` is the 1–99 rating. Returns seconds and yards.
 *   look      seconds per read (moving the eyes and judging one receiver)
 *   noise     yards of error when judging a window (one judgement per look, not per frame)
 *   fixation  yards a low-Awareness passer overrates his primary by; lock = chance he stays on the primary instead of moving on
 *   missSecond chance he does not see the second defender (double coverage) on a look
 *   periph    chance per look to notice a clearly open receiver who is not the current read
 *   sense     yards at which he feels an unblocked rusher (pressure recognition); react = chance he responds in time
 *   laneNoise seconds of error judging a running lane
 * Bands (guidance, not rules): 40–54 often locks onto the primary; 55–69 progresses but forces some throws; 70–82 sound reads;
 * 83–92 quick and clean; 93–99 elite, still fallible.
 */
export function awarenessProfile(aw) {
  const a = norm(aw); const low = 1 - a;
  return {
    look: 0.40 - 0.22 * a,
    noise: 0.30 + 2.0 * Math.pow(low, 1.25),
    fixation: 1.6 * Math.pow(low, 1.5),
    lock: 0.6 * Math.pow(low, 1.3),
    missSecond: 0.75 * Math.pow(low, 1.2),
    periph: 0.08 + 0.6 * a * a,
    sense: 1.6 + 3.2 * a,
    react: 0.35 + 0.65 * a, // chance per check that he reacts to a rusher about to arrive (a lesser passer freezes)
    laneNoise: 0.05 + 0.35 * low,
  };
}

/** Bar a throw's quality must clear: lower on the designed first read, after a full pass through the reads, and under pressure. */
export function acceptBar({ index = 0, cycles = 0, sincePocket = 0, pressure = false }) {
  let bar = 0.56 - (index === 0 ? 0.04 : 0) - 0.07 * Math.min(2, cycles) - 0.05 * Math.max(0, sincePocket - 1.6);
  if (pressure) bar -= 0.14;
  return Math.max(0.18, bar);
}

/**
 * Odds of a throw from its arrival window, in the engine's own terms (catch radius, accuracy error, contest and pick rules of
 * resolveArrival / throwTo). m1 / m2: yards between the catch point and the nearest / second-nearest defender when the ball
 * arrives; air: air yards; dist: throw distance; ratings 1–99. Returns { pComp, pInt, quality, ev }.
 */
export function throwOdds({ m1, m2 = 99, air, dist, accuracy, catching, agility, cover = 60, pickHands = 50, pressured = false, moving = false, flight = 0.5, rspeed = 8 }) {
  const deep = air > 20; const deepK = deep ? 1 + (air - 20) * 0.03 : 1;
  const sigma = (1.2 + dist * 0.07) * deepK * (1.3 - norm(accuracy)) * (pressured ? 1.5 : 1) * (moving ? 1.2 : 1) * 0.86;
  const R = 1.4 + 0.9 * norm(agility) + 0.45 * rspeed * flight; // the receiver adjusts to the ball while it is in the air
  const onTarget = 1 - Math.exp(-(R * R) / (2 * sigma * sigma));
  let catchK = (0.7 + 0.29 * norm(catching)) * 0.88 * (deep ? 0.78 + 0.1 * norm(catching) : 1);
  const line = deep ? 1.6 : 1.1;
  const contest = sigmoid((line - m1) / 0.3) + (m2 < line + 0.6 ? 0.25 * sigmoid((line + 0.6 - m2) / 0.4) : 0);
  const contestK = 0.7 + 0.22 * norm(catching) - 0.22 * norm(cover);
  const pComp = Math.max(0, onTarget * catchK * (1 - Math.min(1, contest) * (1 - contestK)));
  const pPick = sigmoid((1.3 - m1) / 0.45) * (0.05 + 0.22 * norm(pickHands)) * 0.42 * (deep ? 1.9 : 1) * (onTarget * 0.5 + (1 - onTarget) * 1.15) * (m2 < 1.5 ? 1.3 : 1); // a pick needs the defender nearer the ball than the receiver; deep balls hang
  const pInt = Math.min(0.6, pPick);
  const yac = Math.min(8, Math.max(0, m1 - 0.5) * 1.1);
  return { pComp, pInt, quality: pComp - 2.5 * pInt, ev: pComp * (Math.max(0, air) + yac) - pInt * 25 };
}

/** Why a read was passed over, in the quarterback's own terms (what he perceived on that look). */
export function rejectReason({ ready, reachable, m1, m2, lane, quality, bar }) {
  if (!reachable) return 'out_of_range';
  if (!ready) return 'not_ready';
  if (m2 < 1.8 && m1 < 2.2) return 'double';
  if (lane) return 'lane';
  if (m1 < 1.2) return 'covered';
  if (quality < bar) return 'tight';
  return 'open';
}
export const REASON_TEXT = Object.freeze({ open: 'Open', double: 'Double coverage', lane: 'Throwing lane blocked', covered: 'Covered', tight: 'Window too tight', not_ready: 'Route not developed', out_of_range: 'Out of range', noticed: 'Spotted open', pressure: 'Pressure arriving', fixed: 'Locked on' });
