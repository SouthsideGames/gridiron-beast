// DAR-01-C Shadow Pounce (shadowkit: Umbrikit / Obscurat; Balanced). Batch D.
// Contract (Dex, N7b P10): while its counter is unused, each enemy NORMAL attack against the active, able Umbrikit / Obscurat has an
// explicit 15% / 20% chance to miss entirely (one roll for the whole attack; B12 rows shadow-pounce-*); explicitly undodgeable attacks
// bypass it without a roll; the dodge ends once the counter is used; no universal evasion. The first enemy normal-action attack
// (enhanced ones included) whose ENTIRE attack misses the active, able source triggers ONE counter after the whole attack, against the same
// attacker if it is still active and alive (no replacement target): 70 / 80% normal damage by form + 0 / 5 / 10 / 15 points by mastery,
// standard evasion / type / shields, not an ordinary attack for perks (tag counter). Committed at the eligible miss; if unable at the
// reaction point the use is kept (no queue). A multi-hit qualifies only if EVERY hit misses; shield absorption is not a miss; no reaction to
// counters or its own Confused self-hit. No carry between Clashes. Mastery execution: the counter.
import { registerClashAbility } from '../t8/registry.js';
import { approvedValues } from '../../data/beast-dex.js';
import { shadowPounceDodgePct } from '../../data/approved-values.js';
import { byTier, byStage, isNormal } from './util.js';

const COUNTER = [70, 80]; const BONUS = [0, 5, 10, 15]; const DODGE = approvedValues('DAR-01-C').dodgePctByStage;

export default registerClashAbility({
  family: 'shadowkit', abilityId: 'DAR-01-C',
  initBattle: () => ({ used: false, rolled: null }),
  values: (form, tier) => ({ dodgePct: byStage(DODGE, Number(form.split(':')[1])), counterPct: byStage(COUNTER, Number(form.split(':')[1])), masteryBonusPts: byTier(BONUS, tier) }),
  hooks: {
    missCheck(api, self, info) {
      const st = self.state; const me = api.me(self);
      if (st.rolled && st.rolled.seq === info.attackSeq) return st.rolled.miss ? { miss: true, source: 'Shadow Pounce dodge', abilityId: 'DAR-01-C' } : null;
      if (st.used || !me.active || me.stunned || !isNormal(info.tag) || api.get(info.attacker).side === self.side) return null;
      const pctV = shadowPounceDodgePct(self.form, st.used); if (!pctV) return null;
      const miss = api.rng.chance(pctV / 100, self, 'Shadow Pounce dodge'); st.rolled = { seq: info.attackSeq, miss };
      return miss ? { miss: true, source: 'Shadow Pounce dodge', abilityId: 'DAR-01-C' } : null;
    },
    afterWholeAttack(api, self, info) {
      const st = self.state; const me = api.me(self); if (st.used || !me.active || me.koed) return;
      const att = api.get(info.attackerId); if (!att || att.side === self.side || !isNormal(info.tag) || !info.inAction || info.redirected) return;
      if (!info.allMissed || !info.hits.length || !info.hits.every((h) => h.targetId === self.id)) return;
      if (me.stunned) { api.cleanup(self, 'unable at the reaction point: the counter use is kept'); return; }
      if (att.koed || !att.active) { api.cleanup(self, 'the attacker is no longer active: no counter, the use is kept'); return; }
      st.used = true; const pctV = byStage(COUNTER, self.stage) + byTier(BONUS, self.tier);
      api.trigger(self, 'the whole attack missed'); api.activate(self, `counter at ${pctV}%`, { targetId: att.id }); api.executed(self);
      api.strike(self, att.id, { tag: 'counter', mult: pctV / 100, strikeKey: 'counter', label: 'Shadow Pounce' });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A dodged attack (controlled seed selection) earns the one counter; the dodge then ends',
        explain: (c) => `The opponent's attack rolls the ${c.values.dodgePct}% dodge and misses (controlled seed selection, labelled); Umbrikit counters at ${c.values.counterPct + c.values.masteryBonusPts}% and loses its dodge.`,
        setup: () => ({ a: [{ species: 'shadowkit', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 4 }, seedSearch: { until: (r) => r.log.some((e) => e.kind === 'damage' && e.abilityId === 'DAR-01-C'), max: 200, why: 'a dodge roll succeeds so the counter triggers' } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('one counter, tagged counter', d.length === 1 && d[0].tag === 'counter' && d[0].mult === (h.values.counterPct + h.values.masteryBonusPts) / 100); h.check('no dodge rolls after the counter', !h.has('roll', (e) => e.abilityId === 'DAR-01-C' && e.seq > d[0].seq)); h.executed(1); } },
      { id: 'undodgeable', kind: 'blocked', title: 'An undodgeable attack bypasses the dodge without a roll',
        explain: () => 'CONTROLLED PREREQUISITE (labelled): a reviewer probe makes the opponent\'s attacks undodgeable: no roll is made.',
        setup: () => ({ a: [{ species: 'shadowkit', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ chooseAction: (v, id) => (id === 'b0' ? { kind: 'attack', abilityId: 'TEST-UNDODGEABLE', undodgeable: true, mult: 1 } : null) }] }),
        expect: (r, h) => { h.check('no roll', !h.has('roll', (e) => e.abilityId === 'DAR-01-C')); } },
      { id: 'reserve-no-dodge', kind: 'blocked', title: 'In reserve: no dodge roll (active and able only)',
        explain: () => 'Umbrikit waits in reserve; nothing rolls for it (no attack reaches it anyway, and the dodge is for the active fighter only).',
        setup: () => ({ a: [{ species: 'tidepaw', overall: 99, sparring: true }, { species: 'shadowkit' }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no roll for a reserve', !h.has('roll', (e) => e.abilityId === 'DAR-01-C')); } },
    ],
  },
});
