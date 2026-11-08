// PSY-06-F Blink (astralux, RB; legendary). Task 8 M3 (special action; carrier pre-tackle hook, REMAINING_DECISIONS 12b).
// Contract (Dex): once per game, once he has 8 net rushing yards on the current rushing play (handoffs and pitches qualify; no
// reception or kick return), the first new tackle attempt arms and triggers a teleport if he is able (Stunned or Knocked Down prevent;
// an already-resolving tackle cannot be interrupted: this runs before the attempt is decided). Destination 5 / 6 / 7 / 8 yards by
// mastery straight toward the offense's end zone at the same lateral coordinate; a clear legal landing is required (it can reach the
// goal line and score). He and the carried football pass through player bodies; solid walls and environmental obstacles block the swept
// path. A successful relocation avoids that tackle (it is not a broken tackle); normal pursuit and later tackle attempts resume at the
// destination, and the other movement modifiers apply again there. The once-per-game use is spent only by a successful teleport; an
// illegal path or landing keeps it, the original tackle resolves and there is no further Blink attempt that play. The rushing-yard
// credit is the ordinary one from where the play ends (one authoritative credit). Use state survives halftime and overtime.
// Choices where the contract is silent (minimal readings): "8 net rushing yards" is the carrier 8 yards or more past the line of
// scrimmage; a legal landing is inside the end line and no other monster's body (0.7 yd, the engine's body separation) at the spot;
// the solid obstacles are the engine's field obstacles (Living Terrain vine clumps); no sideways search for another landing.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the teleport at
// the first new tackle attempt is the live activation (gated); once per game, no charge.
import { registerAbility } from './registry.js';

export const BLINK = Object.freeze({ threshold: 8, distance: [5, 6, 7, 8], body: 0.7, clump: 0.5 });
const segDist = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy || 1; const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2)); return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy)); };

export default registerAbility({
  family: 'astralux', abilityId: 'PSY-06-F',
  initGame: () => ({ used: false }),
  hooks: {
    playStart(ctx, self) { self.blink = { tried: false }; },
    tackleAttempt(ctx, self) {
      const st = ctx.state(self); const bk = self.blink;
      if (st.used || !bk || bk.tried || self.team !== 'off' || ctx.kickoff || ctx.stats.receiver || ctx.stats.carrier !== self.slot) return undefined;
      if (self.x < BLINK.threshold) return undefined; // the threshold is earned on this play
      if (self.stun > 0 || self.knockedDown || ['stunned', 'knockedDown'].includes(ctx.statusOf(self)?.id)) return undefined; // unable: nothing is tried
      if (!ctx.canStartSignature(self)) return undefined;
      bk.tried = true; const B = ctx.bounds;
      const from = { x: self.x, y: self.y }, to = { x: self.x + (BLINK.distance[self.mastery] ?? BLINK.distance[0]), y: self.y };
      const blocked = to.x > B.endLine - 0.5 || ctx.actors.some((a) => a !== self && Math.hypot(a.x - to.x, a.y - to.y) < BLINK.body)
        || ctx.obstacles().some((c) => segDist(c, from, to) < BLINK.clump + 0.35);
      if (blocked) { ctx.log(`${self.name}'s Blink finds no clear landing`, { kind: 'ability_blocked', by: self.slot, side: self.team, ability: 'PSY-06-F' }); return undefined; }
      self.x = to.x; st.used = true; ctx.executed(self);
      ctx.log(`${self.name} blinks ${to.x - from.x} yards upfield`, { kind: 'blink', by: self.slot, side: self.team, ability: 'PSY-06-F', fromX: +from.x.toFixed(2), fromY: +from.y.toFixed(2), x: +to.x.toFixed(2), y: +to.y.toFixed(2) });
      return { avoided: true };
    },
  },
});
