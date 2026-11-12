// DAR-03-F Vanishing Cut (duskrunner: Duskyre). Task 8 M3 Dark batch (self enhancement).
// Contract (Dex): on his own rushing play, his first successful ordinary juke after gaining the mastery-required net rushing yards
// (5 / 4 / 3 / 2) while ready. He becomes non-targetable for THAT juked defender's NEXT tackle attempt on this play only: the
// defender cannot initiate it, but can pursue and block routes; every other defender is normal. No global invisibility or full
// stop, no other stat change, no bypass of tackle, body-collision, sideline or end-zone rules. Cooldown 5 subsequent offensive plays,
// fixed, spent at the successful juke. The opportunity expires at the whistle; no status slot; no refund if the defender never tries
// again. A disabled source cannot use it.
//
// Choices where the contract is silent (documented, minimal):
// - One "tackle attempt" of that defender is his next continuous stay within tackling reach (1.25 yd) while able to tackle: from the
//   first tick he would attempt until he is out of reach, stunned or engaged; he cannot initiate during it (engine tackleAttempt
//   `skip`: no attempt, no broken tackle). His later attempts are normal.
// - A rushing play is a designed run from scrimmage (not a kickoff return or two-point try) on which he carries; net rushing yards
//   are his current distance past the line of scrimmage. Cooldown plays are his participating offensive scrimmage plays.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the Vanishing Cut
// at the first qualifying juke is the live activation (gated: denied, that juke starts nothing and the cooldown is untouched);
// cooldown only.
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, able } from './common.js';
import { E as $E } from '../../core/english.js';

export const YARDS = [5, 4, 3, 2]; // by mastery
export const COOLDOWN = 5;
export const REACH = 1.25; // the engine's tackling reach (engine.js tryTackle)

export default registerAbility({
  family: 'duskrunner', abilityId: 'DAR-03-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.vc = { token: null, used: false }; },
    juke(ctx, self, d) {
      const st = ctx.state(self), vc = self.vc; if (!vc || vc.used || st.cd > 0) return;
      if (!ctx.isRun || !scrimmage(ctx) || self.team !== 'off' || ctx.ball.holder !== self || !able(ctx, self)) return;
      if (self.x < byMastery(YARDS, self.mastery)) return;
      if (!ctx.canStartSignature(self)) { vc.used = true; return; } // denied: this first qualifying juke starts nothing; the cooldown is untouched
      vc.used = true; vc.token = { d, live: false }; st.cd = COOLDOWN; st.fresh = true; ctx.executed(self);
      ctx.log(`${$E('sim.s_vanishing_cut_leaves_grasping_at', { name: self.name, name2: d.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DAR-03-F', victim: d.slot, x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
    tackleAttempt(ctx, self, d) {
      const tk = self.vc?.token; if (!tk || tk.d !== d || tk.spent) return undefined;
      if (!tk.live) { tk.live = true; ctx.log(`${d.name} cannot find ${self.name}`, { kind: 'ability_hit', by: self.slot, side: self.team, ability: 'DAR-03-F', victim: d.slot }); }
      return { skip: true };
    },
    tick(ctx, self) { // the excluded attempt ends when the defender leaves reach or cannot tackle
      const tk = self.vc?.token; if (!tk?.live || tk.spent) return;
      if (ctx.dist(tk.d, self) > REACH || tk.d.stun > 0 || tk.d.engaged || ctx.ball.holder !== self) tk.spent = true;
    },
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'off' || !scrimmage(ctx)) return;
      if (st.fresh) { st.fresh = false; return; } // "subsequent" offensive plays
      if (st.cd > 0) st.cd -= 1;
    },
  },
});
