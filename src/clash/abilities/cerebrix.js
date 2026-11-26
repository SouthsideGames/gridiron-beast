// PSY-03-C Foresight (cerebrix: Cerebrix; Disruptor). Batch F.
// Contract (Dex; R-10 / F-08: only while the ACTIVE foe has an ability that applies a harmful status; a reserve does not count): once per Clash, spend its own normal action
// while active and able to prepare a psychic mirror, replacing the attack; the
// once-use is spent on preparation (source inability before preparation keeps it). The mirror lasts 2 / 2 / 3 / 3 owner normal turns by
// mastery, the preparation turn excluded. It intercepts the NEXT successful enemy ABILITY-applied harmful-status roll aimed at Cerebrix,
// before its shared-slot check (reflected applications and environmental effects excluded): the incoming status is prevented and ONE
// application is redirected to its caster with the same strength and proposed duration (the caster's ordinary eligibility applies, no
// second accuracy roll; if the caster cannot receive it, the incoming one is still prevented and the mirror consumed). Attack damage
// resolves normally; Cerebrix must survive and remain able to reflect; no bounce or copied riders; no slot or badge. Rotation or knockout
// clears the mirror; it clears after one interception, expiry or the Clash end. Mastery execution: the preparation.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, BENEFICIAL } from './util.js';
import { E as $E } from '../../core/english.js';

const TURNS = [2, 2, 3, 3]; const CLOCK = 'PSY-03-C:mirror';
// R-10 (balance audit, 2026-11-25): Cerebrix prepares the mirror only while a living enemy (active or in reserve) has a Clash ability
// that applies a harmful status to its target; otherwise it attacks normally and keeps the once-use. Measured over 1,500 random 3 v 3 battles,
// every ability-applied harmful status came from these six families (Downdraft, Eclipse Call, Dragon Roar, Faultline, Mind Game,
// Cold Welcome); before, Cerebrix spent its action on a mirror that almost never had anything to turn back (−6.2 points in teams,
// −30 in isolation, where no foe has an ability).
export const STATUS_SOURCES = Object.freeze(['skywarden', 'nocturne', 'vyrnax', 'pyroclast', 'enigmane', 'hailfang']);

export default registerClashAbility({
  family: 'cerebrix', abilityId: 'PSY-03-C',
  initBattle: () => ({ used: false, mirror: false }),
  values: (form, tier) => ({ mirrorTurns: byTier(TURNS, tier) }),
  hooks: {
    chooseAction(api, self, { foeId } = {}) {
      if (self.state.used) return null;
      // F-08 (owner 2026-11-26): only the CURRENT ACTIVE foe counts. A status source waiting in reserve no longer makes Cerebrix give up
      // its attack (the follow-up study measured −7 points in those battles); otherwise it attacks and keeps the use.
      const foe = foeId ? api.get(foeId) : null;
      if (!foe || !STATUS_SOURCES.includes(foe.species)) return null;
      self.state.used = true; self.state.mirror = true; api.activate(self, `${$E('clashlog.psychic_mirror_for_owner_turns', { byTier: byTier(TURNS, self.tier) })}`); api.executed(self);
      api.durationClock(self, self.id, byTier(TURNS, self.tier), CLOCK);
      return { kind: 'done' };
    },
    statusIncoming(api, self, attempt) {
      const st = self.state; const me = api.me(self);
      if (!st.mirror || !api.clockLeft(self.id, CLOCK)) { st.mirror = false; return null; }
      if (BENEFICIAL.includes(attempt.id) || attempt.reflected || !attempt.abilityId) return null;
      const src = attempt.sourceId ? api.get(attempt.sourceId) : null; if (!src || src.side === self.side) return null;
      if (!me.active || me.koed || (me.stunned && !me.stunProtected)) return null; // must be able to reflect
      st.mirror = false; api.activate(self, `${$E('clashlog.mirror_is_turned_back_on', { id: attempt.id, name: src.name })}`, { targetId: src.id });
      if (!src.koed) api.applyStatus(self, src.id, { id: attempt.id, strength: attempt.strength, duration: attempt.duration, ...(attempt.payload ? { payload: attempt.payload } : {}), reflected: true });
      return { block: true, reason: $E('clashlog.foresight_mirror') };
    },
    onDeparture(api, self) { if (self.state.mirror) { self.state.mirror = false; api.cleanup(self, $E('clashlog.rotation_clears_the_mirror')); } },
    onKO(api, self) { self.state.mirror = false; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The mirror is prepared; the enemy\'s next ability status (Dragon Roar\'s Weakened) is turned back on the caster',
        explain: () => 'Cerebrix prepares the mirror on exchange 1. Vyrnax\'s Dragon Roar hits on exchange 2: the damage lands, and its Weakened is prevented and redirected to Vyrnax.',
        setup: () => ({ a: [{ species: 'cerebrix', overall: 99 }], b: [{ species: 'vyrnax', overall: 30 }], seed: 1, stopAt: { exchange: 2 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('Weakened blocked on Cerebrix', h.has('status_blocked', (e) => e.target === 'a0' && /Foresight/.test(e.reason))); h.check('Weakened lands on Vyrnax instead', h.has('status', (e) => e.target === 'b0' && e.status === 'weakened' && e.abilityId === 'PSY-03-C')); h.check('the roar\'s damage resolved', h.has('damage', (e) => e.abilityId === 'DRA-05-C')); h.executed(1); } },
      { id: 'reserve-source-only', kind: 'blocked', title: 'F-08: a status source waiting in reserve does not count; Cerebrix attacks and keeps the use',
        explain: () => 'The active foe (Gravelpup) applies no status; Vyrnax, a status source, waits in reserve. Cerebrix makes its ordinary attack and does not prepare.',
        setup: () => ({ a: [{ species: 'cerebrix', overall: 99 }], b: [{ species: 'gravelpup', overall: 30 }, { species: 'vyrnax', overall: 30 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('no mirror prepared (use kept)', h.state('a0')?.used === false); h.check('Cerebrix attacked', h.has('damage', (e) => e.actor === 'a0')); } },
      { id: 'expires', kind: 'depletion', title: 'Nothing arrives: the mirror lapses after its owner turns',
        explain: (c) => `The foe can apply a status (Cold Welcome) but is sparring: nothing is aimed at Cerebrix, and the mirror lapses after ${c.values.mirrorTurns} owner turns.`,
        setup: () => ({ a: [{ species: 'cerebrix' }], b: [{ species: 'hailfang', sparring: true }], seed: 1, stopAt: { exchange: 5 } }),
        expect: (r, h) => { h.check('the mirror clock ended', h.has('clock_end', (e) => e.clock === 'PSY-03-C:mirror')); } },
      { id: 'beneficial-ignored', kind: 'blocked', title: 'A beneficial or non-ability status is not intercepted',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe (no ability id) applies Weakened to Cerebrix: environmental / non-ability statuses are not mirrored.',
        setup: () => ({ a: [{ species: 'cerebrix' }], b: [{ species: 'hailfang', sparring: true }], seed: 1, stopAt: { exchange: 2 }, probes: [{ turnStart: (v, id) => { if (id === 'b0' && v.ex === 2) v.applyStatus('a0', { id: 'weakened', strength: 10, duration: 2 }); } }] }),
        expect: (r, h) => { h.check('not mirrored (no interception)', !h.has('status_blocked', (e) => /Foresight/.test(e.reason || ''))); } },
    ],
  },
});
