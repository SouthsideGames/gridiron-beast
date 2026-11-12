// NAT-01-F Bloom Break (thornkit: Spriglet / Floracat / Sylvanyx, WR). Task 8 M3 Nature batch (zone).
// Contract (Dex): on a route-running passing play, his first designated route cut of at least 45 degrees while ready earns ONE
// pending activation (incidental steering does not qualify; no returns, two-point tries or block assignments). The activation waits
// (through punts, possession changes and halftime) for his next eligible on-field offensive snap (G3), where TWO recorded random,
// non-overlapping 6-wide x 4-long Nature patches spawn between the initial defensive line and the FIXED 12-yard safety reference beyond
// the upcoming LOS (used whatever the safeties do). Nature turning-rate reduction 15 / 20 / 25% by form; straight speed, acceleration
// and other Agility uses unchanged; every non-Nature monster of both teams is affected (field-effects.js). The patches last ONE completed
// play including the spawn play, all outcomes. Cooldown 5 / 4 / 3 / 2 subsequent offensive plays by mastery, starting on spawn; the
// spawn play cannot earn; no token while cooling down or pending.
// Choices where the contract is silent (reported):
// - "Designated route cut" = a drawn interior waypoint of his route (cutsTaken); the first one of at least 45 degrees qualifies (an
//   earlier, shallower cut does not use up the trigger).
// - "Initial defensive line" = the line of scrimmage (yard 0 of the band), so the band is 0..12 yards beyond the LOS; near the far end
//   line it is clipped to the playable field (always at least 10 yards there, so both patches fit).
// - Laterally each patch is uniform across the whole field width (the contract fixes only the depth band); non-overlap by rejection.
// - Placement is drawn at the spawn snap (pre-snap step), from the game's pre-snap stream, and recorded in the field list; a reload of
//   that play repeats the same draws (the stream is seeded by the play index and the monster).
// - No reroll (owner ruling N9c, 2026-11-09): the placement choices are fixed when the activation is earned, not when it spawns. The
//   draws come from the pre-snap stream of the play right after the earning play (`st.drawKey`, kept with the token and dropped at the
//   spawn), so a spawn on that very next play is what it always was, and a spawn delayed by a snap he sits out, a punt or a change of
//   possession uses the SAME draws instead of new ones. The draws are re-applied to the line of scrimmage of the spawn snap: depth is
//   a fraction of the band beyond that LOS, lateral is a fraction of the field width (it does not follow the ball). Within 12 yards
//   of the far end line the band is shorter, so the same fractions give shallower depths, and the non-overlap rejection is evaluated
//   on those rectangles (FLAGGED for confirmation: the minimal reading of "same stored choices relative to the new reference").
// - The execution (mastery event) is the earned activation.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the patches spawn
// in the pre-snap step (out of play: not gated); the token earned at the route cut is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, stageOf, scrimmage, ready, spend, countPlay, cutsTaken } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const TURN = [15, 20, 25]; // % by form
export const PATCH = Object.freeze({ width: 6, length: 4, bandFrom: 0, bandTo: 12 });
const HALF_W = 53.33 / 2;

/** Two non-overlapping patch rectangles (offense frame: yards beyond the LOS, field lateral), drawn from `rng`. */
export function drawPatches(rng, ballOn) {
  const to = Math.min(PATCH.bandTo, 110 - ballOn), from = PATCH.bandFrom;
  const one = () => { const d0 = from + rng.next() * Math.max(0, to - from - PATCH.length); const lat = -HALF_W + PATCH.width / 2 + rng.next() * (2 * HALF_W - PATCH.width); return { from: d0, to: d0 + PATCH.length, latAbs: lat }; };
  const a = one(); let b = one();
  const overlap = (p, q) => p.from < q.to && q.from < p.to && Math.abs(p.latAbs - q.latAbs) < PATCH.width;
  for (let i = 0; i < 64 && overlap(a, b); i++) b = one();
  if (overlap(a, b)) b = { ...b, latAbs: a.latAbs + (a.latAbs > 0 ? -PATCH.width : PATCH.width) }; // deterministic fallback: side by side
  return [a, b];
}

const SNAP_INDEX = new WeakMap(); // game-scope state -> the index of the offensive snap being played (in memory, within one play)

export default registerAbility({
  family: 'thornkit', abilityId: 'NAT-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, token: false, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      const st = pctx.state(self); if (self.team !== 'off') return; SNAP_INDEX.set(st, pctx.playIndex);
      if (!st.token) return;
      const strength = TURN[stageOf(self.form)] ?? TURN[0];
      const rng = st.drawKey != null && pctx.stream ? pctx.stream(st.drawKey) : pctx.rng; // the choices fixed when it was earned (N9c: never rerolled)
      for (const r of drawPatches(rng, pctx.ballOn)) pctx.queueField({ owner: self.mid, type: 'Nature', ability: 'NAT-01-F', strength, lifetime: 1, clock: 'scrimmageAny', width: PATCH.width, rect: r });
      st.token = false; delete st.drawKey; spend(st, byMastery(CD_5432, self.mastery));
    },
    playStart(ctx, self) { self.bb = { wp: 0 }; },
    tick(ctx, self) {
      const st = ctx.state(self); const cuts = cutsTaken(self, self.bb);
      if (!cuts.length || self.team !== 'off' || !scrimmage(ctx) || ctx.offensePlay.type !== 'pass' || !ready(st) || self.bb.done) return;
      if (!cuts.some((c) => c.angle >= 45) || !ctx.canGainCharge(self)) return;
      self.bb.done = true; st.token = true; { const at = SNAP_INDEX.get(st); if (at != null) st.drawKey = at + 1; } ctx.executed(self);
      ctx.log(`${$E('sim.earns_a_bloom_break', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-01-F' });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
