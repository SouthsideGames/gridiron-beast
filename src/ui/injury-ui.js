// Injury History on the full-screen Monster Career Profile (GDD §50): four numbers at a glance (career injuries, games missed,
// durability, the injury-history indicator) and a folded, chronological injury log. A record of the past, never a forecast;
// the game's own words (severity and body part), never a diagnosis. Reads only.
import { esc } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { injurySummary, MIN_OPPORTUNITY } from '../franchise/injury-history.js';
import { findMonster } from '../franchise/career-profile.js';
import { t as $t } from '../text/index.js';

const weekText = (r) => (r.po ? `${$t('roster.week_playoffs', { w: r.w })}` : `${$t('roster.week_2', { w: r.w })}`);
const what = (r) => [r.sev, r.type].filter(Boolean).join(' ').replace(/^./, (c) => c.toUpperCase()) || $t('roster.injury');
function entry(r) {
  const how = r.src === 'game' ? (r.vs ? `${$t('roster.in_the_game_against_the', { vs: r.vs })}` : $t('roster.in_a_game')) : r.src === 'practice' ? $t('roster.in_practice') : r.src === 'before' ? $t('roster.already_injured_when_tracking_began') : $t('roster.away_from_a_game');
  const est = r.est ? ` ${$t('roster.expected_out_weeks', { est: r.est, n: r.est })}` : '';
  const missed = `${$t('roster.missed_games', { missed: r.missed || 0, n: r.missed })}${r.mp ? ` ${$t('roster.in_the_playoffs', { mp: r.mp })}` : ''}`;
  const status = r.open ? $t('roster.out_now') : r.back?.off ? $t('roster.recovered_in_the_offseason') : r.back ? `${$t('roster.recovered_back')} ${yearOf(r.back.y) === yearOf(r.y) ? `${$t('roster.week_2', { w: r.back.w })}` : `${$t('roster.week_3', { year: yearOf(r.back.y), w: r.back.w })}`}` : '';
  return `<li class="inj-row ${r.open ? 'open' : ''}"><div class="inj-when">${esc(yearOf(r.y))} · ${esc(weekText(r))}</div><div class="inj-what"><b>${esc(what(r))}</b><span class="dim">${esc(how)}${esc(est)}</span></div><div class="inj-out"><span>${esc(missed)}</span><span class="${r.open ? 'inj-now' : 'dim'}">${esc(status)}</span></div></li>`;
}
/** The section, or '' when the save has no injury record yet (it starts with the first game under v42.3). */
export function careerInjuryHtml(f, id, { firstSeason = null } = {}) {
  const s = injurySummary(f, id, { firstSeason }); const m = findMonster(f, id)?.m; const dur = m?.attributes?.durability;
  if (!s) { // a save from before v42.3.0 that has not played a game on this version yet: tracking starts with the next game (nothing is written by viewing)
    if (!m || !f?.season) return '';
    return `<div class="cp-sec inj-sec"><div class="cp-sec-h">${$t('roster.b_injury_history_b')}<span class="chip inj-ind early">${$t('roster.tracking_starts_next_game')}</span></div>
    <div class="cp-facts inj-facts"><div><b class="mono">—</b><span>${$t('roster.career_injuries')}</span></div><div><b class="mono">—</b><span>${$t('roster.games_missed')}</span></div><div><b class="mono">${Number.isFinite(dur) ? Math.round(dur) : '—'}</b><span>${$t('roster.durability')}</span></div></div>
    <p class="dim inj-note">${$t('roster.injury_history_tracking_starts_with_your', { year: esc(yearOf(f.season.year)), week: f.season.week })}</p></div>`;
  }
  const facts = [[$t('roster.career_injuries'), String(s.incidents)], [$t('roster.games_missed'), String(s.missed)], [$t('roster.durability'), Number.isFinite(dur) ? String(Math.round(dur)) : '—']];
  const ind = `<span class="chip inj-ind ${s.indicator}" title="${esc(s.indicator === 'early' ? $t('roster.classified_after_scheduled_games_on_a', { games: MIN_OPPORTUNITY }) : $t('roster.since_tracking_began_of_scheduled_games', { missed: s.missed, opp: s.opp, incidents: s.incidents, n: s.incidents }))}">${esc(s.label)}</span>`;
  const note = s.note ? `<p class="dim inj-note">${$t('roster.injury_history_tracking_began_in', { year: esc(yearOf(s.note.y)) })}${s.note.w > 1 ? `${$t('roster.week_4', { w: s.note.w })}` : ''}${$t('roster.earlier_seasons_are_not_on_record')}</p>` : '';
  const recs = s.records.slice().reverse(); // newest first
  const log = recs.length ? `<details class="inj-log"${s.current ? ' open' : ''}><summary>${$t('roster.injury_log')} <span class="dim">(${recs.length})</span></summary><ol class="inj-list">${recs.map(entry).join('')}</ol></details>` : `<p class="inj-none">${$t('roster.no_injuries_recorded_since_tracking_began')}</p>`;
  return `<div class="cp-sec inj-sec"><div class="cp-sec-h">${$t('roster.b_injury_history_b_2', { ind })}</div>
    <div class="cp-facts inj-facts">${facts.map(([l, v]) => `<div><b class="mono">${esc(v)}</b><span>${l}</span></div>`).join('')}</div>
    ${note}${log}</div>`;
}
