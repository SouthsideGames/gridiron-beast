// The twelve Gym Leader clubs (owner specification 2026-11-23; eight until then): fixed in every franchise, one per monster type,
// two in each of the six competitive divisions and none in the two starter divisions (Golden Valley, Greenheart). The old header:
// The eight gym clubs (GDD §15.3): fixed in every franchise. Each has a home
// element, a named head coach with a scheme, that element's legendary (the
// only copy in the league) and a tier that sets its strength and where it
// falls in a first season. Two per division, so every division has two gym
// clubs and two ordinary clubs; players choose from the ordinary ones.
//
// Coach names and lines are drafts for the owner's review page.
import { t as $t } from '../text/index.js';

export const GYMS = Object.freeze([
  { club: 'Harbor Anchors', element: 'Water', legendary: 'tsunarok', tier: 'early', coach: { name: 'Nadia Reyes', style: $t('data.patient'), offense: 'balanced', defense: 'coverage', aggression: 0.4, passBias: 0.55, portrait: 'gym_water' }, badge: 'Tide Badge' },
  { club: 'Sunfire Solars', element: 'Light', legendary: 'aurelion', tier: 'early', coach: { name: 'Elias Dawn', style: $t('data.radiant'), offense: 'pass', defense: 'coverage', aggression: 0.45, passBias: 0.68, portrait: 'gym_light' }, badge: 'Dawn Badge' },
  { club: 'Thunder Mesa Blitz', element: 'Electric', legendary: 'stormcrown', tier: 'mid', coach: { name: 'Lena Volkov', style: $t('data.tempo'), offense: 'pass', defense: 'pressure', aggression: 0.62, passBias: 0.7, portrait: 'gym_electric' }, badge: 'Storm Badge' },
  { club: 'Canyon Crushers', element: 'Earth', legendary: 'titanolith', tier: 'mid', coach: { name: 'Dolores Crag', style: $t('data.grinder'), offense: 'run', defense: 'pressure', aggression: 0.55, passBias: 0.36, portrait: 'gym_earth' }, badge: 'Quake Badge' },
  { club: 'Eastport Phantoms', element: 'Dark', legendary: 'nyxshade', tier: 'mid', coach: { name: 'Silas Mourne', style: $t('data.trickster'), offense: 'pass', defense: 'man', aggression: 0.68, passBias: 0.6, portrait: 'gym_dark' }, badge: 'Dusk Badge' },
  { club: 'Frostpeak Howlers', element: 'Ice', legendary: 'glacivern', tier: 'mid', coach: { name: 'Sigrid Hale', style: $t('data.disciplined'), offense: 'balanced', defense: 'coverage', aggression: 0.38, passBias: 0.5, portrait: 'gym_ice' }, badge: 'Frost Badge' },
  { club: 'Ironpeak Colossi', element: 'Metal', legendary: 'aegistron', tier: 'late', coach: { name: 'Brock Ferris', style: $t('data.hammer'), offense: 'run', defense: 'pressure', aggression: 0.7, passBias: 0.4, portrait: 'gym_metal' }, badge: 'Forge Badge' },
  // The four Gym Leaders added with the 32-club league. Aria Gale (formerly of the Skyvale Cyclones) and Rowan Thorne (formerly of
  // the Thornwood Wildroots) moved clubs; both keep their type, badge, legendary and way of coaching. Schemes are provisional.
  { club: 'Emberfall Infernos', element: 'Fire', legendary: 'pyroclast', tier: 'early', coach: { name: 'Kael Ember', style: $t('data.blazing'), offense: 'pass', defense: 'pressure', aggression: 0.72, passBias: 0.64, portrait: 'gym_fire' }, badge: 'Blaze Badge' },
  { club: 'Westhaven Pirates', element: 'Nature', legendary: 'elderoot', tier: 'early', coach: { name: 'Rowan Thorne', style: $t('data.rooted'), offense: 'run', defense: 'coverage', aggression: 0.42, passBias: 0.42, portrait: 'gym_nature', formerClub: 'Thornwood Wildroots' }, badge: 'Grove Badge' },
  { club: 'Cliffhaven Chargers', element: 'Wind', legendary: 'tempestra', tier: 'mid', coach: { name: 'Aria Gale', style: $t('data.swift'), offense: 'pass', defense: 'coverage', aggression: 0.5, passBias: 0.66, portrait: 'gym_wind', formerClub: 'Skyvale Cyclones' }, badge: 'Gale Badge' },
  { club: 'Aetheria Seers', element: 'Psychic', legendary: 'astralux', tier: 'late', balance: -5, coach: { name: 'Lyra Vesper', style: $t('data.visionary'), offense: 'balanced', defense: 'man', aggression: 0.58, passBias: 0.6, portrait: 'gym_psychic' }, badge: 'Mind Badge' },
  { club: 'Palmetto Wyrms', element: 'Dragon', legendary: 'aurodrax', tier: 'late', coach: { name: 'Marcus Vane', style: $t('data.sovereign'), offense: 'balanced', defense: 'man', aggression: 0.6, passBias: 0.58, portrait: 'gym_dragon' }, badge: 'Wyrm Badge' },
]);

export const GYM_BY_CLUB = Object.freeze(Object.fromEntries(GYMS.map((g) => [g.club, g])));
export const GYM_CLUBS = Object.freeze(GYMS.map((g) => g.club));
export const isGymClub = (club) => !!GYM_BY_CLUB[club];
/**
 * The four legendaries a player may hunt through Legend Tracks without holding a badge. Until the 32-club league no gym held them.
 * Fire, Nature, Wind and Psychic now have Gym Leaders who do, and whether these four should need their badge like the other eight
 * is an OPEN OWNER DECISION (the specification asks for approval before that progression rule changes), so the rule is unchanged.
 */
// Owner ruling, 2026-11-23: there are none any more. All twelve Legend Tracks need their Gym Leader's badge, held now. (Until then
// Pyroclast, Elderoot, Tempestra and Astralux could be tracked without one.) The list is kept, empty, for the code that reads it.
export const FREE_LEGENDARIES = Object.freeze([]);

/** Quality offset by tier, plus growth per season and after the player's first win over them (GDD §15.3). */
export const GYM_TIER = Object.freeze({ early: 1, mid: 4, late: 7 });
// `balance` on a Gym Leader (owner ruling 2026-11-23, second set): a club's own correction to its tier's starting level. Aetheria
// (late, +7) converted the tier bonus into far more on-field strength than Ironpeak and Palmetto with the same bonus (its Psychic
// squad is built around QB, RB, TE, CB and S, with Astralux at running back) and plays in the league's weakest division and
// conference, so it took the top seed and the bye most seasons and 30% of simulated titles. −5 keeps it a late-tier contender.
export const GYM_GROWTH_PER_SEASON = 1.5;
export const GYM_STUDIED_TAPE = 1;
export const ORDINARY_GROWTH_PER_SEASON = 0.5;
/** Gym growth plateau (Task 6 Phase A-2, D10a, owner 2026-10-30): +1.5 a season through season 10, then the ordinary +0.5. */
export const GYM_PLATEAU_SEASON = 10;
/** A gym's anchor growth after `seasons` seasons (year − 1): the full rate up to season 10, the ordinary rate after it. */
export const gymGrowth = (seasons) => GYM_GROWTH_PER_SEASON * Math.min(seasons, GYM_PLATEAU_SEASON - 1) + ORDINARY_GROWTH_PER_SEASON * Math.max(0, seasons - (GYM_PLATEAU_SEASON - 1));
