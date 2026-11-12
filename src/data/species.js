// The live species table (Task 8 M1): all 192 Beast Dex families in the game's record shape (src/data/dex-species.js), with the
// original 72's legacy football ability effects attached as TRANSITIONAL until M3 registers each family's Dex contract and removes
// the legacy effect in the same change (docs/task8/BUILD_PLAN.md). Traits are retired (N7c B13). Rarity 'basic' is included;
// until each generation channel applies the approved Basic shares (N7c B17), the legacy pickers skip Basic families.
import { DEX_SPECIES } from './dex-species.js';
import { SPECIES_DEX as LEGACY, RARITIES as LEGACY_RARITIES, TRAITS, ELEMENT_REGIONS, LEGEND_RULES, COLLECTION_MILESTONES } from './species-legacy.js';
import { t as $t } from '../text/index.js';

export { TRAITS, ELEMENT_REGIONS, LEGEND_RULES, COLLECTION_MILESTONES };
export const RARITIES = Object.freeze({ basic: { label: $t('monsters.basic'), weight: 0, note: $t('monsters.standalone_families_below_common_generated_by') }, ...LEGACY_RARITIES });
const LEGACY_BY_ID = new Map(LEGACY.map((s) => [s.id, s]));
export const SPECIES_DEX = Object.freeze(DEX_SPECIES.map((d) => {
  const old = LEGACY_BY_ID.get(d.id);
  return Object.freeze({ ...d, ...(old?.ability ? { ability: old.ability, abilityTransitional: true } : {}) });
}));
