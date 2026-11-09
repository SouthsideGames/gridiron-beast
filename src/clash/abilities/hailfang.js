// ICE-02-C Cold Welcome (hailfang: Frostpup / Hoarhound; Disruptor). Batch E.
// Contract (Dex): with the source ACTIVE and not Stunned (otherwise readiness kept), on a SUCCESSFUL ENEMY VOLUNTARY rotation only (forced
// rotations and KO replacements excluded), the incoming enemy, AFTER all its entry effects, receives an attempted Slowed of 15% (Frostpup)
// / 20% (Hoarhound) initiative reduction for TWO recipient normal turns (application turn excluded; recipient reserve pauses). No damage,
// separate roll or extra action. Ordinary shared-status rules: an incoming Shielded or any other status blocks it; no protection is
// stripped. Cooldown 5 / 4 / 3 / 2 subsequent source normal turns (reserve pauses; Stunned skips count); throwing spends readiness even if
// the status is blocked. A Feather Relay rotation: AWAITING RULING ('feather-relay-voluntary'). Mastery execution: the throw.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage } from './util.js';
import { decisionsPlan } from '../t8/review.js';

const SLOW = [15, 20]; const TURNS = 2; const COOLDOWN = [5, 4, 3, 2];

export default registerClashAbility({
  family: 'hailfang', abilityId: 'ICE-02-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ slowedPct: byStage(SLOW, Number(form.split(':')[1])), turns: TURNS, cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    arrival(api, self, { side, in: inId, reason }) {
      const me = api.me(self); if (!me.active || me.koed || side === self.side || !api.ready(self)) return null;
      if (reason === 'relay' && !api.provisional(self, 'feather-relay-voluntary', 'a Feather Relay rotation')) return null;
      if (reason !== 'voluntary' && reason !== 'relay') return null;
      if (me.stunned) { api.cleanup(self, 'Stunned: readiness kept'); return null; }
      api.trigger(self, `${api.get(inId).name} arrived by a voluntary rotation`, { targetId: inId }); api.activate(self, `Slowed ${byStage(SLOW, self.stage)}% attempt`, { targetId: inId });
      api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      api.applyStatus(self, inId, { id: 'slowed', strength: byStage(SLOW, self.stage), duration: TURNS });
      return null;
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The enemy rotates voluntarily: the incoming monster is Slowed after its entry effects',
        explain: (c) => `The opponent rotates at exchange 1; the arriving monster gets Slowed ${c.values.slowedPct}% for two of its turns.`,
        setup: () => ({ a: [{ species: 'hailfang', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99 }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1' }) } }, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'ICE-02-C')[0]; const en = h.ev('enter', (e) => e.actor === 'b1')[0]; h.check('Slowed on the entrant after it entered', s && en && s.target === 'b1' && s.seq > en.seq && s.slot.strength === h.values.slowedPct && s.slot.remaining === 2); h.executed(1); } },
      { id: 'blocked-spends', kind: 'blocked', title: 'An incoming Shielded blocks the Slowed; the throw is still spent',
        explain: () => 'The arriving reserve holds a staged shield: the gate blocks Slowed, and the cooldown starts anyway.',
        setup: () => ({ a: [{ species: 'hailfang', overall: 30 }], b: [{ species: 'gravelpup', overall: 99 }, { species: 'tinhare', overall: 99, status: { id: 'shielded', strength: 20, duration: 5 } }], seed: 1, config: { policies: { a: 'none', b: 'manual' }, decisions: { b: decisionsPlan({ 1: 'b1' }) } }, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('blocked by the gate', h.has('status_blocked', (e) => e.abilityId === 'ICE-02-C')); h.check('cooldown started', h.has('clock_start', (e) => e.clock === 'ICE-02-C')); } },
      { id: 'ko-replacement-no', kind: 'blocked', title: 'A KO replacement does not trigger it',
        explain: () => 'The opposing front is knocked out (staged 1 HP); its replacement is not a voluntary arrival.',
        setup: () => ({ a: [{ species: 'hailfang', overall: 99 }], b: [{ species: 'gravelpup', hp: 1 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no Slowed on a KO replacement', !h.has('status', (e) => e.abilityId === 'ICE-02-C')); } },
    ],
  },
});
