// Stadium environments (GDD §33). Every club has one permanent home stadium; its environment sets the field's look and a
// small bonus for monsters of the matching type (both teams alike). Weather varies from game to game and is visual only.
// Data only: a future stadium-management feature can override a club's stadium (see stadiumFor) without changing this file.
// Imports nothing.

/**
 * Environments. `type` is the monster type the field favours (null = neutral). `indoor` stadiums never get weather.
 * `palette`: turf stripes, end zones, the apron beyond the end lines, a field tint, line colour (readability first: every
 * turf keeps white yard lines at a contrast of at least 3:1). `texture` names the field pattern drawn by the renderer.
 * `weather`: the draw for outdoor games, by weight.
 */
export const ENVIRONMENTS = Object.freeze({
  grass: { id: 'grass', name: 'Traditional Grass', short: 'Grass', type: null, indoor: false, icon: '🌱', texture: 'grass',
    palette: { a: '#236b49', b: '#28734d', c: '#216444', end: '#1a4b3b', apron: '#18402f', tint: null, decor: '#2f8a5c' },
    blurb: 'Classic natural grass. No type is favoured.', weather: { clear: 5, rain: 2, wind: 2, overcast: 1 } },
  frozen: { id: 'frozen', name: 'Frozen Stadium', short: 'Frozen', type: 'Ice', indoor: false, icon: '❄', texture: 'ice',
    palette: { a: '#3d6e7e', b: '#447787', c: '#3a6877', end: '#2b5664', apron: '#d9eef5', tint: 'rgba(200,235,255,0.07)', decor: '#e8f7ff' },
    blurb: 'Frost-glazed turf, snowbanks along the sidelines.', weather: { clear: 3, snow: 4, wind: 2, overcast: 1 } },
  volcanic: { id: 'volcanic', name: 'Volcanic Stadium', short: 'Volcanic', type: 'Fire', indoor: false, icon: '🌋', texture: 'lava',
    palette: { a: '#2c3a2e', b: '#323f32', c: '#29362b', end: '#3a1d14', apron: '#1a1210', tint: 'rgba(255,90,40,0.05)', decor: '#ff6a2a' },
    blurb: 'Dark scorched turf, glowing vents beyond the end lines.', weather: { clear: 5, wind: 2, overcast: 2 } },
  forest: { id: 'forest', name: 'Forest Stadium', short: 'Forest', type: 'Nature', indoor: false, icon: '🌲', texture: 'leaves',
    palette: { a: '#1f6a3c', b: '#257444', c: '#1c6137', end: '#174a2c', apron: '#123a22', tint: 'rgba(120,200,90,0.04)', decor: '#2f9a4f' },
    blurb: 'Deep natural grass ringed by old trees.', weather: { clear: 4, rain: 4, overcast: 2 } },
  storm: { id: 'storm', name: 'Storm Stadium', short: 'Storm', type: 'Electric', indoor: false, icon: '⚡', texture: 'storm',
    palette: { a: '#25544a', b: '#2a5b50', c: '#224d44', end: '#1d2e45', apron: '#141c2b', tint: 'rgba(40,50,90,0.10)', decor: '#ffe36b' },
    blurb: 'Under a permanent thunderhead; lightning rods line the stands.', weather: { storm: 4, rain: 3, wind: 2, clear: 1 } },
  desert: { id: 'desert', name: 'Desert Stadium', short: 'Desert', type: 'Earth', indoor: false, icon: '🏜', texture: 'sand',
    palette: { a: '#8a6436', b: '#946c3b', c: '#835e33', end: '#6e4b27', apron: '#c79a5c', tint: 'rgba(255,190,110,0.05)', decor: '#d8b27a' },
    blurb: 'Packed sand and red rock. White lines, hard footing.', weather: { clear: 6, wind: 3, overcast: 1 } },
  dome: { id: 'dome', name: 'Metallic Dome', short: 'Dome', type: 'Metal', indoor: true, icon: '⚙', texture: 'panels',
    palette: { a: '#2b5a5c', b: '#306164', c: '#285356', end: '#2a3440', apron: '#1b222b', tint: 'rgba(160,190,220,0.05)', decor: '#9aa3b8' },
    blurb: 'A sealed steel dome on synthetic turf. No weather, ever.', weather: { indoor: 1 } },
});

/** Weather: label, an icon, and whether it is drawn over the field. Visual only (GDD §33.3). */
export const WEATHER = Object.freeze({
  clear: { label: 'Clear', icon: '☀' },
  overcast: { label: 'Overcast', icon: '☁' },
  rain: { label: 'Rain', icon: '🌧' },
  snow: { label: 'Snow', icon: '🌨' },
  wind: { label: 'Wind', icon: '💨' },
  storm: { label: 'Thunderstorm', icon: '⛈' },
  indoor: { label: 'Indoors', icon: '🏟' },
});

/** Each club's home stadium (one per club; the gym clubs sit in their element's environment where one exists). */
export const STADIUMS = Object.freeze({
  'Frostpeak Howlers': { name: 'Howling Glacier Bowl', env: 'frozen' },
  'Glacier Guardians': { name: 'Guardian Icefield', env: 'frozen' },
  'Northstar Wolves': { name: 'Northstar Park', env: 'grass' },
  'Ironpeak Rams': { name: 'Ironpeak Foundry Dome', env: 'dome' },
  'Stormport Bolts': { name: 'The Bolt Yard', env: 'storm' },
  'Canyon Crushers': { name: 'Crusher Canyon', env: 'desert' },
  'Sundown Drakes': { name: 'Sundown Mesa Field', env: 'desert' },
  'Thunder Mesa': { name: 'Thunderhead Stadium', env: 'storm' },
  'Stonehaven Titans': { name: 'Stonehaven Field', env: 'grass' },
  'Eastport Phantoms': { name: 'Gaslight Park', env: 'grass' },
  'Harbor Sentinels': { name: 'Sentinel Pier Field', env: 'grass' },
  'Ashford Hawks': { name: 'Ashford Commons', env: 'grass' },
  'Ember City Beasts': { name: 'The Ember Pit', env: 'volcanic' },
  'Bayou Stalkers': { name: 'Cypress Hollow', env: 'forest' },
  'Sunfire Lions': { name: 'Sunfire Coliseum', env: 'grass' },
  'Palmetto Vipers': { name: 'Palmetto Grove', env: 'forest' },
});

const hash = (s) => { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
/** A club's stadium. `overrides` (a future stadium-management save field) can replace it; unknown clubs play on grass. */
export function stadiumFor(club, overrides = null) {
  const s = overrides?.[club] || STADIUMS[club] || { name: `${club || 'Neutral'} Field`, env: 'grass' };
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
