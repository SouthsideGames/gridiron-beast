// LIG-03-F Guiding Halo (lumen: Lumen; QB). Task 8 M3, Light batch (aura).
// Contract (Dex): while the QB is able on an offensive scrimmage play, the first allied reception made within the aura radius (6 / 8 /
// 10 / 12 yards by mastery) of his current position while ready attempts Shielded on that receiver (never the QB himself, a construct
// or an interceptor): one football fumble save, for 2 subsequent participating plays (fixed), through the normal one-status gate. It
// improves neither catching nor tackle resistance and gives nothing on an already-failed catch. Cooldown 5 subsequent participating
// offensive plays, spent on the application attempt even when blocked; the application play does not count. The shield carries over
// halves and possessions (shared status); Clash conversion pool 15% of the recipient's maximum HP (payload). Stunned / Knocked Down
// QB prevents; the receiver must catch inside the radius; leaving it later does not remove an accepted status. A fumble save
// consumes the whole episode (engine fumbleSaved, B3).
// Readings where the contract is silent (documented, minimal):
//   - The source is Lumen at QB; two-point tries and kickoffs are not offensive scrimmage plays (common.js).
//   - "Within" is the straight-line distance at the catch, receiver at the catch spot, QB where he stands then.
//   - The Shielded strength is its Clash pool percentage (15), so equal re-applications only add duration (no refill).
//   - Aura mastery: one credit per game, when the Shielded is accepted.
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';

export const HALO = Object.freeze({ radius: [6, 8, 10, 12], cooldown: 5, duration: 2, clashPoolPct: 15 });

export default registerAbility({
  family: 'lumen', abilityId: 'LIG-03-F', passive: true, repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.halo = { fresh: false }; },
    reception(ctx, self, r) {
      if (self.team !== 'off' || self.slot !== 'QB' || r === self || r.team !== self.team || !scrimmage(ctx)) return;
      const st = ctx.state(self); if (st.cd > 0 || !able(ctx, self)) return;
      const d = ctx.dist(r, self); if (d > byMastery(HALO.radius, self.mastery)) return;
      st.cd = HALO.cooldown; self.halo.fresh = true; // spent on the attempt, even if blocked
      const res = ctx.applyStatus(r, { id: 'shielded', strength: HALO.clashPoolPct, duration: HALO.duration, source: self, abilityId: 'LIG-03-F', payload: { fumbleSaves: 1, clashPoolPct: HALO.clashPoolPct } });
      if (res.accepted) ctx.executed(self, { passive: true });
      ctx.log(`${self.name}'s Guiding Halo ${res.accepted ? 'shields' : 'cannot shield'} ${r.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-03-F', target: r.slot, accepted: res.accepted, reason: res.reason, dist: +d.toFixed(2) });
    },
    playEnd(ctx, self) {
      if (self.team !== 'off' || !scrimmage(ctx)) return; const st = ctx.state(self);
      if (st.cd > 0 && !self.halo?.fresh) st.cd -= 1; // subsequent participating offensive plays; the application play excluded
    },
  },
});
