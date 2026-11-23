// Club identity for presentation (owner ruling 2026-11-23, second set): each club's place name and nickname as they are painted in
// its end zones, its region's look for the home stadium, the shape of its badge, and its uniforms. Data only; the drawing is in
// src/ui/team-logo.js, src/ui/team-kit.js and the stadium code. The approved colours stay in data/league.js (PALETTE / TEAM_META).
//
// The names are written out, never split by a rule: "Thunder Mesa Blitz" is THUNDER MESA / BLITZ, "Ember City Beasts" is
// EMBER CITY / BEASTS. One end zone shows the place, the other the nickname, at every one of the 32 home stadiums.
import { DIVISIONS, divisionOf } from './league.js';

export const CLUB_NAMES = Object.freeze({
  'Frostpeak Howlers': ['Frostpeak', 'Howlers'], 'Glacier Guardians': ['Glacier', 'Guardians'], 'Northstar Novas': ['Northstar', 'Novas'], 'Ironpeak Colossi': ['Ironpeak', 'Colossi'],
  'Stormport Bolts': ['Stormport', 'Bolts'], 'Canyon Crushers': ['Canyon', 'Crushers'], 'Sundown Drakes': ['Sundown', 'Drakes'], 'Thunder Mesa Blitz': ['Thunder Mesa', 'Blitz'],
  'Goldhaven Royals': ['Goldhaven', 'Royals'], 'Riverbend Rapids': ['Riverbend', 'Rapids'], 'Pinecrest Wardens': ['Pinecrest', 'Wardens'], 'Skyvale Cyclones': ['Skyvale', 'Cyclones'],
  'Emberfall Infernos': ['Emberfall', 'Infernos'], 'Coral Bay Tides': ['Coral Bay', 'Tides'], 'Cliffhaven Chargers': ['Cliffhaven', 'Chargers'], 'Palm Isle Mystics': ['Palm Isle', 'Mystics'],
  'Stonehaven Bastions': ['Stonehaven', 'Bastions'], 'Eastport Phantoms': ['Eastport', 'Phantoms'], 'Harbor Anchors': ['Harbor', 'Anchors'], 'Ashford Cinders': ['Ashford', 'Cinders'],
  'Ember City Beasts': ['Ember City', 'Beasts'], 'Bayou Stalkers': ['Bayou', 'Stalkers'], 'Sunfire Solars': ['Sunfire', 'Solars'], 'Palmetto Wyrms': ['Palmetto', 'Wyrms'],
  'Thornwood Wildroots': ['Thornwood', 'Wildroots'], 'Silvergrove Arcanists': ['Silvergrove', 'Arcanists'], 'Mossvale Quakes': ['Mossvale', 'Quakes'], 'Fernhaven Wisps': ['Fernhaven', 'Wisps'],
  'Aetheria Seers': ['Aetheria', 'Seers'], 'Deepwater Chompers': ['Deepwater', 'Chompers'], 'Mistport Veils': ['Mistport', 'Veils'], 'Westhaven Pirates': ['Westhaven', 'Pirates'],
});
/** The two end-zone words of a club: { place, nickname }, upper case. Null for a club that is not one of the 32. */
export function endZoneNames(club) { const n = CLUB_NAMES[club]; return n ? { place: n[0].toUpperCase(), nickname: n[1].toUpperCase() } : null; }

/**
 * The region of a division, as the home stadiums of its clubs without a Gym Leader show it (around the field only: the playing
 * surface stays grass). `ground`: the strip between the paint and the barrier and behind the end lines; `trim`: the stand's
 * rail and wall details; `motif`: the decoration along the sidelines and the wall.
 */
export const REGIONS = Object.freeze({
  Frostlands: { label: 'Frostlands', ground: '#dfeef3', groundShade: '#b9d3dd', motif: 'snow', trim: '#e9f6fb' },
  Redrock: { label: 'Redrock', ground: '#9a4f2c', groundShade: '#6e3820', motif: 'mesa', trim: '#e2a36a' },
  'Golden Valley': { label: 'Golden Valley', ground: '#b99a45', groundShade: '#8d7330', motif: 'wheat', trim: '#f1d98a' },
  Suncoast: { label: 'Suncoast', ground: '#e4cf94', groundShade: '#c7ad6c', motif: 'palm', trim: '#fff1c4' },
  Kingsport: { label: 'Kingsport', ground: '#6f6a66', groundShade: '#4f4a47', motif: 'brick', trim: '#d8cfc4' },
  Everwild: { label: 'Everwild', ground: '#3f4a2a', groundShade: '#2c3520', motif: 'reeds', trim: '#c9cf8a' },
  Greenheart: { label: 'Greenheart', ground: '#2f5b2c', groundShade: '#21431f', motif: 'hedge', trim: '#cfe7a8' },
  'Azure Isles': { label: 'Azure Isles', ground: '#8a6a48', groundShade: '#644b33', motif: 'pier', trim: '#cfe9f2' },
});
export const regionOf = (club) => REGIONS[divisionOf(club)] || null;

/**
 * Badge shape and emblem of every club's logo. Shapes vary inside each division so no two neighbours look alike; the emblem is
 * the club's own mascot (data/league.js TEAM_META.mascot), drawn once in team-logo.js.
 */
export const BADGES = Object.freeze({
  'Frostpeak Howlers': 'roundsquare', 'Glacier Guardians': 'shield', 'Northstar Novas': 'circle', 'Ironpeak Colossi': 'hex',
  'Stormport Bolts': 'diamond', 'Canyon Crushers': 'hex', 'Sundown Drakes': 'pennant', 'Thunder Mesa Blitz': 'roundsquare',
  'Goldhaven Royals': 'shield', 'Riverbend Rapids': 'oval', 'Pinecrest Wardens': 'crest', 'Skyvale Cyclones': 'circle',
  'Emberfall Infernos': 'pennant', 'Coral Bay Tides': 'oval', 'Cliffhaven Chargers': 'crest', 'Palm Isle Mystics': 'diamond',
  'Stonehaven Bastions': 'shield', 'Eastport Phantoms': 'diamond', 'Harbor Anchors': 'circle', 'Ashford Cinders': 'hex',
  'Ember City Beasts': 'roundsquare', 'Bayou Stalkers': 'oval', 'Sunfire Solars': 'circle', 'Palmetto Wyrms': 'pennant',
  'Thornwood Wildroots': 'crest', 'Silvergrove Arcanists': 'diamond', 'Mossvale Quakes': 'hex', 'Fernhaven Wisps': 'oval',
  'Aetheria Seers': 'circle', 'Deepwater Chompers': 'roundsquare', 'Mistport Veils': 'oval', 'Westhaven Pirates': 'shield',
});

/** Every club of the league in division order (Veyra, then Koruun), for contact sheets and tests. */
export const CLUBS_BY_DIVISION = Object.freeze(Object.entries(DIVISIONS).map(([division, clubs]) => Object.freeze({ division, clubs: Object.freeze([...clubs]) })));
