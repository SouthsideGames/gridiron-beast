// FIR-01-F Blazing Resolve (emberfox: Flaroo / Blazynx / Infernox). Task 8 M3 pilot (self enhancement, conditional charge).
// Contract (Dex, with N7b P2): completed official rushing attempts only; a rush whose net whole-yard gain reaches the form threshold
// (Flaroo 8, Blazynx 5, Infernox 1) earns one charge; three charges ignite for a future rushing carry. On that carry the first
// eligible tackle begins one tackle encounter: every defender already within tackling reach is snapshotted and their attempts break,
// and the ignition is spent; later arrivals tackle normally. No one-second window. The consuming carry earns no charge. No charging
// while ignited. No receiving, return or two-point charge or activation. Normal strips and fumbles remain. Unused ignition and partial
// charge persist across possessions, halftime and overtime, reset per game (game-scope state). Not the legacy Eruption stun.
import { registerAbility } from './registry.js';
import { approvedValues } from '../../data/beast-dex.js';

const THRESHOLD = approvedValues('FIR-01-F').minWholeYardsByStage; // [8, 5, 1]
export const REACH = 1.25; // the engine's tackling reach (engine.js tryTackle)
const stageOf = (form) => Number(String(form).split(':')[1] || 0);
const rushing = (ctx) => !ctx.stats.receiver && !ctx.kickoff && !ctx.twoPoint;

export default registerAbility({
  family: 'emberfox', abilityId: 'FIR-01-F',
  initGame: () => ({ charges: 0, ignited: false }),
  hooks: {
    playStart(ctx, self) { self.br = { encounter: null, spent: false }; },
    tackleAttempt(ctx, self, tackler) {
      const st = ctx.state(self); const br = self.br;
      if (br.encounter) return br.encounter.has(tackler.mid) ? { prevent: true } : undefined; // later arrivals tackle normally
      if (!st.ignited || !rushing(ctx) || ctx.stats.carrier !== self.slot) return undefined;
      br.encounter = new Set(ctx.opponents(self.team).filter((d) => !(d.stun > 0) && ctx.dist(d, self) <= REACH).map((d) => d.mid));
      br.encounter.add(tackler.mid); st.ignited = false; br.spent = true; ctx.executed(self);
      ctx.log(`${self.name}'s Blazing Resolve ignites`, { kind: 'ability', by: self.slot, side: self.team, ability: 'FIR-01-F' });
      return { prevent: true };
    },
    playEnd(ctx, self, s) {
      const st = ctx.state(self);
      if (s.carrier !== self.slot || s.receiver || s.kickoff || s.twoPoint) return; // official rushing attempts only
      if (self.br?.spent || st.ignited) return; // the consuming carry earns nothing; no charging while ignited
      if (s.gain >= THRESHOLD[stageOf(self.form)]) { st.charges += 1; if (st.charges >= 3) { st.charges = 0; st.ignited = true; } }
    },
  },
});
