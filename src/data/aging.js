// Monster ageing, age-adjusted training and retirement (Task 6 Phase A-1; owner's Group 1 decisions of 2026-10-30, GDD §55).
// Pure rules, no state: every value is the approved specification's (docs/TASK6_APPROVED_SPECIFICATION.md §1.1–§1.5).
//
//   - Each position has a physical decline onset (at normal longevity), a technical onset a little later and a physical rate.
//   - Hidden longevity (−3…+3 years) comes from the monster's id, so nothing is stored; durability moves the onset one year.
//   - The PUBLIC onset (position + durability, no longevity) is what anyone can see: training costs and forecasts read it.
//   - Decline: physical attributes lose more each season past the true onset; technical ones later and more slowly.
//   - Retirement: offseason only, a hazard by seasons from the career age (true onset + 4), odds moved by the monster's role,
//     a contract and ONE injury factor; no hard age. Legendary monsters and the rival's signature monster never age or retire.
//   - Old saves get a transition (variant B): the decline cap, the hazard ramp and the club cap for their first offseasons.
import { hashString } from '../core/rng.js';

export const PHYSICAL = Object.freeze(['speed', 'agility', 'strength', 'durability']);
export const isPhysical = (k) => PHYSICAL.includes(k);

/** Position curve: physical onset at normal longevity, technical onset offset, physical decline rate. */
export const CURVE = Object.freeze({
  RB: { onset: 27, tech: 2, rate: 1.3 }, WR: { onset: 28, tech: 2, rate: 1.15 }, CB: { onset: 28, tech: 2, rate: 1.15 },
  LB: { onset: 29, tech: 2, rate: 1.0 }, S: { onset: 29, tech: 2, rate: 1.0 }, DL: { onset: 29, tech: 2, rate: 1.0 }, TE: { onset: 29, tech: 2, rate: 1.0 },
  OL: { onset: 30, tech: 3, rate: 0.9 }, QB: { onset: 30, tech: 3, rate: 0.8 }, K: { onset: 32, tech: 3, rate: 0.6 },
});
const curveOf = (pos) => CURVE[pos] || CURVE.WR;

/** Hidden longevity, −3…+3, from the monster's id: 5 / 10 / 20 / 30 / 20 / 10 / 5 %. Never shown, never read by AI decisions. */
export function longevityOf(id) {
  const u = (hashString(`longevity|${id}`) % 10000) / 10000;
  return u < 0.05 ? -3 : u < 0.15 ? -2 : u < 0.35 ? -1 : u < 0.65 ? 0 : u < 0.85 ? 1 : u < 0.95 ? 2 : 3;
}
/** Durability 75+ moves the onset a year later; 45 or less a year earlier. */
export const durabilityShift = (dur) => (dur >= 75 ? 1 : dur <= 45 ? -1 : 0);
/** Durability at peak: recorded once when the monster reaches his peak window (onset − 3), else his current durability. */
export const peakDurability = (m) => m?.durPeak ?? m?.attributes?.durability ?? 60;
/** Age from which the durability at peak is recorded. */
export const peakWindowAge = (pos) => curveOf(pos).onset - 3;
export const trueOnset = (m) => curveOf(m.position).onset + longevityOf(m.id) + durabilityShift(peakDurability(m));
export const publicOnset = (m) => curveOf(m.position).onset + durabilityShift(peakDurability(m));
export const technicalOffset = (pos) => curveOf(pos).tech;
export const CAREER_AFTER_ONSET = 4;

// ---------------------------------------------------------------- age-adjusted training (Group 1 Modification 1)
/** Points one +1 costs on a physical attribute, by seasons past the public onset: 1 · 2 · 3 · 4. */
export const physicalCost = (yearsPast) => (yearsPast <= 0 ? 1 : yearsPast <= 2 ? 2 : yearsPast <= 4 ? 3 : 4);
/** Points one +1 costs on attribute `k` for monster `m` (1 for the ageless). Technical: 1, and 2 past the public technical onset. */
export function attributeCost(m, k, { ageless = false } = {}) {
  if (ageless || !m || m.age == null) return 1;
  const pub = publicOnset(m);
  if (isPhysical(k)) return physicalCost(m.age - pub);
  return m.age > pub + technicalOffset(m.position) ? 2 : 1;
}

// ---------------------------------------------------------------- decline
export const physLoss = (y, rate) => (y <= 0 ? 0 : rate * (1.5 + 0.75 * (y - 1)));
export const techLoss = (y) => (y <= 0 ? 0 : 0.75 + 0.5 * (y - 1));
/** An integer loss whose mean is `x`: the floor, plus one with the remaining chance (a draw only when there is a fraction). */
export const drawLoss = (x, rng) => { const f = Math.floor(x); const frac = x - f; return f + (frac > 0 && rng.next() < frac ? 1 : 0); };
/** Extra physical loss after one severe injury past the true onset (once, not stacked with weeks lost). */
export const SEVERE_INJURY_PHYSICAL = 1;
export const ATTRIBUTE_FLOOR = 20;

// ---------------------------------------------------------------- retirement (Group 1 Modification 2)
export const HAZARD = Object.freeze([[-3, 0.02], [-2, 0.05], [-1, 0.10], [0, 0.20], [1, 0.35], [2, 0.55], [3, 0.75], [4, 0.90]]);
export const hazardAt = (y) => { let h = 0; for (const [k, v] of HAZARD) if (y >= k) h = v; return h; };
export const RETIRE_ODDS = Object.freeze({ starterNearPeak: 0.5, declinedReserve: 1.8, unsigned: 2, severe: 1.5, weeks4: 1.25, chronic: 1.15, cap: 0.97 });
/** Near his peak: within 4 of his career-high overall. Declined: 10 or more below it. */
export const NEAR_PEAK = 4, DECLINED = 10;
/** Retirement chance this offseason: `y` = age − (true onset + 4); ONE injury factor (the most severe that applies). */
export function retireChance(y, { starterNearPeak = false, declinedReserve = false, unsigned = false, injury = 'none', ramp = 1 } = {}) {
  const h = hazardAt(y) * ramp; if (h <= 0) return 0; let odds = h / (1 - h);
  if (starterNearPeak) odds *= RETIRE_ODDS.starterNearPeak; if (declinedReserve) odds *= RETIRE_ODDS.declinedReserve; if (unsigned) odds *= RETIRE_ODDS.unsigned;
  odds *= injury === 'severe' ? RETIRE_ODDS.severe : injury === 'weeks4' ? RETIRE_ODDS.weeks4 : injury === 'chronic' ? RETIRE_ODDS.chronic : 1;
  return Math.min(RETIRE_ODDS.cap, odds / (1 + odds));
}
/** The single injury class of a season: a severe injury, 4+ weeks lost in total, a High Injury History, or none. */
export const injuryClass = ({ severe = false, weeksLost = 0, chronic = false }) => (severe ? 'severe' : weeksLost >= 4 ? 'weeks4' : chronic ? 'chronic' : 'none');

// ---------------------------------------------------------------- transition for saves made before these rules (Modification 4)
export const TRANSITION = Object.freeze({ rampSeasons: 4, capShare: 0.15, capSeasons: 3, declineFactor: 2 });
/** Offseasons under the new rules for this save (1 = the first), or null for a franchise born under them. */
export function transitionSeason(f, year) { const a = f?.aging; if (!a || a.native || a.from == null) return null; return Math.max(1, year - a.from + 1); }
export const transitionYears = (trueY, s) => (s == null ? trueY : Math.min(trueY, TRANSITION.declineFactor * s));
export const transitionRamp = (s) => (s == null ? 1 : Math.min(1, s / TRANSITION.rampSeasons));
export const transitionClubCap = (s) => (s != null && s <= TRANSITION.capSeasons ? TRANSITION.capShare : 1);

// ---------------------------------------------------------------- the observable forecast (Modification 3) and career stages
/**
 * What anyone can estimate without the hidden longevity. `sawDecline`: did his physical attributes fall last offseason (null when
 * unknown); `bigDrop`: 4+ physical points in one offseason before his public onset; `chronic`: High Injury History.
 * Returns { onset, window: [earliest, likely, latest] retirement ages, nextSeason: chance he retires next offseason }.
 */
export function forecast(m, { sawDecline = null, bigDrop = false, chronic = false, starterNearPeak = false, unsigned = false } = {}) {
  let onset = publicOnset(m);
  if (m.age > onset && sawDecline === false) onset += 1; if (bigDrop || chronic) onset -= 1;
  const likely = onset + CAREER_AFTER_ONSET + 1;
  return { onset, window: [likely - 2, likely, likely + 3], nextSeason: retireChance(m.age + 1 - (onset + CAREER_AFTER_ONSET), { starterNearPeak, unsigned, injury: chronic ? 'chronic' : 'none' }) };
}
/** A career-stage label from the observable forecast: Rising, Prime, Veteran, Late career (and the retirement outlook). */
export function careerStage(m, fc = forecast(m)) {
  const peakFrom = fc.onset - 3;
  const key = m.age < peakFrom ? 'rising' : m.age <= fc.onset ? 'prime' : m.age <= fc.onset + 2 ? 'veteran' : 'late';
  const label = { rising: 'Rising', prime: 'Prime', veteran: 'Veteran', late: 'Late career' }[key];
  const risk = fc.nextSeason; const outlook = risk < 0.1 ? 'low' : risk < 0.35 ? 'moderate' : 'high';
  return { key, label, outlook, outlookLabel: { low: 'Low', moderate: 'Moderate', high: 'High' }[outlook], nextSeason: risk, window: fc.window };
}
