// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, stageOf, scrimmage, ready, spend, countPlay, bandInField } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const STUN = [20, 30]; // % by form
export const STRIP = Object.freeze({ width: 8, from: 0, to: 5 });

export default registerAbility({
  family: 'voltfin', abilityId: 'ELE-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, token: false, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      if (pctx.t8.fields?.list?.some((f) => f.owner === self.mid && f.ability === 'ELE-02-F')) return;
      const st = pctx.state(self); if (self.team !== 'off' || !st.token) return;
      const [from, to] = bandInField(pctx.ballOn, STRIP.from, STRIP.to);
      pctx.queueField({ owner: self.mid, type: 'Electric', ability: 'ELE-02-F', strength: STUN[stageOf(self.form)] ?? STUN[0], lifetime: 3, clock: 'ownerOffense', width: STRIP.width, rect: { from, to, lat: pctx.offensePlay.align[self.slot]?.[1] ?? 0 } });
      st.token = false; spend(st, byMastery(CD_5432, self.mastery));
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self);
      if (self.team === 'off' && scrimmage(ctx) && ready(st) && s.carrier === self.slot && !s.receiver && s.firstDown && s.result !== 'touchdown' && ctx.canGainCharge(self)) {
        st.token = true; ctx.executed(self);
        ctx.log(`${$E('sim.charges_a_charge_strip', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-02-F' });
      }
      countPlay(ctx, self, st, 'off');
    },
  },
});
