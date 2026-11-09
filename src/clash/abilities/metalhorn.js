// MET-05-C Shield Wall (metalhorn: Ferrhorn; Support). Batch B.
// Contract (Dex): a ready own normal action replaces the attack when a living RESERVE ally has an empty status slot: the reserve ally with
// the lowest current HP percentage (stable lineup tie) attempts Shielded 12 / 15 / 18 / 21% of ITS max HP by mastery for 3 recipient normal
// turns. No healing, cleanse or active-target option. Cooldown 5 owner turns (application turn excluded). Existing other statuses block;
// no eligible target -> ordinary attack, readiness kept. The pool, remaining fraction, history and spent fumble-save state follow the
// approved mode carry (S12; G09: never refilled). Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, lowestHpPct, unmet } from './util.js';

const POOL = [12, 15, 18, 21]; const TURNS = 3; const COOLDOWN = 5;

export default registerClashAbility({
  family: 'metalhorn', abilityId: 'MET-05-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ poolPct: byTier(POOL, tier), turns: TURNS, cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null;
      const reserves = api.reserves(self); if (!reserves.length) return null;
      const t = lowestHpPct(reserves.filter((v) => !v.status));
      if (!t) return unmet({ condition: 'a living reserve ally with an empty status slot', detail: 'ordinary attack, readiness kept' });
      api.activate(self, `Shielded ${byTier(POOL, self.tier)}% on ${t.name}`, { targetId: t.id }); api.cooldown(self, COOLDOWN); api.executed(self);
      api.shield(self, t.id, { pctMaxHp: byTier(POOL, self.tier), duration: TURNS });
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The lowest-HP reserve with an empty slot gets the shield (its own max HP); the cooldown runs',
        explain: (c) => `Two reserves: the more injured one (staged) gets Shielded ${c.values.poolPct}% of its max HP for 3 of its turns.`,
        setup: () => ({ a: [{ species: 'metalhorn' }, { species: 'tidepaw' }, { species: 'lumen', hp: 20 }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'MET-05-C')[0]; h.check('on the lowest-HP reserve (a2)', s && s.target === 'a2'); h.check(`pool ${h.values.poolPct}% of the target max HP, 3 turns`, s && s.slot.pool === Math.floor(h.line('a2').maxHp * h.values.poolPct / 100 + 0.5) && s.slot.remaining === 3); h.executed(1); } },
      { id: 'no-reserve-empty', kind: 'blocked', title: 'Every reserve already holds a status: ordinary attack, readiness kept',
        explain: () => 'The only reserve is Slowed (staged): no eligible target; unmet reported.',
        setup: () => ({ a: [{ species: 'metalhorn' }, { species: 'tidepaw', status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported(); h.check('ordinary attack', h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'cooldown', kind: 'depletion', title: 'Five owner turns of cooldown between casts',
        explain: () => 'Against sparring partners (labelled) Ferrhorn shields on exchange 1 and again on exchange 7.',
        setup: () => ({ a: [{ species: 'metalhorn', overall: 30 }, { species: 'tidepaw' }, { species: 'lumen' }], b: [{ species: 'gravelpup', overall: 99, sparring: true }, { species: 'tinhare', overall: 99, sparring: true }], seed: 1, stopAt: { exchange: 7 } }),
        expect: (r, h) => { h.check('casts on exchanges 1 and 7', h.ev('status', (e) => e.abilityId === 'MET-05-C').map((e) => e.ex).join(',') === '1,7'); } },
    ],
  },
});
