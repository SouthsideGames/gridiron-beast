// PSY-04-F Echo Landing (echolot, K). Task 8 M3 (zone, defensive, earned by a kick result).
// Contract (Dex; FIELD_CLOCKS.md): his own legal kickoff caught in the field of play and returned without a touchdown, while ready,
// banks a Psychic field for the next opposing offensive scrimmage play; a touchback, an out-of-bounds kick and a return touchdown give
// nothing. The field is created at that snap even with Echolot on the bench ("Source bench does not prevent creation"): 6 yards wide by
// 8 long, from the upcoming line into the offensive backfield, centred laterally on the opposing QB's initial position, shifted only
// enough to fit the field of play; revealed before both choices, never moved by an audible, stationary. Standard Psychic field (spec
// §11): both teams' non-Psychic monsters are pulled inward at 20% of applicable maximum speed, 1-yard centre deadband, Psychic neutral;
// ordinary collisions and bounds; no change to the kick's physics and no guaranteed return stop. Life 1 / 2 / 2 / 3 defensive
// scrimmage plays by mastery, the creation play and incomplete passes included; a kickoff consumes no life; it clears at halftime (a
// pending field carries). Cooldown: six subsequent team defensive scrimmage plays after creation, counted while the kicker is benched
// (rules.js keeps each team's scrimmage play counts); at most one pending field.
// Choices where the contract is silent (minimal readings): "ready" is no pending field and the cooldown run out; "returned without a
// touchdown" includes a return the kicking team recovers by fumble short of the end zone, and excludes one it recovers in the end zone
// (a kicking-team touchdown); live kickoffs only (an onside or free kick is a formula kick with no catch). Mastery changes life only.
import { registerAbility } from './registry.js';

export const ECHO_LANDING = Object.freeze({ width: 6, length: 8, span: [-8, 0], pull: 20, cooldown: 6 });
const LIFETIME = [1, 2, 2, 3];
const other = (side) => (side === 'home' ? 'away' : side === 'away' ? 'home' : null);

export default registerAbility({
  family: 'echolot', abilityId: 'PSY-04-F',
  initGame: () => ({ readyAt: 0 }),
  hooks: {
    playEnd(ctx, self, s) {
      if (!ctx.kickoff || self.team !== 'def' || self.slot !== 'K') return; // his own kickoff: he is the kicking unit's K
      const caughtX = ctx.stats.kickCatchX; if (caughtX == null || caughtX <= ctx.bounds.ownGoal) return; // caught in the field of play
      if (s.result === 'touchdown' || s.result === 'touchback' || (s.result === 'fumble' && ctx.ball.x <= ctx.bounds.ownGoal)) return;
      const st = ctx.state(self); const team = other(ctx.teamSide); // the kicking team (the return unit is the play's offense)
      if (ctx.teamPlays(team).def < st.readyAt) return; // cooldown still running, or the banked field not yet created
      st.readyAt = ctx.teamPlays(team).def + 1 + ECHO_LANDING.cooldown; ctx.executed(self); // created at the next opposing offensive snap, then six
      ctx.queueField({ owner: self.mid, ownerTeam: team, side: 'defense', benchOk: true, type: 'Psychic', ability: 'PSY-04-F', strength: ECHO_LANDING.pull,
        lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'ownerDefense', width: ECHO_LANDING.width, length: ECHO_LANDING.length, span: ECHO_LANDING.span, centerOn: 'QB' });
      ctx.log(`${self.name} banks an Echo Landing`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-04-F' });
    },
  },
});
