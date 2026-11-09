// FIR-03-C Falling Star (firestorm: Pyronix). Task 8 M4 S5 pilot: the delayed, slot-marked impact with frozen targets.
// Contract (Dex): launch a meteor in place of the normal attack, once per Clash; one meteor in flight per owner. It marks the normal
// target's lineup position (the opposing ACTIVE position under T8_FLAGS.delayedSlot, see flags.js), not the monster. Impact at the end
// of the following exchange after rotations: the target identities are frozen when the impact begins (the marked occupant first, then
// every other living opponent front-to-back, reserves included). Main hit 150/160/170/180% by mastery; splash 50/55/60/65% to EVERY
// other living opponent; an empty main slot still splashes everyone. Each hit is an independent delayed direct attack (its own type,
// defence, shield and explicit-miss roll; one diversion cannot cancel the other hits) and each damaged target's reactions resolve
// right after its hit. The meteor persists through the owner's rotation and knockout (B3 rule 3 exception: the owner's pre-KO strength,
// engine.js knockout snapshot). No Burn / stun, no adjacency. Mastery execution: the launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, unmet } from './util.js';

const MAIN = [150, 160, 170, 180], SPLASH = [50, 55, 60, 65];

export default registerClashAbility({
  family: 'firestorm', abilityId: 'FIR-03-C',
  initBattle: () => ({ used: false, inFlight: false }),
  values: (form, tier) => ({ mainPct: byTier(MAIN, tier), splashPct: byTier(SPLASH, tier) }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      const st = self.state;
      if (st.used) return null; // spent: the ordinary attack (no second meteor)
      if (!foeId) return unmet('opposing active fighter');
      api.trigger(self, 'ready, normal action, opposing active present', { targetId: foeId });
      st.used = true; st.inFlight = true;
      api.delay(self, { targetSide: api.get(foeId).side, targetId: foeId, after: 1 });
      api.activate(self, 'meteor launched in place of the normal attack', { targetId: foeId });
      api.executed(self);
      return { kind: 'done' };
    },
    delayedImpact(api, self, item) {
      const v = byTier(MAIN, self.tier), s = byTier(SPLASH, self.tier);
      const me = api.me(self); const exception = me.koed ? 'FIR-03-C' : undefined;
      const targets = [...(item.frozen.occupantId ? [{ id: item.frozen.occupantId, mult: v / 100, key: 'main hit' }] : []), ...item.frozen.others.map((id) => ({ id, mult: s / 100, key: 'splash' }))];
      if (!targets.length) { api.cleanup(self, 'impacts with no living opponent'); self.state.inFlight = false; return; }
      for (const t of targets) {
        if (api.get(t.id).koed) continue; // knocked out by an earlier hit's reaction: frozen identity, but no target
        const r = api.strike(self, t.id, { tag: 'delayed', mult: t.mult, strikeKey: t.key, label: `Falling Star ${t.key}`, exception, normalAction: false });
        if (r.decided) break;
      }
      self.state.inFlight = false;
      api.cleanup(self, 'meteor resolved');
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Launch, then the main hit and the splash at the end of the next exchange',
        explain: (c) => `Pyronix launches its meteor instead of attacking; at the end of exchange 2 the opposing active takes ${c.values.mainPct}% and every other living opponent (reserves included) ${c.values.splashPct}% of a normal attack, each with its own type and defence.`,
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
      { id: 'occupant-changes', kind: 'multiTarget', title: 'The marked position changes hands before impact: the current occupant takes the main hit',
        explain: () => 'The opposing active at launch is knocked out before the impact; under the active-position reading (T8_FLAGS.delayedSlot) its replacement is the current occupant and takes the main hit, and every other living opponent takes the splash. (An empty marked position cannot occur under one active fighter: a side with no active has lost.)',
        setup: () => ({ a: [{ species: 'firestorm', overall: 95 }, { species: 'voltfang', overall: 95 }], b: [{ species: 'tidepaw', hp: 1 }, { species: 'pebble' }, { species: 'lumen' }], seed: 7, config: { policies: { a: 'none', b: 'none' } }, stopAt: { exchange: 2 } }),
        expect: (r, h) => { const imp = h.ab('delayed_impact')[0]; const hits = h.ab('damage', (e) => e.ex === 2); h.check('impact happened', !!imp); h.check('the replacement (now active) takes the main hit; the others splash', imp && hits.length >= 1 && hits.every((e) => (e.target === imp.occupant ? e.strikeKey === 'main hit' : e.strikeKey === 'splash'))); } },
      { id: 'no-target', kind: 'blocked', title: 'No opposing active (battle decided): nothing to launch at',
        explain: () => 'With the Clash decided before Pyronix acts, the meteor never launches; the state shows the use preserved.',
        setup: () => ({ a: [{ species: 'pebble', overall: 99 }, { species: 'firestorm' }], b: [{ species: 'tidepaw', hp: 1 }], seed: 1 }),
        expect: (r, h) => { h.check('no launch', h.ab('delayed_launch').length === 0); h.check('use preserved', h.state('a1')?.used === false); } },
    ],
  },
});
