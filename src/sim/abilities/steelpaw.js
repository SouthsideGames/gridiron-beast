// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { able, scrimmage, byMastery } from './common.js';

export const IRON_LUNGS = Object.freeze({ radius: [3, 4, 5, 6], relief: 1 });
/** The per-monster progress ledger (game scope, shared by every source). */
export const lungsLedger = (t8) => (t8.ironLungs ||= { progress: {} });

export default registerAbility({
  family: 'steelpaw', abilityId: 'MET-02-F', passive: true,
  hooks: {
    playStart(ctx, self) {
      if (self.team !== 'def' || !scrimmage(ctx) || !/^LB/.test(self.slot) || !able(ctx, self)) return;
      const R = byMastery(IRON_LUNGS.radius, self.mastery);
      const mates = ctx.actors.filter((a) => a.team === self.team && a !== self && !a.construct && ctx.dist(a, self) <= R);
      const ally = mates.length ? mates.reduce((b, a) => (ctx.dist(a, self) < ctx.dist(b, self) - 1e-9 ? a : b)) : null; // lineup order on a tie
      const L = lungsLedger(ctx.t8); L.protection ||= {}; L.sources ||= {};
      const source = ctx.state(self);
      if (!source.lungsAlly || !(L.protection[source.lungsAlly] > 0)) {
        source.lungsAlly = ally?.mid || null;
        if (ally?.mid) { L.protection[ally.mid] = Math.max(L.protection[ally.mid] || 0, 3); L.sources[ally.mid] ||= self.mid; }
      }
      // Source remains eligible each play; protected allies are processed by the
      // shared play-start pass so distance, bench time and source substitutions work.
      L.protection[self.mid] = Math.max(L.protection[self.mid] || 0, 1); L.sources[self.mid] = self.mid;

    },
  },
});
