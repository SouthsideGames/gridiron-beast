// WAT-05-F Breakwater (wavehorn: Tideram; TE). Task 8 M3 (passive moving aura on blocking plays).
// Contract (Dex; "interaction decisions open"): active only when his SNAP assignment is blocking, including block-and-release; a
// route assignment does not qualify; the snap assignment decides the whole play (no toggling on physical engagement). Opponents within
// 3 yards centre to centre lose 25 / 30 / 35 / 40% of their ENTIRE effective Strength by mastery, for every Strength-based action
// against anyone; leaving the range restores it. No type immunity. Not a shared status; no lingering status or field; no extra
// displacement reduction and no Stumbled protection. Overlapping Strength reductions: the strongest only. Each additional eligible
// overlapping Breakwater adds one yard of radius, capped at five; eligibility uses the original 3-yard radii (no chain expansion).
// Strength contests resolve with the reduced Strength; the Earth field's displacement resistance then applies normally.
// Choices where the contract is silent (reported):
//  - Blocking snap assignments: block, run_block, pull, stalk, release (the screen's block-and-release) and fake (fake, then block).
//    Kickoffs have no snap assignment and do not qualify; two-point tries do when the assignment is a block.
//  - "Overlapping Breakwater": a teammate Tideram also on an eligible blocking assignment whose 3-yard circle overlaps his (centres
//    within 6 yards), recomputed every tick.
//  - "Strongest overlapping Strength reduction only" is read among Breakwaters; a shared Weakened status is its own layer and still
//    applies (the aura layer restarts from the status's value when the status takes effect; fw-util.js auraLayer).
//  - Visual: the "water barrier" event is logged the first time each opponent is affected in a play.
//  - Mastery: a passive, one credit per game, recorded the first time the aura affects an opponent.
import { registerAbility } from './registry.js';
import { auraLayer, byMastery } from './fw-util.js';

export const BREAKWATER = Object.freeze({ radius: 3, maxRadius: 5, pctByMastery: [25, 30, 35, 40], blocking: Object.freeze(['block', 'run_block', 'pull', 'stalk', 'release', 'fake']) });

export default registerAbility({
  family: 'wavehorn', abilityId: 'WAT-05-F', passive: true,
  hooks: {
    playStart(ctx, self) { self.breakwater = { eligible: !ctx.kickoff && BREAKWATER.blocking.includes(self.assignment?.a), seen: new Set() }; },
    tick(ctx, self) {
      if (!self.breakwater.eligible) return;
      const others = ctx.actors().filter((m) => m !== self && m.team === self.team && m.family === 'wavehorn' && m.breakwater?.eligible && ctx.dist(m, self) <= 2 * BREAKWATER.radius).length;
      const R = Math.min(BREAKWATER.maxRadius, BREAKWATER.radius + others); const r = byMastery(BREAKWATER.pctByMastery, self.mastery) / 100;
      for (const o of ctx.opponents(self.team)) {
        const inside = ctx.dist(o, self) <= R;
        auraLayer(o, 'strength', 'breakwater', self.mid, inside ? r : 0, { rewrite: true });
        if (inside && !self.breakwater.seen.has(o.mid)) {
          self.breakwater.seen.add(o.mid); ctx.executed(self, { passive: true });
          ctx.log(`${self.name}'s Breakwater saps ${o.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-05-F', victim: o.slot, victimSide: o.team, radius: R });
        }
      }
    },
  },
});
