// NAT-04-C Canopy Assist (leafhorn: Florant; Support). Batch E.
// Contract (Dex, D17): once per Clash on Florant's normal turn when able. An eligible non-Stunned living RESERVE is required (none: Florant
// attacks normally and keeps the use). The reserve with the highest CURRENT attack damage against the current opponent (D17: expected
// damage from legitimately available information, no future RNG: its ATK x its outgoing status factor x the type factor; ties in lineup
// order) attacks the opposing active; Florant stays active. Replace Florant's attack: assist basic damage 75 / 80 / 85 / 90% of that ALLY's
// normal attack by mastery; no signature, charge consumption or offensive archetype perks (tag assist); normal type, target defences and
// explicit misses; a miss spends the use. Then the ally is back in its reserve slot: not an active entry, rotation or normal turn; no
// status, cooldown or attack-counter ticks for it; entry / rotation effects do not trigger. Eligible retaliation targets the ASSISTING ally
// and resolves normally. The assist is a contested Stone Divide target. Mastery execution: the assist.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, SPAR } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [75, 80, 85, 90];
const outgoing = (st) => (st?.id === 'weakened' ? 1 - (st.payload?.pct ?? st.strength) / 100 : st?.id === 'empowered' ? 1 + (st.payload?.pct ?? st.strength) / 100 : 1);

export default registerClashAbility({
  family: 'leafhorn', abilityId: 'NAT-04-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ assistPct: byTier(POWER, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      const cands = api.reserves(self).filter((v) => !v.stunned);
      if (!cands.length) return null;
      const exp = (v) => v.atk * outgoing(v.status) * api.typeFactor(v.id, foeId);
      const helper = cands.reduce((b, v) => (!b || exp(v) > exp(b) ? v : b), null);
      self.state.used = true; api.trigger(self, `${$E('clashlog.has_the_highest_expected_attack_damage', { name: helper.name, helper: exp(helper).toFixed(2) })}`, { targetId: helper.id });
      api.activate(self, `${$E('clashlog.assists_at_from_reserve', { name: helper.name, byTier: byTier(POWER, self.tier) })}`, { targetId: foeId }); api.executed(self);
      return { kind: 'run', run: (a, s) => a.commandStrike(s, helper.id, foeId, { tag: 'assist', mult: byTier(POWER, s.tier) / 100, strikeKey: 'assist', label: $E('clashlog.canopy_assist') }).decided };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The strongest reserve (by expected damage) strikes from reserve; Florant stays active; nobody rotates',
        explain: (c) => `Two reserves: the one with the higher ATK x type factor against the opponent hits at ${c.values.assistPct}% of its own normal attack, without entering.`,
        setup: () => ({ a: [{ species: 'leafhorn' }, { species: 'kindlet', overall: 40 }, { species: 'charbun', overall: 99 }], b: SPAR(), seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const d = h.ab('damage')[0]; h.check('the assisting reserve a2 strikes, tag assist', d && d.actor === 'a2' && d.tag === 'assist' && d.mult === h.values.assistPct / 100); h.check('no rotation, Florant still active', !h.has('rotation') && h.line('a0').active); h.check('the helper took no turn', h.line('a2').turns === 0); h.executed(1); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No eligible reserve (all Stunned or none): Florant attacks, the use is kept',
        explain: () => 'The only reserve is Stunned (staged): no assist.',
        setup: () => ({ a: [{ species: 'leafhorn' }, { species: 'charbun', status: { id: 'stunned', strength: 1, duration: 2 } }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no assist (use kept)', h.state('a0')?.used === false && h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'retaliation-targets-helper', kind: 'interaction', title: 'Retaliation targets the assisting ally (Stoke the Flame counterburst hits the reserve helper)',
        explain: () => 'Staged (controlled prerequisite): the opponent Flaroo holds two Stoke charges. The assist is its third survived attack; its counterburst targets the assisting reserve, not Florant.',
        setup: () => ({ a: [{ species: 'leafhorn' }, { species: 'charbun', overall: 99 }], b: [{ species: 'emberfox', overall: 99, sparring: true, ability: { charges: 2 } }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const c = h.ev('damage', (e) => e.actor === 'b0' && e.tag === 'reaction')[0]; h.check('counterburst on the helper a1', c && c.target === 'a1'); } },
    ],
  },
});
