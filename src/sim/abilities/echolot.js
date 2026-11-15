// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { E as $E } from '../../core/english.js';

export const ECHO_LANDING = Object.freeze({ width: 6, length: 8, span: [-8, 0], pull: 20, cooldown: 6 });
const LIFETIME = [3, 4, 4, 5];
const other = (side) => (side === 'home' ? 'away' : side === 'away' ? 'home' : null);

export default registerAbility({
  family: 'echolot', abilityId: 'PSY-04-F',
  initGame: () => ({ readyAt: 0 }),
  hooks: {
    playEnd(ctx, self, s) {
      if (!ctx.kickoff || self.team !== 'def' || self.slot !== 'K') return; // his own kickoff: he is the kicking unit's K
      const caughtX = ctx.stats.kickCatchX; if (caughtX == null || caughtX <= ctx.bounds.ownGoal) return; // caught in the field of play
      if (s.result === 'touchdown' || s.result === 'touchback' || (s.result === 'fumble' && ctx.ball.x <= ctx.bounds.ownGoal)) return;
      const st = ctx.state(self); const team = other(ctx.teamSide); // the kicking team (the return unit is the play's offense)
      if (ctx.teamPlays(team).def < st.readyAt) return; // cooldown still running, or the banked field not yet created
      if (!ctx.canGainCharge(self)) return; // a suppressed kicker banks nothing
      st.readyAt = ctx.teamPlays(team).def + 1 + ECHO_LANDING.cooldown; ctx.executed(self); // created at the next opposing offensive snap, then six
      ctx.queueField({ owner: self.mid, ownerTeam: team, side: 'defense', benchOk: true, type: 'Psychic', ability: 'PSY-04-F', strength: ECHO_LANDING.pull,
        lifetime: LIFETIME[self.mastery] ?? LIFETIME[0], clock: 'ownerDefense', width: ECHO_LANDING.width, length: ECHO_LANDING.length, span: ECHO_LANDING.span, centerOn: 'QB' });
      ctx.log(`${$E('sim.banks_an_echo_landing', { name: self.name })}`, { kind: 'ability', by: self.slot, side: self.team, ability: 'PSY-04-F' });
    },
  },
});
