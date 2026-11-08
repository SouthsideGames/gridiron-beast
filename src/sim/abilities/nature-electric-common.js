// Task 8 M3, Nature / Electric batch: small helpers shared by the twelve contract modules of this batch (no rules of their own).
//
// Batch-wide readings where the contracts are silent (each module header lists its own):
// - Readiness counts only scrimmage plays: kickoffs and two-point attempts neither trigger these abilities nor count as cooldown units
//   (Bloom Break, Bramble Trap, Crossed Wires and Charge Strip say so explicitly; the others are silent and read the same way).
// - "N subsequent offensive (defensive) plays": completed scrimmage plays on that side in which the monster participates (the pilots'
//   reading, glimmer.js); the activation play itself is not one of them (`fresh`).
// - A monster that sits out the play (a carried-over counted Stunned, B18) cannot start an in-play activation; readiness is kept.
import { positionOf, OFFENSE_SLOTS, DEFENSE_SLOTS } from '../../data/personnel.js';

export const CD_5432 = Object.freeze([5, 4, 3, 2]);
export const stageOf = (form) => Number(String(form).split(':')[1] || 0);
export const byMastery = (arr, m) => arr[Math.max(0, Math.min(arr.length - 1, m || 0))];
/** A scrimmage snap (not a kickoff, not a two-point try). */
export const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;
/** Ready: cooldown run out, no pending activation, not the activation play. */
export const ready = (st) => !(st.cd > 0) && !st.token && !st.fresh;
/** Start the cooldown at an activation (the activation play is not a subsequent play). */
export function spend(st, n) { st.cd = n; st.fresh = true; }
/** At the whistle of a scrimmage play on `team` ('off' | 'def') in which he took part: one cooldown unit. */
export function countPlay(ctx, self, st, team) {
  if (self.team !== team || !scrimmage(ctx)) return;
  if (st.cd > 0 && !st.fresh) st.cd -= 1;
  st.fresh = false;
}
/** Disabled for the play (cannot start an activation): sitting out, or Stunned / Knocked Down now. */
export function disabled(ctx, a) {
  if (a.sitsOut || a.knockedDown) return true;
  const s = ctx.statusOf(a); return !!s && (s.id === 'knockedDown' || s.id === 'stunned');
}
/** Turn at a drawn route's interior waypoint k, in degrees (0 when a leg is degenerate). */
export function cutAngle(points, k) {
  const a = points[k - 1], b = points[k], c = points[k + 1]; if (!a || !b || !c) return null;
  const ix = b[0] - a[0], iy = b[1] - a[1], ox = c[0] - b[0], oy = c[1] - b[1], li = Math.hypot(ix, iy), lo = Math.hypot(ox, oy);
  if (li < 0.05 || lo < 0.05) return 0;
  return (Math.acos(Math.max(-1, Math.min(1, (ix * ox + iy * oy) / (li * lo)))) * 180) / Math.PI;
}
/** Designated route cuts (drawn interior waypoints with a direction change) the route runner has taken since the last call. */
export function cutsTaken(self, mem) {
  const pts = self.assignment?.points; const to = self.wp; const from = mem.wp ?? 0; mem.wp = to;
  if (self.assignment?.a !== 'route' || !pts) return [];
  const out = []; for (let k = Math.max(1, from); k < to && k <= pts.length - 2; k++) { const angle = cutAngle(pts, k); if (angle > 1) out.push({ k, angle }); }
  return out;
}
/** Stable lineup order of a slot (the depth-chart slot order), for deterministic ties. Temporaries sort last. */
export const slotOrder = (slot) => { const i = [...OFFENSE_SLOTS, ...DEFENSE_SLOTS].indexOf(slot); return i < 0 ? 99 : i; };
/** Nearest clear spot to (x, y) among `cands` (deterministic: distance, then the candidates' own order). */
export function nearestClear(ctx, cands, x, y, clearance, except = []) {
  const B = ctx.bounds;
  const ok = (p) => p.y > B.left + 0.6 && p.y < B.right - 0.6 && p.x > B.ownEndLine + 0.5 && p.x < B.endLine - 0.5 && ctx.actors.every((o) => except.includes(o) || Math.hypot(o.x - p.x, o.y - p.y) >= clearance);
  return cands.map((p, i) => ({ ...p, i, d: Math.hypot(p.x - x, p.y - y) })).filter(ok).sort((p, q) => p.d - q.d || p.i - q.i)[0] || null;
}
/** A field rectangle's longitudinal band kept inside the playable field (shifted, never shrunk), in yards beyond the LOS. */
export function bandInField(ballOn, from, to) {
  const len = to - from; let a = from, b = to;
  if (ballOn + b > 110) { b = 110 - ballOn; a = b - len; }
  if (ballOn + a < -10) { a = -10 - ballOn; b = a + len; }
  return [a, b];
}
export { positionOf };
