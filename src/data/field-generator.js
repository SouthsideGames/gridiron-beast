// Field generator (Franchise QoL update, owner 2026-11-11; final rules the same day). Chooses the playing field of one franchise
// game, in this order:
//   1. a game against a gym leader (either club is a gym club) is played on the field of that gym's element, home or away;
//      when two gym clubs meet, the home gym's field. This beats everything below;
//   2. otherwise a saved stadium override for the home club;
//   3. otherwise the home club's permanent elemental stadium (a volcanic stadium stays volcanic);
//   4. otherwise (the home stadium is ordinary grass) the draw: 65% grass, 35% an elemental field, the 35% shared equally by the
//      implemented elemental fields.
// The stadium's name is always the home club's. The draw comes from a hash of the game's key, never from the game's dice (like
// the weather), so the preview and the game agree, the same seed always gives the same field, and drawing moves no other random
// number. Field effects themselves (the matching-type bonus, weather visuals) are unchanged: this module only picks which field.
import { ENVIRONMENTS, STADIUMS, stadiumFor, weatherFor, fieldElement } from './stadiums.js';
import { GYMS, GYM_BY_CLUB } from './gyms.js';

export const GRASS_SHARE = 0.65;
/** The implemented elemental fields, in a fixed order (the order of ENVIRONMENTS). */
export const ELEMENTAL_FIELDS = Object.freeze(Object.values(ENVIRONMENTS).filter((e) => fieldElement(e.id)).map((e) => e.id));
/** Element → its field id, for the elements that have one. (Dragon's Den belongs to Dragon but favours no type.) */
export const FIELD_BY_TYPE = Object.freeze(Object.fromEntries(Object.values(ENVIRONMENTS).filter((e) => fieldElement(e.id)).map((e) => [fieldElement(e.id), e.id])));
/** Boss elements with no matching field (none today). Such a boss would play on grass, never on an unrelated element. */
export const UNMAPPED_BOSS_TYPES = Object.freeze([...new Set(GYMS.map((g) => g.element).filter((t) => !FIELD_BY_TYPE[t]))]);

// A well-mixed 32-bit hash to [0, 1): FNV-1a, then a finalizer so neighbouring keys (week 3, week 4) do not land close together.
function unit(s) {
  let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
/** The boss of a game: the home gym club, else the visiting gym club, else null. */
export function bossOf(home, away = null) { return GYM_BY_CLUB[home] || GYM_BY_CLUB[away] || null; }
/** The ordinary draw for a game with no boss: 65% grass, 35% one of the elemental fields. */
export function drawField(key) {
  const u = unit(`field|${key}`);
  if (u < GRASS_SHARE) return 'grass';
  return ELEMENTAL_FIELDS[Math.min(ELEMENTAL_FIELDS.length - 1, Math.floor((u - GRASS_SHARE) / (1 - GRASS_SHARE) * ELEMENTAL_FIELDS.length))];
}
/**
 * The field of one game: { env, by, boss }. `by` says why: 'boss' (a gym leader's element), 'boss-unmapped' (a gym whose element
 * has no field: grass), 'override' (a saved stadium override), 'home' (the home club's permanent elemental stadium) or 'draw'.
 */
export function fieldFor(home, away, key, overrides = null) {
  const boss = bossOf(home, away);
  if (boss) { const env = FIELD_BY_TYPE[boss.element]; return env ? { env, by: 'boss', boss: boss.club } : { env: 'grass', by: 'boss-unmapped', boss: boss.club }; }
  if (overrides?.[home]) return { env: stadiumFor(home, overrides).env, by: 'override', boss: null };
  const own = STADIUMS[home]?.env; if (own && own !== 'grass' && ENVIRONMENTS[own]) return { env: own, by: 'home', boss: null };
  return { env: drawField(`${key}|${home}|${away || ''}`), by: 'draw', boss: null };
}
/** The venue of one franchise game: the home club's stadium name, the generated field and that field's weather for the day. */
export function generatedVenue(home, away, key, overrides = null) {
  const s = stadiumFor(home, overrides); const f = fieldFor(home, away, key, overrides); const env = ENVIRONMENTS[f.env] || ENVIRONMENTS.grass;
  return { club: home, name: s.name, env: env.id, type: env.type, indoor: env.indoor, weather: weatherFor(env.id, `${key}|${home}`), fieldBy: f.by, ...(f.boss ? { boss: f.boss } : {}) };
}
