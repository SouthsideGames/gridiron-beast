// EAR-01-C Emergency Cover (pebble: Pebblit / Cobblon / Orogon; Tank). Batch D.
// Contract (Dex, D15): once per Clash, a living RESERVE Pebblit (not Stunned; never protecting itself) intervenes when a connected eligible
// direct hit would knock out its ACTIVE teammate after defences: the original target's explicit misses first; lethality is predicted
// before any damage or survival ability (B3 8b). Eligible: direct normal / special / follow-up hits; DOT, transferred damage and retaliation
// excluded. The DAMAGE ONLY is redirected to the reserve source and recalculated against its own type, shield and defences, with NO
// active-only Tank guard in reserve; no second evasion or attacker-resource consumption; the source can be knocked out. No position change
// (6B). Only the triggering hit: remaining multi-hit strikes and the original attached effects stay on the original target (8B). With
// several eligible rescuers, the first in lineup order (D15; the engine asks reserves in lineup order). No heal or guaranteed survival.
// No mastery scaling. Mastery execution: the cover.
import { registerClashAbility } from '../t8/registry.js';

const ELIGIBLE = new Set(['ordinary', 'special', 'followUp']);

export default registerClashAbility({
  family: 'pebble', abilityId: 'EAR-01-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    lethalRedirect(api, self, info) {
      const st = self.state; const me = api.me(self); if (st.used || me.active || me.koed || me.stunned) return null;
      const t = api.get(info.target); if (!t || t.side !== self.side || !t.active || t.id === self.id || !info.lethal || !ELIGIBLE.has(info.tag)) return null;
      const owner = api.get(api.curAttack()?.owner ?? info.attacker); if (!owner || owner.side === self.side) return null;
      st.used = true; api.trigger(self, `${t.name} would be knocked out (${info.predicted} predicted)`, { targetId: t.id }); api.executed(self);
      return { to: self.id, abilityId: 'EAR-01-C' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A lethal hit on the active ally is redirected to the reserve Pebblit (no Tank guard in reserve)',
        explain: () => 'The active ally is staged at 1 HP; the opponent\'s lethal hit is taken by Pebblit from reserve instead, against its own defences without the Tank guard; nobody changes position.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1, sparring: true }, { species: 'pebble', overall: 99 }], b: [{ species: 'charbun', overall: 70 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const red = h.ev('redirect', (e) => e.abilityId === 'EAR-01-C')[0]; const d = h.ev('damage', (e) => e.target === 'a1')[0]; h.check('redirected to a1', red && red.actor === 'a1' && d); h.check('no Tank guard in reserve', d && d.guard === false); h.check('the ally survives, positions unchanged', h.line('a0').hp === 1 && h.line('a0').active); h.executed(1); } },
      { id: 'not-lethal', kind: 'blocked', title: 'A non-lethal hit is not covered',
        explain: () => 'At full HP the hit is not predicted lethal: no cover, the use is kept.',
        setup: () => ({ a: [{ species: 'tidepaw', sparring: true }, { species: 'pebble' }], b: [{ species: 'charbun', overall: 50 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no cover (use kept)', !h.has('redirect') && h.state('a1')?.used === false); } },
      { id: 'first-rescuer', kind: 'multiTarget', title: 'Two eligible Pebblits: the first in lineup order covers (D15)',
        explain: () => 'Both reserves are Pebblit; the first in lineup order takes the hit, the second keeps its use.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1, sparring: true }, { species: 'pebble', overall: 99 }, { species: 'pebble', overall: 99 }], b: [{ species: 'charbun', overall: 70 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('a1 covers, a2 keeps its use', h.ev('redirect')[0]?.actor === 'a1' && h.state('a2')?.used === false); } },
      { id: 'stunned-source', kind: 'blocked', title: 'A Stunned Pebblit cannot intervene',
        explain: () => 'The reserve Pebblit is Stunned (staged): the lethal hit lands on the active ally.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1, sparring: true }, { species: 'pebble', status: { id: 'stunned', strength: 1, duration: 2 } }], b: [{ species: 'charbun', overall: 70 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no cover; the ally is knocked out', !h.has('redirect') && h.has('ko', (e) => e.target === 'a0')); } },
    ],
  },
});
