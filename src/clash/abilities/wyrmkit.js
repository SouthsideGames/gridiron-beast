// DRA-02-C Coil Renewal (wyrmkit: Wyrmlet / Ouroborn; Support). Batch C.
// Contract (Dex): every third performed normal-action attack with positive direct enemy HP damage triggers ally healing (reaction attacks
// do not progress; shield-only or missed attacks do not progress). The triggering attack is ordinary. Target: the other injured living ally
// with the lowest HP percentage, reserves included, never self (stable lineup ties). Heal 25% (Wyrmlet) / 35% (Ouroborn) of the actual HP
// damage the triggering attack dealt (a multi-hit counted once, its actual HP losses summed; shield absorption and overkill excluded),
// capped at 8 / 10 / 12 / 14% of the target's max HP by mastery; ordinary healing penalties and max HP apply. The trigger resets the count
// even if no teammate is injured. The count survives rotation, pauses in reserve, clears at the Clash end. Mastery execution: the trigger.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, injured, lowestHpPct, SPAR } from './util.js';

const SHARE = [25, 35]; const CAP = [8, 10, 12, 14]; const EVERY = 3;

export default registerClashAbility({
  family: 'wyrmkit', abilityId: 'DRA-02-C',
  initBattle: () => ({ count: 0 }),
  values: (form, tier) => ({ sharePct: byStage(SHARE, Number(form.split(':')[1])), capPct: byTier(CAP, tier), every: EVERY }),
  hooks: {
    afterWholeAttack(api, self, info) {
      if (info.attackerId !== self.id || !info.normal || !info.inAction || info.redirected) return;
      const dealt = info.hits.reduce((s, h) => s + (h.losses?.[info.targetId] ?? 0), 0); if (dealt <= 0) return;
      const st = self.state; st.count += 1; if (st.count < EVERY) return;
      st.count = 0; api.trigger(self, `third qualifying attack (${dealt} HP dealt)`); api.executed(self);
      const t = lowestHpPct(api.allies(self).filter((v) => v.id !== self.id && injured(v)));
      if (!t) { api.cleanup(self, 'no injured teammate: the count resets'); return; }
      const amount = Math.min((dealt * byStage(SHARE, self.stage)) / 100, (t.maxHp * byTier(CAP, self.tier)) / 100);
      api.activate(self, `heal ${t.name} from ${dealt} HP dealt`, { targetId: t.id });
      api.heal(self, t.id, { base: amount });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The third HP-damaging attack heals the most injured teammate by the form share, capped by mastery',
        explain: (c) => `On the third attack that damages enemy HP, the injured reserve heals ${c.values.sharePct}% of the HP that attack dealt, at most ${c.values.capPct}% of its max HP.`,
        setup: () => ({ a: [{ species: 'wyrmkit', overall: 40 }, { species: 'tidepaw', hp: 10 }], b: SPAR(), seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const hl = h.ev('heal', (e) => e.abilityId === 'DRA-02-C')[0]; const d3 = h.ev('damage', (e) => e.actor === 'a0' && e.ex === 3)[0]; h.check('heal on exchange 3 for the reserve', hl && hl.ex === 3 && hl.target === 'a1'); h.check('amount = min(share x dealt, cap x max)', hl && d3 && Math.abs(hl.exact - Math.min(d3.damage * h.values.sharePct / 100, h.line('a1').maxHp * h.values.capPct / 100)) < 1e-9); h.executed(1); } },
      { id: 'shield-only', kind: 'blocked', title: 'Shield-only attacks do not progress the count',
        explain: () => 'The enemy holds a large staged shield: no attack damages HP, so no heal triggers.',
        setup: () => ({ a: [{ species: 'wyrmkit', overall: 40 }, { species: 'tidepaw', hp: 10 }], b: [{ species: 'gravelpup', overall: 99, sparring: true, status: { id: 'shielded', strength: 999, duration: 9 } }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { h.check('no trigger, count 0', !h.has('heal', (e) => e.abilityId === 'DRA-02-C') && h.state('a0')?.count === 0); } },
      { id: 'no-injured', kind: 'cleanup', title: 'Nobody injured at the trigger: the count resets anyway',
        explain: () => 'With a healthy reserve, the third attack triggers and resets the count with no heal.',
        setup: () => ({ a: [{ species: 'wyrmkit', overall: 40 }, { species: 'tidepaw' }], b: SPAR(), seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('reset with no heal', h.has('cleanup', (e) => e.abilityId === 'DRA-02-C') && h.state('a0')?.count === 0); } },
    ],
  },
});
