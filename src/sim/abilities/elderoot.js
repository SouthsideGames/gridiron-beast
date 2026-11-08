// NAT-06-F Grove Guardian (elderoot: Elderoot, LB, legendary). Task 8 M3 Nature batch (special action).
// Contract (Dex): at a ready defensive scrimmage SNAP (the first included; no tackle charge) one clone appears at the nearest legal
// unoccupied spot beside Elderoot on the defensive side. It roams independently (no tether) on a copy of Elderoot's chosen assignment
// (blitz / zone / man target). Effective ratings 60 / 65 / 70 / 75% of the source's by mastery, normal rounding; the source is unchanged.
// It can cover, contest passes, intercept, tackle and be blocked (real collision). No abilities, no new clones, no roster slot, XP,
// mastery or stamina pool. Applicable statuses affect it normally; a later Stunned on the source does not disable it. It lasts ONE
// completed play and disappears at the whistle with its statuses and injuries. Its football statistics are credited to ELDEROOT (no
// extra XP, no owner ability triggers). A clone possession ends the play at once, without a return, after the normal touchdown /
// touchback rulings. Cooldown FIVE subsequent defensive plays, fixed at every mastery. Not an echo or a decoy.
// Engine capability used (M3 hook): temporary actors (ctx.spawn: credit, possessionEndsPlay; cleared at the whistle).
// Choices where the contract is silent (reported):
// - "Beside ... on the defensive side": candidates level with him, then a step either way upfield/downfield, laterally 1-3 yards to
//   either side, never on or behind the line (x >= 0.5); nearest first, ties by the candidate order (left before right, level first);
//   clear = 1 yard from everyone. No legal spot: no clone, readiness kept.
// - The source's effective ratings at the snap (after the play's own modifiers) are the 100% the fractions apply to.
// - A source who sits out the play (B18) does not summon (readiness kept).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the snap summon is
// the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, ready, spend, countPlay, disabled, nearestClear } from './nature-electric-common.js';

export const CLONE_PCT = [60, 65, 70, 75];
export const GROVE = Object.freeze({ cooldown: 5, clearance: 1.0 });

export default registerAbility({
  family: 'elderoot', abilityId: 'NAT-06-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (self.team !== 'def' || !scrimmage(ctx) || !ready(st) || disabled(ctx, self) || !ctx.canStartSignature(self)) return;
      const cands = []; for (const dx of [0, -1, 1]) for (const dy of [1, 1.5, 2, 2.5, 3]) for (const s of [-1, 1]) cands.push({ x: self.x + dx, y: self.y + s * dy });
      const spot = nearestClear(ctx, cands.filter((p) => p.x >= 0.5), self.x, self.y, GROVE.clearance, [self]);
      if (!spot) { ctx.log(`${self.name} finds no room for a Grove Guardian`, { kind: 'ability_blocked', by: self.slot, side: self.team, ability: 'NAT-06-F' }); return; }
      const pct = byMastery(CLONE_PCT, self.mastery) / 100; const attrs = {};
      for (const [k, v] of Object.entries(self.attrs)) attrs[k] = Math.max(1, Math.round(v * pct));
      const clone = ctx.spawn({ team: 'def', slot: `${self.slot}+`, mid: `${self.mid}~grove`, name: `${self.name}'s Grove Guardian`, type: self.type, attrs, x: spot.x, y: spot.y,
        assignment: self.assignment, credit: self.slot, possessionEndsPlay: true, cloneOf: self.mid });
      spend(st, GROVE.cooldown); ctx.executed(self);
      ctx.log(`${self.name} raises a Grove Guardian`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-06-F', clone: clone.slot, ratings: { ...attrs }, x: +spot.x.toFixed(2), y: +spot.y.toFixed(2) });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'def'); },
  },
});
