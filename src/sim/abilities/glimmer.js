// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { approvedValues } from '../../data/beast-dex.js';
import { E as $E } from '../../core/english.js';

const LIFETIME = [3, 3, 4, 5];
const COOLDOWN = [6, 5, 4, 3]; // Dex "Recharge / frequency": creator cooldown by mastery
export const BEACON = Object.freeze({ width: 8, length: 6, lbDepth: 5 });

export default registerAbility({
  family: 'glimmer', abilityId: 'LIG-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; } },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || s.kickoff || s.twoPoint) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // the creator's offensive plays count; the creation play starts the cooldown
      st.fresh = false;
      if (st.cd === 0 && !st.banked && s.receiver === self.slot && s.firstDown && ctx.canGainCharge(self)) {
        st.banked = true; ctx.executed(self);
        ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Light', ability: 'LIG-01-F', lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'ownerOffense', width: BEACON.width, length: BEACON.length, lbDepth: BEACON.lbDepth, offenseOnly: true });
        ctx.log(`${$E('sim.banks_a_beacon_lane', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-01-F' });
      }
    },
  },
});
