// NAT-02-F Vine Vault (mossclaw: Mossmaw / Fungorilla, DL). Task 8 M3 Nature batch (special action).
// Contract (Dex): a DL rushing the quarterback on a passing play only (not run defense), at his first single-block engagement while
// ready. Target: the engaged blocker; landing at the nearest clear legal spot immediately beyond the blocker toward the offensive
// backfield; no clear legal landing: no attempt, readiness kept. Resolution: the normal intended DL Agility versus the blocker's Blocking
// shed contest. Success: he vaults past the blocker (one live vault and landing; during the airborne traversal blocking collisions are
// ignored, disabling effects still interrupt), then resumes ordinary pursuit. Failure: he stays engaged normally. No attribute boost,
// bonus speed, automatic sack, stumble or knockdown; no lingering field or status. Cooldown 5 / 4 / 3 / 2 subsequent defensive plays by
// mastery; a failed attempt spends the activation. Bypasses Deep Roots without consuming its first-ordinary-shed protection (a vault is
// not an ordinary shed). Same mechanic in both forms.
// Choices where the contract is silent (reported):
// - Every engine engagement is one blocker on one defender, so every engagement is single-block. "First": only the first engagement of
//   the play can trigger; an attempt is resolved on the defender's next update after the engagement starts (after the blocker's own
//   pancake opportunity, which is decided at engagement).
// - The single contest roll: success with probability 1 / (1 + e^-(A - B) / 16), A = DL Agility and B = blocker Blocking, each scaled by
//   the pair's type edge for the shed / block contest (the tackle contest's logistic scale; equal ratings 50%).
// - Landing: 1.2 yards beyond the blocker along the line from the DL through the blocker, pulled toward the offense's backfield; the
//   nearest clear spot (0.8 yards from everyone else, inside the field) among a small deterministic grid around it. Traversal 0.4 s.
// - "Passing play" = the offense's called play is a pass (including play-action); a rush or contain assignment is "rushing the QB".
// Activation gates (M3 follow-up; spec §11 Eclipse, ICE-05-F Cold Snap: ctx.canStartSignature / ctx.canGainCharge): the vault attempt
// is the live activation (gated; readiness kept when denied); cooldown only.
import { registerAbility } from './registry.js';
import { CD_5432, byMastery, scrimmage, ready, spend, countPlay, disabled, nearestClear } from './nature-electric-common.js';
import { E as $E } from '../../core/english.js';

export const VAULT = Object.freeze({ beyond: 1.2, clearance: 0.8, flight: 0.4, scale: 16 });

export default registerAbility({
  family: 'mossclaw', abilityId: 'NAT-02-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, fresh: false }),
  hooks: {
    playStart(ctx, self) { self.vv = { first: false, pending: null, flight: null }; },
    engage(ctx, self, other) {
      const v = self.vv; if (v.first || self.team !== 'def' || other.team === self.team) return;
      v.first = true; // the first engagement of the play, whatever happens next
      if (!scrimmage(ctx) || ctx.offensePlay.type !== 'pass' || !['rush', 'contain'].includes(self.assignment?.a) || !ready(ctx.state(self))) return;
      v.pending = other;
    },
    tick(ctx, self) {
      const v = self.vv; if (!v) return;
      if (v.flight) { // the airborne traversal
        const f = v.flight;
        if (disabled(ctx, self) || self.stun > 1e5) { v.flight = null; self.noEngage = Math.max(0, self.noEngage); ctx.log(`${$E('sim.s_vault_is_cut_short', { name: self.name })}`, { kind: 'ability_end', by: self.slot, side: self.team, ability: 'NAT-02-F' }); return; }
        const k = Math.min(1, (ctx.t - f.t0) / VAULT.flight);
        self.x = f.from.x + (f.to.x - f.from.x) * k; self.y = f.from.y + (f.to.y - f.from.y) * k; self.vx = 0; self.vy = 0;
        if (k >= 1) { v.flight = null; self.noEngage = 0; ctx.log(`${self.name} lands past ${f.over}`, { kind: 'vault_land', by: self.slot, side: self.team, ability: 'NAT-02-F', x: +self.x.toFixed(2), y: +self.y.toFixed(2) }); }
        else self.noEngage = Math.max(self.noEngage, VAULT.flight); // blocking collisions ignored while airborne
        return;
      }
      const b = v.pending; if (!b) return; v.pending = null;
      if (self.engaged !== b || disabled(ctx, self) || !ctx.canStartSignature(self)) return; // no longer the engagement (pancaked, lost): no attempt
      const dx = b.x - self.x, dy = b.y - self.y, dd = Math.hypot(dx, dy) || 1;
      let ux = dx / dd, uy = dy / dd; ux = Math.min(ux, -0.5); const n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n; // toward the offensive backfield (-x)
      const ix = b.x + ux * VAULT.beyond, iy = b.y + uy * VAULT.beyond;
      const cands = []; for (const ox of [0, -0.5, 0.5, -1]) for (const oy of [0, -0.5, 0.5, -1, 1]) cands.push({ x: ix + ox, y: iy + oy });
      const land = nearestClear(ctx, cands.filter((p) => p.x < b.x), ix, iy, VAULT.clearance, [self, b]);
      if (!land) { ctx.log(`${$E('sim.finds_no_landing_past', { name: self.name, name2: b.name })}`, { kind: 'ability_blocked', by: self.slot, side: self.team, ability: 'NAT-02-F' }); return; } // readiness kept
      const st = ctx.state(self); spend(st, byMastery(CD_5432, self.mastery)); ctx.executed(self);
      const A = self.attrs.agility * ctx.scale(self, b, 'shed'), Bk = b.attrs.blocking * ctx.scale(b, self, 'block');
      const p = 1 / (1 + Math.exp(-(A - Bk) / VAULT.scale));
      if (!ctx.rng.chance(p)) { ctx.log(`${$E('sim.s_vine_vault_is_held_by', { name: self.name, name2: b.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-02-F', success: false, chance: +p.toFixed(4), victim: b.slot }); return; }
      self.engaged = null; b.engaged = null;
      v.flight = { from: { x: self.x, y: self.y }, to: { x: land.x, y: land.y }, t0: ctx.t, over: b.name }; self.noEngage = Math.max(self.noEngage, VAULT.flight);
      ctx.log(`${self.name} vaults over ${b.name}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'NAT-02-F', success: true, chance: +p.toFixed(4), victim: b.slot, blockerX: +b.x.toFixed(2), x: +land.x.toFixed(2), y: +land.y.toFixed(2) });
    },
    playEnd(ctx, self) { countPlay(ctx, self, ctx.state(self), 'def'); },
  },
});
