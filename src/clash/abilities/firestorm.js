// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// FIR-03-C Falling Star (firestorm: Pyronix). Task 8 M4 S5 pilot: the delayed, slot-marked impact with a frozen target.
// Contract (Dex, owner-approved Task 10 revision 2026-11-13): launch a meteor in place of the normal attack, once per Clash; one
// meteor in flight per owner. It marks the normal target's lineup position, not the monster. Impact at the end of the following
// exchange after rotations: the target identity is frozen when the impact begins (the marked occupant). One hit, 150/160/170/180%
// by mastery. NO splash: no other opponent, reserve or team-mate of the target is ever damaged; an empty marked slot is hit by
// nobody. The hit is a delayed direct attack (its own type, defence, shield and explicit-miss roll) and the target's reactions resolve
// right after it. The meteor persists through the owner's rotation and knockout (B3 rule 3: the owner's pre-KO strength, engine.js
// knockout snapshot). No Burn / stun, no adjacency. Mastery execution: the launch.
//
// 'delayed-slot' (flags.js, approved N9c: active position): when the launch target is no longer the active fighter at impact, the
// current occupant of the active position takes the hit. Outside the approved reading the disputed hit reports `awaiting ruling`.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

const MAIN = [150, 160, 170, 180];

/** The impact's target list [{ id, mult, key }] (at most the one main hit) and the disputed ids, for the given reading. */
export function delayedTargets(api, self, item, { mainPct }) {
  const f = item.frozen; const main = (id) => ({ id, mult: mainPct / 100, key: 'main hit' });
  if (!f.disputed) return { targets: f.occupantId ? [main(f.occupantId)] : [], disputed: [] };
  const disputedIds = [f.occupantId, ...(f.launchTargetAlive ? [f.launchTargetId] : [])];
  if (!api.provisional(self, 'delayed-slot', `${$E('clashlog.the_launch_target_is_no_longer', { name: api.get(f.launchTargetId).name })}`)) return { targets: [], disputed: disputedIds };
  if (api.flags.delayedSlot.value === 'active-position') return { targets: f.occupantId ? [main(f.occupantId)] : [], disputed: [] };
  return { targets: f.launchTargetAlive ? [main(f.launchTargetId)] : [], disputed: [] }; // lineup index: the launch target keeps the mark (or the slot is empty)
}

export default registerClashAbility({
  family: 'firestorm', abilityId: 'FIR-03-C',
  initBattle: () => ({ used: false, inFlight: false }),
  values: (form, tier) => ({ mainPct: byTier(MAIN, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      const st = self.state;
      if (st.used) return null; // spent: the ordinary attack (no second meteor)
      if (!foeId) return unmet('opposing active fighter');
      api.trigger(self, $E('clashlog.ready_normal_action_opposing_active_present'), { targetId: foeId });
      st.used = true; st.inFlight = true;
      api.delay(self, { targetSide: api.get(foeId).side, targetId: foeId, after: 1 });
      api.activate(self, $E('clashlog.meteor_launched_in_place_of_the'), { targetId: foeId });
      api.executed(self);
      return { kind: 'done' };
    },
    delayedImpact(api, self, item) {
      const me = api.me(self); const exception = me.koed ? 'FIR-03-C' : undefined;
      const { targets, disputed } = delayedTargets(api, self, item, { mainPct: byTier(MAIN, self.tier) });
      for (const t of targets) {
        if (api.get(t.id).koed) continue; // already knocked out: frozen identity, no target
        const r = api.strike(self, t.id, { tag: 'delayed', mult: t.mult, strikeKey: t.key, label: `${$E('clashlog.falling_star', { key: t.key })}`, exception, normalAction: false });
        if (r.decided) break;
      }
      self.state.inFlight = false;
      api.cleanup(self, disputed.length ? `${$E('clashlog.meteor_resolved_disputed_hit_s_awaiting', { n: disputed.length })}` : 'meteor resolved');
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Launch, then one hit on the marked occupant at the end of the next exchange; reserves untouched',
        explain: (c) => `Pyronix launches its meteor instead of attacking; at the end of exchange 2 the opposing active takes ${c.values.mainPct}% of a normal attack. No other opponent is hit: the two reserves keep their HP.`,
        setup: () => ({ a: [{ species: 'firestorm' }], b: [{ species: 'pebble', overall: 90 }, { species: 'tidepaw', overall: 90 }, { species: 'lumen', overall: 90 }], seed: 3, stopAt: { exchange: 2 } }),
        expect: (r, h) => {
          h.stages('trigger', 'activation', 'resolution', 'cleanup');
          const launch = h.ab('delayed_launch')[0]; h.check('launched at exchange 1 in place of the attack', launch && launch.ex === 1 && !h.has('damage', (e) => e.actor === 'a0' && e.ex === 1));
          const imp = h.ab('delayed_impact')[0]; h.check('impact at the end of exchange 2, after the rotation phase', imp && imp.ex === 2 && imp.phase === 'end_of_exchange');
          const hits = h.ab('damage', (e) => e.ex === 2); h.check('one hit, the main hit on the active', hits.length === 1 && hits[0].strikeKey === 'main hit' && hits[0].target === 'b0', hits.map((e) => `${e.target}:${e.strikeKey}:${e.mult}`));
          h.check(`main ${h.values.mainPct}%`, hits.length === 1 && hits[0].mult === h.values.mainPct / 100);
          h.check('no reserve takes any damage from the meteor', !h.has('damage', (e) => e.abilityId === 'FIR-03-C' && (e.target === 'b1' || e.target === 'b2')));
          h.executed(1);
        } },
      { id: 'once-per-clash', kind: 'depletion', title: 'A second launch is not available: the ordinary attack follows',
        explain: () => 'After the meteor is spent, Pyronix makes ordinary attacks for the rest of the Clash; no second launch and no second impact.',
        setup: () => ({ a: [{ species: 'firestorm' }], b: [{ species: 'pebble', overall: 95 }, { species: 'tidepaw', overall: 95 }], seed: 5, stopAt: { exchange: 5 } }),
        expect: (r, h) => { h.check('exactly one launch', h.ab('delayed_launch').length === 1); h.check('ordinary attacks from exchange 2', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary' && e.ex >= 2)); h.check('one impact only', h.ab('delayed_impact').length === 1); } },
      { id: 'source-ko', kind: 'sourceKO', title: 'The owner is knocked out before the impact: the meteor still lands at its pre-KO strength',
        explain: () => 'Pyronix launches at exchange 1 and is knocked out in exchange 2 before the end of the exchange; the meteor still impacts (B3 rule 3) with Pyronix\'s strength as it was before the knockout.',
        setup: () => ({ a: [{ species: 'firestorm', hp: 1 }, { species: 'tidepaw' }], b: [{ species: 'pebble', overall: 90 }, { species: 'lumen' }], seed: 2, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const ko = h.ev('ko', (e) => e.target === 'a0')[0]; const imp = h.ab('delayed_impact')[0]; h.check('owner knocked out before the impact', ko && imp && ko.seq < imp.seq && imp.postKO === true); h.check('the impact still deals damage', h.ab('damage', (e) => e.ex === 2 && e.actor === 'a0').length >= 1); h.stages('activation', 'resolution', 'cleanup'); } },
      { id: 'occupant-changes-provisional', kind: 'multiTarget', title: 'APPROVED N9c (active-position reading): the replacement takes the hit, nobody else',
        explain: () => 'Approved reading T8_FLAGS.delayedSlot = active position: the current occupant of the active position (the replacement) takes the hit; no other opponent is damaged. Approved by N9c; no splash (Task 10).',
        setup: () => ({ a: [{ species: 'firestorm', overall: 95 }, { species: 'voltfang', overall: 95 }], b: [{ species: 'kindlet', hp: 1 }, { species: 'gravelpup' }, { species: 'tinhare' }], seed: 7, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.rulingUsed('delayed-slot'); const imp = h.ab('delayed_impact')[0]; const hits = h.ab('damage', (e) => e.ex === 2); const meteor = hits.filter((e) => e.abilityId === 'FIR-03-C' || e.strikeKey === 'main hit'); h.check('the replacement takes the one hit; no other opponent is damaged by the meteor', imp && meteor.length === 1 && meteor[0].target === imp.occupant && meteor[0].strikeKey === 'main hit', meteor.map((e) => `${e.target}:${e.strikeKey}`)); } },
      { id: 'no-target', kind: 'blocked', title: 'No opposing active (battle decided): nothing to launch at',
        explain: () => 'With the Clash decided before Pyronix acts, the meteor never launches; the state shows the use preserved.',
        setup: () => ({ a: [{ species: 'pebble', overall: 99 }, { species: 'firestorm' }], b: [{ species: 'tidepaw', hp: 1 }], seed: 1 }),
        expect: (r, h) => { h.check('no launch', h.ab('delayed_launch').length === 0); h.check('use preserved (no unmet: the battle ended first)', h.state('a1')?.used === false); } },
    ],
  },
});
