// The league before the owner arrived, as the history screens show it (the pre-franchise archive, franchise/preleague-history.js).
// Read-only: every panel is built from the archive and says plainly that these seasons were played before the franchise began.
// A live monster's name opens his career page; a retired legend exists only in the archive, so his name opens a sheet here.

import { esc } from './dom.js';
import { yearOf } from '../data/calendar.js';
import { TEAM_META, DIVISIONS, conferenceFor } from '../data/league.js';
import { POSITION_NAME } from '../data/stat-guide.js';
import { monsterSprite } from './pixel-monster.js';
import { careerLink } from './career-ui.js';
import { AWARDS } from '../franchise/awards.js';
import { POSITION_COLUMNS, statLine } from '../franchise/stats.js';
import { statCell } from '../franchise/career-page.js';
import { leagueArchive, archiveLegends, archiveAwardsFor, careerTotals, ARCHIVE_AWARDS } from '../franchise/preleague-history.js';
import { careerProfile } from '../franchise/career-profile.js';
import { fieldText, t as $t } from '../text/index.js';

const clubColor = (c) => TEAM_META[c]?.color || '#9fb8ad';
const abbr = (c) => TEAM_META[c]?.abbr || '—';
const posName = (p) => POSITION_NAME?.[p] || p || '';
const sprite = (m, size) => (m?.species ? monsterSprite({ id: m.id, name: m.name, species: m.species, stage: m.stage || 0 }, size) : `<span class="hh-nosprite" style="width:${size}px;height:${size}px" aria-hidden="true">?</span>`);
const span = (from, to) => (from === to ? String(yearOf(from)) : `${yearOf(from)}–${yearOf(to)}`);

/**
 * A monster's name in a history list. While the save can still show his career (he is on a roster, in a pool, a retired stub or
 * a Hall candidate) it opens his career page. A retired legend, or a veteran who has since left the league without a trace
 * (released on draft day, for one), lives only in the archive: his name opens his archived career in a sheet. Never a dead link.
 */
export function archiveName(f, id, name) {
  if (id == null) return esc(name || '');
  const archived = leagueArchive(f)?.careers?.[String(id)];
  if (archived && (archived.retired || !careerProfile(f, id))) return `<button class="career-link" data-action="pl-legend" data-id="${esc(id)}">${esc(name || '')}</button>`;
  return careerLink(id, name);
}
export const hasArchive = (f) => !!leagueArchive(f);
/** "before 1201": the year the owner's first season is played in. */
export const firstYearLabel = () => String(yearOf(1));

// ---------------------------------------------------------------- one past season
function standingsHtml(f, s) {
  const row = Object.fromEntries(s.standings.map((r) => [r.club, r]));
  const seed = (club) => { for (const conf of Object.keys(s.seeds || {})) { const i = s.seeds[conf].indexOf(club); if (i >= 0) return i + 1; } return 0; };
  const table = (division) => `<div class="pl-div"><div class="pl-div-h"><b>${esc(division)}</b><span class="dim">${esc(conferenceFor(division))}</span></div>
      <table class="pl-table"><thead><tr><th class="pl-club">${$t('history.pre_club')}</th><th>${$t('history.pre_w_l')}</th><th>${$t('history.pre_pf')}</th><th>${$t('history.pre_pa')}</th></tr></thead><tbody>
      ${(s.divisions?.[division] || DIVISIONS[division]).map((club) => { const r = row[club]; const sd = seed(club); return `<tr class="${club === f.club ? 'pl-own' : ''}"><td class="pl-club"><span class="cp-dot" style="--club:${clubColor(club)}"></span><span class="pl-name">${esc(club)}</span>${sd ? `<span class="pl-seed" title="${$t('history.pre_seed', { seed: sd })}">${sd}</span>` : ''}${club === s.champion ? ' <span aria-hidden="true">🏆</span>' : ''}</td><td class="mono">${r.w}-${r.l}</td><td class="mono">${r.pf}</td><td class="mono">${r.pa}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  return `<div class="pl-standings">${Object.keys(DIVISIONS).map(table).join('')}</div><p class="dim pl-note">${$t('history.pre_seed_note')}</p>`;
}
function bracketHtml(s) {
  const game = (g) => { const loser = g.winner === g.home ? g.away : g.home; const ws = Math.max(g.homeScore, g.awayScore), ls = Math.min(g.homeScore, g.awayScore);
    return `<li><span class="cp-dot" style="--club:${clubColor(g.winner)}"></span><b>${esc(g.winner)}</b> <span class="mono">${ws}–${ls}</span> <span class="dim">${$t('history.pre_over', { loser: esc(loser) })}</span></li>`; };
  const rounds = [[1, $t('history.pre_conference_semifinals')], [2, $t('history.pre_conference_championships')], [3, $t('history.pre_beast_bowl')]];
  return `<div class="pl-bracket">${rounds.map(([r, label]) => `<div class="pl-round"><div class="pl-round-h">${label}</div><ul>${s.playoffs.filter((g) => g.round === r).map(game).join('')}</ul></div>`).join('')}</div>`;
}
function awardsRowHtml(f, s) {
  return `<div class="list pl-awards">${ARCHIVE_AWARDS.map((k) => { const w = s.awards?.league?.[k]; if (!w) return ''; const why = fieldText(w, 'why');
    return `<div class="item static">${sprite(w, 32)}<div class="grow"><div class="name">${esc(AWARDS[k].short)} · ${archiveName(f, w.id, w.name)}</div><div class="sub">${esc(w.team || '')}${w.position ? ` · ${esc(w.position)}` : ''}${w.record ? ` · ${esc(w.record)}` : ''}${why ? ` · ${esc(why)}` : ''}</div></div></div>`; }).join('')}</div>`;
}
function seasonHtml(f, s, open) {
  const champ = s.standings.find((r) => r.club === s.champion); const fin = s.playoffs.find((g) => g.round === 3);
  const score = fin ? `${Math.max(fin.homeScore, fin.awayScore)}–${Math.min(fin.homeScore, fin.awayScore)}` : '';
  return `<details class="pl-fold" data-pre="${s.year}" ${open ? 'open' : ''}><summary><b class="mono">${yearOf(s.year)}</b><span class="dim">🏆 ${esc(s.champion)}${champ ? ` (${champ.w}-${champ.l})` : ''}</span></summary>
    <div class="pl-season">
      <p class="pl-final"><span class="cp-dot" style="--club:${clubColor(s.champion)}"></span>${$t('history.pre_final_line', { champion: esc(s.champion), score, runnerUp: esc(s.runnerUp) })}</p>
      <div class="cp-sec-h"><b>${$t('history.pre_awards')}</b></div>${awardsRowHtml(f, s)}
      <div class="cp-sec-h"><b>${$t('history.pre_playoffs')}</b></div>${bracketHtml(s)}
      <div class="cp-sec-h"><b>${$t('history.pre_standings')}</b><span class="dim">${$t('history.pre_nine_games')}</span></div>${standingsHtml(f, s)}
    </div></details>`;
}

// ---------------------------------------------------------------- legends
const legendHonours = (l) => [l.titles.length ? `🏆 ${l.titles.length > 1 ? `${l.titles.length}× ` : ''}${$t('history.pre_champion')}` : '', ...ARCHIVE_AWARDS.map((k) => { const n = l.awards.filter((a) => a.award === k).length; return n ? `${n > 1 ? `${n}× ` : ''}${AWARDS[k].short}` : ''; })].filter(Boolean);
function legendRowHtml(l) {
  const honours = legendHonours(l);
  return `<button class="item pl-legend" data-action="pl-legend" data-id="${esc(l.id)}">${sprite(l, 36)}<div class="grow"><div class="name">${esc(l.name)} <span class="dim">· ${esc(posName(l.position))}</span></div>
    <div class="sub">${esc(l.club)} · ${span(l.debut, l.retiredYear)} · ${$t('history.pre_games', { n: l.totals.reg.games || 0 })}</div>
    <div class="sub">${esc(statLine(l.totals.reg))}</div>${honours.length ? `<div class="hh-wrap pl-hon">${honours.map((h) => `<span class="chip">${esc(h)}</span>`).join('')}</div>` : ''}</div><span class="dim" aria-hidden="true">›</span></button>`;
}
export function legendsListHtml(f) {
  const legends = archiveLegends(f); if (!legends.length) return '';
  return `<div class="list">${legends.map(legendRowHtml).join('')}</div>`;
}
/** An archived career for a sheet (a retired legend, or a veteran no longer in the league): season by season, his position's own columns. */
export function legendSheetHtml(f, id) {
  const c = leagueArchive(f)?.careers?.[String(id)]; if (!c) return null;
  const totals = careerTotals(c); const yearsPlayed = c.seasons.map((b) => b.year); const champions = new Map(leagueArchive(f).seasons.map((s) => [s.year, s.champion]));
  const l = { ...c, totals, awards: archiveAwardsFor(f, c.id), titles: c.seasons.filter((b) => champions.get(b.year) === b.team).map((b) => b.year), seasons: c.seasons.length, last: yearsPlayed[yearsPlayed.length - 1] };
  const cols = POSITION_COLUMNS[l.position] || POSITION_COLUMNS.WR; const honours = legendHonours(l);
  const table = (bucket, total) => `<div class="stat-table cp-stat-table"><table><thead><tr><th class="cp-yr">${$t('career.season')}</th><th class="cp-tm">${$t('career.team')}</th>${cols.map(([, label]) => `<th>${esc(label)}</th>`).join('')}</tr></thead><tbody>
    ${c.seasons.filter((b) => (b[bucket]?.games || 0) > 0).map((b) => `<tr><td class="cp-yr">${yearOf(b.year)}</td><td class="cp-tm"><span class="cp-dot" style="--club:${clubColor(b.team)}"></span>${esc(abbr(b.team))}</td>${cols.map(([k]) => `<td>${statCell(b[bucket], k)}</td>`).join('')}</tr>`).join('')}
    <tr class="cp-total"><td class="cp-yr">${$t('career.career')}</td><td class="cp-tm"></td>${cols.map(([k]) => `<td>${statCell(total, k)}</td>`).join('')}</tr></tbody></table></div>`;
  return { title: l.name, html: `<div class="pl-legend-sheet">
    <div class="row" style="gap:12px;align-items:center">${sprite(l, 56)}<div class="grow"><div style="font-weight:800;font-size:17px">${esc(l.name)}</div><div class="dim">${esc(posName(l.position))} · ${esc(l.club)}</div><div class="dim">${$t('history.pre_legend_span', { from: yearOf(l.debut), to: yearOf(l.last), n: l.seasons })}</div></div></div>
    ${honours.length ? `<div class="hh-wrap pl-hon" style="margin-top:8px">${honours.map((h) => `<span class="chip">${esc(h)}</span>`).join('')}</div>` : ''}
    <p class="dim pl-note">${c.retired ? $t('history.pre_legend_note', { year: firstYearLabel() }) : $t('history.pre_gone_note', { year: firstYearLabel() })}</p>
    <div class="cp-sec-h"><b>${$t('career.regular_season')}</b><span class="dim">${$t('history.pre_games', { n: totals.reg.games || 0 })}</span></div>${table('reg', totals.reg)}
    ${(totals.post.games || 0) > 0 ? `<div class="cp-sec-h" style="margin-top:10px"><b>${$t('career.playoffs')}</b><span class="dim">${$t('history.pre_games', { n: totals.post.games })}</span></div>${table('post', totals.post)}` : ''}
  </div>` };
}

// ---------------------------------------------------------------- the panels
/** Franchise History: the league before year 1. `openYear` keeps a season unfolded across a re-render. */
export function preLeagueHistoryHtml(f, { openYear = null } = {}) {
  const a = leagueArchive(f); if (!a) return '';
  const seasons = a.seasons.slice().reverse();
  const titles = new Map(); for (const s of a.seasons) titles.set(s.champion, (titles.get(s.champion) || 0) + 1);
  const most = [...titles.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
  const own = a.seasons[a.seasons.length - 1].standings.find((r) => r.club === f.club);
  return `<div class="panel pl-panel"><div class="cp-sec-h"><b>${$t('history.pre_title')}</b><span class="dim">${span(a.from, a.to)}</span></div>
    <p class="dim pl-note">${$t('history.pre_intro', { year: firstYearLabel() })}${own ? ` ${$t('history.pre_own_last', { club: esc(f.club), record: `${own.w}-${own.l}`, year: yearOf(0) })}` : ''}</p>
    <div class="hh-champs">${seasons.map((s) => `<span class="hh-champ" style="--club:${clubColor(s.champion)}"><b class="mono">${yearOf(s.year)}</b><span class="cp-dot" style="--club:${clubColor(s.champion)}"></span><span>${esc(s.champion)}</span></span>`).join('')}</div>
    ${most && most[1] > 1 ? `<p class="dim pl-note">${$t('history.pre_most_titles', { club: esc(most[0]), n: most[1] })}</p>` : ''}
    <h4 class="pl-h">${$t('history.pre_seasons')}</h4>${seasons.map((s) => seasonHtml(f, s, openYear === s.year)).join('')}
    <h4 class="pl-h">${$t('history.pre_legends')}</h4><p class="dim pl-note">${$t('history.pre_legends_note')}</p>${legendsListHtml(f)}</div>`;
}
/** Monster Hall of Fame: the retired legends, named for what they are (not inductees, never on a ballot). */
export function preLeagueHallHtml(f) {
  if (!archiveLegends(f).length) return '';
  return `<div class="panel pl-panel"><div class="cp-sec-h"><b>${$t('history.pre_hall_title', { year: firstYearLabel() })}</b></div><p class="dim pl-note">${$t('history.pre_hall_note')}</p>${legendsListHtml(f)}</div>`;
}
