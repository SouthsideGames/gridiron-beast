// DAR-02-F Night Watch (nightowl: Noctlet / Strixen). Task 8 M3 Dark batch (passive aura).
// Contract (Dex): while the safety is able, real allied non-Dark defenders inside his moving radius 4 / 5 / 6 / 7 yards (by mastery) on
// defensive scrimmage plays ignore only the Awareness reduction of a Dark ENVIRONMENTAL (base) field. No bonus outside a field, no
// status cleanse, no protection from Confused; no redundant self bonus (Noctlet and Strixen already have same-type field
// neutrality); Dark allies, already immune, gain nothing. Passive: no cooldown or charges; only while in the radius and the source is
// able; leaves no lasting status and no cross-mode payload. A Stunned / Knocked Down source disables it. It does not nullify Eclipse
// denial or other hybrid effects (only the Dark base field's Awareness term is filtered: field-effects.js a.ignoreFieldAwareness).
//
// Choices where the contract is silent (documented, minimal):
// - Kickoff coverage is not a defensive scrimmage play; a two-point try is (the aura is a passive effect, not a counted play).
// - Mastery: passive credit (once per game) the first time a protected ally actually stands in a Dark base field.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): a passive aura (no
// cooldown or charges; the contract says it does not nullify Eclipse denial): not gated.
import { registerAbility } from './registry.js';
import { byMastery, able } from './common.js';
import { E as $E } from '../../core/english.js';

export const RADIUS = [4, 5, 6, 7]; // yards by mastery

export default registerAbility({
  family: 'nightowl', abilityId: 'DAR-02-F', passive: true,
  review: { setup: ({ addField }) => { addField({ type: 'Dark', strength: 25, centerLat: 0, width: 53.3, yardFrom: 0, yardTo: 100, ownerTeam: 'away', ability: 'review-dark' }); } }, // reviewer staging: an opposing Dark base field over the whole field
  hooks: {
    tick(ctx, self) {
      if (self.team !== 'def' || ctx.kickoff) return;
      const on = able(ctx, self), R = byMastery(RADIUS, self.mastery);
      for (const b of ctx.actors) {
        if (b === self || b.team !== self.team || b.type === 'Dark') continue;
        const covered = on && ctx.dist(b, self) <= R;
        if (covered) { (b.nightWatch ||= new Set()).add(self.mid); } else if (b.nightWatch) b.nightWatch.delete(self.mid);
        b.ignoreFieldAwareness = !!b.nightWatch?.size; // read by the field effects this same tick (after the contracts' tick)
        if (covered && b.fx?.base?.Dark && !self.nwCredited) { self.nwCredited = true; ctx.executed(self, { passive: true }); ctx.log(`${$E('sim.s_night_watch_keeps_s_eyes', { name: self.name, name2: b.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-02-F', victim: b.slot }); }
      }
    },
  },
});
