// WAT-01-F Splashdown (tidepaw: Aquip / Aquarrel / Abyssin; CB). Task 8 M3 (zone created at the deflection spot).
// Contract (Dex; B20): a personally credited pass breakup while ready (interceptions never) automatically creates a Water rectangle
// centred on the deflection spot, 6 yards wide by 4 long, fixed field alignment. Inside, a distinct sharp cut or sudden stop rolls
// the slip chance (never per frame): Aquip 20/22/24/26%, Aquarrel 25/27/29/31%, Abyssin 30/32/34/36% by mastery; a slip attempts
// Stumbled through the shared gate (40% of current speed, maximum speed unchanged; no Knocked Down), at most one successful slip per
// monster per play, cleared at the whistle (the Water field effect, src/sim/t8/field-effects.js). Water types immune; both teams
// otherwise. Lifetime: the creation play excluded, two subsequent completed football plays regardless of possession or the creator's
// participation; clears at halftime and at the actual game end. Recharge: three subsequent defensive plays (trigger play 1,
// unavailable 2-4, ready 5), recharging even while he is benched (no seconds timer).
// The field is created at the whistle (rules.js, after the field clocks, so the creation play is excluded); the benched recharge reads
// the game's per-team scrimmage play counters (engine.js ctx.teamPlays, "M3 hook").
// Choices where the contract is silent (reported):
//  - "Completed football plays" for the lifetime are scrimmage plays of either team (kickoffs and formula special teams carry no
//    fields in the engine and are not counted, as G1 rules for the other three legendary/zone clocks).
//  - "Defensive plays" for the recharge are his team's defensive scrimmage plays (not kickoffs, B20; not two-point tries); a pass
//    breakup on a two-point try does not trigger.
//  - The deflection spot is where the incomplete ball came down (the engine's catch point).
//  - A breakup inside an Eclipse cannot start it (spec §11; nothing is spent).
import { registerAbility } from './registry.js';
import { stageOf, scrimmage, byMastery } from './fw-util.js';

export const SPLASH = Object.freeze({ width: 6, length: 4, lifetime: 2, cooldown: 3, slipByStage: [[20, 22, 24, 26], [25, 27, 29, 31], [30, 32, 34, 36]] });

/** Bring the cooldown up to date with the team's defensive scrimmage plays since it was last read (he may have been benched). */
function sync(ctx, self, st) {
  const side = ctx.sideOf(self); if (!side) return;
  const n = ctx.teamPlays(side).def; if (st.cd > 0) st.cd = Math.max(0, st.cd - Math.max(0, n - (st.seen ?? n))); st.seen = n;
}

export default registerAbility({
  family: 'tidepaw', abilityId: 'WAT-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, seen: null }),
  hooks: {
    playStart(ctx, self) { if (scrimmage(ctx)) sync(ctx, self, ctx.state(self)); },
    playEnd(ctx, self, s) {
      if (!scrimmage(ctx)) return;
      const st = ctx.state(self); sync(ctx, self, st); // this play included
      const S = ctx.stats;
      if (self.team !== 'def' || st.cd > 0 || s.result !== 'incomplete' || S.pbuBy !== self.slot || S.interceptor) return;
      if (!ctx.canStartSignature(self)) return;
      st.cd = SPLASH.cooldown; ctx.executed(self);
      const x = ctx.ball.x, y = ctx.ball.y;
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), offField: true, immediate: { x, y }, type: 'Water', ability: 'WAT-01-F',
        strength: byMastery(SPLASH.slipByStage[stageOf(self.form)] || SPLASH.slipByStage[0], self.mastery), lifetime: SPLASH.lifetime, clock: 'scrimmageAny', width: SPLASH.width, length: SPLASH.length });
      ctx.log(`${self.name}'s Splashdown soaks the spot`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-01-F', x: +x.toFixed(2), y: +y.toFixed(2) });
    },
  },
});
