// Kickoffs, punts, field goals and extra points resolved from attributes
// (GDD §3 and §5). Returns describe what happened; rules.js applies it.

import { FIELD, fieldGoalDistance, clamp } from '../core/field.js';
import { E as $E } from '../core/english.js';

const norm = (v) => clamp(v ?? 60, 1, 99) / 99;

/** Probability a kick from `distance` yards is good for a kicker. */
export function fieldGoalChance(distance, kicking = 60) {
  const k = norm(kicking);
  const maxRange = 42 + 20 * k; // beyond this the ball falls short
  if (distance > maxRange + 4) return 0.02;
  const base = 0.985 - Math.max(0, distance - 22) * (0.03 - 0.019 * k);
  const shortPenalty = distance > maxRange ? (distance - maxRange) * 0.12 : 0;
  return clamp(base - shortPenalty, 0.03, 0.99);
}

/** Longest attempt the coach considers reasonable (≈45% or better). */
export function fieldGoalRange(kicking = 60) {
  for (let d = 70; d >= 20; d--) if (fieldGoalChance(d, kicking) >= 0.45) return d;
  return 20;
}

export function attemptFieldGoal(rng, ballOn, kicker) {
  const distance = fieldGoalDistance(ballOn);
  const p = fieldGoalChance(distance, Math.min(99, (kicker?.attrs?.kicking ?? 60) + (distance >= 40 ? kicker?.longKick || 0 : 0)));
  const good = rng.chance(p);
  return { distance, good, chance: p, text: good ? `${$E('sim.field_goal_is_good_from_yards', { distance })}` : distance > 60 ? `${$E('sim.field_goal_from_falls_short', { distance })}` : `${$E('sim.field_goal_from_is_no_good', { distance })}` };
}

export function attemptExtraPoint(rng, kicker) {
  const distance = FIELD.length - (FIELD.length - FIELD.patSpot) + FIELD.fgAddedYards; // 32-33 yards
  const p = clamp(fieldGoalChance(distance, kicker?.attrs?.kicking) + 0.03, 0.5, 0.99);
  const good = rng.chance(p);
  return { good, chance: p, text: good ? $E('sim.extra_point_is_good') : $E('sim.extra_point_is_no_good') };
}

/**
 * Kickoff from the kicking team's 35. Result is from the RECEIVING team's
 * perspective: { ballOn, touchback, returnYards, touchdown, onside, recovered, text }.
 */
/**
 * Task 8 M2 (N7b P7): the ball's flight on a normal kickoff, from the approved kicking formula, with exactly the draws `kickoff()`
 * makes before its return (distance, then the touchback roll when the ball comes down in the end zone). A live kickoff
 * (rules.js) uses this for the flight and the touchback and plays the return in the engine; `kickoff()` keeps the full formula.
 * `landingFromGoal`: where the ball comes down, in yards from the receiving team's goal line (negative: in its end zone).
 */
export function kickoffFlight(rng, { kicker }) {
  const k = norm(kicker?.attrs?.kicking);
  const distance = 52 + 18 * k + rng.normal() * 5; // yards from the 35
  const landingFromGoal = 100 - (FIELD.kickoffSpot + distance);
  const touchback = landingFromGoal <= -4 || (landingFromGoal <= 0 && rng.chance(0.75));
  return { distance, landingFromGoal, touchback };
}

export function kickoff(rng, { kicker, returner, onside = false }) {
  const k = norm(kicker?.attrs?.kicking);
  if (onside) {
    const recovered = rng.chance(0.18 + 0.12 * k);
    const spot = FIELD.kickoffSpot + 10 + rng.int(6);
    return recovered
      ? { onside: true, recovered: true, ballOn: 100 - spot, text: `${$E('sim.onside_kick_recovered_by_the_kicking', { spot: 100 - spot > 50 ? 'opponent ' + (100 - (100 - spot)) : (100 - spot) })}` }
      : { onside: true, recovered: false, ballOn: spot, text: `${$E('sim.onside_kick_recovered_by_the_receiving', { spot: spot > 50 ? 'opponent ' + (100 - spot) : spot })}` };
  }
  const { landingFromGoal, touchback } = kickoffFlight(rng, { kicker });
  if (touchback) return { touchback: true, ballOn: FIELD.touchbackKickoff, returnYards: 0, text: $E('sim.kickoff_sails_into_the_end_zone') };
  const r = returner?.attrs || {};
  const returnYards = Math.max(4, 16 + 10 * norm(r.speed) + 6 * norm(r.agility) + rng.normal() * 7);
  const start = Math.max(-9, landingFromGoal);
  let ballOn = Math.round(start + returnYards);
  const big = rng.chance(0.012 + 0.02 * norm(r.speed));
  if (big) ballOn = Math.round(Math.max(ballOn + 25, 55 + rng.int(30)));
  const touchdown = ballOn >= 100 || rng.chance(0.006);
  if (touchdown) return { touchdown: true, ballOn: 100, returnYards: 100 - start, text: $E('sim.kickoff_return_touchdown') };
  ballOn = clamp(ballOn, 5, 95);
  return { touchback: false, ballOn, returnYards: Math.round(ballOn - start), text: `${$E('sim.kickoff_returned_yards_to_the', { n: Math.round(ballOn - start), ballOn: ballOn <= 50 ? ballOn : 'opponent ' + (100 - ballOn) })}` };
}

/**
 * Punt from `ballOn` (kicking team's perspective). Returns the RECEIVING
 * team's new ballOn plus description. Includes blocks, shanks, touchbacks and returns.
 */
export function punt(rng, { ballOn, kicker, returner, rushPressure = 0.05 }) {
  const k = norm(kicker?.attrs?.kicking);
  if (rng.chance(rushPressure * 0.4)) {
    return { blocked: true, ballOn: 100 - Math.max(1, ballOn - 8 - rng.int(6)), text: $E('sim.punt_blocked_recovered_by_the_defense') };
  }
  let distance = 34 + 16 * k + rng.normal() * 6;
  if (rng.chance(0.06)) distance *= 0.55; // shank
  distance = Math.max(10, distance);
  const landing = ballOn + distance; // kicking team's perspective
  if (landing >= 100) {
    // Coffin-corner attempt: a good punter pins it inside the 10 sometimes.
    if (ballOn >= 55 && rng.chance(0.35 + 0.4 * k)) {
      const pin = 2 + rng.int(8);
      return { ballOn: pin, distance: Math.round(100 - pin - ballOn), text: `${$E('sim.punt_downed_at_the', { pin })}` };
    }
    return { touchback: true, ballOn: FIELD.touchbackOther, distance: Math.round(100 - ballOn), text: $E('sim.punt_into_the_end_zone_touchback') };
  }
  const receiverBallOn = 100 - landing;
  const r = returner?.attrs || {};
  const fairCatch = rng.chance(0.45) || receiverBallOn < 8;
  if (fairCatch) return { ballOn: Math.round(receiverBallOn), distance: Math.round(distance), fairCatch: true, text: `${$E('sim.punt_of_yards_fair_catch_at', { n: Math.round(distance), n2: Math.round(receiverBallOn) })}` };
  const ret = Math.max(0, 5 + 8 * norm(r.speed) + 5 * norm(r.agility) + rng.normal() * 6);
  let newBallOn = Math.round(receiverBallOn + ret);
  if (rng.chance(0.008)) return { touchdown: true, ballOn: 100, distance: Math.round(distance), catchAt: Math.round(receiverBallOn), text: $E('sim.punt_return_touchdown') }; // M3 hook: catchAt (the catch spot, for kicker contracts)
  newBallOn = clamp(newBallOn, 1, 95);
  return { ballOn: newBallOn, distance: Math.round(distance), returnYards: Math.round(ret), catchAt: Math.round(receiverBallOn), text: `${$E('sim.punt_of_yards_returned_to_the', { n: Math.round(distance), n2: Math.round(ret), newBallOn: newBallOn <= 50 ? newBallOn : 'opponent ' + (100 - newBallOn) })}` };
}
