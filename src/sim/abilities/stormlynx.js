// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, spend, countPlay, bandInField } from './nature-electric-common.js';

export const STATIC = Object.freeze({ width: 12, from: 5, to: 12, stun: 15 });

export default registerAbility({
  family: 'stormlynx', abilityId: 'ELE-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      if (pctx.t8.fields?.list?.some((f) => f.owner === self.mid && f.ability === 'ELE-04-F')) return;
      const st = pctx.state(self); if (self.team !== 'def' || st.cd > 0) return;
      const [from, to] = bandInField(pctx.ballOn, STATIC.from, STATIC.to);
      pctx.queueField({ owner: self.mid, side: 'defense', type: 'Electric', ability: 'ELE-04-F', strength: STATIC.stun, lifetime: 3, clock: 'ownerDefense', width: STATIC.width, rect: { from, to, lat: pctx.defensePlay.align[self.slot]?.[1] ?? 0 } });
      spend(st, byMastery(CD_5432, self.mastery)); pctx.executed(self);
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'def'); },
  },
});
