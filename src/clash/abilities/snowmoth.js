// ICE-01-C Fresh Start (snowmoth: Flurrit / Blizzmoth; Support). Batch C.
// Contract (Dex): while ready, replace the normal attack if another living teammate (reserves included, never self) has an eligible
// ability cooldown running (otherwise the ordinary attack, readiness kept; Stunned prevents use and keeps readiness). Select the individual
// ability cooldown with the MOST turns remaining; ties by stable lineup order (then the clock's own id). Flurrit removes ONE remaining turn,
// Blizzmoth TWO, minimum zero; reaching zero restores readiness only (no replayed trigger or immediate activation). Running cooldowns ONLY:
// no stored-charge refill, once-per-Clash reset, status-duration change, cleanse or slot use. Cooldown 5 / 4 / 3 / 2 subsequent owner normal
// turns (setup turn excluded; reserve pauses; Stunned skips count). Mastery execution: the reduction.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const CUT = [1, 2]; const COOLDOWN = [5, 4, 3, 2];

export default registerClashAbility({
  family: 'snowmoth', abilityId: 'ICE-01-C',
  initBattle: () => ({}),
  values: (form, tier) => ({ turnsRemoved: byStage(CUT, Number(form.split(':')[1])), cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self)) return null;
      const cands = api.allies(self).filter((v) => v.id !== self.id).flatMap((v) => api.cooldownsOf(v.id).map((k) => ({ v, k })));
      if (!cands.length) return null;
      const best = cands.reduce((b, c) => (!b || c.k.left > b.k.left ? c : b), null); // allies are in lineup order; first wins ties
      const cut = byStage(CUT, self.stage);
      api.activate(self, `${$E('clashlog.remove_turns_from_s_cooldown', { cut, name: best.v.name, id: best.k.id, n: cut })}`, { targetId: best.v.id }); api.cooldown(self, byTier(COOLDOWN, self.tier)); api.executed(self);
      api.adjustCooldown(self, best.v.id, best.k.id, -cut);
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The longest-running ally cooldown is shortened by the form amount',
        explain: (c) => `A reserve Dragon Pounce cooldown runs (staged through the real ability: Drakling pounced, then rotated out). Flurrit removes ${c.values.turnsRemoved} turn(s).`,
        setup: () => ({ a: [{ species: 'drakeling', overall: 40 }, { species: 'snowmoth' }], b: [{ species: 'gravelpup', overall: 99, sparring: true }], seed: 1, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: { 1: 'a1', 5: 'stay', 9: 'stay', 13: 'stay', 17: 'stay', 21: 'stay', 25: 'stay', 29: 'stay' } } }, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const adj = h.ev('clock_adjust', (e) => e.abilityId === 'ICE-01-C')[0]; h.check('Dragon Pounce cooldown reduced', adj && adj.clock === 'DRA-01-C' && adj.before - adj.after === Math.min(adj.before, h.values.turnsRemoved)); h.executed(1); } },
      { id: 'nothing-running', kind: 'blocked', title: 'No running ally cooldown: ordinary attack, readiness kept',
        explain: () => 'Nothing to shorten.',
        setup: () => ({ a: [{ species: 'snowmoth' }, { species: 'tidepaw' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no reduction (readiness kept)', !h.has('clock_adjust') && !h.has('clock_start', (e) => e.clock === 'ICE-01-C')); } },
      { id: 'once-uses-untouched', kind: 'interaction', title: 'Once-per-Clash uses are not refreshed (only running cooldowns are eligible)',
        explain: () => 'A spent once-per-Clash ability (Ambush, staged spent) is not a running cooldown: Fresh Start has nothing to reduce.',
        setup: () => ({ a: [{ species: 'snowmoth' }, { species: 'mireclaw', ability: { entered: true, armed: false, spent: true } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no reduction; the once-use stays spent', !h.has('clock_adjust') && h.state('a1')?.spent === true); } },
    ],
  },
});
