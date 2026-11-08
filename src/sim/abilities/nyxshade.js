// DAR-06-F Shadow Exchange (nyxshade: Nyxshade, legendary). Task 8 M3 Dark batch (special action, pass-breakup charge).
// Contract (Dex): two personal pass breakups fill the bar (interceptions do not). On a later eligible forward pass release, Shadow
// Exchange is evaluated at the intended receiver's projected catch point: the partner is a real allied defender within 3 yards of
// that point, closer to it than Nyxshade, and at most 8 / 10 / 12 / 14 yards from Nyxshade by mastery; the closest to the catch point,
// stable lineup ties. Both must be able, not block- or tackle-engaged, with legal in-bounds endpoints. Nyxshade and the partner swap
// actual positions simultaneously; each keeps his own assignment, speed and movement heading; the football and the receiver never
// move; ordinary catch / interception resolution follows. The full bar is spent only on a successful legal swap; invalid
// opportunities preserve it; no other cooldown; the activation play cannot earn charge. Partial and full charge carry across
// possessions and halftime. No clones, extra actors, guaranteed breakup or interception, virtual contest, receiver or ball teleport.
//
// Choices where the contract is silent (documented, minimal):
// - The projected catch point is where the thrown ball will come down (ball.landing), the point the catch resolves at.
// - Each release on which he is charged is one opportunity (the first that is valid swaps); two-point tries do not charge the bar.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the swap at a
// release is the live activation (gated: the bar is preserved); pass-breakup charges are in-play charge gains (gated).
import { registerAbility } from './registry.js';
import { byMastery, able, byLineup } from './common.js';

export const PBUS = 2, PARTNER_RADIUS = 3;
export const MAX_SWAP = [8, 10, 12, 14]; // yards by mastery

export default registerAbility({
  family: 'nyxshade', abilityId: 'DAR-06-F',
  initGame: () => ({ charges: 0 }),
  review: { prime: () => ({ charges: PBUS }) }, // reviewer staged input: the bar is full
  hooks: {
    playStart(ctx, self) { self.sx = { armed: ctx.state(self).charges >= PBUS, fired: false }; },
    passRelease(ctx, self, { ball }) {
      const sx = self.sx; if (!sx?.armed || sx.fired || self.team !== 'def' || !ball?.landing) return;
      if (!able(ctx, self) || self.engaged) return;
      const P = ball.landing, B = ctx.bounds, dP = (a) => Math.hypot(a.x - P.x, a.y - P.y), mine = dP(self);
      const legal = (p) => !B || (p.y > B.left && p.y < B.right && p.x > B.ownEndLine && p.x < B.endLine);
      const cands = ctx.actors.filter((d) => d !== self && d.team === self.team && !d.sitsOut && able(ctx, d) && !d.engaged
        && dP(d) <= PARTNER_RADIUS && dP(d) < mine && ctx.dist(d, self) <= byMastery(MAX_SWAP, self.mastery) && legal(d) && legal(self))
        .sort((p, q) => dP(p) - dP(q) || byLineup(p, q));
      const d = cands[0]; if (!d) return; // invalid: the bar is preserved
      if (!ctx.canStartSignature(self)) return; // denied: the bar is preserved
      const a = [self.x, self.y], b = [d.x, d.y];
      self.x = b[0]; self.y = b[1]; d.x = a[0]; d.y = a[1]; // simultaneous exchange; velocities and assignments untouched
      ctx.state(self).charges = 0; sx.fired = true; ctx.executed(self);
      ctx.log(`${self.name}'s Shadow Exchange swaps places with ${d.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-06-F', partner: d.slot, from: a.map((v) => +v.toFixed(2)), to: b.map((v) => +v.toFixed(2)) });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.twoPoint || self.sx?.fired) return;
      if (ctx.stats.pbuBy === self.slot && !ctx.stats.interceptor && ctx.canGainCharge(self)) st.charges = Math.min(PBUS, st.charges + 1);
    },
  },
});
