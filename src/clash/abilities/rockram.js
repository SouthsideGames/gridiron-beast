// EAR-02-C Rubble Reprisal (rockram: Craggo / Ramparte; Balanced). Batch D.
// Contract (Dex): while ready, with the source active and able (Stunned prevents and keeps readiness), when the ACTIVE enemy receives
// actual HP restoration (from itself, an ally or a healing effect), react after the ENTIRE originating healing ability has finished
// (shield or rotation effects included; engine deferral) with one rock at that same enemy if it is still active and the source can act
// (otherwise readiness kept): Craggo 60 / 65 / 70 / 75%, Ramparte 70 / 75 / 80 / 85% normal attack by mastery; normal evasion, type,
// shields and reduction. One healing event triggers at most one rock. Shield grants, zero-HP overheal, fully blocked healing, revival and
// HP redistribution do not trigger (T8_PROVISIONAL healed-hook-kinds: Mind Mend's credit does). Cooldown 5 / 4 / 3 / 2 subsequent owner
// normal turns (application turn excluded; reserve pauses); the launch spends even on a miss. No attack-counter progress, stored-charge
// consumption, ordinary-only perks or retaliation chain (reaction). A contested Stone Divide target. Mastery execution: the rock.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage } from './util.js';

const POWER = [[60, 65, 70, 75], [70, 75, 80, 85]]; const COOLDOWN = [5, 4, 3, 2];

export default registerClashAbility({
  family: 'rockram', abilityId: 'EAR-02-C',
  initBattle: () => ({ pending: false }),
  values: (form, tier) => ({ rockPct: byTier(byStage(POWER, Number(form.split(':')[1])), tier), cooldown: byTier(COOLDOWN, tier) }),
  hooks: {
    healed(api, self, { targetId, amount, kind }) {
      const st = self.state; const me = api.me(self); const t = api.get(targetId);
      if (st.pending || amount <= 0 || !me.active || me.koed || !t.active || t.side === self.side || !api.ready(self)) return;
      st.pending = true; api.trigger(self, `${t.name} restored ${amount} HP (${kind})`, { targetId });
      api.defer(self, (a, s) => {
        s.state.pending = false; const m = a.me(s); const tt = a.get(targetId);
        if (!a.ready(s) || m.koed || !m.active || m.stunned) { a.cleanup(s, 'the source cannot act now: readiness kept'); return; }
        if (tt.koed || !tt.active) { a.cleanup(s, 'the healed enemy is no longer active: readiness kept'); return; }
        const pctV = byTier(byStage(POWER, s.stage), s.tier);
        a.activate(s, `rock at ${pctV}%`, { targetId }); a.cooldown(s, byTier(COOLDOWN, s.tier)); a.executed(s);
        a.strike(s, targetId, { tag: 'reaction', mult: pctV / 100, strikeKey: 'rock', label: 'Rubble Reprisal' });
      });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'The enemy active heals itself (Second Tide): after the whole ability resolves, one rock at it',
        explain: (c) => `Aquip (injured, staged) uses Second Tide on itself on its second action; once the heal and the surplus shield have resolved, Craggo throws a ${c.values.rockPct}% rock at it.`,
        setup: () => ({ a: [{ species: 'rockram', overall: 30 }], b: [{ species: 'tidepaw', hp: 25 }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const hl = h.ev('heal', (e) => e.abilityId === 'WAT-01-C')[0]; const d = h.ab('damage')[0]; h.check('rock after the heal (and after any surplus shield)', hl && d && d.seq > hl.seq && d.target === 'b0' && d.tag === 'reaction'); h.check(`${h.values.rockPct}%`, d?.mult === h.values.rockPct / 100); h.check('rock after the whole ability (after any shield grant)', !h.has('status', (e) => e.abilityId === 'WAT-01-C' && e.seq > d?.seq)); h.executed(1); } },
      { id: 'blocked-heal', kind: 'blocked', title: 'Fully blocked healing (Healing Reduced 100%) triggers nothing',
        explain: () => 'The enemy holds a staged 100% Healing Reduced: its heal restores 0 HP, so no rock.',
        setup: () => ({ a: [{ species: 'rockram', overall: 30 }], b: [{ species: 'tidepaw', hp: 25, status: { id: 'healingReduced', strength: 100, duration: 9 } }], seed: 1, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.check('no rock (zero restoration)', h.ab('damage').length === 0); } },
      { id: 'cooldown', kind: 'depletion', title: 'The cooldown blocks a second rock until it runs out',
        explain: () => 'Aquip heals every second action; the second heal (exchange 4) falls inside Craggo\'s cooldown at the lower tiers.',
        setup: () => ({ a: [{ species: 'rockram', overall: 30 }], b: [{ species: 'tidepaw', hp: 25, overall: 99 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const rocks = h.ab('damage'); h.check('rocks never closer than the cooldown', rocks.length <= 1 || rocks[1].ex - rocks[0].ex > h.values.cooldown); } },
    ],
  },
});
