// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { scrimmage, byMastery } from './common.js';
import { E as $E } from '../../core/english.js';

export const BULWARK = Object.freeze({ width: 8, length: 4, lbDepth: -2, life: [3, 3, 4, 5], cooldown: [6, 5, 4, 3] });

export default registerAbility({
  family: 'metalhorn', abilityId: 'MET-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = byMastery(BULWARK.cooldown, self.mastery); st.fresh = true; } },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // his offensive plays count; the creation play starts the cooldown
      st.fresh = false;
      if (st.cd !== 0 || st.banked) return;
      const catchFd = s.receiver === self.slot && s.firstDown, pancake = (ctx.stats.blockers?.[self.slot]?.pancakes || 0) > 0;
      if ((!catchFd && !pancake) || !ctx.canGainCharge(self)) return;
      st.banked = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Metal', ability: 'MET-05-F', lifetime: byMastery(BULWARK.life, self.mastery), clock: 'ownerOffense', width: BULWARK.width, length: BULWARK.length, lbDepth: BULWARK.lbDepth });
      ctx.log(`${$E('sim.banks_a_bulwark_grid', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'MET-05-F', via: catchFd ? 'reception' : 'pancake' });
    },
  },
});
