// The board and the commissioner's goals (GDD §17.4). Before every season
// the commissioner offers three goals scaled to the club's forecast; the
// owner commits to one. Hitting it raises board confidence and funds an
// expanded scouting department for a season; missing it lowers confidence.
// At −1 the owner is on the hot seat; at −2 the board lets them go. Nothing
// else in the game can end a franchise, so a miss is felt and cannot be
// routed around through the cap or the dex.

export const CONFIDENCE_MAX = 2;
export const HOT_SEAT = -1;
export const FIRED = -2;

export function ensureBoard(f) { return (f.board ||= { confidence: 0, goal: null, history: [], scoutBonusYear: null, fired: false }); }

/** Three offers for this season: safe (wins), medium (playoffs or badges), stretch (the title). */
export function goalOffers(f, { expectedWinPct = 0.5, gamesInSeason = 9, gymsThisSeason = 4 } = {}) {
  const exp = expectedWinPct * gamesInSeason;
  // Never more than seven of nine: a contender's "safe" goal must stay easier than the title it is being compared with.
  const safeWins = Math.max(3, Math.min(gamesInSeason - 2, Math.round(exp) + (expectedWinPct >= 0.55 ? 1 : 0)));
  const medium = expectedWinPct >= 0.45
    ? { id: 'playoffs', label: 'Make the playoffs', text: 'Finish in a playoff spot. Standings only, no replays.', weight: 1 }
    : { id: 'badges', label: `Win ${gymsThisSeason >= 4 ? 2 : 1} gym badge${gymsThisSeason >= 4 ? 's' : ''}`, target: gymsThisSeason >= 4 ? 2 : 1, text: 'Take badges off the gym clubs on your schedule.', weight: 1 };
  return [
    { id: 'wins', label: `Win ${safeWins} games`, target: safeWins, text: `The forecast says ${exp.toFixed(1)}. Beat it.`, weight: 1, tier: 'safe' },
    { ...medium, tier: 'medium' },
    { id: 'title', label: 'Win the Beast Bowl', text: 'Everything. Hit this and the board remembers it twice over.', weight: 2, tier: 'stretch' },
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

/**
 * Season over: settle the goal. Returns {met, delta, confidence, status} where
 * status is 'ok' | 'hot_seat' | 'fired'.
 */
export function settleGoal(f, facts) {
  const b = ensureBoard(f); const goal = b.goal;
  if (!goal || goal.year !== f.season.year) return null;
  const met = goalMet(goal, facts);
  const delta = met ? goal.weight : -1;
  b.confidence = Math.max(FIRED, Math.min(CONFIDENCE_MAX, (met ? Math.max(0, b.confidence) : b.confidence) + delta));
  goal.result = met ? 'met' : 'missed';
  b.history.push({ year: goal.year, id: goal.id, label: goal.label, met, confidence: b.confidence });
  if (met) b.scoutBonusYear = f.season.year + 1;
  if (b.confidence <= FIRED) b.fired = true;
  b.goal = null;
  return { met, delta, confidence: b.confidence, status: b.fired ? 'fired' : b.confidence <= HOT_SEAT ? 'hot_seat' : 'ok', goal };
}

export const onHotSeat = (f) => (f.board?.confidence ?? 0) <= HOT_SEAT && !f.board?.fired;
export const isFired = (f) => !!f.board?.fired;
export const scoutBonusActive = (f) => f.board?.scoutBonusYear === f.season?.year;

export function confidenceLabel(c) { return c >= 2 ? 'Secure' : c === 1 ? 'Trusted' : c === 0 ? 'Neutral' : c === -1 ? 'Hot seat' : 'Fired'; }
