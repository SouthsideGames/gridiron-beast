// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { FIELD } from '../../core/field.js';
import { scrimmage, byMastery } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const WAKE = Object.freeze({ minYac: 5, length: 5, lbDepth: 5, minWidth: 5, lifetime: 5, slowByMastery: [25, 28, 31, 34] });

export default registerAbility({
  family: 'pyroclast', abilityId: 'FIR-06-F',
  initGame: () => ({ pending: false, earnedOn: null }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (self.team === 'off' && st.pending && ctx.createdFor(self.mid)) {
        st.pending = false; ctx.executed(self); // the stored token is spent when its zone actually spawns
        ctx.log(`${$E('sim.s_burning_wake_erupts_ahead', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-06-F', phase: 'spawn' });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'off' || !scrimmage(ctx) || s.receiver !== self.slot || ctx.stats.catchX == null) return;
      const st = ctx.state(self);
      if (st.pending || (ctx.possession != null && st.earnedOn === ctx.possession)) return; // one pending; once per offensive possession
      const yac = Math.max(0, Math.round(ctx.ball.x - ctx.stats.catchX)); if (yac < WAKE.minYac || !ctx.canGainCharge(self)) return;
      const width = Math.min(FIELD.width, Math.max(WAKE.minWidth, yac));
      st.pending = true; st.earnedOn = ctx.possession;
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Fire', ability: 'FIR-06-F', strength: byMastery(WAKE.slowByMastery, self.mastery), lifetime: WAKE.lifetime,
        clock: 'ownerOffense', width, length: WAKE.length, lbDepth: WAKE.lbDepth, lateral: 'creator', clearsAtHalftime: false, payload: { yac } });
      ctx.log(`${$E('sim.earns_a_burning_wake_yards_wide', { name: self.name, toFixed: width.toFixed(1) })}`, { kind: 'ability_charge', by: self.slot, side: self.team, ability: 'FIR-06-F', yac, width: +width.toFixed(2) });
    },
  },
});
