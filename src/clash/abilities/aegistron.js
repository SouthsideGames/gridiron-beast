// MET-06-C Fortress (aegistron: Aegistron; Tank, legendary). Batch B.
// Contract (Dex): once per Clash, its own normal action replaces the attack if it has no status and HP below 60%: self Guarded 50% for 2
// owner normal turns (application excluded; reserve pauses). While its OWN episode is active it stores the HP damage the Guarded
// prevented, up to a cap; at NATURAL expiry it heals the stored amount (Healing Reduced applies). No healing if the episode is removed,
// replaced or ends in a KO; no Shielded pool, counterattack or fresh-episode override; an existing other status blocks setup (ordinary
// attack, use kept). Once per Clash on a successful cast attempt; no reset on rotation / revival. Football clears it without payout (S12).
// The storage cap: Core "up to20% maxHP" against Progression "Storage cap 10 / 15 / 20 / 25% maxHP by mastery" (found at S7). The two
// agree at Expert, and whenever the stored amount is within the smaller cap; otherwise the PAYOUT is AWAITING RULING
// ('fortress-storage-cap') in normal gameplay (reported, no heal). Mastery execution: the cast.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const GUARD = 50; const TURNS = 2; const CORE_CAP = 20; const LADDER = [10, 15, 20, 25]; const HP_LINE = 60;

export default registerClashAbility({
  family: 'aegistron', abilityId: 'MET-06-C',
  initBattle: () => ({ used: false, live: false, stored: 0 }),
  values: (form, tier) => ({ guardedPct: GUARD, turns: TURNS, coreCapPct: CORE_CAP, progressionCapPct: byTier(LADDER, tier), hpLinePct: HP_LINE }),
  hooks: {
    chooseAction(api, self) {
      const st = self.state; if (st.used) return null; const me = api.me(self);
      if (me.hp * 100 >= HP_LINE * me.maxHp) return null;
      if (me.status) return unmet({ condition: $E('clashlog.no_status'), detail: `${$E('clashlog.ordinary_attack_use_kept', { id: me.status.id })}` });
      st.used = true; api.activate(self, $E('clashlog.fortress_guarded_50_storing_prevented_damage')); api.executed(self);
      const r = api.applyStatus(self, self.id, { id: 'guarded', strength: GUARD, duration: TURNS, payload: { pct: GUARD, fortress: self.id } });
      st.live = !!r.accepted; st.stored = 0;
      return { kind: 'done' };
    },
    afterWholeHit(api, self, info) {
      const st = self.state; if (!st.live) return; const l = info.landed.find((x) => x.id === self.id); if (!l?.prevented) return;
      st.stored += l.prevented; api.log(self, 'ability_progress', `${$E('clashlog.fortress_stores_prevented_hp_total', { name: self.name, prevented: l.prevented, stored: st.stored })}`, { stored: st.stored, stage: 'trigger' });
    },
    statusEnded(api, self, { id, reason }) {
      const st = self.state; if (!st.live || id !== 'guarded') return; st.live = false;
      if (reason !== 'expired') { api.cleanup(self, `${$E('clashlog.episode_no_payout', { reason })}`); st.stored = 0; return; }
      const me = api.me(self); const coreCap = Math.floor((me.maxHp * CORE_CAP) / 100); const ladderCap = Math.floor((me.maxHp * byTier(LADDER, self.tier)) / 100);
      let amount = Math.min(st.stored, coreCap, ladderCap);
      if (st.stored > Math.min(coreCap, ladderCap) && coreCap !== ladderCap) {
        if (!api.provisional(self, 'fortress-storage-cap', `${$E('clashlog.stored_core_cap_progression_cap', { stored: st.stored, coreCap, ladderCap })}`)) { api.cleanup(self, $E('clashlog.payout_awaits_the_storage_cap_ruling')); st.stored = 0; return; }
        amount = Math.min(st.stored, api.flags.coreVsProgression.value === 'core' ? coreCap : ladderCap);
      }
      api.activate(self, `${$E('clashlog.natural_expiry_heal_the_stored_hp', { amount })}`);
      if (amount > 0) api.heal(self, self.id, { base: amount, kind: 'fortress' });
      st.stored = 0;
    },
    onKO(api, self) { self.state.live = false; self.state.stored = 0; },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Below 60% HP: Guarded 50%, prevented damage stored, healed at natural expiry (within both caps)',
        explain: () => 'Staged at 50% HP against a light hitter: Aegistron fortifies, stores what the Guarded prevents (well under both caps), and heals it when the episode expires naturally.',
        setup: () => ({ a: [{ species: 'aegistron', hp: 40 }], b: [{ species: 'kindlet', overall: 30 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const s = h.ev('status', (e) => e.abilityId === 'MET-06-C')[0]; h.check('Guarded 50% for 2 turns', s && s.slot.strength === 50 && s.slot.remaining === 2); const stored = h.ab('ability_progress'); h.check('prevented damage stored', stored.length >= 1); const heal = h.ev('heal', (e) => e.abilityId === 'MET-06-C')[0]; h.check('payout at natural expiry equals the stored amount', heal && heal.budget === stored[stored.length - 1].stored); h.executed(1); h.stages('activation', 'trigger', 'activation', 'resolution'); } },
      { id: 'occupied', kind: 'blocked', title: 'A status already present blocks the setup (ordinary attack, use kept)',
        explain: () => 'Staged at 50% HP and Slowed: no setup; unmet reported.',
        setup: () => ({ a: [{ species: 'aegistron', hp: 40, status: { id: 'slowed', strength: 15, duration: 5 } }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported(); h.check('use kept', h.state('a0')?.used === false); } },
      { id: 'removed-no-payout', kind: 'cleanup', title: 'The episode is removed early (controlled cleanse-type removal): no payout',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe replaces the Guarded episode before it expires. "No healing if removed / replaced": the stored amount is discarded.',
        setup: () => ({ a: [{ species: 'aegistron', hp: 40 }], b: [{ species: 'kindlet', overall: 30 }], seed: 1, stopAt: { exchange: 3 }, probes: [{ turnStart: (v, id) => { if (id === 'b0' && v.ex === 2) v.replaceStatus('a0', { id: 'quickened', strength: 10, duration: 2 }); } }] }),
        expect: (r, h) => { h.check('no payout', !h.has('heal', (e) => e.abilityId === 'MET-06-C')); h.check('cleanup names it', h.has('cleanup', (e) => e.abilityId === 'MET-06-C' && /no payout/.test(e.text))); } },
    ],
  },
});
