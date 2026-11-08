// Task 8 M3 (Light/Metal batch): small shared readings used by several contract modules. Nothing here is an ability rule; each is
// the batch's one documented reading of a phrase the contracts share.
export const stageOf = (form) => Number(String(form).split(':')[1] || 0);
/** "Offensive / defensive scrimmage play": a snapped play from scrimmage; live kickoffs (B20) and two-point tries are not. */
export const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;
/** "Able" / "Stunned or Knocked Down prevents": a carried-over Stunned (sits the play out), Knocked Down, or a rest-of-play Stunned. */
export function able(ctx, a) {
  if (!a || a.sitsOut || a.knockedDown) return false;
  const id = ctx.statusOf?.(a)?.id; return id !== 'stunned' && id !== 'knockedDown';
}
/** Mastery tier value: v[mastery] (0-3), the first tier when out of range. */
export const byMastery = (v, m) => v[m] ?? v[0];
