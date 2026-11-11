// Task 8 M3: small helpers shared by the Wind and Dark contract modules (no rule of its own; each module's header names its rules).
import { OFFENSE_SLOTS, DEFENSE_SLOTS } from '../../data/personnel.js';

/** Evolution stage from a form id ('family:stage'). */
export const stageOf = (form) => Number(String(form).split(':')[1] || 0);
/** A value by mastery tier 0..3 (the last tier for anything higher). */
export const byMastery = (arr, m) => arr[Math.max(0, Math.min(arr.length - 1, m || 0))];
/** An ordinary scrimmage play: not a live kickoff and not a two-point try. */
export const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;
/**
 * Able (the contracts' "able" / "Stunned / Knocked Down prevents"): not held out by a counted Stunned and without an accepted
 * Stunned or Knocked Down status. The engine's brief off-balance `stun` after a juke or a missed tackle is not a status.
 */
export function able(ctx, a) {
  if (!a || a.sitsOut || a.knockedDown) return false;
  const s = ctx.statusOf(a); return !(s && (s.id === 'stunned' || s.id === 'knockedDown'));
}
/** The monster's team as 'home' | 'away' (ctx.teamSide is the offense's side), or null without a game (labs). */
export const sideOf = (ctx, a) => (!ctx.teamSide ? null : a.team === 'off' ? ctx.teamSide : ctx.teamSide === 'home' ? 'away' : 'home');
/** Stable lineup order (the depth-chart slot order) for ties. */
export const lineupIndex = (a) => { const L = a.team === 'off' ? OFFENSE_SLOTS : DEFENSE_SLOTS; const i = L.indexOf(a.slot); return i < 0 ? 99 : i; };
export const byLineup = (p, q) => lineupIndex(p) - lineupIndex(q);
const hyp = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
export const BODY = 0.7; // the engine's body separation (engine.js separate)

/**
 * Collision-safe simultaneous displacement (Slipstream Step, Air Brake): every mover travels up to `distance` along (ux, uy), all at
 * once in small steps. A mover stops for good at the field bounds or when its next step would bring it closer to a body (a non-mover,
 * a mover that has stopped, or an obstacle) that is within body distance. Nobody is pushed by anybody else (no domino). Velocities
 * are not changed. Returns [{ a, from: [x, y], to: [x, y], moved }].
 */
export function pushSafely({ actors, movers, ux, uy, distance, bounds: B, obstacles = [] }) {
  const n = Math.max(1, Math.ceil(distance / 0.05)), ds = distance / n;
  const set = new Set(movers);
  const P = movers.map((a) => ({ a, x: a.x, y: a.y, from: [a.x, a.y], done: false }));
  const still = actors.filter((a) => !set.has(a)).map((a) => ({ x: a.x, y: a.y, r: BODY }));
  const inside = (x, y) => {
    if (!B) return true; const m = 0.3; // the engine's on-field clamp (integrate): a carrier is kept inside too (no step out of bounds)
    return y >= B.left + m && y <= B.right - m && x >= B.ownEndLine + m && x <= B.endLine - m;
  };
  for (let k = 0; k < n; k++) {
    const stopped = P.filter((p) => p.done).map((p) => ({ x: p.x, y: p.y, r: BODY }));
    for (const p of P) {
      if (p.done) continue;
      const nx = p.x + ux * ds, ny = p.y + uy * ds;
      if (!inside(nx, ny)) { p.done = true; continue; }
      const next = { x: nx, y: ny };
      const circles = obstacles.filter((o) => o.live !== false && o.kind !== 'rect').map((o) => ({ x: o.x, y: o.y, r: o.r ?? BODY }));
      const inRect = obstacles.some((o) => o.live !== false && o.kind === 'rect' && nx > o.x0 - BODY && nx < o.x1 + BODY && ny > o.y0 - BODY && ny < o.y1 + BODY); // contract walls (Earth/Ice batch)
      const blocked = inRect || [...still, ...stopped, ...circles].some((b) => hyp(b, next) < b.r && hyp(b, next) < hyp(b, p));
      if (blocked) { p.done = true; continue; }
      p.x = nx; p.y = ny;
    }
    if (P.every((p) => p.done)) break;
  }
  return P.map((p) => { const moved = Math.hypot(p.x - p.from[0], p.y - p.from[1]); p.a.x = p.x; p.a.y = p.y; return { a: p.a, from: p.from, to: [p.x, p.y], moved }; });
}
