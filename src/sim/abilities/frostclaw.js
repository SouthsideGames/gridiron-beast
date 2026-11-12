// ICE-03-F Snowfall Slam (frostclaw: Cryolynx; LB). Task 8 M3, Ice batch (special action).
// Contract (Dex, owner A rulings): three participating defensive scrimmage plays allowing <= THREE yards fill the bar (at most one a
// play; losses and incompletions included; no personal credit; touchdowns, special teams and two-point attempts excluded). At the next
// participating defensive scrimmage snap after a full bar he summons two snowballs (two-yard diameter) on two independently random,
// non-overlapping legal footprints between the line and FIVE yards into the offensive backfield, across the full legal width; landing
// markers show at the snap. He cannot move, cover, block or tackle until both land, then resumes his assignment. At impact the actual
// occupancy is checked: each offensive player in a footprint gets an independent Stunned roll (20 / 25 / 30 / 35% by mastery) through
// the normal shared-status gate, and the snowball disappears whatever the rolls; with no offensive player but a defender in it, it
// crumbles (no status, no obstacle, never trapping or displacing him); an empty footprint leaves a physical obstacle that blocks BOTH
// teams (Ice included; no damage or status on later contact). Obstacles and accepted impact Stunned clear at the whistle. The summon
// empties the bar; the activation play earns no charge; no extra cooldown; maximum one banked summon.
//
// Choices where the contract is silent (documented, minimal):
// - The landing time is the balance parameter LAND (0.6 s from the snap); during it he is held in place (no steering, engagement or
//   tackle) and then resumes.
// - "In the footprint" is a monster's body (0.35 yd) overlapping the two-yard circle.
// - A Stunned or Knocked Down Frostclaw at the snap does not summon and keeps the bar.
// - Opponent gain uses the play's net gain; an interception counts as no gain.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the snap summon is
// the live activation (gated); the low-yardage bar is an in-play charge gain (gated).
import { registerAbility } from './registry.js';
import { scrimmage, disabled, tier, allowedGain, BODY } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const STUN = [20, 25, 30, 35]; // % by mastery
export const SNOWFALL = Object.freeze({ maxGain: 3, full: 3, land: 0.6, radius: 1, backfield: 5 });

function footprints(ctx) {
  const B = ctx.bounds, R = SNOWFALL.radius, out = [];
  const lo = B ? B.left + R : -20, hi = B ? B.right - R : 20;
  for (let i = 0; i < 200 && out.length < 2; i++) {
    const p = { x: -SNOWFALL.backfield + R + ctx.rng.next() * (SNOWFALL.backfield - 2 * R), y: lo + ctx.rng.next() * (hi - lo) };
    if (out.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= 2 * R)) out.push(p);
  }
  return out;
}

export default registerAbility({
  family: 'frostclaw', abilityId: 'ICE-03-F',
  initGame: () => ({ bar: 0 }),
  hooks: {
    playStart(ctx, self) {
      self.sf = null; const st = ctx.state(self);
      if (st.bar < SNOWFALL.full || self.team !== 'def' || !scrimmage(ctx) || disabled(ctx, self)) return;
      if (!ctx.canStartSignature(self)) return;
      st.bar = 0; ctx.executed(self);
      self.sf = { at: ctx.t + SNOWFALL.land, balls: footprints(ctx), landed: false };
      self.stun = Math.max(self.stun, SNOWFALL.land); self.noEngage = Math.max(self.noEngage, SNOWFALL.land); self.vx = 0; self.vy = 0;
      ctx.log(`${$E('sim.slams_the_ground_two_snowballs_fall', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ICE-03-F', markers: self.sf.balls.map((b) => [+b.x.toFixed(2), +b.y.toFixed(2)]), radius: SNOWFALL.radius });
    },
    tick(ctx, self) {
      const sf = self.sf; if (!sf || sf.landed || ctx.t + 1e-9 < sf.at) return;
      sf.landed = true; const pct = tier(STUN, self.mastery); const R = SNOWFALL.radius + BODY;
      for (const b of sf.balls) {
        const inside = ctx.actors.filter((a) => Math.hypot(a.x - b.x, a.y - b.y) < R);
        const offense = inside.filter((a) => a.team !== self.team);
        if (offense.length) {
          b.result = 'hit';
          for (const a of offense) {
            const roll = ctx.rng.chance(pct / 100);
            if (roll) ctx.applyStatus(a, { id: 'stunned', strength: pct, duration: 0, restOfPlay: true, source: self, abilityId: 'ICE-03-F' });
            else ctx.log(`${$E('sim.shrugs_off_the_snowball', { name: a.name })}`, { kind: 'ability_miss', by: self.slot, side: self.team, victim: a.slot, ability: 'ICE-03-F' });
          }
        } else if (inside.length) b.result = 'crumbled';
        else { b.result = 'obstacle'; b.obstacle = ctx.addObstacle({ kind: 'circle', x: b.x, y: b.y, r: SNOWFALL.radius, owner: self.slot, ability: 'ICE-03-F' }); }
        ctx.log(`${$E('sim.a_snowball_lands', { result: b.result })}`, { kind: 'snowball', by: self.slot, side: self.team, ability: 'ICE-03-F', result: b.result, x: +b.x.toFixed(2), y: +b.y.toFixed(2), victims: offense.map((a) => a.slot) });
      }
    },
    playEnd(ctx, self, s) {
      if (self.team !== 'def' || s.kickoff || s.twoPoint || self.sf) return; // the activation play earns no charge
      const st = ctx.state(self); if (st.bar >= SNOWFALL.full) return;
      const g = allowedGain(ctx, s); if (g != null && g <= SNOWFALL.maxGain && ctx.canGainCharge(self)) st.bar += 1;
    },
  },
});
