// FIR-04-C Molten Brand (cinderclaw: Scorchulk; Balanced). Batch D.
// Contract (Dex): the first successful normal direct attack while ready (HP or shield damage; multi-hit once; no counters / reactions,
// misses or fully prevented zero damage) brands the target alongside the normal damage; once per Clash, cannot reapply. The brand
// lasts FOUR subsequent marked-TARGET normal turns (application turn excluded; Stunned skips count; reserve pauses; target rotation keeps
// it) or until its TWO reaction charges are consumed. When the branded opponent deals HP or shield direct-attack damage to Scorchulk
// (delayed direct attacks included; a multi-hit counts once; no DOT / counter / reaction trigger), one Fire eruption hits the branded
// opponent for 20 / 25 / 30 / 35% normal attack damage by mastery, consuming a charge; the eruption is reaction damage and triggers no
// retaliation. A lethal hit still erupts (B3 rule 3 post-KO exception), then the remaining charge disappears; both knockouts settle before
// the winner. Owner KO otherwise removes the brand. The eruption is a contested Stone Divide target. Mastery execution: the branding.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, isNormal, SPAR } from './util.js';
import { E as $E } from '../../core/english.js';

const ERUPT = [20, 25, 30, 35]; const TURNS = 4; const CHARGES = 2;
const COUNTED = new Set(['ordinary', 'special', 'followUp', 'delayed', 'commanded', 'assist']);

export default registerClashAbility({
  family: 'cinderclaw', abilityId: 'FIR-04-C',
  initBattle: () => ({ used: false, markId: null, charges: 0, turnsLeft: 0, lastSeq: null }),
  values: (form, tier) => ({ eruptionPct: byTier(ERUPT, tier), turns: TURNS, charges: CHARGES }),
  hooks: {
    attached(api, self, info) {
      const st = self.state; if (st.used || info.attacker !== self.id || !isNormal(info.tag)) return null;
      const l = info.landed.find((x) => x.id === info.target); if (!l || (l.loss <= 0 && l.poolLoss <= 0) || api.get(info.target).koed) return null;
      st.used = true; st.markId = info.target; st.charges = CHARGES; st.turnsLeft = TURNS;
      api.activate(self, `${$E('clashlog.is_branded_2_eruptions_4_of', { name: api.get(info.target).name })}`, { targetId: info.target }); api.executed(self);
      return null;
    },
    anyEndOfTurn(api, self, { id }) {
      const st = self.state; if (!st.markId || id !== st.markId) return;
      st.turnsLeft -= 1; if (st.turnsLeft <= 0) { st.markId = null; st.charges = 0; api.cleanup(self, $E('clashlog.the_brand_expires')); }
    },
    // The per-hit reaction step runs before the hit's knockouts are settled (B3 rule 6), so a lethal hit still erupts (rule 3) and both
    // knockouts settle before the winner. One eruption per attack (a multi-hit counts once).
    reaction(api, self, info) {
      const st = self.state; if (!st.markId || info.attacker !== st.markId || !COUNTED.has(info.tag)) return null;
      const seq = api.curAttack()?.seq; if (st.lastSeq === seq) return null;
      const l = info.landed.find((x) => x.id === self.id); if (!l || (l.loss <= 0 && l.poolLoss <= 0)) return null;
      st.lastSeq = seq; const me = api.me(self); const mark = st.markId; st.charges -= 1;
      api.activate(self, `${$E('clashlog.eruption_on', { name: api.get(mark).name, koed: me.koed ? $E('clashlog.lethal_hit_it_still_erupts') : '' })}`, { targetId: mark });
      if (me.koed || st.charges <= 0) { st.markId = null; st.charges = 0; }
      api.strike(self, mark, { tag: 'reaction', mult: byTier(ERUPT, self.tier) / 100, strikeKey: 'eruption', label: $E('clashlog.molten_brand_eruption'), ...(me.koed ? { exception: 'FIR-04-C' } : {}) });
      if (!st.markId) api.cleanup(self, me.koed ? $E('clashlog.the_remaining_charge_disappears_with_the') : 'both charges used');
      return null;
    },
    anyKO(api, self, { id }) { if (self.state.markId === id) { self.state.markId = null; self.state.charges = 0; } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The first connected attack brands; each damaging attack from the branded enemy erupts (two charges)',
        explain: (c) => `Scorchulk brands the opponent on its first hit; the next two attacks it takes from that opponent each trigger a ${c.values.eruptionPct}% eruption.`,
        setup: () => ({ a: [{ species: 'cinderclaw', overall: 30 }], b: [{ species: 'kindlet', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const d = h.ab('damage', (e) => e.tag === 'reaction'); h.check('two eruptions on exchanges 1 and 2', d.map((e) => e.ex).join(',') === '1,2', d.map((e) => e.ex)); h.check(`${h.values.eruptionPct}%`, d.every((e) => e.mult === h.values.eruptionPct / 100)); h.check('brand ends after two charges', h.state('a0')?.markId === null); h.executed(1); } },
      { id: 'expires', kind: 'depletion', title: 'The brand lapses after four of the target\'s normal turns',
        explain: () => 'The branded opponent is a sparring partner (labeled) that never attacks: the brand lapses after four of its turns with charges unused.',
        setup: () => ({ a: [{ species: 'cinderclaw', overall: 30 }], b: SPAR(), seed: 1, stopAt: { exchange: 5 } }),
        expect: (r, h) => { h.check('expired cleanup', h.has('cleanup', (e) => e.abilityId === 'FIR-04-C' && /expires/.test(e.text))); h.check('no eruption', h.ab('damage', (e) => e.tag === 'reaction').length === 0); } },
      { id: 'missed-no-brand', kind: 'blocked', title: 'A missed first attack does not brand (controlled miss)',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes Scorchulk\'s first attack miss; no brand; its next connected attack brands instead.',
        setup: () => ({ a: [{ species: 'cinderclaw', overall: 99 }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && v.ex === 1 && info.attacker === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { const br = h.ab('ability', (e) => /branded/.test(e.text))[0]; h.check('no brand on the miss; brand on exchange 2', br && br.ex === 2); } },
      { id: 'lethal-erupts', kind: 'sourceKO', title: 'A lethal hit on Scorchulk still erupts; both knockouts settle before the winner',
        explain: () => 'Staged: Scorchulk at 1 HP with a live brand on a 1-HP opponent. The opponent\'s lethal hit triggers the eruption (B3 rule 3), which knocks the opponent out too; the double KO goes to the seeded coin.',
        setup: () => ({ a: [{ species: 'cinderclaw', hp: 1, ability: { used: true, markId: 'b0', charges: 2, turnsLeft: 4, lastSeq: null } }], b: [{ species: 'kindlet', overall: 40, hp: 1 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('both knocked out', h.has('ko', (e) => e.target === 'a0') && h.has('ko', (e) => e.target === 'b0')); h.check('the eruption came after Scorchulk\'s KO', h.ab('damage', (e) => e.tag === 'reaction')[0]?.seq > h.ev('ko', (e) => e.target === 'a0')[0]?.seq); h.check('settled by the double-KO coin', r.by === 'coin'); } },
    ],
  },
});
