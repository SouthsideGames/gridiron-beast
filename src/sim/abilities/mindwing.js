// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { E as $E } from '../../core/english.js';

export const MIND_BEND = Object.freeze({ width: 8, length: 6, span: [-9, -3], pull: 20 });
const LIFETIME = [3, 3, 4, 5];
const COOLDOWN = [6, 5, 4, 3];
const scrimmage = (ctx) => !ctx.kickoff && !ctx.twoPoint;

export default registerAbility({
  family: 'mindwing', abilityId: 'PSY-01-F', repeatableCooldown: true,
  initGame: () => ({ cd: 0, banked: false }),
  hooks: {
    playStart(ctx, self) {
      const st = ctx.state(self);
      if (ctx.createdFor(self.mid)) { st.banked = false; st.cd = COOLDOWN[self.mastery] ?? COOLDOWN[0]; st.fresh = true; ctx.log(`${$E('sim.s_mind_bend_folds_the_backfield', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-01-F', field: 'Psychic' }); }
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self); if (self.team !== 'def' || !scrimmage(ctx)) return;
      if (st.cd > 0 && !st.fresh) st.cd -= 1; // subsequent participating defensive scrimmage plays; the creation play starts it
      st.fresh = false;
      const personal = ctx.stats.tackler === self.slot || ctx.stats.assistBy === self.slot;
      if (st.cd === 0 && !st.banked && s.receiver && personal && s.result !== 'sack' && !ctx.stats.defensiveScore && ctx.canGainCharge(self)) {
        st.banked = true; ctx.executed(self);
        ctx.queueField({ requireAble: true, owner: self.mid, ownerTeam: ctx.teamSide === 'home' ? 'away' : ctx.teamSide === 'away' ? 'home' : null, side: 'defense', type: 'Psychic', ability: 'PSY-01-F', strength: MIND_BEND.pull,
          lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'ownerDefense', width: MIND_BEND.width, length: MIND_BEND.length, span: MIND_BEND.span, centerOn: 'ball' });
        ctx.log(`${$E('sim.banks_a_mind_bend', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-01-F' });
      }
    },
  },
});
