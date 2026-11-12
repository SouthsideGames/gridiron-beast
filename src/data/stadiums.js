// Stadium environments (GDD §33). Every club has one permanent home stadium; its environment sets the field's look and a
// small bonus for monsters of the matching type (both teams alike). Weather varies from game to game and is visual only.
// Data only: a future stadium-management feature can override a club's stadium (see stadiumFor) without changing this file.
// Imports nothing.
import { t } from '../text/index.js';

/**
 * Environments. `type` is the monster type the field favours (null = neutral). `indoor` stadiums never get weather.
 * `palette`: turf stripes, end zones, the apron beyond the end lines, a field tint, line colour (readability first: every
 * turf keeps white yard lines at a contrast of at least 3:1). `texture` names the field pattern drawn by the renderer.
 * `weather`: the draw for outdoor games, by weight.
 */
export const ENVIRONMENTS = Object.freeze({
  grass: { id: 'grass', name: t('stadiums.traditional_grass'), short: t('stadiums.grass'), type: null, indoor: false, icon: '🌱', texture: 'grass',
    palette: { a: '#236b49', b: '#28734d', c: '#216444', end: '#1a4b3b', apron: '#18402f', tint: null, decor: '#2f8a5c' },
    blurb: t('stadiums.classic_natural_grass_no_type_is'), weather: { clear: 5, rain: 2, wind: 2, overcast: 1 } },
  frozen: { id: 'frozen', name: t('stadiums.frozen_stadium'), short: t('stadiums.frozen'), type: 'Ice', indoor: false, icon: '❄', texture: 'ice',
    palette: { a: '#3d6e7e', b: '#447787', c: '#3a6877', end: '#2b5664', apron: '#d9eef5', tint: 'rgba(200,235,255,0.07)', decor: '#e8f7ff' },
    blurb: t('stadiums.frost_glazed_turf_snowbanks_along_the'), weather: { clear: 3, snow: 4, wind: 2, overcast: 1 } },
  volcanic: { id: 'volcanic', name: t('stadiums.volcanic_stadium'), short: t('stadiums.volcanic'), type: 'Fire', indoor: false, icon: '🌋', texture: 'lava',
    palette: { a: '#2c3a2e', b: '#323f32', c: '#29362b', end: '#3a1d14', apron: '#1a1210', tint: 'rgba(255,90,40,0.05)', decor: '#ff6a2a' },
    blurb: t('stadiums.dark_scorched_turf_glowing_vents_beyond'), weather: { clear: 5, wind: 2, overcast: 2 } },
  forest: { id: 'forest', name: t('stadiums.forest_stadium'), short: t('stadiums.forest'), type: 'Nature', indoor: false, icon: '🌲', texture: 'leaves',
    palette: { a: '#1f6a3c', b: '#257444', c: '#1c6137', end: '#174a2c', apron: '#123a22', tint: 'rgba(120,200,90,0.04)', decor: '#2f9a4f' },
    blurb: t('stadiums.deep_natural_grass_ringed_by_old'), weather: { clear: 4, rain: 4, overcast: 2 } },
  storm: { id: 'storm', name: t('stadiums.storm_stadium'), short: t('stadiums.storm'), type: 'Electric', indoor: false, icon: '⚡', texture: 'storm',
    palette: { a: '#25544a', b: '#2a5b50', c: '#224d44', end: '#1d2e45', apron: '#141c2b', tint: 'rgba(40,50,90,0.10)', decor: '#ffe36b' },
    blurb: t('stadiums.under_a_permanent_thunderhead_lightning_rods'), weather: { storm: 4, rain: 3, wind: 2, clear: 1 } },
  desert: { id: 'desert', name: t('stadiums.desert_stadium'), short: t('stadiums.desert'), type: 'Earth', indoor: false, icon: '🏜', texture: 'sand',
    palette: { a: '#8a6436', b: '#946c3b', c: '#835e33', end: '#6e4b27', apron: '#c79a5c', tint: 'rgba(255,190,110,0.05)', decor: '#d8b27a' },
    blurb: t('stadiums.packed_sand_and_red_rock_white'), weather: { clear: 6, wind: 3, overcast: 1 } },
  dome: { id: 'dome', name: t('stadiums.metallic_dome'), short: t('stadiums.dome'), type: 'Metal', indoor: true, icon: '⚙', texture: 'panels',
    palette: { a: '#2b5a5c', b: '#306164', c: '#285356', end: '#2a3440', apron: '#1b222b', tint: 'rgba(160,190,220,0.05)', decor: '#9aa3b8' },
    blurb: t('stadiums.a_sealed_steel_dome_on_synthetic'), weather: { indoor: 1 } },
  // The four gym fields added 2026-11-11 (owner): Water, Light and Dark use the same matching-type bonus as the fields above.
  // Dragon's Den is a look only: `type` is null, so the engine gives no bonus there (no Dragon field effect is approved);
  // `element` is what ties it to the Dragon gym. For every other field the element is its `type`.
  tidal: { id: 'tidal', name: t('stadiums.tidal_arena'), short: t('stadiums.tidal'), type: 'Water', indoor: false, icon: '🌊', texture: 'waves',
    palette: { a: '#16607a', b: '#1a6a86', c: '#145a72', end: '#0f4560', apron: '#0c3346', tint: 'rgba(60,200,220,0.06)', decor: '#58d6d0' },
    blurb: t('stadiums.blue_green_turf_with_wave_markings'), weather: { clear: 3, rain: 4, wind: 2, overcast: 1 } },
  radiant: { id: 'radiant', name: t('stadiums.radiant_coliseum'), short: t('stadiums.radiant'), type: 'Light', indoor: false, icon: '☀️', texture: 'rays',
    palette: { a: '#6e5f22', b: '#776726', c: '#66581f', end: '#8a6a14', apron: '#efe6c8', tint: 'rgba(255,240,170,0.07)', decor: '#ffe9a3' },
    blurb: t('stadiums.sun_gold_turf_white_and_gold'), weather: { clear: 8, overcast: 1, wind: 1 } },
  shadow: { id: 'shadow', name: t('stadiums.shadow_grounds'), short: t('stadiums.shadow'), type: 'Dark', indoor: false, icon: '🌑', texture: 'mist',
    palette: { a: '#352a4a', b: '#3b3051', c: '#302643', end: '#221a33', apron: '#17131f', tint: 'rgba(120,90,170,0.05)', decor: '#9a7fd0' },
    blurb: t('stadiums.deep_purple_turf_under_low_mist'), weather: { overcast: 5, clear: 2, rain: 2, wind: 1 } },
  dragon: { id: 'dragon', name: t('stadiums.dragons_den'), short: t('stadiums.den'), type: null, element: 'Dragon', indoor: false, icon: '🐉', texture: 'scales',
    palette: { a: '#4a4651', b: '#514c58', c: '#44404b', end: '#5a1f2c', apron: '#2b2130', tint: 'rgba(170,60,90,0.05)', decor: '#c0394b' },
    blurb: t('stadiums.ancient_stone_crimson_and_purple_banners'), weather: { clear: 4, overcast: 3, wind: 2, storm: 1 } },
});
/** The element a field belongs to (null for grass): its favoured type, or for a look-only field its `element`. */
export const fieldElement = (envId) => { const e = ENVIRONMENTS[envId]; return e ? e.element || e.type || null : null; };

/** Weather: label, an icon, and whether it is drawn over the field. Visual only (GDD §33.3). */
export const WEATHER = Object.freeze({
  clear: { label: t('stadiums.clear'), icon: '☀' },
  overcast: { label: t('stadiums.overcast'), icon: '☁' },
  rain: { label: t('stadiums.rain'), icon: '🌧' },
  snow: { label: t('stadiums.snow'), icon: '🌨' },
  wind: { label: t('stadiums.wind'), icon: '💨' },
  storm: { label: t('stadiums.thunderstorm'), icon: '⛈' },
  indoor: { label: t('stadiums.indoors'), icon: '🏟' },
});

/** Each club's home stadium (one per club; every gym club sits in its element's environment). */
export const STADIUMS = Object.freeze({
  'Frostpeak Howlers': { name: t('stadiums.howling_glacier_bowl'), env: 'frozen' },
  'Glacier Guardians': { name: t('stadiums.guardian_icefield'), env: 'frozen' },
  'Northstar Wolves': { name: t('stadiums.northstar_park'), env: 'grass' },
  'Ironpeak Rams': { name: t('stadiums.ironpeak_foundry_dome'), env: 'dome' },
  'Stormport Bolts': { name: t('stadiums.the_bolt_yard'), env: 'storm' },
  'Canyon Crushers': { name: t('stadiums.crusher_canyon'), env: 'desert' },
  'Sundown Drakes': { name: t('stadiums.sundown_mesa_field'), env: 'desert' },
  'Thunder Mesa': { name: t('stadiums.thunderhead_stadium'), env: 'storm' },
  'Stonehaven Titans': { name: t('stadiums.stonehaven_field'), env: 'grass' },
  'Eastport Phantoms': { name: t('stadiums.gaslight_park'), env: 'shadow' },
  'Harbor Sentinels': { name: t('stadiums.sentinel_pier_field'), env: 'tidal' },
  'Ashford Hawks': { name: t('stadiums.ashford_commons'), env: 'grass' },
  'Ember City Beasts': { name: t('stadiums.the_ember_pit'), env: 'volcanic' },
  'Bayou Stalkers': { name: t('stadiums.cypress_hollow'), env: 'forest' },
  'Sunfire Lions': { name: t('stadiums.sunfire_coliseum'), env: 'radiant' },
  'Palmetto Vipers': { name: t('stadiums.palmetto_grove'), env: 'dragon' },
});

const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
/** A club's stadium. `overrides` (a future stadium-management save field) can replace it; unknown clubs play on grass. */
export function stadiumFor(club, overrides = null) {
  const s = overrides?.[club] || STADIUMS[club] || { name: `${t('stadiums.field', { club: club || t('stadiums.neutral') })}`, env: 'grass' };
  const env = ENVIRONMENTS[s.env] || ENVIRONMENTS.grass;
  return { club, name: s.name, env: env.id, type: env.type, indoor: env.indoor };
}
/** Weather for one game, drawn from a key (deterministic: the preview and the game always agree). Indoors: always 'indoor'. */
export function weatherFor(envId, key) {
  const env = ENVIRONMENTS[envId] || ENVIRONMENTS.grass; const pool = Object.entries(env.weather);
  const total = pool.reduce((s, [, w]) => s + w, 0); let x = (hash(String(key)) % 1000) / 1000 * total;
  for (const [w, n] of pool) { x -= n; if (x < 0) return w; }
  return pool[0][0];
}
/** The venue of one game: the home club's stadium and the day's weather. Small and plain, so it can live in a saved game. */
export function venueFor(homeClub, key, overrides = null) {
  const s = stadiumFor(homeClub, overrides);
  return { club: homeClub, name: s.name, env: s.env, type: s.type, indoor: s.indoor, weather: weatherFor(s.env, `${key}|${homeClub}`) };
}
