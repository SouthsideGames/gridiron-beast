// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { stageOf, scrimmage, byMastery } from './fw-util.js';
import { E as $E } from '../../core/english.js';

export const SPLASH = Object.freeze({ width: 6, length: 4, lifetime: 3, cooldown: 3, slipByStage: [[20, 22, 24, 26], [25, 27, 29, 31], [30, 32, 34, 36]] });

/** Bring the cooldown up to date with the team's defensive scrimmage plays since it was last read (he may have been benched). */
function sync(ctx, self, st) {
  const side = ctx.sideOf(self); if (!side) return;
  const n = ctx.teamPlays(side).def; if (st.cd > 0) st.cd = Math.max(0, st.cd - Math.max(0, n - (st.seen ?? n))); st.seen = n;
}

export default registerAbility({
  family: 'tidepaw', abilityId: 'WAT-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, seen: null }),
  hooks: {
    playStart(ctx, self) { if (scrimmage(ctx)) sync(ctx, self, ctx.state(self)); },
    playEnd(ctx, self, s) {
      if (!scrimmage(ctx)) return;
      const st = ctx.state(self); sync(ctx, self, st); // this play included
      const S = ctx.stats;
      if (self.team !== 'def' || st.cd > 0 || s.result !== 'incomplete' || S.pbuBy !== self.slot || S.interceptor) return;
      if (!ctx.canStartSignature(self)) return;
      st.cd = SPLASH.cooldown; ctx.executed(self);
      const x = ctx.ball.x, y = ctx.ball.y;
      ctx.queueField({ owner: self.mid, ownerTeam: ctx.sideOf(self), offField: true, immediate: { x, y }, type: 'Water', ability: 'WAT-01-F',
        strength: byMastery(SPLASH.slipByStage[stageOf(self.form)] || SPLASH.slipByStage[0], self.mastery), lifetime: SPLASH.lifetime, clock: 'ownerDefense', width: SPLASH.width, length: SPLASH.length });
      ctx.log(`${$E('sim.s_splashdown_soaks_the_spot', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'WAT-01-F', x: +x.toFixed(2), y: +y.toFixed(2) });
    },
  },
});
