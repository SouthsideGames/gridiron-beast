// EAR-05-C Stone Divide (terrabull: Terrabull; Disruptor). Batch D.
// Contract (Dex): once per Clash, with the source ACTIVE and not Stunned, automatically intercept the first eligible ENEMY extra strike
// aimed at any living teammate (self or reserve): Twin Thunder bolts, Victory Surge, Arc Rebound, Riptide Pursuit and attack-based
// retaliation. It cancels ONE strike and its attached effects BEFORE evasion or damage (no dodge or shield of the target is consumed);
// the intercepted strike counts as launched and the attacker's resources stay spent; later strikes resolve normally. Ordinary attacks,
// normal-action specials, delayed meteors / fissures, DOT and transferred damage are unaffected. No reflection, bonus attack, HP pool or
// attribute; no mastery scaling; rotation / revival do not restore it. The classification comes from the ability-kind table (never from
// an animation). "Enemy" is the strike's ability owner (a commanded strike belongs to its commander).
// AWAITING RULING ('stone-divide-scope'): the six contested strikes (Bank Shot ricochet, Refraction secondary, Canopy Assist, Astral
// commanded attacks, Molten Brand eruption, Rubble Reprisal) are reported awaiting ruling and pass through in normal gameplay; the use is
// kept. Mastery execution: the interception.
import { registerClashAbility } from '../t8/registry.js';
import { strikeClass } from '../t8/ability-kinds.js';

export default registerClashAbility({
  family: 'terrabull', abilityId: 'EAR-05-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    intercept(api, self, info) {
      const st = self.state; const me = api.me(self); if (st.used || !me.active || me.koed || me.stunned) return null;
      const owner = api.get(info.owner ?? info.attacker); if (!owner || owner.side === self.side) return null;
      const t = api.get(info.target); if (!t || t.side !== self.side) return null;
      const c = strikeClass(info); if (!c.extra) return null;
      if (c.contested) {
        if (!api.provisional(self, 'stone-divide-scope', `${info.abilityId} ${info.strikeKey || info.tag} (${c.contested})`)) return null;
        if (!api.flags.stoneDivide[c.contested]) return null;
      }
      st.used = true; api.activate(self, `wall: ${info.abilityId || info.tag} is intercepted`, { targetId: info.attacker }); api.executed(self);
      return { intercepted: true, abilityId: 'EAR-05-C' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'An enemy counter (Shadow Pounce, an uncontested extra strike) is intercepted before evasion and damage',
        explain: () => 'Staged (controlled prerequisite): Terrabull\'s ordinary attack misses Umbrikit (reviewer miss), so Umbrikit counters; the counter is an extra strike and the wall cancels it before any roll or damage.',
        setup: () => ({ a: [{ species: 'terrabull' }], b: [{ species: 'shadowkit', sparring: true }], seed: 1, stopAt: { exchange: 1 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && info.attacker === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('the counter is intercepted', h.has('intercepted', (e) => e.abilityId === 'EAR-05-C')); h.check('no counter damage', !h.has('damage', (e) => e.actor === 'b0')); h.check('the counter use is spent (launched)', h.state('b0')?.used === true); h.executed(1); } },
      { id: 'ordinary-unaffected', kind: 'blocked', title: 'Ordinary attacks and normal-action specials are never intercepted',
        explain: () => 'The opponent\'s ordinary attacks pass through: nothing to intercept.',
        setup: () => ({ a: [{ species: 'terrabull', overall: 99 }], b: [{ species: 'charbun' }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no interception (use kept)', !h.has('intercepted') && h.state('a0')?.used === false); } },
      { id: 'reserve-source', kind: 'blocked', title: 'Terrabull in reserve: no interception (the source must be active)',
        explain: () => 'Terrabull waits in reserve while its active ally is countered (controlled miss, labelled): the wall needs an active, able source, so nothing is intercepted.',
        setup: () => ({ a: [{ species: 'tidepaw' }, { species: 'terrabull' }], b: [{ species: 'shadowkit', sparring: true }], seed: 1, stopAt: { exchange: 1 }, probes: [{ missCheck: (v, id, info) => (id === 'b0' && info.attacker === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('no interception from reserve (use kept)', !h.has('intercepted') && h.state('a1')?.used === false); } },
      { id: 'contested-awaiting-active', kind: 'interaction', title: 'Active Terrabull intercepts the attack-triggered Molten Brand eruption',
        explain: () => 'Staged (controlled prerequisite): Scorchulk holds a live brand on Terrabull; Terrabull\'s hit makes it erupt. Whether a mark-triggered eruption is interceptable awaits a ruling: reported, it passes.',
        setup: () => ({ a: [{ species: 'terrabull' }], b: [{ species: 'cinderclaw', overall: 99, sparring: true, ability: { used: true, markId: 'a0', charges: 2, turnsLeft: 4, lastSeq: null } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.rulingUsed('stone-divide-scope'); h.check('eruption intercepted', h.has('intercepted', (e) => e.abilityId === 'EAR-05-C')); h.check('use spent', h.state('a0')?.used === true); } },
      { id: 'contested-provisional', kind: 'interaction', title: 'APPROVED N9d (plan list: intercepted): the Molten Brand eruption is walled',
        explain: () => 'Approved reading T8_FLAGS.stoneDivide.nonAttackTriggeredReactions = true. Approved by owner N9d.',
        setup: () => ({ a: [{ species: 'terrabull' }], b: [{ species: 'cinderclaw', overall: 99, sparring: true, ability: { used: true, markId: 'a0', charges: 2, turnsLeft: 4, lastSeq: null } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.rulingUsed('stone-divide-scope'); h.check('intercepted', h.has('intercepted', (e) => e.abilityId === 'EAR-05-C')); } },
    ],
  },
});
