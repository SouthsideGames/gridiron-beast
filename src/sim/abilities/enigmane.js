// PSY-05-F Mind Game (enigmane, TE). Task 8 M3 (targeted effect, charge bar).
// Contract (Dex; owner closeout 2-4): four participating offensive scrimmage plays without receiving the ball fill the bar (they need
// not be consecutive; a reception pauses partial progress; runs, throws to team-mates and incomplete targets qualify). On the next
// charged first designated route cut before the pass is released, if his assigned man defender is within 2 yards, that defender alone
// is targeted (no legal opportunity preserves readiness): a guaranteed psychic afterimage carries on along his original route direction
// and the defender chases it until anyone catches the football (an interception included) or the whistle, whichever is first, then
// resumes his ordinary behaviour from where he is. Existing immobilisation still constrains him (the chase is ordinary movement).
// The full bar is spent on the valid activation; no chance roll and no cooldown; the activation play cannot earn charge, the plays after
// it can; at most one full bar. Partial and full charge persist across possessions, halftime and overtime (game-scope state). Other
// defenders still cover the real Enigmane; the effect takes no status slot; the image carries no football and is no roster monster.
// Choices where the contract is silent (minimal readings; "afterimage safe-path representation and other-control priority need
// implementation audit"): the image is a point, not an actor (no body, no collision), moving from his position at the cut along the
// route's first leg at his maximum speed, held inside the field; the defender's decoy chase replaces his coverage decision (it outranks
// his assignment, never immobilisation, which the engine's movement still applies); the first designated cut is the first break of a
// drawn route of three or more points (read the tick after he takes it); "participating" is being on the field for the snap; two-point
// tries and kickoffs neither charge nor activate.
import { registerAbility } from './registry.js';

export const MIND_GAME = Object.freeze({ plays: 4, within: 2 });

export default registerAbility({
  family: 'enigmane', abilityId: 'PSY-05-F',
  initGame: () => ({ bar: 0 }),
  hooks: {
    playStart(ctx, self) { self.mg = { seen: false, image: null, chaser: null, at: 0 }; },
    tick(ctx, self) {
      const mg = self.mg; if (!mg || self.team !== 'off' || ctx.kickoff || ctx.twoPoint) return;
      if (mg.image) { // the chase: until anyone catches the football (an interception included); the whistle ends the play
        if (ctx.stats.receiver || ctx.stats.interceptor || (ctx.ball.holder && ctx.ball.holder.team === 'def')) { mg.chaser.t8Chase = null; mg.image = null; ctx.log(`${mg.chaser.name} gives up the afterimage`, { kind: 'afterimage_end', by: self.slot, side: self.team, victim: mg.chaser.slot }); return; }
        const dt = ctx.t - mg.at; mg.at = ctx.t; const B = ctx.bounds;
        mg.image.x = Math.min(B.endLine - 0.5, Math.max(B.ownEndLine + 0.5, mg.image.x + mg.ux * mg.speed * dt));
        mg.image.y = Math.min(B.right - 0.5, Math.max(B.left + 0.5, mg.image.y + mg.uy * mg.speed * dt));
        return;
      }
      if (mg.seen) return;
      const pts = self.assignment?.a === 'route' ? self.assignment.points : null; if (!pts || pts.length < 3 || self.wp < 2) return;
      mg.seen = true; // his first designated cut: the only one this play
      const st = ctx.state(self); if (st.bar < MIND_GAME.plays || ctx.stats.passer || ctx.ball.inAir) return;
      const man = ctx.opponents(self.team).find((d) => ctx.manTarget(d) === self);
      if (!man || ctx.dist(man, self) > MIND_GAME.within) return; // no legal opportunity: readiness kept
      const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], L = Math.hypot(dx, dy) || 1;
      Object.assign(mg, { image: { x: self.x, y: self.y }, chaser: man, ux: dx / L, uy: dy / L, speed: self.maxSpeed, at: ctx.t, fired: true });
      man.t8Chase = mg.image; st.bar = 0; ctx.executed(self);
      ctx.log(`${man.name} bites on ${self.name}'s afterimage`, { kind: 'afterimage', by: self.slot, side: self.team, ability: 'PSY-05-F', victim: man.slot, x: +self.x.toFixed(2), y: +self.y.toFixed(2), dir: [+(dx / L).toFixed(3), +(dy / L).toFixed(3)] });
    },
    playEnd(ctx, self, s) {
      const mg = self.mg; if (mg?.chaser) mg.chaser.t8Chase = null; // the whistle ends the chase
      if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint || mg?.fired) return; // the activation play cannot earn charge
      const st = ctx.state(self); if (s.receiver === self.slot) return; // a reception pauses partial progress
      if (st.bar < MIND_GAME.plays) st.bar += 1;
    },
  },
});
