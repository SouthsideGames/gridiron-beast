// Beast Clash load: fatigue projections, battle load, injury chances and the warning model.
// Pure calculators on numbers (P1 formula); they never read or write a franchise. The Load screen
// shows them with synthetic inputs so the wording and levels can be reviewed before Phase 2b.
// Imports only values.
import { CLASH_VALUES } from './values.js';

const L = CLASH_VALUES.load;
const clampF = (f) => Math.round(Math.max(0, Math.min(100, f))); // whole points, like the approved table

/** Sunday injury chance at kickoff fatigue F (0-100) and durability (0-1). */
export function sundayInjury(F, durability) { return L.sundayInjury.base + L.sundayInjury.perFatigue * F / 100 + L.sundayInjury.perDurability * (1 - durability); }
/** One Arena battle's own injury chance at fatigue F. */
export function battleInjury(F) { return L.battleInjury.base + L.battleInjury.perFatigue * F / 100; }
/** Saturday recovery at fatigue F. */
export function saturdayRecovery(F) { return L.saturdayBase + L.saturdayExtra * Math.max(0, F - L.saturdayBase); }
export function warningLevel(kickoffFatigue) { return kickoffFatigue >= L.warning.high ? 'high' : kickoffFatigue >= L.warning.caution ? 'caution' : 'calm'; }

/**
 * One week's fatigue checkpoints from a Monday starting fatigue.
 * week: { battles, plays (Sunday starter), opening, overtime, bye, injured }
 * Returns { monday, afterArena, afterPractice, afterSaturday, kickoff, afterSunday, battleInjuryTotal }
 */
export function projectWeek(start, week) {
  let f = clampF(start - L.monday); const r = { monday: f }; let inj = 0;
  if (!week.injured) for (let b = 0; b < (week.battles || 0); b++) { inj += battleInjury(f); f = clampF(f + L.battle); }
  r.afterArena = f; r.battleInjuryTotal = inj;
  if (!week.injured) f = clampF(f + L.practice); r.afterPractice = f;
  if (week.bye) { f = clampF(f - L.bye); r.afterSaturday = null; r.kickoff = null; r.afterSunday = f; return r; }
  f = clampF(f - saturdayRecovery(f)); r.afterSaturday = f;
  if (week.opening && !week.injured) f = clampF(f + L.opening); r.kickoff = f;
  if (week.plays && !week.injured) f = clampF(f + L.game);
  if (week.overtime && !week.injured) f = clampF(f + L.overtime); r.afterSunday = f;
  return r;
}

/** Ten-week projection for a profile; each row is projectWeek() from the previous Sunday. */
export function projectSeason(profile, weeks = 10) {
  const rows = []; let f = 0;
  for (let w = 1; w <= weeks; w++) {
    const week = { ...profile, bye: w === (profile.byeWeek ?? 6), injured: profile.injuredWeeks?.includes(w) };
    const r = projectWeek(f, week); rows.push({ week: w, ...week, ...r }); f = r.afterSunday;
  }
  return rows;
}

/**
 * The warning shown before the next Arena battle. Inputs: fatigue now (after any battles already played this
 * Tuesday), battles already played, whether this monster starts Sunday, its durability (0-1).
 * Returns the numbers the Arena will state, with and without this battle, and the level.
 */
export function battleWarning({ fatigue, battlesPlayed = 0, plays = true, durability = 0.6, opening = false }) {
  const after = (n) => projectWeek(fatigue + L.monday, { battles: n, plays, opening }); // projectWeek subtracts Monday; start is already past it
  const without = after(0), withIt = after(1);
  const kickoffWithout = without.kickoff, kickoffWith = withIt.kickoff;
  const level = warningLevel(kickoffWith);
  return {
    allowed: battlesPlayed < L.maxBattles, battlesPlayed, maxBattles: L.maxBattles,
    kickoffWithout, kickoffWith, level,
    sundayInjuryWithout: sundayInjury(kickoffWithout, durability), sundayInjuryWith: sundayInjury(kickoffWith, durability),
    thisBattleInjury: battleInjury(fatigue),
    confirm: level === 'high',
    text: level === 'high'
      ? `High load: kickoff fatigue would be ${kickoffWith} (${kickoffWithout} without this battle). Sunday injury chance ${pct(sundayInjury(kickoffWith, durability))}, this battle ${pct(battleInjury(fatigue))}. Play anyway?`
      : level === 'caution' ? `Caution: kickoff fatigue would be ${kickoffWith}. Sunday injury chance ${pct(sundayInjury(kickoffWith, durability))}.`
      : `Fresh: kickoff fatigue would be ${kickoffWith}.`,
  };
}
const pct = (p) => `${(p * 100).toFixed(1)}%`;
