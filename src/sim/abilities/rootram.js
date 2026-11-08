// NAT-03-F Deep Roots (rootram: Bramblet, OL). Task 8 M3 Nature batch (self enhancement).
// Contract (Dex): at his first block engagement while ready, run OR pass blocking (not the legacy one-yard-push trigger), he roots at
// the engagement point and stays stationary until the whistle: no translation (he may turn and engage within ordinary reach), and no
// forced displacement of any kind, ability pushes included. During the activation play the FIRST successful ORDINARY block shed against
// him is prevented; after that sheds are normal. No attribute changes; no Stunned / Knocked Down immunity; no field or shared status.
// The roots remain through the play even if a defender gets past, and end at the whistle. Cooldown 5 / 4 / 3 / 2 subsequent offensive
// plays by mastery, starting on root activation. A special bypass (Vine Vault) can succeed and does NOT consume the shed protection.
// Engine capabilities used (M3 hooks): `anchor` (no translation: own movement, collision pushes, field displacement, engagement drive)
// and the `shedAttempt` hook (pre-resolution of an ordinary shed).
// Choices where the contract is silent (reported): kickoff return blocks and two-point tries are not trigger plays (batch reading); the
// root is the spot where he stands when the engagement starts; the pair holds its ground (an anchored blocker neither yields nor
// drives the defender back), the shed contest itself is unchanged.
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, scrimmage, ready, spend, countPlay, disabled } from './nature-electric-common.js';

export default registerAbility({
  family: 'rootram', abilityId: 'NAT-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) { self.dr = { tried: false, rooted: false, guardUsed: false }; },
    engage(ctx, self, other) {
      const r = self.dr; if (r.tried || self.team !== 'off' || other.team === self.team || self.engaged !== other) return;
      r.tried = true; const st = ctx.state(self);
      if (!scrimmage(ctx) || !ready(st) || disabled(ctx, self) || !ctx.canStartSignature(self)) return;
      r.rooted = true; self.anchor = { x: self.x, y: self.y }; spend(st, byMastery(CD_5432, self.mastery)); ctx.executed(self);
      ctx.log(`${self.name} sets Deep Roots`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-03-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
    shedAttempt(ctx, self, d) {
      const r = self.dr; if (!r?.rooted || r.guardUsed) return undefined;
      r.guardUsed = true; ctx.log(`${self.name}'s roots hold against ${d.name}`, { kind: 'shed_prevented', by: self.slot, side: self.team, victim: d.slot, ability: 'NAT-03-F' });
      return { prevent: true };
    },
    playEnd(ctx, self) { self.anchor = null; countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
