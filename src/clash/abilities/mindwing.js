// PSY-01-C Mind Mend (mindwing: Psyflutter / Psyraptor; Support). Batch C.
// Contract (Dex, spec §9): on its own normal action while active, able and ready, replace the attack to donate its own HP to the lowest
// current HP-percentage injured living teammate, reserves included, excluding self (stable lineup ties). Donation = floor(10% Psyflutter /
// 15% Psyraptor + 0 / 2 / 4 / 6 points by mastery, of the SOURCE's max HP), limited to the target's missing HP and the source's HP - 1; the
// debit and the intended credit are the same whole amount; the recipient's Healing Reduced then applies and the actual gain is floored
// (prevented healing is lost, no refund). An atomic transfer, not damage or a shield-generating event: the §9 arithmetic is complete, so
// no other heal factor applies. No eligible target or affordable positive donation keeps readiness (ordinary attack). Cooldown four
// subsequent owner normal turns (paused in reserve; survives rotation). Mastery execution: the donation.
import { registerClashAbility } from '../t8/registry.js';
import { mindMendDonation } from '../t8/apportion.js';
import { byTier, byStage, injured, lowestHpPct, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const BASE = [10, 15]; const BONUS = [0, 2, 4, 6]; const COOLDOWN = 4;

export default registerClashAbility({
  family: 'mindwing', abilityId: 'PSY-01-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ basePct: byStage(BASE, Number(form.split(':')[1])), masteryBonusPts: byTier(BONUS, tier), cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null;
      const t = lowestHpPct(api.allies(self).filter((v) => v.id !== self.id && injured(v))); if (!t) return null;
      const me = api.me(self); const pctV = byStage(BASE, self.stage) + byTier(BONUS, self.tier);
      const d = mindMendDonation({ sourceHp: me.hp, sourceMaxHp: me.maxHp, pct: pctV, targetHp: t.hp, targetMaxHp: t.maxHp, healFactor: api.healFactor(t.id) });
      if (!d) return unmet({ condition: $E('clashlog.an_affordable_positive_donation'), detail: `${$E('clashlog.source_hp_missing', { hp: me.hp, name: t.name, hp2: t.maxHp - t.hp })}` });
      api.activate(self, `${$E('clashlog.donate_hp_to_gain', { donation: d.donation, name: t.name, gain: d.gain })}${d.lost ? `${$E('clashlog.lost_to_healing_reduced', { lost: d.lost })}` : ''})`, { targetId: t.id });
      api.cooldown(self, COOLDOWN); api.executed(self);
      api.setHp(self, self.id, me.hp - d.donation, `${$E('clashlog.mind_mend_donation_of', { donation: d.donation })}`);
      api.setHp(self, t.id, t.hp + d.gain, `${$E('clashlog.mind_mend_credit_of', { credit: d.credit })}${d.lost ? ` ${$E('clashlog.lost', { lost: d.lost })}` : ''}`);
      api.notifyHealed(self, t.id, d.gain, 'donation');
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Donate the floored form + mastery share of max HP to the most injured teammate; debit = credit',
        explain: (c) => `Psyflutter gives floor(${c.values.basePct + c.values.masteryBonusPts}% of its max HP) to the injured reserve; the same amount is credited.`,
        setup: () => ({ a: [{ species: 'mindwing' }, { species: 'tidepaw', hp: 10 }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const sets = h.ev('hp_set', (e) => e.abilityId === 'PSY-01-C'); const want = Math.floor(h.line('a0').maxHp * (h.values.basePct + h.values.masteryBonusPts) / 100); h.check('debit equals credit equals the floored donation', sets.length === 2 && sets[0].delta === -want && sets[1].delta === want, sets.map((e) => e.delta)); h.executed(1); } },
      { id: 'cannot-afford', kind: 'blocked', title: 'Source at 1 HP: no affordable donation, ordinary attack, readiness kept',
        explain: () => 'Psyflutter is staged at 1 HP: the donation would leave it below 1; the unmet condition is reported.',
        setup: () => ({ a: [{ species: 'mindwing', hp: 1 }, { species: 'tidepaw', hp: 10 }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /affordable/.test(u.condition))); h.check('no cooldown', !h.has('clock_start', (e) => e.clock === 'PSY-01-C')); } },
      { id: 'healing-reduced', kind: 'interaction', title: 'Healing Reduced on the recipient: the debit stands, the gain is floored, the rest is lost',
        explain: () => 'The reserve holds a staged Healing Reduced 50%: Psyflutter still pays the full donation; the reserve gains half (floored).',
        setup: () => ({ a: [{ species: 'mindwing' }, { species: 'tidepaw', hp: 10, status: { id: 'healingReduced', strength: 50, duration: 5 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const sets = h.ev('hp_set', (e) => e.abilityId === 'PSY-01-C'); h.check('gain = floor(donation / 2)', sets.length === 2 && sets[1].delta === Math.floor(-sets[0].delta * 0.5)); } },
    ],
  },
});
