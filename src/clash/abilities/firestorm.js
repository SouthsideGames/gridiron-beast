// Owner N9c supersedes historical awaiting-ruling comments for the resolved gates in this module.
// FIR-03-C Falling Star (firestorm: Pyronix). Task 8 M4 S5 pilot: the delayed, slot-marked impact with frozen targets.
// Contract (Dex): launch a meteor in place of the normal attack, once per Clash; one meteor in flight per owner. It marks the normal
// target's lineup position, not the monster. Impact at the end of the following exchange after rotations: target identities are
// frozen when the impact begins (the marked occupant first, then every other living opponent front-to-back, reserves included). Main
// hit 150/160/170/180% by mastery; Task 10 candidate splash 15/20/25/30% to EVERY other living opponent; an empty main slot still splashes everyone.
// Each hit is an independent delayed direct attack (its own type, defence, shield and explicit-miss roll) and each damaged target's
// reactions resolve right after its hit. The meteor persists through the owner's rotation and knockout (B3 rule 3: the owner's pre-KO
// strength, engine.js knockout snapshot). No Burn / stun, no adjacency. Mastery execution: the launch.
//
// Awaiting ruling ('delayed-slot', flags.js): when the launch target is no longer the active fighter at impact (it rotated out or was
// knocked out and replaced), "the marked position" is disputed: the active position (its new occupant takes the main hit) or the
// lineup index (the launch target, or an empty slot). In normal gameplay the undisputed splash hits resolve and the disputed hits report
// `awaiting ruling`; the reading in T8_FLAGS.delayedSlot applies only in provisional mode. The cap case is 'd8-cap-delayed' (engine).
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';
import { E as $E } from '../../core/english.js';

// Task 10 candidate: reduce all-reserve splash while preserving the meteor's identity.
const MAIN = [150, 160, 170, 180], SPLASH = [15, 20, 25, 30];

/** The impact's target list [{ id, mult, key }] for the given reading, or null when the reading is withheld (disputed, normal mode). */
export function delayedTargets(api, self, item, { mainPct, splashPct }) {
  const f = item.frozen; const main = (id) => ({ id, mult: mainPct / 100, key: 'main hit' }); const splash = (id) => ({ id, mult: splashPct / 100, key: 'splash' });
  if (!f.disputed) return { targets: [...(f.occupantId ? [main(f.occupantId)] : []), ...f.others.map(splash)], disputed: [] };
  const disputedIds = [f.occupantId, ...(f.launchTargetAlive ? [f.launchTargetId] : [])];
  if (!api.provisional(self, 'delayed-slot', `${$E('clashlog.the_launch_target_is_no_longer', { name: api.get(f.launchTargetId).name })}`)) {
    return { targets: f.others.filter((id) => !disputedIds.includes(id)).map(splash), disputed: disputedIds };
  }
  if (api.flags.delayedSlot.value === 'active-position') return { targets: [main(f.occupantId), ...f.others.map(splash)], disputed: [] };
  const all = [f.occupantId, ...f.others]; // lineup index: the launch target keeps the mark (or the slot is empty when it is down)
  return { targets: [...(f.launchTargetAlive ? [main(f.launchTargetId)] : []), ...all.filter((id) => id !== f.launchTargetId).map(splash)], disputed: [] };
}

export default registerClashAbility({
  family: 'firestorm', abilityId: 'FIR-03-C',
  initBattle: () => ({ used: false, inFlight: false }),
  values: (form, tier) => ({ mainPct: byTier(MAIN, tier), splashPct: byTier(SPLASH, tier) }),
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
      const { targets, disputed } = delayedTargets(api, self, item, { mainPct: byTier(MAIN, self.tier), splashPct: byTier(SPLASH, self.tier) });
      for (const t of targets) {
        if (api.get(t.id).koed) continue; // knocked out by an earlier hit's reaction: frozen identity, no target
        const r = api.strike(self, t.id, { tag: 'delayed', mult: t.mult, strikeKey: t.key, label: `${$E('clashlog.falling_star', { key: t.key })}`, exception, normalAction: false });
        if (r.decided) break;
      }
      self.state.inFlight = false;
      api.cleanup(self, disputed.length ? `${$E('clashlog.meteor_resolved_disputed_hit_s_awaiting', { n: disputed.length })}` : 'meteor resolved');
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Launch, then the main hit and the splash at the end of the next exchange',
        explain: (c) => `Pyronix launches its meteor instead of attacking; at the end of exchange 2 the opposing active takes ${c.values.mainPct}% and every other living opponent (reserves included) ${c.values.splashPct}% of a normal attack, each with its own type and defense.`,
        setup: () => ({ a: [{ species: 'firestorm' }], b: [{ species: 'pebble', overall: 90 }, { species: 'tidepaw', overall: 90 }, { species: 'lumen', overall: 90 }], seed: 3, stopAt: { exchange: 2 } }),
        expect: (r, h) => {
          h.stages('trigger', 'activation', 'resolution', 'cleanup');
          const launch = h.ab('delayed_launch')[0]; h.check('launched at exchange 1 in place of the attack', launch && launch.ex === 1 && !h.has('damage', (e) => e.actor === 'a0' && e.ex === 1));
          const imp = h.ab('delayed_impact')[0]; h.check('impact at the end of exchange 2, after the rotation phase', imp && imp.ex === 2 && imp.phase === 'end_of_exchange');
          const hits = h.ab('damage', (e) => e.ex === 2); h.check('main hit on the active, splash on both reserves', hits.length === 3 && hits[0].strikeKey === 'main hit' && hits[0].target === 'b0' && hits.slice(1).every((e) => e.strikeKey === 'splash'), hits.map((e) => `${e.target}:${e.strikeKey}:${e.mult}`));
          h.check(`main ${h.values.mainPct}%, splash ${h.values.splashPct}%`, hits.length === 3 && hits[0].mult === h.values.mainPct / 100 && hits[1].mult === h.values.splashPct / 100);
          h.check('reserves take no Tank guard (only the active does)', hits.slice(1).every((e) => !e.guard));
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
      { id: 'occupant-changes-provisional', kind: 'multiTarget', title: 'APPROVED N9c (active-position reading): the replacement takes the main hit',
        explain: () => 'Approved reading T8_FLAGS.delayedSlot = active position: the current occupant of the active position (the replacement) takes the main hit and every other living opponent the splash. Approved by N9c.',
        setup: () => ({ a: [{ species: 'firestorm', overall: 95 }, { species: 'voltfang', overall: 95 }], b: [{ species: 'kindlet', hp: 1 }, { species: 'gravelpup' }, { species: 'tinhare' }], seed: 7, stopAt: { exchange: 2 } }),
        expect: (r, h) => { h.rulingUsed('delayed-slot'); const imp = h.ab('delayed_impact')[0]; const hits = h.ab('damage', (e) => e.ex === 2); h.check('the replacement takes the main hit; the others splash', imp && hits.length >= 2 && hits.every((e) => (e.target === imp.occupant ? e.strikeKey === 'main hit' : e.strikeKey === 'splash'))); } },
      { id: 'no-target', kind: 'blocked', title: 'No opposing active (battle decided): nothing to launch at',
        explain: () => 'With the Clash decided before Pyronix acts, the meteor never launches; the state shows the use preserved.',
        setup: () => ({ a: [{ species: 'pebble', overall: 99 }, { species: 'firestorm' }], b: [{ species: 'tidepaw', hp: 1 }], seed: 1 }),
        expect: (r, h) => { h.check('no launch', h.ab('delayed_launch').length === 0); h.check('use preserved (no unmet: the battle ended first)', h.state('a1')?.used === false); } },
    ],
  },
});
