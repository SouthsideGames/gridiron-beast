// MET-04-F Ball Clamp (ironjaw: Ferronox; DL). Task 8 M3, Metal batch (targeted effect).
// Contract (Dex; B3 event order: fumble roll, then strips; REMAINING_DECISIONS 12e): after his own sack while ready he earns a token
// for his next tackle attempt against a ball carrier (the actually tackled carrier, a quarterback sack included; no returner: defensive
// scrimmage only). On a successful normal tackle whose first fumble check did not fumble, he performs ONE additional ordinary
// forced-fumble check at 0.25 / 0.40 / 0.55 / 0.70 (by mastery) of the normal probability. Shielded can prevent the actual fumble
// normally (engine fumbleSaved). No guaranteed turnover and no second tackle. One banked token, consumed on a successful tackle
// eligible for the extra roll; a failed tackle keeps it; it cannot be earned and spent on the same play. The token carries over
// halftime and possessions until used; at most one. A tackle ending in a safety, the end zone or the whistle follows normal fumble
// legality; nothing is turned over after a finalized score (the engine's touchdown checks come before the fumble check).
// Readings where the contract is silent (documented, minimal):
//   - "Own sack" is a play whose result is a sack credited to him (a strip-sack the defense recovers is a fumble, not a sack).
//   - A sack's ordinary fumble check is the wind-up strip (25%, engine trySack); a sack with no wind-up has no fumble check, so it is
//     not eligible for the extra roll and the token is kept. An arm tackle off a block is not a normal tackle (no fumble check).
//   - The extra check draws from the abilities' own random stream; the mastery execution is recorded when it is performed.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the extra fumble
// check at the tackle is the live activation (gated: the token is kept); earning the token from a sack is an in-play charge gain
// (gated).
import { registerAbility } from './registry.js';
import { scrimmage, byMastery } from './common.js';

export const BALL_CLAMP = Object.freeze({ factor: [0.25, 0.40, 0.55, 0.70] });

export default registerAbility({
  family: 'ironjaw', abilityId: 'MET-04-F',
  initGame: () => ({ token: false }),
  hooks: {
    playStart(ctx, self) { self.clamp = { spent: false }; },
    tackleMade(ctx, self, c, { fumbleP }) {
      if (self.team !== 'def' || c.team === self.team || !scrimmage(ctx)) return undefined;
      const st = ctx.state(self); if (!st.token) return undefined;
      if (!ctx.canStartSignature(self)) return undefined; // denied: the token is kept
      st.token = false; self.clamp.spent = true; ctx.executed(self);
      const p = fumbleP * byMastery(BALL_CLAMP.factor, self.mastery); const fumble = ctx.rng.chance(p);
      ctx.log(`${self.name}'s Ball Clamp snaps at the ball${fumble ? ' and jars it loose' : ''}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-04-F', victim: c.slot, p, fumble, x: +c.x.toFixed(2), y: +c.y.toFixed(2) });
      return { fumble };
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || !scrimmage(ctx) || self.clamp?.spent) return; // cannot earn and spend on the same play
      const st = ctx.state(self);
      if (!st.token && s.result === 'sack' && ctx.stats.tackler === self.slot && ctx.canGainCharge(self)) { st.token = true; ctx.log(`${self.name} earns a Ball Clamp`, { kind: 'ability_charge', by: self.slot, side: self.team, ability: 'MET-04-F' }); }
    },
  },
});
