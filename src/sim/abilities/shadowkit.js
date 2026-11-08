// DAR-01-F Shadow Patch (shadowkit: Umbrikit / Obscurat). Task 8 M3 Dark batch (zone; G3 creation).
// Contract (Dex; FIELD_CLOCKS G3): after his own pass breakup while ready (interceptions excluded) he banks a field for the next
// defensive scrimmage pre-choice; it is created at his next eligible on-field defensive snap (G3). A 6-wide by 6-long Dark rectangle
// centred at the upcoming LOS plus the 5-yard LB reference, laterally at the breakup location projected into the new snap. Non-Dark
// monsters of BOTH teams inside have -15 / -20% effective Awareness by form (the Dark field effect: stored ratings unchanged,
// ordinary Awareness formulas, Dark monsters unaffected, no Confused, no automatic route error; ball and controls stay truthful).
// Cooldown 5 defensive plays, fixed, after creation; he cannot bank during cooldown. Lifetime 1 / 1 / 2 / 2 defensive scrimmage plays
// by mastery including the spawn play. Pending carries across halves and possessions; the created field clears at halftime; no
// re-anchoring after creation.
//
// Choices where the contract is silent (documented, minimal):
// - The breakup location is the ball's spot when the pass fell incomplete (its absolute lateral is kept for the new snap).
// - Cooldown plays are his own participating defensive scrimmage plays (as the pilot Beacon Lane counts its creator's plays), the
//   creation play excluded ("after creation"); the lifetime counts his team's defensive scrimmage plays (clock 'teamDefense').
// - "Ready": no cooldown running and no field already banked. Two-point tries neither bank nor count.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the patch is
// created at the next defensive snap from the banked field (out of play: not gated); banking it from a pass breakup is an in-play
// charge gain (gated).
import { registerAbility } from './registry.js';
import { stageOf, byMastery, scrimmage, sideOf } from './common.js';

export const STRENGTH = [15, 20]; // Awareness reduction % by form
export const COOLDOWN = 5;
export const LIFETIME = [1, 1, 2, 2]; // by mastery
export const PATCH = Object.freeze({ width: 6, length: 6, lbDepth: 5 });

export default registerAbility({
  family: 'shadowkit', abilityId: 'DAR-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid) && st.banked) { st.banked = false; st.cd = COOLDOWN; st.fresh = true; } self.ready = !(st.cd > 0) && !st.banked; }, // ready during this play
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx)) return;
      if (st.fresh) st.fresh = false; else if (st.cd > 0) st.cd -= 1;
      if (!self.ready || st.banked || ctx.stats.pbuBy !== self.slot || ctx.stats.interceptor || !ctx.canGainCharge(self)) return;
      const side = sideOf(ctx, self); const latOff = (ctx.ballLat || 0) + ctx.ball.y; // the breakup spot, offense frame
      st.banked = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: side, side: 'def', type: 'Dark', ability: 'DAR-01-F', strength: STRENGTH[Math.min(1, stageOf(self.form))], lifetime: byMastery(LIFETIME, self.mastery),
        clock: 'teamDefense', width: PATCH.width, length: PATCH.length, lbDepth: PATCH.lbDepth, latHome: ctx.teamSide ? (ctx.teamSide === 'home' ? latOff : -latOff) : undefined });
      ctx.log(`${self.name} banks a Shadow Patch`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-01-F', x: +ctx.ball.x.toFixed(2), y: +ctx.ball.y.toFixed(2) });
    },
  },
});
