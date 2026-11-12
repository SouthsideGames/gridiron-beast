// FIR-05-F Heat Haze (pyrelynx: Flarynx; CB). Task 8 M3 (passive moving aura).
// Contract (Dex): active while Flarynx is on the field during live play. Opponents within 3 yards have their effective Catching
// attribute reduced by 10 / 12 / 14 / 16% by mastery (not a flat catch probability; no guaranteed drops); opposing Fire types are
// immune (explicitly approved); teammates unaffected. The effect ends outside the aura; no field remains. No cooldown; overlapping
// Heat Hazes use the strongest only.
// Choices where the contract is silent (reported):
//  - Distance is centre to centre, re-evaluated every tick; the reduction is an effective-attribute layer (src/sim/abilities/fw-util.js
//    auraLayer), so every consumer of effective Catching sees it (catching, contested catches and the engine's ball security).
//  - "Live play" is every simulated play he is on the field for, kickoffs and two-point tries included (no exclusion is stated).
//  - Mastery: a passive, one credit per game, recorded the first time the aura affects an opponent.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): a passive aura
// (Dex category Aura) with no readiness, charge or cooldown: Eclipse leaves passives running and Cold Snap denies only new
// activations; not gated.
import { registerAbility } from './registry.js';
import { auraLayer, byMastery } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const HAZE = Object.freeze({ radius: 3, pctByMastery: [10, 12, 14, 16] });

export default registerAbility({
  family: 'pyrelynx', abilityId: 'FIR-05-F', passive: true,
  hooks: {
    playStart(ctx, self) { self.haze = { seen: new Set() }; },
    tick(ctx, self) {
      const r = byMastery(HAZE.pctByMastery, self.mastery) / 100;
      for (const o of ctx.opponents(self.team)) {
        const inside = o.type !== 'Fire' && ctx.dist(o, self) <= HAZE.radius;
        auraLayer(o, 'catching', 'heatHaze', self.mid, inside ? r : 0);
        if (inside && !self.haze.seen.has(o.mid)) {
          self.haze.seen.add(o.mid); ctx.executed(self, { passive: true });
          ctx.log(`${$E('sim.is_caught_in_s_heat_haze', { name: o.name, name2: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-05-F', victim: o.slot, victimSide: o.team });
        }
      }
    },
  },
});
