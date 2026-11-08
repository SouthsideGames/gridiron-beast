// EAR-03-F Stone Charge (boulderox: Bouldrox; RB). Task 8 M3, Earth batch (special action).
// Contract (Dex, owner 10B visual): on a designed rushing carry after a secured handoff or direct snap (no receptions or returns),
// while ready, he activates when a defender is within three yards ahead of his current rushing direction. He holds his current heading
// (normal Speed and acceleration) until three yards travelled, first contact or the whistle. The first defender contacted in that
// travel meets a normal Strength-vs-Strength pushback contest; success moves that defender one yard sideways toward the nearest legal
// open side. Failure: ordinary tackle resolution; success: a normal tackle still applies if the defender is still in reach. One
// contact attempt; no automatic tackle break, fumble protection, immunity or credited bonus yards. No contact still spends readiness.
// Cooldown 5 / 4 / 3 / 2 subsequent offensive plays, spent on activation. No persistent field or status. The legacy +10 carry
// Strength is gone (the registered contract replaces the legacy effect).
//
// Choices where the contract is silent (documented, minimal):
// - "Within three yards ahead": distance <= 3 yd and within 45 degrees of his velocity direction (a cone ahead, not behind or beside).
// - "Contact" is the engine's first tackle attempt on him (tackling reach) during the commitment.
// - The contest: P(success) = logistic((carrier Strength - defender Strength) / 16), the engine's tackle-contest scale; one draw from
//   the abilities' own stream. An Earth field's displacement resistance (ctx.resist) scales the one-yard move.
// - "Nearest legal open side": first the side the defender already leans to relative to his line of travel, else the other; a side is
//   legal when the destination is in bounds, clear of every other monster (0.7 yd) and of obstacles. Neither legal: no move.
// - Two-point tries are excluded; the cooldown counts his own subsequent offensive scrimmage plays (as Beacon Lane's).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the charge at a
// defender ahead is the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { scrimmage, tier, countDown } from './earth-ice-util.js';

const COOLDOWN = [5, 4, 3, 2];
export const STONE_CHARGE = Object.freeze({ range: 3, travel: 3, cone: Math.SQRT1_2, push: 1, scale: 16 });
const hyp = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);

function finish(self) { self.sc.phase = 'done'; self.forcedAim = null; self.jukeCooldown = 0.4; }
function sideStep(ctx, self, d) {
  const u = self.sc.u, lean = Math.sign((d.x - self.x) * -u.y + (d.y - self.y) * u.x) || 1; // left of travel is +1
  const B = ctx.bounds, k = ctx.resist(d);
  for (const s of [lean, -lean]) {
    const nx = d.x + -u.y * s * STONE_CHARGE.push * k, ny = d.y + u.x * s * STONE_CHARGE.push * k;
    if (B && (ny <= B.left + 0.3 || ny >= B.right - 0.3)) continue;
    if (ctx.actors.some((o) => o !== d && o !== self && Math.hypot(o.x - nx, o.y - ny) < 0.7)) continue;
    if (ctx.obstacles().some((o) => o.live && (o.kind === 'circle' ? Math.hypot(nx - o.x, ny - o.y) < o.r + 0.35 : nx > o.x0 - 0.35 && nx < o.x1 + 0.35 && ny > o.y0 - 0.35 && ny < o.y1 + 0.35))) continue;
    return { x: nx, y: ny };
  }
  return null;
}

export default registerAbility({
  family: 'boulderox', abilityId: 'EAR-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.sc = { phase: 'idle' }; },
    tick(ctx, self) {
      const sc = self.sc; if (sc.phase === 'done') return;
      if (sc.phase === 'committed') { if (hyp(self, sc.from) >= STONE_CHARGE.travel || ctx.ball.holder !== self) finish(self); return; }
      const st = ctx.state(self);
      if (st.cd > 0 || self.team !== 'off' || !scrimmage(ctx) || !ctx.isRun || ctx.ball.holder !== self || ctx.stats.carrier !== self.slot || ctx.stats.receiver) return;
      const v = Math.hypot(self.vx, self.vy); if (v < 0.5) return;
      const u = { x: self.vx / v, y: self.vy / v };
      const ahead = ctx.opponents(self.team).some((d) => { const dx = d.x - self.x, dy = d.y - self.y, dd = Math.hypot(dx, dy); return dd <= STONE_CHARGE.range && dx * u.x + dy * u.y >= dd * STONE_CHARGE.cone; });
      if (!ahead) return;
      if (!ctx.canStartSignature(self)) { sc.phase = 'done'; return; } // denied: readiness and cooldown untouched; no retry this play
      st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; ctx.executed(self);
      Object.assign(sc, { phase: 'committed', from: { x: self.x, y: self.y }, u });
      self.forcedAim = { x: self.x + u.x * 60, y: self.y + u.y * 60 }; self.jukeCooldown = 99; // holds his heading: no cut, no juke
      ctx.log(`${self.name}'s Stone Charge: a boulder shell rolls forward`, { kind: 'ability', by: self.slot, side: self.team, ability: 'EAR-03-F', key: 'boulderShell', x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
    tackleAttempt(ctx, self, d) {
      const sc = self.sc; if (sc?.phase !== 'committed') return undefined;
      finish(self); // the commitment ends on contact; one contact attempt
      const p = 1 / (1 + Math.exp(-((self.attrs.strength - d.attrs.strength) / STONE_CHARGE.scale)));
      const won = ctx.rng.chance(p); const to = won ? sideStep(ctx, self, d) : null;
      if (to) { d.x = to.x; d.y = to.y; }
      ctx.log(won ? (to ? `${self.name} shoulders ${d.name} aside` : `${self.name} wins the push but ${d.name} has nowhere to go`) : `${d.name} holds against ${self.name}'s Stone Charge`, { kind: 'stone_charge', by: self.slot, side: self.team, victim: d.slot, won, moved: !!to, ability: 'EAR-03-F' });
      return undefined; // ordinary tackle resolution (the engine re-checks reach after a displacement)
    },
    playEnd(ctx, self, s) { if (self.team === 'off' && !s.kickoff && !s.twoPoint) countDown(ctx.state(self)); },
  },
});
