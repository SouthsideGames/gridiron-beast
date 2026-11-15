// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { able } from './common.js';
import { E as $E } from '../../core/english.js';

export const RADIUS = [4, 5, 6, 7]; // yards by mastery

export default registerAbility({
  family: 'nightowl', abilityId: 'DAR-02-F', passive: true,
  review: { setup: ({ addField }) => { addField({ type: 'Dark', strength: 25, centerLat: 0, width: 53.3, yardFrom: 0, yardTo: 100, ownerTeam: 'away', ability: 'review-dark' }); } }, // reviewer staging: an opposing Dark base field over the whole field
  hooks: {
    tick(ctx, self) {
      if (self.team !== 'def' || ctx.kickoff) return;
      const on = able(ctx, self);
      for (const b of ctx.actors) {
        if (b === self || b.team !== self.team || b.type === 'Dark') continue;
        const covered = on && /^(CB|S|FS)/.test(b.slot);
        if (covered) { (b.nightWatch ||= new Set()).add(self.mid); } else if (b.nightWatch) b.nightWatch.delete(self.mid);
        b.ignoreFieldAwareness = !!b.nightWatch?.size; b.ignoreDarkConfusion = !!b.nightWatch?.size; // read by the field effects this same tick (after the contracts' tick)
        if (covered && b.fx?.base?.Dark && !self.nwCredited) { self.nwCredited = true; ctx.executed(self, { passive: true }); ctx.log(`${$E('sim.s_night_watch_keeps_s_eyes', { name: self.name, name2: b.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-02-F', victim: b.slot }); }
      }
    },
  },
});
