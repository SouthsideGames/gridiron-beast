// The trade calendar (Task 5, GDD §19.6c, §54.10): ONE place that says when trading is possible. Pure: no imports, no state.
// Regular season (10 weeks):  week 1 closed · weeks 2–8 clubs trade with each other and may call the owner · the DEADLINE is the end of week 8
//                             · weeks 9–10 closed · postseason closed.
// Draft clock and offseason (after the championship until the next season begins): everything is open.
// The owner's own desk is open only on the draft clock and in the offseason (an approved restriction, unchanged); in season the owner
// answers the offers clubs bring. Free agency has its own rules and does not read this file.

/** Trades are processed before the games of weeks 2 through 8. Once week 8 has been played, regular-season trading is over. */
export const FIRST_TRADE_WEEK = 2;
export const TRADE_DEADLINE_WEEK = 8;

/** Is this week of the regular season inside the in-season window (club-to-club deals, calls to the owner)? */
export const seasonTradeWeek = (week) => Number.isFinite(week) && week >= FIRST_TRADE_WEEK && week <= TRADE_DEADLINE_WEEK;

/**
 * Where the calendar stands. `s`: { fired, finished, offseason, draftOpen, playoffs, week }.
 *   desk   — the owner may propose deals now        calls — clubs may bring the owner an offer, and the owner may answer one
 *   aiAi   — clubs may trade with each other        phase — 'offseason' | 'draft' | 'open-season' | 'early' | 'deadline-passed' | 'postseason'
 */
export function tradeWindowState(s) {
  const reopens = 'Trading reopens when the season ends: on the draft clock and through the offseason.';
  const week = s.week || 1;
  const inSeason = !s.finished && !s.playoffs && seasonTradeWeek(week);
  const calls = !s.fired && (!!s.offseason || inSeason);          // a club may call the owner, and the owner may answer
  const aiAi = !s.fired && (!!s.finished || inSeason);            // clubs may trade with each other
  if (s.draftOpen) return { phase: 'draft', desk: true, calls, aiAi, open: true, reason: 'The draft clock is running: trading is open.', next: '' };
  if (s.fired) return { phase: 'closed', desk: false, calls: false, aiAi: false, open: false, reason: 'This franchise is over.', next: '' };
  if (s.finished) return { phase: 'offseason', desk: true, calls, aiAi, open: true, reason: 'The offseason window is open.', next: '' };
  if (s.playoffs) return { phase: 'postseason', desk: false, calls: false, aiAi: false, open: false, reason: 'The postseason has started: trading is closed.', next: reopens };
  if (week > TRADE_DEADLINE_WEEK) return { phase: 'deadline-passed', desk: false, calls: false, aiAi: false, open: false, reason: `The trade deadline (the end of week ${TRADE_DEADLINE_WEEK}) has passed: no offers, no counters and no club-to-club trades.`, next: reopens };
  if (week < FIRST_TRADE_WEEK) return { phase: 'early', desk: false, calls: false, aiAi: false, open: false, reason: `Your desk is closed during the season. Clubs begin to call in week ${FIRST_TRADE_WEEK}; the trade deadline is the end of week ${TRADE_DEADLINE_WEEK}.`, next: reopens };
  const left = TRADE_DEADLINE_WEEK - week + 1;
  return { phase: 'open-season', desk: false, calls, aiAi, open: false, reason: `Your desk is closed during the season, but clubs may still call with offers. The trade deadline is the end of week ${TRADE_DEADLINE_WEEK} (${left} week${left === 1 ? '' : 's'} left, including this one).`, next: reopens };
}
