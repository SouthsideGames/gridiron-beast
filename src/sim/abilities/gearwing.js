// Football revision approved 2026-11-15. The current exact contract is in
// docs/beast-dex/data/abilities.json (and task8-overrides.json where applicable).
import { registerAbility } from './registry.js';
import { byMastery } from './common.js';
import { E as $E } from '../../core/english.js';

export const GEAR_GRID = Object.freeze({ minNet: 35, width: 10, length: 6, lbDepth: 5, life: [3, 4, 4, 5] });

export default registerAbility({
  family: 'gearwing', abilityId: 'MET-03-F',
  initGame: () => ({ banked: 0 }),
  game: {
    punt(g, self, { netYards, side }) {
      if (netYards == null || netYards < GEAR_GRID.minNet) return;
      if ((g.t8.fields?.pending || []).some((p) => p.owner === self.mid && p.ability === 'MET-03-F')) return; // one pending token
      g.queueField({ owner: self.mid, ownerTeam: side, type: 'Metal', ability: 'MET-03-F', lifetime: byMastery(GEAR_GRID.life, self.mastery), clock: 'ownerDefense', createOn: 'ownerDefense', offField: true, maxOwn: true, width: GEAR_GRID.width, length: GEAR_GRID.length, lbDepth: GEAR_GRID.lbDepth });
      g.state(self).banked += 1; g.executed(self);
      g.log(`${$E('sim.banks_a_gear_grid_net_yards', { name: self.name, netYards })}`, { by: self.mid, ability: 'MET-03-F', netYards });
    },
  },
});
