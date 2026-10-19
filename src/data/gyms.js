// The eight gym clubs (GDD §15.3): fixed in every franchise. Each has a home
// element, a named head coach with a scheme, that element's legendary (the
// only copy in the league) and a tier that sets its strength and where it
// falls in a first season. Two per division, so every division has two gym
// clubs and two ordinary clubs; players choose from the ordinary ones.
//
// Coach names and lines are drafts for the owner's review page.

export const GYMS = Object.freeze([
  { club: 'Harbor Sentinels', element: 'Water', legendary: 'tsunarok', tier: 'early', coach: { name: 'Nadia Reyes', style: 'Patient', offense: 'balanced', defense: 'coverage', aggression: 0.4, passBias: 0.55, portrait: 'gym_water' }, badge: 'Tide Badge' },
  { club: 'Sunfire Lions', element: 'Light', legendary: 'aurelion', tier: 'early', coach: { name: 'Elias Dawn', style: 'Radiant', offense: 'pass', defense: 'coverage', aggression: 0.45, passBias: 0.68, portrait: 'gym_light' }, badge: 'Dawn Badge' },
  { club: 'Thunder Mesa', element: 'Electric', legendary: 'stormcrown', tier: 'mid', coach: { name: 'Lena Volkov', style: 'Tempo', offense: 'pass', defense: 'pressure', aggression: 0.62, passBias: 0.7, portrait: 'gym_electric' }, badge: 'Storm Badge' },
  { club: 'Canyon Crushers', element: 'Earth', legendary: 'titanolith', tier: 'mid', coach: { name: 'Dolores Crag', style: 'Grinder', offense: 'run', defense: 'pressure', aggression: 0.55, passBias: 0.36, portrait: 'gym_earth' }, badge: 'Quake Badge' },
  { club: 'Eastport Phantoms', element: 'Dark', legendary: 'nyxshade', tier: 'mid', coach: { name: 'Silas Mourne', style: 'Trickster', offense: 'pass', defense: 'man', aggression: 0.68, passBias: 0.6, portrait: 'gym_dark' }, badge: 'Dusk Badge' },
  { club: 'Frostpeak Howlers', element: 'Ice', legendary: 'glacivern', tier: 'mid', coach: { name: 'Sigrid Hale', style: 'Disciplined', offense: 'balanced', defense: 'coverage', aggression: 0.38, passBias: 0.5, portrait: 'gym_ice' }, badge: 'Frost Badge' },
  { club: 'Ironpeak Rams', element: 'Metal', legendary: 'aegistron', tier: 'late', coach: { name: 'Brock Ferris', style: 'Hammer', offense: 'run', defense: 'pressure', aggression: 0.7, passBias: 0.4, portrait: 'gym_metal' }, badge: 'Forge Badge' },
  { club: 'Palmetto Vipers', element: 'Dragon', legendary: 'aurodrax', tier: 'late', coach: { name: 'Marcus Vane', style: 'Sovereign', offense: 'balanced', defense: 'man', aggression: 0.6, passBias: 0.58, portrait: 'gym_dragon' }, badge: 'Wyrm Badge' },
]);

export const GYM_BY_CLUB = Object.freeze(Object.fromEntries(GYMS.map((g) => [g.club, g])));
export const GYM_CLUBS = Object.freeze(GYMS.map((g) => g.club));
export const isGymClub = (club) => !!GYM_BY_CLUB[club];
/** Legendaries no gym holds: the ones a player hunts first through Legend Tracks. */
export const FREE_LEGENDARIES = Object.freeze(['pyroclast', 'elderoot', 'tempestra', 'astralux']);

/** Quality offset by tier, plus growth per season and after the player's first win over them (GDD §15.3). */
export const GYM_TIER = Object.freeze({ early: 1, mid: 4, late: 7 });
export const GYM_GROWTH_PER_SEASON = 1.5;
export const GYM_STUDIED_TAPE = 1;
export const ORDINARY_GROWTH_PER_SEASON = 0.5;
