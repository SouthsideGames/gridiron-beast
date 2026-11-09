// LIG-02-C Dawn Song (sunwhistle: Solchirp / Heliark; Support). Batch C.
// Contract (Dex): a ready own normal action replaces the attack if the active front ally is injured and has an empty status slot. Target:
// "Front ally, self only if actually front". Heal 5 / 6 / 7 / 8% max HP by mastery (both forms, P4) immediately, then the same amount at the
// end of the NEXT 2 owner normal turns: an ability-linked healing schedule, not a status (the empty slot gates the cast only). Cooldown 6
// owner turns fixed, cast turn excluded; no stacking of own schedules on one target. Reserve pauses future pulses; a knockout or the actual
// Clash end cancels them; Healing Reduced is evaluated at each pulse; a later different status does not erase the schedule; no cross-mode
// healing (pulses discarded on football transition, S12). P9 diagnostic: schedules per side up to the lineup size.
// AWAITING RULING ('d14-dawn-song-target', D14): normal gameplay reports awaiting ruling and Solchirp attacks normally. Provisional mode
// applies the literal text under one active fighter: the only front ally is the casting Solchirp, so the target is itself.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, injured } from './util.js';

const HEAL = [5, 6, 7, 8]; const PULSES = 2; const COOLDOWN = 6;

export default registerClashAbility({
  family: 'sunwhistle', abilityId: 'LIG-02-C',
  initBattle: () => ({ pulsesLeft: 0, targetId: null, castTurn: -1 }),
  values: (form, tier) => ({ healPct: byTier(HEAL, tier), pulses: PULSES, cooldown: COOLDOWN }),
  hooks: {
    chooseAction(api, self) {
      if (!api.ready(self) || self.state.pulsesLeft) return null;
      const me = api.me(self); // under one active fighter the front ally is the caster
      if (!injured(me) || me.status) return null;
      if (!api.provisional(self, 'd14-dawn-song-target', '"Front ally, self only if actually front": the caster is the only front ally')) return null;
      api.activate(self, `Dawn Song on ${me.name}: ${byTier(HEAL, self.tier)}% now and at the end of the next ${PULSES} own turns`, { targetId: self.id });
      api.cooldown(self, COOLDOWN); api.executed(self);
      api.heal(self, self.id, { pctMaxHp: byTier(HEAL, self.tier) });
      self.state.pulsesLeft = PULSES; self.state.targetId = self.id; self.state.castTurn = api.me(self).turns; api.schedule(self, +1);
      return { kind: 'done' };
    },
    endOfTurn(api, self) {
      const st = self.state; if (!st.pulsesLeft || api.me(self).turns === st.castTurn) return; // the cast turn is excluded
      st.pulsesLeft -= 1; api.log(self, 'ability', `${self.name}: Dawn Song pulse (${PULSES - st.pulsesLeft} / ${PULSES})`, { stage: 'resolution' });
      api.heal(self, st.targetId, { pctMaxHp: byTier(HEAL, self.tier), kind: 'pulse' });
      if (!st.pulsesLeft) { st.targetId = null; api.schedule(self, -1); api.cleanup(self, 'schedule complete'); }
    },
    onKO(api, self) { if (self.state.pulsesLeft) { self.state.pulsesLeft = 0; self.state.targetId = null; api.schedule(self, -1); api.cleanup(self, 'knockout cancels the pending pulses'); } },
  },
  review: {
    scenarios: [
      { id: 'awaiting-d14', kind: 'blocked', title: 'Normal gameplay: Dawn Song awaits the D14 target ruling; ordinary attack',
        explain: () => 'D14 asks whether "front ally, self only if actually front" means self only or self included. Until it is ruled Dawn Song reports awaiting ruling and Solchirp attacks.',
        setup: () => ({ a: [{ species: 'sunwhistle', hp: 30 }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.awaiting('d14-dawn-song-target'); h.check('ordinary attack, no heal', h.has('damage', (e) => e.actor === 'a0') && !h.has('heal', (e) => e.abilityId === 'LIG-02-C')); } },
      { id: 'provisional-schedule', kind: 'valid', provisional: true, title: 'PROVISIONAL (self only): immediate heal, then a pulse at the end of each of the next two own turns',
        explain: (c) => `Provisional reading (D14 self only): Solchirp heals itself ${c.values.healPct}% now and at the end of its next two normal turns; the schedule is not a status. Not approved; labelled.`,
        setup: () => ({ a: [{ species: 'sunwhistle', hp: 20 }], b: [{ species: 'gravelpup', sparring: true }], seed: 1, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.provisionalUsed('d14-dawn-song-target'); const hs = h.ev('heal', (e) => e.abilityId === 'LIG-02-C'); h.check('three heals on exchanges 1, 2, 3', hs.map((e) => e.ex).join(',') === '1,2,3', hs.map((e) => e.ex)); h.check('no status used', !h.has('status', (e) => e.abilityId === 'LIG-02-C')); h.check('schedule counted for P9', r.diagnostics.overflow.length === 0); } },
      { id: 'provisional-ko-cancels', kind: 'sourceKO', provisional: true, title: 'PROVISIONAL: a knockout cancels the pending pulses',
        explain: () => 'Provisional reading: Solchirp casts, then is knocked out before its next turn ends: the pulses are cancelled.',
        setup: () => ({ a: [{ species: 'sunwhistle', hp: 3 }, { species: 'tidepaw' }], b: [{ species: 'charbun', overall: 99 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('knocked out with pulses pending', h.has('cleanup', (e) => e.abilityId === 'LIG-02-C' && /cancels/.test(e.text))); } },
    ],
  },
});
