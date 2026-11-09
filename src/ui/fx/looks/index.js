// Task 8 looks: one table over the six element batches (src/ui/fx/t8-fx.js reads LOOKS by Dex ability id) and the ambient auras
// (AMBIENT by family id: drawn while the owner is on the field, without an event).
import { FIRE_WATER, HEAT_HAZE_AMBIENT } from './fire-water.js';
import { NATURE_ELECTRIC } from './nature-electric.js';
import { EARTH_ICE, COLD_SNAP_AMBIENT } from './earth-ice.js';
import { WIND_DARK, NIGHT_WATCH_AMBIENT, TAILWIND_AMBIENT } from './wind-dark.js';
import { LIGHT_METAL } from './light-metal.js';
import { PSYCHIC_DRAGON } from './psychic-dragon.js';

export const LOOKS = Object.freeze({ ...FIRE_WATER, ...NATURE_ELECTRIC, ...EARTH_ICE, ...WIND_DARK, ...LIGHT_METAL, ...PSYCHIC_DRAGON });
export const AMBIENT = Object.freeze({ pyrelynx: HEAT_HAZE_AMBIENT, glaciron: COLD_SNAP_AMBIENT, nightowl: NIGHT_WATCH_AMBIENT, zephyr: TAILWIND_AMBIENT });
