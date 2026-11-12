// EAR-05-F Stone Screen (terrabull: Terrabull; TE). Task 8 M3, Earth batch (special action).
// Contract (Dex): a secure reception at least five yards beyond the line of scrimmage, while ready (no handoffs, returns or
// blocking-only activation), raises a one-sided physical stone wall: three yards wide, half a yard thick, with a one-yard clear gap
// between his body and the wall's near face, on the side of the nearest defender at the catch (equal distance: stable lineup order).
// Orientation is locked (never rotates toward new threats). The wall follows him until the first obstructing defender contact, then
// stops and stays a stationary physical barrier; defenders must go around (no push, damage, status, tackle break or fumble
// protection; other approaches stay open; it never displaces a defender). It ends after five further forward yards after activation
// or at the whistle (no seconds-based duration, no next-play obstacle). Cooldown 5 / 4 / 3 / 2 subsequent offensive plays, spent on
// successful creation; an illegal (overlapping, trapping or out-of-bounds) placement keeps readiness. Not a zone, status or monster.
//
// Choices where the contract is silent (documented, minimal):
// - "Side" is lateral (left or right of him): the wall runs parallel to the field's length, centred on him lengthwise (a wall ahead
//   would block his own path). The near face is one yard beyond his body (body radius 0.35 yd, the engine's).
// - The wall is a physical obstacle for every monster except him (ctx.addObstacle); its contact test is touching the wall's face.
// - Moving, it stops at the first defender contact, and also where moving on would overlap any other monster (it never displaces).
// - "Five additional forward yards" are his own forward progress from the catch spot; the cooldown counts his own subsequent
//   offensive scrimmage plays; two-point tries are excluded.
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the stone screen
// after the reception is the live activation (gated); cooldown only.
import { registerAbility } from './registry.js';
import { scrimmage, tier, countDown, BODY } from './earth-ice-util.js';
import { E as $E } from '../../core/english.js';

const COOLDOWN = [5, 4, 3, 2];
export const SCREEN = Object.freeze({ width: 3, thick: 0.5, gap: 1, travel: 5, minDepth: 5 });
const touches = (o, r, pad = BODY + 0.05) => o.x > r.x0 - pad && o.x < r.x1 + pad && o.y > r.y0 - pad && o.y < r.y1 + pad;
function rectAt(self, side) {
  const near = self.y + side * (BODY + SCREEN.gap), far = near + side * SCREEN.thick;
  return { x0: self.x - SCREEN.width / 2, x1: self.x + SCREEN.width / 2, y0: Math.min(near, far), y1: Math.max(near, far) };
}

export default registerAbility({
  family: 'terrabull', abilityId: 'EAR-05-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0 }),
  hooks: {
    playStart(ctx, self) { self.ss = { checked: false, wall: null }; },
    tick(ctx, self) {
      const ss = self.ss;
      if (ss.wall) {
        const w = ss.wall; if (!w.live) return;
        if (self.x - ss.from >= SCREEN.travel) { w.live = false; ctx.log(`${$E('sim.s_stone_screen_cracks_into_rubble', { name: self.name })}`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'EAR-05-F' }); return; }
        if (!ss.moving) return;
        const others = ctx.actors.filter((o) => o !== self);
        const hit = others.find((o) => o.team !== self.team && touches(o, w));
        if (hit) { ss.moving = false; ctx.log(`${$E('sim.meets_the_stone_screen_it_sets', { name: hit.name })}`, { kind: 'wall_stop', by: self.slot, side: self.team, victim: hit.slot, ability: 'EAR-05-F' }); return; }
        const next = rectAt(self, ss.side);
        if (others.some((o) => touches(o, next, BODY))) { ss.moving = false; return; } // never moves into (or displaces) a monster
        Object.assign(w, next); return;
      }
      if (ss.checked || ctx.stats.receiver !== self.slot || ctx.ball.holder !== self) return;
      ss.checked = true; // the trigger is the reception itself: one check per catch
      const st = ctx.state(self);
      if (st.cd > 0 || self.team !== 'off' || !scrimmage(ctx) || (ctx.stats.catchX ?? -Infinity) < SCREEN.minDepth) return;
      let nearest = null; for (const d of ctx.opponents(self.team)) if (!nearest || ctx.dist(d, self) < ctx.dist(nearest, self)) nearest = d;
      if (!nearest) return;
      const side = Math.sign(nearest.y - self.y) || 1; const r = rectAt(self, side); const B = ctx.bounds;
      const illegal = (B && (r.y0 < B.left || r.y1 > B.right || r.x0 < B.ownEndLine || r.x1 > B.endLine)) || ctx.actors.some((o) => touches(o, r, BODY));
      if (illegal) { ctx.log(`${$E('sim.s_stone_screen_has_no_room', { name: self.name })}`, { kind: 'ability_skip', by: self.slot, side: self.team, ability: 'EAR-05-F' }); return; }
      if (!ctx.canStartSignature(self)) return;
      st.cd = tier(COOLDOWN, self.mastery); st.fresh = true; ctx.executed(self);
      Object.assign(ss, { from: self.x, side, moving: true, wall: ctx.addObstacle({ kind: 'rect', ...r, owner: self.slot, ability: 'EAR-05-F', blocks: (a) => a !== self }) });
      ctx.log(`${$E('sim.s_stone_screen_rises_beside_him', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'EAR-05-F', wall: { ...r }, wallSide: side });
    },
    playEnd(ctx, self, s) { if (self.ss?.wall) self.ss.wall.live = false; if (self.team === 'off' && !s.kickoff && !s.twoPoint) countDown(ctx.state(self)); },
  },
});
