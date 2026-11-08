// FIR-04-F Ember Grip — Scorch Mark (cinderclaw: Scorchulk; DL). Task 8 M3 (targeted effect; pair-specific debuff).
// Contract (Dex): the first blocker who engages him while ready is marked. In engagements versus this Scorchulk only, the marked
// blocker's effective Strength and Blocking are reduced by 10 / 12 / 14 / 16% by mastery (both); stored ratings and every other
// matchup are unchanged; no separate push-speed bonus and no guaranteed release or push. The mark lasts the rest of the play,
// through disengage and re-engage, and clears at the whistle. Recharge: three defensive plays (fires 1, unavailable 2-4, ready 5);
// one marked blocker per activation. Visual: glowing claw marks on the marked blocker (the logged event names him).
// The engine applies the mark through its engagement attribute scaling (engine.js blockAttrs, "M3 hook"): the block contest, the
// open-field block landing chance, the in-space whiff chance and the pancake opportunity, against this Scorchulk only.
// Choices where the contract is silent (reported):
//  - Defensive plays are scrimmage plays: a kickoff (not a defensive snap, B20) and a two-point try neither activate nor count.
//  - The cooldown counts his participating defensive plays (the pilots' convention).
//  - An engagement inside an Eclipse cannot start the mark (spec §11; nothing is spent).
//  - The shared engine note ("displacement is Strength-based; holding uses Blocking versus defender Agility, with the LB
//    Strength-based shed exception") is not re-implemented here: the engagement model's current contest (B2 shed) is unchanged.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the mark at his
// first engagement while ready is the live activation (gated); cooldown only, no charge.
import { registerAbility } from './registry.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';

export const SCORCH = Object.freeze({ pctByMastery: [10, 12, 14, 16], cooldown: 3 });

export default registerAbility({
  family: 'cinderclaw', abilityId: 'FIR-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.scorch = { marked: null }; },
    engage(ctx, self, blocker) {
      if (self.team !== 'def' || !scrimmage(ctx) || self.scorch.marked || ctx.state(self).cd > 0) return; // he is the defender engaged
      if (!ctx.canStartSignature(self)) return;
      const k = 1 - byMastery(SCORCH.pctByMastery, self.mastery) / 100;
      (blocker.pairMods ||= new Map()).set(self.mid, { strength: k, blocking: k });
      self.scorch.marked = blocker; ctx.state(self).cd = SCORCH.cooldown; ctx.executed(self);
      ctx.log(`${self.name}'s Scorch Mark brands ${blocker.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-04-F', victim: blocker.slot, victimSide: blocker.team, pct: Math.round((1 - k) * 100) });
    },
    playEnd(ctx, self) { if (self.team !== 'def' || !scrimmage(ctx)) return; cooldownStep(ctx.state(self), !!self.scorch?.marked); },
  },
});
