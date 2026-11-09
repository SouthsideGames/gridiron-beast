// DAR-04-C Ambush (mireclaw: Murklaw; Striker). Batch A.
// Contract (Dex): the first ACTIVE entry per Clash (the opening lineup included) arms one bonus on the next performed normal attack:
// 130 / 145 / 160 / 175% by mastery if Murklaw's HP is still at least 75% of max at action commit; otherwise an ordinary attack and
// the armed state is preserved until eligible or the Clash ends. One empowered attempt per Clash, spent once fired even if evaded;
// rotation / revival do not reset it. The armed state pauses in reserve. "Boost is special attack, no ordinary-only archetype stacking"
// (explicit: tag special, no perk question). Normal evasion / defence. Mastery execution: the boosted attack.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const POWER = [130, 145, 160, 175]; const HP_MIN = 75;

export default registerClashAbility({
  family: 'mireclaw', abilityId: 'DAR-04-C',
  initBattle: () => ({ entered: false, armed: false, spent: false }),
  values: (form, tier) => ({ powerPct: byTier(POWER, tier), hpMinPct: HP_MIN }),
  hooks: {
    onEntry(api, self) { const st = self.state; if (st.entered) return; st.entered = true; st.armed = true; api.trigger(self, 'first active entry of the Clash: the next performed normal attack is armed'); },
    chooseAction(api, self, { foeId }) {
      const st = self.state; if (!st.armed || st.spent || !foeId) return null;
      const me = api.me(self);
      if (me.hp * 100 < HP_MIN * me.maxHp) return unmet({ condition: `HP at least ${HP_MIN}% at commit`, detail: `${me.hp} / ${me.maxHp}: ordinary attack, the ambush stays armed` });
      st.armed = false; st.spent = true;
      api.activate(self, `ambush at ${byTier(POWER, self.tier)}%`, { targetId: foeId }); api.executed(self);
      return { kind: 'attack', tag: 'special', mult: byTier(POWER, self.tier) / 100, strikeKey: 'boost', label: 'Ambush' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Opening entry arms; the first attack at full HP is the boosted special',
        explain: (c) => `Murklaw's opening entry arms Ambush; its first attack deals ${c.values.powerPct}% as a special (no ordinary-only perks).`,
        setup: () => ({ a: [{ species: 'mireclaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('one boosted special on exchange 1', d.length === 1 && d[0].ex === 1 && d[0].tag === 'special' && d[0].mult === h.values.powerPct / 100); h.check('exchange 2 ordinary', h.has('damage', (e) => e.actor === 'a0' && e.ex === 2 && e.tag === 'ordinary')); h.stages('trigger', 'activation', 'resolution'); h.executed(1); } },
      { id: 'low-hp-preserves', kind: 'blocked', title: 'Below 75% HP at commit: an ordinary attack and the ambush stays armed',
        explain: () => 'Murklaw starts at about half HP (staged): the HP condition fails at commit, it attacks normally and remains armed.',
        setup: () => ({ a: [{ species: 'mireclaw', hp: 30 }], b: [{ species: 'gravelpup', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => /HP at least 75/.test(u.condition))); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('still armed', h.state('a0')?.armed === true); } },
      { id: 'reserve-entry', kind: 'rotation', title: 'A reserve Murklaw is armed by its first active entry (KO replacement)',
        explain: () => 'Murklaw starts in reserve; when the front monster is knocked out it enters (its first active entry) and its next attack is the ambush.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1 }, { species: 'mireclaw' }], b: [{ species: 'voltfang', overall: 90 }], seed: 2, stopAt: { exchange: 3 } }),
        expect: (r, h) => { const en = h.ev('enter', (e) => e.actor === 'a1')[0]; const d = h.ab('damage')[0]; h.check('armed on entry, fired on its first turn', en && d && d.seq > en.seq && d.actor === 'a1'); } },
      { id: 'spent-once', kind: 'depletion', title: 'Fired once: re-entry does not re-arm',
        explain: () => 'After the ambush fires, a later rotation back in does not arm a second one.',
        setup: () => ({ a: [{ species: 'mireclaw' }, { species: 'tidepaw' }], b: [{ species: 'gravelpup', overall: 99 }], seed: 3, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: { 1: 'a1', 5: 'a0', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' } } }, stopAt: { exchange: 8 } }),
        expect: (r, h) => { h.check('exactly one boosted attack', h.ab('damage').length === 1); h.check('state spent', h.state('a0')?.spent === true && h.state('a0')?.armed === false); } },
    ],
  },
});
