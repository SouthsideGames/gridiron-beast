// NAT-03-C Last Root (rootram: Bramblet; Tank). Batch D.
// Contract (Dex): once per Clash across entries, automatically (even Stunned, active OR reserve): when any incoming damage event would knock
// Bramblet out, set its surviving HP to ONE instead (direct, reaction and Afflicted damage included; it can activate from 1 HP). One damage
// event, not a whole multi-hit: the next hit may KO. No heal, shield, cleanse, retaliation or invulnerability; other effects resolve
// normally. A use not spent before a KO by an uncovered mechanism stays unused on revival; revival does not refresh a spent use. Same at
// every mastery. The B3 8e pre-KO hook on every damage path. Mastery execution: the survival.
import { registerClashAbility } from '../t8/registry.js';

export default registerClashAbility({
  family: 'rootram', abilityId: 'NAT-03-C',
  initBattle: () => ({ used: false }),
  values: () => ({}),
  hooks: {
    preKO(api, self) {
      if (self.state.used) return null;
      self.state.used = true; api.trigger(self, 'a damage event would knock Bramblet out'); api.executed(self);
      return { survive: true, abilityId: 'NAT-03-C' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'A lethal hit leaves Bramblet at 1 HP; the next lethal hit knocks it out',
        explain: () => 'Staged at 1 HP: the first lethal hit is survived at 1 HP (it can activate from 1 HP); the next one knocks it out.',
        setup: () => ({ a: [{ species: 'rootram', hp: 1, sparring: true }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const sv = h.ev('survive', (e) => e.abilityId === 'NAT-03-C'); h.check('one survival at 1 HP on exchange 1', sv.length === 1 && sv[0].ex === 1 && h.ev('damage', (e) => e.target === 'a0' && e.ex === 1)[0]?.hpAfter === 1); h.check('knocked out by the next hit', h.has('ko', (e) => e.target === 'a0' && e.ex === 2)); h.executed(1); } },
      { id: 'reserve-redirected', kind: 'interaction', title: 'In reserve: a lethal hit redirected onto Bramblet is survived too',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe redirects a lethal hit from the active ally onto the 1-HP reserve Bramblet (an Emergency Cover-type redirect). Last Root works in reserve: it survives at 1 HP.',
        setup: () => ({ a: [{ species: 'tidepaw', hp: 1, sparring: true }, { species: 'rootram', hp: 1 }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ lethalRedirect: (v, id, info) => (id === 'a0' && info.lethal ? { to: 'a1', abilityId: 'TEST-COVER' } : null) }] }),
        expect: (r, h) => { h.check('survived in reserve at 1 HP', h.has('survive', (e) => e.abilityId === 'NAT-03-C' && e.actor === 'a1') && h.line('a1').hp === 1); } },
      { id: 'once', kind: 'blocked', title: 'Spent: no second survival (no refresh)',
        explain: () => 'Staged with the use already spent (controlled prerequisite): a lethal hit knocks Bramblet out.',
        setup: () => ({ a: [{ species: 'rootram', hp: 1, sparring: true, ability: { used: true } }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no survival (use spent)', !h.has('survive') && h.has('ko', (e) => e.target === 'a0')); } },
    ],
  },
});
