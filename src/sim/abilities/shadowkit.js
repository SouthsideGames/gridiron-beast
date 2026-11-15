// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { stageOf, byMastery, scrimmage, sideOf } from './common.js';
import { E as $E } from '../../core/english.js';

export const STRENGTH = [15, 20]; // Awareness reduction % by form
export const COOLDOWN = 5;
export const LIFETIME = [3, 3, 4, 5]; // by mastery
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
        payload: { smokeConfusion: true }, clock: 'teamDefense', width: PATCH.width, length: PATCH.length, lbDepth: PATCH.lbDepth, latHome: ctx.teamSide ? (ctx.teamSide === 'home' ? latOff : -latOff) : undefined });
      ctx.log(`${$E('sim.banks_a_shadow_patch', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-01-F', x: +ctx.ball.x.toFixed(2), y: +ctx.ball.y.toFixed(2) });
    },
  },
});
