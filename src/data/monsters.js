// Monster data model: attributes, natures, elemental types, abilities,
// generation and OVR. Everything here feeds the simulation (GDD §5.1).

import { ATTRIBUTES, POSITION_WEIGHTS } from './personnel.js';
import { createRng, hashString } from '../core/rng.js';
import { SPECIES_DEX, RARITIES, ELEMENT_REGIONS, TRAITS } from './species.js';

export const TYPES = Object.freeze({
  Fire: { icon: 'flame', bias: { strength: 4, agility: 2 }, hue: 14, blurb: 'Explosive power' },
  Water: { icon: 'drop', bias: { agility: 3, awareness: 2 }, hue: 200, blurb: 'Adaptability' },
  Nature: { icon: 'leaf', bias: { durability: 5 }, hue: 120, blurb: 'Endurance and recovery' },
  Electric: { icon: 'bolt', bias: { speed: 5 }, hue: 52, blurb: 'Acceleration and speed' },
  Earth: { icon: 'rock', bias: { strength: 5, blocking: 2 }, hue: 30, blurb: 'Strength and blocking' },
  Ice: { icon: 'snow', bias: { coverage: 3, tackling: 2 }, hue: 190, blurb: 'Defensive discipline' },
  Wind: { icon: 'wind', bias: { agility: 5 }, hue: 160, blurb: 'Agility and routes' },
  Dark: { icon: 'moon', bias: { agility: 2, awareness: 3 }, hue: 270, blurb: 'Deception and misdirection' },
  Light: { icon: 'star', bias: { accuracy: 3, awareness: 2 }, hue: 45, blurb: 'Precision and awareness' },
  Metal: { icon: 'gear', bias: { durability: 3, blocking: 2 }, hue: 215, blurb: 'Durability and protection' },
  Psychic: { icon: 'eye', bias: { awareness: 5 }, hue: 300, blurb: 'Anticipation' },
  Dragon: { icon: 'dragon', bias: { speed: 2, strength: 2, awareness: 1 }, hue: 0, blurb: 'Versatility' },
});
export const TYPE_NAMES = Object.keys(TYPES);

// 25 natures: one attribute ×1.10, one ×0.90; three neutral. The legacy
// nature names are kept; their stat keys are mapped onto the twelve live attributes.
export const NATURES = Object.freeze({
  swift: { name: 'Swift', up: 'speed', down: 'strength', behavior: 'Gets early separation; less effective on contact.' },
  explosive: { name: 'Explosive', up: 'agility', down: 'durability', behavior: 'Strong first burst; tires faster.' },
  elusive: { name: 'Elusive', up: 'agility', down: 'strength', behavior: 'Attempts more evasive moves.' },
  powerful: { name: 'Powerful', up: 'strength', down: 'speed', behavior: 'Prefers contact and power moves.' },
  sturdy: { name: 'Sturdy', up: 'durability', down: 'agility', behavior: 'Absorbs hits and protects the ball.' },
  relentless: { name: 'Relentless', up: 'durability', down: 'accuracy', behavior: 'Maintains effort late in drives.' },
  precise: { name: 'Precise', up: 'accuracy', down: 'strength', behavior: 'Chooses safer throwing windows.' },
  surehanded: { name: 'Surehanded', up: 'catching', down: 'tackling', behavior: 'Prioritises securing receptions.' },
  technical: { name: 'Technical', up: 'agility', down: 'arm', behavior: 'Executes crisp routes.' },
  cerebral: { name: 'Cerebral', up: 'awareness', down: 'strength', behavior: 'Reads defensive tendencies more accurately.' },
  instinctive: { name: 'Instinctive', up: 'awareness', down: 'durability', behavior: 'Reacts quickly to loose balls and routes.' },
  focused: { name: 'Focused', up: 'awareness', down: 'agility', behavior: 'Makes fewer assignment errors.' },
  aggressive: { name: 'Aggressive', up: 'tackling', down: 'coverage', behavior: 'Pursues big hits; occasionally overcommits.' },
  disciplined: { name: 'Disciplined', up: 'coverage', down: 'strength', behavior: 'Stays in assigned coverage.' },
  ferocious: { name: 'Ferocious', up: 'strength', down: 'coverage', behavior: 'Rushes the quarterback aggressively.' },
  protective: { name: 'Protective', up: 'blocking', down: 'agility', behavior: 'Stays engaged with blockers.' },
  slippery: { name: 'Slippery', up: 'agility', down: 'durability', behavior: 'Attempts extra tackle escapes.' },
  secure: { name: 'Secure', up: 'catching', down: 'speed', behavior: 'Protects possession over extra yardage.' },
  gifted: { name: 'Gifted', up: 'arm', down: 'durability', behavior: 'Raw talent; special abilities hit harder.' },
  resistant: { name: 'Resistant', up: 'durability', down: 'arm', behavior: 'Shrugs off opponent abilities.' },
  adaptive: { name: 'Adaptive', up: 'awareness', down: 'kicking', behavior: 'Adjusts to repeated play calls.' },
  patient: { name: 'Patient', up: 'blocking', down: 'speed', behavior: 'Waits for openings instead of forcing moves.' },
  balanced: { name: 'Balanced', up: null, down: null, behavior: 'Neutral: standard positional tendencies.' },
  calm: { name: 'Calm', up: null, down: null, behavior: 'Neutral: unflappable under pressure.' },
  hardy: { name: 'Hardy', up: null, down: null, behavior: 'Neutral: steady week to week.' },
});
export const NATURE_IDS = Object.keys(NATURES);

/** Signature abilities with real engine effects (see engine.js `abilityBoost`). */
export const ABILITIES = Object.freeze({
  meteor_pass: { name: 'Meteor Pass', text: '+8 Accuracy and +6 Arm on throws 15+ yards downfield.', effect: { deepThrow: { accuracy: 8, arm: 6 } } },
  lightning_break: { name: 'Lightning Break', text: '+12% speed for the first 1.5 seconds after the snap.', effect: { burst: { speed: 0.12, until: 1.5 } } },
  stone_charge: { name: 'Stone Charge', text: '+10 Strength when breaking tackles between the tackles.', effect: { carryStrength: 10 } },
  crushing_rush: { name: 'Crushing Rush', text: '+10 Strength when shedding a block.', effect: { shedStrength: 10 } },
  aerial_lock: { name: 'Aerial Lock', text: '+10 Catching on interception chances.', effect: { pickCatching: 10 } },
  cold_read: { name: 'Cold Read', text: 'Reacts 0.2 s sooner to runs and short passes.', effect: { reaction: 0.2 } },
});

/** Base attribute profile per position (before type, nature and variance). */
const BASE = {
  QB: { speed: 55, agility: 55, strength: 50, awareness: 62, catching: 40, arm: 64, accuracy: 62, blocking: 30, tackling: 30, coverage: 30, durability: 60, kicking: 30 },
  RB: { speed: 70, agility: 68, strength: 60, awareness: 55, catching: 55, arm: 30, accuracy: 30, blocking: 48, tackling: 35, coverage: 30, durability: 62, kicking: 25 },
  WR: { speed: 74, agility: 70, strength: 48, awareness: 55, catching: 68, arm: 30, accuracy: 30, blocking: 40, tackling: 30, coverage: 32, durability: 58, kicking: 25 },
  TE: { speed: 60, agility: 56, strength: 66, awareness: 55, catching: 60, arm: 30, accuracy: 30, blocking: 62, tackling: 40, coverage: 32, durability: 66, kicking: 25 },
  OL: { speed: 44, agility: 46, strength: 74, awareness: 54, catching: 25, arm: 25, accuracy: 25, blocking: 72, tackling: 35, coverage: 20, durability: 70, kicking: 20 },
  DL: { speed: 56, agility: 58, strength: 72, awareness: 52, catching: 30, arm: 25, accuracy: 25, blocking: 35, tackling: 66, coverage: 30, durability: 68, kicking: 20 },
  LB: { speed: 64, agility: 62, strength: 64, awareness: 60, catching: 40, arm: 25, accuracy: 25, blocking: 35, tackling: 70, coverage: 54, durability: 66, kicking: 20 },
  CB: { speed: 74, agility: 72, strength: 46, awareness: 56, catching: 52, arm: 25, accuracy: 25, blocking: 28, tackling: 48, coverage: 70, durability: 58, kicking: 20 },
  S: { speed: 68, agility: 66, strength: 56, awareness: 62, catching: 54, arm: 25, accuracy: 25, blocking: 30, tackling: 62, coverage: 64, durability: 62, kicking: 20 },
  K: { speed: 45, agility: 45, strength: 45, awareness: 50, catching: 30, arm: 30, accuracy: 40, blocking: 20, tackling: 25, coverage: 20, durability: 60, kicking: 72 },
};

// ---------------------------------------------------------------- species
// The dex (src/data/species.js) is the source of truth: every species has a
// fixed element, a natural and secondary position and a rarity. `m.species`
// stores the species id. Older saves stored the display name of a previous
// species list; `resolveSpecies` maps those onto the dex so old rosters keep
// working (LEGACY_SPECIES_ALIASES below).
export const SPECIES_BY_ID = Object.freeze(Object.fromEntries(SPECIES_DEX.map((s) => [s.id, s])));
const BY_NAME = Object.fromEntries(SPECIES_DEX.map((s) => [s.name.toLowerCase(), s]));
const OLD_SPECIES = ['Emberfox', 'Voltfang', 'Windlynx', 'Flarehorn', 'Boulderox', 'Ironcub', 'Rootram', 'Stoneguard', 'Magmaw', 'Frostclaw', 'Thornback', 'Skywarden', 'Shadowkit', 'Glaciron', 'Firestorm', 'Metalhorn', 'Rockram', 'Steelpaw', 'Mosswing', 'Ashwing', 'Thornkit', 'Ironjaw', 'Graniteox', 'Cinderclaw', 'Icehorn', 'Duskrunner', 'Stormlynx', 'Nightowl', 'Flicker', 'Mudcub', 'Tidepaw', 'Zephyr', 'Leafhorn', 'Gearwing', 'Ironfin', 'Pebble', 'Ashkit', 'Mossclaw', 'Snowmoth', 'Voltfin', 'Shadewisp', 'Cloudram', 'Duskbeak', 'Glimmer', 'Breezefang', 'Sunwhistle', 'Wavewhistle', 'Reefclaw', 'Tidefin', 'Wavehorn', 'Ashcub', 'Magmabeak', 'Wildcub', 'Stormwing', 'Stonehorn', 'Lumen', 'Prism', 'Nocturne', 'Sablewing', 'Coalpaw', 'Brasshorn', 'Quillback', 'Mireclaw', 'Gustling', 'Pyrelynx', 'Hailfang', 'Terrabull', 'Mindwing', 'Drakeling', 'Wyrmkit'];
const OLD_TYPE = (name) => TYPE_NAMES[hashString(name) % TYPE_NAMES.length];
/** Old display name → dex id. Names that survived keep their id; the rest map to a common of the type they used to roll as. */
export const LEGACY_SPECIES_ALIASES = Object.freeze(Object.fromEntries(OLD_SPECIES.map((n) => {
  const same = SPECIES_DEX.find((s) => s.id === n.toLowerCase());
  if (same) return [n, same.id];
  const commons = SPECIES_DEX.filter((s) => s.element === OLD_TYPE(n) && s.rarity === 'common');
  return [n, commons[hashString(n) % commons.length].id];
})));
/** The dex entry for a monster (or a species id / name). Never null: unknown values fall back by hash. */
export function resolveSpecies(m) {
  const key = typeof m === 'string' ? m : (m?.species || m?.name || '');
  const base = String(key).replace(/ (II|III|IV|V|VI|\d+)$/, '');
  return SPECIES_BY_ID[base] || BY_NAME[base.toLowerCase()] || SPECIES_BY_ID[LEGACY_SPECIES_ALIASES[base]] || SPECIES_DEX[hashString(base) % SPECIES_DEX.length];
}
export const speciesName = (m) => resolveSpecies(m).name;
/** An evolved form's design: a size up, a fiercer look, claws then spikes (Prototype 2 evolution; see species.evolution). */
export function evolvedSpec(s, stage) {
  if (!stage) return s;
  const extra = stage === 1 ? ['claws'] : ['claws', 'spikes'];
  return { ...s, id: `${s.id}_e${stage}`, name: s.evolution[stage - 1]?.name || s.name, size: stage === 1 ? (s.size === 'small' ? 'medium' : 'large') : 'large', look: stage === 1 ? (s.look === 'cute' ? 'cool' : 'fierce') : 'fierce', features: [...new Set([...s.features, ...extra])] };
}
/** The form a monster currently shows: its species, evolved as far as its stage. */
export function formOf(m) { const sp = resolveSpecies(m); return evolvedSpec(sp, Math.min(m?.stage || 0, sp.evolution.length)); }
/** Numeral suffix on a display name ("Flaroo II" → " II"). */
const SUFFIX = (name) => String(name || '').match(/ (II|III|IV|V|VI|\d+)$/)?.[0] || '';
/** Evolve a monster one stage if its level allows. Returns the event or null. */
export function tryEvolve(m) {
  const sp = resolveSpecies(m); const stage = m.stage || 0; const next = sp.evolution[stage];
  if (!next || (m.level || 1) < next.level) return null;
  const from = m.name; const suffix = SUFFIX(m.name);
  m.stage = stage + 1; m.name = next.name + suffix;
  const w = POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR;
  for (const k of ATTRIBUTES) m.attributes[k] = clampAttr(m.attributes[k] + (w[k] ? 3 : 1)); // an evolved form is a cut above: +3 to what its position uses
  m.potential = clampAttr((m.potential || 70) + 4);
  m.salary = salaryFor(m);
  return { kind: 'evolve', id: m.id, name: m.name, from, to: next.name, stage: m.stage, species: sp.id };
}
/** The engine effect a monster carries: its signature ability (uncommon and up) or its species' shared trait (commons). */
export function speciesEffect(m) {
  const sp = resolveSpecies(m);
  if (sp.ability?.effect) return { name: sp.ability.name, effect: sp.ability.effect, kind: 'ability' };
  const t = TRAITS[sp.trait]; if (t?.effect) return { name: t.name, effect: t.effect, kind: 'trait' };
  return null;
}
const RARITY_WEIGHT = (s) => RARITIES[s.rarity]?.weight ?? 0;
/** Pick a species that plays `position` (natural, or secondary at a quarter of the weight), by rarity weight. */
export function pickSpeciesForPosition(rng, position, { pool = SPECIES_DEX, exclude = new Set(), element = null, elementChance = 0.75 } = {}) {
  const cands = pool.filter((s) => !exclude.has(s.id) && (s.position === position || s.secondary === position) && RARITY_WEIGHT(s) > 0);
  let list = cands.length ? cands : pool.filter((s) => s.position === position || s.secondary === position);
  // A club with a home element (the gym clubs) fills most spots from that element when it has a species for the position.
  const home = element ? list.filter((s) => s.element === element) : [];
  if (home.length && rng.chance(elementChance)) list = home;
  const w = list.map((s) => [s.id, Math.max(0.01, RARITY_WEIGHT(s)) * (s.position === position ? 1 : 0.25)]);
  return SPECIES_BY_ID[rng.weighted(w)];
}
/** Species scoutable in a region this week: the region's elements, rares only in their home region from their week, never legendaries. */
export function regionSpecies(regionName, regionTypes, week = 1) {
  return SPECIES_DEX.filter((s) => regionTypes.includes(s.element) && s.rarity !== 'legendary' && (s.rarity !== 'rare' || ((s.regions || ELEMENT_REGIONS[s.element]).includes(regionName) && week >= (s.fromWeek || 1))));
}

export function clampAttr(v) { return Math.max(1, Math.min(99, Math.round(v))); }

/** Effective attributes = base × nature × fatigue × secondary-position penalty. */
export function effectiveAttributes(m, { slotPosition = null, trainingBonus = null } = {}) {
  const nature = NATURES[m.nature] || NATURES.balanced;
  const fatiguePenalty = 1 - Math.min(0.06, (m.fatigue || 0) / 100 * 0.06);
  const secondary = slotPosition && slotPosition !== m.position ? 0.9 : 1;
  const out = {};
  for (const k of ATTRIBUTES) {
    let v = m.attributes[k] || 1;
    if (nature.up === k) v *= 1.1;
    if (nature.down === k) v *= 0.9;
    if (trainingBonus && trainingBonus[k]) v += trainingBonus[k];
    if (['speed', 'strength', 'agility'].includes(k)) v *= fatiguePenalty;
    v *= secondary;
    out[k] = clampAttr(v);
  }
  return out;
}

export function overall(attrs, position) {
  const w = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.WR;
  let sum = 0; let total = 0;
  for (const [k, weight] of Object.entries(w)) { sum += (attrs[k] || 0) * weight; total += weight; }
  return Math.round(sum / total);
}

export function monsterOverall(m, opts) { return overall(effectiveAttributes(m, opts), opts?.slotPosition || m.position); }

/**
 * Generate a monster. `quality` ≈ target OVR; the generator produces a
 * positional profile around it with type bias and random variance.
 */
export function generateMonster(rng, { position = null, quality = 58, type = null, nature = null, name = null, id = null, species = null, age = null }) {
  // `species` may be a dex id, a species name or an old name; the dex fixes the element.
  const sp = species || name ? resolveSpecies(species || name) : (position ? pickSpeciesForPosition(rng, position) : rng.pick(SPECIES_DEX));
  species = sp.id;
  position = position || sp.position;
  type = sp.element;
  const base = BASE[position] || BASE.WR;
  const bias = TYPES[type].bias;
  const attributes = {};
  // Scale the profile toward the requested quality.
  const baseOvr = overall(base, position);
  const shift = quality - baseOvr;
  for (const k of ATTRIBUTES) {
    const weight = (POSITION_WEIGHTS[position] || {})[k] ? 1 : 0.45;
    attributes[k] = clampAttr(base[k] + shift * weight + (bias[k] || 0) + rng.normal() * 4);
  }
  const m = {
    id: id || `m_${rng.seed().toString(36)}`,
    name: name || sp.name,
    species,
    position,
    type,
    nature: nature || rng.pick(NATURE_IDS),
    age: age ?? 20 + rng.int(9),
    level: 1,
    xp: 0,
    potential: clampAttr(quality + 6 + rng.int(14)),
    attributes,
    fatigue: 0,
    injury: null,
    ability: null,
    stats: { games: 0, yards: 0, td: 0, tackles: 0, sacks: 0, int: 0, catches: 0 },
  };
  m.salary = salaryFor(m);
  return m;
}

export function salaryFor(m) { return 18000 + 280 * monsterOverall(m); }

/** XP needed to reach the next level. */
export const xpForLevel = (level) => 30 + level * 18; // level 10 in about two seasons of starts; level 20 is a long career

/** Apply a level-up: +1 to three weighted attributes (potential-capped). */
export function levelUp(m, rng) {
  m.level += 1;
  const weights = Object.entries(POSITION_WEIGHTS[m.position] || POSITION_WEIGHTS.WR);
  for (let i = 0; i < 3; i++) {
    const k = rng.weighted(weights);
    if (m.attributes[k] < m.potential) m.attributes[k] = clampAttr(m.attributes[k] + 1 + (rng.chance(0.3) ? 1 : 0));
  }
  m.salary = salaryFor(m);
}

/** Cornerstone starters offered during onboarding (GDD §8). */
export const CORNERSTONES = Object.freeze({
  offense: [
    { name: 'Pyronix', species: 'firestorm', position: 'QB', type: 'Fire', nature: 'precise', ability: 'meteor_pass', quality: 69, archetype: 'Strong Arm' },
    { name: 'Zappard', species: 'voltfang', position: 'WR', type: 'Electric', nature: 'swift', ability: 'lightning_break', quality: 68, archetype: 'Speedster' },
    { name: 'Bouldrox', species: 'boulderox', position: 'RB', type: 'Earth', nature: 'sturdy', ability: 'stone_charge', quality: 70, archetype: 'Power Back' },
  ],
  defense: [
    { name: 'Granigor', species: 'stoneguard', position: 'DL', type: 'Earth', nature: 'powerful', ability: 'crushing_rush', quality: 69, archetype: 'Power Rusher' },
    { name: 'Aeralis', species: 'skywarden', position: 'CB', type: 'Wind', nature: 'focused', ability: 'aerial_lock', quality: 68, archetype: 'Ball Hawk' },
    { name: 'Cryolynx', species: 'frostclaw', position: 'LB', type: 'Ice', nature: 'cerebral', ability: 'cold_read', quality: 70, archetype: 'Field General' },
  ],
});
/**
 * Cornerstone offers for a new franchise: three monsters of three different positions and elements
 * (uncommon or rare species, so each has a signature ability), drawn from the offer seed so every
 * franchise sees a different trio. Legacy cornerstones (the six above) are among the pool.
 */
const ARCHETYPE = { QB: 'Field General', RB: 'Workhorse', WR: 'Playmaker', TE: 'Mismatch', OL: 'Anchor', DL: 'Disruptor', LB: 'Enforcer', CB: 'Shutdown', S: 'Ball Hawk', K: 'Automatic' };
export function cornerstoneOffers(seed) {
  const rng = createRng(hashString(`cornerstones|${seed}`));
  const pool = SPECIES_DEX.filter((s) => (s.rarity === 'uncommon' || s.rarity === 'rare') && s.position !== 'K');
  const offers = [];
  const positions = new Set(), elements = new Set();
  let guard = 0;
  while (offers.length < 3 && guard++ < 200) {
    const sp = rng.pick(pool);
    if (positions.has(sp.position) || elements.has(sp.element)) continue;
    positions.add(sp.position); elements.add(sp.element);
    const nature = rng.pick(NATURE_IDS.filter((n) => NATURES[n].up && !['kicking'].includes(NATURES[n].up)));
    offers.push({ name: sp.name, species: sp.id, position: sp.position, type: sp.element, nature, ability: null, quality: 68 + rng.int(3), archetype: ARCHETYPE[sp.position], abilityName: sp.ability?.name, abilityText: sp.ability?.text, rarity: sp.rarity });
  }
  return offers;
}
/** A cornerstone by its current name, its species id or the name it had in earlier versions. */
export function cornerstoneByName(side, v) {
  if (!v) return null;
  if (typeof v === 'object' && v.species) return v; // an offer from cornerstoneOffers
  const list = side ? CORNERSTONES[side] : [...CORNERSTONES.offense, ...CORNERSTONES.defense];
  return list.find((c) => c.name === v || c.species === v || c.species === String(v).toLowerCase()) || null;
}

/** Starting roster composition: 22 monsters. */
export const STARTING_ROSTER = Object.freeze([
  ['QB', 2], ['RB', 2], ['WR', 3], ['TE', 1], ['OL', 4], ['DL', 3], ['LB', 2], ['CB', 3], ['S', 1], ['K', 1],
]);

export function createRoster(seed, { cornerstone = null, cornerstoneOffense, cornerstoneDefense, quality = 56, element = null, legendary = null, signature = null, evolveStage = 0 } = {}) {
  const rng = createRng(seed);
  const roster = [];
  // No species twice on a fresh roster (cornerstone species included); a second copy would be "Name II".
  const used = new Set([...CORNERSTONES.offense, ...CORNERSTONES.defense].map((c) => c.species));
  if (legendary) used.add(legendary);
  if (cornerstone?.species) used.add(cornerstone.species);
  for (const [position, count] of STARTING_ROSTER) {
    for (let i = 0; i < count; i++) {
      const q = quality + (i === 0 ? 4 : -2) + rng.int(5) - 2;
      const sp = pickSpeciesForPosition(rng, position, { exclude: used, element });
      if (sp.element !== element) used.add(sp.id); // a gym club may field its home element more than once ("Aquip II")
      roster.push(generateMonster(rng, { position, quality: q, species: sp.id }));
    }
  }
  const seen = {}; const roman = ['', ' II', ' III', ' IV', ' V', ' VI'];
  for (const m of roster) { const n = seen[m.name] = (seen[m.name] || 0) + 1; if (n > 1) m.name = `${m.name}${roman[n - 1] || ' ' + n}`; }
  // Later seasons: AI clubs field evolved commons (the league grows with the calendar).
  if (evolveStage > 0) for (const m of roster) { const sp = SPECIES_BY_ID[m.species]; const st = Math.min(evolveStage, sp.evolution.length); for (let i = 0; i < st; i++) { m.level = Math.max(m.level, sp.evolution[i].level); tryEvolve(m); } }
  // A gym club's legendary takes the first spot at its natural position, a cut above the rest of the roster.
  if (legendary && SPECIES_BY_ID[legendary]) {
    const sp = SPECIES_BY_ID[legendary]; const target = roster.find((m) => m.position === sp.position) || roster[0];
    const star = generateMonster(rng, { position: sp.position, quality: quality + 9, species: sp.id, id: target.id });
    star.legendary = true; star.salary = salaryFor(star) + 6000;
    Object.assign(target, star);
  }
  // The rival GM's signature monster: same species every season, stronger each year.
  if (signature && SPECIES_BY_ID[signature.species]) {
    const sp = SPECIES_BY_ID[signature.species]; const target = roster.find((m) => m.position === sp.position && !m.legendary) || roster[0];
    const star = generateMonster(rng, { position: sp.position, quality: quality + signature.bonus, species: sp.id, id: target.id });
    star.signature = true; star.level = 1 + (signature.seasons || 0) * 3; star.salary = salaryFor(star) + 3000;
    Object.assign(target, star);
    while (tryEvolve(target)) { /* the rival's signature evolves as the seasons pass */ }
  }
  // Cornerstones are a player-club thing. AI clubs (no choice given) get two stars of their own instead:
  // the first quarterback and one defensive starter, a cut above the roster, so every club has faces.
  // A single cornerstone chosen from the offers (any position).
  if (cornerstone) {
    const c = cornerstoneByName(null, cornerstone) || cornerstone;
    const target = roster.find((m) => m.position === c.position) || roster[0];
    const star = generateMonster(rng, { position: c.position, quality: c.quality || 69, species: c.species || c.name, nature: c.nature, id: target.id });
    if (c.ability) star.ability = c.ability; star.archetype = c.archetype; star.cornerstone = true; star.salary = salaryFor(star) + 3000;
    Object.assign(target, star);
    return roster;
  }
  if (!cornerstoneOffense && !cornerstoneDefense) {
    const stars = [roster.find((m) => m.position === 'QB'), roster.find((m) => m.position === rng.pick(['DL', 'LB', 'CB']) && !m.legendary)].filter(Boolean);
    for (const m of stars) { if (m.legendary) continue; const up = generateMonster(rng, { position: m.position, quality: quality + 10, species: m.species, id: m.id, name: m.name }); Object.assign(m, up); m.star = true; }
    return roster;
  }
  for (const [side, choice] of [['offense', cornerstoneOffense], ['defense', cornerstoneDefense]]) {
    const c = cornerstoneByName(side, choice) || CORNERSTONES[side][0];
    const target = roster.find((m) => m.position === c.position);
    const star = generateMonster(rng, { ...c, id: target.id });
    star.ability = c.ability; star.archetype = c.archetype; star.cornerstone = true; star.salary = salaryFor(star) + 3000;
    Object.assign(target, star);
  }
  return roster;
}

export const ROSTER_MAX = 26;
export const ROSTER_MIN = 16;

/**
 * The four numbers a coach needs (GDD: every number on screen should drive a
 * decision). Derived from the twelve engine attributes per position.
 */
export const HEADLINE = Object.freeze([
  { key: 'speed', label: 'Speed', help: 'Top speed, acceleration, cuts' },
  { key: 'power', label: 'Power', help: 'Blocking, tackling, breaking tackles' },
  { key: 'hands', label: 'Hands', help: 'Catching, throwing, kicking' },
  { key: 'smarts', label: 'Smarts', help: 'Reads, reactions, coverage' },
]);
export function headlineAttributes(m, opts) {
  const a = effectiveAttributes(m, opts);
  const avg = (...ks) => Math.round(ks.reduce((s, k) => s + a[k], 0) / ks.length);
  const pos = opts?.slotPosition || m.position;
  const offense = ['QB', 'RB', 'WR', 'TE', 'OL'].includes(pos);
  return {
    speed: avg('speed', 'agility'),
    power: pos === 'QB' ? a.strength : pos === 'OL' ? avg('blocking', 'strength') : offense ? avg('strength', 'blocking') : avg('strength', 'tackling'),
    hands: pos === 'QB' ? avg('accuracy', 'arm') : pos === 'K' ? a.kicking : pos === 'OL' ? a.blocking : offense ? a.catching : avg('coverage', 'catching'),
    smarts: offense ? a.awareness : avg('awareness', 'coverage'),
  };
}

/**
 * Scheme fit: does this monster suit the coordinators' schemes? Each scheme
 * values certain headline ratings per position; a monster fits when its
 * average of those ratings is in roughly the top 40% for its position
 * (thresholds calibrated once against a reference crop of generated monsters).
 */
const FIT_KEYS = {
  offense: {
    pass: { QB: ['hands', 'smarts'], RB: ['speed', 'hands'], WR: ['speed', 'hands'], TE: ['hands', 'speed'], OL: ['smarts', 'power'], why: 'Air Raid wants speed and hands' },
    run: { QB: ['smarts', 'speed'], RB: ['power', 'speed'], WR: ['power', 'speed'], TE: ['power'], OL: ['power'], why: 'Ground Attack wants power' },
    balanced: { QB: ['hands', 'smarts', 'speed'], RB: ['speed', 'power', 'hands'], WR: ['speed', 'hands', 'power'], TE: ['hands', 'power'], OL: ['power', 'smarts'], why: 'Balanced wants all-rounders' },
  },
  defense: {
    pressure: { DL: ['power', 'speed'], LB: ['speed', 'power'], CB: ['speed', 'power'], S: ['speed', 'power'], why: 'Blitz Heavy wants fast, strong rushers' },
    coverage: { DL: ['power', 'smarts'], LB: ['smarts', 'hands'], CB: ['smarts', 'hands'], S: ['smarts', 'hands'], why: 'Zone Control wants smart cover monsters' },
    man: { DL: ['power', 'speed'], LB: ['speed', 'smarts'], CB: ['speed', 'hands'], S: ['speed', 'hands'], why: 'Man Coverage wants speed to stay on top' },
  },
};
const keyMean = (m, keys) => { const h = headlineAttributes(m); return keys.reduce((a, k) => a + h[k], 0) / keys.length; };
let FIT_THRESHOLDS = null;
function fitThresholds() {
  if (FIT_THRESHOLDS) return FIT_THRESHOLDS;
  const rng = createRng(0xf17); const t = {};
  for (const side of ['offense', 'defense']) for (const [scheme, rule] of Object.entries(FIT_KEYS[side])) for (const [pos, keys] of Object.entries(rule)) {
    if (pos === 'why') continue;
    const vals = []; for (let i = 0; i < 160; i++) vals.push(keyMean(generateMonster(rng, { position: pos, quality: 52 + rng.int(14) }), keys));
    vals.sort((a, b) => a - b); t[`${scheme}:${pos}`] = vals[Math.floor(vals.length * 0.6)];
  }
  FIT_THRESHOLDS = t; return t;
}
export function schemeFit(m, { offense = 'balanced', defense = 'coverage' } = {}) {
  const side = ['QB', 'RB', 'WR', 'TE', 'OL'].includes(m.position) ? 'offense' : ['DL', 'LB', 'CB', 'S'].includes(m.position) ? 'defense' : null;
  if (!side) return null;
  const scheme = side === 'offense' ? (FIT_KEYS.offense[offense] ? offense : 'balanced') : (FIT_KEYS.defense[defense] ? defense : 'coverage');
  const keys = FIT_KEYS[side][scheme][m.position]; if (!keys) return null;
  return { fits: keyMean(m, keys) >= fitThresholds()[`${scheme}:${m.position}`], why: FIT_KEYS[side][scheme].why, side };
}
