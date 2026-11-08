// EAR-04-F Stone Cradle (stoneguard: Granigor; K). Task 8 M3, Earth batch (special action). Formula play (rules.js doPunt).
// Contract (Dex): once per game (overtime included; no refresh at halftime or possession change), automatically on the first eligible
// Granigor punt caught inside the field of play: stone cuffs trap the returner's legs, immediate whistle at the secured catch spot,
// zero return yards. Punts only, not kickoffs; normal punt distance and placement still use Kicking. Touchback, out-of-bounds punt and
// fair catch keep the use; end-zone catches follow the ordinary touchback rules; blocked and downed punts map to their ordinary result.
// Not a shared status (Earth typing and statuses do not block it). No mastery scaling.
//
// Choices where the contract is silent (documented, minimal):
// - The punt formula's own outcomes map as follows: a returned punt (including one the formula would have returned for a touchdown)
//   is a caught punt and is cradled at its catch spot; fair catches, touchbacks, coffin-corner downs and blocks keep the use.
// - The kicker need not be on a scrimmage field: he is the punting team's K (formula units, rules.js formulaUnits).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): a formula punt
// (rules.js puntReturn): the kicker is not an engine actor and no field or Cold Snap reaches it; not gated.
import { registerAbility } from './registry.js';

const spot = (y) => (y <= 50 ? `${y}` : `opponent ${100 - y}`);

export default registerAbility({
  family: 'stoneguard', abilityId: 'EAR-04-F',
  initGame: () => ({ used: false }),
  hooks: {
    puntReturn(ctx, self, res) {
      const st = ctx.state(self); if (st.used || res.catchAt == null) return undefined;
      st.used = true; ctx.executed(self);
      const ballOn = Math.max(1, Math.min(99, res.catchAt));
      return { ...res, touchdown: false, ballOn, returnYards: 0, cradled: true, ability: 'EAR-04-F',
        text: `Punt of ${res.distance} yards. ${self.name}'s Stone Cradle cuffs the returner at the catch: no return, ball at the ${spot(ballOn)}.` };
    },
  },
});
