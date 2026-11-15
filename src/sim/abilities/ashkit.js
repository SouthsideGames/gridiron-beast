// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { stageOf, scrimmage, byMastery } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const PYRE = Object.freeze({ width: 6, length: 4, charges: 3, slowByStage: [15, 20], lifetimeByMastery: [3, 4, 5, 5] });

function credited(s, slot) {
  if (s.result === 'sack') return s.tackler === slot;
  if (s.defensiveScore) return false;
  return s.tackler === slot || (s.assistBy === slot && s.assistBy !== s.tackler);
}

export default registerAbility({
  family: 'ashkit', abilityId: 'FIR-02-F',
  initGame: () => ({ bar: 0, queued: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self); self.pyre = { spawn: false };
      if (self.team === 'def' && st.queued && ctx.createdFor(self.mid)) {
        st.queued = false; st.bar = 0; self.pyre.spawn = true; ctx.executed(self);
        ctx.log(`${$E('sim.s_impact_pyre_blooms', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-02-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || !scrimmage(ctx)) return;
      const st = ctx.state(self);
      if (self.pyre?.spawn || st.queued || st.bar >= PYRE.charges) return; // the spawn play earns nothing; no charging while full
      if (!credited({ ...ctx.stats, result: s.result }, self.slot) || !ctx.canGainCharge(self)) return;
      st.bar += 1; // at most one charge a play
      ctx.log(`${$E('sim.s_impact_pyre_charges', { name: self.name, bar: st.bar, charges: PYRE.charges })}`, { kind: 'ability_charge', by: self.slot, side: self.team, ability: 'FIR-02-F', charges: st.bar });
      if (st.bar >= PYRE.charges) {
        st.queued = true;
        ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), side: 'def', type: 'Fire', ability: 'FIR-02-F', strength: PYRE.slowByStage[stageOf(self.form)] ?? PYRE.slowByStage[0],
          lifetime: byMastery(PYRE.lifetimeByMastery, self.mastery), clock: 'ownerDefense', width: PYRE.width, length: PYRE.length, depth: 'creator', lateral: 'creator' });
      }
    },
  },
});
