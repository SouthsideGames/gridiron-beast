// DRA-01-F Dragon Pounce (drakeling: Drakling / Drakyra / Dracolossus, RB). Task 8 M3 (self enhancement; carrier contest hook).
// Contract (Dex): one successful ordinary juke or ordinary tackle break on the current rushing attempt (handoffs and pitches qualify;
// receiving and returns excluded) prepares a pounce against the next tackle attempt in the same play. Ability-guaranteed escapes are not
// ordinary evasion and do not prepare it. The pounce replaces that tackle-break contest with the ordinary contest plus 5 / 10 / 15
// percentage points by form, plus 0 / 3 / 6 / 9 by mastery; the final success chance is capped at 80%. Success breaks the tackle;
// failure continues the normal successful-tackle resolution (fumble check included) with no second ability reroll. At most one pounce
// attempt per play, no inter-play cooldown, and the pounce cannot prepare itself. All per-play state clears at the whistle; no carryover.
// Existing movement restrictions prevent activation; no immunity window, teleport or added yards; ordinary movement resumes after it.
// Choices where the contract is silent (minimal readings): the "next tackle attempt" is the next ordinary tackle contest (an arm tackle
// off a block is a different contest with no break roll, so it neither receives nor spends the pounce); "movement restrictions" are
// immobilisation (a stun, Knocked Down, a counted Stunned); the cap applies to the final chance as written, even if the ordinary break
// chance alone were above 80%; a two-point run is a rushing attempt (the contract excludes only receptions and returns).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the pounce at the
// next tackle contest is the live activation (gated: denied, no pounce on that attempt and nothing spent); per-play preparation, no
// game-scope charge.
import { registerAbility } from './registry.js';
import { E as $E } from '../../core/english.js';

export const POUNCE = Object.freeze({ form: [5, 10, 15], mastery: [0, 3, 6, 9], cap: 0.8 });
const stageOf = (form) => Number(String(form).split(':')[1] || 0);

export default registerAbility({
  family: 'drakeling', abilityId: 'DRA-01-F',
  hooks: {
    playStart(ctx, self) { self.pounce = { tried: false }; },
    tackleOdds(ctx, self, tackler, p) {
      const pc = self.pounce; if (!pc || pc.tried || self.team !== 'off' || ctx.kickoff || ctx.stats.receiver || ctx.stats.carrier !== self.slot) return undefined;
      if (self.stun > 0 || self.knockedDown) return undefined;
      const mine = (e) => e.by === self.slot && e.side === self.team;
      const prepared = ctx.events.some((e) => mine(e) && (e.kind === 'juke' || (e.kind === 'broken_tackle' && !e.contract))); // ordinary evasion only
      if (!prepared) return undefined;
      if (!ctx.canStartSignature(self)) return undefined; // denied: no pounce on this attempt; nothing spent
      pc.tried = true; ctx.executed(self);
      const bonus = ((POUNCE.form[stageOf(self.form)] ?? POUNCE.form[0]) + (POUNCE.mastery[self.mastery] ?? 0)) / 100;
      const brk = Math.min(POUNCE.cap, (1 - p) + bonus);
      ctx.log(`${$E('sim.pounces_at', { name: self.name, name2: tackler.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DRA-01-F', victim: tackler.slot, breakChance: +brk.toFixed(3), ordinary: +(1 - p).toFixed(3) });
      return 1 - brk;
    },
  },
});
