// Task 8 M3: small helpers shared by the Earth and Ice contract modules (no rules of their own).
/** The form's evolution stage (0 for the base form). */
export const stageOf = (form) => Number(String(form || '').split(':')[1] || 0);
/** By-index value from a mastery or stage table (clamped to the table). */
export const tier = (table, i) => table[Math.max(0, Math.min(table.length - 1, i || 0))];
/** An offensive or defensive scrimmage play: not a kickoff and not a two-point try (special teams and tries are excluded). */
export const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;
/** Stunned or Knocked Down (the shared statuses), including a counted Stunned that keeps him out of the whole play. */
export const disabled = (ctx, a) => !!(a.sitsOut || a.knockedDown || ['stunned', 'knockedDown'].includes(ctx.statusOf(a)?.id));
/** A cooldown counted in subsequent plays of one side: the play that starts it does not count (`fresh`). */
export function countDown(st) { if (st.cd > 0 && !st.fresh) st.cd -= 1; st.fresh = false; }
export const opponentSide = (side) => (side === 'home' ? 'away' : side === 'away' ? 'home' : null);
/** Opposing gain on the play, for the low-yardage defensive charges: null when the play does not qualify (an opponent touchdown). */
/** An interception gains the offense nothing (no completion: scored like an incompletion); other plays use the play's net gain. */
export const allowedGain = (ctx, s) => (s.result === 'touchdown' && !ctx.stats.defensiveScore ? null : ctx.stats.interceptor || s.result === 'interception' || s.result === 'touchback_return' ? 0 : s.gain);
export const BODY = 0.35; // the engine's body radius for obstacles (engine.js keepOut)
