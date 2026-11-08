// ELE-06-F Stormguard (stormcrown: Voltarch, QB, legendary). Task 8 M3 Electric batch (special action).
// Contract (Dex): after an eligible passing play is selected (play-action and RPO passing options included), if ready, available on the
// first eligible play: one guard just outside EACH end of the offensive line, on the offensive side of the LOS, at the nearest legal
// empty spot on its own side behind the LOS; both must be placeable or there are no guards and readiness is kept. Both guards pass
// protect with ordinary reach, movement, collision and block contests; their Strength, Blocking, Speed, Agility and Awareness are
// 60 / 65 / 70 / 75% (by mastery) of Voltarch's PERMANENT ratings, rounded; no inherited temporary modifiers, no stamina pool. They stay
// the whole creation play and disappear at the whistle; on an RPO run branch they stay on pass protection and never lead block. No
// roster slot, progression or lasting injury. Owner override: immune to ALL statuses and environmental modifiers (a physical knockdown
// does not bypass it); ordinary collision, block sheds and pushback still work. No ball handling, routes, tackles, pancakes, abilities
// or further summons. NO guard statistics, none credited to Voltarch; no participation XP or source ability triggers. Cooldown a fixed
// FIVE subsequent offensive plays (mastery improves ratings instead); a successful summon spends readiness even if no guard engages.
// Engine capabilities used (M3 hooks): temporary actors (ctx.spawn with credit null, immune '*', envImmune, noTackle, noBall,
// fixedJob) and a.baseAttrs (the ratings the game gave the slot, before in-play modifiers).
// Choices where the contract is silent (reported):
// - "Permanent" ratings = the ratings the game hands the engine for his slot (a.baseAttrs), before the play's own modifiers (situational
//   edge, exhaustion halving, statuses, auras); the guards' other attributes are the engine defaults and they have no type (no type edge).
// - Placement: the ideal spot is one OL spacing (1.7 yd) outside the end lineman, level with the line; candidates step back from the line
//   and outward, never inside the end lineman or past the LOS, clear = 1 yard from everyone; nearest first.
// - The playbook has no RPO plays; "passing play" = the called play's type is pass (play-action and boot included).
import { registerAbility } from './registry.js';
import { byMastery, scrimmage, ready, spend, countPlay, disabled, nearestClear, positionOf } from './nature-electric-common.js';

export const GUARD_PCT = [60, 65, 70, 75];
export const STORMGUARD = Object.freeze({ cooldown: 5, spacing: 1.7, clearance: 1.0, attrs: ['strength', 'blocking', 'speed', 'agility', 'awareness'] });

export default registerAbility({
  family: 'stormcrown', abilityId: 'ELE-06-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (self.team !== 'off' || !scrimmage(ctx) || ctx.offensePlay.type !== 'pass' || !ready(st) || disabled(ctx, self) || !ctx.canStartSignature(self)) return;
      const ol = ctx.actors.filter((a) => a.team === 'off' && !a.temp && positionOf(a.slot) === 'OL'); if (!ol.length) return;
      const lineX = Math.max(...ol.map((a) => a.x)); const lo = Math.min(...ol.map((a) => a.y)), hi = Math.max(...ol.map((a) => a.y));
      const spotFor = (side) => {
        const end = side < 0 ? lo : hi, ix = lineX, iy = end + side * STORMGUARD.spacing; const cands = [];
        for (const dx of [0, -0.6, -1.2, -1.8, -2.4]) for (const dy of [0, 0.5, 1, 1.5, 2, 2.5, 3]) cands.push({ x: ix + dx, y: iy + side * dy });
        return nearestClear(ctx, cands.filter((p) => p.x < 0 && (p.y - end) * side >= 0.9), ix, iy, STORMGUARD.clearance);
      };
      const L = spotFor(-1), R = spotFor(1);
      if (!L || !R || Math.hypot(L.x - R.x, L.y - R.y) < STORMGUARD.clearance) { ctx.log(`${self.name} has no room for Stormguard`, { kind: 'ability_blocked', by: self.slot, side: self.team, ability: 'ELE-06-F' }); return; }
      const pct = byMastery(GUARD_PCT, self.mastery) / 100; const base = self.baseAttrs || self.attrs; const attrs = {};
      for (const k of STORMGUARD.attrs) attrs[k] = Math.max(1, Math.round((base[k] ?? 60) * pct));
      const guards = [['GDL', L], ['GDR', R]].map(([slot, p]) => ctx.spawn({ team: 'off', slot, mid: `${self.mid}~${slot}`, name: `${self.name}'s Stormguard`, attrs, x: p.x, y: p.y,
        assignment: { a: 'block', points: [[p.x, p.y], [p.x - 1.2, p.y]] }, credit: null, immune: new Set(['*']), envImmune: true, noTackle: true, noBall: true, fixedJob: true, guardOf: self.mid }));
      spend(st, STORMGUARD.cooldown); ctx.executed(self);
      ctx.log(`${self.name} summons Stormguard`, { kind: 'ability', by: self.slot, side: self.team, ability: 'ELE-06-F', guards: guards.map((g) => [g.slot, +g.x.toFixed(2), +g.y.toFixed(2)]) });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'off'); },
  },
});
