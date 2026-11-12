// FIR-01-C Stoke the Flame (emberfox: Flaroo / Blazynx / Infernox; Balanced). Batch D.
// Contract (Dex, N7b P1): one charge per enemy direct-damage attack survived, HP or shield damage; a multi-hit counts once; delayed direct
// attacks count; misses, fully prevented zero damage, damage over time, counters and reactions do not. At three charges an immediate Fire
// counterburst OUTSIDE the normal turn at the triggering attacker (if invalid, the current opposing active), then the charge resets. At the
// third charge it must survive and be able to act immediately, otherwise the charge is consumed with no queued retaliation; a Stunned block
// consumes the Stoke charge but NOT Stunned duration. The counterburst is reaction damage (no reaction chain): 60 / 70 / 80% of normal
// attack damage by form plus 0 / 5 / 10 / 15 points by mastery (approved-values stokeTheFlamePct), normal type, DR and shield mitigation;
// no status or splash. Partial charge is kept through rotations and resets per Clash. Mastery execution: the counterburst.
import { registerClashAbility } from '../t8/registry.js';
import { approvedValues } from '../../data/beast-dex.js';
import { stokeTheFlamePct } from '../../data/approved-values.js';
import { byTier, byStage } from './util.js';

const V = approvedValues('FIR-01-C'); const NEEDED = 3;
const COUNTED = new Set(['ordinary', 'special', 'followUp', 'delayed', 'commanded', 'assist']);

export default registerClashAbility({
  family: 'emberfox', abilityId: 'FIR-01-C',
  initBattle: () => ({ charges: 0 }),
  values: (form, tier) => ({ counterburstPct: byStage(V.counterburstPctByStage, Number(form.split(':')[1])), masteryBonusPts: byTier(V.masteryBonusPts, tier), needed: NEEDED }),
  hooks: {
    afterWholeAttack(api, self, info) {
      const att = api.get(info.attackerId); if (!att || !COUNTED.has(info.tag)) return;
      const owner = api.curAttack()?.owner ?? info.attackerId; if (api.get(owner).side === self.side) return; // only an enemy's attack (a commanded strike belongs to its commander)
      const dmg = info.hits.reduce((s, h) => s + (h.losses?.[self.id] ?? 0) + (h.poolLosses?.[self.id] ?? 0), 0); if (dmg <= 0) return;
      const me = api.me(self); if (me.koed) return; // must survive
      const st = self.state; st.charges += 1;
      api.log(self, 'ability_progress', `${self.name}: Stoke the Flame ${st.charges} / ${NEEDED}`, { charges: st.charges, stage: 'trigger' });
      if (st.charges < NEEDED) return;
      st.charges = 0;
      if (me.stunned) { api.cleanup(self, 'the third charge is consumed: Stunned blocks the counter (Stunned duration untouched)'); return; }
      const target = !att.koed && att.side !== self.side ? att.id : api.foe(self)?.id;
      if (!target) { api.cleanup(self, 'the third charge is consumed: no valid target'); return; }
      const pctV = stokeTheFlamePct(self.form, self.tier);
      api.activate(self, `counterburst at ${pctV}%`, { targetId: target }); api.executed(self);
      api.strike(self, target, { tag: 'reaction', mult: pctV / 100, strikeKey: 'counterburst', label: 'Stoke the Flame' });
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Three survived attacks: an immediate counterburst outside the turn; the charge resets',
        explain: (c) => `Flaroo survives three enemy attacks; right after the third it counterbursts the attacker for ${c.values.counterburstPct + c.values.masteryBonusPts}% of its normal attack (reaction damage, no chain).`,
        setup: () => ({ a: [{ species: 'emberfox', overall: 99, sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const d = h.ab('damage'); h.check('one counterburst, on exchange 3, reaction-tagged', d.length === 1 && d[0].ex === 3 && d[0].tag === 'reaction'); h.check('power = form + mastery', d[0]?.mult === (h.values.counterburstPct + h.values.masteryBonusPts) / 100); h.check('charges reset', h.state('a0')?.charges === 1 || h.state('a0')?.charges === 0); h.executed(1); h.stages('trigger', 'activation', 'resolution'); } },
      { id: 'misses-no-charge', kind: 'blocked', title: 'Missed and fully absorbed-at-zero attacks give no charge (controlled misses)',
        explain: () => 'CONTROLLED PREREQUISITE (labeled): a reviewer probe makes every enemy attack miss Flaroo: no charge builds, no counterburst.',
        setup: () => ({ a: [{ species: 'emberfox', sparring: true }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 4 }, probes: [{ missCheck: (v, id) => (id === 'a0' ? { miss: true, source: 'controlled reviewer miss' } : null) }] }),
        expect: (r, h) => { h.check('no charge, no counterburst', h.state('a0')?.charges === 0 && h.ab('damage').length === 0); } },
      { id: 'stunned-consumes', kind: 'blocked', title: 'Stunned at the third charge: the charge is consumed with no counter; Stunned duration untouched',
        explain: () => 'Staged: two charges and a Stunned of 3 turns. The third hit consumes the charge; no counterburst; Stunned keeps its count.',
        setup: () => ({ a: [{ species: 'emberfox', overall: 99, sparring: true, ability: { charges: 2 }, status: { id: 'stunned', strength: 1, duration: 3 } }], b: [{ species: 'kindlet', overall: 40 }], seed: 1, stopAt: { exchange: 1 }, probes: [{ initiative: (v, id) => (id === 'b0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('consumed with no counter', h.has('cleanup', (e) => e.abilityId === 'FIR-01-C' && /Stunned/.test(e.text)) && h.ab('damage').length === 0); h.check('charge reset', h.state('a0')?.charges === 0); } },
      { id: 'no-chain', kind: 'interaction', title: 'The counterburst is reaction damage: it never triggers the target\'s own reactions',
        explain: () => 'Staged: both sides are Flaroo with two charges each. A hit triggers the defender\'s counterburst, which is a reaction: it builds no charge for the attacker and triggers no further counterburst.',
        setup: () => ({ a: [{ species: 'emberfox', overall: 99, ability: { charges: 2 } }], b: [{ species: 'emberfox', overall: 99, ability: { charges: 2 } }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('exactly one counterburst (b0 on a0)', h.ab('damage').length === 1 && h.ab('damage')[0].actor === 'b0'); h.check('a0 gained no charge from the reaction', h.state('a0')?.charges === 2); } },
    ],
  },
});
