// The trade calendar (Task 5, GDD §19.6c, §54.10; Task 10 owner 2026-11-13): ONE place that says when trading is possible. Pure.
// Regular season (10 weeks):  weeks 1–7 the owner may propose deals, clubs trade with each other and may call the owner ·
//                             trading CLOSES when week 8 begins · weeks 8–10 closed · postseason closed.
// Draft clock and offseason (after the championship until the next season begins): everything is open.
// Free agency has its own rules and does not read this file.
import { t as $t } from '../text/index.js';

/** Trades are processed before the games of weeks 1 through 7. When week 8 begins, regular-season trading is over. */
export const FIRST_TRADE_WEEK = 1;
export const TRADE_DEADLINE_WEEK = 7; // the last week in which trading is open
export const TRADE_CLOSES_WEEK = TRADE_DEADLINE_WEEK + 1; // trading closes when this week begins

/** Is this week of the regular season inside the in-season window (club-to-club deals, calls to the owner)? */
export const seasonTradeWeek = (week) => Number.isFinite(week) && week >= FIRST_TRADE_WEEK && week <= TRADE_DEADLINE_WEEK;

/**
 * Where the calendar stands. `s`: { fired, finished, offseason, draftOpen, playoffs, week }.
 *   desk   — the owner may propose deals now        calls — clubs may bring the owner an offer, and the owner may answer one
 *   aiAi   — clubs may trade with each other        phase — 'offseason' | 'draft' | 'open-season' | 'early' | 'deadline-passed' | 'postseason'
 */
export function tradeWindowState(s) {
  const reopens = $t('franchise.trading_reopens_when_the_season_ends');
  const week = s.week || 1;
  const inSeason = !s.finished && !s.playoffs && seasonTradeWeek(week);
  const calls = !s.fired && (!!s.offseason || inSeason);          // a club may call the owner, and the owner may answer
  const aiAi = !s.fired && (!!s.finished || inSeason);            // clubs may trade with each other
  if (s.draftOpen) return { phase: 'draft', desk: true, calls, aiAi, open: true, reason: $t('franchise.the_draft_clock_is_running_trading'), next: '' };
  if (s.fired) return { phase: 'closed', desk: false, calls: false, aiAi: false, open: false, reason: $t('franchise.this_franchise_is_over'), next: '' };
  if (s.finished) return { phase: 'offseason', desk: true, calls, aiAi, open: true, reason: $t('franchise.the_offseason_window_is_open'), next: '' };
  if (s.playoffs) return { phase: 'postseason', desk: false, calls: false, aiAi: false, open: false, reason: $t('franchise.the_postseason_has_started_trading_is'), next: reopens };
  if (week > TRADE_DEADLINE_WEEK) return { phase: 'deadline-passed', desk: false, calls: false, aiAi: false, open: false, reason: `${$t('franchise.the_trade_deadline_the_end_of', { closesWeek: TRADE_CLOSES_WEEK })}`, next: reopens };
  if (week < FIRST_TRADE_WEEK) return { phase: 'early', desk: false, calls: false, aiAi: false, open: false, reason: `${$t('franchise.your_desk_is_closed_during_the', { firstTradeWeek: FIRST_TRADE_WEEK, closesWeek: TRADE_CLOSES_WEEK })}`, next: reopens };
  const left = TRADE_DEADLINE_WEEK - week + 1;
  return { phase: 'open-season', desk: true, calls, aiAi, open: true, reason: `${$t('franchise.trading_is_open_you_can_propose', { closesWeek: TRADE_CLOSES_WEEK, left, n: left })}`, next: reopens };
}
