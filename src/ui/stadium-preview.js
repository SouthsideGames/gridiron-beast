// The stadium card (GDD §33.4): where a game is played, the environment, the weather, and who it helps. Shown on the
// pregame screen and the scouting report, and as the full list under More → Stadiums.

import { ENVIRONMENTS, STADIUMS, WEATHER, stadiumFor } from '../data/stadiums.js';
import { FOOTBALL_TYPE_VALUES, pct } from '../sim/type-matchups.js';
import { TEAM_META } from '../data/league.js';
import { typeChip } from './type-chart.js';
import { esc } from './dom.js';
import { t as $t } from '../text/index.js';

/** Small field swatch in the environment's colours (no SVG ids, safe to repeat on one page). */
export function envSwatch(envId) {
  const P = (ENVIRONMENTS[envId] || ENVIRONMENTS.grass).palette;
  return `<span class="env-swatch" style="background:linear-gradient(180deg, ${P.end} 0 18%, ${P.b} 18% 50%, ${P.c} 50% 82%, ${P.end} 82%)" aria-hidden="true"></span>`;
}
/** Who benefits: the type chip and the bonus, or the neutral line. */
export function envBonusHtml(envId) {
  const env = ENVIRONMENTS[envId] || ENVIRONMENTS.grass;
  return env.type ? `${typeChip(env.type)} monsters <b class="tc-up">${$t('league.b_in_direct_contests_blocks_tackles', { percent: pct(FOOTBALL_TYPE_VALUES.envMatch) })}` : `<span class="dim">${$t('league.neutral_field_no_type_bonus')}</span>`;
}
/**
 * The venue card for one game. `venue` from F.sundayVenue / state.venue; `ctx` = { mineCount, theirsCount } of starters
 * whose type the field favours (optional).
 */
export function venueHtml(venue, ctx = {}) {
  if (!venue) return '';
  const env = ENVIRONMENTS[venue.env] || ENVIRONMENTS.grass; const w = WEATHER[venue.weather] || WEATHER.clear;
  const counts = env.type && ctx.mine != null ? `<div class="dim" style="font-size:12px">${$t('league.your_starters_who_benefit_b_b', { mine: ctx.mine, theirs: ctx.theirs })}</div>` : '';
  return `<div class="panel tight venue-card env-${env.id}">
    <div class="row" style="gap:10px;align-items:center">${envSwatch(env.id)}<div class="grow"><div class="venue-name">${esc(venue.name)}</div><div class="dim" style="font-size:12px">${$t('league.home_of_the', { club: esc(venue.club || venue.home || '') })}</div></div><div class="venue-weather" title="${$t('league.weather')}">${w.icon} ${esc(w.label)}</div></div>
    <div class="venue-env"><b>${env.icon} ${esc(env.name)}</b> <span class="dim">· ${esc(env.blurb)}</span></div>
    ${venue.fieldBy === 'boss' ? `<div class="dim venue-why" style="font-size:12px">${$t('league.gym_leaders_field_every_game_against', { boss: esc(venue.boss) })}${venue.boss !== (venue.club || venue.home) ? `${$t('league.here_at_too', { name: esc(venue.name) })}` : ''}.</div>` : venue.fieldBy === 'boss-unmapped' ? `<div class="dim venue-why" style="font-size:12px">${$t('league.boss_game_the_element_has_no', { boss: esc(venue.boss) })}</div>` : venue.fieldBy === 'draw' ? `<div class="dim venue-why" style="font-size:12px">${$t('league.this_weeks_field_conditions', { id: env.id === 'grass' ? $t('league.ordinary_grass') : '' })}</div>` : venue.fieldBy === 'home' ? `<div class="dim venue-why" style="font-size:12px">${$t('league.the_home_clubs_permanent_field')}</div>` : ''}
    <div class="venue-bonus">${envBonusHtml(env.id)}</div>${counts}
    <div class="dim" style="font-size:11px;margin-top:4px">${$t('league.field_bonuses_are_situational_never_ratings', { indoor: env.indoor ? $t('league.indoors_weather_never_reaches_the_field') : $t('league.weather_is_for_atmosphere_only_it') })}</div>
  </div>`;
}
/** Every club's stadium (More → Stadiums), the owner's own first. */
export function stadiumListHtml(f) {
  const clubs = Object.keys(STADIUMS).sort((a, b) => (a === f?.club ? -1 : b === f?.club ? 1 : a.localeCompare(b)));
  return `<p class="dim">${$t('league.every_club_plays_its_home_games', { percent: pct(FOOTBALL_TYPE_VALUES.envMatch), percent2: pct(FOOTBALL_TYPE_VALUES.positiveCap) })}</p>
    <div class="list">${clubs.map((c) => { const s = stadiumFor(c, f?.stadiums); const env = ENVIRONMENTS[s.env];
      return `<div class="item static ${c === f?.club ? 'me' : ''}">${envSwatch(s.env)}<div class="grow"><div class="name">${esc(s.name)} ${c === f?.club ? `<span class="chip accent">${$t('league.home')}</span>` : ''}</div><div class="sub"><span style="color:${TEAM_META[c]?.color || '#ccc'}">${esc(c)}</span> · ${env.icon} ${esc(env.name)}${env.indoor ? $t('league.indoor') : ''}</div></div><div>${env.type ? typeChip(env.type) : `<span class="dim">${$t('league.neutral')}</span>`}</div></div>`; }).join('')}</div>`;
}
