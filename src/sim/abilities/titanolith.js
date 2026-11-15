// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, BODY } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const PUSH = [5, 5, 5, 5];
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
      ctx.log(`${$E('sim.s_landslide_a_stone_wall_erupts', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'EAR-06-F', victims: targets.map((p) => p.d.slot), wall: ys.length ? { y0: +Math.min(...ys).toFixed(2), y1: +Math.max(...ys).toFixed(2) } : null, push: self.ls.push });
    },
    tick(ctx, self) {
      const ls = self.ls; if (!ls || ls.done) return;
      const adv = Math.min(ls.push, LANDSLIDE.speed * (ctx.t - ls.t0)); const B = ctx.bounds;
      for (const p of ls.targets) {
        if (p.stopped) continue; const d = p.d;
        const k = d.displaceImmune ? 0 : ctx.resist(d); const want = Math.min(p.x0 + Math.max(0, 5 - p.x0) * (adv / ls.push) * k, B ? B.endLine - 0.3 : Infinity);
        if (d.x >= want) continue;
        if (blocked(ctx, want, d.y)) { p.stopped = true; continue; }
        d.x = want; if (d.vx < 0) d.vx = 0;
      }
      if (adv >= ls.push) { ls.done = true; ctx.log(`${$E('sim.s_landslide_crumbles', { name: self.name })}`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'EAR-06-F' }); }
    },
  },
});
