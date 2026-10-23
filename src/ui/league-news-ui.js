// League News on the HQ screen and in its full sheet (GDD §39): the latest week's headlines and scoreboard on HQ, every
// week kept in the sheet. The owner's own notices sit underneath in a folded club log.

import { newsByWeek, weekLabel } from '../franchise/league-news.js';
import { TEAM_META } from '../data/league.js';
import { yearOf } from '../data/calendar.js';
import { esc } from './dom.js';

const abbr = (t) => TEAM_META[t]?.abbr || String(t).slice(0, 3).toUpperCase();
const color = (t) => TEAM_META[t]?.color || 'var(--ink-2)';

function teamRow(team, score, won) {
  return `<div class="ln-team ${won ? 'won' : ''}"><span class="ln-dot" style="background:${color(team)}"></span><span class="ln-abbr" title="${esc(team)}">${esc(abbr(team))}</span><span class="ln-score mono">${score}</span></div>`;
}
/** A compact scoreboard: one tile per game, away over home, the winner bold; your game and the rival's are marked. */
export function scoreboardHtml(item) {
  return `<div class="ln-board">${item.games.map((g) => `<div class="ln-game ${g.mine ? 'mine' : ''} ${g.rival && !g.mine ? 'rival' : ''}" aria-label="${esc(`${g.away} ${g.as}, ${g.home} ${g.hs}`)}">
    ${teamRow(g.away, g.as, g.w === g.away)}${teamRow(g.home, g.hs, g.w === g.home)}
    ${g.mine || g.rival || g.ot ? `<div class="ln-tag">${g.mine ? 'YOU' : g.rival ? 'RIVAL' : ''}${g.ot ? `${g.mine || g.rival ? ' · ' : ''}${g.clash ? 'OT · Clash' : 'OT'}` : ''}</div>` : ''}</div>`).join('')}</div>`;
}
function raceHtml(item, n = 7) {
  return `<div class="ln-race">${item.leaders.slice(0, n).map((l) => `<div class="ln-race-row"><b class="ln-award">${esc(l.short)}</b><span class="grow">${esc(l.name)} <span class="dim">${esc(abbr(l.team))}</span></span>${l.second ? `<span class="dim ln-second">2nd ${esc(l.second)}</span>` : ''}</div>`).join('')}</div>`;
}
function headlineHtml(it, f) {
  const rival = f.rivals?.[f.tier]?.team; let t = esc(it.text);
  // Your club in bold, the rival in its colour: the same marks the club log uses.
  if (f.club) t = t.split(esc(f.club)).join(`<b>${esc(f.club)}</b>`);
  if (rival) t = t.split(esc(rival)).join(`<b class="rival-name">${esc(rival)}</b>`);
  return `<li class="ln-head ${esc(it.tier)} k-${esc(it.kind)}"><span class="ln-icon" aria-hidden="true">${it.icon}</span><span>${t}</span></li>`;
}
/** One week: headlines (major first), then the race and the scoreboard. `max` caps the headlines (HQ shows fewer). */
export function weekHtml(group, f, { max = 99, race = true, board = true, raceRows = 7 } = {}) {
  const heads = group.items.filter((x) => !['scores', 'race'].includes(x.kind));
  const order = { major: 0, notable: 1, info: 2 }; const sorted = heads.slice().sort((a, b) => order[a.tier] - order[b.tier]);
  const shown = sorted.slice(0, max); const more = sorted.length - shown.length;
  const scores = group.items.filter((x) => x.kind === 'scores'); const rc = group.items.find((x) => x.kind === 'race');
  return `${shown.length ? `<ul class="ln-heads">${shown.map((h) => headlineHtml(h, f)).join('')}</ul>${more > 0 ? `<div class="dim" style="font-size:12px;margin:2px 0 6px">+${more} more in All league news</div>` : ''}` : ''}
    ${board ? scores.map((s) => `${scores.length > 1 || s.round ? `<div class="ln-sub">${esc(s.text)}</div>` : ''}${scoreboardHtml(s)}`).join('') : ''}
    ${race && rc ? `<div class="ln-sub">Award races</div>${raceHtml(rc, raceRows)}` : ''}`;
}
const groupTitle = (g) => `${weekLabel(g.week)} · ${yearOf(g.year)}`;

/** The HQ panel: the latest week, a button to every week, then the club log folded underneath. */
export function leagueNewsPanel(f, { clubLog = [] } = {}) {
  const weeks = newsByWeek(f.leagueNews || []); const latest = weeks[0];
  const club = clubLog.slice(0, 10);
  return `<div class="panel league-news"><div class="row between"><h3 style="margin:0">League News</h3>${latest ? `<span class="dim">${esc(groupTitle(latest))}</span>` : ''}</div>
    ${latest ? weekHtml(latest, f, { max: 4, raceRows: 3 }) : '<p class="dim" style="margin:6px 0 0">Scores, upsets, award races and records from around the league appear here after each week\'s games.</p>'}
    ${weeks.length ? `<button class="btn block small" data-action="leaguenews" style="margin-top:8px">All league news</button>` : ''}
    <details class="clublog"><summary>Club notes${club.length ? ` <span class="dim">(${club.length})</span>` : ''}</summary>
      <ul class="news" style="padding-left:18px;margin:6px 0 0">${club.map((n) => `<li class="${esc(n.kind)}">${clubText(f, n.text)}</li>`).join('') || '<li class="dim">Nothing yet.</li>'}</ul></details></div>`;
}
/** Every week kept, newest first. */
export function leagueNewsSheetHtml(f) {
  const weeks = newsByWeek(f.leagueNews || []);
  if (!weeks.length) return '<p class="dim">No league news yet: it starts after the first week\'s games.</p>';
  return weeks.map((g) => `<section class="ln-week"><div class="ln-week-head">${esc(groupTitle(g))}</div>${weekHtml(g, f)}</section>`).join('');
}
function clubText(f, text) {
  const rival = f.rivals?.[f.tier]?.team; const safe = esc(text);
  return rival ? safe.split(esc(rival)).join(`<b class="rival-name">${esc(rival)}</b>`) : safe;
}
