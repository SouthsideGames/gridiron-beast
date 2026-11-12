// EAR-01-F Clean Sweep (pebble: Pebblit / Cobblon / Orogon; OL). Task 8 M3, Earth batch (special action).
// Contract (Dex): an ordinary successful pancake banks one guarantee (maximum one) for a LATER participating offensive scrimmage play.
// On that play his first legal pancake opportunity (the engine's once-per-play opportunity at his first engagement: normal reach and
// engagement) is a guaranteed pancake: no opportunity, success or recovery roll; the ordinary Knocked Down still goes through the
// shared gate. A guaranteed pancake never earns another guarantee. No extra cooldown. If the target's current status blocks Knocked
// Down, that target is skipped and the guarantee is kept. Preserved through possession changes and halftime; cleared at game end
// (game-scope state). Same mechanic for every form and mastery.
//
// Choices where the contract is silent (documented, minimal):
// - "Offensive scrimmage play" excludes kickoff returns and two-point tries, both for earning and for using.
// - A skipped (status-blocked) target keeps the once-per-play budget rule: that engagement's ordinary opportunity resolves as usual
//   and the guarantee waits for a later play (the engine gives an OL one pancake opportunity per play).
// - A play in which the activation is denied (Eclipse field, Cold Snap) leaves the guarantee banked; the ordinary roll still happens.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the guaranteed
// pancake is the live activation (gated); banking a guarantee from an ordinary pancake is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { tryApply } from '../t8/status.js';
import { scrimmage } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const kdBlocked = (ctx, d) => d.knockedDown || !tryApply(ctx.statusOf(d), { id: 'knockedDown', strength: 1, duration: 0, mode: 'football', restOfPlay: true }).accepted;

export default registerAbility({
  family: 'pebble', abilityId: 'EAR-01-F',
  initGame: () => ({ banked: false }),
  hooks: {
    playStart(ctx, self) { self.cs = { used: false }; },
    pancakeOpportunity(ctx, self, d) {
      const st = ctx.state(self);
      if (!st.banked || self.team !== 'off' || !scrimmage(ctx)) return undefined;
      if (kdBlocked(ctx, d)) { ctx.log(`${$E('sim.cannot_be_knocked_down_keeps_his', { name: d.name, name2: self.name })}`, { kind: 'ability_skip', by: self.slot, side: self.team, victim: d.slot, ability: 'EAR-01-F' }); return undefined; }
      if (!ctx.canStartSignature(self)) return undefined;
      st.banked = false; self.cs.used = true; ctx.executed(self);
      ctx.log(`${$E('sim.s_clean_sweep_a_stone_fist', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, victim: d.slot, ability: 'EAR-01-F' });
      return { guarantee: true };
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'off' || s.kickoff || s.twoPoint || self.cs?.used) return; // a guaranteed pancake never earns another
      const st = ctx.state(self);
      if (!st.banked && (ctx.stats.blockers?.[self.slot]?.pancakes || 0) > 0 && ctx.canGainCharge(self)) {
        st.banked = true; ctx.log(`${$E('sim.banks_a_clean_sweep', { name: self.name })}`, { kind: 'ability_ready', by: self.slot, side: self.team, ability: 'EAR-01-F' });
      }
    },
  },
});
