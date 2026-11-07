// Task 8: the approved Temper table (consolidated specification §3; data/rules.json `temper`). Data and pure helpers only;
// not yet wired into generation or training.
// A Temper changes training efficiency only: favored 2, neutral 1, unfavored 0.5. It never changes ratings, ceilings, growth,
// ability power or AI behaviour. Kicking is never favored or unfavored. Ordinary individuals draw uniformly from all 25; Apex
// individuals draw uniformly from the three neutral Tempers (owner approval, 2026-11-06 round 1, item 14).

export const TEMPERS = Object.freeze({
  swift: Object.freeze({ name: 'Swift', favored: 'speed', unfavored: 'strength' }),
  powerful: Object.freeze({ name: 'Powerful', favored: 'strength', unfavored: 'speed' }),
  forceful: Object.freeze({ name: 'Forceful', favored: 'strength', unfavored: 'blocking' }),
  protective: Object.freeze({ name: 'Protective', favored: 'blocking', unfavored: 'strength' }),
  patient: Object.freeze({ name: 'Patient', favored: 'blocking', unfavored: 'awareness' }),
  adaptive: Object.freeze({ name: 'Adaptive', favored: 'awareness', unfavored: 'blocking' }),
  instinctive: Object.freeze({ name: 'Instinctive', favored: 'awareness', unfavored: 'accuracy' }),
  precise: Object.freeze({ name: 'Precise', favored: 'accuracy', unfavored: 'awareness' }),
  measured: Object.freeze({ name: 'Measured', favored: 'accuracy', unfavored: 'arm' }),
  bold: Object.freeze({ name: 'Bold', favored: 'arm', unfavored: 'accuracy' }),
  gifted: Object.freeze({ name: 'Gifted', favored: 'arm', unfavored: 'durability' }),
  resistant: Object.freeze({ name: 'Resistant', favored: 'durability', unfavored: 'arm' }),
  hardy: Object.freeze({ name: 'Hardy', favored: 'durability', unfavored: 'tackling' }),
  relentless: Object.freeze({ name: 'Relentless', favored: 'tackling', unfavored: 'durability' }),
  aggressive: Object.freeze({ name: 'Aggressive', favored: 'tackling', unfavored: 'coverage' }),
  disciplined: Object.freeze({ name: 'Disciplined', favored: 'coverage', unfavored: 'tackling' }),
  watchful: Object.freeze({ name: 'Watchful', favored: 'coverage', unfavored: 'catching' }),
  surehanded: Object.freeze({ name: 'Surehanded', favored: 'catching', unfavored: 'coverage' }),
  secure: Object.freeze({ name: 'Secure', favored: 'catching', unfavored: 'agility' }),
  elusive: Object.freeze({ name: 'Elusive', favored: 'agility', unfavored: 'catching' }),
  explosive: Object.freeze({ name: 'Explosive', favored: 'agility', unfavored: 'speed' }),
  driven: Object.freeze({ name: 'Driven', favored: 'speed', unfavored: 'agility' }),
  calm: Object.freeze({ name: 'Calm', favored: null, unfavored: null }),
  balanced: Object.freeze({ name: 'Balanced', favored: null, unfavored: null }),
  steady: Object.freeze({ name: 'Steady', favored: null, unfavored: null }),
});
export const TEMPER_IDS = Object.freeze(Object.keys(TEMPERS));
export const NEUTRAL_TEMPERS = Object.freeze(TEMPER_IDS.filter((t) => !TEMPERS[t].favored));
export const EFFICIENCY = Object.freeze({ favored: 2, neutral: 1, unfavored: 0.5 });

/** Training efficiency E for an attribute under a Temper: 2, 1 or 0.5. Unknown Tempers are an error, never silently neutral. */
export function temperEfficiency(temperId, attribute) {
  const t = TEMPERS[temperId]; if (!t) throw new Error(`unknown Temper "${temperId}"`);
  if (attribute === t.favored) return EFFICIENCY.favored;
  if (attribute === t.unfavored) return EFFICIENCY.unfavored;
  return EFFICIENCY.neutral;
}
/** Uniform draw: all 25 for ordinary individuals, the three neutral Tempers for Apex. `rng` is the game's seeded generator. */
export function drawTemper(rng, { apex = false } = {}) { const pool = apex ? NEUTRAL_TEMPERS : TEMPER_IDS; return pool[rng.int(pool.length)]; }

const ATTR_WORD = Object.freeze({ speed: 'Speed', strength: 'Strength', blocking: 'Blocking', awareness: 'Awareness', accuracy: 'Accuracy', arm: 'Arm', durability: 'Durability', tackling: 'Tackling', coverage: 'Coverage', catching: 'Catching', agility: 'Agility', kicking: 'Kicking' });
/** Display text for a Temper (UI): its name and what it does to training. A Temper never changes ratings or ceilings. */
export function temperSummary(temperId) {
  const t = TEMPERS[temperId]; if (!t) return { name: 'Unknown', text: '' };
  const text = t.favored ? `Trains ${ATTR_WORD[t.favored]} at double efficiency and ${ATTR_WORD[t.unfavored]} at half; every other attribute at normal cost.` : 'Trains every attribute at normal cost.';
  return { name: t.name, text, favored: t.favored, unfavored: t.unfavored };
}
