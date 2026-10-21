// Beast Clash: the approved 12-type chart (each type beats two and loses to two) and the
// condition each element's Disruptor applies. Imports only values.
import { CLASH_VALUES } from './values.js';

export const BEATS = Object.freeze({
  Water: ['Fire', 'Earth'], Fire: ['Nature', 'Ice'], Earth: ['Electric', 'Fire'], Electric: ['Water', 'Metal'],
  Ice: ['Dragon', 'Nature'], Light: ['Dark', 'Psychic'], Dark: ['Psychic', 'Electric'], Nature: ['Water', 'Light'],
  Metal: ['Ice', 'Light'], Wind: ['Dark', 'Earth'], Dragon: ['Metal', 'Wind'], Psychic: ['Dragon', 'Wind'],
});
export const TYPES = Object.freeze(Object.keys(BEATS));

/** 1.05 when the attacker's type beats the defender's, 0.952 when it loses to it, else 1. */
export function typeFactor(attacker, defender) {
  if (BEATS[attacker]?.includes(defender)) return CLASH_VALUES.types.strong;
  if (BEATS[defender]?.includes(attacker)) return CLASH_VALUES.types.weak;
  return 1;
}
/** 'strong' | 'weak' | 'even', for the replay's type-advantage marker. */
export function typeEdge(attacker, defender) { const f = typeFactor(attacker, defender); return f > 1 ? 'strong' : f < 1 ? 'weak' : 'even'; }

/** The condition a type's Disruptor applies (Water and Wind force swaps instead). */
export const CONDITION_BY_TYPE = Object.freeze({
  Fire: 'burn', Ice: 'chill', Electric: 'shock', Dark: 'daze', Psychic: 'daze', Light: 'daze',
  Nature: 'burn', Water: 'swap', Wind: 'swap', Earth: 'chill', Metal: 'shock', Dragon: 'burn',
});
export const CONDITION_LABEL = Object.freeze({ burn: 'Burn', chill: 'Chill', daze: 'Daze', shock: 'Shock' });
