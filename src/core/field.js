// Field geometry in yards. One coordinate convention for the engine, the play
// data, the play art and the renderer, so they can never disagree.
//
// Absolute field: `yard` 0..100 is the playing field measured from the
// OFFENSE's own goal line toward the opponent's; the end zones occupy
// -10..0 and 100..110. Lateral `lat` is -26.67..26.67 (0 = centre).
//
// Play-relative (what plays and the engine use): `x` yards upfield from the
// line of scrimmage, `y` yards lateral from the ball spot. The offense ALWAYS
// attacks +x. Converting to absolute is `yard = ballOn + x`, `lat = ballLat + y`.

export const FIELD = Object.freeze({
  length: 100,
  endZone: 10,
  width: 160 / 3, // 53.33 yards
  halfWidth: 80 / 3, // 26.67
  hashFromCentre: 20 / 3, // NCAA-style hash marks, 6.67 yd from centre
  kickoffSpot: 35,
  touchbackKickoff: 25,
  touchbackOther: 20,
  patSpot: 15, // ball placed at the 15 for a one-point kick
  twoPointSpot: 2,
  goalpostDepth: 10, // uprights on the end line
  fgAddedYards: 17, // end zone + 7 yd hold
});

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Boundaries expressed in play-relative coordinates for a given ball spot. */
export function boundsFor(ballOn, ballLat = 0) {
  return {
    goal: FIELD.length - ballOn, // x of the opponent goal line
    endLine: FIELD.length + FIELD.endZone - ballOn, // back of opponent end zone
    ownGoal: -ballOn, // x of the offense's own goal line (safety line)
    ownEndLine: -ballOn - FIELD.endZone,
    left: -FIELD.halfWidth - ballLat, // y of left sideline (offense's left)
    right: FIELD.halfWidth - ballLat,
  };
}

/** Clamp a play-relative point so it never leaves the playing surface. */
export function clampPoint([x, y], bounds, margin = 0.5) {
  return [
    clamp(x, bounds.ownEndLine + margin, bounds.endLine - margin),
    clamp(y, bounds.left + margin, bounds.right - margin),
  ];
}

/**
 * Compress an authored path so it fits before `limitX` (the end line or a
 * chosen horizon) while keeping its shape. Points already inside are kept;
 * depth beyond the limit is scaled down proportionally.
 */
export function compressPath(points, limitX, start = 0) {
  const maxX = Math.max(...points.map((p) => p[0]));
  if (maxX <= limitX) return points.map((p) => [...p]);
  const scale = (limitX - start) / (maxX - start);
  return points.map(([x, y]) => [x <= start ? x : start + (x - start) * scale, y]);
}

/** Human label for an absolute yard line from the offense's perspective. */
export function yardLabel(yard) {
  const y = Math.round(yard);
  if (y <= 0) return 'OWN GOAL';
  if (y >= 100) return 'OPP GOAL';
  if (y === 50) return 'MIDFIELD';
  return y < 50 ? `OWN ${y}` : `OPP ${100 - y}`;
}

/** Distance of a field-goal attempt from a ball spot. */
export function fieldGoalDistance(ballOn) {
  return FIELD.length - ballOn + FIELD.fgAddedYards;
}

/** Yard line as seen by the OTHER team (possession change). */
export const flipYard = (yard) => FIELD.length - yard;
