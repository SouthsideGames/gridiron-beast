// WIN-04-F Crosswind Rescue (windlynx: Galyx). Task 8 M3 Wind batch (zone pair, pass-breakup charge).
// Contract (Dex; FIELD_CLOCKS G3): two personal pass breakups fill the bar, one credit per breakup event, at most one full bar (no
// overflow). With the bar full, his next eligible defensive scrimmage pre-play creates the lanes while he is able, before both play
// selections, and only on a snap he is on the field for (G3). Two stationary sideline rectangles, each 4 yards wide (sideline
// direction) by 7 long (end-zone direction): their outer edges meet the playable sidelines, the longitudinal band runs from the
// upcoming LOS+5 through LOS+12, ordinary boundary clipping, locked after the reveal. Non-Wind monsters of BOTH teams gain 20%
// maximum speed inside either lane (the Wind field effect: acceleration unchanged, an environmental modifier, Wind monsters neither
// benefit nor suffer). The bar empties when the pair is created; no extra cooldown; the creation play cannot recharge; while his own
// previous lanes remain the full bar is held until they expire (at most one own pair). Lifetime 1 / 2 / 2 / 3 completed defensive
// scrimmage plays by mastery, the creation play included (incompletions count). Charge survives possession, half and overtime; the
// created (non-legendary) lanes clear at halftime. Source Stunned / Knocked Down prevents creation and preserves the bar.
//
// Choices where the contract is silent (documented, minimal):
// - "Defensive scrimmage plays" for the lifetime are his team's defensive scrimmage plays (clock 'teamDefense'), whether or not he
//   takes part (only Runway and Beacon Lane pause with their creator, G2).
// - At the pre-play only a counted Stunned carried into the play (B18) can make him unable; within-play statuses clear at the whistle.
// - Two-point tries do not charge the bar.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the lanes are
// created at the pre-play (out of play: not gated); pass-breakup charges are in-play charge gains (gated).
import { registerAbility } from './registry.js';
import { byMastery } from './common.js';

export const PBUS = 2, STRENGTH = 20;
export const LIFETIME = [1, 2, 2, 3]; // by mastery
export const LANE = Object.freeze({ width: 4, from: 5, to: 12 });
const HALF = 80 / 3; // the playable half-width (core/field.js FIELD.halfWidth)

export default registerAbility({
  family: 'windlynx', abilityId: 'WIN-04-F',
  review: { games: 12 }, // reviewer: a genuinely rare trigger (two of his breakups in one game (4 of 40 games)); search up to 12 games
  initGame: () => ({ charges: 0 }),
  preSnap(api, self) {
    if (api.side !== 'def' || !api.able) return; const st = api.state(); if (st.charges < PBUS) return;
    if (api.fields().some((f) => f.owner === self.mid && f.ability === 'WIN-04-F')) return; // own lanes remain: hold the full bar
    for (const side of [-1, 1]) api.queueField({ owner: self.mid, ownerTeam: api.teamSide, type: 'Wind', ability: 'WIN-04-F', strength: STRENGTH, lifetime: byMastery(LIFETIME, self.mastery),
      clock: 'teamDefense', width: LANE.width, los: [LANE.from, LANE.to], latOff: side * HALF }); // centred on the sideline: placeRect shifts it inward, outer edge on the sideline
    st.charges = 0; st.fresh = true; api.executed();
  },
  hooks: {
    playEnd(ctx, self) {
      const st = ctx.state(self); if (self.team !== 'def' || ctx.kickoff) return;
      if (st.fresh) { st.fresh = false; return; } // the creation play cannot recharge
      if (ctx.twoPoint) return;
      if (ctx.stats.pbuBy === self.slot && !ctx.stats.interceptor && ctx.canGainCharge(self)) st.charges = Math.min(PBUS, st.charges + 1);
    },
  },
});
