// DRA-02-F Dragon Call (wyrmkit: Wyrmlet / Ouroborn, TE). Task 8 M3 (aura with a snap-time pulse).
// Contract (Dex): three participating offensive scrimmage plays fill the bar; at his next eligible offensive snap it pulses on its own.
// Everyone within the initial radius is snapshotted (Wyrmlet 3 yards, Ouroborn 5: himself, team-mates and opponents). Each recipient's
// removable harmful shared status is cleansed (beneficial and explicitly unremovable statuses stay), then he is protected against new
// harmful shared statuses for the rest of the play; the protection follows the snapshot recipients after they leave the radius and ends
// at the whistle. He can pulse while Stunned and cleanse his own removable harmful status. No second shared-status slot is created.
// The full bar is spent on the pulse; the activation play cannot recharge; recharge starts with the following participating play; the
// partial or full bar survives possessions, halftime and overtime (game-scope state) and clears at the actual game end. Environmental
// zone modifiers continue; ability-specific effects (Daybreak wandering, Sovereign Arm capture) still apply; a retained unremovable
// harmful status stays while new harmful applications are refused.
// Choices where the contract is silent (minimal readings): "unremovable" is a status slot whose payload says so (no football status is
// unremovable today, so every football harmful status is removable); "eligible offensive snap" excludes kickoffs and two-point tries
// (which also never charge); an aura gives one mastery credit per game when its core effect applies (registry: passive).
import { registerAbility } from './registry.js';
import { STATUS } from '../t8/status.js';

export const DRAGON_CALL = Object.freeze({ plays: 3, radius: [3, 5] });
const stageOf = (form) => Number(String(form).split(':')[1] || 0);

export default registerAbility({
  family: 'wyrmkit', abilityId: 'DRA-02-F', passive: true,
  initGame: () => ({ bar: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.call = { pulsed: false }; const st = ctx.state(self);
      if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint || st.bar < DRAGON_CALL.plays) return;
      const R = DRAGON_CALL.radius[stageOf(self.form)] ?? DRAGON_CALL.radius[0];
      const snap = ctx.actors.filter((a) => a === self || ctx.dist(a, self) <= R);
      const cleansed = [];
      for (const a of snap) {
        const slot = ctx.statusOf(a);
        if (slot && STATUS[slot.id]?.kind === 'harmful' && !slot.payload?.unremovable) { ctx.removeStatus(a); cleansed.push(`${a.team}:${a.slot}`); }
        ctx.ward(a);
      }
      st.bar = 0; self.call.pulsed = true; ctx.executed(self, { passive: true });
      ctx.log(`${self.name}'s Dragon Call pulses`, { kind: 'ability', by: self.slot, side: self.team, ability: 'DRA-02-F', radius: R, recipients: snap.map((a) => `${a.team}:${a.slot}`), cleansed, x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
    playEnd(ctx, self) {
      if (self.team !== 'off' || ctx.kickoff || ctx.twoPoint || self.call?.pulsed) return; // the activation play cannot recharge
      const st = ctx.state(self); if (st.bar < DRAGON_CALL.plays) st.bar += 1;
    },
  },
});
