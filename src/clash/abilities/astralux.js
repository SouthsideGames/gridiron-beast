// PSY-06-C Astral Strike (astralux: Astralux; Striker, legendary). Batch F.
// Contract (Dex; closeouts 5-6): once per Clash while active and able, use its own normal action to command EVERY eligible living enemy
// reserve (Stunned reserves cannot attack; stable lineup snapshot) to basic-attack their own active teammate (the initial enemy active),
// each at 50 / 60 / 70 / 80% of ITS OWN normal damage by Astralux's mastery, each with normal accuracy / type / shield / defences and its
// own status modifiers; then Astralux performs its own 100% ordinary normal attack. No eligible reserve: ordinary Astralux attack, the
// signature kept. The use is spent when the first commanded attack launches, even if evaded. A commanded Confused reserve rolls its
// ordinary confusion chance and on a misfire attacks itself (no recursive roll). Commanded attacks cannot activate signatures, counters or
// extra-attack chains; attack retaliation stays suppressed (tag commanded); ordinary shields, Guarded and passive survival apply. Each
// whole attack resolves before the next. If the initial enemy active is knocked out early, the remaining commands are cancelled, the
// ordinary replacement enters, then Astralux attacks the replacement (B3 rule 3 continuation); no living enemy: victory ends it. Reserves
// stay reserves (no false entry effects). The own attack is literally "ordinary" (D16 review row; T8_FLAGS.ordinaryPerks literal). The
// commanded attacks are contested Stone Divide targets. Mastery execution: the first commanded launch.
import { registerClashAbility } from '../t8/registry.js';
import { byTier } from './util.js';
import { E as $E } from '../../core/english.js';

const POWER = [50, 60, 70, 80];

export default registerClashAbility({
  family: 'astralux', abilityId: 'PSY-06-C',
  initBattle: () => ({ used: false }),
  values: (form, tier) => ({ commandedPct: byTier(POWER, tier), ownPct: 100 }),
  hooks: {
    chooseAction(api, self, { foeId }) {
      if (self.state.used || !foeId) return null;
      const cmd = api.enemyReserves(self).filter((v) => !v.stunned);
      if (!cmd.length) return null;
      return { kind: 'run', run: (a, s) => {
        const initial = foeId; let first = true;
        for (const v of cmd) {
          if (a.get(initial).koed || !a.get(initial).active) { a.cleanup(s, $E('clashlog.the_initial_enemy_active_is_gone')); break; }
          if (first) { s.state.used = true; a.activate(s, `${$E('clashlog.enemy_reserve_s_commanded_at', { n: cmd.length, byTier: byTier(POWER, s.tier) })}`); a.executed(s); first = false; }
          const r = a.commandStrike(s, v.id, initial, { tag: 'commanded', mult: byTier(POWER, s.tier) / 100, confusable: true, strikeKey: 'commanded', label: $E('clashlog.astral_command') });
          if (r.decided) return true;
        }
        const tgt = a.foe(s); if (!tgt) return true;
        return a.strike(s, tgt.id, { tag: 'ordinary', mult: 1, strikeKey: 'own attack', label: $E('clashlog.astralux_attack'), exception: 'PSY-06-C' }).decided;
      } };
    },
  },
  review: {
    scenarios: [
      { id: 'activates', kind: 'valid', title: 'Every enemy reserve strikes its own active at the mastery share of its own power, then Astralux attacks',
        explain: (c) => `Two enemy reserves each basic-attack their active teammate for ${c.values.commandedPct}% of their own normal damage; then Astralux makes its ordinary attack. They stay in reserve.`,
        setup: () => ({ a: [{ species: 'astralux' }], b: [{ species: 'gravelpup', overall: 99, sparring: true }, { species: 'charbun', overall: 60 }, { species: 'kindlet', overall: 60 }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { const c = h.ev('damage', (e) => e.tag === 'commanded'); h.check('two commanded hits on b0 by b1 and b2', c.length === 2 && c.every((e) => e.target === 'b0') && c.map((e) => e.actor).join(',') === 'b1,b2'); h.check(`${h.values.commandedPct}%`, c.every((e) => e.mult === h.values.commandedPct / 100)); h.check('then Astralux\'s ordinary attack', h.has('damage', (e) => e.actor === 'a0' && e.tag === 'ordinary' && e.seq > c[1].seq)); h.check('no enemy rotation', !h.has('rotation')); h.executed(1); } },
      { id: 'no-reserve', kind: 'blocked', title: 'No eligible enemy reserve: ordinary attack, the signature kept',
        explain: () => 'A lone opponent: nobody to command.',
        setup: () => ({ a: [{ species: 'astralux' }], b: [{ species: 'gravelpup' }], seed: 1, stopAt: { exchange: 1 } }),
        expect: (r, h) => { h.check('no command (use kept)', h.state('a0')?.used === false); } },
      { id: 'early-ko', kind: 'sourceKO', title: 'The initial active falls to the first command: the rest are canceled; Astralux attacks the replacement',
        explain: () => 'The enemy active is staged at 1 HP: the first commanded hit knocks it out, the remaining command is canceled, the replacement enters, and Astralux attacks it.',
        setup: () => ({ a: [{ species: 'astralux' }], b: [{ species: 'gravelpup', hp: 1 }, { species: 'charbun' }, { species: 'kindlet' }], seed: 1, stopAt: { exchange: 1, turn: 1 }, probes: [{ initiative: (v, id) => (id === 'a0' ? { priority: 1 } : null) }] }),
        expect: (r, h) => { h.check('one commanded hit', h.ev('damage', (e) => e.tag === 'commanded').length === 1); h.check('remaining commands canceled', h.has('cleanup', (e) => e.abilityId === 'PSY-06-C')); h.check('Astralux attacks the replacement b1', h.has('damage', (e) => e.actor === 'a0' && e.target === 'b1')); } },
    ],
  },
});
