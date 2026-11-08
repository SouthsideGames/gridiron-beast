// PSY-02-F Mirror Step (shadewisp: Wispira / Mirageist, CB). Task 8 M3 (self enhancement).
// Contract (Dex): while ready (no cooldown running) and able, in man coverage, his assigned receiver's first designated route cut before
// the pass is released activates it if he is within range at the cut: Wispira 3 yards, Mirageist 4. He psychically mirrors the
// receiver's new route direction without the ordinary turning slowdown, keeping his current movement speed: his velocity turns onto the
// new route direction at once, at the speed he had. Separation he already gave up still has to be made up with ordinary movement.
// Assigned man receiver only; no zone fallback. One cut resolution; no timed buff, status or attribute change. Bodies, walls,
// environmental movement penalties and existing immobilisation apply (an immobilised or engaged defender cannot activate); no teleport,
// collision bypass or guaranteed breakup. Cooldown 5 / 4 / 3 / 2 subsequent participating defensive plays by mastery after activation;
// no qualifying cut, out of range or an unable source preserves readiness. Persistence: the running cooldown is game-scope state.
// Choices where the contract is silent (minimal readings): the "first designated route cut" is the receiver reaching the first break of
// a drawn route of three or more points (the engine's planned cut; the same break the legacy Cyclone and Mind Game cards used); it is
// read at the tick after he takes it. Only that first cut qualifies on a play (a later cut never does). Two-point tries and kickoffs
// are not defensive plays here (scrimmage plays only), so they neither activate nor count the cooldown.
import { registerAbility } from './registry.js';

export const RANGE = [3, 4]; // by form
const COOLDOWN = [5, 4, 3, 2];
const stageOf = (form) => Number(String(form).split(':')[1] || 0);

export default registerAbility({
  family: 'shadewisp', abilityId: 'PSY-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.ms = { seen: false, fired: false }; },
    tick(ctx, self) {
      const ms = self.ms; if (!ms || ms.seen || self.team !== 'def' || ctx.kickoff || ctx.twoPoint) return;
      const r = ctx.manTarget(self); const pts = r?.assignment?.a === 'route' ? r.assignment.points : null;
      if (!pts || pts.length < 3 || r.wp < 2) return;
      ms.seen = true; // the first designated cut has happened: it is the only one that can qualify
      const st = ctx.state(self);
      if (st.cd > 0 || ctx.stats.passer || ctx.ball.inAir || self.stun > 0 || self.engaged || self.knockedDown) return; // not ready, released, or unable: readiness kept
      if (ctx.dist(self, r) > (RANGE[stageOf(self.form)] ?? RANGE[0])) return; // out of range: readiness kept
      const dx = pts[2][0] - pts[1][0], dy = pts[2][1] - pts[1][1], L = Math.hypot(dx, dy) || 1; const sp = Math.hypot(self.vx, self.vy);
      self.vx = (dx / L) * sp; self.vy = (dy / L) * sp; ms.fired = true;
      st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; ctx.executed(self);
      ctx.log(`${self.name} mirrors ${r.name}'s cut`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-02-F', victim: r.slot, mirror: [+(dx / L).toFixed(3), +(dy / L).toFixed(3)], speed: +sp.toFixed(2), x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.kickoff || ctx.twoPoint) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; st.fresh = false; // subsequent participating defensive plays; the activation play is not one
    },
  },
});
