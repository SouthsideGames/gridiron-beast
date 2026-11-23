// Field generator. Chooses the playing field of one franchise game.
//
// THE RULE (owner, 2026-11-22; 32-club league 2026-11-23): THE HOME CLUB DECIDES THE FIELD, in the regular season and the playoffs.
//   1. a Gym Leader's club at home plays on its own type's field: that field appears nowhere else, and nothing overrides it;
//   2. otherwise a saved stadium override for the home club;
//   3. otherwise the home club's own stadium, which for every club without a Gym Leader is ordinary grass.
// A visiting Gym Leader plays on the home club's field. Nothing is drawn at random any more.
//
// The earlier rules (Franchise QoL update, owner 2026-11-11) are SUPERSEDED and kept here as history: a game against a gym was
// played on the gym's field home or away, and a grass stadium drew 65% grass / 35% an elemental field. `bossOf`, `drawField`,
// GRASS_SHARE and ELEMENTAL_FIELDS remain exported for the tools and tests that describe those rules; fieldFor no longer uses them.
//
// The stadium's name is always the home club's. Field effects themselves (the matching-type bonus, for both teams) are unchanged:
// this module only picks which field.
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
 * The field of one game: { env, by, boss }. `by` says why: 'home' (the home club's own stadium) or 'override' (a saved stadium
 * override); `boss` is the home club when it is a Gym Leader's. ('boss', 'boss-unmapped' and 'draw' belonged to the earlier rules.)
 */
export function fieldFor(home, away, key, overrides = null) {
  const own = STADIUMS[home]?.env; const env = own && ENVIRONMENTS[own] ? own : 'grass';
  if (GYM_BY_CLUB[home] && env !== 'grass') return { env, by: 'home', boss: home }; // a Gym Leader at home: always its own field
  if (overrides?.[home]) return { env: stadiumFor(home, overrides).env, by: 'override', boss: null };
  return { env, by: 'home', boss: null };
}
/** The venue of one franchise game: the home club's stadium name, the generated field and that field's weather for the day. */
export function generatedVenue(home, away, key, overrides = null) {
  const f = fieldFor(home, away, key, overrides); const s = stadiumFor(home, f.by === 'override' ? overrides : null); const env = ENVIRONMENTS[f.env] || ENVIRONMENTS.grass;
  return { club: home, name: s.name, env: env.id, type: env.type, indoor: env.indoor, weather: weatherFor(env.id, `${key}|${home}`), fieldBy: f.by, ...(f.boss ? { boss: f.boss } : {}), ...(s.variant && s.env === env.id ? { variant: s.variant } : {}) };
}
