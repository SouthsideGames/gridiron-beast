// ELE-05-F Chain Break (joltrex: Joltrex, DL). Task 8 M3 Electric batch (targeted effect).
// Contract (Dex): his first successful ordinary block shed while ready, on a run or a pass play. Target: the nearest DIFFERENT offensive
// monster currently engaged in blocking within three yards of him at shed time, the escaped blocker excluded; equal distance: stable
// lineup order; no eligible target: readiness is kept for a later successful shed. The arc attempts Stumbled (shared gate): 40% of
// current movement speed lost, normal reacceleration, no maximum-Speed or other attribute reduction. The target's existing block
// continues normally (no automatic second shed); a stationary blocker loses no speed at once; no hidden Strength or Blocking penalty.
// One target per activation. Cooldown 5 / 4 / 3 / 2 subsequent defensive plays, starting when the arc fires; a blocked application
// (another status in the slot) still spends it. The accepted Stumbled clears at the whistle.
// Engine capabilities used (M3 hooks): the `shed` hook and the status attempt's `keepEngagement` exception (an ordinary Stumbled ends
// an engagement; this contract keeps the target's block).
// Choices where the contract is silent (reported): "stable lineup order" = the depth-chart slot order (OL before TE before backs as
// listed in personnel.js); Stormguard's summoned guards are not monsters and are never targets; kickoff blocks and two-point tries are not trigger plays (batch reading).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the arc at a
// successful shed is the live activation (gated: a denied start keeps readiness for a later shed); cooldown only.
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, scrimmage, ready, spend, countPlay, slotOrder } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const ARC = Object.freeze({ within: 3 });

export default registerAbility({
  family: 'joltrex', abilityId: 'ELE-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    shed(ctx, self, escaped) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx) || !ready(st)) return;
      const tgt = ctx.actors.filter((a) => a.team !== self.team && a !== escaped && !a.temp && a.engaged && a.engaged.team === self.team && ctx.dist(a, self) <= ARC.within)
        .sort((p, q) => ctx.dist(p, self) - ctx.dist(q, self) || slotOrder(p.slot) - slotOrder(q.slot))[0];
      if (!tgt) return; // readiness kept for a later shed
      if (!ctx.canStartSignature(self)) return; // denied: readiness kept for a later shed (nothing spent)
      spend(st, byMastery(CD_5432, self.mastery)); ctx.executed(self);
      ctx.log(`${$E('sim.s_chain_break_arcs_to', { name: self.name, name2: tgt.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-05-F', victim: tgt.slot });
      ctx.applyStatus(tgt, { id: 'stumbled', strength: 1, duration: 0, restOfPlay: true, source: self, abilityId: 'ELE-05-F', keepEngagement: true });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'def'); },
  },
});
