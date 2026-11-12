// ELE-05-C Victory Surge (joltrex: Joltrex; Striker). Batch D.
// Contract (Dex): once per Clash, when Joltrex personally knocks out the ACTIVE enemy with an ORDINARY normal attack (reaction, special and
// damage-over-time knockouts do not qualify): the opponent chooses the replacement normally and its entry effects resolve first; then
// one follow-up at the replacement for 60 / 70 / 80 / 90% normal attack damage by mastery (normal type, explicit misses, shields, Guarded
// and the active Tank guard; a miss spends it). No living replacement / battle ended: no follow-up. If the replacement's entry effects
// leave Joltrex knocked out or Stunned, the surge is lost. No chain even on a knockout; no normal turn, attack-counter progress or
// ordinary-only perks (tag followUp, an extra strike for Stone Divide); normal damage-triggered retaliation applies. Rotation / revival do
// not restore the use. Mastery execution: the follow-up.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [60, 70, 80, 90];

export default registerClashAbility({
  family: 'joltrex', abilityId: 'ELE-05-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ followUpPct: byTier(POWER, tier) }),
  hooks: {
    followUp(api, self, info) {
      const st = self.state; if (st.used || info.attackerId !== self.id || info.tag !== 'ordinary' || !info.inAction) return;
      if (!info.kos.includes(info.targetId) || api.get(info.targetId).side === self.side) return;
      st.used = true; api.trigger(self, `${$E('clashlog.knocked_out_by_an_ordinary_attack', { name: api.get(info.targetId).name })}`);
      const me = api.me(self); const rep = api.foe(self);
      if (!rep) { api.cleanup(self, $E('clashlog.no_living_replacement_no_follow_up')); return; }
      if (me.koed || me.stunned) { api.cleanup(self, $E('clashlog.the_replacements_entry_left_joltrex_unable')); return; }
      api.activate(self, `${$E('clashlog.follow_up_at_on', { byTier: byTier(POWER, self.tier), name: rep.name })}`, { targetId: rep.id }); api.executed(self);
      api.strike(self, rep.id, { tag: 'followUp', mult: byTier(POWER, self.tier) / 100, strikeKey: 'follow-up', label: $E('clashlog.victory_surge') });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'An ordinary knockout: the replacement enters (entry effects first), then the follow-up',
        explain: (c) => `Joltrex knocks out the 1-HP front (staged) with an ordinary attack; the next monster enters, then takes a ${c.values.followUpPct}% follow-up.`,
        setup: () => ({ a: [{ species: 'joltrex' }], b: [{ species: 'gravelpup', hp: 1 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { const en = h.ev('enter', (e) => e.actor === 'b1')[0]; const d = h.ab('damage')[0]; h.check('follow-up on the replacement after it entered', en && d && d.seq > en.seq && d.target === 'b1' && d.tag === 'followUp'); h.check(`${h.values.followUpPct}%`, d?.mult === h.values.followUpPct / 100); h.executed(1); } },
      { id: 'no-replacement', kind: 'blocked', title: 'The knockout ends the battle: no follow-up',
        explain: () => 'The opponent has no reserve: the battle is won, nothing follows.',
        setup: () => ({ a: [{ species: 'joltrex' }], b: [{ species: 'gravelpup', hp: 1 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no follow-up', h.ab('damage').length === 0); } },
      { id: 'special-ko', kind: 'blocked', title: 'A knockout by a special (controlled) does not qualify',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes Joltrex\'s attack a special: the knockout does not qualify.',
        setup: () => ({ a: [{ species: 'joltrex' }], b: [{ species: 'gravelpup', hp: 1 }, { species: 'tinhare' }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }, { chooseAction: (v, id) => (id === 'a0' ? { kind: 'attack', abilityId: 'TEST-SPECIAL', mult: 1 } : null) }] }),
        expect: (r, h) => { h.check('no follow-up (use kept)', h.ab('damage').length === 0 && h.state('a0')?.used === false); } },
    ],
  },
});
