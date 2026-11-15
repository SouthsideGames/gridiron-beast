// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { able, scrimmage } from './common.js';
import { E as $E } from '../../core/english.js';

export const HALO = Object.freeze({ radius: [6, 8, 10, 12], cooldown: 5, duration: 2, clashPoolPct: 15 });

export default registerAbility({
  family: 'lumen', abilityId: 'LIG-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.halo = { fresh: false }; },
    reception(ctx, self, r) {
      if (self.team !== 'off' || self.slot !== 'QB' || r === self || r.team !== self.team || !scrimmage(ctx)) return;
      const st = ctx.state(self); if (st.cd > 0 || !able(ctx, self)) return;
      const d = Math.hypot(r.x, r.y); // owner N8a: from the ball's line-of-scrimmage spot (the play frame's origin), not the QB
      if (!ctx.canStartSignature(self)) return; // denied: the cooldown is not spent
      st.cd = HALO.cooldown; self.halo.fresh = true; // spent on the attempt, even if blocked
      const res = ctx.applyStatus(r, { id: 'shielded', strength: HALO.clashPoolPct, duration: HALO.duration, source: self, abilityId: 'LIG-03-F', payload: { fumbleSaves: 1, clashPoolPct: HALO.clashPoolPct } });
      if (res.accepted) ctx.executed(self);
      ctx.log(`${$E('sim.s_guiding_halo', { name: self.name, accepted: res.accepted ? 'shields' : 'cannot shield', name2: r.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-03-F', target: r.slot, accepted: res.accepted, reason: res.reason, dist: +d.toFixed(2) });
    },
    playEnd(ctx, self) {
      if (self.team !== 'off' || !scrimmage(ctx)) return; const st = ctx.state(self);
      if (st.cd > 0 && !self.halo?.fresh) st.cd -= 1; // subsequent participating offensive plays; the application play excluded
    },
  },
});
