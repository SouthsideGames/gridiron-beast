// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, able } from './common.js';
import { E as $E } from '../../core/english.js';

export const PLAYS = 3, MAX_YARDS = 4;
export const WEAKEN = [15, 20, 25, 30]; // Strength reduction % by mastery

export default registerAbility({
  family: 'mireclaw', abilityId: 'DAR-04-F',
  initGame: () => ({ charges: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.at = { launched: false }; const st = ctx.state(self);
      if (self.team !== 'def' || !scrimmage(ctx) || st.charges < PLAYS || !able(ctx, self)) return;
      const rb = ctx.opponents(self.team).find((o) => o.slot === 'RB'); if (!rb) return; // no RB: hold the full charge
      if (!ctx.canStartSignature(self)) return; // denied: the full charge is held
      st.charges = 0; self.at.launched = true; ctx.executed(self); // the bar empties on launch, even if blocked
      const pct = byMastery(WEAKEN, self.mastery);
      ctx.log(`${$E('sim.s_ambush_tag_claws_at', { name: self.name, name2: rb.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-04-F', victim: rb.slot });
      ctx.applyStatus(rb, { id: 'weakened', strength: pct, payload: { pct }, duration: 2, source: self, abilityId: 'DAR-04-F' });
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx) || self.at?.launched) return;
      if (s.result === 'touchdown' || ctx.stats.defensiveScore) return;
      const net = ctx.stats.interceptor ? 0 : s.gain;
      if (net <= MAX_YARDS && ctx.canGainCharge(self)) st.charges = Math.min(PLAYS, st.charges + 1);
    },
  },
});
