// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, ready, spend, countPlay, bandInField } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const TURN = [25, 30, 35, 40]; // % by mastery
export const TRAP = Object.freeze({ width: 8, length: 6, cooldown: 3 });

export default registerAbility({
  family: 'thornback', abilityId: 'NAT-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, token: false, fresh: false }),
  hooks: {
    preSnap(pctx, self) {
      if (pctx.t8.fields?.list?.some((f) => f.owner === self.mid && f.ability === 'NAT-05-F')) return;
      const st = pctx.state(self); if (self.team !== 'off' || !st.token) return;
      const cands = pctx.defensePlay.onField.filter((slot) => pctx.slots.def[slot]?.id && pctx.slots.def[slot].type !== 'Nature');
      if (!cands.length) return; // no eligible defender: the activation stays pending
      const slot = cands[pctx.rng.int(cands.length)]; const [x, y] = pctx.defensePlay.align[slot];
      const [from, to] = bandInField(pctx.ballOn, x - TRAP.length / 2, x + TRAP.length / 2);
      pctx.queueField({ owner: self.mid, type: 'Nature', ability: 'NAT-05-F', strength: byMastery(TURN, self.mastery), lifetime: 3, clock: 'ownerOffense', width: TRAP.width, rect: { from, to, lat: y }, payload: { target: slot, targetId: pctx.slots.def[slot].id } });
      st.token = false; spend(st, TRAP.cooldown);
    },
    playStart(ctx, self) { self.bt = { done: false }; },
    tackleBroken(ctx, self) {
      const st = ctx.state(self);
      if (self.bt.done || self.team !== 'off' || !scrimmage(ctx) || ctx.stats.receiver !== self.slot || ctx.ball.holder !== self || !ready(st) || !ctx.canGainCharge(self)) return;
      self.bt.done = true; st.token = true; ctx.executed(self);
      ctx.log(`${$E('sim.earns_a_bramble_trap', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-05-F' });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
