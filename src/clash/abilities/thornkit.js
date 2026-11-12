// NAT-01-C Second Spring (thornkit: Spriglet / Floracat / Sylvanyx; Support). Batch C.
// Contract (Dex, D18): unused, on an own normal turn able to act, with at least one knocked-out ally: automatically revive the EARLIEST
// knocked-out ally still down (KO order; D18), not self; otherwise the ordinary attack and the use is kept. It returns at the BACK of the
// lineup (D18) with no immediate action, at the form x mastery percentage of its max HP (Spriglet 10/12/14/16%; Floracat 15/17/19/21%;
// Sylvanyx 20/22/24/26%; round half up, at least 1). A distinct revival, NOT ordinary healing: Healing Reduced does not block it; the KO
// already cleared its status; HP only, no shield / charges / cooldown reset / use refresh. Once per separate Clash, across entries; a
// Stunned skip cannot activate it and does not spend the use; cannot activate after the Clash ended. Mastery execution: the revival.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage } from './util.js';
import { E as $E } from '../../core/english.js';

const HP = [[10, 12, 14, 16], [15, 17, 19, 21], [20, 22, 24, 26]];

export default registerClashAbility({
  family: 'thornkit', abilityId: 'NAT-01-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ revivePct: byTier(byStage(HP, Number(form.split(':')[1])), tier) }),
  hooks: {
    chooseAction(api, self) {
      if (self.state.used) return null;
      const down = api.lineup(self.side).filter((v) => v.koed && v.id !== self.id).sort((p, q) => p.koOrder - q.koOrder || p.id.localeCompare(q.id));
      if (!down.length) return null;
      const t = down[0]; const pctV = byTier(byStage(HP, self.stage), self.tier);
      self.state.used = true; api.trigger(self, `${$E('clashlog.is_the_earliest_knocked_out_ally', { name: t.name })}`, { targetId: t.id }); api.executed(self);
      api.activate(self, `${$E('clashlog.revive_at_max_hp_at_the', { name: t.name, pctV })}`, { targetId: t.id });
      api.revive(self, t.id, Math.max(1, Math.floor((t.maxHp * pctV) / 100 + 0.5)));
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The earliest knocked-out ally returns at the back of the lineup with the form x mastery HP',
        explain: (c) => `The front ally is knocked out on exchange 1; Spriglet, entering as its replacement, revives it on its next turn at ${c.values.revivePct}% max HP, placed at the back.`,
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1 }, { species: 'thornkit' }, { species: 'lumen' }], b: [{ species: 'charbun', overall: 90 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const rv = h.ev('revive', (e) => e.abilityId === 'NAT-01-C')[0]; h.check('revives a0 to the back', rv && rv.target === 'a0' && rv.lineup.join(',') === 'a1,a2,a0'); h.check(`HP = ${h.values.revivePct}% of max (half up)`, rv && rv.hp === Math.max(1, Math.floor(h.line('a0').maxHp * h.values.revivePct / 100 + 0.5))); h.executed(1); h.stages('trigger', 'activation', 'resolution'); } },
      { id: 'nobody-down', kind: 'blocked', title: 'No knocked-out ally: ordinary attack, use kept',
        explain: () => 'With every ally alive Second Spring has no target.',
        setup: () => ({ a: [{ species: 'thornkit' }, { species: 'lumen' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no revival (use kept)', h.state('a0')?.used === false && !h.has('revive')); } },
      { id: 'healing-reduced-ignored', kind: 'interaction', title: 'Revival is not healing: a Healing Reduced side cannot block it (statuses cleared at the KO anyway)',
        explain: () => 'The knocked-out ally had a staged 100% Healing Reduced before its KO; the KO cleared it, and revival is not ordinary healing, so it returns with its HP.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1, status: { id: 'healingReduced', strength: 100, duration: 9 } }, { species: 'thornkit' }], b: [{ species: 'charbun', overall: 90 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const rv = h.ev('revive')[0]; h.check('revived with HP > 0 and no status', rv && rv.hp > 0 && h.line('a0').status === null); } },
    ],
  },
});
