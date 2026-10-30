// Task 6 Group 1 — the PROPOSED ageing, training and retirement rules, as pure functions, for the planning models only
// (tools/aging-model.mjs, tools/aging-projection.mjs). NOT game code: nothing in src/ imports this file. Values are the
// Group 1 proposal as modified by the owner's decision of 2026-10-30 (docs/TASK6_DECISIONS.md, D1–D8).
import { hashString } from '../../src/core/rng.js';

export const PHYSICAL = Object.freeze(['speed', 'agility', 'strength', 'durability']);
export const isPhysical = (k) => PHYSICAL.includes(k);

/** Position curve: physical decline onset at normal longevity, technical onset offset, physical decline rate. */
export const CURVE = Object.freeze({
  RB: { onset: 27, tech: 2, rate: 1.3 }, WR: { onset: 28, tech: 2, rate: 1.15 }, CB: { onset: 28, tech: 2, rate: 1.15 },
  LB: { onset: 29, tech: 2, rate: 1.0 }, S: { onset: 29, tech: 2, rate: 1.0 }, DL: { onset: 29, tech: 2, rate: 1.0 }, TE: { onset: 29, tech: 2, rate: 1.0 },
  OL: { onset: 30, tech: 3, rate: 0.9 }, QB: { onset: 30, tech: 3, rate: 0.8 }, K: { onset: 32, tech: 3, rate: 0.6 },
});

/** Hidden longevity, −3…+3, from the monster's id (no stored field): 5/10/20/30/20/10/5 %. */
export function longevityOf(id) {
  const u = (hashString(`longevity|${id}`) % 10000) / 10000;
  return u < 0.05 ? -3 : u < 0.15 ? -2 : u < 0.35 ? -1 : u < 0.65 ? 0 : u < 0.85 ? 1 : u < 0.95 ? 2 : 3;
}
/** Durability shifts onset by one year: 75+ later, 45 or less earlier (read once, when the monster reaches his peak window). */
export const durabilityShift = (dur) => (dur >= 75 ? 1 : dur <= 45 ? -1 : 0);
/** The monster's true physical onset (hidden: carries longevity). */
export const trueOnset = (pos, id, durAtPeak) => (CURVE[pos] || CURVE.WR).onset + longevityOf(id) + durabilityShift(durAtPeak);
/** The public onset everyone can see (position and durability, no longevity): what training costs and AI forecasts read. */
export const publicOnset = (pos, durAtPeak) => (CURVE[pos] || CURVE.WR).onset + durabilityShift(durAtPeak);

// ---------------------------------------------------------------- Modification 1: age-adjusted training (both AI and GM)
/** Points one +1 costs on a PHYSICAL attribute, by seasons past the public onset: 1 · 2 · 3 · 4. */
export const physicalCost = (age, pubOnset) => { const y = age - pubOnset; return y <= 0 ? 1 : y <= 2 ? 2 : y <= 4 ? 3 : 4; };
/** Points one +1 costs on a technical/mental attribute: 1, and 2 once past the public technical onset. */
export const technicalCost = (age, pubOnset, pos) => (age > pubOnset + (CURVE[pos] || CURVE.WR).tech ? 2 : 1);
export const costOf = (k, age, pubOnset, pos) => (isPhysical(k) ? physicalCost(age, pubOnset) : technicalCost(age, pubOnset, pos));

// ---------------------------------------------------------------- decline (true onset; integer draws around the expected value)
export const physLoss = (y, rate) => (y <= 0 ? 0 : rate * (1.5 + 0.75 * (y - 1)));
export const techLoss = (y) => (y <= 0 ? 0 : 0.75 + 0.5 * (y - 1));
/** An integer loss whose mean is `x` (floor plus a chance of one more): deterministic given the generator. */
export const drawLoss = (x, rng) => Math.floor(x) + (rng.next() < x - Math.floor(x) ? 1 : 0);

// ---------------------------------------------------------------- Modification 2: retirement (one injury adjustment only)
export const HAZARD = Object.freeze([[-3, 0.02], [-2, 0.05], [-1, 0.10], [0, 0.20], [1, 0.35], [2, 0.55], [3, 0.75], [4, 0.90]]);
export const hazardAt = (y) => { let h = 0; for (const [k, v] of HAZARD) if (y >= k) h = v; return h; };
export const CAREER_AFTER_ONSET = 4;
/**
 * Retirement chance this offseason. `y` = age − (true onset + 4). Odds multipliers: role (starter near his peak ×0.5, a reserve 10+ below
 * his peak ×1.8), unsigned ×2, and ONE injury factor: the most severe that applies (a severe injury last season ×1.5, else 4+ weeks lost
 * ×1.25, else a career High Injury History ×1.15). Durability acts only through the onset shift and the game's injury risk (no third
 * retirement term). Capped at 0.97. Transition `ramp` (Modification 4) scales the hazard during an old save's first offseasons.
 */
export function retireChance(y, { starterNearPeak = false, declinedReserve = false, unsigned = false, injury = 'none', ramp = 1 } = {}) {
  const h = hazardAt(y) * ramp; if (h <= 0) return 0; let odds = h / (1 - h);
  if (starterNearPeak) odds *= 0.5; if (declinedReserve) odds *= 1.8; if (unsigned) odds *= 2;
  odds *= injury === 'severe' ? 1.5 : injury === 'weeks4' ? 1.25 : injury === 'chronic' ? 1.15 : 1;
  return Math.min(0.97, odds / (1 + odds));
}
/** The single injury class for a season: severe (4+ weeks in one injury), weeks4 (4+ weeks lost in total), chronic (high history), none. */
export const injuryClass = ({ severe = false, weeksLost = 0, chronic = false }) => (severe ? 'severe' : weeksLost >= 4 ? 'weeks4' : chronic ? 'chronic' : 'none');
/** Extra ageing from one severe injury past the true onset: −1 to each physical attribute, once (not stacked with weeks lost). */
export const SEVERE_INJURY_PHYSICAL = 1;

// ---------------------------------------------------------------- Modification 4: transition for saves made before the rules
/**
 * `s` = how many offseasons this save has had under the new rules (1 for the first). Decline reads min(true y, 2s) seasons past onset,
 * so an old veteran's decline climbs quickly to its true rate; the retirement hazard is scaled by min(1, s / rampSeasons); and while
 * s ≤ capSeasons at most capShare of a club's roster may retire in one offseason (the rest are re-checked next offseason, at the higher
 * ramp). From s = rampSeasons everything is the normal rule, so no career is extended past the transition.
 */
export const TRANSITION = { rampSeasons: 4, capShare: 0.15, capSeasons: 3, declineFactor: 2 }; // recommended after the projection test (variant B)
export const transitionYears = (trueY, s) => (s == null ? trueY : Math.min(trueY, TRANSITION.declineFactor * s));
export const transitionRamp = (s) => (s == null ? 1 : Math.min(1, s / TRANSITION.rampSeasons));
export const transitionClubCap = (s) => (s != null && s <= TRANSITION.capSeasons ? TRANSITION.capShare : 1);

// ---------------------------------------------------------------- Modification 3: the observable forecast (AI and owner UI)
/**
 * What anyone can estimate without the hidden longevity: the public onset, moved one year later if the monster is past it with no
 * visible physical decline yet (his physical attributes did not fall last offseason), and one year earlier if he lost 4+ physical points
 * in one offseason before it, or has a High Injury History. Returns the estimated window [earliest, likely, latest] retirement ages and
 * the estimated chance he retires next offseason (the hazard at the estimated career age, with the visible modifiers).
 */
export function forecast({ pos, age, durAtPeak, sawDecline = null, bigDrop = false, chronic = false, starterNearPeak = false, unsigned = false }) {
  let onset = publicOnset(pos, durAtPeak);
  if (age > onset && sawDecline === false) onset += 1; if (bigDrop || chronic) onset -= 1;
  const likely = onset + CAREER_AFTER_ONSET + 1;
  return { onset, window: [likely - 2, likely, likely + 3], nextSeason: retireChance(age + 1 - (onset + CAREER_AFTER_ONSET), { starterNearPeak, unsigned, injury: chronic ? 'chronic' : 'none' }) };
}
