// DRA-03-F Hoard Flight (sablewing, CB). Task 8 M3 (special action).
// Contract (Dex): any valid fumble Sablewing recovers on a defensive scrimmage play triggers the flight, whoever forced the fumble.
// The live return ends and his team's next offense is placed at the opponent 35 (35 yards from the goal his team now attacks, the
// opponent-goal direction); a recovery already at a better spot keeps it, and an already-earned touchdown stands. The actual recovery
// is validated (the recovering monster and team from the play's own record) before the placement is applied. Every qualifying
// recovery, no cooldown or game limit; special teams excluded. The flight ends the play; the offense then lines up normally. No
// interception trigger and no lateral transfer; no temporary actor or status.
// Choices where the contract is silent (minimal readings): the engine ends a play at the recovery (there is no live fumble return), so
// the flight's placement replaces the recovery spot whenever that is worse; two-point tries are not defensive scrimmage plays here.
// The ratings note in the contract (Tackling, Coverage ceilings) is an authoring task outside the ability.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the flight at a
// validated fumble recovery is the live activation (gated at the whistle, where the recovery is known: denied, the ordinary recovery
// spot stands); no readiness or charge.
import { registerAbility } from './registry.js';

export const HOARD_FLIGHT = Object.freeze({ spot: 65 }); // the opponent 35, in the new offense's own-goal yards

export default registerAbility({
  family: 'sablewing', abilityId: 'DRA-03-F',
  review: { games: 20 }, // reviewer: fumble recoveries are rare; search up to 20 games
  hooks: {
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || ctx.kickoff || ctx.twoPoint || s.result !== 'fumble') return;
      if (ctx.stats.recoveredSlot !== self.slot || ctx.stats.recoveredTeam !== 'def') return; // validated recovery ownership
      if (!ctx.canStartSignature(self)) return; // denied: the ordinary recovery spot stands
      const recovery = 100 - Math.max(0, Math.min(100, ctx.ballOn + ctx.ball.x)); // where the recovery leaves his team's offense
      const spot = Math.max(HOARD_FLIGHT.spot, Math.round(recovery));
      ctx.turnoverSpot(Math.min(99, spot)); ctx.executed(self);
      ctx.log(`${self.name}'s Hoard Flight carries the ball to the opponent ${100 - spot}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DRA-03-F', spot, recovery: Math.round(recovery), x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
  },
});
