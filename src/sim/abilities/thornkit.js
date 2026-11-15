// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
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
      if (pctx.t8.fields?.list?.some((f) => f.owner === self.mid && f.ability === 'NAT-01-F')) return;
      const st = pctx.state(self); if (self.team !== 'off') return; SNAP_INDEX.set(st, pctx.playIndex);
      if (!st.token) return;
      const strength = TURN[stageOf(self.form)] ?? TURN[0];
      const rng = st.drawKey != null && pctx.stream ? pctx.stream(st.drawKey) : pctx.rng; // the choices fixed when it was earned (N9c: never rerolled)
      for (const [i, r] of drawPatches(rng, pctx.ballOn).entries()) pctx.queueField({ placementOffset: i ? 3.5 : -3.5, owner: self.mid, type: 'Nature', ability: 'NAT-01-F', strength, lifetime: 3, clock: 'ownerOffense', width: PATCH.width, rect: r });
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
