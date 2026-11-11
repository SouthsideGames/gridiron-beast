// WIN-06-F Cyclonic Release (tempestra: Tempestra, legendary). Task 8 M3 Wind batch (special action, reception charge).
// Contract (Dex): three successful receptions fill the bar. His NEXT eligible reception while charged and able creates ONE stationary
// tornado at the catch location; the activation reception cannot recharge. The tornado targets the first 3 DIFFERENT non-Wind
// defenders within 5 yards: initial occupants first, then new entrants; nearest first at each selection, stable lineup ties; one shot
// per selected defender; the offense and all Wind defenders are unaffected. Each shot is a visible crescent blast that, once launched,
// reaches its target without an accuracy roll (even after the target leaves the radius); the whistle cancels an unfinished blast. A
// hit attempts Stumbled (40% current-speed loss) ONCE through the shared status gate: maximum speed unchanged, ordinary
// reacceleration; a blocked status still spends the shot and the target. The emitter ends at 3 blasts or the whistle; no movement
// obstruction, lingering zone or pull; no automatic Stunned, damage, tackle break or ball loss; disabling the source cannot undo
// launched shots. Full bar consumed on creation, no other cooldown; partial / full bar survives possessions, halftime and overtime to
// the end of the game; live objects are cleaned at the whistle. Fixed values at every mastery tier.
//
// Choices where the contract is silent (documented, minimal):
// - A reception is a completed forward pass to him on a scrimmage play (kickoff catches are not receptions; two-point catches are
//   not official receptions: they neither charge nor activate).
// - Every reception while charged activates, including one that ends the play at the catch (the emitter then ends at the whistle).
// - Blast travel speed: 20 yd/s (a technical timing value; no value is approved, and the hit itself needs no roll).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the tornado at the
// charged reception is the live activation (gated: the full bar is kept; launched blasts continue); reception charges are in-play
// charge gains (gated).
import { registerAbility } from './registry.js';
import { scrimmage, able, byLineup } from './common.js';
import { STUMBLE_SPEED_LOSS } from '../t8/field-effects.js';

export const CATCHES = 3, RADIUS = 5, SHOTS = 3, BLAST_SPEED = 20, DT = 0.05;

export default registerAbility({
  family: 'tempestra', abilityId: 'WIN-06-F',
  initGame: () => ({ charges: 0 }),
  hooks: {
    playStart(ctx, self) { self.cy = { armed: ctx.state(self).charges >= CATCHES, tornado: null }; },
    catchMade(ctx, self, r) {
      const cy = self.cy; if (r !== self || !cy?.armed || cy.tornado || !scrimmage(ctx) || !able(ctx, self)) return;
      if (!ctx.canStartSignature(self)) return; // denied: the full bar is kept
      cy.tornado = { x: self.x, y: self.y, targeted: new Set(), shots: [] };
      ctx.state(self).charges = 0; ctx.executed(self);
      ctx.log(`${self.name}'s Cyclonic Release spins up a tornado`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WIN-06-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
      select(ctx, self, cy.tornado);
    },
    tick(ctx, self) {
      const T = self.cy?.tornado; if (!T || ctx.result) return;
      for (const s of T.shots) if (s.live) { // a launched blast flies to its target, wherever he goes
        const d = Math.hypot(s.target.x - s.x, s.target.y - s.y), step = BLAST_SPEED * DT;
        if (d > step) { s.x += ((s.target.x - s.x) / d) * step; s.y += ((s.target.y - s.y) / d) * step; continue; }
        s.live = false; s.hit = true;
        ctx.applyStatus(s.target, { id: 'stumbled', strength: STUMBLE_SPEED_LOSS * 100, duration: 0, source: self, abilityId: 'WIN-06-F' });
        ctx.log(`A crescent blast hits ${s.target.name}`, { kind: 'ability_hit', by: self.slot, side: self.team, ability: 'WIN-06-F', victim: s.target.slot });
      }
      select(ctx, self, T);
    },
    playEnd(ctx, self, s) {
      const T = self.cy?.tornado;
      if (T) { for (const sh of T.shots) if (sh.live) { sh.live = false; ctx.log(`The whistle stops a crescent blast at ${sh.target.name}`, { kind: 'ability_cancel', by: self.slot, side: self.team, ability: 'WIN-06-F', victim: sh.target.slot }); } return; } // the activation reception cannot recharge
      if (!scrimmage(ctx) || self.team !== 'off' || s.receiver !== self.slot) return;
      const st = ctx.state(self); if (ctx.canGainCharge(self)) st.charges = Math.min(CATCHES, st.charges + 1);
    },
  },
});

/** New targets: non-Wind defenders within the radius, not yet targeted, nearest first, stable lineup ties, up to three in all. */
function select(ctx, self, T) {
  if (T.targeted.size >= SHOTS) return;
  const near = ctx.opponents(self.team).filter((d) => d.type !== 'Wind' && !T.targeted.has(d) && Math.hypot(d.x - T.x, d.y - T.y) <= RADIUS)
    .sort((p, q) => Math.hypot(p.x - T.x, p.y - T.y) - Math.hypot(q.x - T.x, q.y - T.y) || byLineup(p, q));
  for (const d of near) {
    if (T.targeted.size >= SHOTS) break;
    T.targeted.add(d); T.shots.push({ target: d, x: T.x, y: T.y, live: true, hit: false });
    ctx.log(`The tornado fires at ${d.name}`, { kind: 'ability_shot', by: self.slot, side: self.team, ability: 'WIN-06-F', victim: d.slot, x: +T.x.toFixed(2), y: +T.y.toFixed(2) });
  }
}
