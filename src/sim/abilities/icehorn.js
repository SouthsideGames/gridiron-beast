// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { tier, countDown, opponentSide } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const COOLDOWN = [5, 4, 3, 2];
export const PERMAFROST = Object.freeze({ width: 10, length: 6, braking: 30, lifetime: 3 });

export default registerAbility({
  family: 'icehorn', abilityId: 'ICE-04-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, pending: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (st.pending && ctx.createdFor(self.mid)) {
        st.pending = false; st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; st.creation = true;
        ctx.log(`${$E('sim.stamps_permafrost_spreads_across_the_backfield', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ICE-04-F' });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || s.kickoff || s.twoPoint) return;
      const st = ctx.state(self); const creation = st.creation; st.creation = false; countDown(st);
      if (creation || st.cd > 0 || st.pending) return; // not during the creation play; only while ready
      const S = ctx.stats, mine = S.tackler === self.slot || S.assistBy === self.slot;
      const sack = s.result === 'sack' && S.tackler === self.slot, tfl = ['tackle', 'safety'].includes(s.result) && mine && s.gain < 0;
      if (!(sack || tfl) || !ctx.canGainCharge(self)) return;
      st.pending = true; ctx.executed(self);
      ctx.queueField({ owner: self.mid, ownerTeam: opponentSide(ctx.teamSide), side: 'def', type: 'Ice', ability: 'ICE-04-F', strength: PERMAFROST.braking, lifetime: PERMAFROST.lifetime, clock: 'ownerDefense', place: 'backfield', width: PERMAFROST.width, length: PERMAFROST.length });
      ctx.log(`${$E('sim.banks_a_permafrost', { name: self.name })}`, { kind: 'ability_ready', by: self.slot, side: self.team, ability: 'ICE-04-F' });
    },
  },
});
