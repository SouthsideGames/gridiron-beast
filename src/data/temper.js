// Task 8: the approved Temper table (consolidated specification §3; data/rules.json `temper`). Data and pure helpers only;
// not yet wired into generation or training.
// A Temper changes training efficiency only: favored 2, neutral 1, unfavored 0.5. It never changes ratings, ceilings, growth,
// ability power or AI behaviour. Kicking is never favored or unfavored. Ordinary individuals draw uniformly from all 25; Apex
// individuals draw uniformly from the three neutral Tempers (owner approval, 2026-11-06 round 1, item 14).
import { t as $t } from '../text/index.js';

export const TEMPERS = Object.freeze({
  swift: Object.freeze({ name: $t('data.swift'), favored: 'speed', unfavored: 'strength' }),
  powerful: Object.freeze({ name: $t('data.powerful'), favored: 'strength', unfavored: 'speed' }),
  forceful: Object.freeze({ name: $t('data.forceful'), favored: 'strength', unfavored: 'blocking' }),
  protective: Object.freeze({ name: $t('data.protective'), favored: 'blocking', unfavored: 'strength' }),
  patient: Object.freeze({ name: $t('data.patient'), favored: 'blocking', unfavored: 'awareness' }),
  adaptive: Object.freeze({ name: $t('data.adaptive'), favored: 'awareness', unfavored: 'blocking' }),
  instinctive: Object.freeze({ name: $t('data.instinctive'), favored: 'awareness', unfavored: 'accuracy' }),
  precise: Object.freeze({ name: $t('data.precise'), favored: 'accuracy', unfavored: 'awareness' }),
  measured: Object.freeze({ name: $t('data.measured'), favored: 'accuracy', unfavored: 'arm' }),
  bold: Object.freeze({ name: $t('data.bold'), favored: 'arm', unfavored: 'accuracy' }),
  gifted: Object.freeze({ name: $t('data.gifted'), favored: 'arm', unfavored: 'durability' }),
  resistant: Object.freeze({ name: $t('data.resistant'), favored: 'durability', unfavored: 'arm' }),
  hardy: Object.freeze({ name: $t('data.hardy'), favored: 'durability', unfavored: 'tackling' }),
  relentless: Object.freeze({ name: $t('data.relentless'), favored: 'tackling', unfavored: 'durability' }),
  aggressive: Object.freeze({ name: $t('data.aggressive'), favored: 'tackling', unfavored: 'coverage' }),
  disciplined: Object.freeze({ name: $t('data.disciplined'), favored: 'coverage', unfavored: 'tackling' }),
  watchful: Object.freeze({ name: $t('data.watchful'), favored: 'coverage', unfavored: 'catching' }),
  surehanded: Object.freeze({ name: $t('data.surehanded'), favored: 'catching', unfavored: 'coverage' }),
  secure: Object.freeze({ name: $t('data.secure'), favored: 'catching', unfavored: 'agility' }),
  elusive: Object.freeze({ name: $t('data.elusive'), favored: 'agility', unfavored: 'catching' }),
  explosive: Object.freeze({ name: $t('data.explosive'), favored: 'agility', unfavored: 'speed' }),
  driven: Object.freeze({ name: $t('data.driven'), favored: 'speed', unfavored: 'agility' }),
  calm: Object.freeze({ name: $t('data.calm'), favored: null, unfavored: null }),
  balanced: Object.freeze({ name: $t('data.balanced'), favored: null, unfavored: null }),
  steady: Object.freeze({ name: $t('data.steady'), favored: null, unfavored: null }),
});
export const TEMPER_IDS = Object.freeze(Object.keys(TEMPERS));
export const NEUTRAL_TEMPERS = Object.freeze(TEMPER_IDS.filter((t) => !TEMPERS[t].favored));
export const EFFICIENCY = Object.freeze({ favored: 2, neutral: 1, unfavored: 0.5 });

/** Training efficiency E for an attribute under a Temper: 2, 1 or 0.5. Unknown Tempers are an error, never silently neutral. */
export function temperEfficiency(temperId, attribute) {
  const t = TEMPERS[temperId]; if (!t) throw new Error(`${$t('data.unknown_temper', { temperId })}`);
  if (attribute === t.favored) return EFFICIENCY.favored;
  if (attribute === t.unfavored) return EFFICIENCY.unfavored;
  return EFFICIENCY.neutral;
}
/** Uniform draw: all 25 for ordinary individuals, the three neutral Tempers for Apex. `rng` is the game's seeded generator. */
export function drawTemper(rng, { apex = false } = {}) { const pool = apex ? NEUTRAL_TEMPERS : TEMPER_IDS; return pool[rng.int(pool.length)]; }

const ATTR_WORD = Object.freeze({ speed: 'Speed', strength: 'Strength', blocking: 'Blocking', awareness: 'Awareness', accuracy: 'Accuracy', arm: 'Arm', durability: 'Durability', tackling: 'Tackling', coverage: 'Coverage', catching: 'Catching', agility: 'Agility', kicking: 'Kicking' });
/** Display text for a Temper (UI): its name and what it does to training. A Temper never changes ratings or ceilings. */
export function temperSummary(temperId) {
  const t = TEMPERS[temperId]; if (!t) return { name: $t('data.unknown'), text: '' };
  const text = t.favored ? `${$t('data.trains_at_double_efficiency_and_at', { attrWord: ATTR_WORD[t.favored], attrWord2: ATTR_WORD[t.unfavored] })}` : 'Trains every attribute at normal cost.';
  return { name: t.name, text, favored: t.favored, unfavored: t.unfavored };
}
