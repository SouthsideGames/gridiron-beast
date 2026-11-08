// EAR-06-F Landslide (titanolith: Titanolith; OL, legendary). Task 8 M3, Earth batch (special action).
// Contract (Dex): once per offensive possession, at the first eligible offensive scrimmage snap (run or pass). Stunned or Knocked Down
// prevents activation and keeps the use for a later snap of that possession. At the snap, the targets are the defenders aligned within
// TWO yards on the defensive side of the line (front-aligned edge rushers and blitzers included; rear off-ball defenders are not); the
// wall spans that front, outermost to outermost. Guaranteed push of 2 / 2.5 / 3 / 3.5 yards (mastery) toward the defenders' own end
// zone, with NO Strength contest; explicit displacement immunity and physical obstructions still apply. Firing spends the possession's
// use even if immunity prevents movement. Special teams and two-point attempts excluded. The wall advances through the push and
// immediately crumbles: no lingering blocker or status; normal defender actions resume. Not an Earth zone. The legacy guaranteed
// pass-block wins and +2 rush yards are gone (the registered contract replaces the legacy effect).
//
// Choices where the contract is silent (documented, minimal):
// - The wall advances at 8 yd/s (a presentation-speed constant); while it advances a target cannot move back toward the line past it
//   (each target is held at its snap depth plus the wall's advance), so the push is exactly the approved distance.
// - "Explicit displacement immunity": the Earth field's displacement resistance (ctx.resist) and an actor's `displaceImmune` flag;
//   "physical obstructions": contract obstacles (walls, snowballs) and the end line stop that target's push.
// - A possession is the game's drive id (rules.js abilityMemory); without one (labs) every play is its own possession.
// - The first eligible snap fires even when no defender is aligned within two yards (the use is spent; the wall has no targets).
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, BODY } from './earth-ice-util.js';

const PUSH = [2, 2.5, 3, 3.5];
export const LANDSLIDE = Object.freeze({ front: 2, speed: 8 });
const blocked = (ctx, x, y) => ctx.obstacles().some((o) => o.live && (o.kind === 'circle' ? Math.hypot(x - o.x, y - o.y) < o.r + BODY : x > o.x0 - BODY && x < o.x1 + BODY && y > o.y0 - BODY && y < o.y1 + BODY));

export default registerAbility({
  family: 'titanolith', abilityId: 'EAR-06-F',
  initGame: () => ({ usedDrive: null }),
  hooks: {
    playStart(ctx, self) {
      self.ls = null; const st = ctx.state(self);
      if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (ctx.drive != null && st.usedDrive === ctx.drive) return; // spent this possession
      if (disabled(ctx, self) || !ctx.canStartSignature(self)) return; // keeps the use for a later snap of this possession
      st.usedDrive = ctx.drive ?? null; ctx.executed(self);
      const targets = ctx.opponents(self.team).filter((d) => d.x > 0 && d.x <= LANDSLIDE.front).map((d) => ({ d, x0: d.x, stopped: false }));
      const ys = targets.map((p) => p.d.y);
      self.ls = { t0: ctx.t, push: tier(PUSH, self.mastery), targets };
      ctx.log(`${self.name}'s Landslide: a stone wall erupts across the front`, { kind: 'ability', by: self.slot, side: self.team, ability: 'EAR-06-F', victims: targets.map((p) => p.d.slot), wall: ys.length ? { y0: +Math.min(...ys).toFixed(2), y1: +Math.max(...ys).toFixed(2) } : null, push: self.ls.push });
    },
    tick(ctx, self) {
      const ls = self.ls; if (!ls || ls.done) return;
      const adv = Math.min(ls.push, LANDSLIDE.speed * (ctx.t - ls.t0)); const B = ctx.bounds;
      for (const p of ls.targets) {
        if (p.stopped) continue; const d = p.d;
        const k = d.displaceImmune ? 0 : ctx.resist(d); const want = Math.min(p.x0 + adv * k, B ? B.endLine - 0.3 : Infinity);
        if (d.x >= want) continue;
        if (blocked(ctx, want, d.y)) { p.stopped = true; continue; }
        d.x = want; if (d.vx < 0) d.vx = 0;
      }
      if (adv >= ls.push) { ls.done = true; ctx.log(`${self.name}'s Landslide crumbles`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'EAR-06-F' }); }
    },
  },
});
