// ICE-05-F Cold Snap (glaciron: Shardok; OL). Task 8 M3, Ice batch (aura).
// Contract (Dex, owner B): while he has a blocking assignment AND is actually block-engaged, ready, and not Stunned or Knocked Down,
// a three-yard aura follows him. The first opposing monster attempting a NEW ability activation inside it (simultaneous attempts:
// stable lineup order) is suppressed: it cannot activate its ability or gain a new ability charge for the rest of the current play,
// even after leaving the aura. Its existing charge and readiness stay intact and it spends no cooldown; earlier charge gain is not
// undone. One enemy per activation; cooldown 5 / 4 / 3 / 2 subsequent OFFENSIVE plays. Suppression ends at the whistle; a later play
// needs an ordinary fresh trigger (no auto-fire or replay). It never cancels active effects, passives, fields or launched objects.
// Ability state, not a shared status (an existing status cannot block it).
//
// Engine: contracts route every new activation through ctx.canStartSignature and every charge gain through ctx.canGainCharge; this
// module answers the gate's `activationAttempt` hook (engine.js activationAllowed). Labs, reviewers and previews award nothing.
//
// Choices where the contract is silent (documented, minimal):
// - "Blocking assignment": the engine's blocking jobs (block, run_block, pull), engaged with any defender.
// - "Inside range": the attempting monster within three yards of him at the attempt.
// - Mastery: the Aura category's passive rule (at most one mastery credit per game; M3_PLAN) applies to its suppressions.
// - The cooldown counts his own subsequent offensive scrimmage plays; kickoffs and two-point tries are excluded.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): Cold Snap is the
// activation-denial aura itself (Dex category Aura): it answers the gate's activationAttempt hook and is not a signature start of its
// own; not gated (an Eclipse does not switch it off; no contract or ruling says otherwise).
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, countDown } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const COOLDOWN = [5, 4, 3, 2];
export const COLD_SNAP = Object.freeze({ radius: 3, jobs: Object.freeze(['block', 'run_block', 'pull']) });

export default registerAbility({
  family: 'glaciron', abilityId: 'ICE-05-F', repeatableCooldown: true, passive: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.cold ||= { fired: false }; }, // actors are new each play; lazily created too, since another contract's snap may ask first

    activationAttempt(ctx, self, att) {
      const st = ctx.state(self); self.cold ||= { fired: false };
      if (self.cold.fired || st.cd > 0 || self.team !== 'off' || !scrimmage(ctx)) return undefined;
      if (!self.engaged || !COLD_SNAP.jobs.includes(self.assignment?.a) || disabled(ctx, self) || ctx.dist(self, att) > COLD_SNAP.radius) return undefined;
      self.cold.fired = true; st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; ctx.executed(self, { passive: true });
      ctx.log(`${$E('sim.s_cold_snap_freezes_s_ability', { name: self.name, name2: att.name })}`, { kind: 'ability', by: self.slot, side: self.team, victim: att.slot, victimSide: att.team, ability: 'ICE-05-F', suppressed: att.family || null });
      return { suppress: true };
    },
    playEnd(ctx, self, s) { if (self.team === 'off' && !s.kickoff && !s.twoPoint) countDown(ctx.state(self)); },
  },
});
