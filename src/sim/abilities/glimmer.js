// LIG-01-F Beacon Lane (glimmer: Lumini / Photara). Task 8 M3 pilot (zone with a paused clock).
// Contract (Dex; N7b P3; N7d G2, G3): after his own reception that gains a first down while ready, he banks the next offensive field:
// an 8-wide by 6-long Light rectangle at the upcoming fixed 5-yard LB reference, centred on the initial ball lateral position.
// Creation waits for his next eligible on-field offensive snap (G3). The field lasts 1 / 1 / 2 / 2 participating offensive scrimmage
// plays by mastery, counting its creation play; the clock decrements only on the creator's offensive scrimmage plays and the field
// stays active while paused (G2); it clears at halftime (a pending creation carries through). Creator cooldown 6 / 5 / 4 / 3
// offensive plays, starting at creation; it cannot receive its own field's recharge. The Light field's effect (spec §11) is applied by
// the game (rules.js): a non-Light monster finishing a participating scrimmage play inside gets one extra cooldown unit, after the
// ordinary decrement, on his shortest positive running repeatable-signature cooldown, once per monster per play.
import { registerAbility } from './registry.js';
import { approvedValues } from '../../data/beast-dex.js';

const LIFETIME = approvedValues('LIG-01-F').lifetimePlaysByMastery; // [1, 1, 2, 2]
const COOLDOWN = [6, 5, 4, 3]; // Dex "Recharge / frequency": creator cooldown by mastery
export const BEACON = Object.freeze({ width: 8, length: 6, lbDepth: 5 });

export default registerAbility({
  family: 'glimmer', abilityId: 'LIG-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) { const st = ctx.state(self); if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; } },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'off' || s.kickoff || s.twoPoint) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // the creator's offensive plays count; the creation play starts the cooldown
      st.fresh = false;
      if (st.cd === 0 && !st.banked && s.receiver === self.slot && s.firstDown) {
        st.banked = true; ctx.executed(self);
        ctx.queueField({ owner: self.mid, ownerTeam: ctx.teamSide, type: 'Light', ability: 'LIG-01-F', lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'creatorOffense', width: BEACON.width, length: BEACON.length, lbDepth: BEACON.lbDepth, offenseOnly: true });
        ctx.log(`${self.name} banks a Beacon Lane`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-01-F' });
      }
    },
  },
});
