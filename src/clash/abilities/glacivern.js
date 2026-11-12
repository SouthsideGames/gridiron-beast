// ICE-06-C Deep Winter (glacivern: Glacivern; Disruptor, legendary). Batch F.
// Contract (Dex, spec §10): once per Clash, replace its own normal action when at least one living enemy has a harmful status (otherwise
// the ordinary attack, use kept; Stunned prevents it and keeps readiness). Every living enemy, reserves included, with a harmful status
// ALREADY present at activation: freeze the EXPIRATION countdown for its next TWO recipient normal turns (the count stays unchanged); harmful
// effects continue (Afflicted ticks, Stunned skips under the D4 safeguard; T8_PROVISIONAL deep-winter-freeze-counts-protected-turn). After
// two affected turns it thaws and the ordinary countdown resumes on the following turn. No new status; the three-application cap is
// neither consumed nor reset. A successful new application of the same status (equal extension or stronger replacement) ends that episode's
// freeze; a weaker or rejected attempt does not (status.js). A cleanse removes the status and its freeze. Reserve pauses the freeze; the
// remaining frozen turns carry across modes (S12). No damage or mastery scaling. Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { isHarmful } from './util.js';

const FREEZE = 2;

export default registerClashAbility({
  family: 'glacivern', abilityId: 'ICE-06-C',
  initBattle: () => ({ used: false }),
  values: () => ({ freezeTurns: FREEZE }),
  hooks: {
    chooseAction(api, self) {
      if (self.state.used) return null;
      const targets = api.enemies(self).filter((v) => isHarmful(v.status));
      if (!targets.length) return null;
      self.state.used = true; api.activate(self, `deep winter freezes ${targets.map((v) => v.name).join(', ')}`); api.executed(self);
      for (const v of targets) api.setFreeze(self, v.id, FREEZE);
      return { kind: 'done' };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Every enemy with a harmful status, reserves included, has its countdown frozen for two of its turns',
        explain: () => 'The opposing active and a reserve are Weakened (staged, 2 turns each): both countdowns freeze; the active\'s Weakened keeps its full count through its next two turns while still weakening it.',
        setup: () => ({ a: [{ species: 'glacivern', overall: 40 }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'weakened', strength: 10, duration: 2 } }, { species: 'tinhare', status: { id: 'weakened', strength: 10, duration: 2 } }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('two targets frozen', h.ev('status_freeze', (e) => e.abilityId === 'ICE-06-C').length === 2); h.check('after two of its turns the active\'s Weakened still has its 2 turns (countdown frozen, not decremented)', h.line('b0').status?.id === 'weakened' && h.line('b0').status.remaining === 2 && !h.line('b0').status.freeze); h.check('harmful effect kept while frozen', h.has('damage', (e) => e.actor === 'b0' && e.ex === 2 && e.outgoing === 0.9)); h.executed(1); } },
      { id: 'no-harmful', kind: 'blocked', title: 'No enemy with a harmful status: ordinary attack, the use is kept',
        explain: () => 'Nothing to freeze.',
        setup: () => ({ a: [{ species: 'glacivern' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no freeze (use kept)', h.state('a0')?.used === false); } },
      { id: 'reapply-ends-freeze', kind: 'interaction', title: 'An accepted same-status application ends the freeze (controlled reapplication)',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): after the freeze, a reviewer probe reapplies an equal Weakened to the opponent; the freeze ends and the ordinary countdown resumes.',
        setup: () => ({ a: [{ species: 'glacivern', overall: 40 }], b: [{ species: 'gravelpup', overall: 99, status: { id: 'weakened', strength: 10, duration: 2 } }], seed: 1, stopAt: { exchange: 3 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }, { turnStart: (v, id) => { if (id === 'a0' && v.ex === 2) v.applyStatus('b0', { id: 'weakened', strength: 10, duration: 1 }); } }] }),
        expect: (r, h) => { const st = h.line('b0').status; h.check('freeze cleared by the accepted application', !st || !st.freeze); } },
    ],
  },
});
