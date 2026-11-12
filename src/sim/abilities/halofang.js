// LIG-05-F Radiant Pursuit (halofang: Haloryx; LB). Task 8 M3, Light batch (self enhancement).
// Contract (Dex): after the mastery-required number of personal successful tackles on rushing plays (3 / 3 / 2 / 2; an assist
// qualifies, once per play) the bar is full and arms his next participating defensive snap. At that snap the charge empties and, until
// he makes his first tackle attempt on the current ball carrier, he ignores ordinary allied-body path obstruction while chasing the
// ball carrier; enemy blockers still collide and engage normally. It ends BEFORE the tackle contest: no pass-through of enemies and
// no automatic win, no teleport and no stat change; physical walls, environmental vines and enemy bodies still stop him (only the
// allied body separation is skipped: engine `passAllies`). The ability state expires at the whistle even without a tackle. The
// activation play cannot recharge; no further cooldown. Partial and full charge carry over halves and possessions. A Stunned or
// Knocked Down source cannot activate at the snap and keeps the bar.
// Readings where the contract is silent (documented, minimal):
//   - "Rushing play" is an official rush as the stat sheet counts it (a carry that was not a catch or a pass, not a sack); "personal
//     successful tackle" is the credited tackler or the credited assist. Defensive scrimmage plays only (common.js).
//   - "Chasing the ball carrier" is while an opponent is actually carrying (the stat sheet's carrier holds the ball); a quarterback
//     still in his drop is not yet a carrier.
//   - A full bar takes no further charge until it is spent.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the snap
// activation is the live activation (gated: the bar is kept); tackle charges are in-play charge gains (gated).
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';
import { E as $E } from '../../core/english.js';

export const RADIANT = Object.freeze({ required: [3, 3, 2, 2] });
const carrying = (ctx, c) => !!c && ctx.stats.carrier === c.slot;

export default registerAbility({
  family: 'halofang', abilityId: 'LIG-05-F',
  initGame: () => ({ tackles: 0, armed: false }),
  hooks: {
    playStart(ctx, self) {
      self.rp = { active: false, activated: false }; self.passAllies = false;
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self); if (!st.armed || !able(ctx, self)) return; // Stunned / Knocked Down keeps the bar
      if (!ctx.canStartSignature(self)) return; // denied: the bar is kept
      st.armed = false; st.tackles = 0; self.rp.active = true; self.rp.activated = true; ctx.executed(self);
      ctx.log(`${$E('sim.s_radiant_pursuit_lights_up', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-05-F' });
    },
    tick(ctx, self) {
      if (!self.rp?.active) { self.passAllies = false; return; }
      const c = ctx.ball.holder; self.passAllies = !!c && c.team !== self.team && carrying(ctx, c);
    },
    tackling(ctx, self, carrier) {
      if (!self.rp?.active || carrier !== ctx.ball.holder) return;
      self.rp.active = false; self.passAllies = false; // ends before the tackle contest
      ctx.log(`${$E('sim.s_radiant_pursuit_fades_into_the', { name: self.name })}`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'LIG-05-F' });
    },
    playEnd(ctx, self, s) {
      self.passAllies = false; if (self.rp) self.rp.active = false; // expires at the whistle
      if (self.team !== 'def' || !scrimmage(ctx) || self.rp?.activated) return; // the activation play cannot recharge
      const st = ctx.state(self); if (st.armed) return;
      const S = ctx.stats; const rush = S.carrier && !S.receiver && !S.passer && s.result !== 'sack' && s.result !== 'touchdown' && !S.defensiveScore;
      if (rush && (S.tackler === self.slot || S.assistBy === self.slot) && ctx.canGainCharge(self)) {
        st.tackles += 1; if (st.tackles >= byMastery(RADIANT.required, self.mastery)) st.armed = true;
      }
    },
  },
});
