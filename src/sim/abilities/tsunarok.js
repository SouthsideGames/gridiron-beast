// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { FIELD } from '../../core/field.js';
import { scrimmage, byMastery, cooldownStep } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const TSUNAMI = Object.freeze({ safetyDepth: 12, length: 5, lifetime: 5, cooldown: 5, slipByMastery: [30, 32, 34, 36] });

export default registerAbility({
  family: 'tsunarok', abilityId: 'WAT-06-F', repeatableCooldown: true,
  review: { games: 12 }, // reviewer: a genuinely rare trigger (his own interceptions (2 in 120 games, M3_RARE_ACTIVATIONS.md)); search up to 12 games
  initGame: () => ({ cd: 0 }),
  hooks: {
    playEnd(ctx, self) {
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self); cooldownStep(st, false);
      if (st.cd > 0 || ctx.stats.interceptor !== self.slot || !ctx.canGainCharge(self)) return;
      st.cd = TSUNAMI.cooldown; ctx.executed(self); // set after this play's step: the interception play is excluded
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), offField: true, type: 'Water', ability: 'WAT-06-F', strength: byMastery(TSUNAMI.slipByMastery, self.mastery),
        lifetime: TSUNAMI.lifetime, clock: 'ownerOffense', width: FIELD.width, length: TSUNAMI.length, lbDepth: TSUNAMI.safetyDepth, clearsAtHalftime: false });
      ctx.log(`${$E('sim.calls_down_a_tsunami_line', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-06-F', phase: 'earned' });
    },
  },
});
