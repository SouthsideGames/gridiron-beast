// FIR-03-F Meteor Impact (firestorm: Pyronix; QB). Task 8 M3 (special action; instant bounded displacement).
// Contract (Dex): a forward pass targeted at least 15 yards beyond the line of scrimmage while ready commits on release (the
// cooldown is spent even if the pass then fails). A completed teammate catch of that pass releases an outward shockwave: every
// opponent within 3 yards of the catch is pushed radially away, up to 1 / 1.25 / 1.5 / 1.75 yards by mastery. No effect on tips,
// drops or interceptions. Teammates unaffected; no stun or knockdown; no ball-trajectory change and no forced fumble; resistance
// (the Earth field's contact-displacement resistance) reduces the displacement. Recharge: three completed offensive scrimmage plays
// (fires 1, unavailable 2-4, ready 5). Two-point attempts neither activate nor advance the cooldown. No lingering zone.
// Choices where the contract is silent (reported):
//  - "Targeted" is the throw's aim point (the receiver's lead), not the landing spot after the throw's error.
//  - Each opponent in range is displaced the full mastery distance (the "max push"), reduced only by resistance; one directly on the
//    catch point is pushed along the pass line. Displacement keeps him on the field; engagements are not broken.
//  - Releases inside an Eclipse cannot start (spec §11: a blocked start spends nothing).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the powered
// release is the live activation (gated; the shockwave is its launched effect and continues); cooldown only, no charge.
import { registerAbility } from './registry.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const METEOR = Object.freeze({ minTarget: 15, radius: 3, pushByMastery: [1, 1.25, 1.5, 1.75], cooldown: 3 });

export default registerAbility({
  family: 'firestorm', abilityId: 'FIR-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.meteor = { seen: false, powered: false, fired: false }; },
    tick(ctx, self) { // the release: the first tick his pass is in the air
      const m = self.meteor; const b = ctx.ball;
      if (m.seen || !b.inAir || b.kick || ctx.stats.passer !== self.slot) return;
      m.seen = true;
      if (self.team !== 'off' || !scrimmage(ctx) || ctx.state(self).cd > 0 || !((b.aim?.x ?? b.landing?.x) >= METEOR.minTarget)) return;
      if (!ctx.canStartSignature(self)) return;
      m.powered = true; m.fired = true; ctx.state(self).cd = METEOR.cooldown; ctx.executed(self);
      ctx.log(`${$E('sim.launches_a_meteor_impact_pass', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-03-F', phase: 'release' });
    },
    catchMade(ctx, self, r) {
      if (!self.meteor?.powered || r.team !== self.team || r === self) return;
      self.meteor.powered = false; // one shockwave per powered pass
      const push = byMastery(METEOR.pushByMastery, self.mastery); const b = ctx.ball; const hit = [];
      const lx = r.x - (b.from?.x ?? self.x), ly = r.y - (b.from?.y ?? self.y), ll = Math.hypot(lx, ly) || 1;
      for (const o of ctx.opponents(self.team)) {
        const d = ctx.dist(o, r); if (d > METEOR.radius) continue;
        const [ux, uy] = d > 1e-6 ? [(o.x - r.x) / d, (o.y - r.y) / d] : [lx / ll, ly / ll];
        const moved = ctx.displace(o, ux * push, uy * push); hit.push({ slot: o.slot, moved: +moved.toFixed(3) });
      }
      ctx.log(`${$E('sim.s_meteor_impact_shockwave', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-03-F', phase: 'shockwave', x: +r.x.toFixed(2), y: +r.y.toFixed(2), radius: METEOR.radius, victims: hit });
    },
    playEnd(ctx, self) { if (self.team !== 'off' || !scrimmage(ctx)) return; const m = self.meteor; cooldownStep(ctx.state(self), !!m?.fired); },
  },
});
