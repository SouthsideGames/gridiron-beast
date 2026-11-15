// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, sideOf } from './common.js';
import { E as $E } from '../../core/english.js';

export const MIN_GAIN = 15, STRENGTH = 25, COOLDOWN = 6;
export const LIFETIME = [3, 4, 4, 5]; // by mastery
export const POCKET = Object.freeze({ width: 12, length: 5 });

export default registerAbility({
  family: 'nocturne', abilityId: 'DAR-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid) && st.banked) { st.banked = false; st.cd = COOLDOWN; st.fresh = true; } self.ready = !(st.cd > 0) && !st.banked; }, // ready during this play
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.fresh) st.fresh = false; else if (st.cd > 0) st.cd -= 1;
      if (!self.ready || st.banked || ctx.stats.passer !== self.slot || !s.receiver || ctx.stats.interceptor || s.gain < MIN_GAIN || !ctx.canGainCharge(self)) return;
      st.banked = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: sideOf(ctx, self), side: 'off', type: 'Dark', ability: 'DAR-05-F', strength: STRENGTH, lifetime: byMastery(LIFETIME, self.mastery),
        clock: 'teamOffense', width: POCKET.width, los: [0, POCKET.length], latFromBall: 0 });
      ctx.log(`${$E('sim.banks_a_blackout_pocket', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-05-F' });
    },
  },
});
