// LIG-06-F Daybreak (aurelion: Aurelion; WR, legendary). Task 8 M3, Light batch (special action).
// Contract (Dex; spec §9 movement priority, §12): every opposing touchdown (offense, defense and returns) adds one charge, even with
// Aurelion off the field; two charges (at every mastery) arm it. On his next eligible live successful reception it flares after the
// catch resolves: every other monster on the field, both teams, Light types and allies included (Aurelion alone is exempt), loses
// football assignments, targeting, deliberate pursuit, blocking and tackle initiation and wanders independently, changing to a random
// direction at movement checkpoints, until the whistle (also after a fumble or a possession change during the play); ordinary
// behaviour returns at the whistle. It is guaranteed and is not a status or a zone, so an occupied status slot cannot block it and
// existing statuses keep operating; immobilised monsters stay immobilised; wandering respects boundaries, bodies and obstacles, and
// bodies can obstruct but no new deliberate or accidental tackle attempt occurs while blinded. A touchdown scored by the catch itself
// keeps the readiness. Both charges are spent when it flares, then two more opposing touchdowns recharge it; no once-per-game limit.
// The charge persists over quarters, possessions, halftime and overtime and clears at the actual game end (game-scope state).
// Readings where the contract is silent (documented, minimal):
//   - The touchdown ledger is the game's (rules.js touchdown(): t8.touchdowns by scoring club); charges = min(2, opposing touchdowns
//     since the last flare), so touchdowns while already armed add nothing (the bar holds two).
//   - Eligible reception: a catch on an offensive scrimmage play (not a two-point try; a kick catch is never a reception, B20) that
//     leaves the ball live (an out-of-bounds or scoring catch does not flare).
//   - Movement checkpoints are each monster's ordinary AI decision interval (engine decisionEvery); between checkpoints he keeps his
//     heading at his ordinary steering. Blocks in progress end at the flare (blocking is disrupted).
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the flare at the
// reception is the live activation (gated: both charges kept); the charges are the game's opposing-touchdown ledger, earned even off
// the field (not an in-play gain): not gated.
import { registerAbility } from './registry.js';
import { scrimmage } from './common.js';

export const DAYBREAK = Object.freeze({ charges: 2 });
const conceded = (t8, side) => (t8?.touchdowns?.[side === 'home' ? 'away' : 'home'] || 0);
/** Daybreak charges for Aurelion's club `side` with state st (0, 1 or 2). */
export const daybreakCharges = (t8, side, st) => Math.max(0, Math.min(DAYBREAK.charges, conceded(t8, side) - (st?.mark || 0)));

function blind(ctx, a) {
  if (a.engaged) { a.engaged.engaged = null; a.engaged = null; } // blocking disrupted
  a.noContact = true; a.daybreakBlind = { next: -1, ux: 0, uy: 0 };
  ctx.override(a, (move) => {
    const w = a.daybreakBlind;
    if (move.t >= w.next) { const ang = ctx.rng.next() * 2 * Math.PI; w.ux = Math.cos(ang); w.uy = Math.sin(ang); w.next = move.t + ctx.decisionEvery(a); }
    move.steer(a.x + w.ux * 5, a.y + w.uy * 5, 1, 0);
  });
}

export default registerAbility({
  family: 'aurelion', abilityId: 'LIG-06-F',
  initGame: () => ({ mark: 0 }),
  hooks: {
    reception(ctx, self, r) {
      if (r !== self || self.team !== 'off' || !scrimmage(ctx) || !ctx.teamSide || ctx.result) return; // a scoring (or dead) catch keeps the readiness
      const st = ctx.state(self); if (daybreakCharges(ctx.t8, ctx.teamSide, st) < DAYBREAK.charges) return;
      if (!ctx.canStartSignature(self)) return; // denied: both charges are kept
      st.mark = conceded(ctx.t8, ctx.teamSide); ctx.executed(self); // both charges spent
      const others = ctx.actors.filter((a) => a !== self); for (const a of others) blind(ctx, a);
      ctx.log(`${self.name}'s Daybreak flares`, { kind: 'ability', by: self.slot, side: self.team, ability: 'LIG-06-F', affected: others.map((a) => `${a.team}:${a.slot}`), x: +self.x.toFixed(2), y: +self.y.toFixed(2) });
    },
  },
});
