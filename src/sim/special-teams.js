// Kickoffs, punts, field goals and extra points resolved from attributes
// (GDD §3 and §5). Returns describe what happened; rules.js applies it.

import { FIELD, fieldGoalDistance, clamp } from '../core/field.js';

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
  return { distance, good, chance: p, text: good ? `Field goal is GOOD from ${distance} yards.` : distance > 60 ? `Field goal from ${distance} falls short.` : `Field goal from ${distance} is no good.` };
}

export function attemptExtraPoint(rng, kicker) {
  const distance = FIELD.length - (FIELD.length - FIELD.patSpot) + FIELD.fgAddedYards; // 32-33 yards
  const p = clamp(fieldGoalChance(distance, kicker?.attrs?.kicking) + 0.03, 0.5, 0.99);
  const good = rng.chance(p);
  return { good, chance: p, text: good ? 'Extra point is good.' : 'Extra point is NO GOOD.' };
}

/**
 * Kickoff from the kicking team's 35. Result is from the RECEIVING team's
 * perspective: { ballOn, touchback, returnYards, touchdown, onside, recovered, text }.
 */
export function kickoff(rng, { kicker, returner, onside = false }) {
  const k = norm(kicker?.attrs?.kicking);
  if (onside) {
    const recovered = rng.chance(0.18 + 0.12 * k);
    const spot = FIELD.kickoffSpot + 10 + rng.int(6);
    return recovered
      ? { onside: true, recovered: true, ballOn: 100 - spot, text: `ONSIDE KICK recovered by the kicking team at the ${100 - spot > 50 ? 'opponent ' + (100 - (100 - spot)) : (100 - spot)}!` }
      : { onside: true, recovered: false, ballOn: spot, text: `Onside kick recovered by the receiving team at the ${spot > 50 ? 'opponent ' + (100 - spot) : spot}.` };
  }
  const distance = 52 + 18 * k + rng.normal() * 5; // yards from the 35
  const landing = FIELD.kickoffSpot + distance; // receiving team's yard line counting from their goal: 100 - landing
  const landingFromGoal = 100 - landing; // negative = in the end zone
  if (landingFromGoal <= -4 || (landingFromGoal <= 0 && rng.chance(0.75))) {
    return { touchback: true, ballOn: FIELD.touchbackKickoff, returnYards: 0, text: 'Kickoff sails into the end zone. Touchback.' };
  }
  const r = returner?.attrs || {};
  const returnYards = Math.max(4, 16 + 10 * norm(r.speed) + 6 * norm(r.agility) + rng.normal() * 7);
  const start = Math.max(-9, landingFromGoal);
  let ballOn = Math.round(start + returnYards);
  const big = rng.chance(0.012 + 0.02 * norm(r.speed));
  if (big) ballOn = Math.round(Math.max(ballOn + 25, 55 + rng.int(30)));
  const touchdown = ballOn >= 100 || rng.chance(0.006);
  if (touchdown) return { touchdown: true, ballOn: 100, returnYards: 100 - start, text: 'KICKOFF RETURN TOUCHDOWN!' };
  ballOn = clamp(ballOn, 5, 95);
  return { touchback: false, ballOn, returnYards: Math.round(ballOn - start), text: `Kickoff returned ${Math.round(ballOn - start)} yards to the ${ballOn <= 50 ? ballOn : 'opponent ' + (100 - ballOn)}.` };
}

/**
 * Punt from `ballOn` (kicking team's perspective). Returns the RECEIVING
 * team's new ballOn plus description. Includes blocks, shanks, touchbacks and returns.
 */
export function punt(rng, { ballOn, kicker, returner, rushPressure = 0.05 }) {
  const k = norm(kicker?.attrs?.kicking);
  if (rng.chance(rushPressure * 0.4)) {
    return { blocked: true, ballOn: 100 - Math.max(1, ballOn - 8 - rng.int(6)), text: 'PUNT BLOCKED! Recovered by the defense.' };
  }
  let distance = 34 + 16 * k + rng.normal() * 6;
  if (rng.chance(0.06)) distance *= 0.55; // shank
  distance = Math.max(10, distance);
  const landing = ballOn + distance; // kicking team's perspective
  if (landing >= 100) {
    // Coffin-corner attempt: a good punter pins it inside the 10 sometimes.
    if (ballOn >= 55 && rng.chance(0.35 + 0.4 * k)) {
      const pin = 2 + rng.int(8);
      return { ballOn: pin, distance: Math.round(100 - pin - ballOn), text: `Punt downed at the ${pin}.` };
    }
    return { touchback: true, ballOn: FIELD.touchbackOther, distance: Math.round(100 - ballOn), text: 'Punt into the end zone. Touchback.' };
  }
  const receiverBallOn = 100 - landing;
  const r = returner?.attrs || {};
  const fairCatch = rng.chance(0.45) || receiverBallOn < 8;
  if (fairCatch) return { ballOn: Math.round(receiverBallOn), distance: Math.round(distance), fairCatch: true, text: `Punt of ${Math.round(distance)} yards, fair catch at the ${Math.round(receiverBallOn)}.` };
  const ret = Math.max(0, 5 + 8 * norm(r.speed) + 5 * norm(r.agility) + rng.normal() * 6);
  let newBallOn = Math.round(receiverBallOn + ret);
  if (rng.chance(0.008)) return { touchdown: true, ballOn: 100, distance: Math.round(distance), text: 'PUNT RETURN TOUCHDOWN!' };
  newBallOn = clamp(newBallOn, 1, 95);
  return { ballOn: newBallOn, distance: Math.round(distance), returnYards: Math.round(ret), text: `Punt of ${Math.round(distance)} yards, returned ${Math.round(ret)} to the ${newBallOn <= 50 ? newBallOn : 'opponent ' + (100 - newBallOn)}.` };
}
