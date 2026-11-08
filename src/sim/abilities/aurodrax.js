// DRA-06-F Sovereign Arm (aurodrax, QB; legendary; the Legendary Play Dragon's Gambit is built around him). Task 8 M3 (special action).
// Contract (Dex; spec §12; REMAINING_DECISIONS 11b): three consecutive completed passes, each gaining 12 / 10 / 8 / 6 net yards by
// mastery (YAC included), charge one protected throw. Any participating offensive scrimmage play without a qualifying completion (a run,
// a sack, an incompletion, an interception or a short completion) resets the streak. The next own released forward pass is protected,
// once per game, spent on release even with no interception: a protected pass that would otherwise be intercepted falls incomplete
// before the interception's possession and stats are final, and a spectral dragon swallows the would-be interceptor. He misses his
// team's next defensive snap against Aurodrax's team's offense (the next scrimmage play of that offense, not special teams): his slot
// stays vacant with no substitute, his status durations pause, and he returns to his ordinary formation for the play after. The
// pending absence survives an intervening possession change, halftime and overtime (rules.js absence ledger). A run, a sack or a throw
// cancelled before release keeps the charged throw (the ordinary streak rules still apply). Streak, charge, use and capture state
// survive possessions, halftime and overtime until the actual game end. Capture works whatever the defender's slot and despite Dragon
// Call protection (it is not a status). Other pass outcomes are ordinary; no automatic completion; no injury, no new status.
// Choices where the contract is silent (minimal readings): the charged throw is spent when that pass reaches its catch point (the
// engine's pre-resolution hook for the passer; the same throw as its release); a completion whose receiver fumbles it away does not
// qualify; two-point tries neither count for the streak nor serve the absence (scrimmage plays only); a trick play where someone else
// throws is a participating play without his qualifying completion (resets). The legacy first-read and fourth-quarter effects are gone.
import { registerAbility } from './registry.js';

export const SOVEREIGN = Object.freeze({ yards: [12, 10, 8, 6], streak: 3 });
const COMPLETE = (r) => !['incomplete', 'interception', 'fumble', 'throwaway', 'sack', 'touchback_return'].includes(r);

export default registerAbility({
  family: 'aurodrax', abilityId: 'DRA-06-F',
  initGame: () => ({ streak: 0, charged: false, used: false }),
  hooks: {
    playStart(ctx, self) { self.sov = { protected: false }; },
    catchPoint(ctx, self, ball) {
      const st = ctx.state(self); if (self.team !== 'off' || ctx.kickoff || ctx.stats.passer !== self.slot || !st.charged || st.used) return;
      st.charged = false; st.used = true; self.sov.protected = true; ball.t8.noInterception = true; ctx.executed(self);
      ctx.log(`${self.name}'s Sovereign Arm guards the throw`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DRA-06-F' });
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint) return;
      const st = ctx.state(self); const denied = self.sov?.protected ? ctx.ball.t8?.denied : null;
      if (denied) {
        ctx.queueAbsence({ mid: denied.mid, serveOn: ctx.teamSide, ability: 'DRA-06-F', by: self.mid });
        ctx.log(`A spectral dragon swallows ${denied.name}`, { kind: 'dragon_swallow', by: self.slot, side: self.team, ability: 'DRA-06-F', victim: denied.slot });
      }
      const qualifying = s.receiver && ctx.stats.passer === self.slot && COMPLETE(s.result) && s.gain >= (SOVEREIGN.yards[self.mastery] ?? SOVEREIGN.yards[0]);
      st.streak = qualifying ? st.streak + 1 : 0;
      if (st.streak >= SOVEREIGN.streak) { st.streak = 0; if (!st.used && !st.charged) { st.charged = true; ctx.log(`${self.name}'s Sovereign Arm is charged`, { kind: 'ability_ready', by: self.slot, side: self.team, ability: 'DRA-06-F' }); } }
    },
  },
});
