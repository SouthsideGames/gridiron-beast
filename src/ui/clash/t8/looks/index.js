// Beast Clash t8 looks: one look per Clash ability (72), keyed by Dex id. See src/ui/clash/t8/fx-t8.js for the contract.
import { FIRE_WATER } from './fire-water.js';
import { NATURE_ELECTRIC } from './nature-electric.js';
import { EARTH_ICE } from './earth-ice.js';
import { WIND_DARK } from './wind-dark.js';
import { LIGHT_METAL } from './light-metal.js';
import { PSYCHIC_DRAGON } from './psychic-dragon.js';
export const LOOKS = Object.freeze({ ...FIRE_WATER, ...NATURE_ELECTRIC, ...EARTH_ICE, ...WIND_DARK, ...LIGHT_METAL, ...PSYCHIC_DRAGON });
