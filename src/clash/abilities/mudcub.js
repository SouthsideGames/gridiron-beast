// WAT-02-C Shared Burden (mudcub: Muddlet / Sludgeon). Task 8 M4 S5 pilot: the reserve link and the 8c raw split.
// Contract (Dex, spec §9): once per Clash, on its first own normal turn able to act with another living ally, Muddlet creates the
// link INSTEAD of attacking (as the last survivor it attacks normally and keeps the use). The link protects the CURRENT active ally
// only while the owner is in reserve, never itself; the protected ally changes with rotation, with no reset. On a hit the RAW attack
// is split after the original target's explicit misses (a miss damages neither): the owner's share is 30/32/34/36% (Muddlet) or
// 40/42/44/46% (Sludgeon) by mastery, floored, the ally takes the rest (§9: 101 at 30% gives 30 and 71); each recipient then applies
// its own type, defence and shield. The reserve owner gets NO Tank guard on its share (21B); the share is transferred damage (not a
// direct attack, status transfer or retaliation trigger; no link chain). The link lasts THREE protected-ally own normal turns while
// the owner is in reserve (Stunned skips count; paused while the owner is active). Owner KO ends the link; the current hit keeps its
// split (B3 rule 3). Only the strongest available link protects a hit (highest share; ties earliest creation, then stable id: engine).
// Mastery execution: the link creation.
import { registerClashAbility } from '../t8/registry.js';
import { byTier, byStage, unmet, enemyOf } from './util.js';
import { decisionsPlan } from '../t8/review.js';
import { E as $E } from '../../core/english.js';

const SHARE = [[30, 32, 34, 36], [40, 42, 44, 46]];

export default registerClashAbility({
  family: 'mudcub', abilityId: 'WAT-02-C',
  initBattle: () => ({ used: false, link: null }), // link: { since (exchange), turnsLeft }
  values: (form, tier) => ({ sharePct: byTier(byStage(SHARE, Number(form.split(':')[1])), tier), linkTurns: 3 }),
  hooks: {
    chooseAction(api, self) {
      const st = self.state; if (st.used) return null;
      const others = api.allies(self).filter((v) => v.id !== self.id);
      if (!others.length) return unmet({ condition: 'another living ally', detail: $E('clashlog.last_survivor_attacks_normally_use_preserved') });
      api.trigger(self, $E('clashlog.first_able_normal_turn_with_another'));
      st.used = true; st.link = { since: api.ex(), turnsLeft: 3 };
      api.activate(self, $E('clashlog.link_created_instead_of_the_attack'));
      api.executed(self);
      return { kind: 'done' };
    },
    rawSplit(api, self, info) {
      const st = self.state; if (!st.link) return null;
      const me = api.me(self); if (me.active || me.koed) return null;
      const target = api.get(info.target); if (!target || target.side !== self.side || !target.active || target.id === self.id) return null;
      if (!enemyOf(api, self, info.attacker)) return null;
      const pct = byTier(byStage(SHARE, self.stage), self.tier);
      return { to: self.id, pct, since: st.link.since, abilityId: self.abilityId };
    },
    anyEndOfTurn(api, self, { id, side }) {
      const st = self.state; if (!st.link || side !== self.side) return;
      const me = api.me(self); if (me.active) return; // paused while the owner is active
      const ender = api.get(id); if (!ender?.active || ender.id === self.id) return;
      st.link.turnsLeft -= 1;
      if (st.link.turnsLeft <= 0) { st.link = null; api.cleanup(self, 'link expires after three protected normal turns'); }
    },
    onKO(api, self) { if (self.state.link) { self.state.link = null; api.cleanup(self, $E('clashlog.link_ends_at_the_owners_knockout')); } },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Link on turn 1, then a protected hit is split raw with the floored owner share',
        explain: (c) => `Muddlet links instead of attacking. Once it is in reserve, each enemy hit on the active ally is split before mitigation: Muddlet takes ${c.values.sharePct}% of the raw budget (floored), the ally the rest, each with its own defenses; Muddlet gets no Tank guard in reserve.`,
        setup: () => ({ a: [{ species: 'mudcub' }, { species: 'tidepaw', overall: 90 }], b: [{ species: 'pebble', overall: 99 }], seed: 4, config: { policies: { a: 'manual', b: 'none' }, decisions: { a: decisionsPlan({ 4: 'a1' }) } }, stopAt: { exchange: 7 } }),
        expect: (r, h) => {
          h.stages('trigger', 'activation');
          h.check('link created on turn 1, no attack by Muddlet that turn', h.ab('ability', (e) => e.ex === 1).length === 1 && !h.has('damage', (e) => e.actor === 'a0' && e.ex === 1));
          const splits = h.ab('raw_split'); h.check('splits happen only once Muddlet is in reserve (from exchange 5)', splits.length > 0 && splits.every((e) => e.ex >= 5), splits.map((e) => e.ex));
          const s0 = splits[0]; h.check(`owner share floored at ${h.values.sharePct}% of the whole budget; ally takes the rest`, s0 && s0.sourceShare === Math.floor((s0.whole * h.values.sharePct) / 100) && s0.targetShare === s0.whole - s0.sourceShare, s0 && `${s0.whole} -> ${s0.sourceShare} + ${s0.targetShare}`);
          const own = h.ev('damage', (e) => e.target === 'a0' && e.transferred); h.check('the transferred share gets no Tank guard', own.length > 0 && own.every((e) => !e.guard));
          h.check('the link lasts three protected normal turns', splits.length <= 3 && h.has('cleanup', (e) => e.abilityId === 'WAT-02-C' && /expires/.test(e.text)));
          h.executed(1);
        } },
      { id: 'last-survivor', kind: 'blocked', title: 'Alone on its side: Muddlet attacks normally and keeps the use',
        explain: () => 'With no other living ally the link has nobody to protect: Muddlet makes its ordinary attack and the once-use is preserved, reported as an unmet condition.',
        setup: () => ({ a: [{ species: 'mudcub' }], b: [{ species: 'pebble' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.unmetReported((e) => e.unmet.some((u) => u.condition === 'another living ally')); h.check('ordinary attack instead', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary')); h.check('use preserved', h.state('a0')?.used === false); } },
      { id: 'never-self', kind: 'blocked', title: 'While Muddlet is the active fighter the link protects nobody',
        explain: () => 'The link protects the current active ally only while Muddlet is in reserve; while Muddlet itself is active, hits on it are not split.',
        setup: () => ({ a: [{ species: 'mudcub' }, { species: 'tidepaw' }], b: [{ species: 'voltfang', overall: 85 }], seed: 2, stopAt: { exchange: 3 } }),
        expect: (r, h) => { h.check('no split while active', h.ab('raw_split').length === 0); h.check('link exists', h.state('a0')?.link != null); } },
      { id: 'owner-ko', kind: 'sourceKO', title: 'The reserve owner is knocked out by its share: the link ends, the current hit keeps its split',
        explain: () => 'Muddlet in reserve at low HP takes its share of a hit and is knocked out: the hit keeps its split (B3 rule 3), later hits are not split.',
        setup: () => ({ a: [{ species: 'tidepaw', overall: 90 }, { species: 'mudcub', hp: 2, ability: { used: true, link: { since: 0, turnsLeft: 3 } } }], b: [{ species: 'pebble', overall: 99 }], seed: 6, stopAt: { exchange: 4 } }),
        expect: (r, h) => { const ko = h.ev('ko', (e) => e.target === 'a1')[0]; const splits = h.ab('raw_split'); h.check('owner (staged in reserve with a live link) knocked out on a split hit', ko && splits.length === 1 && ko.ex === splits[0].ex && ko.hit === splits[0].hit); h.check('cleanup: the link ends at the knockout', h.has('cleanup', (e) => e.abilityId === 'WAT-02-C' && /knockout/.test(e.text))); h.check('no split afterwards', ko && !splits.some((e) => e.seq > ko.seq)); h.check('the ally still took its own share of that hit', ko && h.has('damage', (e) => e.hit === ko.hit && e.target === 'a0')); } },
    ],
  },
});
