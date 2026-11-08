// MET-03-F Gear Grid (gearwing: Coglet; K). Task 8 M3, Metal batch (zone).
// Contract (Dex; FIELD_CLOCKS.md; N7d G3 off-field permission): after his own punt of at least 35 net yards that is not a touchback,
// he banks the next opponent scrimmage Metal field: 10 wide by 6 long at the upcoming opponent line of scrimmage plus the 5-yard LB
// depth, centred on the ball's lateral position. The Metal effect (spec §11, field-effects.js defer): a non-Metal monster's first
// changed automatic target / assignment / engagement decision inside it per play is adopted after one ordinary AI decision update
// (the prior valid action is kept until then, otherwise he holds); player inputs, physics and started routes are never delayed. No
// extra cooldown; one pending token and at most one own field (a queued token waits for the own field to expire). The punt return
// completes before the next snap's geometry. A pending token carries over halftime; the created non-legendary field clears at
// halftime. No bounce or roll is simulated; net yards are measured at the final opponent spot; the kicker keeps his legal role (he
// need not be on the field: off-field creation is approved, N7d G3). Life 1 / 2 / 2 / 3 defensive scrimmage plays (his club's)
// including the spawn play.
// Readings where the contract is silent (documented, minimal):
//   - Net yards = the final opponent spot (after any return) minus the line of scrimmage, in the kicking club's yards (special-teams.js
//     punt: a fair catch or downed ball is its spot); blocked punts and punt-return touchdowns earn nothing.
//   - The rectangle is centred on the LB reference (LOS + 5), as Beacon Lane's (rules.js fieldPlacement).
//   - The mastery execution is recorded when the token is banked (as Beacon Lane).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the punt game hook
// (a formula kick) banks the field and the field is created at the opposing snap (both out of play); not gated.
import { registerAbility } from './registry.js';
import { byMastery } from './common.js';

export const GEAR_GRID = Object.freeze({ minNet: 35, width: 10, length: 6, lbDepth: 5, life: [1, 2, 2, 3] });

export default registerAbility({
  family: 'gearwing', abilityId: 'MET-03-F',
  initGame: () => ({ banked: 0 }),
  game: {
    punt(g, self, { netYards, side }) {
      if (netYards == null || netYards < GEAR_GRID.minNet) return;
      if ((g.t8.fields?.pending || []).some((p) => p.owner === self.mid && p.ability === 'MET-03-F')) return; // one pending token
      g.queueField({ owner: self.mid, ownerTeam: side, type: 'Metal', ability: 'MET-03-F', lifetime: byMastery(GEAR_GRID.life, self.mastery), clock: 'ownerDefense', createOn: 'ownerDefense', offField: true, maxOwn: true, width: GEAR_GRID.width, length: GEAR_GRID.length, lbDepth: GEAR_GRID.lbDepth });
      g.state(self).banked += 1; g.executed(self);
      g.log(`${self.name} banks a Gear Grid (${netYards} net yards)`, { by: self.mid, ability: 'MET-03-F', netYards });
    },
  },
});
