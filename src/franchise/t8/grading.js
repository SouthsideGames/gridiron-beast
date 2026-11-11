// Task 8 specification §7–8. Inputs are verified individual opportunities, never
// inferred from proximity or a team's final result. Missing categories stay neutral.
export const clamp = (v, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));
export const sample = (n, k) => Math.min(1, Math.max(0, n) / k);
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const bounded = (v) => clamp(v, -.2, .2);
const scored = (xs = [], k = 10) => clamp(mean(xs)) * sample(xs.length, k);
const weighted = (parts) => bounded(.2 * parts.reduce((sum, [weight, value]) => sum + weight * value, 0));

/** One verified opportunity's outcomes; an attributable failure overrides positives. */
export function blockScore(e) {
  if (e.uncertain || e.unavoidableOverride) return 0;
  if (e.sackAllowed) return -3;
  if (e.pressureAllowed) return -2;
  if (e.disruptiveShedAllowed) return -1;
  return e.pancake ? 2 : e.success ? 1 : 0;
}
export function quarterbackScore(e) {
  if (e.fumble || e.attributableInterception) return -3;
  return e.touchdown || e.firstDown ? 2 : e.completion || (e.qbRun && e.yards >= 4) ? 1 : 0;
}
export function runningBackScore(e) {
  if (e.fumble) return -3;
  if (e.touchdown || (e.reception && e.firstDown)) return 2;
  if (e.catchableDrop || (e.carry && e.yards < 0)) return -1;
  return e.reception ? 1 : 0;
}
export const offensiveLineGrade = (opportunities = []) => .2 * scored(opportunities.map(blockScore));
export function quarterbackGrade({ plays = [], attempts = 0, completions = 0 } = {}) {
  const rate = attempts ? completions / attempts : null;
  const rateAdj = rate === null ? 0 : rate < .5 ? -.1 : rate < .6 ? -.05 : rate < .7 ? 0 : rate < .8 ? .05 : .1;
  return bounded(.2 * scored(plays.filter((e) => !e.handoff && !e.kneel && !e.spike).map(quarterbackScore)) + rateAdj);
}
export function runningBackGrade({ plays = [], carries = 0, rushingYards = 0 } = {}) {
  const ypc = carries ? rushingYards / carries : 0;
  const efficiency = !carries ? 0 : ypc < 2.5 ? -.1 : ypc < 3.5 ? -.05 : ypc < 4.5 ? 0 : ypc < 5.5 ? .05 : .1;
  return bounded(.2 * scored(plays.map(runningBackScore)) + efficiency * sample(carries, 10));
}
export function wideReceiverGrade({ targets = 0, receptions = 0, yards = 0, touchdowns = 0, firstDowns = 0, lateDownFirstDowns = 0, drops = 0, yac = 0, explosives = 0, redZoneFirstDowns = 0, fumbles = 0 } = {}) {
  if (!targets) return 0;
  const cr = receptions / targets, ypt = yards / targets, ypr = receptions ? yards / receptions : 0;
  const efficiency = (cr < .5 ? -.04 : cr < .7 ? 0 : cr < .85 ? .02 : .04)
    + (receptions ? ypr >= 15 ? .03 : ypr >= 12 ? .02 : 0 : 0)
    + (ypt < 4 ? -.03 : ypt < 8 ? 0 : ypt < 12 ? .02 : .03)
    + (receptions && yac / receptions >= 5 ? .02 : 0);
  // firstDowns excludes touchdowns; lateDownFirstDowns is its third/fourth-down subset.
  return bounded(efficiency * sample(targets, 5) + Math.min(.04, Math.floor(Math.max(0, yards) / 25) * .01)
    + Math.min(.08, touchdowns * .04) + Math.min(.04, (firstDowns + lateDownFirstDowns) * .01)
    - Math.min(.09, drops * .03) + Math.min(.04, explosives * .02)
    + Math.min(.02, redZoneFirstDowns * .01) - Math.min(.12, fumbles * .06));
}
export function tightEndGrade({ targets = 0, receptions = 0, yards = 0, touchdowns = 0, firstDowns = 0, lateDownFirstDowns = 0, redZoneReceptions = 0, situationalOpportunities = 0, blocks = [], drops = 0, fumbles = 0, penalties = 0, reliabilityOpportunities = 0 } = {}) {
  const production = targets ? clamp(receptions / 5 + yards / 60 + touchdowns - 1) * sample(targets, 5) : 0;
  const efficiency = targets ? clamp(mean([clamp((receptions / targets - .7) / .2), clamp((yards / targets - 8) / 4), receptions ? clamp((yards / receptions - 12) / 6) : 0])) * sample(targets, 5) : 0;
  return weighted([[.2, production], [.2, efficiency], [.2, clamp(.25 * (firstDowns + lateDownFirstDowns + redZoneReceptions)) * sample(situationalOpportunities, 5)], [.25, scored(blocks.map(blockScore))], [.15, clamp(1 - .5 * drops - 2 * fumbles - .5 * penalties) * sample(reliabilityOpportunities, 5)]]);
}

/** Score arrays contain one highest/failure-priority score per attributable category/play. */
export function defensiveLineGrade({ passRush = [], runDefense = [], disruption = [], assignment = [], disciplineOpportunities = 0, missedTackles = 0, lostContain = 0 } = {}) {
  return weighted([[.3, scored(passRush)], [.3, scored(runDefense)], [.2, scored(disruption)], [.1, scored(assignment)], [.1, clamp(1 - .5 * missedTackles - lostContain) * sample(disciplineOpportunities, 10)]]);
}
export function linebackerGrade({ runDefense = [], coverage = [], passRush = [], tackling = [], forcedFumbles = 0, recoveries = 0, interceptions = 0, fourthDownStops = 0, defensiveSnaps = 0 } = {}) {
  return weighted([[.25, scored(runDefense)], [.25, scored(coverage, 5)], [.2, scored(passRush)], [.2, scored(tackling, 5)], [.1, clamp(.5 * forcedFumbles + .25 * recoveries + .5 * interceptions + .25 * fourthDownStops) * sample(defensiveSnaps, 10)]]);
}
function coverageEfficiency({ targets = 0, completions = 0, yards = 0, firstDownOrTd = 0, touchdowns = 0 } = {}) {
  return targets ? clamp(mean([clamp((.6 - completions / targets) / .3), clamp((8 - yards / targets) / 6), clamp((.4 - firstDownOrTd / targets) / .4)]) - .5 * touchdowns) * sample(targets, 5) : 0;
}
export function defensiveBackGrade({ coverage = {}, execution = [], tackling = [], breakups = 0, interceptions = 0, forcedFumbles = 0, recoveries = 0, fourthDownStops = 0, defensiveSnaps = 0 } = {}, { safety = false } = {}) {
  const efficiency = coverageEfficiency(coverage), assignment = scored(execution), ball = clamp(.25 * breakups + .5 * interceptions) * sample(coverage.targets || 0, 5);
  const impact = clamp(.5 * forcedFumbles + .25 * recoveries + .25 * fourthDownStops) * sample(defensiveSnaps, 10);
  return weighted(safety ? [[.3, efficiency], [.25, scored(tackling, 5)], [.2, assignment], [.15, ball], [.1, impact]] : [[.35, efficiency], [.25, assignment], [.2, ball], [.15, scored(tackling, 5)], [.05, impact]]);
}
export function kickScore({ made, probability }) {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) throw new RangeError('pre-attempt probability must be in 0..1');
  return 2 * (Number(!!made) - probability);
}
export function placementScore({ error, failed = false }, kickoff = false) {
  if (failed) return -1;
  if (!Number.isFinite(error) || error < 0) throw new RangeError('placement error must be nonnegative');
  const [a, b, c] = kickoff ? [5, 10, 20] : [3, 7, 12];
  return error <= a ? 1 : error <= b ? .5 : error <= c ? 0 : -1;
}
export function kickerGrade({ fieldGoals = [], pats = [], punts = [], kickoffs = [] } = {}) {
  return weighted([[.5, scored(fieldGoals.map(kickScore), 3)], [.15, scored(pats.map(kickScore), 3)], [.2, scored(punts.map((e) => placementScore(e)), 3)], [.15, scored(kickoffs.map((e) => placementScore(e, true)), 3)]]);
}

export const CLASH_WEIGHTS = Object.freeze({
  Striker: Object.freeze([.6, .2, .05, .15]), Tank: Object.freeze([.15, .65, .15, .05]),
  Support: Object.freeze([.1, .2, .6, .1]), Disruptor: Object.freeze([.2, .15, .15, .5]), Balanced: Object.freeze([.35, .3, .2, .15]),
});
/** Ratios come from the bounded actual-benefit ledger. Failed executed actions use 0;
 * invalid actions have no opportunity. No nominal shield/overheal credit. */
export function clashGrade({ archetype = 'Balanced', involved = true, offense = [], defense = [], support = [], disruption = [] } = {}) {
  if (!involved) return 0;
  const weights = CLASH_WEIGHTS[archetype];
  if (!weights) throw new RangeError(`unknown Clash archetype ${archetype}`);
  return weighted([offense, defense, support, disruption].map((xs, i) => [weights[i], xs.length ? clamp(2 * mean(xs.map((v) => clamp(v, 0, 1))) - 1) * sample(xs.length, 3) : 0]));
}

/** Dispatch the verified, monster-aggregated activity telemetry. */
export function footballGrade(position, data = {}) {
  switch (position) {
    case 'QB': return quarterbackGrade(data);
    case 'RB': return runningBackGrade(data);
    case 'WR': return wideReceiverGrade(data);
    case 'TE': return tightEndGrade(data);
    case 'OL': return offensiveLineGrade(data.blocks);
    case 'DL': return defensiveLineGrade({ ...data, runDefense: data.runDefense?.map((v) => Math.max(0, v)) });
    case 'LB': return linebackerGrade({ ...data, coverage: data.coverageScores });
    case 'CB': return defensiveBackGrade({ ...data, tackling: data.cornerRunSupport || data.tackling });
    case 'S': return defensiveBackGrade({ ...data, tackling: data.safetyRunSupport || data.tackling, execution: data.safetyAssignment || data.execution }, { safety: true });
    case 'K': return kickerGrade(data);
    default: return 0;
  }
}
