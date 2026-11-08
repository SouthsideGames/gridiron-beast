// ELE-01-F Crossed Wires (flicker: Zippit / Zaptera, WR). Task 8 M3 Electric batch (special action).
// Contract (Dex): at a ready offensive scrimmage snap while he runs a receiving route (no blocking assignments, special teams or
// two-point attempts). Target: a random eligible allied WR or TE running a route within five yards; none: readiness and his original
// route are kept. At activation the unique opposing defenders within three yards of either receiver are collected. The two receivers
// exchange their REMAINING routes: each heads toward the other route's next waypoint and follows its remaining path (no teleport); the
// quarterback's targets stay attached to the monster and use its actual new route. Each collected defender gets one Confused roll,
// Zippit 35%, Zaptera 45%: Confused (shared status, ordinary gate) lowers effective Awareness by 20% for the current play plus one
// subsequent participating play. One exchange per activation. Cooldown 5 / 4 / 3 / 2 subsequent offensive plays, spent only on an
// actual exchange. No Speed or Coverage change, forced wrong target or input delay; normal catch, coverage and route rules.
// Choices where the contract is silent (reported):
// - Distances are measured at the snap (after the engine's alignment and any pre-snap motion).
// - "Remaining route" at the snap = the drawn route after its alignment point: each receiver's new path starts where he stands and
//   continues with the other's waypoints 1..n; the route name (settle / vertical continuation) goes with the path.
// - The random choices come from the abilities' own stream of the play (replayed exactly from the play seed).
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, stageOf, scrimmage, ready, spend, countPlay, disabled, positionOf } from './nature-electric-common.js';

export const CONFUSE = [35, 45]; // % by form
export const WIRES = Object.freeze({ partnerWithin: 5, defendersWithin: 3, awarenessPct: 20, duration: 1 });

export default registerAbility({
  family: 'flicker', abilityId: 'ELE-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (self.team !== 'off' || !scrimmage(ctx) || self.assignment?.a !== 'route' || !ready(st) || disabled(ctx, self) || !ctx.canStartSignature(self)) return;
      const mates = ctx.actors.filter((a) => a !== self && a.team === 'off' && !a.temp && a.assignment?.a === 'route' && ['WR', 'TE'].includes(positionOf(a.slot)) && ctx.dist(a, self) <= WIRES.partnerWithin);
      if (!mates.length) return; // readiness and route kept
      const mate = mates[ctx.rng.int(mates.length)];
      const victims = ctx.opponents('off').filter((d) => ctx.dist(d, self) <= WIRES.defendersWithin || ctx.dist(d, mate) <= WIRES.defendersWithin);
      const mine = self.assignment, theirs = mate.assignment;
      self.assignment = { ...mine, r: theirs.r, points: [[self.x, self.y], ...theirs.points.slice(1)] }; self.wp = 0;
      mate.assignment = { ...theirs, r: mine.r, points: [[mate.x, mate.y], ...mine.points.slice(1)] }; mate.wp = 0;
      spend(st, byMastery(CD_5432, self.mastery)); ctx.executed(self);
      ctx.log(`${self.name} crosses wires with ${mate.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-01-F', partner: mate.slot, collected: victims.map((d) => d.slot), routes: { [self.slot]: self.assignment.points, [mate.slot]: mate.assignment.points } });
      const chance = (CONFUSE[stageOf(self.form)] ?? CONFUSE[0]) / 100;
      for (const d of victims) if (ctx.rng.chance(chance)) ctx.applyStatus(d, { id: 'confused', strength: WIRES.awarenessPct, duration: WIRES.duration, source: self, abilityId: 'ELE-01-F' });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
