// The board and the commissioner's goals (GDD §17.4, revised §29). Before every season the commissioner offers three goals
// scaled to the club's forecast; the owner commits to one. Hitting it raises board confidence and funds an expanded scouting
// department for a season; missing it lowers confidence. At −1 the owner is on the hot seat; at −2 the board lets them go.
// Revised 2026-10-22 (owner authorization): the forecast compares the club with the league instead of a fixed number, the safe
// goal sits just under the forecast, a narrow miss on the hot seat is a final warning rather than a dismissal, and three
// missed seasons in a row end the franchise however narrow the misses. Nothing else in the game can end a franchise.

export const CONFIDENCE_MAX = 2;
export const HOT_SEAT = -1;
export const FIRED = -2;

export function ensureBoard(f) { const b = (f.board ||= { confidence: 0, goal: null, history: [], scoutBonusYear: null, fired: false }); if (b.misses == null) b.misses = consecutiveMisses(b.history); return b; }
/** Older saves have no miss counter: count the missed seasons at the end of the history. */
function consecutiveMisses(history = []) { let n = 0; for (let i = history.length - 1; i >= 0 && !history[i].met; i--) n++; return n; }

/**
 * Board tuning (GDD §29). `slope`: forecast win share per point of team overall above this season's league average
 * (calibrated on simulated seasons: 0.0365). `band`: the forecast never goes below or above these shares. `safeBelow`: the safe
 * goal is the rounded forecast minus this many wins, at least `minSafe`. `narrow`: a missed goal within this many wins of what was
 * asked (or a season at or above the forecast) is a narrow miss. `strikes`: missed seasons in a row that end a franchise
 * whatever the margins.
 */
export const BOARD_RULES = Object.freeze({ slope: 0.035, band: [0.15, 0.85], safeBelow: 0, minSafe: 2, narrow: 1, strikes: 3 });

/** The preseason forecast: the club's talent against the league's average talent this season. */
export function boardForecast({ talent, leagueTalent, games = 9 }, R = BOARD_RULES) { const winPct = Math.max(R.band[0], Math.min(R.band[1], 0.5 + ((talent ?? leagueTalent) - leagueTalent) * R.slope));
  return { winPct, wins: winPct * games };
}

/** Three offers for this season: safe (wins), medium (playoffs or badges), stretch (the title). */
export function goalOffers(f, { expectedWinPct = 0.5, gamesInSeason = 9, gymsThisSeason = 4 } = {}, R = BOARD_RULES) {
  const exp = expectedWinPct * gamesInSeason;
  // Just under the forecast, never more than seven of nine (a contender's safe goal stays easier than the title).
  const safeWins = Math.max(R.minSafe, Math.min(gamesInSeason - 2, Math.round(exp) - R.safeBelow));
  // A rebuilding club's medium goal is one badge from a gym on its schedule that it does not hold yet (a badge is won once, so
  // gyms already beaten do not count); with none left to win, the playoffs.
  const medium = expectedWinPct >= 0.45 || gymsThisSeason < 1
    ? { id: 'playoffs', label: 'Make the playoffs', text: 'Finish in a playoff spot. Standings only, no replays.', weight: 1 }
    : { id: 'badges', label: 'Win a gym badge', target: 1, text: `Take a badge off one of the ${gymsThisSeason} gym club${gymsThisSeason === 1 ? '' : 's'} on your schedule whose badge you do not hold.`, weight: 1 };
  return [
    { id: 'wins', label: `Win ${safeWins} games`, target: safeWins, forecastWins: +exp.toFixed(1), text: `The forecast says ${exp.toFixed(1)}. Match it.`, weight: 1, tier: 'safe' },
    { ...medium, forecastWins: +exp.toFixed(1), tier: 'medium' },
    { id: 'title', label: 'Win the Beast Bowl', forecastWins: +exp.toFixed(1), text: 'Everything. Hit this and the board remembers it twice over.', weight: 2, tier: 'stretch' },
  ];
}

export function needsGoal(f) { const b = ensureBoard(f); return !b.fired && !b.goal && f.season && f.season.week === 1 && !f.season.finished; }

export function chooseGoal(f, id, offers) {
  const b = ensureBoard(f); if (b.goal && b.goal.year === f.season.year) return { ok: false, reason: 'Goal already set this season.' };
  const o = offers.find((x) => x.id === id); if (!o) return { ok: false, reason: 'Unknown goal.' };
  b.goal = { ...o, year: f.season.year, result: null };
  return { ok: true, goal: b.goal };
}

/** Did the committed goal happen? Pure on the season facts. */
export function goalMet(goal, { wins, playoffs, badgesWon, champion }) {
  if (!goal) return null;
  if (champion) return true; // a Beast Bowl meets whatever the board asked for; the champion is never fired
  if (goal.id === 'wins') return wins >= goal.target;
  if (goal.id === 'playoffs') return !!playoffs;
  if (goal.id === 'badges') return badgesWon >= goal.target;
  if (goal.id === 'title') return !!champion;
  return null;
}

/** How a missed goal is judged: 'narrow' (within `narrow` wins of a wins goal, or a season at or above the forecast) or 'clear'. */
export function missKind(goal, { wins, forecastWins = null }, R = BOARD_RULES) {
  if (goal.id === 'wins' && wins >= goal.target - R.narrow) return 'narrow';
  const fc = forecastWins ?? goal.forecastWins; if (fc != null && wins >= Math.round(fc)) return 'narrow';
  return 'clear';
}
/**
 * Settle one season on a board record `b` ({ confidence, misses }). Pure on its inputs; used by settleGoal and the study tools.
 * Met: +weight (+2 for the title), any deficit lifted to 0 first. Missed: −1. Dismissal at −2, except that a narrow miss
 * holds the owner on the hot seat (a final warning). Three missed seasons in a row end the franchise however narrow.
 * Returns { met, miss, delta, confidence, fired, reason }.
 */
export function settleConfidence(b, goal, facts, R = BOARD_RULES) {
  const met = goalMet(goal, facts);
  b.misses = met ? 0 : (b.misses || 0) + 1;
  const miss = met ? null : missKind(goal, facts, R);
  let next = met ? Math.max(0, b.confidence) + goal.weight : b.confidence - 1;
  next = Math.max(FIRED, Math.min(CONFIDENCE_MAX, next));
  let fired = false, reason = null;
  if (!met && b.misses >= R.strikes) { fired = true; reason = `${R.strikes} missed seasons in a row`; next = FIRED; }
  else if (next <= FIRED) { if (miss === 'narrow') { next = HOT_SEAT; reason = 'narrow miss on the hot seat: final warning'; } else { fired = true; reason = 'a clear miss on the hot seat'; } }
  const delta = next - b.confidence; b.confidence = next;
  return { met, miss, delta, confidence: next, fired, reason };
}
/**
 * Season over: settle the goal. Returns {met, miss, delta, confidence, status, reason} where status is 'ok' | 'hot_seat' |
 * 'warning' (a narrow miss that would have been a dismissal) | 'fired'.
 */
export function settleGoal(f, facts) {
  const b = ensureBoard(f); const goal = b.goal;
  if (!goal || goal.year !== f.season.year) return null;
  const v = settleConfidence(b, goal, facts);
  goal.result = v.met ? 'met' : 'missed';
  b.history.push({ year: goal.year, id: goal.id, label: goal.label, met: v.met, miss: v.miss, wins: facts.wins, forecast: goal.forecastWins ?? null, confidence: b.confidence, reason: v.reason });
  if (v.met) b.scoutBonusYear = f.season.year + 1;
  if (v.fired) b.fired = true;
  b.goal = null;
  return { ...v, status: b.fired ? 'fired' : v.reason && v.reason.startsWith('narrow') ? 'warning' : b.confidence <= HOT_SEAT ? 'hot_seat' : 'ok', goal };
}

export const onHotSeat = (f) => (f.board?.confidence ?? 0) <= HOT_SEAT && !f.board?.fired;
export const isFired = (f) => !!f.board?.fired;
export const scoutBonusActive = (f) => f.board?.scoutBonusYear === f.season?.year;

export function confidenceLabel(c) { return c >= 2 ? 'Secure' : c === 1 ? 'Trusted' : c === 0 ? 'Neutral' : c === -1 ? 'Hot seat' : 'Fired'; }
