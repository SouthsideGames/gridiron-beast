// The stadium card (GDD §33.4): where a game is played, the environment, the weather, and who it helps. Shown on the
// pregame screen and the scouting report, and as the full list under More → Stadiums.

import { ENVIRONMENTS, STADIUMS, WEATHER, stadiumFor } from '../data/stadiums.js';
import { FOOTBALL_TYPE_VALUES, pct } from '../sim/type-matchups.js';
import { TEAM_META } from '../data/league.js';
import { typeChip } from './type-chart.js';
import { esc } from './dom.js';

/** Small field swatch in the environment's colours (no SVG ids, safe to repeat on one page). */
export function envSwatch(envId) {
  const P = (ENVIRONMENTS[envId] || ENVIRONMENTS.grass).palette;
  return `<span class="env-swatch" style="background:linear-gradient(180deg, ${P.end} 0 18%, ${P.b} 18% 50%, ${P.c} 50% 82%, ${P.end} 82%)" aria-hidden="true"></span>`;
}
/** Who benefits: the type chip and the bonus, or the neutral line. */
export function envBonusHtml(envId) {
  const env = ENVIRONMENTS[envId] || ENVIRONMENTS.grass;
  return env.type ? `${typeChip(env.type)} monsters <b class="tc-up">${pct(FOOTBALL_TYPE_VALUES.envMatch)}</b> in direct contests (blocks, tackles, coverage, contested catches), on both teams` : '<span class="dim">Neutral field: no type bonus.</span>';
}
/**
 * The venue card for one game. `venue` from F.sundayVenue / state.venue; `ctx` = { mineCount, theirsCount } of starters
 * whose type the field favours (optional).
 */
export function venueHtml(venue, ctx = {}) {
  if (!venue) return '';
  const env = ENVIRONMENTS[venue.env] || ENVIRONMENTS.grass; const w = WEATHER[venue.weather] || WEATHER.clear;
  const counts = env.type && ctx.mine != null ? `<div class="dim" style="font-size:12px">Your starters who benefit: <b>${ctx.mine}</b> · theirs: <b>${ctx.theirs}</b></div>` : '';
  return `<div class="panel tight venue-card env-${env.id}">
    <div class="row" style="gap:10px;align-items:center">${envSwatch(env.id)}<div class="grow"><div class="venue-name">${esc(venue.name)}</div><div class="dim" style="font-size:12px">Home of the ${esc(venue.club || venue.home || '')}</div></div><div class="venue-weather" title="Weather">${w.icon} ${esc(w.label)}</div></div>
    <div class="venue-env"><b>${env.icon} ${esc(env.name)}</b> <span class="dim">· ${esc(env.blurb)}</span></div>
    <div class="venue-bonus">${envBonusHtml(env.id)}</div>${counts}
    <div class="dim" style="font-size:11px;margin-top:4px">${env.indoor ? 'Indoors: weather never reaches the field.' : 'Weather is for atmosphere only: it changes no result.'} Field bonuses are situational, never ratings.</div>
  </div>`;
}
/** Every club's stadium (More → Stadiums), the owner's own first. */
export function stadiumListHtml(f) {
  const clubs = Object.keys(STADIUMS).sort((a, b) => (a === f?.club ? -1 : b === f?.club ? 1 : a.localeCompare(b)));
  return `<p class="dim">Every club plays its home games in its own stadium. The field's environment gives monsters of its type ${pct(FOOTBALL_TYPE_VALUES.envMatch)} in direct contests, whichever team they play for; with a type advantage the total is capped at ${pct(FOOTBALL_TYPE_VALUES.positiveCap)}.</p>
    <div class="list">${clubs.map((c) => { const s = stadiumFor(c, f?.stadiums); const env = ENVIRONMENTS[s.env];
      return `<div class="item static ${c === f?.club ? 'me' : ''}">${envSwatch(s.env)}<div class="grow"><div class="name">${esc(s.name)} ${c === f?.club ? '<span class="chip accent">HOME</span>' : ''}</div><div class="sub"><span style="color:${TEAM_META[c]?.color || '#ccc'}">${esc(c)}</span> · ${env.icon} ${esc(env.name)}${env.indoor ? ' · indoor' : ''}</div></div><div>${env.type ? typeChip(env.type) : '<span class="dim">Neutral</span>'}</div></div>`; }).join('')}</div>`;
}
